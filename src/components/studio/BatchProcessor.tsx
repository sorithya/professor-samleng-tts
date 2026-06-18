'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studio.store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BatchItem {
  id: string;
  text: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  audioBlob?: Blob;
  error?: string;
}

export function BatchProcessor() {
  const text = useStudioStore((s) => s.text);
  const voiceId = useStudioStore((s) => s.voiceId);
  const language = useStudioStore((s) => s.language);
  const style = useStudioStore((s) => s.style);
  const format = useStudioStore((s) => s.format);
  const rate = useStudioStore((s) => s.rate);
  const provider = useStudioStore((s) => s.provider);

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const prepareBatch = useCallback(() => {
    if (!text.trim()) {
      toast.error('Enter text first, then split into batch items');
      return;
    }

    // Split by double newline, numbered lines, or single newline for short texts
    const lines = text
      .split(/\n{2,}/)
      .flatMap((block) => {
        // If a block is very long, keep it as-is
        if (block.length > 500) return [block.trim()];
        // Otherwise split by single newline
        return block.split('\n').map((l) => l.trim());
      })
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.error('No text to process');
      return;
    }

    const batchItems: BatchItem[] = lines.map((line, i) => ({
      id: `batch-${i}-${Date.now()}`,
      text: line,
      status: 'pending',
    }));

    setItems(batchItems);
    setIsOpen(true);
    setProgress(0);
    toast.success(`${batchItems.length} items ready for batch processing`);
  }, [text]);

  const runBatch = useCallback(async () => {
    if (items.length === 0) return;
    setIsRunning(true);
    setProgress(0);

    const total = items.length;
    const results: Blob[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Update status
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'processing' } : it)),
      );

      try {
        const response = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: item.text,
            voiceId,
            language,
            style,
            format,
            rate,
            provider,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const audioBlob = await response.blob();
        results.push(audioBlob);

        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'done', audioBlob } : it)),
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', error: err instanceof Error ? err.message : 'Failed' }
              : it,
          ),
        );
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsRunning(false);

    const doneCount = results.length;
    toast.success(`Batch complete: ${doneCount}/${total} generated`);
  }, [items, voiceId, language, style, format, rate, provider]);

  const downloadAll = useCallback(() => {
    const doneItems = items.filter((it) => it.status === 'done' && it.audioBlob);
    if (doneItems.length === 0) {
      toast.error('No audio to download');
      return;
    }

    doneItems.forEach((item, i) => {
      const ext = format === 'mp3' ? '.mp3' : '.wav';
      const padded = String(i + 1).padStart(3, '0');
      const fileName = `Professor_Somleng-batch-${padded}${ext}`;
      const url = URL.createObjectURL(item.audioBlob!);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    });

    toast.success(`Downloaded ${doneItems.length} files`);
  }, [items, format]);

  const [isSectionOpen, setIsSectionOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 font-sans leading-normal">
      <div 
        onClick={() => setIsSectionOpen(!isSectionOpen)} 
        className="flex items-center justify-between cursor-pointer select-none group"
      >
        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
          <span>Batch Processing</span>
          {!isSectionOpen && items.length > 0 && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
              {items.length} items ({items.filter(it => it.status === 'done').length} done)
            </span>
          )}
        </span>
        <svg
          className={cn(
            'h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform duration-200',
            isSectionOpen && 'rotate-180'
          )}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {isSectionOpen && (
        <div className="animate-in fade-in duration-200 space-y-2">
          {items.length > 0 && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Items List</span>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                {isOpen ? 'Hide' : 'Show'}
              </button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={prepareBatch}
            className="w-full text-xs rounded-lg h-8"
            disabled={isRunning}
          >
            ⚡ Split Text into Batch Items
          </Button>

          {isOpen && items.length > 0 && (
            <div className="space-y-2">
              {/* Progress bar */}
              {isRunning && (
                <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Items list */}
              <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px]',
                      item.status === 'done' && 'bg-green-500/10',
                      item.status === 'error' && 'bg-red-500/10',
                      item.status === 'processing' && 'bg-primary/10 animate-pulse',
                      item.status === 'pending' && 'bg-muted/30',
                    )}
                  >
                    <span className="shrink-0 w-5 text-center text-muted-foreground">
                      {item.status === 'done'
                        ? '✓'
                        : item.status === 'error'
                          ? '✗'
                          : item.status === 'processing'
                            ? '◉'
                            : `${i + 1}`}
                    </span>
                    <span className="truncate flex-1">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5">
                <Button
                  variant="default"
                  size="sm"
                  onClick={runBatch}
                  disabled={isRunning || items.every((it) => it.status === 'done')}
                  className="flex-1 text-xs rounded-lg h-8"
                >
                  {isRunning
                    ? `Processing ${progress}%...`
                    : items.some((it) => it.status === 'done')
                      ? '🔄 Re-run All'
                      : '▶ Generate All'}
                </Button>
                {items.some((it) => it.status === 'done') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAll}
                    className="text-xs rounded-lg h-8"
                  >
                    ⬇ Download All
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
