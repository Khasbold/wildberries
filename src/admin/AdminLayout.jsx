import { Link, NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, Package, Users, Tags, Store, LogOut, Shield, Ticket } from 'lucide-react'
import { Button } from './components/ui/Button.jsx'
import { useSession } from '../modules/state/useSession.js'
import { Badge } from './components/ui/Badge.jsx'

const superAdminMenu = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/store-owners', label: 'Store Owners', icon: Store },
    { to: '/admin/orders', label: 'All Orders', icon: ShoppingBag },
    { to: '/admin/products', label: 'All Products', icon: Package },
    { to: '/admin/discounts', label: 'All Discounts', icon: Ticket },
    { to: '/admin/categories', label: 'Categories', icon: Tags },
    { to: '/admin/customers', label: 'Customers', icon: Users },
]

const storeAdminMenu = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { to: '/admin/products', label: 'Products', icon: Package },
    { to: '/admin/discounts', label: 'Discounts', icon: Ticket },
    { to: '/admin/categories', label: 'Categories', icon: Tags },
    { to: '/admin/customers', label: 'Customers', icon: Users },
]

export default function AdminLayout({ children }) {
    const { session, isSuperAdmin, logout } = useSession()
    const menu = isSuperAdmin ? superAdminMenu : storeAdminMenu

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="h-14 border-b border-slate-200 bg-white px-4 lg:px-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">WB</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-slate-900 leading-tight">
                            {isSuperAdmin ? 'SuperAdmin Panel' : session?.storeName || 'Admin'}
                        </h1>
                        <p className="text-[11px] text-slate-400 leading-tight">
                            {isSuperAdmin ? 'Platform Management' : 'Store Dashboard'}
                        </p>
                    </div>
                    {isSuperAdmin && (
                        <Badge variant="default" className="ml-2 text-[10px]">
                            <Shield size={10} className="mr-1" />
                            SuperAdmin
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right mr-2 hidden sm:block">
                        <p className="text-xs font-medium text-slate-700">{session?.name}</p>
                        <p className="text-[10px] text-slate-400">@{session?.username}</p>
                    </div>
                    <Link to="/">
                        <Button variant="outline" size="sm">Back to Store</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <LogOut size={14} className="mr-1" />
                        Logout
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 p-4 lg:p-6">
                <aside className="rounded-xl border border-slate-200 bg-white p-2 h-max shadow-sm">
                    {/* Store info for store admins */}
                    {!isSuperAdmin && session?.storeName && (
                        <div className="mb-3 mx-1 p-3 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                    {session.storeName[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{session.storeName}</p>
                                    <p className="text-[10px] text-slate-500">{session.storeId}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <nav className="space-y-0.5">
                        {menu.map((item) => {
                            const Icon = item.icon
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end || false}
                                    className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </NavLink>
                            )
                        })}
                    </nav>
                </aside>
                <main>{children}</main>
            </div>
        </div>
    )
}
