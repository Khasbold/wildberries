import { useSyncExternalStore } from 'react'
import { subscribe, getState } from './store.js'

function generateSlug(name) {
    const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9а-яөүё-]/gi, '')
        .replace(/-+/g, '-')
        .trim()
    return slug || null
}

export function useStores() {
    const snap = useSyncExternalStore(subscribe, getState)
    const adminUsers = snap.adminUsers || []
    const adminProducts = snap.adminProducts || []

    const stores = adminUsers
        .filter((u) => u.role === 'admin' && !u.disabled)
        .map((u) => {
            const name = u.storeName || u.storeId
            return {
                id: u.storeId,
                slug: generateSlug(name) || u.storeId,
                name,
                owner: u.name,
                image: u.storeImage || null,
                tier: u.tier || 'free',
                productCount: adminProducts.filter((p) => p.storeId === u.storeId).length,
                storePhone: u.storePhone || null,
                showPhoneOnStore: u.showPhoneOnStore ?? false,
            }
        })

    function getStoreProducts(storeId) {
        return adminProducts.filter((p) => p.storeId === storeId)
    }

    function getStoreById(storeId) {
        return stores.find((s) => s.id === storeId) || null
    }

    function getStoreBySlug(slug) {
        return stores.find((s) => s.slug === slug) || stores.find((s) => s.id === slug) || null
    }

    return { stores, getStoreProducts, getStoreById, getStoreBySlug }
}
