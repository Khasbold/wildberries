/**
 * Multi-store order fulfillment helpers (single order doc, per-store delivery + QR tokens).
 */

export function getFulfillments(order) {
    if (!order) return {}
    if (order.fulfillments && typeof order.fulfillments === 'object' && !Array.isArray(order.fulfillments)) {
        return { ...order.fulfillments }
    }
    const sid = order.storeId || (Array.isArray(order.storeIds) ? order.storeIds[0] : null) || '_'
    const st = order.status || 'New'
    return { [sid]: { status: st } }
}

export function uniqueStoreIdsFromOrder(order) {
    const fromItems = (order.items || []).map((l) => l.storeId).filter(Boolean)
    const set = new Set(fromItems)
    if (set.size === 0 && order.storeIds?.length) order.storeIds.forEach((s) => set.add(s))
    if (set.size === 0 && order.storeId) set.add(order.storeId)
    if (set.size === 0) set.add('_')
    return [...set]
}

/** Overall label for lists (New / Accepted / Delivered / Bunny / Refunded) */
export function deriveAggregateStatus(order) {
    if (!order) return 'New'
    if (order.status === 'Bunny') return 'Bunny'
    if (order.refundStatus === 'Refunded') return 'Refunded'
    const f = getFulfillments(order)
    const ids = Object.keys(f)
    if (ids.length === 0) return order.status || 'New'
    const allBunny = ids.every((sid) => f[sid]?.status === 'Bunny')
    if (allBunny) return 'Bunny'
    const allDelivered = ids.every((sid) => f[sid]?.status === 'Delivered' || f[sid]?.status === 'Bunny')
    if (allDelivered) return 'Delivered'
    const allNew = ids.every((sid) => (f[sid]?.status || 'New') === 'New')
    if (allNew) return 'New'
    // Check for shipped status — if all non-delivered/bunny stores are shipped, surface it
    const hasShipped = ids.some((sid) => f[sid]?.status === 'shipped')
    const allShippedOrBetter = ids.every((sid) => ['shipped', 'Delivered', 'Bunny'].includes(f[sid]?.status))
    if (hasShipped && allShippedOrBetter) return 'shipped'
    return 'Accepted'
}

/** Legacy: per-store token in URL (still supported for old orders). */
export function buildDeliveryQrUrl(origin, orderId, storeId, token) {
    const o = String(origin || '').replace(/\/$/, '')
    const params = new URLSearchParams({
        order: orderId,
        store: storeId,
        token: String(token),
    })
    return `${o}/admin/delivery-scan?${params.toString()}`
}

/**
 * One QR for the whole checkout: scanner’s logged-in store (or superadmin + ?store=) decides which fulfillment is marked delivered.
 */
export function buildUnifiedDeliveryQrUrl(origin, orderId, proofToken) {
    const o = String(origin || '').replace(/\/$/, '')
    const params = new URLSearchParams({
        order: orderId,
        token: String(proofToken),
    })
    return `${o}/admin/delivery-scan?${params.toString()}`
}

export function itemsForStore(order, storeId) {
    if (!order?.items || !storeId) return []
    return order.items.filter((l) => (l.storeId || '_') === storeId)
}

/** Revenue / totals for one store’s slice (uses storeBreakdown from checkout when present). */
export function storeSliceTotals(order, storeId) {
    if (!order || !storeId) {
        return { qty: 0, subtotal: 0, delivery: 0, discount: 0, total: 0 }
    }
    const br = (order.storeBreakdown || []).find((s) => s.storeId === storeId)
    const lines = itemsForStore(order, storeId)
    const qty = lines.reduce((s, l) => s + Number(l.quantity || 0), 0)
    if (br) {
        return {
            qty,
            subtotal: Number(br.subtotal || 0),
            delivery: Number(br.delivery || 0),
            discount: Number(br.discount || 0),
            total: Number(br.total || 0),
        }
    }
    return { qty, subtotal: 0, delivery: 0, discount: 0, total: 0 }
}

/** Total for a store’s lines when `storeBreakdown` is missing (legacy orders): pass product list for pricing. */
export function storePortionTotal(order, storeId, products) {
    if (!storeId || !order) return Number(order?.total || 0)
    const t = storeSliceTotals(order, storeId)
    if (t.total > 0) return t.total
    const list = products || []
    return itemsForStore(order, storeId).reduce((sum, l) => {
        const p = list.find((x) => x.id === l.productId)
        return sum + Number(p?.price || 0) * Number(l.quantity || 0)
    }, 0)
}

/** Status label for a store’s fulfillment line (for admin list/detail). */
export function deriveStoreFulfillmentStatus(order, storeId) {
    if (!order || !storeId) return 'New'
    const f = getFulfillments(order)[storeId]
    return f?.status || 'New'
}
