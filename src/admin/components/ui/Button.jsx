import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from './cn.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-br from-brand to-brand-dark text-white shadow-brand-sm hover:shadow-brand-md hover:from-brand-dark hover:to-brand-dark',
        destructive: 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm hover:from-red-600 hover:to-red-800 hover:shadow-md',
        outline: 'border border-slate-200 bg-white text-slate-700 shadow-soft hover:border-brand/30 hover:bg-brand-50/40 hover:text-slate-900 hover:shadow-card dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
        secondary: 'bg-slate-100 text-slate-900 shadow-inner-soft hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
        ghost: 'text-slate-600 hover:bg-brand-50/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100',
        link: 'text-brand underline-offset-4 hover:underline hover:text-brand-dark',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
