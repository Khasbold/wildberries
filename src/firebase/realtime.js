/**
 * Firestore real-time subscriptions – keep store in sync with live data
 * Admin: new orders, purchase notifications
 * Client: order status changes, product stock
 */

import {
    subscribeAdminNotifications,
    subscribeClientNotifications,
    subscribeOrders,
    subscribeProducts,
} from './db.js'
import { getClientNotificationsKey } from './storeAdapter.js'
import { hydrateStorePartial, getUseFirebase } from '../modules/state/store.js'

let unsubscribes = []

export function startRealtimeListeners() {
    if (!getUseFirebase()) return
    stopRealtimeListeners()

    unsubscribes.push(
        subscribeAdminNotifications((adminNotifications) => {
            hydrateStorePartial({ adminNotifications })
        })
    )

    unsubscribes.push(
        subscribeClientNotifications(getClientNotificationsKey(), (clientNotifications) => {
            hydrateStorePartial({ clientNotifications })
        })
    )

    unsubscribes.push(
        subscribeOrders((orders) => {
            hydrateStorePartial({ orders })
        })
    )

    unsubscribes.push(
        subscribeProducts((adminProducts) => {
            hydrateStorePartial({ adminProducts })
        })
    )
}

export function stopRealtimeListeners() {
    unsubscribes.forEach((unsub) => unsub?.())
    unsubscribes = []
}
