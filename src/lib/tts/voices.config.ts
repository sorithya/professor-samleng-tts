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
  // Khmer Cloned Voices (from public/samples)
  // ═══════════════════════════════════════════
  
  // --- VoxCPM2 ---
  {
    id: 'sample-admin-kanitha',
    name: 'Admin Kanitha (Admin កន្និកា)',
    language: 'km-KH',
    gender: 'female',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
    isDefault: true,
  },
  {
    id: 'sample-kanitha-show',
    name: 'The Kanitha Show',
    language: 'km-KH',
    gender: 'female',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-kou-sopheap',
    name: 'Kou Sopheap (គូ សុភាព)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-vanna',
    name: 'Vanna (វណ្ណា)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sothea',
    name: 'Sothea (សុធា)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sima-yi-2',
    name: 'Sima Yi 2 (ស៊ឺ-ម៉ាអ៊ី 2)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sima-yi',
    name: 'Sima Yi (ស៊ឺ-ម៉ាអ៊ី)',
    language: 'km-KH',
    gender: 'male',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-srey-pov',
    name: 'Srey Pov (ស្រីពៅ)',
    language: 'km-KH',
    gender: 'female',
    provider: 'voxcpm2',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },

  // --- OmniVoice ---
  {
    id: 'sample-admin-kanitha',
    name: 'Admin Kanitha (Admin កន្និកា)',
    language: 'km-KH',
    gender: 'female',
    provider: 'omnivoice',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
    isDefault: true,
  },
  {
    id: 'sample-kanitha-show',
    name: 'The Kanitha Show',
    language: 'km-KH',
    gender: 'female',
    provider: 'omnivoice',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-kou-sopheap',
    name: 'Kou Sopheap (គូ សុភាព)',
    language: 'km-KH',
    gender: 'male',
    provider: 'omnivoice',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-vanna',
    name: 'Vanna (វណ្ណា)',
    language: 'km-KH',
    gender: 'male',
    provider: 'omnivoice',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sothea',
    name: 'Sothea (សុធា)',
    language: 'km-KH',
    gender: 'male',
    provider: 'omnivoice',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sima-yi-2',
    name: 'Sima Yi 2 (ស៊ឺ-ម៉ាអ៊ី 2)',
    language: 'km-KH',
    gender: 'male',
    provider: 'omnivoice',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sima-yi',
    name: 'Sima Yi (ស៊ឺ-ម៉ាអ៊ី)',
    language: 'km-KH',
    gender: 'male',
    provider: 'omnivoice',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-srey-pov',
    name: 'Srey Pov (ស្រីពៅ)',
    language: 'km-KH',
    gender: 'female',
    provider: 'omnivoice',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },

  // --- Fish Speech ---
  {
    id: 'sample-admin-kanitha',
    name: 'Admin Kanitha (Admin កន្និកា)',
    language: 'km-KH',
    gender: 'female',
    provider: 'fishspeech',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
    isDefault: true,
  },
  {
    id: 'sample-kanitha-show',
    name: 'The Kanitha Show',
    language: 'km-KH',
    gender: 'female',
    provider: 'fishspeech',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-kou-sopheap',
    name: 'Kou Sopheap (គូ សុភាព)',
    language: 'km-KH',
    gender: 'male',
    provider: 'fishspeech',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-vanna',
    name: 'Vanna (វណ្ណា)',
    language: 'km-KH',
    gender: 'male',
    provider: 'fishspeech',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sothea',
    name: 'Sothea (សុធា)',
    language: 'km-KH',
    gender: 'male',
    provider: 'fishspeech',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sima-yi-2',
    name: 'Sima Yi 2 (ស៊ឺ-ម៉ាអ៊ី 2)',
    language: 'km-KH',
    gender: 'male',
    provider: 'fishspeech',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-sima-yi',
    name: 'Sima Yi (ស៊ឺ-ម៉ាអ៊ី)',
    language: 'km-KH',
    gender: 'male',
    provider: 'fishspeech',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
  },
  {
    id: 'sample-srey-pov',
    name: 'Srey Pov (ស្រីពៅ)',
    language: 'km-KH',
    gender: 'female',
    provider: 'fishspeech',
    supportedStyles: ['default', 'news', 'narration', 'conversational'],
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
