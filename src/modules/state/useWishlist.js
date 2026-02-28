import { useMemo, useSyncExternalStore } from 'react'
import { getCounts, getState, isInWishlist, subscribe, toggleWishlist } from './store.js'

export function useWishlist() {
    const state = useSyncExternalStore(subscribe, getState)
    const counts = useMemo(() => getCounts(), [state.cart, state.wishlist])
    return {
        ids: state.wishlist,
        wishlistCount: counts.wishlistCount,
        isInWishlist,
        toggleWishlist,
    }
} 