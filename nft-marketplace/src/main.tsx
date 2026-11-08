import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import './index.css'
import { queryClient } from '@/lib/query'
import { router } from '@/router'
import { setUnauthorizedHandler, tokenStore } from '@/api/client'
import { disconnectSocket } from '@/realtime/socket'
import { announce } from '@/lib/announce'

// sessão expirada em qualquer chamada: limpa dados privados e volta ao login preservando o contexto
setUnauthorizedHandler(() => {
  if (!tokenStore.get()) return
  const back = location.pathname + location.search
  tokenStore.clear(); disconnectSocket(); queryClient.clear()
  announce('Sua sessão expirou. Entre novamente para continuar.')
  router.navigate({ to: '/login', search: { redirect: back, expired: true } })
})

async function boot() {
  // O worker precisa estar ativo antes da primeira requisição
  if (import.meta.env.VITE_USE_MOCKS === 'true') await (await import('@/mocks/browser')).startMocks()
  createRoot(document.getElementById('root')!).render(
    <StrictMode><QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider></StrictMode>,
  )
}
void boot()
