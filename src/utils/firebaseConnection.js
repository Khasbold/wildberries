/** Reactive flag: live Firestore vs localStorage fallback (set from bootstrap). */
let connected = true
const listeners = new Set()

export function setFirebaseConnection(ok) {
    connected = !!ok
    listeners.forEach((fn) => {
        try {
            fn()
        } catch {
            /* ignore */
        }
    })
}

export function getFirebaseConnection() {
    return connected
}

export function subscribeFirebaseConnection(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
}
