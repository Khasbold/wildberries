import { useState } from 'react'
import { useSyncExternalStore } from 'react'
import { Image, Trash2, Pencil, Plus, ArrowUp, ArrowDown } from 'lucide-react'
import { subscribe, getState, addBanner, updateBanner, deleteBanner, reorderBanners } from '../../modules/state/store.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/Dialog.jsx'
import { Label } from '../components/ui/Label.jsx'
import { Badge } from '../components/ui/Badge.jsx'

export default function BannerAdminPage() {
    const state = useSyncExternalStore(subscribe, getState)
    const banners = [...(state.banners || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({ title: '', image: '' })

    function startCreate() {
        setEditingId(null)
        setForm({ title: '', image: '' })
        setIsModalOpen(true)
    }

    function startEdit(banner) {
        setEditingId(banner.id)
        setForm({ title: banner.title, image: banner.image })
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setEditingId(null)
        setForm({ title: '', image: '' })
    }

    function onPickImage(file) {
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            setForm((f) => ({ ...f, image: String(reader.result || '') }))
        }
        reader.readAsDataURL(file)
    }

    function submit(e) {
        e.preventDefault()
        if (!form.image) return
        if (editingId) {
            updateBanner(editingId, { title: form.title, image: form.image })
        } else {
            addBanner({ title: form.title, image: form.image })
        }
        closeModal()
    }

    function moveUp(index) {
        if (index <= 0) return
        const arr = [...banners]
        ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
        reorderBanners(arr)
    }

    function moveDown(index) {
        if (index >= banners.length - 1) return
        const arr = [...banners]
        ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
        reorderBanners(arr)
    }

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Banner Management</CardTitle>
                        <Button size="sm" onClick={startCreate}>
                            <Plus size={14} className="mr-1" /> Add Banner
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Order</TableHead>
                                    <TableHead>Preview</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="w-24">Reorder</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {banners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-400">
                                            No banners yet. Click "Add Banner" to create your first commercial banner.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    banners.map((banner, idx) => (
                                        <TableRow key={banner.id}>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">{idx + 1}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {banner.image ? (
                                                    <img
                                                        src={banner.image}
                                                        alt={banner.title || 'Banner'}
                                                        className="h-16 w-40 object-cover rounded-lg border"
                                                    />
                                                ) : (
                                                    <div className="h-16 w-40 rounded-lg border bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <Image size={20} />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {banner.title || <span className="text-slate-400 italic">No title</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={idx === 0}
                                                        onClick={() => moveUp(idx)}
                                                    >
                                                        <ArrowUp size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={idx === banners.length - 1}
                                                        onClick={() => moveDown(idx)}
                                                    >
                                                        <ArrowDown size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button size="sm" variant="outline" onClick={() => startEdit(banner)}>
                                                    <Pencil size={14} className="mr-1" /> Edit
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => deleteBanner(banner.id)}>
                                                    <Trash2 size={14} className="mr-1" /> Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Live preview */}
                {banners.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Live Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {banners.map((b, i) => (
                                    <div key={b.id} className="shrink-0 relative">
                                        <img
                                            src={b.image}
                                            alt={b.title || `Banner ${i + 1}`}
                                            className="h-32 w-64 object-cover rounded-lg border"
                                        />
                                        {b.title && (
                                            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                                                {b.title}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
                        <DialogDescription>
                            {editingId ? 'Update the banner image or title.' : 'Upload an image for the commercial banner carousel.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title (optional)</Label>
                            <Input
                                placeholder="Sale, Promo, New Arrivals…"
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Image URL</Label>
                            <Input
                                placeholder="https://example.com/banner.jpg"
                                value={form.image}
                                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Or upload image</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => onPickImage(e.target.files?.[0])}
                            />
                        </div>
                        {form.image && (
                            <div className="rounded-lg border overflow-hidden">
                                <img src={form.image} alt="Preview" className="w-full h-40 object-cover" />
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                            <Button type="submit" disabled={!form.image}>
                                {editingId ? 'Update Banner' : 'Add Banner'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
