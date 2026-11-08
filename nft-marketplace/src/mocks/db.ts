import type { CartItem, Network, Nft, Order, Quote, QuoteLine, User, Wallet } from '@/types'
import { addEth, fromWei, mulInt, pctBps, subEth, toWei } from '@/lib/decimal'

export interface UserRec extends User { passwordHash: string }
export interface Db {
  epoch: number; seq: number
  users: UserRec[]; nfts: Nft[]
  favorites: Record<string, string[]>; carts: Record<string, CartItem[]>
  wallets: Record<string, Wallet[]>; orders: (Order & { userId: string })[]
  idem: Record<string, { hash: string; orderId: string; lostOnce?: boolean }>
}

export const hash = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nft:' + s)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('')

const CATS = ['Arte', 'Música', 'Fotografia', 'Esportes', 'Colecionáveis', 'Jogos']
const CREATORS = ['Animakid', 'Shroomie', 'DigiLab', 'Mr Fox', 'Keepitreal', 'BeKind2Robots']
const COLORS = ['#A259FF', '#3B82F6', '#EC4899', '#F59E0B', '#10B981', '#EF4444']

/** Imagem sintética (SVG data-URI): substitui os assets do Figma, sem rede e com proporção fixa. */
export const art = (seed: number, variant = 0) => {
  const a = COLORS[(seed + variant) % 6], b = COLORS[(seed * 3 + variant + 2) % 6]
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='400' height='400' fill='url(#g)'/><circle cx='${120 + ((seed * 47) % 160)}' cy='${140 + ((seed * 31) % 120)}' r='${60 + (seed % 5) * 14}' fill='white' fill-opacity='.22'/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const seedNfts = (empty: boolean): Nft[] =>
  empty ? [] : Array.from({ length: 48 }, (_, i) => ({
    id: `nft-${i + 1}`, name: `Space Walker #${String(i + 1).padStart(3, '0')}`,
    collection: `Coleção ${CATS[i % 6]}`, creator: CREATORS[i % 6], category: CATS[i % 6],
    description: 'Peça digital única, com procedência verificada na rede simulada.',
    image: art(i), gallery: [art(i, 1), art(i, 2), art(i, 3)],
    price: fromWei(toWei('0.05') + BigInt((i * 37) % 200) * 10n ** 16n),
    editions: [
      { id: 'standard', label: 'Standard', available: 5 + (i % 7) },
      { id: 'rare', label: 'Rare', available: i % 4 === 0 ? 0 : 2 },
      { id: 'legendary', label: 'Legendary', available: 1 },
    ],
    favorites: 10 + ((i * 13) % 90), version: 1,
  }))

export const seed = async (empty = false): Promise<Db> => ({
  epoch: 1, seq: 1, nfts: seedNfts(empty), favorites: {}, carts: {}, orders: [], idem: {},
  users: [
    { id: 'u1', name: 'Ana Colecionadora', email: 'ana@nft.dev', passwordHash: await hash('Senha@123') },
    { id: 'u2', name: 'Bruno Colecionador', email: 'bruno@nft.dev', passwordHash: await hash('Senha@456') },
  ],
  wallets: {
    u1: [{ id: 'w1', label: 'Principal', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', network: 'ethereum', primary: true }],
    u2: [{ id: 'w2', label: 'Principal', address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', network: 'polygon', primary: true }],
  },
})

const KEY = 'nft-mock-db-v1'
let mem: Db | null = null
export const loadDb = async (empty = false): Promise<Db> => {
  if (mem) return mem
  const raw = localStorage.getItem(KEY)
  mem = raw ? (JSON.parse(raw) as Db) : await seed(empty)
  return mem
}
export const saveDb = () => { if (mem) localStorage.setItem(KEY, JSON.stringify(mem)) }
export const resetDb = async (empty = false) => { mem = await seed(empty); saveDb(); return mem }

export const FEES: Record<Network, string> = { ethereum: '0.0021', polygon: '0.0003', base: '0.0005' }
const COUPONS: Record<string, { percent: number; expired?: boolean }> = {
  WELCOME10: { percent: 10 }, NFT25: { percent: 25 }, OLD20: { percent: 20, expired: true },
}

export const quote = (db: Db, items: CartItem[], network: Network, code?: string): Quote => {
  const lines: QuoteLine[] = items.map((it) => {
    const nft = db.nfts.find((n) => n.id === it.nftId)
    const ed = nft?.editions.find((e) => e.id === it.editionId)
    if (!nft || !ed)
      return { nftId: it.nftId, editionId: it.editionId, name: '—', image: '', quantity: it.quantity, unitPrice: '0', lineTotal: '0', available: 0, issue: 'NOT_FOUND' as const }
    return {
      nftId: nft.id, editionId: ed.id, name: `${nft.name} · ${ed.label}`, image: nft.image, quantity: it.quantity,
      unitPrice: nft.price, lineTotal: mulInt(nft.price, it.quantity), available: ed.available,
      issue: it.quantity > ed.available ? ('UNAVAILABLE' as const) : undefined,
    }
  })
  const subtotal = lines.reduce((s, l) => addEth(s, l.lineTotal), '0')
  const c = code ? COUPONS[code.toUpperCase()] : undefined
  const coupon: Quote['coupon'] = code
    ? { code: code.toUpperCase(), status: !c ? 'invalid' : c.expired ? 'expired' : 'valid', percent: c?.percent }
    : undefined
  const discount = coupon?.status === 'valid' ? pctBps(subtotal, (coupon.percent ?? 0) * 100) : '0'
  const networkFee = lines.length ? FEES[network] : '0'
  const total = addEth(subEth(subtotal, discount), networkFee)
  const fingerprint = `${lines.map((l) => `${l.nftId}:${l.editionId}:${l.quantity}:${l.unitPrice}:${l.available}`).join('|')}#${discount}#${networkFee}#${total}`
  return { lines, subtotal, discount, networkFee, total, coupon, network, fingerprint }
}
