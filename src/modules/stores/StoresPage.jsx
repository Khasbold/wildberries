import { Link } from 'react-router-dom'
import { useStores } from '../state/useStores.js'
import { TIER_PLANS } from '../state/store.js'

const gradients = [
    'from-indigo-500 to-purple-600',
    'from-pink-500 to-rose-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-pink-600',
]

function StoreIcon({ name, index }) {
    const grad = gradients[index % gradients.length]
    return (
        <div className={`w-full aspect-[4/3] sm:aspect-square bg-gradient-to-br ${grad} rounded-t-2xl flex items-center justify-center`}>
            <span className="text-white text-3xl sm:text-5xl font-extrabold tracking-tighter select-none">
                {name?.slice(0, 2)?.toUpperCase() || 'ST'}
            </span>
        </div>
    )
}

const tierBadge = {
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    silver: 'bg-gray-100 text-gray-700 border-gray-300',
    bronze: 'bg-amber-100 text-amber-800 border-amber-300',
    free: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function StoresPage() {
    const { stores } = useStores()

    return (
        <div className="container-app py-4 sm:py-8">
            <h1 className="text-xl sm:text-2xl font-semibold mb-2">Stores</h1>
            <p className="text-sm sm:text-base text-slate-500 mb-6 sm:mb-8">Browse all available stores and explore their products</p>

            {stores.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <p className="text-lg">No stores available yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                    {stores.map((store, i) => {
                        const plan = TIER_PLANS[store.tier]
                        return (
                            <Link
                                key={store.id}
                                to={`/stores/${store.id}`}
                                className="group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <StoreIcon name={store.name} index={i} />
                                <div className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                                    <h2 className="font-semibold text-sm sm:text-lg leading-tight group-hover:text-brand transition-colors truncate">
                                        {store.name}
                                    </h2>
                                    <p className="text-sm text-slate-500">by {store.owner}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${tierBadge[store.tier]}`}>
                                            {plan?.name || 'Free'}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {store.productCount} {store.productCount === 1 ? 'product' : 'products'}
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
