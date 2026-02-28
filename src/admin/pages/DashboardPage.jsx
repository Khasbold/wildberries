import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useAdmin } from '../../modules/state/useAdmin.js'

function formatCurrencyRub(n) {
    try {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
    } catch {
        return `${Math.round(n)} ₽`
    }
}

export default function DashboardPage() {
    const { stats, session } = useAdmin()

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">{session?.storeName || 'Store'} Dashboard</h2>
                <p className="text-sm text-slate-500">Sales and performance for your store</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Orders</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-slate-900">{stats.ordersCount}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Revenue</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-slate-900">{formatCurrencyRub(stats.revenue)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Accepted Orders</CardTitle></CardHeader>
                    <CardContent><div className="flex items-center gap-2"><p className="text-3xl font-bold text-slate-900">{stats.acceptedCount}</p><Badge variant="warning">Pending</Badge></div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Delivered Orders</CardTitle></CardHeader>
                    <CardContent><div className="flex items-center gap-2"><p className="text-3xl font-bold text-slate-900">{stats.deliveredCount}</p><Badge variant="success">Done</Badge></div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Customers</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.customers.length === 0 ? (
                        <p className="text-slate-500">No customers yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {stats.customers.slice(0, 6).map((c) => (
                                <div key={c.key} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                                    <div>
                                        <p className="font-medium text-slate-900">{c.name}</p>
                                        <p className="text-xs text-slate-500">{c.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{c.ordersCount} orders</p>
                                        <p className="text-xs text-slate-500">{formatCurrencyRub(c.totalSpent)}</p>
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
