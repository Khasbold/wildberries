/**
 * Upload translated categories (Mongolian) to Firestore.
 *
 * Usage — paste this into browser console while app is running,
 * OR import { uploadCategories } from this file.
 *
 * The function uses the existing Firebase db instance from the app.
 */

import { setCategories } from '../src/firebase/db.js'

const categories = [
    { id: 'cat-fashion', name: 'Fashion', slug: 'fashion', nameMn: 'Хувцас загвар' },
    { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', nameMn: 'Электроник' },
    { id: 'cat-home-living', name: 'Home & Living', slug: 'home-living', nameMn: 'Гэр ахуй' },
    { id: 'cat-beauty', name: 'Beauty & Personal Care', slug: 'beauty', nameMn: 'Гоо сайхан' },
    { id: 'cat-sports-fitness', name: 'Sports & Fitness', slug: 'sports-fitness', nameMn: 'Спорт фитнесс' },
    { id: 'cat-toys-games', name: 'Toys & Games', slug: 'toys-games', nameMn: 'Тоглоом наадгай' },
    { id: 'cat-pet-supplies', name: 'Pet Supplies', slug: 'pet-supplies', nameMn: 'Тэжээвэр амьтан' },
    { id: 'cat-grocery-food', name: 'Grocery & Food', slug: 'grocery-food', nameMn: 'Хүнсний бараа' },
    { id: 'cat-tools-diy', name: 'Tools & DIY', slug: 'tools-diy', nameMn: 'Багаж хэрэгсэл' },
    { id: 'cat-automotive', name: 'Automotive', slug: 'automotive', nameMn: 'Автомашин' },
    { id: 'cat-men', name: 'Men', slug: 'men', nameMn: 'Эрэгтэй' },
    { id: 'cat-women', name: 'Women', slug: 'women', nameMn: 'Эмэгтэй' },
    { id: 'cat-kids', name: 'Kids', slug: 'kids', nameMn: 'Хүүхдийн' },
    { id: 'cat-shoes', name: 'Shoes', slug: 'shoes', nameMn: 'Гутал' },
    { id: 'cat-accessories', name: 'Accessories', slug: 'accessories', nameMn: 'Дагалдах хэрэгсэл' },
    { id: 'cat-smartphones', name: 'Smartphones', slug: 'smartphones', nameMn: 'Ухаалаг утас' },
    { id: 'cat-laptops', name: 'Laptops', slug: 'laptops', nameMn: 'Зөөврийн компьютер' },
    { id: 'cat-tablets', name: 'Tablets', slug: 'tablets', nameMn: 'Таблет' },
    { id: 'cat-gaming', name: 'Gaming', slug: 'gaming', nameMn: 'Тоглоом' },
    { id: 'cat-furniture', name: 'Furniture', slug: 'furniture', nameMn: 'Тавилга' },
    { id: 'cat-kitchen', name: 'Kitchen', slug: 'kitchen', nameMn: 'Гал тогоо' },
    { id: 'cat-home-decor', name: 'Home Decor', slug: 'home-decor', nameMn: 'Гэрийн чимэглэл' },
    { id: 'cat-lighting', name: 'Lighting', slug: 'lighting', nameMn: 'Гэрэлтүүлэг' },
    { id: 'cat-storage', name: 'Storage', slug: 'storage', nameMn: 'Хадгалалт' },
    { id: 'cat-skincare', name: 'Skincare', slug: 'skincare', nameMn: 'Арьс арчилгаа' },
    { id: 'cat-makeup', name: 'Makeup', slug: 'makeup', nameMn: 'Нүүр будалт' },
    { id: 'cat-haircare', name: 'Haircare', slug: 'haircare', nameMn: 'Үсний арчилгаа' },
    { id: 'cat-fragrance', name: 'Fragrance', slug: 'fragrance', nameMn: 'Үнэртэн' },
    { id: 'cat-gym-equipment', name: 'Gym Equipment', slug: 'gym-equipment', nameMn: 'Gym тоног төхөөрөмж' },
    { id: 'cat-sportswear', name: 'Sportswear', slug: 'sportswear', nameMn: 'Спорт хувцас' },
    { id: 'cat-outdoor-gear', name: 'Outdoor Gear', slug: 'outdoor-gear', nameMn: 'Гадаа хэрэгсэл' },
    { id: 'cat-fitness-accessories', name: 'Fitness Accessories', slug: 'fitness-accessories', nameMn: 'Фитнесс хэрэгсэл' },
    { id: 'cat-educational-toys', name: 'Educational Toys', slug: 'educational-toys', nameMn: 'Боловсролын тоглоом' },
    { id: 'cat-board-games', name: 'Board Games', slug: 'board-games', nameMn: 'Ширээний тоглоом' },
    { id: 'cat-video-games', name: 'Video Games', slug: 'video-games', nameMn: 'Видео тоглоом' },
    { id: 'cat-baby-toys', name: 'Baby Toys', slug: 'baby-toys', nameMn: 'Нялхсын тоглоом' },
    { id: 'cat-pet-food', name: 'Pet Food', slug: 'pet-food', nameMn: 'Тэжээл' },
    { id: 'cat-pet-toys', name: 'Pet Toys', slug: 'pet-toys', nameMn: 'Тоглоом' },
    { id: 'cat-grooming', name: 'Grooming', slug: 'pet-grooming', nameMn: 'Арчилгаа' },
    { id: 'cat-pet-accessories', name: 'Pet Accessories', slug: 'pet-accessories', nameMn: 'Хэрэгсэл' },
    { id: 'cat-fresh-food', name: 'Fresh Food', slug: 'fresh-food', nameMn: 'Шинэ хүнс' },
    { id: 'cat-snacks', name: 'Snacks', slug: 'snacks', nameMn: 'Зууш' },
    { id: 'cat-beverages', name: 'Beverages', slug: 'beverages', nameMn: 'Ундаа' },
    { id: 'cat-organic-food', name: 'Organic Food', slug: 'organic-food', nameMn: 'Органик хүнс' },
    { id: 'cat-power-tools', name: 'Power Tools', slug: 'power-tools', nameMn: 'Цахилгаан багаж' },
    { id: 'cat-hand-tools', name: 'Hand Tools', slug: 'hand-tools', nameMn: 'Гар багаж' },
    { id: 'cat-garden-tools', name: 'Garden Tools', slug: 'garden-tools', nameMn: 'Цэцэрлэгийн багаж' },
    { id: 'cat-hardware', name: 'Hardware', slug: 'hardware', nameMn: 'Тоног төхөөрөмж' },
    { id: 'cat-car-accessories', name: 'Car Accessories', slug: 'car-accessories', nameMn: 'Машины хэрэгсэл' },
    { id: 'cat-car-parts', name: 'Car Parts', slug: 'car-parts', nameMn: 'Сэлбэг хэрэгсэл' },
    { id: 'cat-tires', name: 'Tires', slug: 'tires', nameMn: 'Дугуй' },
    { id: 'cat-car-electronics', name: 'Car Electronics', slug: 'car-electronics', nameMn: 'Машины электроник' },
]

export async function uploadCategories() {
    console.log('[uploadCategories] Starting upload of', categories.length, 'categories...')
    await setCategories(categories)
    console.log('[uploadCategories] Done! All categories uploaded to Firestore.')
    return categories.length
}
