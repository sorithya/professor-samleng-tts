'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ThemeToggle } from './ThemeToggle';
import { LocaleSwitcher } from './LocaleSwitcher';
import { Button } from '@/components/ui/button';

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

export function TopBar() {
  const locale = useLocale();
  const t = useTranslations('nav');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          id="logo-link"
        >
          <svg className="h-9 w-9 rounded-xl shadow-md" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="#7C3AED"/>
            <text x="24" y="33" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="28" fill="white">S</text>
          </svg>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-gradient">Professor Somleng</span>
            <span className="ml-1 text-muted-foreground font-normal text-sm">TTS</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link href={`/${locale}`}>
            <Button variant="ghost" size="sm" className="rounded-xl text-sm">
              {t('home')}
            </Button>
          </Link>
          <Link href={`/${locale}/studio`}>
            <Button variant="ghost" size="sm" className="rounded-xl text-sm">
              {t('studio')}
            </Button>
          </Link>
          <Link href={`/${locale}/history`}>
            <Button variant="ghost" size="sm" className="rounded-xl text-sm" id="nav-history">
              {t('history')}
            </Button>
          </Link>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link href={`/${locale}/studio`} className="ml-2 hidden sm:block">
            <Button
              size="sm"
              className="rounded-xl bg-gradient-to-r from-[oklch(0.55_0.25_270)] to-[oklch(0.6_0.25_300)] text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              id="cta-studio"
            >
              {t('studio')} →
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
