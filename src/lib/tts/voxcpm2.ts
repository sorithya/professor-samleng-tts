/**
 * VoxCPM2 TTS Provider — connects to the locally running VoxCPM2 Gradio app.
 *
 * Supports: Voice Design, Controllable Cloning, Ultimate Cloning.
 * Optimized for natural, professional Khmer/English speech.
 */

import { TtsProvider, SynthesizeInput, SynthesizeResult, VoiceCatalog, Voice } from './provider';
import { SUPPORTED_LANGUAGES } from './voices.config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/* ---------- Professional Voice-Over Control Instructions ---------- */

/**
 * Control instructions sent to VoxCPM2 Gradio API.
 * These shape the voice character and delivery style.
 *
 * Design principles:
 * - Natural pacing — not rushed, not flat
 * - Pause appropriately at commas and full stops
 * - Emphasize key words in each sentence
 * - Pronounce every word accurately, including names, numbers, abbreviations
 * - Warm, clear, and human delivery
 * - Natural rhythm and subtle pitch variation, never robotic or monotone
 */
const VOICE_CONTROLS: Record<string, string> = {
  // Built-in designed voices — Khmer
  'voxcpm2-design-default': 'Professional voice-over artist. Read with natural pacing, not rushed, not flat. Pause appropriately at commas and full stops. Emphasize the key word in each sentence. Pronounce every word accurately including names, numbers, abbreviations, and foreign or loan words. Warm, clear, and human delivery with natural rhythm and subtle pitch variation, never robotic or monotone.',
  'voxcpm2-design-female-warm': 'Young professional female voice-over artist. Warm and gentle tone with clear enunciation. Natural rhythm with appropriate pauses at commas, periods, and between sentences. Not rushed, not flat. Emphasize key words naturally. Pronounce all words accurately. Like a professional radio host — engaging, human, with subtle pitch variation.',
  'voxcpm2-design-male-deep': 'Mature professional male voice-over artist. Deep and resonant voice, authoritative yet approachable. Steady pace like a documentary narrator. Pause naturally at punctuation. Emphasize important words. Pronounce names, numbers, and abbreviations clearly. Never monotone — use natural pitch variation.',
  'voxcpm2-khmer-news': 'Professional Khmer news anchor voice-over. Clear and articulate pronunciation of every word. Moderate natural pace — not rushed, not flat. Pause at commas and full stops. Emphasize key words in each sentence. Pronounce all Khmer words, names, numbers, and loan words accurately. Confident and authoritative yet warm. Natural breathing pauses and subtle pitch variation.',
  'voxcpm2-khmer-storyteller': 'Khmer storyteller voice-over artist. Warm and expressive delivery. Varied natural pace with dramatic pauses at punctuation. Emphasize emotionally important words. Clear pronunciation of all words including names and numbers. Engaging and human — never flat or monotone.',
  // Built-in designed voices — English
  'voxcpm2-en-professional': 'Professional English male voice-over artist. Clear BBC-style articulation. Read with natural pacing — not rushed, not flat. Pause appropriately at commas and full stops. Emphasize the key word in each sentence. Pronounce every word accurately including names, numbers, abbreviations, and any foreign words. Confident and authoritative. Natural rhythm and subtle pitch variation, never robotic or monotone.',
  'voxcpm2-en-warm': 'Warm young English female voice-over artist. Friendly and approachable. Natural conversational rhythm with proper pauses at punctuation. Emphasize key words naturally. Pronounce all words accurately. Gentle and engaging like a professional podcast host. Never flat or robotic — warm and human.',
};

/* ---------- Voice Catalog ---------- */

const VOXCPM2_VOICES: Voice[] = [];

/* ---------- Cloned Voice Type ---------- */

export interface ClonedVoice {
  id: string;
  name: string;
  referenceAudioPath: string;
  transcript?: string;
  description?: string;
  createdAt: number;
  isDefault?: boolean;
}

/* ---------- Style → Control Instruction Mapping ---------- */

/**
 * Style instructions appended to the voice control instruction.
 * Each style adds specific delivery guidance while maintaining
 * the base professional voice-over quality.
 */
const STYLE_INSTRUCTIONS: Record<string, string> = {
  default: 'Read like a professional voice-over artist. Use natural pacing — not rushed, not flat. Pause appropriately at commas and full stops. Emphasize the key word in each sentence. Pronounce every word accurately. Keep the delivery warm, clear, and human — natural rhythm and subtle pitch variation, never robotic or monotone.',
  news: 'Professional news broadcast style. Clear and authoritative. Steady moderate pace. Pause naturally at commas and between sentences. Emphasize key facts and names. Pronounce all names, numbers, and abbreviations accurately. Confident delivery with natural pitch variation.',
  narration: 'Storytelling narration voice-over. Warm and engaging. Varied natural rhythm with dramatic pauses at punctuation. Emotionally expressive — emphasize important words. Clear pronunciation of all words. Never flat or monotone.',
  conversational: 'Natural casual conversation. Relaxed but not lazy pace. Friendly and warm, like talking to a close friend. Pause at commas naturally. Emphasize words as you would in real speech. Clear pronunciation. Human and genuine, not robotic.',
  cheerful: 'Cheerful and enthusiastic delivery. Upbeat energy with a bright tone and a smile in the voice. Natural pacing with proper pauses. Emphasize exciting words. Clear and accurate pronunciation.',
  calm: 'Calm and soothing delivery. Slow gentle pace with longer pauses at commas and periods. Soft and peaceful, like a meditation guide. Clear enunciation. Subtle, warm pitch variation.',
  sad: 'Melancholic and reflective delivery. Slower pace with emotional pauses. Gentle and heartfelt. Subtle sadness in tone. Emphasize emotionally charged words. Clear but soft pronunciation.',
  whisper: 'Soft whisper delivery. Very quiet and intimate. Breathy and gentle with natural pauses. Clear articulation despite the low volume. Subtle and human.',
  serious: 'Serious and formal delivery. Steady authoritative pace. Measured and deliberate, with clear pauses at punctuation. Pronounce every word with precision. Emphasis on important terms.',
  customerService: 'Polite and professional customer service tone. Clear and helpful delivery. Warm and patient with natural pacing. Pause at commas. Pronounce all terms accurately. Friendly but professional.',
  advertisement: 'Energetic promotional style. Dynamic pace with well-timed pauses for emphasis. Exciting and persuasive. Attention-grabbing delivery. Pronounce brand names and numbers clearly. Never monotone.',
  poetry: 'Poetic recitation style. Rhythmic and melodic delivery. Expressive with careful emphasis on imagery and emotion. Artistic pauses at line breaks and punctuation. Clear, beautiful pronunciation.',
};

/* ---------- Emotion → Control Instruction Mapping ---------- */

/**
 * Emotion instructions appended to the control instruction.
 * Each emotion provides rich delivery guidance that can be
 * scaled by styleIntensity for subtle-to-dramatic effect.
 */
const EMOTION_INSTRUCTIONS: Record<string, string> = {
  neutral: '',
  happy: 'Speak with genuine happiness and warmth. Bright, upbeat tone with a natural smile in the voice. Slightly faster pace with energetic delivery.',
  sad: 'Speak with gentle melancholy and emotional depth. Slower, softer delivery with subtle sighs and reflective pauses. Lower pitch, tender and heartfelt.',
  excited: 'Speak with high energy and enthusiasm! Dynamic pace with rising intonation. Vibrant and animated delivery full of anticipation and joy.',
  angry: 'Speak with controlled intensity and force. Firm, sharp articulation with emphasis on key words. Faster pace with clipped, decisive delivery.',
  calm: 'Speak with serene tranquility and gentleness. Slow, measured pace with soft breath pauses. Warm, soothing tone like a meditation guide.',
  nervous: 'Speak with slight hesitation and uncertainty. Occasional pauses, slightly faster pace with subtle vocal tension. Restrained and cautious delivery.',
  serious: 'Speak with gravitas and authority. Deliberate, measured pace with weight on each word. Deep, steady tone conveying importance and formality.',
};

/* ---------- Provider Implementation ---------- */

export class VoxCPM2Provider implements TtsProvider {
  readonly name = 'voxcpm2';
  private baseUrl: string;
  private clonedVoices: Map<string, ClonedVoice> = new Map();
  private defaultVoicesRegistered = false;

  constructor() {
    this.baseUrl = process.env.VOXCPM2_API_URL || 'http://localhost:8808';
  }

  /**
   * Register built-in default cloned voices from reference audio files.
   * Called automatically on first listVoices() or synthesize().
   */
  private async registerDefaultVoices(): Promise<void> {
    if (this.defaultVoicesRegistered) return;
    this.defaultVoicesRegistered = true;

    const voicesDir = path.join(process.cwd(), 'public', 'samples');
    if (!fs.existsSync(voicesDir)) return;

    // Default voice configs — reference audio files from public/samples
    const defaultVoices: Array<{
      file: string;
      id: string;
      name: string;
      description: string;
      transcript?: string;
    }> = [
      {
        file: 'Admin កន្និកា.wav',
        id: 'sample-admin-kanitha',
        name: 'Admin Kanitha (Admin កន្និកា)',
        description: 'Voice profile of Admin Kanitha',
      },
      {
        file: 'The Kanitha Show.wav',
        id: 'sample-kanitha-show',
        name: 'The Kanitha Show',
        description: 'Voice profile of The Kanitha Show host',
      },
      {
        file: 'គុណម្ចាស់គ្រូ គូ សុភាព.wav',
        id: 'sample-kou-sopheap',
        name: 'Kou Sopheap (គូ សុភាព)',
        description: 'Voice profile of Kou Sopheap',
      },
      {
        file: 'វណ្ណា.wav',
        id: 'sample-vanna',
        name: 'Vanna (វណ្ណា)',
        description: 'Voice profile of Vanna',
      },
      {
        file: 'សុធា.wav',
        id: 'sample-sothea',
        name: 'Sothea (សុធា)',
        description: 'Voice profile of Sothea',
      },
      {
        file: 'ស៊ឺ-ម៉ាអ៊ី 2.mp3',
        id: 'sample-sima-yi-2',
        name: 'Sima Yi 2 (ស៊ឺ-ម៉ាអ៊ី 2)',
        description: 'Voice profile of Sima Yi 2',
      },
      {
        file: 'ស៊ឺ-ម៉ាអ៊ី.mp3',
        id: 'sample-sima-yi',
        name: 'Sima Yi (ស៊ឺ-ម៉ាអ៊ី)',
        description: 'Voice profile of Sima Yi',
      },
      {
        file: 'ស្រីពៅ.wav',
        id: 'sample-srey-pov',
        name: 'Srey Pov (ស្រីពៅ)',
        description: 'Voice profile of Srey Pov',
      },
    ];

    for (const config of defaultVoices) {
      const filePath = path.join(voicesDir, config.file);
      if (!fs.existsSync(filePath)) continue;

      // Upload to Gradio
      let gradioPath = filePath;
      try {
        const buffer = fs.readFileSync(filePath);
        const formData = new FormData();
        const mimeType = config.file.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
        const blob = new Blob([buffer], { type: mimeType });
        formData.append('files', blob, config.file);

        const uploadResponse = await fetch(`${this.baseUrl}/gradio_api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          gradioPath = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult;
          console.log(`[VoxCPM2] Default voice "${config.name}" uploaded → ${gradioPath}`);
        }
      } catch (e) {
        console.warn(`[VoxCPM2] Failed to upload default voice "${config.name}":`, e);
      }

      this.clonedVoices.set(config.id, {
        id: config.id,
        name: config.name,
        referenceAudioPath: gradioPath,
        description: config.description,
        transcript: config.transcript,
        createdAt: Date.now(),
        isDefault: true,
      });

      console.log(`[VoxCPM2] Registered default voice: ${config.name} (${config.id})`);
    }
  }

  async listVoices(): Promise<VoiceCatalog> {
    await this.registerDefaultVoices();

    const clonedAsVoices: Voice[] = Array.from(this.clonedVoices.values()).map((cv) => ({
      id: cv.id,
      name: `${cv.name}${cv.isDefault ? '' : ' (Cloned)'}`,
      language: 'km-KH',
      gender: 'neutral' as const,
      provider: 'voxcpm2',
      supportedStyles: ['default', 'news', 'narration', 'conversational'],
      isCloned: true,
    }));

    return {
      languages: SUPPORTED_LANGUAGES,
      voices: [...VOXCPM2_VOICES, ...clonedAsVoices],
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
    if (voice?.isDefault) return false; // Can't delete defaults
    return this.clonedVoices.delete(voiceId);
  }

  /**
   * Build the control instruction string for optimal natural speech.
   * Incorporates voice, style, emotion, and expressiveness controls.
   */
  private buildControlInstruction(input: SynthesizeInput): string {
    const parts: string[] = [];
    const voiceId = input.voiceId;
    const style = input.style;

    // 1. Emotion instruction (scaled by styleIntensity) — put this FIRST so the model prioritizes it
    if (input.emotion && input.emotion !== 'neutral') {
      const emotionText = EMOTION_INSTRUCTIONS[input.emotion];
      if (emotionText) {
        const intensity = input.styleIntensity ?? 50;
        let scaledEmotion: string;
        if (intensity < 30) {
          scaledEmotion = 'Deliver speech with a subtle hint of emotion: ' + emotionText;
        } else if (intensity > 70) {
          scaledEmotion = 'Deliver speech with extreme, intense, and highly dramatic emotion: ' + emotionText.toUpperCase();
        } else {
          scaledEmotion = 'Deliver speech with clear and distinct emotion: ' + emotionText;
        }
        parts.push(scaledEmotion);
      }
    }

    // 2. Expressiveness instruction — put this next to guide the variation strength
    if (input.expressiveness !== undefined) {
      if (input.expressiveness < 25) {
        parts.push('Speak with a very consistent, stable, and steady tone, maintaining minimal pitch and tempo changes.');
      } else if (input.expressiveness <= 50) {
        parts.push('Speak with a natural, stable tone with moderate expressiveness.');
      } else if (input.expressiveness <= 75) {
        parts.push('Speak with a highly expressive, dynamic, and engaging voice, showing noticeable pitch and speed variation.');
      } else {
        parts.push('Speak with extreme, passionate, and highly dramatic vocal acting, showing strong emotional peaks, natural breathing, sighs, and vivid pitch swings.');
      }
    }

    // 3. Style instruction
    if (style && style !== 'default') {
      const styleInstruction = STYLE_INSTRUCTIONS[style];
      if (styleInstruction) {
        parts.push(styleInstruction);
      }
    }

    // 4. Voice-specific control / description (put at the end so it doesn't drown out the style/emotion)
    const clonedVoice = this.clonedVoices.get(voiceId);
    if (clonedVoice?.description) {
      if (input.emotion && input.emotion !== 'neutral') {
        // Simplify voice description when emotion is active to avoid conflicting style guides
        const simplifiedDesc = clonedVoice.description
          .replace(', like a professional news reader', '')
          .replace('like a professional news reader', '')
          .replace(', clear articulation, natural and authoritative', '');
        parts.push(`Voice profile: ${simplifiedDesc}`);
      } else {
        parts.push(clonedVoice.description);
      }
    }

    const voiceControl = VOICE_CONTROLS[voiceId];
    if (voiceControl) {
      if (input.emotion && input.emotion !== 'neutral') {
        parts.push(`Voice character: ${voiceId.replace('voxcpm2-', '')} profile.`);
      } else {
        parts.push(voiceControl);
      }
    }

    // If no instructions at all, use default professional voice-over
    if (parts.length === 0) {
      parts.push('Read like a professional voice-over artist. Use natural pacing — not rushed, not flat. Pause appropriately at commas and full stops. Emphasize the key word in each sentence. Pronounce every word accurately including names, numbers, abbreviations, and any foreign or loan words. Keep the delivery warm, clear, and human — natural rhythm and subtle pitch variation, never robotic or monotone.');
    }

    return parts.join(' ');
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
    // Ensure default voices are registered
    await this.registerDefaultVoices();

    const controlInstruction = this.buildControlInstruction(input);
    const clonedVoice = this.clonedVoices.get(input.voiceId);

    // Build Gradio API request
    let refWav: { path: string; meta: { _type: string } } | null = null;
    let usePromptText = false;
    let promptTextValue = '';

    if (clonedVoice) {
      let referenceAudioPath = clonedVoice.referenceAudioPath;

      // On-demand upload if the path is still local (e.g., initial upload failed on server startup)
      const isLocalPath = !referenceAudioPath.includes('gradio') && 
                          !referenceAudioPath.includes('Temp') && 
                          !referenceAudioPath.includes('temp') && 
                          !referenceAudioPath.startsWith('http');

      if (isLocalPath) {
        try {
          console.log(`[VoxCPM2] Reference audio path is local. Uploading on-demand: ${referenceAudioPath}`);
          if (fs.existsSync(referenceAudioPath)) {
            const buffer = fs.readFileSync(referenceAudioPath);
            const formData = new FormData();
            const filename = path.basename(referenceAudioPath);
            const blob = new Blob([buffer], { type: 'audio/mp3' });
            formData.append('files', blob, filename);

            const uploadResponse = await fetch(`${this.baseUrl}/gradio_api/upload`, {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              const uploadedPath = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult;
              clonedVoice.referenceAudioPath = uploadedPath;
              referenceAudioPath = uploadedPath;
              console.log(`[VoxCPM2] Reference audio successfully uploaded → ${uploadedPath}`);
            } else {
              console.warn(`[VoxCPM2] On-demand upload returned status ${uploadResponse.status}`);
            }
          } else {
            console.error(`[VoxCPM2] Reference file does not exist locally: ${referenceAudioPath}`);
          }
        } catch (e) {
          console.error('[VoxCPM2] Failed to perform on-demand upload of reference audio:', e);
        }
      }

      refWav = {
        path: referenceAudioPath,
        meta: { _type: 'gradio.FileData' },
      };
      if (clonedVoice.transcript) {
        usePromptText = true;
        promptTextValue = clonedVoice.transcript;
      }
    }

    // Clone fidelity adjusts cfg_value: higher fidelity = higher cfg. Clamp between 1.0 and 3.0 (backend maximum is 3.0)
    const fidelity = input.cloneFidelity ?? 75;
    const cfgValue = Math.min(3.0, Math.max(1.0, 1.0 + (fidelity / 100) * 2.0)); // Range 1.0 to 3.0
    // Expressiveness adjusts dit_steps: more expressive = fewer steps for variation. Clamp between 1 and 50 (backend maximum is 50)
    const expr = input.expressiveness ?? 50;
    const ditSteps = Math.min(50, Math.max(1, Math.round(15 + ((100 - expr) / 100) * 15))); // Range 15 to 30

    try {
      // Submit to Gradio API using the required { data: [...] } format
      const data = [
        input.text,                  // 9 (target text)
        controlInstruction,          // 8 (control instruction)
        refWav,                      // 5 (ref wav)
        usePromptText,               // 6 (use prompt text)
        promptTextValue,             // 7 (prompt text value)
        cfgValue,                    // 13 (cfg value)
        true,                        // 12 (normalize)
        false,                       // 11 (denoise)
        ditSteps                     // 14 (dit steps)
      ];

      const submitResponse = await fetch(`${this.baseUrl}/gradio_api/call/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`VoxCPM2 submit failed (${submitResponse.status}): ${errorText}`);
      }

      const submitResult = await submitResponse.json();
      const eventId = submitResult.event_id;
      if (!eventId) throw new Error('No event_id from VoxCPM2');

      // Poll for results
      const resultResponse = await fetch(`${this.baseUrl}/gradio_api/call/generate/${eventId}`);
      if (!resultResponse.ok) {
        throw new Error(`VoxCPM2 result fetch failed: ${resultResponse.status}`);
      }

      const resultText = await resultResponse.text();
      const dataLines = resultText.split('\n').filter((l) => l.startsWith('data:'));
      let audioFilePath: string | null = null;

      for (const line of dataLines) {
        try {
          const cleanedLine = line.replace(/^data:\s*/, '').trim();
          const data = JSON.parse(cleanedLine);
          if (Array.isArray(data) && data.length > 0) {
            const fileData = data[0];
            if (fileData?.url) audioFilePath = fileData.url;
            else if (fileData?.path) audioFilePath = fileData.path;
          } else if (data && typeof data === 'object') {
            // Check for Gradio error events
            if (data.error) {
              throw new Error(`Gradio error: ${data.error}`);
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('Gradio error')) {
            throw e;
          }
          /* skip non-JSON or other irrelevant lines */
        }
      }

      if (!audioFilePath) throw new Error('No audio in VoxCPM2 response');

      // Download audio
      let audioBuffer: Buffer;
      if (audioFilePath.startsWith('http')) {
        const audioResponse = await fetch(audioFilePath);
        audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      } else {
        const audioUrl = `${this.baseUrl}/gradio_api/file=${audioFilePath}`;
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) throw new Error(`Audio download failed: ${audioResponse.status}`);
        audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      }

      // VoxCPM2 outputs 48kHz 16-bit mono WAV
      const estimatedDurationMs = Math.max(1000, Math.round((audioBuffer.length - 44) / (48000 * 2) * 1000));

      return {
        audio: audioBuffer,
        mime: 'audio/wav',
        durationMs: estimatedDurationMs,
        wordTimings: undefined,
      };
    } catch (error) {
      if (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))) {
        throw new Error(
          `Cannot connect to VoxCPM2 server at ${this.baseUrl}. ` +
          'Make sure it is running: python app_light.py --port 8808'
        );
      }
      throw error;
    }
  }
}
