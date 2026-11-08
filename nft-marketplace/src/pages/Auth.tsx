import { useState, type FormEvent } from 'react'
import { Link, useRouter, useSearch } from '@tanstack/react-router'
import { useAuthActions } from '@/auth/session'
import { toApiError } from '@/api/client'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

function useAuthForm(kind: 'login' | 'register') {
  const { login, register } = useAuthActions(), router = useRouter()
  const search = useSearch({ strict: false }) as { redirect?: string; expired?: boolean }
  const m = kind === 'login' ? login : register
  const err = m.isError ? toApiError(m.error) : null
  const submit = (body: never) => (m.mutate as (b: never, o: object) => void)(body, { onSuccess: () => router.history.push(search.redirect ?? '/') })
  return { m, err, search, submit }
}

export function Login() {
  const { m, err, search, submit } = useAuthForm('login')
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [local, setLocal] = useState<Record<string, string>>({})
  const go = (e: FormEvent) => {
    e.preventDefault(); const l: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) l.email = 'E-mail inválido.'
    if (!password) l.password = 'Informe a senha.'
    setLocal(l); if (!Object.keys(l).length) submit({ email, password } as never)
  }
  return (
    <form noValidate onSubmit={go} className="mx-auto max-w-md space-y-5">
      <h1 className="text-3xl font-semibold">Entrar</h1>
      {search.expired && <p role="alert" className="rounded-2xl bg-card p-3 ring-1 ring-primary">Sua sessão expirou. Entre novamente para continuar de onde parou.</p>}
      {err && <p role="alert" className="text-danger">⚠ {err.message}</p>}
      <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={local.email} />
      <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={local.password} />
      <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? 'Entrando…' : 'Entrar'}</Button>
      <p className="text-sm text-muted">Sem conta? <Link to="/register" search={search} className="text-primary underline">Cadastre-se</Link> · Demo: ana@nft.dev / Senha@123</p>
    </form>)
}

export function Register() {
  const { m, err, search, submit } = useAuthForm('register')
  const [f, setF] = useState({ name: '', email: '', password: '' }), [local, setLocal] = useState<Record<string, string>>({})
  const go = (e: FormEvent) => {
    e.preventDefault(); const l: Record<string, string> = {}
    if (f.name.trim().length < 2) l.name = 'Informe seu nome.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) l.email = 'E-mail inválido.'
    if (f.password.length < 8) l.password = 'Mínimo de 8 caracteres.'
    setLocal(l); if (!Object.keys(l).length) submit(f as never)
  }
  const fe = { ...local, ...(err?.fields ?? {}) }
  return (
    <form noValidate onSubmit={go} className="mx-auto max-w-md space-y-5">
      <h1 className="text-3xl font-semibold">Criar conta</h1>
      {err && !err.fields && <p role="alert" className="text-danger">⚠ {err.message}</p>}
      <Field label="Nome" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={fe.name} />
      <Field label="E-mail" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={fe.email} />
      <Field label="Senha" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres." value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={fe.password} />
      <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? 'Criando…' : 'Criar conta'}</Button>
      <p className="text-sm text-muted">Já tem conta? <Link to="/login" search={search} className="text-primary underline">Entrar</Link></p>
    </form>)
}
