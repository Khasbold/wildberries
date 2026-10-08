import { useLayoutEffect, useState } from 'react'

/**
 * Fixed position for dropdowns anchored to a trigger (viewport coords).
 * Aligns panel's right edge to trigger's right edge by default.
 */
export function useAnchoredPosition(open, anchorRef, options = {}) {
    const { width = 280, align = 'end', zIndex = 9999 } = options
    const [style, setStyle] = useState({})

    useLayoutEffect(() => {
        if (!open || !anchorRef?.current) return

        function update() {
            const el = anchorRef.current
            if (!el) return
            const r = el.getBoundingClientRect()
            const vw = window.innerWidth
            const vh = window.innerHeight
            const gap = 8
            const w = Math.min(width, vw - gap * 2)
            let left = align === 'end' ? r.right - w : r.left
            if (left < gap) left = gap
            if (left + w > vw - gap) left = vw - w - gap
            let top = r.bottom + gap
            const estHeight = Math.min(420, vh * 0.7)
            if (top + estHeight > vh - gap) {
                top = Math.max(gap, r.top - estHeight - gap)
            }
            setStyle({
                position: 'fixed',
                top,
                left,
                width: w,
                zIndex,
            })
        }

        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update, true)
            window.removeEventListener('resize', update)
        }
    }, [open, anchorRef, width, align, zIndex])

    return style
}
