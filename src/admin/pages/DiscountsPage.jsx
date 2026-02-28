import { useMemo, useState } from 'react'
import { Ticket, Plus, Trash2, RotateCcw, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog.jsx'
import { Label } from '../components/ui/Label.jsx'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'

export default function DiscountsPage() {
    const { discounts, upsertAdminDiscount, deleteAdminDiscount, resetAdminDiscounts, isSuperAdmin } = useAdmin()
    const { adminUsers } = useSession()

    const [query, setQuery] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ code: '', discountValue: '', quantity: '' })

    const visible = useMemo(() => {
        if (!query.trim()) return discounts
        const q = query.toLowerCase()
        return discounts.filter(
            (d) =>
                d.code.toLowerCase().includes(q) ||
                d.storeId?.toLowerCase().includes(q)
        )
    }, [discounts, query])

    function getStoreName(storeId) {
        const user = adminUsers.find((u) => u.storeId === storeId)
        return user?.storeName || storeId
    }

    function startCreate() {
        setEditing(null)
        setForm({ code: '', discountValue: '', quantity: '' })
        setDialogOpen(true)
    }

    function startEdit(disc) {
        setEditing(disc)
        setForm({
            code: disc.code,
            discountValue: String(disc.discountValue),
            quantity: String(disc.quantity),
        })
        setDialogOpen(true)
    }

    function save() {
        const code = form.code.trim().toUpperCase().replace(/\s+/g, '')
        if (!code) return
        const discountValue = Number(form.discountValue)
        const quantity = Number(form.quantity)
        if (discountValue <= 0 || quantity <= 0) return

        if (editing) {
            upsertAdminDiscount({
                id: editing.id,
                code,
                discountValue,
                quantity,
            })
        } else {
            upsertAdminDiscount({ code, discountValue, quantity })
        }
        setDialogOpen(false)
    }

    function toggleActive(disc) {
        upsertAdminDiscount({ id: disc.id, active: !disc.active })
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Ticket size={20} className="text-slate-600" />
                        <CardTitle className="text-lg">Discount Codes</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input className="w-64" placeholder="Search codes…" value={query} onChange={(e) => setQuery(e.target.value)} />
                        <Button variant="outline" size="sm" onClick={resetAdminDiscounts}>
                            <RotateCcw size={14} className="mr-1" />
                            Reset
                        </Button>
                        {!isSuperAdmin && (
                            <Button size="sm" onClick={startCreate}>
                                <Plus size={14} className="mr-1" />
                                Add Code
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                {isSuperAdmin && <TableHead>Store</TableHead>}
                                <TableHead>Discount (₽)</TableHead>
                                <TableHead>Remaining</TableHead>
                                <TableHead>Used</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isSuperAdmin ? 7 : 6} className="h-24 text-center text-slate-400">
                                        No discount codes found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visible.map((disc) => {
                                    const remaining = disc.quantity - disc.usedCount
                                    return (
                                        <TableRow key={disc.id}>
                                            <TableCell>
                                                <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-sm">
                                                    {disc.code}
                                                </span>
                                            </TableCell>
                                            {isSuperAdmin && (
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                                            {getStoreName(disc.storeId)?.[0] || '?'}
                                                        </div>
                                                        <span className="text-xs text-slate-600">{getStoreName(disc.storeId)}</span>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="font-semibold text-emerald-600">
                                                −{disc.discountValue} ₽
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={remaining > 0 ? 'success' : 'danger'}>
                                                    {remaining > 0 ? `${remaining} left` : 'Exhausted'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500">
                                                {disc.usedCount} / {disc.quantity}
                                            </TableCell>
                                            <TableCell>
                                                <button
                                                    onClick={() => toggleActive(disc)}
                                                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                                                        disc.active
                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {disc.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                    {disc.active ? 'Active' : 'Disabled'}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {!isSuperAdmin && (
                                                    <>
                                                        <Button size="sm" variant="outline" onClick={() => startEdit(disc)}>
                                                            Edit
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => deleteAdminDiscount(disc.id)}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Total Codes</p>
                        <p className="text-2xl font-bold">{discounts.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Active Codes</p>
                        <p className="text-2xl font-bold text-emerald-600">
                            {discounts.filter((d) => d.active && d.quantity - d.usedCount > 0).length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Total Redemptions</p>
                        <p className="text-2xl font-bold text-indigo-600">
                            {discounts.reduce((sum, d) => sum + d.usedCount, 0)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Discount Code' : 'Create Discount Code'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Discount Code</Label>
                            <Input
                                placeholder="e.g. SUMMER50"
                                value={form.code}
                                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
                                className="font-mono mt-1"
                            />
                            <p className="text-xs text-slate-400 mt-1">Unique code customers will enter at checkout.</p>
                        </div>
                        <div>
                            <Label>Discount Value (₽)</Label>
                            <Input
                                type="number"
                                min="1"
                                placeholder="e.g. 20"
                                value={form.discountValue}
                                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                                className="mt-1"
                            />
                            <p className="text-xs text-slate-400 mt-1">Fixed amount subtracted from the order total for your store's products.</p>
                        </div>
                        <div>
                            <Label>Quantity (max uses)</Label>
                            <Input
                                type="number"
                                min="1"
                                placeholder="e.g. 100"
                                value={form.quantity}
                                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                                className="mt-1"
                            />
                            <p className="text-xs text-slate-400 mt-1">How many times this code can be redeemed before it expires.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={save}>{editing ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
