import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n.js'
import { Truck, Store, Info, Send, MessageSquare } from 'lucide-react'
import { toast } from 'react-toastify'
import { addFeedbackDb } from '../../../firebase/db.js'

export default function Footer() {
	const { t } = useI18n()
	const linkClass = 'text-slate-400 hover:text-[#e98c63] inline-block hover:translate-x-0.5 transition-all duration-200'

	const [fbName, setFbName] = useState('')
	const [fbPhone, setFbPhone] = useState('')
	const [fbDesc, setFbDesc] = useState('')
	const [fbSending, setFbSending] = useState(false)

	async function handleFeedback(e) {
		e.preventDefault()
		if (!fbDesc.trim()) return
		setFbSending(true)
		try {
			await addFeedbackDb({
				name: fbName.trim() || null,
				phone: fbPhone.trim() || null,
				description: fbDesc.trim(),
				status: 'new',
			})
			toast.success('Санал хүсэлт амжилттай илгээгдлээ!')
			setFbName('')
			setFbPhone('')
			setFbDesc('')
		} catch (err) {
			console.error('Feedback error:', err)
			toast.error('Илгээхэд алдаа гарлаа. Дахин оролдоно уу.')
		} finally {
			setFbSending(false)
		}
	}

	return (
		<footer className="mt-12 sm:mt-16 bg-slate-900 text-slate-300 overflow-x-hidden">
			<div className="h-1 bg-gradient-to-r from-[#D66B3E] via-[#F7E9D7] to-[#4B7F4D]" aria-hidden="true" />
			<div className="container-app py-8 sm:py-12 lg:py-16">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
					<div>
						<h3 className="font-bold tracking-tight text-white mb-4 flex items-center gap-2.5">
							<span className="w-8 h-8 rounded-xl bg-[#D66B3E]/15 flex items-center justify-center shrink-0"><Truck className="w-4 h-4 text-[#e98c63]" /></span>
							{t('footer.buyers')}
						</h3>
						<ul className="space-y-2.5 text-sm">
							{/* <li><Link to="/catalog" className={linkClass}>{t('footer.deliveryPay')}</Link></li> */}
							{/* <li><Link to="/catalog" className={linkClass}>{t('footer.returns')}</Link></li> */}
							{/* <li><Link to="/catalog" className={linkClass}>{t('footer.pickup')}</Link></li> */}
						</ul>
					</div>
					<div>
						<h3 className="font-bold tracking-tight text-white mb-4 flex items-center gap-2.5">
							<span className="w-8 h-8 rounded-xl bg-[#4B7F4D]/20 flex items-center justify-center shrink-0"><Store className="w-4 h-4 text-[#7fb381]" /></span>
							{t('footer.partners')}
						</h3>
						<ul className="space-y-2.5 text-sm">
							{/* <li><Link to="/catalog" className={linkClass}>{t('footer.openPoint')}</Link></li> */}
							{/* <li><Link to="/catalog" className={linkClass}>{t('footer.sell')}</Link></li> */}
							<li><Link to="/catalog" className={linkClass}>{t('footer.ads')}</Link></li>
						</ul>
					</div>
					<div>
						<h3 className="font-bold tracking-tight text-white mb-4 flex items-center gap-2.5">
							<span className="w-8 h-8 rounded-xl bg-[#F7E9D7]/15 flex items-center justify-center shrink-0"><Info className="w-4 h-4 text-[#F7E9D7]" /></span>
							{t('footer.company')}
						</h3>
						<ul className="space-y-2.5 text-sm">
							<li><Link target='_blank' to="https://www.facebook.com/profile.php?id=61574330195349" className={linkClass}>iBunny</Link></li>
							<li>idealogy0108@gmail.com</li>
						</ul>
					</div>
					<div>
						<h3 className="font-bold tracking-tight text-white mb-4">© {new Date().getFullYear()}</h3>
						<p className="text-sm text-slate-400 leading-relaxed">{t('footer.note')}</p>
					</div>
				</div>

				{/* Санал хүсэлт болон Холбоо барих */}
				<div className="mt-10 pt-8 border-t border-slate-700/60">
					<div className="max-w-lg mx-auto bg-slate-800/50 rounded-2xl border border-slate-700/60 p-5 sm:p-6 shadow-soft">
						<h3 className="font-bold tracking-tight text-white mb-1 flex items-center justify-center gap-2 text-base">
							<span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D66B3E] to-[#b5532c] flex items-center justify-center shadow-brand-sm shrink-0"><MessageSquare className="w-4 h-4 text-white" /></span>
							Санал хүсэлт болон Холбоо барих
						</h3>
						<p className="text-xs text-slate-400 text-center mb-4">Бидэнд санал хүсэлтээ илгээнэ үү</p>
						<form onSubmit={handleFeedback} className="space-y-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<input
									value={fbName}
									onChange={(e) => setFbName(e.target.value)}
									placeholder="Нэр"
									className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all duration-200"
								/>
								<input
									value={fbPhone}
									onChange={(e) => setFbPhone(e.target.value)}
									placeholder="Утасны дугаар"
									className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all duration-200"
								/>
							</div>
							<textarea
								value={fbDesc}
								onChange={(e) => setFbDesc(e.target.value)}
								placeholder="Санал хүсэлтээ бичнэ үү... *"
								rows={3}
								required
								className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all duration-200 resize-none"
							/>
							<div className="flex justify-center">
								<button
									type="submit"
									disabled={fbSending || !fbDesc.trim()}
									className="btn-primary flex items-center gap-2 px-6"
								>
									<Send size={16} />
									{fbSending ? 'Илгээж байна...' : 'Илгээх'}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</footer>
	)
}
