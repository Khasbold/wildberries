import { useEffect } from 'react'
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

export default function SideMenu({ open, onClose }) {
	const { t, locale } = useI18n()
	useEffect(() => {
		function onKey(e) {
			if (e.key === 'Escape') onClose()
		}
		if (open) document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [open, onClose])

	if (!open) return null

	const coreLinks = [
		{ label: 'Сертификаты Wildberries', icon: <IconGift className="text-purple-600" /> },
		{ label: 'Бренды' },
		{ label: 'Travel' },
		{ label: 'Wibes' },
		{ label: 'Лотерея Мечталион' },
		{ label: 'Новостройки' },
		{ label: 'Экспресс' },
		{ label: 'Ресейл' },
		{ label: 'RWB Участие' },
	]

	const leafCats = categories.filter((c) => c !== 'All')

	return (
		<div className="fixed inset-0 z-[60]">
			<div className="absolute inset-0 bg-black/40" onClick={onClose} />
			<aside className="absolute left-0 top-0 h-full w-[360px] max-w-[86vw] bg-white rounded-r-2xl shadow-xl overflow-hidden">
				<div className="bg-gradient-to-r from-[#FF44C2] via-brand to-brand-dark text-white px-4 py-3 flex items-center justify-between">
					<Link to="/" className="font-extrabold text-2xl tracking-tight">wildberries</Link>
					<button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
						<IconClose />
					</button>
				</div>
				<div className="h-full overflow-auto p-3">
					<div className="grid grid-cols-2 gap-2 mb-3">
						<Link to="/account" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm text-center">{t('common.profile')}</Link>
						<Link to="/orders" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm text-center">{t('common.orders')}</Link>
					</div>
					<ul className="space-y-1">
						{coreLinks.map((l) => (
							<li key={l.label}>
								<button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 text-left">
									<span className="w-5 h-5 flex items-center justify-center">{l.icon || <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />}</span>
									<span className="text-gray-900">{l.label}</span>
								</button>
							</li>
						))}
					</ul>

					<div className="mt-4">
						<p className="px-3 py-2 text-xs uppercase text-gray-500">{t('sideMenu.categories')}</p>
						<ul className="space-y-1">
							{leafCats.map((c) => (
								<li key={c}>
									<Link to={`/catalog?cat=${encodeURIComponent(c)}`} onClick={onClose} className="block px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-900">
										{translateCategory(c, locale)}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>
			</aside>
		</div>
	)
} 