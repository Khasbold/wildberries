import { getToken, deleteToken, onMessage } from 'firebase/messaging'
import { getMessagingInstance } from './init.js'
import { VAPID_KEY } from './config.js'

const FCM_TOKENS_KEY = 'wb_fcm_tokens'

/**
 * Ensures service worker is registered, activated,
 * and controlling the current page.
 */
async function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('[FCM] Service workers not supported.')
        return null
    }

    // Register SW with cache bypass so updated file is always picked up
    const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        { updateViaCache: 'none' }
    )

    // Force the new SW to install & activate if an update is found
    await registration.update().catch(() => { })

    // Wait until SW is ready
    await navigator.serviceWorker.ready

    // If first install, SW activates but does NOT control page yet
    if (!navigator.serviceWorker.controller) {
        console.log('[FCM] SW installed but not controlling page yet.')
        console.log('[FCM] Reloading once to activate control...')
        window.location.reload()
        return null
    }

    console.log('[FCM] Service worker ready & controlling page.')
    return registration
}

/**
 * Remove any stale push subscription on the SW registration.
 * This is needed when the VAPID key or Firebase project changes.
 */
async function clearStalePushSubscription(swRegistration) {
    try {
        const sub = await swRegistration.pushManager.getSubscription()
        if (sub) {
            console.log('[FCM] Found existing push subscription, unsubscribing…')
            await sub.unsubscribe()
            console.log('[FCM] Old push subscription removed.')
        }
    } catch (e) {
        console.warn('[FCM] Could not clear old push subscription:', e)
    }
}

/**
 * Request notification permission + get FCM token
 */
export async function requestNotificationPermission() {
    try {
        console.log('[FCM] Requesting permission...')

        const permission = await Notification.requestPermission()
        console.log('permission: ', permission);
        if (permission !== 'granted') {
            console.log('[FCM] Notification permission denied.')
            return null
        }

        const messaging = await getMessagingInstance()
        if (!messaging) {
            console.warn('[FCM] Messaging not supported in this browser.')
            return null
        }

        const swRegistration = await ensureServiceWorker()
        if (!swRegistration) return null

        console.log('[FCM] Getting FCM token...')

        let token
        try {
            token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration,
            })
        } catch (tokenErr) {
            // "push service error" usually means a stale subscription from a
            // previous VAPID key / Firebase project. Clear it and retry once.
            const msg = tokenErr?.message || ''
            if (msg.includes('push service') || msg.includes('Registration failed') || msg.includes('AbortError')) {
                console.warn('[FCM] Push subscription conflict detected – clearing stale data and retrying…')

                // 1. Remove old push subscription on the SW
                await clearStalePushSubscription(swRegistration)

                // 2. Try to delete the old FCM token (best-effort)
                try { await deleteToken(messaging) } catch (_) { }

                // 3. Delete Firebase Messaging IndexedDB to fully reset state
                try {
                    const dbs = await indexedDB.databases()
                    for (const db of dbs) {
                        if (db.name && db.name.includes('firebase-messaging')) {
                            indexedDB.deleteDatabase(db.name)
                            console.log('[FCM] Deleted IDB:', db.name)
                        }
                    }
                } catch (_) { }

                // 4. Retry getToken
                token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: swRegistration,
                })
            } else {
                throw tokenErr // rethrow unknown errors
            }
        }

        if (!token) {
            console.warn('[FCM] No registration token received.')
            return null
        }

        console.log('%c[FCM] Registration token:', 'color: green; font-weight: bold')
        console.log(token)

        // Store globally for quick copy
        window.__FCM_TOKEN__ = token

        saveTokenLocally(token)

        return token
    } catch (err) {
        console.error('[FCM] Error getting token:', err)

        if (err?.message?.includes('applicationServerKey')) {
            console.error(
                'Invalid VAPID key. Check Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.'
            )
        }

        if (err?.message?.includes('push service') || err?.message?.includes('Registration failed')) {
            console.error(
                'Push service error. Steps to fix:\n' +
                '1. Open DevTools → Application → Service Workers → Unregister all\n' +
                '2. Application → Storage → Clear site data\n' +
                '3. Ensure Cloud Messaging API (V2) is enabled at:\n' +
                '   https://console.cloud.google.com/apis/library/fcmregistrations.googleapis.com\n' +
                '4. Verify VAPID key matches Firebase Console → Project Settings → Cloud Messaging → Web Push certificates'
            )
        }

        return null
    }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback) {
    let unsubscribe = () => { }

    getMessagingInstance().then((messaging) => {
        if (!messaging) return

        unsubscribe = onMessage(messaging, (payload) => {
            console.log('[FCM] Foreground message:', payload)
            callback(payload)
        })
    })

    return () => unsubscribe()
}

/**
 * Save token locally (for admin testing)
 */
export function saveTokenLocally(token) {
    try {
        const raw = localStorage.getItem(FCM_TOKENS_KEY)
        const tokens = raw ? JSON.parse(raw) : []

        if (!tokens.includes(token)) {
            tokens.push(token)
            localStorage.setItem(FCM_TOKENS_KEY, JSON.stringify(tokens))
            console.log('[FCM] Token saved locally.')
        }
    } catch {
        localStorage.setItem(FCM_TOKENS_KEY, JSON.stringify([token]))
    }
}

/**
 * Retrieve stored tokens
 */
export function getStoredTokens() {
    try {
        const raw = localStorage.getItem(FCM_TOKENS_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}