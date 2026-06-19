/**
 * Fish Speech TTS Provider — connects to the local/remote Fish Speech API server.
 *
 * Uses the /v1/tts API.
 * Supports zero-shot cloning using base64 reference audio buffers.
 */

import type { TtsProvider, SynthesizeInput, SynthesizeResult, Voice, VoiceCatalog } from './provider';
import { SUPPORTED_LANGUAGES } from './voices.config';
import * as fs from 'fs';
import * as path from 'path';

const FISHSPEECH_PORT = 8080;
const FISHSPEECH_URL = process.env.FISHSPEECH_API_URL || `http://localhost:${FISHSPEECH_PORT}`;

const FISHSPEECH_VOICES: Voice[] = [];

export interface ClonedVoice {
  id: string;
  name: string;
  referenceAudioPath: string;
  transcript?: string;
  description?: string;
  createdAt: number;
  isDefault?: boolean;
}

export class FishSpeechProvider implements TtsProvider {
  readonly name = 'fishspeech';
  private clonedVoices: Map<string, ClonedVoice> = new Map();
  private defaultVoicesRegistered = false;

  private registerDefaultVoices(): void {
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
    this.registerDefaultVoices();

    const clonedAsVoices: Voice[] = Array.from(this.clonedVoices.values()).map((cv) => ({
      id: cv.id,
      name: `${cv.name}${cv.isDefault ? '' : ' (Cloned)'}`,
      language: 'km-KH',
      gender: 'neutral' as const,
      provider: 'fishspeech',
      supportedStyles: ['default'],
      isCloned: true,
    }));

    return {
      languages: SUPPORTED_LANGUAGES,
      voices: [...FISHSPEECH_VOICES, ...clonedAsVoices],
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
    this.registerDefaultVoices();
    const format = input.format || 'wav';

    // Zero-shot cloning references
    const references: any[] = [];
    const clonedVoice = this.clonedVoices.get(input.voiceId);

    if (clonedVoice) {
      const referenceAudioPath = clonedVoice.referenceAudioPath;
      try {
        if (fs.existsSync(referenceAudioPath)) {
          const audioBuffer = fs.readFileSync(referenceAudioPath);
          references.push({
            audio: audioBuffer.toString('base64'),
            text: clonedVoice.transcript || '',
          });
        }
      } catch (err) {
        console.warn('[Fish Speech] Failed to load reference audio:', err);
      }
    }

    // Default settings
    const body = {
      text: input.text,
      references: references.length > 0 ? references : [],
      reference_id: null,
      format: format === 'mp3' ? 'mp3' : 'wav',
      normalize: true,
      streaming: false,
    };

    try {
      const response = await fetch(`${FISHSPEECH_URL}/v1/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Fish Speech synthesis failed (${response.status}): ${errorText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const audio = Buffer.from(arrayBuffer);
      const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';

      return { audio, mime };
    } catch (error) {
      console.error('[Fish Speech] Synthesis error:', error);

      if (
        error instanceof Error &&
        (error.message.includes('fetch failed') ||
          error.message.includes('ECONNREFUSED'))
      ) {
        throw new Error(
          `Cannot connect to Fish Speech server at ${FISHSPEECH_URL}. ` +
            `Make sure Fish Speech api_server is running on port ${FISHSPEECH_PORT}.`
        );
      }

      throw error;
    }
  }
}
