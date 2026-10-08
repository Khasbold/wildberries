/**
 * Copy text to clipboard. Works on HTTPS production; falls back for older browsers / mixed content.
 */
export async function copyTextToClipboard(text) {
    const value = String(text ?? '')
    if (!value) return false
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(value)
            return true
        }
    } catch {
        /* fall through */
    }
    try {
        const ta = document.createElement('textarea')
        ta.value = value
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        ta.style.top = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return ok
    } catch {
        return false
    }
}
