import { useMemo, useSyncExternalStore } from 'react'
import {
    buyTierForCurrentStore,
    clearOrders,
    deleteAdminCategory,
    deleteAdminProduct,
    deleteAdminDiscount,
    deleteOrder,
    getState,
    resetAdminCategories,
    resetAdminProducts,
    resetAdminDiscounts,
    resetOrders,
    subscribe,
    updateOrderStatus,
    upsertAdminCategory,
    upsertAdminProduct,
    upsertAdminDiscount,
} from './store.js'

export const ORDER_STATUSES = ['Создан', 'Accepted', 'Delivered', 'Cancelled', 'Refunded']

export function useAdmin() {
    const state = useSyncExternalStore(subscribe, getState)
    const session = state.adminSession
    const isSuperAdmin = session?.role === 'superadmin'
    const storeId = session?.storeId || null

    /* Products / orders scoped to the current store (or all for superadmin) */
    const products = useMemo(() => {
        if (isSuperAdmin || !storeId) return state.adminProducts
        return state.adminProducts.filter((p) => p.storeId === storeId)
    }, [state.adminProducts, isSuperAdmin, storeId])

    const orders = useMemo(() => {
        if (isSuperAdmin || !storeId) return state.orders
        return state.orders.filter((o) => {
            /* Match by storeIds array (new orders) or single storeId (seeded orders) */
            if (Array.isArray(o.storeIds) && o.storeIds.includes(storeId)) return true
            if (o.storeId === storeId) return true
            /* Also match if any line-item belongs to this store */
            if (Array.isArray(o.items) && o.items.some((item) => item.storeId === storeId)) return true
            return false
        })
    }, [state.orders, isSuperAdmin, storeId])

    const discounts = useMemo(() => {
        if (isSuperAdmin || !storeId) return state.adminDiscounts
        return state.adminDiscounts.filter((d) => d.storeId === storeId)
    }, [state.adminDiscounts, isSuperAdmin, storeId])

    const stats = useMemo(() => {
        const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
        const deliveredCount = orders.filter((order) => order.status === 'Delivered').length
        const acceptedCount = orders.filter((order) => order.status === 'Accepted').length

        const customersMap = new Map()
        for (const order of orders) {
            const key = order.customer?.email || order.customer?.phone || order.id
            const prev = customersMap.get(key) || {
                key,
                name: order.customer?.name || 'Unknown',
                email: order.customer?.email || '-',
                phone: order.customer?.phone || '-',
                ordersCount: 0,
                totalSpent: 0,
            }
            prev.ordersCount += 1
            prev.totalSpent += Number(order.total || 0)
            customersMap.set(key, prev)
        }

        const customers = Array.from(customersMap.values()).sort((a, b) => b.totalSpent - a.totalSpent)

        return {
            ordersCount: orders.length,
            productsCount: products.length,
            revenue,
            deliveredCount,
            acceptedCount,
            customers,
        }
    }, [orders, products])

    return {
        orders,
        products,
        allProducts: state.adminProducts,
        categories: state.adminCategories,
        discounts,
        stats,
        session,
        isSuperAdmin,
        storeId,
        updateOrderStatus,
        deleteOrder,
        clearOrders,
        resetOrders,
        upsertAdminProduct,
        deleteAdminProduct,
        resetAdminProducts,
        upsertAdminCategory,
        deleteAdminCategory,
        resetAdminCategories,
        upsertAdminDiscount,
        deleteAdminDiscount,
        resetAdminDiscounts,
        buyTierForCurrentStore,
    }
}
