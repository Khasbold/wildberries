/**
 * Centralized color palette for the entire Bunny project.
 * Import colors from here instead of hardcoding hex values.
 */

export const palette = {
    brand: {
        primary: '#D66B3E',
        primaryDark: '#c45d35',
        primaryLight: '#e88a5c',
        secondary: '#4B7F4D',
        secondaryDark: '#3a6a3c',
        secondaryLight: '#6aab6c',
    },
    bg: {
        beige: '#F7E9D7',
        beige100: '#f0dcc4',
        light: '#faf8f5',
        white: '#ffffff',
    },
    dark: {
        bg: '#0f172a',
        bgSecondary: '#1e293b',
        card: '#1e293b',
        cardHover: '#334155',
        border: '#334155',
        borderLight: '#475569',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
    },
}

/** CSS variable names mapped to palette for Tailwind integration */
export const cssVarMap = {
    '--brand-primary': palette.brand.primary,
    '--brand-primary-dark': palette.brand.primaryDark,
    '--brand-primary-light': palette.brand.primaryLight,
    '--brand-secondary': palette.brand.secondary,
    '--brand-secondary-dark': palette.brand.secondaryDark,
    '--bg-beige': palette.bg.beige,
    '--bg-beige-100': palette.bg.beige100,
}
