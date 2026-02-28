import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Separator } from '../components/ui/Separator.jsx'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { Store, Users, Package, ShoppingBag, TrendingUp, DollarSign, Truck, XCircle } from 'lucide-react'

function fmt(n) {
    try {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
    } catch {
        return `${Math.round(n)} ₽`
    }
}

function pct(a, b) {
    if (!b) return '0%'
    return `${Math.round((a / b) * 100)}%`
}

export default function SuperAdminDashboard() {
    const { orders, products } = useAdmin()
    const { adminUsers } = useSession()

    const storeOwners = useMemo(() => adminUsers.filter((u) => u.role === 'admin'), [adminUsers])

    const storeStats = useMemo(() => {
        return storeOwners.map((owner) => {
            const storeProducts = products.filter((p) => p.storeId === owner.storeId)
            const storeOrders = orders.filter((o) => o.storeId === owner.storeId)
            const revenue = storeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
            const delivered = storeOrders.filter((o) => o.status === 'Delivered').length
            const cancelled = storeOrders.filter((o) => o.status === 'Cancelled').length
            const pending = storeOrders.filter((o) => o.status === 'Создан' || o.status === 'Accepted').length
            const platformFee = Math.round(revenue * 0.15 * 100) / 100
            const payout = Math.round((revenue - platformFee) * 100) / 100
            return {
                ...owner,
                productsCount: storeProducts.length,
                ordersCount: storeOrders.length,
                revenue,
                delivered,
                cancelled,
                pending,
                platformFee,
                payout,
            }
        }).sort((a, b) => b.revenue - a.revenue)
    }, [storeOwners, products, orders])

    const totals = useMemo(() => {
        const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0)
        const platformFee = Math.round(revenue * 0.15 * 100) / 100
        const totalPayout = Math.round((revenue - platformFee) * 100) / 100
        const delivered = orders.filter((o) => o.status === 'Delivered').length
        const cancelled = orders.filter((o) => o.status === 'Cancelled').length
        return {
            stores: storeOwners.length,
            products: products.length,
            orders: orders.length,
            revenue,
            platformFee,
            totalPayout,
            delivered,
            cancelled,
        }
    }, [storeOwners, products, orders])

    const topStore = storeStats[0]

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">SuperAdmin Dashboard</h2>
                <p className="text-sm text-slate-500">Platform overview — all stores, owners, and revenue</p>
            </div>

            {/* Summary Cards Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">Store Owners</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{totals.stores}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Users size={20} className="text-indigo-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">All Products</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{totals.products}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Package size={20} className="text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">Total Orders</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{totals.orders}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <ShoppingBag size={20} className="text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">Delivered</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">{totals.delivered}</p>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Truck size={20} className="text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-5">
                        <p className="text-xs font-medium text-slate-500">Total Platform Revenue</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(totals.revenue)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{totals.orders} orders total</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-5">
                        <p className="text-xs font-medium text-slate-500">Owner Payouts (85%)</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(totals.totalPayout)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Across {totals.stores} stores</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-5">
                        <p className="text-xs font-medium text-slate-500">Platform Commission (15%)</p>
                        <p className="text-2xl font-bold text-purple-700 mt-1">{fmt(totals.platformFee)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Platform earnings</p>
                    </CardContent>
                </Card>
            </div>

            {/* Store Owners Earnings Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Store Owner Earnings & Payouts</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">Per-store breakdown — revenue, commission, and payout</p>
                    </div>
                    {topStore && (
                        <Badge variant="default" className="text-[10px]">
                            <TrendingUp size={10} className="mr-1" />
                            Top: {topStore.storeName}
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Store</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead className="text-right">Products</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Delivered</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Commission (15%)</TableHead>
                                <TableHead className="text-right">Payout (85%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {storeStats.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center text-slate-400">
                                        No store owners yet. Create them from the Store Owners page.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {storeStats.map((s, i) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="text-xs text-slate-400 tabular-nums">{i + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                        {s.storeName?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{s.storeName}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">@{s.username}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{s.name}</TableCell>
                                            <TableCell className="text-right tabular-nums">{s.productsCount}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {s.ordersCount}
                                                {s.pending > 0 && <span className="ml-1 text-[10px] text-amber-600">({s.pending} pending)</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={s.delivered > 0 ? 'success' : 'muted'}>{s.delivered}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{fmt(s.revenue)}</TableCell>
                                            <TableCell className="text-right tabular-nums text-purple-700">{fmt(s.platformFee)}</TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums text-emerald-700">{fmt(s.payout)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Totals row */}
                                    <TableRow className="bg-slate-50 font-semibold">
                                        <TableCell></TableCell>
                                        <TableCell className="text-sm">Totals</TableCell>
                                        <TableCell className="text-xs text-slate-500">{storeStats.length} owners</TableCell>
                                        <TableCell className="text-right tabular-nums">{totals.products}</TableCell>
                                        <TableCell className="text-right tabular-nums">{totals.orders}</TableCell>
                                        <TableCell className="text-right tabular-nums">{totals.delivered}</TableCell>
                                        <TableCell className="text-right tabular-nums">{fmt(totals.revenue)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-purple-700">{fmt(totals.platformFee)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-emerald-700">{fmt(totals.totalPayout)}</TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
