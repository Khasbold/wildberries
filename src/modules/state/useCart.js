import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { addToCart, clearCart, getCounts, getState, removeFromCart, subscribe, updateCartQuantity } from './store.js'

export function useCart() {
    const state = useSyncExternalStore(subscribe, getState)
    const counts = useMemo(() => getCounts(), [state.cart, state.wishlist])

    useEffect(() => { }, [state])

    return {
        items: state.cart,
        cartCount: counts.cartCount,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
    }
} 