'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useStudioStore } from '@/stores/studio.store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  FolderOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  Globe,
  Cpu,
  RefreshCw,
  Server,
  Terminal,
  HelpCircle
} from 'lucide-react'

const STATUS_POLL_INTERVAL = 8_000

/* eslint-disable @typescript-eslint/no-explicit-any */
function getElectronAPI(): any {
  if (typeof window !== 'undefined') {
    return (window as any).electronAPI
  }
  return null
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const VoxCPMLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <defs>
      <linearGradient id="voxcpmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <path 
      d="M12 22C12.5523 22 13 21.5523 13 21C13 20.4477 12.5523 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 12.5523 20.4477 13 21 13C21.5523 13 22 12.5523 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
      fill="url(#voxcpmGrad)" 
    />
    <circle cx="12" cy="12" r="3" fill="url(#voxcpmGrad)" />
    <path d="M17 9.5C18.3 10.7 18.3 13.3 17 14.5" stroke="url(#voxcpmGrad)" strokeWidth="2" strokeLinecap="round" />
    <path d="M19.5 7C21.7 9.2 21.7 14.8 19.5 17" stroke="url(#voxcpmGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    <path d="M7 14.5C5.7 13.3 5.7 10.7 7 9.5" stroke="url(#voxcpmGrad)" strokeWidth="2" strokeLinecap="round" />
    <path d="M4.5 17C2.3 14.8 2.3 9.2 4.5 7" stroke="url(#voxcpmGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
  </svg>
)

const OmniVoiceLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <defs>
      <linearGradient id="omniGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="9" stroke="url(#omniGrad)" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
    <ellipse cx="12" cy="12" rx="9" ry="3" stroke="url(#omniGrad)" strokeWidth="2" transform="rotate(-30 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="3" stroke="url(#omniGrad)" strokeWidth="2" transform="rotate(30 12 12)" />
    <circle cx="12" cy="12" r="3.5" fill="url(#omniGrad)" />
  </svg>
)

const FishSpeechLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <defs>
      <linearGradient id="fishGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="9" stroke="url(#fishGrad)" strokeWidth="2" opacity="0.5" />
    <path 
      d="M6.5 12c1.5-2.5 4.5-3.5 7.5-3 1.8.3 3 1.3 3.5 2 1-.5 1.8-1.2 2-1.5.2.5-.2 1.5-.8 2-.8.8-1.8 1.2-3 1.5-3 1-6 0-7.5-2.5c-.8.8-1.3 1.5-1.7 1.5 0-.5.5-1.5 1-2.5z" 
      fill="url(#fishGrad)" 
    />
    <circle cx="13" cy="10.5" r="0.8" fill="#ffffff" />
  </svg>
)

export function ProviderSelector() {
  const provider = useStudioStore((s) => s.provider)
  const setProvider = useStudioStore((s) => s.setProvider)

  const [voxStatus, setVoxStatus] = useState<'running' | 'stopped' | 'checking' | 'loading'>('checking')
  const [omniStatus, setOmniStatus] = useState<'running' | 'stopped' | 'checking' | 'loading'>('checking')
  const [fishStatus, setFishStatus] = useState<'running' | 'stopped' | 'checking' | 'loading'>('checking')
  const [voxConfig, setVoxConfig] = useState<any>(null)
  const [omniConfig, setOmniConfig] = useState<any>(null)
  const [fishConfig, setFishConfig] = useState<any>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [remoteUrlInput, setRemoteUrlInput] = useState('')
  const [remoteOmniUrlInput, setRemoteOmniUrlInput] = useState('')
  const [remoteFishUrlInput, setRemoteFishUrlInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const electronAPI = getElectronAPI()
  const isElectronAvailable = !!electronAPI

  // Fetch running status of all TTS engines
  const checkStatuses = useCallback(async () => {
    let voxIsRunning = false
    let omniIsRunning = false
    let fishIsRunning = false

    try {
      const voxRes = await fetch('/api/tts/status?provider=voxcpm2')
      if (voxRes.ok) {
        const data = await voxRes.json()
        voxIsRunning = data.status === 'running'
      }
    } catch {}

    try {
      const omniRes = await fetch('/api/tts/status?provider=omnivoice')
      if (omniRes.ok) {
        const data = await omniRes.json()
        omniIsRunning = data.status === 'running'
      }
    } catch {}

    try {
      const fishRes = await fetch('/api/tts/status?provider=fishspeech')
      if (fishRes.ok) {
        const data = await fishRes.json()
        fishIsRunning = data.status === 'running'
      }
    } catch {}

    // Check with Electron for process alive state (to distinguish loading vs stopped)
    if (electronAPI) {
      try {
        const vConfig = await electronAPI.getVoxCPM2Config()
        const oConfig = await electronAPI.getOmniVoiceConfig()
        const fConfig = await electronAPI.getFishSpeechConfig()

        if (voxIsRunning) {
          setVoxStatus('running')
        } else if (vConfig?.mode === 'local' && vConfig?.processAlive) {
          setVoxStatus('loading')
        } else {
          setVoxStatus('stopped')
        }

        if (omniIsRunning) {
          setOmniStatus('running')
        } else if (oConfig?.mode === 'local' && oConfig?.processAlive) {
          setOmniStatus('loading')
        } else {
          setOmniStatus('stopped')
        }

        if (fishIsRunning) {
          setFishStatus('running')
        } else if (fConfig?.mode === 'local' && fConfig?.processAlive) {
          setFishStatus('loading')
        } else {
          setFishStatus('stopped')
        }
      } catch {
        setVoxStatus(voxIsRunning ? 'running' : 'stopped')
        setOmniStatus(omniIsRunning ? 'running' : 'stopped')
        setFishStatus(fishIsRunning ? 'running' : 'stopped')
      }
    } else {
      setVoxStatus(voxIsRunning ? 'running' : 'stopped')
      setOmniStatus(omniIsRunning ? 'running' : 'stopped')
      setFishStatus(fishIsRunning ? 'running' : 'stopped')
    }
  }, [electronAPI])

  // Fetch the configuration details from electron main process
  const loadElectronConfig = useCallback(async () => {
    if (!electronAPI) return
    try {
      const vConfig = await electronAPI.getVoxCPM2Config()
      setVoxConfig(vConfig)
      if (vConfig?.url) {
        setRemoteUrlInput(vConfig.url)
      }

      const oConfig = await electronAPI.getOmniVoiceConfig()
      setOmniConfig(oConfig)
      if (oConfig?.url) {
        setRemoteOmniUrlInput(oConfig.url)
      }

      const fConfig = await electronAPI.getFishSpeechConfig()
      setFishConfig(fConfig)
      if (fConfig?.url) {
        setRemoteFishUrlInput(fConfig.url)
      }
    } catch (e) {
      console.error('Failed to load VoxCPM2/OmniVoice/FishSpeech configs:', e)
    }
  }, [electronAPI])

  // Mount & Polling
  useEffect(() => {
    checkStatuses()
    loadElectronConfig()

    const interval = setInterval(() => {
      checkStatuses()
      if (isElectronAvailable) {
        loadElectronConfig()
      }
    }, STATUS_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [checkStatuses, loadElectronConfig, isElectronAvailable])

  // Action: Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await checkStatuses()
    await loadElectronConfig()
    setIsRefreshing(false)
    toast.success('Connection statuses updated')
  }

  // Action: Browse local folder
  const handleBrowse = async () => {
    if (!electronAPI) return
    try {
      const res = await electronAPI.browseVoxCPM2()
      if (res.success) {
        toast.success(`Local path configured: ${res.path}`)
        await loadElectronConfig()
        await checkStatuses()
      } else if (res.message !== 'Cancelled') {
        toast.error(res.message || 'Failed to select folder')
      }
    } catch (e: any) {
      toast.error(`Browse folder error: ${e.message}`)
    }
  }

  // Action: Start local python server
  const handleStartLocalServer = async () => {
    if (!electronAPI) return
    try {
      toast.info('Starting local VoxCPM2 server...')
      const res = await electronAPI.startVoxCPM2()
      if (res.success) {
        toast.success('Local server startup command sent. Initializing model weights (typically takes 5-10s)...')
        setTimeout(async () => {
          await checkStatuses()
          await loadElectronConfig()
        }, 4000)
      } else {
        toast.error(res.message || 'Failed to start local server')
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`)
    }
  }

  // Action: Stop local python server
  const handleStopLocalServer = async () => {
    if (!electronAPI) return
    try {
      const res = await electronAPI.stopVoxCPM2()
      if (res.success) {
        toast.success('Local VoxCPM2 server stopped')
        await checkStatuses()
        await loadElectronConfig()
      } else {
        toast.error(res.message || 'Failed to stop local server')
      }
    } catch (e: any) {
      toast.error(`Error stopping server: ${e.message}`)
    }
  }

  // Action: Toggle Mode (Local vs Remote)
  const handleToggleMode = async (mode: 'local' | 'remote') => {
    if (!electronAPI) return
    try {
      setIsSaving(true)
      const res = await electronAPI.saveVoxCPM2Config({ voxcpm2Mode: mode })
      if (res.success) {
        toast.success(`VoxCPM2 mode changed to ${mode === 'local' ? 'Local (Offline)' : 'Remote (Online)'}`)
        setTimeout(async () => {
          await loadElectronConfig()
          await checkStatuses()
          setIsSaving(false)
        }, 1500)
      } else {
        toast.error('Failed to change mode')
        setIsSaving(false)
      }
    } catch (e: any) {
      toast.error(`Error changing mode: ${e.message}`)
      setIsSaving(false)
    }
  }

  // Action: Save custom remote URL
  const handleSaveRemoteUrl = async () => {
    if (!electronAPI) return
    if (!remoteUrlInput.trim() || !remoteUrlInput.startsWith('http')) {
      toast.error('Please enter a valid URL (starting with http:// or https://)')
      return
    }
    try {
      setIsSaving(true)
      const res = await electronAPI.saveVoxCPM2Config({ voxcpm2Url: remoteUrlInput.trim() })
      if (res.success) {
        toast.success('Remote server URL saved successfully')
        setTimeout(async () => {
          await loadElectronConfig()
          await checkStatuses()
          setIsSaving(false)
        }, 1500)
      } else {
        toast.error('Failed to save remote URL')
        setIsSaving(false)
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`)
      setIsSaving(false)
    }
  }

  // Action: Browse OmniVoice folder
  const handleBrowseOmni = async () => {
    if (!electronAPI) return
    try {
      const res = await electronAPI.browseOmniVoice()
      if (res.success) {
        toast.success(`OmniVoice path configured: ${res.path}`)
        await loadElectronConfig()
        await checkStatuses()
      } else if (res.message !== 'Cancelled') {
        toast.error(res.message || 'Failed to select folder')
      }
    } catch (e: any) {
      toast.error(`Browse folder error: ${e.message}`)
    }
  }

  // Action: Start local OmniVoice server
  const handleStartOmniServer = async () => {
    if (!electronAPI) return
    try {
      toast.info('Starting local OmniVoice server...')
      const res = await electronAPI.startOmniVoice()
      if (res.success) {
        toast.success('OmniVoice server startup command sent. Initializing model...')
        setTimeout(async () => {
          await checkStatuses()
          await loadElectronConfig()
        }, 3000)
      } else {
        toast.error(res.message || 'Failed to start OmniVoice server')
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`)
    }
  }

  // Action: Stop local OmniVoice server
  const handleStopOmniServer = async () => {
    if (!electronAPI) return
    try {
      const res = await electronAPI.stopOmniVoice()
      if (res.success) {
        toast.success('Local OmniVoice server stopped')
        await checkStatuses()
        await loadElectronConfig()
      } else {
        toast.error(res.message || 'Failed to stop OmniVoice server')
      }
    } catch (e: any) {
      toast.error(`Error stopping server: ${e.message}`)
    }
  }

  // Action: Toggle OmniVoice Mode (Local vs Remote)
  const handleToggleOmniMode = async (mode: 'local' | 'remote') => {
    if (!electronAPI) return
    try {
      setIsSaving(true)
      const res = await electronAPI.saveOmniVoiceConfig({ omnivoiceMode: mode })
      if (res.success) {
        toast.success(`OmniVoice mode changed to ${mode === 'local' ? 'Local (Offline)' : 'Remote (Online)'}`)
        setTimeout(async () => {
          await loadElectronConfig()
          await checkStatuses()
          setIsSaving(false)
        }, 1500)
      } else {
        toast.error('Failed to change OmniVoice mode')
        setIsSaving(false)
      }
    } catch (e: any) {
      toast.error(`Error changing mode: ${e.message}`)
      setIsSaving(false)
    }
  }

  // Action: Save custom remote OmniVoice URL
  const handleSaveRemoteOmniUrl = async () => {
    if (!electronAPI) return
    if (!remoteOmniUrlInput.trim() || !remoteOmniUrlInput.startsWith('http')) {
      toast.error('Please enter a valid URL (starting with http:// or https://)')
      return
    }
    try {
      setIsSaving(true)
      const res = await electronAPI.saveOmniVoiceConfig({ omnivoiceUrl: remoteOmniUrlInput.trim() })
      if (res.success) {
        toast.success('Remote OmniVoice server URL saved successfully')
        setTimeout(async () => {
          await loadElectronConfig()
          await checkStatuses()
          setIsSaving(false)
        }, 1500)
      } else {
        toast.error('Failed to save remote URL')
        setIsSaving(false)
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`)
      setIsSaving(false)
    }
  }

  // Action: Browse FishSpeech folder
  const handleBrowseFish = async () => {
    if (!electronAPI) return
    try {
      const res = await electronAPI.browseFishSpeech()
      if (res.success) {
        toast.success(`Fish Speech path configured: ${res.path}`)
        await loadElectronConfig()
        await checkStatuses()
      } else if (res.message !== 'Cancelled') {
        toast.error(res.message || 'Failed to select folder')
      }
    } catch (e: any) {
      toast.error(`Browse folder error: ${e.message}`)
    }
  }

  // Action: Start local Fish Speech server
  const handleStartFishServer = async () => {
    if (!electronAPI) return
    try {
      toast.info('Starting local Fish Speech server...')
      const res = await electronAPI.startFishSpeech()
      if (res.success) {
        toast.success('Fish Speech server startup command sent. Initializing model...')
        setTimeout(async () => {
          await checkStatuses()
          await loadElectronConfig()
        }, 3000)
      } else {
        toast.error(res.message || 'Failed to start Fish Speech server')
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`)
    }
  }

  // Action: Stop local Fish Speech server
  const handleStopFishServer = async () => {
    if (!electronAPI) return
    try {
      const res = await electronAPI.stopFishSpeech()
      if (res.success) {
        toast.success('Local Fish Speech server stopped')
        await checkStatuses()
        await loadElectronConfig()
      } else {
        toast.error(res.message || 'Failed to stop Fish Speech server')
      }
    } catch (e: any) {
      toast.error(`Error stopping server: ${e.message}`)
    }
  }

  // Action: Toggle FishSpeech Mode (Local vs Remote)
  const handleToggleFishMode = async (mode: 'local' | 'remote') => {
    if (!electronAPI) return
    try {
      setIsSaving(true)
      const res = await electronAPI.saveFishSpeechConfig({ fishspeechMode: mode })
      if (res.success) {
        toast.success(`Fish Speech mode changed to ${mode === 'local' ? 'Local (Offline)' : 'Remote (Online)'}`)
        setTimeout(async () => {
          await loadElectronConfig()
          await checkStatuses()
          setIsSaving(false)
        }, 1500)
      } else {
        toast.error('Failed to change Fish Speech mode')
        setIsSaving(false)
      }
    } catch (e: any) {
      toast.error(`Error changing mode: ${e.message}`)
      setIsSaving(false)
    }
  }

  // Action: Save custom remote FishSpeech URL
  const handleSaveRemoteFishUrl = async () => {
    if (!electronAPI) return
    if (!remoteFishUrlInput.trim() || !remoteFishUrlInput.startsWith('http')) {
      toast.error('Please enter a valid URL (starting with http:// or https://)')
      return
    }
    try {
      setIsSaving(true)
      const res = await electronAPI.saveFishSpeechConfig({ fishspeechUrl: remoteFishUrlInput.trim() })
      if (res.success) {
        toast.success('Remote Fish Speech server URL saved successfully')
        setTimeout(async () => {
          await loadElectronConfig()
          await checkStatuses()
          setIsSaving(false)
        }, 1500)
      } else {
        toast.error('Failed to save remote URL')
        setIsSaving(false)
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`)
      setIsSaving(false)
    }
  }

  // Checks if the local folder configuration is completely valid
  const isSetupValid = voxConfig?.venvExists && voxConfig?.scriptExists && voxConfig?.modelExists
  const isOmniSetupValid = omniConfig?.serverExists
  const isFishSetupValid = fishConfig?.venvExists && fishConfig?.scriptExists

  return (
    <div className="space-y-3.5 font-sans leading-normal">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span>TTS Engine</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-1.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground cursor-pointer",
              isRefreshing && "animate-spin"
            )}
            title="Refresh statuses"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {isElectronAvailable && (
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={cn(
                "flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                isConfigOpen
                  ? "bg-primary/10 border-primary/30 text-primary font-medium"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Configure</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Control Selector */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/30 p-1 border border-border/30">
        {/* VoxCPM2 Option */}
        <button
          onClick={() => {
            setProvider('voxcpm2')
            toast.success('TTS Engine set to VoxCPM2')
          }}
          className={cn(
            "relative flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer border min-w-0",
            provider === 'voxcpm2'
              ? "bg-background border-border shadow-md text-foreground ring-1 ring-primary/5 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/15"
          )}
        >
          <div className="flex items-center gap-1.5 w-full justify-center">
            <VoxCPMLogo className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">VoxCPM2</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                voxStatus === 'running'
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                  : voxStatus === 'loading'
                  ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  : voxStatus === 'checking'
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-500"
              )}
            />
          </div>
          <span className="text-[10px] opacity-70 mt-0.5 truncate whitespace-nowrap block w-full text-center">Neural Khmer</span>
        </button>

        {/* OmniVoice Option */}
        <button
          onClick={() => {
            setProvider('omnivoice')
            toast.success('TTS Engine set to OmniVoice')
          }}
          className={cn(
            "relative flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer border min-w-0",
            provider === 'omnivoice'
              ? "bg-background border-border shadow-md text-foreground ring-1 ring-primary/5 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/15"
          )}
        >
          <div className="flex items-center gap-1.5 w-full justify-center">
            <OmniVoiceLogo className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">OmniVoice</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                omniStatus === 'running'
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                  : omniStatus === 'loading'
                  ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  : omniStatus === 'checking'
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-500"
              )}
            />
          </div>
          <span className="text-[10px] opacity-70 mt-0.5 truncate whitespace-nowrap block w-full text-center">Khmer & English</span>
        </button>

        {/* Fish Speech Option */}
        <button
          onClick={() => {
            setProvider('fishspeech')
            toast.success('TTS Engine set to Fish Speech')
          }}
          className={cn(
            "relative flex flex-col items-center justify-center py-2.5 px-3 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer border min-w-0",
            provider === 'fishspeech'
              ? "bg-background border-border shadow-md text-foreground ring-1 ring-primary/5 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/15"
          )}
        >
          <div className="flex items-center gap-1.5 w-full justify-center">
            <FishSpeechLogo className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Fish Speech</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                fishStatus === 'running'
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                  : fishStatus === 'loading'
                  ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  : fishStatus === 'checking'
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-500"
              )}
            />
          </div>
          <span className="text-[10px] opacity-70 mt-0.5 truncate whitespace-nowrap block w-full text-center">Voice Cloning</span>
        </button>
      </div>

      {/* Selected Provider Info Banner */}
      {!isConfigOpen && (
        <div className="rounded-xl border border-border/30 bg-muted/10 p-3 text-xs leading-relaxed text-muted-foreground space-y-1.5">
          {provider === 'voxcpm2' ? (
            <>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span>VoxCPM2 Khmer TTS</span>
                {voxStatus === 'running' ? (
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 hover:bg-green-500/10 border-green-500/20 py-0 px-1.5 h-4">Connected</Badge>
                ) : voxStatus === 'loading' ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20 py-0 px-1.5 h-4 font-normal animate-pulse">Loading Model...</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/10 border-red-500/20 py-0 px-1.5 h-4">Disconnected</Badge>
                )}
              </div>
              <p>
                Highly accurate neural Khmer TTS. Supports multiple speed, pitch, and voice styles. Zero-shot voice cloning capability is integrated using reference audio.
              </p>
              {isElectronAvailable && voxConfig && (
                <div className="text-[10px] border-t border-border/20 pt-1.5 mt-1.5 flex items-center justify-between">
                  <span>Running Mode: <strong className="text-foreground capitalize">{voxConfig.mode}</strong></span>
                  <span className="truncate max-w-[200px] text-right font-mono text-muted-foreground/85">
                    {voxConfig.mode === 'local' ? `Local Port: ${voxConfig.port}` : voxConfig.url}
                  </span>
                </div>
              )}
            </>
          ) : provider === 'omnivoice' ? (
            <>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span>OmniVoice Multi-lingual Engine</span>
                {omniStatus === 'running' ? (
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 hover:bg-green-500/10 border-green-500/20 py-0 px-1.5 h-4">Connected</Badge>
                ) : omniStatus === 'loading' ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20 py-0 px-1.5 h-4 font-normal animate-pulse">Starting...</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/10 border-red-500/20 py-0 px-1.5 h-4">Disconnected</Badge>
                )}
              </div>
              <p>
                Fast OpenAI-compatible service for presets and designed voices. Ideal for offline work when the local `omnivoice-server` is launched on port 8880.
              </p>
              {isElectronAvailable && omniConfig && (
                <div className="text-[10px] border-t border-border/20 pt-1.5 mt-1.5 flex items-center justify-between">
                  <span>Running Mode: <strong className="text-foreground capitalize">{omniConfig.mode}</strong></span>
                  <span className="truncate max-w-[200px] text-right font-mono text-muted-foreground/85">
                    {omniConfig.mode === 'local' ? `Local Port: ${omniConfig.port}` : omniConfig.url}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span>Fish Speech Engine</span>
                {fishStatus === 'running' ? (
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 hover:bg-green-500/10 border-green-500/20 py-0 px-1.5 h-4">Connected</Badge>
                ) : fishStatus === 'loading' ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20 py-0 px-1.5 h-4 font-normal animate-pulse">Starting...</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/10 border-red-500/20 py-0 px-1.5 h-4">Disconnected</Badge>
                )}
              </div>
              <p>
                Zero-shot voice cloning and fast multilingual Text-to-Speech using Fish Speech. Fully compatible with local api_server.py on port 8080.
              </p>
              {isElectronAvailable && fishConfig && (
                <div className="text-[10px] border-t border-border/20 pt-1.5 mt-1.5 flex items-center justify-between">
                  <span>Running Mode: <strong className="text-foreground capitalize">{fishConfig.mode}</strong></span>
                  <span className="truncate max-w-[200px] text-right font-mono text-muted-foreground/85">
                    {fishConfig.mode === 'local' ? `Local Port: ${fishConfig.port}` : fishConfig.url}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Settings Panel (Electron-only collapsible) */}
      {isElectronAvailable && isConfigOpen && (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-border/30">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5 text-primary" />
              <span>
                {provider === 'voxcpm2' 
                  ? 'VoxCPM2 Config' 
                  : provider === 'omnivoice' 
                    ? 'OmniVoice Config' 
                    : 'Fish Speech Config'}
              </span>
            </h3>
            <span className="text-[10px] text-muted-foreground">System Config</span>
          </div>

          {/* VOXCPM2 CONFIG PANEL */}
          {provider === 'voxcpm2' && voxConfig && (
            <div className="space-y-4">
              {/* Mode Toggle Selector */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-2">
                  Execution Mode
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1 border border-border/30">
                  <button
                    disabled={isSaving}
                    onClick={() => handleToggleMode('local')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer border border-transparent",
                      voxConfig.mode === 'local'
                        ? "bg-background shadow-xs text-foreground font-semibold border-border/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                    )}
                  >
                    <Cpu className="h-3 w-3" />
                    <span>Local (Offline)</span>
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleToggleMode('remote')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer border border-transparent",
                      voxConfig.mode === 'remote'
                        ? "bg-background shadow-xs text-foreground font-semibold border-border/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                    )}
                  >
                    <Globe className="h-3 w-3" />
                    <span>Remote (Online)</span>
                  </button>
                </div>
              </div>

              {/* LOCAL (OFFLINE) SUBPANEL */}
              {voxConfig.mode === 'local' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* Folder path browse input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        VoxCPM2 Installation Folder
                      </label>
                      {voxConfig.found ? (
                        <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Path Configured
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Not Configured
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-muted/20 border border-border/30 rounded-lg px-2.5 py-2 text-xs font-mono truncate text-muted-foreground">
                        {voxConfig.path || 'No folder selected. Select VoxCPM2AI root folder.'}
                      </div>
                      <Button
                        onClick={handleBrowse}
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-9 shrink-0 gap-1.5 text-xs cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Browse...</span>
                      </Button>
                    </div>
                  </div>

                  {/* Checklist */}
                  {voxConfig.path && (
                    <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5 space-y-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Terminal className="h-3 w-3" /> Requirements Verification
                      </h4>
                      <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                        {/* Python venv */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Python Venv environment</span>
                          {voxConfig.venvExists ? (
                            <span className="text-green-500 font-medium flex items-center gap-1">✓ Found</span>
                          ) : (
                            <span className="text-red-500 font-medium flex items-center gap-1">✗ Missing</span>
                          )}
                        </div>
                        {/* Gradio App script */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Python Engine launch script</span>
                          {voxConfig.scriptExists ? (
                            <span className="text-green-500 font-medium flex items-center gap-1">✓ Found</span>
                          ) : (
                            <span className="text-red-500 font-medium flex items-center gap-1">✗ Missing</span>
                          )}
                        </div>
                        {/* 11GB model weights */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Khmer Model weights (11GB)</span>
                          {voxConfig.modelExists ? (
                            <span className="text-green-500 font-medium flex items-center gap-1">✓ Found</span>
                          ) : (
                            <span className="text-amber-500 font-medium flex items-center gap-1">✗ Missing</span>
                          )}
                        </div>
                      </div>
                      {!isSetupValid && (
                        <div className="text-[10px] text-amber-500 flex items-start gap-1 pt-1 border-t border-border/10">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>Ensure folder contains a valid VoxCPM2 installation containing voxcpm_env/.venv and model directory.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Local Server controller actions */}
                  <div className="pt-1.5">
                    {voxStatus === 'running' ? (
                      <Button
                        onClick={handleStopLocalServer}
                        variant="destructive"
                        className="w-full rounded-lg gap-1.5 text-xs py-5 cursor-pointer"
                      >
                        <Square className="h-3.5 w-3.5" />
                        <span>Stop Local Python Server</span>
                      </Button>
                    ) : voxStatus === 'loading' ? (
                      <Button
                        disabled
                        className="w-full rounded-lg gap-1.5 text-xs py-5 text-amber-500 bg-amber-500/10 border border-amber-500/20 cursor-not-allowed"
                      >
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-500/35 border-t-amber-500 animate-spin" />
                        <span>Loading Model (11GB)...</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartLocalServer}
                        disabled={!isSetupValid}
                        className={cn(
                          "w-full rounded-lg gap-1.5 text-xs py-5 text-white bg-gradient-to-r transition-all",
                          isSetupValid
                            ? "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 cursor-pointer"
                            : "from-muted/40 to-muted/40 text-muted-foreground border border-border/30 cursor-not-allowed"
                        )}
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Start Local Python Server</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* REMOTE (ONLINE) SUBPANEL */}
              {voxConfig.mode === 'remote' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Remote Server End-point URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={remoteUrlInput}
                        onChange={(e) => setRemoteUrlInput(e.target.value)}
                        placeholder="e.g. http://123.45.67.89:8808"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        disabled={isSaving}
                      />
                      <Button
                        onClick={handleSaveRemoteUrl}
                        size="sm"
                        className="rounded-lg h-8 px-3 text-xs cursor-pointer"
                        disabled={isSaving}
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      About Remote Mode
                    </p>
                    <p>
                      Points the app to a remote, online server running VoxCPM2. When saved, the Next.js local backend restarts dynamically to target the new host.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OMNIVOICE CONFIG PANEL */}
          {provider === 'omnivoice' && omniConfig && (
            <div className="space-y-4">
              {/* Mode Toggle Selector */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-2">
                  Execution Mode
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1 border border-border/30">
                  <button
                    disabled={isSaving}
                    onClick={() => handleToggleOmniMode('local')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer border border-transparent",
                      omniConfig.mode === 'local'
                        ? "bg-background shadow-xs text-foreground font-semibold border-border/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                    )}
                  >
                    <Cpu className="h-3 w-3" />
                    <span>Local (Offline)</span>
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleToggleOmniMode('remote')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer border border-transparent",
                      omniConfig.mode === 'remote'
                        ? "bg-background shadow-xs text-foreground font-semibold border-border/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                    )}
                  >
                    <Globe className="h-3 w-3" />
                    <span>Remote (Online)</span>
                  </button>
                </div>
              </div>

              {/* LOCAL (OFFLINE) SUBPANEL */}
              {omniConfig.mode === 'local' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* Folder path browse input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        OmniVoice Installation Folder
                      </label>
                      {omniConfig.found ? (
                        <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Path Configured
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Not Configured
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-muted/20 border border-border/30 rounded-lg px-2.5 py-2 text-xs font-mono truncate text-muted-foreground">
                        {omniConfig.path || 'No folder selected. Select OmniVoice root folder.'}
                      </div>
                      <Button
                        onClick={handleBrowseOmni}
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-9 shrink-0 gap-1.5 text-xs cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Browse...</span>
                      </Button>
                    </div>
                  </div>

                  {/* Checklist */}
                  {omniConfig.path && (
                    <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5 space-y-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Terminal className="h-3 w-3" /> Requirements Verification
                      </h4>
                      <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                        {/* Server executable */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">OmniVoice server executable</span>
                          {omniConfig.serverExists ? (
                            <span className="text-green-500 font-medium flex items-center gap-1">✓ Found</span>
                          ) : (
                            <span className="text-red-500 font-medium flex items-center gap-1">✗ Missing</span>
                          )}
                        </div>
                      </div>
                      {!isOmniSetupValid && (
                        <div className="text-[10px] text-amber-500 flex items-start gap-1 pt-1 border-t border-border/10">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>Ensure folder contains a valid OmniVoice installation containing omnivoice_env/.venv or omnivoice-server.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Local Server controller actions */}
                  <div className="pt-1.5">
                    {omniStatus === 'running' ? (
                      <Button
                        onClick={handleStopOmniServer}
                        variant="destructive"
                        className="w-full rounded-lg gap-1.5 text-xs py-5 cursor-pointer"
                      >
                        <Square className="h-3.5 w-3.5" />
                        <span>Stop OmniVoice Server</span>
                      </Button>
                    ) : omniStatus === 'loading' ? (
                      <Button
                        disabled
                        className="w-full rounded-lg gap-1.5 text-xs py-5 text-amber-500 bg-amber-500/10 border border-amber-500/20 cursor-not-allowed"
                      >
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-500/35 border-t-amber-500 animate-spin" />
                        <span>Starting OmniVoice...</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartOmniServer}
                        disabled={!isOmniSetupValid}
                        className={cn(
                          "w-full rounded-lg gap-1.5 text-xs py-5 text-white bg-gradient-to-r transition-all",
                          isOmniSetupValid
                            ? "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 cursor-pointer"
                            : "from-muted/40 to-muted/40 text-muted-foreground border border-border/30 cursor-not-allowed"
                        )}
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Start OmniVoice Server</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* REMOTE (ONLINE) SUBPANEL */}
              {omniConfig.mode === 'remote' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Remote Server End-point URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={remoteOmniUrlInput}
                        onChange={(e) => setRemoteOmniUrlInput(e.target.value)}
                        placeholder="e.g. http://123.45.67.89:8880"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        disabled={isSaving}
                      />
                      <Button
                        onClick={handleSaveRemoteOmniUrl}
                        size="sm"
                        className="rounded-lg h-8 px-3 text-xs cursor-pointer"
                        disabled={isSaving}
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      About Remote Mode
                    </p>
                    <p>
                      Points the app to a remote, online server running OmniVoice. When saved, the Next.js local backend restarts dynamically to target the new host.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FISH SPEECH CONFIG PANEL */}
          {provider === 'fishspeech' && fishConfig && (
            <div className="space-y-4">
              {/* Mode Toggle Selector */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-2">
                  Execution Mode
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1 border border-border/30">
                  <button
                    disabled={isSaving}
                    onClick={() => handleToggleFishMode('local')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer border border-transparent",
                      fishConfig.mode === 'local'
                        ? "bg-background shadow-xs text-foreground font-semibold border-border/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                    )}
                  >
                    <Cpu className="h-3 w-3" />
                    <span>Local (Offline)</span>
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleToggleFishMode('remote')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer border border-transparent",
                      fishConfig.mode === 'remote'
                        ? "bg-background shadow-xs text-foreground font-semibold border-border/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                    )}
                  >
                    <Globe className="h-3 w-3" />
                    <span>Remote (Online)</span>
                  </button>
                </div>
              </div>

              {/* LOCAL (OFFLINE) SUBPANEL */}
              {fishConfig.mode === 'local' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* Folder path browse input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        Fish Speech Installation Folder
                      </label>
                      {fishConfig.found ? (
                        <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Path Configured
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Not Configured
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-muted/20 border border-border/30 rounded-lg px-2.5 py-2 text-xs font-mono truncate text-muted-foreground">
                        {fishConfig.path || 'No folder selected. Select FishSpeech root folder.'}
                      </div>
                      <Button
                        onClick={handleBrowseFish}
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-9 shrink-0 gap-1.5 text-xs cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Browse...</span>
                      </Button>
                    </div>
                  </div>

                  {/* Checklist */}
                  {fishConfig.path && (
                    <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5 space-y-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Terminal className="h-3 w-3" /> Requirements Verification
                      </h4>
                      <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                        {/* Python Environment */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">fish_speech_env / .venv virtualenv</span>
                          {fishConfig.venvExists ? (
                            <span className="text-green-500 font-medium flex items-center gap-1">✓ Found</span>
                          ) : (
                            <span className="text-red-500 font-medium flex items-center gap-1">✗ Missing</span>
                          )}
                        </div>
                        {/* API Server Script */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">tools/api_server.py script</span>
                          {fishConfig.scriptExists ? (
                            <span className="text-green-500 font-medium flex items-center gap-1">✓ Found</span>
                          ) : (
                            <span className="text-red-500 font-medium flex items-center gap-1">✗ Missing</span>
                          )}
                        </div>
                      </div>
                      {!isFishSetupValid && (
                        <div className="text-[10px] text-amber-500 flex items-start gap-1 pt-1 border-t border-border/10">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>Ensure folder contains a valid Fish Speech installation with fish_speech_env/.venv and tools/api_server.py.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Local Server controller actions */}
                  <div className="pt-1.5">
                    {fishStatus === 'running' ? (
                      <Button
                        onClick={handleStopFishServer}
                        variant="destructive"
                        className="w-full rounded-lg gap-1.5 text-xs py-5 cursor-pointer"
                      >
                        <Square className="h-3.5 w-3.5" />
                        <span>Stop Fish Speech Server</span>
                      </Button>
                    ) : fishStatus === 'loading' ? (
                      <Button
                        disabled
                        className="w-full rounded-lg gap-1.5 text-xs py-5 text-amber-500 bg-amber-500/10 border border-amber-500/20 cursor-not-allowed"
                      >
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-500/35 border-t-amber-500 animate-spin" />
                        <span>Starting Fish Speech...</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartFishServer}
                        disabled={!isFishSetupValid}
                        className={cn(
                          "w-full rounded-lg gap-1.5 text-xs py-5 text-white bg-gradient-to-r transition-all",
                          isFishSetupValid
                            ? "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 cursor-pointer"
                            : "from-muted/40 to-muted/40 text-muted-foreground border border-border/30 cursor-not-allowed"
                        )}
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Start Fish Speech Server</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* REMOTE (ONLINE) SUBPANEL */}
              {fishConfig.mode === 'remote' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Remote Server End-point URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={remoteFishUrlInput}
                        onChange={(e) => setRemoteFishUrlInput(e.target.value)}
                        placeholder="e.g. http://123.45.67.89:8080"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        disabled={isSaving}
                      />
                      <Button
                        onClick={handleSaveRemoteFishUrl}
                        size="sm"
                        className="rounded-lg h-8 px-3 text-xs cursor-pointer"
                        disabled={isSaving}
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      About Remote Mode
                    </p>
                    <p>
                      Points the app to a remote, online server running Fish Speech API. When saved, the Next.js local backend restarts dynamically to target the new host.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
