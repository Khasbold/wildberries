import { useState, useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { Image, Trash2, Pencil, Plus, ArrowUp, ArrowDown, Loader2, Check, X, Clock, Store, Link2, MessageSquare } from 'lucide-react'
import { subscribe, getState, addBanner, updateBanner, deleteBanner, reorderBanners } from '../../modules/state/store.js'
import { useSession } from '../../modules/state/useSession.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/Dialog.jsx'
import { Label } from '../components/ui/Label.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { toast } from 'react-toastify'
import { uploadBannerImage, isOurStorageImageReference } from '../../firebase/storageUpload.js'

const statusColors = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-slate-100 text-slate-600',
    pending: 'bg-amber-100 text-amber-800',
    rejected: 'bg-red-100 text-red-800',
}

export default function BannerAdminPage() {
    const state = useSyncExternalStore(subscribe, getState)
    const { isSuperAdmin, session, tier } = useSession()
    const isGoldOwner = !isSuperAdmin && tier === 'gold'
    const today = new Date().toISOString().slice(0, 10)
    const toggleBanner = (state.banners || []).find((b) => b.id === '__home_banner_toggle__')
    const homeBannerEnabled = toggleBanner?.enabled !== false

    const allBanners = [...(state.banners || [])].sort((a, b) => {
        // Active banners first, then by order
        const aActive = a.status === 'active' && (!a.endDate || a.endDate >= today) ? 0 : 1
        const bActive = b.status === 'active' && (!b.endDate || b.endDate >= today) ? 0 : 1
        if (aActive !== bActive) return aActive - bActive
        return (a.order ?? 0) - (b.order ?? 0)
    })

    // Auto-check expired banners
    const banners = useMemo(() => {
        const expired = []
        const result = allBanners.map((b) => {
            if (b.id === '__home_banner_toggle__') return b
            if (b.status === 'active' && b.endDate && b.endDate < today) {
                expired.push(b.id)
                return { ...b, status: 'inactive' }
            }
            return b
        })
        // Schedule expired banner updates outside render
        if (expired.length > 0) {
            setTimeout(() => expired.forEach((id) => updateBanner(id, { status: 'inactive' })), 0)
        }
        return result
    }, [allBanners, today])

    // For gold tier owners, only show their own banners
    const visibleBanners = isGoldOwner
        ? banners.filter((b) => b.id !== '__home_banner_toggle__' && b.submittedBy === session?.storeId)
        : banners.filter((b) => b.id !== '__home_banner_toggle__')

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({ title: '', image: '', startDate: '', endDate: '', linkUrl: '' })
    const [imageUploading, setImageUploading] = useState(false)
    const [rejectModal, setRejectModal] = useState(null)
    const [rejectReason, setRejectReason] = useState('')

    function startCreate() {
        setEditingId(null)
        if (isGoldOwner) {
            const end = new Date()
            end.setDate(end.getDate() + 7)
            setForm({ title: '', image: '', startDate: today, endDate: end.toISOString().slice(0, 10), linkUrl: '' })
        } else {
            setForm({ title: '', image: '', startDate: today, endDate: '', linkUrl: '' })
        }
        setIsModalOpen(true)
    }

    function startEdit(banner) {
        setEditingId(banner.id)
        setForm({ title: banner.title, image: banner.image, startDate: banner.startDate || '', endDate: banner.endDate || '', linkUrl: banner.linkUrl || '' })
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setEditingId(null)
        setForm({ title: '', image: '', startDate: '', endDate: '', linkUrl: '' })
    }

    async function onPickImage(file) {
        if (!file) return
        setImageUploading(true)
        try {
            const url = await uploadBannerImage(file)
            setForm((f) => ({ ...f, image: url }))
        } catch (err) {
            console.error('Banner image upload failed:', err)
        } finally {
            setImageUploading(false)
        }
    }

    function submit(e) {
        e.preventDefault()
        const imageUrl = (form.image || '').trim()
        if (!imageUrl) {
            toast.error('Upload a banner image — it is saved to Cloud Storage, then the URL is stored in Firestore.')
            return
        }
        if (!isOurStorageImageReference(imageUrl)) {
            toast.error('Use file upload only. Banner images must be stored in your Firebase bucket.')
            return
        }
        if (editingId) {
            updateBanner(editingId, { title: form.title, image: imageUrl, startDate: form.startDate, endDate: form.endDate, linkUrl: form.linkUrl.trim() })
        } else {
            addBanner({
                title: form.title,
                image: imageUrl,
                startDate: form.startDate,
                endDate: form.endDate,
                linkUrl: form.linkUrl.trim(),
                status: isGoldOwner ? 'pending' : 'active',
                submittedBy: isGoldOwner ? session?.storeId : null,
                submittedByStore: isGoldOwner ? session?.storeName : null,
            })
        }
        closeModal()
    }

    function moveUp(index) {
        if (index <= 0) return
		const arr = [...banners.filter((b) => b.id !== '__home_banner_toggle__')]
        ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
        reorderBanners(arr)
    }

    function moveDown(index) {
		const arr = [...banners.filter((b) => b.id !== '__home_banner_toggle__')]
		if (index >= arr.length - 1) return
        ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
        reorderBanners(arr)
    }

    function approveBanner(id) {
        updateBanner(id, { status: 'active' })
    }

    function rejectBanner(id) {
        setRejectModal(id)
        setRejectReason('')
    }

    function confirmReject() {
        if (!rejectModal) return
        updateBanner(rejectModal, { status: 'rejected', rejectionReason: rejectReason.trim() || '' })
        setRejectModal(null)
        setRejectReason('')
    }

    function toggleHomeBannerSection() {
        if (toggleBanner) {
            updateBanner(toggleBanner.id, { enabled: !homeBannerEnabled, title: 'System Home Banner Toggle' })
            return
        }
        addBanner({
            id: '__home_banner_toggle__',
            title: 'System Home Banner Toggle',
            image: '',
            enabled: false,
            status: 'active',
            order: -1,
        })
    }

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">
                            {isGoldOwner ? 'My Banner Submissions' : 'Banner Management'}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {isSuperAdmin && (
                                <Button size="sm" variant={homeBannerEnabled ? 'default' : 'outline'} onClick={toggleHomeBannerSection}>
                                    {homeBannerEnabled ? 'Disable Home Banner Section' : 'Enable Home Banner Section'}
                                </Button>
                            )}
                            <Button size="sm" onClick={startCreate}>
                                <Plus size={14} className="mr-1" /> {isGoldOwner ? 'Submit Banner' : 'Add Banner'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Order</TableHead>
                                    <TableHead>Preview</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Link</TableHead>
                                    <TableHead>Start</TableHead>
                                    <TableHead>End</TableHead>
                                    <TableHead>Status</TableHead>
                                    {isSuperAdmin && <TableHead>Submitted By</TableHead>}
                                    {isSuperAdmin && <TableHead className="w-24">Reorder</TableHead>}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleBanners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isSuperAdmin ? 9 : 7} className="h-24 text-center text-slate-400">
                                            {isGoldOwner ? 'No banner submissions yet. Submit a banner to be shown on the home page.' :
                                            'No banners yet. Click "Add Banner" to create your first commercial banner.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    visibleBanners.map((banner, idx) => {
                                        const isExpired = banner.endDate && banner.endDate < today
                                        const effectiveStatus = isExpired && banner.status === 'active' ? 'inactive' : (banner.status || 'active')
                                        return (
                                            <TableRow key={banner.id} className={isExpired ? 'opacity-60' : ''}>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono">{idx + 1}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {banner.image ? (
                                                        <img src={banner.image} alt={banner.title || 'Banner'} className="h-16 w-40 object-cover rounded-lg border" />
                                                    ) : (
                                                        <div className="h-16 w-40 rounded-lg border bg-slate-100 flex items-center justify-center text-slate-400">
                                                            <Image size={20} />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {banner.title || <span className="text-slate-400 italic">No title</span>}
                                                    {banner.status === 'rejected' && banner.rejectionReason && (
                                                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><MessageSquare size={10} /> {banner.rejectionReason}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {banner.linkUrl ? (
                                                        <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 max-w-[120px] truncate"><Link2 size={10} />{banner.linkUrl.replace(/^https?:\/\//, '').slice(0, 20)}</a>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600">{banner.startDate || '—'}</TableCell>
                                                <TableCell className="text-xs text-slate-600">{banner.endDate || 'No end'}</TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[effectiveStatus] || statusColors.active}>
                                                        {effectiveStatus === 'active' && <Check size={10} className="mr-1" />}
                                                        {effectiveStatus === 'pending' && <Clock size={10} className="mr-1" />}
                                                        {effectiveStatus === 'rejected' && <X size={10} className="mr-1" />}
                                                        {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
                                                    </Badge>
                                                </TableCell>
                                                {isSuperAdmin && (
                                                    <TableCell>
                                                        {banner.submittedByStore ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Store size={12} className="text-slate-400" />
                                                                <span className="text-xs text-slate-600">{banner.submittedByStore}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">SuperAdmin</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {isSuperAdmin && (
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Button size="sm" variant="ghost" disabled={idx === 0} onClick={() => moveUp(idx)}>
                                                                <ArrowUp size={14} />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" disabled={idx === banners.length - 1} onClick={() => moveDown(idx)}>
                                                                <ArrowDown size={14} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-right space-x-1">
                                                    {isSuperAdmin && banner.status === 'pending' && (
                                                        <>
                                                            <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approveBanner(banner.id)}>
                                                                <Check size={14} className="mr-1" /> Approve
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => rejectBanner(banner.id)}>
                                                                <X size={14} className="mr-1" /> Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {(isSuperAdmin || (isGoldOwner && banner.status === 'pending')) && (
                                                        <Button size="sm" variant="outline" onClick={() => startEdit(banner)}>
                                                            <Pencil size={14} className="mr-1" /> Edit
                                                        </Button>
                                                    )}
                                                    {isSuperAdmin && (
                                                        <Button size="sm" variant="destructive" onClick={() => deleteBanner(banner.id)}>
                                                            <Trash2 size={14} className="mr-1" /> Delete
                                                        </Button>
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

                {/* Live preview */}
                {banners.filter((b) => b.id !== '__home_banner_toggle__' && b.status === 'active').length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Live Preview (Active Banners)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {banners.filter((b) => b.id !== '__home_banner_toggle__' && b.status === 'active' && (!b.endDate || b.endDate >= today)).map((b, i) => (
                                    <div key={b.id} className="shrink-0 relative">
                                        <img src={b.image} alt={b.title || `Banner ${i + 1}`} className="h-32 w-64 object-cover rounded-lg border" />
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
                        <DialogTitle>{editingId ? 'Edit Banner' : isGoldOwner ? 'Submit Banner for Approval' : 'Add Banner'}</DialogTitle>
                        <DialogDescription>
                            {isGoldOwner
                                ? 'Submit a banner image. It will be reviewed by SuperAdmin before going live. Duration is limited to 7 days.'
                                : editingId ? 'Update the banner image or title.' : 'Upload an image for the commercial banner carousel.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title (optional)</Label>
                            <Input placeholder="Sale, Promo, New Arrivals…" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Link URL (optional)</Label>
                            <Input placeholder="https://example.com/product" value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} />
                            <p className="text-[10px] text-slate-400">Banner дарахад шилжих холбоос. Хоосон үлдээвэл холбоосгүй.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} readOnly={isGoldOwner} />
                                {isGoldOwner && <p className="text-[10px] text-slate-400">Fixed to 7 days for Gold tier</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Upload banner image</Label>
                            <Input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
                            {imageUploading && <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading to Cloud Storage…</p>}
                            <p className="text-[11px] text-slate-400">File is uploaded to Firebase Storage; Firestore stores the download URL only.</p>
                        </div>
                        {form.image && (
                            <div className="rounded-lg border overflow-hidden">
                                <img src={form.image} alt="Preview" className="w-full h-40 object-cover" />
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                            <Button type="submit" disabled={!form.image}>
                                {isGoldOwner ? 'Submit for Review' : editingId ? 'Update Banner' : 'Add Banner'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Rejection reason dialog */}
            <Dialog open={!!rejectModal} onOpenChange={(open) => { if (!open) { setRejectModal(null); setRejectReason('') } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Татгалзах шалтгаан</DialogTitle>
                        <DialogDescription>Banner-ийг татгалзах шалтгаанаа бичнэ үү (заавал биш).</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="Шалтгаан бичих..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setRejectModal(null); setRejectReason('') }}>Болих</Button>
                        <Button variant="destructive" onClick={confirmReject}>
                            <X size={14} className="mr-1" /> Татгалзах
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
