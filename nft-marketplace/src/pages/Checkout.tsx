import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/client'
import { useCart } from '@/api/hooks'
import { useUser } from '@/auth/session'
import { quoteQuery, walletsQuery } from '@/lib/query'
import { fmtEth } from '@/lib/decimal'
import { couponStore } from './Cart'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Modal } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Network } from '@/types'

const NETS: Network[] = ['ethereum', 'polygon', 'base']
type Conn = 'idle' | 'connecting' | 'connected' | 'rejected'

/** Chave de idempotência estável por conteúdo: sobrevive a refresh e reenvios após timeout. */
const idemKey = (sig: string) => {
  const cur = JSON.parse(sessionStorage.getItem('nft-idem') ?? 'null') as { sig: string; key: string } | null
  if (cur?.sig === sig) return cur.key
  const key = crypto.randomUUID(); sessionStorage.setItem('nft-idem', JSON.stringify({ sig, key })); return key
}

export function Checkout() {
  const user = useUser()!, nav = useNavigate(), qc = useQueryClient()
  const cart = useCart(), wallets = useQuery(walletsQuery(user.id))
  const [name, setName] = useState(user.name), [email, setEmail] = useState(user.email)
  const [walletId, setWalletId] = useState(''), [network, setNetwork] = useState<Network>('ethereum')
  const [conn, setConn] = useState<Conn>('idle'), [connMsg, setConnMsg] = useState('')
  const [review, setReview] = useState(false), [accepted, setAccepted] = useState<string | null>(null), [errors, setErrors] = useState<Record<string, string>>({})
  const submitting = useRef(false)
  const coupon = couponStore.get() || undefined
  const sig = (cart.data ?? []).map((i) => `${i.nftId}.${i.editionId}.${i.quantity}`).join(',')
  const quote = useQuery({ ...quoteQuery(user.id, network, coupon, sig), enabled: cart.isSuccess })
  const q = quote.data
  const wid = walletId || wallets.data?.find((w) => w.primary)?.id || ''

  const connect = useMutation({
    mutationFn: () => { setConn('connecting'); return api.connectWallet(wid) },
    onSuccess: () => { setConn('connected'); setConnMsg('Carteira conectada.') },
    onError: (e) => { setConn('rejected'); setConnMsg(toApiError(e).message) },
  })
  const place = useMutation({
    mutationFn: () => {
      const body = { walletId: wid, network, coupon, items: cart.data!, expectedFingerprint: accepted! }
      return api.createOrder(body, idemKey(JSON.stringify(body)))
    },
    onSuccess: (o) => { sessionStorage.removeItem('nft-idem'); qc.invalidateQueries({ queryKey: ['cart'] }); nav({ to: '/orders/$orderId', params: { orderId: o.id } }) },
    onError: (e) => { const x = toApiError(e); if (x.code === 'QUOTE_CHANGED' || x.code === 'UNAVAILABLE') { setAccepted(null); qc.invalidateQueries({ queryKey: ['cart-quote'] }) } },
    onSettled: () => { submitting.current = false },
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = 'Informe seu nome.'
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'E-mail inválido.'
    if (!wid) e.wallet = 'Selecione uma carteira.'
    else if (conn !== 'connected') e.wallet = 'Conecte a carteira para continuar.'
    if (!q || q.lines.length === 0 || q.lines.some((l) => l.issue)) e.cart = 'Revise o carrinho: há itens indisponíveis.'
    setErrors(e); return Object.keys(e).length === 0
  }
  const openReview = () => { if (validate()) { setAccepted(q!.fingerprint); setReview(true) } }
  const confirm = () => { if (submitting.current || !accepted) return; submitting.current = true; place.mutate() }
  const stale = !!q && !!accepted && q.fingerprint !== accepted
  const err = place.isError ? toApiError(place.error) : null

  if (cart.isSuccess && cart.data.length === 0 && !place.isPending) return <div className="py-20 text-center"><p className="mb-4">Seu carrinho está vazio.</p><Link to="/" className="text-primary underline">Explorar NFTs</Link></div>

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <form noValidate onSubmit={(e) => { e.preventDefault(); openReview() }} className="space-y-8">
        <h1 className="text-3xl font-semibold">Pagamento</h1>
        <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 text-xl font-semibold">Dados do colecionador</legend>
          <Field label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
          <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" /></fieldset>

        <fieldset className="space-y-4"><legend className="mb-3 text-xl font-semibold">Carteira e rede</legend>
          {wallets.isPending ? <Skeleton className="h-12" /> : wallets.data?.length === 0 ? <p>Nenhuma carteira. <Link to="/wallets" className="text-primary underline">Cadastre uma carteira</Link>.</p> : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">Carteira
                <select className="min-h-11 rounded-2xl bg-card px-4 ring-1 ring-line" value={wid} onChange={(e) => { setWalletId(e.target.value); setConn('idle') }}>
                  {wallets.data?.map((w) => <option key={w.id} value={w.id}>{w.label} · {w.address.slice(0, 8)}…{w.primary ? ' (principal)' : ''}</option>)}</select></label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">Rede
                <select className="min-h-11 rounded-2xl bg-card px-4 ring-1 ring-line" value={network} onChange={(e) => setNetwork(e.target.value as Network)}>{NETS.map((n) => <option key={n}>{n}</option>)}</select></label>
            </div>)}
          <div className="flex flex-wrap items-center gap-3">
            {conn !== 'connected' ? <Button type="button" variant="outline" disabled={!wid || conn === 'connecting'} onClick={() => connect.mutate()}>{conn === 'connecting' ? 'Conectando…' : 'Conectar carteira'}</Button>
              : <Button type="button" variant="ghost" onClick={() => { setConn('idle'); setConnMsg('Carteira desconectada.') }}>Desconectar</Button>}
            <p role="status" className={conn === 'rejected' ? 'text-danger' : 'text-muted'}>{conn === 'rejected' ? '⚠ ' : conn === 'connected' ? '✓ ' : ''}{connMsg}</p>
          </div>
          {errors.wallet && <p role="alert" className="text-danger">⚠ {errors.wallet}</p>}
        </fieldset>
        {errors.cart && <p role="alert" className="text-danger">⚠ {errors.cart}</p>}
        <Button type="submit" className="w-full sm:w-auto" disabled={!q}>Revisar pedido</Button>
      </form>

      <aside className="h-fit space-y-3 rounded-3xl bg-card p-6" aria-labelledby="h-os"><h2 id="h-os" className="text-xl font-semibold">Seu pedido</h2>
        {!q ? <Skeleton className="h-40" /> : <Summary q={q} />}</aside>

      <Modal open={review} onOpenChange={(o) => !place.isPending && setReview(o)} title="Revise seu pedido" description="Confira os valores antes de enviar. Nada é cobrado antes da confirmação.">
        {q && <Summary q={q} />}
        {stale && <p role="alert" className="mt-4 rounded-2xl bg-danger/20 p-3">⚠ Preços, taxas ou disponibilidade mudaram. Confira os novos valores e aceite para continuar.</p>}
        {err && !stale && <p role="alert" className="mt-4 rounded-2xl bg-danger/20 p-3">⚠ {err.message}{err.network ? ' Se tentar novamente, o mesmo pedido será recuperado (sem cobrança duplicada).' : ''}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => setReview(false)} disabled={place.isPending}>Voltar</Button>
          {stale ? <Button onClick={() => setAccepted(q!.fingerprint)}>Aceitar novos valores</Button>
            : <Button onClick={confirm} disabled={place.isPending || !accepted}>{place.isPending ? 'Enviando…' : err ? 'Tentar novamente' : 'Confirmar e pagar'}</Button>}
        </div>
      </Modal>
    </div>
  )
}

function Summary({ q }: { q: NonNullable<ReturnType<typeof useQuery<import('@/types').Quote>>['data']> }) {
  return (
    <div className="space-y-2" data-testid="checkout-summary">
      <ul className="space-y-1 text-sm">{q.lines.map((l) => <li key={l.nftId + l.editionId} className="flex justify-between gap-2"><span className="truncate">{l.quantity}× {l.name}</span><span className="font-display">{fmtEth(l.lineTotal)}</span></li>)}</ul>
      <dl className="space-y-1 border-t border-line pt-2 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-display">{fmtEth(q.subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Desconto</dt><dd className="font-display">− {fmtEth(q.discount)}</dd></div>
        <div className="flex justify-between"><dt>Taxa de rede ({q.network})</dt><dd className="font-display">{fmtEth(q.networkFee)}</dd></div>
        <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd className="font-display" data-testid="co-total">{fmtEth(q.total)}</dd></div>
      </dl>
    </div>)
}
