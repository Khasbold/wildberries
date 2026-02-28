import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import TopBar from './components/TopBar.jsx'
import CategoryBar from './components/CategoryBar.jsx'

export default function Layout({ children }) {
	return (
		<div className="min-h-screen flex flex-col bg-slate-50">
			<div className="sticky top-0 z-50 backdrop-blur-sm">
				<TopBar />
				<Header />
				<CategoryBar />
			</div>
			<main className="flex-1 pb-8">
				{children}
			</main>
			<Footer />
		</div>
	)
} 