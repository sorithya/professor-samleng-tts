'use client';

import { create } from 'zustand';

export type EmotionPreset = 'neutral' | 'happy' | 'sad' | 'excited' | 'angry' | 'calm' | 'nervous' | 'serious';

export interface StudioState {
  // Text input
  text: string;
  // TTS engine
  provider: 'voxcpm2' | 'omnivoice' | 'fishspeech';
  // Language & voice
  language: string;
  voiceId: string;
  style: string;
  // Delivery controls
  rate: number;
  pitch: number;
  volume: number;
  // Output format
  format: 'mp3' | 'wav';
  // Emotion / delivery controls
  emotion: EmotionPreset;
  expressiveness: number;   // 0–100
  styleIntensity: number;   // 0–100
  cloneFidelity: number;    // 0–100
  // Editor font size
  fontSize: number;
  // Generation state
  isGenerating: boolean;
  generationProgress: string | null; // e.g. "Generating chunk 2/5..."
  error: string | null;
  // Generated audio
  audioUrl: string | null;
  audioBlob: Blob | null;
  audioDurationMs: number | null;
  wordTimings: { word: string; startMs: number; endMs: number }[] | null;
}

export interface StudioActions {
  setText: (text: string) => void;
  setProvider: (provider: 'voxcpm2' | 'omnivoice' | 'fishspeech') => void;
  setLanguage: (language: string) => void;
  setVoiceId: (voiceId: string) => void;
  setStyle: (style: string) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setFormat: (format: 'mp3' | 'wav') => void;
  setEmotion: (emotion: EmotionPreset) => void;
  setExpressiveness: (expressiveness: number) => void;
  setStyleIntensity: (styleIntensity: number) => void;
  setCloneFidelity: (cloneFidelity: number) => void;
  resetEmotion: () => void;
  setFontSize: (fontSize: number) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: string | null) => void;
  setError: (error: string | null) => void;
  setAudioResult: (url: string | null, blob: Blob | null, durationMs: number | null, wordTimings?: { word: string; startMs: number; endMs: number }[] | null) => void;
  clearAudio: () => void;
  resetControls: () => void;
  reset: () => void;
}

const DEFAULT_STATE: StudioState = {
  text: '',
  provider: 'voxcpm2',
  language: 'km-KH',
  voiceId: 'sample-admin-kanitha',
  style: 'default',
  rate: 1.0,
  pitch: 0,
  volume: 1.0,
  format: 'wav',
  emotion: 'neutral',
  expressiveness: 50,
  styleIntensity: 50,
  cloneFidelity: 75,
  fontSize: 16,
  isGenerating: false,
  generationProgress: null,
  error: null,
  audioUrl: null,
  audioBlob: null,
  audioDurationMs: null,
  wordTimings: null,
};

export const useStudioStore = create<StudioState & StudioActions>((set, get) => ({
  ...DEFAULT_STATE,

  setText: (text) => set({ text, error: null }),
  setProvider: (provider) => set({ provider }),
  setLanguage: (language) => {
    const voiceMap: Record<string, string> = {
      'km-KH': 'sample-admin-kanitha',
      'en-US': 'voxcpm2-en-professional',
    };
    set({
      language,
      voiceId: voiceMap[language] || get().voiceId,
      style: 'default',
    });
  },
  setVoiceId: (voiceId) => set({ voiceId, style: 'default' }),
  setStyle: (style) => set({ style }),
  setRate: (rate) => set({ rate }),
  setPitch: (pitch) => set({ pitch }),
  setVolume: (volume) => set({ volume }),
  setFormat: (format) => set({ format }),
  setEmotion: (emotion) => set({ emotion }),
  setExpressiveness: (expressiveness) => set({ expressiveness }),
  setStyleIntensity: (styleIntensity) => set({ styleIntensity }),
  setCloneFidelity: (cloneFidelity) => set({ cloneFidelity }),
  resetEmotion: () => set({
    emotion: DEFAULT_STATE.emotion,
    expressiveness: DEFAULT_STATE.expressiveness,
    styleIntensity: DEFAULT_STATE.styleIntensity,
    cloneFidelity: DEFAULT_STATE.cloneFidelity,
  }),
  setFontSize: (fontSize) => set({ fontSize }),
  setIsGenerating: (isGenerating) => set({ isGenerating, generationProgress: isGenerating ? null : get().generationProgress }),
  setGenerationProgress: (generationProgress) => set({ generationProgress }),
  setError: (error) => set({ error }),
  setAudioResult: (audioUrl, audioBlob, audioDurationMs, wordTimings = null) => {
    // Revoke previous URL if exists
    const prevUrl = get().audioUrl;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }
    set({ audioUrl, audioBlob, audioDurationMs, wordTimings, error: null });
  },
  clearAudio: () => {
    const prevUrl = get().audioUrl;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }
    set({ audioUrl: null, audioBlob: null, audioDurationMs: null, wordTimings: null });
  },
  resetControls: () => set({
    rate: DEFAULT_STATE.rate,
    pitch: DEFAULT_STATE.pitch,
    volume: DEFAULT_STATE.volume,
    style: DEFAULT_STATE.style,
  }),
  reset: () => {
    const prevUrl = get().audioUrl;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }
    set(DEFAULT_STATE);
  },
}));
