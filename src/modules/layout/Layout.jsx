import { useSyncExternalStore } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import TopBar from './components/TopBar.jsx'
import ScrollToTop from './ScrollToTop.jsx'
import MobileBottomNav from './components/MobileBottomNav.jsx'
import { subscribeFirebaseConnection, getFirebaseConnection } from '../../utils/firebaseConnection.js'
import { useI18n } from '../i18n/useI18n.js'

export default function Layout({ children }) {
	const { t } = useI18n()
	const firebaseOk = useSyncExternalStore(subscribeFirebaseConnection, getFirebaseConnection, () => true)

	return (
		<div className="min-h-screen flex flex-col overflow-x-hidden">
			<ScrollToTop />
			{!firebaseOk && (
				<div className="bg-[--bg-beige] dark:bg-slate-800 border-b border-[--brand-primary]/20 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium text-center px-3 py-2 animate-fade-in-down" role="status">
					{t('app.offlineCatalog')}
				</div>
			)}
			<div className="sticky top-0 z-50 glass border-b border-[#D66B3E]/10 dark:border-slate-700/60 shadow-soft shrink-0">
				<TopBar />
				<Header />
				{/* <CategoryBar /> */}
			</div>
			<main className="flex-1 min-w-0 pb-20 lg:pb-0">
				{children}
			</main>
			<Footer />
			<MobileBottomNav />
		</div>
	)
}
