import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { TIER_PLANS, subscribe, getState } from '../../modules/state/store.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { storePortionTotal } from '../../utils/orderFulfillment.js'
import { useI18n } from '../../modules/i18n/useI18n.js'
import {
    ShoppingBag, DollarSign, CheckCircle, Truck, Users, Package, ArrowRight,
    Crown, TrendingUp, Percent, Sparkles, Calendar, BarChart3, Star, CreditCard
} from 'lucide-react'

const tierOrder = ['free', 'bronze', 'silver', 'gold']

function monthLabel(date) {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getMonthRange(monthsBack) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
}

const RANGE_OPTIONS = [
    { label: 'This month', value: 0 },
    { label: 'Last 3 months', value: 2 },
]

const COMMISSION_BUCKET_LIMIT = 30000

export default function AnalyticsPage() {
    const { orders, products, stats, storeId } = useAdmin()
    const { session, tier } = useSession()
    const { t } = useI18n()
    const allProducts = products
    const globalState = useSyncExternalStore(subscribe, getState)
    const adminUsers = globalState.adminUsers || []

    // Resolve tier: prefer session, fallback to adminUsers record
    const effectiveTier = tier || (storeId && adminUsers.find((u) => u.storeId === storeId)?.tier) || 'free'
    const currentTier = effectiveTier
    const plan = TIER_PLANS[currentTier] || TIER_PLANS.free

    const [rangeValue, setRangeValue] = useState(0)
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    // Filter orders by selected month range or custom date range
    const filteredOrders = useMemo(() => {
        if (rangeValue === 'custom' && customStart && customEnd) {
            const start = new Date(customStart + 'T00:00:00')
            const end = new Date(customEnd + 'T23:59:59.999')
            return orders.filter((o) => {
                const d = new Date(o.createdAt || 0)
                return d >= start && d <= end
            })
        }
        if (rangeValue === -1) return orders
        const { start, end } = getMonthRange(rangeValue)
        return orders.filter((o) => {
            const d = new Date(o.createdAt || 0)
            return d >= start && d <= end
        })
    }, [orders, rangeValue, customStart, customEnd])

    // Stats for filtered period
    const periodStats = useMemo(() => {
        let totalRevenue = 0
        let bunnyRevenue = 0
        let bunnyCount = 0
        let deliveredCount = 0
        let acceptedCount = 0

        for (const order of filteredOrders) {
            const orderValue = storeId ? storePortionTotal(order, storeId, allProducts) : Number(order.total || 0)
            totalRevenue += orderValue
            const status = order.status || 'New'
            const fMap = order.fulfillments || {}
            const storeStatus = storeId && fMap[storeId] ? fMap[storeId].status : status
            const effectiveStatus = storeId ? storeStatus : status

            if (effectiveStatus === 'Bunny' || status === 'Bunny') {
                bunnyRevenue += orderValue
                bunnyCount++
            }
            if (effectiveStatus === 'Delivered') deliveredCount++
            if (effectiveStatus === 'Accepted') acceptedCount++
        }

        const commissionRate = plan.commission / 100
        const qpayFee = Math.round(bunnyRevenue * 0.01)
        const qpayFlatFee = bunnyCount * 200 // Гүйлгээний хураамж per order
        const commissionPaid = Math.round(bunnyRevenue * commissionRate) // Commission from total amount
        const revenueAfterFees = bunnyRevenue - qpayFee - qpayFlatFee - commissionPaid

        return { totalRevenue, bunnyRevenue, bunnyCount, deliveredCount, acceptedCount, commissionPaid, qpayFee, qpayFlatFee, revenueAfterFees, ordersCount: filteredOrders.length }
    }, [filteredOrders, storeId, allProducts, plan.commission])

    // Gold tier commission bucket — current month only
    const commissionBucket = useMemo(() => {
        if (currentTier !== 'gold' || !storeId) return null
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        let bunnyRevenue = 0
        let bunnyCount = 0
        for (const o of orders) {
            const d = new Date(o.createdAt || 0)
            if (d < monthStart || d > monthEnd) continue
            const fMap = o.fulfillments || {}
            const storeStatus = fMap[storeId] ? fMap[storeId].status : o.status
            if (storeStatus === 'Bunny' || o.status === 'Bunny') {
                bunnyRevenue += storePortionTotal(o, storeId, allProducts)
                bunnyCount++
            }
        }

        const qFee = Math.round(bunnyRevenue * 0.01)
        const qFlat = bunnyCount * 200
        const commission = Math.round(bunnyRevenue * (plan.commission / 100)) // Commission from total amount
        const buckets = commission > 0 ? Math.floor(commission / COMMISSION_BUCKET_LIMIT) : 0
        const remainder = commission > 0 ? commission % COMMISSION_BUCKET_LIMIT : 0
        const payable = buckets * COMMISSION_BUCKET_LIMIT

        return { commission, buckets, remainder, payable, limit: COMMISSION_BUCKET_LIMIT }
    }, [currentTier, storeId, orders, allProducts, plan.commission])

    // Top customers by spend
    const topCustomers = useMemo(() => {
        const map = new Map()
        for (const order of filteredOrders) {
            const key = order.customer?.email || order.customer?.phone || order.id
            const orderValue = storeId ? storePortionTotal(order, storeId, allProducts) : Number(order.total || 0)
            const prev = map.get(key)
            if (prev) {
                prev.ordersCount += 1
                prev.totalSpent += orderValue
            } else {
                map.set(key, {
                    key,
                    name: order.customer?.name || 'Unknown',
                    email: order.customer?.email || '-',
                    phone: order.customer?.phone || '-',
                    ordersCount: 1,
                    totalSpent: orderValue,
                })
            }
        }
        return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10)
    }, [filteredOrders, storeId, allProducts])

    // Top selling products
    const topProducts = useMemo(() => {
        const map = new Map()
        for (const order of filteredOrders) {
            const items = storeId
                ? (order.items || []).filter((l) => (l.storeId || '_') === storeId)
                : (order.items || [])
            for (const line of items) {
                const qty = Number(line.quantity || 0)
                const prev = map.get(line.productId)
                if (prev) {
                    prev.totalQty += qty
                    prev.orderCount += 1
                } else {
                    const prod = allProducts.find((p) => p.id === line.productId)
                    map.set(line.productId, {
                        productId: line.productId,
                        title: prod?.title || line.productId,
                        image: prod?.thumbnail || prod?.image || '',
                        price: prod?.price || 0,
                        totalQty: qty,
                        orderCount: 1,
                    })
                }
            }
        }
        return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty).slice(0, 10)
    }, [filteredOrders, storeId, allProducts])

    const topSeller = topProducts[0] || null

    // Next tier savings
    const nextTierSavings = useMemo(() => {
        const idx = tierOrder.indexOf(currentTier)
        if (idx >= tierOrder.length - 1) return null
        const nextId = tierOrder[idx + 1]
        const nextPlan = TIER_PLANS[nextId]
        if (!nextPlan) return null
        const nextRate = nextPlan.commission / 100
        const currentRate = plan.commission / 100
        const savingsOnCommission = Math.round(periodStats.bunnyRevenue * (currentRate - nextRate))
        return { nextTier: nextPlan, nextId, savingsOnCommission }
    }, [currentTier, plan.commission, periodStats.bunnyRevenue])

    // Monthly breakdown for chart
    const monthlyBreakdown = useMemo(() => {
        const map = new Map()
        for (const order of filteredOrders) {
            const d = new Date(order.createdAt || 0)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const orderValue = storeId ? storePortionTotal(order, storeId, allProducts) : Number(order.total || 0)
            const prev = map.get(key)
            if (prev) {
                prev.revenue += orderValue
                prev.count += 1
            } else {
                map.set(key, { month: key, label: monthLabel(d), revenue: orderValue, count: 1 })
            }
        }
        return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
    }, [filteredOrders, storeId, allProducts])

    const maxRevenue = Math.max(...monthlyBreakdown.map((m) => m.revenue), 1)

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header with range picker */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{t('admin.analytics')} — {session?.storeName || 'Store'}</h2>
                    <p className="text-sm text-slate-500">{t('admin.salesPerformance')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Calendar size={14} className="text-slate-400" />
                    {RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setRangeValue(opt.value); setCustomStart(''); setCustomEnd('') }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                rangeValue === opt.value
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                    <div className="flex items-center gap-1 flex-wrap">
                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-[120px]" />
                        <span className="text-xs text-slate-400">—</span>
                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-[120px]" />
                        <button
                            onClick={() => { if (customStart && customEnd) setRangeValue('custom') }}
                            disabled={!customStart || !customEnd}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                            Хайх
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">{t('admin.totalOrders')}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{periodStats.ordersCount}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <ShoppingBag size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">{t('admin.totalRevenue')}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(periodStats.totalRevenue)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <DollarSign size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">Bunny Sales</p>
                                <p className="text-2xl font-bold text-[#D66B3E] mt-1">{formatCurrency(periodStats.bunnyRevenue)}</p>
                                <p className="text-[11px] text-slate-400">{periodStats.bunnyCount} orders</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-[#D66B3E]/10 text-[#D66B3E] flex items-center justify-center">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">QPay + Гүйлгээ хураамж</p>
                                <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(periodStats.qpayFee + periodStats.qpayFlatFee)}</p>
                                <p className="text-[11px] text-slate-400">QPay 1%: {formatCurrency(periodStats.qpayFee)} · Хураамж: {formatCurrency(periodStats.qpayFlatFee)}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <CreditCard size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">Commission ({plan.commission}%)</p>
                                <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(periodStats.commissionPaid)}</p>
                                <p className="text-[11px] text-slate-400">{plan.name} tier (from after QPay)</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                                <Percent size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gold tier commission bucket */}
            {commissionBucket && (
                <Card className={commissionBucket.payable > 0 ? 'border-amber-300 bg-amber-50/50' : 'bg-slate-50/50'}>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Crown size={18} className="text-amber-500" />
                                <span className="font-semibold text-slate-900">Шимтгэлийн хуримтлал</span>
                            </div>
                            <span className="text-sm font-mono text-slate-600">
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
                                    : `Шимтгэл одоогоор тооцогдоогүй — Bunny статустай захиалга хэрэгтэй`}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Tier savings card */}
            {nextTierSavings && nextTierSavings.savingsOnCommission > 0 && (
                <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-yellow-50/30">
                    <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Sparkles size={20} className="text-amber-600 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    Upgrade to {nextTierSavings.nextTier.name} tier and save {formatCurrency(nextTierSavings.savingsOnCommission)}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {nextTierSavings.nextTier.commission}% commission vs your current {plan.commission}%
                                </p>
                            </div>
                        </div>
                        <Link to="/admin/tier-list">
                            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#D66B3E] to-[#c45d35] hover:from-[#c45d35] hover:to-[#b85430] text-white text-xs font-semibold shadow-md flex items-center gap-1.5 whitespace-nowrap">
                                <Crown size={14} />
                                Upgrade Tier
                                <ArrowRight size={12} />
                            </button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Monthly revenue chart */}
            {monthlyBreakdown.length > 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 size={18} className="text-slate-500" />
                            Monthly Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-40">
                            {monthlyBreakdown.map((m) => {
                                const pct = (m.revenue / maxRevenue) * 100
                                return (
                                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                        <p className="text-[10px] text-slate-500 tabular-nums">{formatCurrency(m.revenue)}</p>
                                        <div className="w-full flex items-end" style={{ height: '120px' }}>
                                            <div
                                                className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all"
                                                style={{ height: `${Math.max(pct, 4)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate w-full text-center">{m.label}</p>
                                        <p className="text-[9px] text-slate-400">{m.count} orders</p>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Seller highlight */}
                {topSeller && (
                    <Card className="border-2 border-[#D66B3E]/30 bg-gradient-to-br from-orange-50/50 to-amber-50/30 lg:col-span-2">
                        <CardContent className="pt-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Star size={18} className="text-[#D66B3E]" />
                                <h3 className="text-sm font-bold text-slate-900">Top Seller</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                {topSeller.image ? (
                                    <img src={topSeller.image} alt={topSeller.title} className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                                        <Package size={24} className="text-slate-400" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900 truncate">{topSeller.title}</p>
                                    <p className="text-sm text-slate-500">{formatCurrency(topSeller.price)} per unit</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-bold text-[#D66B3E]">{topSeller.totalQty}</p>
                                    <p className="text-xs text-slate-500">units sold</p>
                                    <p className="text-xs text-slate-400">{topSeller.orderCount} orders</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package size={16} className="text-emerald-600" />
                            Top Products
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topProducts.length === 0 ? (
                            <div className="py-8 text-center">
                                <Package size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-slate-500 text-sm">No product sales yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {topProducts.map((p, i) => {
                                    const barWidth = topProducts[0]?.totalQty ? (p.totalQty / topProducts[0].totalQty) * 100 : 0
                                    return (
                                        <div key={p.productId} className="flex items-center gap-3">
                                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                                {i + 1}
                                            </div>
                                            {p.image ? (
                                                <img src={p.image} alt={p.title} className="w-8 h-8 rounded-md object-cover shrink-0" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-md bg-slate-100 shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{p.title}</p>
                                                <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                                        style={{ width: `${barWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <p className="text-sm font-semibold tabular-nums">{p.totalQty}</p>
                                                <p className="text-[10px] text-slate-400">{p.orderCount} orders</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Customers */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users size={16} className="text-purple-600" />
                            {t('admin.topCustomers')}
                        </CardTitle>
                        {topCustomers.length > 5 && (
                            <Link to="/admin/customers" className="text-xs text-slate-500 hover:text-slate-900 font-medium">
                                {t('admin.viewAll')}
                            </Link>
                        )}
                    </CardHeader>
                    <CardContent>
                        {topCustomers.length === 0 ? (
                            <div className="py-8 text-center">
                                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-slate-500 text-sm">{t('admin.noCustomersYet')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {topCustomers.slice(0, 8).map((c, i) => {
                                    const barWidth = topCustomers[0]?.totalSpent ? (c.totalSpent / topCustomers[0].totalSpent) * 100 : 0
                                    return (
                                        <div key={c.key} className="flex items-center gap-3">
                                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                                                <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full transition-all"
                                                        style={{ width: `${barWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <p className="text-sm font-semibold tabular-nums">{formatCurrency(c.totalSpent)}</p>
                                                <p className="text-[10px] text-slate-400">{c.ordersCount} orders</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

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
        </div>
    )
}
