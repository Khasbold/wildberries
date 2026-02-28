import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { products } from '../data/products.js'
import { useCart } from '../state/useCart.js'
import { useWishlist } from '../state/useWishlist.js'
import { FaHeart, FaRegHeart, FaShareAlt, FaChevronDown, FaStar, FaCheck, FaMinus, FaPlus } from 'react-icons/fa'
import { useI18n } from '../i18n/useI18n.js'

function formatCurrencyRub(n) {
	try {
		return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
	} catch {
		return `${Math.round(n)} ₽`
	}
}

export default function ProductPage() {
	const { t } = useI18n()
	const { id } = useParams()
	const product = useMemo(() => products.find((p) => p.id === id), [id])
	const { addToCart } = useCart()
	const { isInWishlist, toggleWishlist } = useWishlist()
	const [activeIdx, setActiveIdx] = useState(0)
	const [selectedColor, setSelectedColor] = useState(null)
	const [size, setSize] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [tab, setTab] = useState('desc')

	if (!product) return <div className="container-app py-8"><p>{t('product.notFound')}</p></div>

	const TABS = [
		{ key: 'desc', label: t('product.description') },
		{ key: 'specs', label: t('product.specs') },
		{ key: 'reviews', label: t('product.reviews') },
		{ key: 'questions', label: t('product.questions') },
	]

	const gallery = [
		{ type: 'image', src: product.image, thumb: product.thumbnail },
		{ type: 'video', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', thumb: product.thumbnail },
		{ type: 'image', src: product.thumbnail, thumb: product.thumbnail },
		{ type: 'image', src: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80', thumb: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=220&q=80' },
		{ type: 'image', src: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=400&q=80', thumb: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=220&q=80' },
		{ type: 'image', src: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80', thumb: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=220&q=80' },
	]
	const activeMedia = gallery[activeIdx]
	const oldPrice = Math.round(product.price * 3.2)
	const discount = Math.max(0, Math.round((1 - product.price / oldPrice) * 100))
	const wished = isInWishlist(product.id)
	const productColors = product.colors?.length ? product.colors : ['#000000']
	const productSizes = product.sizes?.length ? product.sizes : []
	const stockQty = product.stockQuantity ?? (product.inStock ? 10 : 0)
	const isAvailable = stockQty > 0

	const offers = products
		.filter((p) => p.category === product.category && p.id !== product.id)
		.slice(0, 3)

	return (
		<div className="container-app py-6">
			{/* Breadcrumbs */}
			<nav className="text-sm text-gray-500 mb-3 flex items-center gap-2">
				<Link to="/" className="hover:underline">{t('product.home')}</Link>
				<span>/</span>
				<Link to="/catalog" className="hover:underline">{t('common.catalog')}</Link>
				<span>/</span>
				<span className="text-gray-900">{product.title}</span>
			</nav>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
				{/* Left: thumbnails + main image */}
				<div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-[88px_1fr] gap-3">
					<div className="flex lg:flex-col gap-2 overflow-auto max-h-[70vh]">
						{gallery.map((media, idx) => (
							<button key={idx} onClick={() => setActiveIdx(idx)} className={`w-20 h-24 rounded-xl overflow-hidden border ${activeIdx === idx ? 'border-brand' : 'border-transparent'} shadow-sm`}>
								<div className="relative w-full h-full">
									<img src={media.thumb} alt="thumb" className="w-full h-full object-cover" />
									{media.type === 'video' && (
										<span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white text-xs font-semibold">▶</span>
									)}
								</div>
							</button>
						))}
					</div>
					<div className="rounded-2xl overflow-hidden border bg-white shadow-sm relative flex items-center justify-center min-h-[300px] sm:min-h-[60vh]">
						{discount > 0 && (
							<span className="absolute left-3 top-3 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">СКИДКИ ПОСПЕЛИ</span>
						)}
						{activeMedia.type === 'video' ? (
							<video
								src={activeMedia.src}
								className="w-full h-[320px] sm:h-[60vh] lg:h-[74vh] object-contain"
								controls
								autoPlay
								muted
								loop
								playsInline
							/>
						) : (
							<img src={activeMedia.src} alt={product.title} className="w-full h-[320px] sm:h-[60vh] lg:h-[74vh] object-contain" />
						)}
						<button className="absolute right-3 top-3 bg-white rounded-full p-2 shadow hover:bg-gray-100" onClick={() => toggleWishlist(product.id)}>
							{wished ? <FaHeart className="text-rose-500" /> : <FaRegHeart className="text-gray-400" />}
						</button>
						<button className="absolute right-3 bottom-3 bg-white rounded-full p-2 shadow hover:bg-gray-100">
							<FaShareAlt className="text-gray-500" />
						</button>
					</div>
				</div>

				{/* Right: product details panel */}
				<aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 self-start">
					<div className="rounded-2xl border bg-white shadow-sm p-5">
						{/* Stock status badge */}
						{!isAvailable && (
							<p className="text-sm font-semibold text-rose-600 uppercase tracking-wide mb-2">Out of stock</p>
						)}
						{isAvailable && stockQty <= 5 && (
							<p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">Only {stockQty} left</p>
						)}

						{/* Title */}
						<h1 className="text-xl font-bold text-gray-900 leading-snug mb-3">{product.title}</h1>

						{/* Rating & reviews */}
						<div className="flex items-center gap-1.5 mb-4">
							<div className="flex items-center gap-0.5">
								{[1, 2, 3, 4, 5].map((star) => (
									<FaStar
										key={star}
										className={`text-sm ${star <= Math.round(product.rating) ? 'text-amber-400' : 'text-gray-200'}`}
									/>
								))}
							</div>
							<span className="text-sm text-gray-500">({(product.rating * 430).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}k reviews)</span>
						</div>

						{/* Price */}
						<div className="flex items-baseline gap-3 mb-1">
							<p className="text-gray-400 line-through text-lg">${oldPrice.toFixed(2)}</p>
							<p className="text-2xl font-extrabold text-gray-900">${product.price.toFixed(2)}</p>
						</div>

						{/* Description */}
						<p className="text-sm text-gray-500 leading-relaxed mt-3 mb-5">
							{product.description || 'Featuring the original ripple design inspired by Japanese bullet trains, the Nike Air Max 97 lets you push your style full-speed ahead.'}
						</p>

						{/* Divider */}
						<div className="border-t border-gray-100 my-4" />

						{/* Color picker */}
						{productColors.length > 0 && (
							<div className="flex items-center justify-between mb-5">
								<p className="text-sm font-semibold text-gray-900">Color</p>
								<div className="flex items-center gap-2">
									{productColors.map((color) => {
										const isSelected = selectedColor === color || (!selectedColor && color === productColors[0])
										return (
											<button
												key={color}
												onClick={() => setSelectedColor(color)}
												className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'border-gray-900 ring-2 ring-gray-300' : 'border-transparent hover:border-gray-300'}`}
												style={{ backgroundColor: color }}
											>
												{isSelected && (
													<FaCheck className={`text-xs ${['#FFFFFF', '#FFF', '#fff', '#ffffff'].includes(color) ? 'text-gray-900' : 'text-white'}`} />
												)}
											</button>
										)
									})}
								</div>
							</div>
						)}

						{/* Divider */}
						{productColors.length > 0 && <div className="border-t border-gray-100 my-4" />}

						{/* Size dropdown */}
						{productSizes.length > 0 && (
							<div className="mb-5">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm font-semibold text-gray-900">Size</p>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="relative flex-1">
										<select
											value={size}
											onChange={(e) => setSize(e.target.value)}
											className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											<option value="">Select size</option>
											{productSizes.map((s) => <option key={s} value={s}>{s}</option>)}
										</select>
										<FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
									</div>
									<a href="#" className="text-sm text-blue-600 hover:underline whitespace-nowrap">Size chart</a>
								</div>
							</div>
						)}

						{/* Divider */}
						{productSizes.length > 0 && <div className="border-t border-gray-100 my-4" />}

						{/* Quantity selector */}
						<div className="mb-5">
							<div className="flex items-center justify-between">
								<p className="text-sm font-semibold text-gray-900">Quantity</p>
								<div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
									<button
										onClick={() => setQuantity((q) => Math.max(isAvailable ? 1 : 0, q - 1))}
										disabled={quantity <= (isAvailable ? 1 : 0)}
										className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
									>
										<FaMinus className="text-xs" />
									</button>
									<span className="w-12 h-10 flex items-center justify-center text-sm font-semibold text-gray-900 border-x border-gray-200 tabular-nums">
										{quantity}
									</span>
									<button
										onClick={() => setQuantity((q) => Math.min(stockQty, q + 1))}
										disabled={quantity >= stockQty}
										className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
									>
										<FaPlus className="text-xs" />
									</button>
								</div>
							</div>
							<p className="text-xs text-gray-400 text-right mt-1">Available: {stockQty}</p>
						</div>

						{/* Add to cart / actions */}
						<div className="space-y-2.5 mt-4">
							<button
								onClick={() => addToCart(product.id, quantity)}
								disabled={!isAvailable || (productSizes.length > 0 && !size)}
								className="w-full rounded-xl bg-gray-900 text-white hover:bg-gray-800 py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isAvailable ? t('product.addToCart') : t('common.outOfStock')}
							</button>
							<button
								disabled={!isAvailable || (productSizes.length > 0 && !size)}
								className="w-full rounded-xl bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{t('product.buyNow')}
							</button>
						</div>
						{productSizes.length > 0 && !size && isAvailable && (
							<p className="text-xs text-amber-600 mt-2">{t('product.pickSize')}</p>
						)}

						{/* Product info rows */}
						<div className="mt-5 text-sm text-gray-600 space-y-2 border-t border-gray-100 pt-4">
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.delivery')}</span>
								<span className="font-medium text-gray-900">{product.fastDelivery ? t('productCard.tomorrow') : '2-4 days'}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.seller')}</span>
								<span className="font-medium text-gray-900">{product.brand}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-500">{t('product.availability')}</span>
								<span className={`font-medium ${isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
									{isAvailable ? `${stockQty} in stock` : 'Out of stock'}
								</span>
							</div>
						</div>

						{/* Share */}
						<div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
							<button onClick={() => toggleWishlist(product.id)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-rose-500">
								{wished ? <FaHeart className="text-rose-500" /> : <FaRegHeart />} Wishlist
							</button>
							<button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 ml-auto">
								<FaShareAlt /> {t('product.share')}
							</button>
						</div>
					</div>

					{/* Offers list */}
					<div className="rounded-2xl border bg-white shadow-sm p-4">
						<p className="font-medium mb-3">{t('product.similar')}</p>
						<div className="space-y-3">
							{offers.map((o) => (
								<Link key={o.id} to={`/product/${o.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 border border-gray-100">
									<img src={o.thumbnail} alt={o.title} className="w-16 h-16 rounded object-cover" />
									<div className="flex-1 min-w-0">
										<p className="text-sm text-gray-900 truncate">{o.title}</p>
										<p className="text-xs text-gray-500 truncate">{o.brand}</p>
									</div>
									<p className="text-sm font-semibold text-rose-600">{formatCurrencyRub(o.price)}</p>
								</Link>
							))}
						</div>
					</div>
				</aside>
			</div>

			{/* Product info tabs */}
			<div className="mt-8 bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
				<div className="flex gap-4 sm:gap-6 border-b mb-6 overflow-x-auto">
					{TABS.map((t) => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`pb-2 px-2 text-base sm:text-lg font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-brand'}`}
						>
							{t.label}
						</button>
					))}
				</div>
				{tab === 'desc' && (
					<div>
						<h2 className="text-xl font-semibold mb-2">Описание</h2>
						<p className="text-gray-700 mb-4">{product.description || 'Стильные и удобные кроссовки для повседневной носки. Легкие, дышащие материалы, современный дизайн и отличная амортизация.'}</p>
						<ul className="text-gray-600 text-sm space-y-1">
							<li>• Материал: текстиль, искусственная кожа</li>
							<li>• Подошва: EVA, резина</li>
							<li>• Цвет: белый/черный</li>
							<li>• Сезон: демисезон</li>
							<li>• Страна производства: Китай</li>
						</ul>
					</div>
				)}
				{tab === 'specs' && (
					<div>
						<h2 className="text-xl font-semibold mb-2">Характеристики</h2>
						<table className="w-full text-sm text-gray-700">
							<tbody>
								<tr><td className="py-1 pr-4 font-medium">Бренд</td><td>{product.brand}</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Код товара</td><td>{product.id}</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Категория</td><td>{product.category}</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Страна</td><td>Китай</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Материал</td><td>Текстиль, искусственная кожа</td></tr>
								<tr><td className="py-1 pr-4 font-medium">Сезон</td><td>Демисезон</td></tr>
							</tbody>
						</table>
					</div>
				)}
				{tab === 'reviews' && (
					<div>
						<h2 className="text-xl font-semibold mb-2">Отзывы</h2>
						<div className="mb-4 flex items-center gap-2">
							<span className="text-2xl font-bold text-brand">4.8</span>
							<span className="text-yellow-400">★★★★★</span>
							<span className="text-gray-500">(1 234 отзыва)</span>
						</div>
						<p className="text-gray-600">Пользователи отмечают отличное качество и удобство. Легкие, хорошо сидят на ноге, стильный внешний вид.</p>
					</div>
				)}
				{tab === 'questions' && (
					<div>
						<h2 className="text-xl font-semibold mb-2">Вопросы</h2>
						<p className="text-gray-600 mb-2">Задайте вопрос о товаре, и продавец или покупатели ответят на него.</p>
						<ul className="text-sm text-gray-700 space-y-2">
							<li><span className="font-medium">Вопрос:</span> Есть ли в наличии размер 39? <br /><span className="text-gray-500">Ответ: Да, есть в наличии.</span></li>
							<li><span className="font-medium">Вопрос:</span> Можно ли стирать в машинке? <br /><span className="text-gray-500">Ответ: Рекомендуется ручная стирка.</span></li>
						</ul>
					</div>
				)}
			</div>

			 {/* Add more Wildberries-like details below the main grid and tabs */}
			<div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{/* Delivery block */}
				<div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
					<div className="font-semibold text-gray-900 mb-1">Доставка в <span className="text-brand">Москву</span></div>
					<div className="text-sm text-gray-700">Послезавтра, 1 октября — <span className="text-green-600 font-semibold">бесплатно</span></div>
					<div className="text-xs text-gray-500">Самовывоз и курьером</div>
				</div>
				{/* Return block */}
				<div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
					<div className="font-semibold text-gray-900 mb-1">Условия возврата</div>
					<div className="text-sm text-gray-700">Можно вернуть товар в течение 7 дней после получения</div>
					<div className="text-xs text-gray-500">Подробнее на странице возврата</div>
				</div>
				{/* Payment block */}
				<div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
					<div className="font-semibold text-gray-900 mb-1">Способы оплаты</div>
					<div className="text-sm text-gray-700">Картой онлайн, при получении, СБП</div>
					<div className="text-xs text-gray-500">Безопасная оплата</div>
				</div>
				{/* Guarantee block */}
				<div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
					<div className="font-semibold text-gray-900 mb-1">Гарантия</div>
					<div className="text-sm text-gray-700">14 дней на возврат и обмен</div>
					<div className="text-xs text-gray-500">Сертифицированный товар</div>
				</div>
			</div>

			{/* Seller info block */}
			<div className="mt-8 bg-white rounded-2xl border shadow-sm p-6 flex flex-col md:flex-row md:items-center md:gap-8">
				<div className="flex-1">
					<div className="font-semibold text-gray-900 mb-1">Продавец</div>
					<div className="text-sm text-gray-700">{product.brand} (ООО "Вайлдберриз")</div>
					<div className="text-xs text-gray-500">Рейтинг продавца: 4.9/5</div>
				</div>
				<div className="flex-1 mt-4 md:mt-0">
					<div className="font-semibold text-gray-900 mb-1">Страна производства</div>
					<div className="text-sm text-gray-700">Китай</div>
					<div className="text-xs text-gray-500">Импортер: ООО "Вайлдберриз"</div>
				</div>
			</div>

			{/* Viewed with this product */}
			<div className="mt-8">
				<h3 className="text-lg font-semibold mb-4">С этим товаром смотрят</h3>
				<div className="flex gap-4 overflow-x-auto pb-2">
					{offers.map((o) => (
						<Link key={o.id} to={`/product/${o.id}`} className="min-w-[220px] max-w-[220px] bg-white border rounded-xl shadow-sm p-3 flex flex-col items-center hover:shadow-md transition">
							<img src={o.thumbnail} alt={o.title} className="w-24 h-24 object-cover rounded mb-2" />
							<p className="text-sm text-gray-900 truncate w-full">{o.title}</p>
							<p className="text-xs text-gray-500 truncate w-full">{o.brand}</p>
							<p className="text-sm font-semibold text-rose-600 w-full">{formatCurrencyRub(o.price)}</p>
						</Link>
					))}
				</div>
			</div>
		</div>
	)
}