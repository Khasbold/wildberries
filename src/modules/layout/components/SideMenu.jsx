import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useSyncExternalStore } from 'react'
import { subscribe, getState } from '../../state/store.js'
import { useI18n } from '../../i18n/useI18n.js'
import { translateCategory } from '../../i18n/config.js'

function IconClose(props) {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	)
}

function IconGift(props) {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path d="M3 10h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10z" stroke="currentColor" strokeWidth="1.6"/>
			<path d="M12 4s-.5-2-3-2-3 2-3 3 1 3 4 3h2" stroke="currentColor" strokeWidth="1.6"/>
			<path d="M12 4s.5-2 3-2 3 2 3 3-1 3-4 3h-2" stroke="currentColor" strokeWidth="1.6"/>
			<path d="M3 10h18M12 10v12" stroke="currentColor" strokeWidth="1.6"/>
		</svg>
	)
}

const CATEGORY_ICONS = {
	Apparel: '👕',
	Shoes: '👟',
	Bags: '👜',
	Electronics: '📱',
	Accessories: '⌚',
}

export default function SideMenu({ open, onClose }) {
	const { t, locale } = useI18n()
	const state = useSyncExternalStore(subscribe, getState)
	const categories = (state.adminCategories || []).map((c) => c.name)
	const [visible, setVisible] = useState(false)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		if (open) {
			setMounted(true)
			requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
		} else {
			setVisible(false)
			const timer = setTimeout(() => setMounted(false), 300)
			return () => clearTimeout(timer)
		}
	}, [open])

	useEffect(() => {
		function onKey(e) {
			if (e.key === 'Escape') onClose()
		}
		if (open) document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [open, onClose])

	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => { document.body.style.overflow = '' }
	}, [open])

	if (!mounted) return null

	const coreLinks = [
		{ label: t('sideMenu.certificates') || 'Certificates', icon: <IconGift className="text-[#D66B3E]" />, to: '/catalog' },
		{ label: t('sideMenu.brands') || 'Brands', to: '/catalog' },
		{ label: t('sideMenu.stores') || 'Stores', to: '/stores' },
	]

	const leafCats = categories.filter((c) => c !== 'All')

	return createPortal(
		<div className="fixed inset-0 z-[9999]">
			<div
				className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
				onClick={onClose}
			/>
			<aside className={`absolute left-0 top-0 h-full w-full sm:w-[380px] sm:max-w-[90vw] bg-white dark:bg-slate-900 sm:rounded-r-2xl shadow-card-elevated overflow-hidden flex flex-col transition-transform duration-300 ease-spring ${visible ? 'translate-x-0' : '-translate-x-full'}`}>
				<div className="bg-gradient-to-br from-brand to-brand-dark text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-brand-sm">
					<Link to="/" onClick={onClose} className="font-extrabold text-xl tracking-tight hover:opacity-90 transition-opacity">{t('common.brandName')}</Link>
					<button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 active:scale-[0.92]" aria-label="Close">
						<IconClose />
					</button>
				</div>

				<div className="flex-1 overflow-auto pb-8">
					<div className="grid grid-cols-2 gap-2 p-4">
						<Link to="/account" onClick={onClose} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#F7E9D7]/70 hover:bg-[#F7E9D7] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-all duration-200 active:scale-[0.97] shadow-soft">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0114 0"/></svg>
							{t('common.profile')}
						</Link>
						<Link to="/orders" onClick={onClose} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#F7E9D7]/70 hover:bg-[#F7E9D7] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-all duration-200 active:scale-[0.97] shadow-soft">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6"/></svg>
							{t('common.orders')}
						</Link>
					</div>

					<div className="px-4">
						<ul className="space-y-0.5">
							{coreLinks.map((l) => (
								<li key={l.label}>
									<Link to={l.to || '/catalog'} onClick={onClose} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F7E9D7]/60 dark:hover:bg-slate-800 hover:translate-x-0.5 text-slate-800 dark:text-slate-200 font-medium text-left transition-all duration-200 active:scale-[0.98]">
										<span className="w-6 h-6 flex items-center justify-center">{l.icon || <span className="w-2 h-2 rounded-full bg-[#4B7F4D]/50" />}</span>
										{l.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div className="mx-4 my-3 divider-soft" />

					<div className="px-4">
						<p className="px-4 py-2 text-xs uppercase tracking-wider text-[#D66B3E] font-bold">{t('sideMenu.categories')}</p>
						<ul className="space-y-0.5">
							<li>
								<Link to="/catalog" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F7E9D7]/60 dark:hover:bg-slate-800 hover:translate-x-0.5 text-slate-900 dark:text-slate-100 font-semibold transition-all duration-200 active:scale-[0.98]">
									<span className="text-lg">🏷️</span>
									{t('common.allProducts')}
								</Link>
							</li>
							{leafCats.map((c) => (
								<li key={c}>
									<Link to={`/catalog?cat=${encodeURIComponent(c)}`} onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F7E9D7]/60 dark:hover:bg-slate-800 hover:translate-x-0.5 text-slate-800 dark:text-slate-300 transition-all duration-200 active:scale-[0.98]">
										<span className="text-lg">{CATEGORY_ICONS[c] || '📦'}</span>
										{translateCategory(c, locale)}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>
			</aside>
		</div>,
		document.body
	)
} 