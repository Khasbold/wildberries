/** Privacy-safe local “trending”: product id click counts, decayed on read. */
const KEY = 'wb_trending_clicks'
const DECAY = 0.92
const MAX_IDS = 40

function readMap() {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return {}
        const o = JSON.parse(raw)
        return o && typeof o === 'object' ? o : {}
    } catch {
        return {}
    }
}

function writeMap(m) {
    try {
        const entries = Object.entries(m)
            .filter(([, v]) => typeof v === 'number' && v >= 0.5)
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_IDS)
        localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)))
    } catch {
        /* ignore */
    }
}

export function recordProductClick(productId) {
    if (!productId) return
    const m = readMap()
    m[productId] = (m[productId] || 0) * DECAY + 1
    writeMap(m)
}

/** Returns sorted product ids by score (highest first). */
export function getTrendingProductIds() {
    const m = readMap()
    const decayed = {}
    for (const [id, score] of Object.entries(m)) {
        decayed[id] = (Number(score) || 0) * DECAY
    }
    writeMap(decayed)
    return Object.entries(decayed)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id)
}
