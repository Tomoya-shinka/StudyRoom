'use client'

import { useEffect, useRef, useState } from 'react'
import VideoTile from './VideoTile'
import type { ParticipantDTO } from '@/types'

export type ViewMode = 'grid' | 'speaker' | 'spotlight'

interface VideoGridProps {
  localStream: MediaStream | null
  localName: string
  localScreenStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  remoteScreenStreams: Map<string, MediaStream>
  participants: Map<string, ParticipantDTO>
  remoteMediaStates: Map<string, { isMuted: boolean; isCameraOff: boolean; isScreenSharing: boolean }>
  isMuted?: boolean
  isCameraOff?: boolean
  isScreenSharing?: boolean
  viewMode: ViewMode
  activeSpeakerId: string | null
}

const GAP = 12
const RATIO = 16 / 9

function computeTileSize(containerW: number, containerH: number, n: number): { cols: number; tileW: number; tileH: number } {
  let bestCols = 1, bestW = 0, bestH = 0
  for (let cols = 1; cols <= Math.min(n, 4); cols++) {
    const rows = Math.ceil(n / cols)
    const cellW = (containerW - (cols - 1) * GAP) / cols
    const cellH = (containerH - (rows - 1) * GAP) / rows
    // Fit 16:9 tile inside cell
    let tileW = cellW
    let tileH = tileW / RATIO
    if (tileH > cellH) { tileH = cellH; tileW = tileH * RATIO }
    if (tileW * tileH > bestW * bestH) { bestW = tileW; bestH = tileH; bestCols = cols }
  }
  return { cols: bestCols, tileW: Math.floor(bestW), tileH: Math.floor(bestH) }
}

export default function VideoGrid({
  localStream, localName, localScreenStream, remoteStreams, remoteScreenStreams,
  participants, remoteMediaStates, isMuted, isCameraOff, isScreenSharing, viewMode, activeSpeakerId,
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
              isScreenSharing={mainId ? remoteMediaStates.get(mainId)?.isScreenSharing : undefined}
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
            isScreenSharing={isScreenSharing}
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
            <VideoTile stream={localStream} name={localName} isLocal fill compact isMuted={isMuted} isCameraOff={isCameraOff} isScreenSharing={isScreenSharing} />
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
                isScreenSharing={remoteMediaStates.get(id)?.isScreenSharing}
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
              isScreenSharing={mainId ? remoteMediaStates.get(mainId)?.isScreenSharing : undefined}
            />
          </div>
          </div>
        </div>

      </div>
    )
  }

  // ── GRID MODE (default / fallback) ──────────────────────────────────────────
  return <GridLayout
    localStream={localStream}
    localName={localName}
    localScreenStream={localScreenStream}
    remoteStreams={remoteStreams}
    remoteScreenStreams={remoteScreenStreams}
    participants={participants}
    participantList={participantList}
    remoteMediaStates={remoteMediaStates}
    isMuted={isMuted}
    isCameraOff={isCameraOff}
    isScreenSharing={isScreenSharing}
  />
}

interface GridLayoutProps {
  localStream: MediaStream | null
  localName: string
  localScreenStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  remoteScreenStreams: Map<string, MediaStream>
  participants: Map<string, ParticipantDTO>
  participantList: [string, ParticipantDTO][]
  remoteMediaStates: Map<string, { isMuted: boolean; isCameraOff: boolean; isScreenSharing: boolean }>
  isMuted?: boolean
  isCameraOff?: boolean
  isScreenSharing?: boolean
}

function GridLayout({ localStream, localName, localScreenStream, remoteStreams, remoteScreenStreams, participants, participantList, remoteMediaStates, isMuted, isCameraOff, isScreenSharing }: GridLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tileSize, setTileSize] = useState<{ cols: number; tileW: number; tileH: number } | null>(null)

  // Total visible tiles = camera tiles + screen share tiles
  const tileCount = 1 + participants.size
    + (localScreenStream ? 1 : 0)
    + remoteScreenStreams.size

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        setTileSize(computeTileSize(width, height, tileCount))
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [tileCount])

  const allTiles = [
    { id: 'self', stream: localStream, name: localName, isLocal: true as const, isMuted, isCameraOff, isScreenSharing: false },
    // Local screen share tile — appears right after self camera
    ...(localScreenStream ? [{ id: 'self-screen', stream: localScreenStream, name: `${localName}の画面`, isLocal: true as const, isMuted: false, isCameraOff: false, isScreenSharing: true }] : []),
    ...participantList.flatMap(([socketId, participant]) => {
      const cam = {
        id: socketId,
        stream: remoteStreams.get(socketId) ?? null,
        name: participant.name,
        isLocal: false as const,
        isMuted: remoteMediaStates.get(socketId)?.isMuted,
        isCameraOff: remoteMediaStates.get(socketId)?.isCameraOff,
        isScreenSharing: false,
      }
      const screenStream = remoteScreenStreams.get(socketId)
      const screen = screenStream ? {
        id: `${socketId}-screen`,
        stream: screenStream,
        name: `${participant.name}の画面`,
        isLocal: false as const,
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: true,
      } : null
      return screen ? [cam, screen] : [cam]
    }),
  ]

  const cols = tileSize?.cols ?? (tileCount === 1 ? 1 : tileCount <= 4 ? 2 : 3)

  return (
    <div ref={containerRef} className="flex-1 min-h-0 flex items-center justify-center p-3">
      {tileSize && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${tileSize.tileW}px)`,
            gridAutoRows: `${tileSize.tileH}px`,
            gap: `${GAP}px`,
          }}
        >
          {allTiles.map((tile) => (
            <div
              key={tile.id}
              style={{ width: tileSize.tileW, height: tileSize.tileH }}
              className="rounded-xl overflow-hidden"
            >
              <VideoTile
                stream={tile.stream}
                name={tile.name}
                isLocal={tile.isLocal}
                fill
                isMuted={tile.isMuted}
                isCameraOff={tile.isCameraOff}
                isScreenSharing={tile.isScreenSharing}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
