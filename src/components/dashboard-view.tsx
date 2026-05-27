'use client'

import { useRecordingStore } from '@/lib/recording-store'
import { Monitor, Circle, RotateCcw, FolderOpen, Zap, Activity, HardDrive, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DashboardViewProps {
  onStartRecording: () => void
  onStartReplayBuffer: () => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function DashboardView({ onStartRecording, onStartReplayBuffer }: DashboardViewProps) {
  const { isRecording, isReplayBuffering, recordingDuration, recordings, settings } = useRecordingStore()

  const totalSize = recordings.reduce((acc, r) => acc + r.size, 0)
  const totalDuration = recordings.reduce((acc, r) => acc + r.duration, 0)

  const stats = [
    {
      label: 'Total Recordings',
      value: recordings.length.toString(),
      icon: FolderOpen,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Total Duration',
      value: formatDuration(totalDuration),
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Disk Usage',
      value: formatBytes(totalSize),
      icon: HardDrive,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Status',
      value: isRecording ? 'Recording' : isReplayBuffering ? 'Buffering' : 'Ready',
      icon: Activity,
      color: isRecording ? 'text-red-400' : isReplayBuffering ? 'text-amber-400' : 'text-emerald-400',
      bgColor: isRecording ? 'bg-red-500/10' : isReplayBuffering ? 'bg-amber-500/10' : 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white"
        >
          Dashboard
        </motion.h1>
        <p className="text-zinc-500 text-sm mt-1">Screen capture and instant replay at your fingertips</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-[#111118] border-white/[0.06] hover:border-emerald-500/30 transition-colors cursor-pointer group" onClick={onStartRecording}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <Circle className="w-6 h-6 text-red-400 fill-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">Start Recording</h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Capture your screen with audio. Click to select a screen, window, or browser tab.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">
                      {settings.resolution}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">
                      {settings.frameRate}fps
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">
                      {settings.bitrate} bitrate
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-[#111118] border-white/[0.06] hover:border-amber-500/30 transition-colors cursor-pointer group" onClick={onStartReplayBuffer}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <RotateCcw className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">Instant Replay</h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Continuously buffer your screen. Save the last {settings.replayBufferDuration}s anytime with a click.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">
                      {settings.replayBufferDuration}s buffer
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">
                      Circular buffer
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
          >
            <Card className="bg-[#111118] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{stat.label}</p>
                    <p className="text-sm font-semibold text-white">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="bg-[#111118] border-white/[0.06]">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-400">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Select Source</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Choose your screen, window, or browser tab to capture</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-cyan-400">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Record or Buffer</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Start manual recording or enable instant replay buffer</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-amber-400">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Save & Share</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Download recordings as WebM video files instantly</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Keyboard Shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-[#111118] border-white/[0.06]">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-3">Keyboard Shortcuts</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Start / Stop Recording</span>
                <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 text-xs font-mono">
                  {settings.hotkeyStartStop}
                </kbd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Save Replay</span>
                <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 text-xs font-mono">
                  {settings.hotkeySaveReplay}
                </kbd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Toggle Pause</span>
                <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 text-xs font-mono">
                  {settings.hotkeyTogglePause}
                </kbd>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
