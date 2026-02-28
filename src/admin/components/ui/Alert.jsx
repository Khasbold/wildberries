import * as React from 'react'

function Alert({ className = '', variant = 'default', ...props }) {
    const base = 'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7'
    const variants = {
        default: 'bg-background text-foreground',
        destructive: 'border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600',
        warning: 'border-yellow-300 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-600',
    }
    return <div role="alert" className={`${base} ${variants[variant] || variants.default} ${className}`} {...props} />
}

function AlertTitle({ className = '', ...props }) {
    return <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`} {...props} />
}

function AlertDescription({ className = '', ...props }) {
    return <div className={`text-sm [&_p]:leading-relaxed ${className}`} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
