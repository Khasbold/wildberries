import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './cn.js'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-gradient-to-br from-brand to-brand-dark text-white shadow-brand-sm',
        secondary: 'border-slate-200/70 bg-slate-100 text-slate-800',
        destructive: 'border-red-200/60 bg-red-50 text-red-700',
        outline: 'border-slate-200 bg-white/60 text-slate-700',
        success: 'border-emerald-200/60 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200/60 bg-amber-50 text-amber-700',
        danger: 'border-rose-200/60 bg-rose-50 text-rose-700',
        muted: 'border-transparent bg-slate-100 text-slate-600',
        bunny: 'border-brand/20 bg-brand/10 text-brand-dark font-bold shadow-soft',
        delivered: 'border-emerald-200/60 bg-emerald-50 text-emerald-700',
        accepted: 'border-blue-200/60 bg-blue-50 text-blue-700',
        new: 'border-slate-200/70 bg-slate-100 text-slate-700',
        refunded: 'border-slate-300/70 bg-slate-200 text-slate-700',
        gold: 'border-yellow-200/70 bg-yellow-50 text-yellow-800 shadow-soft',
        silver: 'border-slate-300/70 bg-slate-100 text-slate-700',
        bronze: 'border-amber-200/70 bg-amber-50 text-amber-800',
        free: 'border-slate-200/60 bg-slate-50 text-slate-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const STATUS_VARIANT = {
  Accepted: 'accepted',
  Pending: 'warning',
  Completed: 'delivered',
  Delivered: 'delivered',
  Bunny: 'bunny',
  New: 'new',
  Cancelled: 'danger',
  Refunded: 'refunded',
}

function Badge({ className, variant, status, children, ...props }) {
  const resolvedVariant = variant || STATUS_VARIANT[children] || STATUS_VARIANT[status] || 'default'
  return <div className={cn(badgeVariants({ variant: resolvedVariant }), className)} {...props}>{children}</div>
}

export { Badge, badgeVariants }
