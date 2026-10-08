import { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Phone, User, Clock, RefreshCw } from 'lucide-react'
import { toast } from 'react-toastify'
import { getFeedbacks, deleteFeedbackDb } from '../../firebase/db.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from '../components/ui/Table.jsx'

export default function FeedbacksAdminPage() {
    const [feedbacks, setFeedbacks] = useState([])
    const [loading, setLoading] = useState(true)

    async function load() {
        setLoading(true)
        try {
            const data = await getFeedbacks()
            setFeedbacks(data)
        } catch (err) {
            console.error('Load feedbacks error:', err)
            toast.error('Санал хүсэлт ачаалахад алдаа гарлаа')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    async function handleDelete(id) {
        try {
            await deleteFeedbackDb(id)
            setFeedbacks((prev) => prev.filter((f) => f.id !== id))
            toast.success('Устгагдлаа')
        } catch (err) {
            console.error('Delete feedback error:', err)
            toast.error('Устгахад алдаа гарлаа')
        }
    }

    function formatDate(val) {
        if (!val) return '-'
        const d = val?.toDate ? val.toDate() : new Date(val?.seconds ? val.seconds * 1000 : val)
        const now = new Date()
        const diffMs = now - d
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return 'Саяхан'
        if (diffMins < 60) return `${diffMins} мин`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours} цаг`
        return d.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const newCount = feedbacks.filter((f) => f.status === 'new').length

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                            <MessageSquare size={20} className="text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base sm:text-lg">Санал хүсэлт</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">Хэрэглэгчдээс ирсэн санал хүсэлт</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {newCount > 0 && (
                            <Badge className="bg-amber-100 text-amber-800">
                                {newCount} шинэ
                            </Badge>
                        )}
                        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                            <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Шинэчлэх
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-x-auto">
                    {feedbacks.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 px-4">
                            <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
                            <p className="text-sm font-medium">Санал хүсэлт байхгүй</p>
                            <p className="text-xs mt-1">Хэрэглэгчдийн санал хүсэлт энд харагдана</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile card view */}
                            <div className="sm:hidden space-y-3 p-4">
                                {feedbacks.map((fb) => (
                                    <div key={fb.id} className={`rounded-xl border p-4 space-y-2 ${fb.status === 'new' ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1 flex-1 min-w-0">
                                                {fb.name && (
                                                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                                        <User size={14} className="text-slate-400 shrink-0" />
                                                        {fb.name}
                                                    </p>
                                                )}
                                                {fb.phone && (
                                                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                        <Phone size={12} className="text-slate-400 shrink-0" />
                                                        {fb.phone}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {fb.status === 'new' && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Шинэ</Badge>}
                                                <button onClick={() => handleDelete(fb.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed">{fb.description}</p>
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatDate(fb.createdAt)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop table view */}
                            <div className="hidden sm:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40px]"></TableHead>
                                            <TableHead>Нэр</TableHead>
                                            <TableHead>Утас</TableHead>
                                            <TableHead className="min-w-[250px]">Санал хүсэлт</TableHead>
                                            <TableHead>Огноо</TableHead>
                                            <TableHead>Төлөв</TableHead>
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {feedbacks.map((fb) => (
                                            <TableRow key={fb.id} className={fb.status === 'new' ? 'bg-amber-50/50' : ''}>
                                                <TableCell>
                                                    <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                                        <MessageSquare size={14} className="text-amber-600" />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-slate-900">{fb.name || '-'}</span>
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm">
                                                    {fb.phone || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm text-slate-700 line-clamp-3 leading-relaxed">{fb.description}</p>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                                    {formatDate(fb.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    {fb.status === 'new'
                                                        ? <Badge className="bg-amber-100 text-amber-800">Шинэ</Badge>
                                                        : <Badge variant="outline">Уншсан</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600" onClick={() => handleDelete(fb.id)}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
