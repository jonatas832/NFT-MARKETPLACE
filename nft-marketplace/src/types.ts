export type Eth = string // decimal, ex.: "0.125"
export type Network = 'ethereum' | 'polygon' | 'base'

export interface Edition { id: string; label: string; available: number }
export interface Nft {
  id: string; name: string; collection: string; creator: string; category: string
  description: string; image: string; gallery: string[]; price: Eth
  editions: Edition[]; favorites: number; version: number
}
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
export interface NftQuery { q?: string; category?: string; sort?: Sort; min?: string; max?: string; page?: number }
export type Sort = 'recent' | 'price-asc' | 'price-desc' | 'popular'

export interface User { id: string; name: string; email: string; avatar?: string; phone?: string }
export interface Session { user: User; token: string }
export interface Wallet { id: string; label: string; address: string; network: Network; primary: boolean }

export interface CartItem { nftId: string; editionId: string; quantity: number }
export interface QuoteLine {
  nftId: string; editionId: string; name: string; image: string; quantity: number
  unitPrice: Eth; lineTotal: Eth; available: number; issue?: 'UNAVAILABLE' | 'NOT_FOUND'
}
export interface Quote {
  lines: QuoteLine[]; subtotal: Eth; discount: Eth; networkFee: Eth; total: Eth
  coupon?: { code: string; status: 'valid' | 'invalid' | 'expired'; percent?: number }
  network: Network; fingerprint: string
}
export type OrderStatus = 'pending' | 'confirmed' | 'declined'
export interface Order {
  id: string; status: OrderStatus; version: number; createdAt: string; txHash?: string
  declineReason?: string; walletId: string; network: Network
  snapshot: Pick<Quote, 'lines' | 'subtotal' | 'discount' | 'networkFee' | 'total' | 'coupon'>
}

export interface ApiError { code: string; message: string; fields?: Record<string, string>; quote?: Quote }

// eventos Socket.IO
export interface NftUpdatedEvent { eventId: string; resource: 'nft'; id: string; version: number; price: Eth; availability: Record<string, number> }
export interface OrderUpdatedEvent { eventId: string; resource: 'order'; id: string; version: number; order: Order; userId: string }
