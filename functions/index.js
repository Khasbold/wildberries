/**
 * Firebase Cloud Functions – Push Notifications
 *
 * Deploy: firebase deploy --only functions
 * Requires: firebase init functions (select existing project)
 *
 * Send push from admin: call sendPushNotification({ title, body, tokens? })
 * If tokens omitted, fetches all from Firestore customerTokens.
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const nodemailer = require('nodemailer')
const sharp = require('sharp')
const path = require('path')
const os = require('os')
const fs = require('fs')
const https = require('https')

admin.initializeApp()

// ─── QPay v2 Configuration (Production) ───
const QPAY_BASE_URL = 'https://merchant.qpay.mn'
const QPAY_USERNAME = 'IBUNNY'
const QPAY_PASSWORD = '9p4cmx0M'
const QPAY_INVOICE_CODE = 'IBUNNY_INVOICE'

// ─── QPay Quick Pay (Production) for Merchant Management ───
const QPAY_QUICK_BASE_URL = 'https://quickqr.qpay.mn'
const QPAY_QUICK_USERNAME = 'IBUNNY'
const QPAY_QUICK_PASSWORD = 'QlBBUdjO'

// ─── Static platform merchant (used for all non-gold payments) ───
const STATIC_MERCHANT_ID = '0d9d44da-0881-4be7-8128-a6415d51f75c'
const STATIC_BANK_ACCOUNTS = [
    { default: true, account_bank_code: '050000', account_number: '5070345811', account_name: 'iBunny Store', is_default: true },
]

// ─── QPay HTTP helper ───
function qpayRequest(method, urlPath, body, bearerToken) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, QPAY_BASE_URL)
        const postData = body ? JSON.stringify(body) : ''
        const headers = { 'Content-Type': 'application/json' }

        if (bearerToken) {
            headers['Authorization'] = `Bearer ${bearerToken}`
        } else {
            const cred = Buffer.from(`${QPAY_USERNAME}:${QPAY_PASSWORD}`).toString('base64')
            headers['Authorization'] = `Basic ${cred}`
        }

        if (method !== 'GET' && method !== 'DELETE') {
            headers['Content-Length'] = Buffer.byteLength(postData)
        }

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method,
            headers,
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => { data += chunk })
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data)
                    if (res.statusCode >= 400) {
                        reject(new Error(`QPay API ${res.statusCode}: ${JSON.stringify(parsed)}`))
                    } else {
                        resolve(parsed)
                    }
                } catch {
                    if (res.statusCode >= 400) {
                        reject(new Error(`QPay API ${res.statusCode}: ${data}`))
                    } else {
                        resolve(data)
                    }
                }
            })
        })

        req.on('error', reject)
        if (postData && method !== 'GET' && method !== 'DELETE') {
            req.write(postData)
        }
        req.end()
    })
}

// ─── QPay Token Management ───
let qpayTokenCache = { access_token: null, refresh_token: null, expiresAt: 0 }

async function getQPayToken() {
    const now = Date.now()
    // Use cached token if still valid (with 60s buffer)
    if (qpayTokenCache.access_token && qpayTokenCache.expiresAt > now + 60000) {
        return qpayTokenCache.access_token
    }

    // Try refresh if we have a refresh token
    if (qpayTokenCache.refresh_token) {
        try {
            const refreshResult = await qpayRequest('POST', '/v2/auth/refresh', null, qpayTokenCache.refresh_token)
            if (refreshResult.access_token) {
                qpayTokenCache = {
                    access_token: refreshResult.access_token,
                    refresh_token: refreshResult.refresh_token || qpayTokenCache.refresh_token,
                    expiresAt: now + (refreshResult.expires_in ? refreshResult.expires_in * 1000 : 3600000),
                }
                return qpayTokenCache.access_token
            }
        } catch (err) {
            console.warn('[QPay] Token refresh failed, will re-auth:', err.message)
        }
    }

    // Full auth
    const authResult = await qpayRequest('POST', '/v2/auth/token', '')
    if (!authResult.access_token) {
        throw new Error('QPay auth failed: no access_token')
    }
    qpayTokenCache = {
        access_token: authResult.access_token,
        refresh_token: authResult.refresh_token,
        expiresAt: now + (authResult.expires_in ? authResult.expires_in * 1000 : 3600000),
    }
    return qpayTokenCache.access_token
}

// ─── QPay Callable: Create Invoice ───
exports.qpayCreateInvoice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    }

    const { orderId, amount, description, callbackUrl, receiver, tierId, durationMonths, isRenew } = data || {}
    if (!orderId || !amount) {
        throw new functions.https.HttpsError('invalid-argument', 'orderId and amount are required')
    }

    const token = await getQPayQuickToken()

    const serverCallbackUrl = `https://us-central1-bunny-5c403.cloudfunctions.net/qpayCallback`

    const invoiceBody = {
        merchant_id: STATIC_MERCHANT_ID,
        amount: Number(amount),
        currency: 'MNT',
        customer_name: 'iBunny',
        customer_logo: '',
        description: String(description || `iBunny Order ${orderId}`).slice(0, 200),
        callback_url: callbackUrl || serverCallbackUrl,
        bank_accounts: STATIC_BANK_ACCOUNTS,
    }

    try {
        const result = await qpayQuickRequest('POST', '/v2/invoice', invoiceBody, token)
        console.log('[QPay Quick] Create invoice response:', JSON.stringify(result))

        const invoiceId = result.invoice_id || result.id || result.invoiceId

        // Store invoice reference in Firestore for tracking (guarded — only if we got an invoice ID)
        if (invoiceId) {
            const db = admin.firestore()
            const invoiceDoc = {
                orderId,
                invoiceId,
                amount: Number(amount),
                status: 'PENDING',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                userId: context.auth.uid,
            }

            // Store tier metadata so the server callback can auto-activate the tier
            if (tierId) {
                invoiceDoc.tierId = tierId
                invoiceDoc.durationMonths = durationMonths || 1
                invoiceDoc.isRenew = !!isRenew
                invoiceDoc.type = 'tier'
            }

            await db.collection('qpayInvoices').doc(invoiceId).set(invoiceDoc)
        }

        return {
            invoice_id: invoiceId,
            qr_text: result.qr_text,
            qr_image: result.qr_image,
            qPay_shortUrl: result.qPay_shortUrl,
            urls: result.urls || [],
        }
    } catch (err) {
        console.error('[QPay] Create invoice failed:', err)
        throw new functions.https.HttpsError('internal', `QPay invoice creation failed: ${err.message}`)
    }
})

// ─── QPay Callable: Check Payment ───
exports.qpayCheckPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    }

    const { invoiceId } = data || {}
    if (!invoiceId) {
        throw new functions.https.HttpsError('invalid-argument', 'invoiceId is required')
    }

    const token = await getQPayQuickToken()

    try {
        const result = await qpayQuickRequest('POST', '/v2/payment/check', { invoice_id: invoiceId }, token)

        // Update Firestore if paid (guarded)
        if (result.rows && result.rows.length > 0) {
            const paidRow = result.rows.find((r) => r.payment_status === 'PAID')
            if (paidRow && invoiceId) {
                try {
                    const db = admin.firestore()
                    await db.collection('qpayInvoices').doc(invoiceId).update({
                        status: 'PAID',
                        paymentId: paidRow.payment_id,
                        paidAmount: Number(paidRow.payment_amount),
                        paidAt: admin.firestore.FieldValue.serverTimestamp(),
                    })
                } catch (fsErr) {
                    console.warn('[QPay] Firestore update skipped:', fsErr.message)
                }
            }
        }

        return result
    } catch (err) {
        console.error('[QPay] Check payment failed:', err)
        throw new functions.https.HttpsError('internal', `QPay payment check failed: ${err.message}`)
    }
})

// ─── QPay Callable: Cancel Invoice ───
exports.qpayCancelInvoice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    }

    const { invoiceId } = data || {}
    if (!invoiceId) {
        throw new functions.https.HttpsError('invalid-argument', 'invoiceId is required')
    }

    const token = await getQPayToken()

    try {
        const result = await qpayRequest('DELETE', `/v2/invoice/${invoiceId}`, null, token)

        const db = admin.firestore()
        await db.collection('qpayInvoices').doc(invoiceId).update({
            status: 'CANCELLED',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        return result
    } catch (err) {
        console.error('[QPay] Cancel invoice failed:', err)
        throw new functions.https.HttpsError('internal', `QPay invoice cancel failed: ${err.message}`)
    }
})

// ─── QPay Callback (HTTP endpoint — called by QPay when payment completes) ───
exports.qpayCallback = functions.https.onRequest(async (req, res) => {
    console.log('[QPay Callback] Received:', req.method, JSON.stringify(req.body))

    // QPay sends a POST with payment info
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed')
        return
    }

    try {
        const db = admin.firestore()

        // QPay callback body typically contains the invoice or payment reference
        // We need to find the invoice and verify payment via QPay API
        const callbackData = req.body || {}

        // Try to find the invoice_id from the callback payload
        // QPay may send: { sender_invoice_no, invoice_id, payment_id, ... }
        let invoiceId = callbackData.invoice_id
        let senderInvoiceNo = callbackData.sender_invoice_no

        // If we got a sender_invoice_no but no invoice_id, look up from Firestore
        if (!invoiceId && senderInvoiceNo) {
            const snap = await db.collection('qpayInvoices')
                .where('orderId', '==', senderInvoiceNo)
                .where('status', '==', 'PENDING')
                .limit(1)
                .get()
            if (!snap.empty) {
                invoiceId = snap.docs[0].id
            }
        }

        if (!invoiceId) {
            console.warn('[QPay Callback] No invoice_id found in callback')
            res.status(200).send('OK') // Return 200 so QPay doesn't retry
            return
        }

        // Verify payment via QPay API (don't trust the callback blindly)
        const token = await getQPayToken()
        const verifyResult = await qpayRequest('POST', '/v2/payment/check', {
            object_type: 'INVOICE',
            object_id: invoiceId,
            offset: { page_number: 1, page_limit: 100 },
        }, token)

        const paidRow = verifyResult.rows?.find((r) => r.payment_status === 'PAID')
        if (!paidRow) {
            console.log('[QPay Callback] Payment not confirmed yet for invoice:', invoiceId)
            res.status(200).send('OK')
            return
        }

        // Get the invoice document
        const invoiceDoc = await db.collection('qpayInvoices').doc(invoiceId).get()
        if (!invoiceDoc.exists) {
            console.warn('[QPay Callback] Invoice doc not found:', invoiceId)
            res.status(200).send('OK')
            return
        }

        const invoice = invoiceDoc.data()

        // Skip if already processed
        if (invoice.status === 'PAID') {
            console.log('[QPay Callback] Invoice already processed:', invoiceId)
            res.status(200).send('OK')
            return
        }

        // Mark invoice as paid
        await db.collection('qpayInvoices').doc(invoiceId).update({
            status: 'PAID',
            paymentId: paidRow.payment_id,
            paidAmount: Number(paidRow.payment_amount),
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            callbackProcessed: true,
        })

        // If this is a tier payment, auto-activate/renew the tier
        if (invoice.type === 'tier' && invoice.tierId && invoice.userId) {
            const userDoc = await db.collection('users').doc(invoice.userId).get()
            if (userDoc.exists) {
                const userData = userDoc.data()
                const now = new Date()
                let endDate

                if (invoice.isRenew && userData.tierEndDate) {
                    // Extend from current end date if still valid
                    const currentEnd = new Date(userData.tierEndDate + 'T23:59:59')
                    const startFrom = currentEnd > now ? currentEnd : now
                    endDate = new Date(startFrom)
                    endDate.setMonth(endDate.getMonth() + (invoice.durationMonths || 1))
                } else {
                    endDate = new Date(now)
                    endDate.setMonth(endDate.getMonth() + (invoice.durationMonths || 1))
                }

                await db.collection('users').doc(invoice.userId).update({
                    tier: invoice.tierId,
                    tierStartDate: userData.tierStartDate || now.toISOString().slice(0, 10),
                    tierEndDate: endDate.toISOString().slice(0, 10),
                    tierDurationMonths: admin.firestore.FieldValue.increment(invoice.durationMonths || 1),
                })

                console.log(`[QPay Callback] Tier ${invoice.isRenew ? 'renewed' : 'activated'}: user=${invoice.userId}, tier=${invoice.tierId}, until=${endDate.toISOString().slice(0, 10)}`)

                // Notify superadmin of tier purchase
                if (transporter && SUPERADMIN_EMAIL) {
                    const storeName = userData.storeName || userData.name || invoice.userId
                    const action = invoice.isRenew ? 'сунгасан' : 'идэвхжүүлсэн'
                    transporter.sendMail({
                        from: `"iBunny Platform" <${emailUser}>`,
                        to: SUPERADMIN_EMAIL,
                        subject: `[SuperAdmin] Tier ${action} — ${storeName}`,
                        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
                            <h2 style="color:#eab308;">Tier ${action} ✓</h2>
                            <p><strong>Дэлгүүр:</strong> ${storeName}</p>
                            <p><strong>Tier:</strong> ${invoice.tierId}</p>
                            <p><strong>Хугацаа:</strong> ${invoice.durationMonths || 1} сар</p>
                            <p><strong>Дуусах огноо:</strong> ${endDate.toISOString().slice(0, 10)}</p>
                            <p><strong>Дүн:</strong> ${Number(invoice.amount || 0).toLocaleString()}₮</p>
                            <p style="color:#888;font-size:11px;margin-top:16px;">iBunny Platform — SuperAdmin мэдэгдэл</p>
                        </div>`,
                    }).catch((e) => console.error('[QPay Callback] Tier email failed:', e))
                }
            }
        }

        // If this is an order payment, mark order as paid
        if (!invoice.type || invoice.type !== 'tier') {
            const orderId = invoice.orderId
            if (orderId) {
                const orderSnap = await db.collection('orders').where('orderId', '==', orderId).limit(1).get()
                if (!orderSnap.empty) {
                    await orderSnap.docs[0].ref.update({
                        paymentStatus: 'paid',
                        paidAt: admin.firestore.FieldValue.serverTimestamp(),
                    })
                    console.log('[QPay Callback] Order marked paid:', orderId)
                }
            }
        }

        res.status(200).send('OK')
    } catch (err) {
        console.error('[QPay Callback] Error:', err)
        res.status(200).send('OK') // Still return 200 to prevent QPay retries
    }
})

// ─── In-memory rate limiter ───
const rateLimitMap = new Map()
function checkRateLimit(uid, action, maxPerMinute = 10) {
    const key = `${uid}:${action}`
    const now = Date.now()
    const window = 60000
    const hits = rateLimitMap.get(key) || []
    const recent = hits.filter((t) => now - t < window)
    if (recent.length >= maxPerMinute) return false
    recent.push(now)
    rateLimitMap.set(key, recent)
    return true
}

// ─── QPay Quick Pay HTTP helper (sandbox merchant API) ───
function qpayQuickRequest(method, urlPath, body, bearerToken) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, QPAY_QUICK_BASE_URL)
        const postData = body ? JSON.stringify(body) : ''
        const headers = { 'Content-Type': 'application/json' }

        if (bearerToken) {
            headers['Authorization'] = `Bearer ${bearerToken}`
        } else {
            headers['Authorization'] = `Basic ${Buffer.from(`${QPAY_QUICK_USERNAME}:${QPAY_QUICK_PASSWORD}`).toString('base64')}`
        }

        if (method !== 'GET' && method !== 'DELETE') {
            headers['Content-Length'] = Buffer.byteLength(postData)
        }

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method,
            headers,
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => { data += chunk })
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data)
                    if (res.statusCode >= 400) {
                        reject(new Error(`QPay Quick API ${res.statusCode}: ${JSON.stringify(parsed)}`))
                    } else {
                        resolve(parsed)
                    }
                } catch {
                    if (res.statusCode >= 400) {
                        reject(new Error(`QPay Quick API ${res.statusCode}: ${data}`))
                    } else {
                        resolve(data)
                    }
                }
            })
        })
        req.on('error', reject)
        if (postData && method !== 'GET' && method !== 'DELETE') {
            req.write(postData)
        }
        req.end()
    })
}

let qpayQuickTokenCache = { access_token: null, refresh_token: null, expiresAt: 0 }

async function getQPayQuickToken() {
    const now = Date.now()
    if (qpayQuickTokenCache.access_token && qpayQuickTokenCache.expiresAt > now + 60000) {
        return qpayQuickTokenCache.access_token
    }
    if (qpayQuickTokenCache.refresh_token) {
        try {
            const r = await qpayQuickRequest('POST', '/v2/auth/refresh', null, qpayQuickTokenCache.refresh_token)
            if (r.access_token) {
                qpayQuickTokenCache = { access_token: r.access_token, refresh_token: r.refresh_token || qpayQuickTokenCache.refresh_token, expiresAt: now + (r.expires_in ? r.expires_in * 1000 : 3600000) }
                return qpayQuickTokenCache.access_token
            }
        } catch (err) { console.warn('[QPay Quick] Token refresh failed:', err.message) }
    }
    const authResult = await qpayQuickRequest('POST', '/v2/auth/token', { terminal_id: QPAY_QUICK_USERNAME })
    if (!authResult.access_token) throw new Error('QPay Quick auth failed')
    qpayQuickTokenCache = { access_token: authResult.access_token, refresh_token: authResult.refresh_token, expiresAt: now + (authResult.expires_in ? authResult.expires_in * 1000 : 3600000) }
    return qpayQuickTokenCache.access_token
}

// ─── QPay Merchant Person CRUD ───

// Login email alias groups (mirrors client-side staffLoginAliases.js)
const LOGIN_EMAIL_ALIAS_GROUPS = [
    ['superbunny@demo.web', 'superbunny@demo.app'],
]

function expandLoginEmailVariants(email) {
    const normalized = (email || '').toLowerCase().trim()
    for (const group of LOGIN_EMAIL_ALIAS_GROUPS) {
        const lowers = group.map((x) => x.toLowerCase())
        if (lowers.includes(normalized)) return [...new Set(lowers)]
    }
    return [normalized]
}

/**
 * Helper: verify the caller is a superadmin.
 * Checks by Firebase Auth UID first, then falls back to email-based lookup
 * with alias expansion (e.g. .web ↔ .app).
 */
async function verifySuperadmin(context) {
    const db = admin.firestore()
    // Try by UID first
    const userDoc = await db.collection('users').doc(context.auth.uid).get()
    if (userDoc.exists && userDoc.data().role === 'superadmin') return true
    // Fallback: look up by loginEmail with alias expansion
    const email = context.auth.token?.email
    if (email) {
        const variants = expandLoginEmailVariants(email)
        const byEmail = await db.collection('users').where('loginEmail', 'in', variants).limit(1).get()
        if (!byEmail.empty && byEmail.docs[0].data().role === 'superadmin') return true
    }
    return false
}

/**
 * Callable: Create QPay merchant person (for gold tier store owners)
 */
exports.qpayCreateMerchantPerson = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')

    const { register_number, first_name, last_name, name, name_eng, business_name, mcc_code, city, district, address, phone, email, storeId, bank_accounts } = data || {}
    if (!register_number || !business_name || !mcc_code || !city || !district || !address || !phone || !email) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: register_number, business_name, mcc_code, city, district, address, phone, email')
    }

    const token = await getQPayQuickToken()
    const body = { register_number, first_name: first_name || '', last_name: last_name || '', name: name || '', name_eng: name_eng || '', business_name, mcc_code, city, district, address, phone, email }

    try {
        const result = await qpayQuickRequest('POST', '/v2/merchant/person', body, token)

        // Save to Firestore
        const db = admin.firestore()
        const docId = result.id || result.merchant_id || `merchant-${Date.now()}`
        await db.collection('qpayMerchants').doc(docId).set({
            ...body,
            merchantId: docId,
            qpayResponse: result,
            bank_accounts: bank_accounts || [],
            storeId: storeId || null,
            userId: context.auth.uid,
            type: 'person',
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        return { success: true, merchantId: docId, data: result }
    } catch (err) {
        console.error('[QPay] Create merchant person failed:', err)
        throw new functions.https.HttpsError('internal', `QPay merchant creation failed: ${err.message}`)
    }
})

/**
 * Callable: Update QPay merchant person
 */
exports.qpayUpdateMerchantPerson = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')

    const { merchantId, register_number, first_name, last_name, name, name_eng, business_name, mcc_code, city, district, address, phone, email, bank_accounts } = data || {}
    if (!merchantId) throw new functions.https.HttpsError('invalid-argument', 'merchantId is required')

    const token = await getQPayQuickToken()
    const body = { register_number, first_name: first_name || '', last_name: last_name || '', name: name || '', name_eng: name_eng || '', business_name, mcc_code, city, district, address, phone, email }

    try {
        const result = await qpayQuickRequest('PUT', `/v2/merchant/person/${merchantId}`, body, token)

        const db = admin.firestore()
        const updateData = { ...body, qpayResponse: result, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
        if (bank_accounts) updateData.bank_accounts = bank_accounts
        await db.collection('qpayMerchants').doc(merchantId).update(updateData)

        return { success: true, data: result }
    } catch (err) {
        console.error('[QPay] Update merchant person failed:', err)
        throw new functions.https.HttpsError('internal', `QPay merchant update failed: ${err.message}`)
    }
})

/**
 * Callable: Delete QPay merchant person (superadmin only)
 */
exports.qpayDeleteMerchantPerson = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')

    const { merchantId } = data || {}
    if (!merchantId) throw new functions.https.HttpsError('invalid-argument', 'merchantId is required')

    const db = admin.firestore()

    // Verify superadmin
    if (!(await verifySuperadmin(context))) {
        throw new functions.https.HttpsError('permission-denied', 'Only superadmin can delete merchants')
    }

    try {
        await db.collection('qpayMerchants').doc(merchantId).delete()
        return { success: true }
    } catch (err) {
        console.error('[QPay] Delete merchant failed:', err)
        throw new functions.https.HttpsError('internal', `QPay merchant delete failed: ${err.message}`)
    }
})

/**
 * Callable: List all QPay merchants (superadmin only)
 */
exports.qpayListMerchants = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')

    const db = admin.firestore()
    if (!(await verifySuperadmin(context))) {
        throw new functions.https.HttpsError('permission-denied', 'Only superadmin can list merchants')
    }

    const snap = await db.collection('qpayMerchants').orderBy('createdAt', 'desc').get()
    const merchants = snap.docs.map((d) => {
        const data = d.data()
        // Convert Firestore Timestamps to ISO strings for serialization
        if (data.createdAt && data.createdAt.toDate) data.createdAt = data.createdAt.toDate().toISOString()
        if (data.updatedAt && data.updatedAt.toDate) data.updatedAt = data.updatedAt.toDate().toISOString()
        return { id: d.id, ...data }
    })
    return merchants
})

/**
 * Callable: Get QPay aimag/hot (provinces/cities) list
 */
exports.qpayGetAimagHot = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    try {
        const token = await getQPayQuickToken()
        const result = await qpayQuickRequest('GET', '/v2/aimaghot', null, token)
        return result
    } catch (err) {
        console.error('[QPay] Get aimaghot failed:', err)
        throw new functions.https.HttpsError('internal', `QPay aimaghot failed: ${err.message}`)
    }
})

/**
 * Callable: Get QPay districts for a given city code
 */
exports.qpayGetDistricts = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    const { cityCode } = data || {}
    if (!cityCode) throw new functions.https.HttpsError('invalid-argument', 'cityCode is required')
    try {
        const token = await getQPayQuickToken()
        const result = await qpayQuickRequest('GET', `/v2/sumduureg/${cityCode}`, null, token)
        return result
    } catch (err) {
        console.error('[QPay] Get districts failed:', err)
        throw new functions.https.HttpsError('internal', `QPay districts failed: ${err.message}`)
    }
})

/**
 * Callable: Get a merchant from QPay API by ID
 */
exports.qpayGetMerchant = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    const { merchantId } = data || {}
    if (!merchantId) throw new functions.https.HttpsError('invalid-argument', 'merchantId is required')
    try {
        const token = await getQPayQuickToken()
        const result = await qpayQuickRequest('GET', `/v2/merchant/${merchantId}`, null, token)
        return result
    } catch (err) {
        console.error('[QPay] Get merchant failed:', err)
        throw new functions.https.HttpsError('internal', `QPay get merchant failed: ${err.message}`)
    }
})

/**
 * Callable: List merchants from QPay API (paginated)
 */
exports.qpayListMerchantsFromApi = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    const db = admin.firestore()
    if (!(await verifySuperadmin(context))) {
        throw new functions.https.HttpsError('permission-denied', 'Only superadmin can list merchants from API')
    }
    try {
        const token = await getQPayQuickToken()
        const body = { offset: { page_number: (data?.page || 1), page_limit: (data?.limit || 50) } }
        const result = await qpayQuickRequest('POST', '/v2/merchant/list', body, token)
        return result
    } catch (err) {
        console.error('[QPay] List merchants from API failed:', err)
        throw new functions.https.HttpsError('internal', `QPay merchant list failed: ${err.message}`)
    }
})

/**
 * Callable: Create QPay Quick Pay invoice for a Gold-tier store merchant.
 * Used at checkout when the product's store owner has a QPay merchant account.
 */
exports.qpayCreateQuickInvoice = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')

    const { merchantId, amount, description, callbackUrl, bank_accounts } = data || {}
    if (!merchantId || !amount) {
        throw new functions.https.HttpsError('invalid-argument', 'merchantId and amount are required')
    }

    const token = await getQPayQuickToken()
    const invoiceBody = {
        merchant_id: merchantId,
        amount: Number(amount),
        currency: 'MNT',
        customer_name: 'iBunny',
        customer_logo: '',
        callback_url: callbackUrl || `https://us-central1-bunny-5c403.cloudfunctions.net/qpayCallback`,
        description: String(description || 'iBunny Order').slice(0, 200),
    }
    if (Array.isArray(bank_accounts) && bank_accounts.length > 0) {
        invoiceBody.bank_accounts = bank_accounts
    }

    try {
        const result = await qpayQuickRequest('POST', '/v2/invoice', invoiceBody, token)
        return {
            invoice_id: result.invoice_id,
            qr_text: result.qr_text,
            qr_image: result.qr_image,
            qPay_shortUrl: result.qPay_shortUrl,
            urls: result.urls || [],
        }
    } catch (err) {
        console.error('[QPay Quick] Create invoice failed:', err)
        throw new functions.https.HttpsError('internal', `QPay Quick invoice failed: ${err.message}`)
    }
})

/**
 * Callable: Check payment on Quick Pay invoice
 */
exports.qpayCheckQuickPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    const { invoiceId } = data || {}
    if (!invoiceId) throw new functions.https.HttpsError('invalid-argument', 'invoiceId is required')
    const token = await getQPayQuickToken()
    try {
        const result = await qpayQuickRequest('POST', '/v2/payment/check', { invoice_id: invoiceId }, token)
        return result
    } catch (err) {
        console.error('[QPay Quick] Check payment failed:', err)
        throw new functions.https.HttpsError('internal', `QPay Quick payment check failed: ${err.message}`)
    }
})

/**
 * Callable: create order with atomic stock decrement via Firestore transaction.
 * Client calls this instead of writing directly to avoid race conditions.
 */
exports.createOrderAtomic = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
    }

    // Rate limit: max 5 orders per minute per user
    if (!checkRateLimit(context.auth.uid, 'order', 5)) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many orders. Please wait.')
    }

    const { orderId, orderData, items } = data || {}
    if (!orderId || !orderData || !Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'orderId, orderData, and items are required')
    }
    if (items.length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'Too many items')
    }

    const db = admin.firestore()

    await db.runTransaction(async (txn) => {
        // Read current stock for all products
        const productRefs = items.map((i) => db.collection('products').doc(i.productId))
        const productSnaps = await Promise.all(productRefs.map((ref) => txn.get(ref)))

        // Validate stock availability
        for (let i = 0; i < items.length; i++) {
            const snap = productSnaps[i]
            if (!snap.exists) {
                throw new functions.https.HttpsError('not-found', `Product ${items[i].productId} not found`)
            }
            const product = snap.data()
            const available = product.stockQuantity ?? 0
            const requested = items[i].quantity || 1
            if (available < requested && product.productType !== 'order') {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    `Insufficient stock for "${product.title || items[i].productId}": ${available} available, ${requested} requested`
                )
            }
        }

        // Decrement stock atomically
        for (let i = 0; i < items.length; i++) {
            const snap = productSnaps[i]
            const product = snap.data()
            if (product.productType === 'order') continue
            const newQty = Math.max(0, (product.stockQuantity ?? 0) - (items[i].quantity || 1))
            txn.update(productRefs[i], {
                stockQuantity: newQty,
                inStock: newQty > 0,
            })
        }

        // Create the order document
        const orderRef = db.collection('orders').doc(orderId)
        txn.set(orderRef, {
            ...orderData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
    })

    return { success: true, orderId }
})

// Configure email transport via functions/.env file:
//   EMAIL_USER=your@gmail.com
//   EMAIL_PASS=your-app-password
const emailUser = process.env.EMAIL_USER || ''
const emailPass = process.env.EMAIL_PASS || ''
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'idealogy0108@gmail.com'

const transporter = emailUser && emailPass
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass },
    })
    : null

/**
 * Callable function: send push notification to devices
 * Usage from client: const sendPush = httpsCallable(functions, 'sendPushNotification')
 * await sendPush({ title: 'Hello', body: 'Message', tokens: ['fcm-token-1', ...] })
 * If tokens omitted, sends to all devices in customerTokens collection.
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
    const { title, body, tokens: providedTokens } = data || {}

    if (!title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'title and body are required')
    }

    // TODO: Add admin auth check
    // if (!context.auth?.token?.admin) throw new functions.https.HttpsError('permission-denied', 'Admin only')

    let tokens = Array.isArray(providedTokens) ? providedTokens : []
    if (tokens.length === 0) {
        const snap = await admin.firestore().collection('customerTokens').get()
        tokens = []
        snap.docs.forEach((d) => {
            (d.data().tokens || []).forEach((t) => tokens.push(t))
        })
    }

    if (tokens.length === 0) {
        return { success: false, sent: 0, message: 'No devices to send to' }
    }

    const message = {
        notification: { title, body },
        webpush: {
            notification: { title, body, icon: '/logo.png' },
            fcmOptions: { link: '/' },
        },
        tokens,
    }

    const result = await admin.messaging().sendEachForMulticast(message)
    return {
        success: true,
        sent: result.successCount,
        failed: result.failureCount,
        total: tokens.length,
    }
})

/**
 * Callable function: get all customer FCM tokens (for admin notifications page)
 * Bypasses Firestore rules. Add auth check when admin uses Firebase Auth.
 */
exports.getCustomerTokens = functions.https.onCall(async () => {
    const snap = await admin.firestore().collection('customerTokens').get()
    const result = []
    snap.docs.forEach((d) => {
        const data = d.data()
            ; (data.tokens || []).forEach((token) => {
                if (token && typeof token === 'string') {
                    result.push({
                        userId: d.id,
                        token,
                        email: data.email || null,
                        displayName: data.displayName || data.email || 'Anonymous',
                    })
                }
            })
    })
    return result
})

/**
 * Firestore trigger: send email to store owners when a new order is created.
 * Each store owner with a configured storeEmail gets notified about their items.
 */
exports.onOrderCreated = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data()
        const orderId = context.params.orderId

        if (!order || !Array.isArray(order.items) || order.items.length === 0) return null

        // Group items by storeId
        const storeItemsMap = {}
        for (const item of order.items) {
            const sid = item.storeId || '_'
            if (!storeItemsMap[sid]) storeItemsMap[sid] = []
            storeItemsMap[sid].push(item)
        }

        const storeIds = Object.keys(storeItemsMap)
        if (storeIds.length === 0) return null

        // Look up product names for the items
        const productIds = [...new Set(order.items.map((i) => i.productId).filter(Boolean))]
        const productNames = {}
        for (let i = 0; i < productIds.length; i += 10) {
            const batch = productIds.slice(i, i + 10)
            const productsSnap = await admin.firestore().collection('products')
                .where('__name__', 'in', batch).get()
            productsSnap.docs.forEach((d) => {
                productNames[d.id] = d.data().title || d.id
            })
        }

        // Look up store owner emails from users collection
        const usersSnap = await admin.firestore().collection('users').get()
        const adminUsers = []
        usersSnap.docs.forEach((d) => {
            const data = d.data()
            if (data.storeId && data.role === 'admin') {
                adminUsers.push({ id: d.id, ...data })
            }
        })

        const customer = order.customer || {}
        const total = order.total || 0
        const siteUrl = 'https://bunny-5c403.web.app'

        const emailPromises = []

        for (const sid of storeIds) {
            if (sid === '_') continue
            const storeUser = adminUsers.find((u) => u.storeId === sid)
            const storeEmail = storeUser?.storeEmail
            if (!storeEmail) {
                console.log(`[onOrderCreated] Store ${sid} has no email configured, skipping.`)
                continue
            }

            const items = storeItemsMap[sid]
            const storeBreakdownRow = (order.storeBreakdown || []).find((b) => b.storeId === sid)
            const storeTotal = storeBreakdownRow ? storeBreakdownRow.total : total

            const orderLink = `${siteUrl}/admin/orders/${orderId}`

            const itemsTableRows = items.map((i) => {
                const name = productNames[i.productId] || i.productId
                const qty = i.quantity || 1
                return `<tr>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0;">${name}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">${qty}</td>
                </tr>`
            }).join('')

            const subject = `🐰 Шинэ захиалга ирлээ — ${orderId}`
            const html = `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #D66B3E;">Шинэ захиалга ирлээ!</h2>
                    <p><strong>Захиалгын дугаар:</strong> ${orderId}</p>
                    <p><strong>Захиалагч:</strong> ${customer.name || '—'}</p>
                    <p><strong>Утас:</strong> ${customer.phone || '—'}</p>

                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <thead>
                            <tr style="background: #f9fafb;">
                                <th style="padding: 8px 12px; text-align: left; font-size: 13px; color: #6b7280;">Бүтээгдэхүүн</th>
                                <th style="padding: 8px 12px; text-align: center; font-size: 13px; color: #6b7280;">Тоо ширхэг</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsTableRows}
                        </tbody>
                    </table>

                    <p><strong>Дүн:</strong> ${Number(storeTotal).toLocaleString()}₮</p>
                    <p><strong>Огноо:</strong> ${new Date().toISOString()}</p>

                    <div style="margin: 20px 0;">
                        <a href="${orderLink}" target="_blank" style="display: inline-block; background: #D66B3E; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            Захиалга харах →
                        </a>
                    </div>

                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="color: #888; font-size: 12px;">Админ хуудсаар орж захиалгыг хүлээн авна уу. — iBunny Platform</p>
                </div>
            `

            if (!transporter) {
                console.warn(`[onOrderCreated] Email not configured. Would send to ${storeEmail}:`, subject)
                continue
            }

            emailPromises.push(
                transporter.sendMail({
                    from: `"iBunny Platform" <${emailUser}>`,
                    to: storeEmail,
                    subject,
                    html,
                }).then(() => {
                    console.log(`[onOrderCreated] Email sent to ${storeEmail} for store ${sid}, order ${orderId}`)
                }).catch((err) => {
                    console.error(`[onOrderCreated] Email to ${storeEmail} failed:`, err)
                })
            )
        }

        await Promise.all(emailPromises)

        // Notify superadmin
        if (transporter && SUPERADMIN_EMAIL) {
            const allItemsRows = order.items.map((i) => {
                const name = productNames[i.productId] || i.productId
                return `<tr><td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;">${name}</td><td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity || 1}</td><td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right;">${i.storeId || '—'}</td></tr>`
            }).join('')
            await transporter.sendMail({
                from: `"iBunny Platform" <${emailUser}>`,
                to: SUPERADMIN_EMAIL,
                subject: `[SuperAdmin] Шинэ захиалга — ${orderId}`,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
                    <h2 style="color:#D66B3E;">Шинэ захиалга бүртгэгдлээ</h2>
                    <p><strong>Захиалгын дугаар:</strong> ${orderId}</p>
                    <p><strong>Захиалагч:</strong> ${customer.name || '—'} / ${customer.phone || '—'}</p>
                    <p><strong>Нийт дүн:</strong> ${Number(total).toLocaleString()}₮</p>
                    <table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                        <thead><tr style="background:#f9fafb;">
                            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#6b7280;">Бүтээгдэхүүн</th>
                            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#6b7280;">Тоо</th>
                            <th style="padding:8px 10px;text-align:right;font-size:12px;color:#6b7280;">Дэлгүүр</th>
                        </tr></thead>
                        <tbody>${allItemsRows}</tbody>
                    </table>
                    <a href="${siteUrl}/admin/orders/${orderId}" style="display:inline-block;background:#1e293b;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;">Захиалга харах →</a>
                    <p style="color:#888;font-size:11px;margin-top:16px;">iBunny Platform — SuperAdmin мэдэгдэл</p>
                </div>`,
            }).catch((e) => console.error('[onOrderCreated] SuperAdmin email failed:', e))
        }

        return null
    })

/**
 * Firestore trigger: send email to superadmin when an order is delivered.
 * Fires when order document is updated and aggregate status becomes 'Delivered'.
 */
exports.onOrderDelivered = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data()
        const after = change.after.data()
        const orderId = context.params.orderId

        if (before.status === after.status) return null
        if (after.status !== 'Delivered') return null
        if (!transporter || !SUPERADMIN_EMAIL) return null

        const customer = after.customer || {}
        const total = after.total || 0
        const siteUrl = 'https://bunny-5c403.web.app'

        await transporter.sendMail({
            from: `"iBunny Platform" <${emailUser}>`,
            to: SUPERADMIN_EMAIL,
            subject: `[SuperAdmin] Захиалга хүргэгдлээ — ${orderId}`,
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
                <h2 style="color:#10b981;">Захиалга хүргэгдлээ ✓</h2>
                <p><strong>Захиалгын дугаар:</strong> ${orderId}</p>
                <p><strong>Захиалагч:</strong> ${customer.name || '—'}</p>
                <p><strong>Нийт дүн:</strong> ${Number(total).toLocaleString()}₮</p>
                <a href="${siteUrl}/admin/orders/${orderId}" style="display:inline-block;background:#10b981;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;">Захиалга харах →</a>
                <p style="color:#888;font-size:11px;margin-top:16px;">iBunny Platform — SuperAdmin мэдэгдэл</p>
            </div>`,
        }).catch((e) => console.error('[onOrderDelivered] SuperAdmin email failed:', e))

        return null
    })

/**
 * Storage trigger: generate WebP thumbnails (400px, 800px) when an image is uploaded.
 * Thumbnails are saved alongside the original with prefix thumb_<width>x_.
 * E.g., products/abc/photo.jpg → products/abc/thumb_400x_photo.webp
 */
exports.generateThumbnails = functions.storage.object().onFinalize(async (object) => {
    const filePath = object.name
    const contentType = object.contentType || ''
    const fileName = path.basename(filePath)

    // Skip if not an image or already a thumbnail
    if (!contentType.startsWith('image/')) return null
    if (fileName.startsWith('thumb_')) return null

    const bucket = admin.storage().bucket(object.bucket)
    const tempFilePath = path.join(os.tmpdir(), fileName)

    await bucket.file(filePath).download({ destination: tempFilePath })

    const dir = path.dirname(filePath)
    const baseName = path.basename(fileName, path.extname(fileName))

    const sizes = [400, 800]
    const uploadPromises = sizes.map(async (width) => {
        const thumbName = `thumb_${width}x_${baseName}.webp`
        const thumbPath = path.join(dir, thumbName)
        const tempThumbPath = path.join(os.tmpdir(), thumbName)

        await sharp(tempFilePath)
            .resize(width, width, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(tempThumbPath)

        await bucket.upload(tempThumbPath, {
            destination: thumbPath,
            metadata: { contentType: 'image/webp' },
        })

        // Clean up temp thumb
        fs.unlinkSync(tempThumbPath)
    })

    await Promise.all(uploadPromises)
    fs.unlinkSync(tempFilePath)
    console.log(`[generateThumbnails] Created thumbnails for ${filePath}`)
    return null
})

/**
 * Firestore trigger: send push notifications when order status changes.
 * Fires on any update to an order document. Checks if status or fulfillment
 * statuses changed, then sends FCM push to the customer who placed the order.
 */
exports.onOrderStatusChange = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data()
        const after = change.after.data()
        const orderId = context.params.orderId

        // Check if aggregate status changed
        const statusChanged = before.status !== after.status

        // Check if any fulfillment status changed
        const beforeF = before.fulfillments || {}
        const afterF = after.fulfillments || {}
        let fulfillmentChanged = false
        for (const storeId of Object.keys(afterF)) {
            if (afterF[storeId]?.status !== beforeF[storeId]?.status) {
                fulfillmentChanged = true
                break
            }
        }

        if (!statusChanged && !fulfillmentChanged) return null

        // Find the customer's FCM tokens
        const userId = after.userId
        if (!userId) return null

        const tokenDoc = await admin.firestore().collection('customerTokens').doc(userId).get()
        if (!tokenDoc.exists) return null
        const tokens = tokenDoc.data().tokens || []
        if (tokens.length === 0) return null

        // Build notification
        const statusLabels = {
            'New': 'Шинэ',
            'Accepted': 'Хүлээн авсан',
            'Confirmed': 'Баталсан',
            'Preparing': 'Бэлтгэж байна',
            'Ready': 'Бэлэн',
            'Shipped': 'Илгээсэн',
            'Delivered': 'Хүргэсэн',
            'Bunny': 'Дууссан',
        }

        // Build more descriptive notifications
        let title = `Захиалга #${orderId.slice(-6)} шинэчлэгдлээ`
        let body = ''

        // Check which fulfillment changed
        if (fulfillmentChanged) {
            for (const storeId of Object.keys(afterF)) {
                const prevStatus = beforeF[storeId]?.status
                const newStatus = afterF[storeId]?.status
                if (prevStatus !== newStatus) {
                    if (newStatus === 'Accepted') {
                        title = `Захиалга #${orderId.slice(-6)} хүлээн авагдлаа! ✅`
                        body = 'Дэлгүүрийн эзэн таны захиалгыг хүлээн авлаа. Бэлтгэж эхэлнэ.'
                    } else if (newStatus === 'Shipped') {
                        title = `Захиалга #${orderId.slice(-6)} илгээгдлээ! 🚚`
                        body = 'Таны захиалга илгээгдлээ.'
                    } else if (newStatus === 'Delivered') {
                        title = `Захиалга #${orderId.slice(-6)} хүргэгдлээ! 📦`
                        body = 'Таны захиалга амжилттай хүргэгдлээ.'
                    } else {
                        body = `Статус: ${statusLabels[newStatus] || newStatus}`
                    }
                    break
                }
            }
        } else if (statusChanged) {
            body = `Статус: ${statusLabels[after.status] || after.status}`
        }

        const message = {
            notification: { title, body },
            webpush: {
                notification: { title, body, icon: '/logo.png' },
                fcmOptions: { link: '/orders' },
            },
            tokens,
        }

        try {
            const result = await admin.messaging().sendEachForMulticast(message)
            console.log(`[onOrderStatusChange] Sent ${result.successCount}/${tokens.length} for order ${orderId}`)

            // Clean up invalid tokens
            if (result.failureCount > 0) {
                const invalidTokens = []
                result.responses.forEach((resp, idx) => {
                    if (resp.error?.code === 'messaging/invalid-registration-token' ||
                        resp.error?.code === 'messaging/registration-token-not-registered') {
                        invalidTokens.push(tokens[idx])
                    }
                })
                if (invalidTokens.length > 0) {
                    const validTokens = tokens.filter((t) => !invalidTokens.includes(t))
                    await admin.firestore().collection('customerTokens').doc(userId).update({ tokens: validTokens })
                    console.log(`[onOrderStatusChange] Removed ${invalidTokens.length} invalid tokens for user ${userId}`)
                }
            }
        } catch (err) {
            console.error(`[onOrderStatusChange] Push failed for order ${orderId}:`, err)
        }

        return null
    })

/**
 * Firestore trigger: when a new chat message is created in an order's messages subcollection.
 * - Increment unread counter on the order document (unreadByCustomer or unreadByStore)
 * - Send FCM push notification to the other party
 */
exports.onNewChatMessage = functions.firestore
    .document('orders/{orderId}/messages/{msgId}')
    .onCreate(async (snap, context) => {
        const message = snap.data()
        const orderId = context.params.orderId
        const senderRole = message.senderRole

        if (!senderRole || !message.senderId) return null

        const db = admin.firestore()
        const orderRef = db.collection('orders').doc(orderId)
        const orderSnap = await orderRef.get()
        if (!orderSnap.exists) return null
        const order = orderSnap.data()

        // Increment the appropriate unread counter
        const unreadField = senderRole === 'customer' ? 'unreadByStore' : 'unreadByCustomer'
        await orderRef.update({
            [unreadField]: admin.firestore.FieldValue.increment(1),
        })

        // Check if recipient currently has chat open — skip push if so
        const chatActiveBy = order.chatActiveBy || []
        const recipientRole = senderRole === 'customer' ? 'store' : 'customer'
        if (chatActiveBy.includes(recipientRole)) {
            console.log(`[onNewChatMessage] Recipient (${recipientRole}) has chat open, skipping push`)
            return null
        }

        // Determine recipient tokens and send push notification
        let recipientTokens = []
        const preview = (message.text || '').slice(0, 80)

        if (senderRole === 'customer') {
            // Notify each store owner individually
            const storeIds = [...new Set((order.items || []).map((i) => i.storeId).filter(Boolean))]
            for (const sid of storeIds) {
                const usersSnap = await db.collection('users').where('storeId', '==', sid).where('role', '==', 'admin').limit(1).get()
                if (!usersSnap.empty) {
                    const storeUserId = usersSnap.docs[0].id
                    const tokenDoc = await db.collection('customerTokens').doc(storeUserId).get()
                    if (tokenDoc.exists) {
                        recipientTokens.push(...(tokenDoc.data().tokens || []))
                    }
                }
            }
        } else {
            // Notify the customer
            const userId = order.userId
            if (userId) {
                const tokenDoc = await db.collection('customerTokens').doc(userId).get()
                if (tokenDoc.exists) {
                    recipientTokens.push(...(tokenDoc.data().tokens || []))
                }
            }
        }

        if (recipientTokens.length === 0) return null

        const orderShort = orderId.slice(-6)
        const title = senderRole === 'customer'
            ? `Худалдан авагч чат илгээлээ — #${orderShort}`
            : `Дэлгүүрийн эзэн хариулт бичлээ — #${orderShort}`
        const body = preview || (senderRole === 'customer'
            ? 'Худалдан авагч танд мессеж илгээлээ'
            : 'Дэлгүүрээс мессеж ирлээ')

        const fcmMessage = {
            notification: { title, body },
            webpush: {
                notification: { title, body, icon: '/logo.png' },
                fcmOptions: { link: senderRole === 'customer' ? `/admin/orders/${orderId}` : '/orders' },
            },
            tokens: recipientTokens,
        }

        try {
            const result = await admin.messaging().sendEachForMulticast(fcmMessage)
            console.log(`[onNewChatMessage] Sent ${result.successCount}/${recipientTokens.length} for order ${orderId}`)

            if (result.failureCount > 0) {
                const invalidTokens = []
                result.responses.forEach((resp, idx) => {
                    if (resp.error?.code === 'messaging/invalid-registration-token' ||
                        resp.error?.code === 'messaging/registration-token-not-registered') {
                        invalidTokens.push(recipientTokens[idx])
                    }
                })
                if (invalidTokens.length > 0) {
                    const recipientId = senderRole === 'customer' ? null : order.userId
                    if (recipientId) {
                        const tokenDoc = await db.collection('customerTokens').doc(recipientId).get()
                        if (tokenDoc.exists) {
                            const validTokens = (tokenDoc.data().tokens || []).filter((t) => !invalidTokens.includes(t))
                            await db.collection('customerTokens').doc(recipientId).update({ tokens: validTokens })
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`[onNewChatMessage] Push failed for order ${orderId}:`, err)
        }

        return null
    })

// ─── OG Preview – Social Media Share Endpoint ───
// Serves OG meta tags for product/store links so Facebook/Instagram/Telegram
// show a proper preview card. Regular browsers are JS-redirected to the SPA.
const APP_HOSTING_URL = 'https://bunny-5c403.web.app'
const DEFAULT_OG_IMAGE = `${APP_HOSTING_URL}/preview.png`

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

exports.ogPreview = functions.https.onRequest(async (req, res) => {
    const parts = req.path.split('/').filter(Boolean)
    const type = parts[0]  // 'product' or 'store'
    const id = parts[1]

    let title = 'iBunny — Online Shop'
    let description = 'iBunny — маркетплейс, хүн бүр дэлгүүр нээж бараа зарах боломжтой.'
    let image = DEFAULT_OG_IMAGE
    let targetUrl = APP_HOSTING_URL

    const db = admin.firestore()

    try {
        if (type === 'product' && id) {
            const snap = await db.collection('products').doc(id).get()
            if (snap.exists) {
                const p = snap.data()
                title = p.title || title
                description = p.description
                    ? p.description.slice(0, 160)
                    : [p.brand, p.price ? Number(p.price).toLocaleString('mn-MN') + '₮' : ''].filter(Boolean).join(' — ')
                image = p.thumbnail || (Array.isArray(p.images) ? p.images[0] : null) || DEFAULT_OG_IMAGE
                targetUrl = `${APP_HOSTING_URL}/product/${id}`
            }
        } else if (type === 'store' && id) {
            const snap = await db.collection('users').where('storeId', '==', id).limit(1).get()
            if (!snap.empty) {
                const s = snap.docs[0].data()
                title = s.storeName || title
                description = `${s.storeName || 'iBunny'} — iBunny дэлгүүр`
                image = s.storeBannerImage || s.storeImage || DEFAULT_OG_IMAGE
                targetUrl = `${APP_HOSTING_URL}/store/${id}`
            }
        }
    } catch (err) {
        console.error('[ogPreview] Firestore error:', err)
    }

    const safeTitle = escapeHtml(title)
    const safeDesc = escapeHtml(description)
    const safeImage = escapeHtml(image)
    const safeUrl = escapeHtml(targetUrl)

    const html = `<!DOCTYPE html>
<html lang="mn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="iBunny">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${safeUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
</head>
<body>
  <script>window.location.replace("${safeUrl}")</script>
  <noscript><meta http-equiv="refresh" content="0;url=${safeUrl}"></noscript>
  <p style="font-family:sans-serif;text-align:center;padding:40px">
    <a href="${safeUrl}">iBunny руу орох</a>
  </p>
</body>
</html>`

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
    res.status(200).send(html)
})
