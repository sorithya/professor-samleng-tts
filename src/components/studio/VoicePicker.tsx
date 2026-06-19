'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useStudioStore } from '@/stores/studio.store';
import { getVoicesForLanguage } from '@/lib/tts/voices.config';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Short preview texts for each language
const PREVIEW_TEXTS: Record<string, string> = {
  'km-KH': 'សួស្តី! ខ្ញុំជាសំឡេងនិយាយ។',
  'en-US': 'Hello! This is a voice preview sample.',
};

export function VoicePicker() {
  const t = useTranslations('studio.voice');
  const language = useStudioStore((s) => s.language);
  const voiceId = useStudioStore((s) => s.voiceId);
  const setVoiceId = useStudioStore((s) => s.setVoiceId);
  const provider = useStudioStore((s) => s.provider);

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewCache = useRef<Map<string, string>>(new Map());

  const voices = getVoicesForLanguage(language).filter((v) => v.provider === provider);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const handlePreview = useCallback(async (e: React.MouseEvent, targetVoiceId: string) => {
    e.stopPropagation(); // Don't select the voice

    // If already playing this voice, stop it
    if (playingId === targetVoiceId) {
      stopAudio();
      return;
    }

    // Stop any current audio
    stopAudio();

    // Check cache first
    const cached = previewCache.current.get(targetVoiceId);
    if (cached) {
      const audio = new Audio(cached);
      audioRef.current = audio;
      setPlayingId(targetVoiceId);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play();
      return;
    }

    setPreviewingId(targetVoiceId);

    try {
      const previewText = PREVIEW_TEXTS[language] || PREVIEW_TEXTS['en-US'];

      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          language,
          voiceId: targetVoiceId,
          style: 'default',
          rate: 1.0,
          pitch: 0,
          volume: 1.0,
          format: 'wav',
          provider,
          wantWordTimings: false,
        }),
      });

      if (!response.ok) {
        console.error('Preview failed:', response.status);
        return;
      }

      const contentType = response.headers.get('Content-Type') || 'audio/wav';
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: contentType });
      const url = URL.createObjectURL(blob);

      // Cache the preview
      previewCache.current.set(targetVoiceId, url);

      // Play it
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(targetVoiceId);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play();
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewingId(null);
    }
  }, [language, playingId, stopAudio]);

  const [isOpen, setIsOpen] = useState(false);
  const selectedVoice = voices.find((v) => v.id === voiceId);

  return (
    <div>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none group mb-2"
      >
        <label className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
          <span>{t('label')}</span>
          {!isOpen && selectedVoice && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
              {selectedVoice.name}
            </span>
          )}
        </label>
        <svg
          className={cn(
            'h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <div className="grid grid-cols-2 gap-1.5 animate-in fade-in duration-200">
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setVoiceId(voice.id)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all duration-150 text-left cursor-pointer',
                voiceId === voice.id
                  ? 'border-primary/50 bg-primary/8 ring-1 ring-primary/20'
                  : 'border-border/40 bg-card hover:border-primary/30'
              )}
              id={`voice-${voice.id}`}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0',
                  voice.gender === 'female'
                    ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                )}
              >
                {voice.name[0]}
              </div>

              {/* Name */}
              <span className="font-medium text-xs truncate flex-1 min-w-0">{voice.name}</span>

              {/* Preview */}
              <div
                onClick={(e) => handlePreview(e, voice.id)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md transition-all duration-150 shrink-0',
                  previewingId === voice.id
                    ? 'bg-primary/20 text-primary animate-pulse'
                    : playingId === voice.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground/50 hover:bg-primary/10 hover:text-primary'
                )}
                role="button"
                aria-label={t('preview')}
                id={`preview-${voice.id}`}
              >
                {previewingId === voice.id ? (
                  <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : playingId === voice.id ? (
                  <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                )}
              </div>

              {/* Check */}
              {voiceId === voice.id && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary shrink-0">
                  <svg className="h-2.5 w-2.5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
