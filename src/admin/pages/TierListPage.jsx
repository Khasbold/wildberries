import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Check, Star, Crown, Percent, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardTitle, CardFooter } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/Dialog.jsx'
import { TIER_PLANS, renewTierForCurrentStore } from '../../modules/state/store.js'
import { useSession } from '../../modules/state/useSession.js'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { tierBunnyComponents } from '../components/TierBunnyIllustrations.jsx'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { createInvoice, checkPayment, extractPaidPayment } from '../../firebase/qpayService.js'

const tierGradients = {
    free: 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900',
    bronze: 'from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-950',
    silver: 'from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-800',
    gold: 'from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-950',
}

const tierBorders = {
    free: 'border-slate-300 dark:border-slate-600',
    bronze: 'border-amber-400 dark:border-amber-600',
    silver: 'border-gray-400 dark:border-gray-500',
    gold: 'border-yellow-400 dark:border-yellow-500',
}

const tierBadgeVariants = {
    free: 'bg-slate-200 text-slate-800',
    bronze: 'bg-amber-200 text-amber-900',
    silver: 'bg-gray-300 text-gray-800',
    gold: 'bg-yellow-200 text-yellow-900',
}

const DURATION_OPTIONS = [
    { months: 1, label: '1 Month', discount: 0 },
    { months: 3, label: '3 Months', discount: 10 },
    { months: 6, label: '6 Months', discount: 15 },
    { months: 12, label: '1 Year', discount: 20 },
]

export default function TierListPage() {
    const { isSuperAdmin, tier, session } = useSession()
    const { buyTierForCurrentStore } = useAdmin()
    const plans = Object.values(TIER_PLANS)
    const [upgradeModal, setUpgradeModal] = useState(null) // tierId
    const [renewModal, setRenewModal] = useState(false)
    const [selectedDuration, setSelectedDuration] = useState(0) // index

    // QPay payment state
    const [paymentStep, setPaymentStep] = useState('select') // select | paying | paid | error
    const [qpayData, setQpayData] = useState(null) // { invoice_id, qr_image, qPay_shortUrl, urls }
    const [paymentError, setPaymentError] = useState('')
    const [checkingPayment, setCheckingPayment] = useState(false)
    const pollRef = useRef(null)

    const confirmTierPayment = useCallback((months, tierId, isRenewing) => {
        if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
        }
        if (isRenewing) {
            renewTierForCurrentStore(months)
        } else {
            buyTierForCurrentStore(tierId, months)
        }
        setPaymentStep('paid')
    }, [buyTierForCurrentStore])

    const cleanupPayment = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        setPaymentStep('select')
        setQpayData(null)
        setPaymentError('')
        setCheckingPayment(false)
    }, [])

    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [])

    const handleUpgradeClick = (tierId) => {
        if (isSuperAdmin) return
        setUpgradeModal(tierId)
        setSelectedDuration(0)
        cleanupPayment()
    }

    const closeUpgradeModal = () => {
        setUpgradeModal(null)
        setRenewModal(false)
        cleanupPayment()
    }

    const handleRenewClick = () => {
        if (isSuperAdmin || !tier || tier === 'free') return
        setRenewModal(true)
        setUpgradeModal(tier)
        setSelectedDuration(0)
        cleanupPayment()
    }

    const handleConfirmUpgrade = async () => {
        if (!upgradeModal) return
        const selectedPlanLocal = TIER_PLANS[upgradeModal]
        if (!selectedPlanLocal || selectedPlanLocal.price === 0) {
            // Free tier downgrade — no payment needed
            buyTierForCurrentStore(upgradeModal, DURATION_OPTIONS[selectedDuration].months)
            closeUpgradeModal()
            return
        }

        const dur = DURATION_OPTIONS[selectedDuration]
        const total = Math.round(selectedPlanLocal.price * dur.months * (1 - dur.discount / 100))
        const invoiceId = `TIER-${renewModal ? 'RENEW' : 'UP'}-${session?.storeId || 'store'}-${Date.now()}`

        setPaymentStep('paying')
        setPaymentError('')

        try {
            const data = await createInvoice({
                orderId: invoiceId,
                amount: total,
                description: `iBunny ${selectedPlanLocal.name} tier — ${dur.label}`,
                tierId: upgradeModal,
                durationMonths: dur.months,
                isRenew: !!renewModal,
            })
            setQpayData(data)

            // Start polling for payment
            let attempts = 0
            pollRef.current = setInterval(async () => {
                attempts++
                if (attempts > 100) { // ~5 min at 3s interval
                    clearInterval(pollRef.current)
                    pollRef.current = null
                    setPaymentError('Төлбөрийн хугацаа дууслаа. Дахин оролдоно уу.')
                    setPaymentStep('error')
                    return
                }
                try {
                    const result = await checkPayment(data.invoice_id)
                    if (extractPaidPayment(result)) {
                        confirmTierPayment(dur.months, upgradeModal, !!renewModal)
                    }
                } catch {}
            }, 3000)
        } catch (err) {
            setPaymentError(err?.message || 'QPay нэхэмжлэл үүсгэхэд алдаа гарлаа.')
            setPaymentStep('error')
        }
    }

    const handleManualPaymentCheck = useCallback(async () => {
        if (!qpayData?.invoice_id || paymentStep !== 'paying') return
        setCheckingPayment(true)
        try {
            const result = await checkPayment(qpayData.invoice_id)
            if (extractPaidPayment(result)) {
                const months = DURATION_OPTIONS[selectedDuration].months
                confirmTierPayment(months, upgradeModal, !!renewModal)
            } else {
                setPaymentError('Төлбөр хараахан баталгаажаагүй байна. Дахин шалгана уу.')
            }
        } catch (err) {
            setPaymentError(err?.message || 'Төлбөр шалгахад алдаа гарлаа.')
        } finally {
            setCheckingPayment(false)
        }
    }, [qpayData, paymentStep, selectedDuration, confirmTierPayment, upgradeModal, renewModal])

    const selectedPlan = upgradeModal ? TIER_PLANS[upgradeModal] : null

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Tier Plans</h1>
                <p className="text-muted-foreground mt-1">
                    {isSuperAdmin
                        ? 'Overview of available tiers. Manage store owner tiers from the Store Owners page.'
                        : 'Choose a plan that fits your store. Upgrade anytime to unlock more products and features.'}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => {
                    const BunnyArt = tierBunnyComponents[plan.id]
                    const isCurrent = tier === plan.id
                    const isUpgrade = !isSuperAdmin && !isCurrent

                    return (
                        <Card
                            key={plan.id}
                            className={`relative overflow-hidden border-2 transition-shadow hover:shadow-lg ${
                                isCurrent ? tierBorders[plan.id] + ' shadow-md' : 'border-border'
                            }`}
                        >
                            {/* Gradient Header */}
                            <div className={`bg-gradient-to-br ${tierGradients[plan.id]} px-6 pt-6 pb-4 text-center relative`}>
                                {/* Silver tier "Эрэлттэй" ribbon */}
                                {plan.id === 'silver' && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold tracking-wide px-4 py-1 rounded-b-lg shadow-md">
                                            ⭐ Эрэлттэй
                                        </div>
                                    </div>
                                )}
                                {isCurrent && (
                                    <Badge className={`absolute top-3 right-3 ${tierBadgeVariants[plan.id]}`}>
                                        Current
                                    </Badge>
                                )}
                                <div className="mx-auto mb-2 flex h-[7.5rem] w-[7.5rem] items-center justify-center drop-shadow-sm">
                                    {BunnyArt ? <BunnyArt className="h-full w-full max-h-[120px] max-w-[120px]" /> : null}
                                </div>
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <div className="mt-3 flex items-baseline justify-center gap-1">
                                    <span className="text-3xl font-extrabold">
                                        {plan.price === 0 ? 'Free' : formatCurrency(plan.price)}
                                    </span>
                                    {plan.price > 0 && <span className="text-sm text-muted-foreground">/сардаа</span>}
                                </div>
                            </div>

                            <CardContent className="pt-5 pb-2">
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    <span className="font-bold text-foreground">{plan.maxProducts === -1 ? 'Хязгааргүй' : plan.maxProducts}</span> бараа оруулах
                                </p>
                                <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-purple-50 border border-purple-100">
                                    <Percent className="h-3.5 w-3.5 text-purple-600" />
                                    <span className="text-xs font-semibold text-purple-800">Commission: {plan.commission}%</span>
                                </div>
                                <ul className="space-y-2">
                                    {plan.benefits.map((b, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="pt-2 pb-5">
                                {isSuperAdmin ? (
                                    <Button variant="outline" className="w-full" disabled>
                                        Manage via Store Owners
                                    </Button>
                                ) : isCurrent ? (
                                    <div className="w-full space-y-2">
                                        <Button variant="outline" className="w-full" disabled>
                                            <Star className="h-4 w-4 mr-2" /> Current Plan
                                        </Button>
                                        {plan.price > 0 && (
                                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleRenewClick}>
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Сунгах
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <Button className="w-full" onClick={() => handleUpgradeClick(plan.id)}>
                                        <Crown className="h-4 w-4 mr-2" />
                                        {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            {!isSuperAdmin && tier && (
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={tierBadgeVariants[tier]}>
                                {TIER_PLANS[tier]?.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                Your current plan allows up to{' '}
                                <strong>{TIER_PLANS[tier]?.maxProducts === -1 ? 'unlimited' : TIER_PLANS[tier]?.maxProducts}</strong> products
                                with <strong>{TIER_PLANS[tier]?.commission}%</strong> commission rate.
                            </span>
                            {session?.tierEndDate && (
                                <Badge className="bg-indigo-100 text-indigo-800">
                                    Дуусах: {session.tierEndDate}
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Upgrade Pricing Modal */}
            <Dialog open={!!upgradeModal} onOpenChange={(open) => { if (!open) closeUpgradeModal() }}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-yellow-500" />
                            {renewModal ? `${selectedPlan?.name} Tier сунгах` : `Upgrade to ${selectedPlan?.name}`}
                        </DialogTitle>
                        <DialogDescription>
                            {renewModal
                                ? `Одоогийн хугацаа: ${session?.tierEndDate || '—'}. Сунгасан хугацаа нь дуусах хугацаанаас цааш нэмэгдэнэ.`
                                : 'Choose your subscription duration. Longer plans come with bigger discounts.'}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPlan && (
                        <div className="space-y-5">
                            {/* Duration selector */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {DURATION_OPTIONS.map((opt, idx) => {
                                    const isSelected = selectedDuration === idx
                                    const total = selectedPlan.price * opt.months
                                    const discounted = Math.round(total * (1 - opt.discount / 100))
                                    return (
                                        <button
                                            key={opt.months}
                                            type="button"
                                            onClick={() => setSelectedDuration(idx)}
                                            className={`relative rounded-xl border-2 p-3 text-center transition-all ${isSelected ? 'border-[#D66B3E] bg-[#D66B3E]/5 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {opt.discount > 0 && (
                                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    -{opt.discount}%
                                                </span>
                                            )}
                                            <p className={`text-sm font-bold ${isSelected ? 'text-[#D66B3E]' : 'text-slate-900'}`}>{opt.label}</p>
                                            <p className="text-lg font-extrabold mt-1">{formatCurrency(discounted)}</p>
                                            {opt.discount > 0 && (
                                                <p className="text-[10px] text-slate-400 line-through">{formatCurrency(total)}</p>
                                            )}
                                            <p className="text-[10px] text-slate-500 mt-0.5">{formatCurrency(Math.round(discounted / opt.months))}/mo</p>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Plan summary */}
                            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Plan</span>
                                    <Badge className={tierBadgeVariants[upgradeModal]}>{selectedPlan.name}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Products</span>
                                    <span className="text-sm font-semibold">{selectedPlan.maxProducts === -1 ? 'Unlimited' : `Up to ${selectedPlan.maxProducts}`}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Commission Rate</span>
                                    <span className="text-sm font-semibold text-purple-700">{selectedPlan.commission}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Duration</span>
                                    <span className="text-sm font-semibold">{DURATION_OPTIONS[selectedDuration].label}</span>
                                </div>
                                {renewModal && session?.tierEndDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">Шинэ дуусах огноо</span>
                                        <span className="text-sm font-semibold text-emerald-700">
                                            {(() => {
                                                const now = new Date()
                                                let startFrom = now
                                                if (session.tierEndDate) {
                                                    const currentEnd = new Date(session.tierEndDate + 'T23:59:59')
                                                    if (currentEnd > now) startFrom = currentEnd
                                                }
                                                const endDate = new Date(startFrom)
                                                endDate.setMonth(endDate.getMonth() + DURATION_OPTIONS[selectedDuration].months)
                                                return endDate.toISOString().slice(0, 10)
                                            })()}
                                        </span>
                                    </div>
                                )}
                                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-900">Total</span>
                                    <span className="text-xl font-extrabold text-[#D66B3E]">
                                        {formatCurrency(Math.round(selectedPlan.price * DURATION_OPTIONS[selectedDuration].months * (1 - DURATION_OPTIONS[selectedDuration].discount / 100)))}
                                    </span>
                                </div>
                                {DURATION_OPTIONS[selectedDuration].discount > 0 && (
                                    <p className="text-xs text-emerald-600 font-medium text-center">
                                        You save {formatCurrency(Math.round(selectedPlan.price * DURATION_OPTIONS[selectedDuration].months * DURATION_OPTIONS[selectedDuration].discount / 100))}!
                                    </p>
                                )}
                            </div>

                            {/* Benefits */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Included Benefits</p>
                                <ul className="space-y-1.5">
                                    {selectedPlan.benefits.map((b, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm">
                                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* QPay Payment Section */}
                            {paymentStep === 'paying' && qpayData && (
                                <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 text-center space-y-3">
                                    <p className="text-sm font-semibold text-blue-800">QPay-ээр төлбөрөө хийнэ үү</p>
                                    {qpayData.qr_image && (
                                        <img src={`data:image/png;base64,${qpayData.qr_image}`} alt="QPay QR" className="mx-auto w-48 h-48 rounded-xl border border-blue-200" />
                                    )}
                                    {qpayData.qPay_shortUrl && (
                                        <a href={qpayData.qPay_shortUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block">
                                            QPay апп-аар нээх
                                        </a>
                                    )}
                                    {qpayData.urls && qpayData.urls.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                                            {qpayData.urls.slice(0, 6).map((u) => (
                                                <a key={u.name} href={u.link} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                                                    {u.logo && <img src={u.logo} alt={u.description || u.name} className="w-8 h-8 rounded-lg" />}
                                                    <span className="text-[9px] text-slate-600 max-w-[50px] truncate">{u.description || u.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-center gap-2 text-xs text-blue-700">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Төлбөр хүлээж байна...</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleManualPaymentCheck}
                                        disabled={checkingPayment}
                                    >
                                        {checkingPayment ? 'Шалгаж байна...' : 'Төлбөр шалгах'}
                                    </Button>
                                </div>
                            )}

                            {paymentStep === 'paying' && !qpayData && (
                                <div className="rounded-xl border border-slate-200 p-6 text-center">
                                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-slate-400" />
                                    <p className="text-sm text-slate-500">QPay нэхэмжлэл үүсгэж байна...</p>
                                </div>
                            )}

                            {paymentStep === 'paid' && (
                                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center space-y-2">
                                    <Check size={32} className="mx-auto text-emerald-600" />
                                    <p className="text-sm font-bold text-emerald-800">Төлбөр амжилттай!</p>
                                    <p className="text-xs text-emerald-600">{renewModal ? `Таны ${selectedPlan?.name} tier амжилттай сунгагдлаа.` : `Таны ${selectedPlan?.name} tier идэвхжлээ.`}</p>
                                </div>
                            )}

                            {paymentStep === 'error' && (
                                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center space-y-2">
                                    <p className="text-sm font-semibold text-red-700">Алдаа гарлаа</p>
                                    <p className="text-xs text-red-600">{paymentError}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeUpgradeModal}>
                            {paymentStep === 'paid' ? 'Хаах' : 'Болих'}
                        </Button>
                        {paymentStep === 'select' && (
                            <Button onClick={handleConfirmUpgrade} className="bg-[#D66B3E] hover:bg-[#c45d35]">
                                <Crown className="h-4 w-4 mr-2" />
                                {selectedPlan?.price === 0 ? 'Confirm Downgrade' : renewModal ? 'QPay-ээр сунгах' : 'QPay-ээр төлөх'}
                            </Button>
                        )}
                        {paymentStep === 'error' && (
                            <Button onClick={() => { cleanupPayment(); }} className="bg-[#D66B3E] hover:bg-[#c45d35]">
                                Дахин оролдох
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
