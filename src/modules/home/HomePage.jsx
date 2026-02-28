import { Link } from 'react-router-dom'
import { products } from '../data/products.js'
import ProductCard from '../catalog/components/ProductCard.jsx'
import BannerAccordion from './components/BannerAccordion.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { translateCategory } from '../i18n/config.js'

export default function HomePage() {
	const { t, locale } = useI18n()
	const featured = products.slice(0, 8)
	const fresh = products.slice(4, 12)
	const topRated = [...products].sort((a, b) => b.rating - a.rating).slice(0, 6)
	const categories = [...new Set(products.map((p) => p.category))]

	return (
		<div className="space-y-8">
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

			<section id="featured" className="container-app pt-2">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold">{t('home.popularNow')}</h2>
					<Link to="/catalog" className="text-brand hover:underline">{t('home.seeAll')}</Link>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
					{featured.map((p) => (
						<ProductCard key={p.id} product={p} />
					))}
				</div>
			</section>

			<section className="container-app">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
					<div className="card-surface p-5 lg:col-span-2">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">{t('home.weekNew')}</h3>
							<Link to="/catalog?sort=rating_desc" className="text-brand text-sm hover:underline">{t('home.toCatalog')}</Link>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{fresh.slice(0, 8).map((item) => (
								<Link key={item.id} to={`/product/${item.id}`} className="rounded-xl border border-slate-200 p-2 hover:border-brand/50 transition-colors">
									<img src={item.thumbnail} alt={item.title} className="w-full aspect-square object-cover rounded-lg mb-2" />
									<p className="text-sm line-clamp-2">{item.title}</p>
								</Link>
							))}
						</div>
					</div>

					<div className="card-surface p-5">
						<h3 className="text-lg font-semibold mb-4">{t('home.topRated')}</h3>
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