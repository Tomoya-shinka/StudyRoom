import { createServer } from 'http'
import { parse } from 'url'
import { unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import next from 'next'
import { Server } from 'socket.io'
import { roomStore } from './lib/roomStore'
import type { SignalPayload } from './types'

// Next.js 16+ writes a lock file in dev mode to prevent duplicate servers.
// Remove it on startup so stale locks from crashed processes don't block us.
const lockFile = join(process.cwd(), '.next', 'dev', 'lock')
if (existsSync(lockFile)) {
  unlinkSync(lockFile)
  console.log('> Removed stale dev lock file')
}

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT ?? '3000', 10)
const app = next({ dev, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null

    socket.on('room:list', () => {
      socket.emit('room:list', { rooms: roomStore.listRooms() })
    })

    socket.on('room:create', ({ name, description, userName }: { name: string; description: string; userName: string }) => {
      const room = roomStore.createRoom(name, description)
      roomStore.addParticipant(room.id, {
        socketId: socket.id,
        name: userName,
        joinedAt: Date.now(),
      })
      socket.join(room.id)
      currentRoomId = room.id

      socket.emit('room:created', {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          createdAt: room.createdAt,
          participantCount: 1,
        },
      })

      io.emit('room:updated', { rooms: roomStore.listRooms() })
    })

    socket.on('room:peek', ({ roomId }: { roomId: string }) => {
      const room = roomStore.getRoom(roomId)
      if (!room) {
        socket.emit('room:peek:result', { error: 'not_found' as const })
        return
      }
      socket.emit('room:peek:result', {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          createdAt: room.createdAt,
          participantCount: room.participants.size,
        },
      })
    })

    socket.on('room:join', ({ roomId, userName }: { roomId: string; userName: string }) => {
      const room = roomStore.getRoom(roomId)
      if (!room) {
        socket.emit('error', { message: '部屋が見つかりません' })
        return
      }

      const existingParticipants = roomStore.getRoomParticipants(roomId)
        .filter((p) => p.socketId !== socket.id)

      roomStore.addParticipant(roomId, {
        socketId: socket.id,
        name: userName,
        joinedAt: Date.now(),
      })
      socket.join(roomId)
      currentRoomId = roomId

      socket.emit('room:joined', {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          createdAt: room.createdAt,
          participantCount: room.participants.size,
        },
        participants: existingParticipants,
        you: { socketId: socket.id, name: userName },
      })

      socket.to(roomId).emit('participant:joined', {
        participant: { socketId: socket.id, name: userName },
      })

      io.emit('room:updated', { rooms: roomStore.listRooms() })
    })

    socket.on('room:leave', ({ roomId }: { roomId: string }) => {
      handleLeave(roomId)
    })

    socket.on('signal', (payload: SignalPayload) => {
      io.to(payload.to).emit('signal', payload)
    })

    socket.on('media:state', ({ roomId, isMuted, isCameraOff }: { roomId: string; isMuted: boolean; isCameraOff: boolean }) => {
      socket.to(roomId).emit('media:state', { socketId: socket.id, isMuted, isCameraOff })
    })

    socket.on('media:state:request', ({ targetSocketId }: { targetSocketId: string }) => {
      io.to(targetSocketId).emit('media:state:request', { from: socket.id })
    })

    socket.on('media:state:response', ({ to, isMuted, isCameraOff }: { to: string; isMuted: boolean; isCameraOff: boolean }) => {
      io.to(to).emit('media:state', { socketId: socket.id, isMuted, isCameraOff })
    })

    socket.on('disconnect', () => {
      if (currentRoomId) {
        handleLeave(currentRoomId)
      }
    })

    function handleLeave(roomId: string) {
      roomStore.removeParticipant(roomId, socket.id)
      socket.to(roomId).emit('participant:left', { socketId: socket.id })
      socket.leave(roomId)
      currentRoomId = null
      io.emit('room:updated', { rooms: roomStore.listRooms() })
    }
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
