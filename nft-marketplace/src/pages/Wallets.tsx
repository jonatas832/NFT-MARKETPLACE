import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/client'
import { useUser } from '@/auth/session'
import { walletsQuery } from '@/lib/query'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox } from '@/components/ErrorBox'
import type { Network, Wallet } from '@/types'

export function WalletsPage() {
  const uid = useUser()!.id, qc = useQueryClient(), q = useQuery(walletsQuery(uid))
  const [editing, setEditing] = useState<Wallet | 'new' | null>(null)
  const [f, setF] = useState({ label: '', address: '', network: 'ethereum' as Network, primary: false })
  const save = useMutation({
    mutationFn: () => (editing === 'new' ? api.addWallet(f) : api.updateWallet((editing as Wallet).id, f)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['private', uid, 'wallets'] }); setEditing(null) },
  })
  const fe = save.isError ? toApiError(save.error) : null
  const open = (w: Wallet | 'new') => { save.reset(); setEditing(w); setF(w === 'new' ? { label: '', address: '', network: 'ethereum', primary: false } : { label: w.label, address: w.address, network: w.network, primary: w.primary }) }
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate() }

  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold">Carteiras</h1>
        <Button onClick={() => open('new')} disabled={(q.data?.length ?? 0) >= 2 || !!editing}>Adicionar carteira</Button></div>
      {q.isPending ? <Skeleton className="h-24" /> : q.data.length === 0 ? <p className="text-muted">Você ainda não cadastrou carteiras.</p> : (
        <ul className="space-y-3">{q.data.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-card p-5">
            <div className="min-w-0"><p className="font-semibold">{w.label} <span className="ml-2 rounded-full bg-primary/30 px-2 py-0.5 text-xs">{w.primary ? 'Principal' : 'Secundária'}</span></p>
              <p className="break-all font-display text-xs text-muted">{w.address} · {w.network}</p></div>
            <Button variant="outline" onClick={() => open(w)} aria-label={`Editar carteira ${w.label}`}>Editar</Button></li>))}</ul>)}
      {editing && (
        <form noValidate onSubmit={submit} className="space-y-4 rounded-3xl bg-card p-6" aria-label={editing === 'new' ? 'Nova carteira' : 'Editar carteira'}>
          {fe && !fe.fields && <p role="alert" className="text-danger">⚠ {fe.message}</p>}
          <Field label="Nome" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} error={fe?.fields?.label} />
          <Field label="Endereço" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} error={fe?.fields?.address} placeholder="0x…" />
          <label className="flex flex-col gap-1.5 text-sm font-medium">Rede padrão
            <select className="min-h-11 rounded-2xl bg-bg px-4 ring-1 ring-line" value={f.network} onChange={(e) => setF({ ...f, network: e.target.value as Network })}><option>ethereum</option><option>polygon</option><option>base</option></select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.primary} onChange={(e) => setF({ ...f, primary: e.target.checked })} className="size-5" />Definir como principal</label>
          <div className="flex gap-3"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar'}</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button></div>
        </form>)}
    </div>)
}
