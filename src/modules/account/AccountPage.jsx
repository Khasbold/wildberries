import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/useAuth.js'
import { useI18n } from '../i18n/useI18n.js'

export default function AccountPage() {
    const { t } = useI18n()
    const { user, isAuthenticated, signIn, signOut, updateProfile } = useAuth()
    const [form, setForm] = useState({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
    })

    function submitAuth(e) {
        e.preventDefault()
        if (!form.name || !form.phone || !form.email) return
        if (isAuthenticated) updateProfile(form)
        else signIn(form)
    }

    return (
        <div className="container-app py-8">
            <h1 className="text-2xl font-semibold mb-5">{t('account.title')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <section className="card-surface p-5">
                    <form className="space-y-3" onSubmit={submitAuth}>
                        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('checkout.name')} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                        <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t('checkout.phone')} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                        <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                        <div className="flex items-center gap-2 pt-1">
                            <button type="submit" className="btn-primary">{isAuthenticated ? t('account.save') : t('account.demoSignIn')}</button>
                            {isAuthenticated && <button type="button" onClick={signOut} className="btn-outline">{t('account.signOut')}</button>}
                        </div>
                    </form>
                </section>

                <aside className="card-surface p-5 h-max">
                    <p className="font-semibold mb-2">{t('account.account')}</p>
                    <p className="text-sm text-slate-600 mb-4">{isAuthenticated ? t('account.authDone') : t('account.authNeeded')}</p>
                    <Link to="/orders" className="btn-outline inline-block">{t('account.orderHistory')}</Link>
                </aside>
            </div>
        </div>
    )
}
