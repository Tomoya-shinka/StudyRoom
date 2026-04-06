'use client'

import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 8   // minimum average frequency level to count as "speaking"
const HOLD_MS  = 2500 // hold last speaker this long before clearing

export function useActiveSpeaker(remoteStreams: Map<string, MediaStream>): string | null {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamsRef   = useRef(remoteStreams)
  streamsRef.current = remoteStreams

  // Recompute only when the set of participant IDs changes
  const streamKey = Array.from(remoteStreams.keys()).sort().join(',')

  useEffect(() => {
    if (!streamKey) {
      setActiveSpeakerId(null)
      return
    }

    let audioCtx: AudioContext | null = null
    const analysers = new Map<string, AnalyserNode>()
    const buffers   = new Map<string, Uint8Array>()
    const sources: AudioNode[] = []

    try {
      audioCtx = new AudioContext()
      streamsRef.current.forEach((stream, id) => {
        if (!audioCtx) return
        try {
          const src = audioCtx.createMediaStreamSource(stream)
          const an  = audioCtx.createAnalyser()
          an.fftSize = 256
          src.connect(an)
          analysers.set(id, an)
          buffers.set(id, new Uint8Array(an.frequencyBinCount))
          sources.push(src)
        } catch { /* stream has no audio */ }
      })
    } catch { /* AudioContext unavailable */ }

    const interval = setInterval(() => {
      let maxAvg = 0
      let loudest: string | null = null

      analysers.forEach((an, id) => {
        const buf = buffers.get(id)!
        an.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        if (avg > maxAvg) { maxAvg = avg; loudest = id }
      })

      if (loudest && maxAvg > THRESHOLD) {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
        setActiveSpeakerId(loudest)
        holdTimerRef.current = setTimeout(() => {
          setActiveSpeakerId(null)
        }, HOLD_MS)
      }
    }, 300)

    return () => {
      clearInterval(interval)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      sources.forEach((s) => { try { s.disconnect() } catch { /* ignore */ } })
      audioCtx?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamKey])

  return activeSpeakerId
}
