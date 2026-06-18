/**
 * AzureTtsProvider — uses Azure Cognitive Services Speech SDK.
 * Supports Khmer neural voices and SSML prosody/styles.
 */

import { TtsProvider, SynthesizeInput, SynthesizeResult, VoiceCatalog, WordTiming } from './provider';
import { SUPPORTED_LANGUAGES, VOICE_CATALOG } from './voices.config';
import { buildSsml } from './ssml';

export class AzureTtsProvider implements TtsProvider {
  readonly name = 'azure';
  private key: string;
  private region: string;

  constructor() {
    this.key = process.env.AZURE_SPEECH_KEY || '';
    this.region = process.env.AZURE_SPEECH_REGION || '';

    if (!this.key || !this.region) {
      console.warn(
        '[AzureTtsProvider] AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not set. ' +
        'Azure TTS will fail. Set TTS_PROVIDER=mock for development.'
      );
    }
  }

  async listVoices(): Promise<VoiceCatalog> {
    return {
      languages: SUPPORTED_LANGUAGES,
      voices: VOICE_CATALOG.filter((v) => v.provider === 'azure'),
    };
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
    // Dynamically import the SDK to keep it server-side only
    const sdk = await import('microsoft-cognitiveservices-speech-sdk');

    const speechConfig = sdk.SpeechConfig.fromSubscription(this.key, this.region);

    // Set output format based on requested format
    if (input.format === 'wav') {
      speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;
    } else {
      speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    }

    // Use null AudioConfig for server-side (no speaker output)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null as any);

    // Collect word timings if requested
    const wordTimings: WordTiming[] = [];
    if (input.wantWordTimings) {
      synthesizer.wordBoundary = (_s, e) => {
        wordTimings.push({
          word: e.text,
          startMs: Math.round(e.audioOffset / 10000), // ticks to ms
          endMs: Math.round((e.audioOffset + e.duration) / 10000),
        });
      };
    }

    // Build SSML
    const ssml = input.ssml || buildSsml({
      text: input.text,
      voiceId: input.voiceId,
      language: input.language,
      style: input.style,
      rate: input.rate,
      pitch: input.pitch,
      volume: input.volume,
    });

    return new Promise<SynthesizeResult>((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close();

          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const audioBuffer = Buffer.from(result.audioData);
            resolve({
              audio: audioBuffer,
              mime: input.format === 'wav' ? 'audio/wav' : 'audio/mpeg',
              durationMs: Math.round(result.audioDuration / 10000), // ticks to ms
              wordTimings: input.wantWordTimings ? wordTimings : undefined,
            });
          } else {
            const error = result.errorDetails || 'Unknown Azure TTS error';
            reject(new Error(`Azure TTS failed: ${error}`));
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(`Azure TTS error: ${error}`));
        }
      );
    });
  }
}
