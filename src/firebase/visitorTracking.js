/**
 * Visitor tracking – stores daily unique visitor counts in Firestore
 * Collection: siteVisits/{YYYY-MM-DD} → { count, visitors: { visitorId: timestamp } }
 */
import { doc, setDoc, updateDoc, increment, collection, getDocs, getDoc } from 'firebase/firestore'
import { db } from './init.js'

const VISITOR_KEY = 'wb_visitor_id'
const VISIT_TRACKED_KEY = 'wb_visit_tracked'

function getVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
        id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        localStorage.setItem(VISITOR_KEY, id)
    }
    return id
}

function getTodayKey() {
    return new Date().toISOString().slice(0, 10)
}

/**
 * Track a unique visit for today. Only increments once per day per visitor.
 */
export async function trackVisit() {
    const today = getTodayKey()
    const visitorId = getVisitorId()
    const alreadyTracked = sessionStorage.getItem(VISIT_TRACKED_KEY)

    // Only track once per browser session per day
    if (alreadyTracked === today) return

    const ref = doc(db, 'siteVisits', today)

    try {
        const snap = await getDoc(ref)
        if (snap.exists()) {
            const data = snap.data()
            // Check if this visitor was already counted today
            if (data.visitors && data.visitors[visitorId]) {
                sessionStorage.setItem(VISIT_TRACKED_KEY, today)
                return
            }
            // Add this visitor and increment count
            await updateDoc(ref, {
                count: increment(1),
                [`visitors.${visitorId}`]: Date.now(),
            })
        } else {
            // First visitor today — create the document
            await setDoc(ref, {
                date: today,
                count: 1,
                visitors: { [visitorId]: Date.now() },
            })
        }
        sessionStorage.setItem(VISIT_TRACKED_KEY, today)
        console.log('[visitorTracking] Visit tracked for', today)
    } catch (err) {
        console.warn('[visitorTracking] Failed to track visit:', err)
    }
}

/**
 * Get visit data for a date range.
 * Returns array of { date: 'YYYY-MM-DD', count: number }
 */
export async function getVisitStats(startDate, endDate) {
    try {
        const snap = await getDocs(collection(db, 'siteVisits'))
        const results = []
        snap.forEach((d) => {
            const data = d.data()
            const date = data.date || d.id
            if (date >= startDate && date <= endDate) {
                results.push({ date, count: data.count || 0 })
            }
        })
        results.sort((a, b) => a.date.localeCompare(b.date))
        return results
    } catch (err) {
        console.warn('[visitorTracking] Failed to get visit stats:', err)
        return []
    }
}

/**
 * Get recent N days of visit data.
 */
export async function getRecentVisits(days = 30) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days + 1)
    return getVisitStats(
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
    )
}
