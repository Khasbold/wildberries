import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useSyncExternalStore } from 'react'
import { Bell, ShoppingBag, Check, Trash2, Store, Package, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import {
    subscribe,
    getState,
    markAdminNotificationRead,
    clearAdminNotifications,
} from '../../modules/state/store.js'
import { toDate } from '../../utils/dateUtils.js'
import { useSession } from '../../modules/state/useSession.js'

const NOTIF_ICONS = {
    purchase: { icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    bunny_confirmed: { icon: CheckCircle, color: 'text-violet-600', bg: 'bg-violet-100' },
    product_approved: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    product_rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    product_pending_approval: { icon: Package, color: 'text-amber-600', bg: 'bg-amber-100' },
    new_store_registered: { icon: Store, color: 'text-blue-600', bg: 'bg-blue-100' },
}

export default function AdminNotificationBell() {
    const navigate = useNavigate()
    const state = useSyncExternalStore(subscribe, getState)
    const { isSuperAdmin, storeId } = useSession()
    const allNotifs = state.adminNotifications || []

    // Superadmin sees all; store owners see their own store + superadmin-targeted (if superadmin)
    const notifications = isSuperAdmin
        ? allNotifs
        : allNotifs.filter((n) => n.storeId === storeId)
    const unreadCount = notifications.filter((n) => !n.read).length
    const prevCountRef = useRef(notifications.length)

    const [open, setOpen] = useState(false)

    const handleOpen = useCallback(() => {
        setOpen((o) => {
            const willOpen = !o
            if (willOpen) {
                // Mark all visible unread notifications as read when opening
                const unread = notifications.filter((n) => !n.read)
                unread.forEach((n) => markAdminNotificationRead(n.id))
            }
            return willOpen
        })
    }, [notifications])

    function handleMarkRead(id) {
        markAdminNotificationRead(id)
    }

    function handleClearAll() {
        if (isSuperAdmin) clearAdminNotifications()
        else clearAdminNotifications(storeId)
        toast.success('Цэвэрлэгдлээ', { position: 'top-right', autoClose: 2000 })
    }

    function formatDate(val) {
        const d = toDate(val)
        const now = new Date()
        const diffMs = now - d
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return 'Саяхан'
        if (diffMins < 60) return `${diffMins} мин`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours} цаг`
        return d.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' })
    }

    useEffect(() => {
        if (typeof document !== 'undefined') {
            const base = 'Bunny Админ'
            document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base
        }
    }, [unreadCount])

    // Browser notification + toast for new admin notifications
    useEffect(() => {
        if (notifications.length <= prevCountRef.current) {
            prevCountRef.current = notifications.length
            return
        }
        const newlyAdded = notifications.slice(0, notifications.length - prevCountRef.current)
        newlyAdded.forEach((n) => {
            // In-app toast
            toast.info(
                <div className="py-1">
                    <p className="font-semibold text-sm text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                </div>,
                { position: 'top-right', autoClose: 5000, className: '!rounded-xl !shadow-lg' }
            )
            // Browser notification
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                navigator.serviceWorker?.getRegistration('/firebase-messaging-sw.js').then((reg) => {
                    if (reg) {
                        reg.showNotification(n.title || 'Шинэ мэдэгдэл', {
                            body: n.body || '',
                            icon: '/favicon.ico',
                            badge: '/favicon.ico',
                            tag: n.orderId ? `admin-order-${n.orderId}` : `admin-notif-${n.id}`,
                        })
                    } else {
                        new Notification(n.title || 'Шинэ мэдэгдэл', { body: n.body || '', icon: '/favicon.ico' })
                    }
                }).catch(() => {
                    try { new Notification(n.title || 'Шинэ мэдэгдэл', { body: n.body || '', icon: '/favicon.ico' }) } catch {}
                })
            }
        })
        prevCountRef.current = notifications.length
    }, [notifications])

    function getNotifStyle(type) {
        return NOTIF_ICONS[type] || NOTIF_ICONS.purchase
    }

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                aria-label="Мэдэгдэл"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
                    <div className="fixed right-4 left-4 sm:left-auto sm:right-4 top-14 sm:top-[72px] mt-2 w-[calc(100vw-2rem)] sm:w-[380px] max-w-md max-h-[min(70vh,420px)] overflow-hidden flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 z-[9999] backdrop-blur-sm">
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white shrink-0">
                            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <span className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <Bell size={16} className="text-emerald-600" />
                                </span>
                                Мэдэгдэл
                                {unreadCount > 0 && (
                                    <span className="text-[10px] bg-red-500 text-white rounded-full px-2 py-0.5 font-semibold">
                                        {unreadCount}
                                    </span>
                                )}
                            </h3>
                            {notifications.length > 0 && (
                                <button onClick={handleClearAll} className="text-[11px] text-slate-500 hover:text-red-600 font-medium">
                                    <Trash2 size={12} className="inline mr-1" /> Цэвэрлэх
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 px-4">
                                    <Bell size={32} className="mx-auto mb-3 opacity-40" />
                                    <p className="text-sm font-medium">Мэдэгдэл байхгүй</p>
                                    <p className="text-xs mt-1">Захиалга, бүтээгдэхүүний мэдэгдэл энд гарна</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100/80">
                                    {notifications.slice(0, 50).map((notif) => {
                                        const style = getNotifStyle(notif.type)
                                        const Icon = style.icon
                                        return (
                                            <div
                                                key={notif.id}
                                                className={`px-4 py-3.5 transition-all cursor-pointer active:scale-[0.99] ${
                                                    notif.read ? 'hover:bg-slate-50/80' : 'bg-emerald-50/60 hover:bg-emerald-50'
                                                }`}
                                                onClick={() => {
                                                    handleMarkRead(notif.id)
                                                    if (notif.orderId) {
                                                        setOpen(false)
                                                        navigate(`/admin/orders/${notif.orderId}`)
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${style.bg}`}>
                                                        <Icon size={16} className={style.color} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-sm font-semibold text-slate-900 truncate block">{notif.title}</span>
                                                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{notif.body}</p>
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <span className="text-[10px] text-slate-400">{formatDate(notif.createdAt)}</span>
                                                            {notif.orderId && (
                                                                <span className="text-[10px] bg-slate-100 text-slate-600 rounded-lg px-1.5 py-0.5 font-mono">
                                                                    {notif.orderId}
                                                                </span>
                                                            )}
                                                            {isSuperAdmin && notif.storeName && (
                                                                <span className="text-[10px] bg-indigo-50 text-indigo-600 rounded-lg px-1.5 py-0.5">
                                                                    {notif.storeName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!notif.read && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id) }} className="text-slate-400 hover:text-emerald-600 p-1 shrink-0" title="Уншсан">
                                                            <Check size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}
