const KEY = 'bunny_saved_addresses'

export function getSavedAddresses() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '[]')
    } catch {
        return []
    }
}

export function saveAddress(address) {
    const list = getSavedAddresses()
    const exists = list.find((a) => a.city === address.city && a.district === address.district && a.khoroo === address.khoroo)
    if (exists) return list
    list.unshift({ ...address, id: Date.now().toString() })
    const trimmed = list.slice(0, 5)
    localStorage.setItem(KEY, JSON.stringify(trimmed))
    return trimmed
}

export function removeAddress(id) {
    const list = getSavedAddresses().filter((a) => a.id !== id)
    localStorage.setItem(KEY, JSON.stringify(list))
    return list
}
