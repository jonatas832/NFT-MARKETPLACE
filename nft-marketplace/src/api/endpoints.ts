import { http } from './client'
import type { CartItem, Network, Nft, NftQuery, Order, Page, Quote, Session, User, Wallet } from '@/types'

type S = { signal?: AbortSignal }
export const api = {
  register: (b: { name: string; email: string; password: string }) => http.post<Session>('/auth/register', b).then((r) => r.data),
  login: (b: { email: string; password: string }) => http.post<Session>('/auth/login', b).then((r) => r.data),
  session: ({ signal }: S = {}) => http.get<{ user: User }>('/auth/session', { signal }).then((r) => r.data.user),
  logout: () => http.post('/auth/logout'),

  nfts: (q: NftQuery, { signal }: S = {}) => http.get<Page<Nft>>('/nfts', { params: q, signal }).then((r) => r.data),
  nft: (id: string, { signal }: S = {}) => http.get<Nft>(`/nfts/${id}`, { signal }).then((r) => r.data),

  favorites: ({ signal }: S = {}) => http.get<string[]>('/favorites', { signal }).then((r) => r.data),
  addFavorite: (id: string) => http.put<string[]>(`/favorites/${id}`).then((r) => r.data),
  removeFavorite: (id: string) => http.delete<string[]>(`/favorites/${id}`).then((r) => r.data),

  cart: ({ signal }: S = {}) => http.get<CartItem[]>('/cart', { signal }).then((r) => r.data),
  addToCart: (i: CartItem) => http.post<CartItem[]>('/cart/items', i).then((r) => r.data),
  setQty: (i: CartItem) => http.patch<CartItem[]>('/cart/items', i).then((r) => r.data),
  removeItem: (nftId: string, editionId: string) => http.delete<CartItem[]>(`/cart/items/${nftId}/${editionId}`).then((r) => r.data),
  mergeCart: (guestId: string) => http.post<CartItem[]>('/cart/merge', { guestId }).then((r) => r.data),

  quote: (b: { network: Network; coupon?: string }, { signal }: S = {}) => http.post<Quote>('/quote', b, { signal }).then((r) => r.data),

  createOrder: (b: { walletId: string; network: Network; coupon?: string; items: CartItem[]; expectedFingerprint: string }, key: string) =>
    http.post<Order>('/orders', b, { headers: { 'Idempotency-Key': key } }).then((r) => r.data),
  order: (id: string, { signal }: S = {}) => http.get<Order>(`/orders/${id}`, { signal }).then((r) => r.data),

  profile: ({ signal }: S = {}) => http.get<User>('/profile', { signal }).then((r) => r.data),
  updateProfile: (b: Partial<Pick<User, 'name' | 'phone' | 'avatar'>>) => http.patch<User>('/profile', b).then((r) => r.data),
  changePassword: (b: { current: string; next: string }) => http.post('/profile/password', b),

  wallets: ({ signal }: S = {}) => http.get<Wallet[]>('/wallets', { signal }).then((r) => r.data),
  addWallet: (b: Partial<Wallet>) => http.post<Wallet>('/wallets', b).then((r) => r.data),
  updateWallet: (id: string, b: Partial<Wallet>) => http.patch<Wallet>(`/wallets/${id}`, b).then((r) => r.data),
  connectWallet: (id: string) => http.post<{ connected: boolean; address: string }>(`/wallets/${id}/connect`).then((r) => r.data),
}
