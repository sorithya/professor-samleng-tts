/**
 * Fish Speech TTS Provider — connects to the local/remote Fish Speech API server.
 *
 * Uses the /v1/tts API.
 * Supports zero-shot cloning using base64 reference audio buffers.
 */

import type { TtsProvider, SynthesizeInput, SynthesizeResult, Voice, VoiceCatalog } from './provider';
import { SUPPORTED_LANGUAGES } from './voices.config';
import * as fs from 'fs';

const FISHSPEECH_PORT = 8080;
const FISHSPEECH_URL = process.env.FISHSPEECH_API_URL || `http://localhost:${FISHSPEECH_PORT}`;

const FISHSPEECH_VOICES: Voice[] = [
  {
    id: 'fish-default',
    name: 'Fish Default (Neutral)',
    language: 'km-KH',
    gender: 'neutral',
    provider: 'fishspeech',
    supportedStyles: ['default'],
    isDefault: true,
  },
  {
    id: 'fish-male',
    name: 'Fish Male',
    language: 'km-KH',
    gender: 'male',
    provider: 'fishspeech',
    supportedStyles: ['default'],
  },
  {
    id: 'fish-female',
    name: 'Fish Female',
    language: 'km-KH',
    gender: 'female',
    provider: 'fishspeech',
    supportedStyles: ['default'],
  },
];

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

  async listVoices(): Promise<VoiceCatalog> {
    const clonedAsVoices: Voice[] = Array.from(this.clonedVoices.values()).map((cv) => ({
      id: cv.id,
      name: `${cv.name} (Cloned)`,
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
    return this.clonedVoices.delete(voiceId);
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
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
