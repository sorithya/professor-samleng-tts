'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useStudioStore, type EmotionPreset } from '@/stores/studio.store';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/* ---------- Emotion Presets ---------- */

const EMOTION_PRESETS: { id: EmotionPreset; icon: string }[] = [
  { id: 'neutral', icon: '😐' },
  { id: 'happy', icon: '😊' },
  { id: 'sad', icon: '😢' },
  { id: 'excited', icon: '🤩' },
  { id: 'angry', icon: '😠' },
  { id: 'calm', icon: '😌' },
  { id: 'nervous', icon: '😰' },
  { id: 'serious', icon: '🧐' },
];

/* ---------- Slider Sub-Component ---------- */

function EmotionSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  defaultValue,
  id,
  hint,
  warning,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
  id: string;
  hint?: string;
  warning?: string;
}) {
  const isDefault = value === defaultValue;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <span>{label}</span>
          {hint && (
            <span className="text-[10px] font-normal text-muted-foreground/70">
              {hint}
            </span>
          )}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-foreground tabular-nums font-semibold">
            {value}
          </span>
          {!isDefault && (
            <button
              onClick={() => onChange(defaultValue)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={`Reset ${label}`}
            >
              ↺
            </button>
          )}
        </div>
      </div>
      <Slider
        id={id}
        value={[value]}
        onValueChange={(v) => onChange(typeof v === 'number' ? v : v[0])}
        min={min}
        max={max}
        step={step}
        className="w-full"
        aria-label={label}
      />
      {warning && (
        <p className="text-[10px] text-amber-500 flex items-center gap-1 animate-in fade-in duration-200">
          <svg className="h-3 w-3 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <span>{warning}</span>
        </p>
      )}
    </div>
  );
}

/* ---------- Main Component ---------- */

export function EmotionControls() {
  const t = useTranslations('studio.emotion');
  const locale = useLocale();
  const isKhmer = locale === 'km';

  const emotion = useStudioStore((s) => s.emotion);
  const expressiveness = useStudioStore((s) => s.expressiveness);
  const styleIntensity = useStudioStore((s) => s.styleIntensity);
  const cloneFidelity = useStudioStore((s) => s.cloneFidelity);
  const setEmotion = useStudioStore((s) => s.setEmotion);
  const setExpressiveness = useStudioStore((s) => s.setExpressiveness);
  const setStyleIntensity = useStudioStore((s) => s.setStyleIntensity);
  const setCloneFidelity = useStudioStore((s) => s.setCloneFidelity);
  const resetEmotion = useStudioStore((s) => s.resetEmotion);

  const [isOpen, setIsOpen] = useState(false);

  const selectedPreset = EMOTION_PRESETS.find((p) => p.id === emotion);
  const isDefault = emotion === 'neutral' && expressiveness === 50 && styleIntensity === 50 && cloneFidelity === 75;

  return (
    <div>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none group mb-2"
      >
        <label className={`text-xs font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer flex items-center gap-2 ${isKhmer ? '' : ''}`}>
          <span>{t('label')}</span>
          {!isOpen && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span>{selectedPreset?.icon}</span>
              <span>{t(emotion)}</span>
              {!isDefault && (
                <span className="text-primary/80 ml-0.5">•</span>
              )}
            </span>
          )}
        </label>
        <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
          {isOpen && !isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetEmotion}
              className="h-6 text-[10px] text-muted-foreground rounded-lg px-2 hover:bg-muted cursor-pointer"
              id="reset-emotion-btn"
            >
              {t('resetAll')}
            </Button>
          )}
          <svg
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform duration-200 cursor-pointer',
              isOpen && 'rotate-180'
            )}
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Expanded Controls */}
      {isOpen && (
        <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-card animate-in fade-in duration-200">
          {/* Emotion Presets Grid */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-2">
              {t('preset')}
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOTION_PRESETS.map(({ id, icon }) => (
                <Tooltip key={id}>
                  <TooltipTrigger
                    onClick={() => setEmotion(id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all duration-200 cursor-pointer',
                      emotion === id
                        ? 'border-primary/50 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                        : 'border-border/50 bg-card hover:border-primary/30 text-muted-foreground hover:text-foreground'
                    )}
                    id={`emotion-${id}`}
                  >
                    <span className="text-sm">{icon}</span>
                    <span>{t(id)}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t(`${id}Desc`)}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Sliders */}
          <EmotionSlider
            id="expressiveness-slider"
            label={t('expressiveness')}
            value={expressiveness}
            onChange={setExpressiveness}
            defaultValue={50}
            hint={expressiveness < 25 ? '🔒' : expressiveness > 75 ? '🎭' : ''}
          />

          <EmotionSlider
            id="style-intensity-slider"
            label={t('intensity')}
            value={styleIntensity}
            onChange={setStyleIntensity}
            defaultValue={50}
            hint={styleIntensity < 25 ? '💤' : styleIntensity > 75 ? '🔥' : ''}
          />

          <EmotionSlider
            id="clone-fidelity-slider"
            label={t('fidelity')}
            value={cloneFidelity}
            onChange={setCloneFidelity}
            defaultValue={75}
            warning={expressiveness > 80 ? t('fidelityWarning') : undefined}
          />

          {/* Info banner */}
          <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5 text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
            <svg className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>{t('info')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
