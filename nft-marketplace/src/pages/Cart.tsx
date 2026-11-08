import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCart, useCartMutations } from '@/api/hooks'
import { useUser } from '@/auth/session'
import { quoteQuery } from '@/lib/query'
import { toApiError } from '@/api/client'
import { fmtEth } from '@/lib/decimal'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox } from '@/components/ErrorBox'
import type { Network } from '@/types'

export const couponStore = { get: () => sessionStorage.getItem('nft-coupon') ?? '', set: (c: string) => (c ? sessionStorage.setItem('nft-coupon', c) : sessionStorage.removeItem('nft-coupon')) }

export function Cart() {
  const uid = useUser()?.id, cart = useCart(), { setQty, remove } = useCartMutations()
  const [coupon, setCoupon] = useState(couponStore.get()), [input, setInput] = useState('')
  const network: Network = 'ethereum'
  const sig = (cart.data ?? []).map((i) => `${i.nftId}.${i.editionId}.${i.quantity}`).join(',')
  const quote = useQuery({ ...quoteQuery(uid, network, coupon || undefined, sig), enabled: cart.isSuccess })

  if (cart.isError) return <ErrorBox error={cart.error} onRetry={() => cart.refetch()} />
  if (cart.isSuccess && cart.data.length === 0) return <div className="py-20 text-center"><h1 className="mb-3 text-3xl font-semibold">Seu carrinho está vazio</h1><Button asChild><Link to="/">Explorar NFTs</Link></Button></div>
  const q = quote.data
  const issues = q?.lines.filter((l) => l.issue) ?? []
  const couponErr = q?.coupon && q.coupon.status !== 'valid' ? (q.coupon.status === 'expired' ? 'Cupom expirado.' : 'Cupom inválido.') : null
  const mutErr = setQty.isError ? toApiError(setQty.error).message : null

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <section aria-labelledby="h-cart">
        <h1 id="h-cart" className="mb-6 text-3xl font-semibold">Carrinho</h1>
        {issues.length > 0 && <p role="alert" className="mb-4 rounded-2xl bg-danger/20 p-4">⚠ Alguns itens ficaram indisponíveis ou excedem o estoque. Ajuste as quantidades.</p>}
        {mutErr && <p role="alert" className="mb-4 text-danger">⚠ {mutErr}</p>}
        <ul className="space-y-4" aria-busy={quote.isFetching}>
          {!q ? Array.from({ length: 2 }, (_, i) => <li key={i}><Skeleton className="h-28 w-full" /></li>) : q.lines.map((l) => (
            <li key={l.nftId + l.editionId} className="flex flex-wrap items-center gap-4 rounded-3xl bg-card p-4" data-testid="cart-line">
              <img src={l.image} alt="" width={80} height={80} className="size-20 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{l.name}</p><p className="font-display text-sm">{fmtEth(l.unitPrice)}</p>
                {l.issue && <p className="text-sm text-danger">⚠ {l.available ? `Apenas ${l.available} disponível(is)` : 'Indisponível'}</p>}</div>
              <div className="flex items-center gap-2" role="group" aria-label={`Quantidade de ${l.name}`}>
                <Button variant="outline" className="px-3" aria-label="Diminuir" disabled={l.quantity <= 1 || setQty.isPending} onClick={() => setQty.mutate({ nftId: l.nftId, editionId: l.editionId, quantity: l.quantity - 1 })}>−</Button>
                <output className="w-8 text-center">{l.quantity}</output>
                <Button variant="outline" className="px-3" aria-label="Aumentar" disabled={l.quantity >= l.available || setQty.isPending} onClick={() => setQty.mutate({ nftId: l.nftId, editionId: l.editionId, quantity: l.quantity + 1 })}>+</Button>
              </div>
              <Button variant="danger" aria-label={`Remover ${l.name}`} onClick={() => remove.mutate({ nftId: l.nftId, editionId: l.editionId })}>Remover</Button>
            </li>))}
        </ul>
      </section>

      <aside aria-labelledby="h-sum" className="h-fit space-y-4 rounded-3xl bg-card p-6">
        <h2 id="h-sum" className="text-xl font-semibold">Resumo</h2>
        {!q ? <div className="space-y-3"><Skeleton className="h-6" /><Skeleton className="h-6" /><Skeleton className="h-6" /><Skeleton className="h-10" /></div> : (
          <dl className="space-y-2" data-testid="summary">
            <Row k="Subtotal" v={fmtEth(q.subtotal)} />
            <Row k={`Desconto${q.coupon?.status === 'valid' ? ` (${q.coupon.code})` : ''}`} v={`− ${fmtEth(q.discount)}`} />
            <Row k="Taxa de rede" v={fmtEth(q.networkFee)} />
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd data-testid="total" className="font-display">{fmtEth(q.total)}</dd></div>
          </dl>)}
        {coupon && !couponErr ? <div className="flex items-center justify-between"><span>Cupom <strong>{coupon}</strong> aplicado</span><Button variant="ghost" onClick={() => { setCoupon(''); couponStore.set('') }}>Remover</Button></div> : (
          <form onSubmit={(e) => { e.preventDefault(); const c = input.trim().toUpperCase(); setCoupon(c); couponStore.set(c); setInput('') }} className="flex items-end gap-2">
            <div className="flex-1"><Field label="Cupom" value={input} onChange={(e) => setInput(e.target.value)} error={couponErr ?? undefined} /></div><Button variant="outline" type="submit">Aplicar</Button></form>)}
        <Button asChild className="w-full" aria-disabled={!q || issues.length > 0}><Link to="/checkout" disabled={!q || issues.length > 0}>Ir para o pagamento</Link></Button>
      </aside>
    </div>
  )
}
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="font-display">{v}</dd></div>
