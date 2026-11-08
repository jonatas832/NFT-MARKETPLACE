import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'

// Transporte: WebSocket interceptado pelo MSW + protocolo Socket.IO (@mswjs/socket.io-binding).
// Limitação: apenas transporte "websocket" (sem long-polling); sem rooms/ack complexos.
export const SOCKET_URL = 'wss://mock.nft.local'
export const socketLink = ws.link(`${SOCKET_URL}/socket.io/`)

type Io = ReturnType<typeof toSocketIo>
const conns = new Map<Io, string | null>() // io -> userId autenticado no handshake

export const realtimeHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    // o token vai no handshake (auth); aqui o MSW aceita e guarda apenas o userId
    conns.set(io, null)
    io.client.on('auth', (_e, userId: string) => conns.set(io, userId))
    connection.client.addEventListener('close', () => conns.delete(io))
  }),
]

/** Emite um evento para os clientes conectados (opcionalmente só de um usuário). */
export const emit = (event: string, payload: { userId?: string }, repeat = 1) => {
  for (const [io, userId] of conns) {
    if (payload.userId && userId !== payload.userId) continue
    for (let i = 0; i < repeat; i++) io.client.emit(event, payload)
  }
}
export const dropConnections = () => { for (const io of conns.keys()) io.client.disconnect?.() }
