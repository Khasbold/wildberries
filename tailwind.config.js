/**********
Tailwind config
**********/

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                brand: {
                    DEFAULT: '#D66B3E',
                    dark: '#c45d35',
                    light: '#e88a5c',
                    50: '#F7E9D7',
                    100: '#f0dcc4',
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            boxShadow: {
                card: '0 1px 2px 0 rgb(28 25 23 / 0.04), 0 2px 8px -2px rgb(28 25 23 / 0.06)',
                'card-hover': '0 4px 12px -2px rgb(28 25 23 / 0.08), 0 12px 24px -8px rgb(214 107 62 / 0.12)',
                'card-elevated': '0 10px 24px -6px rgb(28 25 23 / 0.10), 0 20px 40px -12px rgb(214 107 62 / 0.10)',
                glow: '0 0 20px -5px rgb(214 107 62 / 0.35)',
                'brand-sm': '0 2px 8px -2px rgb(214 107 62 / 0.35)',
                'brand-md': '0 6px 16px -4px rgb(214 107 62 / 0.40)',
                'brand-lg': '0 12px 28px -6px rgb(214 107 62 / 0.45)',
                soft: '0 2px 12px -4px rgb(28 25 23 / 0.08)',
                'inner-soft': 'inset 0 1px 2px 0 rgb(28 25 23 / 0.05)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'fade-in-up': {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in-down': {
                    from: { opacity: '0', transform: 'translateY(-12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.96)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                'slide-in-right': {
                    from: { opacity: '0', transform: 'translateX(24px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                'slide-in-left': {
                    from: { opacity: '0', transform: 'translateX(-24px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.4s ease-out both',
                'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
                'fade-in-down': 'fade-in-down 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
                'scale-in': 'scale-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
                'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
                'slide-in-left': 'slide-in-left 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
                shimmer: 'shimmer 1.5s infinite',
                float: 'float 4s ease-in-out infinite',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
            },
            transitionTimingFunction: {
                spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
}
