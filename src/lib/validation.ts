/**
 * Zod validation schemas for API inputs.
 */

import { z } from 'zod';

export const SynthesizeRequestSchema = z.object({
  text: z.string()
    .min(1, 'Text is required')
    .max(50000, 'Text is too long'),
  language: z.string().min(2).max(10),
  voiceId: z.string().min(1),
  style: z.string().optional().default('default'),
  rate: z.number().min(0.2).max(2.0).optional().default(1.0),
  pitch: z.number().min(-12).max(12).optional().default(0),
  volume: z.number().min(0).max(1).optional().default(1.0),
  format: z.enum(['mp3', 'wav']).optional().default('mp3'),
  wantWordTimings: z.boolean().optional().default(false),
  emotion: z.string().optional().default('neutral'),
  expressiveness: z.number().min(0).max(100).optional().default(50),
  styleIntensity: z.number().min(0).max(100).optional().default(50),
  cloneFidelity: z.number().min(0).max(100).optional().default(75),
  stream: z.boolean().optional().default(false),
});

export type SynthesizeRequest = z.infer<typeof SynthesizeRequestSchema>;

/** Typed error codes for the API */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'TEXT_TOO_LONG'
  | 'UNSUPPORTED_VOICE'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export function createApiError(code: ApiErrorCode, message: string, details?: unknown): ApiError {
  return { code, message, details };
}
