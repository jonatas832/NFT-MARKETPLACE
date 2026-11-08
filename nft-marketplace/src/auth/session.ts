import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/api/endpoints'
import { guestId, tokenStore } from '@/api/client'
import { sessionQuery } from '@/lib/query'
import { disconnectSocket } from '@/realtime/socket'
import type { Session } from '@/types'

export const useUser = () => useQuery(sessionQuery).data ?? null

export function useAuthActions() {
  const qc = useQueryClient()
  const nav = useNavigate()

  /** Troca de usuário: limpa TUDO (cache privado + socket) antes de gravar a nova sessão. */
  const start = async (s: Session) => {
    disconnectSocket(); qc.clear(); tokenStore.set(s.token)
    qc.setQueryData(sessionQuery.queryKey, s.user)
    await api.mergeCart(guestId()).catch(() => undefined) // preserva itens do visitante
  }
  const login = useMutation({ mutationFn: api.login, onSuccess: start })
  const register = useMutation({ mutationFn: api.register, onSuccess: start })
  const logout = async () => {
    await api.logout().catch(() => undefined)
    disconnectSocket(); tokenStore.clear(); qc.clear(); qc.setQueryData(sessionQuery.queryKey, null)
    nav({ to: '/' })
  }
  return { login, register, logout }
}
