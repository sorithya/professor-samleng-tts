'use client';

import { useState } from 'react';
import { useStudioStore } from '@/stores/studio.store';
import { cn } from '@/lib/utils';

export function FormatSelector() {
  const format = useStudioStore((s) => s.format);
  const setFormat = useStudioStore((s) => s.setFormat);
  const [isOpen, setIsOpen] = useState(false);

  const formats: Array<{ id: 'wav' | 'mp3'; label: string; desc: string }> = [
    { id: 'wav', label: 'WAV', desc: 'Lossless · High quality' },
    { id: 'mp3', label: 'MP3', desc: 'Compressed · Smaller file' },
  ];

  return (
    <div className="flex flex-col gap-2 font-sans leading-normal">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
          <span>Output Format</span>
          {!isOpen && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
              {format.toUpperCase()}
            </span>
          )}
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
        <div className="flex rounded-lg border border-border/50 overflow-hidden animate-in fade-in duration-200">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setFormat(fmt.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-all duration-200 cursor-pointer',
                format === fmt.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60',
              )}
            >
              <span className="font-semibold">{fmt.label}</span>
              <span className="text-[10px] opacity-70">{fmt.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
