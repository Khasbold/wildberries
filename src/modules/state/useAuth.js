import { useSyncExternalStore } from 'react'
import { getState, signIn, signOut, subscribe, updateProfile } from './store.js'

export function useAuth() {
    const state = useSyncExternalStore(subscribe, getState)
    return {
        user: state.auth,
        isAuthenticated: state.auth.isAuthenticated,
        signIn,
        signOut,
        updateProfile,
    }
}
