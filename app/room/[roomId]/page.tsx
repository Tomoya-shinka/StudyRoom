'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useSocket } from '@/hooks/useSocket'
import VideoGrid from '@/components/VideoGrid'
import VideoTile from '@/components/VideoTile'
import LeaveButton from '@/components/LeaveButton'
import DeviceSettingsButton from '@/components/DeviceSettingsButton'
import MediaControls from '@/components/MediaControls'
import VirtualBackgroundPanel from '@/components/VirtualBackgroundPanel'
import { IconCheck, IconLink, IconLayoutGrid, IconLayoutSpeaker, IconLayoutSpotlight } from '@/components/SimpleIcons'
import { useActiveSpeaker } from '@/hooks/useActiveSpeaker'
import { useVirtualBackground } from '@/hooks/useVirtualBackground'
import type { ViewMode } from '@/components/VideoGrid'
import type { VirtualBgConfig } from '@/hooks/useVirtualBackground'
import type { RoomDTO } from '@/types'

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const socket = useSocket()
  const [room, setRoom] = useState<RoomDTO | null>(null)
  const [peekRoom, setPeekRoom] = useState<RoomDTO | null>(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('userName')
    if (!saved?.trim()) {
      const input = prompt('表示名を入力してください')
      if (!input?.trim()) {
        router.push('/')
        return
      }
      localStorage.setItem('userName', input.trim())
      setUserName(input.trim())
    } else {
      setUserName(saved.trim())
    }
  }, [])

  useEffect(() => {
    setPeekRoom(null)
    socket.emit('room:peek', { roomId })
    const onPeek = (data: { room?: RoomDTO; error?: string }) => {
      if (data.error === 'not_found' || !data.room) {
        alert('部屋が見つかりません')
        router.push('/')
        return
      }
      setPeekRoom(data.room)
    }
    socket.on('room:peek:result', onPeek)
    return () => {
      socket.off('room:peek:result', onPeek)
    }
  }, [roomId, router, socket])

  useEffect(() => {
    const onJoined = ({ room }: { room: RoomDTO }) => setRoom(room)
    const onError = ({ message }: { message: string }) => {
      alert(message)
      router.push('/')
    }
    socket.on('room:joined', onJoined)
    socket.on('error', onError)
    return () => {
      socket.off('room:joined', onJoined)
      socket.off('error', onError)
    }
  }, [])

  const {
    localStream,
    remoteStreams,
    participants,
    remoteMediaStates,
    leaveRoom,
    changeDevices,
    replaceVideoTrack,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    joinRoom,
    joined,
  } = useWebRTC(roomId, userName)

  const [bgConfig, setBgConfig] = useState<VirtualBgConfig>({ mode: 'none' })

  // Restore last background config on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vbg_config')
      if (!saved) return
      const parsed: VirtualBgConfig & { imageType?: string } = JSON.parse(saved)
      if (parsed.imageType === 'uploaded') {
        const uploadedUrl = localStorage.getItem('vbg_uploaded_image')
        if (uploadedUrl) setBgConfig({ mode: 'image', blurAmount: parsed.blurAmount, imageUrl: uploadedUrl })
      } else {
        const { imageType: _ignored, ...cfg } = parsed
        setBgConfig(cfg)
      }
    } catch { /* ignore parse errors */ }
  }, [])

  function handleBgConfigChange(newConfig: VirtualBgConfig) {
    setBgConfig(newConfig)
    // Persist config — uploaded images are stored separately, so only flag them
    try {
      const toSave: VirtualBgConfig & { imageType?: string } = { mode: newConfig.mode, blurAmount: newConfig.blurAmount }
      if (newConfig.mode === 'image') {
        if (newConfig.imageUrl?.startsWith('data:image/svg+xml')) {
          toSave.imageUrl = newConfig.imageUrl
          toSave.imageType = 'preset'
        } else {
          toSave.imageType = 'uploaded'
        }
      }
      localStorage.setItem('vbg_config', JSON.stringify(toSave))
    } catch { /* quota */ }
  }

  const processedStream = useVirtualBackground(localStream, bgConfig)
  // What peers and local preview actually see
  const displayStream = processedStream ?? localStream

  // When processed stream changes, replace video track in all peers
  const prevProcessedRef = useRef<MediaStream | null>(null)
  useEffect(() => {
    if (processedStream === prevProcessedRef.current) return
    prevProcessedRef.current = processedStream
    const track = processedStream
      ? processedStream.getVideoTracks()[0] ?? null
      : localStream?.getVideoTracks()[0] ?? null
    replaceVideoTrack(track)
  }, [processedStream, localStream])

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const activeSpeakerId = useActiveSpeaker(remoteStreams)

  const [copied, setCopied] = useState(false)
  const copyInviteLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        接続準備中...
      </div>
    )
  }

  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-base">
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-subtle shrink-0">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-muted hover:text-white transition-colors"
          >
            ← 戻る
          </button>
          <div className="text-center flex-1 min-w-0">
            <h1 className="font-semibold text-lg leading-tight truncate">
              {peekRoom?.name ?? '読み込み中...'}
            </h1>
            {peekRoom?.description && (
              <p className="text-muted text-sm mt-0.5 line-clamp-1">{peekRoom.description}</p>
            )}
          </div>
          <div className="w-[4.5rem] shrink-0" aria-hidden />
        </header>

        <div className="flex-1 flex flex-col items-center p-4 sm:p-6 max-w-2xl w-full mx-auto">
          <p className="text-muted text-sm text-center mb-4">
            カメラとマイクのプレビューを確認してから入室してください
          </p>
          <div className="w-full rounded-xl overflow-hidden shadow-lg border border-border-subtle">
            <VideoTile
              stream={displayStream}
              name={userName}
              isLocal
              isMuted={isMuted}
              isCameraOff={isCameraOff}
            />
          </div>
          <MediaControls
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
          />
          <div className="flex flex-wrap items-center justify-center gap-3 w-full mt-2">
            <VirtualBackgroundPanel config={bgConfig} onChange={handleBgConfigChange} />
            <DeviceSettingsButton onChangeDevices={changeDevices} />
            <button
              type="button"
              onClick={joinRoom}
              disabled={!localStream}
              className="bg-accent hover:bg-accent-hover text-bg-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg transition-colors"
            >
              部屋に入室
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-bg-base">
        <div>
          <h1 className="font-semibold text-lg leading-tight">
            {room?.name ?? '読み込み中...'}
          </h1>
          {room?.description && (
            <p className="text-muted text-sm mt-0.5 line-clamp-1">{room.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-accent mr-1.5" />
            {1 + participants.size}人
          </span>
          {/* View mode toggle */}
          <div className="flex gap-1">
            {([
              { mode: 'grid'      as ViewMode, Icon: IconLayoutGrid,      label: 'グリッド'       },
              { mode: 'speaker'   as ViewMode, Icon: IconLayoutSpeaker,   label: 'スピーカー'     },
              { mode: 'spotlight' as ViewMode, Icon: IconLayoutSpotlight, label: 'スポットライト' },
            ]).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className={`px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  viewMode === mode
                    ? 'bg-accent text-bg-base font-semibold'
                    : 'bg-bg-elevated hover:bg-border-subtle'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 bg-bg-elevated hover:bg-border-subtle px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            {copied ? (
              <>
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span className="text-accent">コピーしました</span>
              </>
            ) : (
              <>
                <IconLink className="w-4 h-4 shrink-0" />
                <span>招待リンク</span>
              </>
            )}
          </button>
          <DeviceSettingsButton onChangeDevices={changeDevices} />
          <LeaveButton onLeave={leaveRoom} />
        </div>
      </header>

      <VideoGrid
        localStream={displayStream}
        localName={userName}
        remoteStreams={remoteStreams}
        participants={participants}
        remoteMediaStates={remoteMediaStates}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        viewMode={viewMode}
        activeSpeakerId={activeSpeakerId}
      />
      <div className="shrink-0 flex items-center justify-center gap-3 py-2 border-t border-border-subtle bg-bg-base">
        <VirtualBackgroundPanel config={bgConfig} onChange={handleBgConfigChange} />
        <MediaControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      </div>
    </div>
  )
}
