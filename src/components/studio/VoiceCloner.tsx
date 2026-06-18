'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studio.store';
import { toast } from 'sonner';

interface ClonedVoiceEntry {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  provider?: string;
}

const CLONED_VOICES_KEY = 'professor-somleng-cloned-voices';

function loadSavedVoices(): ClonedVoiceEntry[] {
  try {
    const saved = localStorage.getItem(CLONED_VOICES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveVoicesToStorage(voices: ClonedVoiceEntry[]) {
  try {
    localStorage.setItem(CLONED_VOICES_KEY, JSON.stringify(voices));
  } catch { /* storage full or unavailable */ }
}

export function VoiceCloner() {
  const locale = useLocale();
  const setVoiceId = useStudioStore((s) => s.setVoiceId);
  const provider = useStudioStore((s) => s.provider);

  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [transcript, setTranscript] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoiceEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved cloned voices on mount
  useEffect(() => {
    const saved = loadSavedVoices();
    if (saved.length > 0) {
      setClonedVoices(saved);
    }
    // Also fetch from server
    fetch('/api/tts/clone')
      .then((r) => r.json())
      .then((data) => {
        if (data.voices?.length > 0) {
          setClonedVoices((prev) => {
            const existing = new Set(prev.map((v) => v.id));
            const merged = [...prev];
            for (const v of data.voices) {
              if (!existing.has(v.id)) {
                merged.push(v);
              }
            }
            saveVoicesToStorage(merged);
            return merged;
          });
        }
      })
      .catch(() => { /* server not available */ });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file (MP3, WAV, etc.)');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Audio file must be less than 50MB');
      return;
    }

    setAudioFile(file);

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(URL.createObjectURL(file));
  }, [audioPreviewUrl]);

  const handleCloneVoice = async () => {
    if (!audioFile || !voiceName.trim()) {
      toast.error('Please provide a voice name and upload reference audio');
      return;
    }

    setIsUploading(true);

    try {
      // Use FormData for proper file upload (no base64 size limits)
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('name', voiceName.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (transcript.trim()) {
        formData.append('transcript', transcript.trim());
      }
      formData.append('provider', provider);

      const response = await fetch('/api/tts/clone', {
        method: 'POST',
        body: formData, // No Content-Type header — browser sets multipart boundary
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to clone voice');
        return;
      }

      const data = await response.json();
      const newVoice: ClonedVoiceEntry = {
        id: data.voice.id,
        name: data.voice.name,
        description: description.trim() || undefined,
        createdAt: data.voice.createdAt,
        provider: data.voice.provider || provider,
      };

      setClonedVoices((prev) => {
        const updated = [...prev, newVoice];
        saveVoicesToStorage(updated);
        return updated;
      });
      setVoiceId(data.voice.id);

      // Reset form
      setVoiceName('');
      setDescription('');
      setTranscript('');
      setAudioFile(null);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success(`Voice "${data.voice.name}" cloned successfully! 🎙️`);
    } catch (err) {
      console.error('Clone error:', err);
      toast.error('Failed to clone voice. Check server logs for details.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectVoice = (voiceId: string) => {
    setVoiceId(voiceId);
    toast.success('Cloned voice selected');
  };

  const handleDeleteVoice = async (voiceId: string) => {
    const voiceToDelete = clonedVoices.find((v) => v.id === voiceId);
    const voiceProvider = voiceToDelete?.provider || 'voxcpm2';
    try {
      await fetch('/api/tts/clone', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, provider: voiceProvider }),
      });
      setClonedVoices((prev) => {
        const updated = prev.filter((v) => v.id !== voiceId);
        saveVoicesToStorage(updated);
        return updated;
      });
      toast.success('Voice deleted');
    } catch {
      toast.error('Failed to delete voice');
    }
  };

  const engineName = provider === 'voxcpm2' ? 'VoxCPM2' : provider === 'fishspeech' ? 'Fish Speech' : 'OmniVoice';
  const filteredVoices = clonedVoices.filter((v) => v.provider === provider || (!v.provider && provider === 'voxcpm2'));

  return (
    <div>
      {/* Toggle trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none group mb-2"
        id="clone-voice-toggle"
      >
        <label className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
          <span>🧬 {locale === 'km' ? `ចម្លងសំឡេង (${engineName})` : `Clone a Voice (${engineName})`}</span>
          {!isOpen && filteredVoices.length > 0 && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
              {filteredVoices.length} {locale === 'km' ? 'សំឡេង' : 'voices'}
            </span>
          )}
        </label>
        <svg
          className={`h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {/* Clone form */}
      {isOpen && (
        <div className="mt-3 p-4 rounded-xl border border-border/50 bg-card space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">!</span>
            {provider === 'voxcpm2' 
              ? 'Requires VoxCPM2 server on port 8808' 
              : provider === 'fishspeech'
                ? 'Requires Fish Speech server on port 8080'
                : 'Requires OmniVoice server on port 8880'}
          </div>

          {/* Voice name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Voice Name *
            </label>
            <input
              type="text"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="e.g., My Khmer Voice"
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              id="clone-voice-name"
              maxLength={50}
            />
          </div>

          {/* Upload reference audio */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Reference Audio * <span className="text-[10px] font-normal">(3–15 sec recommended)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
              id="clone-audio-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 p-4 text-sm text-muted-foreground hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
            >
              {audioFile ? (
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="h-4 w-4 text-green-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="font-medium truncate">{audioFile.name}</span>
                  <span className="text-xs shrink-0">({(audioFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  Upload audio file (MP3, WAV)
                </>
              )}
            </button>

            {audioPreviewUrl && (
              <audio
                src={audioPreviewUrl}
                controls
                className="w-full mt-2 h-10"
                id="clone-audio-preview"
              />
            )}
          </div>

          {/* Voice description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Voice Description <span className="text-[10px] font-normal">(optional — for controllable cloning)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Young Khmer woman, warm and expressive"
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              id="clone-voice-description"
              maxLength={500}
            />
          </div>

          {/* Transcript */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Audio Transcript <span className="text-[10px] font-normal">(optional — for ultimate cloning)</span>
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type what is said in the reference audio for higher quality cloning..."
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none h-16"
              id="clone-voice-transcript"
              maxLength={5000}
            />
          </div>

          {/* Clone button */}
          <Button
            onClick={handleCloneVoice}
            disabled={!audioFile || !voiceName.trim() || isUploading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-5"
            id="clone-voice-btn"
          >
            {isUploading ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading & Cloning...
              </>
            ) : (
              <>🧬 Clone Voice</>
            )}
          </Button>

          {/* Cloned voices list */}
          {filteredVoices.length > 0 && (
            <div className="pt-3 border-t border-border/30">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                Cloned Voices ({filteredVoices.length})
              </h4>
              <div className="space-y-2">
                {filteredVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <button
                      onClick={() => handleSelectVoice(voice.id)}
                      className="flex items-center gap-2 text-sm text-left flex-1 min-w-0 cursor-pointer hover:text-primary transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 text-sm font-bold shrink-0">
                        🧬
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-xs truncate">{voice.name}</div>
                        {voice.description && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {voice.description}
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteVoice(voice.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer shrink-0 ml-2"
                      aria-label="Delete voice"
                    >
                      <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
