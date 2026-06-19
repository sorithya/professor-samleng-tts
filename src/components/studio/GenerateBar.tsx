'use client';

import { useTranslations } from 'next-intl';
import { useStudioStore } from '@/stores/studio.store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { saveToHistory, type HistoryEntry } from '@/lib/history';

const MAX_CHARS = parseInt(process.env.NEXT_PUBLIC_MAX_CHARS || '50000', 10) || 50000;

export function GenerateBar() {
  const t = useTranslations('studio.generate');
  const tErrors = useTranslations('studio.errors');
  const text = useStudioStore((s) => s.text);
  const language = useStudioStore((s) => s.language);
  const voiceId = useStudioStore((s) => s.voiceId);
  const style = useStudioStore((s) => s.style);
  const rate = useStudioStore((s) => s.rate);
  const pitch = useStudioStore((s) => s.pitch);
  const volume = useStudioStore((s) => s.volume);
  const format = useStudioStore((s) => s.format);
  const provider = useStudioStore((s) => s.provider);
  const emotion = useStudioStore((s) => s.emotion);
  const expressiveness = useStudioStore((s) => s.expressiveness);
  const styleIntensity = useStudioStore((s) => s.styleIntensity);
  const cloneFidelity = useStudioStore((s) => s.cloneFidelity);
  const isGenerating = useStudioStore((s) => s.isGenerating);
  const generationProgress = useStudioStore((s) => s.generationProgress);
  const setIsGenerating = useStudioStore((s) => s.setIsGenerating);
  const setGenerationProgress = useStudioStore((s) => s.setGenerationProgress);
  const setError = useStudioStore((s) => s.setError);
  const setAudioResult = useStudioStore((s) => s.setAudioResult);

  const charCount = text.length;
  const canGenerate = charCount > 0 && charCount <= MAX_CHARS && !isGenerating;
  const estimatedChunks = charCount > 500 ? Math.ceil(charCount / 500) : 1;

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error(tErrors('emptyText'));
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(`${t('generating') || 'Generating speech...'} 0%`);

    try {
      const startTime = Date.now();

      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          language,
          voiceId,
          style,
          rate,
          pitch,
          volume,
          format,
          provider,
          emotion,
          expressiveness,
          styleIntensity,
          cloneFidelity,
          wantWordTimings: estimatedChunks === 1,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.message || tErrors('generationFailed');

        if (error.code === 'RATE_LIMITED') {
          toast.error(tErrors('rateLimited'));
        } else if (error.code === 'QUOTA_EXCEEDED') {
          toast.error(tErrors('quotaExceeded'));
        } else {
          toast.error(errorMessage);
        }

        setError(errorMessage);
        return;
      }

      // Parse NDJSON Stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let audioBlob: Blob | null = null;
      let durationMs = 0;
      let wordTimings = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line

        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);

          if (msg.type === 'progress') {
            setGenerationProgress(`${t('generating') || 'Generating speech...'} ${msg.percent}%`);
          } else if (msg.type === 'done') {
            // Reconstruct audio from base64
            const audioBytes = Uint8Array.from(atob(msg.audio), (c) => c.charCodeAt(0));
            audioBlob = new Blob([audioBytes], { type: msg.mime });
            durationMs = msg.durationMs;
            wordTimings = msg.wordTimings || null;
          } else if (msg.type === 'error') {
            throw new Error(msg.message);
          }
        }
      }

      if (!audioBlob) {
        throw new Error(tErrors('generationFailed') || 'Failed to generate audio');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioResult(audioUrl, audioBlob, durationMs, wordTimings);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const sizeKB = (audioBlob.size / 1024).toFixed(0);
      const durationStr = durationMs > 0
        ? `${Math.floor(durationMs / 60000)}:${((durationMs % 60000) / 1000).toFixed(0).padStart(2, '0')}`
        : '';

      const successMsg = estimatedChunks > 1
        ? `✅ Generated ${estimatedChunks} chunks in ${elapsed}s — ${sizeKB} KB${durationStr ? ` • ${durationStr}` : ''}`
        : `✅ Audio generated in ${elapsed}s — ${sizeKB} KB${durationStr ? ` • ${durationStr}` : ''}`;
      toast.success(successMsg, { duration: 5000 });

      // Auto-save to history
      try {
        const voiceName = voiceId.replace(/^[a-z]{2}-[A-Z]{2}-/, '').replace(/Neural$/, '') || voiceId;
        const entryId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });

        const historyEntry: HistoryEntry = {
          id: entryId,
          text: text.trim(),
          language,
          voiceId,
          voiceName,
          style,
          rate,
          pitch,
          volume,
          audioBlob,
          audioDurationMs: durationMs,
          createdAt: Date.now(),
        };
        await saveToHistory(historyEntry);
      } catch (histErr) {
        console.warn('Failed to save to history:', histErr);
      }
    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : tErrors('generationFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          size="lg"
          className="flex-1 rounded-2xl bg-gradient-to-r from-[oklch(0.55_0.25_270)] to-[oklch(0.6_0.25_300)] py-7 text-lg font-semibold text-white shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:scale-[1.015] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-lg animate-pulse-brand cursor-pointer"
          id="generate-btn"
        >
          {isGenerating ? (
            <>
              <svg
                className="mr-2 h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('generating')}
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              {t('button')}
            </>
          )}
        </Button>

        {charCount > 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {charCount.toLocaleString()} chars
          </span>
        )}
      </div>

      {/* Generation progress bar */}
      {isGenerating && generationProgress && (() => {
        const match = generationProgress.match(/(\d+)%/);
        const percent = match ? match[1] : '0';
        return (
          <div className="flex items-center gap-3 px-1 animate-in fade-in duration-300">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" 
                style={{ width: `${percent}%` }} 
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
              {generationProgress}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
