import { nanoid } from 'nanoid'
import type { Room, Participant, RoomDTO } from '../types'

class RoomStore {
  private rooms = new Map<string, Room>()

  createRoom(name: string, description: string): Room {
    const room: Room = {
      id: nanoid(10),
      name,
      description,
      createdAt: Date.now(),
      participants: new Map(),
    }
    this.rooms.set(room.id, room)
    return room
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id)
  }

  addParticipant(roomId: string, participant: Participant): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.participants.set(participant.socketId, participant)
    return true
  }

  removeParticipant(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    room.participants.delete(socketId)
    if (room.participants.size === 0) {
      this.rooms.delete(roomId)
    }
  }

  listRooms(): RoomDTO[] {
    return Array.from(this.rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt,
      participantCount: r.participants.size,
    }))
  }

  getRoomParticipants(roomId: string): Array<{ socketId: string; name: string }> {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return Array.from(room.participants.values()).map((p) => ({
      socketId: p.socketId,
      name: p.name,
    }))
  }
}

export const roomStore = new RoomStore()
