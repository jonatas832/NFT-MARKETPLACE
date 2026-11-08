import { delay, http, HttpResponse } from 'msw'
import type { ApiError, CartItem, Network, NftQuery, Order, Wallet } from '@/types'
import { hash, loadDb, quote, resetDb, saveDb, type Db } from './db'
import { getScenario } from './scenarios'
import { dropConnections, emit } from './realtime'
import { realtimeHandlers } from './realtime'
import { addEth, toWei } from '@/lib/decimal'

const B = '/api'
const err = (status: number, e: ApiError) => HttpResponse.json(e, { status })
let counter = 0

/** Latência/falhas por cenário. Retorna Response quando a requisição deve falhar. */
async function net(kind: 'read' | 'write' = 'read') {
  const s = getScenario()
  counter++
  if (s === 'slow') await delay(counter % 2 ? 2800 : 900) // fora de ordem de forma determinística
  else await delay(120)
  if (s === 'flaky' && counter % 3 === 0) return kind === 'read' ? HttpResponse.error() : err(503, { code: 'TRANSIENT', message: 'Falha transitória. Tente novamente.' })
  if (s === 'server-error' && kind === 'read') return err(500, { code: 'SERVER_ERROR', message: 'Erro interno do servidor.' })
  return null
}

const authUser = (db: Db, req: Request) => {
  const m = /^Bearer tok\.(\w+)\.(\d+)$/.exec(req.headers.get('authorization') ?? '')
  if (!m) return null
  if (Number(m[2]) !== db.epoch) return 'expired' as const
  return db.users.find((u) => u.id === m[1]) ?? null
}
const pub = ({ passwordHash: _p, ...u }: Db['users'][number]) => u
const cartKey = (db: Db, req: Request) => {
  const u = authUser(db, req)
  return u && u !== 'expired' ? u.id : `guest:${req.headers.get('x-guest-id') ?? 'anon'}`
}

/** Envolve uma rota privada: valida sessão e injeta o usuário. */
const priv = (fn: (a: { db: Db; user: Db['users'][number]; req: Request; params: Record<string, string | readonly string[]> }) => Promise<Response> | Response, kind: 'read' | 'write' = 'read') =>
  async ({ request, params }: { request: Request; params: Record<string, string | readonly string[]> }) => {
    const fail = await net(kind); if (fail) return fail
    const db = await loadDb(getScenario() === 'empty')
    const user = authUser(db, request)
    if (user === 'expired') return err(401, { code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Entre novamente.' })
    if (!user) return err(401, { code: 'UNAUTHENTICATED', message: 'Faça login para continuar.' })
    const res = await fn({ db, user, req: request, params })
    saveDb()
    return res
  }

const emitNft = (db: Db, id: string) => {
  const n = db.nfts.find((x) => x.id === id)!
  n.version++
  emit('nft.updated', { eventId: `evt-${db.seq++}`, resource: 'nft', id, version: n.version, price: n.price, availability: Object.fromEntries(n.editions.map((e) => [e.id, e.available])) } as never)
}

const walletSchemaErr = (b: Partial<Wallet>) => {
  const fields: Record<string, string> = {}
  if (!b.label?.trim()) fields.label = 'Informe um nome.'
  if (!/^0x[a-fA-F0-9]{40}$/.test(b.address ?? '')) fields.address = 'Endereço inválido (0x + 40 hex).'
  return Object.keys(fields).length ? err(422, { code: 'VALIDATION', message: 'Dados inválidos.', fields }) : null
}

export const handlers = [
  ...realtimeHandlers,

  // ---------- auth ----------
  http.post(`${B}/auth/register`, async ({ request }) => {
    const fail = await net('write'); if (fail) return fail
    const db = await loadDb(); const b = (await request.json()) as { name: string; email: string; password: string }
    const fields: Record<string, string> = {}
    if (!b.name?.trim()) fields.name = 'Informe seu nome.'
    if (!/^\S+@\S+\.\S+$/.test(b.email ?? '')) fields.email = 'E-mail inválido.'
    if ((b.password ?? '').length < 8) fields.password = 'Mínimo de 8 caracteres.'
    if (Object.keys(fields).length) return err(422, { code: 'VALIDATION', message: 'Dados inválidos.', fields })
    if (db.users.some((u) => u.email === b.email.toLowerCase())) return err(409, { code: 'EMAIL_TAKEN', message: 'E-mail já cadastrado.', fields: { email: 'E-mail já cadastrado.' } })
    const user = { id: `u${db.users.length + 1}`, name: b.name, email: b.email.toLowerCase(), passwordHash: await hash(b.password) }
    db.users.push(user); db.wallets[user.id] = []; saveDb()
    return HttpResponse.json({ user: pub(user), token: `tok.${user.id}.${db.epoch}` }, { status: 201 })
  }),
  http.post(`${B}/auth/login`, async ({ request }) => {
    const fail = await net('write'); if (fail) return fail
    const db = await loadDb(); const b = (await request.json()) as { email: string; password: string }
    const u = db.users.find((x) => x.email === b.email?.toLowerCase())
    if (!u || u.passwordHash !== (await hash(b.password ?? ''))) return err(401, { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' })
    return HttpResponse.json({ user: pub(u), token: `tok.${u.id}.${db.epoch}` })
  }),
  http.get(`${B}/auth/session`, priv(({ user }) => HttpResponse.json({ user: pub(user) }))),
  http.post(`${B}/auth/logout`, async () => new HttpResponse(null, { status: 204 })),

  // ---------- NFTs ----------
  http.get(`${B}/nfts`, async ({ request }) => {
    const fail = await net(); if (fail) return fail
    const db = await loadDb(getScenario() === 'empty'); const p = new URL(request.url).searchParams
    const q: NftQuery = { q: p.get('q') ?? '', category: p.get('category') ?? '', sort: (p.get('sort') as NftQuery['sort']) ?? 'recent', min: p.get('min') ?? '', max: p.get('max') ?? '', page: Number(p.get('page') ?? 1) }
    let list = db.nfts.filter((n) =>
      (!q.q || `${n.name} ${n.creator} ${n.collection}`.toLowerCase().includes(q.q.toLowerCase())) &&
      (!q.category || n.category === q.category) &&
      (!q.min || toWei(n.price) >= toWei(q.min)) && (!q.max || toWei(n.price) <= toWei(q.max)))
    const cmp = { recent: 0, 'price-asc': 1, 'price-desc': -1, popular: 2 }[q.sort ?? 'recent']
    list = [...list].sort((a, b) => cmp === 1 ? Number(toWei(a.price) - toWei(b.price)) : cmp === -1 ? Number(toWei(b.price) - toWei(a.price)) : cmp === 2 ? b.favorites - a.favorites : 0)
    const pageSize = 12, page = Math.max(1, q.page ?? 1)
    return HttpResponse.json({ items: list.slice((page - 1) * pageSize, page * pageSize), total: list.length, page, pageSize })
  }),
  http.get(`${B}/nfts/:id`, async ({ params }) => {
    const fail = await net(); if (fail) return fail
    const n = (await loadDb()).nfts.find((x) => x.id === params.id)
    return n ? HttpResponse.json(n) : err(404, { code: 'NOT_FOUND', message: 'NFT não encontrado.' })
  }),

  // ---------- favoritos ----------
  http.get(`${B}/favorites`, priv(({ db, user }) => HttpResponse.json(db.favorites[user.id] ?? []))),
  http.put(`${B}/favorites/:id`, priv(({ db, user, params }) => {
    const l = (db.favorites[user.id] ??= []); if (!l.includes(String(params.id))) l.push(String(params.id))
    return HttpResponse.json(l)
  }, 'write')),
  http.delete(`${B}/favorites/:id`, priv(({ db, user, params }) => {
    db.favorites[user.id] = (db.favorites[user.id] ?? []).filter((x) => x !== params.id)
    return HttpResponse.json(db.favorites[user.id])
  }, 'write')),

  // ---------- carrinho (visitante via X-Guest-Id; usuário via token) ----------
  http.get(`${B}/cart`, async ({ request }) => {
    const fail = await net(); if (fail) return fail
    const db = await loadDb(); return HttpResponse.json(db.carts[cartKey(db, request)] ?? [])
  }),
  http.post(`${B}/cart/items`, async ({ request }) => {
    const fail = await net('write'); if (fail) return fail
    const db = await loadDb(); const it = (await request.json()) as CartItem; const k = cartKey(db, request)
    const ed = db.nfts.find((n) => n.id === it.nftId)?.editions.find((e) => e.id === it.editionId)
    if (!ed) return err(404, { code: 'NOT_FOUND', message: 'Edição inexistente.' })
    const cart = (db.carts[k] ??= []); const cur = cart.find((c) => c.nftId === it.nftId && c.editionId === it.editionId)
    const qty = (cur?.quantity ?? 0) + it.quantity
    if (qty > ed.available) return err(409, { code: 'OUT_OF_STOCK', message: `Disponível: ${ed.available}.` })
    if (cur) cur.quantity = qty; else cart.push({ ...it })
    saveDb(); return HttpResponse.json(cart)
  }),
  http.patch(`${B}/cart/items`, async ({ request }) => {
    const fail = await net('write'); if (fail) return fail
    const db = await loadDb(); const it = (await request.json()) as CartItem; const k = cartKey(db, request)
    const cart = db.carts[k] ?? []; const cur = cart.find((c) => c.nftId === it.nftId && c.editionId === it.editionId)
    const ed = db.nfts.find((n) => n.id === it.nftId)?.editions.find((e) => e.id === it.editionId)
    if (!cur || !ed) return err(404, { code: 'NOT_FOUND', message: 'Item inexistente.' })
    if (!Number.isInteger(it.quantity) || it.quantity < 1) return err(422, { code: 'VALIDATION', message: 'Quantidade inválida.' })
    if (it.quantity > ed.available) return err(409, { code: 'OUT_OF_STOCK', message: `Disponível: ${ed.available}.` })
    cur.quantity = it.quantity; saveDb(); return HttpResponse.json(cart)
  }),
  http.delete(`${B}/cart/items/:nftId/:editionId`, async ({ request, params }) => {
    const fail = await net('write'); if (fail) return fail
    const db = await loadDb(); const k = cartKey(db, request)
    db.carts[k] = (db.carts[k] ?? []).filter((c) => !(c.nftId === params.nftId && c.editionId === params.editionId))
    saveDb(); return HttpResponse.json(db.carts[k])
  }),
  http.post(`${B}/cart/merge`, priv(async ({ db, user, req }) => {
    const { guestId } = (await req.json()) as { guestId: string }; const g = db.carts[`guest:${guestId}`] ?? []
    const mine = (db.carts[user.id] ??= [])
    for (const it of g) {
      const cur = mine.find((c) => c.nftId === it.nftId && c.editionId === it.editionId)
      const ed = db.nfts.find((n) => n.id === it.nftId)?.editions.find((e) => e.id === it.editionId)
      const q = Math.min((cur?.quantity ?? 0) + it.quantity, ed?.available ?? 0)
      if (q > 0) { if (cur) cur.quantity = q; else mine.push({ ...it, quantity: q }) }
    }
    delete db.carts[`guest:${guestId}`]; return HttpResponse.json(mine)
  }, 'write')),

  // ---------- cotação ----------
  http.post(`${B}/quote`, async ({ request }) => {
    const fail = await net(); if (fail) return fail
    const db = await loadDb(); const k = cartKey(db, request)
    const b = (await request.json()) as { network: Network; coupon?: string; items?: CartItem[] }
    return HttpResponse.json(quote(db, b.items ?? db.carts[k] ?? [], b.network ?? 'ethereum', b.coupon))
  }),

  // ---------- pedidos ----------
  http.post(`${B}/orders`, priv(async ({ db, user, req }) => {
    const key = req.headers.get('idempotency-key'); if (!key) return err(400, { code: 'IDEMPOTENCY_REQUIRED', message: 'Idempotency-Key obrigatório.' })
    const b = (await req.json()) as { walletId: string; network: Network; coupon?: string; items: CartItem[]; expectedFingerprint: string }
    const body = await hash(JSON.stringify(b)); const k = `${user.id}:${key}`
    const prev = db.idem[k]
    if (prev) {
      if (prev.hash !== body) return err(409, { code: 'IDEMPOTENCY_CONFLICT', message: 'Chave reutilizada com conteúdo diferente.' })
      return HttpResponse.json(db.orders.find((o) => o.id === prev.orderId))
    }
    if (!db.wallets[user.id]?.some((w) => w.id === b.walletId)) return err(404, { code: 'NOT_FOUND', message: 'Carteira não encontrada.' })
    const q = quote(db, b.items, b.network, b.coupon)
    if (q.lines.some((l) => l.issue)) return err(409, { code: 'UNAVAILABLE', message: 'Algum item ficou indisponível.', quote: q })
    if (q.fingerprint !== b.expectedFingerprint) return err(409, { code: 'QUOTE_CHANGED', message: 'Preços ou taxas mudaram. Revise o pedido.', quote: q })
    if (q.coupon && q.coupon.status !== 'valid') return err(422, { code: 'COUPON_INVALID', message: 'Cupom inválido ou expirado.' })

    const order: Order & { userId: string } = {
      id: `ord-${db.seq++}`, userId: user.id, status: 'pending', version: 1, createdAt: new Date().toISOString(),
      walletId: b.walletId, network: b.network, snapshot: { lines: q.lines, subtotal: q.subtotal, discount: q.discount, networkFee: q.networkFee, total: q.total, coupon: q.coupon },
    }
    db.orders.push(order)
    const lost = getScenario() === 'order-timeout'
    db.idem[k] = { hash: body, orderId: order.id }
    // reserva de estoque ao criar (evita venda dupla); devolve se recusado
    for (const l of q.lines) { db.nfts.find((n) => n.id === l.nftId)!.editions.find((e) => e.id === l.editionId)!.available -= l.quantity; emitNft(db, l.nftId) }
    const declined = getScenario() === 'payment-declined'
    setTimeout(async () => {
      const d = await loadDb(); const o = d.orders.find((x) => x.id === order.id)!
      o.version++; o.status = declined ? 'declined' : 'confirmed'
      if (declined) { o.declineReason = 'Pagamento recusado pela carteira.'; for (const l of o.snapshot.lines) { d.nfts.find((n) => n.id === l.nftId)!.editions.find((e) => e.id === l.editionId)!.available += l.quantity; emitNft(d, l.nftId) } }
      else {
        o.txHash = `0x${(await hash(o.id)).slice(0, 64)}`
        const cart = d.carts[user.id] ?? []
        for (const l of o.snapshot.lines) { const c = cart.find((x) => x.nftId === l.nftId && x.editionId === l.editionId); if (c) c.quantity -= l.quantity }
        d.carts[user.id] = cart.filter((c) => c.quantity > 0)
      }
      saveDb()
      emit('order.updated', { eventId: `evt-${d.seq++}`, resource: 'order', id: o.id, version: o.version, order: o, userId: user.id } as never)
      if (getScenario() === 'order-timeout') emit('order.updated', { eventId: `evt-dup-${o.id}`, resource: 'order', id: o.id, version: o.version, order: o, userId: user.id } as never, 2) // duplicata proposital
    }, 1800)
    if (lost) { db.idem[k].lostOnce = true; return HttpResponse.error() } // a resposta se perde, o pedido existe
    return HttpResponse.json(order, { status: 201 })
  }, 'write')),
  http.get(`${B}/orders/:id`, priv(({ db, user, params }) => {
    const o = db.orders.find((x) => x.id === params.id && x.userId === user.id)
    return o ? HttpResponse.json(o) : err(404, { code: 'NOT_FOUND', message: 'Pedido não encontrado.' })
  })),

  // ---------- perfil ----------
  http.get(`${B}/profile`, priv(({ user }) => HttpResponse.json(pub(user)))),
  http.patch(`${B}/profile`, priv(async ({ user, req }) => {
    const b = (await req.json()) as { name?: string; phone?: string; avatar?: string }
    const fields: Record<string, string> = {}
    if (b.name !== undefined && b.name.trim().length < 2) fields.name = 'Nome muito curto.'
    if (b.avatar && b.avatar.length > 400_000) fields.avatar = 'Imagem muito grande (máx. ~300 KB).'
    if (Object.keys(fields).length) return err(422, { code: 'VALIDATION', message: 'Dados inválidos.', fields })
    Object.assign(user, Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)))
    return HttpResponse.json(pub(user))
  }, 'write')),
  http.post(`${B}/profile/password`, priv(async ({ user, req }) => {
    const b = (await req.json()) as { current: string; next: string }; const fields: Record<string, string> = {}
    if (user.passwordHash !== (await hash(b.current ?? ''))) fields.current = 'Senha atual incorreta.'
    if ((b.next ?? '').length < 8) fields.next = 'Mínimo de 8 caracteres.'
    if (Object.keys(fields).length) return err(422, { code: 'VALIDATION', message: 'Dados inválidos.', fields })
    user.passwordHash = await hash(b.next); return new HttpResponse(null, { status: 204 })
  }, 'write')),

  // ---------- carteiras ----------
  http.get(`${B}/wallets`, priv(({ db, user }) => HttpResponse.json(db.wallets[user.id] ?? []))),
  http.post(`${B}/wallets`, priv(async ({ db, user, req }) => {
    const b = (await req.json()) as Partial<Wallet>; const bad = walletSchemaErr(b); if (bad) return bad
    const list = (db.wallets[user.id] ??= [])
    if (list.length >= 2) return err(409, { code: 'WALLET_LIMIT', message: 'Máximo: principal e secundária.' })
    const w: Wallet = { id: `w${db.seq++}`, label: b.label!, address: b.address!, network: b.network ?? 'ethereum', primary: list.length === 0 }
    list.push(w); return HttpResponse.json(w, { status: 201 })
  }, 'write')),
  http.patch(`${B}/wallets/:id`, priv(async ({ db, user, req, params }) => {
    const list = db.wallets[user.id] ?? []; const w = list.find((x) => x.id === params.id)
    if (!w) return err(404, { code: 'NOT_FOUND', message: 'Carteira não encontrada.' })
    const b = (await req.json()) as Partial<Wallet>; const bad = walletSchemaErr({ ...w, ...b }); if (bad) return bad
    if (b.primary) list.forEach((x) => (x.primary = x.id === w.id))
    Object.assign(w, { label: b.label ?? w.label, address: b.address ?? w.address, network: b.network ?? w.network })
    return HttpResponse.json(w)
  }, 'write')),
  http.post(`${B}/wallets/:id/connect`, priv(({ db, user, params }) => {
    const w = db.wallets[user.id]?.find((x) => x.id === params.id)
    if (!w) return err(404, { code: 'NOT_FOUND', message: 'Carteira não encontrada.' })
    // recusa determinística: rótulo contendo "recusar"
    return /recusar/i.test(w.label) ? err(403, { code: 'WALLET_REJECTED', message: 'A carteira recusou a conexão.' }) : HttpResponse.json({ connected: true, address: w.address })
  }, 'write')),

  // ---------- controles do mock (usados pelos testes E2E; passam pelo MSW) ----------
  http.post(`${B}/__mock/reset`, async ({ request }) => { await resetDb(((await request.json().catch(() => ({}))) as { empty?: boolean }).empty); return new HttpResponse(null, { status: 204 }) }),
  http.post(`${B}/__mock/expire-session`, async () => { const db = await loadDb(); db.epoch++; saveDb(); return new HttpResponse(null, { status: 204 }) }),
  http.post(`${B}/__mock/nft`, async ({ request }) => {
    const db = await loadDb(); const b = (await request.json()) as { id: string; price?: string; available?: Record<string, number>; repeat?: number; stale?: boolean }
    const n = db.nfts.find((x) => x.id === b.id); if (!n) return err(404, { code: 'NOT_FOUND', message: 'NFT' })
    if (b.price) n.price = b.price
    for (const [k, v] of Object.entries(b.available ?? {})) { const e = n.editions.find((x) => x.id === k); if (e) e.available = v }
    const ev = { eventId: `evt-${db.seq++}`, resource: 'nft', id: n.id, version: b.stale ? 0 : ++n.version, price: n.price, availability: Object.fromEntries(n.editions.map((e) => [e.id, e.available])) }
    saveDb(); emit('nft.updated', ev as never, b.repeat ?? 1); return new HttpResponse(null, { status: 204 })
  }),
  http.post(`${B}/__mock/disconnect`, () => { dropConnections(); return new HttpResponse(null, { status: 204 }) }),
]
// util exportado para debug no console
export { addEth }
