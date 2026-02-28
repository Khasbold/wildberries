import { useSyncExternalStore } from 'react'
import { subscribe, getState } from './store.js'

export function useStores() {
    const snap = useSyncExternalStore(subscribe, getState)
    const adminUsers = snap.adminUsers || []
    const adminProducts = snap.adminProducts || []

    const stores = adminUsers
        .filter((u) => u.role === 'admin')
        .map((u) => ({
            id: u.storeId,
            name: u.storeName || u.storeId,
            owner: u.name,
            tier: u.tier || 'free',
            productCount: adminProducts.filter((p) => p.storeId === u.storeId).length,
        }))

    function getStoreProducts(storeId) {
        return adminProducts.filter((p) => p.storeId === storeId)
    }

    function getStoreById(storeId) {
        return stores.find((s) => s.id === storeId) || null
    }

    return { stores, getStoreProducts, getStoreById }
}
