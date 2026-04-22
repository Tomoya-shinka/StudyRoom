'use client'

import { useEffect, useRef } from 'react'
import { IconMicOff, IconVideoOff } from '@/components/SimpleIcons'

interface VideoTileProps {
  stream: MediaStream | null
  name: string
  isLocal?: boolean
  isMuted?: boolean
  isCameraOff?: boolean
  isScreenSharing?: boolean
  /** When true, fills parent container instead of forcing aspect-video ratio */
  fill?: boolean
  /** Hides the camera-off text label — use for small strip tiles */
  compact?: boolean
}

export default function VideoTile({ stream, name, isLocal = false, isMuted = false, isCameraOff = false, isScreenSharing = false, fill = false, compact = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Treat a stream with no video tracks as camera-off
  const hasVideoTrack = stream ? stream.getVideoTracks().length > 0 : false
  const showCameraOff = isCameraOff || (stream !== null && !hasVideoTrack)

  return (
    <div className={`relative bg-bg-card rounded-xl overflow-hidden flex items-center justify-center ${fill ? 'w-full h-full' : 'aspect-video'}`}>

      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover${isLocal && !isScreenSharing ? ' scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="text-muted text-sm">接続中...</div>
      )}

      {/* Camera-off overlay */}
      {showCameraOff && (
        <div className="absolute inset-0 bg-bg-base/95 flex flex-col items-center justify-center gap-2">
          <IconVideoOff className={compact ? 'w-8 h-8 text-muted' : 'w-12 h-12 text-muted'} />
          {!compact && <span className="text-sm text-muted">カメラOFF</span>}
        </div>
      )}

      {/* Screen sharing badge — top-left */}
      {isScreenSharing && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-accent text-bg-base text-xs font-semibold px-2 py-1 rounded-full">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          {!compact && '画面共有中'}
        </div>
      )}

      {/* Name label + mute badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
        <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-sm font-medium">
          {name}
          {isLocal && <span className="ml-1 text-accent text-xs">(あなた)</span>}
        </div>
        {isMuted && (
          <div className="bg-red-600 px-1.5 py-1 rounded text-xs font-bold flex items-center" title="ミュート中">
            <IconMicOff className="w-4 h-4" />
          </div>
        )}
      </div>

    </div>
  )
}
