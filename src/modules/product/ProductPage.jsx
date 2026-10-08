import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useCart } from '../state/useCart.js'
import { useWishlist } from '../state/useWishlist.js'
import { trackProductView, getProductViews, subscribe, getState } from '../state/store.js'
import { FaHeart, FaRegHeart, FaShareAlt, FaChevronDown, FaStar, FaCheck, FaMinus, FaPlus } from 'react-icons/fa'
import { useI18n } from '../i18n/useI18n.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { copyTextToClipboard } from '../../utils/copyToClipboard.js'
import { addRecentlyViewed, getRecentlyViewed } from '../../utils/recentlyViewed.js'
import { trackEvent } from '../../utils/analytics.js'
import { usePrefersReducedMotion } from '../../utils/usePrefersReducedMotion.js'
import { useStores } from '../state/useStores.js'
import { useSession } from '../state/useSession.js'
import SEO from '../layout/components/SEO.jsx'
import ProductCard from '../catalog/components/ProductCard.jsx'

/* ─── Lightbox (fullscreen zoom + slide) ─── */
function Lightbox({ gallery, startIndex, onClose }) {
	const [idx, setIdx] = useState(startIndex)
	const [zoom, setZoom] = useState(false)
	const [origin, setOrigin] = useState({ x: 50, y: 50 })
	const containerRef = useRef(null)
	const reduceMotion = usePrefersReducedMotion()

	useEffect(() => {
		const onKey = (e) => {
			if (e.key === 'Escape') onClose()
			if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % gallery.length)
			if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + gallery.length) % gallery.length)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [gallery.length, onClose])

	function handleImageClick(e) {
		if (reduceMotion) return
		if (zoom) {
			setZoom(false)
			return
		}
		const rect = e.currentTarget.getBoundingClientRect()
		const x = ((e.clientX - rect.left) / rect.width) * 100
		const y = ((e.clientY - rect.top) / rect.height) * 100
		setOrigin({ x, y })
		setZoom(true)
	}

	function handleMouseMove(e) {
		if (!zoom) return
		const rect = e.currentTarget.getBoundingClientRect()
		const x = ((e.clientX - rect.left) / rect.width) * 100
		const y = ((e.clientY - rect.top) / rect.height) * 100
		setOrigin({ x, y })
	}

	const media = gallery[idx]

	return (
		<div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
			<div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
				{/* Close */}
				<button onClick={onClose} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors">
					✕
				</button>

				{/* Counter */}
				<span className="absolute top-4 left-4 z-20 bg-black/50 text-white text-sm font-medium px-3 py-1 rounded-full">
					{idx + 1} / {gallery.length}
				</span>

				{/* Prev */}
				{gallery.length > 1 && (
					<button
						onClick={() => { setZoom(false); setIdx((i) => (i - 1 + gallery.length) % gallery.length) }}
						className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-2xl transition-colors"
					>
						‹
					</button>
				)}

				{/* Next */}
				{gallery.length > 1 && (
					<button
						onClick={() => { setZoom(false); setIdx((i) => (i + 1) % gallery.length) }}
						className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-2xl transition-colors"
					>
						›
					</button>
				)}

				{/* Image / Video */}
				<div
					ref={containerRef}
					className="w-full h-full flex items-center justify-center overflow-hidden"
					onMouseMove={handleMouseMove}
				>
					{media.type === 'video' ? (
						<video src={media.src} className="max-w-full max-h-full object-contain" controls autoPlay muted loop playsInline />
					) : (
						<img
							src={media.src}
							alt=""
							onClick={handleImageClick}
							className={`select-none ${reduceMotion ? '' : 'transition-transform duration-300 ease-out'}`}
							style={{
								maxWidth: '100%',
								maxHeight: '100%',
								objectFit: 'contain',
								cursor: reduceMotion ? 'default' : zoom ? 'zoom-out' : 'zoom-in',
								transform: reduceMotion ? 'scale(1)' : zoom ? 'scale(2.5)' : 'scale(1)',
								transformOrigin: `${origin.x}% ${origin.y}%`,
							}}
							draggable={false}
						/>
					)}
				</div>

				{/* Thumbnail strip */}
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/40 rounded-xl p-2 backdrop-blur-sm max-w-[90vw] overflow-x-auto">
					{gallery.map((m, i) => (
						<button
							key={i}
							onClick={() => { setZoom(false); setIdx(i) }}
							className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
								i === idx ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
							}`}
						>
							<img src={m.thumb} alt="" className="w-full h-full object-cover" />
							{m.type === 'video' && (
								<span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-[10px]">▶</span>
							)}
						</button>
					))}
				</div>
			</div>
		</div>
	)
}

/* ─── Main Gallery (inline) ─── */
function ProductGallery({ gallery, productTitle }) {
	const [activeIdx, setActiveIdx] = useState(0)
	const [lightboxOpen, setLightboxOpen] = useState(false)
	const [touchStart, setTouchStart] = useState(null)
	const trackRef = useRef(null)

	const activeMedia = gallery[activeIdx]

	function handleSwipeStart(e) {
		setTouchStart(e.touches[0].clientX)
	}

	function handleSwipeEnd(e) {
		if (touchStart === null) return
		const diff = touchStart - e.changedTouches[0].clientX
		if (Math.abs(diff) > 50) {
			if (diff > 0) setActiveIdx((i) => Math.min(i + 1, gallery.length - 1))
			else setActiveIdx((i) => Math.max(i - 1, 0))
		}
		setTouchStart(null)
	}

	return (
		<>
			<div className="space-y-3">
				{/* Main image area */}
				<div
					className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50 cursor-zoom-in group shadow-card img-zoom"
					onClick={() => setLightboxOpen(true)}
					onTouchStart={handleSwipeStart}
					onTouchEnd={handleSwipeEnd}
				>
					{/* Slide counter */}
					<span className="absolute top-3 left-3 z-10 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
						{activeIdx + 1} / {gallery.length}
					</span>

					{/* Prev / Next arrows on hover */}
					{gallery.length > 1 && (
						<>
							<button
								onClick={(e) => {
									e.stopPropagation()
									setActiveIdx((i) => Math.max(i - 1, 0))
								}}
								disabled={activeIdx === 0}
								className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity disabled:opacity-0 text-lg"
							>
								‹
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation()
									setActiveIdx((i) => Math.min(i + 1, gallery.length - 1))
								}}
								disabled={activeIdx === gallery.length - 1}
								className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity disabled:opacity-0 text-lg"
							>
								›
							</button>
						</>
					)}

					{/* Slide track */}
					<div className="overflow-hidden">
						<div
							ref={trackRef}
							className="flex transition-transform duration-500 ease-out"
							style={{ transform: `translateX(-${activeIdx * 100}%)` }}
						>
							{gallery.map((media, i) => (
								<div key={i} className="w-full shrink-0 flex items-center justify-center">
									{media.type === 'video' ? (
										<video
											src={media.src}
											className="w-full aspect-[4/3] object-contain bg-black"
											controls
											muted
											loop
											playsInline
											onClick={(e) => e.stopPropagation()}
										/>
									) : (
										<img
											src={media.src}
											alt={productTitle}
											className="w-full aspect-[4/3] object-contain"
											draggable={false}
										/>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Dot indicators for mobile */}
					{gallery.length > 1 && (
						<div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 md:hidden">
							{gallery.map((_, i) => (
								<span
									key={i}
									className={`w-2 h-2 rounded-full transition-all ${
										i === activeIdx ? 'bg-white w-5' : 'bg-white/50'
									}`}
								/>
							))}
						</div>
					)}
				</div>

				{/* Thumbnail strip */}
				<div className="flex gap-2 overflow-x-auto pb-1">
					{gallery.map((media, idx) => (
						<button
							key={idx}
							onClick={() => setActiveIdx(idx)}
							className={`relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 ease-spring hover:scale-105 active:scale-95 ${
								activeIdx === idx
									? 'border-[#D66B3E] ring-1 ring-[#D66B3E]/25 shadow-brand-sm'
									: 'border-transparent opacity-60 hover:opacity-100'
							}`}
						>
							<img src={media.thumb} alt="" className="w-full h-full object-cover" />
							{media.type === 'video' && (
								<span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs font-bold">▶</span>
							)}
						</button>
					))}
				</div>
			</div>

			{/* Lightbox */}
			{lightboxOpen && (
				<Lightbox
					gallery={gallery}
					startIndex={activeIdx}
					onClose={() => setLightboxOpen(false)}
				/>
			)}
		</>
	)
}

/* ─── Reviews Section with local storage ─── */
function ReviewsSection({ productId, rating }) {
	const REVIEWS_KEY = `bunny_reviews_${productId}`
	const [reviews, setReviews] = useState(() => {
		try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]') } catch { return [] }
	})
	const [newRating, setNewRating] = useState(5)
	const [newText, setNewText] = useState('')
	const [newName, setNewName] = useState('')
	const [hoverStar, setHoverStar] = useState(0)

	const hasPurchased = useMemo(() => {
		const state = getState()
		const uid = state.auth?.uid
		if (!uid) return false
		const orders = state.orders || []
		return orders.some(
			(order) => order.userId === uid && Array.isArray(order.items) && order.items.some((i) => i.productId === productId)
		)
	}, [productId])

	function submit(e) {
		e.preventDefault()
		if (!newText.trim()) return
		const review = {
			id: Date.now().toString(),
			name: newName.trim() || 'Зочин',
			rating: newRating,
			text: newText.trim(),
			date: new Date().toISOString(),
		}
		const updated = [review, ...reviews]
		setReviews(updated)
		localStorage.setItem(REVIEWS_KEY, JSON.stringify(updated))
		setNewText('')
		setNewName('')
		setNewRating(5)
	}

	const avgRating = reviews.length > 0
		? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
		: (rating || 4.8).toFixed(1)

	return (
		<div>
			<div className="flex items-center gap-4 mb-6">
				<div className="text-center">
					<span className="text-3xl font-bold text-slate-900">{avgRating}</span>
					<div className="flex items-center gap-0.5 mt-1">
						{[1,2,3,4,5].map((s) => (
							<FaStar key={s} className={`text-sm ${s <= Math.round(Number(avgRating)) ? 'text-[#D66B3E]' : 'text-gray-200'}`} />
						))}
					</div>
					<p className="text-xs text-slate-500 mt-1">{reviews.length} сэтгэгдэл</p>
				</div>
				<div className="flex-1 space-y-1">
					{[5,4,3,2,1].map((star) => {
						const count = reviews.filter((r) => r.rating === star).length
						const pct = reviews.length > 0 ? (count / reviews.length * 100) : 0
						return (
							<div key={star} className="flex items-center gap-2 text-xs">
								<span className="w-3 text-slate-500">{star}</span>
								<FaStar className="text-[#D66B3E] w-3 h-3" />
								<div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
									<div className="h-full bg-gradient-to-r from-[#D66B3E] to-[#c45d35] rounded-full" style={{ width: `${pct}%` }} />
								</div>
								<span className="w-6 text-slate-400 text-right">{count}</span>
							</div>
						)
					})}
				</div>
			</div>

			{/* Submit review form */}
			{hasPurchased ? (
				<form onSubmit={submit} className="rounded-xl border border-slate-200 p-4 mb-6 space-y-3">
					<p className="text-sm font-semibold text-slate-900">Сэтгэгдэл бичих</p>
					<div className="flex items-center gap-1">
						{[1,2,3,4,5].map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => setNewRating(s)}
								onMouseEnter={() => setHoverStar(s)}
								onMouseLeave={() => setHoverStar(0)}
							>
								<FaStar className={`text-lg transition-colors ${s <= (hoverStar || newRating) ? 'text-[#D66B3E]' : 'text-gray-200'}`} />
							</button>
						))}
					</div>
					<input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Нэр (заавал биш)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
					<textarea value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Сэтгэгдлээ бичнэ үү..." rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
					<button type="submit" disabled={!newText.trim()} className="px-5 py-2 rounded-full bg-gradient-to-r from-[#D66B3E] to-[#c45d35] text-white text-sm font-semibold shadow-brand-sm hover:brightness-105 hover:shadow-brand-md active:scale-[0.97] disabled:opacity-50 transition-all duration-200">
						Илгээх
					</button>
				</form>
			) : (
				<div className="rounded-xl border border-slate-200 p-4 mb-6">
					<p className="text-sm text-slate-500">Зөвхөн энэ бүтээгдэхүүнийг худалдан авсан хэрэглэгчид сэтгэгдэл бичих боломжтой</p>
				</div>
			)}

			{/* Review list */}
			{reviews.length === 0 ? (
				<p className="text-sm text-slate-500">Сэтгэгдэл байхгүй байна. Эхний сэтгэгдлээ бичээрэй!</p>
			) : (
				<div className="space-y-4">
					{reviews.map((r) => (
						<div key={r.id} className="rounded-xl border border-slate-100 p-4">
							<div className="flex items-center gap-2 mb-2">
								<div className="w-8 h-8 rounded-full bg-[#F7E9D7] flex items-center justify-center text-sm font-bold text-[#D66B3E]">
									{r.name[0]?.toUpperCase()}
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900">{r.name}</p>
									<div className="flex items-center gap-1">
										{[1,2,3,4,5].map((s) => (
											<FaStar key={s} className={`text-[10px] ${s <= r.rating ? 'text-[#D66B3E]' : 'text-gray-200'}`} />
										))}
										<span className="text-xs text-slate-400 ml-1">{new Date(r.date).toLocaleDateString()}</span>
									</div>
								</div>
							</div>
							<p className="text-sm text-slate-700">{r.text}</p>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default function ProductPage() {
	const { t } = useI18n()
	const { id } = useParams()
	const state = useSyncExternalStore(subscribe, getState)
	const { getStoreById } = useStores()
	const { session } = useSession()
	const isAdmin = session?.role === 'admin' || session?.role === 'superadmin'
	const approvedProducts = useMemo(
		() => (state.adminProducts || []).filter((p) => !p.approvalStatus || p.approvalStatus === 'approved'),
		[state.adminProducts],
	)
	const product = useMemo(() => approvedProducts.find((p) => p.id === id) || null, [id, approvedProducts])
	const { addToCart } = useCart()
	const navigate = useNavigate()
	const { isInWishlist, toggleWishlist } = useWishlist()
	const [selectedColor, setSelectedColor] = useState(null)
	const [size, setSize] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [tab, setTab] = useState('desc')
	const [viewCount, setViewCount] = useState(0)

	useEffect(() => {
		if (id) {
			trackProductView(id)
			setViewCount(getProductViews(id))
			addRecentlyViewed(id)
			trackEvent('view_item', { productId: id })
		}
	}, [id])

	const recentlyViewedProducts = useMemo(() => {
		const ids = getRecentlyViewed().filter((rid) => rid !== id)
		return ids.map((rid) => approvedProducts.find((p) => p.id === rid)).filter(Boolean).slice(0, 6)
	}, [id, approvedProducts])

	if (!product || (product.isDraft === true && !isAdmin)) return <div className="container-app py-8"><p>{t('product.notFound')}</p></div>

	const TABS = [
		{ key: 'desc', label: t('product.description') },
		{ key: 'reviews', label: t('product.reviews') },
	]

	const gallery = useMemo(() => {
		const imgs = []
		// Use product.images array if available (admin-uploaded), otherwise fallback
		const productImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : []
		if (productImages.length > 0) {
			productImages.forEach((src) => {
				imgs.push({ type: 'image', src, thumb: src })
			})
		} else {
			if (product.image) imgs.push({ type: 'image', src: product.image, thumb: product.thumbnail || product.image })
			if (product.thumbnail && product.thumbnail !== product.image) imgs.push({ type: 'image', src: product.thumbnail, thumb: product.thumbnail })
		}
		if (imgs.length === 0) imgs.push({ type: 'image', src: 'https://via.placeholder.com/600', thumb: 'https://via.placeholder.com/200' })
		return imgs
	}, [product])
	const oldPrice = product.originalPrice && product.originalPrice > product.price ? Math.round(product.originalPrice) : 0
	const discount = oldPrice > 0 ? Math.max(0, Math.round((1 - product.price / oldPrice) * 100)) : 0
	const wished = isInWishlist(product.id)
	const storeSlug = useMemo(() => {
		if (!product.storeId) return null
		const store = getStoreById(product.storeId)
		return store?.slug || product.storeId
	}, [product.storeId, getStoreById])
	const productPath = storeSlug ? `/${storeSlug}/product/${product.id}` : `/product/${product.id}`
	const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/product/${product.id}` : ''

	const handleShare = useCallback(async () => {
		const text = shareUrl || (typeof window !== 'undefined' ? window.location.href : '')
		const ok = await copyTextToClipboard(text)
		if (ok) toast.success(t('product.shareCopied'))
		else toast.error(t('product.shareCopyFailed'))
	}, [shareUrl, t])

	const productColors = product.colors?.length ? product.colors : ['#000000']
	const productSizes = product.sizes?.length ? product.sizes : []
	const productVariants = Array.isArray(product.variants) ? product.variants : []
	const hasVariants = productVariants.length > 0

	// Variant-aware stock: if variants exist, check selected variant's stock
	const selectedVariant = hasVariants
		? productVariants.find((v) => (v.size || '') === (size || '') && (v.color || '') === ((selectedColor || productColors[0]) || ''))
		: null
	const stockQty = hasVariants && selectedVariant ? (selectedVariant.stock ?? 0) : (product.stockQuantity ?? (product.inStock ? 10 : 0))
	const isAvailable = stockQty > 0

	const allProducts = useMemo(() => approvedProducts, [approvedProducts])

	const offers = allProducts
		.filter((p) => p.category === product.category && p.id !== product.id)
		.slice(0, 3)

		return (
		<div className="container-app py-6 sm:py-8">
			<SEO
				title={product.title}
				description={`${product.brand} — ${formatCurrency(product.price)}. ${product.description?.slice(0, 120) || ''}`}
				image={product.thumbnail}
				url={shareUrl}
			/>
			{/* Breadcrumbs */}
			<nav className="text-xs sm:text-sm text-slate-500 mb-4 flex items-center gap-1.5 sm:gap-2 overflow-hidden">
				<Link to="/" className="hover:text-brand transition-colors shrink-0">{t('product.home')}</Link>
				<span className="shrink-0">/</span>
				<Link to="/catalog" className="hover:text-brand transition-colors shrink-0">{t('common.catalog')}</Link>
				<span className="shrink-0">/</span>
				<span className="text-slate-900 truncate">{product.title}</span>
			</nav>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
				{/* Left: gallery */}
				<div className="lg:col-span-7">
					<ProductGallery
						gallery={gallery}
						productTitle={product.title}
					/>
				</div>

				{/* Right: product details panel */}
				<aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-28 self-start">
					<div className="card-static p-5 sm:p-6 animate-fade-in-up">
						{/* Stock status badge */}
						{!isAvailable && (
							<p className="text-sm font-semibold text-[#D66B3E] uppercase tracking-wide mb-2">{t('product.outOfStockBadge')}</p>
						)}
						{isAvailable && stockQty <= 5 && (
							<p className="text-sm font-semibold text-[#b85430] mb-2">
								<span className="inline-flex items-center gap-1 rounded-full bg-[#F7E9D7] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#D66B3E]">{t('productCard.lowStockShort')}</span>
								<span className="ml-2">{t('product.lowStockLine', { count: stockQty })}</span>
							</p>
						)}
						{isAvailable && product.productType === 'order' && (
							<p className="text-xs text-[#b85430] bg-[#F7E9D7]/60 border border-[#D66B3E]/15 rounded-xl px-3 py-2 mb-2">
								{t('product.madeToOrderLine', { days: product.orderDays || 7 })}
							</p>
						)}

						{/* Title + wishlist */}
						<div className="flex items-start gap-2 mb-2">
							<h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug flex-1">{product.title}</h1>
							<button
								type="button"
								onClick={() => toggleWishlist(product.id)}
								className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-gray-200 hover:bg-[#F7E9D7]/60 hover:border-[#D66B3E]/40 hover:scale-110 active:scale-95 flex items-center justify-center transition-all duration-200 ease-spring mt-0.5 shadow-soft"
								aria-label={t('a11y.wishlist')}
								title={t('common.wishlist')}
							>
								{wished ? <FaHeart className="text-[#D66B3E] text-lg sm:text-xl" /> : <FaRegHeart className="text-gray-400 text-lg sm:text-xl" />}
							</button>
						</div>

						{/* Store badge */}
						{product.storeId && (() => {
							const productStore = getStoreById(product.storeId)
							const storeName = productStore?.name || product.brand || product.storeId
							const storeLink = storeSlug ? `/stores/${storeSlug}` : `/stores/${product.storeId}`
							return (
								<Link to={storeLink} className="flex items-center gap-2.5 mb-3 px-3 py-2 rounded-xl border border-slate-200 hover:border-[#4B7F4D]/40 hover:bg-[#F7E9D7]/30 transition-all group w-fit">
									{productStore?.image ? (
										<img src={productStore.image} alt={storeName} className="w-7 h-7 rounded-lg object-cover shrink-0" />
									) : (
										<div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D66B3E] to-[#4B7F4D] flex items-center justify-center text-white text-xs font-bold shrink-0">
											{storeName.slice(0, 2).toUpperCase()}
										</div>
									)}
									<span className="text-sm font-medium text-slate-700 group-hover:text-[#4B7F4D] transition-colors">{storeName}</span>
									<span className="text-xs text-slate-400 group-hover:text-[#4B7F4D] transition-colors ml-auto">→</span>
								</Link>
							)
						})()}

						{/* Discount badge */}
						{discount > 0 && (
							<span className="inline-block bg-gradient-to-r from-[#D66B3E] to-[#c45d35] text-white text-sm font-extrabold px-3 py-1 rounded-full shadow-brand-sm mb-3">-{discount}%</span>
						)}

						{/* Product code */}
						{product.productCode && (
							<p className="text-xs text-slate-500 mb-3 font-mono bg-slate-50 inline-block px-2 py-1 rounded-md border border-slate-200">
								Код: {product.productCode}
							</p>
						)}

						{/* Rating & reviews */}
						<div className="flex items-center gap-1.5 mb-4">
							<div className="flex items-center gap-0.5">
								{[1, 2, 3, 4, 5].map((star) => (
									<FaStar
										key={star}
										className={`text-sm ${star <= Math.round(product.rating || 0) ? 'text-[#D66B3E]' : 'text-gray-200'}`}
									/>
								))}
							</div>
							<span className="text-sm text-gray-500">({((product.rating || 0)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} reviews)</span>
						</div>

						{/* Price */}
						<div className="flex items-baseline gap-2 sm:gap-3 mb-1">
							{oldPrice > 0 && <p className="text-gray-400 line-through text-base sm:text-lg">{formatCurrency(oldPrice)}</p>}
							<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient-brand">{formatCurrency(product.price)}</p>
						</div>

						{/* Description */}
						<p className="text-sm text-gray-500 leading-relaxed mt-3 mb-5">
							{product.description || 'Featuring the original ripple design inspired by Japanese bullet trains, the Nike Air Max 97 lets you push your style full-speed ahead.'}
						</p>

						{/* External link (marketing video, social media, etc.) */}
						{product.linkUrl && (
							<a
								href={product.linkUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F7E9D7]/70 to-[#F7E9D7]/40 border border-[#D66B3E]/25 text-[#b85430] text-sm font-semibold hover:from-[#F7E9D7] hover:to-[#F7E9D7]/70 hover:shadow-brand-sm transition-all duration-200 mb-4 group"
							>
								<svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
								Link үзэх
								<span className="text-[#D66B3E] group-hover:translate-x-0.5 transition-transform">→</span>
							</a>
						)}

						{/* Divider */}
						<div className="divider-soft my-4" />

						{/* Color picker */}
						{productColors.length > 0 && (
							<div className="flex items-center justify-between mb-5">
								<p className="text-sm font-semibold text-gray-900">Color</p>
								<div className="flex items-center gap-2">
									{productColors.map((color) => {
										const isSelected = selectedColor === color || (!selectedColor && color === productColors[0])
										const variantForColor = hasVariants
											? productVariants.find((v) => (v.color || '') === color && (v.size || '') === (size || ''))
											: null
										const colorOutOfStock = variantForColor && variantForColor.stock <= 0
										return (
											<button
												key={color}
												onClick={() => setSelectedColor(color)}
												className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 ease-spring hover:scale-110 active:scale-95 relative ${isSelected ? 'border-[#D66B3E] ring-2 ring-[#D66B3E]/30 shadow-brand-sm' : 'border-transparent hover:border-[#D66B3E]/40'} ${colorOutOfStock ? 'opacity-40' : ''}`}
												style={{ backgroundColor: color }}
												title={colorOutOfStock ? 'Out of stock' : color}
											>
												{isSelected && (
													<FaCheck className={`text-xs ${['#FFFFFF', '#FFF', '#fff', '#ffffff'].includes(color) ? 'text-gray-900' : 'text-white'}`} />
												)}
												{colorOutOfStock && (
													<span className="absolute inset-0 flex items-center justify-center">
														<span className="w-[1px] h-full bg-gray-500 rotate-45 absolute" />
													</span>
												)}
											</button>
										)
									})}
								</div>
							</div>
						)}

						{/* Divider */}
						{productColors.length > 0 && <div className="divider-soft my-4" />}

						{/* Size dropdown */}
						{productSizes.length > 0 && (
							<div className="mb-5">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm font-semibold text-gray-900">Size</p>
									{hasVariants && selectedVariant && (
										<span className="text-xs text-slate-500">
											{selectedVariant.sku ? `SKU: ${selectedVariant.sku}` : ''}
											{selectedVariant.stock !== undefined ? ` • ${selectedVariant.stock} нөөцтэй` : ''}
										</span>
									)}
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="relative flex-1">
										<select
											value={size}
											onChange={(e) => setSize(e.target.value)}
											className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											<option value="">Select size</option>
											{productSizes.map((s) => {
												const variantForSize = hasVariants
													? productVariants.find((v) => v.size === s && (v.color || '') === ((selectedColor || productColors[0]) || ''))
													: null
												const sizeStock = variantForSize ? variantForSize.stock : null
												const outOfStock = sizeStock !== null && sizeStock <= 0
												return <option key={s} value={s} disabled={outOfStock}>{s}{sizeStock !== null ? ` (${sizeStock > 0 ? sizeStock + ' нөөцтэй' : 'Дууссан'})` : ''}</option>
											})}
										</select>
										<FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
									</div>
									<a href="#" className="text-sm text-[#4B7F4D] font-medium hover:underline whitespace-nowrap">Size chart</a>
								</div>
							</div>
						)}

						{/* Divider */}
						{productSizes.length > 0 && <div className="divider-soft my-4" />}

						{/* Quantity selector */}
						<div className="mb-5">
							<div className="flex items-center justify-between">
								<p className="text-sm font-semibold text-gray-900">Quantity</p>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setQuantity((q) => Math.max(isAvailable ? 1 : 0, q - 1))}
										disabled={quantity <= (isAvailable ? 1 : 0)}
										className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#D66B3E] hover:text-[#D66B3E] hover:bg-[#F7E9D7]/50 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-soft"
									>
										<FaMinus className="text-xs" />
									</button>
									<span className="w-12 h-10 flex items-center justify-center text-base font-bold text-gray-900 tabular-nums">
										{quantity}
									</span>
									<button
										onClick={() => setQuantity((q) => Math.min(stockQty, q + 1))}
										disabled={quantity >= stockQty}
										className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#D66B3E] hover:text-[#D66B3E] hover:bg-[#F7E9D7]/50 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-soft"
									>
										<FaPlus className="text-xs" />
									</button>
								</div>
							</div>
							<p className="text-xs text-gray-400 text-right mt-1">Available: {stockQty}</p>
						</div>

						{/* Add to cart / actions */}
						<div className="space-y-2.5 mt-4">
							<button
								onClick={() => addToCart(product.id, quantity, { size: size || undefined, color: selectedColor || productColors[0] || undefined })}
								disabled={!isAvailable || (productSizes.length > 0 && !size)}
								className="btn-primary w-full py-3.5 active:scale-[0.97] transition-transform duration-200"
							>
								{isAvailable ? t('product.addToCart') : t('common.outOfStock')}
							</button>
							<button
								disabled={!isAvailable || (productSizes.length > 0 && !size)}
								className="btn-outline w-full py-3.5 active:scale-[0.97] transition-transform duration-200"
								onClick={() => {
									addToCart(product.id, quantity, { size: size || undefined, color: selectedColor || productColors[0] || undefined })
									navigate('/checkout')
								}}
							>
								{t('product.buyNow')}
							</button>
						</div>
						{productSizes.length > 0 && !size && isAvailable && (
							<p className="text-xs text-[#b85430] mt-2">{t('product.pickSize')}</p>
						)}

						{/* Product info rows */}
						<div className="mt-5 text-sm text-gray-600 space-y-2 border-t border-gray-100 pt-4">
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.delivery')}</span>
								<span className="font-medium text-gray-900">{t('product.shipsAfterOrder') || 'Ships after order confirmation'}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.seller')}</span>
								<span className="font-medium text-gray-900">{product.brand}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.availability')}</span>
								<span className={`font-medium ${isAvailable ? 'text-[#4B7F4D]' : 'text-[#D66B3E]'}`}>
									{isAvailable ? t('product.inStockLine', { count: stockQty }) : t('product.outOfStockBadge')}
								</span>
							</div>
						</div>

						{/* Views & Share */}
						<div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
							<span className="flex items-center gap-1.5 text-sm text-gray-400">
								{t('product.watched')} {viewCount}
							</span>
							<button
								type="button"
								onClick={handleShare}
								className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 ml-auto"
							>
								<FaShareAlt /> {t('product.share')}
							</button>
						</div>
					</div>

					<div className="rounded-2xl border border-[#4B7F4D]/15 bg-[#F7E9D7]/40 p-4 sm:p-5 text-sm text-slate-700 space-y-2 shadow-soft">
						<p className="font-bold text-slate-900">{t('trust.blockTitle')}</p>
						<p>{t('trust.deliveryRange')}</p>
						{/* <p>{t('trust.returnShipping')}</p> */}
						{/* <p>{t('trust.startReturn')}</p> */}
						<p className="text-xs text-slate-500 pt-1">{t('checkout.estimatedDeliveryRange')}</p>
					</div>

					{/* Offers list */}
					<div className="card-static p-4">
						<p className="font-bold text-slate-900 mb-3">{t('product.similar')}</p>
						<div className="space-y-3">
							{offers.map((o) => {
								const oStore = o.storeId ? getStoreById(o.storeId) : null
								const oSlug = oStore?.slug || o.storeId
								const oLink = oSlug ? `/${oSlug}/product/${o.id}` : `/product/${o.id}`
								return (
								<Link key={o.id} to={oLink} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F7E9D7]/40 hover:-translate-y-0.5 hover:shadow-card border border-gray-100 transition-all duration-200 ease-spring active:scale-[0.98]">
									<img src={o.thumbnail} alt={o.title} className="w-16 h-16 rounded-lg object-cover" />
									<div className="flex-1 min-w-0">
										<p className="text-sm text-gray-900 truncate">{o.title}</p>
										<p className="text-xs text-gray-500 truncate">{o.brand}</p>
									</div>
									<p className="text-sm font-bold text-[#D66B3E]">{formatCurrency(o.price)}</p>
								</Link>
								)
							})}
						</div>
					</div>
				</aside>
			</div>

			{/* Product info tabs */}
			<div className="mt-6 sm:mt-8 card-surface p-4 sm:p-6">
				<div className="flex gap-2 sm:gap-6 border-b border-slate-200 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
					{TABS.map((t) => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`pb-2 px-1.5 sm:px-2 text-sm sm:text-lg font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${tab === t.key ? 'border-brand text-brand font-semibold' : 'border-transparent text-gray-500 hover:text-brand hover:border-[#D66B3E]/30'}`}
						>
							{t.label}
						</button>
					))}
				</div>
				{tab === 'desc' && (
					<div>
						<p className="text-gray-700 mb-4">{product.description || 'Хоосон'}</p>
					</div>
				)}
				
				{tab === 'reviews' && (
					<ReviewsSection productId={product.id} rating={product.rating || 0} />
				)}
			</div>
			{/* Recently viewed */}
			{recentlyViewedProducts.length > 0 && (
				<div className="mt-6 sm:mt-8">
					<h3 className="section-title mb-4">Саяхан үзсэн</h3>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
						{recentlyViewedProducts.map((p, i) => (
							<div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
								<ProductCard product={p} />
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}