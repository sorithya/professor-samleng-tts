/**
 * MockTtsProvider — generates a simple sine wave tone for development/testing.
 * No external API calls needed.
 */

import { TtsProvider, SynthesizeInput, SynthesizeResult, VoiceCatalog } from './provider';
import { SUPPORTED_LANGUAGES, VOICE_CATALOG } from './voices.config';

/** Generate a WAV file buffer containing a sine wave */
function generateSineWave(
  frequency: number = 440,
  durationMs: number = 2000,
  sampleRate: number = 44100
): Buffer {
  const numSamples = Math.floor((durationMs / 1000) * sampleRate);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate sine wave samples with fade in/out
  const fadeLength = Math.min(numSamples * 0.05, sampleRate * 0.05);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let amplitude = Math.sin(2 * Math.PI * frequency * t);

    // Apply fade in/out envelope
    if (i < fadeLength) {
      amplitude *= i / fadeLength;
    } else if (i > numSamples - fadeLength) {
      amplitude *= (numSamples - i) / fadeLength;
    }

    // Scale to 16-bit range
    const sample = Math.max(-32768, Math.min(32767, Math.round(amplitude * 32767 * 0.5)));
    buffer.writeInt16LE(sample, headerSize + i * bytesPerSample);
  }

  return buffer;
}

/** Simple word timing generator for mock data */
function generateMockWordTimings(text: string, durationMs: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const msPerWord = durationMs / words.length;
  return words.map((word, i) => ({
    word,
    startMs: Math.round(i * msPerWord),
    endMs: Math.round((i + 1) * msPerWord),
  }));
}

export class MockTtsProvider implements TtsProvider {
  readonly name = 'mock';

  async listVoices(): Promise<VoiceCatalog> {
    return {
      languages: SUPPORTED_LANGUAGES,
      voices: VOICE_CATALOG,
    };
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

    // Duration based on text length (roughly 100ms per character)
    const durationMs = Math.max(1000, Math.min(input.text.length * 100, 10000));

    // Use different frequencies for different voices
    const frequency = input.voiceId.includes('Sreymom') || input.voiceId.includes('Jenny')
      ? 523.25  // C5 for female voices
      : 261.63; // C4 for male voices

    // Apply rate to frequency
    const adjustedFrequency = frequency * (input.rate || 1.0);

    const audio = generateSineWave(adjustedFrequency, durationMs);

    return {
      audio,
      mime: 'audio/wav',
      durationMs,
      wordTimings: input.wantWordTimings
        ? generateMockWordTimings(input.text, durationMs)
        : undefined,
    };
  }
}
