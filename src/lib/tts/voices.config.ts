import { Language, Voice } from './provider';

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'km-KH',
    name: 'Khmer',
    nativeName: 'ភាសាខ្មែរ',
    flag: '🇰🇭',
  },
  {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
];

export const VOICE_CATALOG: Voice[] = [
  // ═══════════════════════════════════════════
  // Khmer voices (VoxCPM2)
  // ═══════════════════════════════════════════

  // Default cloned voices (bundled reference audio)
  {
    id: 'default-vipassana',
    name: 'Vipassana (វិបស្សនា)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational', 'serious'],
    isDefault: true,
  },
  {
    id: 'default-tinfi',
    name: 'ទិនហ្វី (Tinfi)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'conversational', 'narration'],
  },

  // Designed voices (no reference audio needed)
  {
    id: 'voxcpm2-design-default',
    name: 'Somleng (Professional)',
    language: 'km-KH',
    gender: 'neutral',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational', 'cheerful', 'calm', 'serious'],
  },
  {
    id: 'voxcpm2-khmer-news',
    name: 'Dara (ដារ៉ា - News)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'serious'],
  },
  {
    id: 'voxcpm2-khmer-storyteller',
    name: 'Bopha (បុប្ផា - Story)',
    language: 'km-KH',
    gender: 'female',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'narration', 'conversational', 'cheerful', 'calm'],
  },
  {
    id: 'voxcpm2-design-female-warm',
    name: 'Luna (Warm)',
    language: 'km-KH',
    gender: 'female',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'conversational', 'calm', 'whisper'],
  },
  {
    id: 'voxcpm2-design-male-deep',
    name: 'Titan (Deep)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'narration', 'serious', 'advertisement'],
  },

  // ═══════════════════════════════════════════
  // English voices (VoxCPM2 designed)
  // ═══════════════════════════════════════════
  {
    id: 'voxcpm2-en-professional',
    name: 'Alex (Professional)',
    language: 'en-US',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational', 'serious'],
    isDefault: true,
  },
  {
    id: 'voxcpm2-en-warm',
    name: 'Sarah (Warm)',
    language: 'en-US',
    gender: 'female',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'conversational', 'narration', 'cheerful', 'calm'],
  },
];

/** All voice styles with their display metadata */
export const VOICE_STYLES = [
  { id: 'default', icon: '🎙️' },
  { id: 'news', icon: '📰' },
  { id: 'narration', icon: '📖' },
  { id: 'conversational', icon: '💬' },
  { id: 'cheerful', icon: '😊' },
  { id: 'calm', icon: '😌' },
  { id: 'sad', icon: '😢' },
  { id: 'whisper', icon: '🤫' },
  { id: 'serious', icon: '🧐' },
  { id: 'customerService', icon: '🎧' },
  { id: 'advertisement', icon: '📢' },
  { id: 'poetry', icon: '✨' },
] as const;

/**
 * Prosody preset fallbacks — tuned for natural, professional speech.
 * VoxCPM2 handles these via control instructions, so these are secondary hints.
 */
export const STYLE_PROSODY_FALLBACKS: Record<string, { rate: number; pitch: number; volume: number }> = {
  default:         { rate: 1.0,  pitch: 0,   volume: 1.0 },
  news:            { rate: 0.95, pitch: 0,   volume: 1.0 },
  narration:       { rate: 0.9,  pitch: 0,   volume: 0.95 },
  conversational:  { rate: 1.0,  pitch: 0,   volume: 0.9 },
  cheerful:        { rate: 1.05, pitch: 1,   volume: 1.0 },
  calm:            { rate: 0.85, pitch: -1,  volume: 0.85 },
  sad:             { rate: 0.8,  pitch: -2,  volume: 0.75 },
  whisper:         { rate: 0.9,  pitch: 0,   volume: 0.6 },
  serious:         { rate: 0.9,  pitch: -1,  volume: 0.95 },
  customerService: { rate: 1.0,  pitch: 0,   volume: 0.95 },
  advertisement:   { rate: 1.1,  pitch: 2,   volume: 1.0 },
  poetry:          { rate: 0.75, pitch: 0,   volume: 0.85 },
};

export function getVoicesForLanguage(languageCode: string): Voice[] {
  return VOICE_CATALOG.filter((v) => v.language === languageCode);
}

export function getDefaultVoice(languageCode: string): Voice | undefined {
  return VOICE_CATALOG.find((v) => v.language === languageCode && v.isDefault)
    ?? VOICE_CATALOG.find((v) => v.language === languageCode);
}

export function getVoiceById(voiceId: string): Voice | undefined {
  return VOICE_CATALOG.find((v) => v.id === voiceId);
}
