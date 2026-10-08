import { useState, useEffect, useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { Bell, Trash2, Plus, Send, AlertCircle, Clock, Megaphone, RefreshCw, Users, Smartphone } from 'lucide-react'
import {
    subscribe,
    getState,
    addNotification,
    deleteNotification,
    clearAllNotifications,
} from '../../modules/state/store.js'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../../firebase/init.js'
import { requestNotificationPermission, saveTokenLocally, getStoredTokens } from '../../firebase/notificationService.js'
import { getAllCustomerTokens } from '../../firebase/db.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Textarea } from '../components/ui/Textarea.jsx'
import { Label } from '../components/ui/Label.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '../components/ui/Dialog.jsx'
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from '../components/ui/Table.jsx'

/** Group token rows by userId */
function groupByUser(rows) {
    const map = new Map()
    for (const r of rows) {
        if (!r.userId || !r.token) continue
        if (!map.has(r.userId)) {
            map.set(r.userId, { userId: r.userId, displayName: r.displayName || r.email || 'Anonymous', email: r.email || '', tokens: [] })
        }
        map.get(r.userId).tokens.push(r.token)
    }
    return [...map.values()]
}

export default function NotificationsAdminPage() {
    const state = useSyncExternalStore(subscribe, getState)
    const notifications = state.notifications || []

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState({ title: '', body: '' })
    const [selectedUserIds, setSelectedUserIds] = useState(new Set())
    const [sending, setSending] = useState(false)
    const [feedback, setFeedback] = useState(null)
    const [tokenRows, setTokenRows] = useState([])
    const [loadingTokens, setLoadingTokens] = useState(true)

    const usersWithTokens = useMemo(() => groupByUser(tokenRows), [tokenRows])
    const allTokens = useMemo(() => tokenRows.flatMap((r) => r.token ? [r.token] : []), [tokenRows])

    async function loadTokens() {
        setLoadingTokens(true)
        let rows = []
        try {
            // Try Cloud Function first (works even without Firestore rules)
            try {
                const functions = getFunctions(app)
                const getTokens = httpsCallable(functions, 'getCustomerTokens')
                const result = await getTokens()
                rows = result?.data || []
                console.log('[Notifications] Cloud Function returned', rows.length, 'token rows')
            } catch (fnErr) {
                console.warn('[Notifications] Cloud Function failed, using Firestore fallback:', fnErr.message)
                // Fallback: direct Firestore read (rules now allow authenticated read)
                rows = await getAllCustomerTokens()
                console.log('[Notifications] Firestore fallback returned', rows.length, 'token rows')
            }
            // Last resort: include local tokens from this browser
            const localTokens = getStoredTokens()
            if (rows.length === 0 && localTokens.length > 0) {
                localTokens.forEach((token) => {
                    rows.push({
                        userId: 'local-device',
                        token,
                        email: 'local@device',
                        displayName: 'This device (local)',
                    })
                })
            }
            setTokenRows(rows)
        } catch (err) {
            console.error('[Notifications] Failed to load tokens:', err)
            const localTokens = getStoredTokens()
            rows = localTokens.map((token) => ({
                userId: 'local-device',
                token,
                email: 'local@device',
                displayName: 'This device (local)',
            }))
            setTokenRows(rows)
        } finally {
            setLoadingTokens(false)
        }
    }

    useEffect(() => { loadTokens() }, [])

    function openCreate() {
        setForm({ title: '', body: '' })
        setSelectedUserIds(new Set(usersWithTokens.map((u) => u.userId)))
        setFeedback(null)
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setForm({ title: '', body: '' })
        setFeedback(null)
    }

    function toggleUser(userId) {
        setSelectedUserIds((prev) => {
            const next = new Set(prev)
            if (next.has(userId)) next.delete(userId)
            else next.add(userId)
            return next
        })
    }

    function toggleAll() {
        if (selectedUserIds.size === usersWithTokens.length) {
            setSelectedUserIds(new Set())
        } else {
            setSelectedUserIds(new Set(usersWithTokens.map((u) => u.userId)))
        }
    }

    function getTokensToSend() {
        if (selectedUserIds.size === 0) return []
        return usersWithTokens
            .filter((u) => selectedUserIds.has(u.userId))
            .flatMap((u) => u.tokens)
    }

    async function handleSend(e) {
        e.preventDefault()
        if (!form.title.trim() || !form.body.trim()) return

        setSending(true)
        setFeedback(null)

        try {
            addNotification({ title: form.title.trim(), body: form.body.trim() })
            const tokensToSend = getTokensToSend()
            const tokens = tokensToSend.length > 0 ? tokensToSend : allTokens.length > 0 ? allTokens : getStoredTokens()

            if (tokens.length > 0) {
                try {
                    const functions = getFunctions(app)
                    const sendPush = httpsCallable(functions, 'sendPushNotification')
                    const result = await sendPush({ title: form.title.trim(), body: form.body.trim(), tokens })
                    const data = result?.data || {}
                    if (data.success && data.sent > 0) {
                        setFeedback({ type: 'success', message: `Push sent to ${data.sent} device${data.sent !== 1 ? 's' : ''}!` })
                        closeModal()
                    } else {
                        throw new Error(data.message || 'No devices reached')
                    }
                } catch (fnErr) {
                    if (Notification.permission === 'granted') {
                        const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
                        if (reg) {
                            await reg.showNotification(form.title.trim(), { body: form.body.trim(), icon: '/favicon.ico', badge: '/favicon.ico' })
                        }
                    }
                    setFeedback({
                        type: 'warning',
                        message: fnErr?.message?.includes('not found') || fnErr?.code === 'functions/unavailable'
                            ? 'Notification saved. Deploy Cloud Function: firebase deploy --only functions'
                            : `Saved. (${tokens.length} device${tokens.length !== 1 ? 's' : ''} – Cloud Function not deployed)`,
                    })
                }
            } else {
                setFeedback({ type: 'warning', message: 'No devices selected. Select users or subscribe a device.' })
            }
        } catch (err) {
            console.error('Send notification error:', err)
            setFeedback({ type: 'error', message: 'Failed to send. Check console.' })
        } finally {
            setSending(false)
        }
    }

    async function handleTestSubscribe() {
        const token = await requestNotificationPermission()
        if (token) {
            saveTokenLocally(token)
            try {
                const { saveUserFcmToken } = await import('../../firebase/authService.js')
                await saveUserFcmToken('admin-test-device', token, { email: 'admin@test', displayName: 'Admin Test' })
                await loadTokens()
            } catch {}
            setFeedback({ type: 'success', message: 'This device subscribed! Token saved to Firestore.' })
        } else {
            setFeedback({ type: 'error', message: 'Permission denied or unsupported.' })
        }
    }

    function formatDate(iso) {
        const d = new Date(iso)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const totalDevices = allTokens.length

    return (
        <>
            <div className="space-y-4 sm:space-y-6">
                {/* Header */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                                <Megaphone size={20} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <CardTitle className="text-base sm:text-lg">Push Notifications (FCM)</CardTitle>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">Send to authenticated users · tokens from Firestore</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">
                                <Smartphone size={12} className="mr-1" />
                                {totalDevices} device{totalDevices !== 1 ? 's' : ''}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={loadTokens} disabled={loadingTokens} className="shrink-0">
                                <RefreshCw size={14} className={`mr-1 ${loadingTokens ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleTestSubscribe} className="shrink-0">
                                <Bell size={14} className="mr-1" />
                                Subscribe Device
                            </Button>
                            <Button size="sm" onClick={openCreate} className="shrink-0">
                                <Plus size={14} className="mr-1" /> New
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {feedback && (
                    <div className={`flex items-start gap-2 rounded-xl border p-3 sm:p-4 text-sm ${
                        feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                        feedback.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                        'bg-red-50 border-red-200 text-red-800'
                    }`}>
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <span>{feedback.message}</span>
                    </div>
                )}

                {/* Active customers / devices table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users size={18} className="text-violet-600" />
                            Active Customers & Devices
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Users who signed in and enabled notifications. Select who receives each push.
                        </p>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-x-auto">
                        {usersWithTokens.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 px-4">
                                <Users size={32} className="mx-auto mb-3 opacity-40" />
                                <p className="text-sm font-medium">No subscribed users yet</p>
                                <p className="text-xs mt-1">Users must sign in and allow notifications</p>
                                <Button size="sm" variant="outline" className="mt-4" onClick={handleTestSubscribe}>
                                    Subscribe This Device for Testing
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40px]"></TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                                        <TableHead className="text-center">Devices</TableHead>
                                        <TableHead className="hidden md:table-cell text-right">User ID</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usersWithTokens.map((u) => (
                                        <TableRow key={u.userId}>
                                            <TableCell>
                                                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-sm">
                                                    {(u.displayName || '?')[0]}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium text-slate-900 truncate block max-w-[140px] sm:max-w-none">
                                                    {u.displayName || 'Anonymous'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-slate-500 text-sm truncate max-w-[160px]">
                                                {u.email || '—'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-xs">{u.tokens.length}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-right text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                                                {u.userId?.slice(0, 12)}…
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Notification History */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-base">History</CardTitle>
                        {notifications.length > 0 && (
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 w-fit" onClick={clearAllNotifications}>
                                <Trash2 size={14} className="mr-1" /> Clear All
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-x-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 px-4">
                                <Bell size={32} className="mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No notifications sent yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[120px]">Title</TableHead>
                                            <TableHead className="min-w-[180px]">Message</TableHead>
                                            <TableHead className="w-[120px]">Sent</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {notifications.map((n) => (
                                            <TableRow key={n.id}>
                                                <TableCell className="font-medium">{n.title}</TableCell>
                                                <TableCell className="text-slate-600 text-sm line-clamp-2">{n.body}</TableCell>
                                                <TableCell className="text-xs text-slate-500"><Clock size={12} className="inline mr-1" />{formatDate(n.createdAt)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Send Notification Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send size={20} className="text-violet-600" />
                            Send Push Notification
                        </DialogTitle>
                        <DialogDescription>
                            Choose recipients and compose your message.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Recipients</Label>
                            {usersWithTokens.length === 0 ? (
                                <p className="text-sm text-slate-500 py-2">No users. Subscribe a device first.</p>
                            ) : (
                                <div className="rounded-xl border border-slate-200 p-3 max-h-40 overflow-y-auto space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2">
                                        <input type="checkbox" checked={selectedUserIds.size === usersWithTokens.length} onChange={toggleAll} className="rounded border-slate-300" />
                                        <span className="text-sm font-medium">Select all ({usersWithTokens.length} users, {allTokens.length} devices)</span>
                                    </label>
                                    {usersWithTokens.map((u) => (
                                        <label key={u.userId} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2">
                                            <input type="checkbox" checked={selectedUserIds.has(u.userId)} onChange={() => toggleUser(u.userId)} className="rounded border-slate-300" />
                                            <span className="text-sm truncate flex-1">{u.displayName || u.email || u.userId}</span>
                                            <Badge variant="outline" className="text-[10px] shrink-0">{u.tokens.length}</Badge>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notif-title">Title</Label>
                            <Input id="notif-title" placeholder="e.g. New sale!" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={100} required />
                            <p className="text-[11px] text-slate-400 text-right">{form.title.length}/100</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notif-body">Message</Label>
                            <Textarea id="notif-body" placeholder="Your message..." value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={3} maxLength={500} required />
                            <p className="text-[11px] text-slate-400 text-right">{form.body.length}/500</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Preview</p>
                            <div className="flex gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 text-white text-xs font-bold">WB</div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate">{form.title || 'Title'}</p>
                                    <p className="text-xs text-slate-500 line-clamp-2">{form.body || 'Message'}</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                            <Button type="button" variant="outline" onClick={closeModal} className="w-full sm:w-auto">Cancel</Button>
                            <Button type="submit" disabled={sending || !form.title.trim() || !form.body.trim()} className="w-full sm:w-auto">
                                {sending ? <><span className="animate-spin mr-1">⏳</span> Sending...</> : <><Send size={14} className="mr-1" /> Send</>}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
