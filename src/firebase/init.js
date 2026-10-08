import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, logEvent, isSupported as isAnalyticsSupported } from 'firebase/analytics'
import { getMessaging, isSupported } from 'firebase/messaging'
import { firebaseConfig } from './config.js'

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Auth instance
const auth = getAuth(app)

// Firestore instance
const db = getFirestore(app)

// Storage instance
const storage = getStorage(app)

// Analytics instance – lazily initialized
let analyticsInstance = null

export async function initAnalytics() {
    try {
        const supported = await isAnalyticsSupported()
        if (supported) {
            analyticsInstance = getAnalytics(app)
        }
    } catch {
        /* analytics not available */
    }
    return analyticsInstance
}

export function getAnalyticsInstance() {
    return analyticsInstance
}

export function logAnalyticsEvent(name, params) {
    if (analyticsInstance) logEvent(analyticsInstance, name, params)
}

// Messaging instance – lazily resolved since it may not be supported in all browsers
let messagingInstance = null

export async function getMessagingInstance() {
    if (messagingInstance) return messagingInstance
    const supported = await isSupported()
    if (!supported) {
        console.warn('Firebase Messaging is not supported in this browser.')
        return null
    }
    messagingInstance = getMessaging(app)
    return messagingInstance
}

export { app, auth, db, storage }
