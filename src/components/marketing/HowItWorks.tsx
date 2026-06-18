'use client';

import { useTranslations } from 'next-intl';

const steps = [
  { key: 'step1', icon: '✍️', number: '01' },
  { key: 'step2', icon: '🎙️', number: '02' },
  { key: 'step3', icon: '📥', number: '03' },
] as const;

export function HowItWorks() {
  const t = useTranslations('landing.howItWorks');

  return (
    <section className="py-20 sm:py-28 bg-muted/30" id="how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl font-title">
            <span className="text-gradient-colorful">{t('title')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
          {steps.map(({ key, icon, number }, index) => (
            <div key={key} className="relative flex flex-col items-center text-center">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute top-8 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] hidden sm:block">
                  <div className="h-[2px] w-full bg-gradient-to-r from-primary/30 to-primary/10" />
                </div>
              )}

              {/* Step number circle */}
              <div className="relative mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <span className="text-3xl">{icon}</span>
                </div>
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {number}
                </span>
              </div>

              <h3 className="text-lg font-semibold mb-2 font-title">
                {t(`${key}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
