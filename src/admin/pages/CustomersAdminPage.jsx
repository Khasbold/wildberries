import { useAdmin } from '../../modules/state/useAdmin.js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'

function formatCurrencyRub(n) {
    try {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
    } catch {
        return `${Math.round(n)} ₽`
    }
}

export default function CustomersAdminPage() {
    const { stats } = useAdmin()

    return (
        <Card>
            <CardHeader>
                <CardTitle>Customers</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead>Total spent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.customers.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No customers yet.</TableCell></TableRow>
                        ) : (
                            stats.customers.map((customer) => (
                                <TableRow key={customer.key}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell>{customer.ordersCount}</TableCell>
                                    <TableCell>{formatCurrencyRub(customer.totalSpent)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
