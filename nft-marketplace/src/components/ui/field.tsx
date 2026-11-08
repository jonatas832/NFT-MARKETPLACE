import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; hint?: string }
/** Label, descrição e erro associados ao input (aria-describedby / aria-invalid). */
export function Field({ label, error, hint, className, ...p }: Props) {
  const id = useId(), eid = `${id}-e`, hid = `${id}-h`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={[error && eid, hint && hid].filter(Boolean).join(' ') || undefined}
        className={cn('min-h-11 rounded-2xl bg-card px-4 text-white ring-1 ring-line placeholder:text-line', error && 'ring-2 ring-danger', className)} {...p} />
      {hint && <p id={hid} className="text-sm text-muted">{hint}</p>}
      {error && <p id={eid} role="alert" className="text-sm text-danger">⚠ {error}</p>}
    </div>
  )
}
