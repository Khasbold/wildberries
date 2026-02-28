import { useI18n } from '../../i18n/useI18n.js'

export default function Footer() {
	const { t } = useI18n()
	return (
		<footer className="border-t border-slate-200 bg-white mt-10">
			<div className="container-app py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-slate-600">
				<div>
					<p className="font-semibold text-slate-900 mb-2">{t('footer.buyers')}</p>
					<ul className="space-y-1">
						<li>{t('footer.deliveryPay')}</li>
						<li>{t('footer.returns')}</li>
						<li>{t('footer.pickup')}</li>
					</ul>
				</div>
				<div>
					<p className="font-semibold text-slate-900 mb-2">{t('footer.partners')}</p>
					<ul className="space-y-1">
						<li>{t('footer.openPoint')}</li>
						<li>{t('footer.sell')}</li>
						<li>{t('footer.ads')}</li>
					</ul>
				</div>
				<div>
					<p className="font-semibold text-slate-900 mb-2">{t('footer.company')}</p>
					<ul className="space-y-1">
						<li>{t('footer.about')}</li>
						<li>{t('footer.jobs')}</li>
						<li>{t('footer.contacts')}</li>
					</ul>
				</div>
				<div>
					<p className="font-semibold text-slate-900 mb-2">© {new Date().getFullYear()}</p>
					<p>{t('footer.note')}</p>
				</div>
			</div>
		</footer>
	)
} 