'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { DashboardView } from '@/components/dashboard-view'
import { RecordingView } from '@/components/recording-view'
import { ReplayView } from '@/components/replay-view'
import { RecordingsView } from '@/components/recordings-view'
import { SettingsView } from '@/components/settings-view'
import { FloatingControls } from '@/components/floating-controls'
import { RegionSelector } from '@/components/region-selector'
import { useRecordingStore, Region } from '@/lib/recording-store'
import { useScreenRecorder } from '@/lib/use-screen-recorder'
import { useEffect, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'

export default function Home() {
  const {
    currentView,
    isRecording,
    isReplayBuffering,
    isRegionSelecting,
    setShowFloatingControls,
    setIsRegionSelecting,
    setSelectedRegion,
    settings,
  } = useRecordingStore()
  const recorder = useScreenRecorder()
  const [regionStream, setRegionStream] = useState<MediaStream | null>(null)

  // Show floating controls when recording or buffering
  useEffect(() => {
    setShowFloatingControls(isRecording || isReplayBuffering)
  }, [isRecording, isReplayBuffering, setShowFloatingControls])

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const parseHotkey = (hk: string) => {
        const parts = hk.toLowerCase().split('+').map((p) => p.trim())
        return {
          ctrl: parts.includes('ctrl'),
          alt: parts.includes('alt'),
          shift: parts.includes('shift'),
          key: parts.filter((p) => !['ctrl', 'alt', 'shift'].includes(p))[0],
        }
      }

      const matchesHotkey = (hk: string) => {
        const parsed = parseHotkey(hk)
        return (
          e.ctrlKey === parsed.ctrl &&
          e.altKey === parsed.alt &&
          e.shiftKey === parsed.shift &&
          e.key.toLowerCase() === parsed.key
        )
      }

      if (matchesHotkey(settings.hotkeyStartStop)) {
        e.preventDefault()
        if (isRecording) {
          recorder.stopRecording()
          toast.success('Recording stopped', { description: 'Your recording has been saved.' })
        } else {
          recorder.startRecording()
          toast.success('Recording started', { description: 'Screen capture is now active.' })
        }
      }

      if (matchesHotkey(settings.hotkeySaveReplay) && isReplayBuffering) {
        e.preventDefault()
        recorder.saveReplay()
        toast.success('Replay saved!', { description: `Last ${settings.replayBufferDuration}s saved.` })
      }

      if (matchesHotkey(settings.hotkeyTogglePause) && isRecording) {
        e.preventDefault()
        if (useRecordingStore.getState().isPaused) {
          recorder.resumeRecording()
          toast('Recording resumed')
        } else {
          recorder.pauseRecording()
          toast('Recording paused')
        }
      }
    },
    [isRecording, isReplayBuffering, recorder, settings]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Error toast
  useEffect(() => {
    if (recorder.error) {
      toast.error('Recording Error', { description: recorder.error })
    }
  }, [recorder.error])

  // Full screen recording
  const handleStartRecording = useCallback(
    async (region?: Region) => {
      await recorder.startRecording(region)
      if (!recorder.error) {
        if (region) {
          toast.success('Region recording started', {
            description: `Recording ${region.width}×${region.height}px area.`,
          })
        } else {
          toast.success('Recording started', {
            description: 'Select a screen, window, or tab to capture.',
          })
        }
      }
    },
    [recorder]
  )

  const handleStopRecording = useCallback(() => {
    recorder.stopRecording()
    toast.success('Recording stopped', {
      description: settings.autoDownload
        ? 'Video saved to your Downloads folder.'
        : 'Your recording has been saved. Download it from the Recordings page.',
    })
  }, [recorder, settings.autoDownload])

  // Region selection flow
  const handleStartRegionSelection = useCallback(async () => {
    const stream = await recorder.startRegionSelection()
    if (stream) {
      setRegionStream(stream)
    }
  }, [recorder])

  const handleRegionConfirm = useCallback(
    (region: Region) => {
      setSelectedRegion(region)
      setIsRegionSelecting(false)
      setRegionStream(null)
      // Start recording with the selected region
      handleStartRecording(region)
    },
    [handleStartRecording, setSelectedRegion, setIsRegionSelecting]
  )

  const handleRegionCancel = useCallback(() => {
    recorder.cancelRegionSelection()
    setIsRegionSelecting(false)
    setRegionStream(null)
  }, [recorder, setIsRegionSelecting])

  // Replay buffer
  const handleStartReplayBuffer = useCallback(async () => {
    await recorder.startReplayBuffer()
    if (!recorder.error) {
      toast.success('Replay buffer active', {
        description: `Buffering last ${settings.replayBufferDuration}s of screen.`,
      })
    }
  }, [recorder, settings.replayBufferDuration])

  const handleStopReplayBuffer = useCallback(() => {
    recorder.stopReplayBuffer()
    toast('Replay buffer stopped')
  }, [recorder])

  const handleSaveReplay = useCallback(() => {
    recorder.saveReplay()
    toast.success('Replay saved!', {
      description: settings.autoDownload
        ? `Last ${settings.replayBufferDuration}s saved to Downloads.`
        : `Last ${settings.replayBufferDuration}s saved to recordings.`,
    })
  }, [recorder, settings.autoDownload, settings.replayBufferDuration])

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onStartRecording={() => handleStartRecording()}
            onStartReplayBuffer={handleStartReplayBuffer}
          />
        )
      case 'recording':
        return (
          <RecordingView
            onStartRecording={() => handleStartRecording()}
            onStopRecording={handleStopRecording}
            onPauseRecording={recorder.pauseRecording}
            onResumeRecording={recorder.resumeRecording}
            onStartRegionSelection={handleStartRegionSelection}
            error={recorder.error}
          />
        )
      case 'replay':
        return (
          <ReplayView
            onStartReplayBuffer={handleStartReplayBuffer}
            onStopReplayBuffer={handleStopReplayBuffer}
            onSaveReplay={handleSaveReplay}
          />
        )
      case 'recordings':
        return <RecordingsView />
      case 'settings':
        return <SettingsView />
      default:
        return null
    }
  }

  return (
    <div className="h-screen w-screen flex bg-[#08080d] text-white overflow-hidden">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{renderView()}</main>

      {/* Floating Controls */}
      <FloatingControls
        onPauseRecording={recorder.pauseRecording}
        onResumeRecording={recorder.resumeRecording}
        onStopRecording={handleStopRecording}
        onSaveReplay={handleSaveReplay}
        onStopReplayBuffer={handleStopReplayBuffer}
      />

      {/* Region Selector Overlay */}
      {isRegionSelecting && regionStream && (
        <RegionSelector
          stream={regionStream}
          onConfirm={handleRegionConfirm}
          onCancel={handleRegionCancel}
        />
      )}
    </div>
  )
}
