export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { getVoxCPM2Provider, getTtsProvider } from '@/lib/tts/factory';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const VOICE_DIR = path.join(os.tmpdir(), 'professor-somleng-tts-voices');

/**
 * POST /api/tts/clone — Register a cloned voice via multipart FormData.
 * Expected fields:
 *   - audio: File (the reference audio)
 *   - name: string
 *   - description?: string
 *   - transcript?: string
 *   - provider?: string
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const name = (formData.get('name') as string || '').trim();
    const description = (formData.get('description') as string || '').trim();
    const transcript = (formData.get('transcript') as string || '').trim();
    const providerName = (formData.get('provider') as string || 'voxcpm2').trim();

    if (!audioFile) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Voice name is required' },
        { status: 400 }
      );
    }

    // Save audio to disk
    if (!fs.existsSync(VOICE_DIR)) {
      fs.mkdirSync(VOICE_DIR, { recursive: true });
    }

    const ext = audioFile.type.includes('wav') ? '.wav' : '.mp3';
    const voiceId = `clone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const audioPath = path.join(VOICE_DIR, `${voiceId}${ext}`);

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(audioPath, buffer);

    console.log(`[Voice Clone] Saved reference audio: ${audioPath} (${buffer.length} bytes) for provider: ${providerName}`);

    if (providerName === 'fishspeech') {
      const fishProvider = getTtsProvider('fishspeech');
      if (!fishProvider || !('registerClonedVoice' in fishProvider)) {
        return NextResponse.json(
          { code: 'PROVIDER_NOT_SUPPORTED', message: 'Fish Speech provider is not available.' },
          { status: 400 }
        );
      }

      (fishProvider as any).registerClonedVoice({
        id: voiceId,
        name,
        referenceAudioPath: audioPath,
        transcript: transcript || undefined,
        description: description || undefined,
        createdAt: Date.now(),
      });

      console.log(`[Voice Clone] Registered Fish Speech voice: ${voiceId} (${name})`);

      return NextResponse.json({
        success: true,
        voice: {
          id: voiceId,
          name,
          provider: 'fishspeech',
          createdAt: Date.now(),
        },
      });
    }

    if (providerName === 'omnivoice') {
      const omniProvider = getTtsProvider('omnivoice');
      if (!omniProvider || !('registerClonedVoice' in omniProvider)) {
        return NextResponse.json(
          { code: 'PROVIDER_NOT_SUPPORTED', message: 'OmniVoice provider is not available.' },
          { status: 400 }
        );
      }

      // Upload profile to OmniVoice server
      const baseUrl = process.env.OMNIVOICE_API_URL || 'http://localhost:8880';
      try {
        const uploadFormData = new FormData();
        const blob = new Blob([buffer], { type: audioFile.type });
        uploadFormData.append('ref_audio', blob, `reference${ext}`);
        uploadFormData.append('profile_id', voiceId);
        if (transcript) {
          uploadFormData.append('ref_text', transcript);
        }
        uploadFormData.append('overwrite', 'true');

        const uploadResponse = await fetch(`${baseUrl}/v1/voices/profiles`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`[Voice Clone] OmniVoice upload failed: ${uploadResponse.status} - ${errorText}`);
          return NextResponse.json(
            { code: 'CLONE_ERROR', message: `OmniVoice profile creation failed: ${errorText}` },
            { status: 500 }
          );
        }
        
        console.log(`[Voice Clone] Registered profile on OmniVoice server: ${voiceId}`);
      } catch (e) {
        console.error('[Voice Clone] Could not upload profile to OmniVoice server:', e);
        return NextResponse.json(
          { code: 'CLONE_ERROR', message: `Could not connect to OmniVoice server: ${e instanceof Error ? e.message : String(e)}` },
          { status: 500 }
        );
      }

      // Register the cloned voice locally in provider cache
      (omniProvider as any).registerClonedVoice({
        id: voiceId,
        name,
        referenceAudioPath: audioPath,
        transcript: transcript || undefined,
        description: description || undefined,
        createdAt: Date.now(),
      });

      console.log(`[Voice Clone] Registered OmniVoice voice: ${voiceId} (${name})`);

      return NextResponse.json({
        success: true,
        voice: {
          id: voiceId,
          name,
          provider: 'omnivoice',
          createdAt: Date.now(),
        },
      });
    }

    // ─── VoxCPM2 Clone ───
    const voxProvider = getVoxCPM2Provider();
    if (!voxProvider) {
      return NextResponse.json(
        {
          code: 'PROVIDER_NOT_SUPPORTED',
          message: 'Voice cloning requires VoxCPM2 provider.',
        },
        { status: 400 }
      );
    }

    // Upload to Gradio server for cloning
    const baseUrl = process.env.VOXCPM2_API_URL || 'http://localhost:8808';
    let gradioPath = audioPath;

    try {
      const uploadFormData = new FormData();
      const blob = new Blob([buffer], { type: audioFile.type });
      uploadFormData.append('files', blob, `reference${ext}`);

      const uploadResponse = await fetch(`${baseUrl}/gradio_api/upload`, {
        method: 'POST',
        body: uploadFormData,
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        gradioPath = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult;
        console.log(`[Voice Clone] Uploaded to Gradio: ${gradioPath}`);
      } else {
        console.warn(`[Voice Clone] Gradio upload failed: ${uploadResponse.status}, using local path`);
      }
    } catch (e) {
      console.warn('[Voice Clone] Could not upload to Gradio, using local path:', e);
    }

    // Register the cloned voice
    voxProvider.registerClonedVoice({
      id: voiceId,
      name,
      referenceAudioPath: gradioPath,
      transcript: transcript || undefined,
      description: description || undefined,
      createdAt: Date.now(),
    });

    console.log(`[Voice Clone] Registered voice: ${voiceId} (${name})`);

    return NextResponse.json({
      success: true,
      voice: {
        id: voiceId,
        name,
        provider: 'voxcpm2',
        createdAt: Date.now(),
      },
    });
  } catch (error) {
    console.error('[Voice Clone] Error:', error);
    return NextResponse.json(
      { code: 'CLONE_ERROR', message: error instanceof Error ? error.message : 'Failed to clone voice' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tts/clone — List all cloned voices.
 */
export async function GET() {
  try {
    const voices: Array<{ id: string; name: string; description?: string; createdAt: number; provider: string }> = [];

    // VoxCPM2 cloned voices
    const voxProvider = getVoxCPM2Provider();
    if (voxProvider) {
      const voxVoices = voxProvider.getClonedVoices().map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        createdAt: v.createdAt,
        provider: 'voxcpm2',
      }));
      voices.push(...voxVoices);
    }

    // FishSpeech cloned voices
    const fishProvider = getTtsProvider('fishspeech');
    if (fishProvider && 'getClonedVoices' in fishProvider) {
      const fishVoices = (fishProvider as any).getClonedVoices().map((v: any) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        createdAt: v.createdAt,
        provider: 'fishspeech',
      }));
      voices.push(...fishVoices);
    }

    // OmniVoice cloned voices
    const omniProvider = getTtsProvider('omnivoice');
    if (omniProvider && 'getClonedVoices' in omniProvider) {
      const omniVoices = (omniProvider as any).getClonedVoices().map((v: any) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        createdAt: v.createdAt,
        provider: 'omnivoice',
      }));
      voices.push(...omniVoices);
    }

    return NextResponse.json({ voices });
  } catch (error) {
    console.error('[Voice Clone] Error:', error);
    return NextResponse.json({ voices: [] });
  }
}

/**
 * DELETE /api/tts/clone — Delete a cloned voice.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { voiceId, provider: deleteProvider } = await request.json();
    const targetProvider = deleteProvider || 'voxcpm2';

    let deleted = false;
    if (targetProvider === 'voxcpm2') {
      const voxProvider = getVoxCPM2Provider();
      if (voxProvider) {
        deleted = voxProvider.deleteClonedVoice(voiceId);
      }
    } else if (targetProvider === 'fishspeech') {
      const fishProvider = getTtsProvider('fishspeech');
      if (fishProvider && 'deleteClonedVoice' in fishProvider) {
        deleted = (fishProvider as any).deleteClonedVoice(voiceId);
      }
    } else if (targetProvider === 'omnivoice') {
      const omniProvider = getTtsProvider('omnivoice');
      if (omniProvider && 'deleteClonedVoice' in omniProvider) {
        deleted = (omniProvider as any).deleteClonedVoice(voiceId);
      }
      
      // Delete profile from OmniVoice server
      const baseUrl = process.env.OMNIVOICE_API_URL || 'http://localhost:8880';
      try {
        await fetch(`${baseUrl}/v1/voices/profiles/${voiceId}`, {
          method: 'DELETE',
        });
        console.log(`[Voice Clone] Deleted profile on OmniVoice server: ${voiceId}`);
      } catch (e) {
        console.error(`[Voice Clone] Failed to delete profile on OmniVoice server: ${voiceId}`, e);
      }
    }

    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('[Voice Clone] Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

