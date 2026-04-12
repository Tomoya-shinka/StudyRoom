'use client'

import VideoTile from './VideoTile'
import type { ParticipantDTO } from '@/types'

export type ViewMode = 'grid' | 'speaker' | 'spotlight'

interface VideoGridProps {
  localStream: MediaStream | null
  localName: string
  remoteStreams: Map<string, MediaStream>
  participants: Map<string, ParticipantDTO>
  remoteMediaStates: Map<string, { isMuted: boolean; isCameraOff: boolean }>
  isMuted?: boolean
  isCameraOff?: boolean
  viewMode: ViewMode
  activeSpeakerId: string | null
}

export default function VideoGrid({
  localStream, localName, remoteStreams, participants, remoteMediaStates,
  isMuted, isCameraOff, viewMode, activeSpeakerId,
}: VideoGridProps) {
  const participantList = Array.from(participants.entries())
  const hasRemote = participantList.length > 0

  // Active speaker, or first remote as fallback
  const mainId = activeSpeakerId ?? participantList[0]?.[0] ?? null

  // ── SPEAKER MODE ────────────────────────────────────────────────────────────
  if (viewMode === 'speaker' && hasRemote) {
    return (
      <div className="flex-1 min-h-0 relative overflow-hidden p-3">
        {/* Main: 16:9, as large as possible — same pattern as spotlight main tile */}
        <div className="absolute inset-3 flex items-center justify-center">
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', height: '100%', maxWidth: '100%', width: 'auto' }}>
            <VideoTile
              stream={mainId ? (remoteStreams.get(mainId) ?? null) : null}
              name={mainId ? (participants.get(mainId)?.name ?? '参加者') : '参加者'}
              fill
              isMuted={mainId ? remoteMediaStates.get(mainId)?.isMuted : undefined}
              isCameraOff={mainId ? remoteMediaStates.get(mainId)?.isCameraOff : undefined}
            />
          </div>
        </div>
        {/* Self: fixed 16:9 thumbnail in bottom-right */}
        <div className="absolute bottom-7 right-7 z-10 shadow-2xl rounded-xl overflow-hidden" style={{ width: 180, aspectRatio: '16/9' }}>
          <VideoTile
            stream={localStream}
            name={localName}
            isLocal
            fill
            compact
            isMuted={isMuted}
            isCameraOff={isCameraOff}
          />
        </div>
      </div>
    )
  }

  // ── SPOTLIGHT MODE ───────────────────────────────────────────────────────────
  if (viewMode === 'spotlight' && hasRemote) {
    // Strip: self + up to 4 non-main participants (max 5 total)
    const stripIds = participantList
      .filter(([id]) => id !== mainId)
      .slice(0, 4)
      .map(([id]) => id)

    return (
      <div className="flex-1 flex flex-col gap-3 p-3 min-h-0 overflow-hidden">

        {/* Top strip — fixed-height, 16:9 tiles, left-aligned, no stretching */}
        <div className="flex gap-2 shrink-0 items-start">
          {/* Self (always shown) */}
          <div className="shrink-0 rounded-xl overflow-hidden" style={{ height: 96, aspectRatio: '16/9' }}>
            <VideoTile stream={localStream} name={localName} isLocal fill compact isMuted={isMuted} isCameraOff={isCameraOff} />
          </div>
          {/* Other participants — max 4, left-aligned, no stretch */}
          {stripIds.map((id) => (
            <div key={id} className="shrink-0 rounded-xl overflow-hidden" style={{ height: 96, aspectRatio: '16/9' }}>
              <VideoTile
                stream={remoteStreams.get(id) ?? null}
                name={participants.get(id)?.name ?? '参加者'}
                fill
                compact
                isMuted={remoteMediaStates.get(id)?.isMuted}
                isCameraOff={remoteMediaStates.get(id)?.isCameraOff}
              />
            </div>
          ))}
        </div>

        {/* Main tile — 16:9, as large as possible within remaining space */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', height: '100%', maxWidth: '100%', width: 'auto' }}>
            <VideoTile
              stream={mainId ? (remoteStreams.get(mainId) ?? null) : null}
              name={mainId ? (participants.get(mainId)?.name ?? '参加者') : '参加者'}
              fill
              isMuted={mainId ? remoteMediaStates.get(mainId)?.isMuted : undefined}
              isCameraOff={mainId ? remoteMediaStates.get(mainId)?.isCameraOff : undefined}
            />
          </div>
          </div>
        </div>

      </div>
    )
  }

  // ── GRID MODE (default / fallback) ──────────────────────────────────────────
  const totalCount = 1 + participants.size
  const gridClass =
    totalCount === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
    totalCount === 2 ? 'grid-cols-2' :
    totalCount <= 4 ? 'grid-cols-2' :
    'grid-cols-3'

  return (
    <div className={`grid ${gridClass} gap-3 p-4 flex-1`}>
      <VideoTile stream={localStream} name={localName} isLocal isMuted={isMuted} isCameraOff={isCameraOff} />
      {participantList.map(([socketId, participant]) => (
        <VideoTile
          key={socketId}
          stream={remoteStreams.get(socketId) ?? null}
          name={participant.name}
          isMuted={remoteMediaStates.get(socketId)?.isMuted}
          isCameraOff={remoteMediaStates.get(socketId)?.isCameraOff}
        />
      ))}
    </div>
  )
}
