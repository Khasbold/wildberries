import { NavLink } from 'react-router-dom'
import { Home, LayoutGrid, ShoppingBag, Heart, User } from 'lucide-react'
import { useCart } from '../../state/useCart.js'
import { useWishlist } from '../../state/useWishlist.js'
import { useI18n } from '../../i18n/useI18n.js'

export default function MobileBottomNav() {
    const { t } = useI18n()
    const { cartCount } = useCart()
    const { wishlistCount } = useWishlist()

    const items = [
        { to: '/', icon: Home, label: t('product.home') || 'Home', end: true },
        { to: '/catalog', icon: LayoutGrid, label: t('common.catalog') || 'Catalog' },
        { to: '/cart', icon: ShoppingBag, label: t('common.cart') || 'Cart', badge: cartCount },
        { to: '/wishlist', icon: Heart, label: t('common.wishlist') || 'Wishlist', badge: wishlistCount },
        { to: '/account', icon: User, label: t('common.profile') || 'Profile' },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[#D66B3E]/10 dark:border-slate-700/60 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden safe-area-bottom">
            <div className="flex items-center justify-around h-16">
                {items.map(({ to, icon: Icon, label, badge, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] rounded-2xl transition-all duration-200 active:scale-[0.92] ${
                                isActive ? 'text-[#D66B3E] bg-[#D66B3E]/10 dark:bg-[#D66B3E]/20 shadow-soft' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`
                        }
                    >
                        <span className="relative">
                            <Icon className="w-5 h-5" />
                            {badge > 0 && (
                                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-gradient-to-br from-[#e98c63] to-[#D66B3E] text-white text-[10px] font-bold px-1 shadow-brand-sm ring-1 ring-white dark:ring-slate-900">
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            )}
                        </span>
                        <span className="text-[11px] font-semibold leading-tight">{label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}
