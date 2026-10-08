/**
 * Format number as Mongolian Tugrik (MNT) — ₮
 */
export function formatCurrency(n) {
    try {
        return new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 0 }).format(Math.round(Number(n || 0))) + '₮'
    } catch {
        return `${Math.round(Number(n || 0))}₮`
    }
}
