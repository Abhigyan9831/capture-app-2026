'use client'

import { useRecordingStore, RecordingItem } from '@/lib/recording-store'
import { Play, Download, Trash2, Clock, HardDrive, Monitor, Video, Crop } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RecordingCard({ recording, onPlay, onDelete }: {
  recording: RecordingItem
  onPlay: (r: RecordingItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="bg-[#111118] border-white/[0.06] hover:border-white/[0.12] transition-colors group">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="w-20 h-14 rounded-lg bg-[#0a0a0f] border border-white/[0.06] flex items-center justify-center flex-shrink-0 relative">
              <Video className="w-5 h-5 text-zinc-600" />
              {recording.isRegion && (
                <div className="absolute top-0.5 right-0.5">
                  <Crop className="w-3 h-3 text-emerald-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{recording.name}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(recording.duration)}
                </span>
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  {formatBytes(recording.size)}
                </span>
                {recording.isRegion ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                    <Crop className="w-2.5 h-2.5 mr-0.5" />
                    Region
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-white/[0.06] text-zinc-400 text-[10px] px-1.5 py-0">
                    Full Screen
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-white/[0.06] text-zinc-400 text-[10px] px-1.5 py-0">
                  .{recording.format}
                </Badge>
              </div>
              <p className="text-[10px] text-zinc-600 mt-1">{formatDate(recording.timestamp)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                onClick={() => onPlay(recording)}
              >
                <Play className="w-4 h-4" />
              </Button>
              {recording.url && (
                <a
                  href={recording.url}
                  download={`${recording.name}.${recording.format}`}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => onDelete(recording.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function RecordingsView() {
  const { recordings, removeRecording, settings } = useRecordingStore()
  const [playingRecording, setPlayingRecording] = useState<RecordingItem | null>(null)

  const handlePlay = (recording: RecordingItem) => {
    setPlayingRecording(recording === playingRecording ? null : recording)
  }

  const handleDelete = (id: string) => {
    const rec = recordings.find((r) => r.id === id)
    if (rec?.url) URL.revokeObjectURL(rec.url)
    removeRecording(id)
    if (playingRecording?.id === id) setPlayingRecording(null)
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white"
          >
            Recordings
          </motion.h1>
          <p className="text-zinc-500 text-sm mt-1">
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''} • {formatBytes(recordings.reduce((a, r) => a + r.size, 0))} total
            {settings.autoDownload && (
              <span className="text-emerald-400 ml-2">• Auto-save is ON</span>
            )}
          </p>
        </div>
      </div>

      {/* Video Player */}
      <AnimatePresence>
        {playingRecording && playingRecording.url && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-[#111118] border-white/[0.06] overflow-hidden">
              <CardContent className="p-0">
                <div className="relative bg-black">
                  <video
                    src={playingRecording.url}
                    controls
                    autoPlay
                    className="w-full max-h-[400px]"
                  />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      {playingRecording.name}
                      {playingRecording.isRegion && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                          <Crop className="w-2.5 h-2.5 mr-0.5" />
                          Region
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatDuration(playingRecording.duration)} • {formatBytes(playingRecording.size)} • {playingRecording.resolution}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={playingRecording.url}
                      download={`${playingRecording.name}.${playingRecording.format}`}
                    >
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-zinc-400"
                      onClick={() => setPlayingRecording(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No recordings yet</p>
          <p className="text-zinc-600 text-sm mt-1">
            Start a recording or save a replay to see it here
          </p>
        </motion.div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-300px)]">
          <div className="space-y-2">
            <AnimatePresence>
              {recordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  onPlay={handlePlay}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
