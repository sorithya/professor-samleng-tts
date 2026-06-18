/**
 * OmniVoice TTS Provider — connects to the locally running omnivoice-server.
 *
 * Uses an OpenAI-compatible API (POST /v1/audio/speech).
 * Supports 600+ languages, voice design, and zero-shot cloning.
 */

import type { TtsProvider, SynthesizeInput, SynthesizeResult, Voice, VoiceCatalog } from './provider';
import { SUPPORTED_LANGUAGES } from './voices.config';

/* ---------- Constants ---------- */

const OMNIVOICE_PORT = 8880;
const OMNIVOICE_URL = process.env.OMNIVOICE_API_URL || `http://localhost:${OMNIVOICE_PORT}`;

/* ---------- Voice Catalog ---------- */

const OMNIVOICE_VOICES: Voice[] = [
  // OpenAI-compatible presets
  {
    id: 'omni-alloy',
    name: 'Alloy (Female)',
    language: 'km-KH',
    gender: 'female',
    provider: 'omnivoice',
    supportedStyles: ['default'],
  },
  {
    id: 'omni-nova',
    name: 'Nova (Female)',
    language: 'km-KH',
    gender: 'female',
    provider: 'omnivoice',
    supportedStyles: ['default'],
  },
  {
    id: 'omni-ash',
    name: 'Ash (Male)',
    language: 'km-KH',
    gender: 'male',
    provider: 'omnivoice',
    supportedStyles: ['default'],
  },
  {
    id: 'omni-onyx',
    name: 'Onyx (Male Deep)',
    language: 'km-KH',
    gender: 'male',
    provider: 'omnivoice',
    supportedStyles: ['default'],
  },
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
  'omni-alloy': 'alloy',
  'omni-nova': 'nova',
  'omni-ash': 'ash',
  'omni-onyx': 'onyx',
  'omni-shimmer': 'shimmer',
  'omni-echo': 'echo',
  'omni-coral': 'coral',
  'omni-fable': 'fable',
  'omni-sage': 'sage',
  'omni-verse': 'verse',
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

  async listVoices(): Promise<VoiceCatalog> {
    const clonedAsVoices: Voice[] = Array.from(this.clonedVoices.values()).map((cv) => ({
      id: cv.id,
      name: `${cv.name} (Cloned)`,
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
    return this.clonedVoices.delete(voiceId);
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
    const voiceId = input.voiceId || 'omni-alloy';
    const format = input.format || 'wav';

    // Map our voice ID to OmniVoice voice name
    // Cloned voices (clone-*) use the profile system
    let omniVoice: string;
    if (voiceId.startsWith('clone-')) {
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
