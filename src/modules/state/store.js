import { products as seedProducts } from '../data/products.js'

const CART_KEY = 'wb_cart'
const WISHLIST_KEY = 'wb_wishlist'
const AUTH_KEY = 'wb_auth'
const ORDERS_KEY = 'wb_orders'
const ADMIN_PRODUCTS_KEY = 'wb_admin_products'
const ADMIN_CATEGORIES_KEY = 'wb_admin_categories'
const ADMIN_USERS_KEY = 'wb_admin_users'
const ADMIN_SESSION_KEY = 'wb_admin_session'
const ADMIN_DISCOUNTS_KEY = 'wb_admin_discounts'

/* ─── Tier plans ─── */
export const TIER_PLANS = {
    free: { id: 'free', name: 'Free', price: 0, maxProducts: 2, color: 'slate', benefits: ['Up to 2 products', 'Basic dashboard', 'Community support'] },
    bronze: { id: 'bronze', name: 'Bronze', price: 19, maxProducts: 10, color: 'amber', benefits: ['Up to 10 products', 'Discount code tools', 'Priority listing boost', 'Email support'] },
    silver: { id: 'silver', name: 'Silver', price: 49, maxProducts: 20, color: 'slate', benefits: ['Up to 20 products', 'Advanced analytics', 'Priority support', 'Featured store badge'] },
    gold: { id: 'gold', name: 'Gold', price: 99, maxProducts: 100, color: 'yellow', benefits: ['Up to 100 products', 'Exclusive privileges', 'Top placement', 'VIP 24/7 support', 'Custom store theme'] },
}

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

/* ─── Default admin users (SuperAdmin + demo Store Owners) ─── */
function getDefaultAdminUsers() {
    return [
        { id: 'sa-1', username: 'superadmin', password: 'superadmin', name: 'Super Admin', role: 'superadmin', storeId: null, storeName: null, tier: null },
        { id: 'admin-1', username: 'admin1', password: 'admin1', name: 'Admin One', role: 'admin', storeId: 'store-1', storeName: 'Fashion Hub', tier: 'free' },
        { id: 'admin-2', username: 'admin2', password: 'admin2', name: 'Admin Two', role: 'admin', storeId: 'store-2', storeName: 'TechWorld', tier: 'free' },
    ]
}

function getDefaultAdminProducts() {
    return seedProducts.map((p) => ({ ...p }))
}

function getDefaultAdminCategories() {
    return [
        { id: 'cat-001', name: 'Apparel', slug: 'apparel', description: 'Clothing and essentials' },
        { id: 'cat-002', name: 'Shoes', slug: 'shoes', description: 'Sneakers, boots and more' },
        { id: 'cat-003', name: 'Bags', slug: 'bags', description: 'Backpacks and travel bags' },
        { id: 'cat-004', name: 'Electronics', slug: 'electronics', description: 'Gadgets and accessories' },
        { id: 'cat-005', name: 'Accessories', slug: 'accessories', description: 'Small daily add-ons' },
    ]
}

function getDefaultAdminDiscounts() {
    return [
        { id: 'disc-1', code: 'FASHION20', storeId: 'store-1', discountValue: 20, quantity: 50, usedCount: 0, active: true, createdAt: new Date().toISOString() },
        { id: 'disc-2', code: 'TECH15', storeId: 'store-2', discountValue: 15, quantity: 30, usedCount: 0, active: true, createdAt: new Date().toISOString() },
    ]
}

const MOCK_NAMES = [
    'Anna Ivanova', 'Dmitry Petrov', 'Maria Sidorova', 'Alexei Kuznetsov', 'Olga Smirnova',
    'Sergei Volkov', 'Elena Morozova', 'Ivan Lebedev', 'Natalia Kozlova', 'Pavel Novikov',
    'Tatiana Fedorova', 'Andrei Popov', 'Yulia Egorova', 'Roman Orlov', 'Ekaterina Belova',
    'Mikhail Tarasov', 'Ksenia Baranova', 'Nikolai Kovalev', 'Daria Sokolova', 'Viktor Zhukov',
    'Irina Makarova', 'Artem Golubev', 'Svetlana Vinogradova', 'Denis Gusev', 'Polina Lazareva',
]

const MOCK_CITIES = ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Samara', 'Omsk', 'Chelyabinsk']
const MOCK_STATUSES = ['Создан', 'Accepted', 'Delivered', 'Cancelled', 'Refunded']
const MOCK_PAYMENTS = ['Card', 'Cash on delivery', 'SBP']

function getDefaultOrders() {
    const orders = []
    const prods = seedProducts
    for (let i = 0; i < 25; i++) {
        const name = MOCK_NAMES[i % MOCK_NAMES.length]
        const email = name.toLowerCase().replace(/\s+/g, '.') + '@mail.ru'
        const phone = `+7 (9${String(10 + i).padStart(2, '0')}) ${String(100 + i * 37).slice(0, 3)}-${String(10 + i * 13).slice(0, 2)}-${String(10 + i * 7).slice(0, 2)}`
        const city = MOCK_CITIES[i % MOCK_CITIES.length]
        const status = MOCK_STATUSES[i % MOCK_STATUSES.length]
        const payment = MOCK_PAYMENTS[i % MOCK_PAYMENTS.length]
        const itemCount = 1 + (i % 3)
        const items = []
        let firstProd = null
        for (let j = 0; j < itemCount; j++) {
            const product = prods[(i + j) % prods.length]
            if (j === 0) firstProd = product
            items.push({ productId: product.id, quantity: 1 + (j % 3) })
        }
        const subtotal = items.reduce((sum, item) => {
            const prod = prods.find((p) => p.id === item.productId)
            return sum + (prod ? prod.price * item.quantity : 0)
        }, 0)
        const discount = Math.round(subtotal * 0.05 * 100) / 100
        const delivery = i % 4 === 0 ? 0 : 250
        const total = Math.round((subtotal - discount + delivery) * 100) / 100

        const daysAgo = i * 2
        const date = new Date()
        date.setDate(date.getDate() - daysAgo)
        date.setHours(9 + (i % 12), (i * 17) % 60, 0, 0)

        orders.push({
            id: `ORD-${1700000000000 + i * 86400000}`,
            createdAt: date.toISOString(),
            status,
            storeId: firstProd?.storeId || 'store-1',
            items,
            subtotal,
            discount,
            delivery,
            total,
            customer: { name, phone, email },
            deliveryInfo: { city, address: `ul. Lenina ${10 + i}`, comment: i % 3 === 0 ? 'Leave at the door' : '' },
            paymentMethod: payment,
        })
    }
    return orders
}

const store = {
    cart: /** @type {{ productId: string, quantity: number }[]} */ (readLocalStorageJSON(CART_KEY, [])),
    wishlist: /** @type {string[]} */ (readLocalStorageJSON(WISHLIST_KEY, [])),
    auth: /** @type {{ isAuthenticated: boolean, name: string, phone: string, email: string }} */ (readLocalStorageJSON(AUTH_KEY, {
        isAuthenticated: false,
        name: '',
        phone: '',
        email: '',
    })),
    orders: /** @type {Array<{id: string, createdAt: string, status: string, items: {productId: string, quantity: number}[], subtotal: number, discount: number, delivery: number, total: number, customer: {name: string, phone: string, email: string}, deliveryInfo: {city: string, address: string, comment: string}, paymentMethod: string}>} */ (readLocalStorageJSON(ORDERS_KEY, getDefaultOrders())),
    adminProducts: (readLocalStorageJSON(ADMIN_PRODUCTS_KEY, getDefaultAdminProducts())),
    adminCategories: (readLocalStorageJSON(ADMIN_CATEGORIES_KEY, getDefaultAdminCategories())),
    adminUsers: (readLocalStorageJSON(ADMIN_USERS_KEY, getDefaultAdminUsers())),
    adminSession: (readLocalStorageJSON(ADMIN_SESSION_KEY, null)),
    adminDiscounts: (readLocalStorageJSON(ADMIN_DISCOUNTS_KEY, getDefaultAdminDiscounts())),
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

export function addToCart(productId, quantity = 1) {
    const existing = store.cart.find((i) => i.productId === productId)
    if (existing) {
        store.cart = store.cart.map((item) => (
            item.productId === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item
        ))
    } else {
        store.cart = [...store.cart, { productId, quantity }]
    }
    writeLocalStorageJSON(CART_KEY, store.cart)
    emit()
}

export function updateCartQuantity(productId, quantity) {
    store.cart = store.cart
        .map((i) => (i.productId === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0)
    writeLocalStorageJSON(CART_KEY, store.cart)
    emit()
}

export function removeFromCart(productId) {
    store.cart = store.cart.filter((i) => i.productId !== productId)
    writeLocalStorageJSON(CART_KEY, store.cart)
    emit()
}

export function clearCart() {
    store.cart = []
    writeLocalStorageJSON(CART_KEY, store.cart)
    emit()
}

export function signIn(payload) {
    store.auth = {
        isAuthenticated: true,
        name: payload?.name || '',
        phone: payload?.phone || '',
        email: payload?.email || '',
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

export function createOrder(payload) {
    const order = {
        id: `ORD-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'Создан',
        ...payload,
    }
    store.orders = [order, ...store.orders]
    writeLocalStorageJSON(ORDERS_KEY, store.orders)
    emit()
    return order
}

export function updateOrderStatus(orderId, status) {
    store.orders = store.orders.map((order) => (
        order.id === orderId
            ? { ...order, status }
            : order
    ))
    writeLocalStorageJSON(ORDERS_KEY, store.orders)
    emit()
}

export function deleteOrder(orderId) {
    store.orders = store.orders.filter((order) => order.id !== orderId)
    writeLocalStorageJSON(ORDERS_KEY, store.orders)
    emit()
}

export function clearOrders() {
    store.orders = []
    writeLocalStorageJSON(ORDERS_KEY, store.orders)
    emit()
}

export function resetOrders() {
    store.orders = getDefaultOrders()
    writeLocalStorageJSON(ORDERS_KEY, store.orders)
    emit()
}

export function upsertAdminProduct(payload) {
    if (payload?.id && store.adminProducts.some((product) => product.id === payload.id)) {
        store.adminProducts = store.adminProducts.map((product) => (
            product.id === payload.id
                ? { ...product, ...payload }
                : product
        ))
    } else {
        /* ── Tier product-limit check ── */
        const currentSession = store.adminSession
        if (currentSession?.role === 'admin' && currentSession?.storeId) {
            const plan = TIER_PLANS[currentSession.tier || 'free'] || TIER_PLANS.free
            const count = store.adminProducts.filter((p) => p.storeId === currentSession.storeId).length
            if (count >= plan.maxProducts) {
                return { ok: false, error: `Your ${plan.name} plan allows up to ${plan.maxProducts} products. Upgrade your tier to add more.` }
            }
        }
        const stockQty = Number(payload?.stockQuantity ?? 0)
        const newProduct = {
            id: `p-${Date.now()}`,
            storeId: payload?.storeId || store.adminSession?.storeId || 'store-1',
            title: payload?.title || 'New product',
            brand: payload?.brand || 'Brand',
            category: payload?.category || 'Accessories',
            price: Number(payload?.price || 0),
            rating: Number(payload?.rating || 0),
            inStock: stockQty > 0,
            fastDelivery: Boolean(payload?.fastDelivery),
            stockQuantity: stockQty,
            colors: Array.isArray(payload?.colors) ? payload.colors : [],
            sizes: Array.isArray(payload?.sizes) ? payload.sizes : [],
            image: payload?.image || '',
            thumbnail: payload?.thumbnail || payload?.image || '',
            description: payload?.description || '',
        }
        store.adminProducts = [newProduct, ...store.adminProducts]
    }
    writeLocalStorageJSON(ADMIN_PRODUCTS_KEY, store.adminProducts)
    emit()
    return { ok: true }
}

export function deleteAdminProduct(productId) {
    store.adminProducts = store.adminProducts.filter((product) => product.id !== productId)
    writeLocalStorageJSON(ADMIN_PRODUCTS_KEY, store.adminProducts)
    emit()
}

export function resetAdminProducts() {
    store.adminProducts = getDefaultAdminProducts()
    writeLocalStorageJSON(ADMIN_PRODUCTS_KEY, store.adminProducts)
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
    writeLocalStorageJSON(ADMIN_CATEGORIES_KEY, store.adminCategories)
    emit()
}

export function deleteAdminCategory(categoryId) {
    const category = store.adminCategories.find((item) => item.id === categoryId)
    store.adminCategories = store.adminCategories.filter((item) => item.id !== categoryId)
    if (category) {
        store.adminProducts = store.adminProducts.map((product) => (
            product.category === category.name
                ? { ...product, category: 'Accessories' }
                : product
        ))
        writeLocalStorageJSON(ADMIN_PRODUCTS_KEY, store.adminProducts)
    }
    writeLocalStorageJSON(ADMIN_CATEGORIES_KEY, store.adminCategories)
    emit()
}

export function resetAdminCategories() {
    store.adminCategories = getDefaultAdminCategories()
    writeLocalStorageJSON(ADMIN_CATEGORIES_KEY, store.adminCategories)
    emit()
}

export function toggleWishlist(productId) {
    if (store.wishlist.includes(productId)) {
        store.wishlist = store.wishlist.filter((id) => id !== productId)
    } else {
        store.wishlist = [...store.wishlist, productId]
    }
    writeLocalStorageJSON(WISHLIST_KEY, store.wishlist)
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

/* ─── Admin session ─── */

export function adminLogin(username, password) {
    const user = store.adminUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    )
    if (!user) return { ok: false, error: 'Invalid username or password' }
    const session = {
        userId: user.id,
        role: user.role,
        storeId: user.storeId,
        storeName: user.storeName,
        tier: user.tier || null,
        name: user.name,
        username: user.username,
    }
    store.adminSession = session
    writeLocalStorageJSON(ADMIN_SESSION_KEY, session)
    emit()
    return { ok: true, session }
}

export function adminLogout() {
    store.adminSession = null
    writeLocalStorageJSON(ADMIN_SESSION_KEY, null)
    emit()
}

export function getAdminSession() {
    return store.adminSession
}

/* ─── Admin user CRUD (SuperAdmin only) ─── */

export function createAdminUser(payload) {
    const storeId = `store-${Date.now()}`
    const newUser = {
        id: `admin-${Date.now()}`,
        username: payload.username || '',
        password: payload.password || 'admin123',
        name: payload.name || 'Store Owner',
        role: 'admin',
        storeId,
        storeName: payload.storeName || 'New Store',
        tier: payload.tier || 'free',
    }
    store.adminUsers = [...store.adminUsers, newUser]
    writeLocalStorageJSON(ADMIN_USERS_KEY, store.adminUsers)
    emit()
    return newUser
}

export function updateAdminUser(userId, payload) {
    store.adminUsers = store.adminUsers.map((u) =>
        u.id === userId ? { ...u, ...payload } : u
    )
    /* Keep session in sync if the current user was updated */
    if (store.adminSession?.userId === userId) {
        const updated = store.adminUsers.find((u) => u.id === userId)
        if (updated) {
            store.adminSession = { ...store.adminSession, storeName: updated.storeName, tier: updated.tier || null, name: updated.name, username: updated.username }
            writeLocalStorageJSON(ADMIN_SESSION_KEY, store.adminSession)
        }
    }
    writeLocalStorageJSON(ADMIN_USERS_KEY, store.adminUsers)
    emit()
}

export function buyTierForCurrentStore(tierId) {
    const session = store.adminSession
    if (!session || session.role !== 'admin') return { ok: false, error: 'Only store owners can buy tiers.' }
    if (!TIER_PLANS[tierId]) return { ok: false, error: 'Invalid tier.' }
    updateAdminUser(session.userId, { tier: tierId })
    return { ok: true }
}

export function deleteAdminUser(userId) {
    store.adminUsers = store.adminUsers.filter((u) => u.id !== userId)
    writeLocalStorageJSON(ADMIN_USERS_KEY, store.adminUsers)
    emit()
}

export function resetAdminUsers() {
    store.adminUsers = getDefaultAdminUsers()
    store.adminSession = null
    writeLocalStorageJSON(ADMIN_USERS_KEY, store.adminUsers)
    writeLocalStorageJSON(ADMIN_SESSION_KEY, null)
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
            createdAt: new Date().toISOString(),
        }
        store.adminDiscounts = [newDiscount, ...store.adminDiscounts]
    }
    writeLocalStorageJSON(ADMIN_DISCOUNTS_KEY, store.adminDiscounts)
    emit()
}

export function deleteAdminDiscount(discountId) {
    store.adminDiscounts = store.adminDiscounts.filter((d) => d.id !== discountId)
    writeLocalStorageJSON(ADMIN_DISCOUNTS_KEY, store.adminDiscounts)
    emit()
}

export function resetAdminDiscounts() {
    store.adminDiscounts = getDefaultAdminDiscounts()
    writeLocalStorageJSON(ADMIN_DISCOUNTS_KEY, store.adminDiscounts)
    emit()
}

export function validateDiscountCode(code) {
    const disc = store.adminDiscounts.find(
        (d) => d.code === code.toUpperCase().trim() && d.active && (d.quantity - d.usedCount) > 0
    )
    return disc || null
}

export function useDiscountCode(discountId) {
    store.adminDiscounts = store.adminDiscounts.map((d) =>
        d.id === discountId ? { ...d, usedCount: d.usedCount + 1 } : d
    )
    writeLocalStorageJSON(ADMIN_DISCOUNTS_KEY, store.adminDiscounts)
    emit()
}