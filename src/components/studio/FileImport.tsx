'use client';

import { useRef, useState, useCallback } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SUPPORTED_EXTENSIONS = ['.txt', '.srt', '.vtt', '.md', '.csv'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function parseSRT(content: string): string {
  // Extract text lines from SRT format (skip index and timestamps)
  return content
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.trim().split('\n');
      // Skip index line and timestamp line
      return lines.filter((l) => !l.match(/^\d+$/) && !l.match(/\d{2}:\d{2}:\d{2}/)).join(' ');
    })
    .filter(Boolean)
    .join('\n');
}

function parseVTT(content: string): string {
  // Remove WEBVTT header and parse like SRT
  const withoutHeader = content.replace(/^WEBVTT.*\n/, '');
  return parseSRT(withoutHeader);
}

export function FileImport() {
  const setText = useStudioStore((s) => s.setText);
  const text = useStudioStore((s) => s.text);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      // Validate extension
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        toast.error(`Unsupported format: ${ext}. Use: ${SUPPORTED_EXTENSIONS.join(', ')}`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File too large (max 5MB)');
        return;
      }

      try {
        const content = await file.text();
        let parsed = content;

        if (ext === '.srt') {
          parsed = parseSRT(content);
        } else if (ext === '.vtt') {
          parsed = parseVTT(content);
        } else if (ext === '.csv') {
          // Take first column of each row
          parsed = content
            .split('\n')
            .map((row) => row.split(',')[0]?.replace(/^"/, '').replace(/"$/, ''))
            .filter(Boolean)
            .join('\n');
        }

        // Append or replace
        if (text.trim()) {
          setText(text + '\n\n' + parsed.trim());
          toast.success(`Appended ${file.name} (${parsed.split('\n').length} lines)`);
        } else {
          setText(parsed.trim());
          toast.success(`Loaded ${file.name} (${parsed.split('\n').length} lines)`);
        }
      } catch {
        toast.error('Failed to read file');
      }
    },
    [setText, text],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 font-sans leading-normal">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
          File Import
        </span>
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
        <div className="animate-in fade-in duration-200 space-y-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border/50 hover:border-primary/40 hover:bg-muted/30',
            )}
          >
            <svg
              className="h-5 w-5 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span className="text-[11px] text-muted-foreground text-center">
              Drop file here or <span className="text-primary font-medium">browse</span>
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              .txt · .srt · .vtt · .md · .csv
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.srt,.vtt,.md,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
