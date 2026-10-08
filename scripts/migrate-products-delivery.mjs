/**
 * Migration: adds productType (ready/order), deliveryFree, deliveryPrice, orderDays
 * to every existing product in Firestore.
 *
 * - Randomly assigns ~60% as 'ready', ~40% as 'order'
 * - Sets deliveryPrice between 6000-8000 for all products
 * - deliveryFree = false (everyone gets a delivery price)
 * - orderDays = 7-14 for 'order' products, 0 for 'ready'
 *
 * Requires: service account JSON at project root `service_key.json`
 * Usage: node scripts/migrate-products-delivery.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const keyPath = join(root, 'service_key.json')

if (!existsSync(keyPath)) {
    console.error('❌ service_key.json not found at project root.')
    process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'))

// Fix private key: add PEM headers if missing, fix escaped newlines
if (serviceAccount.private_key) {
    let pk = serviceAccount.private_key.replace(/\\n/g, '\n')
    if (!pk.startsWith('-----BEGIN')) {
        // Wrap raw base64 in PEM envelope
        const b64 = pk.replace(/\s+/g, '')
        const lines = b64.match(/.{1,64}/g) || [b64]
        pk = '-----BEGIN PRIVATE KEY-----\n' + lines.join('\n') + '\n-----END PRIVATE KEY-----\n'
    }
    serviceAccount.private_key = pk
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })
}

const db = admin.firestore()

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

async function migrate() {
    const productsRef = db.collection('products')
    const snapshot = await productsRef.get()

    if (snapshot.empty) {
        console.log('No products found in Firestore.')
        return
    }

    console.log(`Found ${snapshot.size} products. Migrating...`)

    const batch = db.batch()
    let count = 0

    // Migrate products: add productType/orderDays
    snapshot.forEach((d) => {
        const data = d.data()
        if (data.productType) {
            console.log(`  ⏭ ${d.id} (${data.title}) — already has productType, skipping`)
            return
        }
        const isOrder = Math.random() < 0.4
        const orderDays = isOrder ? randomInt(7, 14) : 0
        batch.update(d.ref, { productType: isOrder ? 'order' : 'ready', orderDays })
        console.log(`  ✅ ${d.id} (${data.title}) → ${isOrder ? 'order' : 'ready'}${isOrder ? `, ${orderDays} days` : ''}`)
        count++
    })

    // Migrate store owners: add deliveryFree/deliveryPrice
    const usersSnap = await db.collection('users').get()
    usersSnap.forEach((d) => {
        const data = d.data()
        if (data.role !== 'admin') return
        if (data.deliveryPrice !== undefined) return
        const deliveryPrice = randomInt(6, 8) * 1000
        batch.update(d.ref, { deliveryFree: false, deliveryPrice })
        console.log(`  ✅ store ${d.id} (${data.storeName}) → delivery: ${deliveryPrice}₮`)
        count++
    })

    if (count === 0) {
        console.log('All records already migrated. Nothing to do.')
        return
    }

    await batch.commit()
    console.log(`\n✅ Migration complete. Updated ${count} records.`)
}

migrate().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
})
