'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'replay-buffering'
export type ViewMode = 'dashboard' | 'recording' | 'replay' | 'recordings' | 'settings'

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export interface RecordingSettings {
  saveDirectory: string
  bitrate: 'low' | 'medium' | 'high' | 'custom'
  customBitrate: number
  resolution: '480p' | '720p' | '1080p' | '1440p' | '4k' | 'source'
  frameRate: 30 | 60 | 120
  replayBufferDuration: 30 | 60 | 100
  format: 'webm' | 'mp4'
  audioEnabled: boolean
  microphoneEnabled: boolean
  showCursor: boolean
  autoDownload: boolean
  useCustomFolder: boolean
  customFolderName: string
  hotkeySaveReplay: string
  hotkeyStartStop: string
  hotkeyTogglePause: string
}

export interface RecordingItem {
  id: string
  name: string
  blob: Blob
  url: string
  duration: number
  size: number
  timestamp: number
  resolution: string
  format: string
  isRegion: boolean
  region?: Region
}

export interface RecordingState {
  // Status
  status: RecordingStatus
  currentView: ViewMode

  // Recording state
  isRecording: boolean
  isPaused: boolean
  isReplayBuffering: boolean
  recordingDuration: number
  replayBufferProgress: number

  // Region selection
  isRegionSelecting: boolean
  selectedRegion: Region | null

  // Media streams
  hasVideoStream: boolean
  hasAudioStream: boolean

  // Recordings library
  recordings: RecordingItem[]

  // Settings
  settings: RecordingSettings

  // Directory handle for File System Access API (not persisted)
  directoryHandle: FileSystemDirectoryHandle | null

  // Floating controls
  showFloatingControls: boolean
  floatingControlsPosition: { x: number; y: number }

  // Actions
  setStatus: (status: RecordingStatus) => void
  setCurrentView: (view: ViewMode) => void
  setIsRecording: (value: boolean) => void
  setIsPaused: (value: boolean) => void
  setIsReplayBuffering: (value: boolean) => void
  setRecordingDuration: (duration: number) => void
  setReplayBufferProgress: (progress: number) => void
  setIsRegionSelecting: (value: boolean) => void
  setSelectedRegion: (region: Region | null) => void
  setHasVideoStream: (value: boolean) => void
  setHasAudioStream: (value: boolean) => void
  addRecording: (recording: RecordingItem) => void
  removeRecording: (id: string) => void
  updateSettings: (settings: Partial<RecordingSettings>) => void
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void
  setShowFloatingControls: (show: boolean) => void
  setFloatingControlsPosition: (pos: { x: number; y: number }) => void
}

const defaultSettings: RecordingSettings = {
  saveDirectory: 'Downloads',
  bitrate: 'high',
  customBitrate: 8000,
  resolution: '1080p',
  frameRate: 60,
  replayBufferDuration: 100,
  format: 'webm',
  audioEnabled: true,
  microphoneEnabled: false,
  showCursor: true,
  autoDownload: true,
  useCustomFolder: false,
  customFolderName: 'Downloads',
  hotkeySaveReplay: 'Ctrl+Alt+S',
  hotkeyStartStop: 'Ctrl+Alt+R',
  hotkeyTogglePause: 'Ctrl+Alt+P',
}

export const useRecordingStore = create<RecordingState>()(
  persist(
    (set) => ({
      status: 'idle',
      currentView: 'dashboard',
      isRecording: false,
      isPaused: false,
      isReplayBuffering: false,
      recordingDuration: 0,
      replayBufferProgress: 0,
      isRegionSelecting: false,
      selectedRegion: null,
      hasVideoStream: false,
      hasAudioStream: false,
      recordings: [],
      settings: defaultSettings,
      directoryHandle: null,
      showFloatingControls: false,
      floatingControlsPosition: { x: 20, y: 20 },

      setStatus: (status) => set({ status }),
      setCurrentView: (currentView) => set({ currentView }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setIsPaused: (isPaused) => set({ isPaused }),
      setIsReplayBuffering: (isReplayBuffering) => set({ isReplayBuffering }),
      setRecordingDuration: (recordingDuration) => set({ recordingDuration }),
      setReplayBufferProgress: (replayBufferProgress) => set({ replayBufferProgress }),
      setIsRegionSelecting: (isRegionSelecting) => set({ isRegionSelecting }),
      setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
      setHasVideoStream: (hasVideoStream) => set({ hasVideoStream }),
      setHasAudioStream: (hasAudioStream) => set({ hasAudioStream }),
      addRecording: (recording) =>
        set((state) => ({
          recordings: [recording, ...state.recordings],
        })),
      removeRecording: (id) =>
        set((state) => ({
          recordings: state.recordings.filter((r) => r.id !== id),
        })),
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setDirectoryHandle: (directoryHandle) => set({ directoryHandle }),
      setShowFloatingControls: (showFloatingControls) => set({ showFloatingControls }),
      setFloatingControlsPosition: (floatingControlsPosition) => set({ floatingControlsPosition }),
    }),
    {
      name: 'screen-recorder-settings',
      partialize: (state) => ({
        settings: state.settings,
        recordings: state.recordings.map((r) => ({
          ...r,
          blob: null as unknown as Blob,
          url: '',
        })),
        floatingControlsPosition: state.floatingControlsPosition,
      }),
    }
  )
)
