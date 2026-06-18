import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/tts/status?provider=voxcpm2|omnivoice
 * Checks if a TTS server is running and reachable.
 */
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider') || 'voxcpm2';

  let targetUrl = '';
  if (provider === 'voxcpm2') {
    targetUrl = process.env.VOXCPM2_API_URL || 'http://localhost:8808';
  } else if (provider === 'omnivoice') {
    targetUrl = process.env.OMNIVOICE_API_URL || 'http://localhost:8880';
  } else if (provider === 'fishspeech') {
    targetUrl = process.env.FISHSPEECH_API_URL || 'http://localhost:8080';
  } else {
    return NextResponse.json({ status: 'unknown', provider }, { status: 400 });
  }

  const checkUrl = provider === 'omnivoice'
    ? `${targetUrl.replace(/\/$/, '')}/v1/voices`
    : `${targetUrl.replace(/\/$/, '')}/`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(checkUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    
    // Any HTTP response indicates the port is active and the server is running
    const isRunning = response.ok || response.status === 401 || response.status === 404 || response.status === 405;

    return NextResponse.json({ 
      status: isRunning ? 'running' : 'stopped', 
      provider, 
      url: checkUrl 
    });
  } catch {
    return NextResponse.json({ status: 'stopped', provider, url: checkUrl });
  }
}
