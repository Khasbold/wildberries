import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/init.js'
import { getStaffUserByFirebaseUser } from '../firebase/db.js'
import { setAdminSessionFromStaffProfile, clearAdminSession } from '../modules/state/store.js'
import { useSession } from '../modules/state/useSession.js'
import AdminLayout from './AdminLayout.jsx'
import LoginPage from './LoginPage.jsx'
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx'
import StoreOwnersPage from './pages/StoreOwnersPage.jsx'
import OrdersAdminPage from './pages/OrdersAdminPage.jsx'
import OrderDetailsAdminPage from './pages/OrderDetailsAdminPage.jsx'
import ProductsAdminPage from './pages/ProductsAdminPage.jsx'
import ProductEditorPage from './pages/ProductEditorPage.jsx'
import CategoriesAdminPage from './pages/CategoriesAdminPage.jsx'
import CustomersAdminPage from './pages/CustomersAdminPage.jsx'
import DiscountsPage from './pages/DiscountsPage.jsx'
import TierListPage from './pages/TierListPage.jsx'
import HighlightsAdminPage from './pages/HighlightsAdminPage.jsx'
import BannerAdminPage from './pages/BannerAdminPage.jsx'
import StoreProfilePage from './pages/StoreProfilePage.jsx'
import NotificationsAdminPage from './pages/NotificationsAdminPage.jsx'
import DeliveryScanPage from './pages/DeliveryScanPage.jsx'
import StoreWelcomePage from './pages/StoreWelcomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import CarrotsPage from './pages/CarrotsPage.jsx'
import FeedbacksAdminPage from './pages/FeedbacksAdminPage.jsx'
import InstructionsPage from './pages/InstructionsPage.jsx'
import MerchantManagementPage from './pages/MerchantManagementPage.jsx'

function useSyncAdminSessionWithFirebase() {
    const [authChecked, setAuthChecked] = useState(false)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                clearAdminSession()
                setAuthChecked(true)
                return
            }
            try {
                const staff = await getStaffUserByFirebaseUser(user)
                if (staff) {
                    if (staff.disabled) {
                        clearAdminSession()
                        await signOut(auth)
                    } else {
                        setAdminSessionFromStaffProfile(staff)
                    }
                } else clearAdminSession()
            } catch {
                clearAdminSession()
            } finally {
                setAuthChecked(true)
            }
        })
        return () => unsub()
    }, [])

    return authChecked
}

export default function AdminApp() {
    const authChecked = useSyncAdminSessionWithFirebase()
    const { isLoggedIn, isSuperAdmin } = useSession()

    if (!authChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F7E9D7]/40 text-slate-600 text-sm">
                Checking authorization…
            </div>
        )
    }

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
                        <Route path="products/new" element={<ProductEditorPage />} />
                        <Route path="products/:id/edit" element={<ProductEditorPage />} />
                        <Route path="categories" element={<CategoriesAdminPage />} />
                        <Route path="customers" element={<CustomersAdminPage />} />
                        <Route path="discounts" element={<DiscountsPage />} />
                        <Route path="tier-list" element={<TierListPage />} />
                        <Route path="highlights" element={<HighlightsAdminPage />} />
                        <Route path="banners" element={<BannerAdminPage />} />
                        <Route path="notifications" element={<NotificationsAdminPage />} />
                        <Route path="delivery-scan" element={<DeliveryScanPage />} />
                        <Route path="carrots" element={<CarrotsPage />} />
                        <Route path="feedbacks" element={<FeedbacksAdminPage />} />
                        <Route path="merchants" element={<MerchantManagementPage />} />
                    </>
                ) : (
                    <>
                        <Route index element={<StoreWelcomePage />} />
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="profile" element={<StoreProfilePage />} />
                        <Route path="orders" element={<OrdersAdminPage />} />
                        <Route path="orders/:orderId" element={<OrderDetailsAdminPage />} />
                        <Route path="products" element={<ProductsAdminPage />} />
                        <Route path="products/new" element={<ProductEditorPage />} />
                        <Route path="products/:id/edit" element={<ProductEditorPage />} />
                        <Route path="categories" element={<CategoriesAdminPage />} />
                        <Route path="customers" element={<CustomersAdminPage />} />
                        <Route path="discounts" element={<DiscountsPage />} />
                        <Route path="tier-list" element={<TierListPage />} />
                        <Route path="delivery-scan" element={<DeliveryScanPage />} />
                        <Route path="banners" element={<BannerAdminPage />} />
                        <Route path="instructions" element={<InstructionsPage />} />
                    </>
                )}
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
        </AdminLayout>
    )
}
