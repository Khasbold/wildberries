/**
 * One-time seed: upload all Mongolian-translated categories to Firestore.
 * Uses localStorage flag so it only runs once per browser.
 */

import { setCategories } from './db.js'

const SEED_KEY = 'bunny_categories_seeded_v3'

const categories = [
    // Top-level categories
    { id: 'cat-men', name: 'Men', slug: 'men', nameMn: 'Эрэгтэй', parentId: null },
    { id: 'cat-women', name: 'Women', slug: 'women', nameMn: 'Эмэгтэй', parentId: null },
    { id: 'cat-children', name: 'Children', slug: 'children', nameMn: 'Хүүхэд', parentId: null },
    { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', nameMn: 'Электроник', parentId: null },
    { id: 'cat-home-living', name: 'Home & Living', slug: 'home-living', nameMn: 'Гэр ахуй', parentId: null },
    { id: 'cat-beauty', name: 'Beauty & Personal Care', slug: 'beauty', nameMn: 'Гоо сайхан', parentId: null },
    { id: 'cat-sports', name: 'Sports & Fitness', slug: 'sports', nameMn: 'Спорт', parentId: null },
    { id: 'cat-food', name: 'Food & Grocery', slug: 'food', nameMn: 'Хүнс', parentId: null },
    { id: 'cat-toys', name: 'Toys & Games', slug: 'toys', nameMn: 'Тоглоом', parentId: null },
    { id: 'cat-pets', name: 'Pet Supplies', slug: 'pets', nameMn: 'Тэжээвэр амьтан', parentId: null },

    // Men sub-categories
    { id: 'cat-men-tops', name: "Men's Tops", slug: 'men-tops', nameMn: 'Дээд хувцас', parentId: 'cat-men' },
    { id: 'cat-men-bottoms', name: "Men's Bottoms", slug: 'men-bottoms', nameMn: 'Доод хувцас', parentId: 'cat-men' },
    { id: 'cat-men-outerwear', name: "Men's Outerwear", slug: 'men-outerwear', nameMn: 'Гадуур хувцас', parentId: 'cat-men' },
    { id: 'cat-men-footwear', name: "Men's Footwear", slug: 'men-footwear', nameMn: 'Гутал', parentId: 'cat-men' },
    { id: 'cat-men-accessories', name: "Men's Accessories", slug: 'men-accessories', nameMn: 'Дагалдах хэрэгсэл', parentId: 'cat-men' },
    { id: 'cat-men-sportswear', name: "Men's Sportswear", slug: 'men-sportswear', nameMn: 'Спорт хувцас', parentId: 'cat-men' },
    { id: 'cat-men-traditional', name: 'Traditional (Deel/Terleg)', slug: 'men-traditional', nameMn: 'Тэрлэг/Дээл', parentId: 'cat-men' },

    // Women sub-categories
    { id: 'cat-women-tops', name: "Women's Tops", slug: 'women-tops', nameMn: 'Дээд хувцас', parentId: 'cat-women' },
    { id: 'cat-women-bottoms', name: "Women's Bottoms", slug: 'women-bottoms', nameMn: 'Доод хувцас', parentId: 'cat-women' },
    { id: 'cat-women-outerwear', name: "Women's Outerwear", slug: 'women-outerwear', nameMn: 'Гадуур хувцас', parentId: 'cat-women' },
    { id: 'cat-women-footwear', name: "Women's Footwear", slug: 'women-footwear', nameMn: 'Гутал', parentId: 'cat-women' },
    { id: 'cat-women-accessories', name: "Women's Accessories", slug: 'women-accessories', nameMn: 'Дагалдах хэрэгсэл', parentId: 'cat-women' },
    { id: 'cat-women-sportswear', name: "Women's Sportswear", slug: 'women-sportswear', nameMn: 'Спорт хувцас', parentId: 'cat-women' },
    { id: 'cat-women-traditional', name: 'Traditional (Deel/Terleg)', slug: 'women-traditional', nameMn: 'Тэрлэг/Дээл', parentId: 'cat-women' },

    // Children sub-categories
    { id: 'cat-children-tops', name: "Children's Tops", slug: 'children-tops', nameMn: 'Дээд хувцас', parentId: 'cat-children' },
    { id: 'cat-children-bottoms', name: "Children's Bottoms", slug: 'children-bottoms', nameMn: 'Доод хувцас', parentId: 'cat-children' },
    { id: 'cat-children-outerwear', name: "Children's Outerwear", slug: 'children-outerwear', nameMn: 'Гадуур хувцас', parentId: 'cat-children' },
    { id: 'cat-children-footwear', name: "Children's Footwear", slug: 'children-footwear', nameMn: 'Гутал', parentId: 'cat-children' },
    { id: 'cat-children-accessories', name: "Children's Accessories", slug: 'children-accessories', nameMn: 'Дагалдах хэрэгсэл', parentId: 'cat-children' },
    { id: 'cat-children-sportswear', name: "Children's Sportswear", slug: 'children-sportswear', nameMn: 'Спорт хувцас', parentId: 'cat-children' },
    { id: 'cat-children-traditional', name: 'Traditional (Deel/Terleg)', slug: 'children-traditional', nameMn: 'Тэрлэг/Дээл', parentId: 'cat-children' },

    // Electronics sub-categories
    { id: 'cat-smartphones', name: 'Smartphones', slug: 'smartphones', nameMn: 'Ухаалаг утас', parentId: 'cat-electronics' },
    { id: 'cat-laptops', name: 'Laptops', slug: 'laptops', nameMn: 'Зөөврийн компьютер', parentId: 'cat-electronics' },
    { id: 'cat-tablets', name: 'Tablets', slug: 'tablets', nameMn: 'Таблет', parentId: 'cat-electronics' },
    { id: 'cat-accessories-tech', name: 'Tech Accessories', slug: 'accessories-tech', nameMn: 'Дагалдах хэрэгсэл', parentId: 'cat-electronics' },

    // Home & Living sub-categories
    { id: 'cat-furniture', name: 'Furniture', slug: 'furniture', nameMn: 'Тавилга', parentId: 'cat-home-living' },
    { id: 'cat-kitchen', name: 'Kitchen', slug: 'kitchen', nameMn: 'Гал тогоо', parentId: 'cat-home-living' },
    { id: 'cat-home-decor', name: 'Home Decor', slug: 'home-decor', nameMn: 'Гэрийн чимэглэл', parentId: 'cat-home-living' },
    { id: 'cat-bedding', name: 'Bedding', slug: 'bedding', nameMn: 'Орны хэрэглэл', parentId: 'cat-home-living' },

    // Beauty & Personal Care sub-categories
    { id: 'cat-skincare', name: 'Skincare', slug: 'skincare', nameMn: 'Арьс арчилгаа', parentId: 'cat-beauty' },
    { id: 'cat-makeup', name: 'Makeup', slug: 'makeup', nameMn: 'Нүүр будалт', parentId: 'cat-beauty' },
    { id: 'cat-haircare', name: 'Haircare', slug: 'haircare', nameMn: 'Үсний арчилгаа', parentId: 'cat-beauty' },
    { id: 'cat-fragrance', name: 'Fragrance', slug: 'fragrance', nameMn: 'Үнэртэн', parentId: 'cat-beauty' },
]

export async function seedCategoriesOnce() {
    if (localStorage.getItem(SEED_KEY)) return
    console.log('[seed] Uploading', categories.length, 'categories to Firestore...')
    await setCategories(categories)
    localStorage.setItem(SEED_KEY, Date.now().toString())
    console.log('[seed] Categories uploaded successfully!')
}
