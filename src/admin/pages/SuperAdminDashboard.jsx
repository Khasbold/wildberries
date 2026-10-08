import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { TIER_PLANS, updateAdminUser, subscribe, getState } from '../../modules/state/store.js'
import { storePortionTotal } from '../../utils/orderFulfillment.js'
import { Store, Users, Package, ShoppingBag, TrendingUp, DollarSign, Truck, Crown, BarChart3, Calendar, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useI18n } from '../../modules/i18n/useI18n.js'

import { formatCurrency as fmt } from '../../utils/formatCurrency.js'

function pct(a, b) {
    if (!b) return '0%'
    return `${Math.round((a / b) * 100)}%`
}

function formatDate(str) {
    const d = new Date(str + 'T00:00:00')
    return d.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' })
}

const tierBadgeClass = {
    free: 'bg-slate-200 text-slate-800',
    bronze: 'bg-amber-200 text-amber-900',
    silver: 'bg-gray-300 text-gray-800',
    gold: 'bg-yellow-200 text-yellow-900',
}

function VisitorChart() {
    const { t } = useI18n()
    const [visitData, setVisitData] = useState([])
    const [loading, setLoading] = useState(true)
    const [range, setRange] = useState('7')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    const loadData = useCallback(async (days, start, end) => {
        setLoading(true)
        try {
            let data
            if (start && end) {
                const { getVisitStats } = await import('../../firebase/visitorTracking.js')
                data = await getVisitStats(start, end)
            } else {
                const { getRecentVisits } = await import('../../firebase/visitorTracking.js')
                data = await getRecentVisits(Number(days))
            }
            const endDate = end ? new Date(end + 'T00:00:00') : new Date()
            const startDate = start ? new Date(start + 'T00:00:00') : new Date(endDate.getTime() - (Number(days) - 1) * 86400000)
            const filled = []
            const dataMap = {}
            for (const d of data) dataMap[d.date] = d.count
            const cur = new Date(startDate)
            while (cur <= endDate) {
                const key = cur.toISOString().slice(0, 10)
                filled.push({ date: key, count: dataMap[key] || 0 })
                cur.setDate(cur.getDate() + 1)
            }
            setVisitData(filled)
        } catch {
            setVisitData([])
        }
        setLoading(false)
    }, [])

    useEffect(() => { loadData(range) }, [range, loadData])

    function handleCustomRange() {
        if (customStart && customEnd) { setRange('custom'); loadData(0, customStart, customEnd) }
    }

    const maxCount = Math.max(1, ...visitData.map((d) => d.count))
    const totalVisitors = visitData.reduce((s, d) => s + d.count, 0)
    const avgDaily = visitData.length > 0 ? Math.round(totalVisitors / visitData.length) : 0

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-600" />
                        <div>
                            <CardTitle>{t('admin.visitors')}</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">{t('admin.dailyVisitors')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {['7', '14', '30'].map((d) => (
                            <button key={d} onClick={() => { setRange(d); setCustomStart(''); setCustomEnd('') }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${range === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {d} {t('admin.days')}
                            </button>
                        ))}
                        <div className="flex items-center gap-1 flex-wrap">
                            <Calendar size={14} className="text-slate-400 hidden sm:block" />
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-[110px] sm:w-[120px]" />
                            <span className="text-xs text-slate-400">—</span>
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-[110px] sm:w-[120px]" />
                            <button onClick={handleCustomRange} disabled={!customStart || !customEnd} className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">{t('admin.searchBtn')}</button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4 sm:gap-6 mb-4">
                    <div><p className="text-xs text-slate-500">{t('admin.totalVisitors')}</p><p className="text-xl font-bold text-slate-900">{totalVisitors.toLocaleString()}</p></div>
                    <div><p className="text-xs text-slate-500">{t('admin.dailyAverage')}</p><p className="text-xl font-bold text-blue-600">{avgDaily.toLocaleString()}</p></div>
                    <div><p className="text-xs text-slate-500">{t('admin.today')}</p><p className="text-xl font-bold text-emerald-600">{visitData.length > 0 ? visitData[visitData.length - 1].count : 0}</p></div>
                </div>
                {loading ? (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Loading...</div>
                ) : visitData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">{t('admin.noData')}</div>
                ) : (
                    <div className="relative overflow-x-auto" style={{ minWidth: 0 }}>
                        <div className="absolute left-0 top-0 w-10 flex flex-col justify-between text-[10px] text-slate-400 text-right pr-1" style={{ height: 192 }}>
                            <span>{maxCount}</span><span>{Math.round(maxCount / 2)}</span><span>0</span>
                        </div>
                        <div className="ml-10 flex items-end gap-[2px] border-b border-l border-slate-200 relative" style={{ height: 192 }}>
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                <div className="border-b border-dashed border-slate-100 w-full" /><div className="border-b border-dashed border-slate-100 w-full" /><div />
                            </div>
                            {visitData.map((d) => {
                                const pxH = maxCount > 0 ? Math.max(Math.round((d.count / maxCount) * 188), d.count > 0 ? 4 : 1) : 1
                                return (
                                    <div key={d.date} className="flex-1 group relative" style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                                        <div className="w-full rounded-t bg-blue-500 hover:bg-blue-600 transition-all duration-300 cursor-pointer relative" style={{ height: pxH }}>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none">
                                                <p className="font-medium">{d.date}</p><p><strong>{d.count}</strong> {t('admin.visitor')}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="ml-10 flex justify-between mt-1 text-[9px] text-slate-400">
                            {visitData.length <= 14
                                ? visitData.map((d) => <span key={d.date} className="flex-1 text-center">{formatDate(d.date)}</span>)
                                : <><span>{formatDate(visitData[0].date)}</span><span>{formatDate(visitData[Math.floor(visitData.length / 2)].date)}</span><span>{formatDate(visitData[visitData.length - 1].date)}</span></>
                            }
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const tierColors = {
    free: '#94a3b8',
    bronze: '#d97706',
    silver: '#6b7280',
    gold: '#eab308',
}

function TierRegistrationChart({ storeOwners, carrotUserIds }) {
    const { t } = useI18n()
    const chartData = useMemo(() => {
        // Collect all tier registrations that have a tierStartDate, excluding carrot users
        const registrations = storeOwners
            .filter((o) => o.tierStartDate && o.tier && o.tier !== 'free' && !carrotUserIds.has(o.id))
            .map((o) => ({
                date: o.tierStartDate,
                tier: o.tier,
                storeName: o.storeName || o.name,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))

        if (registrations.length === 0) return null

        // Group by date
        const byDate = {}
        for (const r of registrations) {
            if (!byDate[r.date]) byDate[r.date] = { date: r.date, bronze: 0, silver: 0, gold: 0, items: [] }
            byDate[r.date][r.tier] = (byDate[r.date][r.tier] || 0) + 1
            byDate[r.date].items.push(r)
        }

        const days = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
        return { days, registrations }
    }, [storeOwners])

    if (!chartData || chartData.days.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-indigo-600" />
                        <div>
                            <CardTitle>{t('admin.tierRegTimeline')}</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">When store owners registered or upgraded their tier</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-32 flex items-center justify-center text-slate-400 text-sm">{t('admin.noTierRegistrations')}</div>
                </CardContent>
            </Card>
        )
    }

    const maxPerDay = Math.max(1, ...chartData.days.map((d) => d.bronze + d.silver + d.gold))

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-indigo-600" />
                        <div>
                            <CardTitle>{t('admin.tierRegTimeline')}</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">{t('admin.tierRegCount', { count: chartData.registrations.length })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {['bronze', 'silver', 'gold'].map((t) => (
                            <div key={t} className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: tierColors[t] }} />
                                <span className="text-xs text-slate-500 capitalize">{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <div className="absolute left-0 top-0 w-8 flex flex-col justify-between text-[10px] text-slate-400 text-right pr-1" style={{ height: 160 }}>
                        <span>{maxPerDay}</span><span>{Math.round(maxPerDay / 2)}</span><span>0</span>
                    </div>
                    <div className="ml-8 flex items-end gap-[3px] border-b border-l border-slate-200 relative" style={{ height: 160 }}>
                        {chartData.days.map((d) => {
                            const total = d.bronze + d.silver + d.gold
                            const segments = [
                                { tier: 'bronze', count: d.bronze },
                                { tier: 'silver', count: d.silver },
                                { tier: 'gold', count: d.gold },
                            ].filter((s) => s.count > 0)
                            return (
                                <div key={d.date} className="flex-1 group relative" style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                                    <div className="w-full flex flex-col-reverse cursor-pointer" style={{ height: Math.max(Math.round((total / maxPerDay) * 152), 4) }}>
                                        {segments.map((seg) => (
                                            <div
                                                key={seg.tier}
                                                className="w-full rounded-t-sm first:rounded-b-sm"
                                                style={{
                                                    height: `${(seg.count / total) * 100}%`,
                                                    backgroundColor: tierColors[seg.tier],
                                                    minHeight: 2,
                                                }}
                                            />
                                        ))}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl pointer-events-none">
                                            <p className="font-medium mb-1">{d.date}</p>
                                            {d.items.map((item, idx) => (
                                                <p key={idx}><span className="capitalize">{item.tier}</span> — {item.storeName}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="ml-8 flex justify-between mt-1 text-[9px] text-slate-400">
                        {chartData.days.length <= 14
                            ? chartData.days.map((d) => <span key={d.date} className="flex-1 text-center">{formatDate(d.date)}</span>)
                            : <><span>{formatDate(chartData.days[0].date)}</span><span>{formatDate(chartData.days[Math.floor(chartData.days.length / 2)].date)}</span><span>{formatDate(chartData.days[chartData.days.length - 1].date)}</span></>
                        }
                    </div>
                </div>

                {/* Recent registrations list */}
                <div className="mt-6">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('admin.recentRegistrations')}</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {chartData.registrations.slice(-10).reverse().map((r, i) => (
                            <div key={i} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <Badge className={tierBadgeClass[r.tier]}>{TIER_PLANS[r.tier]?.name}</Badge>
                                    <span className="text-sm font-medium text-slate-900">{r.storeName}</span>
                                </div>
                                <span className="text-xs text-slate-500">{r.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function RefundedOrdersSection({ orders, adminUsers, deriveAggregateStatus }) {
    const { t } = useI18n()
    const refundedOrders = useMemo(() => {
        return orders
            .filter((o) => deriveAggregateStatus(o) === 'Refunded' || o.refundStatus === 'Refunded')
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }, [orders, deriveAggregateStatus])

    if (refundedOrders.length === 0) return null

    return (
        <Card className="border-l-4 border-l-slate-400">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-slate-500" />
                    <div>
                        <CardTitle>Refunded Orders</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">{refundedOrders.length} refunded orders</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Store(s)</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {refundedOrders.slice(0, 20).map((o, i) => {
                            const storeIds = o.storeIds || (o.storeId ? [o.storeId] : [])
                            const storeNames = storeIds
                                .map((sid) => adminUsers.find((u) => u.storeId === sid)?.storeName || sid)
                                .join(', ')
                            return (
                                <TableRow key={o.id}>
                                    <TableCell className="text-xs text-slate-400 tabular-nums">{i + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{o.id?.replace('ORD-', '#')}</TableCell>
                                    <TableCell>
                                        <p className="text-sm">{o.customer?.name || '—'}</p>
                                        <p className="text-[10px] text-slate-400">{o.customer?.email || ''}</p>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-700">{storeNames || '—'}</TableCell>
                                    <TableCell className="text-right tabular-nums font-medium">{fmt(o.total || 0)}</TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="refunded">Refunded</Badge>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export default function SuperAdminDashboard() {
    const { orders, products, deriveAggregateStatus } = useAdmin()
    const { adminUsers } = useSession()
    const { t } = useI18n()
    const globalState = useSyncExternalStore(subscribe, getState)
    const state = useMemo(() => ({ adminUsers }), [adminUsers])

    const storeOwners = useMemo(() => adminUsers.filter((u) => u.role === 'admin'), [adminUsers])

    // Identify carrot users (tier changed by admin, found in tierChangeHistory)
    const carrotUserIds = useMemo(() => {
        const ids = new Set()
        const allHistory = globalState.tierChangeHistory || []
        for (const entry of allHistory) {
            if (entry.userId) ids.add(entry.userId)
            const matchUser = storeOwners.find((u) => u.storeName === entry.storeName || u.name === entry.userName)
            if (matchUser) ids.add(matchUser.id)
        }
        return ids
    }, [globalState.tierChangeHistory, storeOwners])

    // Subscription analytics
    const subscriptionStats = useMemo(() => {
        const tierCounts = { free: 0, bronze: 0, silver: 0, gold: 0 }
        const paidTierCounts = { free: 0, bronze: 0, silver: 0, gold: 0 }
        let totalSubRevenue = 0
        const paidOwners = []

        for (const owner of storeOwners) {
            const tier = owner.tier || 'free'
            tierCounts[tier] = (tierCounts[tier] || 0) + 1

            // Separate counts excluding carrot users (for analytics display)
            const isCarrot = carrotUserIds.has(owner.id)
            if (isCarrot) {
                // Carrot users count as free for analytics
                paidTierCounts['free'] = (paidTierCounts['free'] || 0) + 1
            } else {
                paidTierCounts[tier] = (paidTierCounts[tier] || 0) + 1
            }

            // Only count paid subscriptions (exclude free tier and carrot users)
            if (tier !== 'free' && !isCarrot) {
                const plan = TIER_PLANS[tier]
                if (plan) {
                    const months = owner.tierDurationMonths || 1
                    totalSubRevenue += plan.price * months
                    paidOwners.push(owner)
                }
            }
        }

        return { tierCounts, paidTierCounts, totalSubRevenue, paidOwners }
    }, [storeOwners, carrotUserIds])

    const storeStats = useMemo(() => {
        return storeOwners.map((owner) => {
            const sid = owner.storeId
            const isGold = (owner.tier || 'free') === 'gold'
            const storeProducts = products.filter((p) => p.storeId === sid)
            const storeOrders = orders.filter((o) => {
                if (o.storeId === sid) return true
                if (Array.isArray(o.storeIds) && o.storeIds.includes(sid)) return true
                if (Array.isArray(o.items) && o.items.some((item) => item.storeId === sid)) return true
                return false
            })
            const revenue = storeOrders.reduce((sum, o) => sum + storePortionTotal(o, sid, products), 0)
            const delivered = storeOrders.filter((o) => deriveAggregateStatus(o) === 'Delivered').length
            const refundReq = storeOrders.filter((o) => o.refundStatus === 'Requested').length
            const pending = storeOrders.filter((o) => {
                const a = deriveAggregateStatus(o)
                return a === 'New' || a === 'Accepted'
            }).length

            // Bunny-only revenue (orders marked Bunny = fully paid via QPay)
            const bunnyOrders = storeOrders.filter((o) => deriveAggregateStatus(o) === 'Bunny')
            const bunnyRevenue = bunnyOrders.reduce((sum, o) => sum + storePortionTotal(o, sid, products), 0)
            const bunnyCount = bunnyOrders.length
            const qpayFee = Math.round(bunnyRevenue * 0.01)
            const flatFee = isGold ? 0 : bunnyCount * 200
            const netBunnyRevenue = bunnyRevenue - qpayFee - flatFee

            const commissionRate = (owner.commissionOverride != null ? owner.commissionOverride : owner.commission != null ? owner.commission : (TIER_PLANS[owner.tier || 'free']?.commission ?? 10)) / 100
            const bunnyEarnings = Math.round(netBunnyRevenue * commissionRate)
            const platformFee = Math.round(revenue * commissionRate * 100) / 100
            const payout = Math.round((revenue - platformFee) * 100) / 100
            return {
                ...owner,
                productsCount: storeProducts.length,
                ordersCount: storeOrders.length,
                revenue,
                delivered,
                refundReq,
                pending,
                platformFee,
                payout,
                commissionRate: commissionRate * 100,
                bunnyRevenue,
                bunnyCount,
                bunnyEarnings,
                qpayFee,
                flatFee,
            }
        }).sort((a, b) => b.revenue - a.revenue)
    }, [storeOwners, products, orders, deriveAggregateStatus])

    const totals = useMemo(() => {
        const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0)
        const totalPlatformFee = storeStats.reduce((s, st) => s + st.platformFee, 0)
        const totalPayout = storeStats.reduce((s, st) => s + st.payout, 0)
        const totalBunnyEarnings = storeStats.reduce((s, st) => s + st.bunnyEarnings, 0)
        const delivered = orders.filter((o) => deriveAggregateStatus(o) === 'Delivered').length
        const refundReq = orders.filter((o) => o.refundStatus === 'Requested').length
        return { stores: storeOwners.length, products: products.length, orders: orders.length, revenue, platformFee: totalPlatformFee, totalPayout, delivered, refundReq, totalBunnyEarnings }
    }, [storeOwners, products, orders, deriveAggregateStatus, storeStats])

    const topStore = storeStats[0]

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">{t('admin.superAdminDashboard')}</h2>
                <p className="text-sm text-slate-500">{t('admin.platformOverview')}</p>
            </div>

            {/* Summary Cards Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">{t('admin.storeOwners')}</p><p className="text-2xl font-bold text-slate-900 mt-1">{totals.stores}</p></div><div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center"><Users size={20} className="text-indigo-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">{t('admin.allProducts')}</p><p className="text-2xl font-bold text-slate-900 mt-1">{totals.products}</p></div><div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Package size={20} className="text-emerald-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">{t('admin.totalOrders')}</p><p className="text-2xl font-bold text-slate-900 mt-1">{totals.orders}</p></div><div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><ShoppingBag size={20} className="text-amber-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-5"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">{t('admin.delivered')}</p><p className="text-2xl font-bold text-emerald-600 mt-1">{totals.delivered}</p>{totals.refundReq > 0 && <p className="text-[10px] text-orange-600 mt-1">{totals.refundReq} {t('admin.refundRequests')}</p>}</div><div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Truck size={20} className="text-emerald-600" /></div></div></CardContent></Card>
            </div>

            {/* Revenue Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="border-l-4 border-l-blue-500"><CardContent className="pt-5"><p className="text-xs font-medium text-slate-500">{t('admin.totalPlatformRevenue')}</p><p className="text-2xl font-bold text-slate-900 mt-1">{fmt(totals.revenue)}</p><p className="text-[11px] text-slate-400 mt-1">{totals.orders} {t('admin.ordersTotal')}</p></CardContent></Card>
                <Card className="border-l-4 border-l-green-500"><CardContent className="pt-5"><p className="text-xs font-medium text-slate-500">{t('admin.ownerPayouts')}</p><p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(totals.totalPayout)}</p><p className="text-[11px] text-slate-400 mt-1">{t('admin.acrossStores', { count: totals.stores })}</p></CardContent></Card>
                <Card className="border-l-4 border-l-purple-500"><CardContent className="pt-5"><p className="text-xs font-medium text-slate-500">iBunny орлого (Bunny захиалга)</p><p className="text-2xl font-bold text-purple-700 mt-1">{fmt(totals.totalBunnyEarnings)}</p><p className="text-[11px] text-slate-400 mt-1">QPay хураамж суутгасан, Gold-д тогтмол хэмжээ байхгүй</p></CardContent></Card>
            </div>

            {/* Subscription Analytics */}
            <Card className="border-l-4 border-l-yellow-500">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Crown size={20} className="text-yellow-600" />
                        <div>
                            <CardTitle>{t('admin.subscriptionTierAnalytics')}</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">{t('admin.tierDistribution')}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                        {Object.entries(TIER_PLANS).map(([id, plan]) => (
                            <div key={id} className={`rounded-xl p-4 border ${id === 'gold' ? 'border-yellow-300 bg-yellow-50' : id === 'silver' ? 'border-gray-300 bg-gray-50' : id === 'bronze' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <Badge className={tierBadgeClass[id]}>{plan.name}</Badge>
                                    <span className="text-2xl font-bold text-slate-900">{subscriptionStats.paidTierCounts[id] || 0}</span>
                                </div>
                                <p className="text-xs text-slate-500">{plan.price > 0 ? `${fmt(plan.price)}/mo` : 'Free'}</p>
                                <p className="text-xs text-slate-400">{plan.commission}% commission</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200">
                        <div>
                            <p className="text-xs font-medium text-slate-500">{t('admin.totalSubRevenue')}</p>
                            <p className="text-2xl font-bold text-amber-700">{fmt(subscriptionStats.totalSubRevenue)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">{t('admin.paidSubscribers')}</p>
                            <p className="text-2xl font-bold text-slate-900">{subscriptionStats.paidOwners.length}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tier Registration Timeline Chart */}
            <TierRegistrationChart storeOwners={storeOwners} carrotUserIds={carrotUserIds} />

            {/* Visitor Analytics Chart */}
            <VisitorChart />

            {/* Store Owners Earnings Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t('admin.storeOwnerEarnings')}</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">{t('admin.perStoreBreakdown')}</p>
                    </div>
                    {topStore && <Badge variant="default" className="text-[10px]"><TrendingUp size={10} className="mr-1" />{t('admin.topStore')}: {topStore.storeName}</Badge>}
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>{t('admin.store')}</TableHead>
                                <TableHead>{t('admin.owner')}</TableHead>
                                <TableHead>{t('admin.tier')}</TableHead>
                                <TableHead className="text-right">{t('admin.products')}</TableHead>
                                <TableHead className="text-right">{t('admin.orders')}</TableHead>
                                <TableHead className="text-right">{t('admin.revenue')}</TableHead>
                                <TableHead className="text-right">Bunny орлого</TableHead>
                                <TableHead className="text-right">{t('admin.commission')}</TableHead>
                                <TableHead className="text-right">{t('admin.payout')}</TableHead>
                                <TableHead>{t('admin.start')}</TableHead>
                                <TableHead>{t('admin.end')}</TableHead>
                                <TableHead className="text-center">Showcase</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {storeStats.length === 0 ? (
                                <TableRow><TableCell colSpan={13} className="h-24 text-center text-slate-400">{t('admin.noStoreOwners')}</TableCell></TableRow>
                            ) : (
                                <>
                                    {storeStats.map((s, i) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="text-xs text-slate-400 tabular-nums">{i + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{s.storeName?.[0] || 'S'}</div>
                                                    <div><p className="text-sm font-medium">{s.storeName}</p><p className="text-[10px] text-slate-400 font-mono">@{s.username}</p></div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{s.name}</TableCell>
                                            <TableCell>
                                                <Badge className={tierBadgeClass[s.tier || 'free']}>{TIER_PLANS[s.tier || 'free']?.name}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{s.productsCount}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {s.ordersCount}
                                                {s.pending > 0 && <span className="ml-1 text-[10px] text-amber-600">({s.pending} {t('admin.pending')})</span>}
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{fmt(s.revenue)}</TableCell>
                                            <TableCell className="text-right tabular-nums text-amber-700">
                                                {fmt(s.bunnyEarnings)}
                                                <span className="text-[9px] text-slate-400 ml-1">({s.bunnyCount} Bunny)</span>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-purple-700">
                                                {fmt(s.platformFee)}
                                                <span className="text-[9px] text-slate-400 ml-1">({s.commissionRate}%)</span>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums text-emerald-700">{fmt(s.payout)}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{s.tierStartDate || '—'}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{s.tierEndDate || '—'}</TableCell>
                                            <TableCell className="text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => updateAdminUser(s.id, { showcased: !s.showcased })}
                                                    className={`p-1.5 rounded-lg transition-colors ${s.showcased ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                    title={s.showcased ? 'Click to hide from store owners' : 'Click to showcase to store owners'}
                                                >
                                                    {s.showcased ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-slate-50 font-semibold">
                                        <TableCell></TableCell>
                                        <TableCell className="text-sm">{t('admin.totals')}</TableCell>
                                        <TableCell className="text-xs text-slate-500">{storeStats.length} {t('admin.owners')}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-right tabular-nums">{totals.products}</TableCell>
                                        <TableCell className="text-right tabular-nums">{totals.orders}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmt(totals.revenue)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-amber-700">{fmt(totals.totalBunnyEarnings)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-purple-700">{fmt(totals.platformFee)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-emerald-700">{fmt(totals.totalPayout)}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Refunded Orders Section */}
            <RefundedOrdersSection orders={orders} adminUsers={adminUsers} deriveAggregateStatus={deriveAggregateStatus} />
        </div>
    )
}
