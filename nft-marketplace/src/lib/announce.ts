// Anúncios para leitores de tela (aria-live). Consumido por <LiveRegion/>.
type Fn = (m: string) => void
const subs = new Set<Fn>()
export const announce = (m: string) => subs.forEach((f) => f(m))
export const onAnnounce = (f: Fn) => { subs.add(f); return () => { subs.delete(f) } }
