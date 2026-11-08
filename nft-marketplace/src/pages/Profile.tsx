import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { toApiError } from '@/api/client'
import { useUser } from '@/auth/session'
import { sessionQuery } from '@/lib/query'
import { announce } from '@/lib/announce'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

const MAX_AVATAR = 300_000
export function Profile() {
  const user = useUser()!, qc = useQueryClient()
  const [name, setName] = useState(user.name), [phone, setPhone] = useState(user.phone ?? ''), [avatarErr, setAvatarErr] = useState('')
  const update = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (u) => { qc.setQueryData(sessionQuery.queryKey, u); announce('Perfil atualizado.') },
  })
  const fe = update.isError ? toApiError(update.error).fields ?? {} : {}

  const onAvatar = (file?: File) => {
    setAvatarErr(''); if (!file) return
    if (!file.type.startsWith('image/')) return setAvatarErr('Selecione uma imagem.')
    if (file.size > MAX_AVATAR) return setAvatarErr('Imagem muito grande (máx. 300 KB).')
    const r = new FileReader(); r.onload = () => update.mutate({ avatar: String(r.result) }); r.readAsDataURL(file)
  }

  const [pw, setPw] = useState({ current: '', next: '' }), [pwLocal, setPwLocal] = useState<Record<string, string>>({})
  const change = useMutation({ mutationFn: api.changePassword, onSuccess: () => { setPw({ current: '', next: '' }); announce('Senha alterada.') } })
  const pwFe = { ...pwLocal, ...(change.isError ? toApiError(change.error).fields ?? {} : {}) }
  const submitPw = (e: FormEvent) => {
    e.preventDefault(); const l: Record<string, string> = {}
    if (!pw.current) l.current = 'Informe a senha atual.'
    if (pw.next.length < 8) l.next = 'Mínimo de 8 caracteres.'
    setPwLocal(l); if (!Object.keys(l).length) change.mutate(pw)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <h1 className="text-3xl font-semibold">Perfil do colecionador</h1>
      <section aria-labelledby="h-p" className="space-y-5">
        <h2 id="h-p" className="text-xl font-semibold">Dados pessoais</h2>
        <div className="flex items-center gap-4">
          {user.avatar ? <img src={user.avatar} alt={`Avatar de ${user.name}`} width={80} height={80} className="size-20 rounded-full object-cover" /> : <div aria-hidden className="grid size-20 place-items-center rounded-full bg-primary text-2xl">{user.name[0]}</div>}
          <div><label className="inline-flex min-h-11 cursor-pointer items-center rounded-2xl border-2 border-primary px-4 focus-within:outline focus-within:outline-2 focus-within:outline-primary">Alterar avatar<input type="file" accept="image/*" className="sr-only" onChange={(e) => onAvatar(e.target.files?.[0])} /></label>
            {(avatarErr || fe.avatar) && <p role="alert" className="mt-1 text-sm text-danger">⚠ {avatarErr || fe.avatar}</p>}</div>
        </div>
        <form noValidate onSubmit={(e) => { e.preventDefault(); update.mutate({ name, phone }) }} className="space-y-4">
          <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} error={fe.name} />
          <Field label="E-mail" value={user.email} readOnly hint="O e-mail não pode ser alterado." />
          <Field label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Salvando…' : 'Salvar alterações'}</Button>
          {update.isSuccess && <span role="status" className="ml-3 text-ok">✓ Salvo</span>}
        </form>
      </section>
      <section aria-labelledby="h-pw" className="space-y-5">
        <h2 id="h-pw" className="text-xl font-semibold">Alterar senha</h2>
        <form noValidate onSubmit={submitPw} className="space-y-4">
          <Field label="Senha atual" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwFe.current} />
          <Field label="Nova senha" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwFe.next} />
          <Button type="submit" disabled={change.isPending}>Alterar senha</Button>
          {change.isSuccess && <span role="status" className="ml-3 text-ok">✓ Senha alterada</span>}
        </form>
      </section>
    </div>)
}
