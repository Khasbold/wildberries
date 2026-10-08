import { useMemo, useState, useSyncExternalStore } from 'react'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { Link } from 'react-router-dom'
import { useCart } from '../state/useCart.js'
import { validateDiscountCode, subscribe, getState } from '../state/store.js'
import { useI18n } from '../i18n/useI18n.js'
import { ShoppingBag, Trash2, Tag } from 'lucide-react'
import SEO from '../layout/components/SEO.jsx'

function findProduct(id, adminProducts) {
	return adminProducts.find((p) => p.id === id) || null
}

export default function CartPage() {
	const { t } = useI18n()
	const state = useSyncExternalStore(subscribe, getState)
	const adminProducts = state.adminProducts || []
	const { items, updateCartQuantity, removeFromCart, clearCart } = useCart()
	const [promo, setPromo] = useState('')
	const [appliedDiscount, setAppliedDiscount] = useState(null)
	const [promoError, setPromoError] = useState('')
	const detailed = items.map((i) => ({
		...i,
		product: findProduct(i.productId, adminProducts),
	})).filter((i) => i.product)

	const subtotal = detailed.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
	const storeSubtotal = appliedDiscount
		? detailed.filter((i) => i.product.storeId === appliedDiscount.storeId).reduce((sum, i) => sum + i.product.price * i.quantity, 0)
		: 0
	const discount = appliedDiscount ? Math.min(appliedDiscount.discountValue, storeSubtotal) : 0
	const total = Math.max(0, subtotal - discount)

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

	return (
		<div className="min-h-[60vh] bg-gradient-to-b from-[#F7E9D7]/25 to-white">
			<SEO title={t('cart.title')} />
			<div className="container-app py-6 sm:py-10 animate-fade-in-up">
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[--brand-primary]/15 to-[--bg-beige] flex items-center justify-center shadow-soft">
							<ShoppingBag className="w-6 h-6 text-[--brand-primary]" />
						</div>
						<div>
							<h1 className="section-title text-2xl sm:text-3xl text-slate-900">{t('cart.title')}</h1>
							<p className="text-sm text-slate-500">{t('cart.tagline') || 'Review items before checkout'}</p>
						</div>
					</div>
					{detailed.length > 0 && (
						<button
							type="button"
							className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-medium transition-all duration-200 active:scale-[0.97] focus-ring"
							onClick={() => { clearCart(); setAppliedDiscount(null) }}
						>
							<Trash2 className="w-4 h-4" />
							{t('cart.clear')}
						</button>
					)}
				</div>

				{detailed.length === 0 ? (
					<div className="card-static rounded-3xl p-12 text-center max-w-lg mx-auto animate-scale-in">
						<div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[--bg-beige] flex items-center justify-center animate-float shadow-soft">
							<ShoppingBag className="w-9 h-9 text-[--brand-primary]" />
						</div>
						<p className="text-slate-600 text-lg mb-6">{t('cart.empty')}</p>
						<Link to="/catalog" className="btn-primary inline-flex items-center justify-center px-8 active:scale-[0.97]">{t('cart.toCatalog')}</Link>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
						<div className="lg:col-span-2 space-y-3">
							{detailed.map((i) => (
								<div key={i.productId} className="card-static rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-card-hover transition-shadow duration-300">
									<div className="img-zoom rounded-xl shrink-0 overflow-hidden border border-slate-100 shadow-soft">
										<img src={i.product.thumbnail} alt={i.product.title} className="w-28 h-28 object-cover" loading="lazy" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-semibold text-slate-900">{i.product.title}</p>
										<p className="text-[--brand-primary] font-bold mt-1 text-lg">{formatCurrency(i.product.price)}</p>
										{(i.size || i.color) && (
											<div className="flex items-center gap-2 mt-1.5">
												{i.color && (
													<span className="inline-flex items-center gap-1 text-xs text-slate-500">
														<span className="w-4 h-4 rounded-full border-2 border-white ring-1 ring-slate-200 shadow-soft" style={{ backgroundColor: i.color }} />
													</span>
												)}
												{i.size && (
													<span className="badge">{i.size}</span>
												)}
											</div>
										)}
									</div>
									<div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
										<div className="flex items-center gap-0.5 border border-slate-200 rounded-full p-1 bg-white shadow-soft">
											<button type="button" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 font-bold hover:bg-[--bg-beige] hover:text-[--brand-primary] active:scale-[0.9] transition-all duration-200" onClick={() => updateCartQuantity(i.productId, Math.max(0, i.quantity - 1))}>−</button>
											<span className="w-9 text-center font-bold text-slate-900">{i.quantity}</span>
											<button type="button" className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 font-bold hover:bg-[--bg-beige] hover:text-[--brand-primary] active:scale-[0.9] transition-all duration-200" onClick={() => updateCartQuantity(i.productId, i.quantity + 1)}>+</button>
										</div>
										<button type="button" className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 font-medium px-2.5 py-1.5 rounded-full hover:bg-rose-50 active:scale-[0.97] transition-all duration-200" onClick={() => removeFromCart(i.productId)}>
											<Trash2 className="w-4 h-4" />
											{t('common.remove')}
										</button>
									</div>
								</div>
							))}

						</div>

						<div className="card-static rounded-2xl p-6 h-max lg:sticky lg:top-28 shadow-card-elevated border-[--brand-primary]/15">
							<p className="section-title text-lg text-slate-900 mb-5">{t('cart.summary')}</p>
							<div className="space-y-3 text-sm mb-6">
								<div className="flex justify-between text-slate-600">
									<span>{t('cart.items', { count: itemCount })}</span>
									<span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
								</div>
								<div className="divider-soft" />
								<div className="flex justify-between text-slate-600">
									<span>{t('cart.discount')}</span>
									<span className="text-[--brand-secondary] font-medium">−{formatCurrency(discount)}</span>
								</div>
								<div className="divider-soft" />
								<div className="pt-2 flex justify-between text-lg font-bold text-slate-900">
									<span>{t('cart.toPay')}</span>
									<span className="text-gradient-brand text-xl">{formatCurrency(total)}</span>
								</div>
							</div>
							<Link to="/checkout" className="btn-primary block w-full text-center py-3.5 active:scale-[0.97]">{t('common.checkout')}</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
