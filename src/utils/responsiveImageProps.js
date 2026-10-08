/**
 * Optional srcset for common CDN patterns and Firebase Storage thumbnails.
 * When a Cloud Function generates thumbnails (thumb_400x, thumb_800x) in the same
 * Storage path, this helper builds srcset so the browser picks the right size.
 * @param {string} src
 * @returns {{ srcSet?: string, sizes?: string }}
 */
export function getResponsiveImageProps(src) {
    if (!src || typeof src !== 'string') return {}
    try {
        const u = new URL(src, typeof window !== 'undefined' ? window.location.origin : 'https://example.com')
        const host = u.hostname

        if (host.includes('unsplash.com')) {
            const withW = (w) => {
                const p = new URLSearchParams(u.search)
                p.set('w', String(w))
                return `${u.origin}${u.pathname}?${p}`
            }
            return {
                srcSet: `${withW(400)} 400w, ${withW(800)} 800w, ${withW(1200)} 1200w`,
                sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
            }
        }

        if (host === 'picsum.photos') {
            const path = u.pathname.replace(/\/$/, '')
            return {
                srcSet: `${path}/400/400 400w, ${path}/800/800 800w`,
                sizes: '(max-width: 640px) 50vw, 33vw',
            }
        }

        // Firebase Storage URLs — look for thumbnail variants
        if (host.includes('firebasestorage.googleapis.com') || host.includes('storage.googleapis.com')) {
            const oPath = u.searchParams.get('o') || ''
            if (!oPath) return {}
            // Build thumb URLs by inserting thumb_ prefix before filename
            const lastSlash = oPath.lastIndexOf('/')
            const dir = lastSlash >= 0 ? oPath.slice(0, lastSlash + 1) : ''
            const file = lastSlash >= 0 ? oPath.slice(lastSlash + 1) : oPath
            const ext = file.lastIndexOf('.') >= 0 ? file.slice(file.lastIndexOf('.')) : ''
            const base = file.lastIndexOf('.') >= 0 ? file.slice(0, file.lastIndexOf('.')) : file

            function thumbUrl(width) {
                const thumbName = `thumb_${width}x_${base}.webp`
                const thumbPath = dir + thumbName
                const p = new URLSearchParams(u.search)
                p.set('o', thumbPath)
                return `${u.origin}${u.pathname}?${p}`
            }

            return {
                srcSet: `${thumbUrl(400)} 400w, ${thumbUrl(800)} 800w, ${src} 1200w`,
                sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
            }
        }
    } catch {
        /* ignore */
    }
    return {}
}
