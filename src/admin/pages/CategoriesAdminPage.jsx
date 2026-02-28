import { useMemo, useState } from 'react'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'

const initialForm = {
    name: '',
    slug: '',
    description: '',
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
            || item.description.toLowerCase().includes(q)
        ))
    }, [categories, query])

    function startEdit(category) {
        setEditingId(category.id)
        setForm({
            name: category.name,
            slug: category.slug,
            description: category.description || '',
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
            slug: form.slug.trim() || name.toLowerCase().replace(/\s+/g, '-'),
            description: form.description.trim(),
        })
        closeModal()
    }

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Categories List</CardTitle>
                        <div className="flex items-center gap-2">
                            <Input className="w-64" placeholder="Search categories" value={query} onChange={(e) => setQuery(e.target.value)} />
                            <Button variant="outline" size="sm" onClick={resetAdminCategories}>Reset mock categories</Button>
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
                                {visible.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell>{category.slug}</TableCell>
                                        <TableCell>{category.description || '-'}</TableCell>
                                        <TableCell className="space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => startEdit(category)}>Edit</Button>
                                            <Button size="sm" variant="destructive" onClick={() => deleteAdminCategory(category.id)}>Delete</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
                            <Label htmlFor="cat-name">Category name</Label>
                            <Input id="cat-name" placeholder="Category name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-slug">Slug</Label>
                            <Input id="cat-slug" placeholder="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
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
