import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { TIER_PLANS } from '../../modules/state/store.js'
import { ArrowLeft, Plus, X, Upload, Save, Trash2, Loader2, GripVertical, ExternalLink } from 'lucide-react'
import {
    uploadProductImage,
    normalizeProductImagesForFirestore,
    isOurStorageImageReference,
} from '../../firebase/storageUpload.js'

import { formatCurrency } from '../../utils/formatCurrency.js'

const PRESET_COLORS = [
    '#FFFFFF', '#000000', '#3B82F6', '#1D4ED8', '#DC2626',
    '#EF4444', '#92400E', '#D4A373', '#1F2937', '#6B7280',
    '#4B5563', '#374151', '#16A34A', '#7C3AED', '#F59E0B',
]

export default function ProductEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { products, categories, upsertAdminProduct, isSuperAdmin } = useAdmin()
    const { tier, session } = useSession()
    const isNew = !id || id === 'new'
    const existing = !isNew ? products.find((p) => p.id === id) : null

    const categoryOptions = categories.length ? categories : [{ id: 'fallback', name: 'Accessories' }]

    const [form, setForm] = useState({
        title: '',
        brand: '',
        category: categoryOptions[0]?.name || 'Accessories',
        price: 0,
        originalPrice: 0,
        stockQuantity: 10,
        productType: 'ready',
        orderDays: 7,
        colors: [],
        sizes: [],
        image: '',
        thumbnail: '',
        description: '',
        images: [],
        linkUrl: '',
        productCode: '',
    })

    const [newSize, setNewSize] = useState('')
    const [customColor, setCustomColor] = useState('#3B82F6')
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')
    const [imageUploading, setImageUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef(null)
    const [dragIdx, setDragIdx] = useState(null)

    // Variants: array of { size, color, sku, stock }
    const [variants, setVariants] = useState([])
    const [showVariants, setShowVariants] = useState(false)

    useEffect(() => {
        if (existing) {
            setForm({
                title: existing.title || '',
                brand: existing.brand || '',
                category: existing.category || categoryOptions[0]?.name || 'Accessories',
                price: existing.price || 0,
                originalPrice: existing.originalPrice || 0,
                stockQuantity: existing.stockQuantity ?? (existing.inStock ? 10 : 0),
                productType: existing.productType || 'ready',
                orderDays: existing.orderDays || 7,
                colors: Array.isArray(existing.colors) ? existing.colors : [],
                sizes: Array.isArray(existing.sizes) ? existing.sizes : [],
                image: existing.image || '',
                thumbnail: existing.thumbnail || '',
                description: existing.description || '',
                images: Array.isArray(existing.images) ? existing.images : (existing.image ? [existing.image] : []),
                linkUrl: existing.linkUrl || '',
                productCode: existing.productCode || '',
            })
            if (Array.isArray(existing.variants) && existing.variants.length > 0) {
                setVariants(existing.variants)
                setShowVariants(true)
            }
        }
    }, [existing])

    function update(key, val) {
        setForm((f) => ({ ...f, [key]: val }))
    }

    function addColor(hex) {
        if (!form.colors.includes(hex)) {
            update('colors', [...form.colors, hex])
        }
    }

    function removeColor(hex) {
        update('colors', form.colors.filter((c) => c !== hex))
    }

    function addSize() {
        const s = newSize.trim()
        if (s && !form.sizes.includes(s)) {
            update('sizes', [...form.sizes, s])
            setNewSize('')
        }
    }

    function removeSize(s) {
        update('sizes', form.sizes.filter((x) => x !== s))
    }

    async function onPickImage(file) {
        if (!file) return
        setImageUploading(true)
        try {
            const url = await uploadProductImage(file, session?.storeId || 'unknown')
            setForm((f) => ({
                ...f,
                image: f.image || url,
                thumbnail: f.thumbnail || url,
                images: [...f.images, url],
            }))
        } catch (err) {
            console.error('Product image upload failed:', err)
            toast.error('Image upload failed')
        } finally {
            setImageUploading(false)
        }
    }

    function removeImage(idx) {
        setForm((f) => {
            const newImages = f.images.filter((_, i) => i !== idx)
            const removed = f.images[idx]
            return {
                ...f,
                images: newImages,
                image: removed === f.image ? (newImages[0] || '') : f.image,
                thumbnail: removed === f.thumbnail ? (newImages[0] || '') : f.thumbnail,
            }
        })
    }

    function setMainImageFromGallery(url) {
        update('image', url)
        update('thumbnail', url)
    }

    // Drag & drop image reorder
    function handleDragStart(idx) {
        setDragIdx(idx)
    }
    function handleDragOver(e, idx) {
        e.preventDefault()
        if (dragIdx === null || dragIdx === idx) return
        setForm((f) => {
            const imgs = [...f.images]
            const [moved] = imgs.splice(dragIdx, 1)
            imgs.splice(idx, 0, moved)
            setDragIdx(idx)
            return { ...f, images: imgs, image: imgs[0] || '', thumbnail: imgs[0] || '' }
        })
    }
    function handleDragEnd() {
        setDragIdx(null)
    }

    // Variant helpers
    function generateVariants() {
        const newVariants = []
        const sizes = form.sizes.length > 0 ? form.sizes : ['']
        const colors = form.colors.length > 0 ? form.colors : ['']
        for (const s of sizes) {
            for (const c of colors) {
                const existing = variants.find((v) => v.size === s && v.color === c)
                newVariants.push(existing || { size: s, color: c, sku: '', stock: form.stockQuantity || 0 })
            }
        }
        setVariants(newVariants)
        setShowVariants(true)
    }

    function updateVariant(idx, field, value) {
        setVariants((v) => v.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    }

    function removeVariant(idx) {
        setVariants((v) => v.filter((_, i) => i !== idx))
    }

    async function handleSave() {
        if (!form.title.trim()) {
            setError('Title is required')
            return
        }
        if (!form.price || form.price <= 0) {
            setError('Price must be greater than 0')
            return
        }
        if (form.price < 10) {
            setError('Үнэ хамгийн багадаа 10,000₮ байх ёстой')
            toast.error('Бүтээгдэхүүний үнэ 10,000₮-с дээш байх шаардлагатай')
            return
        }
        setError('')
        setSaving(true)
        try {
            /* Images → Firebase Storage; Firestore only stores metadata + download URLs */
            const normalized = await normalizeProductImagesForFirestore(
                {
                    image: form.image,
                    thumbnail: form.thumbnail,
                    images: form.images,
                },
                session?.storeId,
            )
            const merged = { ...form, ...normalized }
            for (const u of [merged.image, merged.thumbnail, ...merged.images]) {
                if (u && !isOurStorageImageReference(u)) {
                    setError('Images must be uploaded to Cloud Storage (use Upload). External URLs are not allowed.')
                    toast.error('Upload images with the + button — only your Firebase Storage URLs are saved.')
                    return
                }
            }
            const totalStock = showVariants && variants.length > 0
                ? variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
                : Math.max(0, Number(form.stockQuantity || 0))
            const result = upsertAdminProduct({
                ...merged,
                id: isNew ? undefined : id,
                originalPrice: Number(form.originalPrice || 0),
                stockQuantity: totalStock,
                inStock: totalStock > 0,
                images: merged.images,
                image: merged.image,
                thumbnail: merged.thumbnail,
                ...(showVariants && variants.length > 0 ? { variants } : {}),
                ...(form.linkUrl.trim() ? { linkUrl: form.linkUrl.trim() } : { linkUrl: '' }),
                productCode: form.productCode.trim(),
            })
            if (result && !result.ok) {
                setError(result.error)
                return
            }
            setForm((f) => ({
                ...f,
                image: merged.image,
                thumbnail: merged.thumbnail,
                images: merged.images,
            }))
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            toast.success(isNew ? 'Product created!' : 'Changes saved!', { position: 'top-right', autoClose: 2500 })
            if (isNew) {
                navigate('/admin/products')
            }
        } catch (err) {
            console.error('Save product failed:', err)
            setError(err?.message || 'Save failed')
            toast.error('Could not save (check Storage upload / login).')
        } finally {
            setSaving(false)
        }
    }

    const oldPrice = form.originalPrice > 0 && form.originalPrice > form.price ? Math.round(form.originalPrice) : 0
    const discount = oldPrice > 0 ? Math.max(0, Math.round((1 - form.price / oldPrice) * 100)) : 0
    const stockQty = Math.max(0, Number(form.stockQuantity || 0))
    const isAvailable = stockQty > 0
    const allImages = form.images.length > 0 ? form.images : (form.image ? [form.image] : [])
    const mainImage = form.image || allImages[0] || ''

    return (
        <div className="space-y-4">
            {/* Top bar */}
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/admin/products')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                    <ArrowLeft size={16} />
                    Back to Products
                </button>
                <div className="flex items-center gap-2">
                    {isSuperAdmin && !isNew && (
                        <>
                            <button
                                onClick={() => {
                                    upsertAdminProduct({ id, approvalStatus: 'approved' })
                                    toast.success('Бүтээгдэхүүн зөвшөөрөгдлөө')
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                Зөвшөөрөх
                            </button>
                            <button
                                onClick={() => {
                                    upsertAdminProduct({ id, approvalStatus: 'rejected' })
                                    toast.info('Бүтээгдэхүүн татгалзагдлаа')
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm"
                            >
                                Татгалзах
                            </button>
                        </>
                    )}
                    {saved && <span className="text-sm text-emerald-600 font-medium animate-pulse">Saved!</span>}
                    {error && <span className="text-sm text-rose-600 font-medium">{error}</span>}
                    <button type="button" disabled={saving} onClick={() => handleSave()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60">
                        <Save size={16} />
                        {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Product page mirror layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Gallery editor */}
                <div className="lg:col-span-7">
                    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                        {/* Main image */}
                        <div className="relative bg-slate-50 flex items-center justify-center" style={{ minHeight: 400 }}>
                            {mainImage ? (
                                <img src={mainImage} alt="Product" className="max-h-[500px] w-full object-contain p-4" />
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-slate-400 py-16">
                                    <Upload size={48} strokeWidth={1} />
                                    <p className="text-sm">No image yet — use Upload (+) to add files to Cloud Storage</p>
                                </div>
                            )}
                            {discount > 0 && (
                                <span className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{discount}%</span>
                            )}
                        </div>

                        {/* Thumbnail strip with drag & drop reorder */}
                        <div className="flex items-center gap-2 p-3 border-t bg-white overflow-x-auto">
                            {allImages.map((img, i) => (
                                <div
                                    key={i}
                                    className={`relative group shrink-0 ${dragIdx === i ? 'opacity-50' : ''}`}
                                    draggable
                                    onDragStart={() => handleDragStart(i)}
                                    onDragOver={(e) => handleDragOver(e, i)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <button
                                        onClick={() => setMainImageFromGallery(img)}
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${img === mainImage ? 'border-slate-900 ring-2 ring-slate-300' : 'border-transparent hover:border-slate-300'}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                        <GripVertical size={12} className="text-slate-400" />
                                    </div>
                                    <button
                                        onClick={() => removeImage(i)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors shrink-0"
                            >
                                <Plus size={20} />
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0])} />
                        </div>

                        <p className="p-3 border-t text-xs text-slate-500 bg-slate-50/80">
                            Images are stored in Firebase Cloud Storage; Firestore keeps only the download URL.
                        </p>
                    </div>
                </div>

                {/* Right: Product details editor */}
                <aside className="lg:col-span-5 space-y-4">
                    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-5">
                        {/* Stock badge */}
                        {!isAvailable && <p className="text-sm font-semibold text-rose-600 uppercase tracking-wide">Out of stock</p>}
                        {isAvailable && stockQty <= 5 && <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Only {stockQty} left</p>}

                        {/* Title */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Title</label>
                            <input
                                value={form.title}
                                onChange={(e) => update('title', e.target.value)}
                                placeholder="Product title…"
                                className="w-full text-xl font-bold text-slate-900 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-300"
                            />
                        </div>

                        {/* Brand */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Brand</label>
                            <input
                                value={form.brand}
                                onChange={(e) => update('brand', e.target.value)}
                                placeholder="Brand name…"
                                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </div>

                        {/* Category */}
                        <CategoryCombobox
                            value={form.category}
                            onChange={(val) => update('category', val)}
                            categories={categoryOptions}
                        />

                        {/* Product Code (optional) */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Code</label>
                            <input
                                value={form.productCode}
                                onChange={(e) => update('productCode', e.target.value)}
                                placeholder="Бүтээгдэхүүний код..."
                                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                            <p className="text-xs text-slate-400 mt-1">Та бараагаа өөрөө таних код оруулж эсвэл оруулахгүй ч байж болно</p>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Selling Price</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={form.price}
                                    onChange={(e) => update('price', Number(e.target.value))}
                                    className="w-full text-2xl font-extrabold text-slate-900 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">₮</span>
                            </div>
                        </div>

                        {/* Original Price (for sale) */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Original Price <span className="normal-case font-normal text-slate-400">(leave 0 or empty for no sale)</span></label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={form.originalPrice || ''}
                                    onChange={(e) => update('originalPrice', Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full text-lg text-slate-600 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">₮</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-sm font-bold px-3 py-1 rounded-lg">-{discount}%</span>
                                    <span className="text-sm text-slate-500">
                                        {formatCurrency(oldPrice)} → {formatCurrency(form.price)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => update('description', e.target.value)}
                                placeholder="Product description…"
                                rows={4}
                                className="w-full text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                            />
                        </div>

                        {/* Marketing / external link */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">
                                <ExternalLink size={12} className="inline mr-1" />
                                Бараа холбоос (Link)
                            </label>
                            <input
                                value={form.linkUrl}
                                onChange={(e) => update('linkUrl', e.target.value)}
                                placeholder="Та уг барааны маркетинг бичлэг хийсэн линк ээ оруулвал Бүтээгдэхүүнийг үзэж буй хүмүүс дарж орж харах боломжтой болно"
                                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400 placeholder:text-xs"
                            />
                            {form.linkUrl && (
                                <a href={form.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-xs text-indigo-600 hover:underline">
                                    <ExternalLink size={10} /> Урьдчилж харах
                                </a>
                            )}
                        </div>

                        <div className="border-t border-slate-100 my-2" />

                        {/* Colors */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Colors</label>
                            {/* Selected colors */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {form.colors.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => removeColor(color)}
                                        className="w-9 h-9 rounded-full border-2 border-slate-900 ring-2 ring-slate-300 flex items-center justify-center group relative"
                                        style={{ backgroundColor: color }}
                                        title={`Remove ${color}`}
                                    >
                                        <X size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${['#FFFFFF', '#FFF', '#fff', '#ffffff'].includes(color) ? 'text-slate-900' : 'text-white'}`} />
                                    </button>
                                ))}
                                {form.colors.length === 0 && <span className="text-xs text-slate-400">No colors selected</span>}
                            </div>
                            {/* Preset palette */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {PRESET_COLORS.filter((c) => !form.colors.includes(c)).map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => addColor(color)}
                                        className="w-7 h-7 rounded-full border border-slate-200 hover:border-slate-400 transition-colors hover:scale-110"
                                        style={{ backgroundColor: color }}
                                        title={`Add ${color}`}
                                    />
                                ))}
                            </div>
                            {/* Custom color */}
                            <div className="flex items-center gap-2 mt-2">
                                <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                                <input
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                                <button onClick={() => addColor(customColor)} className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                    Add
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 my-2" />

                        {/* Sizes */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Sizes</label>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {form.sizes.map((s) => (
                                    <span key={s} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-sm font-medium px-3 py-1.5 rounded-lg">
                                        {s}
                                        <button onClick={() => removeSize(s)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={12} /></button>
                                    </span>
                                ))}
                                {form.sizes.length === 0 && <span className="text-xs text-slate-400">No sizes added</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    value={newSize}
                                    onChange={(e) => setNewSize(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize() } }}
                                    placeholder="e.g. S, M, L, 42, 43…"
                                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                                <button onClick={addSize} className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                    Add
                                </button>
                            </div>
                            <div className="flex gap-1 mt-2">
                                {['S', 'M', 'L', 'XL', 'XXL'].map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => { if (!form.sizes.includes(preset)) update('sizes', [...form.sizes, preset]) }}
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${form.sizes.includes(preset) ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 my-2" />

                        {/* Variants (size × color SKU management) */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Variants / SKU</label>
                                <button
                                    type="button"
                                    onClick={generateVariants}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                                >
                                    {showVariants ? 'Шинэчлэх' : 'Үүсгэх'}
                                </button>
                            </div>
                            {showVariants && variants.length > 0 && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-1 text-[10px] font-medium text-slate-400 uppercase px-1">
                                        <span>Size</span><span>Color</span><span>SKU</span><span>Stock</span><span></span>
                                    </div>
                                    {variants.map((v, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-1 items-center">
                                            <span className="text-xs text-slate-700 px-1 truncate">{v.size || '—'}</span>
                                            <div className="flex items-center gap-1">
                                                {v.color ? <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: v.color }} /> : null}
                                                <span className="text-xs text-slate-500 truncate">{v.color || '—'}</span>
                                            </div>
                                            <input
                                                value={v.sku}
                                                onChange={(e) => updateVariant(i, 'sku', e.target.value)}
                                                placeholder="SKU"
                                                className="w-20 text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                            />
                                            <input
                                                type="number"
                                                value={v.stock}
                                                onChange={(e) => updateVariant(i, 'stock', Math.max(0, Number(e.target.value)))}
                                                className="w-14 text-xs border border-slate-200 rounded px-1.5 py-1 text-center focus:outline-none focus:ring-1 focus:ring-slate-300"
                                            />
                                            <button onClick={() => removeVariant(i)} className="text-slate-300 hover:text-rose-500 transition-colors p-0.5">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Нийт {variants.length} хувилбар • Нийт нөөц: {variants.reduce((s, v) => s + (v.stock || 0), 0)}
                                    </p>
                                </div>
                            )}
                            {!showVariants && (
                                <p className="text-xs text-slate-400">Өнгө, размер нэмсний дараа Variants үүсгэж SKU, нөөцийг хувилбар тус бүрээр удирдах боломжтой.</p>
                            )}
                        </div>

                        <div className="border-t border-slate-100 my-2" />

                        {/* Stock Quantity */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Stock Quantity</label>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600">Available items</p>
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => update('stockQuantity', Math.max(0, form.stockQuantity - 1))}
                                        className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                                    >−</button>
                                    <input
                                        type="number"
                                        value={form.stockQuantity}
                                        onChange={(e) => update('stockQuantity', Math.max(0, Number(e.target.value)))}
                                        className="w-16 h-10 text-center text-sm font-semibold text-slate-900 border-x border-slate-200 focus:outline-none"
                                    />
                                    <button
                                        onClick={() => update('stockQuantity', form.stockQuantity + 1)}
                                        className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                                    >+</button>
                                </div>
                            </div>
                        </div>

                        {/* Product type: Ready or Order */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Бүтээгдэхүүний төлөв</label>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="productType"
                                        checked={form.productType === 'ready'}
                                        onChange={() => update('productType', 'ready')}
                                        className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-slate-700 font-medium">Бэлэн</span>
                                </label>
                                {(tier === 'gold' || isSuperAdmin) && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="productType"
                                            checked={form.productType === 'order'}
                                            onChange={() => update('productType', 'order')}
                                            className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500"
                                        />
                                        <span className="text-sm text-slate-700 font-medium">Захиалгат</span>
                                    </label>
                                )}
                            </div>
                            {form.productType === 'order' && (
                                <div className="mt-2">
                                    <label className="text-xs text-slate-500 mb-1 block">Хүргэх хугацаа (хоног)</label>
                                    <input
                                        type="number"
                                        value={form.orderDays}
                                        onChange={(e) => update('orderDays', Math.max(1, Number(e.target.value)))}
                                        min={1}
                                        max={90}
                                        className="w-32 text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                    <span className="text-xs text-slate-400 ml-2">хоног</span>
                                </div>
                            )}
                        </div>

                        {/* Info preview rows */}
                        <div className="text-sm text-slate-600 space-y-2 border-t border-slate-100 pt-4">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Төлөв</span>
                                <span className={`font-medium ${form.productType === 'ready' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {form.productType === 'ready' ? 'Бэлэн' : `Захиалгат (${form.orderDays} хоног)`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Seller</span>
                                <span className="font-medium text-slate-900">{form.brand || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Availability</span>
                                <span className={`font-medium ${isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isAvailable ? `${stockQty} in stock` : 'Out of stock'}
                                </span>
                            </div>
                        </div>

                        {/* Save button (bottom) */}
                        <div className="pt-3 space-y-2.5">
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSave()}
                                className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <Save size={16} />
                                {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => navigate('/admin/products')}
                                className="w-full rounded-xl bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 py-3.5 text-sm font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

function CategoryCombobox({ value, onChange, categories }) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState(value || '')
    const containerRef = useRef(null)

    // Sync input with external value changes
    useEffect(() => {
        setInputValue(value || '')
    }, [value])

    // Close on click outside or Escape
    useEffect(() => {
        function handleMouseDown(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        function handleKeyDown(e) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', handleMouseDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleMouseDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    const parents = useMemo(() => categories.filter((c) => !c.parentId), [categories])

    const childrenMap = useMemo(() => {
        const map = {}
        categories.forEach((c) => {
            if (c.parentId) {
                if (!map[c.parentId]) map[c.parentId] = []
                map[c.parentId].push(c)
            }
        })
        return map
    }, [categories])

    // Filter parents (and their children) by the typed query
    const filteredParents = useMemo(() => {
        const q = inputValue.trim().toLowerCase()
        if (!q) return parents
        return parents.filter((p) => {
            const pMatch = (p.nameMn || p.name).toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
            const kids = childrenMap[p.id] || []
            const childMatch = kids.some(
                (c) => (c.nameMn || c.name).toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
            )
            return pMatch || childMatch
        })
    }, [inputValue, parents, childrenMap])

    // Breadcrumb: if selected value matches a child, show "Parent › Child"
    const breadcrumb = useMemo(() => {
        if (!value) return null
        const child = categories.find((c) => c.parentId && (c.nameMn || c.name) === value)
        if (!child) return null
        const parent = categories.find((p) => p.id === child.parentId)
        if (!parent) return null
        return `${parent.nameMn || parent.name} › ${child.nameMn || child.name}`
    }, [value, categories])

    function handleSelect(item) {
        const val = item.nameMn || item.name
        onChange(val)
        setInputValue(val)
        setOpen(false)
    }

    return (
        <div ref={containerRef} className="relative">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Ангилал / Category</label>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value)
                    onChange(e.target.value)
                    setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                placeholder="Ангилал хайх..."
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            {breadcrumb && (
                <p className="text-[11px] text-slate-400 mt-0.5">{breadcrumb}</p>
            )}
            {open && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {filteredParents.length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-400">No categories found</div>
                    )}
                    {filteredParents.map((parent) => {
                        const q = inputValue.trim().toLowerCase()
                        const kids = (childrenMap[parent.id] || []).filter((c) => {
                            if (!q) return true
                            return (c.nameMn || c.name).toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
                        })
                        return (
                            <div key={parent.id}>
                                <button
                                    type="button"
                                    onClick={() => handleSelect(parent)}
                                    className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                    {parent.nameMn || parent.name}
                                </button>
                                {kids.map((child) => (
                                    <button
                                        key={child.id}
                                        type="button"
                                        onClick={() => handleSelect(child)}
                                        className="w-full text-left pl-8 pr-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        {child.nameMn || child.name}
                                    </button>
                                ))}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
