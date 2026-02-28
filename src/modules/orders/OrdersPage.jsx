import { Link } from 'react-router-dom'
import { products } from '../data/products.js'
import { useCart } from '../state/useCart.js'
import { useOrders } from '../state/useOrders.js'
import { useI18n } from '../i18n/useI18n.js'

export default function OrdersPage() {
    const { t } = useI18n()
    const { orders, clearOrders } = useOrders()
    const { addToCart } = useCart()

    function formatCurrencyRub(n) {
        try {
            return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
        } catch {
            return `${Math.round(n)} ₽`
        }
    }

    function formatDate(iso) {
        return new Date(iso).toLocaleString('ru-RU')
    }

    return (
        <div className="container-app py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">{t('orders.title')}</h1>
                {orders.length > 0 && <button className="btn-outline" onClick={clearOrders}>{t('orders.clear')}</button>}
            </div>

            {orders.length === 0 ? (
                <div className="card-surface p-6">
                    <p className="mb-3">{t('orders.empty')}</p>
                    <Link to="/catalog" className="btn-primary inline-block">{t('orders.startShopping')}</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <article key={order.id} className="card-surface p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <p className="font-semibold">{order.id}</p>
                                <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
                            </div>

                            <div className="text-sm text-slate-600 mb-3">
                                <p>{t('orders.status')} <span className="text-slate-900">{t('orders.created')}</span></p>
                                <p>{t('orders.delivery')} <span className="text-slate-900">{order.deliveryInfo.city}, {order.deliveryInfo.address}</span></p>
                                <p>{t('orders.payment')} <span className="text-slate-900">{order.paymentMethod}</span></p>
                            </div>

                            <div className="space-y-2 mb-3">
                                {order.items.map((line) => {
                                    const product = products.find((p) => p.id === line.productId)
                                    if (!product) return null
                                    return (
                                        <div key={line.productId} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="truncate">{product.title} × {line.quantity}</span>
                                            <span>{formatCurrencyRub(product.price * line.quantity)}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="flex items-center justify-between border-t pt-3">
                                <p className="font-semibold">{t('orders.total')} {formatCurrencyRub(order.total)}</p>
                                <div className="flex items-center gap-2">
                                    {order.items.slice(0, 2).map((line) => (
                                        <button key={line.productId} className="btn-outline" onClick={() => addToCart(line.productId, line.quantity)}>{t('orders.repeatItem')}</button>
                                    ))}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}
