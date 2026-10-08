import { useAdmin } from '../../modules/state/useAdmin.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table.jsx'

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
                            <TableHead>Address</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead>Total spent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.customers.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No customers yet.</TableCell></TableRow>
                        ) : (
                            stats.customers.map((customer) => (
                                <TableRow key={customer.key}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell className="max-w-[180px] truncate" title={customer.address}>{customer.address}</TableCell>
                                    <TableCell>{customer.ordersCount}</TableCell>
                                    <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
