export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
import { SUPPORTED_LANGUAGES, VOICE_CATALOG, VOICE_STYLES } from '@/lib/tts/voices.config';

export async function GET() {
  return NextResponse.json(
    {
      languages: SUPPORTED_LANGUAGES,
      voices: VOICE_CATALOG,
      styles: VOICE_STYLES,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  );
}

