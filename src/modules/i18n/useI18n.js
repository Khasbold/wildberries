import { createContext, createElement, useContext, useMemo, useState } from 'react'
import { getInitialLocale, getLocaleMeta, setI18nLocale, t as translate } from './config.js'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
    const [locale, setLocaleState] = useState(() => {
        const initial = getInitialLocale()
        setI18nLocale(initial)
        return initial
    })

    function setLocale(nextLocale) {
        setI18nLocale(nextLocale)
        setLocaleState(nextLocale)
    }

    const value = useMemo(() => ({
        locale,
        setLocale,
        localeMeta: getLocaleMeta(locale),
        t: (key, options) => translate(key, options),
    }), [locale])

    return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n() {
    const ctx = useContext(I18nContext)
    if (!ctx) throw new Error('useI18n must be used within I18nProvider')
    return ctx
}
