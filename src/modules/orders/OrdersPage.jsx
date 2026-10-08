import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../state/useCart.js'
import { useOrders } from '../state/useOrders.js'
import { useAuth } from '../state/useAuth.js'
import { useI18n } from '../i18n/useI18n.js'
import { useStores } from '../state/useStores.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { toDate } from '../../utils/dateUtils.js'
import { useSyncExternalStore, useEffect, useRef, useState, useMemo } from 'react'
import { subscribe, getState, getFulfillments, deriveAggregateStatus } from '../state/store.js'
import { buildDeliveryQrUrl, buildUnifiedDeliveryQrUrl } from '../../utils/orderFulfillment.js'
import { Package, Store, ExternalLink, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import OrderTimeline from '../layout/components/OrderTimeline.jsx'
import SEO from '../layout/components/SEO.jsx'
import { OrderChatDrawer } from '../../components/OrderChat.jsx'

function statusLabel(status, t) {
    const s = String(status || '')
    const map = {
        New: t('orders.statusNew') || 'New',
        Accepted: t('orders.statusAccepted') || 'Accepted',
        shipped: 'Илгээсэн',
        Delivered: t('orders.statusDelivered') || 'Delivered',
        Refunded: t('orders.statusRefunded') || 'Refunded',
    }
    return map[s] || s
}

function groupOrderLinesByStore(order) {
    const map = {}
    for (const line of order.items || []) {
        const sid = line.storeId || '_'
        if (!map[sid]) map[sid] = []
        map[sid].push(line)
    }
    return map
}

export default function OrdersPage() {
    const { t, locale } = useI18n()
    const { orders } = useOrders()
    const { addToCart } = useCart()
    const { user } = useAuth()
    const { getStoreById } = useStores()
    const state = useSyncExternalStore(subscribe, getState)
    const adminProducts = state.adminProducts || []
    const adminUsers = state.adminUsers || []
    const [searchParams] = useSearchParams()
    const highlightId = searchParams.get('order')
    const guestCheckout = searchParams.get('guest') === '1'
    const highlightRef = useRef(null)

    const filtered = useMemo(() => {
        if (user.uid) return orders.filter((o) => o.userId === user.uid)
        return orders
    }, [orders, user.uid])

    const [expanded, setExpanded] = useState(() => new Set())
    const [chatOpen, setChatOpen] = useState(null) // { orderId, storeId, storeName }

    useEffect(() => {
        if (!highlightId) return
        setExpanded((prev) => new Set([...prev, highlightId]))
    }, [highlightId])

    useEffect(() => {
        if (highlightId && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [highlightId, filtered.length])

    function toggle(id) {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function resolveProduct(pid) {
        return adminProducts.find((p) => p.id === pid)
    }

    function formatDate(val) {
        return toDate(val).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    }

    return (
        <div className="min-h-[60vh] bg-gradient-to-b from-[#F7E9D7]/30 to-white">
            <div className="container-app py-8 sm:py-12 animate-fade-in-up">
                <div className="max-w-3xl mx-auto">
                    <SEO title={t('orders.title')} />
                    <h1 className="section-title text-2xl sm:text-3xl text-slate-900 mb-2">{t('orders.title')}</h1>
                    <p className="text-slate-600 text-sm mb-8">{t('orders.subtitle') || 'Track purchases and open any order for line-item details.'}</p>

                    {!user.uid && filtered.length > 0 && (
                        <div className="mb-6 card-static rounded-2xl border-[--brand-secondary]/25 bg-gradient-to-r from-[--bg-beige]/50 to-white p-4 text-sm text-slate-800">
                            <p className="font-semibold mb-1">{guestCheckout ? t('orders.guestBanner') : t('orders.guestBenefits')}</p>
                            <Link to="/account" className="text-[--brand-secondary] font-semibold hover:underline">{t('checkout.saveOrderAccount')}</Link>
                        </div>
                    )}

                    {filtered.length === 0 ? (
                        <div className="card-static rounded-3xl border-[--brand-primary]/15 p-10 text-center animate-scale-in">
                            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[--bg-beige] flex items-center justify-center animate-float shadow-soft">
                                <Package className="w-9 h-9 text-[--brand-primary]" />
                            </div>
                            <p className="text-slate-600 mb-5">{t('orders.empty')}</p>
                            <Link to="/catalog" className="btn-primary inline-flex items-center justify-center px-8 active:scale-[0.97]">{t('orders.startShopping')}</Link>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {filtered.map((order) => {
                                const open = expanded.has(order.id)
                                const isHi = highlightId === order.id
                                return (
                                    <li
                                        key={order.id}
                                        ref={isHi ? highlightRef : undefined}
                                        className={`rounded-2xl border overflow-hidden bg-white transition-all duration-300 hover-lift ${isHi ? 'ring-2 ring-[--brand-primary] border-[--brand-primary]/40 shadow-card-elevated' : 'border-slate-200/80 shadow-card hover:shadow-card-hover'}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggle(order.id)}
                                            className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-[--bg-beige]/40 transition-colors duration-200"
                                        >
                                            <div>
                                                <p className="font-mono text-sm font-bold text-slate-900 tracking-tight">{order.id}</p>
                                                <p className="text-xs text-slate-500 mt-1">{formatDate(order.createdAt)}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={deriveAggregateStatus(order) === 'Delivered' ? 'badge-success' : deriveAggregateStatus(order) === 'Refunded' ? 'badge' : 'badge-brand'}>
                                                    {statusLabel(deriveAggregateStatus(order), t)}
                                                    {order.refundStatus === 'Requested' && deriveAggregateStatus(order) !== 'Refunded' && (
                                                        <span className="block text-[10px] text-orange-700 font-normal mt-0.5">{t('orders.refundPending') || 'Refund pending'}</span>
                                                    )}
                                                </span>
                                                <span className="font-bold text-lg text-[--brand-primary]">{formatCurrency(order.total)}</span>
                                                {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                            </div>
                                        </button>

                                        {open && (
                                            <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-slate-100 space-y-4">
                                                {/* Order tracking timeline */}
                                                <div className="pt-3 pb-1 overflow-x-auto">
                                                    <OrderTimeline status={deriveAggregateStatus(order)} refundStatus={order.refundStatus} locale={locale} />
                                                </div>
                                                {order.deliveryProofToken && typeof window !== 'undefined' && deriveAggregateStatus(order) !== 'Delivered' && deriveAggregateStatus(order) !== 'Refunded' && (
                                                    <div className="flex flex-col sm:flex-row gap-3 items-start bg-white rounded-xl border border-[#4B7F4D]/30 p-3 mt-2">
                                                        <img
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(buildUnifiedDeliveryQrUrl(window.location.origin, order.id, order.deliveryProofToken))}`}
                                                            alt=""
                                                            className="w-[140px] h-[140px] rounded-lg border border-slate-200 shrink-0"
                                                        />
                                                        <p className="text-xs text-slate-600 leading-relaxed">
                                                            {t('orders.deliveryQrHintUnified') || 'One code for the whole order. Each store’s delivery person scans it while logged into that store in Admin → Delivery scan — only that store’s items are marked delivered.'}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="grid sm:grid-cols-2 gap-3 text-sm pt-4">
                                                    <div className="rounded-xl bg-slate-50/80 p-3">
                                                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{t('orders.delivery')}</p>
                                                        <p className="text-slate-800">{order.deliveryInfo?.city || '—'}, {order.deliveryInfo?.address || '—'}</p>
                                                        {order.deliveryInfo?.comment && <p className="text-xs text-slate-500 mt-1">{order.deliveryInfo.comment}</p>}
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50/80 p-3">
                                                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{t('orders.payment')}</p>
                                                        <p className="text-slate-800">{order.paymentMethod || '—'}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('orders.items') || 'Items'}</p>
                                                    {Object.entries(groupOrderLinesByStore(order)).map(([sid, lines]) => {
                                                        const st = adminUsers.find((u) => u.storeId === sid)
                                                        const storeName = st?.storeName || sid || '—'
                                                        const fline = getFulfillments(order)[sid] || { status: 'New' }
                                                        const token = order.deliveryTokens?.[sid]
                                                        const qrUrl = !order.deliveryProofToken && token && typeof window !== 'undefined'
                                                            ? buildDeliveryQrUrl(window.location.origin, order.id, sid, token)
                                                            : ''
                                                        return (
                                                            <div key={`${order.id}-${sid}`} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                                                        <Store className="w-4 h-4 text-[#4B7F4D]" />
                                                                        {sid && sid !== '_' ? (
                                                                            <Link to={`/stores/${encodeURIComponent(sid)}`} className="hover:text-[#D66B3E] inline-flex items-center gap-1">
                                                                                {storeName}
                                                                                <ExternalLink className="w-3 h-3 opacity-60" />
                                                                            </Link>
                                                                        ) : (
                                                                            <span>{storeName}</span>
                                                                        )}
                                                                    </div>
                                                                    <span className={fline.status === 'Delivered' ? 'badge-success' : fline.status === 'shipped' ? 'badge-brand' : 'badge'}>
                                                                        {fline.status === 'Delivered' ? (t('orders.storeDelivered') || 'Delivered') : fline.status === 'shipped' ? 'Илгээсэн' : (t('orders.storeNotDelivered') || 'Not delivered yet')}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setChatOpen({ orderId: order.id, storeId: sid, storeName })
                                                                        }}
                                                                        className="relative inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#D66B3E]/10 text-[#D66B3E] hover:bg-[#D66B3E]/20 transition-colors"
                                                                    >
                                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                                        Чат
                                                                        {(order.unreadByCustomer || 0) > 0 && (
                                                                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 ring-2 ring-white">
                                                                                {order.unreadByCustomer}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                {qrUrl && fline.status !== 'Delivered' && (
                                                                    <div className="flex flex-col sm:flex-row gap-3 items-start bg-white rounded-lg border border-slate-100 p-3">
                                                                        <img
                                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrUrl)}`}
                                                                            alt=""
                                                                            className="w-[140px] h-[140px] rounded-lg border border-slate-200 shrink-0"
                                                                        />
                                                                        <p className="text-xs text-slate-600 leading-relaxed">
                                                                            {t('orders.deliveryQrHint') || 'Give this QR to your delivery person for this store. They scan it in Admin → Delivery scan while logged in as that store.'}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                <div className="space-y-2">
                                                                    {lines.map((line) => {
                                                                        const product = resolveProduct(line.productId)
                                                                        return (
                                                                            <div key={`${order.id}-${line.productId}`} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-100 p-3 bg-white shadow-soft hover:shadow-card transition-shadow duration-200">
                                                                                {product?.thumbnail && (
                                                                                    <img src={product.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-100 shrink-0" />
                                                                                )}
                                                                                <div className="flex-1 min-w-0 space-y-1">
                                                                                    {product ? (
                                                                                        <Link to={(() => { const s = product.storeId ? getStoreById(product.storeId) : null; const sl = s?.slug || product.storeId; return sl ? `/${sl}/product/${product.id}` : `/product/${product.id}` })()} className="font-medium text-slate-900 hover:text-[#D66B3E] line-clamp-2">
                                                                                            {product.title}
                                                                                        </Link>
                                                                                    ) : (
                                                                                        <span className="font-mono text-sm text-slate-600">{line.productId}</span>
                                                                                    )}
                                                                                    {product?.productCode && (
                                                                                        <p className="text-[10px] text-slate-400 font-mono">Код: {product.productCode}</p>
                                                                                    )}
                                                                                    <p className="text-xs text-slate-500">×{line.quantity} · {product ? formatCurrency(product.price * line.quantity) : '—'}</p>
                                                                                </div>
                                                                                {product && (
                                                                                    <button
                                                                                        type="button"
                                                                                        className="text-sm font-medium text-[#D66B3E] hover:underline shrink-0 self-start sm:self-center"
                                                                                        onClick={() => addToCart(line.productId, line.quantity)}
                                                                                    >
                                                                                        {t('orders.repeatItem')}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-sm">
                                                    <span className="text-slate-500 text-xs uppercase tracking-wide font-semibold">{t('orders.total')}</span>
                                                    <span className="text-xl font-bold text-gradient-brand">{formatCurrency(order.total)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <OrderChatDrawer
                    orderId={chatOpen?.orderId}
                    currentUserId={user.uid}
                    currentUserRole="customer"
                    storeName={chatOpen?.storeName}
                    isOpen={!!chatOpen}
                    onClose={() => setChatOpen(null)}
                    unreadCount={0}
                />
            </div>
        </div>
    )
}
