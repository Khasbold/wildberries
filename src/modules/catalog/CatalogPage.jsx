import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { categories, products } from '../data/products.js'
import ProductCard from './components/ProductCard.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { translateCategory } from '../i18n/config.js'

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
	const page = Math.max(1, parseInt(q.get('page') || '1', 10))

	const [showFilters, setShowFilters] = useState(false)

	function formatCurrencyRub(n) {
		try {
			return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
		} catch {
			return `${Math.round(n)} ₽`
		}
	}

	const filtered = products.filter((p) => {
		const matchTerm = !term || p.title.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)
		const matchCat = cat === 'All' || p.category === cat
		const matchMin = !min || p.price >= min
		const matchMax = !max || p.price <= max
		const matchRating = !minRating || p.rating >= minRating
		const matchFast = !fast || p.fastDelivery
		const matchStock = !stockOnly || p.inStock
		return matchTerm && matchCat && matchMin && matchMax && matchRating && matchFast && matchStock
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
			...params,
		})
		return `/catalog?${p.toString()}`
	}

	function setParam(updates) {
		navigate(buildUrl({ ...updates, page: '1' }))
	}

	return (
		<div className="container-app py-4 sm:py-8">
			<div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
				<h1 className="text-xl sm:text-2xl font-semibold">{t('catalog.title')}</h1>
				<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap overflow-x-auto scrollbar-hide max-w-full">
					{categories.map((c) => (
						<Link
							key={c}
							to={buildUrl({ cat: c, page: '1' })}
							className={`badge whitespace-nowrap ${c === cat ? 'bg-brand text-white' : ''}`}
						>
							{translateCategory(c, locale)}
						</Link>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-5">
				<aside className="card-surface p-4 h-max lg:sticky lg:top-40 space-y-4">
					<button className="w-full flex items-center justify-between lg:pointer-events-none" onClick={() => setShowFilters((v) => !v)}>
						<p className="font-semibold">{t('catalog.filters')}</p>
						<span className="lg:hidden text-slate-400 text-sm">{showFilters ? '▲' : '▼'}</span>
					</button>
					<div className={`space-y-4 ${showFilters ? '' : 'hidden lg:block'}`}>
					<div className="space-y-2">
						<label className="text-sm text-slate-600">{t('catalog.minPrice')}</label>
						<input type="number" value={min || ''} onChange={(e) => setParam({ min: e.target.value || '' })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
					</div>
					<div className="space-y-2">
						<label className="text-sm text-slate-600">{t('catalog.maxPrice')}</label>
						<input type="number" value={max || ''} onChange={(e) => setParam({ max: e.target.value || '' })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
					</div>
					<div className="space-y-2">
						<label className="text-sm text-slate-600">{t('catalog.minRating')}</label>
						<select value={minRating} onChange={(e) => setParam({ rating: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
							<option value="0">{t('catalog.any')}</option>
							<option value="4">{t('catalog.from40')}</option>
							<option value="4.5">{t('catalog.from45')}</option>
						</select>
					</div>

					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={fast} onChange={(e) => setParam({ fast: e.target.checked ? '1' : '' })} />
						{t('catalog.fastDelivery')}
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={stockOnly} onChange={(e) => setParam({ stock: e.target.checked ? '1' : '' })} />
						{t('common.inStockOnly')}
					</label>

					<button onClick={() => navigate('/catalog')} className="btn-outline w-full">{t('common.resetFilters')}</button>
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