const KEY = 'bunny_recently_viewed'
const MAX = 20

export function getRecentlyViewed() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '[]')
    } catch {
        return []
    }
}

export function addRecentlyViewed(productId) {
    const list = getRecentlyViewed().filter((id) => id !== productId)
    list.unshift(productId)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
}
