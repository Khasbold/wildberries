import { Routes, Route } from 'react-router-dom'
import Layout from './layout/Layout.jsx'
import HomePage from './home/HomePage.jsx'
import CatalogPage from './catalog/CatalogPage.jsx'
import ProductPage from './product/ProductPage.jsx'
import WishlistPage from './wishlist/WishlistPage.jsx'
import CartPage from './cart/CartPage.jsx'
import CheckoutPage from './checkout/CheckoutPage.jsx'
import AccountPage from './account/AccountPage.jsx'
import OrdersPage from './orders/OrdersPage.jsx'
import AdminApp from '../admin/AdminApp.jsx'

export default function App() {
	return (
		<Routes>
			<Route path="/admin/*" element={<AdminApp />} />
			<Route path="/" element={<Layout><HomePage /></Layout>} />
			<Route path="/catalog" element={<Layout><CatalogPage /></Layout>} />
			<Route path="/product/:id" element={<Layout><ProductPage /></Layout>} />
			<Route path="/wishlist" element={<Layout><WishlistPage /></Layout>} />
			<Route path="/cart" element={<Layout><CartPage /></Layout>} />
			<Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
			<Route path="/account" element={<Layout><AccountPage /></Layout>} />
			<Route path="/orders" element={<Layout><OrdersPage /></Layout>} />
		</Routes>
	)
} 