import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from '../modules/state/useSession.js'
import AdminLayout from './AdminLayout.jsx'
import LoginPage from './LoginPage.jsx'
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx'
import StoreOwnersPage from './pages/StoreOwnersPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import OrdersAdminPage from './pages/OrdersAdminPage.jsx'
import OrderDetailsAdminPage from './pages/OrderDetailsAdminPage.jsx'
import ProductsAdminPage from './pages/ProductsAdminPage.jsx'
import CategoriesAdminPage from './pages/CategoriesAdminPage.jsx'
import CustomersAdminPage from './pages/CustomersAdminPage.jsx'
import DiscountsPage from './pages/DiscountsPage.jsx'
import TierListPage from './pages/TierListPage.jsx'
import HighlightsAdminPage from './pages/HighlightsAdminPage.jsx'
import BannerAdminPage from './pages/BannerAdminPage.jsx'

export default function AdminApp() {
    const { isLoggedIn, isSuperAdmin } = useSession()

    if (!isLoggedIn) {
        return <LoginPage />
    }

    return (
        <AdminLayout>
            <Routes>
                {isSuperAdmin ? (
                    <>
                        <Route index element={<SuperAdminDashboard />} />
                        <Route path="store-owners" element={<StoreOwnersPage />} />
                        <Route path="orders" element={<OrdersAdminPage />} />
                        <Route path="orders/:orderId" element={<OrderDetailsAdminPage />} />
                        <Route path="products" element={<ProductsAdminPage />} />
                        <Route path="categories" element={<CategoriesAdminPage />} />
                        <Route path="customers" element={<CustomersAdminPage />} />
                        <Route path="discounts" element={<DiscountsPage />} />
                        <Route path="tier-list" element={<TierListPage />} />
                        <Route path="highlights" element={<HighlightsAdminPage />} />
                        <Route path="banners" element={<BannerAdminPage />} />
                    </>
                ) : (
                    <>
                        <Route index element={<DashboardPage />} />
                        <Route path="orders" element={<OrdersAdminPage />} />
                        <Route path="orders/:orderId" element={<OrderDetailsAdminPage />} />
                        <Route path="products" element={<ProductsAdminPage />} />
                        <Route path="categories" element={<CategoriesAdminPage />} />
                        <Route path="customers" element={<CustomersAdminPage />} />
                        <Route path="discounts" element={<DiscountsPage />} />
                        <Route path="tier-list" element={<TierListPage />} />
                    </>
                )}
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
        </AdminLayout>
    )
}
