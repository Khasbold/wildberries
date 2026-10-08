import { useCallback, useSyncExternalStore } from 'react'
import { subscribe, getState, adminLogout } from './store.js'
import { signOut } from '../../firebase/authService.js'

export function useSession() {
    const state = useSyncExternalStore(subscribe, getState)
    const session = state.adminSession
    const adminUsers = state.adminUsers

    const logout = useCallback(async () => {
        try {
            await signOut()
        } catch {
            /* ignore */
        }
        adminLogout()
    }, [])

    return {
        session,
        adminUsers,
        isLoggedIn: !!session,
        isSuperAdmin: session?.role === 'superadmin',
        isStoreAdmin: session?.role === 'admin',
        storeId: session?.storeId || null,
        storeName: session?.storeName || null,
        tier: session?.tier || null,
        logout,
    }
}
