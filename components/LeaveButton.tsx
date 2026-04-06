'use client'

import { useRouter } from 'next/navigation'

interface LeaveButtonProps {
  onLeave: () => void
}

export default function LeaveButton({ onLeave }: LeaveButtonProps) {
  const router = useRouter()

  function handleLeave() {
    onLeave()
    router.push('/')
  }

  return (
    <button
      onClick={handleLeave}
      className="bg-red-600 hover:bg-red-700 active:bg-red-800 px-4 py-2 rounded-lg font-semibold transition-colors"
    >
      退室する
    </button>
  )
}
