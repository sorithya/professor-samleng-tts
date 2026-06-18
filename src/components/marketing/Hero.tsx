'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SamplesModal } from './SamplesModal';

export function Hero() {
  const locale = useLocale();
  const t = useTranslations('landing.hero');
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[oklch(0.55_0.25_270_/_0.08)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[oklch(0.6_0.25_300_/_0.08)] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[oklch(0.55_0.15_270_/_0.04)] rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            AI-Powered Khmer TTS
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl leading-tight font-title">
            <span className="text-gradient-colorful">{t('title')}</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl max-w-2xl mx-auto">
            {t('subtitle')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={`/${locale}/studio`}>
              <Button
                size="lg"
                className="rounded-2xl bg-gradient-to-r from-[oklch(0.55_0.25_270)] to-[oklch(0.6_0.25_300)] px-8 py-6 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] animate-pulse-brand"
                id="hero-cta"
              >
                {t('cta')}
                <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl px-8 py-6 text-lg"
              id="hero-cta-secondary"
              onClick={() => setIsModalOpen(true)}
            >
              <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {t('ctaSecondary')}
            </Button>
          </div>

          {/* Decorative wave/waveform SVG */}
          <div className="mt-16 flex justify-center">
            <div className="flex items-end gap-[3px] opacity-30">
              {Array.from({ length: 40 }, (_, i) => {
                const height = 10 + Math.sin(i * 0.5) * 20 + Math.random() * 15;
                return (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-gradient-to-t from-primary/40 to-primary"
                    style={{
                      height: `${height}px`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <SamplesModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}
