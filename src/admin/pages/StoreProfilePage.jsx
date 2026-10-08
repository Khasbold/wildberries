import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Store, Upload, Save, Camera, Truck, CreditCard, Loader2, Image, Phone, Mail, Lock, Crown, ArrowRight, CheckCircle2, Building2, X, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { uploadStoreImage, deleteFileByDownloadUrl, isOurFirebaseStorageUrl } from '../../firebase/storageUpload.js'
import { createMerchantPerson, updateMerchantPerson, getAimagHot, getDistricts } from '../../firebase/qpayService.js'

export default function StoreProfilePage() {
    const { session, updateStoreProfile } = useAdmin()
    const { tier } = useSession()
    const [storeName, setStoreName] = useState(session?.storeName || '')
    const [storeImage, setStoreImage] = useState(session?.storeImage || null)
    const [previewUrl, setPreviewUrl] = useState(session?.storeImage || null)
    const [storeBannerImage, setStoreBannerImage] = useState(session?.storeBannerImage || null)
    const [bannerPreviewUrl, setBannerPreviewUrl] = useState(session?.storeBannerImage || null)
    const [deliveryFree, setDeliveryFree] = useState(session?.deliveryFree ?? true)
    const [deliveryPrice, setDeliveryPrice] = useState(session?.deliveryPrice || 0)
    const [bankName, setBankName] = useState(session?.bankName || '')
    const [bankAccount, setBankAccount] = useState(session?.bankAccount || '')
    const [storePhone, setStorePhone] = useState(session?.storePhone || '')
    const [storeEmail, setStoreEmail] = useState(session?.storeEmail || '')
    const [showPhoneOnStore, setShowPhoneOnStore] = useState(session?.showPhoneOnStore ?? false)
    const [phoneError, setPhoneError] = useState(false)
    const [emailError, setEmailError] = useState(false)
    const [saved, setSaved] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [bannerUploading, setBannerUploading] = useState(false)
    const fileInputRef = useRef(null)
    const bannerInputRef = useRef(null)
    const canUploadBanner = tier === 'silver' || tier === 'gold'
    const isGoldTier = tier === 'gold'

    // QPay Merchant registration state (gold tier only)
    const [merchantRegNum, setMerchantRegNum] = useState(session?.qpayMerchant?.register_number || '')
    const [merchantFirstName, setMerchantFirstName] = useState(session?.qpayMerchant?.first_name || '')
    const [merchantLastName, setMerchantLastName] = useState(session?.qpayMerchant?.last_name || '')
    const [merchantBusinessName, setMerchantBusinessName] = useState(session?.qpayMerchant?.business_name || '')
    const [merchantMcc, setMerchantMcc] = useState(session?.qpayMerchant?.mcc_code || '5411')
    const [merchantCity, setMerchantCity] = useState(session?.qpayMerchant?.city || '')
    const [merchantDistrict, setMerchantDistrict] = useState(session?.qpayMerchant?.district || '')
    const [qpayCities, setQpayCities] = useState([])
    const [qpayDistricts, setQpayDistricts] = useState([])
    const [loadingQpayDistricts, setLoadingQpayDistricts] = useState(false)
    const [merchantAddress, setMerchantAddress] = useState(session?.qpayMerchant?.address || '')
    const [merchantPhone, setMerchantPhone] = useState(session?.qpayMerchant?.phone || '')
    const [merchantEmail, setMerchantEmail] = useState(session?.qpayMerchant?.email || '')
    const [merchantBankCode, setMerchantBankCode] = useState(session?.qpayMerchant?.account_bank_code || '')
    const [merchantBankAccount, setMerchantBankAccount] = useState(session?.qpayMerchant?.account_number || '')
    const [merchantBankName, setMerchantBankName] = useState(session?.qpayMerchant?.account_name || '')
    const [merchantSaving, setMerchantSaving] = useState(false)
    const [merchantSaved, setMerchantSaved] = useState(false)
    const [merchantError, setMerchantError] = useState('')
    const [showMerchantModal, setShowMerchantModal] = useState(false)
    const merchantConfigured = !!session?.qpayMerchantId

    // Load QPay cities on mount (gold tier only)
    useEffect(() => {
        if (!isGoldTier) return
        getAimagHot().then((data) => setQpayCities(Array.isArray(data) ? data : [])).catch(() => {})
    }, [isGoldTier])

    // Load QPay districts when city changes
    useEffect(() => {
        if (!merchantCity) { setQpayDistricts([]); return }
        setLoadingQpayDistricts(true)
        getDistricts(merchantCity).then((data) => setQpayDistricts(Array.isArray(data) ? data : [])).catch(() => setQpayDistricts([])).finally(() => setLoadingQpayDistricts(false))
    }, [merchantCity])

    async function handleImageUpload(e) {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) return

        setPreviewUrl(URL.createObjectURL(file))
        setUploading(true)
        try {
            const url = await uploadStoreImage(file, session?.id || 'unknown')
            setStoreImage(url)
            setPreviewUrl(url)
        } catch (err) {
            console.error('Image upload failed:', err)
            setPreviewUrl(storeImage)
        } finally {
            setUploading(false)
        }
    }

    function handleRemoveImage() {
        setStoreImage(null)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function handleBannerUpload(e) {
        const file = e.target.files?.[0]
        if (!file || !file.type.startsWith('image/')) return
        setBannerPreviewUrl(URL.createObjectURL(file))
        setBannerUploading(true)
        try {
            const url = await uploadStoreImage(file, (session?.id || 'unknown') + '-banner')
            setStoreBannerImage(url)
            setBannerPreviewUrl(url)
        } catch (err) {
            console.error('Banner image upload failed:', err)
            setBannerPreviewUrl(storeBannerImage)
        } finally {
            setBannerUploading(false)
        }
    }

    const MONGOLIAN_BANKS = [
        'Хаан банк', 'Голомт банк', 'Худалдаа хөгжлийн банк', 'Төрийн банк',
        'Хас банк', 'Богд банк', 'Капитрон банк', 'Төрийн сан',
        'Ариг банк', 'Үндэсний хөрөнгө оруулалтын банк', 'Чингис хаан банк',
    ]

    const QPAY_BANKS = [
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
    ]

    async function handleSave() {
        if (!storeName.trim()) return
        let hasError = false
        if (!storePhone.trim()) {
            setPhoneError(true)
            hasError = true
            setTimeout(() => {
                const el = document.getElementById('field-phone')
                if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus() }
            }, 50)
        } else setPhoneError(false)
        if (!storeEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeEmail.trim())) {
            setEmailError(true)
            hasError = true
            setTimeout(() => {
                const el = document.getElementById('field-email')
                if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus() }
            }, 50)
        } else setEmailError(false)
        if (hasError) return
        const prevLogo = session?.storeImage
        const prevBanner = session?.storeBannerImage
        if (prevLogo && prevLogo !== storeImage && isOurFirebaseStorageUrl(prevLogo)) {
            await deleteFileByDownloadUrl(prevLogo)
        }
        if (canUploadBanner && prevBanner != null && prevBanner !== storeBannerImage && isOurFirebaseStorageUrl(prevBanner)) {
            await deleteFileByDownloadUrl(prevBanner)
        }
        updateStoreProfile({ storeName: storeName.trim(), storeImage, storeBannerImage: canUploadBanner ? storeBannerImage : undefined, deliveryFree, deliveryPrice: deliveryFree ? 0 : Number(deliveryPrice), bankName, bankAccount: bankAccount.trim(), storePhone: storePhone.trim(), storeEmail: storeEmail.trim(), showPhoneOnStore })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Slide-in success toast */}
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all duration-500 ${saved ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                ✓ Профайл амжилттай хадгалагдлаа
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900">Store Profile</h2>
                <p className="text-sm text-slate-500">Manage your store's public appearance — name and image shown to customers.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Store size={20} className="text-slate-600" />
                        <CardTitle className="text-lg">Store Identity</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Store image */}
                    <div>
                        <Label className="mb-2 block">Store Image</Label>
                        <div className="flex items-start gap-5">
                            <div
                                className="relative group w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-brand/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {previewUrl ? (
                                    <>
                                        <img
                                            src={previewUrl}
                                            alt="Store"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera size={24} className="text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-slate-400">
                                        <Upload size={28} />
                                        <span className="text-xs">Upload</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 pt-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={14} className="mr-1.5" />
                                    Choose Image
                                </Button>
                                {previewUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={handleRemoveImage}
                                    >
                                        Remove
                                    </Button>
                                )}
                                <p className="text-xs text-slate-400 max-w-[200px]">
                                    Upload a logo or image for your store. Shown on the stores listing and detail page.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Store name */}
                    <div>
                        <Label className="mb-1 block">Store Name</Label>
                        <Input
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="Enter your store name"
                            className="max-w-md"
                        />
                        <p className="text-xs text-slate-400 mt-1">This is displayed as the title of your store to customers.</p>
                    </div>

                    {/* Delivery price */}
                    <div>
                        <Label className="mb-2 flex items-center gap-2">
                            <Truck size={16} className="text-slate-500" />
                            Хүргэлтийн үнэ
                        </Label>
                        <p className="text-xs text-slate-400 mb-3">Таны бүх бүтээгдэхүүнд хамаарах хүргэлтийн үнэ. Захиалагчид checkout хэсэгт харагдана.</p>
                        <div className="flex items-center gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="storeDelivery"
                                    checked={deliveryFree}
                                    onChange={() => { setDeliveryFree(true); setDeliveryPrice(0) }}
                                    className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-700 font-medium">Үнэгүй</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="storeDelivery"
                                    checked={!deliveryFree}
                                    onChange={() => setDeliveryFree(false)}
                                    className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-700 font-medium">Төлбөртэй</span>
                            </label>
                        </div>
                        {!deliveryFree && (
                            <div className="relative max-w-xs">
                                <Input
                                    type="number"
                                    value={deliveryPrice || ''}
                                    onChange={(e) => setDeliveryPrice(Number(e.target.value))}
                                    placeholder="Хүргэлтийн үнэ"
                                    className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₮</span>
                            </div>
                        )}
                    </div>

                    {/* Bank Account */}
                    <div>
                        <Label className="mb-2 flex items-center gap-2">
                            <CreditCard size={16} className="text-slate-500" />
                            Банкны мэдээлэл
                        </Label>
                        <p className="text-xs text-slate-400 mb-3">Таны банкны дансны мэдээлэл. SuperAdmin захиалгын мэдээлэлд харж, мөнгө шилжүүлэхэд ашиглана.</p>
                        <div className="space-y-3 max-w-md">
                            <select
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                                <option value="">Банк сонгох...</option>
                                {MONGOLIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <Input
                                value={bankAccount}
                                onChange={(e) => setBankAccount(e.target.value)}
                                placeholder="Дансны дугаар"
                                className="font-mono"
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <Label className="mb-2 flex items-center gap-2">
                            <Phone size={16} className="text-slate-500" />
                            Утасны дугаар <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-xs text-slate-400 mb-3">Таны холбоо барих утасны дугаар. Хэрэглэгчид болон SuperAdmin-д харагдана.</p>
                        <Input
                            id="field-phone"
                            value={storePhone}
                            onChange={(e) => { setStorePhone(e.target.value); if (phoneError) setPhoneError(false) }}
                            placeholder="e.g. 99119911"
                            className={`max-w-md font-mono ${phoneError ? 'border-red-500 ring-2 ring-red-400 border-red-400' : ''}`}
                        />
                        {phoneError && <p className="text-xs text-red-500 mt-1">Утасны дугаар заавал оруулна уу</p>}
                        <label className="flex items-center gap-3 mt-3 cursor-pointer select-none">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={showPhoneOnStore}
                                onClick={() => setShowPhoneOnStore((v) => !v)}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${showPhoneOnStore ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${showPhoneOnStore ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <span className="text-sm text-slate-700">Дэлгүүр дээр утасны дугаар харуулах</span>
                        </label>
                    </div>

                    {/* Email */}
                    <div>
                        <Label className="mb-2 flex items-center gap-2">
                            <Mail size={16} className="text-slate-500" />
                            Емайл хаяг <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-xs text-slate-400 mb-3">Емайл тохируулсанаар бид захиалга хийгдэх үед таньд мэдэгдэх боломжтой болно</p>
                        <Input
                            id="field-email"
                            type="email"
                            value={storeEmail}
                            onChange={(e) => { setStoreEmail(e.target.value); if (emailError) setEmailError(false) }}
                            placeholder="e.g. store@example.com"
                            className={`max-w-md ${emailError ? 'border-red-500 ring-2 ring-red-400 border-red-400' : ''}`}
                        />
                        {emailError && <p className="text-xs text-red-500 mt-1">Зөв емайл хаяг оруулна уу</p>}
                    </div>

                    {/* Store Banner Image - blurred for free tier, editable for bronze+ */}
                    {canUploadBanner ? (
                        <div>
                            <Label className="mb-2 flex items-center gap-2">
                                <Image size={16} className="text-slate-500" />
                                Store Banner Image
                            </Label>
                            <p className="text-xs text-slate-400 mb-3">Upload a banner image shown at the top of your store page. Available for Silver and Gold tier stores.</p>
                            <div className="flex items-start gap-5">
                                <div
                                    className="relative group w-full max-w-md h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand/50 transition-colors"
                                    onClick={() => bannerInputRef.current?.click()}
                                >
                                    {bannerPreviewUrl ? (
                                        <>
                                            <img src={bannerPreviewUrl} alt="Store Banner" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Camera size={24} className="text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-slate-400">
                                            <Upload size={28} />
                                            <span className="text-xs">Upload Banner</span>
                                        </div>
                                    )}
                                    {bannerUploading && (
                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                            <Loader2 size={24} className="animate-spin text-slate-600" />
                                        </div>
                                    )}
                                </div>
                                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                            </div>
                            {bannerPreviewUrl && (
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-2" onClick={() => { setStoreBannerImage(null); setBannerPreviewUrl(null); if (bannerInputRef.current) bannerInputRef.current.value = '' }}>
                                    Remove Banner
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="pointer-events-none select-none blur-[2px] opacity-50">
                                <Label className="mb-2 flex items-center gap-2">
                                    <Image size={16} className="text-slate-500" />
                                    Store Banner Image
                                </Label>
                                <p className="text-xs text-slate-400 mb-3">Upload a banner image shown at the top of your store page.</p>
                                <div className="w-full max-w-md h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-1 text-slate-400">
                                        <Upload size={28} />
                                        <span className="text-xs">Upload Banner</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-amber-200 shadow-lg p-4 text-center max-w-xs">
                                    <Lock size={20} className="text-amber-600 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-800 mb-1">Banner зураг оруулах боломжгүй</p>
                                    <p className="text-xs text-slate-500 mb-3">Tier-ээ Bronze болон түүнээс дээш шинэчлэн banner зураг оруулах боломжтой.</p>
                                    <Link to="/admin/tier-list">
                                        <Button size="sm" className="bg-gradient-to-r from-[#D66B3E] to-[#c45d35] text-white text-xs gap-1">
                                            <Crown size={12} /> Tier шинэчлэх <ArrowRight size={12} />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Preview</p>
                        <div className="flex items-center gap-4">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt="Store preview"
                                    className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                    {storeName?.slice(0, 2)?.toUpperCase() || 'ST'}
                                </div>
                            )}
                            <div>
                                <p className="font-semibold text-slate-900 text-lg">{storeName || 'Store Name'}</p>
                                <p className="text-sm text-slate-500">by {session?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Save button */}
                    <div className="flex items-center gap-3">
                        <Button onClick={handleSave} disabled={!storeName.trim()}>
                            <Save size={14} className="mr-1.5" />
                            Save Profile
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* QPay Merchant — Gold tier only */}
            {isGoldTier && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CreditCard size={20} className="text-amber-600" />
                            <CardTitle className="text-lg">QPay Төлбөр хүлээн авах</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {merchantConfigured ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-800">QPay тохируулагдсан</p>
                                        <p className="text-xs text-emerald-600">Таны дэлгүүрээс худалдан авалт хийхэд таны дансанд шууд төлбөр орно.</p>
                                    </div>
                                </div>
                                {session?.qpayMerchant && (
                                    <div className="text-sm text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3">
                                        <div className="flex justify-between"><span className="text-slate-500">Бизнес</span><span className="font-medium">{session.qpayMerchant.business_name}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Банк</span><span className="font-medium">{QPAY_BANKS.find(b => b.code === session.qpayMerchant.account_bank_code)?.name || session.qpayMerchant.account_bank_code || '—'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Данс</span><span className="font-mono">{session.qpayMerchant.account_number || '—'}</span></div>
                                    </div>
                                )}
                                <Button variant="outline" size="sm" onClick={() => setShowMerchantModal(true)}>
                                    <Pencil size={14} className="mr-1.5" /> Засах
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                                    <CreditCard size={20} className="text-amber-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800">QPay тохируулаагүй</p>
                                        <p className="text-xs text-amber-600">QPay холбосноор захиалгын төлбөрийг шууд өөрийн дансаар хүлээн авах боломжтой болно.</p>
                                    </div>
                                </div>
                                <Button onClick={() => setShowMerchantModal(true)} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                                    <CreditCard size={14} className="mr-1.5" /> QPay Холбох
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* QPay Merchant Modal */}
            {showMerchantModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowMerchantModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">{merchantConfigured ? 'QPay тохиргоо засах' : 'QPay мерчант бүртгүүлэх'}</h3>
                            <button onClick={() => setShowMerchantModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">QPay Quick Pay мерчант хэрэглэгчээр бүртгүүлснээр захиалгын төлбөрийг шууд хүлээн авах боломжтой.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-1 block text-xs">Регистрийн дугаар <span className="text-red-500">*</span></Label>
                                <Input value={merchantRegNum} onChange={(e) => setMerchantRegNum(e.target.value)} placeholder="e.g. АМ05321712" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Бизнесийн нэр <span className="text-red-500">*</span></Label>
                                <Input value={merchantBusinessName} onChange={(e) => setMerchantBusinessName(e.target.value)} placeholder="Бизнесийн нэр" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Овог</Label>
                                <Input value={merchantLastName} onChange={(e) => setMerchantLastName(e.target.value)} placeholder="Овог" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Нэр</Label>
                                <Input value={merchantFirstName} onChange={(e) => setMerchantFirstName(e.target.value)} placeholder="Нэр" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">MCC код <span className="text-red-500">*</span></Label>
                                <Input value={merchantMcc} onChange={(e) => setMerchantMcc(e.target.value)} placeholder="5411" className="text-sm font-mono" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Хот/Аймаг <span className="text-red-500">*</span></Label>
                                <select
                                    value={merchantCity}
                                    onChange={(e) => { setMerchantCity(e.target.value); setMerchantDistrict('') }}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    <option value="">-- Сонгох --</option>
                                    {qpayCities.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name || c.code}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Дүүрэг/Сум <span className="text-red-500">*</span></Label>
                                <select
                                    value={merchantDistrict}
                                    onChange={(e) => setMerchantDistrict(e.target.value)}
                                    disabled={!merchantCity || loadingQpayDistricts}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                                >
                                    <option value="">{loadingQpayDistricts ? 'Ачаалж байна...' : '-- Сонгох --'}</option>
                                    {qpayDistricts.map((d) => (
                                        <option key={d.code} value={d.code}>{d.name || d.code}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Хаяг <span className="text-red-500">*</span></Label>
                                <Input value={merchantAddress} onChange={(e) => setMerchantAddress(e.target.value)} placeholder="Дэлгэрэнгүй хаяг" className="text-sm" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Утас <span className="text-red-500">*</span></Label>
                                <Input value={merchantPhone} onChange={(e) => setMerchantPhone(e.target.value)} placeholder="99119911" className="text-sm font-mono" />
                            </div>
                            <div>
                                <Label className="mb-1 block text-xs">Емайл <span className="text-red-500">*</span></Label>
                                <Input type="email" value={merchantEmail} onChange={(e) => setMerchantEmail(e.target.value)} placeholder="merchant@example.com" className="text-sm" />
                            </div>
                        </div>

                        {/* Bank Account */}
                        <div className="mt-5 pt-5 border-t border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                                <Building2 size={15} className="text-slate-500" /> Банкны данс <span className="text-red-500">*</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <Label className="mb-1 block text-xs">Банк <span className="text-red-500">*</span></Label>
                                    <select
                                        value={merchantBankCode}
                                        onChange={(e) => setMerchantBankCode(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    >
                                        <option value="">-- Банк сонгох --</option>
                                        {QPAY_BANKS.map((b) => (
                                            <option key={b.code} value={b.code}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="mb-1 block text-xs">Дансны дугаар <span className="text-red-500">*</span></Label>
                                    <Input value={merchantBankAccount} onChange={(e) => setMerchantBankAccount(e.target.value)} placeholder="490000869" className="text-sm font-mono" />
                                </div>
                                <div>
                                    <Label className="mb-1 block text-xs">Данс эзэмшигч <span className="text-red-500">*</span></Label>
                                    <Input value={merchantBankName} onChange={(e) => setMerchantBankName(e.target.value)} placeholder="Данс эзэмшигчийн нэр" className="text-sm" />
                                </div>
                            </div>
                        </div>

                        {merchantError && <p className="text-xs text-red-500 mt-3">{merchantError}</p>}

                        <div className="flex justify-end gap-2 mt-5">
                            <Button variant="outline" onClick={() => setShowMerchantModal(false)}>Болих</Button>
                            <Button
                                disabled={merchantSaving}
                                onClick={async () => {
                                    if (!merchantRegNum || !merchantBusinessName || !merchantMcc || !merchantCity || !merchantDistrict || !merchantAddress || !merchantPhone || !merchantEmail) {
                                        setMerchantError('Бүх заавал талбаруудыг бөглөнө үү')
                                        return
                                    }
                                    if (!merchantBankCode || !merchantBankAccount || !merchantBankName) {
                                        setMerchantError('Банкны мэдээлэл заавал бөглөнө үү')
                                        return
                                    }
                                    setMerchantError('')
                                    setMerchantSaving(true)
                                    try {
                                        const bank_accounts = [{
                                            default: true,
                                            account_bank_code: merchantBankCode,
                                            account_number: merchantBankAccount,
                                            account_name: merchantBankName,
                                            is_default: true,
                                        }]
                                        const merchantData = {
                                            register_number: merchantRegNum,
                                            first_name: merchantFirstName,
                                            last_name: merchantLastName,
                                            business_name: merchantBusinessName,
                                            mcc_code: merchantMcc,
                                            city: merchantCity,
                                            district: merchantDistrict,
                                            address: merchantAddress,
                                            phone: merchantPhone,
                                            email: merchantEmail,
                                            storeId: session?.storeId || session?.id || null,
                                            bank_accounts,
                                        }
                                        let result
                                        if (merchantConfigured) {
                                            result = await updateMerchantPerson({ merchantId: session.qpayMerchantId, ...merchantData })
                                        } else {
                                            result = await createMerchantPerson(merchantData)
                                        }
                                        if (result.success || merchantConfigured) {
                                            updateStoreProfile({
                                                qpayMerchantId: result.merchantId || session.qpayMerchantId,
                                                qpayMerchant: {
                                                    register_number: merchantRegNum,
                                                    first_name: merchantFirstName,
                                                    last_name: merchantLastName,
                                                    business_name: merchantBusinessName,
                                                    mcc_code: merchantMcc,
                                                    city: merchantCity,
                                                    district: merchantDistrict,
                                                    address: merchantAddress,
                                                    phone: merchantPhone,
                                                    email: merchantEmail,
                                                    account_bank_code: merchantBankCode,
                                                    account_number: merchantBankAccount,
                                                    account_name: merchantBankName,
                                                },
                                            })
                                            setMerchantSaved(true)
                                            setShowMerchantModal(false)
                                            setTimeout(() => setMerchantSaved(false), 3000)
                                        }
                                    } catch (err) {
                                        console.error('[QPay Merchant]', err)
                                        setMerchantError(err.message || 'Мерчант бүртгэл амжилтгүй боллоо')
                                    } finally {
                                        setMerchantSaving(false)
                                    }
                                }}
                            >
                                {merchantSaving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CreditCard size={14} className="mr-1.5" />}
                                {merchantConfigured ? 'Хадгалах' : 'Бүртгүүлэх'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {merchantSaved && (
                <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-pulse z-50">
                    ✓ QPay мерчант амжилттай {merchantConfigured ? 'шинэчлэгдлээ' : 'бүртгэгдлээ'}!
                </div>
            )}
        </div>
    )
}
