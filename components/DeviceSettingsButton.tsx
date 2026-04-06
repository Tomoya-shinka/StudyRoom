'use client'

import { useEffect, useState } from 'react'
import { IconCheck, IconSettings } from '@/components/SimpleIcons'

interface DeviceInfo {
  deviceId: string
  label: string
}

const AUDIO_KEY = 'audioDeviceId'
const VIDEO_KEY = 'videoDeviceId'

interface DeviceSettingsButtonProps {
  onChangeDevices?: (audioDeviceId: string, videoDeviceId: string) => Promise<void>
}

export default function DeviceSettingsButton({ onChangeDevices }: DeviceSettingsButtonProps) {
  const [open, setOpen] = useState(false)
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([])
  const [selectedAudio, setSelectedAudio] = useState('')
  const [selectedVideo, setSelectedVideo] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [defaultMuted, setDefaultMuted] = useState(false)
  const [defaultCameraOff, setDefaultCameraOff] = useState(false)

  useEffect(() => {
    if (!open) return
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const audio = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `マイク ${i + 1}` }))
      const video = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `カメラ ${i + 1}` }))
      setAudioDevices(audio)
      setVideoDevices(video)
      const savedAudio = localStorage.getItem(AUDIO_KEY)
      const savedVideo = localStorage.getItem(VIDEO_KEY)
      setSelectedAudio(savedAudio && audio.some((d) => d.deviceId === savedAudio) ? savedAudio : audio[0]?.deviceId ?? '')
      setSelectedVideo(savedVideo && video.some((d) => d.deviceId === savedVideo) ? savedVideo : video[0]?.deviceId ?? '')
      setDefaultMuted(localStorage.getItem('defaultMuted') === 'true')
      setDefaultCameraOff(localStorage.getItem('defaultCameraOff') === 'true')
    })
  }, [open])

  async function handleApply() {
    setApplying(true)
    try {
      localStorage.setItem(AUDIO_KEY, selectedAudio)
      localStorage.setItem(VIDEO_KEY, selectedVideo)
      localStorage.setItem('defaultMuted', String(defaultMuted))
      localStorage.setItem('defaultCameraOff', String(defaultCameraOff))
      await onChangeDevices?.(selectedAudio, selectedVideo)
      setApplied(true)
      setTimeout(() => {
        setApplied(false)
        setOpen(false)
      }, 1000)
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="デバイス設定"
        className="bg-bg-elevated hover:bg-border-subtle px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center"
      >
        <IconSettings className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-5">デバイス設定</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">マイク</label>
                <select
                  value={selectedAudio}
                  onChange={(e) => setSelectedAudio(e.target.value)}
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
                >
                  {audioDevices.length === 0 && (
                    <option value="">デバイスが見つかりません</option>
                  )}
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">カメラ</label>
                <select
                  value={selectedVideo}
                  onChange={(e) => setSelectedVideo(e.target.value)}
                  className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
                >
                  {videoDevices.length === 0 && (
                    <option value="">デバイスが見つかりません</option>
                  )}
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 space-y-3 border-t border-border-subtle">
                <p className="text-xs text-muted pt-1">入室時のデフォルト</p>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-white/80">マイクをミュートして入室</span>
                  <button
                    type="button"
                    onClick={() => setDefaultMuted((v) => !v)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${defaultMuted ? 'bg-accent' : 'bg-bg-elevated'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${defaultMuted ? 'bg-bg-base translate-x-5' : 'bg-white/40 translate-x-1'}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-white/80">カメラをOFFにして入室</span>
                  <button
                    type="button"
                    onClick={() => setDefaultCameraOff((v) => !v)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${defaultCameraOff ? 'bg-accent' : 'bg-bg-elevated'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${defaultCameraOff ? 'bg-bg-base translate-x-5' : 'bg-white/40 translate-x-1'}`} />
                  </button>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-bg-elevated hover:bg-border-subtle py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleApply}
                disabled={applying || !selectedAudio || !selectedVideo}
                className="flex-1 bg-accent hover:bg-accent-hover text-bg-base font-semibold disabled:opacity-40 py-2.5 rounded-lg text-sm transition-colors"
              >
                {applied ? (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <IconCheck className="w-4 h-4 shrink-0" />
                    適用しました
                  </span>
                ) : applying ? (
                  '適用中...'
                ) : (
                  '適用する'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
