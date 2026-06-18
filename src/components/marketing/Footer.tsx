'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export function Footer() {
  const locale = useLocale();
  const t = useTranslations('landing.footer');

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.55_0.25_270)] to-[oklch(0.6_0.25_300)]">
                <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <span className="font-bold">Samleng TTS</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('madeWith')}
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">{t('product')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}/studio`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Studio
                </Link>
              </li>
              <li>
                <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">{t('resources')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">{t('legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p>{t('copyright')}</p>
            <span className="hidden sm:inline text-border">|</span>
            <p>
              Created by <span className="font-semibold text-foreground">Chet Sorithya</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Telegram Contact */}
            <a 
              href="https://t.me/sorithyadigital" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-200"
              title="Telegram Contact"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.65 6.32-2.73 7.57-3.26 3.6-1.5 4.35-1.76 4.84-1.77.11 0 .35.03.51.16.13.1.17.24.19.34.02.09.02.24.01.29z"/>
              </svg>
            </a>

            {/* Telegram Channel */}
            <a 
              href="https://t.me/professorsorithya" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-200"
              title="Telegram Channel"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.65 6.32-2.73 7.57-3.26 3.6-1.5 4.35-1.76 4.84-1.77.11 0 .35.03.51.16.13.1.17.24.19.34.02.09.02.24.01.29z"/>
              </svg>
            </a>

            {/* Facebook Page */}
            <a 
              href="https://web.facebook.com/profile.php?id=61587341825582" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-200"
              title="Facebook Page"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
