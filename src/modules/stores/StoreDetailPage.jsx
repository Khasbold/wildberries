import { useParams, Link } from 'react-router-dom'
import { useState, useSyncExternalStore } from 'react'
import { subscribe, getState } from '../state/store.js'
import { useStores } from '../state/useStores.js'
import { useI18n } from '../i18n/useI18n.js'
import { FaPhone } from 'react-icons/fa'
import { Heart } from 'lucide-react'
import ProductCard from '../catalog/components/ProductCard.jsx'
import SEO from '../layout/components/SEO.jsx'

const PINNED_STORES_KEY = 'wb_pinned_stores'

function getPinnedStores() {
    try { return JSON.parse(localStorage.getItem(PINNED_STORES_KEY) || '[]') } catch { return [] }
}

function togglePinnedStore(storeId) {
    const pinned = getPinnedStores()
    const idx = pinned.indexOf(storeId)
    if (idx >= 0) pinned.splice(idx, 1)
    else pinned.push(storeId)
    localStorage.setItem(PINNED_STORES_KEY, JSON.stringify(pinned))
    return pinned.includes(storeId)
}

export { getPinnedStores }

export default function StoreDetailPage() {
    const { storeId } = useParams()
    const { t } = useI18n()
    const { getStoreBySlug, getStoreProducts } = useStores()
    const store = getStoreBySlug(storeId)
    const allProducts = getStoreProducts(store?.id || storeId)
    const products = allProducts.filter((p) => !p.approvalStatus || p.approvalStatus === 'approved')

    const [isPinned, setIsPinned] = useState(() => getPinnedStores().includes(store?.id || storeId))

    const state = useSyncExternalStore(subscribe, getState)
    const resolvedStoreId = store?.id || storeId
    const storeOwner = (state.adminUsers || []).find((u) => u.storeId === resolvedStoreId)
    const storeTier = storeOwner?.tier || 'free'
    const showBanner = (storeTier === 'silver' || storeTier === 'gold') && storeOwner?.storeBannerImage

    if (!store) {
        return (
            <div className="container-app py-20 text-center">
                <h1 className="text-2xl font-semibold mb-2">{t('storeDetail.notFound')}</h1>
                <p className="text-slate-500 mb-6">{t('storeDetail.notFoundDesc')}</p>
                <Link to="/stores" className="btn-primary">{t('storeDetail.backToStores')}</Link>
            </div>
        )
    }

    return (
        <div className="container-app py-4 sm:py-8 animate-fade-in-up">
            <SEO
                title={store.name}
                description={`${store.name} — ${store.owner} · ${products.length} бүтээгдэхүүн`}
                image={store.image}
                url={typeof window !== 'undefined' ? `${window.location.origin}/share/store/${resolvedStoreId}` : ''}
            />
            {/* Store banner for silver/gold tiers */}
            {showBanner && (
                <div className="img-zoom relative aspect-[16/5] w-full overflow-hidden rounded-2xl mb-6 shadow-card-elevated">
                    <img
                        src={storeOwner.storeBannerImage}
                        alt={`${store.name} banner`}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" aria-hidden="true" />
                </div>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
                <Link to="/stores" className="hover:text-[--brand-primary] transition-colors duration-200">{t('common.stores')}</Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-medium">{store.name}</span>
            </div>

            {/* Store header */}
            <div className="card-static rounded-2xl bg-gradient-to-r from-[--bg-beige]/50 to-white p-4 sm:p-5 flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                {store.image ? (
                    <img src={store.image} alt={store.name} className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl object-cover shrink-0 ring-2 ring-white shadow-card" />
                ) : (
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-[#D66B3E] to-[#4B7F4D] flex items-center justify-center text-white text-xl sm:text-2xl font-extrabold shrink-0 ring-2 ring-white shadow-card">
                        {store.name?.slice(0, 2)?.toUpperCase() || 'ST'}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="section-title text-xl sm:text-2xl text-slate-900 truncate">{store.name}</h1>
                        <button
                            type="button"
                            onClick={() => {
                                const result = togglePinnedStore(store.id)
                                setIsPinned(result)
                            }}
                            className={`shrink-0 p-1.5 rounded-full transition-all duration-200 active:scale-[0.9] ${isPinned ? 'text-rose-500 bg-rose-50 hover:bg-rose-100 shadow-soft' : 'text-slate-300 hover:text-rose-400 hover:bg-white'}`}
                            title={isPinned ? 'Хадгалсан дэлгүүрээс хасах' : 'Дэлгүүр хадгалах'}
                        >
                            <Heart size={18} className={isPinned ? 'fill-current' : ''} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                        <p className="text-slate-500 text-sm">by {store.owner}</p>
                        <span className="badge-brand">{products.length} {products.length === 1 ? t('stores.product') : t('stores.products')}</span>
                    </div>
                    {store.showPhoneOnStore && store.storePhone && (
                        <p className="text-slate-600 text-sm mt-1.5 flex items-center gap-1.5">
                            <FaPhone className="text-xs text-slate-400" />
                            <a href={`tel:${store.storePhone}`} className="hover:text-[--brand-primary] transition-colors duration-200">{store.storePhone}</a>
                        </p>
                    )}
                </div>
            </div>

            {/* Products grid - 6 columns */}
            {products.length === 0 ? (
                <div className="card-static rounded-3xl text-center py-16 text-slate-400">
                    <p className="text-lg">{t('storeDetail.noProducts')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    )
}
