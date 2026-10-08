import { Check, Clock, Truck, Package, RotateCcw, AlertCircle, Send } from 'lucide-react'

const STEPS = [
    { key: 'New', icon: Clock, label: { mn: 'Шинэ', en: 'New', ru: 'Новый' } },
    { key: 'Accepted', icon: Package, label: { mn: 'Хүлээн авсан', en: 'Accepted', ru: 'Принят' } },
    { key: 'shipped', icon: Send, label: { mn: 'Илгээсэн', en: 'Shipped', ru: 'Отправлен' }, optional: true },
    { key: 'Delivered', icon: Truck, label: { mn: 'Хүргэсэн', en: 'Delivered', ru: 'Доставлен' } },
]

const TERMINAL = {
    Refunded: { icon: RotateCcw, label: { mn: 'Буцаагдсан', en: 'Refunded', ru: 'Возвращено' }, color: 'text-amber-600' },
}

export default function OrderTimeline({ status, refundStatus, locale = 'mn' }) {
    if (refundStatus === 'Requested' && status !== 'Refunded') {
        return (
            <div className="flex items-start gap-2 py-2 rounded-lg bg-orange-50 border border-orange-100 px-3">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-900">
                    {(locale === 'mn' && 'Буцаалтын хүсэлт илгээгдсэн — платформын админ батална.') ||
                        (locale === 'ru' && 'Запрос на возврат отправлен — ждёт суперадмина.') ||
                        'Refund requested — waiting for platform admin.'}
                </p>
            </div>
        )
    }

    const terminal = TERMINAL[status]
    if (terminal) {
        const Icon = terminal.icon
        return (
            <div className="flex items-center gap-2 py-2">
                <Icon className={`w-5 h-5 ${terminal.color}`} />
                <span className={`text-sm font-semibold ${terminal.color}`}>{terminal.label[locale] || terminal.label.en}</span>
            </div>
        )
    }

    // Filter out optional steps (shipped) unless the order has gone through that status
    const hasShipped = status === 'shipped'
    const visibleSteps = STEPS.filter((s) => !s.optional || hasShipped || status === 'Delivered')
    const currentIdx = visibleSteps.findIndex((s) => s.key === status)
    const activeIdx = currentIdx >= 0 ? currentIdx : 0

    return (
        <div className="flex items-center gap-1 py-2">
            {visibleSteps.map((step, idx) => {
                const Icon = step.icon
                const done = idx <= activeIdx
                const isCurrent = idx === activeIdx
                return (
                    <div key={step.key} className="flex items-center">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                            isCurrent ? 'bg-[#4B7F4D]/10' : ''
                        }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                done ? 'bg-[#4B7F4D] text-white' : 'bg-slate-200 text-slate-400'
                            }`}>
                                {done && idx < activeIdx ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                            </div>
                            <span className={`text-xs font-medium ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                                {step.label[locale] || step.label.en}
                            </span>
                        </div>
                        {idx < visibleSteps.length - 1 && (
                            <div className={`w-6 h-0.5 mx-0.5 rounded ${idx < activeIdx ? 'bg-[#4B7F4D]' : 'bg-slate-200'}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
