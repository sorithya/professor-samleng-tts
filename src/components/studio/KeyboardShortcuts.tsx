'use client';

import { useState, useMemo, useCallback } from 'react';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/useKeyboardShortcuts';
import { useStudioStore } from '@/stores/studio.store';
import { usePlayerStore } from '@/stores/player.store';
import { downloadBlob } from '@/lib/utils';
import { ShortcutsModal } from './ShortcutsModal';

export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  const setText = useStudioStore((s) => s.setText);
  const audioBlob = useStudioStore((s) => s.audioBlob);
  const format = useStudioStore((s) => s.format);
  const audioUrl = useStudioStore((s) => s.audioUrl);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const handleGenerate = useCallback(() => {
    const btn = document.getElementById('generate-btn') as HTMLButtonElement | null;
    if (btn && !btn.disabled) {
      btn.click();
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    const btn = document.getElementById('play-pause-btn') as HTMLButtonElement | null;
    if (btn && !btn.disabled) {
      btn.click();
    }
  }, []);

  const handleDownload = useCallback(() => {
    const blob = useStudioStore.getState().audioBlob;
    const fmt = useStudioStore.getState().format;
    if (!blob) return;

    const COUNTER_KEY = 'professor-somleng-tts-download-counter';
    const current = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
    const next = current + 1;
    localStorage.setItem(COUNTER_KEY, String(next));
    const fileNumber = String(next).padStart(7, '0');

    const mimeType = fmt === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const downloadBlb = new Blob([blob], { type: mimeType });
    const filename = `Professor_Somleng-tts-${fileNumber}.${fmt}`;
    downloadBlob(downloadBlb, filename);
  }, []);

  const handleClearText = useCallback(() => {
    setText('');
  }, [setText]);

  const shortcuts = useMemo<ShortcutConfig[]>(
    () => [
      {
        key: 'Enter',
        ctrl: true,
        action: handleGenerate,
        description: 'Generate speech',
      },
      {
        key: ' ',
        action: handlePlayPause,
        description: 'Play / Pause audio',
      },
      {
        key: 's',
        ctrl: true,
        action: handleDownload,
        description: 'Download current audio',
      },
      {
        key: 'C',
        ctrl: true,
        shift: true,
        action: handleClearText,
        description: 'Clear text editor',
      },
      {
        key: '?',
        action: () => setShowHelp(true),
        description: 'Show shortcuts help',
      },
      {
        key: 'Escape',
        action: () => setShowHelp(false),
        description: 'Close modal',
      },
    ],
    [handleGenerate, handlePlayPause, handleDownload, handleClearText]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <ShortcutsModal
      open={showHelp}
      onClose={() => setShowHelp(false)}
      shortcuts={shortcuts}
    />
  );
}
