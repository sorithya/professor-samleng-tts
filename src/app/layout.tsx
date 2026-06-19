import type { Metadata } from 'next';
import { Inter, Kantumruy_Pro, Siemreap, Koulen, Outfit, Battambang } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const kantumruy = Kantumruy_Pro({
  subsets: ['khmer', 'latin'],
  variable: '--font-kantumruy',
  display: 'swap',
});

const siemreap = Siemreap({
  weight: '400',
  subsets: ['khmer'],
  variable: '--font-siemreap',
  display: 'swap',
});

const koulen = Koulen({
  weight: '400',
  subsets: ['khmer'],
  variable: '--font-koulen',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const battambang = Battambang({
  weight: ['400', '700'],
  subsets: ['khmer'],
  variable: '--font-battambang',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Professor Somleng TTS — Khmer Text-to-Speech',
    template: '%s | Professor Somleng TTS',
  },
  description:
    'Transform text into natural-sounding Khmer speech. Professional TTS studio with neural voices, multiple styles, and fine-tuned delivery controls.',
  keywords: ['Khmer TTS', 'text to speech', 'Khmer voice', 'ភាសាខ្មែរ', 'សំឡេង', 'AI voice'],
  openGraph: {
    title: 'Professor Somleng TTS — Khmer Text-to-Speech',
    description: 'Professional text-to-speech with the most natural Khmer voices.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      className={`${inter.variable} ${kantumruy.variable} ${siemreap.variable} ${koulen.variable} ${outfit.variable} ${battambang.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
