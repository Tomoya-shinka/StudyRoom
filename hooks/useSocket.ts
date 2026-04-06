'use client'

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function useSocket(): Socket {
  if (!socket) {
    socket = io()
  }
  return socket
}
