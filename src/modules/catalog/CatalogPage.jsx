import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { categories, products } from '../data/products.js'
import ProductCard from './components/ProductCard.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { translateCategory } from '../i18n/config.js'

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

const ALL_COLORS = [...new Set(products.flatMap((p) => p.colors || []))]
	.sort((a, b) => ((COLOR_NAMES[a]?.en) || a).localeCompare((COLOR_NAMES[b]?.en) || b))

const ALL_BRANDS = [...new Set(products.map((p) => p.brand))].sort()

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

const PAGE_SIZE = 8

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
	const { t, locale } = useI18n()
	const navigate = useNavigate()
	const q = useQuery()
	const term = (q.get('q') || '').toLowerCase()
	const cat = q.get('cat') || 'All'
	const sort = q.get('sort') || 'default'
	const min = Number(q.get('min') || 0)
	const max = Number(q.get('max') || 0)
	const minRating = Number(q.get('rating') || 0)
	const fast = q.get('fast') === '1'
	const stockOnly = q.get('stock') === '1'
	const color = q.get('color') || ''
	const brand = q.get('brand') || ''
	const status = q.get('status') || ''
	const page = Math.max(1, parseInt(q.get('page') || '1', 10))

	const [showFilters, setShowFilters] = useState(false)
	const [priceMin, setPriceMin] = useState(min || '')
	const [priceMax, setPriceMax] = useState(max || '')

	function formatCurrency(n) {
		try {
			return new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 0 }).format(Math.round(n)) + '₮'
		} catch {
			return `${Math.round(n)}₮`
		}
	}

	/* Compute category counts from products matching current search term */
	const categoryCounts = useMemo(() => {
		const counts = {}
		const base = products.filter((p) => !term || p.title.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term))
		for (const c of categories.filter((c) => c !== 'All')) {
			counts[c] = base.filter((p) => p.category === c).length
		}
		return counts
	}, [term])

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
	}, [term, cat])

	/* Price bounds */
	const priceBounds = useMemo(() => {
		const prices = products.map((p) => p.price)
		return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
	}, [])

	const filtered = products.filter((p) => {
		const matchTerm = !term || p.title.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)
		const matchCat = cat === 'All' || p.category === cat
		const matchMin = !min || p.price >= min
		const matchMax = !max || p.price <= max
		const matchRating = !minRating || p.rating >= minRating
		const matchFast = !fast || p.fastDelivery
		const matchStock = !stockOnly || p.inStock
		const matchColor = !color || (p.colors && p.colors.includes(color))
		const matchBrand = !brand || p.brand === brand
		const matchStatus = !status ||
			(status === 'fast' && p.fastDelivery) ||
			(status === 'discount' && true) ||
			(status === 'new' && p.inStock && p.stockQuantity > 20)
		return matchTerm && matchCat && matchMin && matchMax && matchRating && matchFast && matchStock && matchColor && matchBrand && matchStatus
	})

	const sorted = sortProducts(filtered, sort)
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
	const currentPage = Math.min(page, totalPages)
	const start = (currentPage - 1) * PAGE_SIZE
	const visible = sorted.slice(start, start + PAGE_SIZE)

	function buildUrl(params) {
		const p = new URLSearchParams({
			cat,
			sort,
			page: String(currentPage),
			...(term ? { q: term } : {}),
			...(min ? { min: String(min) } : {}),
			...(max ? { max: String(max) } : {}),
			...(minRating ? { rating: String(minRating) } : {}),
			...(fast ? { fast: '1' } : {}),
			...(stockOnly ? { stock: '1' } : {}),
			...(color ? { color } : {}),
			...(brand ? { brand } : {}),
			...(status ? { status } : {}),
			...params,
		})
		return `/catalog?${p.toString()}`
	}

	function setParam(updates) {
		navigate(buildUrl({ ...updates, page: '1' }))
	}

	return (
		<div className="container-app py-4 sm:py-8">
			<div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
				<h1 className="text-xl sm:text-2xl font-semibold">{t('catalog.title')}{cat !== 'All' ? ` — ${translateCategory(cat, locale)}` : ''}</h1>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 sm:gap-5">
				<aside className="h-max lg:sticky lg:top-40">
					{/* Mobile toggle */}
					<button className="w-full flex items-center justify-between lg:hidden bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3" onClick={() => setShowFilters((v) => !v)}>
						<span className="font-semibold text-sm">{t('catalog.filters')}</span>
						<span className="text-slate-400 text-sm">{showFilters ? '▲' : '▼'}</span>
					</button>
					<div className={`bg-white border border-slate-200 rounded-xl p-4 space-y-1 ${showFilters ? '' : 'hidden lg:block'}`}>

					{/* ─── Category (Ангилал) ─── */}
					<FilterSection title={t('sideMenu.categories') || 'Category'}>
						<ul className="space-y-0.5">
							{categories.filter((c) => c !== 'All').map((c) => (
								<li key={c}>
									<button
										onClick={() => setParam({ cat: cat === c ? 'All' : c })}
										className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${cat === c ? 'bg-slate-100 font-semibold text-gray-900' : 'text-gray-600 hover:bg-slate-50'}`}
									>
										<span className="flex items-center gap-1.5">
											<svg className={`w-3 h-3 transition-transform ${cat === c ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
											{translateCategory(c, locale)}
										</span>
										<span className="text-xs text-gray-400">{categoryCounts[c] || 0}</span>
									</button>
								</li>
							))}
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
										<input type="checkbox" className="rounded border-gray-300" checked={false} readOnly />
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
								{ label: locale === 'mn' ? 'Онцгой санал' : locale === 'ru' ? 'Спецпредложение' : 'Special offer', value: 'fast' },
								{ label: locale === 'mn' ? 'Хямдрал' : locale === 'ru' ? 'Скидка' : 'Discount', value: 'discount' },
								{ label: locale === 'mn' ? 'Шинээр ирсэн' : locale === 'ru' ? 'Новинки' : 'New arrivals', value: 'new' },
							].map((s) => (
								<li key={s.value}>
									<label className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-slate-50 cursor-pointer">
										<input
											type="checkbox"
											className="rounded border-gray-300"
											checked={status === s.value}
											onChange={() => setParam({ status: status === s.value ? '' : s.value })}
										/>
										<span className="flex-1">{s.label}</span>
										<span className="text-xs text-gray-400">
											{s.value === 'fast' ? products.filter((p) => p.fastDelivery).length : s.value === 'new' ? products.filter((p) => p.inStock && p.stockQuantity > 20).length : products.length}
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
										className={`w-8 h-8 rounded-lg border-2 transition-all ${isSelected ? 'border-gray-900 ring-2 ring-gray-300 scale-110' : 'border-gray-200 hover:border-gray-400'}`}
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
											className="rounded border-gray-300"
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
											className="border-gray-300"
											checked={String(minRating) === r.value}
											onChange={() => setParam({ rating: String(minRating) === r.value ? '0' : r.value })}
										/>
										<span className="text-amber-400 text-xs">{r.label}</span>
									</label>
								</li>
							))}
						</ul>
					</FilterSection>

					{/* ─── Price (Үнэ) ─── */}
					<FilterSection title={locale === 'mn' ? 'Үнэ' : locale === 'ru' ? 'Цена' : 'Price'}>
						<div className="space-y-3 px-1">
							<div className="flex items-center justify-between text-sm text-gray-500">
								<span>{formatCurrency(min || priceBounds.min)}</span>
								<span>{formatCurrency(max || priceBounds.max)}</span>
							</div>
							{/* Range track visual */}
							<div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
								<div
									className="absolute h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
									style={{
										left: `${((min || priceBounds.min) - priceBounds.min) / (priceBounds.max - priceBounds.min) * 100}%`,
										right: `${100 - ((max || priceBounds.max) - priceBounds.min) / (priceBounds.max - priceBounds.min) * 100}%`,
									}}
								/>
							</div>
							<div className="flex gap-2">
								<input
									type="number"
									placeholder={t('catalog.minPrice')}
									value={priceMin}
									onChange={(e) => setPriceMin(e.target.value)}
									onBlur={() => setParam({ min: priceMin || '' })}
									onKeyDown={(e) => e.key === 'Enter' && setParam({ min: priceMin || '' })}
									className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"
								/>
								<input
									type="number"
									placeholder={t('catalog.maxPrice')}
									value={priceMax}
									onChange={(e) => setPriceMax(e.target.value)}
									onBlur={() => setParam({ max: priceMax || '' })}
									onKeyDown={(e) => e.key === 'Enter' && setParam({ max: priceMax || '' })}
									className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm"
								/>
							</div>
						</div>
					</FilterSection>

					{/* Extra toggles */}
					<div className="pt-2 space-y-2">
						<label className="flex items-center gap-2 text-sm text-gray-600 px-2 cursor-pointer">
							<input type="checkbox" className="rounded border-gray-300" checked={fast} onChange={(e) => setParam({ fast: e.target.checked ? '1' : '' })} />
							{t('catalog.fastDelivery')}
						</label>
						<label className="flex items-center gap-2 text-sm text-gray-600 px-2 cursor-pointer">
							<input type="checkbox" className="rounded border-gray-300" checked={stockOnly} onChange={(e) => setParam({ stock: e.target.checked ? '1' : '' })} />
							{t('common.inStockOnly')}
						</label>
					</div>

					{/* Reset */}
					<button onClick={() => { setPriceMin(''); setPriceMax(''); navigate('/catalog') }} className="w-full mt-3 text-sm text-brand hover:underline py-2">
						{t('common.resetFilters')}
					</button>

					</div>
				</aside>

				<div>
					<div className="flex items-center justify-between gap-3 mb-4">
						<p className="text-sm text-slate-600">{t('catalog.productsCount', { count: filtered.length })}</p>
						<div className="flex items-center gap-2">
							<span className="text-sm text-slate-600">{t('catalog.sort')}</span>
							<select
								className="border border-slate-200 rounded-xl px-2 py-1.5 text-sm"
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
						<p>{t('catalog.noResults')}</p>
					) : (
						<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
							{visible.map((p) => (
								<div key={p.id} className="relative">
									{p.fastDelivery && <span className="absolute z-10 left-2 top-2 badge bg-emerald-100 text-emerald-700">{t('catalog.tomorrowTag')}</span>}
									<ProductCard product={p} />
								</div>
							))}
						</div>
					)}

					{totalPages > 1 && (
						<div className="mt-6 flex items-center justify-center gap-2">
							{Array.from({ length: totalPages }).map((_, idx) => {
								const num = idx + 1
								return (
									<Link
										key={num}
										to={buildUrl({ page: String(num) })}
										className={`badge ${num === currentPage ? 'bg-brand text-white' : ''}`}
									>
										{num}
									</Link>
								)
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	)
} 