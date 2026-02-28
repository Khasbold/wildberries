import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAdmin, ORDER_STATUSES } from '../../modules/state/useAdmin.js'
import { Button } from '../components/ui/Button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/DropdownMenu.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/Select.jsx'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs.jsx'
import { Separator } from '../components/ui/Separator.jsx'

/* ─── helpers ─── */

function fmt(n) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(n || 0))
  } catch {
    return `${Math.round(Number(n || 0))} ₽`
  }
}

function toBucket(status) {
  if (status === 'Delivered' || status === 'Completed') return 'Completed'
  if (status === 'Cancelled') return 'Cancelled'
  if (status === 'Refunded') return 'Refunded'
  return 'Pending'
}

function statusDot(s) {
  if (s === 'Delivered' || s === 'Completed') return 'bg-emerald-500'
  if (s === 'Cancelled') return 'bg-rose-500'
  if (s === 'Accepted') return 'bg-amber-500'
  return 'bg-slate-400'
}

const STATUS_VARIANT = {
  'Создан': 'muted',
  Accepted: 'warning',
  Delivered: 'success',
  Cancelled: 'danger',
  Refunded: 'outline',
}

function statusVariant(s) { return STATUS_VARIANT[s] || 'muted' }

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

function getSortValue(order, key, products) {
  switch (key) {
    case 'order': return order.id
    case 'customer': return (order.customer?.name || '').toLowerCase()
    case 'phone': return order.customer?.phone || ''
    case 'date': return new Date(order.createdAt).getTime()
    case 'qty': return order.items.reduce((s, l) => s + Number(l.quantity || 0), 0)
    case 'unit': {
      const q = order.items.reduce((s, l) => s + Number(l.quantity || 0), 0)
      return q ? Number(order.total || 0) / q : 0
    }
    case 'total': return Number(order.total || 0)
    case 'status': return order.status
    default: return ''
  }
}

/* ─── component ─── */

export default function OrdersAdminPage() {
  const { orders, products, updateOrderStatus, deleteOrder, clearOrders, resetOrders } = useAdmin()

  const [expandedOrder, setExpandedOrder] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => { setPage(1) }, [activeTab, query, startDate, endDate, rowsPerPage])

  const tabs = ['All', 'Pending', 'Completed', 'Cancelled', 'Refunded']
  const counts = useMemo(() => {
    const r = { All: orders.length, Pending: 0, Completed: 0, Cancelled: 0, Refunded: 0 }
    for (const o of orders) r[toBucket(o.status)] += 1
    return r
  }, [orders])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab !== 'All' && toBucket(o.status) !== activeTab) return false
      const txt = `${o.id} ${o.customer?.name || ''} ${o.customer?.email || ''} ${o.customer?.phone || ''}`.toLowerCase()
      if (query.trim() && !txt.includes(query.trim().toLowerCase())) return false
      const d = new Date(o.createdAt)
      if (startDate && d < new Date(startDate)) return false
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); if (d > e) return false }
      return true
    })
  }, [orders, activeTab, query, startDate, endDate])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const arr = [...filtered]
    arr.sort((a, b) => {
      const va = getSortValue(a, sortKey, products)
      const vb = getSortValue(b, sortKey, products)
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return arr
  }, [filtered, sortKey, sortDir, products])

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

  function SortIcon({ colKey }) {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="ml-1 opacity-30" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="ml-1 text-slate-900" />
      : <ArrowDown size={12} className="ml-1 text-slate-900" />
  }

  function qty(o) { return o.items.reduce((s, l) => s + Number(l.quantity || 0), 0) }
  function unitPrice(o) { const q = qty(o); return q ? Number(o.total || 0) / q : 0 }
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
      const d = new Date(o.createdAt)
      return {
        '#': i + 1,
        'Order ID': o.id,
        'Customer': o.customer?.name || '—',
        'Email': o.customer?.email || '—',
        'Phone': o.customer?.phone || '—',
        'Date': d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        'Time': d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }),
        'Qty': qty(o),
        'Unit Price': Math.round(unitPrice(o) * 100) / 100,
        'Total': Number(o.total || 0),
        'Discount': Number(o.discount || 0),
        'Promo Code': o.discountCode || '',
        'Status': o.status,
        'City': o.deliveryInfo?.city || '',
        'Address': o.deliveryInfo?.address || '',
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
    Pending: 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800',
    Completed: 'data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800',
    Cancelled: 'data-[state=active]:bg-rose-100 data-[state=active]:text-rose-800',
    Refunded: 'data-[state=active]:bg-slate-200 data-[state=active]:text-slate-700',
  }

  const TAB_BADGE_COLORS = {
    All: '',
    Pending: 'border-amber-300 text-amber-700',
    Completed: 'border-emerald-300 text-emerald-700',
    Cancelled: 'border-rose-300 text-rose-700',
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
            <Button variant="outline" size="sm" onClick={resetOrders}>Reset 25 mock</Button>
            <Button variant="destructive" size="sm" onClick={clearOrders}>Clear all</Button>
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
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[160px_160px_1fr]">
          <div className="relative">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pr-9 text-xs" />
            <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pr-9 text-xs" />
            <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or order number…" className="pl-8 text-xs" />
          </div>
        </div>
      </CardHeader>

      {/* ─── Table ─── */}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={11} className="h-24 text-center text-slate-400">No orders match your filters.</TableCell>
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
                        <span>{fmt(order.total)}</span>
                        {order.discountCode && (
                          <span className="ml-1.5 inline-flex items-center font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold">
                            {order.discountCode}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
                              <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                              <ChevronDown size={12} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {ORDER_STATUSES.map((s) => (
                              <DropdownMenuItem key={s} onSelect={() => updateOrderStatus(order.id, s)} className={s === order.status ? 'font-semibold' : ''}>
                                <span className={`mr-2 h-1.5 w-1.5 rounded-full ${statusDot(s)}`} />
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedOrder((p) => (p === order.id ? null : order.id))}>
                            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </Button>
                          <Link to={`/admin/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">View</Button>
                          </Link>
                          <Button variant="destructive" size="sm" className="h-7 px-2 text-xs" onClick={() => deleteOrder(order.id)}>Del</Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={11} className="bg-slate-50/50 px-4 py-3">
                          <div className="space-y-1.5">
                            {order.discountCode && (
                              <div className="flex items-center gap-2 mb-2 text-xs">
                                <span className="text-slate-500">Promo code:</span>
                                <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{order.discountCode}</span>
                                <span className="text-emerald-600 font-medium">−{fmt(order.discount || 0)}</span>
                              </div>
                            )}
                            {order.items.map((line) => {
                              const prod = products.find((p) => p.id === line.productId)
                              const lt = Number(prod?.price || up) * Number(line.quantity || 0)
                              return (
                                <div key={`${order.id}-${line.productId}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
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
