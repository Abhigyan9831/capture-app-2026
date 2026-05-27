'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRecordingStore, Region } from './recording-store'

interface ScreenRecorderHook {
  startRecording: (region?: Region) => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  startReplayBuffer: () => Promise<void>
  stopReplayBuffer: () => void
  saveReplay: () => void
  startRegionSelection: () => Promise<MediaStream | null>
  cancelRegionSelection: () => void
  videoPreviewUrl: string | null
  error: string | null
  isSupported: boolean
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Delay revoking to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

async function saveToDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  blob: Blob,
  filename: string
): Promise<boolean> {
  try {
    // Verify permission
    const perm = await directoryHandle.requestPermission({ mode: 'readwrite' })
    if (perm !== 'granted') {
      console.warn('Directory permission not granted')
      return false
    }

    // Create the file and write the blob
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (err) {
    console.error('Failed to save to directory:', err)
    return false
  }
}

function shiftWebmTimestamps(fileData: Uint8Array): Uint8Array {
  let offset = 0
  let firstClusterTimecode: number | null = null

  // Helper to parse EBML Variable-length Integer (vint)
  const parseVint = (start: number): { value: number; length: number; isUnknown: boolean } => {
    if (start >= fileData.length) return { value: 0, length: 0, isUnknown: false }
    const firstByte = fileData[start]
    let length = 1
    while (length <= 8 && (firstByte & (0x80 >> (length - 1))) === 0) {
      length++
    }
    if (length > 8) return { value: 0, length: 1, isUnknown: false }
    
    let value = firstByte & (0xFF >> length)
    let isUnknown = (firstByte & (0xFF >> length)) === (0xFF >> length)
    for (let i = 1; i < length; i++) {
      if (start + i >= fileData.length) return { value: 0, length: 0, isUnknown: false }
      const b = fileData[start + i]
      value = value * 256 + b
      if (b !== 0xFF) isUnknown = false
    }
    return { value, length, isUnknown }
  }

  while (offset < fileData.length) {
    const idResult = parseVint(offset)
    if (idResult.length === 0) break
    const idBytes = fileData.slice(offset, offset + idResult.length)
    const idHex = Array.from(idBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
    offset += idResult.length

    const sizeResult = parseVint(offset)
    if (sizeResult.length === 0) break
    const size = sizeResult.value
    const sizeUnknown = sizeResult.isUnknown
    offset += sizeResult.length

    if (idHex === '1A45DFA3') {
      // EBML Header - skip
      if (!sizeUnknown) offset += size
    } else if (idHex === '18538067') {
      // Segment - enter its contents, do not skip
    } else if (idHex === '1F43B675') {
      // Cluster
      const clusterStart = offset
      let clusterOffset = clusterStart
      
      while (clusterOffset < fileData.length) {
        if (clusterOffset > clusterStart) {
          const nextIdResult = parseVint(clusterOffset)
          if (nextIdResult.length > 0) {
            const nextIdBytes = fileData.slice(clusterOffset, clusterOffset + nextIdResult.length)
            const nextIdHex = Array.from(nextIdBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
            if (nextIdHex === '1F43B675' || nextIdHex === '1549A966' || nextIdHex === '1654AE6B' || nextIdHex === '114D9B74') {
              break // Next sibling element, this Cluster is done
            }
          }
        }

        const childIdResult = parseVint(clusterOffset)
        if (childIdResult.length === 0) break
        const childIdBytes = fileData.slice(clusterOffset, clusterOffset + childIdResult.length)
        const childIdHex = Array.from(childIdBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
        clusterOffset += childIdResult.length

        const childSizeResult = parseVint(clusterOffset)
        if (childSizeResult.length === 0) break
        const childSize = childSizeResult.value
        const childSizeUnknown = childSizeResult.isUnknown
        clusterOffset += childSizeResult.length

        if (childIdHex === 'E7') {
          // Timecode
          let timecode = 0
          for (let i = 0; i < childSize; i++) {
            timecode = timecode * 256 + fileData[clusterOffset + i]
          }

          if (firstClusterTimecode === null) {
            firstClusterTimecode = timecode
          }

          const shiftedTimecode = Math.max(0, timecode - firstClusterTimecode)
          
          let temp = shiftedTimecode
          for (let i = childSize - 1; i >= 0; i--) {
            fileData[clusterOffset + i] = temp % 256
            temp = Math.floor(temp / 256)
          }
          
          if (!sizeUnknown) {
            clusterOffset = clusterStart + size
          } else {
            clusterOffset += childSize
          }
          break
        } else {
          if (!childSizeUnknown) {
            clusterOffset += childSize
          } else {
            break
          }
        }
      }

      if (!sizeUnknown) {
        offset = clusterStart + size
      } else {
        offset = clusterOffset
      }
    } else {
      if (!sizeUnknown) offset += size
    }
  }

  return fileData
}

export function useScreenRecorder(): ScreenRecorderHook {
  const {
    settings,
    setIsRecording,
    setIsPaused,
    setIsReplayBuffering,
    setRecordingDuration,
    setReplayBufferProgress,
    setHasVideoStream,
    setHasAudioStream,
    addRecording,
    setIsRegionSelecting,
  } = useRecordingStore()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const replayChunksRef = useRef<{ chunk: Blob; timestamp: number }[]>([])
  const headerChunkRef = useRef<Blob | null>(null)
  const metadataHeaderRef = useRef<Uint8Array | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const replayPruneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)
  const totalPausedRef = useRef<number>(0)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const stopFnRef = useRef<(() => void) | null>(null)
  const regionCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const regionAnimFrameRef = useRef<number | null>(null)
  const regionVideoRef = useRef<HTMLVideoElement | null>(null)

  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia

  const getResolutionConstraints = useCallback(() => {
    const resMap: Record<string, { width: number; height: number }> = {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '1440p': { width: 2560, height: 1440 },
      '4k': { width: 3840, height: 2160 },
    }
    if (settings.resolution === 'source') return {}
    return resMap[settings.resolution] || {}
  }, [settings.resolution])

  const getBitrate = useCallback(() => {
    const bitrateMap: Record<string, number> = {
      low: 2500,
      medium: 5000,
      high: 8000,
    }
    if (settings.bitrate === 'custom') return settings.customBitrate * 1000
    return (bitrateMap[settings.bitrate] || 8000) * 1000
  }, [settings.bitrate, settings.customBitrate])

  const getMimeType = useCallback(() => {
    const isMp4Selected = settings.format === 'mp4'
    const mp4Types = [
      'video/mp4;codecs=h264,aac',
      'video/mp4;codecs=h264',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ]
    const webmTypes = [
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]

    const checkList = isMp4Selected ? [...mp4Types, ...webmTypes] : [...webmTypes, ...mp4Types]

    for (const type of checkList) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }, [settings.format])

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [])

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop())
      previewStreamRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    if (regionAnimFrameRef.current) {
      cancelAnimationFrame(regionAnimFrameRef.current)
      regionAnimFrameRef.current = null
    }
    if (regionVideoRef.current) {
      regionVideoRef.current.srcObject = null
      regionVideoRef.current = null
    }
    setHasVideoStream(false)
    setHasAudioStream(false)
  }, [setHasVideoStream, setHasAudioStream])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopDurationTimer()
    setIsRecording(false)
    setIsPaused(false)
    setRecordingDuration(0)
  }, [setIsRecording, setIsPaused, setRecordingDuration, stopDurationTimer])

  // Keep ref updated
  useEffect(() => {
    stopFnRef.current = stopRecording
  }, [stopRecording])

  const startDurationTimer = useCallback(() => {
    startTimeRef.current = Date.now()
    totalPausedRef.current = 0
    durationIntervalRef.current = setInterval(() => {
      const { isPaused: currentlyPaused } = useRecordingStore.getState()
      if (!currentlyPaused) {
        const elapsed = Date.now() - startTimeRef.current - totalPausedRef.current
        setRecordingDuration(Math.floor(elapsed / 1000))
      }
    }, 100)
  }, [setRecordingDuration])

  const acquireStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setError(null)
      const resConstraints = getResolutionConstraints()

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          ...resConstraints,
          frameRate: settings.frameRate,
          cursor: settings.showCursor ? 'always' : 'never',
        } as MediaTrackConstraints,
        audio: settings.audioEnabled,
      })

      const tracks = [...displayStream.getVideoTracks()]
      const systemAudioTracks = settings.audioEnabled ? displayStream.getAudioTracks() : []
      let micAudioTracks: MediaStreamTrack[] = []

      if (settings.microphoneEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          micStreamRef.current = micStream
          micAudioTracks = micStream.getAudioTracks()
        } catch (micErr) {
          console.warn('Microphone access denied:', micErr)
        }
      }

      if (systemAudioTracks.length > 0 && micAudioTracks.length > 0) {
        // Mix both system audio and mic audio using AudioContext
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const destination = audioCtx.createMediaStreamDestination()

        const systemSource = audioCtx.createMediaStreamSource(new MediaStream([systemAudioTracks[0]]))
        const micSource = audioCtx.createMediaStreamSource(new MediaStream([micAudioTracks[0]]))

        systemSource.connect(destination)
        micSource.connect(destination)

        const mixedTrack = destination.stream.getAudioTracks()[0]
        tracks.push(mixedTrack)
        setHasAudioStream(true)
      } else if (systemAudioTracks.length > 0) {
        tracks.push(systemAudioTracks[0])
        setHasAudioStream(true)
      } else if (micAudioTracks.length > 0) {
        tracks.push(micAudioTracks[0])
        setHasAudioStream(true)
      } else {
        setHasAudioStream(false)
      }

      const combinedStream = new MediaStream(tracks)
      streamRef.current = combinedStream
      previewStreamRef.current = displayStream
      setHasVideoStream(true)

      displayStream.getVideoTracks()[0].onended = () => {
        const { isRecording: rec, isReplayBuffering: buf } = useRecordingStore.getState()
        if (rec || buf) {
          stopFnRef.current?.()
        }
      }

      return combinedStream
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to capture screen'
      setError(message)
      return null
    }
  }, [getResolutionConstraints, settings, setHasVideoStream, setHasAudioStream])

  const handleRecordingStop = useCallback(
    (stream: MediaStream, mimeType: string, region?: Region) => {
      if (chunksRef.current.length > 0) {
        const cleanType = mimeType ? mimeType.split(';')[0] : 'video/webm'
        const blobType = settings.format === 'mp4' ? 'video/mp4' : cleanType
        const blob = new Blob(chunksRef.current, { type: blobType })
        const url = URL.createObjectURL(blob)
        setVideoPreviewUrl(url)

        const duration = Math.floor(
          (Date.now() - startTimeRef.current - totalPausedRef.current) / 1000
        )
        const name = region
          ? `Region_${new Date().toISOString().replace(/[:.]/g, '-')}`
          : `Recording_${new Date().toISOString().replace(/[:.]/g, '-')}`
        const ext = settings.format === 'mp4' ? 'mp4' : (cleanType.includes('mp4') ? 'mp4' : 'webm')

        addRecording({
          id: crypto.randomUUID(),
          name,
          blob,
          url,
          duration,
          size: blob.size,
          timestamp: Date.now(),
          resolution: settings.resolution,
          format: ext,
          isRegion: !!region,
          region: region || undefined,
        })

        // Auto-download if enabled
        if (settings.autoDownload) {
          const { directoryHandle, settings: currentSettings } = useRecordingStore.getState()
          if (currentSettings.useCustomFolder && directoryHandle) {
            // Save directly to the chosen folder (non-blocking)
            saveToDirectory(directoryHandle, blob, `${name}.${ext}`).then((saved) => {
              if (!saved) {
                downloadBlob(blob, `${name}.${ext}`)
              }
            })
          } else {
            // Regular browser download
            downloadBlob(blob, `${name}.${ext}`)
          }
        }
      }

      cleanupStream()
      chunksRef.current = []
    },
    [settings, addRecording, cleanupStream]
  )

  const startRecording = useCallback(
    async (region?: Region) => {
      const stream = await acquireStream()
      if (!stream) return

      try {
      const mimeType = getMimeType()
      let recordStream: MediaStream = stream

        // If region is selected, create a canvas-based cropped stream
        if (region && region.width > 0 && region.height > 0) {
          const video = document.createElement('video')
          video.srcObject = previewStreamRef.current
          video.muted = true
          video.autoplay = true
          await video.play()

          const canvas = document.createElement('canvas')
          canvas.width = region.width
          canvas.height = region.height
          const ctx = canvas.getContext('2d')!

          regionVideoRef.current = video
          regionCanvasRef.current = canvas

          // Draw loop: crop each frame to the selected region
          const drawFrame = () => {
            if (!regionVideoRef.current || !regionCanvasRef.current) return
            ctx.drawImage(
              regionVideoRef.current,
              region.x,
              region.y,
              region.width,
              region.height,
              0,
              0,
              region.width,
              region.height
            )
            regionAnimFrameRef.current = requestAnimationFrame(drawFrame)
          }
          drawFrame()

          // Create stream from canvas + audio tracks
          const canvasStream = canvas.captureStream(settings.frameRate)
          const audioTracks = stream.getAudioTracks()
          const combinedTracks = [...canvasStream.getVideoTracks(), ...audioTracks]
          recordStream = new MediaStream(combinedTracks)
        }

        const recorder = new MediaRecorder(recordStream, {
          mimeType: mimeType || undefined,
          videoBitsPerSecond: getBitrate(),
        })

        chunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        recorder.onstop = () => {
          handleRecordingStop(stream, mimeType, region || undefined)
        }

        mediaRecorderRef.current = recorder
        recorder.start(1000)
        setIsRecording(true)
        setIsPaused(false)
        startDurationTimer()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to start recording'
        setError(message)
        cleanupStream()
      }
    },
    [acquireStream, getBitrate, getMimeType, settings, setIsRecording, setIsPaused, startDurationTimer, handleRecordingStop, cleanupStream]
  )

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      pauseTimeRef.current = Date.now()
      setIsPaused(true)
    }
  }, [setIsPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      totalPausedRef.current += Date.now() - pauseTimeRef.current
      setIsPaused(false)
    }
  }, [setIsPaused])

  // Region selection: acquire the stream but don't start recording yet
  const startRegionSelection = useCallback(async (): Promise<MediaStream | null> => {
    const stream = await acquireStream()
    if (!stream) return null
    setIsRegionSelecting(true)
    return previewStreamRef.current
  }, [acquireStream, setIsRegionSelecting])

  const cancelRegionSelection = useCallback(() => {
    setIsRegionSelecting(false)
    cleanupStream()
  }, [setIsRegionSelecting, cleanupStream])

  const startReplayBuffer = useCallback(async () => {
    const stream = await acquireStream()
    if (!stream) return

    try {
      const mimeType = getMimeType()
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: getBitrate(),
      })

      replayChunksRef.current = []
      headerChunkRef.current = null

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          if (!headerChunkRef.current) {
            headerChunkRef.current = e.data
            const reader = new FileReader()
            reader.onload = () => {
              const array = new Uint8Array(reader.result as ArrayBuffer)
              let clusterIndex = -1
              for (let i = 0; i < array.length - 3; i++) {
                if (array[i] === 0x1F && array[i + 1] === 0x43 && array[i + 2] === 0xB6 && array[i + 3] === 0x75) {
                  clusterIndex = i
                  break
                }
              }
              if (clusterIndex !== -1) {
                metadataHeaderRef.current = array.slice(0, clusterIndex)
              } else {
                metadataHeaderRef.current = array
              }
            }
            reader.readAsArrayBuffer(e.data)
          }
          replayChunksRef.current.push({
            chunk: e.data,
            timestamp: Date.now(),
          })
        }
      }

      recorder.onstop = () => {
        cleanupStream()
        replayChunksRef.current = []
        headerChunkRef.current = null
        metadataHeaderRef.current = null
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000)
      setIsReplayBuffering(true)
      startTimeRef.current = Date.now()
      startDurationTimer()

      // Prune old chunks periodically
      replayPruneIntervalRef.current = setInterval(() => {
        const now = Date.now()
        const maxAge = settings.replayBufferDuration * 1000
        replayChunksRef.current = replayChunksRef.current.filter(
          (c) => now - c.timestamp < maxAge
        )
        const progress = Math.min(
          100,
          ((now - startTimeRef.current) / (settings.replayBufferDuration * 1000)) * 100
        )
        setReplayBufferProgress(progress)
      }, 1000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start replay buffer'
      setError(message)
      cleanupStream()
    }
  }, [acquireStream, getBitrate, getMimeType, settings, setIsReplayBuffering, setReplayBufferProgress, startDurationTimer, cleanupStream])

  const stopReplayBuffer = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (replayPruneIntervalRef.current) {
      clearInterval(replayPruneIntervalRef.current)
      replayPruneIntervalRef.current = null
    }
    stopDurationTimer()
    setIsReplayBuffering(false)
    setRecordingDuration(0)
    setReplayBufferProgress(0)
    headerChunkRef.current = null
    metadataHeaderRef.current = null
  }, [setIsReplayBuffering, setRecordingDuration, setReplayBufferProgress, stopDurationTimer])

  const saveReplay = useCallback(async () => {
    if (replayChunksRef.current.length === 0) return

    const mimeType = getMimeType()
    const cleanType = mimeType ? mimeType.split(';')[0] : 'video/webm'

    const chunkPromises = replayChunksRef.current.map(async (c) => {
      const buffer = await c.chunk.arrayBuffer()
      return new Uint8Array(buffer)
    })
    const chunkArrays = await Promise.all(chunkPromises)

    let totalLength = 0
    const arraysToConcat = []

    const isHeaderPruned = headerChunkRef.current && replayChunksRef.current[0]?.chunk !== headerChunkRef.current
    if (isHeaderPruned && metadataHeaderRef.current) {
      arraysToConcat.push(metadataHeaderRef.current)
      totalLength += metadataHeaderRef.current.length
    }

    for (const arr of chunkArrays) {
      arraysToConcat.push(arr)
      totalLength += arr.length
    }

    const concatenatedArray = new Uint8Array(totalLength)
    let writeOffset = 0
    for (const arr of arraysToConcat) {
      concatenatedArray.set(arr, writeOffset)
      writeOffset += arr.length
    }

    const shiftedArray = shiftWebmTimestamps(concatenatedArray)
    const blobType = settings.format === 'mp4' ? 'video/mp4' : cleanType
    const blob = new Blob([shiftedArray], { type: blobType })
    const url = URL.createObjectURL(blob)
    const ext = settings.format === 'mp4' ? 'mp4' : (cleanType.includes('mp4') ? 'mp4' : 'webm')

    const duration = Math.min(
      settings.replayBufferDuration,
      Math.floor((Date.now() - startTimeRef.current) / 1000)
    )

    const name = `Replay_${new Date().toISOString().replace(/[:.]/g, '-')}`

    addRecording({
      id: crypto.randomUUID(),
      name,
      blob,
      url,
      duration,
      size: blob.size,
      timestamp: Date.now(),
      resolution: settings.resolution,
      format: ext,
      isRegion: false,
    })

    setVideoPreviewUrl(url)

    // Auto-download if enabled
    if (settings.autoDownload) {
      const { directoryHandle, settings: currentSettings } = useRecordingStore.getState()
      if (currentSettings.useCustomFolder && directoryHandle) {
        saveToDirectory(directoryHandle, blob, `${name}.${ext}`).then((saved) => {
          if (!saved) {
            downloadBlob(blob, `${name}.${ext}`)
          }
        })
      } else {
        downloadBlob(blob, `${name}.${ext}`)
      }
    }
  }, [getMimeType, settings, addRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDurationTimer()
      if (replayPruneIntervalRef.current) {
        clearInterval(replayPruneIntervalRef.current)
      }
      cleanupStream()
      headerChunkRef.current = null
      metadataHeaderRef.current = null
    }
  }, [stopDurationTimer, cleanupStream])

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    startReplayBuffer,
    stopReplayBuffer,
    saveReplay,
    startRegionSelection,
    cancelRegionSelection,
    videoPreviewUrl,
    error,
    isSupported,
  }
}
