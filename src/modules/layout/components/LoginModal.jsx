import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../state/useAuth.js'
import { useI18n } from '../../i18n/useI18n.js'

export default function LoginModal({ open, onClose }) {
	const { t } = useI18n()
	const { signIn } = useAuth()
	const [visible, setVisible] = useState(false)
	const [mounted, setMounted] = useState(false)
	const [form, setForm] = useState({ name: '', phone: '', email: '' })
	const [error, setError] = useState('')

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
		if (open) {
			document.body.style.overflow = 'hidden'
			const onKey = (e) => { if (e.key === 'Escape') onClose() }
			document.addEventListener('keydown', onKey)
			return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey) }
		}
		return () => { document.body.style.overflow = '' }
	}, [open, onClose])

	function handleSubmit(e) {
		e.preventDefault()
		setError('')
		if (!form.name.trim() || !form.email.trim()) {
			setError(t('loginModal.fillRequired') || 'Please fill in name and email.')
			return
		}
		signIn(form)
		setForm({ name: '', phone: '', email: '' })
		onClose()
	}

	if (!mounted) return null

	return createPortal(
		<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
			{/* Backdrop */}
			<div
				className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
				onClick={onClose}
			/>

			{/* Modal */}
			<div className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
				{/* Header */}
				<div className="bg-gradient-to-r from-[#FF44C2] via-brand to-brand-dark px-6 py-5 text-white">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-bold">{t('loginModal.title') || 'Sign In'}</h2>
							<p className="text-sm text-white/80 mt-0.5">{t('loginModal.subtitle') || 'Enter your details to continue'}</p>
						</div>
						<button
							onClick={onClose}
							className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
						</button>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">{t('checkout.name') || 'Name'} *</label>
						<input
							type="text"
							value={form.name}
							onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							placeholder={t('loginModal.namePlaceholder') || 'Your full name'}
							className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">{t('checkout.phone') || 'Phone'}</label>
						<input
							type="tel"
							value={form.phone}
							onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
							placeholder={t('loginModal.phonePlaceholder') || '+976 ...'}
							className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-gray-700">Email *</label>
						<input
							type="email"
							value={form.email}
							onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
							placeholder={t('loginModal.emailPlaceholder') || 'you@example.com'}
							className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
						/>
					</div>

					{error && (
						<p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
					)}

					<button
						type="submit"
						className="w-full rounded-xl bg-gray-900 text-white hover:bg-gray-800 py-3 text-sm font-semibold transition-colors"
					>
						{t('header.signIn') || 'Sign In'}
					</button>

					<p className="text-xs text-center text-gray-400">
						{t('loginModal.guestNote') || 'You can also checkout as a guest without signing in.'}
					</p>
				</form>
			</div>
		</div>,
		document.body
	)
}
