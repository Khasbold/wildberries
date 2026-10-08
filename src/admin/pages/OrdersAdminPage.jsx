import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Filter, Search, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAdmin } from '../../modules/state/useAdmin.js'
import { useSession } from '../../modules/state/useSession.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/DropdownMenu.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/Select.jsx'
import { Checkbox } from '../components/ui/Checkbox.jsx'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs.jsx'
import { Separator } from '../components/ui/Separator.jsx'

import { formatCurrency as fmt } from '../../utils/formatCurrency.js'
import { toDate } from '../../utils/dateUtils.js'
import { itemsForStore, storeSliceTotals, deriveStoreFulfillmentStatus, storePortionTotal } from '../../utils/orderFulfillment.js'

function toBucket(order, deriveAggregateStatus, isSuperAdmin, storeId) {
  const agg = deriveAggregateStatus(order)
  if (agg === 'Bunny') return 'Bunny'
  if (order.refundStatus === 'Refunded' || agg === 'Refunded') return 'Refunded'
  if (order.refundStatus === 'Requested') return 'Refund'
  if (!isSuperAdmin && storeId) {
    const storeStatus = deriveStoreFulfillmentStatus(order, storeId)
    if (storeStatus === 'Bunny') return 'Bunny'
    if (storeStatus === 'Delivered') return 'Delivered'
    if (storeStatus === 'shipped') return 'shipped'
    if (storeStatus === 'Accepted') return 'Accepted'
    return 'New'
  }
  if (agg === 'Delivered') return 'Delivered'
  if (agg === 'Accepted') return 'Accepted'
  // Check for shipped in fulfillments
  const fMap = order.fulfillments || {}
  const hasShipped = Object.values(fMap).some((f) => f?.status === 'shipped')
  if (hasShipped) return 'shipped'
  return 'New'
}

function statusDot(agg) {
  if (agg === 'Bunny') return 'bg-[#D66B3E]'
  if (agg === 'Delivered') return 'bg-emerald-500'
  if (agg === 'Refunded') return 'bg-slate-500'
  if (agg === 'Accepted') return 'bg-blue-500'
  return 'bg-slate-400'
}

const STATUS_VARIANT = {
  Accepted: 'accepted',
  Delivered: 'delivered',
  Bunny: 'bunny',
  New: 'muted',
  Refunded: 'refunded',
}

function statusVariant(agg) { return STATUS_VARIANT[agg] || 'muted' }

const ROWS_OPTIONS = ['5', '10', '25', '50']

/* ─── sortable columns config ─── */
const SORTABLE_COLUMNS = [
  { key: 'order', label: 'Order' },
  { key: 'customer', label: 'Customer' },
  { key: 'phone', label: 'Phone' },
  { key: 'date', label: 'Date' },
  { key: 'qty', label: 'Qty', align: 'right' },
  { key: 'unit', label: 'Unit', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'status', label: 'Status' },
]

function getSortValue(order, key, products, deriveAggregateStatus, isSuperAdmin, storeId) {
  const slice = !isSuperAdmin && storeId ? storeSliceTotals(order, storeId) : null
  const lines = !isSuperAdmin && storeId ? itemsForStore(order, storeId) : order.items || []
  switch (key) {
    case 'order': return order.id
    case 'customer': return (order.customer?.name || '').toLowerCase()
    case 'phone': return order.customer?.phone || ''
    case 'date': return new Date(order.createdAt).getTime()
    case 'qty': return lines.reduce((s, l) => s + Number(l.quantity || 0), 0)
    case 'unit': {
      const q = lines.reduce((s, l) => s + Number(l.quantity || 0), 0)
      let tot = slice ? slice.total : Number(order.total || 0)
      if (slice && tot <= 0) tot = storePortionTotal(order, storeId, products)
      return q ? tot / q : 0
    }
    case 'total': return slice ? slice.total : Number(order.total || 0)
    case 'status': {
      if (!isSuperAdmin && storeId) return deriveStoreFulfillmentStatus(order, storeId)
      return deriveAggregateStatus(order)
    }
    default: return ''
  }
}

/* ─── component ─── */

export default function OrdersAdminPage() {
  const { orders, products, updateOrderStatus, deleteOrder, clearOrders, isSuperAdmin, storeId, deriveAggregateStatus, storeOwnerAcceptFulfillment, storeOwnerMarkShipped, storeOwnerMarkDelivered, storeOwnerRequestRefund } = useAdmin()
  const { tier } = useSession()

  const [expandedOrder, setExpandedOrder] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [query, setQuery] = useState('')
  // Default date range: start of month to end of month for store owners
  const [startDate, setStartDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    }
    return ''
  })
  const [endDate, setEndDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    }
    return ''
  })
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [filterProductId, setFilterProductId] = useState('__all__')
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => { setPage(1) }, [activeTab, query, startDate, endDate, filterProductId, rowsPerPage])
  useEffect(() => { setSelectedIds(new Set()) }, [activeTab, query, startDate, endDate, filterProductId])

  const tabs = ['All', 'New', 'Accepted', 'shipped', 'Delivered', 'Bunny', 'Refund', 'Refunded']
  const counts = useMemo(() => {
    const r = { All: orders.length, New: 0, Accepted: 0, shipped: 0, Delivered: 0, Bunny: 0, Refund: 0, Refunded: 0 }
    for (const o of orders) {
      r[toBucket(o, deriveAggregateStatus, isSuperAdmin, storeId)] += 1
    }
    return r
  }, [orders, deriveAggregateStatus, isSuperAdmin, storeId])

  const baseFiltered = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab !== 'All' && toBucket(o, deriveAggregateStatus, isSuperAdmin, storeId) !== activeTab) return false
      const txt = `${o.id} ${o.customer?.name || ''} ${o.customer?.email || ''} ${o.customer?.phone || ''}`.toLowerCase()
      if (query.trim() && !txt.includes(query.trim().toLowerCase())) return false
      const d = new Date(o.createdAt)
      if (startDate && d < new Date(startDate)) return false
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); if (d > e) return false }
      return true
    })
  }, [orders, activeTab, query, startDate, endDate, deriveAggregateStatus, isSuperAdmin, storeId])

  const productOptions = useMemo(() => {
    const map = new Map()
    for (const o of baseFiltered) {
      const lines = !isSuperAdmin && storeId ? itemsForStore(o, storeId) : (o.items || [])
      for (const l of lines) {
        if (!map.has(l.productId)) {
          const p = products.find((pr) => pr.id === l.productId)
          map.set(l.productId, p?.title || l.productId)
        }
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [baseFiltered, isSuperAdmin, storeId, products])

  // reset product filter if the selected product is no longer in the visible list
  useEffect(() => {
    if (filterProductId !== '__all__' && !productOptions.some(([id]) => id === filterProductId)) {
      setFilterProductId('__all__')
    }
  }, [productOptions, filterProductId])

  const filtered = useMemo(() => {
    if (filterProductId === '__all__') return baseFiltered
    return baseFiltered.filter((o) => {
      const lines = !isSuperAdmin && storeId ? itemsForStore(o, storeId) : (o.items || [])
      return lines.some((l) => l.productId === filterProductId)
    })
  }, [baseFiltered, filterProductId, isSuperAdmin, storeId])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const arr = [...filtered]
    arr.sort((a, b) => {
      const va = getSortValue(a, sortKey, products, deriveAggregateStatus, isSuperAdmin, storeId)
      const vb = getSortValue(b, sortKey, products, deriveAggregateStatus, isSuperAdmin, storeId)
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return arr
  }, [filtered, sortKey, sortDir, products, deriveAggregateStatus, isSuperAdmin, storeId])

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage))
  const safePage = Math.min(page, totalPages)
  const pagedOrders = sorted.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)

  function toggleSort(key) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const allFilteredIds = useMemo(() => new Set(sorted.map((o) => o.id)), [sorted])
  const allSelected = allFilteredIds.size > 0 && [...allFilteredIds].every((id) => selectedIds.has(id))
  const someSelected = !allSelected && [...allFilteredIds].some((id) => selectedIds.has(id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allFilteredIds))
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkSuperAdminStatus(newStatus) {
    let count = 0
    for (const id of selectedIds) {
      const r = updateOrderStatus(id, newStatus, { isSuperAdmin: true })
      if (r?.ok !== false) count++
    }
    toast.success(`${count} order(s) updated to ${newStatus}`)
    setSelectedIds(new Set())
  }

  function handleBulkStoreAction(action) {
    let count = 0
    for (const id of selectedIds) {
      let r
      if (action === 'accept') r = storeOwnerAcceptFulfillment(id, storeId, { isSuperAdmin, staffStoreId: storeId })
      else if (action === 'shipped') r = storeOwnerMarkShipped(id, storeId, { isSuperAdmin, staffStoreId: storeId })
      else if (action === 'delivered') r = storeOwnerMarkDelivered(id, storeId, { isSuperAdmin, staffStoreId: storeId })
      else if (action === 'refund') r = storeOwnerRequestRefund(id, storeId, { isSuperAdmin, staffStoreId: storeId })
      if (r?.ok !== false) count++
    }
    const label = { accept: 'Accepted', shipped: 'Shipped', delivered: 'Delivered', refund: 'Refund Requested' }[action]
    toast.success(`${count} order(s): ${label}`)
    setSelectedIds(new Set())
  }

  function SortIcon({ colKey }) {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="ml-1 opacity-30" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="ml-1 text-slate-900" />
      : <ArrowDown size={12} className="ml-1 text-slate-900" />
  }

  function qty(o) {
    const lines = !isSuperAdmin && storeId ? itemsForStore(o, storeId) : (o.items || [])
    return lines.reduce((s, l) => s + Number(l.quantity || 0), 0)
  }
  function rowTotal(o) {
    if (!isSuperAdmin && storeId) return storePortionTotal(o, storeId, products)
    return Number(o.total || 0)
  }
  function unitPrice(o) { const q = qty(o); return q ? rowTotal(o) / q : 0 }
  function fmtDate(o) {
    const d = new Date(o.createdAt)
    return {
      day: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
    }
  }

  /* ─── Export to Excel ─── */
  function exportToExcel() {
    const rows = sorted.map((o, i) => {
      const d = toDate(o.createdAt)
      const di = o.deliveryInfo || {}
      const lines = !isSuperAdmin && storeId ? itemsForStore(o, storeId) : (o.items || [])
      const codes = lines
        .map((l) => { const p = products.find((pr) => pr.id === l.productId); return p?.productCode })
        .filter(Boolean)
      return {
        '#': i + 1,
        'Order ID': o.id,
        'Customer': o.customer?.name || '—',
        'Email': o.customer?.email || '—',
        'Phone': o.customer?.phone || '—',
        'Date': d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        'Time': d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }),
        'Code': codes.join(', '),
        'Qty': qty(o),
        'Unit Price': Math.round(unitPrice(o) * 100) / 100,
        'Total': rowTotal(o),
        'Discount': !isSuperAdmin && storeId ? storeSliceTotals(o, storeId).discount : Number(o.discount || 0),
        'Promo Code': o.discountCode || '',
        'Status': !isSuperAdmin && storeId ? deriveStoreFulfillmentStatus(o, storeId) : deriveAggregateStatus(o),
        'Хот': di.city || '',
        'Дүүрэг': di.district || '',
        'Хороо': di.khoroo || '',
        'Хороолол': di.khoroolol || '',
        'Давхар': di.floor || '',
        'Байр': di.building || '',
        'Тоот': di.door || '',
        'Тайлбар': di.comment || '',
        'Хаяг': [di.city, di.district, di.khoroo, di.khoroolol, di.floor ? `${di.floor} давхар` : '', di.building ? `${di.building} байр` : '', di.door ? `${di.door} тоот` : ''].filter(Boolean).join(', ') || di.address || '',
        'Payment': o.paymentMethod || '',
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    /* auto column widths */
    ws['!cols'] = Object.keys(rows[0] || {}).map((key) => {
      const maxLen = Math.max(key.length, ...rows.map((r) => String(r[key] || '').length))
      return { wch: Math.min(maxLen + 2, 30) }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, `orders_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const TAB_COLORS = {
    All: '',
    New: 'data-[state=active]:bg-slate-100 data-[state=active]:text-slate-800',
    Accepted: 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800',
    shipped: 'data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-800',
    Delivered: 'data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800',
    Bunny: 'data-[state=active]:bg-[#D66B3E]/15 data-[state=active]:text-[#D66B3E]',
    Refund: 'data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900',
    Refunded: 'data-[state=active]:bg-slate-200 data-[state=active]:text-slate-700',
  }

  const TAB_BADGE_COLORS = {
    All: '',
    New: 'border-slate-300 text-slate-700',
    Accepted: 'border-blue-300 text-blue-700',
    shipped: 'border-indigo-300 text-indigo-700',
    Delivered: 'border-emerald-300 text-emerald-700',
    Bunny: 'border-[#D66B3E]/40 text-[#D66B3E]',
    Refund: 'border-orange-300 text-orange-800',
    Refunded: 'border-slate-300 text-slate-600',
  }

  const canPrev = safePage > 1
  const canNext = safePage < totalPages

  return (
    <Card className="overflow-hidden">
      {/* ─── Header ─── */}
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle>Orders</CardTitle>
            <Badge variant="default" className="tabular-nums">{orders.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1.5">
              <Download size={14} />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab} className={TAB_COLORS[tab]}>
                {tab}
                <Badge variant="outline" className={`ml-1.5 text-[10px] px-1.5 py-0 ${TAB_BADGE_COLORS[tab]}`}>{counts[tab]}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[160px_160px_200px_1fr]">
          <div className="relative">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pr-9 text-xs" />
            <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pr-9 text-xs" />
            <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <Select value={filterProductId} onValueChange={setFilterProductId}>
            <SelectTrigger className="h-9 text-xs gap-1.5">
              <Filter size={12} className="shrink-0 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All products</SelectItem>
              {productOptions.map(([id, title]) => (
                <SelectItem key={id} value={id}>{title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or order number…" className="pl-8 text-xs" />
          </div>
        </div>
      </CardHeader>

      {/* ─── Bulk Action Bar ─── */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-blue-50 border-y border-blue-100">
          <span className="text-xs font-medium text-blue-700">{selectedIds.size} order{selectedIds.size > 1 ? 's' : ''} selected</span>
          <span className="text-blue-200">|</span>
          {isSuperAdmin ? (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkSuperAdminStatus('Accepted')}>Accepted</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkSuperAdminStatus('Delivered')}>Delivered</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkSuperAdminStatus('Refunded')}>Refunded</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkSuperAdminStatus('Bunny')}>🐰 Bunny</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkStoreAction('accept')}>Accept</Button>
              {tier === 'gold' && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkStoreAction('shipped')}>Shipped</Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkStoreAction('delivered')}>Delivered</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkStoreAction('refund')}>Refund</Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="ml-auto h-7 w-7 p-0 text-slate-400" onClick={() => setSelectedIds(new Set())}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* ─── Table ─── */}
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[850px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={someSelected ? 'indeterminate' : allSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-10">#</TableHead>
              {SORTABLE_COLUMNS.map((col) => (
                <TableHead key={col.key} className={`cursor-pointer select-none ${col.align === 'right' ? 'text-right' : ''}`} onClick={() => toggleSort(col.key)}>
                  <span className="inline-flex items-center">
                    {col.label}
                    <SortIcon colKey={col.key} />
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-slate-400">No orders match your filters.</TableCell>
              </TableRow>
            ) : (
              pagedOrders.map((order, idx) => {
                const q = qty(order)
                const up = unitPrice(order)
                const d = fmtDate(order)
                const expanded = expandedOrder === order.id
                const rowNum = (safePage - 1) * rowsPerPage + idx + 1

                return (
                  <Fragment key={order.id}>
                    <TableRow>
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums text-xs text-slate-400">{rowNum}</TableCell>
                      <TableCell>
                        <Link to={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                          {order.id.replace('ORD-', '#')}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{order.customer?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{order.customer?.email || '—'}</p>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{order.customer?.phone || '—'}</TableCell>
                      <TableCell>
                        <p className="text-sm">{d.day}</p>
                        <p className="text-xs text-slate-400">{d.time}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{q}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(up)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <span>{fmt(rowTotal(order))}</span>
                        {order.discountCode && (
                          <span className="ml-1.5 inline-flex items-center font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold">
                            {order.discountCode}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const agg = !isSuperAdmin && storeId
                            ? deriveStoreFulfillmentStatus(order, storeId)
                            : deriveAggregateStatus(order)
                          const label = order.refundStatus === 'Requested' && deriveAggregateStatus(order) !== 'Refunded'
                            ? `${agg} · Refund requested`
                            : agg
                          return isSuperAdmin ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 max-w-[200px]">
                                  <Badge variant={statusVariant(agg)} className="truncate">{label}</Badge>
                                  <ChevronDown size={12} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    const r = updateOrderStatus(order.id, 'Refunded', { isSuperAdmin: true })
                                    if (r?.ok === false) toast.error(r.error === 'use_order_detail' ? 'Open order detail for per-store actions.' : 'Could not update')
                                    else toast.success('Marked refunded (after you return funds to the customer).')
                                  }}
                                >
                                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                                  Refunded (money returned)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    const r = updateOrderStatus(order.id, 'Delivered', { isSuperAdmin: true })
                                    if (r?.ok === false) toast.error('Could not mark delivered')
                                    else toast.success('All store lines marked delivered')
                                  }}
                                >
                                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Delivered (all stores)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    const r = updateOrderStatus(order.id, 'Bunny', { isSuperAdmin: true })
                                    if (r?.ok === false) toast.error('Could not mark Bunny')
                                    else toast.success('🐰 Order fully completed (Bunny)')
                                  }}
                                >
                                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#D66B3E]" />
                                  🐰 Bunny (fully completed)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 max-w-[200px]">
                                  <Badge variant={statusVariant(agg)} className="truncate">{label}</Badge>
                                  <ChevronDown size={12} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                {agg === 'New' && (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      const r = storeOwnerAcceptFulfillment(order.id, storeId, { isSuperAdmin, staffStoreId: storeId })
                                      if (!r.ok) toast.error('Cannot accept')
                                      else toast.success('Accepted')
                                    }}
                                  >
                                    <span className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    Хүлээн авах (Accept)
                                  </DropdownMenuItem>
                                )}
                                {tier === 'gold' && agg === 'Accepted' && (() => {
                                  const allProducts = products
                                  const orderItems = order.items || []
                                  const hasCustom = orderItems.some((i) => {
                                    const p = allProducts.find((pp) => pp.id === i.productId)
                                    return p?.productType === 'order'
                                  })
                                  return hasCustom
                                })() && (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      const r = storeOwnerMarkShipped(order.id, storeId, { isSuperAdmin, staffStoreId: storeId })
                                      if (!r.ok) toast.error('Cannot mark shipped')
                                      else toast.success('Илгээсэн гэж тэмдэглэв')
                                    }}
                                  >
                                    <span className="mr-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                    Илгээсэн (Shipped)
                                  </DropdownMenuItem>
                                )}
                                {agg !== 'Delivered' && agg !== 'Bunny' && agg !== 'New' && (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      const r = storeOwnerMarkDelivered(order.id, storeId, { isSuperAdmin, staffStoreId: storeId })
                                      if (!r.ok) toast.error('Cannot mark delivered')
                                      else toast.success('Хүргэгдсэн гэж тэмдэглэв')
                                    }}
                                  >
                                    <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Хүргэсэн (Delivered)
                                  </DropdownMenuItem>
                                )}
                                {agg !== 'Delivered' && agg !== 'Bunny' && (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      const r = storeOwnerRequestRefund(order.id, storeId, { isSuperAdmin, staffStoreId: storeId })
                                      if (!r.ok) toast.error('Could not request refund')
                                      else toast.success('Refund requested')
                                    }}
                                  >
                                    <span className="mr-2 h-1.5 w-1.5 rounded-full bg-orange-500" />
                                    Буцаалт хүсэх (Refund)
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        })()}
                        {/* Delivery method tag */}
                        {(() => {
                          const fMap = order.fulfillments || {}
                          const targetSid = !isSuperAdmin && storeId ? storeId : null
                          const entries = targetSid ? (fMap[targetSid] ? [fMap[targetSid]] : []) : Object.values(fMap)
                          const delivered = entries.filter((f) => f?.status === 'Delivered' || f?.status === 'Bunny')
                          if (delivered.length === 0) return null
                          const methods = [...new Set(delivered.map((f) => f.deliveryMethod).filter(Boolean))]
                          if (methods.length === 0) return null
                          return methods.map((m) => (
                            <span key={m} className={`ml-1 inline-block text-[9px] px-1.5 py-0.5 rounded font-semibold ${m === 'auto' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {m === 'auto' ? 'QR' : 'Гар'}
                            </span>
                          ))
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedOrder((p) => (p === order.id ? null : order.id))}>
                            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </Button>
                          <Link to={`/admin/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">View</Button>
                          </Link>
                          <Button variant="destructive" size="sm" className="h-7 px-2 text-xs" onClick={() => {
                            if (window.confirm(`Delete order ${order.id}?`)) {
                              deleteOrder(order.id)
                              toast.success(`Order ${order.id} deleted`, { position: 'top-right', autoClose: 2500 })
                            }
                          }}>Del</Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={12} className="bg-slate-50/50 px-4 py-3">
                          <div className="space-y-1.5">
                            {order.discountCode && (
                              <div className="flex items-center gap-2 mb-2 text-xs">
                                <span className="text-slate-500">Promo code:</span>
                                <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{order.discountCode}</span>
                                <span className="text-emerald-600 font-medium">−{fmt(order.discount || 0)}</span>
                              </div>
                            )}
                            {(isSuperAdmin ? order.items : itemsForStore(order, storeId)).map((line) => {
                              const prod = products.find((p) => p.id === line.productId)
                              const lt = Number(prod?.price || up) * Number(line.quantity || 0)
                              return (
                                <div key={`${order.id}-${line.productId}-${line.storeId || ''}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                  <img
                                    src={prod?.thumbnail || prod?.image || 'https://placehold.co/80x80?text=Item'}
                                    alt={prod?.title || line.productId}
                                    className="h-10 w-10 rounded-md object-cover"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{prod?.title || line.productId}</p>
                                    <p className="text-xs text-slate-400">{line.productId}</p>
                                  </div>
                                  <p className="text-xs text-slate-400">×{line.quantity}</p>
                                  <p className="text-sm font-medium tabular-nums">{fmt(lt)}</p>
                                </div>
                              )
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Separator />

      {/* ─── Pagination ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows per page</span>
          <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROWS_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs tabular-nums text-slate-500">
          {filtered.length === 0
            ? '0 of 0'
            : `${(safePage - 1) * rowsPerPage + 1}–${Math.min(safePage * rowsPerPage, filtered.length)} of ${filtered.length}`}
        </p>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={!canPrev} onClick={() => setPage(1)}>
            <ChevronsLeft size={14} />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={14} />
          </Button>
          <span className="min-w-[48px] text-center text-xs tabular-nums text-slate-500">{safePage} / {totalPages}</span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={!canNext} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight size={14} />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={!canNext} onClick={() => setPage(totalPages)}>
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </Card>
  )
}
