import Fuse from 'fuse.js'

let fuseInstance = null
let lastProducts = null

function getProductTimeMs(p) {
    const ts = p?.updatedAt || p?.createdAt
    if (ts && typeof ts.toMillis === 'function') return ts.toMillis()
    if (ts instanceof Date) return ts.getTime()
    if (typeof ts === 'string' || typeof ts === 'number') {
        const n = new Date(ts).getTime()
        return Number.isFinite(n) ? n : 0
    }
    return 0
}

function ensureFuse(products) {
    if (products !== lastProducts) {
        lastProducts = products
        fuseInstance = new Fuse(products, {
            keys: [
                { name: 'title', weight: 0.5 },
                { name: 'brand', weight: 0.3 },
                { name: 'category', weight: 0.2 },
            ],
            threshold: 0.4,
            distance: 100,
            minMatchCharLength: 2,
            includeScore: true,
        })
    }
    return fuseInstance
}

export function fuzzySearch(products, query) {
    if (!query || !query.trim()) return products
    ensureFuse(products)
    return fuseInstance.search(query.trim()).map((r) => r.item)
}

/**
 * Fuzzy match + tie-break: relevance (Fuse score), then popularity (views), then recency.
 */
export function fuzzySearchRanked(products, query, opts = {}) {
    const { viewCounts = {} } = opts
    if (!query || !query.trim()) return products
    const fuse = ensureFuse(products)
    const results = fuse.search(query.trim())
    const now = Date.now()
    const day = 86400000

    return results
        .map((r) => {
            const p = r.item
            const fuseScore = r.score ?? 1
            const views = viewCounts[p.id] ?? p.views ?? 0
            const ageDays = Math.max(0, (now - getProductTimeMs(p)) / day)
            const popularityFactor = 1 + Math.min(0.12, Math.log(1 + views) * 0.015)
            const recencyFactor = 1 - Math.min(0.08, ageDays / 120 * 0.08)
            const adjusted = fuseScore * popularityFactor * recencyFactor
            return { item: p, fuseScore, views, pMs: getProductTimeMs(p), adjusted }
        })
        .sort((a, b) => {
            if (Math.abs(a.adjusted - b.adjusted) > 0.008) return a.adjusted - b.adjusted
            if (b.views !== a.views) return b.views - a.views
            return b.pMs - a.pMs
        })
        .map((x) => x.item)
}
