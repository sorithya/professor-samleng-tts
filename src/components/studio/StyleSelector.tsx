'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStudioStore } from '@/stores/studio.store';
import { VOICE_STYLES, getVoiceById } from '@/lib/tts/voices.config';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function StyleSelector() {
  const t = useTranslations('studio.style');
  const style = useStudioStore((s) => s.style);
  const setStyle = useStudioStore((s) => s.setStyle);
  const voiceId = useStudioStore((s) => s.voiceId);
  const [isOpen, setIsOpen] = useState(false);

  const voice = getVoiceById(voiceId);
  const selectedStyle = VOICE_STYLES.find((vs) => vs.id === style);

  return (
    <div>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none group mb-2"
      >
        <label className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
          <span>{t('label')}</span>
          {!isOpen && selectedStyle && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span>{selectedStyle.icon}</span>
              <span>{t(style)}</span>
            </span>
          )}
        </label>
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
        <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
          {VOICE_STYLES.map(({ id, icon }) => {
            const isNative = voice?.supportedStyles.includes(id);
            const isSelected = style === id;

            return (
              <Tooltip key={id}>
                <TooltipTrigger
                  onClick={() => setStyle(id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all duration-200 cursor-pointer',
                    isSelected
                      ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                      : 'border-border/50 bg-card hover:border-primary/30 text-muted-foreground hover:text-foreground'
                  )}
                  id={`style-${id}`}
                >
                  <span>{icon}</span>
                  <span>{t(id)}</span>
                  {!isNative && id !== 'default' && (
                    <span className="text-[8px] opacity-50">✦</span>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {isNative ? 'Native style' : 'Prosody-tuned style'}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
