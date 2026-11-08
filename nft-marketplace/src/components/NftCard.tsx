import { Link } from '@tanstack/react-router'
import type { Nft } from '@/types'
import { fmtEth } from '@/lib/decimal'
import { Skeleton } from './ui/skeleton'

export function NftCard({ nft }: { nft: Nft }) {
  const stock = nft.editions.reduce((s, e) => s + e.available, 0)
  return (
    <Link to="/nft/$id" params={{ id: nft.id }} className="group block overflow-hidden rounded-3xl bg-card transition-transform hover:-translate-y-1">
      <img src={nft.image} alt={`${nft.name}, de ${nft.creator}`} width={400} height={400} loading="lazy" className="aspect-square w-full object-cover" />
      <div className="p-5">
        <h3 className="truncate text-lg font-semibold">{nft.name}</h3>
        <p className="text-sm text-muted">{nft.creator}</p>
        <div className="mt-3 flex items-end justify-between">
          <div><p className="text-xs text-line">Preço</p><p className="font-display text-sm">{fmtEth(nft.price)}</p></div>
          <p className={stock ? 'text-xs text-muted' : 'text-xs font-semibold text-danger'}>{stock ? `${stock} disp.` : 'Esgotado'}</p>
        </div>
      </div>
    </Link>
  )
}
export const NftCardSkeleton = () => (
  <div className="overflow-hidden rounded-3xl bg-card"><Skeleton className="aspect-square w-full rounded-none" /><div className="space-y-2 p-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="mt-3 h-8 w-full" /></div></div>
)
