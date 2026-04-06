// Server-side types (used in roomStore and server.ts)
export interface Participant {
  socketId: string
  name: string
  joinedAt: number
}

export interface Room {
  id: string
  name: string
  description: string
  createdAt: number
  participants: Map<string, Participant>
}

// Wire types (JSON-serializable, sent over Socket.io)
export interface RoomDTO {
  id: string
  name: string
  description: string
  createdAt: number
  participantCount: number
}

export interface ParticipantDTO {
  socketId: string
  name: string
}

export interface SignalPayload {
  to: string
  from: string
  signal: unknown
}
