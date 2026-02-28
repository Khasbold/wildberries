import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { products } from '../data/products.js'
import { useCart } from '../state/useCart.js'
import { useAuth } from '../state/useAuth.js'
import { useOrders } from '../state/useOrders.js'
import { validateDiscountCode, useDiscountCode } from '../state/store.js'
import { useI18n } from '../i18n/useI18n.js'

export default function CheckoutPage() {
    const { t } = useI18n()
    const navigate = useNavigate()
    const { items, clearCart } = useCart()
    const { user, isAuthenticated, signIn, updateProfile } = useAuth()
    const { createOrder } = useOrders()
    const [step, setStep] = useState(0)
    const [promo, setPromo] = useState('')
    const [appliedDiscount, setAppliedDiscount] = useState(null)
    const [promoError, setPromoError] = useState('')
    const [form, setForm] = useState({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        city: 'Москва',
        address: '',
        comment: '',
        deliveryMethod: 'standard',
        paymentMethod: 'card',
    })

    const detailed = useMemo(() => items
        .map((i) => ({ ...i, product: products.find((p) => p.id === i.productId) }))
        .filter((i) => i.product), [items])

    const subtotal = detailed.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    const baseDelivery = form.deliveryMethod === 'express' ? 9 : subtotal > 80 ? 0 : 5
    const storeSubtotal = appliedDiscount
        ? detailed.filter((i) => i.product.storeId === appliedDiscount.storeId).reduce((sum, i) => sum + i.product.price * i.quantity, 0)
        : 0
    const discount = appliedDiscount ? Math.min(appliedDiscount.discountValue, storeSubtotal) : 0
    const delivery = baseDelivery
    const total = subtotal + delivery - discount

    function handleApplyPromo() {
        const code = promo.trim()
        if (!code) return
        const disc = validateDiscountCode(code)
        if (!disc) {
            setAppliedDiscount(null)
            setPromoError('Invalid or expired promo code')
            return
        }
        const storeItems = detailed.filter((i) => i.product.storeId === disc.storeId)
        if (storeItems.length === 0) {
            setAppliedDiscount(null)
            setPromoError('No items from this store in your cart')
            return
        }
        setAppliedDiscount(disc)
        setPromoError('')
    }

    function formatCurrencyRub(n) {
        try {
            return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
        } catch {
            return `${Math.round(n)} ₽`
        }
    }

    function nextStep() {
        if (step === 0) {
            if (!form.name || !form.phone || !form.email) return
            if (!isAuthenticated) signIn({ name: form.name, phone: form.phone, email: form.email })
            else updateProfile({ name: form.name, phone: form.phone, email: form.email })
        }
        if (step === 1 && (!form.city || !form.address)) return
        setStep((s) => Math.min(3, s + 1))
    }

    function prevStep() {
        setStep((s) => Math.max(0, s - 1))
    }

    function placeOrder() {
        if (detailed.length === 0) return
        if (appliedDiscount) {
            useDiscountCode(appliedDiscount.id)
        }
        /* Collect unique storeIds from all items in the order */
        const orderStoreIds = [...new Set(detailed.map((i) => i.product.storeId).filter(Boolean))]
        createOrder({
            items: detailed.map((i) => ({ productId: i.productId, quantity: i.quantity, storeId: i.product.storeId })),
            storeId: orderStoreIds[0] || null,
            storeIds: orderStoreIds,
            subtotal,
            discount,
            delivery,
            total,
            discountCode: appliedDiscount ? appliedDiscount.code : null,
            discountStoreId: appliedDiscount ? appliedDiscount.storeId : null,
            customer: {
                name: form.name,
                phone: form.phone,
                email: form.email,
            },
            deliveryInfo: {
                city: form.city,
                address: form.address,
                comment: form.comment,
            },
            paymentMethod: form.paymentMethod,
        })
        clearCart()
        navigate('/orders')
    }

    if (detailed.length === 0) {
        return (
            <div className="container-app py-8">
                <div className="card-surface p-6">
                    <p className="mb-3">{t('checkout.empty')}</p>
                    <Link to="/catalog" className="btn-primary inline-block">{t('cart.toCatalog')}</Link>
                </div>
            </div>
        )
    }

    const flowTabs = [
        t('checkout.tabCart'),
        t('checkout.tabBilling'),
        t('checkout.tabPayment'),
    ]

    return (
        <div className="container-app py-8">
            <h1 className="text-2xl font-semibold mb-5">{t('checkout.title')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                <section className="space-y-4">
                    <div className="card-surface p-4">
                        <div className="grid grid-cols-3 gap-2">
                            {flowTabs.map((label, idx) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => idx === 0 ? navigate('/cart') : setStep(idx)}
                                    className={`rounded-xl px-3 py-2 text-sm font-medium ${idx === step + 1 ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="card-surface p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">{t('checkout.sectionContact')}</h2>
                            <span className="text-xs badge">{step === 0 ? t('checkout.active') : t('checkout.completed')}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{isAuthenticated ? t('checkout.contactsHintAuth') : t('checkout.contactsHintGuest')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('checkout.name')} className="border border-slate-200 rounded-xl px-3 py-2" />
                            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t('checkout.phone')} className="border border-slate-200 rounded-xl px-3 py-2" />
                            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="border border-slate-200 rounded-xl px-3 py-2 md:col-span-2" />
                        </div>
                    </div>

                    <div className="card-surface p-5">
                        <h2 className="text-lg font-semibold mb-4">{t('checkout.sectionDelivery')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <label className={`border rounded-xl p-3 cursor-pointer ${form.deliveryMethod === 'standard' ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <input type="radio" checked={form.deliveryMethod === 'standard'} onChange={() => setForm((f) => ({ ...f, deliveryMethod: 'standard' }))} />
                                    <span className="font-medium">{t('checkout.deliveryStandard')}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{t('checkout.deliveryStandardEta')}</p>
                            </label>
                            <label className={`border rounded-xl p-3 cursor-pointer ${form.deliveryMethod === 'express' ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <input type="radio" checked={form.deliveryMethod === 'express'} onChange={() => setForm((f) => ({ ...f, deliveryMethod: 'express' }))} />
                                    <span className="font-medium">{t('checkout.deliveryExpress')}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{t('checkout.deliveryExpressEta')}</p>
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="border border-slate-200 rounded-xl px-3 py-2">
                                <option>Москва</option>
                                <option>Санкт-Петербург</option>
                                <option>Казань</option>
                                <option>Екатеринбург</option>
                            </select>
                            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder={t('checkout.address')} className="border border-slate-200 rounded-xl px-3 py-2" />
                            <textarea value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} placeholder={t('checkout.comment')} className="border border-slate-200 rounded-xl px-3 py-2 min-h-24 md:col-span-2" />
                        </div>
                    </div>

                    <div className="card-surface p-5">
                        <h2 className="text-lg font-semibold mb-4">{t('checkout.sectionPayment')}</h2>
                        <div className="space-y-3">
                            <label className={`border rounded-xl p-3 cursor-pointer flex items-center justify-between ${form.paymentMethod === 'card' ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                                <span>{t('checkout.paymentCard')}</span>
                                <input type="radio" checked={form.paymentMethod === 'card'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'card' }))} />
                            </label>
                            <label className={`border rounded-xl p-3 cursor-pointer flex items-center justify-between ${form.paymentMethod === 'sbp' ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                                <span>{t('checkout.paymentSbp')}</span>
                                <input type="radio" checked={form.paymentMethod === 'sbp'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'sbp' }))} />
                            </label>
                            <label className={`border rounded-xl p-3 cursor-pointer flex items-center justify-between ${form.paymentMethod === 'cash' ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                                <span>{t('checkout.paymentCash')}</span>
                                <input type="radio" checked={form.paymentMethod === 'cash'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'cash' }))} />
                            </label>
                        </div>
                    </div>

                    <div className="card-surface p-5">
                        <h2 className="text-lg font-semibold mb-3">{t('checkout.sectionReview')}</h2>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-slate-500">{t('checkout.recipient')}</span> {form.name}, {form.phone}</p>
                            <p><span className="text-slate-500">Email:</span> {form.email}</p>
                            <p><span className="text-slate-500">{t('checkout.delivery')}:</span> {form.city}, {form.address}</p>
                            <p><span className="text-slate-500">{t('checkout.payment')}</span> {form.paymentMethod}</p>
                        </div>
                        <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <button className="btn-outline w-full sm:w-auto" onClick={prevStep}>{t('common.back')}</button>
                            <button className="btn-primary w-full sm:w-auto" onClick={placeOrder}>{t('common.confirmOrder')}</button>
                        </div>
                    </div>
                </section>

                <aside className="card-surface p-5 h-max lg:sticky lg:top-32">
                    <p className="font-semibold mb-3">{t('checkout.yourOrder')}</p>
                    <div className="space-y-3 max-h-64 overflow-auto pr-1">
                        {detailed.map((i) => (
                            <div key={i.productId} className="flex items-center gap-3">
                                <img src={i.product.thumbnail} alt={i.product.title} className="w-12 h-12 rounded-lg object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{i.product.title}</p>
                                    <p className="text-xs text-slate-500">x{i.quantity}</p>
                                </div>
                                <span className="text-sm font-medium">{formatCurrencyRub(i.product.price * i.quantity)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 border rounded-xl border-slate-200 p-3">
                        <p className="text-sm font-medium mb-2">{t('cart.promo')}</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                value={promo}
                                onChange={(e) => { setPromo(e.target.value); setPromoError(''); setAppliedDiscount(null) }}
                                placeholder={t('cart.promoPlaceholder')}
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
                            />
                            <button className="btn-outline w-full sm:w-auto" onClick={handleApplyPromo}>{t('common.apply')}</button>
                        </div>
                        {promoError && <p className="text-xs text-red-500 mt-2">{promoError}</p>}
                        {appliedDiscount && (
                            <p className="text-xs text-emerald-600 mt-2">
                                ✓ Code <span className="font-mono font-semibold">{appliedDiscount.code}</span> applied — {appliedDiscount.discountValue} ₽ off
                            </p>
                        )}
                    </div>

                    <div className="border-t mt-4 pt-3 text-sm space-y-2">
                        <div className="flex justify-between"><span>{t('checkout.items')}</span><span>{formatCurrencyRub(subtotal)}</span></div>
                        <div className="flex justify-between"><span>{t('cart.discount')}</span><span className="text-emerald-600">-{formatCurrencyRub(discount)}</span></div>
                        <div className="flex justify-between"><span>{t('checkout.delivery')}</span><span>{delivery ? formatCurrencyRub(delivery) : t('common.free')}</span></div>
                        <div className="flex justify-between font-semibold text-base"><span>{t('checkout.total')}</span><span>{formatCurrencyRub(total)}</span></div>
                        <p className="text-xs text-slate-500">{t('checkout.vatNote')}</p>
                    </div>

                    <button className="btn-primary w-full mt-4" onClick={placeOrder}>{t('common.confirmOrder')}</button>
                </aside>
            </div>
        </div>
    )
}
