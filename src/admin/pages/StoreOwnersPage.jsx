import { useMemo, useState } from 'react'
import { useSession } from '../../modules/state/useSession.js'
import { createAdminUser, updateAdminUser, deleteAdminUser, resetAdminUsers } from '../../modules/state/store.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/Dialog.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Label } from '../components/ui/Label.jsx'

const initialForm = {
    name: '',
    username: '',
    password: '',
    storeName: '',
}

export default function StoreOwnersPage() {
    const { adminUsers } = useSession()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(initialForm)
    const [query, setQuery] = useState('')

    const owners = useMemo(() => {
        const list = adminUsers.filter((u) => u.role === 'admin')
        const q = query.trim().toLowerCase()
        if (!q) return list
        return list.filter((u) =>
            u.name.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            (u.storeName || '').toLowerCase().includes(q)
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
            password: user.password,
            storeName: user.storeName || '',
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
        if (editingId) {
            updateAdminUser(editingId, {
                name: form.name,
                username: form.username,
                password: form.password,
                storeName: form.storeName,
            })
        } else {
            createAdminUser({
                name: form.name,
                username: form.username,
                password: form.password,
                storeName: form.storeName,
            })
        }
        closeModal()
    }

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Store Owners</CardTitle>
                        <div className="flex items-center gap-2">
                            <Input className="w-64" placeholder="Search owners…" value={query} onChange={(e) => setQuery(e.target.value)} />
                            <Button variant="outline" size="sm" onClick={resetAdminUsers}>Reset demo</Button>
                            <Button size="sm" onClick={startCreate}>Add Store Owner</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Store Name</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Password</TableHead>
                                    <TableHead>Store ID</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {owners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-400">No store owners found.</TableCell>
                                    </TableRow>
                                ) : (
                                    owners.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                                        {user.storeName?.[0] || 'S'}
                                                    </div>
                                                    {user.storeName}
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell className="text-slate-500 font-mono">{user.username}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">{user.password}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-400 font-mono">{user.storeId}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => startEdit(user)}>Edit</Button>
                                                <Button size="sm" variant="destructive" onClick={() => deleteAdminUser(user.id)}>Delete</Button>
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
                            {editingId ? 'Update the store owner details.' : 'Create a new store owner with their own store and admin dashboard.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Store Name</Label>
                            <Input
                                placeholder="My Fashion Store"
                                value={form.storeName}
                                onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Owner Name</Label>
                            <Input
                                placeholder="John Doe"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Username</Label>
                            <Input
                                placeholder="storeowner1"
                                value={form.username}
                                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                placeholder="Password"
                                value={form.password}
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                            <Button type="submit">{editingId ? 'Update' : 'Create Store Owner'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
