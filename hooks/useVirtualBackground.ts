'use client'

import { useEffect, useRef, useState } from 'react'

export type VirtualBgMode = 'none' | 'blur' | 'image'

export interface VirtualBgConfig {
  mode: VirtualBgMode
  blurAmount?: number  // default 15
  imageUrl?: string    // for 'image' mode
}

declare global {
  interface Window {
    SelfieSegmentation: new (opts: { locateFile: (f: string) => string }) => {
      setOptions: (opts: object) => void
      onResults: (cb: (r: SegmentationResult) => void) => void
      send: (inputs: { image: HTMLVideoElement }) => Promise<void>
      close?: () => void
    }
  }
}

interface SegmentationResult {
  segmentationMask: HTMLCanvasElement
  image: HTMLCanvasElement
}

async function loadMediaPipe() {
  if (typeof window === 'undefined') throw new Error('server-side')
  if (window.SelfieSegmentation) return window.SelfieSegmentation
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src =
      'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js'
    s.crossOrigin = 'anonymous'
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
  return window.SelfieSegmentation
}

export function useVirtualBackground(
  rawStream: MediaStream | null,
  config: VirtualBgConfig,
): MediaStream | null {
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null)
  const configRef = useRef(config)
  configRef.current = config
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number | null>(null)

  // Preload background image whenever imageUrl changes
  useEffect(() => {
    if (config.mode !== 'image' || !config.imageUrl) {
      bgImageRef.current = null
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = config.imageUrl
    img.onload = () => { bgImageRef.current = img }
  }, [config.imageUrl, config.mode])

  useEffect(() => {
    if (config.mode === 'none' || !rawStream) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      setProcessedStream(null)
      return
    }

    let mounted = true

    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height

    const video = document.createElement('video')
    video.srcObject = rawStream
    video.muted = true
    video.playsInline = true

    // captureStream(0) = manual frame capture via requestFrame()
    // This is required for replaceTrack() to deliver frames reliably via WebRTC.
    // captureStream(N>0) only works for local display; WebRTC encoders don't poll it.
    const canvasStream = canvas.captureStream(0)
    const canvasVideoTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & MediaStreamTrack
    rawStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t))

    async function init() {
      let SelfieSegmentation: typeof window.SelfieSegmentation
      try {
        SelfieSegmentation = await loadMediaPipe()
      } catch {
        // MediaPipe failed to load — fall back to no effect
        setProcessedStream(null)
        return
      }
      if (!mounted) return

      const seg = new SelfieSegmentation({
        locateFile: (f) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${f}`,
      })
      seg.setOptions({ modelSelection: 1, selfieMode: false })

      seg.onResults((results) => {
        if (!mounted) return
        const w = canvas.width
        const h = canvas.height
        const ctx = canvas.getContext('2d')!
        const cfg = configRef.current

        // 1. Draw background layer
        if (cfg.mode === 'blur') {
          ctx.filter = `blur(${cfg.blurAmount ?? 15}px)`
          ctx.drawImage(results.image, -20, -20, w + 40, h + 40) // overdraw to hide blur edges
          ctx.filter = 'none'
        } else if (cfg.mode === 'image' && bgImageRef.current) {
          const img = bgImageRef.current
          const imgAr = img.naturalWidth / img.naturalHeight
          const canAr = w / h
          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
          if (imgAr > canAr) {
            sw = img.naturalHeight * canAr
            sx = (img.naturalWidth - sw) / 2
          } else {
            sh = img.naturalWidth / canAr
            sy = (img.naturalHeight - sh) / 2
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
        } else {
          ctx.drawImage(results.image, 0, 0, w, h)
        }

        // 2. Person cutout on temp canvas
        const tCtx = tempCanvas.getContext('2d')!
        tCtx.clearRect(0, 0, w, h)
        tCtx.drawImage(results.image, 0, 0, w, h)
        tCtx.globalCompositeOperation = 'destination-in'
        tCtx.drawImage(results.segmentationMask, 0, 0, w, h)
        tCtx.globalCompositeOperation = 'source-over'

        // 3. Composite person on top of background
        ctx.drawImage(tempCanvas, 0, 0)

        // Notify WebRTC encoder that a new frame is ready
        canvasVideoTrack.requestFrame()
      })

      video.addEventListener('loadedmetadata', () => {
        if (!mounted) return
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
      })

      await video.play()

      async function loop() {
        if (!mounted) return
        if (video.readyState >= 2) {
          try { await seg.send({ image: video }) } catch { /* ignore stale frames */ }
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      loop()
    }

    init()
    setProcessedStream(canvasStream)

    return () => {
      mounted = false
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      video.srcObject = null
    }
  }, [rawStream, config.mode])

  return config.mode === 'none' ? null : processedStream
}
