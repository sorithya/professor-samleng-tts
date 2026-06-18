'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';

const featureKeys = [
  { key: 'khmerFirst', icon: '🇰🇭' },
  { key: 'naturalVoices', icon: '🎙️' },
  { key: 'multipleStyles', icon: '🎭' },
  { key: 'fineControl', icon: '🎛️' },
  { key: 'fastGeneration', icon: '⚡' },
  { key: 'downloadFormats', icon: '📥' },
] as const;

export function Features() {
  const t = useTranslations('landing.features');

  return (
    <section className="py-20 sm:py-28" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl font-title">
            <span className="text-gradient-colorful">{t('title')}</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map(({ key, icon }) => (
            <Card
              key={key}
              className="group relative overflow-hidden rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl transition-transform duration-300 group-hover:scale-110">
                  {icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 font-title group-hover:text-primary transition-colors duration-300">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(`${key}.description`)}
                </p>
              </CardContent>
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
