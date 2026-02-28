import { useSyncExternalStore } from 'react'
import { clearOrders, createOrder, getState, subscribe } from './store.js'

export function useOrders() {
    const state = useSyncExternalStore(subscribe, getState)
    return {
        orders: state.orders,
        createOrder,
        clearOrders,
    }
}
