import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { toast } from 'react-toastify'
import { getCounts, getState, isInWishlist, subscribe, toggleWishlist as toggleWishlistStore } from './store.js'
import { useI18n } from '../i18n/useI18n.js'

export function useWishlist() {
    const { t } = useI18n()
    const state = useSyncExternalStore(subscribe, getState)
    const counts = useMemo(() => getCounts(), [state.cart, state.wishlist])

    const toggleWishlist = useCallback((productId) => {
        const wasIn = isInWishlist(productId)
        toggleWishlistStore(productId)
        if (wasIn) toast.info(t('wishlist.removedToast'))
        else toast.success(t('wishlist.addedToast'))
    }, [t])

    return {
        ids: state.wishlist,
        wishlistCount: counts.wishlistCount,
        isInWishlist,
        toggleWishlist,
    }
} 