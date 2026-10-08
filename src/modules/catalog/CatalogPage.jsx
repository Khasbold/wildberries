import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { subscribe, getState } from '../state/store.js'
import ProductCard from './components/ProductCard.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { translateCategory } from '../i18n/config.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { fuzzySearchRanked } from '../../utils/fuzzySearch.js'
import { SkeletonGrid } from '../layout/components/Skeleton.jsx'
import SEO from '../layout/components/SEO.jsx'

const COLOR_NAMES = {
	'#FFFFFF': { en: 'White', ru: 'Белый', mn: 'Цагаан' },
	'#000000': { en: 'Black', ru: 'Чёрный', mn: 'Хар' },
	'#3B82F6': { en: 'Blue', ru: 'Синий', mn: 'Цэнхэр' },
	'#1D4ED8': { en: 'Navy Blue', ru: 'Тёмно-синий', mn: 'Хөх' },
	'#1F2937': { en: 'Dark Gray', ru: 'Тёмно-серый', mn: 'Бараан саарал' },
	'#6B7280': { en: 'Gray', ru: 'Серый', mn: 'Саарал' },
	'#4B5563': { en: 'Slate', ru: 'Сланец', mn: 'Бүдэг' },
	'#374151': { en: 'Charcoal', ru: 'Угольный', mn: 'Нүүрсэн' },
	'#DC2626': { en: 'Red', ru: 'Красный', mn: 'Улаан' },
	'#EF4444': { en: 'Light Red', ru: 'Светло-красный', mn: 'Цайвар улаан' },
	'#92400E': { en: 'Brown', ru: 'Коричневый', mn: 'Бор' },
	'#D4A373': { en: 'Tan', ru: 'Бежевый', mn: 'Шаргал' },
}

function useCatalogProducts() {
	const state = useSyncExternalStore(subscribe, getState)
	// Get disabled store IDs to filter their products out
	const disabledStoreIds = useMemo(() => {
		return new Set((state.adminUsers || []).filter((u) => u.disabled).map((u) => u.storeId))
	}, [state.adminUsers])
	const products = (state.adminProducts || []).filter((p) => {
		if ((p.approvalStatus && p.approvalStatus !== 'approved') || p.isDraft === true) return false
		if (p.storeId && disabledStoreIds.has(p.storeId)) return false
		return true
	})
	const productViews = state.productViews || {}
	const rawCategories = state.adminCategories || []
	const categories = useMemo(() => ['All', ...rawCategories.map((c) => c.name)], [rawCategories])
	const allColors = useMemo(
		() => [...new Set(products.flatMap((p) => p.colors || []))].sort((a, b) => ((COLOR_NAMES[a]?.en) || a).localeCompare((COLOR_NAMES[b]?.en) || b)),
		[products],
	)
	const allBrands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(), [products])
	return { products, categories, rawCategories, allColors, allBrands, productViews }
}

function getColorName(hex, locale) {
	const names = COLOR_NAMES[hex]
	return names ? (names[locale] || names.en) : hex
}

/* Collapsible filter section */
function FilterSection({ title, defaultOpen = true, children }) {
	const [open, setOpen] = useState(defaultOpen)
	return (
		<div className="border-b border-slate-100 pb-3">
			<button
				onClick={() => setOpen((v) => !v)}
				className="w-full flex items-center justify-between py-2 text-sm font-bold text-gray-900 hover:text-brand transition-colors"
			>
				{title}
				<svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
			</button>
			{open && <div className="mt-1">{children}</div>}
		</div>
	)
}

function useQuery() {
	const { search } = useLocation()
	return useMemo(() => new URLSearchParams(search), [search])
}

const PAGE_CHUNK = 12

function sortProducts(list, sortKey) {
	switch (sortKey) {
		case 'price_asc':
			return [...list].sort((a, b) => a.price - b.price)
		case 'price_desc':
			return [...list].sort((a, b) => b.price - a.price)
		case 'rating_desc':
			return [...list].sort((a, b) => b.rating - a.rating)
		default:
			return list
	}
}

export default function CatalogPage() {
	const { products, categories, rawCategories, allColors: ALL_COLORS, allBrands: ALL_BRANDS, productViews } = useCatalogProducts()
	const { t, locale } = useI18n()
	const navigate = useNavigate()
	const q = useQuery()
	const term = (q.get('q') || '').toLowerCase()
	const cat = q.get('cat') || 'All'
	const sort = q.get('sort') || 'default'
	const min = Number(q.get('min') || 0)
	const max = Number(q.get('max') || 0)
	const minRating = Number(q.get('rating') || 0)
	const stockOnly = q.get('stock') === '1'
	const color = q.get('color') || ''
	const brand = q.get('brand') || ''
	const status = q.get('status') || ''

	const [showFilters, setShowFilters] = useState(false)
	const [visibleCount, setVisibleCount] = useState(PAGE_CHUNK)
	const loadSentinelRef = useRef(null)
	const filterKey = useMemo(
		() => [term, cat, sort, min, max, minRating, stockOnly, color, brand, status].join('|'),
		[term, cat, sort, min, max, minRating, stockOnly, color, brand, status],
	)

	useEffect(() => {
		setVisibleCount(PAGE_CHUNK)
	}, [filterKey])
	const [priceMin, setPriceMin] = useState(min || '')
	const [priceMax, setPriceMax] = useState(max || '')
	const [sliderMin, setSliderMin] = useState(min || 0)
	const [sliderMax, setSliderMax] = useState(max || 0)

	/* Compute category counts from products matching current search term */
	const categoryCounts = useMemo(() => {
		const counts = {}
		const base = products.filter((p) => !term || p.title.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term))
		for (const c of categories.filter((c) => c !== 'All')) {
			counts[c] = base.filter((p) => p.category === c).length
		}
		return counts
	}, [term, products, categories])

	/* Build hierarchical category tree sorted by product count (desc), 0-count at bottom */
	const categoryTree = useMemo(() => {
		const parents = rawCategories.filter((c) => !c.parentId)
		const childrenMap = {}
		for (const c of rawCategories) {
			if (c.parentId) {
				if (!childrenMap[c.parentId]) childrenMap[c.parentId] = []
				childrenMap[c.parentId].push(c)
			}
		}
		// Count includes self + children
		const parentCount = (p) => {
			const selfCount = categoryCounts[p.name] || 0
			const kidCount = (childrenMap[p.id] || []).reduce((sum, ch) => sum + (categoryCounts[ch.name] || 0), 0)
			return selfCount + kidCount
		}
		// Sort parents: those with products first (desc), then 0-count (asc name)
		const sorted = [...parents].sort((a, b) => {
			const ca = parentCount(a)
			const cb = parentCount(b)
			if (ca > 0 && cb === 0) return -1
			if (cb > 0 && ca === 0) return 1
			if (ca !== cb) return cb - ca
			return a.name.localeCompare(b.name)
		})
		return sorted.map((p) => ({
			...p,
			totalCount: parentCount(p),
			children: (childrenMap[p.id] || []).sort((a, b) => {
				const ca = categoryCounts[a.name] || 0
				const cb = categoryCounts[b.name] || 0
				if (ca > 0 && cb === 0) return -1
				if (cb > 0 && ca === 0) return 1
				if (ca !== cb) return cb - ca
				return a.name.localeCompare(b.name)
			}),
		}))
	}, [rawCategories, categoryCounts])

	/* Compute brand counts */
	const brandCounts = useMemo(() => {
		const counts = {}
		const base = products.filter((p) => {
			const matchTerm = !term || p.title.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)
			const matchCat = cat === 'All' || p.category === cat
			return matchTerm && matchCat
		})
		for (const b of ALL_BRANDS) {
			counts[b] = base.filter((p) => p.brand === b).length
		}
		return counts
	}, [term, cat, products, ALL_BRANDS])

	/* Price bounds */
	const priceBounds = useMemo(() => {
		const prices = products.map((p) => p.price).filter((n) => Number.isFinite(n))
		if (prices.length === 0) return { min: 0, max: 1000 }
		return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
	}, [products])

	const fuzzyFiltered = useMemo(
		() => (term ? fuzzySearchRanked(products, term, { viewCounts: productViews }) : products),
		[products, term, productViews],
	)

	const filtered = fuzzyFiltered.filter((p) => {
		const matchTerm = true // already handled by fuzzySearch
		const matchCat = cat === 'All' || p.category === cat
		const matchMin = !min || p.price >= min
		const matchMax = !max || p.price <= max
		const matchRating = !minRating || p.rating >= minRating
		const matchStock = !stockOnly || p.inStock
		const matchColor = !color || (p.colors && p.colors.includes(color))
		const matchBrand = !brand || p.brand === brand
		const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
		const pMs = (() => { const ts = p.updatedAt || p.createdAt; return (typeof ts?.toMillis === 'function' ? ts.toMillis() : null) ?? (ts instanceof Date ? ts.getTime() : ts ? new Date(ts).getTime() : 0) })()
		const matchStatus = !status ||
			(status === 'ready' && p.productType !== 'order') ||
			(status === 'order' && p.productType === 'order') ||
			(status === 'discount' && p.originalPrice && p.originalPrice > p.price) ||
			(status === 'new' && pMs >= oneWeekAgo)
		return matchTerm && matchCat && matchMin && matchMax && matchRating && matchStock && matchColor && matchBrand && matchStatus
	})

	const sorted = sortProducts(filtered, sort)
	const visible = sorted.slice(0, visibleCount)
	const hasMore = visibleCount < sorted.length

	function buildUrl(params) {
		const p = new URLSearchParams({
			cat,
			sort,
			...(term ? { q: term } : {}),
			...(min ? { min: String(min) } : {}),
			...(max ? { max: String(max) } : {}),
			...(minRating ? { rating: String(minRating) } : {}),
			...(stockOnly ? { stock: '1' } : {}),
			...(color ? { color } : {}),
			...(brand ? { brand } : {}),
			...(status ? { status } : {}),
			...params,
		})
		return `/catalog?${p.toString()}`
	}

	function setParam(updates) {
		navigate(buildUrl({ ...updates }))
	}

	useEffect(() => {
		const el = loadSentinelRef.current
		if (!el || sorted.length === 0 || !hasMore) return
		const io = new IntersectionObserver(
			(entries) => {
				if (!entries[0]?.isIntersecting) return
				setVisibleCount((c) => (c >= sorted.length ? c : Math.min(c + PAGE_CHUNK, sorted.length)))
			},
			{ root: null, rootMargin: '160px', threshold: 0 },
		)
		io.observe(el)
		return () => io.disconnect()
	}, [filterKey, sorted.length, hasMore])

	if (products.length === 0) {
		return <SkeletonGrid count={12} />
	}

	return (
		<div className="container-app py-6 sm:py-10">
			<SEO title={cat !== 'All' ? `${translateCategory(cat, locale)} — Каталог` : 'Каталог'} description={`${filtered.length} бараа Bunny каталогт`} />
			<div className="mb-6 sm:mb-8 animate-fade-in-down">
				<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('catalog.title')}{cat !== 'All' ? ` — ${translateCategory(cat, locale)}` : ''}</h1>
				<p className="text-slate-500 mt-1">{t('catalog.productsCount', { count: filtered.length })}</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8">
				<aside className="h-max lg:sticky lg:top-28">
					{/* Mobile toggle */}
					<button className="w-full flex items-center justify-between lg:hidden card-surface px-4 py-3.5 mb-4 active:scale-[0.98] transition-transform duration-200 focus-ring" onClick={() => setShowFilters((v) => !v)}>
						<span className="font-semibold text-slate-900">{t('catalog.filters')}</span>
						<span className="text-slate-400 text-sm">{showFilters ? '▲' : '▼'}</span>
					</button>
					<div className={`card-surface p-5 space-y-1 ${showFilters ? '' : 'hidden lg:block'}`}>

					{/* ─── Category (Ангилал) ─── */}
					<FilterSection title={t('sideMenu.categories') || 'Category'}>
						<ul className="space-y-0.5">
							{categoryTree.map((parent) => {
								const isParentSelected = cat === parent.name
								const hasChildren = parent.children.length > 0
								const isAnyChildSelected = parent.children.some((ch) => cat === ch.name)
								const isOpen = isParentSelected || isAnyChildSelected
								return (
									<li key={parent.id}>
										<button
											onClick={() => setParam({ cat: cat === parent.name ? 'All' : parent.name })}
											className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${isParentSelected ? 'bg-[#F7E9D7]/70 dark:bg-slate-700 font-semibold text-[#D66B3E] dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
										>
											<span className="flex items-center gap-1.5">
												<svg className={`w-3 h-3 transition-transform ${isParentSelected ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
												{translateCategory(parent.name, locale)}
											</span>
											<span className="text-xs text-gray-400">{parent.totalCount}</span>
										</button>
										{hasChildren && isOpen && (
											<ul className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-200 dark:border-slate-600 pl-2">
												{parent.children.map((child) => (
													<li key={child.id}>
														<button
															onClick={() => setParam({ cat: cat === child.name ? 'All' : child.name })}
															className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-colors ${cat === child.name ? 'bg-[#F7E9D7]/70 dark:bg-slate-700 font-semibold text-[#D66B3E] dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
														>
															<span>{translateCategory(child.name, locale)}</span>
															<span className="text-[10px] text-gray-400">{categoryCounts[child.name] || 0}</span>
														</button>
													</li>
												))}
											</ul>
										)}
									</li>
								)
							})}
						</ul>
					</FilterSection>

					{/* ─── Discount (Хямдрал) ─── */}
					<FilterSection title={locale === 'mn' ? 'Хямдрал' : locale === 'ru' ? 'Скидка' : 'Discount'}>
						<ul className="space-y-1">
							{[
								{ label: locale === 'mn' ? '10% хүртэлх' : locale === 'ru' ? 'До 10%' : 'Up to 10%', value: '10' },
								{ label: locale === 'mn' ? '20% - 30%' : locale === 'ru' ? '20% - 30%' : '20% - 30%', value: '20-30' },
							].map((d) => (
								<li key={d.value}>
									<label className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-slate-50 cursor-pointer">
										<input type="checkbox" className="rounded border-gray-300 accent-[--brand-primary]" checked={false} readOnly />
										<span className="flex-1">{d.label}</span>
										<span className="text-xs text-gray-400">{d.value === '10' ? Math.min(3, filtered.length) : Math.min(2, filtered.length)}</span>
									</label>
								</li>
							))}
						</ul>
					</FilterSection>

					{/* ─── Status (Төлөв) ─── */}
					<FilterSection title={locale === 'mn' ? 'Төлөв' : locale === 'ru' ? 'Статус' : 'Status'}>
						<ul className="space-y-1">
							{[
								{ label: locale === 'mn' ? 'Бэлэн' : locale === 'ru' ? 'Готовые' : 'Ready', value: 'ready', icon: '✓' },
								{ label: locale === 'mn' ? 'Захиалгат' : locale === 'ru' ? 'Под заказ' : 'Custom order', value: 'order', icon: '⏳' },
								{ label: locale === 'mn' ? 'Хямдралтай' : locale === 'ru' ? 'Скидка' : 'Discount', value: 'discount', icon: '%' },
								{ label: locale === 'mn' ? 'Энэ долоо хоногт шинэ' : locale === 'ru' ? 'Новинки недели' : 'New this week', value: 'new', icon: '🆕' },
							].map((s) => (
								<li key={s.value}>
									<label className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-slate-50 cursor-pointer">
										<input
											type="checkbox"
											className="rounded border-gray-300 accent-[--brand-primary]"
											checked={status === s.value}
											onChange={() => setParam({ status: status === s.value ? '' : s.value })}
										/>
										<span className="flex-1 flex items-center gap-1"><span className="text-xs">{s.icon}</span> {s.label}</span>
										<span className="text-xs text-gray-400">
											{s.value === 'ready' ? products.filter((p) => p.productType !== 'order').length : s.value === 'order' ? products.filter((p) => p.productType === 'order').length : s.value === 'discount' ? products.filter((p) => p.originalPrice && p.originalPrice > p.price).length : s.value === 'new' ? (() => { const wk = Date.now() - 7*24*60*60*1000; return products.filter((p) => { const ts = p.updatedAt || p.createdAt; const ms = (typeof ts?.toMillis === 'function' ? ts.toMillis() : null) ?? (ts instanceof Date ? ts.getTime() : ts ? new Date(ts).getTime() : 0); return ms >= wk }).length })() : products.length}
										</span>
									</label>
								</li>
							))}
						</ul>
					</FilterSection>

					{/* ─── Color (Ерөнхий өнгө) ─── */}
					<FilterSection title={locale === 'mn' ? 'Ерөнхий өнгө' : locale === 'ru' ? 'Цвет' : 'Color'}>
						<div className="flex flex-wrap gap-2 px-1 py-1">
							{ALL_COLORS.map((hex) => {
								const isSelected = color === hex
								return (
									<button
										key={hex}
										onClick={() => setParam({ color: isSelected ? '' : hex })}
										title={getColorName(hex, locale)}
										className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ease-spring hover:scale-110 active:scale-95 ${isSelected ? 'border-[#D66B3E] ring-2 ring-[#D66B3E]/30 scale-110 shadow-brand-sm' : 'border-gray-200 hover:border-[#D66B3E]/50'}`}
										style={{ backgroundColor: hex }}
									/>
								)
							})}
						</div>
						{color && (
							<p className="text-xs text-gray-500 mt-1 px-1">{getColorName(color, locale)}</p>
						)}
					</FilterSection>

					{/* ─── Brand / Type (Төрөл) ─── */}
					<FilterSection title={locale === 'mn' ? 'Төрөл' : locale === 'ru' ? 'Бренд' : 'Brand'}>
						<ul className="space-y-1">
							{ALL_BRANDS.map((b) => (
								<li key={b}>
									<label className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-slate-50 cursor-pointer">
										<input
											type="checkbox"
											className="rounded border-gray-300 accent-[--brand-primary]"
											checked={brand === b}
											onChange={() => setParam({ brand: brand === b ? '' : b })}
										/>
										<span className="flex-1 truncate">{b}</span>
										<span className="text-xs text-gray-400">{brandCounts[b] || 0}</span>
									</label>
								</li>
							))}
						</ul>
					</FilterSection>

					{/* ─── Rating (Үнэлгээ) ─── */}
					<FilterSection title={t('common.rating') || 'Rating'}>
						<ul className="space-y-1">
							{[
								{ label: '★★★★★  4.5+', value: '4.5' },
								{ label: '★★★★☆  4.0+', value: '4' },
								{ label: '★★★☆☆  3.0+', value: '3' },
							].map((r) => (
								<li key={r.value}>
									<label className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-slate-50 cursor-pointer">
										<input
											type="radio"
											name="rating"
											className="border-gray-300 accent-[--brand-primary]"
											checked={String(minRating) === r.value}
											onChange={() => setParam({ rating: String(minRating) === r.value ? '0' : r.value })}
										/>
										<span className="text-[#D66B3E] text-xs">{r.label}</span>
									</label>
								</li>
							))}
						</ul>
					</FilterSection>

					{/* ─── Price (Үнэ) — dual range slider ─── */}
					<FilterSection title={locale === 'mn' ? 'Үнэ' : locale === 'ru' ? 'Цена' : 'Price'}>
						<div className="space-y-4 px-1">
							<div className="flex items-center justify-between text-sm font-medium">
								<span className="text-[#D66B3E]">{formatCurrency(sliderMin || priceBounds.min)}</span>
								<span className="text-xs text-gray-400">—</span>
								<span className="text-[#D66B3E]">{formatCurrency(sliderMax || priceBounds.max)}</span>
							</div>
							{/* Dual range slider */}
							<div className="relative h-6 flex items-center">
								{/* Track background */}
								<div className="absolute inset-x-0 h-1.5 bg-gray-200 rounded-full" />
								{/* Active track highlight */}
								<div
									className="absolute h-1.5 bg-gradient-to-r from-[#D66B3E] to-[#c45d35] rounded-full"
									style={{
										left: `${priceBounds.max > priceBounds.min ? ((sliderMin || priceBounds.min) - priceBounds.min) / (priceBounds.max - priceBounds.min) * 100 : 0}%`,
										right: `${priceBounds.max > priceBounds.min ? 100 - ((sliderMax || priceBounds.max) - priceBounds.min) / (priceBounds.max - priceBounds.min) * 100 : 0}%`,
									}}
								/>
								{/* Min thumb */}
								<input
									type="range"
									min={priceBounds.min}
									max={priceBounds.max}
									step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 100))}
									value={sliderMin || priceBounds.min}
									onChange={(e) => {
										const v = Number(e.target.value)
										const maxV = sliderMax || priceBounds.max
										if (v <= maxV) setSliderMin(v)
									}}
									onMouseUp={() => setParam({ min: sliderMin > priceBounds.min ? String(sliderMin) : '' })}
									onTouchEnd={() => setParam({ min: sliderMin > priceBounds.min ? String(sliderMin) : '' })}
									className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#D66B3E] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#D66B3E] [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
									style={{ zIndex: 3 }}
								/>
								{/* Max thumb */}
								<input
									type="range"
									min={priceBounds.min}
									max={priceBounds.max}
									step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 100))}
									value={sliderMax || priceBounds.max}
									onChange={(e) => {
										const v = Number(e.target.value)
										const minV = sliderMin || priceBounds.min
										if (v >= minV) setSliderMax(v)
									}}
									onMouseUp={() => setParam({ max: sliderMax > 0 && sliderMax < priceBounds.max ? String(sliderMax) : '' })}
									onTouchEnd={() => setParam({ max: sliderMax > 0 && sliderMax < priceBounds.max ? String(sliderMax) : '' })}
									className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#4B7F4D] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#4B7F4D] [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
									style={{ zIndex: 4 }}
								/>
							</div>
						</div>
					</FilterSection>

					{/* Extra toggles */}
					<div className="pt-2 space-y-2">
						<label className="flex items-center gap-2 text-sm text-gray-600 px-2 cursor-pointer">
							<input type="checkbox" className="rounded border-gray-300 accent-[--brand-primary]" checked={stockOnly} onChange={(e) => setParam({ stock: e.target.checked ? '1' : '' })} />
							{t('common.inStockOnly')}
						</label>
					</div>

					{/* Reset */}
					<button onClick={() => { setPriceMin(''); setPriceMax(''); setSliderMin(0); setSliderMax(0); navigate('/catalog') }} className="w-full mt-3 text-sm text-brand hover:underline py-2">
						{t('common.resetFilters')}
					</button>

					</div>
				</aside>

				<div>
					<div className="flex items-center justify-between gap-3 mb-5">
						<div className="flex items-center gap-2">
							<span className="text-sm text-slate-500">{t('catalog.sort')}</span>
							<select
								className="border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700 bg-white shadow-soft hover:border-[#D66B3E]/40 focus:ring-2 focus:ring-brand/20 focus:border-brand focus:outline-none transition-all duration-200 cursor-pointer"
								value={sort}
								onChange={(e) => setParam({ sort: e.target.value })}
							>
								<option value="default">{t('catalog.popular')}</option>
								<option value="price_asc">{t('catalog.priceAsc')}</option>
								<option value="price_desc">{t('catalog.priceDesc')}</option>
								<option value="rating_desc">{t('catalog.byRating')}</option>
							</select>
						</div>
					</div>

					{visible.length === 0 ? (
						<div className="card-static p-12 text-center space-y-4 animate-fade-in-up">
							<div className="mx-auto w-20 h-20 rounded-full bg-[#F7E9D7]/70 flex items-center justify-center animate-pulse-soft">
								<svg className="w-9 h-9 text-[#D66B3E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
									<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
									<path strokeLinecap="round" strokeLinejoin="round" d="M8.5 11h5" />
								</svg>
							</div>
							<p className="text-slate-700 font-semibold text-lg">{t('catalog.noResults')}</p>
							<p className="text-slate-500 text-sm max-w-md mx-auto">{t('catalog.emptyHint')}</p>
							<div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
								<button
									type="button"
									onClick={() => {
										const p = new URLSearchParams()
										p.set('cat', 'All')
										p.set('sort', sort)
										if (term) p.set('q', term)
										navigate(`/catalog?${p.toString()}`)
									}}
									className="btn-outline text-sm px-5 py-2.5"
								>
									{t('catalog.clearOneFilter')}
								</button>
								{cat !== 'All' && (
									<Link
										to={`/catalog?cat=${encodeURIComponent(cat)}`}
										className="text-sm text-brand font-semibold hover:underline"
									>
										{t('catalog.browseCategory', { name: translateCategory(cat, locale) })}
									</Link>
								)}
							</div>
							<Link to="/catalog" className="btn-primary inline-block mt-2">{t('common.resetFilters')}</Link>
						</div>
					) : (
						<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
							{visible.map((p, i) => (
								<div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${(i % PAGE_CHUNK) * 40}ms` }}>
									<ProductCard product={p} />
								</div>
							))}
						</div>
					)}

					{(hasMore || sorted.length > PAGE_CHUNK) && (
						<div className="mt-8 flex flex-col items-center gap-4">
							{hasMore && (
								<button
									type="button"
									onClick={() => setVisibleCount((c) => Math.min(c + PAGE_CHUNK, sorted.length))}
									className="px-8 py-3 rounded-full border-2 border-[#D66B3E]/40 text-[#D66B3E] font-semibold hover:bg-[#F7E9D7]/80 hover:border-[#D66B3E] hover:shadow-brand-sm active:scale-[0.97] transition-all duration-200 ease-spring focus-ring"
								>
									{t('catalog.loadMore')}
								</button>
							)}
							{hasMore && <div ref={loadSentinelRef} className="h-1 w-full max-w-md shrink-0" aria-hidden="true" />}
							{!hasMore && sorted.length > PAGE_CHUNK && (
								<p className="text-sm text-slate-400">{t('catalog.endOfList')}</p>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
} 