'use client';

import { useTranslations } from 'next-intl';
import { useStudioStore } from '@/stores/studio.store';
import { downloadBlob } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COUNTER_KEY = 'professor-somleng-tts-download-counter';

/** Get next sequential download number, formatted as 7-digit zero-padded */
function getNextFileNumber(): string {
  const current = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
  const next = current + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return String(next).padStart(7, '0');
}

export function DownloadMenu() {
  const t = useTranslations('studio.player');
  const audioBlob = useStudioStore((s) => s.audioBlob);
  const format = useStudioStore((s) => s.format);

  const handleDownload = (downloadFormat: 'mp3' | 'wav') => {
    if (!audioBlob) return;

    const extension = downloadFormat;
    const mimeType = downloadFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const blob = new Blob([audioBlob], { type: mimeType });
    const fileNumber = getNextFileNumber();
    const filename = `Professor_Somleng-tts-${fileNumber}.${extension}`;
    downloadBlob(blob, filename);
  };

  if (!audioBlob) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer"
          id="download-menu-btn"
        >
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          {t('download')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem onClick={() => handleDownload('mp3')} className="gap-2">
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">MP3</span>
          {t('downloadMp3')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('wav')} className="gap-2">
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">WAV</span>
          {t('downloadWav')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
