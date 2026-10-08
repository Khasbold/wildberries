/**
 * Creates Firebase Authentication user superbunny@demo.web if missing.
 * Firestore `users` staff docs do NOT create login accounts — Auth is separate.
 *
 * Requires: service account JSON at project root `service_key.json`
 * (Firebase Console → Project settings → Service accounts → Generate new key)
 *
 * Usage: npm run ensure-superbunny-auth
 */

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const keyPath = join(root, 'service_key.json')

const EMAIL = 'superbunny@demo.web'
const PASSWORD = 'superbunny'

if (!existsSync(keyPath)) {
    console.error('Missing service_key.json in project root. Download from Firebase → Project settings → Service accounts.')
    process.exit(1)
}

const key = JSON.parse(readFileSync(keyPath, 'utf8'))

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(key) })
}

try {
    const existing = await admin.auth().getUserByEmail(EMAIL)
    console.log('Firebase Auth user already exists:', existing.uid, EMAIL)
    console.log('If login still fails, reset the password in Firebase Console → Authentication → Users.')
} catch (e) {
    if (e.code === 'auth/user-not-found') {
        const u = await admin.auth().createUser({
            email: EMAIL,
            password: PASSWORD,
            displayName: 'Super Bunny',
        })
        console.log('Created Firebase Auth user:', u.uid)
        console.log('Email:', EMAIL)
        console.log('You can sign in at /admin with this email and password.')
    } else {
        console.error(e)
        process.exit(1)
    }
}
