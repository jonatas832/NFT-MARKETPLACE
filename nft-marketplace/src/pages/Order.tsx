import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useUser } from '@/auth/session'
import { orderQuery } from '@/lib/query'
import { fmtEth } from '@/lib/decimal'
import { ErrorBox } from '@/components/ErrorBox'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toApiError } from '@/api/client'

export function OrderPage() {
  const { orderId } = useParams({ from: '/orders/$orderId' }), uid = useUser()!.id
  // refetch periódico só como rede de segurança; o caminho normal é o evento order.updated
  const q = useQuery({ ...orderQuery(uid, orderId), refetchInterval: (s) => (s.state.data?.status === 'pending' ? 4000 : false) })
  if (q.isPending) return <Skeleton className="h-96 w-full" />
  if (q.isError) return toApiError(q.error).status === 404 ? <p role="alert" className="py-20 text-center">Pedido não encontrado.</p> : <ErrorBox error={q.error} onRetry={() => q.refetch()} />
  const o = q.data, s = o.snapshot

  if (o.status === 'pending') return (
    <div className="py-20 text-center" role="status" data-testid="order-pending"><div className="mx-auto mb-6 size-12 animate-spin rounded-full border-4 border-primary border-t-transparent motion-reduce:animate-none" />
      <h1 className="text-2xl font-semibold">Aguardando confirmação…</h1><p className="mt-2 text-muted">Pedido {o.id}. Você pode recarregar a página: seu pedido será recuperado.</p></div>)
  if (o.status === 'declined') return (
    <div className="py-20 text-center" role="alert" data-testid="order-declined"><h1 className="mb-2 text-3xl font-semibold text-danger">Pagamento recusado</h1><p className="mb-6">{o.declineReason}</p><p className="mb-6 text-muted">Seus itens continuam no carrinho.</p><Button asChild><Link to="/cart">Voltar ao carrinho</Link></Button></div>)

  return (
    <article className="mx-auto max-w-2xl space-y-6" data-testid="receipt">
      <h1 className="text-3xl font-semibold text-ok">✓ Pedido confirmado</h1>
      <dl className="grid gap-2 rounded-3xl bg-card p-6 text-sm">
        <div className="flex justify-between gap-4"><dt>Pedido</dt><dd>{o.id}</dd></div>
        <div className="flex justify-between gap-4"><dt>Transação (simulada)</dt><dd className="break-all font-display text-xs" data-testid="tx">{o.txHash}</dd></div>
        <div className="flex justify-between"><dt>Rede</dt><dd>{o.network}</dd></div>
        <div className="flex justify-between"><dt>Data</dt><dd>{new Date(o.createdAt).toLocaleString('pt-BR')}</dd></div></dl>
      <ul className="space-y-3">{s.lines.map((l) => <li key={l.nftId + l.editionId} className="flex items-center gap-4 rounded-2xl bg-card p-3"><img src={l.image} alt="" width={56} height={56} className="size-14 rounded-xl" /><span className="flex-1">{l.quantity}× {l.name}</span><span className="font-display">{fmtEth(l.lineTotal)}</span></li>)}</ul>
      <dl className="space-y-1 text-right"><div>Subtotal {fmtEth(s.subtotal)}</div><div>Desconto − {fmtEth(s.discount)}</div><div>Taxa de rede {fmtEth(s.networkFee)}</div><div className="text-xl font-semibold" data-testid="receipt-total">Total {fmtEth(s.total)}</div></dl>
      <Button asChild><Link to="/">Continuar explorando</Link></Button>
    </article>)
}
