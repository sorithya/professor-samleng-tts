/**
 * Provider Factory — selects the TTS provider based on environment or request.
 * Supports multiple providers running simultaneously.
 */

import { TtsProvider } from './provider';
import { MockTtsProvider } from './mock';
import { AzureTtsProvider } from './azure';
import { VoxCPM2Provider } from './voxcpm2';
import { OmniVoiceProvider } from './omnivoice';
import { FishSpeechProvider } from './fishspeech';

const providerCache = new Map<string, TtsProvider>();

/**
 * Get a TTS provider by name. Providers are cached after first creation.
 */
export function getTtsProvider(providerName?: string): TtsProvider {
  const name = providerName || process.env.TTS_PROVIDER || 'voxcpm2';

  const cached = providerCache.get(name);
  if (cached) return cached;

  let provider: TtsProvider;

  switch (name) {
    case 'azure':
      provider = new AzureTtsProvider();
      break;
    case 'voxcpm2':
      provider = new VoxCPM2Provider();
      break;
    case 'omnivoice':
      provider = new OmniVoiceProvider();
      break;
    case 'fishspeech':
      provider = new FishSpeechProvider();
      break;
    case 'mock':
    default:
      provider = new MockTtsProvider();
      break;
  }

  providerCache.set(name, provider);
  console.log(`[TTS Factory] Created provider: ${provider.name}`);
  return provider;
}

/**
 * Get the VoxCPM2 provider instance (for voice cloning operations).
 */
export function getVoxCPM2Provider(): VoxCPM2Provider | null {
  const provider = getTtsProvider('voxcpm2');
  if (provider instanceof VoxCPM2Provider) {
    return provider;
  }
  return null;
}


export function getProviderName(): string {
  return process.env.TTS_PROVIDER || 'voxcpm2';
}
