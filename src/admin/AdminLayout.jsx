import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, Package, Users, Tags, Store, LogOut, Shield, Ticket, Crown, Sparkles, Image, UserCircle, Bell, Menu, X, QrCode, Carrot, Moon, Sun, Globe, BarChart3, MessageSquare, AlertTriangle, CreditCard } from 'lucide-react'
import { Button } from './components/ui/Button.jsx'
import { useSession } from '../modules/state/useSession.js'
import { Badge } from './components/ui/Badge.jsx'
import { TIER_PLANS, updateAdminUser } from '../modules/state/store.js'
import AdminNotificationBell from './components/AdminNotificationBell.jsx'
import { useDarkMode } from '../theme/useDarkMode.js'
import { useI18n } from '../modules/i18n/useI18n.js'
import { LOCALES } from '../modules/i18n/config.js'

const superAdminMenu = [
    { to: '/admin', labelKey: 'admin.dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/store-owners', labelKey: 'admin.storeOwners', icon: Store },
    { to: '/admin/orders', labelKey: 'admin.allOrders', icon: ShoppingBag },
    { to: '/admin/delivery-scan', labelKey: 'admin.deliveryScan', icon: QrCode },
    { to: '/admin/products', labelKey: 'admin.allProducts', icon: Package },
    { to: '/admin/discounts', labelKey: 'admin.allDiscounts', icon: Ticket },
    { to: '/admin/categories', labelKey: 'admin.categories', icon: Tags },
    { to: '/admin/customers', labelKey: 'admin.customers', icon: Users },
    { to: '/admin/tier-list', labelKey: 'admin.tierList', icon: Crown },
    { to: '/admin/highlights', labelKey: 'admin.highlights', icon: Sparkles },
    { to: '/admin/banners', labelKey: 'admin.banner', icon: Image },
    { to: '/admin/notifications', labelKey: 'admin.notifications', icon: Bell },
    { to: '/admin/carrots', labelKey: 'admin.carrots', icon: Carrot },
    { to: '/admin/feedbacks', labelKey: 'admin.feedbacks', icon: MessageSquare },
    { to: '/admin/merchants', labelKey: 'admin.merchants', icon: CreditCard },
]

const storeAdminMenuBase = [
    { to: '/admin', labelKey: 'admin.dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/analytics', labelKey: 'admin.analytics', icon: BarChart3 },
    { to: '/admin/profile', labelKey: 'admin.storeProfile', icon: UserCircle },
    { to: '/admin/orders', labelKey: 'admin.orders', icon: ShoppingBag },
    { to: '/admin/delivery-scan', labelKey: 'admin.deliveryScan', icon: QrCode },
    { to: '/admin/products', labelKey: 'admin.products', icon: Package },
    { to: '/admin/discounts', labelKey: 'admin.discounts', icon: Ticket },
    { to: '/admin/categories', labelKey: 'admin.categories', icon: Tags },
    { to: '/admin/customers', labelKey: 'admin.customers', icon: Users },
    { to: '/admin/tier-list', labelKey: 'admin.tierList', icon: Crown },
]

export default function AdminLayout({ children }) {
    const { session, isSuperAdmin, logout, tier } = useSession()
    const storeAdminMenu = tier === 'gold' ? [...storeAdminMenuBase, { to: '/admin/banners', labelKey: 'admin.banner', icon: Image }] : storeAdminMenuBase
    const menu = isSuperAdmin ? superAdminMenu : storeAdminMenu
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { isDark, toggle: toggleDark } = useDarkMode()
    const { t, locale, setLocale, localeMeta } = useI18n()
    const [showLangDropdown, setShowLangDropdown] = useState(false)
    const [showExpirationPopup, setShowExpirationPopup] = useState(false)
    const [expirationSnapshot, setExpirationSnapshot] = useState(null)
    const navigate = useNavigate()
    const location = useLocation()

    // Tier expiration check — do NOT skip when tier === 'free', because auto-downgrade may have just cleared it
    const tierExpiration = useMemo(() => {
        if (isSuperAdmin) return null
        const endDate = session?.tierEndDate
        if (!endDate) return null
        const end = new Date(endDate + 'T23:59:59')
        const now = new Date()
        const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        return { daysLeft, endDate, isExpired: daysLeft <= 0, isWarning: daysLeft > 0 && daysLeft <= 7, graceDaysLeft: daysLeft < 0 ? Math.max(0, 7 + daysLeft) : null }
    }, [session?.tierEndDate, isSuperAdmin])

    // Auto-disable expired stores and show expiration popup
    const popupShownRef = useRef(false)
    useEffect(() => {
        if (!tierExpiration) return
        if (tierExpiration.isExpired && tierExpiration.graceDaysLeft === 0 && session?.userId) {
            // Snapshot expiration data before auto-downgrade clears it
            setExpirationSnapshot(tierExpiration)
            setShowExpirationPopup(true)
            updateAdminUser(session.userId, { tier: 'free', tierStartDate: '', tierEndDate: '' })
            return
        }
        if (tierExpiration.isWarning && !popupShownRef.current) {
            setExpirationSnapshot(tierExpiration)
            setShowExpirationPopup(true)
            popupShownRef.current = true
        }
    }, [tierExpiration, session?.userId])

    // Re-show warning popup on route change (once per navigation)
    useEffect(() => {
        if (!tierExpiration || !tierExpiration.isWarning || popupShownRef.current) return
        setExpirationSnapshot(tierExpiration)
        setShowExpirationPopup(true)
        popupShownRef.current = true
    }, [location.pathname, tierExpiration])

    return (
        <div className={`min-h-screen overflow-x-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-b from-brand-50/50 via-slate-50 to-slate-50'}`}>
            {/* Header */}
            <header className={`sticky top-0 z-30 h-14 border-b px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 shadow-soft backdrop-blur-md ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/85 border-brand/10'}`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className={`lg:hidden p-1.5 rounded-xl transition-all duration-200 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-brand-50/70 text-slate-600'}`}
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand to-brand-dark shadow-brand-sm flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">iB</span>
                    </div>
                    <div className="min-w-0">
                        <h1 className={`text-xs sm:text-sm font-semibold leading-tight truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {isSuperAdmin ? 'SuperAdmin' : session?.storeName || 'Admin'}
                        </h1>
                        <p className={`text-[10px] sm:text-[11px] leading-tight hidden sm:block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {isSuperAdmin ? 'Platform' : t('admin.dashboard')}
                        </p>
                    </div>
                    {isSuperAdmin && (
                        <Badge variant="default" className="ml-1 text-[10px] hidden sm:inline-flex">
                            <Shield size={10} className="mr-1" />
                            SuperAdmin
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <div className={`text-right mr-1 sm:mr-2 hidden md:block`}>
                        <p className={`text-xs font-medium truncate max-w-[120px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{session?.name}</p>
                        <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>@{session?.username}</p>
                    </div>
                    <button
                        type="button"
                        onClick={toggleDark}
                        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${isDark ? 'hover:bg-slate-700 text-yellow-400' : 'hover:bg-brand-50/70 text-slate-600'}`}
                        title={isDark ? 'Light mode' : 'Dark mode'}
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowLangDropdown((v) => !v)}
                            className={`flex items-center gap-1.5 px-2 py-2 rounded-xl transition-all duration-200 ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-brand-50/70 text-slate-700'}`}
                            title="Language"
                        >
                            <Globe size={16} />
                            <span className="hidden sm:inline text-xs font-medium">{localeMeta.label}</span>
                        </button>
                        {showLangDropdown && (
                            <>
                                <div className="fixed inset-0 z-[100]" onClick={() => setShowLangDropdown(false)} />
                                <div className={`absolute right-0 top-full mt-1 rounded-xl shadow-card-elevated border overflow-hidden z-[101] min-w-[160px] animate-fade-in-down ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-brand/10'}`}>
                                    {Object.values(LOCALES).map((item) => (
                                        <button
                                            key={item.code}
                                            type="button"
                                            onClick={() => { setLocale(item.code); setShowLangDropdown(false) }}
                                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors duration-150 ${locale === item.code ? 'bg-[#4B7F4D] text-white' : isDark ? 'text-slate-300 hover:bg-slate-700' : 'hover:bg-brand-50/60'}`}
                                        >
                                            <img src={`https://flagcdn.com/w40/${item.flag.toLowerCase()}.png`} alt={item.label} className="w-5 h-4 object-cover rounded-sm shrink-0" />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <AdminNotificationBell />
                    <Link to="/">
                        <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs">{t('admin.backToStore')}</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 sm:px-3">
                        <LogOut size={14} className="sm:mr-1" />
                        <span className="hidden sm:inline">{t('admin.logout')}</span>
                    </Button>
                </div>
            </header>

            {mobileMenuOpen && (
                <div className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            <div className="flex">
                <aside className={`
                    fixed lg:sticky top-14 z-20 h-[calc(100vh-3.5rem)] w-[260px] lg:w-[220px]
                    ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-r border-slate-200 lg:border-r-0'}
                    overflow-y-auto scrollbar-hide
                    transition-transform duration-200 ease-in-out
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    lg:m-4 lg:mr-0 lg:rounded-2xl lg:border ${isDark ? 'lg:border-slate-700' : 'lg:border-brand/10'} lg:h-max lg:shadow-card
                `}>
                    <div className="p-3 lg:p-2">
                        {!isSuperAdmin && session?.storeName && (
                            <div className={`mb-3 p-3 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gradient-to-br from-brand-50/80 to-white border-brand/15 shadow-soft'}`}>
                                <div className="flex items-center gap-2">
                                    {session.storeImage ? (
                                        <img src={session.storeImage} alt={session.storeName} className="h-8 w-8 rounded-lg object-cover" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand to-brand-dark shadow-brand-sm flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {session.storeName[0]}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{session.storeName}</p>
                                        <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{session.storeId}</p>
                                    </div>
                                </div>
                                {tier && TIER_PLANS[tier] && (
                                    <Badge className={`mt-2 text-[10px] ${
                                        tier === 'gold' ? 'bg-yellow-200 text-yellow-900' :
                                        tier === 'silver' ? 'bg-gray-300 text-gray-800' :
                                        tier === 'bronze' ? 'bg-amber-200 text-amber-900' :
                                        'bg-slate-200 text-slate-800'
                                    }`}>
                                        <Crown size={10} className="mr-1" />
                                        {TIER_PLANS[tier].name} Tier
                                    </Badge>
                                )}
                            </div>
                        )}

                        <nav className="flex flex-col gap-0.5">
                            {menu.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.end || false}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200 ease-spring ${
                                                isActive
                                                    ? isDark ? 'bg-gradient-to-br from-brand to-brand-dark text-white font-medium shadow-brand-sm' : 'bg-gradient-to-br from-brand to-brand-dark text-white font-medium shadow-brand-sm'
                                                    : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-600 hover:bg-brand-50/70 hover:text-slate-900'
                                            }`
                                        }
                                    >
                                        <Icon size={16} className="shrink-0" />
                                        {t(item.labelKey)}
                                    </NavLink>
                                )
                            })}
                        </nav>
                    </div>
                </aside>

                <main className={`flex-1 min-w-0 max-w-[1600px] p-3 sm:p-4 lg:p-6 ${isDark ? 'text-slate-200 [&_.text-slate-900]:text-slate-100 [&_.text-slate-700]:text-slate-300 [&_.text-slate-600]:text-slate-400 [&_.text-slate-500]:text-slate-400 [&_.bg-white]:bg-slate-800 [&_.border-slate-200]:border-slate-700 [&_.bg-slate-50]:bg-slate-800/50 [&_.hover\\:bg-slate-50]:hover:bg-slate-700' : ''}`}>
                    {tierExpiration && (tierExpiration.isWarning || tierExpiration.isExpired) && !isSuperAdmin && (
                        <div className={`sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium rounded-xl shadow-card mb-3 animate-fade-in-down ${
                            tierExpiration.isExpired
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-500 text-white'
                        }`}>
                            <div className="flex items-center gap-2 min-w-0">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {tierExpiration.isExpired
                                    ? tierExpiration.graceDaysLeft > 0
                                        ? `Таны tier хугацаа дуусла! ${tierExpiration.graceDaysLeft} хоногийн дараа Free tier болно. Одоо сунгана уу.`
                                        : 'Таны tier дууссан. Та одоо Free tier дээр байна.'
                                    : `Таны tier хугацаа дуусахад ${tierExpiration.daysLeft} хоног үлдлээ!`}
                            </div>
                            <Link
                                to="/admin/tier"
                                className="shrink-0 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors duration-200"
                            >
                                Сунгах
                            </Link>
                        </div>
                    )}
                    {children}
                </main>
            </div>

            {/* Tier expiration popup */}
            {showExpirationPopup && expirationSnapshot && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowExpirationPopup(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-card-elevated p-6 text-center animate-scale-in">
                        <AlertTriangle size={40} className={`mx-auto mb-3 ${expirationSnapshot.isExpired ? 'text-red-500' : 'text-amber-500'}`} />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {expirationSnapshot.isExpired ? 'Tier хугацаа дууссан!' : 'Tier хугацаа дуусах гэж байна!'}
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            {expirationSnapshot.isExpired
                                ? `Таны tier-ийн хугацаа дууссан тул Free tier-рүү буцлаа. Tier-ээ сунгана уу.`
                                : `Таны tier хугацаа дуусахад ${expirationSnapshot.daysLeft} хоног үлдлээ. (${expirationSnapshot.endDate}) Хугацаа дуусвал Free tier-рүү буцна.`}
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" size="sm" onClick={() => setShowExpirationPopup(false)}>
                                Хаах
                            </Button>
                            <Button size="sm" className="gap-1" onClick={() => { setShowExpirationPopup(false); navigate('/admin/tier-list') }}>
                                <Crown size={14} /> Tier сунгах
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
