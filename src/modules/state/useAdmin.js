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
    subscribe,
    updateOrderStatus,
    updateStoreProfile,
    upsertAdminCategory,
    upsertAdminProduct,
    upsertAdminDiscount,
    deriveAggregateStatus,
    storeOwnerAcceptFulfillment,
    storeOwnerRequestRefund,
    storeOwnerMarkShipped,
    storeOwnerMarkDelivered,
    superadminMarkRefunded,
    superadminMarkFulfillmentDelivered,
    superadminMarkFulfillmentBunny,
    superadminMarkOrderBunny,
    superadminDeliverAll,
} from './store.js'
import { deriveStoreFulfillmentStatus, storePortionTotal } from '../../utils/orderFulfillment.js'

/** Superadmin quick actions on list rows (unified orders use detail + QR for per-store deliver). */
export const ORDER_STATUSES_SUPER = ['Refunded', 'Delivered', 'Bunny']

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
        const revenue = orders.reduce((sum, order) => {
            if (isSuperAdmin || !storeId) return sum + Number(order.total || 0)
            return sum + storePortionTotal(order, storeId, state.adminProducts)
        }, 0)
        const deliveredCount = orders.filter((order) => {
            if (isSuperAdmin || !storeId) return deriveAggregateStatus(order) === 'Delivered'
            return deriveStoreFulfillmentStatus(order, storeId) === 'Delivered'
        }).length
        const acceptedCount = orders.filter((order) => {
            if (isSuperAdmin || !storeId) return deriveAggregateStatus(order) === 'Accepted'
            return deriveStoreFulfillmentStatus(order, storeId) === 'Accepted'
        }).length

        const customersMap = new Map()
        const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        for (const order of sortedOrders) {
            const key = order.customer?.email || order.customer?.phone || order.id
            const orderValue = isSuperAdmin || !storeId ? Number(order.total || 0) : storePortionTotal(order, storeId, state.adminProducts)
            const prev = customersMap.get(key)
            if (prev) {
                prev.ordersCount += 1
                prev.totalSpent += orderValue
            } else {
                const addr = order.deliveryInfo
                const addressStr = [addr?.city, addr?.address].filter(Boolean).join(', ') || '-'
                customersMap.set(key, {
                    key,
                    name: order.customer?.name || 'Unknown',
                    email: order.customer?.email || '-',
                    phone: order.customer?.phone || '-',
                    address: addressStr,
                    ordersCount: 1,
                    totalSpent: orderValue,
                })
            }
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
    }, [orders, products, isSuperAdmin, storeId, state.adminProducts, deriveAggregateStatus])

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
        deriveAggregateStatus,
        storeOwnerAcceptFulfillment,
        storeOwnerRequestRefund,
        storeOwnerMarkShipped,
        storeOwnerMarkDelivered,
        superadminMarkRefunded,
        superadminMarkFulfillmentDelivered,
        superadminMarkFulfillmentBunny,
        superadminMarkOrderBunny,
        superadminDeliverAll,
        deleteOrder,
        clearOrders,
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
        updateStoreProfile,
    }
}
