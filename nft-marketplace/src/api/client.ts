import axios, { AxiosError } from 'axios'
import type { ApiError } from '@/types'

const T = 'nft-token', G = 'nft-guest'
export const tokenStore = {
  get: () => localStorage.getItem(T),
  set: (t: string) => localStorage.setItem(T, t),
  clear: () => localStorage.removeItem(T),
}
export const guestId = () => {
  let g = localStorage.getItem(G)
  if (!g) { g = crypto.randomUUID(); localStorage.setItem(G, g) }
  return g
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api', timeout: 8000 })
http.interceptors.request.use((cfg) => {
  const t = tokenStore.get()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  cfg.headers['X-Guest-Id'] = guestId()
  return cfg
})
http.interceptors.response.use(undefined, (e: AxiosError<ApiError>) => {
  const code = e.response?.data?.code
  if (e.response?.status === 401 && tokenStore.get() && (code === 'SESSION_EXPIRED' || code === 'UNAUTHENTICATED')) onUnauthorized?.()
  return Promise.reject(e)
})

/** Normaliza qualquer falha em ApiError tipado. */
export const toApiError = (e: unknown): ApiError & { status?: number; network?: boolean } => {
  if (axios.isAxiosError<ApiError>(e)) {
    if (e.response?.data?.code) return { ...e.response.data, status: e.response.status }
    return { code: e.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK', message: 'Sem conexão com o servidor. Tente novamente.', network: true }
  }
  return { code: 'UNKNOWN', message: 'Erro inesperado.' }
}
