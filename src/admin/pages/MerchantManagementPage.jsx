import { useState, useEffect } from 'react'
import { CreditCard, Plus, Pencil, Trash2, Loader2, X, Search, Eye, CheckCircle2, XCircle, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'
import { listMerchants, createMerchantPerson, updateMerchantPerson, deleteMerchantPerson, getAimagHot, getDistricts } from '../../firebase/qpayService.js'

const MONGOLIAN_BANKS = [
    { code: '010000', name: 'Монголбанк' },
    { code: '040000', name: 'Худалдаа хөгжлийн банк' },
    { code: '050000', name: 'Хаан банк' },
    { code: '150000', name: 'Голомт банк' },
    { code: '190000', name: 'Төрийн банк' },
    { code: '210000', name: 'Капитрон банк' },
    { code: '220000', name: 'Хас банк' },
    { code: '290000', name: 'Богд банк' },
    { code: '300000', name: 'Үндэсний хөрөнгө оруулалтын банк' },
    { code: '320000', name: 'Чингис хаан банк' },
    { code: '340000', name: 'Ариг банк' },
    { code: '380000', name: 'Тэнгэр санхүүгийн нэгдэл' },
]

const EMPTY_FORM = {
    register_number: '',
    first_name: '',
    last_name: '',
    business_name: '',
    mcc_code: '5411',
    city: '',
    district: '',
    address: '',
    phone: '',
    email: '',
    storeId: '',
    account_bank_code: '',
    account_number: '',
    account_name: '',
}

export default function MerchantManagementPage() {
    const [merchants, setMerchants] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [deleting, setDeleting] = useState(null)
    const [cities, setCities] = useState([])
    const [districts, setDistricts] = useState([])
    const [loadingDistricts, setLoadingDistricts] = useState(false)
    const [detailMerchant, setDetailMerchant] = useState(null)

    async function loadMerchants() {
        setLoading(true)
        try {
            const data = await listMerchants()
            setMerchants(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('[Merchants] Load failed:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadMerchants() }, [])

    useEffect(() => {
        getAimagHot().then((data) => setCities(Array.isArray(data) ? data : [])).catch(() => {})
    }, [])

    useEffect(() => {
        if (!form.city) { setDistricts([]); return }
        setLoadingDistricts(true)
        getDistricts(form.city).then((data) => setDistricts(Array.isArray(data) ? data : [])).catch(() => setDistricts([])).finally(() => setLoadingDistricts(false))
    }, [form.city])

    function openCreate() {
        setEditingId(null)
        setForm(EMPTY_FORM)
        setError('')
        setShowForm(true)
    }

    function openEdit(m) {
        const bank = (m.bank_accounts && m.bank_accounts[0]) || {}
        setEditingId(m.id || m.merchantId)
        setForm({
            register_number: m.register_number || '',
            first_name: m.first_name || '',
            last_name: m.last_name || '',
            business_name: m.business_name || '',
            mcc_code: m.mcc_code || '5411',
            city: m.city || '',
            district: m.district || '',
            address: m.address || '',
            phone: m.phone || '',
            email: m.email || '',
            storeId: m.storeId || '',
            account_bank_code: bank.account_bank_code || '',
            account_number: bank.account_number || '',
            account_name: bank.account_name || '',
        })
        setError('')
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.register_number || !form.business_name || !form.mcc_code || !form.city || !form.district || !form.address || !form.phone || !form.email) {
            setError('Бүх заавал талбаруудыг бөглөнө үү')
            return
        }
        if (!form.account_bank_code || !form.account_number || !form.account_name) {
            setError('Банкны мэдээлэл заавал бөглөнө үү')
            return
        }
        setError('')
        setSaving(true)
        const bank_accounts = [{
            default: true,
            account_bank_code: form.account_bank_code,
            account_number: form.account_number,
            account_name: form.account_name,
            is_default: true,
        }]
        const payload = {
            register_number: form.register_number,
            first_name: form.first_name,
            last_name: form.last_name,
            business_name: form.business_name,
            mcc_code: form.mcc_code,
            city: form.city,
            district: form.district,
            address: form.address,
            phone: form.phone,
            email: form.email,
            storeId: form.storeId,
            bank_accounts,
        }
        try {
            if (editingId) {
                await updateMerchantPerson({ merchantId: editingId, ...payload })
            } else {
                await createMerchantPerson(payload)
            }
            setShowForm(false)
            await loadMerchants()
        } catch (err) {
            setError(err.message || 'Алдаа гарлаа')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(merchantId) {
        if (!confirm('Энэ мерчантыг устгах уу?')) return
        setDeleting(merchantId)
        try {
            await deleteMerchantPerson(merchantId)
            await loadMerchants()
        } catch (err) {
            console.error('[Merchants] Delete failed:', err)
        } finally {
            setDeleting(null)
        }
    }

    const filtered = merchants.filter((m) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            (m.business_name || '').toLowerCase().includes(q) ||
            (m.register_number || '').toLowerCase().includes(q) ||
            (m.phone || '').includes(q) ||
            (m.email || '').toLowerCase().includes(q) ||
            (m.storeId || '').toLowerCase().includes(q)
        )
    })

    const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }))

    const cityName = (code) => cities.find((c) => c.code === code)?.name || code || '—'
    const bankName = (code) => MONGOLIAN_BANKS.find((b) => b.code === code)?.name || code || '—'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">QPay Мерчант удирдлага</h2>
                    <p className="text-sm text-slate-500">Gold tier дэлгүүрүүдийн QPay мерчант бүртгэлүүд</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus size={14} className="mr-1.5" /> Шинэ мерчант
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Хайх..." className="pl-9" />
            </div>

            {/* Merchant Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Мерчант засах' : 'Шинэ мерчант бүртгэх'}</h3>
                            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-1 block text-xs">Регистрийн дугаар <span className="text-red-500">*</span></Label>
                                <Input value={form.register_number} onChange={(e) => setField('register_number', e.target.value)} placeholder="АМ05321712" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Бизнесийн нэр <span className="text-red-500">*</span></Label>
                                <Input value={form.business_name} onChange={(e) => setField('business_name', e.target.value)} placeholder="Бизнесийн нэр" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Овог</Label>
                                <Input value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} placeholder="Овог" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Нэр</Label>
                                <Input value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="Нэр" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">MCC код <span className="text-red-500">*</span></Label>
                                <Input value={form.mcc_code} onChange={(e) => setField('mcc_code', e.target.value)} placeholder="5411" className="text-sm font-mono" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Хот/Аймаг <span className="text-red-500">*</span></Label>
                                <select
                                    value={form.city}
                                    onChange={(e) => { setField('city', e.target.value); setField('district', '') }}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">-- Сонгох --</option>
                                    {cities.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name || c.code}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Дүүрэг/Сум <span className="text-red-500">*</span></Label>
                                <select
                                    value={form.district}
                                    onChange={(e) => setField('district', e.target.value)}
                                    disabled={!form.city || loadingDistricts}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                                >
                                    <option value="">{loadingDistricts ? 'Ачаалж байна...' : '-- Сонгох --'}</option>
                                    {districts.map((d) => (
                                        <option key={d.code} value={d.code}>{d.name || d.code}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Хаяг <span className="text-red-500">*</span></Label>
                                <Input value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Дэлгэрэнгүй хаяг" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Утас <span className="text-red-500">*</span></Label>
                                <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="99119911" className="text-sm font-mono" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Емайл <span className="text-red-500">*</span></Label>
                                <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="merchant@example.com" className="text-sm" />
                            </div>
                            <div className="sm:col-span-2">
                                <Label className="mb-1 block text-xs">Store ID (холбоотой дэлгүүр)</Label>
                                <Input value={form.storeId} onChange={(e) => setField('storeId', e.target.value)} placeholder="Store ID (optional)" className="text-sm font-mono" />
                            </div>
                        </div>

                        {/* Bank Account Section */}
                        <div className="mt-5 pt-5 border-t border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                                <Building2 size={15} className="text-slate-500" /> Банкны данс <span className="text-red-500">*</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <Label className="mb-1 block text-xs">Банк <span className="text-red-500">*</span></Label>
                                    <select
                                        value={form.account_bank_code}
                                        onChange={(e) => setField('account_bank_code', e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">-- Банк сонгох --</option>
                                        {MONGOLIAN_BANKS.map((b) => (
                                            <option key={b.code} value={b.code}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="mb-1 block text-xs">Дансны дугаар <span className="text-red-500">*</span></Label>
                                    <Input value={form.account_number} onChange={(e) => setField('account_number', e.target.value)} placeholder="490000869" className="text-sm font-mono" />
                                </div>
                                <div>
                                    <Label className="mb-1 block text-xs">Данс эзэмшигч <span className="text-red-500">*</span></Label>
                                    <Input value={form.account_name} onChange={(e) => setField('account_name', e.target.value)} placeholder="Данс эзэмшигчийн нэр" className="text-sm" />
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

                        <div className="flex justify-end gap-2 mt-5">
                            <Button variant="outline" onClick={() => setShowForm(false)}>Болих</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                                {editingId ? 'Хадгалах' : 'Бүртгэх'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailMerchant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailMerchant(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Мерчант дэлгэрэнгүй</h3>
                            <button onClick={() => setDetailMerchant(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
                        </div>
                        <dl className="space-y-2.5 text-sm">
                            <div className="flex justify-between"><dt className="text-slate-500">Бизнес нэр</dt><dd className="font-medium text-slate-900">{detailMerchant.business_name}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Регистр</dt><dd className="font-mono">{detailMerchant.register_number}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Нэр</dt><dd>{detailMerchant.last_name} {detailMerchant.first_name}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Утас</dt><dd className="font-mono">{detailMerchant.phone}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Емайл</dt><dd>{detailMerchant.email}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Хот/Дүүрэг</dt><dd>{cityName(detailMerchant.city)} / {detailMerchant.district}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Хаяг</dt><dd>{detailMerchant.address}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">MCC</dt><dd className="font-mono">{detailMerchant.mcc_code}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Store ID</dt><dd className="font-mono text-xs">{detailMerchant.storeId || '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Merchant ID</dt><dd className="font-mono text-xs">{detailMerchant.merchantId || detailMerchant.id || '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-500">Статус</dt><dd>{detailMerchant.status === 'active' ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14} /> Идэвхтэй</span> : <span className="text-red-500 flex items-center gap-1"><XCircle size={14} /> Идэвхгүй</span>}</dd></div>
                        </dl>
                        {detailMerchant.bank_accounts?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Банкны данс</h4>
                                {detailMerchant.bank_accounts.map((ba, idx) => (
                                    <div key={idx} className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                                        <div className="flex justify-between"><span className="text-slate-500">Банк</span><span className="font-medium">{bankName(ba.account_bank_code)}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Дансны дугаар</span><span className="font-mono">{ba.account_number}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Эзэмшигч</span><span>{ba.account_name}</span></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Merchants Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CreditCard size={20} className="text-slate-600" />
                        <CardTitle className="text-lg">Бүртгэгдсэн мерчантууд ({filtered.length})</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-slate-400" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">Мерчант бүртгэл олдсонгүй</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-3 font-medium">Бизнес нэр</th>
                                        <th className="py-3 px-3 font-medium">Регистр</th>
                                        <th className="py-3 px-3 font-medium">Утас</th>
                                        <th className="py-3 px-3 font-medium">Банк / Данс</th>
                                        <th className="py-3 px-3 font-medium">Store ID</th>
                                        <th className="py-3 px-3 font-medium">Төлөв</th>
                                        <th className="py-3 px-3 font-medium text-right">Үйлдэл</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((m) => {
                                        const bank = (m.bank_accounts && m.bank_accounts[0]) || {}
                                        return (
                                        <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                            <td className="py-3 px-3 font-medium text-slate-900">{m.business_name || '—'}</td>
                                            <td className="py-3 px-3 text-slate-600 font-mono">{m.register_number || '—'}</td>
                                            <td className="py-3 px-3 text-slate-600 font-mono">{m.phone || '—'}</td>
                                            <td className="py-3 px-3 text-slate-600 text-xs">{bank.account_bank_code ? <><span>{bankName(bank.account_bank_code)}</span><br /><span className="font-mono">{bank.account_number}</span></> : '—'}</td>
                                            <td className="py-3 px-3 text-slate-500 font-mono text-xs">{m.storeId || '—'}</td>
                                            <td className="py-3 px-3">
                                                {m.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} /> Идэвхтэй</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"><XCircle size={12} /> Идэвхгүй</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => setDetailMerchant(m)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Дэлгэрэнгүй"><Eye size={15} /></button>
                                                    <button
                                                        onClick={() => openEdit(m)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                                        title="Засах"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(m.id || m.merchantId)}
                                                        disabled={deleting === (m.id || m.merchantId)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                                                        title="Устгах"
                                                    >
                                                        {deleting === (m.id || m.merchantId) ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
