import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { TIER_PLANS, subscribe, getState } from '../../modules/state/store.js'
import { storePortionTotal } from '../../utils/orderFulfillment.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { ShoppingBag, DollarSign, CheckCircle, Truck, Users, Package, ArrowRight, Crown, X, AlertTriangle, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import { useI18n } from '../../modules/i18n/useI18n.js'
import { createInvoice, pollPaymentStatus } from '../../firebase/qpayService.js'
import { db } from '../../firebase/init.js'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const COMMISSION_BUCKET_LIMIT = 30000

export default function DashboardPage() {
    const { stats, session, products, orders, storeId } = useAdmin()
    const { tier } = useSession()
    const { t } = useI18n()
    const [showPayModal, setShowPayModal] = useState(false)
    const [commInvoice, setCommInvoice] = useState(null) // { invoice_id, qr_image, qPay_shortUrl, urls }
    const [commLoading, setCommLoading] = useState(false)
    const [commPolling, setCommPolling] = useState(false)
    const [commPaid, setCommPaid] = useState(false)
    const [commError, setCommError] = useState(null)
    const commAbortRef = useRef(false)
    const globalState = useSyncExternalStore(subscribe, getState)
    const adminUsers = globalState.adminUsers || []

    // Resolve tier: prefer session, fallback to adminUsers record
    const effectiveTier = tier || (storeId && adminUsers.find((u) => u.storeId === storeId)?.tier) || null

    // Gold tier commission bucket — current month only
    const commissionBucket = useMemo(() => {
        if (effectiveTier !== 'gold' || !storeId) return null
        const plan = TIER_PLANS.gold
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        let bunnyRevenue = 0
        let bunnyCount = 0
        for (const order of orders) {
            const d = new Date(order.createdAt || 0)
            if (d < monthStart || d > monthEnd) continue
            const fMap = order.fulfillments || {}
            const storeStatus = fMap[storeId] ? fMap[storeId].status : order.status
            if (storeStatus === 'Bunny' || order.status === 'Bunny') {
                bunnyRevenue += storePortionTotal(order, storeId, products)
                bunnyCount++
            }
        }

        const qpayFee = Math.round(bunnyRevenue * 0.01)
        const qpayFlatFee = bunnyCount * 200
        const revenueAfterQpay = bunnyRevenue - qpayFee - qpayFlatFee
        const commission = Math.round(revenueAfterQpay * (plan.commission / 100))
        const buckets = commission > 0 ? Math.floor(commission / COMMISSION_BUCKET_LIMIT) : 0
        const remainder = commission > 0 ? commission % COMMISSION_BUCKET_LIMIT : 0
        const payable = buckets * COMMISSION_BUCKET_LIMIT

        return { commission, buckets, remainder, payable, limit: COMMISSION_BUCKET_LIMIT }
    }, [effectiveTier, storeId, orders, products])

    async function openCommissionModal() {
        if (!commissionBucket) return
        commAbortRef.current = false
        setCommInvoice(null)
        setCommError(null)
        setCommPaid(false)
        setCommPolling(false)
        setShowPayModal(true)
        setCommLoading(true)
        try {
            const tempId = `COMM-${storeId}-${Date.now()}`
            const inv = await createInvoice({
                orderId: tempId,
                amount: commissionBucket.payable,
                description: `iBunny шимтгэл — ${storeId}`,
            })
            if (commAbortRef.current) return
            setCommInvoice(inv)
            setCommLoading(false)
            setCommPolling(true)
            pollPaymentStatus(inv.invoice_id, {
                onPaid: async () => {
                    if (commAbortRef.current) return
                    setCommPolling(false)
                    setCommPaid(true)
                    // Save commission payment log
                    try {
                        await addDoc(collection(db, 'commissionPayments'), {
                            storeId,
                            amount: commissionBucket.payable,
                            invoiceId: inv.invoice_id,
                            paidAt: serverTimestamp(),
                            buckets: commissionBucket.buckets,
                        })
                    } catch (e) {
                        console.error('Failed to save commission log:', e)
                    }
                },
                onTimeout: () => {
                    if (commAbortRef.current) return
                    setCommPolling(false)
                    setCommError('Хугацаа дууссан. Дахин оролдоно уу.')
                },
            })
        } catch (e) {
            if (!commAbortRef.current) {
                setCommLoading(false)
                setCommError(e?.message || 'QPay алдаа гарлаа.')
            }
        }
    }

    function closeCommissionModal() {
        commAbortRef.current = true
        setShowPayModal(false)
        setCommInvoice(null)
        setCommLoading(false)
        setCommPolling(false)
        setCommPaid(false)
        setCommError(null)
    }

    const cards = [
        { label: t('admin.totalOrders'), value: stats.ordersCount, icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
        { label: t('admin.totalRevenue'), value: formatCurrency(stats.revenue), icon: DollarSign, color: 'bg-emerald-100 text-emerald-600' },
        { label: t('admin.acceptedOrders'), value: stats.acceptedCount, icon: CheckCircle, color: 'bg-amber-100 text-amber-600', badge: stats.acceptedCount > 0 ? t('admin.pending') : null, badgeVariant: 'warning' },
        { label: t('admin.deliveredOrders'), value: stats.deliveredCount, icon: Truck, color: 'bg-green-100 text-green-600', badge: stats.deliveredCount > 0 ? t('admin.delivered') : null, badgeVariant: 'success' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">{t('admin.storeDashboard', { name: session?.storeName || 'Store' })}</h2>
                <p className="text-sm text-slate-500">{t('admin.salesPerformance')}</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Card key={card.label} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-slate-500">{card.label}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                                            {card.badge && <Badge variant={card.badgeVariant}>{card.badge}</Badge>}
                                        </div>
                                    </div>
                                    <div className={`h-10 w-10 rounded-lg ${card.color} flex items-center justify-center`}>
                                        <Icon size={20} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Gold tier commission bucket */}
            {commissionBucket && (
                <Card className={commissionBucket.payable > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Crown size={18} className="text-amber-500" />
                                <span className="font-semibold text-slate-900">Шимтгэлийн хуримтлал</span>
                            </div>
                            <span className="text-sm text-slate-500">
                                {formatCurrency(commissionBucket.commission)} / {formatCurrency(commissionBucket.limit)}
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                            <div
                                className={`h-3 rounded-full transition-all ${commissionBucket.payable > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (commissionBucket.commission / commissionBucket.limit) * 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            {commissionBucket.payable > 0
                                ? `${formatCurrency(commissionBucket.payable)} төлөх шимтгэл хуримтлагдсан (${commissionBucket.commission}/${commissionBucket.limit})`
                                : commissionBucket.commission > 0
                                    ? `${formatCurrency(commissionBucket.remainder)} — ${formatCurrency(commissionBucket.limit)} хүрэхэд ${formatCurrency(commissionBucket.limit - commissionBucket.remainder)} дутуу`
                                    : `Шимтгэл одоогоор тооцогдоогүй`}
                        </p>
                        {commissionBucket.payable > 0 && (
                            <button
                                onClick={openCommissionModal}
                                className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Шимтгэл төлөх — {formatCurrency(commissionBucket.payable)}
                            </button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Commission payment modal */}
            {showPayModal && commissionBucket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeCommissionModal}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Crown size={20} className="text-amber-500" />
                                Шимтгэл төлөх
                            </h3>
                            <button onClick={closeCommissionModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3 mb-5">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Нийт шимтгэл</span>
                                <span className="font-mono font-medium">{formatCurrency(commissionBucket.commission)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Bucket хязгаар</span>
                                <span className="font-mono">{formatCurrency(commissionBucket.limit)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Тооцоолол</span>
                                <span className="font-mono">{formatCurrency(commissionBucket.commission)} / {formatCurrency(commissionBucket.limit)} = {commissionBucket.buckets} удаа</span>
                            </div>
                            <div className="border-t pt-3 flex justify-between text-base font-bold">
                                <span>Төлөх дүн</span>
                                <span className="text-amber-600">{formatCurrency(commissionBucket.payable)}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 text-center mb-4">
                            {/* Recipient info */}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 mb-3 text-left">
                                <div className="shrink-0 h-9 w-9 rounded-xl bg-[#D66B3E]/10 flex items-center justify-center">
                                    <span className="text-sm font-bold text-[#D66B3E]">iB</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 mb-3">QPay-р төлөх</p>
                            {commPaid ? (
                                <div className="flex flex-col items-center gap-2 py-6">
                                    <CheckCircle2 size={48} className="text-emerald-500" />
                                    <p className="font-semibold text-emerald-700">Төлбөр амжилттай!</p>
                                    <p className="text-xs text-slate-500">Шимтгэлийн бүртгэл хадгалагдлаа.</p>
                                </div>
                            ) : commLoading ? (
                                <div className="flex flex-col items-center gap-2 py-8">
                                    <Loader2 size={32} className="animate-spin text-amber-500" />
                                    <p className="text-sm text-slate-500">QR код үүсгэж байна...</p>
                                </div>
                            ) : commError ? (
                                <div className="py-4">
                                    <p className="text-sm text-red-600 mb-3">{commError}</p>
                                    <button onClick={openCommissionModal} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">
                                        Дахин оролдох
                                    </button>
                                </div>
                            ) : commInvoice ? (
                                <div>
                                    <img src={`data:image/png;base64,${commInvoice.qr_image}`} alt="QPay QR" className="w-48 h-48 mx-auto rounded-xl border border-slate-200" />
                                    {commPolling && (
                                        <div className="flex items-center justify-center gap-1.5 mt-2">
                                            <Loader2 size={12} className="animate-spin text-amber-500" />
                                            <span className="text-xs text-amber-600">Төлбөр хүлээж байна...</span>
                                        </div>
                                    )}
                                    {commInvoice.qPay_shortUrl && (
                                        <a href={commInvoice.qPay_shortUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
                                            <ExternalLink size={11} /> Шууд холбоос
                                        </a>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>Шимтгэл сар бүрийн эхэнд тооцогдоно. {formatCurrency(commissionBucket.limit)}-д хүрмэгц төлбөр хийнэ үү.</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link to="/admin/orders" className="group">
                    <Card className="hover:shadow-md transition-shadow hover:border-slate-300">
                        <CardContent className="pt-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <ShoppingBag size={18} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{t('admin.viewOrders')}</p>
                                    <p className="text-xs text-slate-500">{stats.ordersCount} {t('admin.totals').toLowerCase()}</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/admin/products" className="group">
                    <Card className="hover:shadow-md transition-shadow hover:border-slate-300">
                        <CardContent className="pt-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Package size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{t('admin.manageProducts')}</p>
                                    <p className="text-xs text-slate-500">{products.length} {t('admin.listed')}</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/admin/customers" className="group">
                    <Card className="hover:shadow-md transition-shadow hover:border-slate-300">
                        <CardContent className="pt-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Users size={18} className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{t('admin.customers')}</p>
                                    <p className="text-xs text-slate-500">{stats.customers.length} {t('admin.uniqueCustomers')}</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Top Customers */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{t('admin.topCustomers')}</CardTitle>
                    {stats.customers.length > 6 && (
                        <Link to="/admin/customers" className="text-xs text-slate-500 hover:text-slate-900 font-medium">
                            {t('admin.viewAll')}
                        </Link>
                    )}
                </CardHeader>
                <CardContent>
                    {stats.customers.length === 0 ? (
                        <div className="py-8 text-center">
                            <Users size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-500 text-sm">{t('admin.noCustomersYet')}</p>
                            <p className="text-slate-400 text-xs mt-1">{t('admin.customersAppearHint')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {stats.customers.slice(0, 6).map((c, i) => (
                                <div key={c.key} className="flex items-center justify-between border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-900 text-sm truncate">{c.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{c.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="text-sm font-medium">{c.ordersCount} orders</p>
                                        <p className="text-xs text-slate-500">{formatCurrency(c.totalSpent)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
