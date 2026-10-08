import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './init.js'
import { firebaseConfig } from './config.js'

const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const QUALITY = 0.8
const BUCKET = firebaseConfig.storageBucket || ''

/**
 * Compress an image file using canvas.
 * Returns a Blob of the compressed JPEG/WebP.
 */
function compressImage(file, { maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT, quality = QUALITY } = {}) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            let { width, height } = img
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height)
                width = Math.round(width * ratio)
                height = Math.round(height * ratio)
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
                'image/webp',
                quality
            )
        }
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = URL.createObjectURL(file)
    })
}

/**
 * Upload an image file to Firebase Storage.
 * Compresses it first, then uploads and returns the download URL.
 *
 * @param {File} file - The image file to upload
 * @param {string} path - Storage path, e.g. 'products/abc123/image1'
 * @returns {Promise<string>} The public download URL
 */
export async function uploadImage(file, path) {
    const compressed = await compressImage(file)
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, compressed, { contentType: 'image/webp' })
    return getDownloadURL(storageRef)
}

/**
 * Upload a store image.
 */
export function uploadStoreImage(file, storeId) {
    const filename = `store_${Date.now()}.webp`
    return uploadImage(file, `stores/${storeId}/${filename}`)
}

/**
 * Upload a product image.
 */
export function uploadProductImage(file, storeId) {
    const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
    return uploadImage(file, `products/${storeId}/${filename}`)
}

/**
 * Upload a banner image.
 */
export function uploadBannerImage(file) {
    const filename = `banner_${Date.now()}.webp`
    return uploadImage(file, `banners/${filename}`)
}

/** Safe store id segment for Storage paths */
function sanitizeStoreId(storeId) {
    return String(storeId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
}

/**
 * True if URL points at an object in this project's default Storage bucket (Firebase download or GCS URL).
 */
export function isOurFirebaseStorageUrl(url) {
    if (!url || typeof url !== 'string') return false
    if (url.startsWith('data:') || url.startsWith('blob:')) return false
    try {
        const u = new URL(url)
        if (u.hostname === 'firebasestorage.googleapis.com') {
            const m = u.pathname.match(/\/b\/([^/]+)\/o\//)
            if (!m) return false
            const bucketInPath = decodeURIComponent(m[1])
            return bucketInPath === BUCKET
        }
        if (u.hostname === 'storage.googleapis.com') {
            const seg = u.pathname.split('/').filter(Boolean)[0]
            return seg === BUCKET || decodeURIComponent(seg) === BUCKET
        }
    } catch {
        return false
    }
    return false
}

/**
 * Empty is allowed (no image). Otherwise must be a URL in our Firebase Storage bucket.
 */
export function isOurStorageImageReference(value) {
    if (value == null || value === '') return true
    return isOurFirebaseStorageUrl(value)
}

/**
 * Delete one object by its download URL (only if it belongs to our bucket). Ignores missing objects.
 */
export async function deleteFileByDownloadUrl(url) {
    if (!isOurFirebaseStorageUrl(url)) return
    try {
        await deleteObject(ref(storage, url))
    } catch (e) {
        const code = String(e?.code || '')
        if (code.includes('object-not-found')) return
        console.warn('[Storage] deleteFileByDownloadUrl:', e)
    }
}

export async function deleteFilesByDownloadUrls(urls) {
    const unique = [...new Set((urls || []).filter(Boolean))]
    await Promise.all(unique.map((u) => deleteFileByDownloadUrl(u)))
}

/** All distinct image URLs on a product document (for cleanup). */
export function collectProductImageUrls(p) {
    if (!p) return []
    const out = []
    if (p.image) out.push(p.image)
    if (p.thumbnail && p.thumbnail !== p.image) out.push(p.thumbnail)
    if (Array.isArray(p.images)) {
        for (const u of p.images) {
            if (u && typeof u === 'string') out.push(u)
        }
    }
    return [...new Set(out)]
}

/**
 * Upload a data:image/... URL to Storage (migrates legacy inline images).
 * @param {string} dataUrl
 * @param {string} path - full path under bucket, e.g. products/store-1/img_1.webp
 */
export async function uploadDataUrlToStorage(dataUrl, path) {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png'
    const file = new File([blob], 'upload.webp', { type })
    return uploadImage(file, path)
}

/**
 * Migrate data: URLs to Storage. Non–data: URLs are kept only if already in our bucket (caller should validate).
 *
 * @returns {Promise<{ image: string, thumbnail: string, images: string[] }>}
 */
export async function normalizeProductImagesForFirestore({ image, thumbnail, images }, storeId) {
    const sid = sanitizeStoreId(storeId)
    const ts = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const list = Array.isArray(images) ? [...images] : []

    const migrated = []
    for (let i = 0; i < list.length; i++) {
        const url = list[i]
        if (typeof url !== 'string' || !url) continue
        if (url.startsWith('data:image/')) {
            migrated.push(await uploadDataUrlToStorage(url, `products/${sid}/gallery_${ts()}_${i}.webp`))
        } else {
            migrated.push(url)
        }
    }

    let img = typeof image === 'string' ? image : ''
    if (img.startsWith('data:image/')) {
        img = await uploadDataUrlToStorage(img, `products/${sid}/main_${ts()}.webp`)
    }

    let thumb = typeof thumbnail === 'string' ? thumbnail : ''
    if (thumb.startsWith('data:image/')) {
        thumb = await uploadDataUrlToStorage(thumb, `products/${sid}/thumb_${ts()}.webp`)
    }

    if (!img && migrated.length > 0) img = migrated[0]
    if (!thumb && migrated.length > 0) thumb = migrated[0]
    if (!thumb && img) thumb = img

    return {
        image: img || '',
        thumbnail: thumb || img || '',
        images: migrated,
    }
}

/**
 * @deprecated Prefer isOurStorageImageReference for admin UI (Storage-only policy).
 */
export function isAllowedImageReferenceUrl(value) {
    if (value == null || value === '') return true
    if (typeof value !== 'string') return false
    if (value.startsWith('data:')) return false
    if (value.startsWith('blob:')) return false
    if (value.startsWith('javascript:') || value.startsWith('vbscript:')) return false
    return /^https?:\/\//i.test(value)
}
