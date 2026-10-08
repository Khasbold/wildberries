# Firebase Integration

This project uses **Firebase Firestore**, **Authentication**, and **Cloud Messaging** for data, auth, and push notifications.

## Collections (Firestore Tables)

| Collection | Description |
|------------|-------------|
| `products` | Product catalog (admin products) |
| `categories` | Product categories |
| `users` | Admin/store owner accounts |
| `orders` | Customer orders |
| `discounts` | Promo/discount codes |
| `banners` | Homepage banners |
| `highlights` | Store highlight config |
| `notifications` | Broadcast notifications |
| `adminNotifications` | Admin purchase alerts |
| `clientNotifications` | Order status alerts (per session) |
| `productViews` | Product view counts |
| `carts` | Shopping carts (per session) |
| `wishlists` | Wishlists (per session) |
| `customerTokens` | FCM tokens per user (for admin push) |

## Setup

### 1. Firebase Console

- Project: `bunny-5c403` (from `src/firebase/config.js`)
- Enable **Firestore Database** in Firebase Console → Build → Firestore Database → Create database

### 2. Deploy Security Rules

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login and init
firebase login
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### 3. Deploy Indexes (optional, for faster queries)

```bash
firebase deploy --only firestore:indexes
```

### 4. First Run – Auto Seed

On first load, if the `products` collection is empty, the app automatically seeds Firestore with:
- 12 products
- 5 categories
- 3 admin users
- 2 discount codes
- Sample orders and banners

## Toggle Firebase Off

To fall back to localStorage (e.g. for offline demo), set in `src/modules/state/store.js`:

```js
const USE_FIREBASE = false
```

## Manual Seed

To re-seed or populate from browser console:

```js
import { seedFirestore } from './src/firebase/seedData.js'
await seedFirestore()
```

## Authentication

- **Email/Password** – Sign in and Register
- **Google** – Sign in with Google (enable in Firebase Console → Auth → Sign-in method)
- **Facebook** – Sign in with Facebook (enable + add App ID/Secret from developers.facebook.com)
- **Guest** – Anonymous auth for checkout without account

Enable providers in Firebase Console → Authentication → Sign-in method.

## Push Notifications (FCM)

1. **VAPID key** – Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
2. **Service worker** – `public/firebase-messaging-sw.js` must be deployed
3. **FCM tokens** – Saved to Firestore `customerTokens` when users sign in and allow notifications

### Cloud Functions (real push + token list)

To send push from Admin and see subscribed devices:

```bash
cd functions
npm install
firebase deploy --only functions
```

- **sendPushNotification** – Sends to all devices in `customerTokens`. Without it, the admin page falls back to a local notification.
- **getCustomerTokens** – Returns the list of FCM tokens for the admin notifications page. Use this so `/admin/notifications` shows devices (bypasses Firestore rules).

If you see "0 devices", click **Subscribe Device** to add this browser, then **Refresh**. Deploy functions to see tokens from Firestore.

## Firebase Storage — CORS (custom domain uploads)

If the browser shows **CORS** errors when uploading images from your domain (e.g. `https://ibunny.mn`) to `firebasestorage.googleapis.com`, the **default Storage bucket** must allow that origin. This is **not** fixed by `firebase deploy`; you apply a CORS JSON file with **Google Cloud SDK** (`gsutil`).

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (includes `gsutil`), or use **Google Cloud Shell** from the GCP console.
2. Log in: `gcloud auth login` (pick the Google account that owns project `bunny-5c403`).
3. From the project root (where `storage.cors.json` lives), run:

```bash
npm run storage:cors
# same as:
gsutil cors set storage.cors.json gs://bunny-5c403.appspot.com
```

4. Confirm: `gsutil cors get gs://bunny-5c403.appspot.com`

Edit **`storage.cors.json`** if you add more domains (staging URLs, etc.), then run the command again.

**Storage rules** must still allow authenticated writes in Firebase Console → Storage → Rules (separate from CORS).

## Deploy to Firebase Hosting

```bash
# Build and deploy
npm run deploy:hosting

# Or step by step
npm run build
firebase deploy --only hosting
```

Your app will be live at `https://bunny-5c403.web.app` (or your project's URL).

## REST API Note

Firestore is accessed via the **Firebase SDK**. For external REST APIs, add **Firebase Cloud Functions** that expose HTTP endpoints.
