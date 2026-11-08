import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { nftsQuery } from '@/lib/query'
import { NftCard, NftCardSkeleton } from '@/components/NftCard'
import { ErrorBox } from '@/components/ErrorBox'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import type { NftQuery, Sort } from '@/types'

const CATS = ['Arte', 'Música', 'Fotografia', 'Esportes', 'Colecionáveis', 'Jogos']
const sel = 'min-h-11 rounded-2xl bg-card px-4 ring-1 ring-line'

export function Home() {
  const search = useSearch({ from: '/' }) as NftQuery, nav = useNavigate({ from: '/' })
  const set = (patch: Partial<NftQuery>, replace = false) => nav({ to: '/', search: (p: NftQuery) => ({ ...p, ...patch, page: 'page' in patch ? patch.page : undefined }), replace })
  const [q, setQ] = useState(search.q ?? '')
  useEffect(() => setQ(search.q ?? ''), [search.q])
  useEffect(() => { if (q === (search.q ?? '')) return; const t = setTimeout(() => set({ q: q || undefined }, true), 350); return () => clearTimeout(t) }, [q]) // eslint-disable-line

  const list = useQuery(nftsQuery(search))
  const featured = useQuery(nftsQuery({ sort: 'popular' }))
  const page = search.page ?? 1, pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1

  return (
    <div className="space-y-12">
      <section aria-labelledby="h-hero" className="grid items-center gap-8 lg:grid-cols-2">
        <div><h1 id="h-hero" className="text-4xl font-semibold leading-tight sm:text-5xl">Descubra, colecione e venda NFTs extraordinários</h1>
          <p className="mt-4 text-muted">O maior marketplace de arte digital simulado. Explore o catálogo e compre com a carteira de sua escolha.</p></div>
        <ul className="grid grid-cols-3 gap-3" aria-label="Destaques">
          {(featured.data?.items.slice(0, 3) ?? [null, null, null]).map((n, i) => (
            <li key={n?.id ?? i}>{n ? <Link to="/nft/$id" params={{ id: n.id }} className="block"><img src={n.image} alt={n.name} width={200} height={200} className="aspect-square w-full rounded-2xl object-cover" /><span className="mt-1 block truncate text-sm">{n.name}</span></Link> : <div className="skeleton aspect-square" />}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-cat">
        <h2 id="h-cat" className="mb-6 text-3xl font-semibold">Catálogo</h2>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2"><Field label="Buscar" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, criador ou coleção" /></div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Categoria
            <select className={sel} value={search.category ?? ''} onChange={(e) => set({ category: e.target.value || undefined })}><option value="">Todas</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Ordenar
            <select className={sel} value={search.sort ?? 'recent'} onChange={(e) => set({ sort: e.target.value as Sort })}>
              <option value="recent">Recentes</option><option value="popular">Populares</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label>
          <Field label="Preço mín. (ETH)" inputMode="decimal" value={search.min ?? ''} onChange={(e) => set({ min: e.target.value.replace(/[^\d.]/g, '') || undefined }, true)} />
          <Field label="Preço máx. (ETH)" inputMode="decimal" value={search.max ?? ''} onChange={(e) => set({ max: e.target.value.replace(/[^\d.]/g, '') || undefined }, true)} />
        </form>

        {list.isError ? <ErrorBox error={list.error} onRetry={() => list.refetch()} /> : (
          <div aria-busy={list.isFetching} className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
            {list.isPending ? (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Carregando catálogo" data-testid="catalog-skeleton">{Array.from({ length: 12 }, (_, i) => <li key={i}><NftCardSkeleton /></li>)}</ul>
            ) : list.data.items.length === 0 ? (
              <div className="rounded-3xl bg-card p-12 text-center"><p className="mb-4 text-lg">Nenhum NFT encontrado para esses filtros.</p><Button variant="outline" onClick={() => nav({ to: '/', search: {} })}>Limpar filtros</Button></div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted" role="status">{list.data.total} resultado(s)</p>
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="catalog">{list.data.items.map((n) => <li key={n.id}><NftCard nft={n} /></li>)}</ul>
                <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-4">
                  <Button variant="outline" disabled={page <= 1} onClick={() => set({ page: page - 1 > 1 ? page - 1 : undefined })}>Anterior</Button>
                  <span aria-current="page">Página {page} de {pages}</span>
                  <Button variant="outline" disabled={page >= pages} onClick={() => set({ page: page + 1 })}>Próxima</Button>
                </nav>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
