'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import type { RoomDTO } from '@/types'
import { IconBook } from '@/components/SimpleIcons'

export default function RoomList() {
  const socket = useSocket()
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomDTO[]>([])
  const [userName, setUserName] = useState('')
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  // Inline name prompt state (when userName is not yet set)
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('userName') ?? '' : ''
    setUserName(saved)

    socket.emit('room:list')

    const onList = ({ rooms }: { rooms: RoomDTO[] }) => setRooms(rooms)
    const onUpdated = ({ rooms }: { rooms: RoomDTO[] }) => setRooms(rooms)

    socket.on('room:list', onList)
    socket.on('room:updated', onUpdated)

    return () => {
      socket.off('room:list', onList)
      socket.off('room:updated', onUpdated)
    }
  }, [])

  // Focus input when inline prompt appears
  useEffect(() => {
    if (pendingRoomId) nameInputRef.current?.focus()
  }, [pendingRoomId])

  function handleJoin(roomId: string) {
    if (!userName.trim()) {
      setPendingRoomId(roomId)
      setNameInput('')
      return
    }
    setJoiningRoomId(roomId)
    router.push(`/room/${roomId}`)
  }

  function confirmName() {
    const trimmed = nameInput.trim()
    if (!trimmed || !pendingRoomId) return
    localStorage.setItem('userName', trimmed)
    setUserName(trimmed)
    setJoiningRoomId(pendingRoomId)
    setPendingRoomId(null)
    router.push(`/room/${pendingRoomId}`)
  }

  if (rooms.length === 0) {
    return (
      <div className="mt-10 text-center text-muted">
        <p className="mb-3 inline-flex text-muted">
          <IconBook className="w-12 h-12" />
        </p>
        <p>現在アクティブな部屋はありません。</p>
        <p className="text-sm mt-1">最初の部屋を作ってみましょう！</p>
      </div>
    )
  }

  return (
    <>
      {/* Inline name prompt modal */}
      {pendingRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card border border-border-muted rounded-2xl p-6 w-80 shadow-xl">
            <p className="font-semibold mb-1">表示名を入力してください</p>
            <p className="text-muted text-sm mb-4">部屋に参加する前に名前が必要です</p>
            <input
              ref={nameInputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmName()}
              placeholder="あなたの名前"
              maxLength={30}
              className="w-full px-3 py-2 rounded-lg bg-bg-input border border-border-subtle text-white placeholder-muted focus:outline-none focus:border-accent mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingRoomId(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-bg-elevated hover:bg-border-subtle text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmName}
                disabled={!nameInput.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-bg-base font-semibold text-sm disabled:opacity-40 transition-colors"
              >
                参加する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-bg-card border border-border-subtle rounded-xl p-4 flex flex-col gap-3 hover:border-border-muted transition-colors"
          >
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight">{room.name}</h3>
              {room.description && (
                <p className="text-muted text-sm mt-1 line-clamp-2">{room.description}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                <span className="inline-block w-2 h-2 rounded-full bg-accent mr-1.5" />
                {room.participantCount}人
              </span>
              <button
                onClick={() => handleJoin(room.id)}
                disabled={joiningRoomId === room.id}
                className="bg-accent hover:bg-accent-hover text-bg-base font-semibold disabled:opacity-40 px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                {joiningRoomId === room.id ? '参加中...' : '参加する'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
