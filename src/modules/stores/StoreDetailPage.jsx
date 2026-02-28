import { useParams, Link } from 'react-router-dom'
import { useStores } from '../state/useStores.js'
import ProductCard from '../catalog/components/ProductCard.jsx'

export default function StoreDetailPage() {
    const { storeId } = useParams()
    const { getStoreById, getStoreProducts } = useStores()
    const store = getStoreById(storeId)
    const products = getStoreProducts(storeId)

    if (!store) {
        return (
            <div className="container-app py-20 text-center">
                <h1 className="text-2xl font-semibold mb-2">Store Not Found</h1>
                <p className="text-slate-500 mb-6">This store does not exist or has been removed.</p>
                <Link to="/stores" className="btn-primary">Back to Stores</Link>
            </div>
        )
    }

    return (
        <div className="container-app py-4 sm:py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
                <Link to="/stores" className="hover:text-brand transition-colors">Stores</Link>
                <span>/</span>
                <span className="text-slate-900 font-medium">{store.name}</span>
            </div>

            {/* Store header */}
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl font-extrabold shrink-0">
                    {store.name?.slice(0, 2)?.toUpperCase() || 'ST'}
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold">{store.name}</h1>
                    <p className="text-slate-500 text-sm">by {store.owner} · {products.length} {products.length === 1 ? 'product' : 'products'}</p>
                </div>
            </div>

            {/* Products grid */}
            {products.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <p className="text-lg">This store has no products yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    )
}
