/**
 * TTS Provider Interface — the abstraction layer for all TTS engines.
 * All providers must implement this interface.
 */

export interface SynthesizeInput {
  text: string;
  language: string;
  voiceId: string;
  style?: string;
  rate?: number;   // 0.5 - 2.0, default 1.0
  pitch?: number;  // -12 to +12 semitones, default 0
  volume?: number; // 0.0 - 1.0, default 1.0
  format?: 'mp3' | 'wav';
  ssml?: string;   // override: if provided, use this SSML directly
  wantWordTimings?: boolean;
  // Emotion / delivery controls
  emotion?: string;          // e.g. 'neutral', 'happy', 'sad', 'excited', etc.
  expressiveness?: number;   // 0–100 (low = stable, high = expressive)
  styleIntensity?: number;   // 0–100 (amplifies chosen emotion)
  cloneFidelity?: number;    // 0–100 (how closely to match reference timbre)
}

export interface SynthesizeResult {
  audio: Buffer;
  mime: string;
  durationMs?: number;
  wordTimings?: WordTiming[];
}

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  provider: string;
  supportedStyles: string[];
  isDefault?: boolean;
}

export interface Language {
  code: string;        // e.g. 'km-KH'
  name: string;        // e.g. 'Khmer'
  nativeName: string;  // e.g. 'ភាសាខ្មែរ'
  flag: string;        // emoji flag
}

export interface VoiceCatalog {
  languages: Language[];
  voices: Voice[];
}

export interface TtsProvider {
  readonly name: string;
  listVoices(): Promise<VoiceCatalog>;
  synthesize(input: SynthesizeInput): Promise<SynthesizeResult>;
}
