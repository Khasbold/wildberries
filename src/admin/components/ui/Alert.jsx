import * as React from 'react'

function Alert({ className = '', variant = 'default', ...props }) {
    const base = 'relative w-full rounded-xl border border-l-4 px-4 py-3 text-sm shadow-soft animate-fade-in [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7'
    const variants = {
        default: 'border-brand/15 border-l-brand bg-brand-50/40 text-slate-800 [&>svg]:text-brand dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:border-l-brand',
        destructive: 'border-red-200 border-l-red-500 bg-red-50 text-red-900 [&>svg]:text-red-600 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900 dark:border-l-red-500',
        warning: 'border-yellow-200 border-l-yellow-500 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-900 dark:border-l-yellow-500',
    }
    return <div role="alert" className={`${base} ${variants[variant] || variants.default} ${className}`} {...props} />
}

function AlertTitle({ className = '', ...props }) {
    return <h5 className={`mb-1 font-semibold leading-none tracking-tight ${className}`} {...props} />
}

function AlertDescription({ className = '', ...props }) {
    return <div className={`text-sm [&_p]:leading-relaxed ${className}`} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
