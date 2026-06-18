'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getHistory,
  deleteHistoryEntry,
  clearHistory,
  type HistoryEntry,
} from '@/lib/history';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function truncate(text: string, maxLen = 120): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAudioFormat(blob: Blob): string {
  if (blob.type.includes('wav')) return 'WAV';
  if (blob.type.includes('mp3') || blob.type.includes('mpeg')) return 'MP3';
  return 'Audio';
}

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function HistoryClient() {
  const t = useTranslations('history');
  const locale = useLocale();

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const data = await getHistory();
      setEntries(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        URL.revokeObjectURL(currentAudio.src);
      }
    };
  }, [currentAudio]);

  const handlePlay = (entry: HistoryEntry) => {
    // If already playing this entry, pause it
    if (playingId === entry.id && currentAudio) {
      currentAudio.pause();
      URL.revokeObjectURL(currentAudio.src);
      setPlayingId(null);
      setCurrentAudio(null);
      return;
    }

    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      URL.revokeObjectURL(currentAudio.src);
    }

    const url = URL.createObjectURL(entry.audioBlob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      setPlayingId(null);
      setCurrentAudio(null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      setPlayingId(null);
      setCurrentAudio(null);
    };
    audio.play();
    setPlayingId(entry.id);
    setCurrentAudio(audio);
  };

  const handleDownload = (entry: HistoryEntry) => {
    const url = URL.createObjectURL(entry.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = entry.audioBlob.type.includes('wav') ? 'wav' : 'mp3';
    a.download = `samleng-${entry.id.slice(0, 8)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Track which entries have been saved to disk (entry.id -> filePath)
  const [savedPaths, setSavedPaths] = useState<Record<string, string>>({});

  const handleShowInFolder = async (entry: HistoryEntry) => {
    // Check if running in Electron
    const electronAPI = (window as unknown as { electronAPI?: {
      showItemInFolder: (path: string) => Promise<boolean>;
      saveFileAndReveal: (name: string, data: string) => Promise<{ success: boolean; path?: string; name?: string; error?: string }>;
      isElectron: boolean;
    } }).electronAPI;
    if (!electronAPI) {
      handleDownload(entry);
      toast.info('Show in Folder only works in the desktop app');
      return;
    }

    // If already saved, just reveal the existing file
    const existingPath = savedPaths[entry.id];
    if (existingPath) {
      const found = await electronAPI.showItemInFolder(existingPath);
      if (found) {
        toast.success('Opened folder 📂');
      } else {
        // File was deleted, re-save
        setSavedPaths((prev) => { const next = { ...prev }; delete next[entry.id]; return next; });
        toast.info('File was moved/deleted, saving again...');
      }
      return;
    }

    try {
      // Convert blob to base64
      const arrayBuffer = await entry.audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      const ext = entry.audioBlob.type.includes('wav') ? '.wav' : '.mp3';
      const result = await electronAPI.saveFileAndReveal(`audio${ext}`, base64);

      if (result.success && result.path) {
        setSavedPaths((prev) => ({ ...prev, [entry.id]: result.path! }));
        toast.success(`Saved as ${result.name} 📂`);
      } else {
        toast.error(`Failed to save: ${result.error}`);
      }
    } catch (err) {
      console.error('Show in folder error:', err);
      toast.error('Failed to show in folder');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (playingId === id && currentAudio) {
      currentAudio.pause();
      URL.revokeObjectURL(currentAudio.src);
      setPlayingId(null);
      setCurrentAudio(null);
    }
    toast.success(t('deleted'));
  };

  const handleClearAll = async () => {
    await clearHistory();
    setEntries([]);
    if (currentAudio) {
      currentAudio.pause();
      URL.revokeObjectURL(currentAudio.src);
      setPlayingId(null);
      setCurrentAudio(null);
    }
    setShowClearConfirm(false);
    toast.success(t('cleared'));
  };

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="h-9 w-60 animate-pulse rounded-xl bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#6366f1]/10 to-[#8b5cf6]/10 dark:from-[#6366f1]/20 dark:to-[#8b5cf6]/20">
            <MicIcon className="h-12 w-12 text-[#6366f1] dark:text-[#818cf8]" />
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="mb-8 max-w-sm text-muted-foreground">{t('empty')}</p>
          <Link href={`/${locale}/studio`}>
            <Button
              className="rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-8 py-3 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              id="history-goto-studio"
            >
              {t('goToStudio')} →
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Main list ---- */
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="text-gradient">{t('title')}</span>
          </h1>
          <span className="inline-flex items-center rounded-full bg-[#6366f1]/10 px-3 py-1 text-sm font-medium text-[#6366f1] dark:bg-[#6366f1]/20 dark:text-[#818cf8]">
            {t('entries', { count: entries.length })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2">
              <span className="text-sm text-destructive">{t('clearConfirm')}</span>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-lg"
                onClick={handleClearAll}
                id="history-confirm-clear"
              >
                {t('clearAll')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg"
                onClick={() => setShowClearConfirm(false)}
                id="history-cancel-clear"
              >
                ✕
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setShowClearConfirm(true)}
              id="history-clear-all"
            >
              <TrashIcon className="mr-1.5 h-4 w-4" />
              {t('clearAll')}
            </Button>
          )}
        </div>
      </div>

      {/* Entries list */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group relative rounded-2xl border border-border/50 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-[#6366f1]/30 hover:shadow-md sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              {/* Play button */}
              <button
                onClick={() => handlePlay(entry)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg"
                id={`history-play-${entry.id}`}
                title={t('play')}
              >
                {playingId === entry.id ? (
                  <PauseIcon className="h-4.5 w-4.5" />
                ) : (
                  <PlayIcon className="h-4.5 w-4.5 ml-0.5" />
                )}
              </button>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="mb-1.5 text-sm font-medium leading-snug text-foreground text-left w-full cursor-pointer hover:text-primary transition-colors"
                >
                  {expandedId === entry.id ? entry.text : truncate(entry.text)}
                </button>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {/* Voice name */}
                  <span className="inline-flex items-center rounded-md bg-[#6366f1]/8 px-2 py-0.5 font-medium text-[#6366f1] dark:bg-[#6366f1]/15 dark:text-[#a5b4fc]">
                    {entry.voiceName || entry.voiceId}
                  </span>
                  {/* Style badge */}
                  {entry.style && entry.style !== 'default' && (
                    <span className="inline-flex items-center rounded-md bg-[#8b5cf6]/8 px-2 py-0.5 font-medium text-[#8b5cf6] dark:bg-[#8b5cf6]/15 dark:text-[#c4b5fd]">
                      {entry.style}
                    </span>
                  )}
                  {/* Audio format + size */}
                  <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    {getAudioFormat(entry.audioBlob)} · {formatFileSize(entry.audioBlob.size)}
                  </span>
                  {/* Char count */}
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    📝 {entry.text.length.toLocaleString()} chars
                  </span>
                  {/* Duration */}
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {formatDuration(entry.audioDurationMs)}
                  </span>
                  {/* Separator */}
                  <span className="text-border">·</span>
                  {/* Date */}
                  <span>{relativeTime(entry.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-xl p-0 text-muted-foreground hover:text-emerald-500"
                  onClick={() => handleShowInFolder(entry)}
                  title="Show in Folder"
                  id={`history-folder-${entry.id}`}
                >
                  <FolderIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-xl p-0 text-muted-foreground hover:text-[#6366f1]"
                  onClick={() => handleDownload(entry)}
                  title={t('download')}
                  id={`history-download-${entry.id}`}
                >
                  <DownloadIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-xl p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(entry.id)}
                  title={t('delete')}
                  id={`history-delete-${entry.id}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <div className="mt-8 flex justify-center">
        <Link href={`/${locale}/studio`}>
          <Button
            variant="outline"
            className="rounded-xl"
            id="history-back-to-studio"
          >
            {t('goToStudio')} →
          </Button>
        </Link>
      </div>
    </div>
  );
}
