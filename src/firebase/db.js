/**
 * Firebase Firestore API – CRUD services for ecommerce data
 * Collections: products, categories, users, orders, discounts, banners,
 *              highlights, notifications, adminNotifications, clientNotifications,
 *              productViews, carts, wishlists
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    writeBatch,
    serverTimestamp,
    onSnapshot,
} from 'firebase/firestore'
import { db } from './init.js'
import { LOGIN_EMAIL_ALIAS_GROUPS } from './staffLoginAliases.js'

// ─── Collection names ───
const COLLECTIONS = {
    products: 'products',
    categories: 'categories',
    users: 'users',
    customerProfiles: 'customerProfiles',
    orders: 'orders',
    discounts: 'discounts',
    banners: 'banners',
    highlights: 'highlights',
    notifications: 'notifications',
    adminNotifications: 'adminNotifications',
    clientNotifications: 'clientNotifications',
    productViews: 'productViews',
    carts: 'carts',
    wishlists: 'wishlists',
    tierChangeHistory: 'tierChangeHistory',
    feedbacks: 'feedbacks',
}

// ─── Products CRUD ───
export async function getProducts() {
    const snap = await getDocs(collection(db, COLLECTIONS.products))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getProduct(id) {
    const ref = doc(db, COLLECTIONS.products, id)
    const snap = await getDoc(ref)
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createProduct(data) {
    const ref = doc(db, COLLECTIONS.products, data.id || `p-${Date.now()}`)
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() })
    return ref.id
}

export async function updateProduct(id, data) {
    const ref = doc(db, COLLECTIONS.products, id)
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteProduct(id) {
    await deleteDoc(doc(db, COLLECTIONS.products, id))
}

export async function setProducts(products) {
    const batch = writeBatch(db)
    for (const p of products) {
        const id = p.id || `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        batch.set(doc(db, COLLECTIONS.products, id), { ...p, id, updatedAt: serverTimestamp() })
    }
    await batch.commit()
}

// ─── Categories CRUD ───
export async function getCategories() {
    const snap = await getDocs(collection(db, COLLECTIONS.categories))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createCategory(data) {
    const ref = doc(db, COLLECTIONS.categories, data.id || `cat-${Date.now()}`)
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() })
    return ref.id
}

export async function updateCategory(id, data) {
    await updateDoc(doc(db, COLLECTIONS.categories, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteCategory(id) {
    await deleteDoc(doc(db, COLLECTIONS.categories, id))
}

export async function setCategories(categories) {
    const batch = writeBatch(db)
    for (const c of categories) {
        const id = c.id || `cat-${Date.now()}`
        batch.set(doc(db, COLLECTIONS.categories, id), { ...c, id, updatedAt: serverTimestamp() })
    }
    await batch.commit()
}

// ─── Customer profiles (name, phone, address – for Firebase Auth users) ───
export async function getCustomerProfile(uid) {
    if (!uid) return null
    const ref = doc(db, COLLECTIONS.customerProfiles, uid)
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
}

export async function setCustomerProfile(uid, data) {
    if (!uid) return
    const ref = doc(db, COLLECTIONS.customerProfiles, uid)
    await setDoc(ref, {
        ...data,
        uid,
        updatedAt: new Date().toISOString(),
    })
}

// ─── Users (admin/store owners) CRUD ───

function expandLoginEmailVariants(normalizedEmail) {
    if (!normalizedEmail) return []
    for (const group of LOGIN_EMAIL_ALIAS_GROUPS) {
        const lowers = group.map((x) => x.toLowerCase())
        if (lowers.includes(normalizedEmail)) return [...new Set(lowers)]
    }
    return [normalizedEmail]
}

export async function getUsers() {
    const snap = await getDocs(collection(db, COLLECTIONS.users))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Resolve staff profile for Firebase Auth user (admin / superadmin). */
export async function getStaffUserByFirebaseUser(firebaseUser) {
    if (!firebaseUser?.uid) return null
    const byUid = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid))
    if (byUid.exists()) {
        const data = byUid.data()
        const r = (data.role || '').toString().toLowerCase()
        if (r === 'admin' || r === 'superadmin') {
            return { id: byUid.id, ...data }
        }
    }
    const email = (firebaseUser.email || '').toLowerCase().trim()
    if (!email) return null
    const variants = expandLoginEmailVariants(email)
    try {
        const col = collection(db, COLLECTIONS.users)
        const qy =
            variants.length === 1
                ? query(col, where('loginEmail', '==', variants[0]), limit(1))
                : query(col, where('loginEmail', 'in', variants.slice(0, 30)), limit(1))
        const snap = await getDocs(qy)
        if (snap.empty) return null
        const d0 = snap.docs[0]
        const data = d0.data()
        const r = (data.role || '').toString().toLowerCase()
        if (r !== 'admin' && r !== 'superadmin') return null
        return { id: d0.id, ...data }
    } catch {
        return null
    }
}

export async function createUser(data) {
    const ref = doc(db, COLLECTIONS.users, data.id || `admin-${Date.now()}`)
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() })
    return ref.id
}

/**
 * Self-serve store owner: Firestore `users/{uid}` must match Firebase Auth uid for admin lookup.
 */
export async function registerStaffStoreOwnerProfile(firebaseUser, { storeName, ownerName }) {
    if (!firebaseUser?.uid) throw new Error('Not signed in')
    const uid = firebaseUser.uid
    const ref = doc(db, COLLECTIONS.users, uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
        const data = snap.data()
        const r = (data.role || '').toString().toLowerCase()
        if (r === 'admin' || r === 'superadmin') {
            const err = new Error('ALREADY_REGISTERED')
            err.code = 'ALREADY_REGISTERED'
            throw err
        }
    }
    const email = (firebaseUser.email || '').toLowerCase().trim()
    const name = (ownerName || firebaseUser.displayName || '').trim() || email.split('@')[0] || 'Owner'
    const store = (storeName || '').trim() || `${name}'s store`
    const storeId = `store-${uid}`
    const profile = {
        id: uid,
        username: email.split('@')[0] || 'owner',
        name,
        role: 'admin',
        storeId,
        storeName: store,
        storeImage: null,
        tier: 'free',
        loginEmail: email,
    }
    await setDoc(ref, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    return { ...profile, createdAt: null, updatedAt: null }
}

export async function updateUser(id, data) {
    await updateDoc(doc(db, COLLECTIONS.users, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteUser(id) {
    await deleteDoc(doc(db, COLLECTIONS.users, id))
}

export async function setUsers(users) {
    const batch = writeBatch(db)
    for (const u of users) {
        const id = u.id || `admin-${Date.now()}`
        batch.set(doc(db, COLLECTIONS.users, id), { ...u, id, updatedAt: serverTimestamp() })
    }
    await batch.commit()
}

function normTs(v) {
    if (v == null) return null
    if (typeof v?.toMillis === 'function') return v.toMillis()
    if (v instanceof Date) return v.getTime()
    const n = Number(v)
    return Number.isNaN(n) ? null : n
}

// ─── Orders CRUD ───
export async function getOrders() {
    try {
        const snap = await getDocs(
            query(collection(db, COLLECTIONS.orders), orderBy('createdAt', 'desc'), limit(500))
        )
        return snap.docs.map((d) => {
            const data = d.data()
            return { id: d.id, ...data, createdAt: normTs(data.createdAt) ?? data.createdAt }
        })
    } catch {
        const snap = await getDocs(collection(db, COLLECTIONS.orders))
        const docs = snap.docs.map((d) => {
            const data = d.data()
            return { id: d.id, ...data, createdAt: normTs(data.createdAt) ?? data.createdAt }
        })
        return docs.sort((a, b) => (normTs(b.createdAt) ?? 0) - (normTs(a.createdAt) ?? 0)).slice(0, 500)
    }
}

export async function createOrder(data) {
    const ref = doc(db, COLLECTIONS.orders, data.id || `ORD-${Date.now()}`)
    await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    return ref.id
}

export async function updateOrder(id, data) {
    await updateDoc(doc(db, COLLECTIONS.orders, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteOrder(id) {
    await deleteDoc(doc(db, COLLECTIONS.orders, id))
}

// ─── Discounts CRUD ───
export async function getDiscounts() {
    const snap = await getDocs(collection(db, COLLECTIONS.discounts))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function upsertDiscount(data) {
    const id = data.id || `disc-${Date.now()}`
    await setDoc(doc(db, COLLECTIONS.discounts, id), { ...data, id, updatedAt: serverTimestamp() })
    return id
}

export async function deleteDiscount(id) {
    await deleteDoc(doc(db, COLLECTIONS.discounts, id))
}

export async function setDiscounts(discounts) {
    const batch = writeBatch(db)
    for (const d of discounts) {
        const id = d.id || `disc-${Date.now()}`
        batch.set(doc(db, COLLECTIONS.discounts, id), { ...d, id, updatedAt: serverTimestamp() })
    }
    await batch.commit()
}

// ─── Banners CRUD ───
export async function getBanners() {
    try {
        const snap = await getDocs(
            query(collection(db, COLLECTIONS.banners), orderBy('order', 'asc')))
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch {
        const snap = await getDocs(collection(db, COLLECTIONS.banners))
        return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }
}

export async function addBannerDb(data) {
    if (data.id) {
        // Use the provided id as the Firestore document id (e.g. __home_banner_toggle__)
        const { id, ...rest } = data
        await setDoc(doc(db, COLLECTIONS.banners, id), {
            ...rest,
            order: rest.order ?? 0,
            updatedAt: serverTimestamp(),
        })
        return id
    }
    const ref = await addDoc(collection(db, COLLECTIONS.banners), {
        ...data,
        order: data.order ?? 0,
        updatedAt: serverTimestamp(),
    })
    return ref.id
}

export async function updateBannerDb(id, data) {
    await updateDoc(doc(db, COLLECTIONS.banners, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteBannerDb(id) {
    await deleteDoc(doc(db, COLLECTIONS.banners, id))
}

export async function getBanner(id) {
    if (!id) return null
    const snap = await getDoc(doc(db, COLLECTIONS.banners, id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ─── Highlights (single doc: { storeId: productId }) ───
export async function getHighlights() {
    const ref = doc(db, COLLECTIONS.highlights, 'config')
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : {}
}

export async function setHighlights(obj) {
    await setDoc(doc(db, COLLECTIONS.highlights, 'config'), obj)
}

// ─── Notifications CRUD ───
export async function getNotifications() {
    const snap = await getDocs(
        query(collection(db, COLLECTIONS.notifications), orderBy('createdAt', 'desc'), limit(100)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addNotificationDb(data) {
    const ref = await addDoc(collection(db, COLLECTIONS.notifications), {
        ...data,
        createdAt: serverTimestamp(),
    })
    return ref.id
}

export async function deleteNotificationDb(id) {
    await deleteDoc(doc(db, COLLECTIONS.notifications, id))
}

// ─── Admin Notifications CRUD ───
export async function getAdminNotifications() {
    const snap = await getDocs(
        query(collection(db, COLLECTIONS.adminNotifications), orderBy('createdAt', 'desc'), limit(200)))
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }))
}

export async function addAdminNotificationDb(data) {
    const docId = data.id || `admin-notif-${Date.now()}`
    await setDoc(doc(db, COLLECTIONS.adminNotifications, docId), {
        ...data,
        read: false,
        createdAt: serverTimestamp(),
    })
    return docId
}

export async function markAdminNotificationReadDb(id) {
    await updateDoc(doc(db, COLLECTIONS.adminNotifications, id), { read: true })
}

export async function clearAdminNotificationsDb(storeId) {
    const q = storeId
        ? query(collection(db, COLLECTIONS.adminNotifications), where('storeId', '==', storeId))
        : collection(db, COLLECTIONS.adminNotifications)
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
}

// ─── Client Notifications (by sessionId) ───
export async function getClientNotifications(sessionId) {
    const ref = doc(db, COLLECTIONS.clientNotifications, sessionId)
    const snap = await getDoc(ref)
    return snap.exists() ? (snap.data().items || []) : []
}

export async function setClientNotifications(sessionId, items) {
    await setDoc(doc(db, COLLECTIONS.clientNotifications, sessionId), {
        items,
        updatedAt: serverTimestamp(),
    })
}

export async function addClientNotificationDb(sessionId, item) {
    const items = await getClientNotifications(sessionId)
    const newItem = {
        id: `client-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...item,
        read: false,
        createdAt: new Date().toISOString(),
    }
    items.unshift(newItem)
    await setClientNotifications(sessionId, items.slice(0, 100))
    return newItem.id
}

export async function markClientNotificationReadDb(sessionId, notifId) {
    const items = await getClientNotifications(sessionId)
    const updated = items.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    await setClientNotifications(sessionId, updated)
}

export async function clearClientNotificationsDb(sessionId) {
    await setClientNotifications(sessionId, [])
}

// ─── Product Views ───
export async function getProductViews() {
    const ref = doc(db, COLLECTIONS.productViews, 'counts')
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : {}
}

export async function incrementProductView(productId) {
    const ref = doc(db, COLLECTIONS.productViews, 'counts')
    const snap = await getDoc(ref)
    const counts = snap.exists() ? snap.data() : {}
    const current = counts[productId] || 0
    counts[productId] = current + 1
    await setDoc(ref, counts)
}

// ─── Cart (by sessionId) ───
export async function getCart(sessionId) {
    const ref = doc(db, COLLECTIONS.carts, sessionId)
    const snap = await getDoc(ref)
    return snap.exists() ? (snap.data().items || []) : []
}

export async function setCart(sessionId, items) {
    await setDoc(doc(db, COLLECTIONS.carts, sessionId), {
        items,
        updatedAt: serverTimestamp(),
    })
}

// ─── Wishlist (by sessionId) ───
export async function getWishlist(sessionId) {
    const ref = doc(db, COLLECTIONS.wishlists, sessionId)
    const snap = await getDoc(ref)
    return snap.exists() ? (snap.data().items || []) : []
}

export async function setWishlist(sessionId, items) {
    await setDoc(doc(db, COLLECTIONS.wishlists, sessionId), {
        items,
        updatedAt: serverTimestamp(),
    })
}

// ─── Real-time subscriptions ───
export function subscribeAdminNotifications(callback) {
    const q = query(collection(db, COLLECTIONS.adminNotifications), orderBy('createdAt', 'desc'), limit(200))
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => {
            const data = d.data()
            const createdAt = data.createdAt?.toMillis?.() ?? (data.createdAt instanceof Date ? data.createdAt.getTime() : data.createdAt)
            return { id: d.id, ...data, createdAt: createdAt ?? data.createdAt }
        })
        callback(items)
    })
}

export function subscribeClientNotifications(clientKey, callback) {
    const ref = doc(db, COLLECTIONS.clientNotifications, clientKey)
    return onSnapshot(ref, (snap) => {
        const raw = snap.exists() ? (snap.data().items || []) : []
        const items = raw.map((n) => {
            const createdAt = n.createdAt?.toMillis?.() ?? (n.createdAt instanceof Date ? n.createdAt.getTime() : n.createdAt)
            return { ...n, createdAt: createdAt ?? n.createdAt }
        })
        callback(items)
    })
}

export function subscribeOrders(callback) {
    const ref = collection(db, COLLECTIONS.orders)
    return onSnapshot(ref, (snap) => {
        const items = snap.docs.map((d) => {
            const data = d.data()
            return { id: d.id, ...data, createdAt: normTs(data.createdAt) ?? data.createdAt }
        }).sort((a, b) => (normTs(b.createdAt) ?? 0) - (normTs(a.createdAt) ?? 0)).slice(0, 500)
        callback(items)
    })
}

export function subscribeProducts(callback) {
    const ref = collection(db, COLLECTIONS.products)
    return onSnapshot(ref, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        callback(items)
    })
}

// ─── Customer FCM Tokens (for admin push notifications) ───
export async function getAllCustomerTokens() {
    const result = []
    try {
        const snap = await getDocs(collection(db, 'customerTokens'))
        snap.docs.forEach((d) => {
            const data = d.data()
            const tokens = data.tokens || []
            if (tokens.length === 0) return
            tokens.forEach((token) => {
                if (token && typeof token === 'string') {
                    result.push({
                        userId: d.id,
                        token,
                        email: data.email || null,
                        displayName: data.displayName || data.email || 'Anonymous',
                    })
                }
            })
        })
    } catch (err) {
        console.warn('[db] getAllCustomerTokens failed:', err)
        console.warn('[db] Ensure Firestore rules allow read on customerTokens. Run: firebase deploy --only firestore:rules')
    }
    return result
}

// ─── One-time migration: add productType to products, deliveryPrice to store owners ───
export async function migrateProductsDeliveryAndType() {
    let count = 0

    // Migrate products: add productType and orderDays
    const prodSnap = await getDocs(collection(db, COLLECTIONS.products))
    for (const d of prodSnap.docs) {
        const data = d.data()
        if (data.productType) continue
        const isOrder = Math.random() < 0.4
        const orderDays = isOrder ? Math.floor(Math.random() * 8) + 7 : 0
        await updateDoc(doc(db, COLLECTIONS.products, d.id), {
            productType: isOrder ? 'order' : 'ready',
            orderDays,
        })
        console.log(`[migrate] product ${d.id} → ${isOrder ? 'order' : 'ready'}`)
        count++
    }

    // Migrate store owners: add deliveryFree/deliveryPrice
    const usersSnap = await getDocs(collection(db, COLLECTIONS.users))
    for (const d of usersSnap.docs) {
        const data = d.data()
        if (data.role !== 'admin') continue
        if (data.deliveryPrice !== undefined) continue // already migrated
        const deliveryPrice = (Math.floor(Math.random() * 3) + 6) * 1000
        await updateDoc(doc(db, COLLECTIONS.users, d.id), {
            deliveryFree: false,
            deliveryPrice,
        })
        console.log(`[migrate] store ${d.id} (${data.storeName}) → delivery: ${deliveryPrice}₮`)
        count++
    }

    console.log(`[migrate] Done. Updated ${count} records.`)
    return count
}

// ─── Tier Change History ───
export async function getTierChangeHistory() {
    const ref = doc(db, COLLECTIONS.tierChangeHistory, 'log')
    const snap = await getDoc(ref)
    return snap.exists() ? (snap.data().entries || []) : []
}

export async function setTierChangeHistory(entries) {
    await setDoc(doc(db, COLLECTIONS.tierChangeHistory, 'log'), {
        entries,
        updatedAt: serverTimestamp(),
    })
}

// ─── Order Chat (subcollection: orders/{orderId}/messages) ───
export async function sendOrderMessage(orderId, { senderId, senderRole, text }) {
    const messagesRef = collection(db, COLLECTIONS.orders, orderId, 'messages')
    await addDoc(messagesRef, {
        senderId,
        senderRole,
        text,
        read: false,
        createdAt: serverTimestamp(),
    })
}

export function subscribeOrderMessages(orderId, callback) {
    const messagesRef = collection(db, COLLECTIONS.orders, orderId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => {
            const data = d.data()
            return {
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toMillis?.() ?? (data.createdAt instanceof Date ? data.createdAt.getTime() : data.createdAt),
            }
        })
        callback(items)
    })
}

export async function markOrderMessagesRead(orderId, readerRole) {
    const messagesRef = collection(db, COLLECTIONS.orders, orderId, 'messages')
    const oppositeSenderRole = readerRole === 'customer' ? 'store' : 'customer'
    const q = query(messagesRef, where('senderRole', '==', oppositeSenderRole), where('read', '==', false))
    const snap = await getDocs(q)
    if (snap.empty) return
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }))
    // Reset the unread counter on the order document
    const unreadField = readerRole === 'customer' ? 'unreadByCustomer' : 'unreadByStore'
    batch.update(doc(db, COLLECTIONS.orders, orderId), { [unreadField]: 0 })
    await batch.commit()
}

// ─── Feedbacks CRUD ───
export async function getFeedbacks() {
    const snap = await getDocs(
        query(collection(db, COLLECTIONS.feedbacks), orderBy('createdAt', 'desc'), limit(200)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addFeedbackDb(data) {
    const ref = await addDoc(collection(db, COLLECTIONS.feedbacks), {
        ...data,
        createdAt: serverTimestamp(),
    })
    return ref.id
}

export async function deleteFeedbackDb(id) {
    await deleteDoc(doc(db, COLLECTIONS.feedbacks, id))
}
