import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import App from './modules/App.jsx'
import { I18nProvider } from './modules/i18n/useI18n.js'
import { initFirebase } from './firebase/bootstrap.js'
import { onAuthStateChange, registerFcmTokenForUser, loadCustomerProfile } from './firebase/authService.js'
import { setAuthFromFirebase } from './modules/state/store.js'
import { startRealtimeListeners } from './firebase/realtime.js'
import { initAnalytics } from './firebase/init.js'
import { trackVisit } from './firebase/visitorTracking.js'
import './index.css'
import './theme/useDarkMode.js'

// Sync Firebase Auth to store + save FCM token + restart real-time (client notifs key may change)
onAuthStateChange(async (user) => {
	if (user) {
		const profile = await loadCustomerProfile(user.uid)
		setAuthFromFirebase(user, profile)
		registerFcmTokenForUser(user)
	} else {
		setAuthFromFirebase(null)
	}
	try { startRealtimeListeners() } catch {}
})

async function bootstrap() {
	try {
		await initFirebase()
		// Initialize Google Analytics and track unique visitor
		initAnalytics().catch(() => {})
		trackVisit().catch(() => {})
	} catch (err) {
		console.warn('[App] Firebase init failed, using fallback data:', err)
	}
	createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<HelmetProvider>
		<I18nProvider>
			<BrowserRouter>
				<App />
				<ToastContainer
					position="top-center"
					autoClose={1200}
					hideProgressBar
					newestOnTop
					closeOnClick
					rtl={false}
					pauseOnFocusLoss={false}
					draggable
					pauseOnHover={false}
					theme="light"
					limit={5}
					style={{ zIndex: 190000 }}
					toastStyle={{
						borderRadius: '12px',
						fontSize: '14px',
						padding: '8px 16px',
						minHeight: 'auto',
						boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
					}}
				/>
			</BrowserRouter>
		</I18nProvider>
		</HelmetProvider>
	</React.StrictMode>
	)
}

bootstrap() 