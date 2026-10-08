import { Link } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { useCart } from '../../state/useCart.js'
import { useWishlist } from '../../state/useWishlist.js'
import { useI18n } from '../../i18n/useI18n.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { getResponsiveImageProps } from '../../../utils/responsiveImageProps.js'
import { useStores } from '../../state/useStores.js'
import { Heart, Star, ShoppingBag, Check, Clock } from 'lucide-react'

function generateSlug(name) {
	const slug = name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9а-яөүё-]/gi, '')
		.replace(/-+/g, '-')
		.trim()
	return slug || null
}

export default function ProductCard({ product }) {
	const { t } = useI18n()
	const { addToCart } = useCart()
	const { isInWishlist, toggleWishlist } = useWishlist()
	const { getStoreById } = useStores()
	const wished = isInWishlist(product.id)
	const oldPrice = product.originalPrice && product.originalPrice > product.price ? Math.round(product.originalPrice) : 0
	const discount = oldPrice > 0 ? Math.max(0, Math.round((1 - product.price / oldPrice) * 100)) : 0
	const reviews = product.rating ? product.rating : 0
	const isReady = product.productType !== 'order'
	const storeSlug = useMemo(() => {
		if (!product.storeId) return null
		const store = getStoreById(product.storeId)
		return store?.slug || generateSlug(product.storeId) || product.storeId
	}, [product.storeId, getStoreById])
	const productLink = storeSlug ? `/${storeSlug}/product/${product.id}` : `/product/${product.id}`
	const gallery = useMemo(() => {
		const list = Array.isArray(product.images) ? product.images.filter(Boolean) : []
		if (list.length > 0) return list
		return [product.thumbnail || product.image].filter(Boolean)
	}, [product.images, product.thumbnail, product.image])
	const [previewImg, setPreviewImg] = useState(gallery[0] || product.thumbnail || '')
	useEffect(() => {
		setPreviewImg(gallery[0] || product.thumbnail || '')
	}, [gallery, product.thumbnail])
	const imgProps = getResponsiveImageProps(previewImg || '')
	const orderDays = product.orderDays || 7
	const lowStock = product.inStock && (product.stockQuantity ?? 10) > 0 && (product.stockQuantity ?? 10) <= 5

	return (
		<div className="group flex flex-col h-full rounded-2xl bg-white dark:bg-slate-800 border border-[#D66B3E]/10 dark:border-slate-700 shadow-card hover:shadow-card-hover hover:border-[#4B7F4D]/30 motion-safe:hover:-translate-y-1 transition-all duration-300 ease-spring motion-reduce:transition-none overflow-hidden">
			<div className="relative overflow-hidden">
				<Link to={productLink} className="block">
					<div className="w-full aspect-square overflow-hidden bg-slate-50 dark:bg-slate-900">
						<img
							src={previewImg || product.thumbnail}
							alt={product.title}
							loading="lazy"
							decoding="async"
							{...imgProps}
							className="w-full h-full object-cover motion-safe:group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-spring"
						/>
					</div>
				</Link>
				{gallery.length > 1 && (
					<div className="absolute bottom-0 left-0 right-0 z-20 bg-white/85 backdrop-blur-sm border-t border-slate-200/70 p-1.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
						{gallery.slice(0, 5).map((img, idx) => (
							<button
								key={`${product.id}-thumb-${idx}`}
								type="button"
								onMouseEnter={() => setPreviewImg(img)}
								onFocus={() => setPreviewImg(img)}
								className={`w-10 h-10 rounded-md overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${previewImg === img ? 'border-[#D66B3E]' : 'border-transparent hover:border-[#D66B3E]/40'}`}
								aria-label={`Preview ${idx + 1}`}
							>
								<img src={img} alt="" className="w-full h-full object-cover" />
							</button>
						))}
					</div>
				)}
				<button
					type="button"
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.id) }}
					className={`absolute top-2.5 right-2.5 z-20 rounded-full w-9 h-9 flex items-center justify-center shadow-soft transition-all duration-200 ease-spring hover:scale-110 active:scale-95 ${
						wished ? 'bg-[#4B7F4D] text-white shadow-brand-sm' : 'bg-white/90 text-slate-600 hover:bg-[#F7E9D7] hover:text-[#D66B3E] backdrop-blur-sm'
					}`}
					aria-label={t('a11y.wishlist')}
				>
					<Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} aria-hidden />
				</button>
				{discount > 0 && (
					<span className="absolute left-2.5 bottom-2.5 z-20 inline-flex px-2.5 py-1 rounded-full bg-gradient-to-r from-[#D66B3E] to-[#c45d35] text-white text-xs font-extrabold shadow-brand-sm">
						-{discount}%
					</span>
				)}
				<span
					className={`absolute top-2.5 left-2.5 z-20 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shadow-soft backdrop-blur-sm max-w-[min(100%,11rem)] ${isReady ? 'bg-[#4B7F4D]/90 text-white' : 'bg-[#D66B3E]/90 text-white'}`}
					title={isReady ? t('productCard.badgeReady') : t('productCard.badgeOrderDays', { days: orderDays })}
				>
					{isReady ? <Check className="w-3 h-3 shrink-0" aria-hidden /> : <Clock className="w-3 h-3 shrink-0" aria-hidden />}
					<span className="truncate">{isReady ? t('productCard.badgeReady') : t('productCard.badgeOrderDays', { days: orderDays })}</span>
				</span>
				{lowStock && (
					<span className="absolute left-2.5 bottom-12 z-20 inline-flex items-center px-2 py-0.5 rounded-full bg-white/95 text-[#D66B3E] text-[10px] font-semibold border border-[#D66B3E]/30 shadow-soft">
						<span className="sr-only">{t('productCard.onlyLeft', { count: product.stockQuantity })}</span>
						<span aria-hidden>{t('productCard.lowStockShort')}</span>
					</span>
				)}
				<Link to={productLink} className="hidden sm:flex absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity items-end justify-center pb-3 pointer-events-none group-hover:pointer-events-auto">
					<span className="glass text-slate-900 text-sm font-semibold rounded-full px-4 py-2 shadow-card-elevated translate-y-1 group-hover:translate-y-0 transition-transform duration-300 ease-spring">{t('productCard.quickView')}</span>
				</Link>
			</div>

			<div className="p-3 sm:p-4 flex-1 flex flex-col gap-2">
				<Link to={productLink} className="font-medium line-clamp-2 hover:text-brand transition-colors duration-200 leading-snug text-sm text-slate-900 dark:text-slate-100">
					{product.title}
				</Link>
				<div className="flex items-baseline gap-2 mt-0.5">
					<p className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{formatCurrency(product.price)}</p>
					{oldPrice > 0 && <p className="text-xs text-slate-400 line-through">{formatCurrency(oldPrice)}</p>}
				</div>
				<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
					<span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
						<Check className="w-3.5 h-3.5 text-[#4B7F4D]" />
						{product.brand}
					</span>
					<span className="flex items-center gap-1">
						<Star className="w-3.5 h-3.5 fill-[#D66B3E] text-[#D66B3E]" />
						{(product.rating || 0).toFixed(1)}
					</span>
					<span>{t('productCard.reviews', { count: new Intl.NumberFormat('mn-MN').format(reviews) })}</span>
				</div>
				<button
					disabled={!product.inStock}
					className="mt-auto w-full rounded-xl bg-gradient-to-r from-[#D66B3E] to-[#c45d35] text-white hover:brightness-105 hover:shadow-brand-md active:scale-[0.97] py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-spring shadow-brand-sm touch-manipulation focus-ring"
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product.id, 1) }}
				>
					<ShoppingBag className="w-4 h-4" />
					{product.inStock ? t('productCard.addToCart') : t('common.outOfStock')}
				</button>
			</div>
		</div>
	)
} 