'use client'

import { useRecordingStore } from '@/lib/recording-store'
import { Circle, Square, Pause, Play, Save, RotateCcw, GripHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useState, useRef, useCallback, useEffect } from 'react'

interface FloatingControlsProps {
  onPauseRecording: () => void
  onResumeRecording: () => void
  onStopRecording: () => void
  onSaveReplay: () => void
  onStopReplayBuffer: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function FloatingControls({
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onSaveReplay,
  onStopReplayBuffer,
}: FloatingControlsProps) {
  const { isRecording, isPaused, isReplayBuffering, recordingDuration, showFloatingControls } = useRecordingStore()
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    }
  }, [position])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const newX = Math.max(0, Math.min(window.innerWidth - 200, dragRef.current.startPosX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.startPosY + dy))
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const showControls = showFloatingControls && (isRecording || isReplayBuffering)

  return (
    <AnimatePresence>
      {showControls && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          style={{ left: position.x, top: position.y }}
          className="fixed z-50 select-none"
        >
          <div className="flex items-center gap-0.5 bg-black/80 backdrop-blur-xl border border-white/[0.1] rounded-full pl-1 pr-2 py-1 shadow-2xl shadow-black/50">
            {/* Drag handle */}
            <div
              onMouseDown={handleMouseDown}
              className="cursor-grab active:cursor-grabbing px-1.5 py-1 rounded-full hover:bg-white/[0.06] transition-colors"
            >
              <GripHorizontal className="w-4 h-4 text-zinc-500" />
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 px-2">
              {isRecording && (
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Circle className="w-3 h-3 text-red-400 fill-red-400" />
                </motion.div>
              )}
              {isReplayBuffering && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                </motion.div>
              )}
              <span className="text-xs font-mono text-zinc-300 min-w-[40px]">
                {formatTime(recordingDuration)}
              </span>
            </div>

            {/* Action buttons */}
            {isRecording && (
              <>
                {isPaused ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={onResumeRecording}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    onClick={onPauseRecording}
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={onStopRecording}
                >
                  <Square className="w-3.5 h-3.5 fill-red-400" />
                </Button>
              </>
            )}

            {isReplayBuffering && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={onSaveReplay}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={onStopReplayBuffer}
                >
                  <Square className="w-3.5 h-3.5 fill-red-400" />
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
