'use client';

import { useTranslations } from 'next-intl';
import { Editor } from '@/components/studio/Editor';
import { LanguageSelector } from '@/components/studio/LanguageSelector';
import { VoicePicker } from '@/components/studio/VoicePicker';
import { StyleSelector } from '@/components/studio/StyleSelector';
import { ControlSliders } from '@/components/studio/ControlSliders';
import { FormatSelector } from '@/components/studio/FormatSelector';
import { GenerateBar } from '@/components/studio/GenerateBar';
import { Player } from '@/components/studio/Player';
import { VoiceCloner } from '@/components/studio/VoiceCloner';
import { EmotionControls } from '@/components/studio/EmotionControls';
import { ProviderSelector } from '@/components/studio/ProviderSelector';
import { FileImport } from '@/components/studio/FileImport';
import { BatchProcessor } from '@/components/studio/BatchProcessor';
import { KeyboardShortcuts } from '@/components/studio/KeyboardShortcuts';

export function StudioClient() {
  const t = useTranslations('studio');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 lg:py-5 h-[calc(100vh-64px)] flex flex-col">
      <KeyboardShortcuts />

      {/* Main layout — fills remaining viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 flex-1 min-h-0">
        {/* Left column: Editor + Generate + Player */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0">
            <Editor />
          </div>
          <div className="shrink-0">
            <GenerateBar />
          </div>
          <div className="shrink-0">
            <Player />
          </div>
        </div>

        {/* Right column: Controls — scrollable sidebar */}
        <div className="lg:col-span-2 min-h-0 khmer-column">
          <div className="h-full overflow-y-auto overscroll-contain rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 space-y-5 shadow-sm scrollbar-thin">
            <ProviderSelector />

            <div className="border-t border-border/30" />

            <LanguageSelector />

            <div className="border-t border-border/30" />

            <VoicePicker />

            <div className="border-t border-border/30" />

            <VoiceCloner />

            <div className="border-t border-border/30" />

            <EmotionControls />

            <div className="border-t border-border/30" />

            <StyleSelector />

            <div className="border-t border-border/30" />

            <ControlSliders />

            <div className="border-t border-border/30" />

            <FormatSelector />

            <div className="border-t border-border/30" />

            <FileImport />

            <div className="border-t border-border/30" />

            <BatchProcessor />
          </div>
        </div>
      </div>
    </div>
  );
}
