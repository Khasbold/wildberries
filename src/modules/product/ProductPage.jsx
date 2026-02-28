import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { products } from '../data/products.js'
import { useCart } from '../state/useCart.js'
import { useWishlist } from '../state/useWishlist.js'
import { FaHeart, FaRegHeart, FaShareAlt, FaChevronDown, FaStar, FaCheck, FaMinus, FaPlus } from 'react-icons/fa'
import { useI18n } from '../i18n/useI18n.js'

function formatCurrencyRub(n) {
	try {
		return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
	} catch {
		return `${Math.round(n)} ₽`
	}
}

/* ─── Lightbox (fullscreen zoom + slide) ─── */
function Lightbox({ gallery, startIndex, onClose }) {
	const [idx, setIdx] = useState(startIndex)
	const [zoom, setZoom] = useState(false)
	const [origin, setOrigin] = useState({ x: 50, y: 50 })
	const containerRef = useRef(null)

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
							className="transition-transform duration-300 ease-out select-none"
							style={{
								maxWidth: '100%',
								maxHeight: '100%',
								objectFit: 'contain',
								cursor: zoom ? 'zoom-out' : 'zoom-in',
								transform: zoom ? 'scale(2.5)' : 'scale(1)',
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
function ProductGallery({ gallery, productTitle, discount }) {
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
					className="relative rounded-2xl overflow-hidden border bg-slate-50 cursor-zoom-in group"
					onClick={() => setLightboxOpen(true)}
					onTouchStart={handleSwipeStart}
					onTouchEnd={handleSwipeEnd}
				>
					{/* Slide counter */}
					<span className="absolute top-3 left-3 z-10 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
						{activeIdx + 1} / {gallery.length}
					</span>

					{/* Discount badge */}
					{discount > 0 && (
						<span className="absolute top-3 right-14 z-10 bg-rose-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
							-{discount}%
						</span>
					)}

					{/* Prev / Next arrows on hover */}
					{gallery.length > 1 && (
						<>
							<button
								onClick={(e) => {
									e.stopPropagation()
									setActiveIdx((i) => Math.max(i - 1, 0))
								}}
								disabled={activeIdx === 0}
								className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 text-lg"
							>
								‹
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation()
									setActiveIdx((i) => Math.min(i + 1, gallery.length - 1))
								}}
								disabled={activeIdx === gallery.length - 1}
								className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 text-lg"
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
							className={`relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
								activeIdx === idx
									? 'border-slate-900 ring-1 ring-slate-900/20'
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

export default function ProductPage() {
	const { t } = useI18n()
	const { id } = useParams()
	const product = useMemo(() => products.find((p) => p.id === id), [id])
	const { addToCart } = useCart()
	const { isInWishlist, toggleWishlist } = useWishlist()
	const [selectedColor, setSelectedColor] = useState(null)
	const [size, setSize] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [tab, setTab] = useState('desc')

	if (!product) return <div className="container-app py-8"><p>{t('product.notFound')}</p></div>

	const TABS = [
		{ key: 'desc', label: t('product.description') },
		{ key: 'specs', label: t('product.specs') },
		{ key: 'reviews', label: t('product.reviews') },
		{ key: 'questions', label: t('product.questions') },
	]

	const gallery = [
		{ type: 'image', src: product.image, thumb: product.thumbnail },
		{ type: 'video', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', thumb: product.thumbnail },
		{ type: 'image', src: product.thumbnail, thumb: product.thumbnail },
		{ type: 'image', src: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80', thumb: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=220&q=80' },
		{ type: 'image', src: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80', thumb: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=220&q=80' },
		{ type: 'image', src: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80', thumb: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=220&q=80' },
	]
	const oldPrice = Math.round(product.price * 3.2)
	const discount = Math.max(0, Math.round((1 - product.price / oldPrice) * 100))
	const wished = isInWishlist(product.id)
	const productColors = product.colors?.length ? product.colors : ['#000000']
	const productSizes = product.sizes?.length ? product.sizes : []
	const stockQty = product.stockQuantity ?? (product.inStock ? 10 : 0)
	const isAvailable = stockQty > 0

	const offers = products
		.filter((p) => p.category === product.category && p.id !== product.id)
		.slice(0, 3)

		return (
		<div className="container-app py-4 sm:py-6">
			{/* Breadcrumbs */}
			<nav className="text-xs sm:text-sm text-gray-500 mb-3 flex items-center gap-1.5 sm:gap-2 overflow-hidden">
				<Link to="/" className="hover:underline shrink-0">{t('product.home')}</Link>
				<span className="shrink-0">/</span>
				<Link to="/catalog" className="hover:underline shrink-0">{t('common.catalog')}</Link>
				<span className="shrink-0">/</span>
				<span className="text-gray-900 truncate">{product.title}</span>
			</nav>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
				{/* Left: gallery */}
				<div className="lg:col-span-7">
					<ProductGallery
						gallery={gallery}
						productTitle={product.title}
						discount={discount}
					/>
				</div>

				{/* Right: product details panel */}
				<aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-4 self-start">
					<div className="rounded-2xl border bg-white shadow-sm p-4 sm:p-5">
						{/* Stock status badge */}
						{!isAvailable && (
							<p className="text-sm font-semibold text-rose-600 uppercase tracking-wide mb-2">Out of stock</p>
						)}
						{isAvailable && stockQty <= 5 && (
							<p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">Only {stockQty} left</p>
						)}

						{/* Title */}
						<h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-3">{product.title}</h1>

						{/* Rating & reviews */}
						<div className="flex items-center gap-1.5 mb-4">
							<div className="flex items-center gap-0.5">
								{[1, 2, 3, 4, 5].map((star) => (
									<FaStar
										key={star}
										className={`text-sm ${star <= Math.round(product.rating) ? 'text-amber-400' : 'text-gray-200'}`}
									/>
								))}
							</div>
							<span className="text-sm text-gray-500">({(product.rating * 430).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}k reviews)</span>
						</div>

						{/* Price */}
						<div className="flex items-baseline gap-2 sm:gap-3 mb-1">
							<p className="text-gray-400 line-through text-base sm:text-lg">${oldPrice.toFixed(2)}</p>
							<p className="text-xl sm:text-2xl font-extrabold text-gray-900">${product.price.toFixed(2)}</p>
						</div>

						{/* Description */}
						<p className="text-sm text-gray-500 leading-relaxed mt-3 mb-5">
							{product.description || 'Featuring the original ripple design inspired by Japanese bullet trains, the Nike Air Max 97 lets you push your style full-speed ahead.'}
						</p>

						{/* Divider */}
						<div className="border-t border-gray-100 my-4" />

						{/* Color picker */}
						{productColors.length > 0 && (
							<div className="flex items-center justify-between mb-5">
								<p className="text-sm font-semibold text-gray-900">Color</p>
								<div className="flex items-center gap-2">
									{productColors.map((color) => {
										const isSelected = selectedColor === color || (!selectedColor && color === productColors[0])
										return (
											<button
												key={color}
												onClick={() => setSelectedColor(color)}
												className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'border-gray-900 ring-2 ring-gray-300' : 'border-transparent hover:border-gray-300'}`}
												style={{ backgroundColor: color }}
											>
												{isSelected && (
													<FaCheck className={`text-xs ${['#FFFFFF', '#FFF', '#fff', '#ffffff'].includes(color) ? 'text-gray-900' : 'text-white'}`} />
												)}
											</button>
										)
									})}
								</div>
							</div>
						)}

						{/* Divider */}
						{productColors.length > 0 && <div className="border-t border-gray-100 my-4" />}

						{/* Size dropdown */}
						{productSizes.length > 0 && (
							<div className="mb-5">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm font-semibold text-gray-900">Size</p>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="relative flex-1">
										<select
											value={size}
											onChange={(e) => setSize(e.target.value)}
											className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											<option value="">Select size</option>
											{productSizes.map((s) => <option key={s} value={s}>{s}</option>)}
										</select>
										<FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
									</div>
									<a href="#" className="text-sm text-blue-600 hover:underline whitespace-nowrap">Size chart</a>
								</div>
							</div>
						)}

						{/* Divider */}
						{productSizes.length > 0 && <div className="border-t border-gray-100 my-4" />}

						{/* Quantity selector */}
						<div className="mb-5">
							<div className="flex items-center justify-between">
								<p className="text-sm font-semibold text-gray-900">Quantity</p>
								<div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
									<button
										onClick={() => setQuantity((q) => Math.max(isAvailable ? 1 : 0, q - 1))}
										disabled={quantity <= (isAvailable ? 1 : 0)}
										className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
									>
										<FaMinus className="text-xs" />
									</button>
									<span className="w-12 h-10 flex items-center justify-center text-sm font-semibold text-gray-900 border-x border-gray-200 tabular-nums">
										{quantity}
									</span>
									<button
										onClick={() => setQuantity((q) => Math.min(stockQty, q + 1))}
										disabled={quantity >= stockQty}
										className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
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
								onClick={() => addToCart(product.id, quantity)}
								disabled={!isAvailable || (productSizes.length > 0 && !size)}
								className="w-full rounded-xl bg-gray-900 text-white hover:bg-gray-800 py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isAvailable ? t('product.addToCart') : t('common.outOfStock')}
							</button>
							<button
								disabled={!isAvailable || (productSizes.length > 0 && !size)}
								className="w-full rounded-xl bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{t('product.buyNow')}
							</button>
						</div>
						{productSizes.length > 0 && !size && isAvailable && (
							<p className="text-xs text-amber-600 mt-2">{t('product.pickSize')}</p>
						)}

						{/* Product info rows */}
						<div className="mt-5 text-sm text-gray-600 space-y-2 border-t border-gray-100 pt-4">
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.delivery')}</span>
								<span className="font-medium text-gray-900">{product.fastDelivery ? t('productCard.tomorrow') : '2-4 days'}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.seller')}</span>
								<span className="font-medium text-gray-900">{product.brand}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.availability')}</span>
								<span className={`font-medium ${isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
									{isAvailable ? `${stockQty} in stock` : 'Out of stock'}
								</span>
							</div>
						</div>

						{/* Share */}
						<div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
							<button onClick={() => toggleWishlist(product.id)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-rose-500">
								{wished ? <FaHeart className="text-rose-500" /> : <FaRegHeart />} Wishlist
							</button>
							<button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 ml-auto">
								<FaShareAlt /> {t('product.share')}
							</button>
						</div>
					</div>

					{/* Offers list */}
					<div className="rounded-2xl border bg-white shadow-sm p-4">
						<p className="font-medium mb-3">{t('product.similar')}</p>
						<div className="space-y-3">
							{offers.map((o) => (
								<Link key={o.id} to={`/product/${o.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 border border-gray-100">
									<img src={o.thumbnail} alt={o.title} className="w-16 h-16 rounded object-cover" />
									<div className="flex-1 min-w-0">
										<p className="text-sm text-gray-900 truncate">{o.title}</p>
										<p className="text-xs text-gray-500 truncate">{o.brand}</p>
									</div>
									<p className="text-sm font-semibold text-rose-600">{formatCurrencyRub(o.price)}</p>
								</Link>
							))}
						</div>
					</div>
				</aside>
			</div>

			{/* Product info tabs */}
			<div className="mt-6 sm:mt-8 bg-white rounded-2xl border shadow-sm p-3 sm:p-6">
				<div className="flex gap-2 sm:gap-6 border-b mb-4 sm:mb-6 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
					{TABS.map((t) => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`pb-2 px-1.5 sm:px-2 text-sm sm:text-lg font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-brand'}`}
						>
							{t.label}
						</button>
					))}
				</div>
				{tab === 'desc' && (
					<div>
						<h2 className="text-xl font-semibold mb-2">Описание</h2>
						<p className="text-gray-700 mb-4">{product.description || 'Стильные и удобные кроссовки для повседневной носки. Легкие, дышащие материалы, современный дизайн и отличная амортизация.'}</p>
						<ul className="text-gray-600 text-sm space-y-1">
							<li>• Материал: текстиль, искусственная кожа</li>
							<li>• Подошва: EVA, резина</li>
							<li>• Цвет: белый/черный</li>
							<li>• Сезон: демисезон</li>
							<li>• Страна производства: Китай</li>
						</ul>
					</div>
				)}
				{tab === 'specs' && (
					<div>
						<h2 className="text-xl font-semibold mb-2">Характеристики</h2>
						<table className="w-full text-sm text-gray-700">
							<tbody>
								<tr><td className="py-1 pr-4 font-medium">Бренд</td><td>{product.brand}</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Код товара</td><td>{product.id}</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Категория</td><td>{product.category}</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Страна</td><td>Китай</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Материал</td><td>Текстиль, искусственная кожа</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Сезон</td><td>Демисезон</td></tr>
							</tbody>
						</table>
					</div>
				)}
				{tab === 'reviews' && (
					<div>
						<h2 className="text-xl font-semibold mb-2">Отзывы</h2>
						<div className="mb-4 flex items-center gap-2">
							<span className="text-2xl font-bold text-brand">4.8</span>
							<span className="text-yellow-400">★★★★★</span>
							<span className="text-gray-500">(1 234 отзыва)</span>
						</div>
						<p className="text-gray-600">Пользователи отмечают отличное качество и удобство. Легкие, хорошо сидят на ноге, стильный внешний вид.</p>
					</div>
				)}
				{tab === 'questions' && (
					<div>
						<h2 className="text-xl font-semibold mb-2">Вопросы</h2>
						<p className="text-gray-600 mb-2">Задайте вопрос о товаре, и продавец или покупатели ответят на него.</p>
						<ul className="text-sm text-gray-700 space-y-2">
							<li><span className="font-medium">Вопрос:</span> Есть ли в наличии размер 39? <br /><span className="text-gray-500">Ответ: Да, есть в наличии.</span></li>
							<li><span className="font-medium">Вопрос:</span> Можно ли стирать в машинке? <br /><span className="text-gray-500">Ответ: Рекомендуется ручная стирка.</span></li>
						</ul>
					</div>
				)}
			</div>

			 {/* Add more Wildberries-like details below the main grid and tabs */}
			<div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
				{/* Delivery block */}
				<div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
					<div className="font-semibold text-gray-900 mb-1">Доставка в <span className="text-brand">Москву</span></div>
					<div className="text-sm text-gray-700">Послезавтра, 1 октября — <span className="text-green-600 font-semibold">бесплатно</span></div>
					<div className="text-xs text-gray-500">Самовывоз и курьером</div>
				</div>
				{/* Return block */}
				<div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
					<div className="font-semibold text-gray-900 mb-1">Условия возврата</div>
					<div className="text-sm text-gray-700">Можно вернуть товар в течение 7 дней после получения</div>
					<div className="text-xs text-gray-500">Подробнее на странице возврата</div>
				</div>
				{/* Payment block */}
				<div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
					<div className="font-semibold text-gray-900 mb-1">Способы оплаты</div>
					<div className="text-sm text-gray-700">Картой онлайн, при получении, СБП</div>
					<div className="text-xs text-gray-500">Безопасная оплата</div>
				</div>
				{/* Guarantee block */}
				<div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
					<div className="font-semibold text-gray-900 mb-1">Гарантия</div>
					<div className="text-sm text-gray-700">14 дней на возврат и обмен</div>
					<div className="text-xs text-gray-500">Сертифицированный товар</div>
				</div>
			</div>

			{/* Seller info block */}
			<div className="mt-6 sm:mt-8 bg-white rounded-2xl border shadow-sm p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:gap-8">
				<div className="flex-1">
					<div className="font-semibold text-gray-900 mb-1">Продавец</div>
					<div className="text-sm text-gray-700">{product.brand} (ООО "Вайлдберриз")</div>
					<div className="text-xs text-gray-500">Рейтинг продавца: 4.9/5</div>
				</div>
				<div className="flex-1 mt-4 md:mt-0">
					<div className="font-semibold text-gray-900 mb-1">Страна производства</div>
					<div className="text-sm text-gray-700">Китай</div>
					<div className="text-xs text-gray-500">Импортер: ООО "Вайлдберриз"</div>
				</div>
			</div>

			{/* Viewed with this product */}
			<div className="mt-6 sm:mt-8">
				<h3 className="text-lg font-semibold mb-4">С этим товаром смотрят</h3>
				<div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory">
					{offers.map((o) => (
						<Link key={o.id} to={`/product/${o.id}`} className="min-w-[160px] sm:min-w-[220px] max-w-[220px] bg-white border rounded-xl shadow-sm p-3 flex flex-col items-center hover:shadow-md transition snap-start shrink-0">
							<img src={o.thumbnail} alt={o.title} className="w-24 h-24 object-cover rounded mb-2" />
							<p className="text-sm text-gray-900 truncate w-full">{o.title}</p>
							<p className="text-xs text-gray-500 truncate w-full">{o.brand}</p>
							<p className="text-sm font-semibold text-rose-600 w-full">{formatCurrencyRub(o.price)}</p>
						</Link>
					))}
				</div>
			</div>
		</div>
	)
}