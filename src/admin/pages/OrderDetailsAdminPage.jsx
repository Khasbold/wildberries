import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Separator } from '../components/ui/Separator.jsx'

function formatCurrencyRub(n) {
    try {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
    } catch {
        return `${Math.round(n)} ₽`
    }
}

export default function OrderDetailsAdminPage() {
    const { orderId } = useParams()
    const { orders, products } = useAdmin()

    const order = useMemo(() => orders.find((item) => item.id === orderId), [orders, orderId])

    const itemsDetailed = useMemo(() => {
        if (!order) return []
        return order.items.map((line) => {
            const product = products.find((p) => p.id === line.productId)
            return {
                ...line,
                product,
            }
        })
    }, [order, products])

    if (!order) {
        return (
            <Card>
                <CardContent className="py-10 text-center">
                    <p className="text-slate-500 mb-4">Order not found.</p>
                    <Link to="/admin/orders">
                        <Button variant="outline">Back to orders</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Order details</p>
                    <h2 className="text-2xl font-semibold">{order.id}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Badge>{order.status}</Badge>
                    <Link to="/admin/orders">
                        <Button variant="outline">Back</Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Items ({order.items.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {itemsDetailed.map((line) => (
                            <div key={line.productId} className="border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                                <img
                                    src={line.product?.thumbnail || line.product?.image || 'https://via.placeholder.com/56x56?text=No+Img'}
                                    alt={line.product?.title || line.productId}
                                    className="w-14 h-14 rounded-md object-cover border border-slate-200"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{line.product?.title || line.productId}</p>
                                    <p className="text-xs text-slate-500">{line.product?.brand || 'Unknown brand'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm">x{line.quantity}</p>
                                    <p className="text-xs text-slate-500">{formatCurrencyRub((line.product?.price || 0) * line.quantity)}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p><span className="text-slate-500">Name:</span> {order.customer?.name || '-'}</p>
                            <p><span className="text-slate-500">Email:</span> {order.customer?.email || '-'}</p>
                            <p><span className="text-slate-500">Phone:</span> {order.customer?.phone || '-'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Delivery</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p><span className="text-slate-500">City:</span> {order.deliveryInfo?.city || '-'}</p>
                            <p><span className="text-slate-500">Address:</span> {order.deliveryInfo?.address || '-'}</p>
                            <p><span className="text-slate-500">Comment:</span> {order.deliveryInfo?.comment || '-'}</p>
                            <p><span className="text-slate-500">Payment:</span> {order.paymentMethod || '-'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Amount</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrencyRub(order.subtotal || 0)}</span></div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Discount</span>
                                <span className="text-emerald-600">-{formatCurrencyRub(order.discount || 0)}</span>
                            </div>
                            {order.discountCode && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Promo Code</span>
                                    <Badge variant="outline" className="font-mono text-xs">{order.discountCode}</Badge>
                                </div>
                            )}
                            <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{formatCurrencyRub(order.delivery || 0)}</span></div>
                            <Separator />
                            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrencyRub(order.total || 0)}</span></div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
