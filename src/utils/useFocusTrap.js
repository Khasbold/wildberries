import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

/**
 * Trap Tab focus inside `containerRef` while `active`.
 * Restores focus to `returnRef` (or previously focused element) on deactivate.
 */
export function useFocusTrap(active, containerRef, returnRef) {
    const prevFocus = useRef(null)

    useEffect(() => {
        if (!active) return
        prevFocus.current = document.activeElement

        const root = containerRef.current
        if (!root) return

        const getFocusable = () => Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement)

        const focusFirst = () => {
            const list = getFocusable()
            ;(list[0] || root).focus?.()
        }

        requestAnimationFrame(focusFirst)

        function onKeyDown(e) {
            if (e.key !== 'Tab') return
            const list = getFocusable()
            if (list.length === 0) return
            const first = list[0]
            const last = list[list.length - 1]
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                }
            } else if (document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }

        root.addEventListener('keydown', onKeyDown)
        return () => {
            root.removeEventListener('keydown', onKeyDown)
            const back = returnRef?.current || prevFocus.current
            if (back && typeof back.focus === 'function') {
                try {
                    back.focus()
                } catch {
                    /* ignore */
                }
            }
        }
    }, [active, containerRef, returnRef])
}
