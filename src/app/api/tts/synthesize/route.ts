export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { SynthesizeRequestSchema, createApiError } from '@/lib/validation';
import { getTtsProvider } from '@/lib/tts/factory';
import { getVoiceById } from '@/lib/tts/voices.config';
import { normalizeTextForTTS } from '@/lib/tts/normalize';
import type { SynthesizeInput } from '@/lib/tts/provider';

// Simple in-memory rate limiter (replace with Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Split long text into chunks at sentence boundaries.
 * Each chunk is at most `maxChunkChars` characters.
 * Prefers splitting at sentence endings (។ . ! ? ។ ...)
 */
function splitTextIntoChunks(text: string, maxChunkChars = 500): string[] {
  if (text.length <= maxChunkChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChunkChars) {
      chunks.push(remaining.trim());
      break;
    }

    // Find the best split point within maxChunkChars
    const window = remaining.slice(0, maxChunkChars);

    // Try sentence-ending punctuation (Khmer ។, English . ! ? and newlines)
    const sentenceEnders = /[។\.!\?\n]/g;
    let lastGoodSplit = -1;
    let match;

    while ((match = sentenceEnders.exec(window)) !== null) {
      lastGoodSplit = match.index + 1;
    }

    // If no sentence boundary found, try splitting at comma, semicolon, or space
    if (lastGoodSplit === -1 || lastGoodSplit < maxChunkChars * 0.3) {
      const fallbackSplitters = /[,;，；\s]/g;
      while ((match = fallbackSplitters.exec(window)) !== null) {
        lastGoodSplit = match.index + 1;
      }
    }

    // Last resort: hard split
    if (lastGoodSplit === -1) {
      lastGoodSplit = maxChunkChars;
    }

    const chunk = remaining.slice(0, lastGoodSplit).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(lastGoodSplit).trim();
  }

  return chunks;
}

/**
 * Concatenate multiple WAV buffers into a single WAV file.
 * Assumes all buffers have the same sample rate and format.
 */
function concatenateWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];

  // Extract raw PCM data from each WAV (skip 44-byte header)
  const pcmChunks: Buffer[] = [];
  let totalPcmLength = 0;

  for (const buf of buffers) {
    if (buf.length <= 44) continue;
    const pcm = buf.subarray(44);
    pcmChunks.push(pcm);
    totalPcmLength += pcm.length;
  }

  if (pcmChunks.length === 0) return buffers[0];

  // Copy the header from the first buffer
  const header = Buffer.from(buffers[0].subarray(0, 44));

  // Update file size in header (bytes 4-7): totalPcmLength + 36
  header.writeUInt32LE(totalPcmLength + 36, 4);
  // Update data size in header (bytes 40-43): totalPcmLength
  header.writeUInt32LE(totalPcmLength, 40);

  // Concatenate header + all PCM data
  return Buffer.concat([header, ...pcmChunks]);
}

interface TextSegment {
  text: string;
  emotion?: string;
  style?: string;
}

function parseEmotionSegments(text: string, defaultEmotion = 'neutral', defaultStyle = 'default'): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\[([a-zA-Z\s]+)\]/g;

  let match;
  let lastIndex = 0;
  let currentEmotion = defaultEmotion;
  let currentStyle = defaultStyle;

  while ((match = regex.exec(text)) !== null) {
    const tagIndex = match.index;
    const tagText = match[0];
    const rawTag = match[1].toLowerCase().trim();

    // Grab text before this tag
    const textBefore = text.slice(lastIndex, tagIndex).trim();
    if (textBefore) {
      segments.push({
        text: textBefore,
        emotion: currentEmotion,
        style: currentStyle,
      });
    }

    // Determine the style / emotion for the next segment based on the tag
    currentEmotion = 'neutral';
    currentStyle = 'default';

    if (['neutral', 'happy', 'sad', 'excited', 'angry', 'calm', 'nervous', 'serious'].includes(rawTag)) {
      currentEmotion = rawTag;
    } else if (rawTag === 'whisper' || rawTag === 'whispers') {
      currentStyle = 'whisper';
    } else if (rawTag === 'laughs' || rawTag === 'laughter' || rawTag === 'laugh') {
      currentEmotion = 'happy';
    } else if (rawTag === 'sighs' || rawTag === 'sigh') {
      currentEmotion = 'sad';
    } else if (['news', 'narration', 'conversational', 'cheerful', 'advertisement', 'poetry'].includes(rawTag)) {
      currentStyle = rawTag;
    } else {
      // Fallback: keep previous or use default
      currentEmotion = defaultEmotion;
      currentStyle = defaultStyle;
    }

    lastIndex = tagIndex + tagText.length;
  }

  // Grab remaining text
  const remainingText = text.slice(lastIndex).trim();
  if (remainingText) {
    segments.push({
      text: remainingText,
      emotion: currentEmotion,
      style: currentStyle,
    });
  }

  // If no tags were found, return the whole text as one segment
  if (segments.length === 0 && text.trim()) {
    segments.push({
      text: text.trim(),
      emotion: defaultEmotion,
      style: defaultStyle,
    });
  }

  return segments;
}

interface SynthChunk {
  text: string;
  emotion: string;
  style: string;
}

function buildSynthChunks(
  text: string,
  defaultEmotion: string,
  defaultStyle: string,
  maxChunkChars = 500
): SynthChunk[] {
  const segments = parseEmotionSegments(text, defaultEmotion, defaultStyle);
  const chunks: SynthChunk[] = [];

  for (const seg of segments) {
    if (seg.text.length <= maxChunkChars) {
      chunks.push({
        text: seg.text,
        emotion: seg.emotion || defaultEmotion,
        style: seg.style || defaultStyle,
      });
    } else {
      const subTexts = splitTextIntoChunks(seg.text, maxChunkChars);
      for (const subText of subTexts) {
        chunks.push({
          text: subText,
          emotion: seg.emotion || defaultEmotion,
          style: seg.style || defaultStyle,
        });
      }
    }
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        createApiError('RATE_LIMITED', 'Too many requests. Please wait a moment.'),
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const result = SynthesizeRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', 'Invalid request', result.error.flatten()),
        { status: 400 }
      );
    }

    const input = result.data;

    // Check max length (use env or default)
    const maxChars = parseInt(process.env.MAX_CHARS_PER_REQUEST_FREE || '50000', 10);
    if (input.text.length > maxChars) {
      return NextResponse.json(
        createApiError('TEXT_TOO_LONG', `Text exceeds maximum of ${maxChars} characters.`),
        { status: 400 }
      );
    }

    // Validate voice exists (cloned voices start with "clone-" and are stored in the provider)
    const isClonedVoice = input.voiceId.startsWith('clone-');
    const voice = getVoiceById(input.voiceId);
    if (!voice && !isClonedVoice) {
      return NextResponse.json(
        createApiError('UNSUPPORTED_VOICE', `Voice "${input.voiceId}" not found.`),
        { status: 400 }
      );
    }
    // Select TTS provider based on request (defaults to env config)
    const providerName = (body.provider as string) || undefined;
    const provider = getTtsProvider(providerName);
    console.log(`[TTS] Using provider: ${provider.name}`);

    // Normalize numbers and special characters for the target language
    const normalizedText = normalizeTextForTTS(input.text, input.language);
    console.log(`[TTS Normalize] ${input.language}: "${input.text.slice(0, 80)}" → "${normalizedText.slice(0, 80)}"`);

    // For long texts, use smart chunking
    // For long texts and inline tags, build structured chunks
    const chunks = buildSynthChunks(normalizedText, input.emotion || 'neutral', input.style || 'default', 500);
    console.log(`[TTS Synthesize] Text: ${normalizedText.length} chars → ${chunks.length} chunk(s)`);

    if (input.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Initial 0% progress
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', percent: 0 }) + '\n'));

            if (chunks.length === 1) {
              // Single chunk
              const synthesized = await provider.synthesize({
                text: chunks[0].text,
                language: input.language,
                voiceId: input.voiceId,
                style: chunks[0].style,
                rate: input.rate,
                pitch: input.pitch,
                volume: input.volume,
                format: input.format,
                emotion: chunks[0].emotion,
                expressiveness: input.expressiveness,
                styleIntensity: input.styleIntensity,
                cloneFidelity: input.cloneFidelity,
                wantWordTimings: input.wantWordTimings,
              });

              controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', percent: 100 }) + '\n'));
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'done',
                    audio: Buffer.from(synthesized.audio).toString('base64'),
                    mime: synthesized.mime,
                    durationMs: synthesized.durationMs ?? 0,
                    wordTimings: synthesized.wordTimings,
                  }) + '\n'
                )
              );
            } else {
              // Multi-chunk
              const audioBuffers: Buffer[] = [];
              let totalDurationMs = 0;

              for (let i = 0; i < chunks.length; i++) {
                const synthesizeInput: SynthesizeInput = {
                  text: chunks[i].text,
                  language: input.language,
                  voiceId: input.voiceId,
                  style: chunks[i].style,
                  rate: input.rate,
                  pitch: input.pitch,
                  volume: input.volume,
                  format: 'wav',
                  emotion: chunks[i].emotion,
                  expressiveness: input.expressiveness,
                  styleIntensity: input.styleIntensity,
                  cloneFidelity: input.cloneFidelity,
                  wantWordTimings: false,
                };

                const synthesized = await provider.synthesize(synthesizeInput);
                audioBuffers.push(Buffer.from(synthesized.audio));
                totalDurationMs += synthesized.durationMs ?? 0;

                const percent = Math.round(((i + 1) / chunks.length) * 100);
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', percent }) + '\n'));
              }

              const stitchedAudio = concatenateWavBuffers(audioBuffers);
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'done',
                    audio: Buffer.from(stitchedAudio).toString('base64'),
                    mime: 'audio/wav',
                    durationMs: totalDurationMs,
                    wordTimings: undefined,
                  }) + '\n'
                )
              );
            }
            controller.close();
          } catch (err) {
            console.error('[TTS Synthesize Stream] Error:', err);
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'error',
                  message: err instanceof Error ? err.message : 'An unexpected error occurred.',
                }) + '\n'
              )
            );
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    if (chunks.length === 1) {
      // Single chunk — direct synthesis
      const synthesized = await provider.synthesize({
        text: chunks[0].text,
        language: input.language,
        voiceId: input.voiceId,
        style: chunks[0].style,
        rate: input.rate,
        pitch: input.pitch,
        volume: input.volume,
        format: input.format,
        emotion: chunks[0].emotion,
        expressiveness: input.expressiveness,
        styleIntensity: input.styleIntensity,
        cloneFidelity: input.cloneFidelity,
        wantWordTimings: input.wantWordTimings,
      });

      return new NextResponse(new Uint8Array(synthesized.audio), {
        status: 200,
        headers: {
          'Content-Type': synthesized.mime,
          'Content-Length': synthesized.audio.length.toString(),
          'X-Audio-Duration-Ms': (synthesized.durationMs ?? 0).toString(),
          'X-Word-Timings': synthesized.wordTimings
            ? Buffer.from(JSON.stringify(synthesized.wordTimings), 'utf-8').toString('base64')
            : '',
          'X-Chunks': '1',
        },
      });
    }

    // Multi-chunk synthesis — generate each chunk and stitch together
    const audioBuffers: Buffer[] = [];
    let totalDurationMs = 0;

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[TTS Synthesize] Generating chunk ${i + 1}/${chunks.length} (${chunks[i].text.length} chars)`);

      const synthesizeInput: SynthesizeInput = {
        text: chunks[i].text,
        language: input.language,
        voiceId: input.voiceId,
        style: chunks[i].style,
        rate: input.rate,
        pitch: input.pitch,
        volume: input.volume,
        format: 'wav', // Always WAV for stitching
        emotion: chunks[i].emotion,
        expressiveness: input.expressiveness,
        styleIntensity: input.styleIntensity,
        cloneFidelity: input.cloneFidelity,
        wantWordTimings: false, // No timings for chunked mode
      };

      const synthesized = await provider.synthesize(synthesizeInput);
      audioBuffers.push(Buffer.from(synthesized.audio));
      totalDurationMs += synthesized.durationMs ?? 0;
    }

    // Stitch all chunks together
    const stitchedAudio = concatenateWavBuffers(audioBuffers);
    console.log(`[TTS Synthesize] Stitched ${chunks.length} chunks → ${stitchedAudio.length} bytes, ${totalDurationMs}ms`);

    return new NextResponse(new Uint8Array(stitchedAudio), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': stitchedAudio.length.toString(),
        'X-Audio-Duration-Ms': totalDurationMs.toString(),
        'X-Word-Timings': '',
        'X-Chunks': chunks.length.toString(),
      },
    });
  } catch (error) {
    console.error('[TTS Synthesize] Error:', error);
    return NextResponse.json(
      createApiError(
        'PROVIDER_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred.'
      ),
      { status: 500 }
    );
  }
}

