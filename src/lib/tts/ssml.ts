/**
 * SSML Builder — generates valid SSML for Azure Speech and compatible engines.
 * Handles prosody, styles, breaks, and XML escaping.
 */

import { SynthesizeInput } from './provider';
import { getVoiceById, STYLE_PROSODY_FALLBACKS } from './voices.config';

/** XML-escape user text to prevent SSML injection */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert rate number (0.5-2.0) to SSML percentage string */
function rateToSsml(rate: number): string {
  const pct = Math.round(rate * 100);
  return `${pct}%`;
}

/** Convert pitch number (-12 to +12 semitones) to SSML Hz offset string */
function pitchToSsml(pitch: number): string {
  // Azure accepts percentage or semitone-based values
  // We'll use percentage: 0 = default, positive = higher, negative = lower
  const pct = Math.round(pitch * 8.33); // ±12 → ±100%
  if (pct >= 0) return `+${pct}%`;
  return `${pct}%`;
}

/** Convert volume number (0-1) to SSML percentage string */
function volumeToSsml(volume: number): string {
  const pct = Math.round(volume * 100);
  return `${pct}%`; // Azure: 0-100 or x-soft/soft/medium/loud/x-loud
}

export interface SsmlOptions {
  text: string;
  voiceId: string;
  language: string;
  style?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

/**
 * Build SSML string for synthesis.
 * Uses native `mstts:express-as` for supported styles,
 * falls back to prosody presets for unsupported ones.
 */
export function buildSsml(input: SsmlOptions): string {
  const voice = getVoiceById(input.voiceId);
  const escapedText = escapeXml(input.text);
  const style = input.style || 'default';

  // Determine if the voice natively supports this style
  const isNativeStyle = voice?.supportedStyles.includes(style) && style !== 'default';

  // Get prosody values: user overrides + style fallback
  const fallback = STYLE_PROSODY_FALLBACKS[style] || STYLE_PROSODY_FALLBACKS['default'];
  const rate = input.rate ?? fallback.rate;
  const pitch = input.pitch ?? fallback.pitch;
  const volume = input.volume ?? fallback.volume;

  // Build inner content with prosody
  let innerContent = escapedText;

  // Only wrap in prosody if values differ from defaults
  const needsProsody = rate !== 1.0 || pitch !== 0 || volume !== 1.0;
  if (needsProsody) {
    innerContent = `<prosody rate="${rateToSsml(rate)}" pitch="${pitchToSsml(pitch)}" volume="${volumeToSsml(volume)}">${escapedText}</prosody>`;
  }

  // Wrap in express-as if native style support
  if (isNativeStyle) {
    innerContent = `<mstts:express-as style="${style}">${innerContent}</mstts:express-as>`;
  }

  // Build full SSML
  return [
    '<speak version="1.0"',
    '  xmlns="http://www.w3.org/2001/10/synthesis"',
    '  xmlns:mstts="https://www.w3.org/2001/mstts"',
    `  xml:lang="${input.language}">`,
    `  <voice name="${input.voiceId}">`,
    `    ${innerContent}`,
    '  </voice>',
    '</speak>',
  ].join('\n');
}
