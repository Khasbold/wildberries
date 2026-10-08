import { useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'bunny_dark_mode'

let darkMode = (() => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'dark') return true
        if (stored === 'light') return false
        /* Default: light mode on first visit (custom domain / brand reads better). Users can enable dark in header. */
        return false
    } catch {
        return false
    }
})()

const listeners = new Set()

function emit() {
    for (const l of listeners) l()
}

function applyClass(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
}

// Apply on load
applyClass(darkMode)

export function toggleDarkMode() {
    darkMode = !darkMode
    localStorage.setItem(STORAGE_KEY, darkMode ? 'dark' : 'light')
    applyClass(darkMode)
    emit()
}

export function setDarkMode(value) {
    darkMode = !!value
    localStorage.setItem(STORAGE_KEY, darkMode ? 'dark' : 'light')
    applyClass(darkMode)
    emit()
}

function subscribeDarkMode(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
}

function getSnapshot() {
    return darkMode
}

export function useDarkMode() {
    const isDark = useSyncExternalStore(subscribeDarkMode, getSnapshot)

    return { isDark, toggle: toggleDarkMode, setDarkMode }
}
