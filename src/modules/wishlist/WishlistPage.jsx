import { products } from '../data/products.js'
import { useWishlist } from '../state/useWishlist.js'
import ProductCard from '../catalog/components/ProductCard.jsx'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'

export default function WishlistPage() {
	const { t } = useI18n()
	const { ids } = useWishlist()
	const items = products.filter((p) => ids.includes(p.id))

	return (
		<div className="container-app py-8">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold">{t('wishlist.title')}</h1>
				{items.length > 0 && <p className="text-sm text-slate-600">{t('wishlist.saved', { count: items.length })}</p>}
			</div>
			{items.length === 0 ? (
				<div className="card-surface p-6">
					<p>{t('wishlist.empty')}</p>
					<Link to="/catalog" className="inline-block mt-3 btn-primary">{t('wishlist.toCatalog')}</Link>
				</div>
			) : (
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
					{items.map((p) => (
						<ProductCard key={p.id} product={p} />
					))}
				</div>
			)}
		</div>
	)
} 