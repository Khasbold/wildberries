import { Link } from 'react-router-dom'
import { categories } from '../../data/products.js'
import { translateCategory } from '../../i18n/config.js'
import { useI18n } from '../../i18n/useI18n.js'

export default function CategoryBar() {
	const { t, locale } = useI18n()
	const cats = categories.filter((c) => c !== 'All')
	return (
		<div className="bg-white/95 border-b border-slate-200">
			<div className="container-app overflow-auto">
				<div className="flex items-center gap-2 py-2.5">
					<Link to="/catalog" className="px-3 py-1.5 rounded-full bg-brand text-white text-sm whitespace-nowrap">{t('common.allProducts')}</Link>
					{cats.map((c) => (
						<Link key={c} to={`/catalog?cat=${encodeURIComponent(c)}`} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-sm whitespace-nowrap">
							{translateCategory(c, locale)}
						</Link>
					))}
				</div>
			</div>
		</div>
	)
} 