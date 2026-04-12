'use client'

import { useEffect, useRef, useState } from 'react'
import type SimplePeerType from 'simple-peer'
import { useSocket } from './useSocket'
import type { ParticipantDTO, SignalPayload } from '@/types'

export function useWebRTC(roomId: string, userName: string) {
  const socket = useSocket()
  const localStreamRef = useRef<MediaStream | null>(null)
  const virtualVideoTrackRef = useRef<MediaStreamTrack | null>(null)
  const peersRef = useRef<Map<string, SimplePeerType.Instance>>(new Map())
  // SimplePeer constructor ref — loaded async, used inside sync socket handlers
  const SimplePeerRef = useRef<typeof SimplePeerType | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [participants, setParticipants] = useState<Map<string, ParticipantDTO>>(new Map())
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const isMutedRef = useRef(false)
  const isCameraOffRef = useRef(false)
  const [remoteMediaStates, setRemoteMediaStates] = useState<Map<string, { isMuted: boolean; isCameraOff: boolean }>>(new Map())
  const hasJoinedRef = useRef(false)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!userName.trim()) return

    hasJoinedRef.current = false
    setJoined(false)

    let mounted = true

    function createPeer(targetSocketId: string, initiator: boolean): SimplePeerType.Instance {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SP = SimplePeerRef.current as any
      const peer: SimplePeerType.Instance = new SP({
        initiator,
        stream: localStreamRef.current ?? undefined,
        trickle: true,
      })
      peer.on('signal', (data: SimplePeerType.SignalData) => {
        socket.emit('signal', { to: targetSocketId, from: socket.id, signal: data } as SignalPayload)
      })
      peer.on('connect', () => {
        // Connection established — if no stream has arrived yet (remote has no tracks),
        // insert an empty MediaStream so the tile stops showing "接続中..."
        setRemoteStreams((prev) => {
          if (prev.has(targetSocketId)) return prev
          return new Map(prev).set(targetSocketId, new MediaStream())
        })
        // Apply virtual background track if one is active at connection time
        if (virtualVideoTrackRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pc = (peer as any)._pc as RTCPeerConnection
          const sender = pc?.getSenders().find((s) => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(virtualVideoTrackRef.current).catch(() => {})
        }
      })
      peer.on('stream', (remoteStream: MediaStream) => {
        setRemoteStreams((prev) => new Map(prev).set(targetSocketId, remoteStream))
        socket.emit('media:state:request', { targetSocketId })
      })
      const removePeer = () => {
        peersRef.current.delete(targetSocketId)
        setRemoteStreams((prev) => { const m = new Map(prev); m.delete(targetSocketId); return m })
      }
      peer.on('close', removePeer)
      peer.on('error', removePeer)
      return peer
    }

    // ── Register ALL listeners synchronously before any async work ──────────
    // This prevents race conditions where events arrive before listeners are set up.

    socket.on('room:joined', ({ participants: existing }: { participants: ParticipantDTO[] }) => {
      const others = existing.filter((p) => p.socketId !== socket.id)
      setParticipants(new Map(others.map((p) => [p.socketId, p])))
      others.forEach((p) => {
        if (peersRef.current.has(p.socketId)) return
        const peer = createPeer(p.socketId, true)
        peersRef.current.set(p.socketId, peer)
      })
      // Tell existing participants our current mute/camera state
      socket.emit('media:state', { roomId, isMuted: isMutedRef.current, isCameraOff: isCameraOffRef.current })
    })

    socket.on('participant:joined', ({ participant }: { participant: ParticipantDTO }) => {
      if (participant.socketId === socket.id) return
      setParticipants((prev) => new Map(prev).set(participant.socketId, participant))
      if (!peersRef.current.has(participant.socketId)) {
        const peer = createPeer(participant.socketId, false)
        peersRef.current.set(participant.socketId, peer)
      }
      // Tell the new participant our current state
      socket.emit('media:state', { roomId, isMuted: isMutedRef.current, isCameraOff: isCameraOffRef.current })
    })

    socket.on('participant:left', ({ socketId }: { socketId: string }) => {
      const peer = peersRef.current.get(socketId)
      if (peer) { peer.destroy(); peersRef.current.delete(socketId) }
      setRemoteStreams((prev) => { const m = new Map(prev); m.delete(socketId); return m })
      setParticipants((prev) => { const m = new Map(prev); m.delete(socketId); return m })
      setRemoteMediaStates((prev) => { const m = new Map(prev); m.delete(socketId); return m })
    })

    socket.on('media:state', ({ socketId, isMuted: muted, isCameraOff: camOff }: { socketId: string; isMuted: boolean; isCameraOff: boolean }) => {
      setRemoteMediaStates((prev) => new Map(prev).set(socketId, { isMuted: muted, isCameraOff: camOff }))
    })

    socket.on('media:state:request', ({ from }: { from: string }) => {
      socket.emit('media:state:response', { to: from, isMuted: isMutedRef.current, isCameraOff: isCameraOffRef.current })
    })

    socket.on('signal', (payload: SignalPayload) => {
      let peer = peersRef.current.get(payload.from as string)
      if (!peer) {
        peer = createPeer(payload.from as string, false)
        peersRef.current.set(payload.from as string, peer)
      }
      try { peer.signal(payload.signal as SimplePeerType.SignalData) } catch { /* stale */ }
    })

    // ── Async init: load SimplePeer, get media, then join ───────────────────
    async function init() {
      SimplePeerRef.current = (await import('simple-peer')).default as unknown as typeof SimplePeerType

      const savedAudio = localStorage.getItem('audioDeviceId')
      const savedVideo = localStorage.getItem('videoDeviceId')
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: savedAudio ? { deviceId: { ideal: savedAudio } } : true,
          video: savedVideo ? { deviceId: { ideal: savedVideo } } : true,
        })
      } catch {
        stream = new MediaStream()
      }
      if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return }

      const defaultMuted = localStorage.getItem('defaultMuted') === 'true'
      const defaultCameraOff = localStorage.getItem('defaultCameraOff') === 'true'
      stream.getAudioTracks().forEach((t) => { t.enabled = !defaultMuted })
      stream.getVideoTracks().forEach((t) => { t.enabled = !defaultCameraOff })
      isMutedRef.current = defaultMuted
      isCameraOffRef.current = defaultCameraOff
      setIsMuted(defaultMuted)
      setIsCameraOff(defaultCameraOff)

      localStreamRef.current = stream
      setLocalStream(stream)
    }

    init()

    return () => {
      mounted = false
      socket.off('room:joined')
      socket.off('participant:joined')
      socket.off('participant:left')
      socket.off('signal')
      socket.off('media:state')
      socket.off('media:state:request')
      if (!hasJoinedRef.current) {
        localStreamRef.current?.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }
    }
  }, [roomId, userName])

  function joinRoom() {
    if (hasJoinedRef.current || !userName.trim() || !localStreamRef.current) return
    hasJoinedRef.current = true
    setJoined(true)
    socket.emit('room:join', { roomId, userName })
  }

  function toggleMute() {
    const next = !isMuted
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next })
    isMutedRef.current = next
    setIsMuted(next)
    socket.emit('media:state', { roomId, isMuted: next, isCameraOff: isCameraOffRef.current })
  }

  function toggleCamera() {
    const next = !isCameraOff
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next })
    isCameraOffRef.current = next
    setIsCameraOff(next)
    socket.emit('media:state', { roomId, isMuted: isMutedRef.current, isCameraOff: next })
  }

  async function changeDevices(audioDeviceId?: string, videoDeviceId?: string) {
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
    })
    peersRef.current.forEach((peer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pc = (peer as any)._pc as RTCPeerConnection
      if (!pc) return
      const senders = pc.getSenders()
      newStream.getTracks().forEach((newTrack) => {
        const sender = senders.find((s) => s.track?.kind === newTrack.kind)
        if (sender) sender.replaceTrack(newTrack)
      })
    })
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = newStream
    setLocalStream(newStream)
  }

  function replaceVideoTrack(newTrack: MediaStreamTrack | null) {
    // Store so newly connecting peers also get the virtual track applied on connect
    virtualVideoTrackRef.current = newTrack
    const fallback = localStreamRef.current?.getVideoTracks()[0] ?? null
    const trackToSend = newTrack ?? fallback
    peersRef.current.forEach((peer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pc = (peer as any)._pc as RTCPeerConnection
      if (!pc) return
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
      if (sender) sender.replaceTrack(trackToSend).catch(() => {})
    })
  }

  function leaveRoom() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    peersRef.current.forEach((p) => p.destroy())
    peersRef.current.clear()
    socket.emit('room:leave', { roomId })
  }

  return {
    localStream,
    remoteStreams,
    participants,
    remoteMediaStates,
    leaveRoom,
    changeDevices,
    replaceVideoTrack,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    joinRoom,
    joined,
  }
}
