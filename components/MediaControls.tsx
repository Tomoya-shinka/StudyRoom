'use client'

import { IconMic, IconMicOff, IconVideo, IconVideoOff } from '@/components/SimpleIcons'

interface MediaControlsProps {
  isMuted: boolean
  isCameraOff: boolean
  onToggleMute: () => void
  onToggleCamera: () => void
}

export default function MediaControls({ isMuted, isCameraOff, onToggleMute, onToggleCamera }: MediaControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-4 border-t border-border-subtle bg-bg-base">
      <button
        onClick={onToggleMute}
        title={isMuted ? 'ミュート解除' : 'ミュート'}
        className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl text-xs font-medium transition-colors ${
          isMuted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-bg-elevated hover:bg-border-subtle text-white'
        }`}
      >
        <span className="inline-flex">{isMuted ? <IconMicOff className="w-6 h-6" /> : <IconMic className="w-6 h-6" />}</span>
        {isMuted ? 'ミュート中' : 'マイク'}
      </button>

      <button
        onClick={onToggleCamera}
        title={isCameraOff ? 'カメラをON' : 'カメラをOFF'}
        className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl text-xs font-medium transition-colors ${
          isCameraOff ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-bg-elevated hover:bg-border-subtle text-white'
        }`}
      >
        <span className="inline-flex">{isCameraOff ? <IconVideoOff className="w-6 h-6" /> : <IconVideo className="w-6 h-6" />}</span>
        {isCameraOff ? 'カメラOFF' : 'カメラ'}
      </button>
    </div>
  )
}
