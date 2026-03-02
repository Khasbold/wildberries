import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { categories } from '../../data/products.js'
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
		{ label: t('sideMenu.certificates') || 'Certificates', icon: <IconGift className="text-purple-600" />, to: '/catalog' },
		{ label: t('sideMenu.brands') || 'Brands', to: '/catalog' },
		{ label: t('sideMenu.stores') || 'Stores', to: '/stores' },
	]

	const leafCats = categories.filter((c) => c !== 'All')

	return createPortal(
		<div className="fixed inset-0 z-[9999]">
			<div
				className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
				onClick={onClose}
			/>
			<aside className={`absolute left-0 top-0 h-full w-full sm:w-[420px] sm:max-w-[90vw] bg-white sm:rounded-r-2xl shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : '-translate-x-full'}`}>
				<div className="bg-gradient-to-r from-[#FF44C2] via-brand to-brand-dark text-white px-5 py-4 flex items-center justify-between shrink-0">
					<Link to="/" onClick={onClose} className="font-extrabold text-2xl tracking-tight">wildberries</Link>
					<button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
						<IconClose />
					</button>
				</div>

				<div className="flex-1 overflow-auto pb-8">
					{/* Quick navigation */}
					<div className="grid grid-cols-2 gap-2 p-4">
						<Link to="/account" onClick={onClose} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.5"/></svg>
							{t('common.profile')}
						</Link>
						<Link to="/orders" onClick={onClose} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" stroke="currentColor" strokeWidth="1.5"/></svg>
							{t('common.orders')}
						</Link>
					</div>

					{/* Core links */}
					<div className="px-4">
						<ul className="space-y-0.5">
							{coreLinks.map((l) => (
								<li key={l.label}>
									<Link to={l.to || '/catalog'} onClick={onClose} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-left transition-colors">
										<span className="w-6 h-6 flex items-center justify-center">{l.icon || <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />}</span>
										<span className="text-gray-900 font-medium">{l.label}</span>
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Divider */}
					<div className="mx-4 my-3 border-t border-slate-200" />

					{/* Categories section */}
					<div className="px-4">
						<p className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">{t('sideMenu.categories')}</p>
						<ul className="space-y-0.5">
							<li>
								<Link to="/catalog" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-900 font-medium transition-colors">
									<span className="text-lg">🏷️</span>
									<span>{t('common.allProducts')}</span>
								</Link>
							</li>
							{leafCats.map((c) => (
								<li key={c}>
									<Link to={`/catalog?cat=${encodeURIComponent(c)}`} onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-900 transition-colors">
										<span className="text-lg">{CATEGORY_ICONS[c] || '📦'}</span>
										<span>{translateCategory(c, locale)}</span>
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