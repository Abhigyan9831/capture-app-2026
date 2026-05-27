'use client'

import { useRecordingStore, Region } from '@/lib/recording-store'
import { Circle, Square, Pause, Play, Monitor, AlertCircle, Crop, Maximize } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface RecordingViewProps {
  onStartRecording: (region?: Region) => void
  onStopRecording: () => void
  onPauseRecording: () => void
  onResumeRecording: () => void
  onStartRegionSelection: () => void
  error: string | null
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function RecordingView({
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onStartRegionSelection,
  error,
}: RecordingViewProps) {
  const { isRecording, isPaused, recordingDuration, settings, selectedRegion } = useRecordingStore()
  const [pulseKey, setPulseKey] = useState(0)
  const [recordMode, setRecordMode] = useState<'fullscreen' | 'region'>('fullscreen')

  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => setPulseKey((k) => k + 1), 1000)
      return () => clearInterval(interval)
    }
  }, [isRecording, isPaused])

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white"
        >
          Screen Recording
        </motion.h1>
        <p className="text-zinc-500 text-sm mt-1">Capture your screen with full audio support</p>
      </div>

      {/* Main Recording Area */}
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AnimatePresence mode="wait">
          {!isRecording ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1">
                <button
                  onClick={() => setRecordMode('fullscreen')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    recordMode === 'fullscreen'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Maximize className="w-4 h-4" />
                  Full Screen
                </button>
                <button
                  onClick={() => setRecordMode('region')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    recordMode === 'region'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Crop className="w-4 h-4" />
                  Region Select
                </button>
              </div>

              {/* Big Record Button */}
              <button
                onClick={() => {
                  if (recordMode === 'region') {
                    onStartRegionSelection()
                  } else {
                    onStartRecording()
                  }
                }}
                className="group relative w-32 h-32 rounded-full bg-red-500/10 border-2 border-red-500/30 
                  hover:border-red-500/60 hover:bg-red-500/20 transition-all duration-300 flex items-center justify-center"
              >
                <div className="absolute inset-0 rounded-full bg-red-500/5 animate-ping opacity-20" />
                {recordMode === 'fullscreen' ? (
                  <Circle className="w-12 h-12 text-red-400 fill-red-400 group-hover:scale-110 transition-transform" />
                ) : (
                  <Crop className="w-10 h-10 text-red-400 group-hover:scale-110 transition-transform" />
                )}
              </button>
              <div className="text-center">
                <p className="text-white font-medium">
                  {recordMode === 'fullscreen'
                    ? 'Click to Start Recording'
                    : 'Click to Select Region'}
                </p>
                <p className="text-zinc-500 text-sm mt-1">
                  {recordMode === 'fullscreen'
                    ? 'Select a screen, window, or tab to capture'
                    : 'Drag to select a specific area of the screen to record'}
                </p>
              </div>

              {/* Region preview badge */}
              {recordMode === 'region' && selectedRegion && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <Crop className="w-3 h-3 mr-1" />
                  Region: {selectedRegion.width} × {selectedRegion.height}px
                </Badge>
              )}

              {/* Settings Preview */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/[0.06] text-zinc-400 hover:bg-white/[0.08]">
                  {settings.resolution}
                </Badge>
                <Badge variant="secondary" className="bg-white/[0.06] text-zinc-400 hover:bg-white/[0.08]">
                  {settings.frameRate} FPS
                </Badge>
                <Badge variant="secondary" className="bg-white/[0.06] text-zinc-400 hover:bg-white/[0.08]">
                  {settings.audioEnabled ? 'Audio On' : 'Audio Off'}
                </Badge>
                <Badge variant="secondary" className="bg-white/[0.06] text-zinc-400 hover:bg-white/[0.08]">
                  {settings.autoDownload ? 'Auto-Save On' : 'Auto-Save Off'}
                </Badge>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Recording Indicator */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-40 h-40 rounded-full bg-red-500/5 animate-pulse" />
                <div className="absolute w-36 h-36 rounded-full border border-red-500/20" />
                <div className="w-28 h-28 rounded-full bg-[#111118] border-2 border-red-500/40 flex items-center justify-center">
                  {isPaused ? (
                    <Pause className="w-10 h-10 text-amber-400" />
                  ) : (
                    <motion.div
                      key={pulseKey}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Square className="w-10 h-10 text-red-400 fill-red-400" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Timer */}
              <div className="text-center">
                <p className="text-5xl font-mono font-bold text-white tracking-wider">
                  {formatTime(recordingDuration)}
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {isPaused ? (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                      <Pause className="w-3 h-3 mr-1" />
                      Paused
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                      <Circle className="w-3 h-3 mr-1 fill-red-400" />
                      Recording
                    </Badge>
                  )}
                  {selectedRegion && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      <Crop className="w-3 h-3 mr-1" />
                      Region
                    </Badge>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {isPaused ? (
                  <Button
                    onClick={onResumeRecording}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={onPauseRecording}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-8"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={onStopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Cards */}
      {!isRecording && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#111118] border-white/[0.06] hover:border-emerald-500/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Maximize className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">Full Screen</p>
                  <p className="text-xs text-zinc-500">Capture entire display or window</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#111118] border-white/[0.06] hover:border-cyan-500/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Crop className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium text-white">Region Select</p>
                  <p className="text-xs text-zinc-500">Drag to select a custom area</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#111118] border-white/[0.06] hover:border-amber-500/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-white">Audio + Mic</p>
                  <p className="text-xs text-zinc-500">Record system audio and microphone</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
