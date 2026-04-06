'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'

export default function CreateRoomForm() {
  const socket = useSocket()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [description, setDescription] = useState('')
  const [userName, setUserName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('userName') ?? '' : ''
  )
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roomName.trim() || !userName.trim()) return
    setLoading(true)

    localStorage.setItem('userName', userName.trim())

    socket.emit('room:create', {
      name: roomName.trim(),
      description: description.trim(),
      userName: userName.trim(),
    })

    socket.once('room:created', ({ room }: { room: { id: string } }) => {
      router.push(`/room/${room.id}`)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-accent hover:bg-accent-hover text-bg-base font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        + 部屋を作る
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-5">新しい部屋を作る</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">あなたの名前 *</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="例：たろう"
              maxLength={30}
              required
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">部屋の名前 *</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="例：朝活作業部屋"
              maxLength={50}
              required
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">説明（任意）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例：今日は論文を書きます。静かに集中しましょう。"
              maxLength={200}
              rows={3}
              className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 bg-bg-elevated hover:bg-border-subtle text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !roomName.trim() || !userName.trim()}
              className="flex-1 bg-accent hover:bg-accent-hover text-bg-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed py-2.5 rounded-lg transition-colors"
            >
              {loading ? '作成中...' : '作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
