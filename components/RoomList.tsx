'use client'

import { useEffect, useState } from 'react'
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

  function handleJoin(roomId: string) {
    const name = userName.trim()
    if (!name) {
      const input = prompt('参加する前に名前を入力してください')
      if (!input?.trim()) return
      localStorage.setItem('userName', input.trim())
      setUserName(input.trim())
    }
    setJoiningRoomId(roomId)
    router.push(`/room/${roomId}`)
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
  )
}
