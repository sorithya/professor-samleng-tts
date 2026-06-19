/**
 * OmniVoice TTS Provider — connects to the locally running omnivoice-server.
 *
 * Uses an OpenAI-compatible API (POST /v1/audio/speech).
 * Supports 600+ languages, voice design, and zero-shot cloning.
 */

import type { TtsProvider, SynthesizeInput, SynthesizeResult, Voice, VoiceCatalog } from './provider';
import { SUPPORTED_LANGUAGES } from './voices.config';
import * as fs from 'fs';
import * as path from 'path';

/* ---------- Constants ---------- */

const OMNIVOICE_PORT = 8880;
const OMNIVOICE_URL = process.env.OMNIVOICE_API_URL || `http://localhost:${OMNIVOICE_PORT}`;

/* ---------- Voice Catalog ---------- */

const OMNIVOICE_VOICES: Voice[] = [
  // OpenAI-compatible presets
  {
    id: 'omni-shimmer',
    name: 'Shimmer (Female Bright)',
    language: 'en-US',
    gender: 'female',
    provider: 'omnivoice',
    supportedStyles: ['default'],
  },
  {
    id: 'omni-echo',
    name: 'Echo (Male)',
    language: 'en-US',
    gender: 'male',
    provider: 'omnivoice',
    supportedStyles: ['default'],
  },
];

/** Map our voice IDs to OmniVoice preset names */
const VOICE_MAP: Record<string, string> = {
  'omni-shimmer': 'shimmer',
  'omni-echo': 'echo',
};

/** Emotion delivery instructions appended to input for emotional control */
const OMNI_EMOTION_INSTRUCTIONS: Record<string, string> = {
  neutral: '',
  happy: '[happy, warm, bright tone] ',
  sad: '[sad, melancholic, gentle tone] ',
  excited: '[excited, energetic, enthusiastic tone] ',
  angry: '[angry, intense, forceful tone] ',
  calm: '[calm, serene, soothing tone] ',
  nervous: '[nervous, hesitant, uncertain tone] ',
  serious: '[serious, authoritative, formal tone] ',
};

export interface ClonedVoice {
  id: string;
  name: string;
  referenceAudioPath: string;
  transcript?: string;
  description?: string;
  createdAt: number;
  isDefault?: boolean;
}

/* ---------- Provider Implementation ---------- */

export class OmniVoiceProvider implements TtsProvider {
  readonly name = 'omnivoice';
  private clonedVoices: Map<string, ClonedVoice> = new Map();
  private defaultVoicesRegistered = false;

  private async registerDefaultVoices(): Promise<void> {
    if (this.defaultVoicesRegistered) return;
    this.defaultVoicesRegistered = true;

    const voicesDir = path.join(process.cwd(), 'public', 'samples');
    if (!fs.existsSync(voicesDir)) return;

    const defaultVoices = [
      { file: 'Admin កន្និកា.wav', id: 'sample-admin-kanitha', name: 'Admin Kanitha (Admin កន្និកា)' },
      { file: 'The Kanitha Show.wav', id: 'sample-kanitha-show', name: 'The Kanitha Show' },
      { file: 'គុណម្ចាស់គ្រូ គូ សុភាព.wav', id: 'sample-kou-sopheap', name: 'Kou Sopheap (គូ សុភាព)' },
      { file: 'វណ្ណា.wav', id: 'sample-vanna', name: 'Vanna (វណ្ណា)' },
      { file: 'សុធា.wav', id: 'sample-sothea', name: 'Sothea (សុធា)' },
      { file: 'ស៊ឺ-ម៉ាអ៊ី 2.mp3', id: 'sample-sima-yi-2', name: 'Sima Yi 2 (ស៊ឺ-ម៉ាអ៊ី 2)' },
      { file: 'ស៊ឺ-ម៉ាអ៊ី.mp3', id: 'sample-sima-yi', name: 'Sima Yi (ស៊ឺ-ម៉ាអ៊ី)' },
      { file: 'ស្រីពៅ.wav', id: 'sample-srey-pov', name: 'Srey Pov (ស្រីពៅ)' },
    ];

    for (const config of defaultVoices) {
      const filePath = path.join(voicesDir, config.file);
      if (!fs.existsSync(filePath)) continue;

      // Try uploading to OmniVoice server
      try {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(config.file);
        const mimeType = ext === '.wav' ? 'audio/wav' : 'audio/mpeg';

        const uploadFormData = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        uploadFormData.append('ref_audio', blob, `reference${ext}`);
        uploadFormData.append('profile_id', config.id);
        uploadFormData.append('overwrite', 'true');

        await fetch(`${OMNIVOICE_URL}/v1/voices/profiles`, {
          method: 'POST',
          body: uploadFormData,
        });
        console.log(`[OmniVoice] Default voice "${config.name}" uploaded to server`);
      } catch (e) {
        console.warn(`[OmniVoice] Failed to upload default voice profile "${config.name}":`, e);
      }

      this.clonedVoices.set(config.id, {
        id: config.id,
        name: config.name,
        referenceAudioPath: filePath,
        createdAt: Date.now(),
        isDefault: true,
      });
    }
  }

  async listVoices(): Promise<VoiceCatalog> {
    await this.registerDefaultVoices();

    const clonedAsVoices: Voice[] = Array.from(this.clonedVoices.values()).map((cv) => ({
      id: cv.id,
      name: `${cv.name}${cv.isDefault ? '' : ' (Cloned)'}`,
      language: 'km-KH',
      gender: 'neutral' as const,
      provider: 'omnivoice',
      supportedStyles: ['default'],
      isCloned: true,
    }));

    return {
      languages: SUPPORTED_LANGUAGES,
      voices: [...OMNIVOICE_VOICES, ...clonedAsVoices],
    };
  }

  registerClonedVoice(voice: ClonedVoice): void {
    this.clonedVoices.set(voice.id, voice);
  }

  getClonedVoices(): ClonedVoice[] {
    return Array.from(this.clonedVoices.values());
  }

  deleteClonedVoice(voiceId: string): boolean {
    const voice = this.clonedVoices.get(voiceId);
    if (voice?.isDefault) return false;
    return this.clonedVoices.delete(voiceId);
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
    await this.registerDefaultVoices();
    const voiceId = input.voiceId || 'sample-admin-kanitha';
    const format = input.format || 'wav';

    // Map our voice ID to OmniVoice voice name
    // Cloned voices (clone-* or sample-*) use the profile system
    let omniVoice: string;
    if (voiceId.startsWith('clone-') || voiceId.startsWith('sample-')) {
      omniVoice = `clone:${voiceId}`;
    } else {
      omniVoice = VOICE_MAP[voiceId] || 'alloy';
    }

    // Build emotion delivery prefix
    let emotionPrefix = '';
    if (input.emotion && input.emotion !== 'neutral') {
      const emotionTag = OMNI_EMOTION_INSTRUCTIONS[input.emotion] || '';
      if (emotionTag) {
        const intensity = input.styleIntensity ?? 50;
        if (intensity > 70) {
          emotionPrefix = emotionTag.replace('[', '[very ').toUpperCase();
        } else if (intensity < 30) {
          emotionPrefix = emotionTag.replace('[', '[slightly ');
        } else {
          emotionPrefix = emotionTag;
        }
      }
    }

    const body = {
      model: 'omnivoice',
      input: emotionPrefix + input.text,
      voice: omniVoice,
      response_format: format,
    };

    try {
      const response = await fetch(`${OMNIVOICE_URL}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OmniVoice synthesis failed (${response.status}): ${errorText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const audio = Buffer.from(arrayBuffer);
      const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';

      return { audio, mime };
    } catch (error) {
      console.error('[OmniVoice] Synthesis error:', error);

      if (
        error instanceof Error &&
        (error.message.includes('fetch failed') ||
          error.message.includes('ECONNREFUSED'))
      ) {
        throw new Error(
          `Cannot connect to OmniVoice server at ${OMNIVOICE_URL}. ` +
            `Make sure omnivoice-server is running on port ${OMNIVOICE_PORT}.`
        );
      }

      throw error;
    }
  }

  /**
   * Check whether the OmniVoice server is currently reachable.
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${OMNIVOICE_URL}/v1/voices`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok || response.status === 401 || response.status === 404 || response.status === 405;
    } catch {
      return false;
    }
  }
}
