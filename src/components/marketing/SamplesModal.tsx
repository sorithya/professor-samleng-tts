'use client';

import { useRef, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

interface Sample {
  id: string;
  nameEn: string;
  nameKm: string;
  file: string;
  genderEn: string;
  genderKm: string;
}

const SAMPLES: Sample[] = [
  { id: '1', nameEn: 'Admin Kanitha', nameKm: 'Admin កន្និកា', file: '/samples/Admin កន្និកា.wav', genderEn: 'Female', genderKm: 'ស្រី' },
  { id: '2', nameEn: 'The Kanitha Show', nameKm: 'The Kanitha Show', file: '/samples/The Kanitha Show.wav', genderEn: 'Female', genderKm: 'ស្រី' },
  { id: '3', nameEn: 'Venerable Kou Sopheap', nameKm: 'គុណម្ចាស់គ្រូ គូ សុភាព', file: '/samples/គុណម្ចាស់គ្រូ គូ សុភាព.wav', genderEn: 'Male', genderKm: 'ប្រុស' },
  { id: '4', nameEn: 'Vanna', nameKm: 'វណ្ណា', file: '/samples/វណ្ណា.wav', genderEn: 'Male', genderKm: 'ប្រុស' },
  { id: '5', nameEn: 'Sothea', nameKm: 'សុធា', file: '/samples/សុធា.wav', genderEn: 'Male', genderKm: 'ប្រុស' },
  { id: '6', nameEn: 'Sima Yi 2', nameKm: 'ស៊ឺ-ម៉ាអ៊ី 2', file: '/samples/ស៊ឺ-ម៉ាអ៊ី 2.mp3', genderEn: 'Male', genderKm: 'ប្រុស' },
  { id: '7', nameEn: 'Sima Yi', nameKm: 'ស៊ឺ-ម៉ាអ៊ី', file: '/samples/ស៊ឺ-ម៉ាអ៊ី.mp3', genderEn: 'Male', genderKm: 'ប្រុស' },
  { id: '8', nameEn: 'Srey Pov', nameKm: 'ស្រីពៅ', file: '/samples/ស្រីពៅ.wav', genderEn: 'Female', genderKm: 'ស្រី' },
];

interface SamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SamplesModal({ isOpen, onClose }: SamplesModalProps) {
  const locale = useLocale();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setPlayingId(null);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playingId]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handlePlayToggle = (sample: Sample) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === sample.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.src = sample.file;
      audio.load();
      audio.play()
        .then(() => {
          setPlayingId(sample.id);
        })
        .catch((err) => {
          console.error('Playback failed:', err);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekValue = parseFloat(e.target.value);
    audio.currentTime = seekValue;
    setCurrentTime(seekValue);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-background border border-border/80 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] scale-in-center animate-in fade-in zoom-in-95 duration-300 z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40 bg-muted/20">
          <div>
            <h2 className="text-2xl font-bold font-title">
              <span className="text-gradient-colorful">
                {locale === 'km' ? 'ស្តាប់សំឡេងគំរូ' : 'Listen to Voice Samples'}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {locale === 'km' 
                ? 'សំឡេងខ្មែរ AI ធម្មជាតិ និងមានគុណភាពខ្ពស់' 
                : 'High-quality, natural Khmer AI voices'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 border border-border/20"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SAMPLES.map((sample) => {
              const isCurrent = playingId === sample.id;
              const name = locale === 'km' ? sample.nameKm : sample.nameEn;
              const gender = locale === 'km' ? sample.genderKm : sample.genderEn;
              
              return (
                <div 
                  key={sample.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-300 flex flex-col justify-between gap-3 ${
                    isCurrent 
                      ? 'border-primary/40 shadow-md shadow-primary/5 bg-primary/[0.02]' 
                      : 'border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar Icon */}
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                      isCurrent 
                        ? 'bg-gradient-to-br from-[oklch(0.55_0.25_270)] to-[oklch(0.6_0.25_300)] text-white scale-105 shadow-md shadow-primary/20' 
                        : 'bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-105'
                    }`}>
                      {sample.genderEn === 'Male' ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>

                    {/* Voice details */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm truncate font-title group-hover:text-primary transition-colors duration-300">
                        {name}
                      </h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-1 ${
                        sample.genderEn === 'Male' 
                          ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20' 
                          : 'bg-pink-500/10 text-pink-500 dark:bg-pink-500/20'
                      }`}>
                        {gender}
                      </span>
                    </div>

                    {/* Equalizer animation when playing */}
                    {isCurrent && (
                      <div className="flex items-end gap-[2px] h-4 pb-[2px]">
                        <div className="w-[2px] h-3 bg-primary rounded-full animate-[pulse_0.8s_infinite] [animation-delay:0ms]" />
                        <div className="w-[2px] h-4 bg-primary rounded-full animate-[pulse_0.8s_infinite] [animation-delay:150ms]" />
                        <div className="w-[2px] h-2 bg-primary rounded-full animate-[pulse_0.8s_infinite] [animation-delay:300ms]" />
                        <div className="w-[2px] h-3 bg-primary rounded-full animate-[pulse_0.8s_infinite] [animation-delay:450ms]" />
                      </div>
                    )}
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      onClick={() => handlePlayToggle(sample)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ${
                        isCurrent 
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105' 
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/20'
                      }`}
                      aria-label={isCurrent ? 'Pause' : 'Play'}
                    >
                      {isCurrent ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="3" height="16" rx="1" />
                          <rect x="15" y="4" width="3" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                    </button>

                    {/* Progress Slider (Only visible for the current playing item) */}
                    {isCurrent ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeek}
                          className="flex-1 h-1.5 rounded-lg appearance-none bg-muted accent-primary cursor-pointer focus:outline-none"
                          style={{
                            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
                              duration ? (currentTime / duration) * 100 : 0
                            }%, var(--color-muted) ${
                              duration ? (currentTime / duration) * 100 : 0
                            }%, var(--color-muted) 100%)`,
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {formatTime(currentTime)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-muted-foreground italic flex items-center justify-between pl-1">
                        <span>
                          {sample.file.endsWith('.wav') ? 'WAV Audio' : 'MP3 Audio'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            {locale === 'km' ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
