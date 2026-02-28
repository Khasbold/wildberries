import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './cn.js'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-white',
        secondary: 'border-transparent bg-slate-100 text-slate-800',
        destructive: 'border-transparent bg-red-100 text-red-700',
        outline: 'border-slate-200 text-slate-700',
        success: 'border-transparent bg-emerald-100 text-emerald-700',
        warning: 'border-transparent bg-amber-100 text-amber-700',
        danger: 'border-transparent bg-rose-100 text-rose-700',
        muted: 'border-transparent bg-slate-100 text-slate-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const STATUS_VARIANT = {
  'Создан': 'muted',
  Accepted: 'warning',
  Pending: 'warning',
  Completed: 'success',
  Delivered: 'success',
  Cancelled: 'danger',
  Refunded: 'secondary',
}

function Badge({ className, variant, status, children, ...props }) {
  const resolvedVariant = variant || STATUS_VARIANT[children] || STATUS_VARIANT[status] || 'default'
  return <div className={cn(badgeVariants({ variant: resolvedVariant }), className)} {...props}>{children}</div>
}

export { Badge, badgeVariants }
