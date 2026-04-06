import CreateRoomForm from '@/components/CreateRoomForm'
import RoomList from '@/components/RoomList'
import DeviceSettingsButton from '@/components/DeviceSettingsButton'

export default function HomePage() {
  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-accent">StudyRoom</h1>
          <p className="text-muted mt-1">お互いを見守りながら、一緒に集中しよう。</p>
        </div>
        <DeviceSettingsButton />
      </div>

      <CreateRoomForm />
      <RoomList />
    </main>
  )
}
