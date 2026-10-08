import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../state/useAuth.js'
import { useOrders } from '../state/useOrders.js'
import { useI18n } from '../i18n/useI18n.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { User, Package, MapPin, Phone, Mail, LogOut, ChevronRight } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { subscribe, getState, deriveAggregateStatus } from '../state/store.js'
import { DISTRICTS, KHOROOS, KHOROOLOLS, FLOORS } from '../../utils/mongolianAddress.js'

export default function AccountPage() {
    const { t } = useI18n()
    const { user, isAuthenticated, signIn, signOut, updateProfile } = useAuth()
    const { orders } = useOrders()
    const state = useSyncExternalStore(subscribe, getState)
    const adminProducts = state.adminProducts || []

    const [form, setForm] = useState({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        city: 'Улаанбаатар',
        district: user.district || '',
        khoroo: user.khoroo || '',
        khoroolol: user.khoroolol || '',
        floor: user.floor || '',
        building: user.building || '',
        door: user.door || '',
    })

    useEffect(() => {
        setForm((f) => ({
            ...f,
            name: user.name || f.name,
            phone: user.phone || f.phone,
            email: user.email || f.email,
            district: user.district || f.district,
            khoroo: user.khoroo || f.khoroo,
            khoroolol: user.khoroolol || f.khoroolol,
            floor: user.floor || f.floor,
            building: user.building || f.building,
            door: user.door || f.door,
        }))
    }, [user.name, user.phone, user.email, user.district, user.khoroo, user.khoroolol, user.floor, user.building, user.door])

    async function submitProfile(e) {
        e.preventDefault()
        if (!form.name || !form.phone || !form.email) return
        try {
            if (isAuthenticated) {
                await updateProfile(form)
                toast.success(t('account.profileUpdated'))
            } else {
                signIn(form)
            }
        } catch {
            toast.error(t('account.profileUpdateFailed'))
        }
    }

    function findProduct(id) {
        return adminProducts.find((p) => p.id === id)
    }

    const myOrders = orders.filter((o) => !user.uid || o.userId === user.uid).slice(0, 10)

    return (
        <div className="container-app py-6 sm:py-10 animate-fade-in-up">
            <div className="max-w-4xl mx-auto">
                <h1 className="section-title text-2xl sm:text-3xl text-slate-900 mb-6">{t('account.title')}</h1>

                {!isAuthenticated && (
                    <div className="card-static rounded-2xl p-4 mb-6 bg-gradient-to-r from-[--bg-beige]/70 to-white border-[--brand-primary]/20">
                        <p className="text-sm text-slate-700">
                            {t('account.authNeeded')} <Link to="/checkout" className="font-semibold text-[--brand-primary] underline">Go to checkout</Link>
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                    {/* Profile card */}
                    <section className="card-surface overflow-hidden rounded-2xl">
                        <div className="relative bg-gradient-to-br from-[--bg-beige] via-[--bg-beige]/70 to-white px-6 py-6 overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[--brand-primary]/10 blur-2xl pointer-events-none" aria-hidden="true" />
                            <div className="absolute -bottom-12 left-1/3 w-36 h-36 rounded-full bg-[--brand-secondary]/10 blur-2xl pointer-events-none" aria-hidden="true" />
                            <div className="relative flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[--brand-primary] to-[--brand-secondary] p-[2.5px] shadow-brand-sm">
                                    <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                                        <User size={28} className="text-[--brand-primary]" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">{form.name || 'Guest'}</h2>
                                    <p className="text-sm text-slate-500">{form.email || '—'}</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={submitProfile} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('checkout.name')}</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder={t('checkout.name')}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('checkout.phone')}</label>
                                    <input
                                        value={form.phone}
                                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                        placeholder={t('checkout.phone')}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                        placeholder="Email"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                    />
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                                    <MapPin size={16} className="text-brand" />
                                    Хүргэлтийн хаяг
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Хот</label>
                                        <select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand">
                                            <option value="Улаанбаатар">Улаанбаатар</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Дүүрэг</label>
                                        <select
                                            value={form.district}
                                            onChange={(e) => setForm((f) => ({ ...f, district: e.target.value, khoroo: '', khoroolol: '' }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                        >
                                            <option value="">Дүүрэг сонгох</option>
                                            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Хороо</label>
                                        <select
                                            value={form.khoroo}
                                            onChange={(e) => setForm((f) => ({ ...f, khoroo: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                            disabled={!form.district}
                                        >
                                            <option value="">Хороо сонгох</option>
                                            {(KHOROOS[form.district] || []).map((k) => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Хороолол</label>
                                        <select
                                            value={form.khoroolol}
                                            onChange={(e) => setForm((f) => ({ ...f, khoroolol: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                            disabled={!form.district}
                                        >
                                            <option value="">Хороолол сонгох</option>
                                            {(KHOROOLOLS[form.district] || []).map((k) => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Давхар</label>
                                        <select
                                            value={form.floor}
                                            onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                        >
                                            <option value="">Давхар сонгох</option>
                                            {FLOORS.map((fl) => <option key={fl} value={fl}>{fl}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Байрны тоо</label>
                                        <input
                                            value={form.building}
                                            onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
                                            placeholder="Байрны дугаар"
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Тоот</label>
                                        <input
                                            value={form.door}
                                            onChange={(e) => setForm((f) => ({ ...f, door: e.target.value }))}
                                            placeholder="Тоот"
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <button type="submit" className="btn-primary active:scale-[0.97]">{isAuthenticated ? t('account.save') : t('account.demoSignIn')}</button>
                                {isAuthenticated && (
                                    <button type="button" onClick={signOut} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-semibold transition-all duration-200 active:scale-[0.97]">
                                        <LogOut size={16} />
                                        {t('account.signOut')}
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    {/* Order history & quick links */}
                    <aside className="space-y-4">
                        <div className="card-surface rounded-2xl p-5">
                            <h3 className="section-title text-base text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-[--brand-primary]/10 flex items-center justify-center">
                                    <Package size={16} className="text-[--brand-primary]" />
                                </span>
                                {t('account.orderHistory')}
                            </h3>
                            {myOrders.length === 0 ? (
                                <p className="text-sm text-slate-500 mb-4">{t('orders.empty')}</p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-auto">
                                    {myOrders.map((order) => (
                                        <Link
                                            key={order.id}
                                            to="/orders"
                                            className="block p-3 rounded-xl border border-slate-100 shadow-soft hover:bg-[--bg-beige]/30 hover:border-[--brand-primary]/20 hover:shadow-card transition-all duration-200 active:scale-[0.98]"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">{order.id}</p>
                                                    <p className="text-xs text-slate-500">{deriveAggregateStatus(order)}</p>
                                                </div>
                                                <span className="text-sm font-bold text-[--brand-primary]">{formatCurrency(order.total)}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                            <Link to="/orders" className="btn-outline w-full mt-3 flex items-center justify-center gap-2 active:scale-[0.97]">
                                View all orders
                                <ChevronRight size={16} />
                            </Link>
                        </div>

                        <div className="card-surface rounded-2xl p-5">
                            <h3 className="section-title text-base text-slate-900 mb-3">Quick links</h3>
                            <div className="space-y-1.5">
                                <Link to="/checkout" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 text-sm text-slate-600 shadow-soft hover:text-[--brand-primary] hover:bg-[--bg-beige]/30 hover:border-[--brand-primary]/20 transition-all duration-200">
                                    <span className="w-7 h-7 rounded-lg bg-[--bg-beige] flex items-center justify-center shrink-0">
                                        <MapPin size={14} className="text-[--brand-primary]" />
                                    </span>
                                    <span className="flex-1 font-medium">Checkout</span>
                                    <ChevronRight size={15} className="text-slate-300 group-hover:text-[--brand-primary] group-hover:translate-x-0.5 transition-all duration-200" />
                                </Link>
                                <Link to="/cart" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 text-sm text-slate-600 shadow-soft hover:text-[--brand-primary] hover:bg-[--bg-beige]/30 hover:border-[--brand-primary]/20 transition-all duration-200">
                                    <span className="w-7 h-7 rounded-lg bg-[--bg-beige] flex items-center justify-center shrink-0">
                                        <Package size={14} className="text-[--brand-primary]" />
                                    </span>
                                    <span className="flex-1 font-medium">{t('cart.title')}</span>
                                    <ChevronRight size={15} className="text-slate-300 group-hover:text-[--brand-primary] group-hover:translate-x-0.5 transition-all duration-200" />
                                </Link>
                                <Link to="/catalog" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 text-sm text-slate-600 shadow-soft hover:text-[--brand-primary] hover:bg-[--bg-beige]/30 hover:border-[--brand-primary]/20 transition-all duration-200">
                                    <span className="w-7 h-7 rounded-lg bg-[--bg-beige] flex items-center justify-center shrink-0">
                                        <Package size={14} className="text-[--brand-primary]" />
                                    </span>
                                    <span className="flex-1 font-medium">{t('catalog.title')}</span>
                                    <ChevronRight size={15} className="text-slate-300 group-hover:text-[--brand-primary] group-hover:translate-x-0.5 transition-all duration-200" />
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
