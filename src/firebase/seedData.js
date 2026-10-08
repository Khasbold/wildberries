/**
 * Seed Firestore when collections are empty — 10 demo products, categories, staff docs (login via Firebase Auth + loginEmail).
 */

import {
    setProducts,
    setCategories,
    setUsers,
    setDiscounts,
    setHighlights,
    getProducts,
    getCategories,
    getUsers,
    getDiscounts,
    getBanners,
    createUser,
} from './db.js'
import { LOGIN_EMAIL_ALIAS_GROUPS } from './staffLoginAliases.js'

/** Must match the email you use in Firebase Authentication for superadmin login. */
export const SUPERBUNNY_LOGIN_EMAIL = 'superbunny@demo.web'

const DEFAULT_CATEGORIES = [
    { id: 'cat-001', name: 'Apparel', slug: 'apparel', description: 'Clothing and essentials' },
    { id: 'cat-002', name: 'Shoes', slug: 'shoes', description: 'Sneakers, boots and more' },
    { id: 'cat-003', name: 'Bags', slug: 'bags', description: 'Backpacks and travel bags' },
    { id: 'cat-004', name: 'Electronics', slug: 'electronics', description: 'Gadgets and accessories' },
    { id: 'cat-005', name: 'Accessories', slug: 'accessories', description: 'Small daily add-ons' },
]

const DEFAULT_USERS = [
    {
        id: 'sa-1',
        username: 'superbunny',
        name: 'Super Bunny',
        role: 'superadmin',
        storeId: null,
        storeName: null,
        storeImage: null,
        tier: null,
        loginEmail: SUPERBUNNY_LOGIN_EMAIL,
    },
    {
        id: 'admin-1',
        username: 'admin1',
        name: 'Admin One',
        role: 'admin',
        storeId: 'store-1',
        storeName: 'Fashion Hub',
        storeImage: null,
        tier: 'free',
        loginEmail: 'owner1@demo.local',
        deliveryFree: false,
        deliveryPrice: 7000,
    },
    {
        id: 'admin-2',
        username: 'admin2',
        name: 'Admin Two',
        role: 'admin',
        storeId: 'store-2',
        storeName: 'TechWorld',
        storeImage: null,
        tier: 'free',
        loginEmail: 'owner2@demo.local',
        deliveryFree: false,
        deliveryPrice: 6000,
    },
]

const DEFAULT_DISCOUNTS = [
    { id: 'disc-1', code: 'FASHION20', storeId: 'store-1', discountValue: 20, quantity: 50, usedCount: 0, active: true, startDate: new Date().toISOString().slice(0, 10), expireDate: '', createdAt: new Date().toISOString() },
    { id: 'disc-2', code: 'TECH15', storeId: 'store-2', discountValue: 15, quantity: 30, usedCount: 0, active: true, startDate: new Date().toISOString().slice(0, 10), expireDate: '', createdAt: new Date().toISOString() },
]

const UNSPLASH_IDS = [
    '1549298916-b41d501d3772',
    '1556821840-3a63f95609a7',
    '1505740420928-5e560c06d30e',
    '1553062407-98eeb64c6a62',
    '1523275335684-37898b6baf30',
    '1521572163474-6864f9cf17ab',
    '1542291026-7eec264c27ff',
    '1572635196237-14b3f281503f',
    '1608043152269-423dbba4e7e1',
    '1588850561407-ed78c334e67a',
]

const TITLES = [
    'Canvas Day Sneakers',
    'Merino Crew Sweater',
    'Noise-Cancel Earbuds',
    'Leather Tote Medium',
    'Sport Water Bottle',
    'Minimalist Watch',
    'Running Shorts Pro',
    'Laptop Sleeve 15"',
    'Ceramic Mug Set',
    'Wireless Mouse',
]

const BRANDS = ['Northline', 'UrbanPeak', 'MonoForm', 'TrailCraft', 'PulseLab']

function buildRandomProducts() {
    const cats = DEFAULT_CATEGORIES.map((c) => c.name)
    return Array.from({ length: 10 }, (_, i) => {
        const storeId = i % 2 === 0 ? 'store-1' : 'store-2'
        const category = cats[i % cats.length]
        const price = Math.round((15 + Math.random() * 120) * 100) / 100
        const orig = Math.random() > 0.5 ? Math.round(price * (1.2 + Math.random() * 0.4) * 100) / 100 : 0
        const stock = 5 + Math.floor(Math.random() * 45)
        const id = `p-rand-${String(i + 1).padStart(2, '0')}`
        const pid = UNSPLASH_IDS[i % UNSPLASH_IDS.length]
        const thumb = `https://images.unsplash.com/photo-${pid}?w=600&auto=format&fit=crop&q=80`
        const full = `https://images.unsplash.com/photo-${pid}?w=1200&auto=format&fit=crop&q=80`
        return {
            id,
            storeId,
            title: TITLES[i],
            brand: BRANDS[i % BRANDS.length],
            category,
            price,
            originalPrice: orig,
            rating: Math.round((3.5 + Math.random() * 1.4) * 10) / 10,
            inStock: true,
            productType: Math.random() < 0.4 ? 'order' : 'ready',
            orderDays: Math.random() < 0.4 ? Math.floor(Math.random() * 8) + 7 : 0,
            stockQuantity: stock,
            colors: ['#1F2937', '#6B7280'],
            sizes: [],
            image: full,
            thumbnail: thumb,
            description: `${TITLES[i]} — quality pick from our marketplace.`,
            createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        }
    })
}

export async function seedFirestore() {
    const results = { products: 0, categories: 0, users: 0, discounts: 0, banners: 0 }

    try {
        const existingProducts = await getProducts()
        if (existingProducts.length === 0) {
            const productsToSeed = buildRandomProducts()
            await setProducts(productsToSeed)
            results.products = productsToSeed.length
            console.log('[Firebase Seed] Products seeded:', results.products)
        }

        const existingCategories = await getCategories()
        if (existingCategories.length === 0) {
            await setCategories(DEFAULT_CATEGORIES)
            results.categories = DEFAULT_CATEGORIES.length
            console.log('[Firebase Seed] Categories seeded:', results.categories)
        }

        const existingUsers = await getUsers()
        if (existingUsers.length === 0) {
            await setUsers(DEFAULT_USERS)
            results.users = DEFAULT_USERS.length
            console.log('[Firebase Seed] Users seeded:', results.users)
        }

        const existingDiscounts = await getDiscounts()
        if (existingDiscounts.length === 0) {
            await setDiscounts(DEFAULT_DISCOUNTS)
            results.discounts = DEFAULT_DISCOUNTS.length
            console.log('[Firebase Seed] Discounts seeded:', results.discounts)
        }

        const existingBanners = await getBanners()
        if (existingBanners.length === 0) {
            const { setDoc, doc, serverTimestamp } = await import('firebase/firestore')
            const { db } = await import('./init.js')
            const banners = [
                { id: 'banner-1', image: 'https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=2000', title: 'Up to 65% off', order: 0 },
                { id: 'banner-2', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=2000', title: 'New arrivals', order: 1 },
            ]
            for (const b of banners) {
                await setDoc(doc(db, 'banners', b.id), { ...b, updatedAt: serverTimestamp() })
            }
            results.banners = banners.length
            console.log('[Firebase Seed] Banners seeded:', results.banners)
        }

        await setHighlights({})
        console.log('[Firebase Seed] Highlights initialized')

        return results
    } catch (err) {
        console.error('[Firebase Seed] Error:', err)
        throw err
    }
}

/**
 * Ensures a Firestore `users` staff doc exists for superadmin email (login via Firebase Auth).
 * Safe to call on every load; no-op if a matching doc already exists.
 */
const SUPERBUNNY_LOGIN_ALIASES = LOGIN_EMAIL_ALIAS_GROUPS[0] || []

export async function ensureSuperbunnySuperadminUser() {
    const email = SUPERBUNNY_LOGIN_EMAIL.toLowerCase()
    try {
        const users = await getUsers()
        const aliasSet = new Set(SUPERBUNNY_LOGIN_ALIASES.map((e) => e.toLowerCase()))
        const has = users.some(
            (u) =>
                aliasSet.has((u.loginEmail || '').toLowerCase()) &&
                (u.role || '').toString().toLowerCase() === 'superadmin',
        )
        if (has) return
        await createUser({
            id: 'staff-superbunny',
            username: 'superbunny',
            name: 'Super Bunny',
            role: 'superadmin',
            storeId: null,
            storeName: null,
            storeImage: null,
            tier: null,
            loginEmail: SUPERBUNNY_LOGIN_EMAIL,
        })
        console.log('[Firebase] Created staff user for superadmin:', SUPERBUNNY_LOGIN_EMAIL)
    } catch (err) {
        console.warn('[Firebase] ensureSuperbunnySuperadminUser:', err)
    }
}
