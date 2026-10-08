import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { QrCode, Camera, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useSession } from '../../modules/state/useSession.js'
import { confirmDeliveryWithToken, subscribe, getState } from '../../modules/state/store.js'
import { uniqueStoreIdsFromOrder } from '../../utils/orderFulfillment.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select.jsx'
import jsQR from 'jsqr'

const MAX_JSQR_DIMENSION = 720

/** Outcome after auto-confirm: big UI for drivers. */
function deliveryErrorMessage(code) {
    switch (code) {
        case 'invalid_token':
            return 'Invalid or expired QR. Ask the customer to open order history and show the current code.'
        case 'superadmin_pick_store':
            return 'Select which store you are confirming (multi-store order).'
        case 'wrong_store':
            return 'This QR is not for your store. Log in with the correct store account.'
        case 'not_found':
            return 'Order not found. Check the link or try again.'
        default:
            return 'Could not confirm delivery. Try again or paste the link below.'
    }
}

export default function DeliveryScanPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const { isLoggedIn, isSuperAdmin, storeId, session } = useSession()
    const orders = useSyncExternalStore(subscribe, () => getState().orders || [])
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const decodeCanvasRef = useRef(null)
    const barcodeDetectorRef = useRef(null)
    const lastAutoConfirmKeyRef = useRef('')
    const prevUrlKeyRef = useRef(undefined)
    const [cameraOn, setCameraOn] = useState(false)
    const [manualUrl, setManualUrl] = useState('')
    const [superStorePick, setSuperStorePick] = useState('')
    const [outcome, setOutcome] = useState(null)

    const orderId = searchParams.get('order') || ''
    const storeParam = searchParams.get('store') || ''
    const token = searchParams.get('token') || ''

    const order = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId])
    const storeIdsInOrder = useMemo(() => (order ? uniqueStoreIdsFromOrder(order) : []), [order])

    const isUnifiedProof = !!(order?.deliveryProofToken && token && String(token) === String(order.deliveryProofToken))

    const effectiveStoreForConfirm = useMemo(() => {
        if (isUnifiedProof) {
            if (isSuperAdmin) {
                if (storeIdsInOrder.length === 1) return storeIdsInOrder[0]
                return storeParam || superStorePick || ''
            }
            return storeId || ''
        }
        return storeParam
    }, [isUnifiedProof, isSuperAdmin, storeIdsInOrder, storeParam, superStorePick, storeId])

    const canConfirm = useMemo(() => {
        if (!orderId || !token || !order) return false
        if (isUnifiedProof) {
            if (isSuperAdmin) {
                if (storeIdsInOrder.length === 1) return true
                const pick = storeParam || superStorePick
                return !!pick && storeIdsInOrder.includes(pick)
            }
            return !!storeId && storeIdsInOrder.includes(storeId)
        }
        if (!storeParam) return false
        if (isSuperAdmin) return true
        return storeId === storeParam
    }, [orderId, token, order, isUnifiedProof, isSuperAdmin, storeIdsInOrder, storeParam, superStorePick, storeId])

    const applyParams = useCallback((oid, sid, tok) => {
        const p = new URLSearchParams()
        if (oid) p.set('order', oid)
        if (sid) p.set('store', sid)
        if (tok) p.set('token', tok)
        setSearchParams(p, { replace: true })
    }, [setSearchParams])

    function parseScannedText(text) {
        const t = String(text || '').trim()
        try {
            const u = new URL(t, window.location.origin)
            if (!u.pathname.includes('delivery-scan')) return false
            const o = u.searchParams.get('order')
            const s = u.searchParams.get('store')
            const tok = u.searchParams.get('token')
            if (o && tok) {
                applyParams(o, s || '', tok)
                return true
            }
        } catch {
            /* ignore */
        }
        return false
    }

    function clearScanAndOutcome() {
        lastAutoConfirmKeyRef.current = ''
        prevUrlKeyRef.current = undefined
        setOutcome(null)
        setSearchParams({}, { replace: true })
        setSuperStorePick('')
    }

    useEffect(() => {
        if (storeParam) setSuperStorePick('')
    }, [storeParam])

    const stopCameraQuiet = useCallback(() => {
        streamRef.current?.getTracks?.().forEach((t) => t.stop())
        streamRef.current = null
        barcodeDetectorRef.current = null
        setCameraOn(false)
    }, [])

    /* New QR link (different order/token) → reset outcome + allow auto-confirm again */
    useEffect(() => {
        const urlKey = `${orderId}|${token}`
        if (prevUrlKeyRef.current !== undefined && prevUrlKeyRef.current !== urlKey) {
            setOutcome(null)
            lastAutoConfirmKeyRef.current = ''
        }
        prevUrlKeyRef.current = urlKey
    }, [orderId, token])

    /* Auto-confirm as soon as URL + order + permissions are valid */
    useEffect(() => {
        if (!isLoggedIn || !orderId || !token || !order || !canConfirm) return

        const runKey = `${orderId}|${token}|${effectiveStoreForConfirm || storeParam || ''}`
        if (lastAutoConfirmKeyRef.current === runKey) return
        lastAutoConfirmKeyRef.current = runKey

        const r = confirmDeliveryWithToken(orderId, effectiveStoreForConfirm || storeParam || null, token, {
            isSuperAdmin,
            staffStoreId: storeId,
            staffUid: session?.userId || null,
        })

        if (r.ok) {
            stopCameraQuiet()
            if (r.already) {
                setOutcome({ kind: 'already', orderId })
                toast.info('Already marked delivered')
            } else {
                setOutcome({ kind: 'success', orderId })
                toast.success('Delivery confirmed')
            }
        } else {
            setOutcome({
                kind: 'error',
                orderId,
                code: r.error,
                message: deliveryErrorMessage(r.error),
            })
            if (r.error === 'superadmin_pick_store') {
                toast.error('Select a store above')
            } else {
                toast.error(deliveryErrorMessage(r.error))
            }
        }
    }, [
        isLoggedIn,
        orderId,
        token,
        order,
        canConfirm,
        effectiveStoreForConfirm,
        storeParam,
        isSuperAdmin,
        storeId,
        session?.userId,
        stopCameraQuiet,
    ])

    async function startCamera() {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast.error('Camera not available in this browser.')
            return
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
            setCameraOn(true)
        } catch {
            toast.error('Could not access camera.')
        }
    }

    function stopCamera() {
        stopCameraQuiet()
    }

    useEffect(() => () => {
        streamRef.current?.getTracks?.().forEach((t) => t.stop())
    }, [])

    function tryParseScannedPayload(raw) {
        if (!raw || !parseScannedText(raw)) return false
        stopCameraQuiet()
        return true
    }

    async function scanFrame() {
        const video = videoRef.current
        if (!video || !cameraOn) return
        if (video.readyState < 2 || video.videoWidth < 2 || video.videoHeight < 2) return

        if (typeof window !== 'undefined' && window.BarcodeDetector) {
            try {
                if (!barcodeDetectorRef.current) {
                    barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })
                }
                const codes = await barcodeDetectorRef.current.detect(video)
                if (codes[0]?.rawValue) tryParseScannedPayload(codes[0].rawValue)
            } catch {
                /* no code in frame */
            }
            return
        }

        try {
            const w = video.videoWidth
            const h = video.videoHeight
            const scale = Math.min(1, MAX_JSQR_DIMENSION / Math.max(w, h))
            const cw = Math.max(1, Math.floor(w * scale))
            const ch = Math.max(1, Math.floor(h * scale))
            if (!decodeCanvasRef.current) decodeCanvasRef.current = document.createElement('canvas')
            const canvas = decodeCanvasRef.current
            canvas.width = cw
            canvas.height = ch
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            if (!ctx) return
            ctx.drawImage(video, 0, 0, cw, ch)
            const imageData = ctx.getImageData(0, 0, cw, ch)
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
            })
            if (code?.data) tryParseScannedPayload(code.data)
        } catch {
            /* frame decode failed */
        }
    }

    useEffect(() => {
        if (!cameraOn) return
        const id = setInterval(scanFrame, 700)
        return () => clearInterval(id)
    }, [cameraOn])

    function onPasteUrl() {
        if (parseScannedText(manualUrl)) {
            setManualUrl('')
        } else {
            toast.error('Paste the full link from the customer QR.')
        }
    }

    const showScannerUi = !outcome || outcome.kind === 'error'

    if (!isLoggedIn) {
        return (
            <Card>
                <CardContent className="py-10 text-center space-y-3">
                    <p className="text-slate-600">Sign in as a store owner or superadmin to confirm delivery.</p>
                    <Link to="/admin"><Button>Go to admin login</Button></Link>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            {outcome?.kind === 'success' && (
                <div
                    className="rounded-2xl bg-emerald-600 text-white px-6 py-10 sm:px-10 sm:py-12 text-center shadow-xl border-2 border-emerald-500/80"
                    role="status"
                    aria-live="polite"
                >
                    <CheckCircle2 className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-5 text-white drop-shadow-md" strokeWidth={2} />
                    <p className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">Delivery Successful</p>
                    <p className="text-xl sm:text-2xl font-semibold mt-4 opacity-95">Your job for this drop-off is done.</p>
                    <p className="text-base sm:text-lg mt-5 font-mono bg-emerald-700/50 rounded-lg py-2 px-3 inline-block">Order {outcome.orderId}</p>
                    <p className="text-sm sm:text-base mt-4 opacity-90 max-w-md mx-auto">
                        This store’s items are marked delivered. The customer was notified.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Button type="button" variant="secondary" className="bg-white text-emerald-800 hover:bg-emerald-50 font-semibold" onClick={clearScanAndOutcome}>
                            Scan another order
                        </Button>
                        <Link to="/admin/orders" className="inline-flex">
                            <Button type="button" variant="outline" className="border-white text-white hover:bg-white/15 font-semibold">
                                Back to orders
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {outcome?.kind === 'already' && (
                <div
                    className="rounded-2xl bg-teal-600 text-white px-6 py-10 sm:px-10 sm:py-12 text-center shadow-xl border-2 border-teal-500/80"
                    role="status"
                    aria-live="polite"
                >
                    <CheckCircle2 className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-5 text-white drop-shadow-md" strokeWidth={2} />
                    <p className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">Already Delivered</p>
                    <p className="text-xl sm:text-2xl font-semibold mt-4 opacity-95">Nothing more to do for this store.</p>
                    <p className="text-base sm:text-lg mt-5 font-mono bg-teal-700/50 rounded-lg py-2 px-3 inline-block">Order {outcome.orderId}</p>
                    <p className="text-sm sm:text-base mt-4 opacity-90 max-w-md mx-auto">
                        This delivery was confirmed earlier. You are all set.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Button type="button" variant="secondary" className="bg-white text-teal-800 hover:bg-teal-50 font-semibold" onClick={clearScanAndOutcome}>
                            Scan another order
                        </Button>
                        <Link to="/admin/orders" className="inline-flex">
                            <Button type="button" variant="outline" className="border-white text-white hover:bg-white/15 font-semibold">
                                Back to orders
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {outcome?.kind === 'error' && (
                <div
                    className="rounded-2xl bg-rose-600 text-white px-6 py-8 sm:py-10 text-center shadow-xl border-2 border-rose-500/80"
                    role="alert"
                    aria-live="assertive"
                >
                    <AlertCircle className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 text-white" strokeWidth={2} />
                    <p className="text-2xl sm:text-4xl font-extrabold">Could not confirm</p>
                    <p className="text-base sm:text-lg mt-4 font-medium leading-relaxed max-w-md mx-auto">{outcome.message}</p>
                    {orderId && (
                        <p className="text-sm mt-3 font-mono opacity-90">Order {orderId}</p>
                    )}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <Button type="button" variant="secondary" className="bg-white text-rose-800 hover:bg-rose-50 font-semibold" onClick={clearScanAndOutcome}>
                            Try another scan
                        </Button>
                        <Link to="/admin/orders">
                            <Button type="button" variant="outline" className="border-white text-white hover:bg-white/15 w-full sm:w-auto">
                                Back to orders
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {showScannerUi && (
                <>
                    <div>
                        <p className="text-sm text-slate-500">Delivery confirmation</p>
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                            <QrCode className="w-7 h-7" />
                            Scan customer QR
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Scan or paste the link — delivery confirms automatically when the QR is valid.
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Camera</CardTitle>
                            <p className="text-xs text-slate-500 font-normal pt-1">
                                Works in Chrome, Edge, Firefox, and Safari — hold the QR steady in the frame.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                                {!cameraOn && <span className="absolute text-white/70 text-sm">Camera off</span>}
                            </div>
                            {!cameraOn ? (
                                <Button type="button" onClick={startCamera} className="w-full gap-2">
                                    <Camera className="w-4 h-4" />
                                    Start camera
                                </Button>
                            ) : (
                                <Button type="button" variant="outline" onClick={stopCamera} className="w-full">Stop camera</Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Or paste link</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <textarea
                                value={manualUrl}
                                onChange={(e) => setManualUrl(e.target.value)}
                                placeholder="https://yoursite.com/admin/delivery-scan?order=...&token=..."
                                className="w-full min-h-[80px] text-xs font-mono border rounded-lg p-2"
                            />
                            <Button type="button" variant="secondary" className="w-full" onClick={onPasteUrl}>Load from URL</Button>
                        </CardContent>
                    </Card>

                    {(orderId || storeParam || token) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Current QR data</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2 font-mono break-all">
                                <p><span className="text-slate-500">Order:</span> {orderId || '—'}</p>
                                <p><span className="text-slate-500">Store (URL):</span> {storeParam || '—'}</p>
                                <p><span className="text-slate-500">Token:</span> {token ? `${token.slice(0, 8)}…` : '—'}</p>
                                {isUnifiedProof && (
                                    <p className="text-xs font-sans text-slate-600">Unified order QR — confirming for: <strong className="text-slate-900">{effectiveStoreForConfirm || '—'}</strong></p>
                                )}
                                {isSuperAdmin && isUnifiedProof && storeIdsInOrder.length > 1 && (
                                    <div className="font-sans space-y-1 pt-2">
                                        <p className="text-xs text-slate-600 font-medium">Superadmin: choose store, then confirmation runs automatically</p>
                                        <Select value={superStorePick || storeParam || ''} onValueChange={(v) => { setSuperStorePick(v); const p = new URLSearchParams(searchParams); if (v) p.set('store', v); else p.delete('store'); setSearchParams(p, { replace: true }) }}>
                                            <SelectTrigger className="text-xs font-sans">
                                                <SelectValue placeholder="Select store…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {storeIdsInOrder.map((sid) => (
                                                    <SelectItem key={sid} value={sid}>{sid}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {!canConfirm && orderId && token && order && (
                                    <p className="text-rose-600 flex items-center gap-1 text-xs font-sans pt-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {isUnifiedProof && !isSuperAdmin && storeId && !storeIdsInOrder.includes(storeId)
                                            ? 'This order has no items from your store.'
                                            : isSuperAdmin && isUnifiedProof && storeIdsInOrder.length > 1 && !(storeParam || superStorePick)
                                                ? 'Select a store above to confirm.'
                                                : 'Waiting for order data or correct account…'}
                                    </p>
                                )}
                                {canConfirm && orderId && token && !outcome && (
                                    <p className="text-xs font-sans text-emerald-700 font-medium pt-2 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        Confirming delivery…
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {showScannerUi && (
                <Link to="/admin/orders">
                    <Button variant="outline" className="w-full">Back to orders</Button>
                </Link>
            )}
        </div>
    )
}
