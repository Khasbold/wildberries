import { Link } from 'react-router-dom'
import { useCart } from '../../state/useCart.js'
import { useWishlist } from '../../state/useWishlist.js'
import { useI18n } from '../../i18n/useI18n.js'

function formatCurrencyRub(n) {
	try {
		return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
	} catch {
		return `${Math.round(n)} ₽`
	}
}

function IconHeartFilled(props) {
	return (
		<svg width="13" height="13" viewBox="0 0 22 22" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M12 21s-7.5-4.6-9.5-8.5C0.8 8.6 3.2 5 6.8 5c2 0 3.2 1.1 3.9 2.1.7-1 1.9-2.1 3.9-2.1 3.6 0 6 3.6 4.3 7.5C19.5 16.4 12 21 12 21z"/>
		</svg>
	)
}

function IconStar(props) {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M12 17.3l-6.2 3.7 1.7-7.1L2 9.2l7.3-.6L12 2l2.7 6.6 7.3.6-5.5 4.7 1.7 7.1z"/>
		</svg>
	)
}

function IconCheck(props) {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<circle cx="12" cy="12" r="10" fill="#3B82F6"/>
			<path d="M7.5 12.5l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
		</svg>
	)
}

function IconCart(props) {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M4 5h2l2 12h10l2-8H8" stroke="currentColor" strokeWidth="1.8"/>
			<circle cx="10" cy="20" r="1.5" fill="currentColor"/>
			<circle cx="18" cy="20" r="1.5" fill="currentColor"/>
		</svg>
	)
}

function pseudoReviews(productId) {
	let hash = 0
	for (let i = 0; i < productId.length; i++) hash = (hash * 31 + productId.charCodeAt(i)) >>> 0
	return 8000 + (hash % 90000)
}

export default function ProductCard({ product }) {
	const { t } = useI18n()
	const { addToCart } = useCart()
	const { isInWishlist, toggleWishlist } = useWishlist()
	const wished = isInWishlist(product.id)
	const oldPrice = Math.round(product.price * 3.55)
	const discount = Math.max(0, Math.round((1 - product.price / oldPrice) * 100))
	const reviews = pseudoReviews(product.id)

	return (
		<div className="flex flex-col">
			<div className="relative group rounded-2xl border bg-white shadow-sm overflow-hidden">
				<Link to={`/product/${product.id}`} className="block">
					<div className="w-full aspect-square overflow-hidden">
						<img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
					</div>
				</Link>
				{product.fastDelivery && <span className="absolute left-2 top-2 badge bg-emerald-100 text-emerald-700">{t('catalog.tomorrowTag')}</span>}
				<button
					onClick={() => toggleWishlist(product.id)}
					className={`absolute top-3 right-3 rounded-full w-6 h-6 flex items-center justify-center ${wished ? 'bg-brand text-white' : 'bg-white text-gray-900'} shadow ring-1 ring-white/80`}
					aria-label="wishlist"
				>
					{wished ? <IconHeartFilled /> : '♡'}
				</button>
				{/* Small promo pills at bottom-left */}
				<div className="absolute left-1.5 sm:left-2 bottom-1.5 sm:bottom-2 flex flex-col gap-0.5 sm:gap-1 leading-none">
					<span className="inline-flex w-max px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] sm:text-[11px] font-bold">-{discount}%</span>
					<span className="hidden xs:inline-flex w-max px-1.5 sm:px-2 py-0.5 rounded-full bg-pink-500 text-white text-[9px] sm:text-[11px] font-bold">-9% с клубом</span>
					<span className="hidden sm:inline-flex w-max px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-600 text-white text-[9px] sm:text-[11px] font-bold">₽ 60 за отзыв</span>
					<span className="hidden sm:inline-flex w-max px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] sm:text-[11px] font-semibold">СКИДКИ ПОСПЕЛИ</span>
				</div>
				{/* Quick view pill on hover */}
				<Link to={`/product/${product.id}`} className="absolute left-1/2 -translate-x-1/2 bottom-3 md:bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
					<span className="bg-white/90 text-gray-900 text-sm rounded-full px-4 py-2 shadow">{t('productCard.quickView')}</span>
				</Link>
			</div>

			<div className="p-2 sm:p-3 flex-1 flex flex-col gap-1 sm:gap-1.5">
				<Link to={`/product/${product.id}`} className="font-medium line-clamp-2 hover:underline leading-tight text-[12px] sm:text-[14px]">{product.title}</Link>
				<div className="flex items-end gap-1.5 sm:gap-2 mt-0.5">
					<p className="text-rose-600 text-[17px] sm:text-[22px] font-extrabold leading-none">{formatCurrencyRub(product.price)}</p>
					<p className="text-[10px] sm:text-xs text-gray-500 line-through leading-none">{formatCurrencyRub(oldPrice)}</p>
				</div>
				<p className="text-[11px] text-rose-600/80 leading-none">{t('productCard.withWallet')}</p>
				<div className="text-[12px] text-gray-800 flex items-center gap-1 leading-tight">
					<span className="flex items-center gap-1"><IconCheck /><span className="font-medium">{product.brand}</span></span>
				</div>
				<div className="text-[12px] text-gray-700 flex items-center gap-1 leading-tight">
					<span className="flex items-center gap-1 text-amber-500"><IconStar /> {product.rating.toFixed(1)}</span>
					<span className="text-gray-400">•</span>
					<span className="text-gray-500">{t('productCard.reviews', { count: new Intl.NumberFormat('ru-RU').format(reviews) })}</span>
				</div>
				<div className="mt-auto pt-1">
					<button disabled={!product.inStock} className="w-full rounded-full bg-brand text-white hover:bg-brand-dark py-1.5 sm:py-2 text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-60 disabled:cursor-not-allowed" onClick={() => addToCart(product.id, 1)}>
						<IconCart className="text-white" />
						{product.inStock ? (product.fastDelivery ? t('productCard.tomorrow') : t('productCard.dayAfterTomorrow')) : t('common.outOfStock')}
					</button>
				</div>
			</div>
		</div>
	)
} 