'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStudioStore } from '@/stores/studio.store';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ControlSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
  defaultValue,
  id,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  defaultValue: number;
  id: string;
}) {
  const isDefault = value === defaultValue;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-foreground tabular-nums">
            {formatValue(value)}
          </span>
          {!isDefault && (
            <button
              onClick={() => onChange(defaultValue)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
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
    </div>
  );
}

export function ControlSliders() {
  const t = useTranslations('studio.controls');
  const rate = useStudioStore((s) => s.rate);
  const pitch = useStudioStore((s) => s.pitch);
  const volume = useStudioStore((s) => s.volume);
  const setRate = useStudioStore((s) => s.setRate);
  const setPitch = useStudioStore((s) => s.setPitch);
  const setVolume = useStudioStore((s) => s.setVolume);
  const resetControls = useStudioStore((s) => s.resetControls);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none group mb-2"
      >
        <label className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
          <span>{t('speed')} / {t('pitch')} / {t('volume')}</span>
          {!isOpen && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded flex items-center gap-1.5">
              <span>{rate.toFixed(1)}×</span>
              <span>{pitch >= 0 ? `+${pitch}` : pitch}</span>
              <span>{Math.round(volume * 100)}%</span>
            </span>
          )}
        </label>
        <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
          {isOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetControls}
              className="h-6 text-[10px] text-muted-foreground rounded-lg px-2 hover:bg-muted"
              id="reset-controls-btn"
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

      {isOpen && (
        <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-card animate-in fade-in duration-200">
          <ControlSlider
            id="speed-slider"
            label={t('speed')}
            value={rate}
            onChange={setRate}
            min={0.5}
            max={2.0}
            step={0.1}
            defaultValue={1.0}
            formatValue={(v) => `${v.toFixed(1)}×`}
          />
          <ControlSlider
            id="pitch-slider"
            label={t('pitch')}
            value={pitch}
            onChange={setPitch}
            min={-12}
            max={12}
            step={1}
            defaultValue={0}
            formatValue={(v) => (v >= 0 ? `+${v}` : `${v}`)}
          />
          <ControlSlider
            id="volume-slider"
            label={t('volume')}
            value={volume}
            onChange={setVolume}
            min={0}
            max={1}
            step={0.05}
            defaultValue={1.0}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
        </div>
      )}
    </div>
  );
}
