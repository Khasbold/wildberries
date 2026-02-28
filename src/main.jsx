import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './modules/App.jsx'
import { I18nProvider } from './modules/i18n/useI18n.js'
import './index.css'

createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<I18nProvider>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</I18nProvider>
	</React.StrictMode>
) 