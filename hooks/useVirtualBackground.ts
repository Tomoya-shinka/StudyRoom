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

    // Read actual camera resolution synchronously from the track settings
    // so the canvas has correct dimensions before any async operations
    const videoTrack = rawStream.getVideoTracks()[0]
    const trackSettings = videoTrack?.getSettings() ?? {}
    const camW = trackSettings.width || 1280
    const camH = trackSettings.height || 720

    const canvas = document.createElement('canvas')
    canvas.width = camW
    canvas.height = camH

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = camW
    tempCanvas.height = camH

    const video = document.createElement('video')
    video.srcObject = rawStream
    video.muted = true
    video.playsInline = true

    // captureStream(30) = auto-capture baseline for WebRTC encoder
    // requestFrame() is also called after each draw for extra reliability
    const canvasStream = canvas.captureStream(30)
    const canvasVideoTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & MediaStreamTrack
    rawStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t))
    let streamReady = false  // only expose stream after first real frame

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

        // Expose the stream only after the first real frame is drawn,
        // so replaceTrack() is never called on an empty (black) canvas
        if (!streamReady) {
          streamReady = true
          setProcessedStream(canvasStream)
        }
      })

      // Fallback: update canvas size if actual video dimensions differ from track settings
      video.addEventListener('loadedmetadata', () => {
        if (!mounted) return
        const vw = video.videoWidth || camW
        const vh = video.videoHeight || camH
        if (vw !== canvas.width || vh !== canvas.height) {
          canvas.width = vw
          canvas.height = vh
          tempCanvas.width = vw
          tempCanvas.height = vh
        }
      })

      await video.play()

      let segPending = false
      async function loop() {
        if (!mounted) return
        // Schedule next frame immediately — don't let segmentation block the RAF cadence
        rafRef.current = requestAnimationFrame(loop)
        if (!segPending && video.readyState >= 2) {
          segPending = true
          try { await seg.send({ image: video }) } catch { /* ignore stale frames */ }
          segPending = false
        }
      }
      loop()
    }

    init()
    // Note: setProcessedStream(canvasStream) is called inside onResults
    // after the first real frame, not here — avoids replaceTrack on black canvas

    return () => {
      mounted = false
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      video.srcObject = null
    }
  }, [rawStream, config.mode])

  return config.mode === 'none' ? null : processedStream
}
