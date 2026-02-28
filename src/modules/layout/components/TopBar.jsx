import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n.js'

export default function TopBar() {
	const { t } = useI18n()
	return (
		<div className="bg-slate-900 text-slate-100 text-xs">
			<div className="container-app py-2 flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<span className="text-slate-300">{t('topbar.deliveryTo')}</span>
					<Link to="/catalog" className="hover:underline">{t('topbar.pickup')}</Link>
					<Link to="/catalog" className="hover:underline hidden md:inline">{t('topbar.orderStatus')}</Link>
				</div>
				<div className="flex items-center gap-3 text-slate-300">
					<Link to="/catalog" className="hover:text-white">{t('topbar.help')}</Link>
					<Link to="/catalog" className="hover:text-white">{t('topbar.sell')}</Link>
					<Link to="/wishlist" className="hover:text-white hidden sm:inline">{t('common.wishlist')}</Link>
				</div>
			</div>
		</div>
	)
} 