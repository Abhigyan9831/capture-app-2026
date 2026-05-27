'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Region } from '@/lib/recording-store'
import { Button } from '@/components/ui/button'
import { X, Check, Move, Maximize2, Ratio } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface RegionSelectorProps {
  stream: MediaStream | null
  onConfirm: (region: Region) => void
  onCancel: () => void
}

export function RegionSelector({ stream, onConfirm, onCancel }: RegionSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 })
  
  // Selection state (in video coordinates)
  const [selection, setSelection] = useState<Region | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [moveOffset, setMoveOffset] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<string>('')

  // Scale factor between display and actual video
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => {
        setVideoReady(true)
        if (videoRef.current) {
          setVideoDimensions({
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          })
        }
      }
    }
  }, [stream])

  // Calculate scale factor when container resizes
  useEffect(() => {
    if (!containerRef.current || !videoReady) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const displayWidth = entry.contentRect.width
        const displayHeight = entry.contentRect.height
        if (videoDimensions.width > 0 && videoDimensions.height > 0) {
          const scaleX = displayWidth / videoDimensions.width
          const scaleY = displayHeight / videoDimensions.height
          setScale(Math.min(scaleX, scaleY))
        }
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [videoReady, videoDimensions])

  // Convert screen coords to video coords
  const toVideoCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !videoRef.current) return { x: 0, y: 0 }
      const rect = videoRef.current.getBoundingClientRect()
      return {
        x: Math.round((clientX - rect.left) / scale),
        y: Math.round((clientY - rect.top) / scale),
      }
    },
    [scale]
  )

  // Mouse down on empty area: start new selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.emptyArea) return
      e.preventDefault()
      const coords = toVideoCoords(e.clientX, e.clientY)
      setSelection({ x: coords.x, y: coords.y, width: 0, height: 0 })
      setIsDragging(true)
      setDragStart(coords)
    },
    [toVideoCoords]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = toVideoCoords(e.clientX, e.clientY)

      if (isDragging && selection) {
        const x = Math.min(dragStart.x, coords.x)
        const y = Math.min(dragStart.y, coords.y)
        const width = Math.abs(coords.x - dragStart.x)
        const height = Math.abs(coords.y - dragStart.y)
        setSelection({ x, y, width, height })
      } else if (isMoving && selection) {
        let newX = coords.x - moveOffset.x
        let newY = coords.y - moveOffset.y
        // Clamp to video bounds
        newX = Math.max(0, Math.min(newX, videoDimensions.width - selection.width))
        newY = Math.max(0, Math.min(newY, videoDimensions.height - selection.height))
        setSelection({ ...selection, x: newX, y: newY })
      } else if (isResizing && selection) {
        let newSelection = { ...selection }
        const minSize = 50

        switch (resizeHandle) {
          case 'se':
            newSelection.width = Math.max(minSize, coords.x - selection.x)
            newSelection.height = Math.max(minSize, coords.y - selection.y)
            break
          case 'sw':
            newSelection.width = Math.max(minSize, selection.x + selection.width - coords.x)
            newSelection.x = selection.x + selection.width - newSelection.width
            newSelection.height = Math.max(minSize, coords.y - selection.y)
            break
          case 'ne':
            newSelection.width = Math.max(minSize, coords.x - selection.x)
            newSelection.height = Math.max(minSize, selection.y + selection.height - coords.y)
            newSelection.y = selection.y + selection.height - newSelection.height
            break
          case 'nw':
            newSelection.width = Math.max(minSize, selection.x + selection.width - coords.x)
            newSelection.height = Math.max(minSize, selection.y + selection.height - coords.y)
            newSelection.x = selection.x + selection.width - newSelection.width
            newSelection.y = selection.y + selection.height - newSelection.height
            break
          case 'n':
            newSelection.height = Math.max(minSize, selection.y + selection.height - coords.y)
            newSelection.y = selection.y + selection.height - newSelection.height
            break
          case 's':
            newSelection.height = Math.max(minSize, coords.y - selection.y)
            break
          case 'e':
            newSelection.width = Math.max(minSize, coords.x - selection.x)
            break
          case 'w':
            newSelection.width = Math.max(minSize, selection.x + selection.width - coords.x)
            newSelection.x = selection.x + selection.width - newSelection.width
            break
        }

        setSelection(newSelection)
      }
    },
    [isDragging, isMoving, isResizing, selection, dragStart, moveOffset, resizeHandle, toVideoCoords, videoDimensions]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsMoving(false)
    setIsResizing(false)
    setResizeHandle('')
  }, [])

  // Start moving the selection
  const handleMoveStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const coords = toVideoCoords(e.clientX, e.clientY)
      if (selection) {
        setMoveOffset({ x: coords.x - selection.x, y: coords.y - selection.y })
        setIsMoving(true)
      }
    },
    [selection, toVideoCoords]
  )

  // Start resizing
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.stopPropagation()
      setResizeHandle(handle)
      setIsResizing(true)
    },
    []
  )

  const handleConfirm = useCallback(() => {
    if (selection && selection.width > 50 && selection.height > 50) {
      onConfirm(selection)
    }
  }, [selection, onConfirm])

  const handleSelectAll = useCallback(() => {
    setSelection({
      x: 0,
      y: 0,
      width: videoDimensions.width,
      height: videoDimensions.height,
    })
  }, [videoDimensions])

  // Global mouse events
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setIsMoving(false)
      setIsResizing(false)
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const displaySelection = selection
    ? {
        left: selection.x * scale,
        top: selection.y * scale,
        width: selection.width * scale,
        height: selection.height * scale,
      }
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
    >
      {/* Top bar */}
      <div className="h-14 bg-[#0a0a0f] border-b border-white/[0.06] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Ratio className="w-5 h-5 text-emerald-400" />
          <span className="text-white font-medium">Select Recording Region</span>
          {selection && selection.width > 0 && selection.height > 0 && (
            <span className="text-xs text-zinc-400 font-mono">
              {selection.width} × {selection.height}px
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
            onClick={handleSelectAll}
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleConfirm}
            disabled={!selection || selection.width < 50 || selection.height < 50}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Start Recording
          </Button>
        </div>
      </div>

      {/* Video preview with selection overlay */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="max-w-full max-h-full object-contain"
          style={{ cursor: isDragging ? 'crosshair' : 'default' }}
        />

        {/* Dark overlay with cutout for selection */}
        {videoReady && (
          <div
            className="absolute inset-0"
            onMouseDown={handleMouseDown}
            data-empty-area="true"
          >
            {/* Semi-transparent overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <mask id="region-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {displaySelection && (
                    <rect
                      x={displaySelection.left}
                      y={displaySelection.top}
                      width={displaySelection.width}
                      height={displaySelection.height}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.6)"
                mask="url(#region-mask)"
                className="pointer-events-none"
              />
            </svg>

            {/* Selection rectangle */}
            {displaySelection && selection && selection.width > 2 && selection.height > 2 && (
              <div
                className="absolute border-2 border-emerald-400 bg-transparent cursor-move"
                style={{
                  left: displaySelection.left,
                  top: displaySelection.top,
                  width: displaySelection.width,
                  height: displaySelection.height,
                }}
                onMouseDown={handleMoveStart}
              >
                {/* Corner handles */}
                {['nw', 'ne', 'sw', 'se'].map((handle) => (
                  <div
                    key={handle}
                    className={`absolute w-3 h-3 bg-emerald-400 rounded-sm ${
                      handle === 'nw'
                        ? 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize'
                        : handle === 'ne'
                          ? 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize'
                          : handle === 'sw'
                            ? 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize'
                            : 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize'
                    }`}
                    onMouseDown={(e) => handleResizeStart(e, handle)}
                  />
                ))}

                {/* Edge handles */}
                {[
                  { handle: 'n', cls: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize' },
                  { handle: 's', cls: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize' },
                  { handle: 'e', cls: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize' },
                  { handle: 'w', cls: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize' },
                ].map(({ handle, cls }) => (
                  <div
                    key={handle}
                    className={`absolute w-6 h-2 bg-emerald-400/60 rounded-full ${cls}`}
                    onMouseDown={(e) => handleResizeStart(e, handle)}
                  />
                ))}

                {/* Dimension label */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                  {selection.width} × {selection.height}
                </div>

                {/* Move icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
                  <Move className="w-5 h-5 text-white" />
                </div>
              </div>
            )}

            {/* Instruction text when no selection */}
            {(!selection || selection.width < 2) && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/10">
                  <p className="text-white font-medium">Click and drag to select a region</p>
                  <p className="text-zinc-400 text-sm mt-1">
                    Or click &quot;Select All&quot; to capture the entire screen
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="h-10 bg-[#0a0a0f] border-t border-white/[0.06] flex items-center justify-center flex-shrink-0">
        <p className="text-xs text-zinc-600">
          Drag to select • Drag corners/edges to resize • Drag inside to move • Minimum 50×50px
        </p>
      </div>
    </motion.div>
  )
}
