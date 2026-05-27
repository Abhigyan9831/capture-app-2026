'use client'

import {
  Monitor,
  Circle,
  RotateCcw,
  FolderOpen,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useRecordingStore, ViewMode } from '@/lib/recording-store'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navItems: { id: ViewMode; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: Monitor, label: 'Dashboard' },
  { id: 'recording', icon: Circle, label: 'Recording' },
  { id: 'replay', icon: RotateCcw, label: 'Instant Replay' },
  { id: 'recordings', icon: FolderOpen, label: 'Recordings' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

export function AppSidebar() {
  const { currentView, setCurrentView, isRecording, isReplayBuffering } = useRecordingStore()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full bg-[#0a0a0f] border-r border-white/[0.06] flex flex-col relative z-10"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <span className="text-sm font-semibold text-white whitespace-nowrap">ScreenCap Pro</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = currentView === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              )}
            >
              <div className="relative flex-shrink-0">
                <Icon
                  className={cn(
                    'w-[18px] h-[18px]',
                    isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                />
                {item.id === 'recording' && isRecording && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
                {item.id === 'replay' && isReplayBuffering && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/[0.06]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  )
}
