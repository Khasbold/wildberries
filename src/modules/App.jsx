import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './layout/Layout.jsx'
import HomePage from './home/HomePage.jsx'
import { SkeletonPage } from './layout/components/Skeleton.jsx'

const AdminApp = lazy(() => import('../admin/AdminApp.jsx'))
const CatalogPage = lazy(() => import('./catalog/CatalogPage.jsx'))
const ProductPage = lazy(() => import('./product/ProductPage.jsx'))
const WishlistPage = lazy(() => import('./wishlist/WishlistPage.jsx'))
const CartPage = lazy(() => import('./cart/CartPage.jsx'))
const CheckoutPage = lazy(() => import('./checkout/CheckoutPage.jsx'))
const AccountPage = lazy(() => import('./account/AccountPage.jsx'))
const OrdersPage = lazy(() => import('./orders/OrdersPage.jsx'))
const StoresPage = lazy(() => import('./stores/StoresPage.jsx'))
const StoreDetailPage = lazy(() => import('./stores/StoreDetailPage.jsx'))

function LazyRoute({ children }) {
	return (
		<Layout>
			<Suspense fallback={<SkeletonPage />}>
				{children}
			</Suspense>
		</Layout>
	)
}

export default function App() {
	return (
		<Routes>
			<Route path="/admin/*" element={
				<Suspense fallback={<SkeletonPage />}>
					<AdminApp />
				</Suspense>
			} />
			<Route path="/" element={<Layout><HomePage /></Layout>} />
			<Route path="/catalog" element={<LazyRoute><CatalogPage /></LazyRoute>} />
			<Route path="/stores" element={<LazyRoute><StoresPage /></LazyRoute>} />
			<Route path="/stores/:storeId" element={<LazyRoute><StoreDetailPage /></LazyRoute>} />
			<Route path="/:storeSlug/product/:id" element={<LazyRoute><ProductPage /></LazyRoute>} />
			<Route path="/product/:id" element={<LazyRoute><ProductPage /></LazyRoute>} />
			<Route path="/wishlist" element={<LazyRoute><WishlistPage /></LazyRoute>} />
			<Route path="/cart" element={<LazyRoute><CartPage /></LazyRoute>} />
			<Route path="/checkout" element={<LazyRoute><CheckoutPage /></LazyRoute>} />
			<Route path="/account" element={<LazyRoute><AccountPage /></LazyRoute>} />
			<Route path="/orders" element={<LazyRoute><OrdersPage /></LazyRoute>} />
		</Routes>
	)
}
