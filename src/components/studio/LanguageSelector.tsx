'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStudioStore } from '@/stores/studio.store';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const languages = [
  { code: 'km-KH', flag: '🇰🇭' },
  { code: 'en-US', flag: '🇺🇸' },
];

export function LanguageSelector() {
  const t = useTranslations('studio.language');
  const language = useStudioStore((s) => s.language);
  const setLanguage = useStudioStore((s) => s.setLanguage);
  const [isOpen, setIsOpen] = useState(false);

  const languageLabels: Record<string, string> = {
    'km-KH': t('khmer'),
    'en-US': t('english'),
  };

  const selectedLang = languages.find((l) => l.code === language);

  return (
    <div>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none group mb-2"
      >
        <label className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
          <span>{t('label')}</span>
          {!isOpen && selectedLang && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span>{selectedLang.flag}</span>
              <span>{languageLabels[language]}</span>
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
        <div className="animate-in fade-in duration-200">
          <Select value={language} onValueChange={(v) => { if (v) setLanguage(v); }}>
            <SelectTrigger className="w-full rounded-xl h-11" id="language-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map(({ code, flag }) => (
                <SelectItem key={code} value={code} className="text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{flag}</span>
                    <span>{languageLabels[code]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
