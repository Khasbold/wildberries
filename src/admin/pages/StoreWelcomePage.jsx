import { useMemo, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useSession } from '../../modules/state/useSession.js'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { TIER_PLANS, subscribe, getState } from '../../modules/state/store.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { getFunnelData } from '../../utils/analytics.js'
import {
    Package, ShoppingBag, Users, Ticket, QrCode, CreditCard,
    Crown, ArrowRight, Store, CheckCircle, Truck, AlertCircle, Lock, TrendingUp, Percent, Sparkles, Trophy, BookOpen, Eye, ShoppingCart, CreditCard as CardIcon, BarChart3
} from 'lucide-react'

const WORKFLOW_STEPS = [
    {
        icon: Store,
        title: 'Дэлгүүрээ тохируулах',
        titleEn: 'Set up your store',
        desc: 'Дэлгүүрийн нэр, зураг, хүргэлтийн үнэ, дансны мэдээллээ оруулна.',
        descEn: 'Configure your store name, image, delivery price, and bank account info.',
        link: '/admin/profile',
        linkLabel: 'Store Profile',
        requiredTier: 'free',
    },
    {
        icon: Package,
        title: 'Бүтээгдэхүүн нэмэх',
        titleEn: 'Add products',
        desc: 'Tier-д тань тохирсон тоогоор бүтээгдэхүүнүүдээ нэмнэ. Зураг, үнэ, тоо ширхэг оруулна.',
        descEn: 'Add products within your tier limit. Include images, pricing, and stock quantity.',
        link: '/admin/products',
        linkLabel: 'Products',
        requiredTier: 'free',
    },
    {
        icon: ShoppingBag,
        title: 'Захиалга хүлээн авах',
        titleEn: 'Receive orders',
        desc: 'Хэрэглэгч захиалга өгөхөд танд мэдэгдэл ирнэ. Захиалгаа хүлээн авна.',
        descEn: 'When customers place orders, you get notified. Accept the order.',
        link: '/admin/orders',
        linkLabel: 'Orders',
        requiredTier: 'free',
    },
    {
        icon: QrCode,
        title: 'Хүргэлт баталгаажуулах',
        titleEn: 'Confirm delivery via QR',
        desc: 'Хэрэглэгчийн QR кодыг уншуулж хүргэлтийг баталгаажуулна.',
        descEn: 'Scan the customer QR code to confirm delivery.',
        link: '/admin/delivery-scan',
        linkLabel: 'Delivery Scan',
        requiredTier: 'free',
    },
    {
        icon: CreditCard,
        title: 'Орлого хүлээн авах',
        titleEn: 'Receive payment',
        desc: 'SuperAdmin таны данс руу орлогыг шилжүүлэх бөгөөд статус "Bunny" болно.',
        descEn: 'SuperAdmin transfers payment to your bank account. Status becomes "Bunny".',
        requiredTier: 'free',
    },
    {
        icon: Ticket,
        title: 'Хямдралын код (Promo Code)',
        titleEn: 'Create promo / discount codes',
        desc: 'Өөрийн дэлгүүрт зориулсан промо код үүсгэж, хэрэглэгчдийг татна.',
        descEn: 'Create promo codes for your store to attract and reward customers.',
        link: '/admin/discounts',
        linkLabel: 'Discounts',
        requiredTier: 'bronze',
    },
    {
        icon: Eye,
        title: 'Дэлгүүрийн banner оруулах',
        titleEn: 'Store page banner image',
        desc: 'Дэлгүүрийн хуудсанд banner зураг нэмж, илүү мэргэжлийн харагдуулна.',
        descEn: 'Add a banner image to your store page for a professional look.',
        link: '/admin/profile',
        linkLabel: 'Store Profile',
        requiredTier: 'bronze',
    },
    {
        icon: Sparkles,
        title: 'Нэг барааг онцлох',
        titleEn: 'Highlight one product',
        desc: 'Нэг бүтээгдэхүүнийг онцлох байрлалд гаргаж, илүү их анхаарал татна.',
        descEn: 'Feature one product in a highlighted position for more visibility.',
        requiredTier: 'silver',
    },
    {
        icon: Package,
        title: 'Захиалгат бараа оруулах',
        titleEn: 'Custom order products',
        desc: 'Захиалгаар хийдэг бүтээгдэхүүнүүдийг оруулж, захиалагчтай харилцах боломж.',
        descEn: 'List custom/made-to-order products and communicate with customers.',
        requiredTier: 'gold',
    },
    {
        icon: CreditCard,
        title: 'Хувийн данс холбох',
        titleEn: 'Connect personal bank account',
        desc: 'Шууд өөрийн данс руу орлого хүлээн авах тохиргоо.',
        descEn: 'Receive payments directly to your own bank account.',
        requiredTier: 'gold',
    },
    {
        icon: CreditCard,
        title: 'Өөрийн QPay төлбөр',
        titleEn: 'Own QPay payment gateway',
        desc: 'Өөрийн QPay merchant данс холбож, төлбөрийг шууд хүлээн авна.',
        descEn: 'Connect your own QPay merchant to receive payments directly.',
        requiredTier: 'gold',
    },
    {
        icon: Trophy,
        title: 'Home page Banner байршуулах',
        titleEn: 'Home page banner submission',
        desc: 'Нүүр хуудсанд Banner зураг илгээж, SuperAdmin зөвшөөрсний дараа харагдана.',
        descEn: 'Submit a banner for the home page. Goes live after SuperAdmin approval.',
        link: '/admin/banners',
        linkLabel: 'Banners',
        requiredTier: 'gold',
    },
]

const REMINDERS = [
    { icon: AlertCircle, text: 'Бүтээгдэхүүний зурагнууд чанартай, тодорхой байх ёстой.', textEn: 'Product images should be high quality and clear.' },
    { icon: AlertCircle, text: 'Хүргэлтийн үнийг Store Profile-д зөв тохируулна уу.', textEn: 'Set delivery price correctly in Store Profile.' },
    { icon: AlertCircle, text: 'Дансны дугаараа зөв оруулсан эсэхийг шалгана уу.', textEn: 'Verify your bank account number is correct.' },
    { icon: CheckCircle, text: 'Захиалга ирмэгц хурдан хүлээн аваарай — хэрэглэгч хүлээхийг хүсэхгүй.', textEn: 'Accept orders quickly — customers don\'t like waiting.' },
    { icon: CheckCircle, text: 'Tier-ээ шинэчлэн илүү олон бүтээгдэхүүн нэмэх боломжтой.', textEn: 'Upgrade your tier to list more products.' },
]

const tierOrder = ['free', 'bronze', 'silver', 'gold']

export default function StoreWelcomePage() {
    const { session, tier } = useSession()
    const { orders, deriveAggregateStatus, products: adminProductsList } = useAdmin()
    const state = useSyncExternalStore(subscribe, getState)
    const adminUsers = state.adminUsers || []
    const currentTier = tier || 'free'
    const plan = TIER_PLANS[currentTier] || TIER_PLANS.free

    // Get showcased stores (selected by SuperAdmin)
    const showcasedStores = useMemo(() => {
        return adminUsers
            .filter((u) => u.role === 'admin' && u.showcased && !u.disabled)
            .map((u) => {
                const storeOrders = orders.filter((o) => {
                    if (o.storeId === u.storeId) return true
                    if (Array.isArray(o.storeIds) && o.storeIds.includes(u.storeId)) return true
                    if (Array.isArray(o.items) && o.items.some((item) => item.storeId === u.storeId)) return true
                    return false
                })
                let productsSold = 0
                for (const o of storeOrders) {
                    const items = Array.isArray(o.items) ? o.items : []
                    for (const item of items) {
                        if (!u.storeId || item.storeId === u.storeId || !item.storeId) {
                            productsSold += Number(item.quantity || 1)
                        }
                    }
                }
                return {
                    storeName: u.storeName || u.storeId,
                    productsSold,
                    storeImage: u.storeImage || null,
                }
            })
            .sort((a, b) => b.productsSold - a.productsSold)
    }, [adminUsers, orders])

    // Calculate this month's Bunny-status sales
    const monthlyStats = useMemo(() => {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        let bunnySales = 0
        let bunnyCount = 0

        for (const order of orders) {
            const status = deriveAggregateStatus(order)
            if (status !== 'Bunny') continue
            const d = new Date(order.createdAt || 0)
            if (d >= monthStart) {
                bunnySales += Number(order.total || 0)
                bunnyCount++
            }
        }

        const commissionRate = plan.commission / 100
        const qpayFee = Math.round(bunnySales * 0.01)
        const qpayFlatFee = bunnyCount * 200 // Гүйлгээний хураамж per order
        const commissionPaid = Math.round(bunnySales * commissionRate) // Commission from total amount
        const revenueAfterFees = bunnySales - qpayFee - qpayFlatFee - commissionPaid

        return { bunnySales, bunnyCount, commissionPaid, commissionRate: plan.commission, qpayFee, qpayFlatFee, revenueAfterFees }
    }, [orders, deriveAggregateStatus, plan.commission])

    // Calculate savings on next tier
    const nextTierSavings = useMemo(() => {
        const idx = tierOrder.indexOf(currentTier)
        if (idx >= tierOrder.length - 1) return null // Already gold
        const nextId = tierOrder[idx + 1]
        const nextPlan = TIER_PLANS[nextId]
        if (!nextPlan) return null

        const nextRate = nextPlan.commission / 100
        const currentRate = plan.commission / 100
        const savingsOnCommission = Math.round(monthlyStats.bunnySales * (currentRate - nextRate))

        return {
            nextTier: nextPlan,
            nextId,
            savingsOnCommission,
            currentCommission: monthlyStats.commissionPaid,
            nextCommission: Math.round(monthlyStats.bunnySales * nextRate),
        }
    }, [currentTier, plan.commission, monthlyStats])

    const storeSlug = useMemo(() => {
        if (!session?.storeId) return null
        const u = adminUsers.find((a) => a.storeId === session.storeId)
        return u?.slug || session.storeId
    }, [session, adminUsers])

    const storeProducts = useMemo(() => {
        return adminProductsList.filter((p) => p.storeId === session?.storeId)
    }, [adminProductsList, session])

    // Onboarding wizard progress
    const onboarding = useMemo(() => {
        const hasProfile = !!(session?.storeName && session?.storeImage)
        const hasProducts = storeProducts.length > 0
        const steps = [
            { key: 'profile', label: 'Дэлгүүр тохируулах', labelEn: 'Set up store profile', done: hasProfile, link: '/admin/profile' },
            { key: 'product', label: 'Бүтээгдэхүүн нэмэх', labelEn: 'Add first product', done: hasProducts, link: '/admin/products/new' },
            { key: 'preview', label: 'Дэлгүүр харах', labelEn: 'Preview your store', done: hasProfile && hasProducts, link: storeSlug ? `/stores/${storeSlug}` : '/admin/profile' },
        ]
        const completed = steps.filter((s) => s.done).length
        return { steps, completed, total: steps.length, pct: Math.round((completed / steps.length) * 100) }
    }, [session, storeProducts, storeSlug])

    // Conversion funnel
    const funnel = useMemo(() => getFunnelData(7), [])
    const funnelSteps = [
        { key: 'view_item', label: 'Харсан', labelEn: 'Views', icon: Eye, color: 'text-blue-600 bg-blue-100' },
        { key: 'add_to_cart', label: 'Сагсанд', labelEn: 'Add to cart', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-100' },
        { key: 'begin_checkout', label: 'Checkout', labelEn: 'Checkout', icon: CardIcon, color: 'text-purple-600 bg-purple-100' },
        { key: 'purchase', label: 'Худалдан авалт', labelEn: 'Purchase', icon: BarChart3, color: 'text-amber-600 bg-amber-100' },
    ]

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Onboarding wizard */}
            {onboarding.completed < onboarding.total && (
                <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50/50 to-purple-50/30">
                    <CardContent className="pt-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={18} className="text-indigo-600" />
                            <h3 className="text-sm font-bold text-slate-900">Эхлэх алхмууд</h3>
                            <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">{onboarding.completed}/{onboarding.total}</Badge>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full mb-4 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${onboarding.pct}%` }} />
                        </div>
                        <div className="space-y-2">
                            {onboarding.steps.map((step) => (
                                <Link key={step.key} to={step.link} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${step.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-white'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                        {step.done ? <CheckCircle size={14} /> : <span className="text-xs font-bold">{onboarding.steps.indexOf(step) + 1}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${step.done ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>{step.label}</p>
                                        <p className="text-xs text-slate-400">{step.labelEn}</p>
                                    </div>
                                    {!step.done && <ArrowRight size={14} className="text-slate-400 shrink-0" />}
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Welcome header */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 md:p-8 border border-indigo-100">
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    {session?.storeImage ? (
                        <img src={session.storeImage} alt={session.storeName} className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white shadow-md shrink-0" />
                    ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-md shrink-0">
                            {session?.storeName?.[0] || 'S'}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 truncate">
                            Тавтай морилно уу, {session?.name || 'Store Owner'}!
                        </h1>
                        <p className="text-slate-600 mt-1 text-sm sm:text-base truncate">{session?.storeName || 'Your Store'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={`${
                        currentTier === 'gold' ? 'bg-yellow-200 text-yellow-900' :
                        currentTier === 'silver' ? 'bg-gray-300 text-gray-800' :
                        currentTier === 'bronze' ? 'bg-amber-200 text-amber-900' :
                        'bg-slate-200 text-slate-800'
                    }`}>
                        <Crown size={12} className="mr-1" />
                        {plan.name} Tier — {plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts} бүтээгдэхүүн хүртэл
                    </Badge>
                    {session?.tierEndDate && (
                        <Badge className="bg-indigo-100 text-indigo-800">
                            Tier дуусах хугацаа: {session.tierEndDate}
                        </Badge>
                    )}
                    <Link to="/admin/tier-list">
                        <Button size="sm" className="bg-gradient-to-r from-[#D66B3E] to-[#c45d35] hover:from-[#c45d35] hover:to-[#b85430] text-white shadow-md text-xs gap-1.5">
                            <Crown size={14} />
                            Tier шинэчлэх
                            <ArrowRight size={12} />
                        </Button>
                    </Link>
                    <Link to="/admin/instructions">
                        <Button size="sm" className="bg-gradient-to-r from-[#A855F7] to-[#c45d35] hover:from-[#A855F7] hover:to-[#A855F7] text-white shadow-md text-xs gap-1.5">
                            <BookOpen size={14} />
                            Заавар унших
                            <Store size={12} />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Conversion funnel */}
            <Card className="border-l-4 border-l-sky-500">
                <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <BarChart3 size={18} className="text-sky-600" />
                        <h3 className="text-sm font-bold text-slate-900">Борлуулалтын юүлүүр</h3>
                        <Badge className="bg-sky-100 text-sky-700 text-[10px]">Сүүлийн 7 хоног</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {funnelSteps.map((step, i) => {
                            const Icon = step.icon
                            const count = funnel[step.key] || 0
                            const prevCount = i > 0 ? (funnel[funnelSteps[i - 1].key] || 0) : 0
                            const rate = i > 0 && prevCount > 0 ? Math.round((count / prevCount) * 100) : null
                            return (
                                <div key={step.key} className="text-center p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                    <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center mx-auto mb-2`}>
                                        <Icon size={18} />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900">{count}</p>
                                    <p className="text-xs text-slate-500 leading-tight">{step.label}</p>
                                    <p className="text-[10px] text-slate-400">{step.labelEn}</p>
                                    {rate !== null && (
                                        <p className={`text-[10px] font-semibold mt-1 ${rate >= 50 ? 'text-emerald-600' : rate >= 20 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {rate}% хөрвүүлэлт
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {funnel.view_item > 0 && funnel.purchase > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                            <p className="text-xs text-slate-500">
                                Нийт хөрвүүлэлт: <span className="font-bold text-slate-900">{Math.round((funnel.purchase / funnel.view_item) * 100)}%</span>
                                <span className="text-slate-400 ml-1">(Харсан → Худалдан авалт)</span>
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Monthly Sales & Commission Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="pt-5">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={16} className="text-emerald-600" />
                            <p className="text-xs font-medium text-slate-500">Энэ сарын борлуулалт</p>
                        </div>
                        <p className="text-xs text-slate-400 mb-1">This month's Bunny sales</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyStats.bunnySales)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{monthlyStats.bunnyCount} захиалга (Bunny)</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-5">
                        <div className="flex items-center gap-2 mb-1">
                            <CreditCard size={16} className="text-blue-600" />
                            <p className="text-xs font-medium text-slate-500">QPay шимтгэл (1%)</p>
                        </div>
                        <p className="text-xs text-slate-400 mb-1">QPay fee deducted first</p>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(monthlyStats.qpayFee)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Шимтгэлийн дараах орлого: {formatCurrency(monthlyStats.revenueAfterFees)}</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-5">
                        <div className="flex items-center gap-2 mb-1">
                            <Percent size={16} className="text-purple-600" />
                            <p className="text-xs font-medium text-slate-500">Платформ шимтгэл</p>
                        </div>
                        <p className="text-xs text-slate-400 mb-1">Commission paid ({monthlyStats.commissionRate}%) from after QPay</p>
                        <p className="text-2xl font-bold text-purple-700">{formatCurrency(monthlyStats.commissionPaid)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{plan.name} tier rate: {plan.commission}%</p>
                    </CardContent>
                </Card>
                {nextTierSavings ? (
                    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-yellow-50/50">
                        <CardContent className="pt-5">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={16} className="text-amber-600" />
                                <p className="text-xs font-medium text-slate-500">Хэмнэлт боломж</p>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">Save with {nextTierSavings.nextTier.name} tier</p>
                            <p className="text-2xl font-bold text-amber-700">{formatCurrency(nextTierSavings.savingsOnCommission)}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {nextTierSavings.nextTier.commission}% vs {plan.commission}% commission
                            </p>
                            <Link to="/admin/tier-list" className="inline-flex items-center gap-1 mt-2 text-xs text-amber-700 font-semibold hover:underline">
                                Upgrade to {nextTierSavings.nextTier.name} <ArrowRight size={12} />
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-50/50 to-amber-50/50">
                        <CardContent className="pt-5">
                            <div className="flex items-center gap-2 mb-1">
                                <Crown size={16} className="text-yellow-600" />
                                <p className="text-xs font-medium text-slate-500">Gold Tier</p>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">You have the best plan</p>
                            <p className="text-lg font-bold text-yellow-700 mt-2">Хамгийн бага шимтгэл!</p>
                            <p className="text-[11px] text-slate-400 mt-1">Lowest commission at {plan.commission}%</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Showcased Stores - motivation board */}
            {showcasedStores.length > 0 && (
                <Card className="border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50/30 to-yellow-50/20">
                    <CardContent className="pt-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Trophy size={18} className="text-amber-600" />
                            <h3 className="text-sm font-bold text-slate-900">Top Performing Stores</h3>
                            <Badge className="bg-amber-100 text-amber-700 text-[10px]">Motivation Board</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {showcasedStores.map((s) => (
                                <div key={s.storeName} className="flex items-center gap-3 border border-amber-200/60 rounded-xl p-3 bg-white/60">
                                    {s.storeImage ? (
                                        <img src={s.storeImage} alt={s.storeName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold shrink-0">
                                            {s.storeName[0]}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{s.storeName}</p>
                                        <p className="text-xs text-slate-500">Бүтээгдэхүүн зарагдсан</p>
                                    </div>
                                    <p className="text-sm font-bold text-amber-700 shrink-0">{s.productsSold} ш</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                {[
                    { to: '/admin/orders', icon: ShoppingBag, label: 'Захиалгууд', color: 'bg-blue-100 text-blue-600' },
                    { to: '/admin/products', icon: Package, label: 'Бүтээгдэхүүн', color: 'bg-emerald-100 text-emerald-600' },
                    { to: '/admin/customers', icon: Users, label: 'Хэрэглэгчид', color: 'bg-purple-100 text-purple-600' },
                    { to: '/admin/delivery-scan', icon: QrCode, label: 'Хүргэлт', color: 'bg-orange-100 text-orange-600' },
                    { to: '/admin/instructions', icon: BookOpen, label: 'Заавар унших', color: 'bg-violet-100 text-violet-600' },
                ].map((item) => {
                    const Icon = item.icon
                    return (
                        <Link key={item.to} to={item.to} className="group">
                            <Card className="hover:shadow-md transition-shadow hover:border-slate-300">
                                <CardContent className="pt-5 pb-4 flex flex-col items-center gap-2 text-center">
                                    <div className={`h-10 w-10 rounded-xl ${item.color} flex items-center justify-center`}>
                                        <Icon size={20} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                                    <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {/* How it works - workflow */}
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Бидний систем хэрхэн ажилладаг</h2>
                    <p className="text-sm text-slate-500 mb-6">How our platform works — step by step</p>
                    <div className="space-y-4">
                        {WORKFLOW_STEPS.map((step, i) => {
                            const Icon = step.icon
                            const stepTierIdx = tierOrder.indexOf(step.requiredTier || 'free')
                            const currentTierIdx = tierOrder.indexOf(currentTier)
                            const isLocked = stepTierIdx > currentTierIdx
                            const requiredTierPlan = TIER_PLANS[step.requiredTier]
                            return (
                                <div key={i} className={`flex gap-4 ${isLocked ? 'opacity-60' : ''}`}>
                                    <div className="flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                            isLocked ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'
                                        }`}>
                                            {isLocked ? <Lock size={16} /> : i + 1}
                                        </div>
                                        {i < WORKFLOW_STEPS.length - 1 && (
                                            <div className={`w-0.5 flex-1 mt-1 ${isLocked ? 'bg-slate-200' : 'bg-indigo-100'}`} />
                                        )}
                                    </div>
                                    <div className="pb-6">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <Icon size={16} className={isLocked ? 'text-slate-400' : 'text-slate-600'} />
                                            <h3 className={`font-semibold ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}>{step.title}</h3>
                                            {isLocked && requiredTierPlan && (
                                                <Badge className={`text-[10px] ${
                                                    step.requiredTier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                                    step.requiredTier === 'silver' ? 'bg-gray-200 text-gray-700' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                    <Lock size={10} className="mr-0.5" />
                                                    {requiredTierPlan.name} болон түүнээс дээш
                                                </Badge>
                                            )}
                                        </div>
                                        <p className={`text-sm ${isLocked ? 'text-slate-400' : 'text-slate-500'}`}>{step.desc}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{step.descEn}</p>
                                        {isLocked ? (
                                            <Link to="/admin/tier-list" className="inline-flex items-center gap-1 mt-2 text-xs text-orange-600 font-medium hover:underline">
                                                <Crown size={12} /> {requiredTierPlan?.name} tier-рүү шинэчлэх <ArrowRight size={12} />
                                            </Link>
                                        ) : step.link ? (
                                            <Link to={step.link} className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-600 font-medium hover:underline">
                                                {step.linkLabel} <ArrowRight size={12} />
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Reminders */}

            {/* Tier Features - what each tier unlocks */}
            <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-1">
                        <Crown size={18} className="text-purple-600" />
                        <h2 className="text-lg font-bold text-slate-900">Tier бүрийн боломжууд</h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-5">Features available per tier plan</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.values(TIER_PLANS).map((tp) => {
                            const isCurrent = currentTier === tp.id
                            const tierIdx = tierOrder.indexOf(tp.id)
                            const currentIdx = tierOrder.indexOf(currentTier)
                            const isLocked = tierIdx > currentIdx
                            return (
                                <div key={tp.id} className={`rounded-xl border p-4 transition-all ${isCurrent ? 'border-purple-300 bg-purple-50/50 ring-1 ring-purple-200' : isLocked ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className={`text-[10px] ${
                                            tp.id === 'gold' ? 'bg-yellow-200 text-yellow-900' :
                                            tp.id === 'silver' ? 'bg-gray-300 text-gray-800' :
                                            tp.id === 'bronze' ? 'bg-amber-200 text-amber-900' :
                                            'bg-slate-200 text-slate-800'
                                        }`}>
                                            {tp.name}
                                        </Badge>
                                        {isCurrent && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Одоогийн</Badge>}
                                        {isLocked && <Lock size={12} className="text-slate-400" />}
                                        <span className="text-xs text-slate-400 ml-auto">{tp.price === 0 ? 'Үнэгүй' : formatCurrency(tp.price) + '/сар'}</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {tp.benefits.map((b, i) => (
                                            <li key={i} className="flex items-start gap-1.5 text-xs">
                                                <CheckCircle size={12} className={`mt-0.5 shrink-0 ${isLocked ? 'text-slate-300' : 'text-emerald-500'}`} />
                                                <span className={isLocked ? 'text-slate-400' : 'text-slate-700'}>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {isLocked && (
                                        <Link to="/admin/tier-list" className="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 font-medium hover:underline">
                                            <Crown size={12} /> Upgrade хийх <ArrowRight size={12} />
                                        </Link>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Reminders */}
            <Card>
                <CardContent className="pt-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Сануулга & зөвлөмж</h2>
                    <div className="space-y-3">
                        {REMINDERS.map((r, i) => {
                            const Icon = r.icon
                            return (
                                <div key={i} className="flex items-start gap-3 text-sm">
                                    <Icon size={16} className={`mt-0.5 shrink-0 ${Icon === CheckCircle ? 'text-emerald-500' : 'text-amber-500'}`} />
                                    <div>
                                        <p className="text-slate-700">{r.text}</p>
                                        <p className="text-xs text-slate-400">{r.textEn}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
