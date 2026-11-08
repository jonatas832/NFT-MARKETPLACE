import { useEffect, useState } from 'react'
import { onAnnounce } from '@/lib/announce'

export function LiveRegion() {
  const [msg, setMsg] = useState('')
  useEffect(() => onAnnounce((m) => { setMsg(''); setTimeout(() => setMsg(m), 30) }), [])
  return <div role="status" aria-live="polite" className="sr-only-live" data-testid="live">{msg}</div>
}
