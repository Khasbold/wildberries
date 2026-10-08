import { Link, NavLink, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useCart } from '../../state/useCart.js'
import { useWishlist } from '../../state/useWishlist.js'
import { useAuth } from '../../state/useAuth.js'
import { subscribe, getState } from '../../state/store.js'
import SideMenu from './SideMenu.jsx'
import LoginModal from './LoginModal.jsx'
import { useI18n } from '../../i18n/useI18n.js'
import { LOCALES, translateCategory } from '../../i18n/config.js'
import NotificationBell from './NotificationBell.jsx'
import { Menu, Search, User, Heart, ShoppingBag, Store, ChevronDown, LayoutGrid, Moon, Sun } from 'lucide-react'
import { useAnchoredPosition } from '../../../utils/useAnchoredPosition.js'
import { fuzzySearchRanked } from '../../../utils/fuzzySearch.js'
import { addRecentSearch, getRecentSearches } from '../../../utils/recentSearches.js'
import { getTrendingProductIds, recordProductClick } from '../../../utils/trendingLocal.js'
import { trackEvent } from '../../../utils/analytics.js'
import { useDarkMode } from '../../../theme/useDarkMode.js'

export default function Header() {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const [openCart, setOpenCart] = useState(false)
	const [openMenu, setOpenMenu] = useState(false)
	const [showLoginModal, setShowLoginModal] = useState(false)
	const [showSearchDropdown, setShowSearchDropdown] = useState(false)
	const [showLangDropdown, setShowLangDropdown] = useState(false)
	const cartRef = useRef(null)
	const cartButtonRef = useRef(null)
	const langRef = useRef(null)
	const langButtonRef = useRef(null)
	const searchRef = useRef(null)
	const searchPanelRef = useRef(null)
	const [searchRefresh, setSearchRefresh] = useState(0)
	const catalogButtonRef = useRef(null)
	const catalogPanelRef = useRef(null)
	const [showCatalog, setShowCatalog] = useState(false)
	const { cartCount, items } = useCart()
	const { wishlistCount } = useWishlist()
	const { user, isAuthenticated } = useAuth()
	const { t, locale, setLocale, localeMeta } = useI18n()
	const { isDark, toggle: toggleDark } = useDarkMode()

	function onSearchSubmit(e) {
		e.preventDefault()
		const q = query.trim()
		if (q) {
			addRecentSearch(q)
			setSearchRefresh((n) => n + 1)
			trackEvent('search', { term: q })
		}
		setShowSearchDropdown(false)
		navigate(`/catalog?q=${encodeURIComponent(query.trim())}`)
	}

	const state = useSyncExternalStore(subscribe, getState)
	const adminProducts = state.adminProducts || []
	const productViews = state.productViews || {}
	const adminCategories = state.adminCategories || []
	const langDropdownStyle = useAnchoredPosition(showLangDropdown, langButtonRef, { width: 220, zIndex: 100002 })
	const cartPanelStyle = useAnchoredPosition(openCart, cartButtonRef, { width: 400, zIndex: 100003 })
	const catalogPanelStyle = useAnchoredPosition(showCatalog, catalogButtonRef, { width: 560, align: 'start', zIndex: 100004 })
	const cartDetailed = useMemo(() => items
		.map((i) => ({ ...i, product: adminProducts.find((p) => p.id === i.productId) || null }))
		.filter((i) => i.product), [items, adminProducts])
	const subtotal = useMemo(() => cartDetailed.reduce((s, i) => s + i.product.price * i.quantity, 0), [cartDetailed])
	const suggestions = useMemo(() => {
		const q = query.trim()
		if (!q) return []
		/* Fuse uses minMatchCharLength: 2 — for 1 character use substring match so the dropdown still works */
		if (q.length < 2) {
			const low = q.toLowerCase()
			return adminProducts
				.filter((p) => {
					const title = String(p.title ?? '').toLowerCase()
					const brand = String(p.brand ?? '').toLowerCase()
					const cat = String(p.category ?? '').toLowerCase()
					return title.includes(low) || brand.includes(low) || cat.includes(low)
				})
				.slice(0, 8)
		}
		return fuzzySearchRanked(adminProducts, query, { viewCounts: productViews }).slice(0, 8)
	}, [query, adminProducts, productViews])

	const recentTerms = useMemo(() => (searchRefresh >= 0 ? getRecentSearches() : []), [searchRefresh])
	const trendingProducts = useMemo(() => {
		const ids = getTrendingProductIds()
		return ids.map((id) => adminProducts.find((p) => p.id === id)).filter(Boolean).slice(0, 6)
	}, [adminProducts, searchRefresh])

	const searchPanelOpen = showSearchDropdown && (suggestions.length > 0 || recentTerms.length > 0 || trendingProducts.length > 0)

	useEffect(() => {
		if (!showSearchDropdown) return
		function onKey(e) {
			if (e.key === 'Escape') setShowSearchDropdown(false)
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [showSearchDropdown])

	useEffect(() => {
		function handleOutsideClick(event) {
			if (openCart && cartRef.current && !cartRef.current.contains(event.target) && cartButtonRef.current && !cartButtonRef.current.contains(event.target)) {
				setOpenCart(false)
			}
			if (showLangDropdown && !langRef.current?.contains(event.target) && !langButtonRef.current?.contains(event.target)) {
				setShowLangDropdown(false)
			}
			if (showSearchDropdown && searchRef.current && !searchRef.current.contains(event.target)) {
				setShowSearchDropdown(false)
			}
			if (
				showCatalog &&
				catalogPanelRef.current &&
				!catalogPanelRef.current.contains(event.target) &&
				catalogButtonRef.current &&
				!catalogButtonRef.current.contains(event.target)
			) {
				setShowCatalog(false)
			}
		}

		document.addEventListener('mousedown', handleOutsideClick)
		return () => document.removeEventListener('mousedown', handleOutsideClick)
	}, [openCart, showLangDropdown, showSearchDropdown, showCatalog])

	return (
		<header className="bg-transparent shrink-0 border-b border-[--brand-primary]/10 dark:border-slate-700/60">
			<div className="container-app py-3 sm:py-4">
				<div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 relative">
					<div className="flex items-center gap-2 sm:gap-3 shrink-0">
						<button type="button" className="w-10 h-10 rounded-xl bg-[#F7E9D7]/80 hover:bg-[#F7E9D7] dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-800 dark:text-slate-200 transition-all duration-200 active:scale-[0.95] focus-ring lg:hidden" onClick={() => setOpenMenu(true)} aria-label={t('a11y.openMenu')}>
							<Menu className="w-5 h-5" />
						</button>
							

						<Link to="/" className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-[#D66B3E] to-[#4B7F4D] bg-clip-text text-transparent hover:opacity-90 transition-opacity shrink-0"><img src="/headerImageBg.png" alt="iBunny" className="w-auto h-8 sm:h-10 object-contain" /></Link>
						<div className="relative hidden lg:block">
							{/* <button
								ref={catalogButtonRef}
								type="button"
								aria-expanded={showCatalog}
								aria-haspopup="true"
								onClick={() => setShowCatalog((v) => !v)}
								className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-[#F7E9D7]/90 dark:hover:bg-slate-700 transition-colors ${showCatalog ? 'bg-[#F7E9D7] dark:bg-slate-700' : ''}`}
							>
								<img src="/headerImage.png" alt="Catalog" className="w-14 h-4" />
								{t('common.catalog')}
								<ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showCatalog ? 'rotate-180' : ''}`} />
							</button> */}
							<button
								ref={catalogButtonRef}
								type="button"
								aria-expanded={showCatalog}
								aria-haspopup="true"
								onClick={() => setShowCatalog((v) => !v)}
								className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200 hover:bg-[#F7E9D7]/90 dark:hover:bg-slate-700 transition-all duration-200 active:scale-[0.97] ${showCatalog ? 'bg-[#F7E9D7] dark:bg-slate-700 shadow-soft' : ''}`}
							>
								<LayoutGrid className="w-4 h-4 text-[#4B7F4D]" />
								{t('common.catalog')}
								<ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showCatalog ? 'rotate-180' : ''}`} />
							</button>
							{showCatalog && createPortal(
								<>
									<div className="fixed inset-0 z-[100001]" onClick={() => setShowCatalog(false)} aria-hidden="true" />
									<div
										ref={catalogPanelRef}
										style={catalogPanelStyle}
										className="rounded-2xl border border-[#D66B3E]/15 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card-elevated p-4 ring-1 ring-black/5 max-h-[min(70vh,420px)] overflow-y-auto animate-fade-in-down"
									>
										<p className="text-xs font-semibold uppercase tracking-wider text-[#D66B3E] mb-3">{t('common.catalog')}</p>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
											<Link
												to="/catalog"
												onClick={() => setShowCatalog(false)}
												className="rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-br from-[#4B7F4D] to-[#3d693f] text-white shadow-brand-sm hover:shadow-brand-md hover:opacity-95 transition-all duration-200 active:scale-[0.97] text-center"
											>
												{t('common.allProducts')}
											</Link>
											{adminCategories.map((c) => (
												<Link
													key={c.id}
													to={`/catalog?cat=${encodeURIComponent(c.name)}`}
													onClick={() => setShowCatalog(false)}
													className="rounded-xl px-3 py-2.5 text-sm font-medium bg-[#F7E9D7]/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-[#F7E9D7] dark:hover:bg-slate-600 border border-transparent hover:border-[#D66B3E]/25 hover:shadow-soft transition-all duration-200 active:scale-[0.97] text-center line-clamp-2"
												>
													{translateCategory(c.name, locale)}
												</Link>
											))}
										</div>
									</div>
								</>,
								document.body
							)}
						</div>
					</div>

					<form ref={searchRef} onSubmit={onSearchSubmit} className="order-3 sm:order-2 basis-full sm:basis-auto flex-1 min-w-0 max-w-[600px] sm:max-w-[480px] relative" role="search">
						<div className="relative">
							<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
							<input
								value={query}
								aria-expanded={searchPanelOpen}
								aria-controls="header-search-panel"
								aria-autocomplete="list"
								onFocus={() => setShowSearchDropdown(true)}
								onChange={(e) => {
									setQuery(e.target.value)
									setShowSearchDropdown(true)
								}}
								placeholder={t('common.searchPlaceholder')}
								className="w-full rounded-full pl-10 pr-4 py-2.5 sm:py-3 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 border border-transparent dark:border-slate-700 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] focus:border-brand focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-brand/25 focus:shadow-brand-sm focus:outline-none transition-all duration-200"
							/>
						</div>
						{searchPanelOpen && (
							<div
								id="header-search-panel"
								ref={searchPanelRef}
								role="listbox"
								aria-label={t('common.searchPlaceholder')}
								className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-800 rounded-2xl shadow-card-elevated border border-slate-200 dark:border-slate-700 overflow-hidden z-[100010] max-h-[min(70vh,420px)] overflow-y-auto animate-fade-in-down"
							>
								{!query.trim() && recentTerms.length > 0 && (
									<div className="border-b border-slate-100 dark:border-slate-700">
										<p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('catalog.recentSearches')}</p>
										{recentTerms.slice(0, 6).map((term) => (
											<button
												key={term}
												type="button"
												role="option"
												onMouseDown={(e) => e.preventDefault()}
												onClick={() => {
													setQuery(term)
													addRecentSearch(term)
													setSearchRefresh((n) => n + 1)
													navigate(`/catalog?q=${encodeURIComponent(term)}`)
													setShowSearchDropdown(false)
												}}
												className="w-full px-3 py-2 text-left text-sm text-slate-800 dark:text-slate-200 hover:bg-[#F7E9D7]/50 dark:hover:bg-slate-700 transition-colors"
											>
												{term}
											</button>
										))}
									</div>
								)}
								{!query.trim() && trendingProducts.length > 0 && (
									<div className="border-b border-slate-100 dark:border-slate-700">
										<p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('catalog.trendingLocal')}</p>
										{trendingProducts.map((s) => (
											<button
												key={s.id}
												type="button"
												role="option"
												onMouseDown={(e) => e.preventDefault()}
												onClick={() => {
													recordProductClick(s.id)
													setSearchRefresh((n) => n + 1)
													navigate(`/product/${s.id}`)
													setShowSearchDropdown(false)
												}}
												className="w-full px-3 py-2.5 hover:bg-[#F7E9D7]/50 dark:hover:bg-slate-700 text-left flex items-center gap-3 transition-colors"
											>
												<img src={s.thumbnail || s.image || ''} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 shrink-0" />
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title}</p>
													<p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.brand}</p>
												</div>
											</button>
										))}
									</div>
								)}
								{query.trim() && suggestions.map((s) => (
									<button
										key={s.id}
										type="button"
										role="option"
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => {
											recordProductClick(s.id)
											addRecentSearch(query.trim())
											setSearchRefresh((n) => n + 1)
											navigate(`/product/${s.id}`)
											setShowSearchDropdown(false)
										}}
										className="w-full px-3 py-2.5 hover:bg-[#F7E9D7]/50 dark:hover:bg-slate-700 text-left flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors"
									>
										<img
											src={s.thumbnail || s.image || ''}
											alt=""
											className="w-12 h-12 rounded-lg object-cover border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 shrink-0"
										/>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title}</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.brand}</p>
										</div>
										<span className="text-sm font-bold text-[#D66B3E] shrink-0 tabular-nums">{formatCurrency(Number(s.price) || 0)}</span>
									</button>
								))}
							</div>
						)}
					</form>

					<nav className="order-2 sm:order-3 flex items-center gap-0.5 sm:gap-2 ml-auto shrink-0">
						{/* Dark mode toggle */}
						<button
							type="button"
							onClick={toggleDark}
							className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#F7E9D7]/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-200 active:scale-[0.92]"
							aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
							title={isDark ? 'Light mode' : 'Dark mode'}
						>
							{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
						</button>
						<div className="relative">
							<button
								ref={langButtonRef}
								type="button"
								className="flex items-center gap-1.5 px-2.5 py-2 rounded-full hover:bg-[#F7E9D7]/70 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.95]"
								onClick={(e) => {
									e.stopPropagation()
									setShowLangDropdown((v) => !v)
								}}
								aria-expanded={showLangDropdown}
								aria-haspopup="listbox"
							>
								<img src={`https://flagcdn.com/w40/${localeMeta.flag.toLowerCase()}.png`} alt={localeMeta.label} className="w-5 h-4 object-cover rounded-sm shrink-0" />
								<span className="hidden sm:inline text-sm">{localeMeta.label}</span>
								<span className="text-slate-400 text-xs">▾</span>
							</button>
							{showLangDropdown && createPortal(
								<>
									<div className="fixed inset-0 z-[100000]" onClick={() => setShowLangDropdown(false)} aria-hidden="true" />
									<div
										ref={langRef}
										style={langDropdownStyle}
										className="bg-white dark:bg-slate-800 rounded-2xl shadow-card-elevated border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in"
										role="listbox"
									>
										{Object.values(LOCALES).map((item) => (
											<button
												key={item.code}
												type="button"
												role="option"
												aria-selected={locale === item.code}
												onClick={() => {
													setLocale(item.code)
													setShowLangDropdown(false)
												}}
												className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${locale === item.code ? 'bg-[#4B7F4D] text-white font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-[#F7E9D7]/80 dark:hover:bg-slate-700'}`}
											>
												<img src={`https://flagcdn.com/w40/${item.flag.toLowerCase()}.png`} alt={item.label} className="w-5 h-4 object-cover rounded-sm shrink-0" />
												{item.label}
											</button>
										))}
									</div>
								</>,
								document.body
							)}
						</div>
						<NavLink to="/stores" className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#F7E9D7]/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.95]" title={t('common.stores')}>
							<Store className="w-4 h-4 shrink-0" />
							<span className="text-sm font-medium">{t('common.stores')}</span>
						</NavLink>
						<NotificationBell />
						{isAuthenticated ? (
							<NavLink to="/account" className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#F7E9D7]/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.95]" title={t('header.account')}>
								<User className="w-4 h-4" />
								<span className="hidden sm:inline text-sm font-medium">{user.name || (user.isAnonymous ? 'Зочин' : t('header.account'))}</span>
							</NavLink>
						) : (
							<button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-[#F7E9D7]/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.95]">
								<User className="w-4 h-4" />
								<span className="hidden sm:inline text-sm font-medium">{t('header.signIn')}</span>
							</button>
						)}
						<NavLink to="/wishlist" className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full hover:bg-[#F7E9D7]/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.95] relative" aria-label={t('a11y.wishlist')} title={t('common.wishlist')}>
							<span className="relative">
								<Heart className="w-5 h-5" aria-hidden />
								{wishlistCount > 0 && (
									<span className="absolute -top-2 -right-2.5 bg-gradient-to-br from-[#e98c63] to-[#D66B3E] text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none shadow-brand-sm border-2 border-white dark:border-slate-900">{wishlistCount}</span>
								)}
							</span>
							<span className="hidden sm:inline text-sm font-medium">{t('common.wishlist')}</span>
						</NavLink>
						<button ref={cartButtonRef} type="button" className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full hover:bg-[#F7E9D7]/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.95] relative" onClick={() => setOpenCart((v) => !v)} aria-label={t('a11y.cart')} title={t('common.cart')}>
							<span className="relative">
								<ShoppingBag className="w-5 h-5" aria-hidden />
								{cartCount > 0 && (
									<span className="absolute -top-2 -right-2.5 bg-gradient-to-br from-[#e98c63] to-[#D66B3E] text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none shadow-brand-sm border-2 border-white dark:border-slate-900">{cartCount}</span>
								)}
							</span>
							<span className="hidden sm:inline text-sm font-medium">{t('common.cart')}</span>
						</button>
					</nav>

					{openCart && createPortal(
						<>
							<div className="fixed inset-0 z-[100002]" onClick={() => setOpenCart(false)} aria-hidden="true" />
							<div ref={cartRef} style={cartPanelStyle} className="max-w-[400px] bg-white dark:bg-slate-800 rounded-2xl shadow-card-elevated border border-slate-200 dark:border-slate-700 max-h-[80vh] overflow-hidden flex flex-col animate-scale-in">
							<div className="p-4 border-b border-slate-100 dark:border-slate-700 font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('common.cart')}</div>
							<div className="max-h-72 overflow-auto flex-1">
								{cartDetailed.length === 0 ? (
									<div className="p-6 text-center text-slate-500">{t('header.emptyCart')}</div>
								) : (
									cartDetailed.map((i) => (
										<div key={i.productId} className="p-4 flex items-center gap-3 hover:bg-[#F7E9D7]/40 dark:hover:bg-slate-700/60 transition-colors">
											<img src={i.product.thumbnail} alt={i.product.title} className="w-14 h-14 rounded-xl object-cover border border-slate-100 dark:border-slate-600 shadow-soft" />
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium line-clamp-1 text-slate-900 dark:text-slate-100">{i.product.title}</p>
												<p className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(i.product.price)} × {i.quantity}</p>
											</div>
										</div>
									))
								)}
							</div>
							<div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-3 bg-slate-50/60 dark:bg-slate-800/60">
								<div className="flex items-center justify-between font-bold tracking-tight text-slate-900 dark:text-slate-100">
									<span>{t('common.total')}</span>
									<span className="text-brand">{formatCurrency(subtotal)}</span>
								</div>
								<div className="flex gap-2">
									<Link to="/cart" className="btn-outline flex-1 text-center py-2.5" onClick={() => setOpenCart(false)}>{t('common.cart')}</Link>
									<button type="button" className="btn-primary flex-1 py-2.5" onClick={() => { setOpenCart(false); navigate('/checkout') }}>{t('header.placeOrder')}</button>
								</div>
							</div>
						</div>
						</>,
						document.body
					)}
				</div>
			</div>
			<SideMenu open={openMenu} onClose={() => setOpenMenu(false)} />
			<LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
		</header>
	)
} 