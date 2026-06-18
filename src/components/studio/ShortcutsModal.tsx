'use client';

import type { ShortcutConfig } from '@/hooks/useKeyboardShortcuts';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutConfig[];
}

function formatKeyCombo(shortcut: ShortcutConfig): string[] {
  const keys: string[] = [];
  if (shortcut.ctrl) keys.push('Ctrl');
  if (shortcut.shift) keys.push('Shift');
  if (shortcut.alt) keys.push('Alt');

  // Display-friendly key names
  const keyMap: Record<string, string> = {
    enter: 'Enter',
    ' ': 'Space',
    escape: 'Esc',
    '?': '?',
  };
  keys.push(keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase());

  return keys;
}

export function ShortcutsModal({ open, onClose, shortcuts }: ShortcutsModalProps) {
  if (!open) return null;

  // Filter out Escape (it's used to close) from the displayed list
  const displayShortcuts = shortcuts.filter(
    (s) => s.key.toLowerCase() !== 'escape'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      id="shortcuts-modal-overlay"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        id="shortcuts-modal-backdrop"
      />

      {/* Modal card */}
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-[#6366f1]/20 bg-[#0f0a1e]/90 backdrop-blur-xl p-6 shadow-2xl shadow-[#6366f1]/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        id="shortcuts-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            id="shortcuts-modal-title"
            className="text-lg font-semibold text-white"
          >
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
            id="shortcuts-modal-close-btn"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="space-y-2">
          {displayShortcuts.map((shortcut, idx) => {
            const keys = formatKeyCombo(shortcut);
            return (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors"
                id={`shortcut-row-${idx}`}
              >
                <span className="text-sm text-white/80">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {keys.map((key, kidx) => (
                    <kbd
                      key={kidx}
                      className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 font-mono text-xs font-medium text-white/90 shadow-[0_2px_0_0_rgba(255,255,255,0.07)] select-none"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            Press <kbd className="inline-flex items-center rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
