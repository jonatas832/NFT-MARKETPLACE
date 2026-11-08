import { toApiError } from '@/api/client'
import { Button } from './ui/button'

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = toApiError(error)
  return (
    <div role="alert" className="rounded-3xl bg-card p-8 text-center ring-1 ring-danger">
      <p className="mb-1 text-lg font-semibold">Algo deu errado</p>
      <p className="mb-4 text-muted">{e.message}</p>
      {onRetry && <Button onClick={onRetry}>Tentar novamente</Button>}
    </div>
  )
}
