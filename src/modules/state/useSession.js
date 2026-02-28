import { useSyncExternalStore } from 'react'
import { subscribe, getState, adminLogin, adminLogout } from './store.js'

export function useSession() {
    const state = useSyncExternalStore(subscribe, getState)
    const session = state.adminSession
    const adminUsers = state.adminUsers

    return {
        session,
        adminUsers,
        isLoggedIn: !!session,
        isSuperAdmin: session?.role === 'superadmin',
        isStoreAdmin: session?.role === 'admin',
        storeId: session?.storeId || null,
        storeName: session?.storeName || null,
        tier: session?.tier || null,
        login: adminLogin,
        logout: adminLogout,
    }
}
