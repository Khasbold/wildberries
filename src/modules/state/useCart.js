import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { toast } from 'react-toastify'
import { addToCart as addToCartStore, clearCart, getCounts, getState, removeFromCart, subscribe, updateCartQuantity } from './store.js'
import { useI18n } from '../i18n/useI18n.js'
import { trackEvent } from '../../utils/analytics.js'

export function useCart() {
    const { t } = useI18n()
    const state = useSyncExternalStore(subscribe, getState)
    const counts = useMemo(() => getCounts(), [state.cart, state.wishlist])

    useEffect(() => { }, [state])

    const addToCart = useCallback((productId, quantity = 1, options = {}) => {
        addToCartStore(productId, quantity, options)
        trackEvent('add_to_cart', { productId, quantity })
        toast.success(t('cart.addedToast'))
    }, [t])

    return {
        items: state.cart,
        cartCount: counts.cartCount,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
    }
} 