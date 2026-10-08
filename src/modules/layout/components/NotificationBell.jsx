import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPosition } from '../../../utils/useAnchoredPosition.js'
import { useNavigate } from 'react-router-dom'
import { Bell, Package, ShoppingBag, Check } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { toast } from 'react-toastify'
import {
    subscribe,
    getState,
    markClientNotificationRead,
    clearClientNotifications,
} from '../../state/store.js'
import { useI18n } from '../../i18n/useI18n.js'
import {
    requestNotificationPermission,
    saveTokenLocally,
    onForegroundMessage,
} from '../../../firebase/notificationService.js'
import { toDate } from '../../../utils/dateUtils.js'

export default function NotificationBell() {
    const navigate = useNavigate()
    const { t } = useI18n()
    const state = useSyncExternalStore(subscribe, getState)
    const notifications = state.notifications || []
    const clientNotifs = state.clientNotifications || []

    const allNotifs = [
        ...clientNotifs.map((n) => ({ ...n, source: 'client' })),
        ...notifications.map((n) => ({ ...n, source: 'broadcast' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const unreadCount = clientNotifs.filter((n) => !n.read).length
    const prevClientCountRef = useRef(clientNotifs.length)
    const prevBroadcastCountRef = useRef(notifications.length)
    const [showPermissionBanner, setShowPermissionBanner] = useState(false)

    const [open, setOpen] = useState(false)
    const [hasToken, setHasToken] = useState(false)
    const anchorRef = useRef(null)
    const panelStyle = useAnchoredPosition(open, anchorRef, { width: 380 })

    // Auto-register token if already granted, or show permission banner
    useEffect(() => {
        if (typeof Notification === 'undefined') return
        if (Notification.permission === 'granted') {
            requestNotificationPermission().then((token) => {
                if (token) { saveTokenLocally(token); setHasToken(true) }
            })
        } else if (Notification.permission === 'default') {
            // Show permission prompt after short delay so user isn't bombarded on first load
            const timer = setTimeout(() => setShowPermissionBanner(true), 5000)
            return () => clearTimeout(timer)
        }
    }, [])

    useEffect(() => {
        const unsub = onForegroundMessage((payload) => {
            const title = payload.notification?.title || payload.data?.title || 'Notification'
            const body = payload.notification?.body || payload.data?.body || ''

            navigator.serviceWorker?.getRegistration('/firebase-messaging-sw.js').then((reg) => {
                if (reg && Notification.permission === 'granted') {
                    reg.showNotification(title, {
                        body,
                        icon: '/logo.png',
                        badge: '/logo.png',
                        tag: payload?.data?.orderId ? `order-${payload.data.orderId}` : 'bunny-foreground-notification',
                    })
                } else if (Notification.permission === 'granted') {
                    new Notification(title, { body, icon: '/logo.png' })
                }
            }).catch(() => {
                if (Notification.permission === 'granted') {
                    new Notification(title, { body, icon: '/logo.png' })
                }
            })

            toast.info(
                <div className="py-1">
                    <p className="font-semibold text-sm text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{body}</p>
                </div>,
                { position: 'top-right', autoClose: 5000, className: '!rounded-xl !shadow-lg' }
            )
        })
        return unsub
    }, [])

    useEffect(() => {
        const baseTitle = 'Bunny'
        if (typeof document === 'undefined') return
        document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle
    }, [unreadCount])

    // Toast for new client notifications (order updates)
    useEffect(() => {
        if (clientNotifs.length > prevClientCountRef.current) {
            const newOnes = clientNotifs.slice(0, clientNotifs.length - prevClientCountRef.current)
            newOnes.forEach((notif) => {
                if (notif.type === 'order_created') return
                const isSuccess = notif.newStatus === 'Delivered'
                const isError = notif.newStatus === 'Cancelled' || notif.newStatus === 'Refunded'
                const toastFn = isSuccess ? toast.success : isError ? toast.error : toast.info
                toastFn(
                    <div className="py-1">
                        <p className="font-semibold text-sm">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{notif.body}</p>
                    </div>,
                    { position: 'top-right', autoClose: 4000, className: '!rounded-xl !shadow-lg' }
                )
            })
        }
        prevClientCountRef.current = clientNotifs.length
    }, [clientNotifs])

    // Toast for new broadcast notifications (from superadmin)
    useEffect(() => {
        if (notifications.length > prevBroadcastCountRef.current) {
            const newOnes = notifications.slice(0, notifications.length - prevBroadcastCountRef.current)
            newOnes.forEach((notif) => {
                toast.info(
                    <div className="py-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-5 w-5 rounded-md bg-[#F7E9D7] flex items-center justify-center">
                                <Bell size={12} className="text-[#D66B3E]" />
                            </span>
                            <p className="font-semibold text-sm text-slate-900">{notif.title}</p>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{notif.body}</p>
                    </div>,
                    { position: 'top-right', autoClose: 6000, className: '!rounded-xl !shadow-lg !border !border-[#D66B3E]/20' }
                )
            })
        }
        prevBroadcastCountRef.current = notifications.length
    }, [notifications])

    const handleOpen = useCallback(() => {
        setOpen((o) => {
            const willOpen = !o
            if (willOpen) {
                // Mark all unread client notifications as read when opening
                const unread = clientNotifs.filter((n) => !n.read)
                unread.forEach((n) => markClientNotificationRead(n.id))
            }
            return willOpen
        })
    }, [clientNotifs])

    async function handleSubscribe() {
        const token = await requestNotificationPermission()
        if (token) {
            saveTokenLocally(token)
            setHasToken(true)
            setShowPermissionBanner(false)
            // Also save to Firestore if user is authenticated
            try {
                const { saveUserFcmToken } = await import('../../../firebase/authService.js')
                const auth = state.auth
                if (auth?.uid) await saveUserFcmToken(auth.uid, token, auth)
            } catch {}
            toast.success(t('common.pushEnabled') || 'Push notifications enabled!', { position: 'top-right', autoClose: 2000 })
        } else {
            setShowPermissionBanner(false)
        }
    }

    function formatDate(val) {
        const d = toDate(val)
        const now = new Date()
        const diffMs = now - d
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    function getIcon(notif) {
        if (notif.source === 'client') {
            if (notif.type === 'order_created') return <ShoppingBag size={16} className="text-[#4B7F4D]" />
            if (notif.type === 'status_change') return <Package size={16} className="text-[#D66B3E]" />
        }
        return <Bell size={16} className="text-[#D66B3E]" />
    }

    function getIconBg(notif) {
        if (notif.source === 'client') {
            if (notif.type === 'order_created') return 'bg-[#4B7F4D]/15 dark:bg-[#4B7F4D]/25'
            if (notif.type === 'status_change') return 'bg-[#F7E9D7] dark:bg-[#D66B3E]/20'
        }
        return 'bg-[#F7E9D7] dark:bg-[#D66B3E]/20'
    }

    return (
        <div className="relative">
            {/* Floating notification permission banner */}
            {showPermissionBanner && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[190001] w-[90vw] max-w-md animate-fade-in-down">
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-[#D66B3E]/20 dark:border-slate-700 rounded-2xl shadow-brand-md px-4 py-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#e98c63] to-[#b5532c] flex items-center justify-center shrink-0 shadow-brand-sm">
                            <Bell size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('common.enableNotifications') || 'Enable notifications'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('common.enableNotificationsDesc') || 'Get order updates & exclusive deals'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setShowPermissionBanner(false)}
                                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-1.5 transition-colors"
                            >
                                {t('common.later') || 'Later'}
                            </button>
                            <button
                                onClick={handleSubscribe}
                                className="btn-primary !px-3 !py-1.5 !text-xs !rounded-lg"
                            >
                                {t('common.allow') || 'Allow'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                ref={anchorRef}
                onClick={handleOpen}
                className="relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-full hover:bg-[#F7E9D7]/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200 active:scale-[0.95]"
				aria-label={t('common.notifications')}
            >
                <Bell size={20} className="text-slate-600 dark:text-slate-300 shrink-0" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#e98c63] to-[#D66B3E] text-white text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-white dark:ring-slate-900 shadow-brand-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
								<span className="hidden sm:inline text-sm font-medium">{t('common.notifications')}</span>
            </button>

            {open && createPortal(
                <>
                    <div className="fixed inset-0 z-[9997]" onClick={() => setOpen(false)} aria-hidden="true" />
                    <div
                        style={panelStyle}
                        className="max-h-[min(70vh,420px)] overflow-hidden flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card-elevated ring-1 ring-slate-900/5 backdrop-blur-sm animate-scale-in"
                    >
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-[#F7E9D7]/50 to-white dark:from-slate-800 dark:to-slate-800 shrink-0">
                            <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span className="h-8 w-8 rounded-xl bg-[#F7E9D7] dark:bg-[#D66B3E]/20 flex items-center justify-center">
                                    <Bell size={16} className="text-[#D66B3E]" />
                                </span>
                                {t('common.notifications')}
                                {unreadCount > 0 && (
                                    <span className="text-[10px] bg-gradient-to-br from-[#e98c63] to-[#D66B3E] text-white rounded-full px-2 py-0.5 font-semibold shadow-brand-sm">
                                        {unreadCount}
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-2">
                                {!hasToken && (
									<button onClick={handleSubscribe} className="text-[11px] text-[#D66B3E] hover:text-[#b5532c] font-semibold transition-colors">
                                        {t('common.enablePush')}
                                    </button>
                                )}
                                {allNotifs.length > 0 && (
									<button onClick={clearClientNotifications} className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                                        {t('common.clear')}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {allNotifs.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 px-4 animate-fade-in">
                                    <Bell size={32} className="mx-auto mb-3 opacity-40 animate-pulse-soft" />
									<p className="text-sm font-medium">{t('common.noNotificationsYet')}</p>
                                    <p className="text-xs mt-1">{t('common.orderUpdatesHere')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100/80 dark:divide-slate-700/60">
                                    {allNotifs.slice(0, 30).map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`px-4 py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                                                notif.read === false ? 'bg-[#F7E9D7]/50 hover:bg-[#F7E9D7]/70 dark:bg-[#D66B3E]/10 dark:hover:bg-[#D66B3E]/15' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/50'
                                            }`}
                                            onClick={() => {
                                                if (notif.source === 'client' && !notif.read) markClientNotificationRead(notif.id)
                                                if (notif.orderId) {
                                                    setOpen(false)
                                                    navigate(`/orders?order=${encodeURIComponent(notif.orderId)}`)
                                                }
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${getIconBg(notif)}`}>
                                                    {getIcon(notif)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate block">{notif.title}</span>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{notif.body}</p>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="text-[10px] text-slate-400">{formatDate(notif.createdAt)}</span>
                                                        {notif.orderId && (
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg px-1.5 py-0.5 font-mono">
                                                                {notif.orderId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {notif.read === false && (
                                                    <span className="h-2 w-2 rounded-full bg-[#D66B3E] shadow-glow shrink-0 mt-2" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
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
