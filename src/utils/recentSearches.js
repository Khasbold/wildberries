const KEY = 'wb_recent_searches'
const MAX = 12

function read() {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return []
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string' && s.trim()) : []
    } catch {
        return []
    }
}

function write(list) {
    try {
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
    } catch {
        /* ignore */
    }
}

export function getRecentSearches() {
    return read()
}

export function addRecentSearch(term) {
    const q = String(term || '').trim()
    if (q.length < 2) return read()
    const prev = read().filter((s) => s.toLowerCase() !== q.toLowerCase())
    write([q, ...prev])
    return read()
}

export function clearRecentSearches() {
    try {
        localStorage.removeItem(KEY)
    } catch {
        /* ignore */
    }
}
