'use client'

import { useEffect, useRef, useState } from 'react'
import type { VirtualBgConfig, VirtualBgMode } from '@/hooks/useVirtualBackground'

const PRESETS: { label: string; url: string }[] = [
  {
    label: 'オフィス',
    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%231a1a2e'/%3E%3Cstop offset='1' stop-color='%2316213e'/%3E%3C/linearGradient%3E%3Crect width='1280' height='720' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    label: 'ライブラリ',
    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%232d1b0e'/%3E%3Cstop offset='1' stop-color='%234a2c1a'/%3E%3C/linearGradient%3E%3Crect width='1280' height='720' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    label: 'フォレスト',
    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%230a1f0a'/%3E%3Cstop offset='1' stop-color='%231a3d1a'/%3E%3C/linearGradient%3E%3Crect width='1280' height='720' fill='url(%23g)'/%3E%3C/svg%3E",
  },
  {
    label: 'スカイ',
    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%230d1b3e'/%3E%3Cstop offset='1' stop-color='%231a3a6b'/%3E%3C/linearGradient%3E%3Crect width='1280' height='720' fill='url(%23g)'/%3E%3C/svg%3E",
  },
]

const LS_UPLOADED = 'vbg_uploaded_image'

interface Props {
  config: VirtualBgConfig
  onChange: (config: VirtualBgConfig) => void
}

export default function VirtualBackgroundPanel({ config, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load previously uploaded image from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LS_UPLOADED)
    if (saved) setUploadedImageUrl(saved)
  }, [])

  function select(mode: VirtualBgMode, imageUrl?: string) {
    onChange({ ...config, mode, imageUrl })
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      // Persist for future sessions
      try { localStorage.setItem(LS_UPLOADED, dataUrl) } catch { /* quota exceeded */ }
      setUploadedImageUrl(dataUrl)
      onChange({ mode: 'image', imageUrl: dataUrl })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const isActive = config.mode !== 'none'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="バーチャル背景"
        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
          isActive
            ? 'bg-accent text-bg-base'
            : 'bg-bg-elevated hover:bg-border-subtle text-white'
        }`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <span className="text-xs font-medium">背景</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-bg-card border border-border-muted rounded-2xl shadow-xl p-4 w-72 max-h-[80vh] overflow-y-auto">
            <p className="text-sm font-semibold mb-3">バーチャル背景</p>

            {/* None */}
            <button
              type="button"
              onClick={() => select('none')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-3 transition-colors ${
                config.mode === 'none'
                  ? 'bg-accent text-bg-base font-semibold'
                  : 'bg-bg-elevated hover:bg-border-subtle'
              }`}
            >
              オフ（元のまま）
            </button>

            {/* Blur */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => select('blur')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  config.mode === 'blur'
                    ? 'bg-accent text-bg-base font-semibold'
                    : 'bg-bg-elevated hover:bg-border-subtle'
                }`}
              >
                背景をぼかす
              </button>
              {config.mode === 'blur' && (
                <div className="mt-2 px-1 flex items-center gap-2">
                  <span className="text-xs text-muted w-12 shrink-0">強さ</span>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    value={config.blurAmount ?? 15}
                    onChange={(e) => onChange({ ...config, blurAmount: Number(e.target.value) })}
                    className="flex-1 accent-[#D6FF62]"
                  />
                </div>
              )}
            </div>

            {/* Uploaded image (most recent) */}
            {uploadedImageUrl && (
              <>
                <p className="text-xs text-muted mb-2">アップロードした画像</p>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => select('image', uploadedImageUrl)}
                    className={`relative rounded-lg overflow-hidden h-20 w-full transition-all ${
                      config.mode === 'image' && config.imageUrl === uploadedImageUrl
                        ? 'ring-2 ring-accent'
                        : 'ring-1 ring-border-subtle hover:ring-border-muted'
                    }`}
                    style={{
                      backgroundImage: `url("${uploadedImageUrl}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <span className="absolute inset-x-0 bottom-0 text-[10px] text-white text-center py-0.5 bg-black/50">
                      マイ画像
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* Preset images */}
            <p className="text-xs text-muted mb-2">プリセット背景</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => select('image', p.url)}
                  className={`relative rounded-lg overflow-hidden h-14 transition-all ${
                    config.mode === 'image' && config.imageUrl === p.url
                      ? 'ring-2 ring-accent'
                      : 'ring-1 ring-border-subtle hover:ring-border-muted'
                  }`}
                  style={{ backgroundImage: `url("${p.url}")`, backgroundSize: 'cover' }}
                >
                  <span className="absolute inset-x-0 bottom-0 text-[10px] text-white text-center py-0.5 bg-black/50">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 rounded-lg text-sm bg-bg-elevated hover:bg-border-subtle transition-colors text-center"
            >
              {uploadedImageUrl ? '別の画像をアップロード' : '画像をアップロード'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </>
      )}
    </div>
  )
}
