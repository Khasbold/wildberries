import { useMemo, useState } from 'react'
import { AlertTriangle, Star } from 'lucide-react'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { TIER_PLANS } from '../../modules/state/store.js'
import { setHighlightProduct, removeHighlightProduct, subscribe, getState } from '../../modules/state/store.js'
import { useSyncExternalStore } from 'react'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/Dialog.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select.jsx'
import { Checkbox } from '../components/ui/Checkbox.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Label } from '../components/ui/Label.jsx'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs.jsx'
import { Alert, AlertTitle, AlertDescription } from '../components/ui/Alert.jsx'

const initialForm = {
    title: '',
    brand: '',
    category: 'Accessories',
    price: 0,
    rating: 0,
    stockQuantity: 0,
    fastDelivery: false,
    colors: '',
    sizes: '',
    image: '',
    thumbnail: '',
    description: '',
}

export default function ProductsAdminPage() {
    const { products, categories, upsertAdminProduct, deleteAdminProduct, resetAdminProducts, isSuperAdmin } = useAdmin()
    const { adminUsers, tier } = useSession()
    const state = useSyncExternalStore(subscribe, getState)
    const highlights = state.highlights || {}
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [query, setQuery] = useState('')
    const [form, setForm] = useState(initialForm)
    const [storeTab, setStoreTab] = useState('all')
    const [submitError, setSubmitError] = useState('')
    const [tierAlert, setTierAlert] = useState(false)

    const currentPlan = tier ? TIER_PLANS[tier] : null
    const myProductCount = products.length
    const tierLimitReached = !isSuperAdmin && currentPlan && myProductCount >= currentPlan.maxProducts

    const categoryOptions = categories.length ? categories : [{ id: 'fallback', name: 'Accessories' }]

    /* store owner tabs for superadmin */
    const storeTabs = useMemo(() => {
        if (!isSuperAdmin) return []
        const owners = adminUsers.filter((u) => u.role === 'admin')
        return owners.map((o) => ({ storeId: o.storeId, storeName: o.storeName || o.storeId }))
    }, [isSuperAdmin, adminUsers])

    const visible = useMemo(() => {
        let list = products
        if (isSuperAdmin && storeTab !== 'all') {
            list = list.filter((p) => p.storeId === storeTab)
        }
        const q = query.trim().toLowerCase()
        if (!q) return list
        return list.filter((p) => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    }, [products, query, storeTab, isSuperAdmin])

    function startCreate() {
        if (tierLimitReached) {
            setTierAlert(true)
            return
        }
        setTierAlert(false)
        setEditingId(null)
        setForm({ ...initialForm, category: categoryOptions[0].name })
        setIsModalOpen(true)
    }

    function startEdit(product) {
        setEditingId(product.id)
        setForm({
            ...product,
            stockQuantity: product.stockQuantity ?? (product.inStock ? 10 : 0),
            colors: Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || ''),
            sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || ''),
        })
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setEditingId(null)
        setForm(initialForm)
        setSubmitError('')
    }

    function onPickImage(file) {
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = String(reader.result || '')
            setForm((f) => ({ ...f, image: dataUrl, thumbnail: dataUrl }))
        }
        reader.readAsDataURL(file)
    }

    function submit(e) {
        e.preventDefault()
        const stockQty = Math.max(0, Number(form.stockQuantity || 0))
        const colorsArr = typeof form.colors === 'string'
            ? form.colors.split(',').map((c) => c.trim()).filter(Boolean)
            : (Array.isArray(form.colors) ? form.colors : [])
        const sizesArr = typeof form.sizes === 'string'
            ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean)
            : (Array.isArray(form.sizes) ? form.sizes : [])
        const result = upsertAdminProduct({
            ...form,
            id: editingId || undefined,
            stockQuantity: stockQty,
            inStock: stockQty > 0,
            colors: colorsArr,
            sizes: sizesArr,
        })
        if (result && !result.ok) {
            setSubmitError(result.error)
            return
        }
        closeModal()
    }

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="space-y-3">
                        <div className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Products List</CardTitle>
                            <div className="flex items-center gap-2">
                                <Input className="w-64" placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} />
                                <Button variant="outline" size="sm" onClick={resetAdminProducts}>Reset seeded</Button>
                                {!isSuperAdmin && <Button size="sm" onClick={startCreate}>Add Product</Button>}
                            </div>
                        </div>
                        {isSuperAdmin && storeTabs.length > 0 && (
                            <Tabs value={storeTab} onValueChange={setStoreTab}>
                                <TabsList>
                                    <TabsTrigger value="all">
                                        All Stores
                                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">{products.length}</Badge>
                                    </TabsTrigger>
                                    {storeTabs.map((tab) => {
                                        const count = products.filter((p) => p.storeId === tab.storeId).length
                                        return (
                                            <TabsTrigger key={tab.storeId} value={tab.storeId}>
                                                {tab.storeName}
                                                <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">{count}</Badge>
                                            </TabsTrigger>
                                        )
                                    })}
                                </TabsList>
                            </Tabs>
                        )}
                    </CardHeader>

                    {tierAlert && (
                        <div className="px-6 pb-2">
                            <Alert variant="warning" className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <AlertTitle>Product Limit Reached</AlertTitle>
                                    <AlertDescription>
                                        Your <strong>{currentPlan?.name}</strong> tier allows a maximum of{' '}
                                        <strong>{currentPlan?.maxProducts}</strong> products. You currently have{' '}
                                        <strong>{myProductCount}</strong>.{' '}
                                        <a href="/admin/tier-list" className="underline font-medium text-yellow-800 hover:text-yellow-950">
                                            Upgrade your tier
                                        </a>{' '}
                                        to add more products.
                                    </AlertDescription>
                                </div>
                                <button onClick={() => setTierAlert(false)} className="text-yellow-600 hover:text-yellow-800 text-lg leading-none">&times;</button>
                            </Alert>
                        </div>
                    )}

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Brand</TableHead>
                                    <TableHead>Category</TableHead>
                                    {isSuperAdmin && <TableHead>Store</TableHead>}
                                    <TableHead>Price</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isSuperAdmin ? 7 : 6} className="h-24 text-center text-slate-400">No products found.</TableCell>
                                    </TableRow>
                                ) : (
                                    visible.map((product) => {
                                        const ownerInfo = isSuperAdmin ? adminUsers.find((u) => u.storeId === product.storeId) : null
                                        return (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">{product.title}</TableCell>
                                                <TableCell>{product.brand}</TableCell>
                                                <TableCell>{product.category}</TableCell>
                                                {isSuperAdmin && (
                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                                                {ownerInfo?.storeName?.[0] || '?'}
                                                            </div>
                                                            <span className="text-xs text-slate-600">{ownerInfo?.storeName || product.storeId}</span>
                                                        </div>
                                                    </TableCell>
                                                )}
                                                <TableCell>{product.price}</TableCell>
                                                <TableCell>
                                                    <Badge variant={(product.stockQuantity ?? (product.inStock ? 10 : 0)) > 0 ? 'success' : 'danger'}>
                                                        {(product.stockQuantity ?? (product.inStock ? 10 : 0)) > 0
                                                            ? `${product.stockQuantity ?? 10} in stock`
                                                            : 'Out of stock'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    {!isSuperAdmin && tier && tier !== 'free' && (
                                                        (() => {
                                                            const myStoreId = product.storeId
                                                            const isHighlighted = highlights[myStoreId] === product.id
                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    variant={isHighlighted ? 'default' : 'outline'}
                                                                    className={isHighlighted ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                                                                    title={isHighlighted ? 'Remove highlight' : 'Highlight this product'}
                                                                    onClick={() => {
                                                                        if (isHighlighted) {
                                                                            removeHighlightProduct(myStoreId)
                                                                        } else {
                                                                            setHighlightProduct(myStoreId, product.id)
                                                                        }
                                                                    }}
                                                                >
                                                                    <Star size={14} className={isHighlighted ? 'fill-current' : ''} />
                                                                </Button>
                                                            )
                                                        })()
                                                    )}
                                                    <Button size="sm" variant="outline" onClick={() => startEdit(product)}>Edit</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => deleteAdminProduct(product.id)}>Delete</Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit product' : 'Create product'}</DialogTitle>
                        <DialogDescription>Fill in the product details below.</DialogDescription>
                    </DialogHeader>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submit}>
                        {submitError && (
                            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {submitError}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Brand</Label>
                            <Input placeholder="Brand" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={form.category} onValueChange={(val) => setForm((f) => ({ ...f, category: val }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Price</Label>
                            <Input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Stock Quantity</Label>
                            <Input type="number" min="0" placeholder="0 = out of stock" value={form.stockQuantity} onChange={(e) => setForm((f) => ({ ...f, stockQuantity: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Rating</Label>
                            <Input type="number" step="0.1" placeholder="Rating" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Colors (hex, comma-separated)</Label>
                            <Input placeholder="#FFFFFF, #000000, #3B82F6" value={form.colors} onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Sizes (comma-separated)</Label>
                            <Input placeholder="S, M, L, XL or 36, 37, 38" value={form.sizes} onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Image URL</Label>
                            <Input placeholder="Image URL" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value, thumbnail: f.thumbnail || e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Upload Image</Label>
                            <Input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Description</Label>
                            <Input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="fastDelivery" checked={form.fastDelivery} onCheckedChange={(checked) => setForm((f) => ({ ...f, fastDelivery: !!checked }))} />
                            <Label htmlFor="fastDelivery">Fast delivery</Label>
                        </div>
                        {form.image ? (
                            <div className="md:col-span-2 flex items-center gap-3 rounded-md border p-2">
                                <img src={form.image} alt="Preview" className="h-14 w-14 rounded object-cover" />
                                <p className="text-xs text-muted-foreground">Image preview</p>
                            </div>
                        ) : null}
                        <DialogFooter className="md:col-span-2">
                            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                            <Button type="submit">{editingId ? 'Update product' : 'Create product'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
