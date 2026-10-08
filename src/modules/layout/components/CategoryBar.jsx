import { Link } from 'react-router-dom'
import { useSyncExternalStore } from 'react'
import { subscribe, getState } from '../../state/store.js'
import { translateCategory } from '../../i18n/config.js'
import { useI18n } from '../../i18n/useI18n.js'

export default function CategoryBar() {
	const { t, locale } = useI18n()
	const state = useSyncExternalStore(subscribe, getState)
	const cats = (state.adminCategories || []).map((c) => c.name)
	return (
		<div className="bg-[#F7E9D7]/50 dark:bg-slate-800/60 border-b border-[#D66B3E]/10 dark:border-slate-700/60">
			<div className="container-app overflow-auto scrollbar-hide overscroll-x-contain">
				<div className="flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5">
					<Link to="/catalog" className="chip chip-active whitespace-nowrap shadow-brand-sm active:scale-[0.97]">{t('common.allProducts')}</Link>
					{cats.map((c) => (
						<Link key={c} to={`/catalog?cat=${encodeURIComponent(c)}`} className="chip whitespace-nowrap hover:shadow-soft active:scale-[0.97] transition-all duration-200">
							{translateCategory(c, locale)}
						</Link>
					))}
				</div>
			</div>
		</div>
	)
}
