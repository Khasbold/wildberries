/**
 * Firebase Store Adapter – bridges store.js with Firestore
 * Handles async load/save, session ID for cart/wishlist, and initial seed
 */

const SESSION_KEY = 'wb_session_id'
const AUTH_KEY = 'wb_auth'

function getOrCreateSessionId() {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
        localStorage.setItem(SESSION_KEY, id)
    }
    return id
}

let _sessionId = null
export function getSessionId() {
    if (!_sessionId) _sessionId = getOrCreateSessionId()
    return _sessionId
}

/** Key for client notifications: userId when authenticated, else sessionId */
export function getClientNotificationsKey() {
    try {
        const raw = localStorage.getItem(AUTH_KEY)
        const auth = raw ? JSON.parse(raw) : null
        if (auth?.uid) return auth.uid
    } catch { }
    return getSessionId()
}

import {
    getProducts,
    getCategories,
    getUsers,
    getOrders,
    getDiscounts,
    getBanners,
    getHighlights,
    getNotifications,
    getAdminNotifications,
    getClientNotifications,
    getProductViews,
    getTierChangeHistory,
    getCart,
    getWishlist,
    setProducts,
    setCategories,
    setUsers,
    createOrder as createOrderDb,
    updateOrder,
    deleteOrder as deleteOrderDb,
    setDiscounts,
    addBannerDb,
    updateBannerDb,
    deleteBannerDb,
    setHighlights,
    addNotificationDb,
    deleteNotificationDb,
    addAdminNotificationDb,
    markAdminNotificationReadDb,
    addClientNotificationDb,
    markClientNotificationReadDb,
    clearClientNotificationsDb,
    setClientNotifications,
    getProductViews as getProductViewsDb,
    incrementProductView,
    setCart as setCartDb,
    setWishlist as setWishlistDb,
    upsertDiscount,
    deleteDiscount,
    migrateProductsDeliveryAndType,
    deleteUser as deleteUserDb,
} from './db.js'
import { ensureSuperbunnySuperadminUser } from './seedData.js'

/**
 * Load all data from Firestore. Call once on app init.
 */
export async function loadFromFirestore() {
    const sessionId = getSessionId()
    const clientKey = getClientNotificationsKey()
    try {
        let [
            products,
            categories,
            users,
            orders,
            discounts,
            banners,
            highlights,
            notifications,
            adminNotifications,
            clientNotifications,
            productViews,
            tierChangeHistory,
            cart,
            wishlist,
        ] = await Promise.all([
            getProducts().catch(() => []),
            getCategories().catch(() => []),
            getUsers().catch(() => []),
            getOrders().catch(() => []),
            getDiscounts().catch(() => []),
            getBanners().catch(() => []),
            getHighlights().catch(() => ({})),
            getNotifications().catch(() => []),
            getAdminNotifications().catch(() => []),
            getClientNotifications(clientKey).catch(() => []),
            getProductViewsDb().catch(() => ({})),
            getTierChangeHistory().catch(() => []),
            getCart(sessionId).catch(() => []),
            getWishlist(sessionId).catch(() => []),
        ])

        await ensureSuperbunnySuperadminUser()
        users = await getUsers().catch(() => users)

        // No auto-seeding — empty products is fine for a fresh start

        // One-time migration: add productType to products, deliveryPrice to store owners
        const needsProductMigration = products.some((p) => !p.productType)
        const needsStoreMigration = users.filter((u) => u.role === 'admin').some((u) => u.deliveryPrice === undefined)
        if (needsProductMigration || needsStoreMigration) {
            try {
                await migrateProductsDeliveryAndType()
                products = await getProducts().catch(() => products)
                users = await getUsers().catch(() => users)
            } catch (err) {
                console.warn('[storeAdapter] delivery migration failed:', err)
            }
        }

        return {
            adminProducts: products,
            adminCategories: categories,
            adminUsers: users,
            orders,
            adminDiscounts: discounts,
            banners,
            highlights,
            notifications,
            adminNotifications,
            clientNotifications,
            productViews,
            cart,
            wishlist,
            tierChangeHistory,
        }
    } catch (err) {
        console.error('[Firebase] Load error:', err)
        throw err
    }
}

/**
 * Persist cart to Firestore
 */
export async function saveCart(items) {
    try {
        await setCartDb(getSessionId(), items)
    } catch (err) {
        console.error('[Firebase] Save cart error:', err)
    }
}

/**
 * Persist wishlist to Firestore
 */
export async function saveWishlist(items) {
    try {
        await setWishlistDb(getSessionId(), items)
    } catch (err) {
        console.error('[Firebase] Save wishlist error:', err)
    }
}

/**
 * Persist products
 */
export async function saveProducts(products) {
    try {
        await setProducts(products)
    } catch (err) {
        console.error('[Firebase] Save products error:', err)
    }
}

/**
 * Save a single product to Firestore (create or update)
 */
export async function saveSingleProduct(product) {
    try {
        const { createProduct, updateProduct, getProduct } = await import('./db.js')
        const {
            collectProductImageUrls,
            deleteFileByDownloadUrl,
            isOurFirebaseStorageUrl,
        } = await import('./storageUpload.js')
        const existing = product.id ? await getProduct(product.id) : null
        if (existing) {
            await updateProduct(product.id, product)
        } else {
            await createProduct(product)
        }
        if (existing) {
            const oldUrls = collectProductImageUrls(existing)
            const keep = new Set(collectProductImageUrls(product))
            for (const url of oldUrls) {
                if (!keep.has(url) && isOurFirebaseStorageUrl(url)) {
                    await deleteFileByDownloadUrl(url)
                }
            }
        }
    } catch (err) {
        console.error('[Firebase] Save single product error:', err)
    }
}

/**
 * Delete a single product from Firestore
 */
export async function saveSingleProductDelete(productId) {
    try {
        const { getProduct, deleteProduct } = await import('./db.js')
        const { collectProductImageUrls, deleteFilesByDownloadUrls } = await import('./storageUpload.js')
        const p = await getProduct(productId)
        if (p) await deleteFilesByDownloadUrls(collectProductImageUrls(p))
        await deleteProduct(productId)
    } catch (err) {
        console.error('[Firebase] Delete single product error:', err)
    }
}

/**
 * Delete a single category from Firestore
 */
export async function saveSingleCategoryDelete(categoryId) {
    try {
        const { deleteCategory } = await import('./db.js')
        await deleteCategory(categoryId)
    } catch (err) {
        console.error('[Firebase] Delete single category error:', err)
    }
}

/**
 * Save a single category to Firestore
 */
export async function saveSingleCategory(category) {
    try {
        const { createCategory, updateCategory } = await import('./db.js')
        if (category.id) {
            try {
                await updateCategory(category.id, category)
            } catch {
                await createCategory(category)
            }
        } else {
            await createCategory(category)
        }
    } catch (err) {
        console.error('[Firebase] Save single category error:', err)
    }
}

/**
 * Clear admin notifications from Firestore
 */
export async function saveClearAdminNotifications(storeId) {
    try {
        const { clearAdminNotificationsDb } = await import('./db.js')
        await clearAdminNotificationsDb(storeId)
    } catch (err) {
        console.error('[Firebase] Clear admin notifications error:', err)
    }
}

/**
 * Delete all products from Firestore (for reset)
 */
export async function saveDeleteAllProducts() {
    try {
        const { getProducts, deleteProduct } = await import('./db.js')
        const { collectProductImageUrls, deleteFilesByDownloadUrls } = await import('./storageUpload.js')
        const products = await getProducts()
        for (const p of products) {
            await deleteFilesByDownloadUrls(collectProductImageUrls(p))
            await deleteProduct(p.id)
        }
    } catch (err) {
        console.error('[Firebase] Delete all products error:', err)
    }
}

/**
 * Delete all categories from Firestore (for reset)
 */
export async function saveDeleteAllCategories() {
    try {
        const { getCategories, deleteCategory } = await import('./db.js')
        const cats = await getCategories()
        await Promise.all(cats.map((c) => deleteCategory(c.id)))
    } catch (err) {
        console.error('[Firebase] Delete all categories error:', err)
    }
}

/**
 * Delete all discounts from Firestore (for reset)
 */
export async function saveDeleteAllDiscounts() {
    try {
        const { getDiscounts, deleteDiscount } = await import('./db.js')
        const discs = await getDiscounts()
        await Promise.all(discs.map((d) => deleteDiscount(d.id)))
    } catch (err) {
        console.error('[Firebase] Delete all discounts error:', err)
    }
}

/**
 * Persist categories
 */
export async function saveCategories(categories) {
    try {
        await setCategories(categories)
    } catch (err) {
        console.error('[Firebase] Save categories error:', err)
    }
}

/**
 * Persist users
 */
export async function saveUsers(users) {
    try {
        await setUsers(users)
    } catch (err) {
        console.error('[Firebase] Save users error:', err)
    }
}

/**
 * Delete a single user document from Firestore
 */
export async function deleteStoreUser(userId) {
    try {
        await deleteUserDb(userId)
    } catch (err) {
        console.error('[Firebase] Delete user error:', err)
    }
}

/**
 * Create order in Firestore
 */
export async function saveOrder(order) {
    try {
        await createOrderDb(order)
    } catch (err) {
        console.error('[Firebase] Save order error:', err)
        throw err
    }
}

/**
 * Update order status
 */
export async function saveOrderUpdate(orderId, data) {
    try {
        await updateOrder(orderId, data)
    } catch (err) {
        console.error('[Firebase] Update order error:', err)
    }
}

/**
 * Delete order
 */
export async function saveOrderDelete(orderId) {
    try {
        await deleteOrderDb(orderId)
    } catch (err) {
        console.error('[Firebase] Delete order error:', err)
    }
}

/**
 * Persist discounts
 */
export async function saveDiscount(discount) {
    try {
        await upsertDiscount(discount)
    } catch (err) {
        console.error('[Firebase] Save discount error:', err)
    }
}

export async function saveDiscountDelete(id) {
    try {
        await deleteDiscount(id)
    } catch (err) {
        console.error('[Firebase] Delete discount error:', err)
    }
}

/**
 * Banners
 */
export async function saveBannerAdd(data) {
    try {
        return await addBannerDb(data)
    } catch (err) {
        console.error('[Firebase] Add banner error:', err)
    }
}

export async function saveBannerUpdate(id, data) {
    try {
        const { getBanner } = await import('./db.js')
        const { deleteFileByDownloadUrl, isOurFirebaseStorageUrl } = await import('./storageUpload.js')
        const existing = await getBanner(id)
        const prevImage = existing?.image
        await updateBannerDb(id, data)
        const nextImage = data.image !== undefined ? data.image : prevImage
        if (prevImage && prevImage !== nextImage && isOurFirebaseStorageUrl(prevImage)) {
            await deleteFileByDownloadUrl(prevImage)
        }
    } catch (err) {
        console.error('[Firebase] Update banner error:', err)
    }
}

export async function saveBannerDelete(id, imageUrl) {
    try {
        const { deleteFileByDownloadUrl, isOurFirebaseStorageUrl } = await import('./storageUpload.js')
        if (imageUrl && isOurFirebaseStorageUrl(imageUrl)) {
            try {
                await deleteFileByDownloadUrl(imageUrl)
            } catch (imgErr) {
                console.warn('[Firebase] Banner image deletion failed (proceeding with doc delete):', imgErr)
            }
        }
        await deleteBannerDb(id)
    } catch (err) {
        console.error('[Firebase] Delete banner error:', err)
    }
}

/**
 * Highlights
 */
export async function saveHighlights(obj) {
    try {
        await setHighlights(obj)
    } catch (err) {
        console.error('[Firebase] Save highlights error:', err)
    }
}

/**
 * Notifications
 */
export async function saveNotificationAdd(data) {
    try {
        return await addNotificationDb(data)
    } catch (err) {
        console.error('[Firebase] Add notification error:', err)
    }
}

export async function saveNotificationDelete(id) {
    try {
        await deleteNotificationDb(id)
    } catch (err) {
        console.error('[Firebase] Delete notification error:', err)
    }
}

export async function saveAdminNotificationAdd(data) {
    try {
        return await addAdminNotificationDb(data)
    } catch (err) {
        console.error('[Firebase] Add admin notification error:', err)
    }
}

export async function saveAdminNotificationRead(id) {
    try {
        await markAdminNotificationReadDb(id)
    } catch (err) {
        console.error('[Firebase] Mark admin notification read error:', err)
    }
}

export async function saveClientNotificationAdd(item, targetUserId) {
    try {
        const key = targetUserId || getClientNotificationsKey()
        return await addClientNotificationDb(key, item)
    } catch (err) {
        console.error('[Firebase] Add client notification error:', err)
    }
}

export async function saveClientNotificationRead(notifId) {
    try {
        await markClientNotificationReadDb(getClientNotificationsKey(), notifId)
    } catch (err) {
        console.error('[Firebase] Mark client notification read error:', err)
    }
}

export async function saveClientNotificationsClear() {
    try {
        await clearClientNotificationsDb(getClientNotificationsKey())
    } catch (err) {
        console.error('[Firebase] Clear client notifications error:', err)
    }
}

/**
 * Product views
 */
export async function saveProductViewIncrement(productId) {
    try {
        await incrementProductView(productId)
    } catch (err) {
        console.error('[Firebase] Increment product view error:', err)
    }
}

/**
 * Tier change history
 */
export async function saveTierChangeHistory(history) {
    try {
        const { setTierChangeHistory } = await import('./db.js')
        await setTierChangeHistory(history)
    } catch (err) {
        console.error('[Firebase] Save tier change history error:', err)
    }
}

export async function loadTierChangeHistory() {
    try {
        const { getTierChangeHistory } = await import('./db.js')
        return await getTierChangeHistory()
    } catch (err) {
        console.error('[Firebase] Load tier change history error:', err)
        return []
    }
}
