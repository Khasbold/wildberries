import { useMemo, useState, useEffect, useSyncExternalStore, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useCart } from '../state/useCart.js'
import { useAuth } from '../state/useAuth.js'
import { useOrders } from '../state/useOrders.js'
import { validateDiscountCode, useDiscountCode, subscribe, getState, updateProfile as updateStoreProfile } from '../state/store.js'
import { useI18n } from '../i18n/useI18n.js'
import { saveCustomerProfile, signInAsGuest } from '../../firebase/authService.js'
import { Check, MapPin, Tag, ShoppingBag, BookmarkCheck, X, ShieldCheck, Loader2, ExternalLink, Smartphone, Store as StoreIcon, Crown, AlertTriangle } from 'lucide-react'
import { getSavedAddresses, saveAddress, removeAddress } from '../../utils/savedAddresses.js'
import { CITIES, DISTRICTS, KHOROOS, KHOROOLOLS, FLOORS } from '../../utils/mongolianAddress.js'
import SEO from '../layout/components/SEO.jsx'
import { useFocusTrap } from '../../utils/useFocusTrap.js'
import { trackEvent } from '../../utils/analytics.js'
import {
    createInvoice,
    pollPaymentStatus,
    createQuickInvoice,
    pollQuickPaymentStatus,
    cancelInvoice,
    checkPayment,
    checkQuickPayment,
    extractPaidPayment,
} from '../../firebase/qpayService.js'

function findProduct(id, adminProducts) {
    return adminProducts.find((p) => p.id === id) || null
}

export default function CheckoutPage() {
    const { t } = useI18n()
    const navigate = useNavigate()
    const state = useSyncExternalStore(subscribe, getState)
    const adminProducts = state.adminProducts || []
    const { items, clearCart, removeFromCart } = useCart()
    const { user, isAuthenticated, signIn, updateProfile } = useAuth()
    const [confirmOpen, setConfirmOpen] = useState(false)
    const confirmDialogRef = useRef(null)
    const confirmTriggerRef = useRef(null)
    useFocusTrap(confirmOpen, confirmDialogRef, confirmTriggerRef)
    const { createOrder } = useOrders()
    const [savedAddrs, setSavedAddrs] = useState(() => getSavedAddresses())

    // ─── Mobile detection ───
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // ─── QPay payment state (per-store payment groups) ───
    /**
     * payGroups: one card per payment.
     *   mode: 'gold' = store's own QPay merchant (direct-to-store)
     *         'platform' = IBUNNY escrow merchant (one shared card for all non-gold items)
     * Each group: { key, mode, storeIds[], storeName, storeLogo?, items[], subtotal, discount, delivery, total,
     *               merchantId?, bankAccount?, invoice?, loading, error, paid, polling }
     */
    const [payGroups, setPayGroups] = useState([])
    const [payTempOrderId, setPayTempOrderId] = useState(null)
    const payCancelledRef = useRef(false)
    const finalizeInFlightRef = useRef(false)
    const autoFinalizeTriggeredRef = useRef(false)
    const [isFinalizing, setIsFinalizing] = useState(false)
    const [promo, setPromo] = useState('')
    const [appliedDiscount, setAppliedDiscount] = useState(null)
    const [promoError, setPromoError] = useState('')
    const [form, setForm] = useState({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        city: 'Улаанбаатар',
        district: user.district || '',
        khoroo: user.khoroo || '',
        khoroolol: user.khoroolol || '',
        floor: user.floor || '',
        building: user.building || '',
        door: user.door || '',
        comment: '',
    })

    useEffect(() => {
        if (user.name || user.phone || user.email || user.district) {
            setForm((f) => ({
                ...f,
                name: user.name || f.name,
                phone: user.phone || f.phone,
                email: user.email || f.email,
                district: user.district || f.district,
                khoroo: user.khoroo || f.khoroo,
                khoroolol: user.khoroolol || f.khoroolol,
                floor: user.floor || f.floor,
                building: user.building || f.building,
                door: user.door || f.door,
            }))
        }
    }, [user.name, user.phone, user.email, user.district, user.khoroo, user.khoroolol, user.floor, user.building, user.door])

    const detailed = useMemo(() => items
        .map((i) => ({ ...i, product: findProduct(i.productId, adminProducts) }))
        .filter((i) => i.product), [items, adminProducts])

    const subtotal = detailed.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    const storeSubtotal = appliedDiscount
        ? detailed.filter((i) => i.product.storeId === appliedDiscount.storeId).reduce((sum, i) => sum + i.product.price * i.quantity, 0)
        : 0
    const discount = appliedDiscount ? Math.min(appliedDiscount.discountValue, storeSubtotal) : 0

    /* Per-store delivery: one delivery fee per unique store (from store owner profile) */
    const storeDeliveryMap = useMemo(() => {
        const map = {}
        const users = state.adminUsers || []
        for (const item of detailed) {
            const sid = item.product.storeId || '_'
            if (!map[sid]) {
                const storeUser = users.find((u) => u.storeId === sid)
                const fee = storeUser?.deliveryFree === false ? (storeUser.deliveryPrice || 0) : 0
                map[sid] = { storeName: storeUser?.storeName || item.product.brand || sid, fee, productNames: [] }
            }
            map[sid].productNames.push(item.product.title)
        }
        return map
    }, [detailed, state.adminUsers])

    const totalDelivery = Object.values(storeDeliveryMap).reduce((sum, s) => sum + s.fee, 0)
    const total = Math.max(0, subtotal - discount + totalDelivery)

    function handleApplyPromo() {
        const code = promo.trim()
        if (!code) return
        const disc = validateDiscountCode(code)
        if (!disc) {
            setAppliedDiscount(null)
            setPromoError(t('checkout.promoInvalid'))
            return
        }
        const storeItems = detailed.filter((i) => i.product.storeId === disc.storeId)
        if (storeItems.length === 0) {
            setAppliedDiscount(null)
            setPromoError(t('checkout.promoWrongStore'))
            return
        }
        setAppliedDiscount(disc)
        setPromoError('')
    }

    function validateForm() {
        if (!form.name?.trim() || !form.phone?.trim() || !form.email?.trim()) return false
        if (!form.district?.trim() || !form.khoroo?.trim()) return false
        return true
    }

    /* Build payment groups from cart: one per gold-tier store with QPay merchant + one platform bucket for the rest. */
    function buildPayGroups() {
        const adminUsers = state.adminUsers || []
        /* Bucket items per store, with per-store resolved user + totals. */
        const perStore = {}
        for (const item of detailed) {
            const sid = item.product.storeId || '_'
            if (!perStore[sid]) {
                const storeUser = adminUsers.find((u) => u.storeId === sid)
                perStore[sid] = {
                    storeId: sid,
                    storeUser,
                    storeName: storeUser?.storeName || item.product.brand || sid,
                    storeLogo: storeUser?.storeImage || null,
                    items: [],
                    subtotal: 0,
                    delivery: storeDeliveryMap[sid]?.fee || 0,
                }
            }
            perStore[sid].items.push(item)
            perStore[sid].subtotal += item.product.price * item.quantity
        }

        const goldGroups = []
        const platformStores = []
        for (const sid of Object.keys(perStore)) {
            const s = perStore[sid]
            const isGoldDirect = s.storeUser?.tier === 'gold' && s.storeUser?.qpayMerchantId && s.storeUser?.qpayMerchant
            const discForStore = (appliedDiscount && appliedDiscount.storeId === sid)
                ? Math.min(appliedDiscount.discountValue, s.subtotal)
                : 0
            if (isGoldDirect) {
                goldGroups.push({
                    key: `gold-${sid}`,
                    mode: 'gold',
                    storeIds: [sid],
                    storeName: s.storeName,
                    storeLogo: s.storeLogo,
                    items: s.items,
                    subtotal: s.subtotal,
                    discount: discForStore,
                    delivery: s.delivery,
                    total: Math.max(0, s.subtotal - discForStore + s.delivery),
                    merchantId: s.storeUser.qpayMerchantId,
                    merchant: s.storeUser.qpayMerchant,
                    invoice: null,
                    loading: true,
                    error: '',
                    paid: false,
                    polling: false,
                })
            } else {
                platformStores.push({ ...s, discount: discForStore })
            }
        }

        const groups = [...goldGroups]
        if (platformStores.length > 0) {
            const pSubtotal = platformStores.reduce((a, s) => a + s.subtotal, 0)
            const pDiscount = platformStores.reduce((a, s) => a + s.discount, 0)
            const pDelivery = platformStores.reduce((a, s) => a + s.delivery, 0)
            groups.push({
                key: 'platform',
                mode: 'platform',
                storeIds: platformStores.map((s) => s.storeId),
                storeName: platformStores.length === 1
                    ? platformStores[0].storeName
                    : t('checkout.platformBucketName') || 'Платформын төлбөр',
                storeLogo: null,
                items: platformStores.flatMap((s) => s.items),
                subtotal: pSubtotal,
                discount: pDiscount,
                delivery: pDelivery,
                total: Math.max(0, pSubtotal - pDiscount + pDelivery),
                platformStoreNames: platformStores.map((s) => s.storeName),
                invoice: null,
                loading: true,
                error: '',
                paid: false,
                polling: false,
            })
        }
        return groups
    }

    async function createInvoiceForGroup(group, tempOrderId) {
        const subOrderId = group.mode === 'gold'
            ? `${tempOrderId}-${group.storeIds[0]}`
            : tempOrderId
        if (group.mode === 'gold') {
            const m = group.merchant || {}
            const bankAccounts = m.account_bank_code
                ? [{ default: true, account_bank_code: m.account_bank_code, account_number: m.account_number, account_name: m.account_name, is_default: true }]
                : []
            return createQuickInvoice({
                merchantId: group.merchantId,
                amount: group.total,
                description: `${group.storeName} захиалга ${subOrderId}`,
                callbackUrl: `${window.location.origin}/orders?order=${encodeURIComponent(tempOrderId)}`,
                bank_accounts: bankAccounts,
            })
        }
        return createInvoice({
            orderId: subOrderId,
            amount: group.total,
            description: `iBunny захиалга ${subOrderId} - ${formatCurrency(group.total)}`,
            callbackUrl: `${window.location.origin}/orders?order=${encodeURIComponent(tempOrderId)}`,
            receiver: { name: form.name, email: form.email, phone: form.phone },
        })
    }

    function updatePayGroup(key, patch) {
        setPayGroups((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)))
    }

    async function openConfirmModal() {
        if (detailed.length === 0) return
        if (!validateForm()) {
            toast.error(t('checkout.fillAllFields') || 'Please fill in name, phone, email, city, and address.')
            return
        }
        if (!isAuthenticated) signIn({ name: form.name, phone: form.phone, email: form.email })
        else updateProfile({ name: form.name, phone: form.phone, email: form.email, district: form.district, khoroo: form.khoroo, khoroolol: form.khoroolol, floor: form.floor, building: form.building, door: form.door })

        /* Ensure Firebase Auth uid exists before creating invoice */
        let currentUser = user
        if (!currentUser.uid) {
            try {
                const guestUser = await signInAsGuest()
                const uid = guestUser?.uid || null
                if (uid) {
                    updateStoreProfile({ uid, isAnonymous: true })
                    currentUser = { ...currentUser, uid, isAnonymous: true }
                }
            } catch (err) {
                console.error('Guest sign-in failed:', err)
                toast.error('Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.')
                return
            }
        }

        trackEvent('begin_checkout', { items: detailed.length })

        const tempOrderId = `ORD-${Date.now()}`
        const groups = buildPayGroups()
        payCancelledRef.current = false
        finalizeInFlightRef.current = false
        autoFinalizeTriggeredRef.current = false
        setIsFinalizing(false)
        setPayTempOrderId(tempOrderId)
        setPayGroups(groups)
        setConfirmOpen(true)

        /* Fire invoice creation + polling for each group independently. */
        for (const group of groups) {
            createInvoiceForGroup(group, tempOrderId).then((invoice) => {
                if (payCancelledRef.current) return
                updatePayGroup(group.key, { invoice, loading: false, polling: true })
                const pollFn = group.mode === 'gold' ? pollQuickPaymentStatus : pollPaymentStatus
                pollFn(invoice.invoice_id, { interval: 3000, timeout: 300000 }).then(({ paid }) => {
                    if (payCancelledRef.current) return
                    updatePayGroup(group.key, { polling: false, paid: !!paid })
                    if (paid) toast.success(`${group.storeName}: төлбөр амжилттай!`)
                })
            }).catch((err) => {
                console.error(`[QPay] Invoice creation failed for ${group.key}:`, err)
                if (payCancelledRef.current) return
                updatePayGroup(group.key, { loading: false, error: err?.message || 'QPay нэхэмжлэл үүсгэхэд алдаа гарлаа' })
            })
        }
    }

    async function retryGroupInvoice(key) {
        if (!payTempOrderId) return
        const g = payGroups.find((x) => x.key === key)
        if (!g) return
        updatePayGroup(key, { loading: true, error: '' })
        try {
            const invoice = await createInvoiceForGroup(g, payTempOrderId)
            if (payCancelledRef.current) return
            updatePayGroup(key, { invoice, loading: false, polling: true })
            const pollFn = g.mode === 'gold' ? pollQuickPaymentStatus : pollPaymentStatus
            pollFn(invoice.invoice_id, { interval: 3000, timeout: 300000 }).then(({ paid }) => {
                if (payCancelledRef.current) return
                updatePayGroup(key, { polling: false, paid: !!paid })
                if (paid) toast.success(`${g.storeName}: төлбөр амжилттай!`)
            })
        } catch (err) {
            if (payCancelledRef.current) return
            updatePayGroup(key, { loading: false, error: err?.message || 'QPay нэхэмжлэл үүсгэхэд алдаа гарлаа' })
        }
    }

    async function manualCheckGroupPayment(key) {
        const group = payGroups.find((g) => g.key === key)
        const invoiceId = group?.invoice?.invoice_id
        if (!group || !invoiceId || group.paid) return

        updatePayGroup(key, { checking: true, error: '' })
        try {
            const checker = group.mode === 'gold' ? checkQuickPayment : checkPayment
            const result = await checker(invoiceId)
            const paidPayment = extractPaidPayment(result)
            if (paidPayment) {
                updatePayGroup(key, { checking: false, polling: false, paid: true })
                toast.success(`${group.storeName}: төлбөр амжилттай!`)
                return
            }
            updatePayGroup(key, { checking: false })
            toast.info('Төлбөр хараахан баталгаажаагүй байна. Дахин шалгана уу.')
        } catch (err) {
            console.error('[QPay] Manual check failed:', err)
            updatePayGroup(key, { checking: false })
            toast.error('Төлбөр шалгахад алдаа гарлаа. Дахин оролдоно уу.')
        }
    }

    const allGroupsPaid = payGroups.length > 0 && payGroups.every((g) => g.paid)
    const paidGroupCount = payGroups.filter((g) => g.paid).length
    const hasAnyPayment = payGroups.some((g) => g.paid)
    const isPartialAvailable = payGroups.length > 1 && hasAnyPayment && !allGroupsPaid

    async function finalizeOrder(opts = {}) {
        if (detailed.length === 0) return
        const { partial = false } = opts
        if (finalizeInFlightRef.current) return
        if (!partial && !allGroupsPaid) {
            toast.error('Бүх төлбөр төлөгдөөгүй байна. QPay апп-аар төлбөрөө хийнэ үү.')
            return
        }
        if (partial && !hasAnyPayment) {
            toast.error('Дор хаяж нэг дэлгүүрийн төлбөр хийгдсэн байх ёстой.')
            return
        }

        /* Decide which groups make it into this order. */
        const committedGroups = partial ? payGroups.filter((g) => g.paid) : payGroups
        const committedStoreIds = new Set(committedGroups.flatMap((g) => g.storeIds))
        const committedItems = detailed.filter((i) => committedStoreIds.has(i.product.storeId || '_'))
        if (committedItems.length === 0) {
            toast.error('Баталгаажуулах бараа олдсонгүй.')
            return
        }

        finalizeInFlightRef.current = true
        setIsFinalizing(true)

        /* Apply discount only if discount store is in the committed set. */
        const discountApplies = appliedDiscount && committedStoreIds.has(appliedDiscount.storeId)
        if (discountApplies) {
            useDiscountCode(appliedDiscount.id)
        }

        /* User already authenticated in openConfirmModal */
        let currentUser = user

        /* Bucket committed items per store for fulfillments + breakdown. */
        const storeItemsMap = {}
        for (const item of committedItems) {
            const sid = item.product.storeId || '_'
            if (!storeItemsMap[sid]) storeItemsMap[sid] = []
            storeItemsMap[sid].push(item)
        }

        const storeIds = Object.keys(storeItemsMap)
        const fulfillments = {}
        const storeBreakdown = []
        const mkToken = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
        const deliveryProofToken = mkToken()

        let orderSubtotal = 0
        let orderDelivery = 0
        let orderDiscount = 0
        for (const sid of storeIds) {
            const storeItems = storeItemsMap[sid]
            const storeSubtotalVal = storeItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
            const storeDeliveryFee = storeDeliveryMap[sid]?.fee || 0
            const storeDisc = (discountApplies && appliedDiscount.storeId === sid) ? Math.min(appliedDiscount.discountValue, storeSubtotalVal) : 0
            const storeTotal = Math.max(0, storeSubtotalVal - storeDisc + storeDeliveryFee)
            fulfillments[sid] = { status: 'New', received: false }
            storeBreakdown.push({
                storeId: sid,
                subtotal: storeSubtotalVal,
                discount: storeDisc,
                delivery: storeDeliveryFee,
                total: storeTotal,
            })
            orderSubtotal += storeSubtotalVal
            orderDelivery += storeDeliveryFee
            orderDiscount += storeDisc
        }
        const orderTotal = Math.max(0, orderSubtotal - orderDiscount + orderDelivery)

        const allItems = committedItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            storeId: i.product.storeId || '_',
        }))

        const hasGold = committedGroups.some((g) => g.mode === 'gold')
        const allGold = committedGroups.every((g) => g.mode === 'gold')

        let firstOrder
        try {
            firstOrder = await createOrder({
                id: payTempOrderId,
                items: allItems,
                storeIds,
                storeId: storeIds[0] || null,
                fulfillments,
                deliveryProofToken,
                refundRequests: {},
                refundStatus: 'none',
                storeBreakdown,
                subtotal: orderSubtotal,
                discount: orderDiscount,
                delivery: orderDelivery,
                total: orderTotal,
                discountCode: discountApplies ? appliedDiscount.code : null,
                discountStoreId: discountApplies ? appliedDiscount.storeId : null,
                userId: currentUser.uid || null,
                customer: {
                    name: form.name,
                    phone: form.phone,
                    email: form.email,
                },
                deliveryInfo: {
                    city: form.city,
                    district: form.district,
                    khoroo: form.khoroo,
                    khoroolol: form.khoroolol,
                    floor: form.floor,
                    building: form.building,
                    door: form.door,
                    comment: form.comment,
                    address: [form.city, form.district, form.khoroo, form.khoroolol, form.floor ? `${form.floor} давхар` : '', form.building ? `${form.building} байр` : '', form.door ? `${form.door} тоот` : ''].filter(Boolean).join(', '),
                },
                paymentMethod: 'qpay',
                paymentStatus: 'paid',
                /* 'partial' = customer walked away before paying every group; committed only what was paid. */
                paymentMode: partial ? 'partial' : hasGold ? (allGold ? 'split-gold' : 'mixed') : 'platform',
                /* Keep the full breakdown (even skipped groups) for audit — unpaid ones show up with paid:false. */
                paymentBreakdown: payGroups.map((g) => ({
                    key: g.key,
                    mode: g.mode,
                    storeIds: g.storeIds,
                    storeName: g.storeName,
                    amount: g.total,
                    merchantId: g.merchantId || null,
                    invoiceId: g.invoice?.invoice_id || null,
                    paid: !!g.paid,
                    committed: committedGroups.includes(g),
                })),
                qpayInvoiceId: committedGroups.find((g) => g.mode === 'platform')?.invoice?.invoice_id
                    || committedGroups[0]?.invoice?.invoice_id
                    || null,
            })
        } catch (err) {
            console.error('[Checkout] Order persistence failed after payment:', err)
            toast.error('Төлбөр амжилттай болсон ч захиалга бүртгэхэд алдаа гарлаа. Дахин оролдоно уу.')
            finalizeInFlightRef.current = false
            setIsFinalizing(false)
            return
        }

        if (currentUser.uid) {
            try {
                await saveCustomerProfile(currentUser.uid, {
                    name: form.name,
                    phone: form.phone,
                    email: form.email,
                    city: form.city,
                    district: form.district,
                    khoroo: form.khoroo,
                    khoroolol: form.khoroolol,
                    floor: form.floor,
                    building: form.building,
                    door: form.door,
                })
            } catch {
                /* non-blocking */
            }
        }

        // Save address for future use
        if (form.city && form.district) {
            const fullAddr = [form.city, form.district, form.khoroo, form.khoroolol].filter(Boolean).join(', ')
            setSavedAddrs(saveAddress({
                city: form.city,
                district: form.district,
                khoroo: form.khoroo,
                khoroolol: form.khoroolol,
                floor: form.floor,
                building: form.building,
                door: form.door,
                address: fullAddr,
            }))
        }

        /* Mark this finalize path so cleanup doesn't double-cancel. */
        payCancelledRef.current = true

        /* Cancel invoices for groups that are NOT in the committed set (partial mode only). */
        if (partial) {
            for (const g of payGroups) {
                if (!committedGroups.includes(g) && g.invoice?.invoice_id && !g.paid) {
                    cancelInvoice(g.invoice.invoice_id).catch(() => { /* non-blocking */ })
                }
            }
        }

        setConfirmOpen(false)

        /* Partial: remove only the committed products from the cart; leave the rest so the user can retry. */
        if (partial) {
            const committedProductIds = new Set(committedItems.map((i) => i.productId))
            for (const pid of committedProductIds) removeFromCart(pid)
        } else {
            clearCart()
        }

        trackEvent('purchase', { orderId: firstOrder.id, value: orderTotal, stores: storeIds.length, partial })
        toast.success(
            partial
                ? `${storeIds.length} дэлгүүрийн захиалга баталгаажлаа. Үлдсэн бараа сагсанд хадгалагдлаа.`
                : (t('checkout.orderPlacedToast') || 'Order confirmed!'),
        )
        const guestQ = !currentUser.uid ? '&guest=1' : ''
        navigate(`/orders?order=${encodeURIComponent(firstOrder.id)}${guestQ}`)
    }

    // Clean up polling + cancel any unpaid invoices when modal closes.
    // Paid invoices are kept because the money is already at QPay — we warn the user on Back instead.
    useEffect(() => {
        if (confirmOpen) return
        if (payGroups.length === 0) return
        if (payCancelledRef.current) {
            /* finalizeOrder already cleaned up; just reset. */
            setPayGroups([])
            setPayTempOrderId(null)
            finalizeInFlightRef.current = false
            autoFinalizeTriggeredRef.current = false
            setIsFinalizing(false)
            return
        }
        payCancelledRef.current = true
        for (const g of payGroups) {
            if (g.invoice?.invoice_id && !g.paid) {
                cancelInvoice(g.invoice.invoice_id).catch(() => { /* non-blocking */ })
            }
        }
        setPayGroups([])
        setPayTempOrderId(null)
        finalizeInFlightRef.current = false
        autoFinalizeTriggeredRef.current = false
        setIsFinalizing(false)
    }, [confirmOpen])

    useEffect(() => {
        if (!confirmOpen) return
        if (!allGroupsPaid) return
        if (payGroups.length === 0) return
        if (payCancelledRef.current) return
        if (autoFinalizeTriggeredRef.current) return
        autoFinalizeTriggeredRef.current = true
        toast.info('Төлбөр бүрэн баталгаажлаа. Захиалгыг автоматаар үүсгэж байна...')
        finalizeOrder({ partial: false })
    }, [confirmOpen, allGroupsPaid, payGroups.length])

    if (detailed.length === 0) {
        return (
            <div className="container-app py-8">
                <div className="card-static rounded-3xl border-[--brand-primary]/15 p-10 text-center max-w-lg mx-auto animate-scale-in">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[--bg-beige] flex items-center justify-center animate-float shadow-soft">
                        <ShoppingBag className="w-7 h-7 text-[--brand-primary]" />
                    </div>
                    <p className="text-slate-600 mb-5">{t('checkout.empty')}</p>
                    <Link to="/catalog" className="btn-primary inline-block active:scale-[0.97]">{t('cart.toCatalog')}</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container-app py-6 sm:py-10 animate-fade-in-up">
            <SEO title={t('checkout.title')} />
            <h1 className="section-title text-2xl sm:text-3xl text-slate-900 mb-2">{t('checkout.title')}</h1>
            <p className="text-slate-500 text-sm mb-8">{t('checkout.simpleFlowHint') || 'Enter your details, review your bag, then confirm — no extra delivery steps.'}</p>

            {!user.uid && (
                <div className="mb-6 card-static rounded-2xl bg-gradient-to-r from-[--bg-beige]/60 to-white p-4 sm:p-5 text-sm text-slate-700">
                    <p className="font-semibold mb-1">{t('checkout.guestBannerTitle') || 'Зочноор худалдан авах'}</p>
                    <p className="text-slate-500 text-xs mb-2">{t('checkout.guestBannerBody') || 'Та бүртгэлгүйгээр худалдан авалт хийх боломжтой. Мэдээллээ доор бөглөнө үү.'}</p>
                    <Link to="/account" className="inline-block text-sm font-semibold text-[--brand-secondary] hover:underline">{t('checkout.saveOrderAccount') || 'Бүртгэлтэй бол нэвтрэх →'}</Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
                <div className="space-y-6">
                    <section className="card-static rounded-2xl bg-slate-50/80 p-4 sm:p-5 text-sm text-slate-700 space-y-2">
                        <p className="font-bold text-slate-900">{t('trust.blockTitle')}</p>
                        <p>{t('trust.deliveryRange')}</p>
                        {/* <p>{t('trust.returnShipping')}</p> */}
                        <p>{t('trust.startReturn')}</p>
                        <p className="text-xs text-slate-500 pt-1 border-t border-slate-200/60">{t('checkout.estimatedDeliveryRange')}</p>
                    </section>

                    <section className="card-static rounded-2xl border-[--brand-primary]/12 p-5 sm:p-6">
                        <h2 className="section-title text-lg text-slate-900 flex items-center gap-2 mb-4">
                            <span className="w-8 h-8 rounded-xl bg-[--brand-secondary]/10 flex items-center justify-center">
                                <MapPin className="w-4.5 h-4.5 text-[--brand-secondary]" />
                            </span>
                            {t('checkout.sectionContact')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('checkout.name')} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300" />
                            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t('checkout.phone')} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300" />
                            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder={t('checkout.email')} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300 md:col-span-2" />
                        </div>
                    </section>

                    <section className="card-static rounded-2xl border-[--brand-secondary]/15 bg-gradient-to-br from-[--bg-beige]/40 to-white p-5 sm:p-6">
                        <h2 className="section-title text-lg text-slate-900 mb-4">{t('checkout.addressBlock') || 'Хүргэлтийн хаяг'}</h2>

                        {/* Saved addresses */}
                        {savedAddrs.length > 0 && (
                            <div className="mb-4 space-y-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                    <BookmarkCheck className="w-3.5 h-3.5" /> {t('checkout.savedAddresses')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {savedAddrs.map((addr) => (
                                        <button
                                            key={addr.id}
                                            type="button"
                                            onClick={() => setForm((f) => ({
                                                ...f,
                                                city: addr.city || 'Улаанбаатар',
                                                district: addr.district || '',
                                                khoroo: addr.khoroo || '',
                                                khoroolol: addr.khoroolol || '',
                                                floor: addr.floor || '',
                                                building: addr.building || '',
                                                door: addr.door || '',
                                            }))}
                                            className={`relative group flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-all duration-200 border-slate-200 bg-white text-slate-700 shadow-soft hover:border-[--brand-secondary]/40 hover:shadow-card active:scale-[0.97]`}
                                        >
                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate max-w-[200px]">{addr.address}</span>
                                            <span
                                                onClick={(e) => { e.stopPropagation(); setSavedAddrs(removeAddress(addr.id)) }}
                                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Хот */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Хот</label>
                                <select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm appearance-none focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300" style={{ fontSize: '16px' }}>
                                    <option value="Улаанбаатар">Улаанбаатар</option>
                                </select>
                            </div>
                            {/* Дүүрэг */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Дүүрэг</label>
                                <select
                                    value={form.district}
                                    onChange={(e) => setForm((f) => ({ ...f, district: e.target.value, khoroo: '', khoroolol: '' }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300"
                                    style={{ fontSize: '16px' }}
                                >
                                    <option value="">Дүүрэг сонгох</option>
                                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            {/* Хороо */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Хороо</label>
                                <select
                                    value={form.khoroo}
                                    onChange={(e) => setForm((f) => ({ ...f, khoroo: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300"
                                    style={{ fontSize: '16px' }}
                                >
                                    <option value="">Хороо сонгох</option>
                                    {(KHOROOS[form.district] || []).map((k) => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            {/* Хороолол */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Хороолол</label>
                                <select
                                    value={form.khoroolol}
                                    onChange={(e) => setForm((f) => ({ ...f, khoroolol: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300"
                                    style={{ fontSize: '16px' }}
                                >
                                    <option value="">Хороолол сонгох</option>
                                    {(KHOROOLOLS[form.district] || []).map((k) => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            {/* Давхар */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Давхар</label>
                                <select
                                    value={form.floor}
                                    onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300"
                                    style={{ fontSize: '16px' }}
                                >
                                    <option value="">Давхар сонгох</option>
                                    {FLOORS.map((fl) => <option key={fl} value={fl}>{fl}</option>)}
                                </select>
                            </div>
                            {/* Байрны тоо */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Байрны тоо</label>
                                <input
                                    value={form.building}
                                    onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
                                    placeholder="Байрны дугаар"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300"
                                />
                            </div>
                            {/* Тоот */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Тоот</label>
                                <input
                                    value={form.door}
                                    onChange={(e) => setForm((f) => ({ ...f, door: e.target.value }))}
                                    placeholder="Тоот"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300"
                                />
                            </div>
                            {/* Тайлбар */}
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Тайлбар</label>
                                <textarea value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} placeholder="Нэмэлт мэдээллийг оруулна уу" className="w-full border border-slate-200 rounded-xl px-3 py-2 min-h-20 bg-white text-sm focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200 hover:border-slate-300" />
                            </div>
                        </div>
                    </section>

                    {/* Payment security info */}
                    <section className="card-static rounded-2xl border-[--brand-secondary]/25 bg-[--brand-secondary]/5 p-4 sm:p-5 text-sm text-slate-700">
                        <p className="font-bold text-[--brand-secondary] flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-5 h-5 text-[--brand-secondary]" />
                            Төлбөрийн аюулгүй байдал
                        </p>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-[--brand-secondary] mt-0.5">&#10003;</span>
                                <span>Таны төлбөр платформд аюулгүй хадгалагдана (escrow). Дэлгүүрт шууд шилжихгүй.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[--brand-secondary] mt-0.5">&#10003;</span>
                                <span>Бараа хүргэгдсэн гэж баталгаажсны дараа л дэлгүүр эзэмшигчид мөнгө шилжүүлнэ.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[--brand-secondary] mt-0.5">&#10003;</span>
                                <span>Хүргэлт баталгаажаагүй бол буцаалт хүсэх боломжтой.</span>
                            </li>
                        </ul>
                    </section>

                    <button ref={confirmTriggerRef} type="button" className="btn-primary w-full sm:w-auto px-8 py-3.5 active:scale-[0.97]" onClick={openConfirmModal}>
                        {t('checkout.openConfirm') || 'Review & confirm order'}
                    </button>
                </div>

                <aside className="card-static rounded-2xl border-[--brand-primary]/15 p-5 sm:p-6 h-max lg:sticky lg:top-28 shadow-card-elevated">
                    <p className="section-title text-base text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[--brand-secondary]/10 flex items-center justify-center">
                            <ShoppingBag className="w-4.5 h-4.5 text-[--brand-secondary]" />
                        </span>
                        {t('checkout.yourOrder')}
                    </p>
                    <div className="space-y-3 max-h-56 overflow-auto pr-1 mb-4">
                        {detailed.map((i) => (
                            <div key={i.productId} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-[--bg-beige]/30 transition-colors duration-200">
                                <img src={i.product.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-soft" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{i.product.title}</p>
                                    <p className="text-xs text-slate-500">×{i.quantity}</p>
                                </div>
                                <span className="text-sm font-semibold">{formatCurrency(i.product.price * i.quantity)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 mb-4 bg-slate-50/50">
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            {t('cart.promo')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                value={promo}
                                onChange={(e) => { setPromo(e.target.value); setPromoError(''); setAppliedDiscount(null) }}
                                placeholder={t('cart.promoPlaceholder')}
                                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono uppercase bg-white focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none transition-colors duration-200"
                            />
                            <button type="button" className="btn-outline w-full sm:w-auto text-sm py-2" onClick={handleApplyPromo}>{t('common.apply')}</button>
                        </div>
                        {promoError && <p className="text-xs text-red-600 mt-2">{promoError}</p>}
                        {appliedDiscount && (
                            <p className="text-xs text-[#4B7F4D] mt-2 font-medium">
                                ✓ {appliedDiscount.code} — {formatCurrency(discount)} {t('cart.discount').toLowerCase()}
                            </p>
                        )}
                    </div>

                    <div className="text-sm space-y-2 border-t border-slate-100 pt-4">
                        <div className="flex justify-between"><span className="text-slate-600">{t('checkout.items')}</span><span>{formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600">{t('cart.discount')}</span><span className="text-[#4B7F4D]">−{formatCurrency(discount)}</span></div>
                        {/* Per-store delivery fees */}
                        <div className="space-y-1 pt-1">
                            <span className="text-slate-600 text-xs font-medium uppercase tracking-wide">{t('checkout.delivery')}</span>
                            {Object.entries(storeDeliveryMap).map(([sid, info]) => (
                                <div key={sid} className="flex justify-between pl-2 group relative">
                                    <span className="text-slate-500 text-xs truncate max-w-[180px] cursor-help border-b border-dashed border-slate-300">{info.storeName}</span>
                                    <span className={`text-xs font-medium ${info.fee === 0 ? 'text-[#4B7F4D]' : 'text-slate-700'}`}>
                                        {info.fee === 0 ? (t('common.free') || 'Үнэгүй') : formatCurrency(info.fee)}
                                    </span>
                                    {/* Tooltip showing product names */}
                                    <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 w-56 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none">
                                        <p className="font-semibold mb-1">{info.storeName}</p>
                                        {info.productNames.map((name, i) => (
                                            <p key={i} className="text-slate-300 truncate">• {name}</p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-between text-slate-700">
                                <span>{t('checkout.delivery')} ({t('checkout.total').toLowerCase()})</span>
                                <span>{totalDelivery === 0 ? (t('common.free') || 'Үнэгүй') : formatCurrency(totalDelivery)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2"><span>{t('checkout.total')}</span><span className="text-gradient-brand text-xl">{formatCurrency(total)}</span></div>
                        <p className="text-xs text-slate-500 pt-3 border-t border-slate-100">{t('checkout.vatNote')}</p>
                    </div>
                </aside>
            </div>

            {confirmOpen && createPortal(
                <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4" role="presentation">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                        onClick={() => {
                            if (hasAnyPayment && !allGroupsPaid) return /* ignore backdrop close if user has paid money — force explicit choice */
                            setConfirmOpen(false)
                        }}
                        aria-hidden="true"
                    />
                    <div ref={confirmDialogRef} className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[--brand-primary]/20 overflow-hidden max-h-[90vh] overflow-y-auto animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="checkout-confirm-title">
                        <div className="bg-gradient-to-r from-[#D66B3E] to-[#4B7F4D] px-5 py-4 text-white">
                            <h3 id="checkout-confirm-title" className="text-lg font-bold">{t('checkout.confirmTitle')}</h3>
                            <p className="text-sm text-white/90">{t('checkout.confirmSubtitle')}</p>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Payment security banner */}
                            <div className="rounded-xl border border-[--brand-secondary]/25 bg-[--brand-secondary]/5 p-3">
                                <p className="font-semibold text-[--brand-secondary] flex items-center gap-2 text-sm mb-1.5">
                                    <ShieldCheck className="w-4 h-4 text-[--brand-secondary] shrink-0" />
                                    Төлбөрийн аюулгүй байдал
                                </p>
                                <ul className="space-y-1 text-[11px] text-slate-600">
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-[--brand-secondary] mt-0.5 shrink-0">✓</span>
                                        <span>Таны төлбөр платформд аюулгүй хадгалагдана (escrow). Дэлгүүрт шууд шилжихгүй.</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-[--brand-secondary] mt-0.5 shrink-0">✓</span>
                                        <span>Бараа хүргэгдсэн гэж баталгаажсны дараа л дэлгүүр эзэмшигчид мөнгө шилжүүлнэ.</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-[--brand-secondary] mt-0.5 shrink-0">✓</span>
                                        <span>Хүргэлт баталгаажаагүй бол буцаалт хүсэх боломжтой.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Order summary */}
                            <div className="text-sm space-y-1 text-slate-700">
                                <p><span className="text-slate-500">{t('checkout.recipient')}</span> {form.name}, {form.phone}</p>
                                <p><span className="text-slate-500">{t('checkout.delivery')}:</span> {[form.city, form.district, form.khoroo, form.khoroolol, form.floor ? `${form.floor} давхар` : '', form.building ? `${form.building} байр` : '', form.door ? `${form.door} тоот` : ''].filter(Boolean).join(', ')}</p>
                            </div>

                            <div className="text-sm space-y-1.5 border-y border-slate-100 py-3">
                                <div className="flex justify-between text-slate-700">
                                    <span>{t('checkout.confirmSubtotal')}</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-slate-700">
                                        <span>{t('cart.discount')}</span>
                                        <span className="text-[#4B7F4D]">−{formatCurrency(discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-700">
                                    <span>{t('checkout.confirmDeliveryLine')}</span>
                                    <span>{totalDelivery === 0 ? t('common.free') : formatCurrency(totalDelivery)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-slate-900 pt-1.5 border-t border-slate-100">
                                    <span>{t('checkout.total')}</span>
                                    <span className="text-[#D66B3E] text-lg">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            {/* Multi-store QPay payments (one card per gold store + one for platform) */}
                            {payGroups.length > 1 && (
                                <div className="rounded-xl border border-[#D66B3E]/20 bg-gradient-to-r from-[#F7E9D7]/60 to-white p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-800">
                                                {payGroups.length} тусдаа төлбөр
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Алтан туулай дэлгүүр бүрт өөрийн QR. Төлбөрийг дэлгүүр тус бүрт төлнө.
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[11px] text-slate-500">Төлөгдсөн</p>
                                            <p className="text-base font-bold text-[#4B7F4D]">{paidGroupCount}/{payGroups.length}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full rounded-full bg-white overflow-hidden border border-slate-100">
                                        <div
                                            className="h-full bg-[#4B7F4D] transition-[width] duration-500"
                                            style={{ width: `${payGroups.length === 0 ? 0 : (paidGroupCount / payGroups.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                {payGroups.map((g) => (
                                    <PaymentGroupCard
                                        key={g.key}
                                        group={g}
                                        isMobile={isMobile}
                                        onRetry={() => retryGroupInvoice(g.key)}
                                        onManualCheck={() => manualCheckGroupPayment(g.key)}
                                        formatCurrency={formatCurrency}
                                    />
                                ))}
                            </div>

                            {/* Partial finalize hint */}
                            {isPartialAvailable && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-800 flex items-start gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
                                    <span>
                                        Танд <b>{paidGroupCount}/{payGroups.length}</b> төлбөр дууссан байна. Өөр цагт төлөхийг хүсэж байвал
                                        <b> "Дууссанаар баталгаажуулах"</b> товч дарвал үлдсэн бараа сагсанд хадгалагдана.
                                    </span>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    className="flex-1 btn-outline py-3 text-sm"
                                    disabled={isFinalizing}
                                    onClick={() => {
                                        if (isFinalizing) return
                                        /* Warn if user has paid groups that haven't been committed to an order. */
                                        if (hasAnyPayment && !allGroupsPaid) {
                                            const ok = typeof window !== 'undefined' && window.confirm(
                                                `Та ${paidGroupCount} дэлгүүрт төлбөр хийгдсэн. Хаавал төлсөн мөнгө захиалга болохгүй. Үргэлжлүүлэх үү?\n\nҮгүй гэвэл модалд буцна. Тийм гэвэл захиалгаар баталгаажуулахгүй.`,
                                            )
                                            if (!ok) return
                                        }
                                        setConfirmOpen(false)
                                    }}
                                >
                                    {t('common.back')}
                                </button>
                                {isPartialAvailable ? (
                                    <button
                                        type="button"
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-white font-semibold py-3 text-sm bg-[#D66B3E] hover:bg-[#c45d35] shadow-brand-md active:scale-[0.97] transition-all duration-200"
                                        onClick={() => finalizeOrder({ partial: true })}
                                        disabled={isFinalizing}
                                    >
                                        <Check className="w-4.5 h-4.5" />
                                        Дууссанаар баталгаажуулах ({paidGroupCount}/{payGroups.length})
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-white font-semibold py-3 text-sm transition-all duration-200 ${
                                            allGroupsPaid && !isFinalizing
                                                ? 'bg-[#4B7F4D] hover:bg-[#3d6a3f] shadow-card active:scale-[0.97]'
                                                : 'bg-slate-300 cursor-not-allowed'
                                        }`}
                                        onClick={() => finalizeOrder({ partial: false })}
                                        disabled={!allGroupsPaid || isFinalizing}
                                    >
                                        <Check className="w-4.5 h-4.5" />
                                        {isFinalizing
                                            ? 'Захиалга үүсгэж байна...'
                                            : allGroupsPaid
                                            ? (t('checkout.checkConfirm') || 'Захиалга баталгаажуулах')
                                            : payGroups.length > 1
                                                ? `${paidGroupCount}/${payGroups.length} төлбөр хүлээж байна...`
                                                : 'Төлбөр хүлээж байна...'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function PaymentGroupCard({ group, isMobile, onRetry, onManualCheck, formatCurrency }) {
    const isGold = group.mode === 'gold'
    const subLabel = isGold
        ? 'Алтан туулай — шууд дэлгүүр лүү'
        : (group.storeIds?.length > 1
            ? `Платформ эскроу — ${group.storeIds.length} дэлгүүрийн бараа`
            : 'Платформ эскроу')

    return (
        <div className={`rounded-2xl border ${group.paid ? 'border-[#4B7F4D]/50 bg-[#4B7F4D]/5' : isGold ? 'border-amber-300/60 bg-amber-50/40' : 'border-slate-200 bg-white'} shadow-sm overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isGold ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {isGold ? <Crown className="w-4.5 h-4.5" /> : <StoreIcon className="w-4.5 h-4.5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{group.storeName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{subLabel}</p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Төлөх дүн</p>
                    <p className="text-sm font-bold text-[#D66B3E]">{formatCurrency(group.total)}</p>
                </div>
            </div>

            {/* Items list (compact) */}
            {group.items?.length > 0 && (
                <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500">
                        {group.items.slice(0, 3).map((i, idx) => (
                            <span key={`${i.productId}-${idx}`} className="truncate max-w-[180px]">
                                • {i.product?.title || i.productId}
                                {i.quantity > 1 ? ` ×${i.quantity}` : ''}
                            </span>
                        ))}
                        {group.items.length > 3 && (
                            <span className="text-slate-400">+{group.items.length - 3} бусад</span>
                        )}
                    </div>
                </div>
            )}

            <div className="px-4 py-4">
                {group.loading && (
                    <div className="flex items-center gap-3 py-4">
                        <Loader2 className="w-5 h-5 text-[#D66B3E] animate-spin shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-slate-700">QPay нэхэмжлэл үүсгэж байна</p>
                            <p className="text-[11px] text-slate-400">Түр хүлээнэ үү...</p>
                        </div>
                    </div>
                )}

                {group.error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p className="font-medium flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" /> Алдаа гарлаа
                        </p>
                        <p className="text-[11px] mt-1 text-red-600/80">{group.error}</p>
                        <button
                            type="button"
                            className="mt-2 px-3 py-1.5 rounded-lg bg-red-100 text-[11px] font-semibold text-red-700 hover:bg-red-200"
                            onClick={onRetry}
                        >
                            Дахин оролдох
                        </button>
                    </div>
                )}

                {group.invoice && !group.paid && !group.error && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <img
                                src={`data:image/png;base64,${group.invoice.qr_image}`}
                                alt={`${group.storeName} QPay QR`}
                                className="w-40 h-40 sm:w-44 sm:h-44 rounded-xl"
                            />
                        </div>

                        {group.polling && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                                <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                                <span className="text-[11px] font-medium text-amber-700">Төлбөр хүлээж байна...</span>
                            </div>
                        )}

                        <button
                            type="button"
                            className="px-3 py-1.5 rounded-full bg-[#F7E9D7] text-[#D66B3E] text-xs font-semibold hover:bg-[#f1dcc4] active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={onManualCheck}
                            disabled={!!group.checking}
                        >
                            {group.checking ? 'Шалгаж байна...' : 'Төлбөр шалгах'}
                        </button>

                        {group.invoice.qPay_shortUrl && (
                            <a
                                href={group.invoice.qPay_shortUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#D66B3E] hover:underline font-medium"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                QPay линкээр төлөх
                            </a>
                        )}

                        {isMobile && group.invoice.urls?.length > 0 && (
                            <div className="w-full">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1.5">
                                    <Smartphone className="w-3 h-3" />
                                    Банкны апп-аар төлөх
                                </p>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {group.invoice.urls.map((bankUrl) => (
                                        <a
                                            key={bankUrl.name}
                                            href={bankUrl.link}
                                            className="flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-100 hover:border-[#4B7F4D]/30 hover:bg-[#F7E9D7]/20 active:scale-95 transition-all text-center"
                                        >
                                            {bankUrl.logo && (
                                                <img src={bankUrl.logo} alt="" className="w-7 h-7 rounded-lg object-contain" loading="lazy" />
                                            )}
                                            <span className="text-[9px] text-slate-500 leading-tight truncate w-full">{bankUrl.description}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {group.paid && (
                    <div className="flex items-center gap-3 py-1">
                        <div className="w-11 h-11 rounded-full bg-[#4B7F4D]/15 flex items-center justify-center shrink-0">
                            <Check className="w-6 h-6 text-[#4B7F4D]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#4B7F4D]">Төлбөр амжилттай!</p>
                            <p className="text-[11px] text-slate-500">{group.storeName} — {formatCurrency(group.total)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
