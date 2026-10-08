import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStores } from '../state/useStores.js'
import { useI18n } from '../i18n/useI18n.js'
import { TIER_PLANS } from '../state/store.js'
import { Search, Heart, Crown } from 'lucide-react'
import { getPinnedStores } from './StoreDetailPage.jsx'

const gradients = [
    'from-[#D66B3E] to-[#b3552e]',
    'from-[#4B7F4D] to-[#3a663c]',
    'from-[#e08b5f] to-[#D66B3E]',
    'from-slate-500 to-slate-700',
    'from-[#6b9a6d] to-[#4B7F4D]',
    'from-[#D66B3E] to-[#4B7F4D]',
]

function StoreIcon({ name, index, image, tierKey, tierLabel, tierLabelShort }) {
    const grad = gradients[index % gradients.length]
    const st = tierBadgeStyle[tierKey] || tierBadgeStyle.free
    const pill = (
        <span className="absolute top-2 left-2 z-10 inline-flex max-w-[calc(100%-1rem)] items-stretch rounded-lg text-[10px] sm:text-xs font-bold border border-black/10 shadow-md overflow-hidden ring-1 ring-black/5">
            <span className={`shrink-0 px-2 py-1 font-extrabold uppercase tracking-wide ${st.left}`}>{tierLabelShort}</span>
            <span className={`truncate px-2 py-1 font-semibold min-w-0 ${st.right}`}>{tierLabel}</span>
        </span>
    )
    if (image) {
        return (
            <div className="img-zoom relative w-full aspect-[4/3] sm:aspect-square overflow-hidden rounded-t-2xl">
                {pill}
                <img src={image} alt={name} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" aria-hidden="true" />
            </div>
        )
    }
    return (
        <div className={`relative w-full aspect-[4/3] sm:aspect-square bg-gradient-to-br ${grad} rounded-t-2xl flex items-center justify-center`}>
            {pill}
            <span className="text-white text-3xl sm:text-5xl font-extrabold tracking-tighter select-none">
                {name?.slice(0, 2)?.toUpperCase() || 'ST'}
            </span>
        </div>
    )
}

/** Left cap + right label — distinct colors per tier */
const tierBadgeStyle = {
    gold: {
        left: 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white',
        right: 'bg-amber-50 text-amber-950 border-l border-amber-200/80',
    },
    silver: {
        left: 'bg-gradient-to-br from-slate-500 to-zinc-700 text-white',
        right: 'bg-slate-100 text-slate-900 border-l border-slate-300/80',
    },
    bronze: {
        left: 'bg-gradient-to-br from-orange-600 to-amber-900 text-white',
        right: 'bg-orange-50 text-orange-950 border-l border-orange-200/80',
    },
    free: {
        left: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white',
        right: 'bg-slate-50 text-slate-900 border-l border-slate-200/80',
    },
}

export default function StoresPage() {
    const { t } = useI18n()
    const { stores } = useStores()
    const [search, setSearch] = useState('')

    const filteredStores = useMemo(() => {
        const pinned = getPinnedStores()
        let list = stores
        if (search.trim()) {
            const q = search.toLowerCase().trim()
            list = list.filter((s) =>
                (s.name || '').toLowerCase().includes(q) ||
                (s.owner || '').toLowerCase().includes(q)
            )
        }
        // Sort pinned stores to top
        return [...list].sort((a, b) => {
            const ap = pinned.includes(a.id) ? 1 : 0
            const bp = pinned.includes(b.id) ? 1 : 0
            return bp - ap
        })
    }, [stores, search])

    return (
        <div className="container-app py-4 sm:py-8 animate-fade-in-up">
            <h1 className="section-title text-xl sm:text-2xl text-slate-900 mb-2">{t('stores.title')}</h1>
            <p className="text-sm sm:text-base text-slate-500 mb-4 sm:mb-6">{t('stores.subtitle')}</p>

            {/* Centered search filter */}
            <div className="flex justify-center mb-6 sm:mb-8">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('stores.searchPlaceholder')}
                        className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-soft focus:ring-2 focus:ring-[--brand-primary]/25 focus:border-[--brand-primary] focus:outline-none focus:shadow-card transition-all duration-200"
                    />
                </div>
            </div>

            {filteredStores.length === 0 ? (
                <div className="text-center py-16 sm:py-20 text-slate-400">
                    <p className="text-base sm:text-lg">{search.trim() ? t('stores.noSearchResults') : t('stores.noStores')}</p>
                    {search.trim() && <p className="text-sm mt-2">{t('stores.tryDifferent')}</p>}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
                    {filteredStores.map((store, i) => {
                        const plan = TIER_PLANS[store.tier]
                        const tierName = plan?.name || 'Free'
                        const pinned = getPinnedStores().includes(store.id)
                        const isGold = store.tier === 'gold'
                        return (
                            <Link
                                key={store.id}
                                to={`/stores/${store.slug}`}
                                className={`group relative rounded-2xl border bg-white shadow-card overflow-hidden hover-lift hover:shadow-card-hover transition-all duration-300 active:scale-[0.98] ${
                                    isGold ? 'border-yellow-400 ring-2 ring-yellow-300/50 shadow-yellow-200/40 shadow-lg hover:shadow-yellow-300/50' :
                                    pinned ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200 hover:border-[--brand-primary]/30'
                                }`}
                            >
                                {isGold && (
                                    <div className="absolute inset-0 rounded-2xl pointer-events-none z-[5] bg-gradient-to-br from-yellow-400/10 via-transparent to-amber-400/10" />
                                )}
                                <StoreIcon
                                    name={store.name}
                                    index={i}
                                    image={store.image}
                                    tierKey={store.tier}
                                    tierLabel={tierName}
                                    tierLabelShort={`${t('stores.tierLabel')}:`}
                                />
                                <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        <h2 className="font-semibold text-sm sm:text-lg leading-tight group-hover:text-[--brand-primary] transition-colors duration-200 truncate flex-1 min-w-0">
                                            {store.name}
                                        </h2>
                                        {isGold && <Crown size={14} className="text-yellow-500 shrink-0" />}
                                        {pinned && <Heart size={14} className="text-rose-500 fill-current shrink-0" />}
                                    </div>
                                    <p className="text-sm text-slate-500">by {store.owner}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="badge">
                                            {store.productCount} {store.productCount === 1 ? t('stores.product') : t('stores.products')}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
