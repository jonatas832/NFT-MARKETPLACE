import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  { variants: { variant: {
      primary: 'bg-primary text-white hover:bg-primary-hover',
      outline: 'border-2 border-primary text-white hover:bg-primary/20',
      ghost: 'text-white hover:bg-white/10',
      danger: 'border-2 border-danger text-danger hover:bg-danger/10' } },
    defaultVariants: { variant: 'primary' } })

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, asChild, ...p }, ref) => {
  const C = asChild ? Slot : 'button'
  return <C ref={ref} className={cn(variants({ variant }), className)} {...p} />
})
Button.displayName = 'Button'
