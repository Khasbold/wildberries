import { getFulfillments, deriveAggregateStatus, uniqueStoreIdsFromOrder } from '../../utils/orderFulfillment.js'

let USE_FIREBASE = true
export function setUseFirebase(value) {
    USE_FIREBASE = !!value
}
export function getUseFirebase() {
    return USE_FIREBASE
}
const CART_KEY = 'wb_cart'
const WISHLIST_KEY = 'wb_wishlist'
const AUTH_KEY = 'wb_auth'

/* ─── Tier plans ─── */
export const TIER_PLANS = {
    free: {
        id: "free",
        name: "Үнэгүй туулай",
        price: 0,
        maxProducts: 2,
        commission: 10,
        benefits: [
            "2 бүтээгдэхүүн",
            "Админ удирдлага болон Dashboard ашиглах эрх",
            "Qpay төлбөрийн эрх",
            "Захиалгын мэдээлэл емайлээр авах эрх",
        ]
    },
    bronze: {
        id: "bronze",
        name: "Хүрэл туулай",
        price: 45000,
        maxProducts: 10,
        commission: 8,
        benefits: [
            "10 бүтээгдэхүүн",
            "Админ удирдлага болон Dashboard ашиглах эрх",
            "Qpay төлбөрийн эрх",
            "Захиалгын мэдээлэл емайлээр авах эрх",
            "Promo code (Coupon) үүсгэх эрх",
            "Дэлгүүрийн banner оруулах эрх"
        ]
    },
    silver: {
        id: "silver",
        name: "Мөнгөн туулай",
        price: 85000,
        maxProducts: 30,
        commission: 6,
        benefits: [
            "30 бүтээгдэхүүн",
            "Админ удирдлага болон Dashboard ашиглах эрх",
            "Qpay төлбөрийн эрх",
            "Захиалгын мэдээлэл емайлээр авах эрх",
            "Promo code (Coupon) үүсгэх эрх",
            "Дэлгүүрийн banner оруулах эрх",
            "Нэг барааг онцлох эрх",
        ]
    },
    gold: {
        id: "gold",
        name: "Алтан туулай",
        price: 150000,
        maxProducts: -1,
        commission: 4,
        benefits: [
            "Хязгааргүй бүтээгдэхүүн",
            "Админ удирдлага болон Dashboard ашиглах эрх",
            "Захиалгын мэдээлэл емайлээр авах эрх",
            "Promo code (Coupon) үүсгэх эрх",
            "Дэлгүүрийн banner оруулах эрх",
            "Нэг барааг онцлох эрх",
            "Захиалгат бараа оруулах эрх",
            "Хувийн данс холбох эрх",
            "Өөрийн Qpay төлбөрийн эрх",
            "Home page Banner байршуулах эрх (Conditional)",
        ]
    }
};

function readLocalStorageJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        return JSON.parse(raw)
    } catch {
        return fallback
    }
}

function writeLocalStorageJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
}

const listeners = new Set()

async function getFb() {
    if (!USE_FIREBASE) return null
    try {
        return await import('../../firebase/storeAdapter.js')
    } catch {
        return null
    }
}

/** Hydrate store from Firebase data (called after loadFromFirestore) */
export function hydrateStore(data) {
    if (!data) return
    if (data.adminProducts?.length) store.adminProducts = data.adminProducts
    if (data.adminCategories?.length) store.adminCategories = data.adminCategories
    if (data.adminUsers?.length) store.adminUsers = data.adminUsers
    if (Array.isArray(data.orders)) store.orders = data.orders
    if (data.adminDiscounts?.length) store.adminDiscounts = data.adminDiscounts
    if (Array.isArray(data.banners)) store.banners = data.banners
    if (data.highlights && typeof data.highlights === 'object') store.highlights = data.highlights
    if (Array.isArray(data.notifications)) store.notifications = data.notifications
    if (Array.isArray(data.adminNotifications)) store.adminNotifications = data.adminNotifications
    if (Array.isArray(data.clientNotifications)) store.clientNotifications = data.clientNotifications
    if (data.productViews && typeof data.productViews === 'object') store.productViews = data.productViews
    if (Array.isArray(data.cart)) store.cart = data.cart
    if (Array.isArray(data.wishlist)) store.wishlist = data.wishlist
    if (Array.isArray(data.tierChangeHistory)) store.tierChangeHistory = data.tierChangeHistory
    emit()
}

/** Partial hydrate for real-time updates */
export function hydrateStorePartial(data) {
    if (!data) return
    if (Array.isArray(data.adminNotifications)) store.adminNotifications = data.adminNotifications
    if (Array.isArray(data.clientNotifications)) store.clientNotifications = data.clientNotifications
    if (Array.isArray(data.orders)) store.orders = data.orders
    if (Array.isArray(data.adminProducts)) store.adminProducts = data.adminProducts
    emit()
}

/** When Firebase is unavailable: empty catalog data; cart/wishlist stay local for that session only */
export function hydrateStoreWithFallback() {
    store.adminProducts = []
    store.adminCategories = []
    store.adminUsers = []
    store.adminDiscounts = []
    store.orders = []
    store.banners = []
    store.highlights = {}
    store.notifications = []
    store.adminNotifications = []
    store.clientNotifications = []
    store.productViews = {}
    store.cart = readLocalStorageJSON(CART_KEY, [])
    store.wishlist = readLocalStorageJSON(WISHLIST_KEY, [])
    store.adminSession = null
    emit()
}

const store = {
    cart: /** @type {{ productId: string, quantity: number }[]} */ ([]),
    wishlist: /** @type {string[]} */ ([]),
    auth: /** @type {{ isAuthenticated: boolean, name: string, phone: string, email: string, city?: string, district?: string, khoroo?: string, khoroolol?: string, floor?: string, building?: string, door?: string, uid?: string, isAnonymous?: boolean }} */ (readLocalStorageJSON(AUTH_KEY, {
        isAuthenticated: false,
        name: '',
        phone: '',
        email: '',
        city: '',
        district: '',
        khoroo: '',
        khoroolol: '',
        floor: '',
        building: '',
        door: '',
        uid: null,
        isAnonymous: false,
    })),
    orders: /** @type {Array} */ ([]),
    adminProducts: /** @type {Array} */ ([]),
    adminCategories: /** @type {Array} */ ([]),
    adminUsers: /** @type {Array} */ ([]),
    adminSession: /** @type {object | null} */ (null),
    adminDiscounts: /** @type {Array} */ ([]),
    highlights: /** @type {{ [storeId: string]: string }} */ ({}),
    banners: /** @type {{ id: string, image: string, title: string, order: number }[]} */ ([]),
    productViews: /** @type {{ [productId: string]: number }} */ ({}),
    notifications: /** @type {{ id: string, title: string, body: string, createdAt: string, sentBy: string }[]} */ ([]),
    adminNotifications: /** @type {Array} */ ([]),
    clientNotifications: /** @type {Array} */ ([]),
    tierChangeHistory: /** @type {{ id: string, userId: string, userName: string, storeName: string, fromTier: string, toTier: string, changedAt: string }[]} */ ([]),
}

let snapshot = {
    cart: store.cart,
    wishlist: store.wishlist,
    auth: store.auth,
    orders: store.orders,
    adminProducts: store.adminProducts,
    adminCategories: store.adminCategories,
    adminUsers: store.adminUsers,
    adminSession: store.adminSession,
    adminDiscounts: store.adminDiscounts,
    highlights: store.highlights,
    banners: store.banners,
    productViews: store.productViews,
    notifications: store.notifications,
    adminNotifications: store.adminNotifications,
    clientNotifications: store.clientNotifications,
    tierChangeHistory: store.tierChangeHistory,
}

function emit() {
    snapshot = {
        cart: store.cart,
        wishlist: store.wishlist,
        auth: store.auth,
        orders: store.orders,
        adminProducts: store.adminProducts,
        adminCategories: store.adminCategories,
        adminUsers: store.adminUsers,
        adminSession: store.adminSession,
        adminDiscounts: store.adminDiscounts,
        highlights: store.highlights,
        banners: store.banners,
        productViews: store.productViews,
        notifications: store.notifications,
        adminNotifications: store.adminNotifications,
        clientNotifications: store.clientNotifications,
        tierChangeHistory: store.tierChangeHistory,
    }
    for (const l of listeners) l()
}

export function subscribe(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
}

export function getState() {
    return snapshot
}

export function addToCart(productId, quantity = 1, options = {}) {
    const { size, color } = options
    const existing = store.cart.find((i) => i.productId === productId && (i.size || '') === (size || '') && (i.color || '') === (color || ''))
    if (existing) {
        store.cart = store.cart.map((item) => (
            item === existing
                ? { ...item, quantity: item.quantity + quantity }
                : item
        ))
    } else {
        store.cart = [...store.cart, { productId, quantity, ...(size ? { size } : {}), ...(color ? { color } : {}) }]
    }
    if (!USE_FIREBASE) writeLocalStorageJSON(CART_KEY, store.cart)
    else getFb().then((fb) => fb?.saveCart(store.cart))
    emit()
}

export function updateCartQuantity(productId, quantity) {
    store.cart = store.cart
        .map((i) => (i.productId === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0)
    if (!USE_FIREBASE) writeLocalStorageJSON(CART_KEY, store.cart)
    else getFb().then((fb) => fb?.saveCart(store.cart))
    emit()
}

export function removeFromCart(productId) {
    store.cart = store.cart.filter((i) => i.productId !== productId)
    if (!USE_FIREBASE) writeLocalStorageJSON(CART_KEY, store.cart)
    else getFb().then((fb) => fb?.saveCart(store.cart))
    emit()
}

export function clearCart() {
    store.cart = []
    if (!USE_FIREBASE) writeLocalStorageJSON(CART_KEY, store.cart)
    else getFb().then((fb) => fb?.saveCart(store.cart))
    emit()
}

/** Sync auth from Firebase user (called by auth listener). Uses Firestore profile when provided. */
export function setAuthFromFirebase(firebaseUser, profileFromDb) {
    const prev = store.auth
    if (!firebaseUser) {
        store.auth = { isAuthenticated: false, name: '', phone: '', email: '', city: '', district: '', khoroo: '', khoroolol: '', floor: '', building: '', door: '', uid: null, isAnonymous: false }
    } else {
        const fromDb = profileFromDb || {}
        store.auth = {
            isAuthenticated: true,
            name: fromDb.name || firebaseUser.displayName || prev?.name || firebaseUser.email?.split('@')[0] || 'User',
            phone: fromDb.phone || prev?.phone || firebaseUser.phoneNumber || '',
            email: fromDb.email || firebaseUser.email || prev?.email || '',
            city: fromDb.city ?? prev?.city ?? '',
            district: fromDb.district ?? prev?.district ?? '',
            khoroo: fromDb.khoroo ?? prev?.khoroo ?? '',
            khoroolol: fromDb.khoroolol ?? prev?.khoroolol ?? '',
            floor: fromDb.floor ?? prev?.floor ?? '',
            building: fromDb.building ?? prev?.building ?? '',
            door: fromDb.door ?? prev?.door ?? '',
            uid: firebaseUser.uid,
            isAnonymous: firebaseUser.isAnonymous || false,
        }
    }
    writeLocalStorageJSON(AUTH_KEY, store.auth)
    emit()
}

/** Legacy: for checkout when using guest/demo flow - kept for compatibility */
export function signIn(payload) {
    store.auth = {
        isAuthenticated: true,
        name: payload?.name || 'Зочин',
        phone: payload?.phone || '',
        email: payload?.email || '',
        uid: null,
        isAnonymous: true,
    }
    writeLocalStorageJSON(AUTH_KEY, store.auth)
    emit()
}

export function signOut() {
    store.auth = {
        isAuthenticated: false,
        name: '',
        phone: '',
        email: '',
        city: '',
        address: '',
        uid: null,
        isAnonymous: false,
    }
    writeLocalStorageJSON(AUTH_KEY, store.auth)
    emit()
}

export function updateProfile(payload) {
    store.auth = {
        ...store.auth,
        ...payload,
    }
    writeLocalStorageJSON(AUTH_KEY, store.auth)
    emit()
}

/* ─── Product views ─── */
export function trackProductView(productId) {
    store.productViews = {
        ...store.productViews,
        [productId]: (store.productViews[productId] || 0) + 1,
    }
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveProductViewIncrement(productId))
    emit()
}

export function getProductViews(productId) {
    return store.productViews[productId] || 0
}

export async function createOrder(payload) {
    const order = {
        id: payload.id || `ORD-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'New',
        ...payload,
    }

    /* ── Decrement product stock quantities (optimistic local update) ── */
    const prevProducts = store.adminProducts
    const items = order.items || []
    for (const line of items) {
        const product = store.adminProducts.find((p) => p.id === line.productId)
        if (product && (product.stockQuantity ?? 0) > 0) {
            const newQty = Math.max(0, (product.stockQuantity ?? 0) - line.quantity)
            store.adminProducts = store.adminProducts.map((p) =>
                p.id === line.productId
                    ? { ...p, stockQuantity: newQty, inStock: newQty > 0 }
                    : p
            )
        }
    }

    store.orders = [order, ...store.orders]

    /* ── Persist via atomic Cloud Function (transaction) or fallback ── */
    if (USE_FIREBASE) {
        try {
            let atomicErr = null
            try {
                const [{ getFunctions, httpsCallable }, { app }] = await Promise.all([
                    import('firebase/functions'),
                    import('../../firebase/init.js'),
                ])
                const functions = getFunctions(app, 'us-central1')
                const createOrderAtomic = httpsCallable(functions, 'createOrderAtomic')
                const orderData = { ...order }
                delete orderData.id
                await createOrderAtomic({
                    orderId: order.id,
                    orderData,
                    items: items.map((i) => ({ productId: i.productId, quantity: i.quantity || 1 })),
                })
            } catch (err) {
                atomicErr = err
                console.warn('[createOrder] Atomic order failed, falling back:', err?.message || err)
            }

            if (atomicErr) {
                const fb = await getFb()
                if (!fb?.saveOrder) {
                    throw atomicErr
                }
                await fb.saveOrder(order)
                // Stock sync failure should not drop an already-saved order.
                fb.saveProducts(store.adminProducts).catch((err) => {
                    console.warn('[createOrder] Product stock sync failed after fallback save:', err?.message || err)
                })
            }
        } catch (persistErr) {
            // Roll back optimistic local changes when persistent write fails.
            store.orders = store.orders.filter((o) => o.id !== order.id)
            store.adminProducts = prevProducts
            emit()
            throw persistErr
        }
    }

    /* ── Notify each store owner about the purchase ── */
    let storeIds = order.storeIds || (order.storeId ? [order.storeId] : [])
    if (storeIds.length === 0 && items.length) {
        storeIds = [...new Set(items.map((i) => i.storeId).filter(Boolean))]
    }
    const allProducts = store.adminProducts
    for (const sid of storeIds) {
        const storeUser = store.adminUsers.find((u) => u.storeId === sid)
        const storeProducts = items.filter((i) => i.storeId === sid)
        const productNames = storeProducts
            .map((i) => {
                const p = allProducts.find((pr) => pr.id === i.productId)
                return p ? p.title : i.productId
            })
            .join(', ')
        const customerName = order.customer?.name || 'Зочин'
        addAdminNotification({
            storeId: sid,
            storeName: storeUser?.storeName || sid,
            title: '🛒 Шинэ захиалга!',
            body: `${customerName} захиалга өглөө: ${productNames}`,
            orderId: order.id,
            type: 'purchase',
        })
    }

    /* ── Add client notification for order confirmation ── */
    addClientNotification({
        title: '✅ Захиалга баталгаажлаа!',
        body: `Таны ${order.id} захиалга амжилттай бүртгэгдлээ.`,
        orderId: order.id,
        type: 'order_created',
    })

    emit()
    return order
}

export function persistOrderPatch(orderId, patch) {
    const idx = store.orders.findIndex((o) => o.id === orderId)
    if (idx < 0) return { ok: false, error: 'not_found' }
    const updated = { ...store.orders[idx], ...patch }
    store.orders = store.orders.map((o) => (o.id === orderId ? updated : o))
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveOrderUpdate(orderId, patch))
    emit()
    return { ok: true, order: updated }
}

function staffStoreName(storeId) {
    const u = store.adminUsers.find((x) => x.storeId === storeId)
    return u?.storeName || storeId
}

export { deriveAggregateStatus, getFulfillments }

export function storeOwnerAcceptFulfillment(orderId, storeId, { isSuperAdmin, staffStoreId }) {
    if (!isSuperAdmin && staffStoreId !== storeId) return { ok: false, error: 'denied' }
    const order = store.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, error: 'not_found' }
    const f = getFulfillments(order)
    if (!f[storeId]) return { ok: false, error: 'no_fulfillment' }
    if (f[storeId].status !== 'New') return { ok: false, error: 'invalid_state' }
    const nextF = { ...f, [storeId]: { ...f[storeId], status: 'Accepted' } }
    const agg = deriveAggregateStatus({ ...order, fulfillments: nextF })
    return persistOrderPatch(orderId, { fulfillments: nextF, status: agg })
}

export function storeOwnerRequestRefund(orderId, storeId, { isSuperAdmin, staffStoreId }) {
    if (isSuperAdmin) return { ok: false, error: 'use_superadmin_refund' }
    if (staffStoreId !== storeId) return { ok: false, error: 'denied' }
    const order = store.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, error: 'not_found' }
    const rq = { ...(order.refundRequests || {}), [storeId]: true }
    const result = persistOrderPatch(orderId, { refundRequests: rq, refundStatus: 'Requested' })
    addAdminNotification({ storeId: '__superadmin__', storeName: 'SuperAdmin', title: '💰 Буцаалт хүсэлт', body: `${orderId} захиалгад буцаалт хүсэгдлээ.`, orderId, type: 'refund_request' })
    return result
}

/** Gold tier store owner marks fulfillment as "shipped" (international cargo sent) */
export function storeOwnerMarkShipped(orderId, storeId, { isSuperAdmin, staffStoreId }) {
    if (!isSuperAdmin && staffStoreId !== storeId) return { ok: false, error: 'denied' }
    const order = store.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, error: 'not_found' }
    const f = getFulfillments(order)
    if (!f[storeId]) return { ok: false, error: 'no_fulfillment' }
    if (f[storeId].status !== 'Accepted') return { ok: false, error: 'invalid_state' }
    const nextF = { ...f, [storeId]: { ...f[storeId], status: 'shipped', shippedAt: new Date().toISOString() } }
    return persistOrderPatch(orderId, { fulfillments: nextF })
}

/** Store owner manually marks their fulfillment as "Delivered" */
export function storeOwnerMarkDelivered(orderId, storeId, { isSuperAdmin, staffStoreId }) {
    if (!isSuperAdmin && staffStoreId !== storeId) return { ok: false, error: 'denied' }
    const order = store.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, error: 'not_found' }
    const f = getFulfillments(order)
    if (!f[storeId]) return { ok: false, error: 'no_fulfillment' }
    const cur = f[storeId].status
    if (cur === 'Delivered' || cur === 'Bunny') return { ok: false, error: 'invalid_state' }
    const nextF = {
        ...f,
        [storeId]: {
            ...f[storeId],
            status: 'Delivered',
            deliveredAt: new Date().toISOString(),
            deliveryMethod: 'manual',
        },
    }
    const agg = deriveAggregateStatus({ ...order, fulfillments: nextF })
    const result = persistOrderPatch(orderId, { fulfillments: nextF, status: agg })
    addClientNotification(
        {
            title: '📦 Хүргэлт баталгаажлаа',
            body: `${staffStoreName(storeId)} дэлгүүрийн бараа хүргэгдлээ.`,
            orderId,
            type: 'partial_delivery',
        },
        { targetUserId: order.userId },
    )
    return result
}

export function superadminMarkRefunded(orderId) {
    const o = store.orders.find((x) => x.id === orderId)
    if (!o) return { ok: false, error: 'not_found' }
    const result = persistOrderPatch(orderId, { refundStatus: 'Refunded', status: 'Refunded' })
    addClientNotification(
        {
            title: '💰 Буцаалт хийгдлээ',
            body: `Таны ${orderId} захиалгын мөнгө буцаагдлаа.`,
            orderId,
            type: 'status_change',
            newStatus: 'Refunded',
        },
        { targetUserId: o.userId },
    )
    return result
}

export function superadminDeliverAll(orderId) {
    const o = store.orders.find((x) => x.id === orderId)
    if (!o) return { ok: false, error: 'not_found' }
    const f = getFulfillments(o)
    const ids = uniqueStoreIdsFromOrder(o)
    const next = { ...f }
    const now = new Date().toISOString()
    for (const sid of ids) {
        next[sid] = { ...next[sid], status: 'Delivered', deliveredAt: now, deliveredBySuperadmin: true, deliveryMethod: 'manual' }
    }
    const agg = deriveAggregateStatus({ ...o, fulfillments: next })
    const result = persistOrderPatch(orderId, { fulfillments: next, status: agg })
    addClientNotification(
        {
            title: '📦 Бүх бараа хүргэгдлээ',
            body: `Таны ${orderId} захиалгын бүх бараа хүргэгдсэн.`,
            orderId,
            type: 'status_change',
            newStatus: 'Delivered',
        },
        { targetUserId: o.userId },
    )
    return result
}

export function superadminMarkFulfillmentDelivered(orderId, storeId) {
    const order = store.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, error: 'not_found' }
    const f = getFulfillments(order)
    const nextF = {
        ...f,
        [storeId]: {
            ...f[storeId],
            status: 'Delivered',
            deliveredAt: new Date().toISOString(),
            deliveredBySuperadmin: true,
            deliveryMethod: 'manual',
        },
    }
    const agg = deriveAggregateStatus({ ...order, fulfillments: nextF })
    const result = persistOrderPatch(orderId, { fulfillments: nextF, status: agg })
    // Notify store owner
    const storeUser = store.adminUsers.find((u) => u.storeId === storeId)
    addAdminNotification({
        storeId,
        storeName: storeUser?.storeName || storeId,
        title: '📦 Хүргэлт баталгаажлаа',
        body: `${orderId} захиалга хүргэгдсэн гэж тэмдэглэгдлээ.`,
        orderId,
        type: 'info',
    })
    return result
}

/** Mark a specific store's fulfillment as Bunny (fully completed — payment sent, everything done) */
export function superadminMarkFulfillmentBunny(orderId, storeId) {
    const order = store.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, error: 'not_found' }
    const f = getFulfillments(order)
    const nextF = {
        ...f,
        [storeId]: {
            ...f[storeId],
            status: 'Bunny',
            bunnyAt: new Date().toISOString(),
            bunnyBySuperadmin: true,
        },
    }
    const agg = deriveAggregateStatus({ ...order, fulfillments: nextF })
    const result = persistOrderPatch(orderId, { fulfillments: nextF, status: agg })
    // Notify store owner
    const storeUser = store.adminUsers.find((u) => u.storeId === storeId)
    addAdminNotification({
        storeId,
        storeName: storeUser?.storeName || storeId,
        title: '✅ Bunny баталгаажлаа',
        body: `${orderId} захиалгын төлбөр шилжүүлэгдлээ.`,
        orderId,
        type: 'bunny_confirmed',
    })
    return result
}

/** Mark the entire order as Bunny (all stores completed) */
export function superadminMarkOrderBunny(orderId) {
    const o = store.orders.find((x) => x.id === orderId)
    if (!o) return { ok: false, error: 'not_found' }
    const f = getFulfillments(o)
    const ids = uniqueStoreIdsFromOrder(o)
    const next = { ...f }
    const now = new Date().toISOString()
    for (const sid of ids) {
        next[sid] = { ...next[sid], status: 'Bunny', bunnyAt: now, bunnyBySuperadmin: true }
    }
    const result = persistOrderPatch(orderId, { fulfillments: next, status: 'Bunny' })
    // Notify each store owner
    for (const sid of ids) {
        const storeUser = store.adminUsers.find((u) => u.storeId === sid)
        addAdminNotification({
            storeId: sid,
            storeName: storeUser?.storeName || sid,
            title: '✅ Bunny баталгаажлаа',
            body: `${orderId} захиалгын төлбөр шилжүүлэгдлээ.`,
            orderId,
            type: 'bunny_confirmed',
        })
    }
    // Notify customer
    addClientNotification(
        {
            title: '✅ Захиалга бүрэн дууслаа',
            body: `Таны ${orderId} захиалга амжилттай дууслаа.`,
            orderId,
            type: 'status_change',
            newStatus: 'Bunny',
        },
        { targetUserId: o.userId },
    )
    return result
}

function markFulfillmentDelivered(orderId, order, storeId, staffUid, deliveryMethod = 'auto') {
    const f = getFulfillments(order)
    if (f[storeId]?.status === 'Delivered') return { ok: true, already: true }
    const nextF = {
        ...f,
        [storeId]: {
            ...f[storeId],
            status: 'Delivered',
            deliveredAt: new Date().toISOString(),
            deliveredByUid: staffUid || null,
            deliveryMethod,
        },
    }
    const agg = deriveAggregateStatus({ ...order, fulfillments: nextF })
    persistOrderPatch(orderId, { fulfillments: nextF, status: agg })
    addAdminNotification({
        storeId: '__superadmin__',
        storeName: 'SuperAdmin',
        title: '📦 Захиалга хүргэгдлээ',
        body: `${orderId} захиалга хүргэгдсэн.`,
        orderId,
        type: 'order_delivered',
    })
    addClientNotification(
        {
            title: '📦 Хүргэлт баталгаажлаа',
            body: `${staffStoreName(storeId)} дэлгүүрийн бараа хүргэгдлээ.`,
            orderId: order.id,
            type: 'partial_delivery',
        },
        { targetUserId: order.userId },
    )
    return { ok: true }
}

/**
 * @param storeIdParam - Legacy QR: store id in URL. Unified QR: omit or null; uses staffStoreId. Superadmin + multi-store: pass target store id in URL (?store=).
 */
export function confirmDeliveryWithToken(orderId, storeIdParam, token, { isSuperAdmin, staffStoreId, staffUid }) {
    const order = store.orders.find((o) => o.id === orderId)
    if (!order) return { ok: false, error: 'not_found' }
    const tokenStr = String(token || '')
    const ids = uniqueStoreIdsFromOrder(order)

    /* Unified proof token — same QR for customer; scanner’s store (or explicit ?store= for superadmin) marks only that fulfillment. */
    if (order.deliveryProofToken && tokenStr === String(order.deliveryProofToken)) {
        let targetStore = null
        if (isSuperAdmin) {
            targetStore = storeIdParam || null
            if (!targetStore && ids.length === 1) targetStore = ids[0]
            if (!targetStore) return { ok: false, error: 'superadmin_pick_store' }
        } else {
            targetStore = staffStoreId
        }
        if (!targetStore || !ids.includes(targetStore)) return { ok: false, error: 'wrong_store' }
        if (!isSuperAdmin && staffStoreId !== targetStore) return { ok: false, error: 'wrong_store' }
        return markFulfillmentDelivered(orderId, order, targetStore, staffUid)
    }

    /* Legacy: per-store token in URL */
    if (!storeIdParam) return { ok: false, error: 'invalid_token' }
    if (!isSuperAdmin && staffStoreId !== storeIdParam) return { ok: false, error: 'wrong_store' }
    const expected = order.deliveryTokens?.[storeIdParam]
    if (!expected || tokenStr !== String(expected)) return { ok: false, error: 'invalid_token' }
    return markFulfillmentDelivered(orderId, order, storeIdParam, staffUid)
}

/**
 * Legacy flat status + superadmin shortcuts. Unified orders: use detail page or QR scan.
 */
export function updateOrderStatus(orderId, status, meta = {}) {
    const { isSuperAdmin } = meta
    if (status === 'Cancelled') return { ok: false, error: 'cancelled_disabled' }

    const oldOrder = store.orders.find((o) => o.id === orderId)
    if (!oldOrder) return { ok: false, error: 'not_found' }

    if (oldOrder.fulfillments && typeof oldOrder.fulfillments === 'object') {
        if (status === 'Refunded' && isSuperAdmin) return superadminMarkRefunded(orderId)
        if (status === 'Delivered' && isSuperAdmin) return superadminDeliverAll(orderId)
        if (status === 'Bunny' && isSuperAdmin) return superadminMarkOrderBunny(orderId)
        return { ok: false, error: 'use_order_detail' }
    }

    store.orders = store.orders.map((order) => (order.id === orderId ? { ...order, status } : order))
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveOrderUpdate(orderId, { status }))

    if (oldOrder && oldOrder.status !== status) {
        const statusMn = { New: 'Шинэ', Processing: 'Бэлтгэж байна', Shipped: 'Илгээсэн', Delivered: 'Хүргэгдсэн', Refunded: 'Буцаагдсан', Bunny: 'Bunny', Cancelled: 'Цуцлагдсан' }
        addClientNotification(
            {
                title: `📦 Захиалгын төлөв өөрчлөгдлөө`,
                body: `Таны ${orderId} захиалга "${statusMn[status] || status}" болсон.`,
                orderId,
                type: 'status_change',
                newStatus: status,
            },
            { targetUserId: oldOrder.userId },
        )
    }

    emit()
    return { ok: true }
}

export function deleteOrder(orderId) {
    store.orders = store.orders.filter((order) => order.id !== orderId)
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveOrderDelete(orderId))
    emit()
}

export function clearOrders() {
    const ids = store.orders.map((o) => o.id)
    store.orders = []
    emit()
    if (USE_FIREBASE && ids.length > 0) {
        getFb().then((fb) => {
            ids.forEach((id) => fb?.saveOrderDelete?.(id))
        })
    }
}

export function upsertAdminProduct(payload) {
    if (payload?.id && store.adminProducts.some((product) => product.id === payload.id)) {
        const oldProduct = store.adminProducts.find((p) => p.id === payload.id)
        // If a store owner (not superadmin) edits product fields, reset approval to pending
        const isApprovalAction = payload.approvalStatus && Object.keys(payload).filter(k => k !== 'id').length === 1
        const isStoreOwnerEdit = !isApprovalAction && store.adminSession?.role !== 'superadmin'
        const needsReApproval = isStoreOwnerEdit && oldProduct?.approvalStatus === 'approved'
        store.adminProducts = store.adminProducts.map((product) => (
            product.id === payload.id
                ? { ...product, ...payload, ...(needsReApproval ? { approvalStatus: 'pending' } : {}) }
                : product
        ))
        // Notify store owner when product is approved or rejected by superadmin
        if (payload.approvalStatus && oldProduct && oldProduct.approvalStatus !== payload.approvalStatus) {
            const storeOwner = store.adminUsers.find((u) => u.storeId === oldProduct.storeId)
            if (payload.approvalStatus === 'approved') {
                addAdminNotification({
                    storeId: oldProduct.storeId,
                    storeName: storeOwner?.storeName || oldProduct.storeId,
                    title: '✅ Бүтээгдэхүүн зөвшөөрөгдлөө',
                    body: `"${oldProduct.title}" бүтээгдэхүүн зөвшөөрөгдөж, дэлгүүрт харагдаж эхэллээ.`,
                    type: 'product_approved',
                })
            } else if (payload.approvalStatus === 'rejected') {
                addAdminNotification({
                    storeId: oldProduct.storeId,
                    storeName: storeOwner?.storeName || oldProduct.storeId,
                    title: '❌ Бүтээгдэхүүн татгалзагдлаа',
                    body: `"${oldProduct.title}" бүтээгдэхүүн татгалзагдлаа. Засварлаад дахин оруулна уу.`,
                    type: 'product_rejected',
                })
            }
        }
        // Notify superadmin when store owner edits an approved product (needs re-approval)
        if (needsReApproval) {
            const ownerName = store.adminSession?.name || store.adminSession?.storeName || 'Дэлгүүр'
            addAdminNotification({
                storeId: '__superadmin__',
                storeName: ownerName,
                title: '✏️ Бүтээгдэхүүн засварлагдлаа — хянах хэрэгтэй',
                body: `${ownerName} "${oldProduct.title}" бүтээгдэхүүнийг засварлалаа. Дахин зөвшөөрөх эсвэл татгалзах шаардлагатай.`,
                type: 'product_pending_approval',
            })
        }
    } else {
        /* ── Tier product-limit check ── */
        const currentSession = store.adminSession
        if (currentSession?.role === 'admin' && currentSession?.storeId) {
            const plan = TIER_PLANS[currentSession.tier || 'free'] || TIER_PLANS.free
            if (plan.maxProducts !== -1) {
                const count = store.adminProducts.filter((p) => p.storeId === currentSession.storeId).length
                if (count >= plan.maxProducts) {
                    return { ok: false, error: `Your ${plan.name} plan allows up to ${plan.maxProducts} products. Upgrade your tier to add more.` }
                }
            }
        }
        const stockQty = Number(payload?.stockQuantity ?? 0)
        const newProduct = {
            id: payload?.id || `p-${Date.now()}`,
            storeId: payload?.storeId || store.adminSession?.storeId || 'store-1',
            title: payload?.title || 'New product',
            brand: payload?.brand || 'Brand',
            category: payload?.category || 'Accessories',
            price: Number(payload?.price || 0),
            originalPrice: payload?.originalPrice ? Number(payload.originalPrice) : 0,
            rating: Number(payload?.rating || 0),
            inStock: stockQty > 0,
            productType: payload?.productType || 'ready',
            orderDays: payload?.productType === 'order' ? Number(payload?.orderDays || 7) : 0,
            stockQuantity: stockQty,
            colors: Array.isArray(payload?.colors) ? payload.colors : [],
            sizes: Array.isArray(payload?.sizes) ? payload.sizes : [],
            image: payload?.image || '',
            thumbnail: payload?.thumbnail || payload?.image || '',
            images: Array.isArray(payload?.images) ? payload.images : [],
            description: payload?.description || '',
            createdAt: new Date().toISOString(),
            approvalStatus: payload?.approvalStatus || (store.adminSession?.role === 'superadmin' ? 'approved' : 'pending'),
            ...(Array.isArray(payload?.variants) && payload.variants.length > 0 ? { variants: payload.variants } : {}),
            ...(payload?.linkUrl != null ? { linkUrl: payload.linkUrl } : {}),
            ...(payload?.productCode != null ? { productCode: payload.productCode } : {}),
            isDraft: payload?.isDraft ?? false,
        }
        store.adminProducts = [newProduct, ...store.adminProducts]
        // Notify superadmin when store owner creates a product needing approval
        if (newProduct.approvalStatus === 'pending') {
            const ownerName = store.adminSession?.name || store.adminSession?.storeName || 'Дэлгүүр'
            addAdminNotification({
                storeId: '__superadmin__',
                storeName: ownerName,
                title: '🆕 Шинэ бүтээгдэхүүн хянах хэрэгтэй',
                body: `${ownerName} "${newProduct.title}" бүтээгдэхүүн нэмлээ. Зөвшөөрөх эсвэл татгалзах шаардлагатай.`,
                type: 'product_pending_approval',
            })
        }
    }
    if (USE_FIREBASE) {
        const product = store.adminProducts.find((p) => p.id === payload?.id) || store.adminProducts[0]
        if (product) getFb().then((fb) => fb?.saveSingleProduct(product))
    }
    emit()
    return { ok: true }
}

export function deleteAdminProduct(productId) {
    store.adminProducts = store.adminProducts.filter((product) => product.id !== productId)
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveSingleProductDelete(productId))
    emit()
}

export function resetAdminProducts() {
    store.adminProducts = []
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveDeleteAllProducts())
    emit()
}

export function upsertAdminCategory(payload) {
    if (payload?.id && store.adminCategories.some((category) => category.id === payload.id)) {
        store.adminCategories = store.adminCategories.map((category) => (
            category.id === payload.id
                ? { ...category, ...payload }
                : category
        ))
    } else {
        const name = payload?.name || 'New Category'
        const newCategory = {
            id: `cat-${Date.now()}`,
            name,
            slug: payload?.slug || name.toLowerCase().replace(/\s+/g, '-'),
            description: payload?.description || '',
        }
        store.adminCategories = [newCategory, ...store.adminCategories]
    }
    if (USE_FIREBASE) {
        const cat = store.adminCategories.find((c) => c.id === payload?.id) || store.adminCategories[0]
        if (cat) getFb().then((fb) => fb?.saveSingleCategory(cat))
    }
    emit()
}

export function deleteAdminCategory(categoryId) {
    const category = store.adminCategories.find((item) => item.id === categoryId)
    store.adminCategories = store.adminCategories.filter((item) => item.id !== categoryId)
    if (category) {
        const affectedProducts = store.adminProducts.filter((p) => p.category === category.name)
        store.adminProducts = store.adminProducts.map((product) => (
            product.category === category.name
                ? { ...product, category: 'Accessories' }
                : product
        ))
        if (USE_FIREBASE) {
            getFb().then((fb) => {
                affectedProducts.forEach((p) => {
                    const updated = store.adminProducts.find((pr) => pr.id === p.id)
                    if (updated) fb?.saveSingleProduct(updated)
                })
            })
        }
    }
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveSingleCategoryDelete(categoryId))
    emit()
}

export function resetAdminCategories() {
    store.adminCategories = []
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveDeleteAllCategories())
    emit()
}

export function toggleWishlist(productId) {
    if (store.wishlist.includes(productId)) {
        store.wishlist = store.wishlist.filter((id) => id !== productId)
    } else {
        store.wishlist = [...store.wishlist, productId]
    }
    if (!USE_FIREBASE) writeLocalStorageJSON(WISHLIST_KEY, store.wishlist)
    else getFb().then((fb) => fb?.saveWishlist(store.wishlist))
    emit()
}

export function isInWishlist(productId) {
    return store.wishlist.includes(productId)
}

export function getCounts() {
    const cartCount = store.cart.reduce((sum, i) => sum + i.quantity, 0)
    const wishlistCount = store.wishlist.length
    return { cartCount, wishlistCount }
}

/* ─── Admin session (Firebase Auth + Firestore staff profile; in-memory only) ─── */

export function setAdminSessionFromStaffProfile(profile) {
    if (!profile) return
    const roleRaw = (profile.role || '').toString().toLowerCase()
    const role = roleRaw === 'superadmin' ? 'superadmin' : roleRaw === 'admin' ? 'admin' : null
    if (!role) return
    store.adminSession = {
        userId: profile.id,
        role,
        storeId: profile.storeId ?? null,
        storeName: profile.storeName ?? null,
        storeImage: profile.storeImage || null,
        storeBannerImage: profile.storeBannerImage || null,
        tier: profile.tier || null,
        name: profile.name || '',
        username: profile.username || profile.loginEmail?.split('@')[0] || 'staff',
        deliveryFree: profile.deliveryFree ?? true,
        deliveryPrice: profile.deliveryPrice || 0,
        bankAccount: profile.bankAccount || '',
        bankName: profile.bankName || '',
        storeEmail: profile.storeEmail || '',
        storePhone: profile.storePhone || '',
        commission: profile.commission ?? null,
        tierStartDate: profile.tierStartDate || null,
        tierEndDate: profile.tierEndDate || null,
        showPhoneOnStore: profile.showPhoneOnStore ?? false,
        qpayMerchantId: profile.qpayMerchantId || null,
        qpayMerchant: profile.qpayMerchant || null,
    }
    emit()
}

export function clearAdminSession() {
    store.adminSession = null
    emit()
}

/** @deprecated Legacy local login removed — use Firebase on /admin */
export function adminLogin() {
    return { ok: false, error: 'Use your owner email and password (Firebase).' }
}

export function adminLogout() {
    clearAdminSession()
}

export function getAdminSession() {
    return store.adminSession
}

/* ─── Admin user CRUD (SuperAdmin only) ─── */

/** Merge a staff profile into local adminUsers after Firestore write (no full-array save). */
export function mergeStaffUserIntoLocalStore(profile) {
    if (!profile?.id) return
    const idx = store.adminUsers.findIndex((u) => u.id === profile.id)
    if (idx >= 0) {
        store.adminUsers = store.adminUsers.map((u) => (u.id === profile.id ? { ...u, ...profile } : u))
    } else {
        store.adminUsers = [...store.adminUsers, profile]
    }
    emit()
}

export function createAdminUser(payload) {
    const storeId = `store-${Date.now()}`
    const newUser = {
        id: `admin-${Date.now()}`,
        username: payload.username || '',
        name: payload.name || 'Store Owner',
        role: 'admin',
        storeId,
        storeName: payload.storeName || 'New Store',
        tier: payload.tier || 'free',
        loginEmail: (payload.loginEmail || '').toLowerCase().trim() || null,
    }
    store.adminUsers = [...store.adminUsers, newUser]
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveUsers(store.adminUsers))
    emit()
    return newUser
}

export function updateAdminUser(userId, payload) {
    const oldUser = store.adminUsers.find((u) => u.id === userId)
    if (oldUser && payload.tier && payload.tier !== (oldUser.tier || 'free')) {
        store.tierChangeHistory = [...store.tierChangeHistory, {
            id: `tc-${Date.now()}`,
            userId,
            userName: oldUser.name || oldUser.username || '',
            storeName: oldUser.storeName || '',
            fromTier: oldUser.tier || 'free',
            toTier: payload.tier,
            changedAt: new Date().toISOString(),
        }]
        if (USE_FIREBASE) getFb().then((fb) => fb?.saveTierChangeHistory?.(store.tierChangeHistory))
    }
    store.adminUsers = store.adminUsers.map((u) =>
        u.id === userId ? { ...u, ...payload } : u
    )
    /* Keep session in sync if the current user was updated */
    if (store.adminSession?.userId === userId) {
        const updated = store.adminUsers.find((u) => u.id === userId)
        if (updated) {
            store.adminSession = { ...store.adminSession, storeName: updated.storeName, storeImage: updated.storeImage || null, storeBannerImage: updated.storeBannerImage || null, tier: updated.tier || null, name: updated.name, username: updated.username, deliveryFree: updated.deliveryFree ?? true, deliveryPrice: updated.deliveryPrice || 0, bankAccount: updated.bankAccount || '', storeEmail: updated.storeEmail || '', storePhone: updated.storePhone || '', bankName: updated.bankName || '', commission: updated.commission ?? null, tierStartDate: updated.tierStartDate || null, tierEndDate: updated.tierEndDate || null, showPhoneOnStore: updated.showPhoneOnStore ?? false, qpayMerchantId: updated.qpayMerchantId || null, qpayMerchant: updated.qpayMerchant || null }
        }
    }
    // Draft/restore products when tier changes
    if (payload.tier && oldUser) {
        const oldTier = oldUser.tier || 'free'
        const newTier = payload.tier
        if (newTier !== oldTier) {
            const storeIdForDraft = oldUser.storeId
            if (storeIdForDraft) {
                if (newTier === 'free') {
                    // Downgrade to free: keep 2 most-recent products active, draft the rest
                    const storeProds = store.adminProducts
                        .filter((p) => p.storeId === storeIdForDraft)
                        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                    const keepIds = new Set(storeProds.slice(0, 2).map((p) => p.id))
                    store.adminProducts = store.adminProducts.map((p) => {
                        if (p.storeId !== storeIdForDraft) return p
                        const shouldDraft = !keepIds.has(p.id)
                        if (shouldDraft === (p.isDraft === true)) return p
                        const updated = { ...p, isDraft: shouldDraft }
                        if (USE_FIREBASE) getFb().then((fb) => fb?.saveSingleProduct(updated))
                        return updated
                    })
                } else if (oldTier === 'free') {
                    // Upgrade from free: restore all drafted products for this store
                    store.adminProducts = store.adminProducts.map((p) => {
                        if (p.storeId !== storeIdForDraft || !p.isDraft) return p
                        const updated = { ...p, isDraft: false }
                        if (USE_FIREBASE) getFb().then((fb) => fb?.saveSingleProduct(updated))
                        return updated
                    })
                }
            }
        }
    }
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveUsers(store.adminUsers))
    emit()
}

export function updateStoreProfile(payload) {
    const session = store.adminSession
    if (!session || session.role !== 'admin') return { ok: false, error: 'Only store owners can update profile.' }
    updateAdminUser(session.userId, payload)
    return { ok: true }
}

export function buyTierForCurrentStore(tierId, durationMonths = 1) {
    const session = store.adminSession
    if (!session || session.role !== 'admin') return { ok: false, error: 'Only store owners can buy tiers.' }
    if (!TIER_PLANS[tierId]) return { ok: false, error: 'Invalid tier.' }
    const now = new Date()
    const endDate = new Date(now)
    endDate.setMonth(endDate.getMonth() + durationMonths)
    updateAdminUser(session.userId, {
        tier: tierId,
        tierStartDate: now.toISOString().slice(0, 10),
        tierEndDate: endDate.toISOString().slice(0, 10),
        tierDurationMonths: durationMonths,
    })
    return { ok: true }
}

export function renewTierForCurrentStore(durationMonths = 1) {
    const session = store.adminSession
    if (!session || session.role !== 'admin') return { ok: false, error: 'Only store owners can renew tiers.' }
    const currentTier = session.tier || 'free'
    if (!TIER_PLANS[currentTier] || TIER_PLANS[currentTier].price === 0) return { ok: false, error: 'Cannot renew free tier.' }
    // Extend from current end date if it's in the future, otherwise from today
    const now = new Date()
    let startFrom = now
    if (session.tierEndDate) {
        const currentEnd = new Date(session.tierEndDate + 'T23:59:59')
        if (currentEnd > now) startFrom = currentEnd
    }
    const endDate = new Date(startFrom)
    endDate.setMonth(endDate.getMonth() + durationMonths)
    updateAdminUser(session.userId, {
        tier: currentTier,
        tierStartDate: session.tierStartDate || now.toISOString().slice(0, 10),
        tierEndDate: endDate.toISOString().slice(0, 10),
        tierDurationMonths: (session.tierDurationMonths || 0) + durationMonths,
    })
    return { ok: true }
}

export function deleteAdminUser(userId) {
    store.adminUsers = store.adminUsers.filter((u) => u.id !== userId)
    if (USE_FIREBASE) getFb().then((fb) => {
        fb?.deleteStoreUser(userId)
    })
    emit()
}

export function resetAdminUsers() {
    store.adminUsers = []
    store.adminSession = null
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveUsers(store.adminUsers))
    emit()
}

/* ─── Discount codes CRUD ─── */

export function upsertAdminDiscount(payload) {
    if (payload?.id && store.adminDiscounts.some((d) => d.id === payload.id)) {
        store.adminDiscounts = store.adminDiscounts.map((d) =>
            d.id === payload.id ? { ...d, ...payload } : d
        )
    } else {
        const newDiscount = {
            id: `disc-${Date.now()}`,
            code: (payload?.code || 'CODE').toUpperCase().replace(/\s+/g, ''),
            storeId: payload?.storeId || store.adminSession?.storeId || 'store-1',
            discountValue: Number(payload?.discountValue || 0),
            quantity: Number(payload?.quantity || 1),
            usedCount: 0,
            active: payload?.active !== false,
            startDate: payload?.startDate || new Date().toISOString().slice(0, 10),
            expireDate: payload?.expireDate || '',
            createdAt: new Date().toISOString(),
        }
        store.adminDiscounts = [newDiscount, ...store.adminDiscounts]
    }
    if (USE_FIREBASE) getFb().then((fb) => { store.adminDiscounts.forEach((d) => fb?.saveDiscount(d)) })
    emit()
}

export function deleteAdminDiscount(discountId) {
    store.adminDiscounts = store.adminDiscounts.filter((d) => d.id !== discountId)
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveDiscountDelete(discountId))
    emit()
}

export function resetAdminDiscounts() {
    store.adminDiscounts = []
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveDeleteAllDiscounts())
    emit()
}

export function validateDiscountCode(code) {
    const today = new Date().toISOString().slice(0, 10)
    const disc = store.adminDiscounts.find(
        (d) => d.code === code.toUpperCase().trim() && d.active && (d.quantity - d.usedCount) > 0
            && (!d.startDate || d.startDate <= today)
            && (!d.expireDate || d.expireDate >= today)
    )
    return disc || null
}

export function useDiscountCode(discountId) {
    store.adminDiscounts = store.adminDiscounts.map((d) =>
        d.id === discountId ? { ...d, usedCount: d.usedCount + 1 } : d
    )
    if (USE_FIREBASE) getFb().then((fb) => { store.adminDiscounts.forEach((d) => fb?.saveDiscount(d)) })
    emit()
}

/* ─── Highlights: one highlighted product per store ─── */

/** Set a product as the highlighted product for a given store (replaces any previous) */
export function setHighlightProduct(storeId, productId) {
    store.highlights = { ...store.highlights, [storeId]: productId }
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveHighlights(store.highlights))
    emit()
}

/** Remove the highlight for a given store */
export function removeHighlightProduct(storeId) {
    const copy = { ...store.highlights }
    delete copy[storeId]
    store.highlights = copy
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveHighlights(store.highlights))
    emit()
}

/* ─── Banners (SuperAdmin only) ─── */

export function addBanner(payload) {
    const banner = {
        id: payload?.id || `banner-${Date.now()}`,
        image: payload?.image || '',
        title: payload?.title || '',
        order: payload?.order ?? store.banners.length,
        startDate: payload?.startDate || new Date().toISOString().slice(0, 10),
        endDate: payload?.endDate || '',
        status: payload?.status || 'active',
        submittedBy: payload?.submittedBy || null,
        submittedByStore: payload?.submittedByStore || null,
        submittedAt: payload?.submittedAt || new Date().toISOString(),
    }
    if (payload?.enabled !== undefined) banner.enabled = payload.enabled
    store.banners = [...store.banners, banner]
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveBannerAdd(banner))
    emit()
}

export function updateBanner(id, payload) {
    store.banners = store.banners.map((b) =>
        b.id === id ? { ...b, ...payload } : b
    )
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveBannerUpdate(id, payload))
    emit()
}

export function deleteBanner(id) {
    const victim = store.banners.find((b) => b.id === id)
    const imageUrl = victim?.image
    store.banners = store.banners.filter((b) => b.id !== id)
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveBannerDelete(id, imageUrl))
    emit()
}

export function reorderBanners(banners) {
    const systemBanners = store.banners.filter((b) => b.id === '__home_banner_toggle__')
    const ordered = banners.map((b, i) => ({ ...b, order: i }))
    store.banners = [...systemBanners, ...ordered]
    if (USE_FIREBASE) getFb().then((fb) => { ordered.forEach((b, i) => fb?.saveBannerUpdate(b.id, { order: i })) })
    emit()
}

/* ─── Notifications (SuperAdmin only) ─── */

export function addNotification(payload) {
    const notification = {
        id: `notif-${Date.now()}`,
        title: payload?.title || '',
        body: payload?.body || '',
        createdAt: new Date().toISOString(),
        sentBy: store.adminSession?.name || 'SuperAdmin',
    }
    store.notifications = [notification, ...store.notifications]
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveNotificationAdd(notification))
    emit()
    return notification
}

export function deleteNotification(id) {
    store.notifications = store.notifications.filter((n) => n.id !== id)
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveNotificationDelete(id))
    emit()
}

export function clearAllNotifications() {
    store.notifications = []
    emit()
}

/* ─── Admin Notifications (per-store purchase alerts) ─── */

export function addAdminNotification(payload) {
    const notif = {
        id: `admin-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        storeId: payload?.storeId || null,
        storeName: payload?.storeName || '',
        title: payload?.title || '',
        body: payload?.body || '',
        orderId: payload?.orderId || null,
        type: payload?.type || 'info',
        read: false,
        createdAt: new Date().toISOString(),
    }
    store.adminNotifications = [notif, ...store.adminNotifications]
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveAdminNotificationAdd(notif))
    emit()
    return notif
}

export function markAdminNotificationRead(id) {
    store.adminNotifications = store.adminNotifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
    )
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveAdminNotificationRead(id))
    emit()
}

export function clearAdminNotifications(storeId) {
    if (storeId) {
        store.adminNotifications = store.adminNotifications.filter((n) => n.storeId !== storeId)
    } else {
        store.adminNotifications = []
    }
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveClearAdminNotifications(storeId || null))
    emit()
}

/* ─── Client Notifications (order status alerts for shoppers) ─── */

export function addClientNotification(payload, options = {}) {
    const notif = {
        id: `client-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: payload?.title || '',
        body: payload?.body || '',
        orderId: payload?.orderId || null,
        type: payload?.type || 'info',
        newStatus: payload?.newStatus || null,
        read: false,
        createdAt: new Date().toISOString(),
    }
    const targetUserId = options?.targetUserId
    if (!targetUserId) {
        store.clientNotifications = [notif, ...store.clientNotifications]
    }
    if (USE_FIREBASE) {
        getFb().then((fb) => fb?.saveClientNotificationAdd(notif, targetUserId))
    }
    emit()
    return notif
}

export function markClientNotificationRead(id) {
    store.clientNotifications = store.clientNotifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
    )
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveClientNotificationRead(id))
    emit()
}

export function clearClientNotifications() {
    store.clientNotifications = []
    if (USE_FIREBASE) getFb().then((fb) => fb?.saveClientNotificationsClear())
    emit()
}