import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { nftQuery } from '@/lib/query'
import { toApiError } from '@/api/client'
import { useCartMutations, useFavorites } from '@/api/hooks'
import { useUser } from '@/auth/session'
import { fmtEth } from '@/lib/decimal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox } from '@/components/ErrorBox'

export function NftDetail() {
  const { id } = useParams({ from: '/nft/$id' }), nav = useNavigate()
  const q = useQuery(nftQuery(id)), user = useUser()
  const { add } = useCartMutations(), { ids, toggle } = useFavorites()
  const [edition, setEdition] = useState('standard'), [qty, setQty] = useState(1), [img, setImg] = useState(0)

  if (q.isPending) return (
    <div className="grid gap-10 lg:grid-cols-2" aria-busy="true" data-testid="detail-skeleton">
      <Skeleton className="aspect-square w-full" /><div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-14 w-full" /></div>
    </div>)
  if (q.isError) {
    const e = toApiError(q.error)
    return e.status === 404
      ? <div className="py-20 text-center" role="alert"><h1 className="mb-2 text-3xl font-semibold">NFT não encontrado</h1><p className="mb-6 text-muted">O item que você procura não existe ou foi removido.</p><Link to="/" className="text-primary underline">Voltar ao catálogo</Link></div>
      : <ErrorBox error={q.error} onRetry={() => q.refetch()} />
  }
  const n = q.data, ed = n.editions.find((e) => e.id === edition) ?? n.editions[0], fav = ids.includes(n.id)
  const max = Math.max(ed.available, 0), qtyOk = Math.min(qty, Math.max(max, 1))
  const addErr = add.isError ? toApiError(add.error).message : null
  const gallery = [n.image, ...n.gallery]

  return (
    <article className="grid gap-10 lg:grid-cols-2">
      <div>
        <img src={gallery[img]} alt={`${n.name}, imagem ${img + 1} de ${gallery.length}`} width={600} height={600} fetchPriority="high" className="aspect-square w-full rounded-3xl object-cover" />
        <ul className="mt-4 grid grid-cols-4 gap-3">{gallery.map((g, i) => (
          <li key={i}><button aria-label={`Ver imagem ${i + 1}`} aria-pressed={i === img} onClick={() => setImg(i)} className={`block w-full overflow-hidden rounded-xl ${i === img ? 'ring-2 ring-primary' : 'opacity-70'}`}><img src={g} alt="" width={120} height={120} className="aspect-square w-full object-cover" /></button></li>))}</ul>
      </div>
      <div className="space-y-6">
        <div><h1 className="text-4xl font-semibold">{n.name}</h1><p className="mt-1 text-muted">{n.creator} · {n.collection}</p></div>
        <p>{n.description}</p>
        <p className="font-display text-3xl" data-testid="price">{fmtEth(n.price)}</p>
        <fieldset><legend className="mb-2 font-medium">Edição</legend>
          <div className="flex flex-wrap gap-3">{n.editions.map((e) => (
            <label key={e.id} className={`cursor-pointer rounded-2xl px-4 py-2 ring-1 ${e.id === ed.id ? 'bg-primary/20 ring-2 ring-primary' : 'ring-line'} ${e.available ? '' : 'opacity-50'}`}>
              <input type="radio" name="edition" className="sr-only" checked={e.id === ed.id} onChange={() => { setEdition(e.id); setQty(1) }} />
              {e.label} · {e.available ? `${e.available} disp.` : 'Esgotado'}</label>))}</div></fieldset>
        <div className="flex items-center gap-3" role="group" aria-label="Quantidade">
          <Button variant="outline" aria-label="Diminuir" disabled={qtyOk <= 1} onClick={() => setQty(qtyOk - 1)}>−</Button>
          <output aria-live="polite" className="w-10 text-center text-xl" data-testid="qty">{qtyOk}</output>
          <Button variant="outline" aria-label="Aumentar" disabled={qtyOk >= max} onClick={() => setQty(qtyOk + 1)}>+</Button>
          {max > 0 && qtyOk >= max && <span className="text-sm text-muted">Limite da edição</span>}
        </div>
        {addErr && <p role="alert" className="text-danger">⚠ {addErr}</p>}
        <div className="flex flex-wrap gap-3">
          <Button disabled={max === 0 || add.isPending} onClick={() => add.mutate({ nftId: n.id, editionId: ed.id, quantity: qtyOk })}>{max === 0 ? 'Indisponível' : add.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}</Button>
          <Button variant="outline" disabled={max === 0 || add.isPending} onClick={() => add.mutate({ nftId: n.id, editionId: ed.id, quantity: qtyOk }, { onSuccess: () => nav({ to: '/cart' }) })}>Comprar agora</Button>
          <Button variant="ghost" aria-pressed={fav} aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            onClick={() => (user ? toggle.mutate({ id: n.id, on: !fav }) : nav({ to: '/login', search: { redirect: `/nft/${n.id}` } }))}>{fav ? '♥ Favoritado' : '♡ Favoritar'}</Button>
        </div>
      </div>
    </article>
  )
}
