import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, useCallback, useSyncExternalStore } from 'react'
import { subscribe, getState, removeHighlightProduct } from '../state/store.js'
import ProductCard from '../catalog/components/ProductCard.jsx'
import BannerAccordion from './components/BannerAccordion.jsx'
import BunnyOnboardingModal, { useHomeVisitOnboarding } from './BunnyOnboardingModal.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { useStores } from '../state/useStores.js'
import { useSession } from '../state/useSession.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { Eye, ChevronLeft, ChevronRight, Star, TrendingUp, X } from 'lucide-react'
import SEO from '../layout/components/SEO.jsx'

function productSortMs(p) {
	const ts = p.updatedAt || p.createdAt
	const ms = (typeof ts?.toMillis === 'function' ? ts.toMillis() : null)
		?? (ts instanceof Date ? ts.getTime() : ts ? new Date(ts).getTime() : 0)
	return ms || 0
}

function computePurchaseCounts(orders) {
	const map = {}
	for (const o of orders || []) {
		for (const line of o.items || []) {
			const id = line.productId
			if (!id) continue
			map[id] = (map[id] || 0) + (line.quantity || 0)
		}
	}
	return map
}

/* ── Swipeable Carousel (touch + mouse drag, arrow buttons, no auto-scroll) ── */
function SwipeCarousel({ children }) {
	const trackRef = useRef(null)
	const [canLeft, setCanLeft] = useState(false)
	const [canRight, setCanRight] = useState(true)
	const dragRef = useRef({ isDragging: false, startX: 0, scrollStart: 0 })

	const updateArrows = useCallback(() => {
		const el = trackRef.current
		if (!el) return
		setCanLeft(el.scrollLeft > 4)
		setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
	}, [])

	useEffect(() => {
		const el = trackRef.current
		if (!el) return
		updateArrows()
		el.addEventListener('scroll', updateArrows, { passive: true })
		window.addEventListener('resize', updateArrows)
		return () => { el.removeEventListener('scroll', updateArrows); window.removeEventListener('resize', updateArrows) }
	}, [updateArrows])

	/* Mouse drag support for desktop */
	useEffect(() => {
		const el = trackRef.current
		if (!el) return
		const d = dragRef.current
		function onDown(e) { d.isDragging = true; d.startX = e.pageX; d.scrollStart = el.scrollLeft; el.style.cursor = 'grabbing'; el.style.userSelect = 'none' }
		function onMove(e) { if (!d.isDragging) return; e.preventDefault(); el.scrollLeft = d.scrollStart - (e.pageX - d.startX) }
		function onUp() { d.isDragging = false; el.style.cursor = ''; el.style.userSelect = '' }
		el.addEventListener('mousedown', onDown)
		window.addEventListener('mousemove', onMove)
		window.addEventListener('mouseup', onUp)
		return () => { el.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
	}, [])

	function scroll(dir) {
		const el = trackRef.current
		if (!el) return
		const cardW = el.querySelector(':scope > *')?.offsetWidth || 220
		el.scrollBy({ left: dir * cardW * 2, behavior: 'smooth' })
	}

	return (
		<div className="relative group/carousel overflow-hidden">
			{canLeft && (
				<button onClick={() => scroll(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-card-elevated border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#F7E9D7]/60 hover:text-[#D66B3E] hover:scale-105 active:scale-95 sm:opacity-0 sm:group-hover/carousel:opacity-100 transition-all duration-200">
					<ChevronLeft className="w-5 h-5" />
				</button>
			)}
			<div
				ref={trackRef}
				className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory touch-pan-x"
				style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
			>
				{children}
			</div>
			{canRight && (
				<button onClick={() => scroll(1)} className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-card-elevated border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#F7E9D7]/60 hover:text-[#D66B3E] hover:scale-105 active:scale-95 sm:opacity-0 sm:group-hover/carousel:opacity-100 transition-all duration-200">
					<ChevronRight className="w-5 h-5" />
				</button>
			)}
		</div>
	)
}

function getProductLink(item, getStoreById) {
	if (!item.storeId) return `/product/${item.id}`
	const store = getStoreById(item.storeId)
	const slug = store?.slug || item.storeId
	return `/${slug}/product/${item.id}`
}

export default function HomePage() {
	const { t } = useI18n()
	const { open: onboardingOpen, dismiss: dismissOnboarding } = useHomeVisitOnboarding()
	const { getStoreById } = useStores()
	const { session } = useSession()
	const isAdminUser = session?.role === 'admin' || session?.role === 'superadmin'
	const state = useSyncExternalStore(subscribe, getState)
	const highlights = state.highlights || {}
	const adminUsers = state.adminUsers || []
	const disabledStoreIds = useMemo(() => new Set(adminUsers.filter((u) => u.disabled).map((u) => u.storeId)), [adminUsers])
	const adminProducts = (state.adminProducts || []).filter((p) => {
		if ((p.approvalStatus && p.approvalStatus !== 'approved') || p.isDraft === true) return false
		if (p.storeId && disabledStoreIds.has(p.storeId)) return false
		return true
	})
	const orders = state.orders || []

	const inStockProducts = useMemo(
		() => adminProducts.filter((p) => p.inStock !== false && (p.stockQuantity ?? 0) > 0),
		[adminProducts],
	)

	const purchaseCounts = useMemo(() => computePurchaseCounts(orders), [orders])
	const bannerToggle = useMemo(
		() => (state.banners || []).find((b) => b.id === '__home_banner_toggle__'),
		[state.banners],
	)
	const homeBannerEnabled = bannerToggle?.enabled !== false

	const banners = useMemo(() => {
		const today = new Date().toISOString().slice(0, 10)
		return [...(state.banners || [])]
			.filter((b) => b.id !== '__home_banner_toggle__')
			.filter((b) => {
				if (b.status === 'inactive' || b.status === 'rejected') return false
				if (b.status === 'pending') return false
				if (b.startDate && b.startDate > today) return false
				if (b.endDate && b.endDate < today) return false
				return true
			})
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
	}, [state.banners])
	const [bannerIdx, setBannerIdx] = useState(0)

	useEffect(() => {
		if (banners.length <= 1) return
		const timer = setInterval(() => {
			setBannerIdx((prev) => (prev + 1) % banners.length)
		}, 3000)
		return () => clearInterval(timer)
	}, [banners.length])

	const highlightedProducts = Object.entries(highlights)
		.map(([storeId, productId]) => {
			const product = adminProducts.find((p) => p.id === productId)
			const st = adminUsers.find((u) => u.storeId === storeId)
			if (product && st && product.inStock !== false && (product.stockQuantity ?? 0) > 0) {
				return { ...product, _storeName: st.storeName || storeId }
			}
			return null
		})
		.filter(Boolean)

	/* Popular = most purchased; tie-break by views */
	const popularNow = useMemo(() => {
		const list = [...inStockProducts]
		list.sort((a, b) => {
			const pa = purchaseCounts[a.id] || 0
			const pb = purchaseCounts[b.id] || 0
			if (pb !== pa) return pb - pa
			const va = state.productViews?.[a.id] || 0
			const vb = state.productViews?.[b.id] || 0
			return vb - va
		})
		return list.slice(0, 16)
	}, [inStockProducts, purchaseCounts, state.productViews])

	/* New this week: latest product per store owner — 18 items (3 rows of 6) */
	const newThisWeek = useMemo(() => {
		const byStore = new Map()
		const sorted = [...inStockProducts].sort((a, b) => productSortMs(b) - productSortMs(a))
		for (const p of sorted) {
			const sid = p.storeId || '_'
			if (!byStore.has(sid)) byStore.set(sid, p)
		}
		return Array.from(byStore.values()).slice(0, 18)
	}, [inStockProducts])

	const topByViews = useMemo(() => {
		return [...inStockProducts]
			.sort((a, b) => (state.productViews?.[b.id] || 0) - (state.productViews?.[a.id] || 0))
			.slice(0, 12)
	}, [inStockProducts, state.productViews])

	/* Ready (Бэлэн) products — 12 items (2 rows of 6), sorted newest first */
	const readyProducts = useMemo(() => {
		return [...inStockProducts]
			.filter((p) => p.productType !== 'order')
			.sort((a, b) => productSortMs(b) - productSortMs(a))
			.slice(0, 12)
	}, [inStockProducts])

	/* Order (Захиалга) products — 12 items (2 rows of 6), sorted newest first */
	const orderProducts = useMemo(() => {
		return [...inStockProducts]
			.filter((p) => p.productType === 'order')
			.sort((a, b) => productSortMs(b) - productSortMs(a))
			.slice(0, 12)
	}, [inStockProducts])

	return (
		<div className="space-y-12 sm:space-y-16 pb-12 bg-gradient-to-b from-[#F7E9D7]/40 via-white to-white">
			<SEO
				title={null}
				description="Bunny — маркетплейс, хүн бүр дэлгүүр нээж бараа зарах боломжтой."
			/>
			<BunnyOnboardingModal open={onboardingOpen} onClose={dismissOnboarding} />
			{homeBannerEnabled && banners.length > 0 && (
				<section className="relative w-full overflow-hidden bg-slate-900 rounded-b-3xl shadow-card-elevated animate-fade-in">
					<div
						className="flex transition-transform duration-700 ease-out"
						style={{ transform: `translateX(-${bannerIdx * 100}%)` }}
					>
						{banners.map((b) => (
							<div key={b.id} className="w-full shrink-0">
								<img
									src={b.image}
									alt={b.title || 'Banner'}
									className="w-full h-52 sm:h-72 md:h-80 lg:h-[420px] object-cover"
								/>
							</div>
						))}
					</div>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
					<div className="absolute inset-0 bg-gradient-to-r from-[#D66B3E]/15 via-transparent to-[#4B7F4D]/10 mix-blend-overlay pointer-events-none" />
					{banners.length > 1 && (
						<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
							{banners.map((b, i) => (
								<button
									key={b.id}
									onClick={() => setBannerIdx(i)}
									className={`h-1.5 rounded-full transition-all duration-300 ${
										i === bannerIdx ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60 w-1.5'
									}`}
									aria-label={`Slide ${i + 1}`}
								/>
							))}
						</div>
					)}
					{banners.length > 1 && (
						<>
							<button
								onClick={() => setBannerIdx((prev) => (prev - 1 + banners.length) % banners.length)}
								className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
							>
								<span className="text-xl font-light">‹</span>
							</button>
							<button
								onClick={() => setBannerIdx((prev) => (prev + 1) % banners.length)}
								className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
							>
								<span className="text-xl font-light">›</span>
							</button>
						</>
					)}
				</section>
			)}

			{highlightedProducts.length > 0 && (
				<section className="container-app">
					<div className="flex items-center justify-between mb-6">
						<h2 className="section-title flex items-center gap-2.5">
							<span className="w-9 h-9 rounded-xl bg-[#F7E9D7] text-[#D66B3E] flex items-center justify-center text-sm shadow-soft">★</span>
							{t('home.highlight')}
						</h2>
						<Link to="/stores" className="group/link inline-flex items-center gap-1 text-sm font-semibold text-[#4B7F4D] hover:text-[#3d6b3f] transition-colors duration-200">
							{t('home.seeAll')} <span className="inline-block transition-transform duration-200 ease-spring group-hover/link:translate-x-1">→</span>
						</Link>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
						{highlightedProducts.map((p, i) => (
							<div key={p.id} className="relative group animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
								<span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F7E9D7]/95 text-[#4B7F4D] text-[10px] font-bold shadow-sm backdrop-blur-sm">
									★ {p._storeName}
								</span>
								<ProductCard product={p} />
								{isAdminUser && (
									<button
										type="button"
										onClick={(e) => { e.preventDefault(); removeHighlightProduct(p.storeId) }}
										className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 shadow-soft flex items-center justify-center text-slate-500 hover:bg-[#F7E9D7] hover:text-[#D66B3E] hover:scale-110 active:scale-95 transition-all duration-200"
										title="Онцлохоос хасах"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
						))}
					</div>
				</section>
			)}

			{/* Ready (Бэлэн) products — 2 rows, newest first */}
			{readyProducts.length > 0 && (
				<section className="container-app">
					<div className="flex items-center justify-between mb-6">
						<h2 className="section-title flex items-center gap-2.5">
							<span className="w-9 h-9 rounded-xl bg-[#4B7F4D]/10 text-[#4B7F4D] flex items-center justify-center text-sm shadow-soft">✓</span>
							Бэлэн бүтээгдэхүүн
						</h2>
						<Link to="/catalog?status=ready" className="group/link inline-flex items-center gap-1 text-sm font-semibold text-[#4B7F4D] hover:text-[#3d6b3f] transition-colors duration-200">
							{t('home.seeAll')} <span className="inline-block transition-transform duration-200 ease-spring group-hover/link:translate-x-1">→</span>
						</Link>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
						{readyProducts.map((p, i) => (
							<div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
								<ProductCard product={p} />
							</div>
						))}
					</div>
				</section>
			)}

			{/* Order (Захиалга) products — 2 rows, newest first */}
			{orderProducts.length > 0 && (
				<section className="container-app">
					<div className="flex items-center justify-between mb-6">
						<h2 className="section-title flex items-center gap-2.5">
							<span className="w-9 h-9 rounded-xl bg-[#F7E9D7] text-[#D66B3E] flex items-center justify-center text-sm shadow-soft">⏳</span>
							Захиалгат бүтээгдэхүүн
						</h2>
						<Link to="/catalog?status=order" className="group/link inline-flex items-center gap-1 text-sm font-semibold text-[#D66B3E] hover:text-[#c45d35] transition-colors duration-200">
							{t('home.seeAll')} <span className="inline-block transition-transform duration-200 ease-spring group-hover/link:translate-x-1">→</span>
						</Link>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
						{orderProducts.map((p, i) => (
							<div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
								<ProductCard product={p} />
							</div>
						))}
					</div>
				</section>
			)}

			{/* ── Popular right now — swipeable carousel with arrow nav ── */}
			<section id="featured" className="container-app">
				<div className="flex items-center justify-between mb-6">
					<h2 className="section-title flex items-center gap-2.5">
						<TrendingUp className="w-6 h-6 text-[#D66B3E]" />
						{t('home.popularNow')}
					</h2>
					<Link to="/catalog?sort=default" className="group/link inline-flex items-center gap-1 text-sm font-semibold text-[#D66B3E] hover:text-[#c45d35] transition-colors duration-200">
						{t('home.seeAll')} <span className="inline-block transition-transform duration-200 ease-spring group-hover/link:translate-x-1">→</span>
					</Link>
				</div>
				<SwipeCarousel>
					{popularNow.map((p) => (
						<div key={p.id} className="min-w-[160px] sm:min-w-[190px] lg:min-w-[210px] max-w-[210px] shrink-0 snap-start">
							<ProductCard product={p} />
						</div>
					))}
				</SwipeCarousel>
			</section>

			<section className="rounded-3xl mx-3 sm:mx-6 lg:mx-8 overflow-hidden border border-[#D66B3E]/20 shadow-card-elevated bg-gradient-to-br from-[#D66B3E] via-[#c45d35] to-[#4B7F4D] text-white">
				<BannerAccordion />
			</section>

			{/* ── New this week (3 rows) + Most viewed (redesigned, height matched) ── */}
			<section className="container-app">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* New this week — card grid */}
					<div className="rounded-3xl border border-[#D66B3E]/15 bg-white p-5 sm:p-6 lg:col-span-2 shadow-card flex flex-col">
						<div className="flex items-center justify-between mb-5">
							<h3 className="text-lg font-bold text-slate-900">{t('home.weekNew')}</h3>
							<Link to="/catalog?status=new" className="group/link inline-flex items-center gap-1 text-sm font-semibold text-[#4B7F4D] hover:underline">
								{t('home.toCatalog')} <span className="inline-block transition-transform duration-200 ease-spring group-hover/link:translate-x-1">→</span>
							</Link>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 flex-1">
							{newThisWeek.map((item, i) => (
								<Link key={item.id} to={getProductLink(item, getStoreById)} className="group rounded-2xl border border-[#F7E9D7] bg-[#F7E9D7]/30 p-3 hover:border-[#4B7F4D]/40 hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 ease-spring animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
									<span className="block overflow-hidden rounded-xl mb-2 img-zoom">
										<img src={item.thumbnail} alt={item.title} className="w-full aspect-square object-cover rounded-xl group-hover:scale-105 transition-transform duration-500 ease-spring" />
									</span>
									<p className="text-sm font-medium line-clamp-2 text-slate-900">{item.title}</p>
								</Link>
							))}
						</div>
					</div>

					{/* ── Most Watched — redesigned with rank, image, views, price ── */}
					<div className="rounded-3xl border border-[#4B7F4D]/20 bg-white shadow-card flex flex-col overflow-hidden">
						<div className="px-5 pt-5 sm:px-6 sm:pt-6 pb-4 flex items-center gap-2">
							<Eye className="w-5 h-5 text-[#4B7F4D]" />
							<h3 className="text-lg font-bold text-slate-900">{t('home.topRated')}</h3>
						</div>
						<div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5 max-h-[50vh] lg:max-h-[700px]">
							{topByViews.map((item, idx) => {
								const views = state.productViews?.[item.id] || 0
								return (
									<Link key={item.id} to={getProductLink(item, getStoreById)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#F7E9D7]/40 transition-colors group">
										{/* Rank */}
										<span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
											idx === 0 ? 'bg-gradient-to-br from-[#D66B3E] to-[#c45d35] text-white shadow-brand-sm' : idx === 1 ? 'bg-[#4B7F4D] text-white' : idx === 2 ? 'bg-[#D66B3E]/70 text-white' : 'bg-slate-100 text-slate-500'
										}`}>{idx + 1}</span>
										{/* Image */}
										<img src={item.thumbnail} alt={item.title} className="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0" />
										{/* Info */}
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate text-slate-900 group-hover:text-[#D66B3E] transition-colors">{item.title}</p>
											<div className="flex items-center gap-2 mt-0.5">
												<span className="flex items-center gap-0.5 text-xs text-slate-400">
													<Eye className="w-3 h-3" /> {views.toLocaleString()}
												</span>
												<span className="flex items-center gap-0.5 text-xs text-[#D66B3E]">
													<Star className="w-3 h-3 fill-[#D66B3E]" /> {(item.rating || 0).toFixed(1)}
												</span>
											</div>
										</div>
										{/* Price */}
										<span className="text-sm font-bold text-[#D66B3E] shrink-0">{formatCurrency(item.price)}</span>
									</Link>
								)
							})}
						</div>
					</div>
				</div>
			</section>

		</div>
	)
}
