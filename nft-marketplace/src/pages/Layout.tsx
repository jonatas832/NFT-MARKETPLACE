import { useEffect, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useUser, useAuthActions } from '@/auth/session'
import { useCart } from '@/api/hooks'
import { connectSocket } from '@/realtime/socket'
import { LiveRegion } from '@/components/LiveRegion'
import { Button } from '@/components/ui/button'

export function Layout({ children }: { children: ReactNode }) {
  const user = useUser(), qc = useQueryClient(), { logout } = useAuthActions()
  const cart = useCart()
  useEffect(() => { connectSocket(qc, user?.id ?? null) }, [user?.id, qc])
  const count = (cart.data ?? []).reduce((s, i) => s + i.quantity, 0)
  const link = 'rounded-xl px-3 py-2 hover:bg-white/10'
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-primary focus:p-3">Ir para o conteúdo</a>
      <header className="border-b border-line/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link to="/" className="font-display text-xl font-bold">NFT Marketplace</Link>
          <nav aria-label="Principal" className="flex flex-wrap items-center gap-1 text-sm sm:text-base">
            <Link to="/" className={link}>Explorar</Link>
            <Link to="/cart" className={link}>Carrinho{count > 0 && <span aria-label={`${count} itens`} className="ml-1 rounded-full bg-primary px-2 text-xs">{count}</span>}</Link>
            {user ? (<>
              <Link to="/wallets" className={link}>Carteiras</Link>
              <Link to="/profile" className={link}>{user.name.split(' ')[0]}</Link>
              <Button variant="outline" className="min-h-9 px-4 py-1.5" onClick={logout}>Sair</Button>
            </>) : (<>
              <Link to="/login" search={{}} className={link}>Entrar</Link>
              <Button asChild className="min-h-9 px-4 py-1.5"><Link to="/register" search={{}}>Criar conta</Link></Button>
            </>)}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">{children}</main>
      <footer className="border-t border-line/40 py-8 text-center text-sm text-muted">Ambiente de demonstração: todos os dados são simulados.</footer>
      <LiveRegion />
    </>
  )
}
