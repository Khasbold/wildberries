/**
 * Normalize Firestore Timestamp or any date-like value to a Date.
 * Firestore returns { toMillis: () => number } for serverTimestamp().
 */
export function toDate(val) {
    if (val == null) return new Date(0)
    if (typeof val?.toMillis === 'function') return new Date(val.toMillis())
    if (val instanceof Date) return val
    const n = Number(val)
    if (!Number.isNaN(n)) return new Date(n)
    return new Date(val)
}
