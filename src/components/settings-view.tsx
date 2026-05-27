'use client'

import { useRecordingStore } from '@/lib/recording-store'
import { Monitor, Volume2, Mic, Keyboard, FolderOpen, Sliders, Download, FolderCheck, HardDrive, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useCallback, useState, useEffect } from 'react'

type RecordingSettings = import('@/lib/recording-store').RecordingSettings

// Check if File System Access API is available and usable
function getFileSystemAccessStatus(): { supported: boolean; reason: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering' }
  }

  // Check if the API exists
  if (!('showDirectoryPicker' in window)) {
    return { supported: false, reason: 'not-supported' }
  }

  // Check if we're in a secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    return { supported: false, reason: 'insecure-context' }
  }

  // Check if we're inside an iframe (cross-origin iframes block this API)
  try {
    if (window.self !== window.top) {
      // We're in an iframe — try to detect if it's cross-origin
      // If we can't access window.top, it's cross-origin
      try {
        const _ = window.top?.location.href
      } catch {
        return { supported: false, reason: 'cross-origin-iframe' }
      }
      // Same-origin iframe — might work, might not
      return { supported: false, reason: 'iframe' }
    }
  } catch {
    return { supported: false, reason: 'cross-origin-iframe' }
  }

  return { supported: true, reason: '' }
}

function getReasonMessage(reason: string): { title: string; description: string } {
  switch (reason) {
    case 'not-supported':
      return {
        title: 'Browser not supported',
        description: 'The "Choose Folder" feature requires Chrome, Edge, or Opera. Your browser doesn\'t support the File System Access API.',
      }
    case 'insecure-context':
      return {
        title: 'Insecure connection',
        description: 'The folder picker requires HTTPS. This app is running over HTTP, which blocks the File System Access API for security.',
      }
    case 'cross-origin-iframe':
      return {
        title: 'Running inside an embedded frame',
        description: 'The folder picker is blocked in embedded previews for security. Open the app in a new tab to use this feature — it works perfectly in a standalone browser tab.',
      }
    case 'iframe':
      return {
        title: 'Running inside a frame',
        description: 'The folder picker may not work inside embedded frames. Open the app in a new tab for the best experience.',
      }
    default:
      return {
        title: 'Not available',
        description: 'The folder picker is not available in this environment. Try opening the app in a new tab.',
      }
  }
}

export function SettingsView() {
  const { settings, updateSettings, directoryHandle, setDirectoryHandle } = useRecordingStore()
  const [fsStatus] = useState(getFileSystemAccessStatus)
  const [verifying, setVerifying] = useState(false)

  const handleChooseFolder = useCallback(async () => {
    try {
      setVerifying(true)
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      // Verify we can write to it
      const perm = await handle.requestPermission({ mode: 'readwrite' })
      if (perm === 'granted') {
        setDirectoryHandle(handle)
        updateSettings({
          useCustomFolder: true,
          customFolderName: handle.name,
        })
        toast.success('Folder selected', {
          description: `Videos will be saved to "${handle.name}"`,
        })
      } else {
        toast.error('Permission denied', {
          description: 'Write permission was not granted for the selected folder.',
        })
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the picker
        return
      }
      toast.error('Folder selection failed', {
        description: err instanceof DOMException && err.message
          ? err.message
          : 'Could not open folder picker. Try opening the app in a new tab.',
      })
    } finally {
      setVerifying(false)
    }
  }, [setDirectoryHandle, updateSettings])

  const handleClearFolder = useCallback(() => {
    setDirectoryHandle(null)
    updateSettings({
      useCustomFolder: false,
      customFolderName: 'Downloads',
    })
    toast('Save location reset to browser Downloads')
  }, [setDirectoryHandle, updateSettings])

  // Re-verify permission on mount if we have a handle
  useEffect(() => {
    if (directoryHandle) {
      directoryHandle.requestPermission({ mode: 'readwrite' }).then((perm) => {
        if (perm !== 'granted') {
          // Permission was revoked, clear it
          updateSettings({ useCustomFolder: false })
        }
      }).catch(() => {
        updateSettings({ useCustomFolder: false })
      })
    }
  }, [directoryHandle, updateSettings])

  const fsReasonInfo = getReasonMessage(fsStatus.reason)
  const isInIframe = fsStatus.reason === 'cross-origin-iframe' || fsStatus.reason === 'iframe'

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white"
        >
          Settings
        </motion.h1>
        <p className="text-zinc-500 text-sm mt-1">Configure recording quality, audio, and hotkeys</p>
      </div>

      {/* Video Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="bg-[#111118] border-white/[0.06]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Resolution</Label>
              <Select
                value={settings.resolution}
                onValueChange={(v) => updateSettings({ resolution: v as RecordingSettings['resolution'] })}
              >
                <SelectTrigger className="bg-[#0a0a0f] border-white/[0.08] text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111118] border-white/[0.08]">
                  <SelectItem value="480p">480p (854×480)</SelectItem>
                  <SelectItem value="720p">720p (1280×720)</SelectItem>
                  <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                  <SelectItem value="1440p">1440p (2560×1440)</SelectItem>
                  <SelectItem value="4k">4K (3840×2160)</SelectItem>
                  <SelectItem value="source">Source (Native)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Frame Rate</Label>
              <Select
                value={settings.frameRate.toString()}
                onValueChange={(v) => updateSettings({ frameRate: parseInt(v) as 30 | 60 | 120 })}
              >
                <SelectTrigger className="bg-[#0a0a0f] border-white/[0.08] text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111118] border-white/[0.08]">
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                  <SelectItem value="120">120 FPS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Bitrate</Label>
              <Select
                value={settings.bitrate}
                onValueChange={(v) => updateSettings({ bitrate: v as RecordingSettings['bitrate'] })}
              >
                <SelectTrigger className="bg-[#0a0a0f] border-white/[0.08] text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111118] border-white/[0.08]">
                  <SelectItem value="low">Low (2.5 Mbps)</SelectItem>
                  <SelectItem value="medium">Medium (5 Mbps)</SelectItem>
                  <SelectItem value="high">High (8 Mbps)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.bitrate === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label className="text-zinc-300 text-sm">
                  Custom Bitrate: {settings.customBitrate} Kbps
                </Label>
                <Slider
                  value={[settings.customBitrate]}
                  onValueChange={([v]) => updateSettings({ customBitrate: v })}
                  min={500}
                  max={50000}
                  step={500}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>500 Kbps</span>
                  <span>50,000 Kbps</span>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Format</Label>
              <Select
                value={settings.format}
                onValueChange={(v) => updateSettings({ format: v as 'webm' | 'mp4' })}
              >
                <SelectTrigger className="bg-[#0a0a0f] border-white/[0.08] text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111118] border-white/[0.08]">
                  <SelectItem value="webm">WebM (VP9 + Opus)</SelectItem>
                  <SelectItem value="mp4">MP4 (if supported)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-600">
                WebM is recommended for best browser compatibility. MP4 may not be supported on all systems.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300 text-sm">Show Cursor</Label>
                <p className="text-xs text-zinc-600 mt-0.5">Include cursor in recording</p>
              </div>
              <Switch
                checked={settings.showCursor}
                onCheckedChange={(v) => updateSettings({ showCursor: v })}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Audio Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-[#111118] border-white/[0.06]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              Audio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300 text-sm flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5" />
                  System Audio
                </Label>
                <p className="text-xs text-zinc-600 mt-0.5">Capture audio from the shared screen</p>
              </div>
              <Switch
                checked={settings.audioEnabled}
                onCheckedChange={(v) => updateSettings({ audioEnabled: v })}
              />
            </div>

            <Separator className="bg-white/[0.04]" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300 text-sm flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5" />
                  Microphone
                </Label>
                <p className="text-xs text-zinc-600 mt-0.5">Record microphone input alongside screen</p>
              </div>
              <Switch
                checked={settings.microphoneEnabled}
                onCheckedChange={(v) => updateSettings({ microphoneEnabled: v })}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Instant Replay Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="bg-[#111118] border-white/[0.06]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Instant Replay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Buffer Duration</Label>
              <Select
                value={settings.replayBufferDuration.toString()}
                onValueChange={(v) =>
                  updateSettings({ replayBufferDuration: parseInt(v) as 10 | 30 | 60 | 100 })
                }
              >
                <SelectTrigger className="bg-[#0a0a0f] border-white/[0.08] text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111118] border-white/[0.08]">
                  <SelectItem value="10">Last 10 seconds</SelectItem>
                  <SelectItem value="30">Last 30 seconds</SelectItem>
                  <SelectItem value="60">Last 60 seconds (1 min)</SelectItem>
                  <SelectItem value="100">Last 100 seconds</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-600">
                Higher duration = more memory usage. Only {settings.replayBufferDuration}s of video is kept in memory.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save & Download Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <Card className="bg-[#111118] border-white/[0.06]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              Save & Download
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Auto-download toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300 text-sm flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" />
                  Auto-Save to Disk
                </Label>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Automatically save recordings when stopped
                </p>
              </div>
              <Switch
                checked={settings.autoDownload}
                onCheckedChange={(v) => updateSettings({ autoDownload: v })}
              />
            </div>

            {/* Save mode selection - only visible when auto-download is on */}
            {settings.autoDownload && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <Separator className="bg-white/[0.04]" />

                {/* Save location mode */}
                <div className="space-y-3">
                  <Label className="text-zinc-300 text-sm flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5" />
                    Save Location
                  </Label>

                  {/* Option 1: Browser Downloads */}
                  <button
                    onClick={() => {
                      updateSettings({ useCustomFolder: false, customFolderName: 'Downloads' })
                      setDirectoryHandle(null)
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      !settings.useCustomFolder
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/[0.06] bg-[#0a0a0f] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      !settings.useCustomFolder ? 'bg-emerald-500/15' : 'bg-white/[0.04]'
                    }`}>
                      <Download className={`w-4 h-4 ${
                        !settings.useCustomFolder ? 'text-emerald-400' : 'text-zinc-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        !settings.useCustomFolder ? 'text-white' : 'text-zinc-400'
                      }`}>
                        Browser Downloads
                      </p>
                      <p className="text-xs text-zinc-600">
                        Save to your browser&apos;s default Downloads folder
                      </p>
                    </div>
                    {!settings.useCustomFolder && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </button>

                  {/* Option 2: Custom Folder */}
                  <button
                    onClick={() => {
                      if (fsStatus.supported) {
                        handleChooseFolder()
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      settings.useCustomFolder && fsStatus.supported
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/[0.06] bg-[#0a0a0f] hover:border-white/[0.12]'
                    } ${!fsStatus.supported ? 'border-amber-500/20 bg-amber-500/[0.03]' : ''}`}
                    disabled={fsStatus.supported ? false : true}
                  >
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      settings.useCustomFolder && fsStatus.supported ? 'bg-emerald-500/15' : 'bg-white/[0.04]'
                    }`}>
                      <FolderCheck className={`w-4 h-4 ${
                        settings.useCustomFolder && fsStatus.supported ? 'text-emerald-400' : 'text-zinc-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        settings.useCustomFolder && fsStatus.supported ? 'text-white' : 'text-zinc-400'
                      }`}>
                        Choose Folder on Disk
                      </p>
                      <p className="text-xs text-zinc-600">
                        {fsStatus.supported
                          ? settings.useCustomFolder
                            ? `Saving to: ${settings.customFolderName}`
                            : 'Pick any folder on your computer to save directly'
                          : fsReasonInfo.title}
                      </p>
                    </div>
                    {settings.useCustomFolder && fsStatus.supported && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                        Active
                      </Badge>
                    )}
                    {!fsStatus.supported && (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                        Blocked
                      </Badge>
                    )}
                  </button>
                </div>

                {/* Show selected folder info + clear button */}
                {settings.useCustomFolder && directoryHandle && fsStatus.supported && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FolderCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-emerald-300 font-medium truncate">
                          {settings.customFolderName}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          Videos are saved directly to this folder — no &quot;Save As&quot; dialog
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white h-7 text-xs"
                        onClick={handleChooseFolder}
                        disabled={verifying}
                      >
                        Change
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-500 hover:text-red-400 h-7 text-xs"
                        onClick={handleClearFolder}
                      >
                        Clear
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Enhanced compatibility warning with specific reason and action */}
                {!fsStatus.supported && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Main warning */}
                    <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-3">
                      <span className="text-sm text-amber-400 mt-0.5 flex-shrink-0">⚠</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-amber-300 font-medium">
                          {fsReasonInfo.title}
                        </p>
                        <p className="text-xs text-amber-300/60 mt-1">
                          {fsReasonInfo.description}
                        </p>
                      </div>
                    </div>

                    {/* Action: Open in new tab (for iframe cases) */}
                    {isInIframe && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 hover:border-amber-500/50"
                        onClick={() => {
                          window.open(window.location.href, '_blank')
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-2" />
                        Open in New Tab to Enable Folder Picker
                      </Button>
                    )}

                    {/* Technical details (collapsible) */}
                    <details className="group">
                      <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors flex items-center gap-1">
                        <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                        Technical details
                      </summary>
                      <div className="mt-1.5 bg-[#0a0a0f] rounded-lg px-3 py-2 border border-white/[0.04]">
                        <p className="text-[10px] text-zinc-600 leading-relaxed">
                          The &quot;Choose Folder&quot; option uses the File System Access API
                          (<code className="text-zinc-500">showDirectoryPicker()</code>),
                          which is a secure-only API. It requires:
                        </p>
                        <ul className="text-[10px] text-zinc-600 mt-1.5 space-y-0.5 ml-3">
                          <li>• A <span className="text-zinc-500">secure context</span> (HTTPS or localhost)</li>
                          <li>• A <span className="text-zinc-500">Chromium-based browser</span> (Chrome, Edge, Opera)</li>
                          <li>• <span className="text-zinc-500">No cross-origin iframe</span> — the API is blocked in embedded previews</li>
                        </ul>
                        <p className="text-[10px] text-zinc-600 mt-1.5">
                          When deployed on Vercel (HTTPS), opening the app directly in a new tab
                          will enable this feature in Chrome/Edge.
                        </p>
                      </div>
                    </details>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Info when auto-download is off */}
            {!settings.autoDownload && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#0a0a0f] rounded-lg px-3 py-2.5 border border-white/[0.06]"
              >
                <p className="text-xs text-zinc-500">
                  Videos are stored in browser memory only. Click the download button on any recording to save it manually.
                  Enable auto-save for instant downloads.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Keyboard Shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-[#111118] border-white/[0.06]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-violet-400" />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Start / Stop Recording</Label>
              <Input
                value={settings.hotkeyStartStop}
                onChange={(e) => updateSettings({ hotkeyStartStop: e.target.value })}
                className="bg-[#0a0a0f] border-white/[0.08] text-zinc-300 font-mono text-sm"
                placeholder="Ctrl+Alt+R"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Save Replay</Label>
              <Input
                value={settings.hotkeySaveReplay}
                onChange={(e) => updateSettings({ hotkeySaveReplay: e.target.value })}
                className="bg-[#0a0a0f] border-white/[0.08] text-zinc-300 font-mono text-sm"
                placeholder="Ctrl+Alt+S"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Toggle Pause</Label>
              <Input
                value={settings.hotkeyTogglePause}
                onChange={(e) => updateSettings({ hotkeyTogglePause: e.target.value })}
                className="bg-[#0a0a0f] border-white/[0.08] text-zinc-300 font-mono text-sm"
                placeholder="Ctrl+Alt+P"
              />
            </div>
            <p className="text-xs text-zinc-600">
              Note: Hotkeys work when the app is in focus. Browser security limits global hotkey access.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
