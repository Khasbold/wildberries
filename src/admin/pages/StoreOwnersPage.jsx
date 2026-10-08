import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useSession } from '../../modules/state/useSession.js'
import { createAdminUser, updateAdminUser, deleteAdminUser, resetAdminUsers, TIER_PLANS } from '../../modules/state/store.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/Dialog.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Label } from '../components/ui/Label.jsx'
import { Textarea } from '../components/ui/Textarea.jsx'
import { ShieldBan, ShieldCheck } from 'lucide-react'

const initialForm = {
    name: '',
    username: '',
    loginEmail: '',
    storeName: '',
    tier: 'free',
    commission: '',
    tierStartDate: '',
    tierEndDate: '',
}

const tierVariant = {
    gold: 'gold',
    silver: 'silver',
    bronze: 'bronze',
    free: 'free',
}

export default function StoreOwnersPage() {
    const { adminUsers } = useSession()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(initialForm)
    const [query, setQuery] = useState('')
    const [banDialogUser, setBanDialogUser] = useState(null)
    const [banReason, setBanReason] = useState('')

    const owners = useMemo(() => {
        const list = adminUsers.filter((u) => u.role === 'admin')
        const q = query.trim().toLowerCase()
        if (!q) return list
        return list.filter((u) =>
            u.name.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            (u.storeName || '').toLowerCase().includes(q) ||
            (u.loginEmail || '').toLowerCase().includes(q)
        )
    }, [adminUsers, query])

    function startCreate() {
        setEditingId(null)
        setForm(initialForm)
        setIsModalOpen(true)
    }

    function startEdit(user) {
        setEditingId(user.id)
        setForm({
            name: user.name,
            username: user.username,
            loginEmail: user.loginEmail || '',
            storeName: user.storeName || '',
            tier: user.tier || 'free',
            commission: user.commission != null ? String(user.commission) : '',
            tierStartDate: user.tierStartDate || '',
            tierEndDate: user.tierEndDate || '',
        })
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setEditingId(null)
        setForm(initialForm)
    }

    function submit(e) {
        e.preventDefault()
        const payload = {
            name: form.name,
            username: form.username,
            loginEmail: form.loginEmail,
            storeName: form.storeName,
            tier: form.tier,
            tierStartDate: form.tierStartDate || undefined,
            tierEndDate: form.tierEndDate || undefined,
        }
        if (form.commission !== '') {
            payload.commission = Number(form.commission)
        }
        if (editingId) {
            updateAdminUser(editingId, payload)
            toast.success(`"${form.storeName}" updated`, { position: 'top-right', autoClose: 2500 })
        } else {
            createAdminUser(payload)
            toast.success(`"${form.storeName}" created`, { position: 'top-right', autoClose: 2500 })
        }
        closeModal()
    }

    function getEffectiveCommission(user) {
        if (user.commission != null) return user.commission
        const plan = TIER_PLANS[user.tier || 'free']
        return plan?.commission ?? 10
    }

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg">Store Owners</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <Input className="w-full sm:w-64" placeholder="Search owners…" value={query} onChange={(e) => setQuery(e.target.value)} />
                            <Button variant="outline" size="sm" onClick={() => {
                                if (window.confirm('Reset all store owners to demo defaults? This cannot be undone.')) {
                                    resetAdminUsers()
                                    toast.success('Store owners reset', { position: 'top-right', autoClose: 2500 })
                                }
                            }}>Reset demo</Button>
                            <Button size="sm" onClick={startCreate}>Add Store Owner</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Store Name</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Login email</TableHead>
                                    <TableHead>Tier</TableHead>
                                    <TableHead>Commission %</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {owners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-slate-400">No store owners found.</TableCell>
                                    </TableRow>
                                ) : (
                                    owners.map((user) => (
                                        <TableRow key={user.id} className={user.disabled ? 'opacity-60 bg-red-50/30' : ''}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                                        {user.storeName?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        {user.storeName}
                                                        {user.disabled && <Badge variant="destructive" className="ml-2 text-[9px]">Disabled</Badge>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell className="text-slate-500 font-mono">{user.username}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-600">{user.loginEmail || '—'}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={user.tier || 'free'}
                                                    onValueChange={(val) => updateAdminUser(user.id, { tier: val })}
                                                >
                                                    <SelectTrigger className="w-28 h-8">
                                                        <Badge variant={tierVariant[user.tier || 'free']}>
                                                            {TIER_PLANS[user.tier || 'free']?.name}
                                                        </Badge>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.values(TIER_PLANS).map((t) => (
                                                            <SelectItem key={t.id} value={t.id}>
                                                                <Badge variant={tierVariant[t.id]} className="text-[11px]">
                                                                    {t.name}
                                                                </Badge>
                                                                <span className="ml-2 text-xs text-muted-foreground">{t.maxProducts} products</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-sm font-semibold tabular-nums ${user.commission != null ? 'text-purple-700' : 'text-slate-600'}`}>
                                                        {getEffectiveCommission(user)}%
                                                    </span>
                                                    {user.commission != null && (
                                                        <span className="text-[9px] text-purple-500 font-medium">override</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">{user.tierStartDate || '—'}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{user.tierEndDate || '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button size="sm" variant="outline" onClick={() => startEdit(user)}>Edit</Button>
                                                    {user.disabled ? (
                                                        <Button size="sm" variant="outline" className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => {
                                                            updateAdminUser(user.id, { disabled: false, disabledReason: '' })
                                                            toast.success(`"${user.storeName}" has been re-enabled`, { position: 'top-right', autoClose: 2500 })
                                                        }}>
                                                            <ShieldCheck size={14} /> Enable
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="outline" className="gap-1 text-red-700 border-red-300 hover:bg-red-50" onClick={() => {
                                                            setBanDialogUser(user)
                                                            setBanReason('')
                                                        }}>
                                                            <ShieldBan size={14} /> Disable
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="destructive" onClick={() => {
                                                        if (window.confirm(`Delete store owner "${user.storeName}"? This cannot be undone.`)) {
                                                            deleteAdminUser(user.id)
                                                            toast.success(`"${user.storeName}" deleted`, { position: 'top-right', autoClose: 2500 })
                                                        }
                                                    }}>Delete</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Store Owner' : 'Create Store Owner'}</DialogTitle>
                        <DialogDescription>
                            {editingId ? 'Update the store owner details, tier, and commission.' : 'Create a new store owner with their own store and admin dashboard.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Store Name</Label>
                            <Input placeholder="My Fashion Store" value={form.storeName} onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Owner Name</Label>
                            <Input placeholder="John Doe" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Username</Label>
                            <Input placeholder="storeowner1" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Login email</Label>
                            <Input type="email" placeholder="owner@yourdomain.com" value={form.loginEmail} onChange={(e) => setForm((f) => ({ ...f, loginEmail: e.target.value }))} required />
                            <p className="text-xs text-muted-foreground">Must match a Firebase Authentication user email.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Tier</Label>
                                <Select value={form.tier} onValueChange={(val) => setForm((f) => ({ ...f, tier: val }))}>
                                    <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.values(TIER_PLANS).map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name} — {t.maxProducts} products</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Commission % Override</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    placeholder={`Default: ${TIER_PLANS[form.tier]?.commission || 10}%`}
                                    value={form.commission}
                                    onChange={(e) => setForm((f) => ({ ...f, commission: e.target.value }))}
                                />
                                <p className="text-[10px] text-muted-foreground">Leave empty for default tier rate ({TIER_PLANS[form.tier]?.commission || 10}%)</p>
                            </div>
                        </div>
                        {editingId && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Tier Start Date</Label>
                                    <Input type="date" value={form.tierStartDate} onChange={(e) => setForm((f) => ({ ...f, tierStartDate: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tier End Date</Label>
                                    <Input type="date" value={form.tierEndDate} onChange={(e) => setForm((f) => ({ ...f, tierEndDate: e.target.value }))} />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                            <Button type="submit">{editingId ? 'Update' : 'Create Store Owner'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Disable/Ban Dialog */}
            <Dialog open={!!banDialogUser} onOpenChange={(open) => { if (!open) setBanDialogUser(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <ShieldBan size={18} />
                            Disable Store: {banDialogUser?.storeName}
                        </DialogTitle>
                        <DialogDescription>
                            This will prevent the store owner from logging in and hide their store from the client-side shop. They will see your reason when trying to sign in.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label>Reason / Message (shown to the store owner on login)</Label>
                            <Textarea
                                placeholder="e.g. Policy violation: selling prohibited items. Contact support@bunny.mn for appeals."
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setBanDialogUser(null)}>Cancel</Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => {
                                updateAdminUser(banDialogUser.id, {
                                    disabled: true,
                                    disabledReason: banReason || 'Your store has been disabled by the administrator.',
                                })
                                toast.success(`"${banDialogUser.storeName}" has been disabled`, { position: 'top-right', autoClose: 2500 })
                                setBanDialogUser(null)
                            }}
                        >
                            <ShieldBan size={14} /> Disable Store
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
