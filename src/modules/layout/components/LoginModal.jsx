import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../../../utils/useFocusTrap.js'
import { useAuth } from '../../state/useAuth.js'
import { useI18n } from '../../i18n/useI18n.js'
import { Link } from 'react-router-dom'
import {
	signInWithEmail,
	registerWithEmail,
	saveCustomerProfile,
	signInWithGoogle,
} from '../../../firebase/authService.js'

export default function LoginModal({ open, onClose }) {
	const { t } = useI18n()
	const { isAuthenticated } = useAuth()
	const [visible, setVisible] = useState(false)
	const [mounted, setMounted] = useState(false)
	const [mode, setMode] = useState('login') // login | register
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [registerEmail, setRegisterEmail] = useState('')
	const [registerName, setRegisterName] = useState('')
	const [registerPassword, setRegisterPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const panelRef = useRef(null)

	useFocusTrap(open && mounted, panelRef, null)

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

	useEffect(() => {
		if (isAuthenticated) onClose()
	}, [isAuthenticated, onClose])

	const resetState = useCallback(() => {
		setMode('login')
		setEmail('')
		setPassword('')
		setRegisterEmail('')
		setRegisterName('')
		setRegisterPassword('')
		setError('')
		setLoading(false)
	}, [])

	async function handleLogin(e) {
		if (e) e.preventDefault()
		setError('')
		if (!email.trim() || !password) {
			setError('Емайл болон нууц үгээ оруулна уу.')
			return
		}
		setLoading(true)
		try {
			await signInWithEmail(email.trim(), password)
			resetState()
			onClose()
		} catch (err) {
			const code = err?.code || ''
			if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
				setError('Емайл эсвэл нууц үг буруу байна.')
			} else if (code === 'auth/wrong-password') {
				setError('Нууц үг буруу байна.')
			} else if (code === 'auth/too-many-requests') {
				setError('Хэт олон оролдлого. Түр хүлээнэ үү.')
			} else {
				setError(err?.message || 'Нэвтрэх амжилтгүй боллоо.')
			}
		} finally {
			setLoading(false)
		}
	}

	async function handleRegister(e) {
		if (e) e.preventDefault()
		setError('')
		if (!registerEmail.trim() || !registerPassword) {
			setError('Емайл болон нууц үгээ оруулна уу.')
			return
		}
		if (registerPassword.length < 6) {
			setError('Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.')
			return
		}
		setLoading(true)
		try {
			const user = await registerWithEmail(registerEmail.trim(), registerPassword, registerName.trim() || registerEmail.trim().split('@')[0])
			await saveCustomerProfile(user.uid, {
				name: registerName.trim() || registerEmail.trim().split('@')[0],
				email: registerEmail.trim(),
				phone: '',
				city: '',
				address: '',
			})
			resetState()
			onClose()
		} catch (err) {
			const code = err?.code || ''
			if (code === 'auth/email-already-in-use') {
				setError('Энэ емайл аль хэдийн бүртгэгдсэн байна. Нэвтрэх хэсгээр орно уу.')
			} else if (code === 'auth/invalid-email') {
				setError('Емайл хаяг буруу байна.')
			} else if (code === 'auth/weak-password') {
				setError('Нууц үг хэтэрхий богино байна. 6-с дээш тэмдэгт оруулна уу.')
			} else {
				setError(err?.message || 'Бүртгэл амжилтгүй боллоо.')
			}
		} finally {
			setLoading(false)
		}
	}

	if (!mounted) return null

	return createPortal(
		<div className="fixed inset-0 z-[110000] flex items-center justify-center px-4 pt-[10vh] pb-[10vh] min-h-0">
			<div
				className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
				onClick={onClose}
			/>

			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="login-modal-title"
				className={`relative w-full max-w-md max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-card-elevated ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all duration-300 ease-spring motion-reduce:transition-none ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 motion-reduce:scale-100 motion-reduce:translate-y-0'}`}
			>
				<div className="bg-gradient-to-br from-brand to-brand-dark px-6 py-5 text-white">
					<div className="flex items-center justify-between">
						<div>
							<h2 id="login-modal-title" className="text-lg font-bold tracking-tight">
								{mode === 'login' ? (t('loginModal.title') || 'Нэвтрэх') : 'Бүртгүүлэх'}
							</h2>
							<p className="text-sm text-white/80 mt-0.5">
								{mode === 'login'
									? 'Емайл, нууц үгээр нэвтрэх'
									: 'Емайл хаягаар бүртгүүлэх'}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							aria-label={t('a11y.closeDialog')}
							className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 active:scale-[0.92]"
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
						</button>
					</div>
				</div>

				<div className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
					{/* Google Sign-In */}
					<button
						type="button"
						disabled={loading}
						onClick={async () => {
							setError('')
							setLoading(true)
							try {
								const user = await signInWithGoogle()
								// Save customer profile if first time
								if (user) {
									try {
										await saveCustomerProfile(user.uid, {
											name: user.displayName || user.email?.split('@')[0] || '',
											email: user.email || '',
											phone: '',
											city: '',
											address: '',
										})
									} catch {}
								}
								resetState()
								onClose()
							} catch (err) {
								if (err?.code === 'auth/popup-closed-by-user') {
									// User closed popup, no error needed
								} else {
									setError(err?.message || 'Google нэвтрэлт амжилтгүй боллоо.')
								}
							} finally {
								setLoading(false)
							}
						}}
						className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-soft transition-all duration-200 active:scale-[0.98] text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
					>
						<svg width="18" height="18" viewBox="0 0 24 24">
							<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
							<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
							<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
							<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
						</svg>
						Google-ээр нэвтрэх
					</button>

					<div className="flex items-center gap-3">
						<div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-700" />
						<span className="text-xs text-slate-400">эсвэл</span>
						<div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700" />
					</div>

					<div className="grid grid-cols-2 rounded-xl bg-[#F7E9D7]/60 dark:bg-slate-800 p-1">
						<button
							type="button"
							onClick={() => { setMode('login'); setError('') }}
							className={`rounded-lg py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${mode === 'login' ? 'bg-white dark:bg-slate-700 text-[#D66B3E] shadow-soft' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
						>
							Нэвтрэх
						</button>
						<button
							type="button"
							onClick={() => { setMode('register'); setError('') }}
							className={`rounded-lg py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${mode === 'register' ? 'bg-white dark:bg-slate-700 text-[#D66B3E] shadow-soft' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
						>
							Бүртгүүлэх
						</button>
					</div>

					{mode === 'login' ? (
						<form onSubmit={handleLogin} className="space-y-3">
							<div>
								<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Емайл</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@example.com"
									className="w-full mt-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-black/30 dark:text-slate-100 rounded-xl px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-200"
									autoFocus
									autoComplete="email"
									required
								/>
							</div>
							<div>
								<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Нууц үг</label>
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									className="w-full mt-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-black/30 dark:text-slate-100 rounded-xl px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-200"
									autoComplete="current-password"
									required
								/>
							</div>
							{error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3 py-2 rounded-xl animate-fade-in">{error}</p>}
							<button type="submit" disabled={loading} className="btn-primary w-full py-3">
								{loading ? 'Нэвтэрж байна...' : 'Нэвтрэх'}
							</button>
						</form>
					) : (
						<form onSubmit={handleRegister} className="space-y-3">
							<div>
								<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Емайл</label>
								<input
									type="email"
									value={registerEmail}
									onChange={(e) => setRegisterEmail(e.target.value)}
									placeholder="you@example.com"
									className="w-full mt-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-black/30 dark:text-slate-100 rounded-xl px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-200"
									autoComplete="email"
									required
								/>
							</div>
							<div>
								<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Нэр (заавал биш)</label>
								<input
									type="text"
									value={registerName}
									onChange={(e) => setRegisterName(e.target.value)}
									placeholder="Таны нэр"
									className="w-full mt-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-black/30 dark:text-slate-100 rounded-xl px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-200"
									autoComplete="name"
								/>
							</div>
							<div>
								<label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Нууц үг</label>
								<input
									type="password"
									value={registerPassword}
									onChange={(e) => setRegisterPassword(e.target.value)}
									placeholder="6-с дээш тэмдэгт"
									className="w-full mt-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-black/30 dark:text-slate-100 rounded-xl px-4 py-3 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-200"
									autoComplete="new-password"
									required
								/>
							</div>
							{error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3 py-2 rounded-xl animate-fade-in">{error}</p>}
							<button type="submit" disabled={loading} className="btn-primary w-full py-3">
								{loading ? 'Бүртгэж байна...' : 'Бүртгүүлэх'}
							</button>
						</form>
					)}

					<div className="pt-2 divider-soft text-center">
						<p className="text-xs text-slate-500 dark:text-slate-400 mb-2 mt-2">{t('loginModal.storeOwnerPrompt') || 'Дэлгүүр эзэмшигч үү?'}</p>
						<Link
							to="/admin"
							onClick={onClose}
							className="inline-flex items-center justify-center w-full py-2.5 rounded-xl border-2 border-[#4B7F4D]/40 text-[#4B7F4D] dark:text-[#7fb381] text-sm font-semibold hover:bg-[#F7E9D7]/80 dark:hover:bg-slate-800 hover:border-[#4B7F4D]/60 hover:shadow-soft transition-all duration-200 active:scale-[0.98]"
						>
							{t('loginModal.ownerPortal') || 'Админ / дэлгүүр эзэмшигч нэвтрэх'}
						</Link>
					</div>
				</div>

			</div>
		</div>,
		document.body
	)
}
