'use client'

import { useRecordingStore } from '@/lib/recording-store'
import { RotateCcw, Save, Square, Zap, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useState } from 'react'

interface ReplayViewProps {
  onStartReplayBuffer: () => void
  onStopReplayBuffer: () => void
  onSaveReplay: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ReplayView({ onStartReplayBuffer, onStopReplayBuffer, onSaveReplay }: ReplayViewProps) {
  const { isReplayBuffering, recordingDuration, replayBufferProgress, settings } = useRecordingStore()
  const [saveFlash, setSaveFlash] = useState(false)

  const handleSaveReplay = () => {
    onSaveReplay()
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1500)
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white"
        >
          Instant Replay
        </motion.h1>
        <p className="text-zinc-500 text-sm mt-1">
          Continuously buffer your screen — save epic moments before they&apos;re gone
        </p>
      </div>

      {/* Main Replay Area */}
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AnimatePresence mode="wait">
          {!isReplayBuffering ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Buffer Icon */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-40 h-40 rounded-full border border-amber-500/10" />
                <button
                  onClick={onStartReplayBuffer}
                  className="group relative w-32 h-32 rounded-full bg-amber-500/10 border-2 border-amber-500/30 
                    hover:border-amber-500/60 hover:bg-amber-500/20 transition-all duration-300 flex items-center justify-center"
                >
                  <RotateCcw className="w-12 h-12 text-amber-400 group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <div className="text-center">
                <p className="text-white font-medium text-lg">Enable Instant Replay</p>
                <p className="text-zinc-500 text-sm mt-1">
                  Starts background buffering — last {settings.replayBufferDuration}s will always be available
                </p>
              </div>

              {/* How it works */}
              <Card className="bg-[#111118] border-white/[0.06] max-w-md mt-4">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium text-sm flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    How the Circular Buffer Works
                  </h4>
                  <div className="space-y-2 text-xs text-zinc-400">
                    <p>
                      1. When enabled, the app continuously records your screen in the background using a
                      <span className="text-amber-400 font-medium"> circular buffer</span>.
                    </p>
                    <p>
                      2. Video data is captured in 1-second chunks. Chunks older than {settings.replayBufferDuration}s
                      are automatically <span className="text-amber-400 font-medium">discarded</span>.
                    </p>
                    <p>
                      3. When you click &quot;Save Replay&quot;, all buffered chunks are combined into a single video
                      file and <span className="text-emerald-400 font-medium">downloaded instantly</span>.
                    </p>
                    <p>
                      4. Memory usage stays constant — only {settings.replayBufferDuration}s of video data is ever
                      held in memory at once.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="buffering"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-6 w-full max-w-lg"
            >
              {/* Buffer Visualization */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-44 h-44 rounded-full border border-amber-500/10 animate-pulse" />
                <div className="w-36 h-36 rounded-full bg-[#111118] border-2 border-amber-500/40 flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-amber-400 text-xs font-medium mt-2">BUFFERING</p>
                  </div>
                </div>
              </div>

              {/* Buffer Progress */}
              <div className="w-full text-center">
                <p className="text-3xl font-mono font-bold text-white">
                  {formatTime(Math.min(recordingDuration, settings.replayBufferDuration))}
                </p>
                <p className="text-zinc-500 text-sm mt-1">
                  of {settings.replayBufferDuration}s buffer filled
                </p>
                <div className="mt-3 w-full max-w-xs mx-auto">
                  <Progress
                    value={replayBufferProgress}
                    className="h-2 bg-white/[0.06]"
                  />
                </div>
              </div>

              {/* Status Badge */}
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-sm px-4 py-1">
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Replay Buffer Active — {settings.replayBufferDuration}s
              </Badge>

              {/* Save Button */}
              <motion.div
                animate={saveFlash ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Button
                  onClick={handleSaveReplay}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 h-12 text-base font-semibold shadow-lg shadow-emerald-500/20"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save Replay
                </Button>
              </motion.div>
              <p className="text-zinc-600 text-xs">
                Saves the last {settings.replayBufferDuration}s of buffered content
              </p>

              {/* Stop Buffer */}
              <Button
                onClick={onStopReplayBuffer}
                variant="ghost"
                className="text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Buffering
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
