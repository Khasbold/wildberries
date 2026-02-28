import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCart } from '../../state/useCart.js'
import { useWishlist } from '../../state/useWishlist.js'
import { useAuth } from '../../state/useAuth.js'
import { products } from '../../data/products.js'
import SideMenu from './SideMenu.jsx'
import { useI18n } from '../../i18n/useI18n.js'
import { LOCALES } from '../../i18n/config.js'

function IconBurger(props) {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<rect x="4" y="6" width="16" height="2" rx="1" fill="currentColor"/>
			<rect x="4" y="11" width="16" height="2" rx="1" fill="currentColor"/>
			<rect x="4" y="16" width="16" height="2" rx="1" fill="currentColor"/>
		</svg>
	)
}

function IconCamera(props) {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M9 7l1.5-2h3L15 7h3a3 3 0 013 3v6a3 3 0 01-3 3H6a3 3 0 01-3-3v-6a3 3 0 013-3h3z" stroke="currentColor" strokeWidth="1.5"/>
			<circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
		</svg>
	)
}

function IconMapPin(props) {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M12 22s8-6.59 8-12a8 8 0 10-16 0c0 5.41 8 12 8 12z" stroke="currentColor" strokeWidth="1.5"/>
			<circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
		</svg>
	)
}

function IconUser(props) {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
			<path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.5"/>
		</svg>
	)
}

function IconCart(props) {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M4 5h2l2 12h10l2-8H8" stroke="currentColor" strokeWidth="1.5"/>
			<circle cx="10" cy="20" r="1.5" fill="currentColor"/>
			<circle cx="18" cy="20" r="1.5" fill="currentColor"/>
		</svg>
	)
}

function IconHeart(props) {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M12 21s-7.5-4.6-9.5-8.5C0.8 8.6 3.2 5 6.8 5c2 0 3.2 1.1 3.9 2.1.7-1 1.9-2.1 3.9-2.1 3.6 0 6 3.6 4.3 7.5C19.5 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.5"/>
		</svg>
	)
}

export default function Header() {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const [openCart, setOpenCart] = useState(false)
	const [openMenu, setOpenMenu] = useState(false)
	const [showSearchDropdown, setShowSearchDropdown] = useState(false)
	const [showLangDropdown, setShowLangDropdown] = useState(false)
	const cartRef = useRef(null)
	const langRef = useRef(null)
	const searchRef = useRef(null)
	const { cartCount, items } = useCart()
	const { wishlistCount } = useWishlist()
	const { user, isAuthenticated } = useAuth()
	const { t, locale, setLocale, localeMeta } = useI18n()

	function onSearchSubmit(e) {
		e.preventDefault()
		navigate(`/catalog?q=${encodeURIComponent(query)}`)
	}

	const cartDetailed = useMemo(() => items
		.map((i) => ({ ...i, product: products.find((p) => p.id === i.productId) }))
		.filter((i) => i.product), [items])
	const subtotal = useMemo(() => cartDetailed.reduce((s, i) => s + i.product.price * i.quantity, 0), [cartDetailed])
	const suggestions = useMemo(() => {
		if (!query.trim()) return []
		const low = query.toLowerCase().trim()
		return products
			.filter((p) => p.title.toLowerCase().includes(low) || p.brand.toLowerCase().includes(low) || p.category.toLowerCase().includes(low))
			.slice(0, 6)
	}, [query])

	function formatCurrencyRub(n) {
		try {
			return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
		} catch {
			return `${Math.round(n)} ₽`
		}
	}

	useEffect(() => {
		function handleOutsideClick(event) {
			if (openCart && cartRef.current && !cartRef.current.contains(event.target)) {
				setOpenCart(false)
			}
			if (showLangDropdown && langRef.current && !langRef.current.contains(event.target)) {
				setShowLangDropdown(false)
			}
			if (showSearchDropdown && searchRef.current && !searchRef.current.contains(event.target)) {
				setShowSearchDropdown(false)
			}
		}

		document.addEventListener('mousedown', handleOutsideClick)
		return () => document.removeEventListener('mousedown', handleOutsideClick)
	}, [openCart, showLangDropdown, showSearchDropdown])

	return (
		<header className="bg-gradient-to-r from-[#FF44C2] via-brand to-brand-dark text-white border-b border-white/20">
			<div className="container-app py-3">
				<div className="py-1 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 relative">
					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						<Link to="/" className="font-extrabold text-lg sm:text-2xl tracking-tight truncate">wildberries</Link>
						<button className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border border-white/30 shrink-0" onClick={() => setOpenMenu(true)}>
							<IconBurger className="text-white" />
						</button>
					</div>

					<form ref={searchRef} onSubmit={onSearchSubmit} className="order-3 sm:order-2 basis-full sm:basis-auto flex-1 max-w-[920px] relative">
						<div className="relative">
							<input
								value={query}
								onFocus={() => setShowSearchDropdown(true)}
								onBlur={() => setTimeout(() => setShowSearchDropdown(false), 120)}
								onChange={(e) => {
									setQuery(e.target.value)
									setShowSearchDropdown(true)
								}}
								placeholder={t('common.searchPlaceholder')}
								className="w-full rounded-2xl pl-4 pr-12 py-3 text-slate-900 focus:outline-none"
							/>
							<button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
								<IconCamera />
							</button>
						</div>
						{showSearchDropdown && suggestions.length > 0 && (
							<div className="absolute top-[52px] left-0 right-0 bg-white text-slate-900 rounded-2xl shadow-card border border-slate-200 overflow-hidden z-30">
								{suggestions.map((s) => (
									<button
										key={s.id}
										type="button"
										onClick={() => navigate(`/product/${s.id}`)}
										className="w-full px-4 py-2.5 hover:bg-slate-50 text-left flex items-center justify-between gap-3 border-b border-slate-100 last:border-b-0"
									>
										<span className="truncate text-sm">{s.title}</span>
										<span className="text-xs text-slate-500">{s.brand}</span>
									</button>
								))}
							</div>
						)}
					</form>

					<nav className="order-2 sm:order-3 flex items-center gap-1 xs:gap-2 sm:gap-4 text-[10px] sm:text-xs ml-auto shrink-0">
						<div className="relative" ref={langRef}>
							<button className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25" onClick={() => setShowLangDropdown((v) => !v)}>
								<span>{localeMeta.flag}</span>
								<span className="hidden sm:inline">{localeMeta.label}</span>
								<span className="text-[10px]">▾</span>
							</button>
							{showLangDropdown && (
								<div className="absolute right-0 top-[34px] bg-white text-slate-900 rounded-xl shadow-card border border-slate-200 w-36 overflow-hidden">
									{Object.values(LOCALES).map((item) => (
										<button
											key={item.code}
											type="button"
											onClick={() => {
												setLocale(item.code)
												setShowLangDropdown(false)
											}}
											className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${locale === item.code ? 'bg-slate-100' : ''}`}
										>
											{item.flag} {item.label}
										</button>
									))}
								</div>
							)}
						</div>
						<NavLink to="/stores" className="hidden md:flex flex-col items-center hover:opacity-90">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21V10l9-7 9 7v11H3z" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="14" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
							<span className="mt-1">Stores</span>
						</NavLink>
						<button className="hidden lg:flex flex-col items-center hover:opacity-90">
							<IconMapPin className="text-white" />
							<span className="mt-1">{t('header.addresses')}</span>
						</button>
						<NavLink to="/account" className="flex flex-col items-center hover:opacity-90">
							<IconUser className="text-white" />
							<span className="mt-1 hidden sm:inline">{isAuthenticated ? user.name || t('header.account') : t('header.signIn')}</span>
						</NavLink>
						<NavLink to="/orders" className="hidden md:flex flex-col items-center hover:opacity-90">
							<span className="w-5 h-5 rounded-full border border-white/70 flex items-center justify-center text-[10px]">#</span>
							<span className="mt-1">{t('common.orders')}</span>
						</NavLink>
						<NavLink to="/wishlist" className="flex flex-col items-center hover:opacity-90">
							<div className="relative">
								<IconHeart className="text-white" />
								{wishlistCount > 0 && (
									<span className="absolute -top-1 -right-2 bg-white text-brand text-[10px] font-semibold rounded-full px-1.5 py-0.5">{wishlistCount}</span>
								)}
							</div>
							<span className="mt-1 hidden sm:inline">{t('common.wishlist')}</span>
						</NavLink>
						<button className="flex flex-col items-center hover:opacity-90" onClick={() => setOpenCart((v) => !v)}>
							<div className="relative">
								<IconCart className="text-white" />
								{cartCount > 0 && (
									<span className="absolute -top-1 -right-2 bg-white text-brand text-[10px] font-semibold rounded-full px-1.5 py-0.5">{cartCount}</span>
								)}
							</div>
							<span className="mt-1 hidden sm:inline">{t('common.cart')}</span>
						</button>
					</nav>

					{openCart && (
						<div ref={cartRef} className="absolute right-0 left-0 sm:left-auto top-[60px] sm:top-[70px] w-full sm:w-[380px] sm:max-w-sm bg-white text-slate-900 rounded-b-2xl sm:rounded-2xl shadow-card border border-slate-200 z-40 max-h-[80vh] overflow-auto">
							<div className="p-4 border-b font-medium">{t('common.cart')}</div>
							<div className="max-h-80 overflow-auto divide-y">
								{cartDetailed.length === 0 ? (
									<div className="p-4 text-sm text-slate-600">{t('header.emptyCart')}</div>
								) : (
									cartDetailed.map((i) => (
										<div key={i.productId} className="p-3 flex items-center gap-3">
											<img src={i.product.thumbnail} alt={i.product.title} className="w-14 h-14 rounded object-cover" />
											<div className="flex-1">
												<p className="text-sm font-medium line-clamp-1">{i.product.title}</p>
												<p className="text-xs text-slate-600">x{i.quantity} • {formatCurrencyRub(i.product.price)}</p>
											</div>
										</div>
									))
								)}
							</div>
							<div className="p-4 flex items-center justify-between">
								<p className="font-semibold">{t('common.total')}</p>
								<p className="font-semibold">{formatCurrencyRub(subtotal)}</p>
							</div>
							<div className="p-4 pt-0 flex gap-2">
								<Link to="/cart" className="btn-outline flex-1 text-center" onClick={() => setOpenCart(false)}>{t('common.cart')}</Link>
								<button className="btn-primary flex-1" onClick={() => navigate('/cart')}>{t('header.placeOrder')}</button>
							</div>
						</div>
					)}

				</div>
			</div>
			<SideMenu open={openMenu} onClose={() => setOpenMenu(false)} />
		</header>
	)
} 