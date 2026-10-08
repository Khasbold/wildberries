/**
 * Cleanup mock/static data from Firestore
 * Deletes: orders, auto-created products, analytics, dashboard data, qpayInvoices
 * Keeps: categories, users, admins (user accounts)
 * 
 * Usage: node scripts/cleanup-mock-data.mjs
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase-admin initialized
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize with the project's service account
const app = initializeApp({
    projectId: 'bunny-5c403',
})

const db = getFirestore(app)

async function deleteCollection(collectionPath) {
    const collRef = db.collection(collectionPath)
    const snapshot = await collRef.get()
    if (snapshot.empty) {
        console.log(`  ✓ ${collectionPath}: already empty`)
        return 0
    }

    let count = 0
    const batchSize = 400
    const docs = snapshot.docs

    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch()
        const chunk = docs.slice(i, i + batchSize)
        for (const doc of chunk) {
            batch.delete(doc.ref)
        }
        await batch.commit()
        count += chunk.length
    }

    console.log(`  ✓ ${collectionPath}: deleted ${count} documents`)
    return count
}

async function deleteOrdersWithSubcollections() {
    const ordersRef = db.collection('orders')
    const snapshot = await ordersRef.get()
    if (snapshot.empty) {
        console.log('  ✓ orders: already empty')
        return 0
    }

    let count = 0
    for (const orderDoc of snapshot.docs) {
        // Delete messages subcollection
        const messagesRef = orderDoc.ref.collection('messages')
        const messagesSnap = await messagesRef.get()
        if (!messagesSnap.empty) {
            const batch = db.batch()
            messagesSnap.docs.forEach((d) => batch.delete(d.ref))
            await batch.commit()
        }
        // Delete the order document
        await orderDoc.ref.delete()
        count++
    }

    console.log(`  ✓ orders: deleted ${count} orders (with messages subcollections)`)
    return count
}

async function deleteAutoCreatedProducts() {
    const productsRef = db.collection('products')
    const snapshot = await productsRef.get()
    if (snapshot.empty) {
        console.log('  ✓ products: already empty')
        return 0
    }

    let count = 0
    const batch = db.batch()
    for (const doc of snapshot.docs) {
        const data = doc.data()
        // Delete products that look auto-created/seeded (no real store owner product)
        // Keep products that have been uploaded with images to Cloud Storage
        const isAutoCreated = !data.image ||
            data.image.includes('picsum') ||
            data.image.includes('placeholder') ||
            data.image.includes('unsplash') ||
            data.image.includes('via.placeholder') ||
            data.title === 'New product' ||
            (data.storeId === 'store-1' && !data.image.includes('firebasestorage'))

        if (isAutoCreated) {
            batch.delete(doc.ref)
            count++
        }
    }

    if (count > 0) await batch.commit()
    console.log(`  ✓ products: deleted ${count} auto-created/seeded products (kept real uploads)`)
    return count
}

async function main() {
    console.log('\n🧹 Cleaning mock/static data from Firestore...\n')
    console.log('Project: bunny-5c403\n')

    // Delete orders (with messages subcollections)
    await deleteOrdersWithSubcollections()

    // Delete auto-created products (keep real ones with Firebase Storage images)
    await deleteAutoCreatedProducts()

    // Delete QPay invoice tracking
    await deleteCollection('qpayInvoices')

    // Delete analytics data
    await deleteCollection('analytics')

    // Delete dashboard data
    await deleteCollection('dashboard')

    // Delete visitor tracking
    await deleteCollection('visitors')

    // Delete funnel data
    await deleteCollection('funnelEvents')

    console.log('\n✅ Cleanup complete!')
    console.log('Kept: categories, users, admins, customerTokens\n')

    process.exit(0)
}

main().catch((err) => {
    console.error('Cleanup failed:', err)
    process.exit(1)
})
