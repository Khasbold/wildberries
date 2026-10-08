/**
 * Firebase bootstrap – load data from Firestore and hydrate store
 * Call before app render. Falls back to seed data if Firestore fails.
 */

import { loadFromFirestore } from './storeAdapter.js'
import { hydrateStore, hydrateStoreWithFallback, setUseFirebase } from '../modules/state/store.js'
import { startRealtimeListeners } from './realtime.js'
import { setFirebaseConnection } from '../utils/firebaseConnection.js'

export async function initFirebase() {
    try {
        const data = await loadFromFirestore()
        hydrateStore(data)
        startRealtimeListeners()
        setFirebaseConnection(true)
        return true
    } catch (err) {
        console.warn('[Firebase] Init failed (blocked/offline?), using localStorage:', err.message || err)
        setUseFirebase(false)
        setFirebaseConnection(false)
        hydrateStoreWithFallback()
        return false
    }
}
