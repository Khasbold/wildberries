import { useSyncExternalStore } from 'react'
import { subscribe, getState, TIER_PLANS } from '../../modules/state/store.js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'
import { Carrot, ArrowRight, Crown } from 'lucide-react'

const tierBadgeClass = {
    free: 'bg-slate-200 text-slate-800',
    bronze: 'bg-amber-200 text-amber-900',
    silver: 'bg-gray-300 text-gray-800',
    gold: 'bg-yellow-200 text-yellow-900',
}

export default function CarrotsPage() {
    const state = useSyncExternalStore(subscribe, getState)
    const history = [...(state.tierChangeHistory || [])].sort(
        (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
    )

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Carrot size={22} className="text-orange-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Carrots — Tier Changes</h2>
                    <p className="text-sm text-slate-500">History of all store owner tier upgrades and downgrades</p>
                </div>
            </div>

            {history.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                        <Carrot size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No tier changes recorded yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Changes will appear here when a store owner's tier is updated.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Crown size={16} />
                            {history.length} tier change{history.length !== 1 ? 's' : ''}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Store Owner</TableHead>
                                    <TableHead>Store</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead></TableHead>
                                    <TableHead>To</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                            {new Date(entry.changedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            <br />
                                            <span className="text-slate-400">{new Date(entry.changedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">{entry.userName || '—'}</TableCell>
                                        <TableCell className="text-sm text-slate-600">{entry.storeName || '—'}</TableCell>
                                        <TableCell>
                                            <Badge className={tierBadgeClass[entry.fromTier] || tierBadgeClass.free}>
                                                {TIER_PLANS[entry.fromTier]?.name || entry.fromTier}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <ArrowRight size={14} className="text-slate-400" />
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={tierBadgeClass[entry.toTier] || tierBadgeClass.free}>
                                                {TIER_PLANS[entry.toTier]?.name || entry.toTier}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
