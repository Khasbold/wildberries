/**
 * Lightweight funnel / event hook. Extend with gtag / dataLayer in init.
 * @param {string} name
 * @param {Record<string, unknown>} [params]
 */
const _funnelGuard = {}
export function trackEvent(name, params = {}) {
    if (typeof window === 'undefined') return
    try {
        window.dataLayer = window.dataLayer || []
        window.dataLayer.push({ event: name, ...params })
    } catch {
        /* ignore */
    }
    // Persist funnel events locally for store owner analytics
    if (['view_item', 'add_to_cart', 'begin_checkout', 'purchase'].includes(name)) {
        // Deduplicate rapid double-fires (React.StrictMode runs effects twice in dev)
        const guardKey = `${name}_${JSON.stringify(params)}`
        const now = Date.now()
        if (_funnelGuard[guardKey] && now - _funnelGuard[guardKey] < 1000) return
        _funnelGuard[guardKey] = now
        try {
            const key = 'bunny_funnel'
            const stored = JSON.parse(localStorage.getItem(key) || '{}')
            const today = new Date().toISOString().slice(0, 10)
            if (!stored[today]) stored[today] = {}
            stored[today][name] = (stored[today][name] || 0) + 1
            const keys = Object.keys(stored).sort()
            while (keys.length > 30) { delete stored[keys.shift()] }
            localStorage.setItem(key, JSON.stringify(stored))
        } catch { /* ignore */ }
    }
    if (import.meta.env?.DEV) {
        console.debug('[analytics]', name, params)
    }
}

/**
 * Get conversion funnel data for analytics display.
 * @param {number} [days=7]
 */
export function getFunnelData(days = 7) {
    try {
        const stored = JSON.parse(localStorage.getItem('bunny_funnel') || '{}')
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        const cutoffStr = cutoff.toISOString().slice(0, 10)
        const totals = { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0 }
        for (const [date, events] of Object.entries(stored)) {
            if (date < cutoffStr) continue
            for (const [event, count] of Object.entries(events)) {
                if (totals[event] !== undefined) totals[event] += count
            }
        }
        return totals
    } catch {
        return { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0 }
    }
}
