# Wildberries Clone (React + Vite + Tailwind)

A Wildberries-inspired ecommerce UI with modern storefront flows, advanced catalog filters, wishlist/cart persistence, and a polished responsive layout.

## What’s implemented

- Sticky marketplace header with search suggestions, category bar, and quick cart drawer
- Language switcher in header with flags and dropdown (`Русский` / `Монгол` / `English`)
- Home page sections for popular products, category shortcuts, and top-rated picks
- Catalog filtering by category, price range, rating, stock, and fast delivery
- Product details with gallery, tabs, size selection, and stock-aware add-to-cart behavior
- Cart with quantity controls, promo code support (`WB10` demo), delivery fee, and full order summary
- Wishlist page with modern empty-state and responsive product grid
- Data persisted in `localStorage` for cart/wishlist
- I18n powered by `i18n-js` with shared translation keys for main storefront labels

## Run locally (Windows PowerShell)

```powershell
# from project root
npm i
npm run dev
```

Open http://localhost:5173

## Build

```powershell
npm run build
npm run preview
``` 