import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState, useSyncExternalStore, useCallback } from 'react'
import { products } from '../data/products.js'
import { subscribe, getState } from '../state/store.js'
import ProductCard from '../catalog/components/ProductCard.jsx'
import BannerAccordion from './components/BannerAccordion.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { translateCategory } from '../i18n/config.js'

export default function HomePage() {
	const { t, locale } = useI18n()
	const state = useSyncExternalStore(subscribe, getState)
	const highlights = state.highlights || {}
	const adminProducts = state.adminProducts || []
	const adminUsers = state.adminUsers || []

	/* Commercial banners carousel */
	const banners = useMemo(() =>
		[...(state.banners || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
		[state.banners]
	)
	const [bannerIdx, setBannerIdx] = useState(0)

	useEffect(() => {
		if (banners.length <= 1) return
		const timer = setInterval(() => {
			setBannerIdx((prev) => (prev + 1) % banners.length)
		}, 3000)
		return () => clearInterval(timer)
	}, [banners.length])

	/* Build highlighted products list */
	const highlightedProducts = Object.entries(highlights)
		.map(([storeId, productId]) => {
			const product = adminProducts.find((p) => p.id === productId)
			const store = adminUsers.find((u) => u.storeId === storeId)
			if (product && store) return { ...product, _storeName: store.storeName || storeId }
			return null
		})
		.filter(Boolean)

	const featured = products.slice(0, 8)
	const fresh = products.slice(4, 12)
	const topRated = [...products].sort((a, b) => b.rating - a.rating).slice(0, 6)
	const categories = [...new Set(products.map((p) => p.category))]

	return (
		<div className="space-y-8">
			{/* Commercial banner carousel */}
			{banners.length > 0 && (
				<section className="relative w-full overflow-hidden bg-black">
					<div
						className="flex transition-transform duration-700 ease-in-out"
						style={{ transform: `translateX(-${bannerIdx * 100}%)` }}
					>
						{banners.map((b) => (
							<div key={b.id} className="w-full shrink-0">
								<img
									src={b.image}
									alt={b.title || 'Banner'}
									className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover"
								/>
							</div>
						))}
					</div>
					{/* Dots */}
					{banners.length > 1 && (
						<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
							{banners.map((b, i) => (
								<button
									key={b.id}
									onClick={() => setBannerIdx(i)}
									className={`w-2.5 h-2.5 rounded-full transition-all ${
										i === bannerIdx ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'
									}`}
								/>
							))}
						</div>
					)}
					{/* Left/Right arrows */}
					{banners.length > 1 && (
						<>
							<button
								onClick={() => setBannerIdx((prev) => (prev - 1 + banners.length) % banners.length)}
								className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
							>
								‹
							</button>
							<button
								onClick={() => setBannerIdx((prev) => (prev + 1) % banners.length)}
								className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
							>
								›
							</button>
						</>
					)}
				</section>
			)}

			<section className="bg-gradient-to-r from-brand to-brand-dark text-white">
				<BannerAccordion />
			</section>

			<section className="container-app -mt-1">
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
					{categories.map((cat) => (
						<Link
							key={cat}
							to={`/catalog?cat=${encodeURIComponent(cat)}`}
							className="card-surface px-4 py-3 hover:border-brand/40 hover:shadow-card transition-all text-sm font-medium"
						>
							{translateCategory(cat, locale)}
						</Link>
					))}
				</div>
			</section>

			{/* Highlighted products from stores */}
			{highlightedProducts.length > 0 && (
				<section className="container-app">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<span className="text-yellow-500 text-xl">★</span>
							<h2 className="text-xl font-semibold">Highlight</h2>
						</div>
						<Link to="/stores" className="text-brand hover:underline text-sm">View all stores</Link>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5">
						{highlightedProducts.map((p) => (
							<div key={p.id} className="relative">
								<span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 text-[10px] font-bold shadow">
									★ {p._storeName}
								</span>
								<ProductCard product={p} />
							</div>
						))}
					</div>
				</section>
			)}

			<section id="featured" className="container-app pt-2">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold">{t('home.popularNow')}</h2>
					<Link to="/catalog" className="text-brand hover:underline">{t('home.seeAll')}</Link>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5">
					{featured.map((p) => (
						<ProductCard key={p.id} product={p} />
					))}
				</div>
			</section>

			<section className="container-app">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
					<div className="card-surface p-4 sm:p-5 lg:col-span-2">
						<div className="flex items-center justify-between mb-3 sm:mb-4">
							<h3 className="text-base sm:text-lg font-semibold">{t('home.weekNew')}</h3>
							<Link to="/catalog?sort=rating_desc" className="text-brand text-sm hover:underline">{t('home.toCatalog')}</Link>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
							{fresh.slice(0, 8).map((item) => (
								<Link key={item.id} to={`/product/${item.id}`} className="rounded-xl border border-slate-200 p-2 hover:border-brand/50 transition-colors">
									<img src={item.thumbnail} alt={item.title} className="w-full aspect-square object-cover rounded-lg mb-2" />
									<p className="text-sm line-clamp-2">{item.title}</p>
								</Link>
							))}
						</div>
					</div>

					<div className="card-surface p-4 sm:p-5">
						<h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('home.topRated')}</h3>
						<div className="space-y-3">
							{topRated.map((item) => (
								<Link key={item.id} to={`/product/${item.id}`} className="flex items-center gap-3 border border-slate-100 rounded-xl p-2 hover:bg-slate-50">
									<img src={item.thumbnail} alt={item.title} className="w-14 h-14 rounded-lg object-cover" />
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">{item.title}</p>
										<p className="text-xs text-slate-500">⭐ {item.rating.toFixed(1)} • {item.brand}</p>
									</div>
								</Link>
							))}
						</div>
					</div>
				</div>
			</section>
		</div>
	)
} 