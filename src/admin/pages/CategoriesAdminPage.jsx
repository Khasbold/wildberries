import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'

const initialForm = {
    name: '',
    nameMn: '',
    slug: '',
    description: '',
    parentId: '',
}

export default function CategoriesAdminPage() {
    const { categories, upsertAdminCategory, deleteAdminCategory, resetAdminCategories } = useAdmin()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [query, setQuery] = useState('')
    const [form, setForm] = useState(initialForm)

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return categories
        return categories.filter((item) => (
            item.name.toLowerCase().includes(q)
            || item.slug.toLowerCase().includes(q)
            || (item.description || '').toLowerCase().includes(q)
            || (item.nameMn || '').toLowerCase().includes(q)
        ))
    }, [categories, query])

    // Build sorted order: parents first, then their children grouped under them
    const sortedVisible = useMemo(() => {
        const parents = categories.filter((c) => !c.parentId)
        const order = []
        for (const p of parents) {
            order.push(p.id)
            const children = categories
                .filter((c) => c.parentId === p.id)
                .sort((a, b) => (a.nameMn || a.name).localeCompare(b.nameMn || b.name))
            children.forEach((c) => order.push(c.id))
        }
        // Append orphans (children whose parent is not in list)
        const inOrder = new Set(order)
        categories.filter((c) => !inOrder.has(c.id)).forEach((c) => order.push(c.id))

        return [...visible].sort((a, b) => {
            const ai = order.indexOf(a.id)
            const bi = order.indexOf(b.id)
            if (ai === -1 && bi === -1) return 0
            if (ai === -1) return 1
            if (bi === -1) return -1
            return ai - bi
        })
    }, [visible, categories])

    function startEdit(category) {
        setEditingId(category.id)
        setForm({
            name: category.name,
            nameMn: category.nameMn || '',
            slug: category.slug,
            description: category.description || '',
            parentId: category.parentId || '',
        })
        setIsModalOpen(true)
    }

    function clearForm() {
        setEditingId(null)
        setForm(initialForm)
    }

    function startCreate() {
        clearForm()
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        clearForm()
    }

    function submit(e) {
        e.preventDefault()
        const name = form.name.trim()
        if (!name) return
        upsertAdminCategory({
            id: editingId || undefined,
            name,
            nameMn: form.nameMn.trim(),
            slug: form.slug.trim() || name.toLowerCase().replace(/\s+/g, '-'),
            description: form.description.trim(),
            parentId: form.parentId || null,
        })
        toast.success(editingId ? `"${name}" updated` : `"${name}" created`, { position: 'top-right', autoClose: 2500 })
        closeModal()
    }

    // Top-level categories for the parent selector
    const parentOptions = useMemo(() => categories.filter((c) => !c.parentId), [categories])

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Categories List</CardTitle>
                        <div className="flex items-center gap-2">
                            <Input className="w-64" placeholder="Search categories" value={query} onChange={(e) => setQuery(e.target.value)} />
                            <Button size="sm" onClick={startCreate}>Add Category</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedVisible.map((cat) => {
                                    const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null
                                    const isChild = !!cat.parentId
                                    return (
                                        <TableRow
                                            key={cat.id}
                                            className={isChild ? 'pl-6 border-l-2 border-slate-200 bg-slate-50/40' : ''}
                                        >
                                            <TableCell className="font-medium">
                                                {parent && (
                                                    <span className="text-[10px] text-slate-500 bg-slate-100 rounded px-1 mr-1">
                                                        {parent.nameMn || parent.name}
                                                    </span>
                                                )}
                                                <span className="font-bold">{cat.nameMn || cat.name}</span>
                                                <br />
                                                <span className="text-xs text-slate-400 font-normal">{cat.name}</span>
                                            </TableCell>
                                            <TableCell>{cat.slug}</TableCell>
                                            <TableCell>{cat.description || '-'}</TableCell>
                                            <TableCell className="space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => startEdit(cat)}>Edit</Button>
                                                <Button size="sm" variant="destructive" onClick={() => {
                                                    if (window.confirm(`Delete category "${cat.name}"? Products using this category will be moved to "Accessories".`)) {
                                                        deleteAdminCategory(cat.id)
                                                        toast.success(`"${cat.name}" deleted`, { position: 'top-right', autoClose: 2500 })
                                                    }
                                                }}>Delete</Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit category' : 'Create category'}</DialogTitle>
                    </DialogHeader>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4" onSubmit={submit}>
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Category name (English)</Label>
                            <Input id="cat-name" placeholder="Category name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-name-mn">Монгол нэр</Label>
                            <Input id="cat-name-mn" placeholder="Ангилалын монгол нэр" value={form.nameMn} onChange={(e) => setForm((f) => ({ ...f, nameMn: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-slug">Slug</Label>
                            <Input id="cat-slug" placeholder="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-parent">Эцэг категори (хэрэв дэд категори бол)</Label>
                            <select
                                id="cat-parent"
                                value={form.parentId}
                                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                <option value="">— Үндсэн категори (дэд биш) —</option>
                                {parentOptions.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nameMn || c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="cat-desc">Description</Label>
                            <Input id="cat-desc" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                        </div>
                        <DialogFooter className="md:col-span-2">
                            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                            <Button type="submit">{editingId ? 'Update category' : 'Create category'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
