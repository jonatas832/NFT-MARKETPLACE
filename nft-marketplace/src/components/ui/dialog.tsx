import * as D from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

/** Diálogo acessível (foco preso, ESC fecha, foco retorna ao gatilho) via Radix. */
export function Modal({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; children: ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <D.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-bg p-6 shadow-xl ring-1 ring-line">
          <D.Title className="mb-1 text-2xl font-semibold">{title}</D.Title>
          <D.Description className="mb-4 text-muted">{description}</D.Description>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
