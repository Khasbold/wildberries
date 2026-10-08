import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/useI18n.js'
import { Rabbit, Store, ShoppingBag, Sparkles, X, Truck, Shield, CreditCard, Crown } from 'lucide-react'

const STORAGE_COUNT = 'bunny_home_visit_count'
const STORAGE_LAST_SHOWN = 'bunny_onboarding_last_shown_at_count'

function shouldShowOnboarding(visitCount) {
    if (visitCount <= 0) return false
    if (visitCount === 1) return true
    if (visitCount % 8 === 0) return true
    return false
}

export function useHomeVisitOnboarding() {
    const [open, setOpen] = useState(false)
    const ran = useRef(false)

    useEffect(() => {
        if (ran.current) return
        ran.current = true
        try {
            const raw = localStorage.getItem(STORAGE_COUNT)
            const prev = raw ? parseInt(raw, 10) : 0
            const next = Number.isNaN(prev) ? 1 : prev + 1
            localStorage.setItem(STORAGE_COUNT, String(next))

            const lastShown = localStorage.getItem(STORAGE_LAST_SHOWN)
            const lastAt = lastShown ? parseInt(lastShown, 10) : 0

            if (shouldShowOnboarding(next) && lastAt !== next) {
                setOpen(true)
            }
        } catch {
            setOpen(false)
        }
    }, [])

    function dismiss() {
        try {
            const raw = localStorage.getItem(STORAGE_COUNT)
            const n = raw ? parseInt(raw, 10) : 1
            localStorage.setItem(STORAGE_LAST_SHOWN, String(n))
        } catch { /* ignore */ }
        setOpen(false)
    }

    return { open, dismiss }
}

export default function BunnyOnboardingModal({ open, onClose }) {
    const { t } = useI18n()
    const [slide, setSlide] = useState(0)
    const slides = 4

    useEffect(() => {
        if (open) setSlide(0)
    }, [open])

    if (!open) return null

    return createPortal(
        <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
            <div
                className="relative w-full max-w-[min(96vw,720px)] max-h-[80vh] rounded-3xl bg-gradient-to-br from-[#F7E9D7] via-white to-[#F7E9D7]/90 border-2 border-[#D66B3E]/25 shadow-2xl flex flex-col overflow-hidden"
                role="dialog"
                aria-labelledby="bunny-onboard-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm"
                    aria-label={t('onboarding.close')}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex-1 overflow-y-auto px-5 sm:px-10 py-6 sm:py-8">
                    {slide === 0 && (
                        <div className="space-y-4 text-center">
                            <div className="inline-flex items-center justify-center w-100 h-36 rounded-2xl bg-[#D66B3E]/15 text-[#D66B3E] mx-auto">
                                <img src="/logo3.png" alt="iBunny" className="w-100 h-36 object-contain" />
                            </div>
                            <h2 id="bunny-onboard-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                                iBunny-д тавтай морил!
                            </h2>
                            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                                iBunny платформ нь Монголын олон дэлгүүрийг нэгтгэсэн нээлттэй зах зээлийн орчин юм. Хүн бүр өөрийн онлайн дэлгүүрийг нээж бүтээгдэхүүн худалдаалах боломжтой ба хэрэглэгчдэд өргөн сонголтыг санал болгоно.
                            </p>
                            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                                <div className="text-center p-2 rounded-xl bg-white/80 border border-slate-100">
                                    <Store className="w-5 h-5 text-[#4B7F4D] mx-auto mb-1" />
                                    <p className="text-[11px] text-slate-600 font-medium">Олон дэлгүүр</p>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-white/80 border border-slate-100">
                                    <Truck className="w-5 h-5 text-[#D66B3E] mx-auto mb-1" />
                                    <p className="text-[11px] text-slate-600 font-medium">Хаяг руу хүргэлт</p>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-white/80 border border-slate-100">
                                    <Shield className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                                    <p className="text-[11px] text-slate-600 font-medium">QPay төлбөр</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {slide === 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-[#D66B3E]">
                                <ShoppingBag className="w-7 h-7 shrink-0" />
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Хэрхэн худалдан авалт хийх вэ?</h2>
                            </div>
                            <ul className="space-y-3 text-sm text-slate-700">
                                <li className="flex gap-3 items-start">
                                    <span className="w-6 h-6 rounded-full bg-[#D66B3E] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                                    <span>Каталог эсвэл дэлгүүрээс бараагаа сонгоно</span>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <span className="w-6 h-6 rounded-full bg-[#D66B3E] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                                    <span>Өнгө, хэмжээ сонгож сагсанд нэмнэ</span>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <span className="w-6 h-6 rounded-full bg-[#D66B3E] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                                    <span>Хүргэлтийн хаяг, утасны дугаар, нэрээ бөглөнө (Бүртгэл үүсгэлгүй зочноор захиалах боломжтой)</span>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <span className="w-6 h-6 rounded-full bg-[#D66B3E] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                                    <span>QPay ашиглан төлбөрөө төлж, захиалгын мэдэгдэл хүлээн авна</span>
                                </li>
                            </ul>
                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                                <strong>Мэдэгдэл:</strong> Захиалгын статус шинэчлэгдэх бүрт Push Notification ирэх тул хөтөч дээрээ мэдэгдлийг идэвхжүүлнэ үү.
                            </div>
                        </div>
                    )}
                    {slide === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-[#4B7F4D]">
                                <Store className="w-7 h-7 shrink-0" />
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Өөрийн дэлгүүрийг хэрхэн нээх вэ?</h2>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Хүн бүхэнд нээлттэй - Free түвшингөөр дэлгүүртээ 2 бүтээгдэхүүн үнэгүй байршуулах боломжтой. Түвшин өгсөхийн хэрээр илүү их үр ашгийг хүртэнэ.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { name: 'Free', products: '2', commission: '10%', color: 'bg-slate-100 text-slate-700' },
                                    { name: 'Bronze', products: '10', commission: '8%', color: 'bg-amber-100 text-amber-800' },
                                    { name: 'Silver', products: '30', commission: '6%', color: 'bg-gray-200 text-gray-800' },
                                    { name: 'Gold', products: 'Хязгааргүй', commission: '4%', color: 'bg-yellow-100 text-yellow-800' },
                                ].map((p) => (
                                    <div key={p.name} className={`rounded-xl p-3 ${p.color} border border-current/10`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Crown className="w-3.5 h-3.5" />
                                            <span className="text-sm font-bold">{p.name}</span>
                                        </div>
                                        <p className="text-[11px]">{p.products} бараа • {p.commission} шимтгэл</p>
                                    </div>
                                ))}
                            </div>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li className="flex gap-2"><Sparkles className="w-4 h-4 text-[#4B7F4D] shrink-0 mt-0.5" />Дэлгүүрийн профайл, зураг, хүргэлтийн үнийг тохируулна</li>
                                <li className="flex gap-2"><Sparkles className="w-4 h-4 text-[#4B7F4D] shrink-0 mt-0.5" />Бүтээгдэхүүн нэмж зураг, үнэ, хэмжээ, өнгөний мэдээллийг оруулна</li>
                                <li className="flex gap-2"><Sparkles className="w-4 h-4 text-[#4B7F4D] shrink-0 mt-0.5" />Худалдан авалт үүсэх үед захиалгыг хүлээн авч, хүргэгдсэний дараа QR-р хүргэлтийг баталгаажуулна</li>
                            </ul>
                        </div>
                    )}
                    {slide === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-indigo-600">
                                <CreditCard className="w-7 h-7 shrink-0" />
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Төлбөр</h2>
                            </div>
                            <div className="space-y-3 text-sm text-slate-700">
                                <div className="rounded-xl bg-white border border-slate-200 p-3">
                                    <p className="font-semibold text-slate-900 mb-1">QPay төлбөр</p>
                                    <p className="text-slate-500 text-xs">Захиалга баталгаажуулахад QPay QR код үүсэх бөгөөд скан хийж шууд төлнө</p>
                                </div>
                                <div className="rounded-xl bg-white border border-slate-200 p-3">
                                    <p className="font-semibold text-slate-900 mb-1">Мэдэгдэл</p>
                                    <p className="text-slate-500 text-xs">Захиалга үүсэх, статус шинэчлэгдэх бүрд Имэйл болон Push Notification мэдэгдэл ирнэ</p>
                                    <p className="text-slate-500 text-xs">Захиалгын явцыг дэлгүүр болон худалдан авагчийн хооронд чатаар лавлаж болно</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed pt-1">
                                Нөхцөл, нууцлалын бодлогыг сайтын доор байрлах “Төслийн тухай” хэсгээс харна уу.
                            </p>
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-[#D66B3E]/15 px-5 sm:px-6 py-3 sm:py-4 bg-white/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex gap-1.5 justify-center sm:justify-start">
                        {Array.from({ length: slides }, (_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setSlide(i)}
                                className={`h-2 rounded-full transition-all ${i === slide ? 'w-8 bg-[#D66B3E]' : 'w-2 bg-slate-300'}`}
                                aria-label={`${i + 1}`}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {slide > 0 && (
                            <button type="button" className="btn-outline flex-1 sm:flex-none py-2.5 px-4" onClick={() => setSlide((s) => s - 1)}>
                                {t('common.back')}
                            </button>
                        )}
                        {slide < slides - 1 ? (
                            <button type="button" className="btn-primary flex-1 sm:flex-none py-2.5 px-6" onClick={() => setSlide((s) => s + 1)}>
                                {t('common.next')}
                            </button>
                        ) : (
                            <button type="button" className="btn-primary flex-1 sm:flex-none py-2.5 px-6 bg-[#4B7F4D] hover:opacity-95" onClick={onClose}>
                                {t('onboarding.startShopping')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
