import { useMemo, useState } from 'react'
import { Star, Trash2, Store } from 'lucide-react'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { setHighlightProduct, removeHighlightProduct, getState } from '../../modules/state/store.js'
import { useSyncExternalStore } from 'react'
import { subscribe } from '../../modules/state/store.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'

export default function HighlightsAdminPage() {
    const { adminUsers } = useSession()
    const { allProducts } = useAdmin()
    const state = useSyncExternalStore(subscribe, getState)
    const highlights = state.highlights || {}

    const stores = useMemo(() =>
        adminUsers.filter((u) => u.role === 'admin').map((u) => ({
            id: u.storeId,
            name: u.storeName || u.storeId,
            owner: u.name,
        })),
        [adminUsers]
    )

    const [selectedStoreId, setSelectedStoreId] = useState('')

    const storeProducts = useMemo(() =>
        selectedStoreId ? allProducts.filter((p) => p.storeId === selectedStoreId) : [],
        [allProducts, selectedStoreId]
    )

    const highlightedEntries = useMemo(() => {
        const entries = []
        for (const [storeId, productId] of Object.entries(highlights)) {
            const store = stores.find((s) => s.id === storeId)
            const product = allProducts.find((p) => p.id === productId)
            if (store && product) {
                entries.push({ store, product })
            }
        }
        return entries
    }, [highlights, stores, allProducts])

    function handleHighlight(productId) {
        if (!selectedStoreId) return
        setHighlightProduct(selectedStoreId, productId)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Highlights</h1>
                <p className="text-muted-foreground mt-1">
                    Select stores and pick 1 product from each to highlight on the storefront.
                </p>
            </div>

            {/* Current highlights */}
            {highlightedEntries.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Active Highlights</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Store</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {highlightedEntries.map(({ store, product }) => (
                                    <TableRow key={store.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                    {store.name[0]}
                                                </div>
                                                <span className="font-medium text-sm">{store.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {product.thumbnail && (
                                                    <img src={product.thumbnail} alt="" className="h-8 w-8 rounded object-cover" />
                                                )}
                                                <span className="text-sm">{product.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">${product.price}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="destructive" onClick={() => removeHighlightProduct(store.id)}>
                                                <Trash2 size={14} className="mr-1" /> Remove
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Pick store & product */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Add Highlight</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Store</label>
                        <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                            <SelectTrigger className="w-full max-w-sm">
                                <SelectValue placeholder="Choose a store…" />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <div className="flex items-center gap-2">
                                            <Store size={14} />
                                            <span>{s.name}</span>
                                            {highlights[s.id] && (
                                                <Badge className="ml-1 text-[9px] bg-yellow-200 text-yellow-800">has highlight</Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedStoreId && storeProducts.length === 0 && (
                        <p className="text-sm text-muted-foreground">This store has no products.</p>
                    )}

                    {selectedStoreId && storeProducts.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {storeProducts.map((product) => {
                                const isHighlighted = highlights[selectedStoreId] === product.id
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => handleHighlight(product.id)}
                                        className={`relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${
                                            isHighlighted
                                                ? 'border-yellow-400 bg-yellow-50 shadow-md'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        {isHighlighted && (
                                            <Badge className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[9px]">
                                                <Star size={10} className="mr-0.5" /> Highlighted
                                            </Badge>
                                        )}
                                        {product.thumbnail && (
                                            <img src={product.thumbnail} alt="" className="w-full aspect-square object-cover rounded-lg mb-2" />
                                        )}
                                        <p className="text-sm font-medium line-clamp-2">{product.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">${product.price}</p>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
