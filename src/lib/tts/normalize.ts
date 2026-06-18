/**
 * Text Normalizer for TTS — converts numbers and special characters
 * into language-appropriate words before synthesis.
 *
 * KEY DESIGN: Numbers are read in the language of their surrounding text context.
 * - Khmer digits (១២៣) → always read as Khmer words
 * - Arabic digits in Khmer text → read as Khmer words
 * - Arabic digits in English text → read as English words
 * - Mixed text segments are detected and handled per-segment
 *
 * Handles: Khmer digits (១២៣), Arabic digits (123), decimals, negatives,
 * ordinals, percentages, currencies, phone numbers, dates, times.
 */

// ═══════════════════════════════════════════════════════
// Khmer ↔ Arabic digit mapping
// ═══════════════════════════════════════════════════════

const KHMER_DIGITS = '០១២៣៤៥៦៧៨៩';
const ARABIC_DIGITS = '0123456789';

function khmerToArabic(text: string): string {
  let result = text;
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(KHMER_DIGITS[i], ARABIC_DIGITS[i]);
  }
  return result;
}

/**
 * Check if a character is part of the Khmer Unicode block (U+1780–U+17FF)
 * or Khmer Symbols block (U+19E0–U+19FF).
 */
function isKhmerChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (code >= 0x1780 && code <= 0x17FF) || (code >= 0x19E0 && code <= 0x19FF);
}

/**
 * Check if a character is a Khmer digit (០–៩).
 */
function isKhmerDigit(ch: string): boolean {
  return KHMER_DIGITS.includes(ch);
}

/**
 * Determine the language context surrounding a number at a given position.
 * Scans backwards and forwards from the number to find the nearest
 * non-whitespace, non-punctuation, non-digit text and checks its script.
 *
 * Returns 'km' if Khmer script surrounds the number, 'en' otherwise.
 */
function detectNumberContext(text: string, matchStart: number, matchEnd: number): 'km' | 'en' {
  // Look backwards from the number
  let backwardLang: 'km' | 'en' | null = null;
  for (let i = matchStart - 1; i >= 0 && i >= matchStart - 80; i--) {
    const ch = text[i];
    if (/\s/.test(ch) || /[.,!?;:។៕\-–—()[\]{}'"«»""''\/]/.test(ch)) continue;
    if (/[0-9]/.test(ch)) continue;
    if (isKhmerChar(ch)) { backwardLang = 'km'; break; }
    if (/[a-zA-Z]/.test(ch)) { backwardLang = 'en'; break; }
  }

  // Look forwards from the number
  let forwardLang: 'km' | 'en' | null = null;
  for (let i = matchEnd; i < text.length && i < matchEnd + 80; i++) {
    const ch = text[i];
    if (/\s/.test(ch) || /[.,!?;:។៕\-–—()[\]{}'"«»""''\/]/.test(ch)) continue;
    if (/[0-9]/.test(ch)) continue;
    if (isKhmerChar(ch)) { forwardLang = 'km'; break; }
    if (/[a-zA-Z]/.test(ch)) { forwardLang = 'en'; break; }
  }

  // If both sides agree, use that
  if (backwardLang === 'km' || forwardLang === 'km') return 'km';
  if (backwardLang === 'en' || forwardLang === 'en') return 'en';

  // Fallback: no detectable context
  return 'en';
}

// ═══════════════════════════════════════════════════════
// Khmer Number Words
// ═══════════════════════════════════════════════════════

const KH_UNITS = ['សូន្យ', 'មួយ', 'ពីរ', 'បី', 'បួន', 'ប្រាំ', 'ប្រាំមួយ', 'ប្រាំពីរ', 'ប្រាំបី', 'ប្រាំបួន'];
const KH_TENS = ['', 'ដប់', 'ម្ភៃ', 'សាមសិប', 'សែសិប', 'ហាសិប', 'ហុកសិប', 'ចិតសិប', 'ប៉ែតសិប', 'កៅសិប'];

function numberToKhmer(n: number): string {
  if (n < 0) return 'ដក ' + numberToKhmer(-n);
  if (n === 0) return KH_UNITS[0];

  if (!Number.isInteger(n)) {
    const [intPart, decPart] = n.toString().split('.');
    const intWords = numberToKhmer(parseInt(intPart));
    const decWords = decPart.split('').map(d => KH_UNITS[parseInt(d)]).join(' ');
    return `${intWords} ចុច ${decWords}`;
  }

  if (n < 10) return KH_UNITS[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const units = n % 10;
    return KH_TENS[tens] + (units > 0 ? KH_UNITS[units] : '');
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    return KH_UNITS[hundreds] + 'រយ' + (rest > 0 ? numberToKhmer(rest) : '');
  }
  if (n < 10000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    return numberToKhmer(thousands) + 'ពាន់' + (rest > 0 ? numberToKhmer(rest) : '');
  }
  if (n < 100000) {
    const tenThousands = Math.floor(n / 10000);
    const rest = n % 10000;
    return numberToKhmer(tenThousands) + 'មុឺន' + (rest > 0 ? numberToKhmer(rest) : '');
  }
  if (n < 1000000) {
    const hundredThousands = Math.floor(n / 100000);
    const rest = n % 100000;
    return numberToKhmer(hundredThousands) + 'សែន' + (rest > 0 ? numberToKhmer(rest) : '');
  }
  if (n < 1000000000) {
    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;
    return numberToKhmer(millions) + 'លាន' + (rest > 0 ? numberToKhmer(rest) : '');
  }

  // Very large numbers: read digit by digit
  return n.toString().split('').map(d => KH_UNITS[parseInt(d)]).join(' ');
}

// ═══════════════════════════════════════════════════════
// English Number Words
// ═══════════════════════════════════════════════════════

const EN_UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberToEnglish(n: number): string {
  if (n < 0) return 'negative ' + numberToEnglish(-n);
  if (n === 0) return EN_UNITS[0];

  if (!Number.isInteger(n)) {
    const [intPart, decPart] = n.toString().split('.');
    const intWords = numberToEnglish(parseInt(intPart));
    const decWords = decPart.split('').map(d => EN_UNITS[parseInt(d)]).join(' ');
    return `${intWords} point ${decWords}`;
  }

  if (n < 20) return EN_UNITS[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const units = n % 10;
    return EN_TENS[tens] + (units > 0 ? '-' + EN_UNITS[units] : '');
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    return EN_UNITS[hundreds] + ' hundred' + (rest > 0 ? ' and ' + numberToEnglish(rest) : '');
  }
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    return numberToEnglish(thousands) + ' thousand' + (rest > 0 ? (rest < 100 ? ' and ' : ' ') + numberToEnglish(rest) : '');
  }
  if (n < 1000000000) {
    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;
    return numberToEnglish(millions) + ' million' + (rest > 0 ? ' ' + numberToEnglish(rest) : '');
  }
  if (n < 1000000000000) {
    const billions = Math.floor(n / 1000000000);
    const rest = n % 1000000000;
    return numberToEnglish(billions) + ' billion' + (rest > 0 ? ' ' + numberToEnglish(rest) : '');
  }

  // Very large: read digit by digit
  return n.toString().split('').map(d => EN_UNITS[parseInt(d)]).join(' ');
}

// ═══════════════════════════════════════════════════════
// Context-Aware Number Converter
// ═══════════════════════════════════════════════════════

/**
 * Given a number and the surrounding text context, return the number
 * as words in the appropriate language.
 */
function contextAwareNumberToWords(
  n: number,
  fullText: string,
  matchStart: number,
  matchEnd: number,
  globalLanguage: string,
): string {
  // Check if the original text had Khmer digits at this position
  const originalSlice = fullText.slice(matchStart, matchEnd);
  const hadKhmerDigits = [...originalSlice].some(ch => isKhmerDigit(ch));

  if (hadKhmerDigits) {
    // Khmer digits → always read as Khmer, no matter what the global lang is
    return numberToKhmer(n);
  }

  // For Arabic digits, detect the surrounding script context
  const contextLang = detectNumberContext(fullText, matchStart, matchEnd);

  if (contextLang === 'km') {
    return numberToKhmer(n);
  }

  // Use the global language setting as fallback
  if (globalLanguage.startsWith('km')) {
    return numberToKhmer(n);
  }

  return numberToEnglish(n);
}

// ═══════════════════════════════════════════════════════
// Main Normalizer
// ═══════════════════════════════════════════════════════

/**
 * Normalize text for TTS by converting numbers and special patterns
 * into language-appropriate words.
 *
 * Numbers are read in the language of their surrounding context:
 * - Khmer digits always → Khmer words
 * - Arabic digits near Khmer text → Khmer words
 * - Arabic digits near English text → English words
 */
export function normalizeTextForTTS(text: string, language: string): string {
  const isKhmer = language.startsWith('km');

  // Keep the ORIGINAL text for context detection (before digit conversion)
  const originalText = text;

  let result = text;

  // Step 1: Convert Khmer digits to Arabic for uniform regex processing.
  // We keep `originalText` with Khmer digits for context detection.
  result = khmerToArabic(result);

  // Step 2: Handle percentages (e.g., 50% → ហាសិបភាគរយ / fifty percent)
  result = result.replace(/(\d+(?:\.\d+)?)\s*%/g, (match, num, offset) => {
    const n = parseFloat(num);
    const words = contextAwareNumberToWords(n, originalText, offset, offset + match.length - 1, language);
    const ctxLang = detectNumberContext(originalText, offset, offset + match.length);
    return ctxLang === 'km' || isKhmer
      ? words + 'ភាគរយ'
      : words + ' percent';
  });

  // Step 3: Handle currency ($, ៛, €)
  result = result.replace(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g, (match, num, offset) => {
    const n = parseFloat(num.replace(/,/g, ''));
    const words = contextAwareNumberToWords(n, originalText, offset, offset + match.length, language);
    const ctxLang = detectNumberContext(originalText, offset, offset + match.length);
    return ctxLang === 'km' || isKhmer
      ? words + ' ដុល្លារ'
      : words + ' dollars';
  });
  result = result.replace(/៛\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g, (match, num, offset) => {
    const n = parseFloat(num.replace(/,/g, ''));
    const words = contextAwareNumberToWords(n, originalText, offset, offset + match.length, language);
    return words + ' រៀល';
  });

  // Step 4: Handle time patterns (e.g., 10:30 → ten thirty / ដប់ម៉ោង សាមសិបនាទី)
  result = result.replace(/(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/g, (match, hours, minutes, ampm, offset) => {
    const h = parseInt(hours);
    const m = parseInt(minutes);
    const ctxLang = detectNumberContext(originalText, offset, offset + match.length);
    const useKhmer = ctxLang === 'km' || isKhmer;

    if (useKhmer) {
      let timeStr = 'ម៉ោង' + numberToKhmer(h);
      if (m > 0) timeStr += ' ' + numberToKhmer(m) + 'នាទី';
      return timeStr;
    } else {
      let timeStr = numberToEnglish(h);
      if (m > 0) timeStr += ' ' + numberToEnglish(m);
      if (ampm) timeStr += ' ' + ampm.toUpperCase();
      return timeStr;
    }
  });

  // Step 5: Handle date patterns (e.g., 2024/01/15)
  result = result.replace(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g, (match, year, month, day, offset) => {
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    const ctxLang = detectNumberContext(originalText, offset, offset + match.length);
    const useKhmer = ctxLang === 'km' || isKhmer;

    if (useKhmer) {
      return 'ថ្ងៃទី' + numberToKhmer(d) + ' ខែ' + numberToKhmer(m) + ' ឆ្នាំ' + numberToKhmer(y);
    } else {
      return numberToEnglish(m) + ' ' + numberToEnglish(d) + ' ' + numberToEnglish(y);
    }
  });

  // Step 6: Handle phone numbers (preserve as digit sequences)
  result = result.replace(/(\d{3,4})[\s\-](\d{3,4})[\s\-](\d{3,4})/g, (match, a, b, c, offset) => {
    const ctxLang = detectNumberContext(originalText, offset, offset + match.length);
    const useKhmer = ctxLang === 'km' || isKhmer;
    const numConv = useKhmer ? numberToKhmer : numberToEnglish;

    const readDigits = (s: string) => s.split('').map(d => numConv(parseInt(d))).join(' ');
    return readDigits(a) + ' ' + readDigits(b) + ' ' + readDigits(c);
  });

  // Step 7: Handle comma-separated numbers (e.g., 1,000,000)
  result = result.replace(/\b(\d{1,3}(?:,\d{3})+)(?:\.\d+)?\b/g, (match, _group, offset) => {
    const n = parseFloat(match.replace(/,/g, ''));
    if (isNaN(n)) return match;
    return contextAwareNumberToWords(n, originalText, offset, offset + match.length, language);
  });

  // Step 8: Handle decimal numbers (e.g., 3.14)
  result = result.replace(/\b(\d+\.\d+)\b/g, (match, num, offset) => {
    const n = parseFloat(num);
    if (isNaN(n)) return num;
    return contextAwareNumberToWords(n, originalText, offset, offset + match.length, language);
  });

  // Step 9: Handle remaining plain numbers
  result = result.replace(/\b(\d+)\b/g, (match, num, offset) => {
    const n = parseInt(num);
    if (isNaN(n)) return num;
    return contextAwareNumberToWords(n, originalText, offset, offset + match.length, language);
  });

  // Step 10: Handle ordinals for Khmer (ទី1 → ទីមួយ)
  if (isKhmer) {
    result = result.replace(/ទី\s*([មួយពីរបីបួនប្រាំហាសិបដប់រយពាន់មុឺនសែនលានចុច\s]+)/g, (match) => match);
  }

  return result;
}
