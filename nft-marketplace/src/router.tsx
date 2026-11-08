import { createRootRoute, createRoute, createRouter, redirect, Outlet, Link } from '@tanstack/react-router'
import { queryClient, sessionQuery } from '@/lib/query'
import type { NftQuery, Sort } from '@/types'
import { Layout } from '@/pages/Layout'
import { Home } from '@/pages/Home'
import { NftDetail } from '@/pages/NftDetail'
import { Cart } from '@/pages/Cart'
import { Checkout } from '@/pages/Checkout'
import { OrderPage } from '@/pages/Order'
import { Login, Register } from '@/pages/Auth'
import { Profile } from '@/pages/Profile'
import { WalletsPage } from '@/pages/Wallets'

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
const SORTS: Sort[] = ['recent', 'price-asc', 'price-desc', 'popular']

const NotFound = () => (
  <div className="py-24 text-center"><h1 className="mb-2 text-4xl font-semibold">404</h1><p className="mb-6 text-muted">Página não encontrada.</p><Link to="/" className="text-primary underline">Voltar ao início</Link></div>
)
const root = createRootRoute({ component: () => <Layout><Outlet /></Layout>, notFoundComponent: NotFound })

const requireAuth = async ({ location }: { location: { href: string } }) => {
  const user = await queryClient.ensureQueryData(sessionQuery)
  if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
}

const home = createRoute({
  getParentRoute: () => root, path: '/', component: Home,
  validateSearch: (s: Record<string, unknown>): NftQuery => ({
    q: str(s.q), category: str(s.category), min: str(s.min), max: str(s.max),
    sort: SORTS.includes(s.sort as Sort) && s.sort !== 'recent' ? (s.sort as Sort) : undefined,
    page: Number(s.page) > 1 ? Math.floor(Number(s.page)) : undefined,
  }),
})
const nft = createRoute({ getParentRoute: () => root, path: '/nft/$id', component: NftDetail })
const cart = createRoute({ getParentRoute: () => root, path: '/cart', component: Cart })
const checkout = createRoute({ getParentRoute: () => root, path: '/checkout', component: Checkout, beforeLoad: requireAuth })
const order = createRoute({ getParentRoute: () => root, path: '/orders/$orderId', component: OrderPage, beforeLoad: requireAuth })
const authSearch = (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === 'string' && s.redirect.startsWith('/') ? s.redirect : undefined, expired: s.expired === true || s.expired === 'true' ? true : undefined })
const login = createRoute({ getParentRoute: () => root, path: '/login', component: Login, validateSearch: authSearch })
const register = createRoute({ getParentRoute: () => root, path: '/register', component: Register, validateSearch: authSearch })
const profile = createRoute({ getParentRoute: () => root, path: '/profile', component: Profile, beforeLoad: requireAuth })
const wallets = createRoute({ getParentRoute: () => root, path: '/wallets', component: WalletsPage, beforeLoad: requireAuth })

export const router = createRouter({
  routeTree: root.addChildren([home, nft, cart, checkout, order, login, register, profile, wallets]),
  defaultPreload: 'intent',
})
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
