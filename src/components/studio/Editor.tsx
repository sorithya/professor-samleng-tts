'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useStudioStore } from '@/stores/studio.store';
import { countWords } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MAX_CHARS = parseInt(process.env.NEXT_PUBLIC_MAX_CHARS || '50000', 10) || 50000;

export function Editor() {
  const t = useTranslations('studio.editor');
  const locale = useLocale();
  const isKhmer = locale === 'km';

  const text = useStudioStore((s) => s.text);
  const setText = useStudioStore((s) => s.setText);
  const isGenerating = useStudioStore((s) => s.isGenerating);
  const fontSize = useStudioStore((s) => s.fontSize);
  const setFontSize = useStudioStore((s) => s.setFontSize);

  // Load font size from localStorage on client-side mount
  useEffect(() => {
    const saved = localStorage.getItem('samleng-editor-fontsize');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 12 && parsed <= 72) {
        setFontSize(parsed);
      }
    }
  }, [setFontSize]);

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(72, fontSize + delta));
    setFontSize(newSize);
    localStorage.setItem('samleng-editor-fontsize', newSize.toString());
  };

  const charCount = text.length;
  const wordCount = countWords(text);
  const isOverLimit = charCount > MAX_CHARS;
  const percentUsed = Math.min((charCount / MAX_CHARS) * 100, 100);

  // Estimate number of chunks for long text
  const estimatedChunks = charCount > 500 ? Math.ceil(charCount / 500) : 1;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Editor Main Card */}
      <div className={`flex flex-col flex-1 min-h-0 rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300 shadow-sm ${
        isOverLimit
          ? 'border-destructive/50 focus-within:ring-2 focus-within:ring-destructive/30 focus-within:bg-card/70'
          : 'border-border/50 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 focus-within:bg-card/70'
      }`}>
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-muted/20 border-b border-border/30 shrink-0 select-none">
          <span className={`text-xs font-semibold text-muted-foreground ${isKhmer ? '' : 'uppercase tracking-wider'}`}>
            {t('label')}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {t('fontSize')}:
            </span>
            <div className="flex items-center bg-background border border-border/40 rounded-lg h-8 px-1 select-none shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeFontSize(-2)}
                disabled={fontSize <= 12}
                className="h-6 w-6 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20 cursor-pointer"
                title={t('decreaseFont')}
                id="decrease-font-btn"
              >
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Button>
              
              {/* Interactive number input box */}
              <input
                type="number"
                value={fontSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    const bounded = Math.max(12, Math.min(72, val));
                    setFontSize(bounded);
                    localStorage.setItem('samleng-editor-fontsize', bounded.toString());
                  }
                }}
                className="w-10 h-6 text-center bg-transparent border-0 text-xs font-sans font-bold text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="12"
                max="72"
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeFontSize(2)}
                disabled={fontSize >= 72}
                className="h-6 w-6 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20 cursor-pointer"
                title={t('increaseFont')}
                id="increase-font-btn"
              >
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* Textarea area */}
        <div className="relative flex-1 min-h-0">
          <textarea
            id="tts-editor"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isGenerating}
            placeholder={t('placeholder')}
            style={{ fontSize: `${fontSize}px` }}
            className={`w-full h-full resize-none bg-transparent p-5 leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-200 disabled:opacity-50 border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none outline-none ${isKhmer ? 'font-khmer' : 'font-sans'}`}
            aria-label="Text to synthesize"
            aria-describedby="char-counter"
          />
        </div>
      </div>

      {/* Counter bar */}
      <div
        id="char-counter"
        className="flex items-center justify-between mt-3 px-1"
      >
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className={isOverLimit ? 'text-destructive font-semibold' : ''}>
            {t('charCount', { count: charCount, max: MAX_CHARS.toLocaleString() })}
          </span>
          <span>{t('wordCount', { count: wordCount })}</span>
          {estimatedChunks > 1 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-[10px]">
              ✂ {estimatedChunks} chunks
            </span>
          )}
        </div>

        {text.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setText('')}
            className="h-7 rounded-lg text-xs text-muted-foreground hover:text-foreground"
            id="clear-text-btn"
          >
            <svg className="mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            {t('clear')}
          </Button>
        )}
      </div>

      {/* Progress bar for character usage */}
      {charCount > 0 && (
        <div className="mt-1.5 px-1">
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverLimit
                  ? 'bg-destructive'
                  : percentUsed > 80
                  ? 'bg-amber-500'
                  : 'bg-primary/60'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>
      )}

      {isOverLimit && (
        <p className="mt-1 text-xs text-destructive px-1">
          {t('tooLong')}
        </p>
      )}
    </div>
  );
}
