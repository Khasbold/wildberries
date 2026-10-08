import { useWishlist } from '../state/useWishlist.js'
import ProductCard from '../catalog/components/ProductCard.jsx'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { useSyncExternalStore } from 'react'
import { subscribe, getState } from '../state/store.js'

export default function WishlistPage() {
	const { t } = useI18n()
	const { ids } = useWishlist()
	const state = useSyncExternalStore(subscribe, getState)
	const products = state.adminProducts || []
	const items = products.filter((p) => ids.includes(p.id))

	return (
		<div className="container-app py-4 sm:py-8 animate-fade-in-up">
			<div className="flex items-center justify-between mb-4 sm:mb-6">
				<h1 className="section-title text-xl sm:text-2xl text-slate-900">{t('wishlist.title')}</h1>
				{items.length > 0 && <span className="badge-brand">{t('wishlist.saved', { count: items.length })}</span>}
			</div>
			{items.length === 0 ? (
				<div className="card-static rounded-3xl p-12 text-center max-w-lg mx-auto animate-scale-in">
					<div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[--bg-beige] flex items-center justify-center animate-float shadow-soft">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 text-[--brand-primary]" aria-hidden="true">
							<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
						</svg>
					</div>
					<p className="text-slate-600 text-lg mb-6">{t('wishlist.empty')}</p>
					<Link to="/catalog" className="btn-primary inline-block px-8 active:scale-[0.97]">{t('wishlist.toCatalog')}</Link>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
					{items.map((p) => (
						<ProductCard key={p.id} product={p} />
					))}
				</div>
			)}
		</div>
	)
} 