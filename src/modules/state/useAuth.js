import { useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { getState, signIn, signOut, subscribe, updateProfile } from './store.js'
import { signOut as firebaseSignOut, updateUserProfile, saveCustomerProfile } from '../../firebase/authService.js'

export function useAuth() {
    const navigate = useNavigate()
    const state = useSyncExternalStore(subscribe, getState)
    return {
        user: state.auth,
        isAuthenticated: state.auth.isAuthenticated,
        signIn,
        signOut: async () => {
            await firebaseSignOut()
            navigate('/', { replace: true })
        },
        updateProfile: async (payload) => {
            const uid = state.auth.uid
            if (uid) {
                await updateUserProfile({ displayName: payload?.name })
                await saveCustomerProfile(uid, {
                    name: payload?.name,
                    phone: payload?.phone,
                    email: payload?.email,
                    city: payload?.city,
                    district: payload?.district,
                    khoroo: payload?.khoroo,
                    khoroolol: payload?.khoroolol,
                    floor: payload?.floor,
                    building: payload?.building,
                    door: payload?.door,
                })
            }
            updateProfile(payload)
        },
    }
}
