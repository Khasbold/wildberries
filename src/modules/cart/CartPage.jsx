import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../state/useCart.js'
import { products } from '../data/products.js'
import { validateDiscountCode, useDiscountCode } from '../state/store.js'
import { useI18n } from '../i18n/useI18n.js'

export default function CartPage() {
	const { t } = useI18n()
	const { items, updateCartQuantity, removeFromCart, clearCart } = useCart()
	const [promo, setPromo] = useState('')
	const [appliedDiscount, setAppliedDiscount] = useState(null)
	const [promoError, setPromoError] = useState('')
	const detailed = items.map((i) => ({
		...i,
		product: products.find((p) => p.id === i.productId),
	})).filter((i) => i.product)

	const subtotal = detailed.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
	const storeSubtotal = appliedDiscount
		? detailed.filter((i) => i.product.storeId === appliedDiscount.storeId).reduce((sum, i) => sum + i.product.price * i.quantity, 0)
		: 0
	const discount = appliedDiscount ? Math.min(appliedDiscount.discountValue, storeSubtotal) : 0
	const delivery = subtotal > 80 ? 0 : 5
	const total = Math.max(0, subtotal - discount + delivery)

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

	const itemCount = useMemo(() => detailed.reduce((sum, item) => sum + item.quantity, 0), [detailed])

	function formatCurrencyRub(n) {
		try {
			return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
		} catch {
			return `${Math.round(n)} ₽`
		}
	}

	return (
		<div className="container-app py-4 sm:py-8">
			<h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">{t('cart.title')}</h1>
			{detailed.length === 0 ? (
				<div className="card-surface p-6">
					<p>{t('cart.empty')} <Link className="text-brand hover:underline" to="/catalog">{t('cart.toCatalog')}</Link></p>
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
					<div className="lg:col-span-2 space-y-3 sm:space-y-4">
						{detailed.map((i) => (
							<div key={i.productId} className="card-surface p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
								<img src={i.product.thumbnail} alt={i.product.title} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm sm:text-base truncate">{i.product.title}</p>
									<p className="text-sm text-gray-500">{formatCurrencyRub(i.product.price)}</p>
									<p className="text-xs text-gray-500">{i.product.fastDelivery ? t('common.deliveryTomorrow') : t('cart.shippingSlow')}</p>
								</div>
								<div className="flex items-center gap-1.5 sm:gap-2 self-stretch sm:self-auto flex-wrap">
									<button className="btn-outline" onClick={() => updateCartQuantity(i.productId, Math.max(0, i.quantity - 1))}>−</button>
									<span className="w-8 text-center">{i.quantity}</span>
									<button className="btn-outline" onClick={() => updateCartQuantity(i.productId, i.quantity + 1)}>+</button>
									<button className="btn-outline" onClick={() => removeFromCart(i.productId)}>{t('common.remove')}</button>
								</div>
							</div>
						))}
						<div className="card-surface p-4 flex items-center justify-between">
							<div className="flex-1">
								<p className="font-medium mb-2">{t('cart.promo')}</p>
								<div className="flex gap-2">
									<input
										value={promo}
										onChange={(e) => { setPromo(e.target.value); setPromoError(''); setAppliedDiscount(null) }}
										placeholder={t('cart.promoPlaceholder')}
										className="flex-1 border border-slate-200 rounded-xl px-3 py-2 font-mono uppercase"
									/>
									<button className="btn-primary" onClick={handleApplyPromo}>{t('common.apply')}</button>
								</div>
								{promoError && <p className="text-xs text-red-500 mt-2">{promoError}</p>}
								{appliedDiscount && (
									<p className="text-xs text-emerald-600 mt-2">
										✓ Code <span className="font-mono font-semibold">{appliedDiscount.code}</span> applied — {appliedDiscount.discountValue} ₽ off
									</p>
								)}
							</div>
						</div>
					</div>
					<div className="card-surface p-4 sm:p-6 h-max lg:sticky lg:top-40">
						<p className="text-lg font-semibold mb-3">{t('cart.summary')}</p>
						<div className="space-y-2 text-sm text-gray-600 mb-4">
							<div className="flex justify-between">
								<span>{t('cart.items', { count: itemCount })}</span>
								<span>{formatCurrencyRub(subtotal)}</span>
							</div>
							<div className="flex justify-between">
								<span>{t('cart.discount')}</span>
								<span className="text-emerald-600">−{formatCurrencyRub(discount)}</span>
							</div>
							<div className="flex justify-between">
								<span>{t('cart.delivery')}</span>
								<span>{delivery === 0 ? t('common.free') : formatCurrencyRub(delivery)}</span>
							</div>
							<div className="border-t pt-2 mt-2 flex justify-between text-base text-slate-900 font-semibold">
								<span>{t('cart.toPay')}</span>
								<span>{formatCurrencyRub(total)}</span>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Link to="/checkout" className="btn-primary flex-1 text-center">{t('common.checkout')}</Link>
						</div>
					</div>
				</div>
			)}
		</div>
	)
} 