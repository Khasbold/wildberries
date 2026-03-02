import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { TIER_PLANS } from '../../modules/state/store.js'
import { ArrowLeft, Plus, X, Upload, Save, Trash2 } from 'lucide-react'

function formatCurrency(n) {
    try {
        return new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 0 }).format(Math.round(n)) + '₮'
    } catch {
        return `${Math.round(n)}₮`
    }
}

const PRESET_COLORS = [
    '#FFFFFF', '#000000', '#3B82F6', '#1D4ED8', '#DC2626',
    '#EF4444', '#92400E', '#D4A373', '#1F2937', '#6B7280',
    '#4B5563', '#374151', '#16A34A', '#7C3AED', '#F59E0B',
]

export default function ProductEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { products, categories, upsertAdminProduct } = useAdmin()
    const { tier } = useSession()
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
        fastDelivery: false,
        colors: [],
        sizes: [],
        image: '',
        thumbnail: '',
        description: '',
        images: [],
    })

    const [newSize, setNewSize] = useState('')
    const [customColor, setCustomColor] = useState('#3B82F6')
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (existing) {
            setForm({
                title: existing.title || '',
                brand: existing.brand || '',
                category: existing.category || categoryOptions[0]?.name || 'Accessories',
                price: existing.price || 0,
                originalPrice: existing.originalPrice || 0,
                stockQuantity: existing.stockQuantity ?? (existing.inStock ? 10 : 0),
                fastDelivery: existing.fastDelivery || false,
                colors: Array.isArray(existing.colors) ? existing.colors : [],
                sizes: Array.isArray(existing.sizes) ? existing.sizes : [],
                image: existing.image || '',
                thumbnail: existing.thumbnail || '',
                description: existing.description || '',
                images: Array.isArray(existing.images) ? existing.images : (existing.image ? [existing.image] : []),
            })
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

    function onPickImage(file) {
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = String(reader.result || '')
            setForm((f) => ({
                ...f,
                image: f.image || dataUrl,
                thumbnail: f.thumbnail || dataUrl,
                images: [...f.images, dataUrl],
            }))
        }
        reader.readAsDataURL(file)
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

    function setMainImage(dataUrl) {
        update('image', dataUrl)
        update('thumbnail', dataUrl)
    }

    function handleSave() {
        if (!form.title.trim()) {
            setError('Title is required')
            return
        }
        if (!form.price || form.price <= 0) {
            setError('Price must be greater than 0')
            return
        }
        setError('')
        const result = upsertAdminProduct({
            ...form,
            id: isNew ? undefined : id,
            originalPrice: Number(form.originalPrice || 0),
            stockQuantity: Math.max(0, Number(form.stockQuantity || 0)),
            inStock: Number(form.stockQuantity || 0) > 0,
            images: form.images,
        })
        if (result && !result.ok) {
            setError(result.error)
            return
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        if (isNew) {
            navigate('/admin/products')
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
                    {saved && <span className="text-sm text-emerald-600 font-medium animate-pulse">Saved!</span>}
                    {error && <span className="text-sm text-rose-600 font-medium">{error}</span>}
                    <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">
                        <Save size={16} />
                        {isNew ? 'Create Product' : 'Save Changes'}
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
                                    <p className="text-sm">No image yet — upload or paste a URL below</p>
                                </div>
                            )}
                            {discount > 0 && (
                                <span className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{discount}%</span>
                            )}
                        </div>

                        {/* Thumbnail strip */}
                        <div className="flex items-center gap-2 p-3 border-t bg-white overflow-x-auto">
                            {allImages.map((img, i) => (
                                <div key={i} className="relative group shrink-0">
                                    <button
                                        onClick={() => setMainImage(img)}
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${img === mainImage ? 'border-slate-900 ring-2 ring-slate-300' : 'border-transparent hover:border-slate-300'}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
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

                        {/* URL input */}
                        <div className="p-3 border-t">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Or paste image URL…"
                                    className="flex-1 text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            const url = e.target.value.trim()
                                            setForm((f) => ({
                                                ...f,
                                                image: f.image || url,
                                                thumbnail: f.thumbnail || url,
                                                images: [...f.images, url],
                                            }))
                                            e.target.value = ''
                                        }
                                    }}
                                />
                                <span className="text-xs text-slate-400">Press Enter to add</span>
                            </div>
                        </div>
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
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Category</label>
                            <select
                                value={form.category}
                                onChange={(e) => update('category', e.target.value)}
                                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {categoryOptions.map((cat) => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
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

                        {/* Fast delivery toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Fast delivery</span>
                            <button
                                onClick={() => update('fastDelivery', !form.fastDelivery)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${form.fastDelivery ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.fastDelivery ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>

                        {/* Info preview rows */}
                        <div className="text-sm text-slate-600 space-y-2 border-t border-slate-100 pt-4">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Delivery</span>
                                <span className="font-medium text-slate-900">{form.fastDelivery ? 'Tomorrow' : '2-4 days'}</span>
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
                                onClick={handleSave}
                                className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                {isNew ? 'Create Product' : 'Save Changes'}
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
