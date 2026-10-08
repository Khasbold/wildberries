import { Link, useParams } from 'react-router-dom'
import { useMemo, useSyncExternalStore } from 'react'
import { toast } from 'react-toastify'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { subscribe, getState, getFulfillments, TIER_PLANS } from '../../modules/state/store.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { buildDeliveryQrUrl, buildUnifiedDeliveryQrUrl } from '../../utils/orderFulfillment.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Separator } from '../components/ui/Separator.jsx'
import { Truck, Store, QrCode, Rabbit, Copy, CheckCircle, Carrot, TrendingUp } from 'lucide-react'
import { OrderChatCard } from '../../components/OrderChat.jsx'

export default function OrderDetailsAdminPage() {
    const { orderId } = useParams()
    const {
        orders,
        isSuperAdmin,
        storeId: staffStoreId,
        deriveAggregateStatus,
        storeOwnerAcceptFulfillment,
        storeOwnerRequestRefund,
        storeOwnerMarkShipped,
        storeOwnerMarkDelivered,
        superadminMarkFulfillmentDelivered,
        superadminMarkFulfillmentBunny,
        superadminMarkOrderBunny,
        superadminMarkRefunded,
    } = useAdmin()
    const { tier, session } = useSession()
    const state = useSyncExternalStore(subscribe, getState)
    const adminUsers = state.adminUsers || []
    const allProducts = state.adminProducts || []

    const order = useMemo(() => orders.find((item) => item.id === orderId), [orders, orderId])

    /* For superadmin: find all orders in the same group */
    const groupedOrders = useMemo(() => {
        if (!order?.groupId || !isSuperAdmin) return [order].filter(Boolean)
        return orders.filter((o) => o.groupId === order.groupId)
    }, [order, orders, isSuperAdmin])

    /* Group items by store for the superadmin view */
    const storeGroups = useMemo(() => {
        const ordersToShow = isSuperAdmin && groupedOrders.length > 0 ? groupedOrders : [order].filter(Boolean)
        const map = {}
        for (const o of ordersToShow) {
            for (const line of o.items || []) {
                const sid = line.storeId || '_'
                if (!map[sid]) {
                    const storeUser = adminUsers.find((u) => u.storeId === sid)
                    map[sid] = {
                        storeId: sid,
                        storeName: storeUser?.storeName || '-',
                        deliveryFee: storeUser?.deliveryFree === false ? (storeUser.deliveryPrice || 0) : 0,
                        items: [],
                        subtotal: 0,
                        orderId: o.id,
                        discount: o.discount || 0,
                        total: o.total || 0,
                    }
                } else if (!map[sid].orderId) {
                    map[sid].orderId = o.id
                }
                const product = allProducts.find((p) => p.id === line.productId)
                const lineTotal = (product?.price || 0) * (line.quantity || 0)
                map[sid].items.push({ ...line, product, lineTotal })
                map[sid].subtotal += lineTotal
            }
        }
        let groups = Object.values(map)
        if (!isSuperAdmin && staffStoreId) {
            groups = groups.filter((g) => g.storeId === staffStoreId)
        }
        return groups
    }, [order, groupedOrders, isSuperAdmin, staffStoreId, adminUsers, allProducts])

    const grandTotal = useMemo(() => {
        if (isSuperAdmin && groupedOrders.length > 1) {
            return groupedOrders.reduce((s, o) => s + (o.total || 0), 0)
        }
        if (!isSuperAdmin && staffStoreId && order?.storeBreakdown?.length) {
            const row = order.storeBreakdown.find((b) => b.storeId === staffStoreId)
            return row ? Number(row.total || 0) : order?.total || 0
        }
        return order?.total || 0
    }, [order, groupedOrders, isSuperAdmin, staffStoreId])

    const unifiedQrUrl = useMemo(() => {
        if (!order?.deliveryProofToken || typeof window === 'undefined') return ''
        return buildUnifiedDeliveryQrUrl(window.location.origin, order.id, order.deliveryProofToken)
    }, [order?.deliveryProofToken, order?.id])

    /* Super Bunny earnings calculation for SuperAdmin */
    const superBunnyEarnings = useMemo(() => {
        if (!isSuperAdmin) return null
        const ordersToCalc = groupedOrders.length > 1 ? groupedOrders : [order].filter(Boolean)
        const QPAY_RATE = 0.01
        const QPAY_FLAT_FEE = 200 // Гүйлгээ хураамж

        let totalOrderAmount = 0
        const perStore = []

        for (const o of ordersToCalc) {
            const orderTotal = Number(o.total || 0)
            totalOrderAmount += orderTotal

            // Find store groups for this order
            for (const line of o.items || []) {
                const sid = line.storeId || '_'
                const existing = perStore.find((p) => p.storeId === sid)
                if (existing) continue // already processed this store

                const storeUser = adminUsers.find((u) => u.storeId === sid)
                const storeTier = storeUser?.tier || 'free'
                const tierPlan = TIER_PLANS[storeTier] || TIER_PLANS.free
                const commissionRate = storeUser?.commissionOverride != null
                    ? storeUser.commissionOverride / 100
                    : tierPlan.commission / 100

                // Calculate store's portion from storeGroups
                const sg = storeGroups.find((g) => g.storeId === sid)
                const storeTotal = sg ? sg.subtotal + (sg.deliveryFee || 0) : 0
                perStore.push({
                    storeId: sid,
                    storeName: storeUser?.storeName || sid,
                    tier: tierPlan.name,
                    commissionPercent: (commissionRate * 100),
                    storeTotal,
                    commissionRate,
                    bankAccount: storeUser?.bankAccount || '',
                })
            }
        }

        const qpayFee = Math.round(totalOrderAmount * QPAY_RATE)
        const storeCount = perStore.length || 1
        const settledStores = perStore.map((p) => {
            const qpayShare = totalOrderAmount > 0 ? Math.round((p.storeTotal / totalOrderAmount) * qpayFee) : 0
            const isGoldStore = (adminUsers.find((u) => u.storeId === p.storeId)?.tier || 'free') === 'gold'
            const flatFeeShare = isGoldStore ? 0 : Math.round(QPAY_FLAT_FEE / storeCount)
            const storeCommission = Math.round(p.storeTotal * p.commissionRate) // Commission from total amount
            const storePayout = Math.max(0, p.storeTotal - qpayShare - flatFeeShare - storeCommission)
            return {
                ...p,
                qpayShare,
                flatFeeShare,
                storeCommission,
                storePayout,
            }
        })

        const totalCommission = settledStores.reduce((s, p) => s + p.storeCommission, 0)
        const totalFlatFees = settledStores.reduce((s, p) => s + p.flatFeeShare, 0)
        const superBunnyTotal = totalCommission
        const totalPayout = settledStores.reduce((s, p) => s + p.storePayout, 0)

        return {
            totalOrderAmount,
            qpayFee,
            qpayFlatFee: totalFlatFees,
            afterQpay: totalOrderAmount - qpayFee - totalFlatFees,
            perStore: settledStores,
            totalCommission,
            superBunnyTotal,
            totalPayout,
        }
    }, [isSuperAdmin, order, groupedOrders, storeGroups, adminUsers])

    /* Store owner earnings calculation */
    const storeOwnerEarnings = useMemo(() => {
        if (isSuperAdmin || !staffStoreId) return null
        const QPAY_RATE = 0.01
        const QPAY_FLAT_FEE = 200 // Гүйлгээ хураамж

        const sg = storeGroups.find((g) => g.storeId === staffStoreId)
        if (!sg) return null

        const storeTotal = sg.subtotal + (sg.deliveryFee || 0)
        const storeUser = adminUsers.find((u) => u.storeId === staffStoreId)
        const storeTier = storeUser?.tier || 'free'
        const tierPlan = TIER_PLANS[storeTier] || TIER_PLANS.free
        const commissionRate = storeUser?.commissionOverride != null
            ? storeUser.commissionOverride / 100
            : tierPlan.commission / 100
        const commissionPercent = commissionRate * 100

        const qpayFee = Math.round(storeTotal * QPAY_RATE)
        const isGoldTier = storeTier === 'gold'
        const flatFeeForStore = isGoldTier ? 0 : QPAY_FLAT_FEE
        const platformFee = Math.round(storeTotal * commissionRate) // Commission from total amount
        const payout = Math.max(0, storeTotal - qpayFee - flatFeeForStore - platformFee)

        return {
            storeTotal,
            qpayFee,
            qpayFlatFee: flatFeeForStore,
            commissionPercent,
            platformFee,
            payout,
            tierName: tierPlan.name,
        }
    }, [isSuperAdmin, staffStoreId, storeGroups, adminUsers])

    if (!order) {
        return (
            <Card>
                <CardContent className="py-10 text-center">
                    <p className="text-slate-500 mb-4">Order not found.</p>
                    <Link to="/admin/orders">
                        <Button variant="outline">Back to orders</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-slate-500">Order details</p>
                    <h2 className="text-xl sm:text-2xl font-semibold">{order.id}</h2>
                    {order.groupId && isSuperAdmin && groupedOrders.length > 1 && (
                        <p className="text-xs text-slate-400 mt-0.5">Group: {order.groupId} ({groupedOrders.length} stores)</p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={(() => {
                        const s = !isSuperAdmin && staffStoreId
                            ? (getFulfillments(order)[staffStoreId]?.status || 'New')
                            : deriveAggregateStatus(order)
                        return s === 'Bunny' ? 'bunny' : s === 'Delivered' ? 'delivered' : s === 'Accepted' ? 'accepted' : 'new'
                    })()}>
                        {!isSuperAdmin && staffStoreId
                            ? (getFulfillments(order)[staffStoreId]?.status || 'New')
                            : deriveAggregateStatus(order)}
                    </Badge>
                    {order.refundStatus === 'Requested' && <Badge variant="outline" className="text-orange-700 border-orange-300">Refund requested</Badge>}
                    <Link to="/admin/delivery-scan">
                        <Button variant="outline" size="sm" className="gap-1"><QrCode className="w-4 h-4" /> Scan delivery QR</Button>
                    </Link>
                    <Link to="/admin/orders">
                        <Button variant="outline">Back</Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
                {/* Items grouped by store */}
                <div className="space-y-4">
                    {unifiedQrUrl && (
                        <Card className="border-dashed border-[#4B7F4D]/40 bg-[#4B7F4D]/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Customer delivery QR (all stores, one code)</CardTitle>
                                <p className="text-xs text-slate-600 font-normal">
                                    Each store's delivery person scans the same QR while logged in as that store — only their part is marked delivered.
                                </p>
                            </CardHeader>
                            <CardContent className="text-[10px] text-slate-500 break-all font-mono">{unifiedQrUrl}</CardContent>
                        </Card>
                    )}
                    {storeGroups.map((group) => {
                        const sourceOrder = orders.find((x) => x.id === group.orderId) || order
                        const fmap = getFulfillments(sourceOrder)
                        const line = fmap[group.storeId] || { status: 'New' }
                        const legacyToken = sourceOrder.deliveryTokens?.[group.storeId]
                        const qrUrl = !sourceOrder.deliveryProofToken && legacyToken && typeof window !== 'undefined'
                            ? buildDeliveryQrUrl(window.location.origin, sourceOrder.id, group.storeId, legacyToken)
                            : ''
                        const canManageStore = isSuperAdmin || staffStoreId === group.storeId
                        const storeUser = adminUsers.find((u) => u.storeId === group.storeId)
                        const bankAccount = storeUser?.bankAccount || ''
                        return (
                        <Card key={`${group.orderId}-${group.storeId}`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                            <Store size={16} className="text-slate-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{group.storeName}</CardTitle>
                                            <p className="text-xs text-slate-500">{group.items.length} items · <Badge variant={line.status === 'Bunny' ? 'bunny' : line.status === 'Delivered' ? 'delivered' : line.status === 'Accepted' ? 'accepted' : 'new'} className="text-[10px] ml-1">{line.status}</Badge></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isSuperAdmin && bankAccount && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(bankAccount)
                                                    toast.success('Bank account copied!')
                                                }}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                                                title="Click to copy bank account"
                                            >
                                                <Copy size={12} />
                                                <span className="font-mono">{bankAccount}</span>
                                            </button>
                                        )}
                                        {isSuperAdmin && (
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Truck size={14} />
                                                <span className={group.deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>
                                                    {group.deliveryFee === 0 ? 'Үнэгүй' : formatCurrency(group.deliveryFee)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {sourceOrder.fulfillments && (
                                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                                        {line.status === 'New' && canManageStore && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => {
                                                    const r = storeOwnerAcceptFulfillment(sourceOrder.id, group.storeId, { isSuperAdmin, staffStoreId })
                                                    if (!r.ok) toast.error('Cannot accept (wrong account or state).')
                                                    else toast.success('Marked accepted')
                                                }}
                                            >
                                                Accept order
                                            </Button>
                                        )}
                                        {!isSuperAdmin && staffStoreId === group.storeId && line.status !== 'Delivered' && line.status !== 'Bunny' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const r = storeOwnerRequestRefund(sourceOrder.id, group.storeId, { isSuperAdmin, staffStoreId })
                                                    if (!r.ok) toast.error('Could not submit refund request')
                                                    else toast.success('Superadmin notified — refund request recorded')
                                                }}
                                            >
                                                Request refund
                                            </Button>
                                        )}
                                        {/* Gold tier: shipped button (Accepted → shipped) — only for Захиалгат products */}
                                        {!isSuperAdmin && tier === 'gold' && staffStoreId === group.storeId && line.status === 'Accepted' && group.items.some((i) => i.product?.productType === 'order') && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="gap-1"
                                                onClick={() => {
                                                    const r = storeOwnerMarkShipped(sourceOrder.id, group.storeId, { isSuperAdmin, staffStoreId })
                                                    if (!r.ok) toast.error('Cannot mark as shipped')
                                                    else toast.success('Marked as shipped')
                                                }}
                                            >
                                                <Truck size={14} /> Mark shipped
                                            </Button>
                                        )}
                                        {/* Store owner: mark delivered manually */}
                                        {!isSuperAdmin && staffStoreId === group.storeId && line.status !== 'Delivered' && line.status !== 'Bunny' && line.status !== 'New' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => {
                                                    const r = storeOwnerMarkDelivered(sourceOrder.id, group.storeId, { isSuperAdmin, staffStoreId })
                                                    if (!r.ok) toast.error('Хүргэгдсэн гэж тэмдэглэж чадсангүй')
                                                    else toast.success('Хүргэгдсэн гэж тэмдэглэв (гар аргаар)')
                                                }}
                                            >
                                                <CheckCircle size={14} /> Хүргэсэн (Delivered)
                                            </Button>
                                        )}
                                        {isSuperAdmin && line.status !== 'Delivered' && line.status !== 'Bunny' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const r = superadminMarkFulfillmentDelivered(sourceOrder.id, group.storeId)
                                                    if (!r.ok) toast.error('Failed')
                                                    else toast.success('This store line marked delivered')
                                                }}
                                            >
                                                Mark delivered (this store)
                                            </Button>
                                        )}
                                        {isSuperAdmin && (line.status === 'Delivered') && (
                                            <Button
                                                size="sm"
                                                className="bg-[#D66B3E] hover:bg-[#c45d35] text-white gap-1"
                                                onClick={() => {
                                                    const r = superadminMarkFulfillmentBunny(sourceOrder.id, group.storeId)
                                                    if (!r.ok) toast.error('Failed')
                                                    else toast.success('🐰 Marked as Bunny (completed)')
                                                }}
                                            >
                                                <Rabbit size={14} /> Mark Bunny
                                            </Button>
                                        )}
                                        {/* Delivery method badge */}
                                        {line.deliveryMethod && (line.status === 'Delivered' || line.status === 'Bunny') && (
                                            <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded font-semibold ${line.deliveryMethod === 'auto' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {line.deliveryMethod === 'auto' ? '📷 QR скан' : '✋ Гар аргаар'}
                                            </span>
                                        )}
                                        {qrUrl && (
                                            <div className="w-full text-[10px] text-slate-400 break-all font-mono">{qrUrl}</div>
                                        )}
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0">
                                {group.items.map((line, idx) => (
                                    <div key={`${line.productId}-${idx}`} className="border border-slate-100 rounded-lg p-2.5 flex items-center gap-3">
                                        <img
                                            src={line.product?.thumbnail || line.product?.image || 'https://via.placeholder.com/48x48?text=?'}
                                            alt={line.product?.title || line.productId}
                                            className="w-12 h-12 rounded-md object-cover border border-slate-200"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{line.product?.title || line.productId}</p>
                                            {line.product?.productCode && (
                                                <p className="text-[10px] text-slate-400 font-mono">Код: {line.product.productCode}</p>
                                            )}
                                            <p className="text-xs text-slate-500">{formatCurrency(line.product?.price || 0)} × {line.quantity}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-900 shrink-0">{formatCurrency(line.lineTotal)}</p>
                                    </div>
                                ))}
                                {/* Store subtotal row */}
                                <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Бараа</span>
                                        <span>{formatCurrency(group.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span className="flex items-center gap-1"><Truck size={12} /> Хүргэлт</span>
                                        <span className={group.deliveryFee === 0 ? 'text-emerald-600' : ''}>
                                            {group.deliveryFee === 0 ? 'Үнэгүй' : formatCurrency(group.deliveryFee)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-slate-900">
                                        <span>Дүн</span>
                                        <span>{formatCurrency(group.subtotal + group.deliveryFee)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        )
                    })}
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p><span className="text-slate-500">Name:</span> {order.customer?.name || '-'}</p>
                            <p><span className="text-slate-500">Email:</span> {order.customer?.email || '-'}</p>
                            <p><span className="text-slate-500">Phone:</span> {order.customer?.phone || '-'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Delivery</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p><span className="text-slate-500">Хот:</span> {order.deliveryInfo?.city || '-'}</p>
                            <p><span className="text-slate-500">Дүүрэг:</span> {order.deliveryInfo?.district || '-'}</p>
                            <p><span className="text-slate-500">Хороо:</span> {order.deliveryInfo?.khoroo || '-'}</p>
                            <p><span className="text-slate-500">Хороолол:</span> {order.deliveryInfo?.khoroolol || '-'}</p>
                            <p><span className="text-slate-500">Давхар:</span> {order.deliveryInfo?.floor || '-'}</p>
                            <p><span className="text-slate-500">Байр:</span> {order.deliveryInfo?.building || '-'}</p>
                            <p><span className="text-slate-500">Тоот:</span> {order.deliveryInfo?.door || '-'}</p>
                            <p><span className="text-slate-500">Тайлбар:</span> {order.deliveryInfo?.comment || '-'}</p>
                            {/* Fallback for legacy single-field address */}
                            {order.deliveryInfo?.address && !order.deliveryInfo?.district && (
                                <p><span className="text-slate-500">Address:</span> {order.deliveryInfo.address}</p>
                            )}
                            <p><span className="text-slate-500">Payment:</span> {order.paymentMethod || '-'}</p>
                            {Array.isArray(order.paymentBreakdown) && order.paymentBreakdown.length > 0 && (
                                <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                                    <p className="text-xs font-semibold text-slate-600">
                                        Payment breakdown
                                        {order.paymentMode === 'split-gold' && ' (split by store)'}
                                        {order.paymentMode === 'mixed' && ' (gold direct + platform)'}
                                    </p>
                                    {order.paymentBreakdown.map((pb) => (
                                        <div key={pb.key} className="flex items-center justify-between text-xs gap-2">
                                            <div className="min-w-0 flex items-center gap-1.5">
                                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${pb.paid ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                <span className="truncate">
                                                    {pb.mode === 'gold' ? '👑 ' : ''}{pb.storeName}
                                                </span>
                                                {(isSuperAdmin || staffStoreId && pb.storeIds?.includes(staffStoreId)) && pb.invoiceId && (
                                                    <span className="text-[10px] text-slate-400 font-mono">#{pb.invoiceId.slice(-6)}</span>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="font-semibold">{formatCurrency(pb.amount || 0)}</span>
                                                <span className={`ml-1.5 text-[10px] ${pb.paid ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {pb.paid ? 'paid' : 'unpaid'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Amount</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-2">
                            {isSuperAdmin && groupedOrders.length > 1 ? (
                                <>
                                    {groupedOrders.map((o) => {
                                        const st = adminUsers.find((u) => u.storeId === o.storeId)
                                        return (
                                            <div key={o.id} className="border border-slate-100 rounded-lg p-2 space-y-1">
                                                <p className="text-xs font-semibold text-slate-700">{st?.storeName || o.storeId}</p>
                                                <div className="flex justify-between text-xs"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(o.subtotal || 0)}</span></div>
                                                {o.discount > 0 && <div className="flex justify-between text-xs"><span className="text-slate-500">Discount</span><span className="text-emerald-600">-{formatCurrency(o.discount)}</span></div>}
                                                <div className="flex justify-between text-xs"><span className="text-slate-500">Delivery</span><span>{formatCurrency(o.delivery || 0)}</span></div>
                                                <div className="flex justify-between text-xs font-semibold"><span>Total</span><span>{formatCurrency(o.total || 0)}</span></div>
                                            </div>
                                        )
                                    })}
                                    <Separator />
                                    <div className="flex justify-between font-semibold text-base">
                                        <span>Grand Total</span>
                                        <span>{formatCurrency(grandTotal)}</span>
                                    </div>
                                </>
                            ) : !isSuperAdmin && staffStoreId && order.storeBreakdown?.length ? (
                                (() => {
                                    const br = order.storeBreakdown.find((b) => b.storeId === staffStoreId)
                                    if (!br) {
                                        return (
                                            <>
                                                <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.total || 0)}</span></div>
                                            </>
                                        )
                                    }
                                    return (
                                        <>
                                            <p className="text-xs text-slate-500 mb-2">Your store's portion of this order</p>
                                            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(br.subtotal || 0)}</span></div>
                                            {br.discount > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Discount</span>
                                                    <span className="text-emerald-600">-{formatCurrency(br.discount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{formatCurrency(br.delivery || 0)}</span></div>
                                            <Separator />
                                            <div className="flex justify-between font-semibold"><span>Your total</span><span>{formatCurrency(br.total || 0)}</span></div>
                                        </>
                                    )
                                })()
                            ) : (
                                <>
                                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(order.subtotal || 0)}</span></div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Discount</span>
                                        <span className="text-emerald-600">-{formatCurrency(order.discount || 0)}</span>
                                    </div>
                                    {order.discountCode && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Promo Code</span>
                                            <Badge variant="outline" className="font-mono text-xs">{order.discountCode}</Badge>
                                        </div>
                                    )}
                                    <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{formatCurrency(order.delivery || 0)}</span></div>
                                    <Separator />
                                    <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.total || 0)}</span></div>
                                </>
                            )}

                            {/* Super Bunny earnings row - SuperAdmin only */}
                            {isSuperAdmin && superBunnyEarnings && (
                                <>
                                    <Separator />
                                    <div className="rounded-lg border-2 border-[#D66B3E]/30 bg-[#D66B3E]/5 p-3 space-y-2">
                                        <p className="text-xs font-bold text-[#D66B3E] flex items-center gap-1.5">
                                            <Carrot size={14} />
                                            Super Bunny (SuperAdmin)
                                        </p>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Order Total</span>
                                            <span>{formatCurrency(superBunnyEarnings.totalOrderAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">QPay 1%</span>
                                            <span className="text-slate-500">({formatCurrency(superBunnyEarnings.qpayFee)})</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Гүйлгээ хураамж</span>
                                            <span className="text-slate-500">({formatCurrency(superBunnyEarnings.qpayFlatFee)})</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Tier шимтгэл (нийт дүнгээс)</span>
                                            <span className="text-red-600">({formatCurrency(superBunnyEarnings.totalCommission)})</span>
                                        </div>
                                        {superBunnyEarnings.perStore.map((ps) => (
                                            <div key={ps.storeId} className="flex justify-between text-xs">
                                                <span className="text-slate-500">{ps.storeName} ({ps.commissionPercent}%)</span>
                                                <span className="text-slate-500">({formatCurrency(ps.storeCommission)})</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Store Payout Total</span>
                                            <span>{formatCurrency(superBunnyEarnings.totalPayout)}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between font-bold text-sm">
                                            <span className="text-[#D66B3E]">Super Bunny Earnings</span>
                                            <span className="text-[#D66B3E]">{formatCurrency(superBunnyEarnings.superBunnyTotal)}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Store owner price breakdown */}
                    {!isSuperAdmin && staffStoreId && storeOwnerEarnings && (
                        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-blue-50/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-indigo-700">
                                    <TrendingUp size={16} />
                                    Орлогын задаргаа
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Захиалгын дүн</span>
                                    <span>{formatCurrency(storeOwnerEarnings.storeTotal)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">QPay шимтгэл (1%)</span>
                                    <span className="text-slate-500">−{formatCurrency(storeOwnerEarnings.qpayFee)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Гүйлгээ хураамж</span>
                                    <span className="text-slate-500">−{formatCurrency(storeOwnerEarnings.qpayFlatFee)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Платформ шимтгэл ({storeOwnerEarnings.commissionPercent}%)</span>
                                    <span className="text-slate-500">−{formatCurrency(storeOwnerEarnings.platformFee)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold text-sm">
                                    <span className="text-indigo-700">Танд шилжих дүн</span>
                                    <span className="text-indigo-700">{formatCurrency(storeOwnerEarnings.payout)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 4th Card: SuperAdmin gain per store */}
                    {isSuperAdmin && superBunnyEarnings && (
                        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-green-50/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-emerald-700">
                                    <TrendingUp size={16} />
                                    SuperAdmin Gain
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-3">
                                {superBunnyEarnings.perStore.map((ps) => (
                                    <div key={ps.storeId} className="border border-emerald-100 rounded-lg p-2.5 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center">
                                                    <Store size={12} className="text-slate-600" />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-700">{ps.storeName}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">{ps.tier} · {ps.commissionPercent}%</Badge>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Store total</span>
                                            <span>{formatCurrency(ps.storeTotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">QPay share</span>
                                            <span>{formatCurrency(ps.qpayShare)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Гүйлгээ хураамж</span>
                                            <span>{formatCurrency(ps.flatFeeShare)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Tier шимтгэл ({ps.commissionPercent}%)</span>
                                            <span className="text-red-600">({formatCurrency(ps.storeCommission)})</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold text-blue-700">
                                            <span>Send to store owner</span>
                                            <span>{formatCurrency(ps.storePayout)}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-500">Bank account</span>
                                            <span className="font-mono text-slate-700">{ps.bankAccount || 'Not set'}</span>
                                        </div>
                                    </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-emerald-700">Total Earned</span>
                                    <span className="text-xl font-bold text-emerald-600">{formatCurrency(superBunnyEarnings.totalCommission)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Order Chat */}
                    <OrderChatCard
                        orderId={order.id}
                        currentUserId={state.auth?.uid || session?.id || ''}
                        currentUserRole="store"
                        unreadCount={order.unreadByStore || 0}
                    />
                </div>
            </div>
        </div>
    )
}
