'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStudioStore } from '@/stores/studio.store';
import { usePlayerStore } from '@/stores/player.store';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import { DownloadMenu } from './DownloadMenu';

export function Player() {
  const t = useTranslations('studio.player');
  const audioUrl = useStudioStore((s) => s.audioUrl);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [isWsReady, setIsWsReady] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setIsReady = usePlayerStore((s) => s.setIsReady);
  const resetPlayer = usePlayerStore((s) => s.reset);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;

    let ws: any;
    let destroyed = false;

    const initWaveSurfer = async () => {
      try {
        const WaveSurfer = (await import('wavesurfer.js')).default;

        if (destroyed) return;

        // Destroy previous instance
        if (wavesurferRef.current) {
          try { wavesurferRef.current.destroy(); } catch { /* ignore */ }
        }

        // Clear the container
        if (waveformRef.current) {
          waveformRef.current.innerHTML = '';
        }

        setWsError(null);

        ws = WaveSurfer.create({
          container: waveformRef.current!,
          waveColor: '#8b5cf6',
          progressColor: '#6d28d9',
          cursorColor: '#7c3aed',
          cursorWidth: 2,
          barWidth: 3,
          barGap: 2,
          barRadius: 3,
          height: 80,
          normalize: true,
        });

        ws.on('ready', () => {
          if (destroyed) return;
          setIsReady(true);
          setIsWsReady(true);
          setDuration(ws.getDuration() * 1000);
        });

        ws.on('play', () => { if (!destroyed) setIsPlaying(true); });
        ws.on('pause', () => { if (!destroyed) setIsPlaying(false); });
        ws.on('finish', () => { if (!destroyed) setIsPlaying(false); });
        ws.on('timeupdate', (time: number) => {
          if (!destroyed) setCurrentTime(time * 1000);
        });
        ws.on('error', (err: any) => {
          console.error('[WaveSurfer] Error:', err);
          if (!destroyed) setWsError('Failed to load audio');
        });

        ws.load(audioUrl);
        wavesurferRef.current = ws;
      } catch (err) {
        console.error('[WaveSurfer] Init error:', err);
        if (!destroyed) setWsError('Failed to initialize audio player');
      }
    };

    initWaveSurfer();

    return () => {
      destroyed = true;
      if (ws) {
        try { ws.destroy(); } catch { /* ignore */ }
      }
      wavesurferRef.current = null;
      resetPlayer();
      setIsWsReady(false);
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayPause = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  if (!audioUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-muted/30 p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{t('noAudio')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{t('title')}</h3>
        <DownloadMenu />
      </div>

      {/* Waveform */}
      <div
        ref={waveformRef}
        className="w-full mb-4 rounded-xl overflow-hidden bg-muted/30 cursor-pointer"
        style={{ minHeight: '80px' }}
        id="waveform-player"
      />

      {wsError && (
        <p className="text-xs text-destructive mb-3">{wsError}</p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayPause}
          disabled={!isWsReady}
          className="h-10 w-10 rounded-xl"
          id="play-pause-btn"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </Button>

        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
