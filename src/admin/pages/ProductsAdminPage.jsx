import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Badge } from '../components/ui/Badge.jsx'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs.jsx'
import { Alert, AlertTitle, AlertDescription } from '../components/ui/Alert.jsx'

export default function ProductsAdminPage() {
    const navigate = useNavigate()
    const { products, deleteAdminProduct, resetAdminProducts, isSuperAdmin } = useAdmin()
    const { adminUsers, tier } = useSession()
    const state = useSyncExternalStore(subscribe, getState)
    const highlights = state.highlights || {}
    const [query, setQuery] = useState('')
    const [storeTab, setStoreTab] = useState('all')
    const [tierAlert, setTierAlert] = useState(false)

    const currentPlan = tier ? TIER_PLANS[tier] : null
    const myProductCount = products.length
    const tierLimitReached = !isSuperAdmin && currentPlan && myProductCount >= currentPlan.maxProducts

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

    function handleAddProduct() {
        if (tierLimitReached) {
            setTierAlert(true)
            return
        }
        setTierAlert(false)
        navigate('/admin/products/new')
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="space-y-3">
                    <div className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Products List</CardTitle>
                        <div className="flex items-center gap-2">
                            <Input className="w-64" placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} />
                            <Button variant="outline" size="sm" onClick={resetAdminProducts}>Reset seeded</Button>
                            {!isSuperAdmin && <Button size="sm" onClick={handleAddProduct}>Add Product</Button>}
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
                                <TableHead></TableHead>
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
                                    <TableCell colSpan={isSuperAdmin ? 8 : 7} className="h-24 text-center text-slate-400">No products found.</TableCell>
                                </TableRow>
                            ) : (
                                visible.map((product) => {
                                    const ownerInfo = isSuperAdmin ? adminUsers.find((u) => u.storeId === product.storeId) : null
                                    return (
                                        <TableRow key={product.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/admin/products/${product.id}/edit`)}>
                                            <TableCell className="w-12">
                                                {product.thumbnail ? (
                                                    <img src={product.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">img</div>
                                                )}
                                            </TableCell>
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
                                            <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
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
                                                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/products/${product.id}/edit`)}>Edit</Button>
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
    )
}
