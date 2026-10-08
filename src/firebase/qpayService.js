/**
 * QPay Payment Service
 *
 * Handles QPay v2 API integration through Firebase Cloud Functions.
 * All API calls are proxied through Cloud Functions to keep credentials secure.
 *
 * Flow:
 *  1. createInvoice() → creates QPay invoice, returns QR image + deeplinks
 *  2. checkPayment()  → polls QPay to verify payment status
 *  3. cancelInvoice() → cancels an unpaid invoice
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from './init.js'

const functions = getFunctions(app, 'us-central1')

// ─── Static merchant config (used for all non-gold payments) ───
const STATIC_MERCHANT = {
    merchantId: '0d9d44da-0881-4be7-8128-a6415d51f75c',
    bank_accounts: [
        {
            default: true,
            account_bank_code: '050000',
            account_number: '5070345811',
            account_name: 'iBunny Store',
            is_default: true,
        },
    ],
}

// ─── Cloud Function callables ───
const qpayCreateInvoiceFn = httpsCallable(functions, 'qpayCreateInvoice')
const qpayCheckPaymentFn = httpsCallable(functions, 'qpayCheckPayment')
const qpayCancelInvoiceFn = httpsCallable(functions, 'qpayCancelInvoice')

// ─── Merchant person callables ───
const qpayCreateMerchantPersonFn = httpsCallable(functions, 'qpayCreateMerchantPerson')
const qpayUpdateMerchantPersonFn = httpsCallable(functions, 'qpayUpdateMerchantPerson')
const qpayDeleteMerchantPersonFn = httpsCallable(functions, 'qpayDeleteMerchantPerson')
const qpayListMerchantsFn = httpsCallable(functions, 'qpayListMerchants')
const qpayGetAimagHotFn = httpsCallable(functions, 'qpayGetAimagHot')
const qpayGetDistrictsFn = httpsCallable(functions, 'qpayGetDistricts')
const qpayGetMerchantFn = httpsCallable(functions, 'qpayGetMerchant')
const qpayListMerchantsFromApiFn = httpsCallable(functions, 'qpayListMerchantsFromApi')
const qpayCreateQuickInvoiceFn = httpsCallable(functions, 'qpayCreateQuickInvoice')
const qpayCheckQuickPaymentFn = httpsCallable(functions, 'qpayCheckQuickPayment')

/**
 * Create a QPay invoice for an order.
 *
 * @param {Object} params
 * @param {string} params.orderId     - Unique order ID (e.g. ORD-1712345678)
 * @param {number} params.amount      - Total amount in MNT
 * @param {string} params.description - Invoice description
 * @param {string} params.callbackUrl - URL QPay will hit when payment completes
 * @param {Object} [params.receiver]  - Optional receiver info { register, name, email, phone }
 *
 * @returns {Promise<{
 *   invoice_id: string,
 *   qr_text: string,
 *   qr_image: string,
 *   qPay_shortUrl: string,
 *   urls: Array<{ name: string, description: string, logo: string, link: string }>
 * }>}
 */
export async function createInvoice({ orderId, amount, description, callbackUrl, receiver, tierId, durationMonths, isRenew }) {
    const result = await qpayCreateInvoiceFn({
        orderId,
        amount,
        description,
        callbackUrl,
        receiver,
        tierId,
        durationMonths,
        isRenew,
    })
    return result.data
}

/**
 * Check whether a QPay invoice has been paid.
 *
 * @param {string} invoiceId - The QPay invoice_id returned from createInvoice
 * @returns {Promise<{
 *   count: number,
 *   paid_amount: number,
 *   rows: Array<{
 *     payment_id: string,
 *     payment_status: 'NEW'|'PAID'|'FAILED'|'REFUNDED',
 *     payment_date: string,
 *     payment_amount: string,
 *     payment_currency: string,
 *     transaction_type: string
 *   }>
 * }>}
 */
export async function checkPayment(invoiceId) {
    const result = await qpayCheckPaymentFn({ invoiceId })
    return result.data
}

/**
 * Cancel an unpaid QPay invoice.
 *
 * @param {string} invoiceId - The QPay invoice_id to cancel
 * @returns {Promise<Object>}
 */
export async function cancelInvoice(invoiceId) {
    const result = await qpayCancelInvoiceFn({ invoiceId })
    return result.data
}

function normalizeCheckPayload(raw) {
    if (!raw || typeof raw !== 'object') return {}
    return raw.result && typeof raw.result === 'object' ? raw.result : raw
}

export function extractPaidPayment(raw) {
    const result = normalizeCheckPayload(raw)

    const paidRow = result.rows?.find((r) => {
        const status = String(r?.payment_status || '').toUpperCase()
        return status === 'PAID' || status === 'SUCCESS'
    })
    if (paidRow) return paidRow

    const paidPayment = result.payments?.find((p) => {
        const status = String(p?.payment_status || '').toUpperCase()
        return status === 'PAID' || status === 'SUCCESS'
    })
    if (paidPayment) return paidPayment

    const invoiceStatus = String(result.invoice_status || '').toUpperCase()
    if (invoiceStatus === 'PAID') {
        return { payment_status: 'PAID', invoice_status: 'PAID' }
    }

    return null
}

// ─── Payment polling helper ───

/**
 * Poll QPay payment status at an interval until paid or timeout.
 *
 * @param {string}  invoiceId         - QPay invoice ID
 * @param {Object}  [options]
 * @param {number}  [options.interval=3000] - Poll interval in ms
 * @param {number}  [options.timeout=300000] - Max wait time (5 min default)
 * @param {Function} [options.onCheck] - Called on each poll with the result
 *
 * @returns {Promise<{ paid: boolean, payment: Object|null }>}
 */
export function pollPaymentStatus(invoiceId, options = {}) {
    const { interval = 3000, timeout = 300000, onCheck } = options

    return new Promise((resolve) => {
        const startTime = Date.now()
        let timer = null

        async function check() {
            try {
                const result = await checkPayment(invoiceId)
                if (onCheck) onCheck(result)

                const paidRow = extractPaidPayment(result)
                if (paidRow) {
                    clearInterval(timer)
                    resolve({ paid: true, payment: paidRow })
                    return
                }

                if (Date.now() - startTime > timeout) {
                    clearInterval(timer)
                    resolve({ paid: false, payment: null })
                }
            } catch (err) {
                console.error('[QPay] Poll error:', err)
                // Don't stop polling on transient errors
            }
        }

        // First check immediately
        check()
        timer = setInterval(check, interval)
    })
}

// ─── Merchant Person API ───

export async function createMerchantPerson(data) {
    const result = await qpayCreateMerchantPersonFn(data)
    return result.data
}

export async function updateMerchantPerson(data) {
    const result = await qpayUpdateMerchantPersonFn(data)
    return result.data
}

export async function deleteMerchantPerson(merchantId) {
    const result = await qpayDeleteMerchantPersonFn({ merchantId })
    return result.data
}

export async function listMerchants() {
    const result = await qpayListMerchantsFn()
    return result.data
}

export async function getAimagHot() {
    const result = await qpayGetAimagHotFn()
    return result.data
}

export async function getDistricts(cityCode) {
    const result = await qpayGetDistrictsFn({ cityCode })
    return result.data
}

export async function getMerchant(merchantId) {
    const result = await qpayGetMerchantFn({ merchantId })
    return result.data
}

export async function listMerchantsFromApi(page = 1, limit = 50) {
    const result = await qpayListMerchantsFromApiFn({ page, limit })
    return result.data
}

export async function createQuickInvoice({ merchantId, amount, description, callbackUrl, bank_accounts }) {
    const result = await qpayCreateQuickInvoiceFn({ merchantId, amount, description, callbackUrl, bank_accounts })
    return result.data
}

export async function checkQuickPayment(invoiceId) {
    const result = await qpayCheckQuickPaymentFn({ invoiceId })
    return result.data
}

/**
 * Poll Quick Pay payment status at an interval until paid or timeout.
 */
export function pollQuickPaymentStatus(invoiceId, options = {}) {
    const { interval = 3000, timeout = 300000, onCheck } = options
    return new Promise((resolve) => {
        const startTime = Date.now()
        let timer = null
        async function check() {
            try {
                const result = await checkQuickPayment(invoiceId)
                if (onCheck) onCheck(result)
                const paidRow = extractPaidPayment(result)
                if (paidRow) { clearInterval(timer); resolve({ paid: true, payment: paidRow }); return }
                if (Date.now() - startTime > timeout) { clearInterval(timer); resolve({ paid: false, payment: null }) }
            } catch (err) { console.error('[QPay Quick] Poll error:', err) }
        }
        check()
        timer = setInterval(check, interval)
    })
}
