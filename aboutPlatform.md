# iBunny Platform — Тайлбар

## Ерөнхий мэдээлэл

iBunny бол олон дэлгүүрийн маркетплейс (marketplace) платформ юм. Хэрэглэгчид олон дэлгүүрээс нэг дор захиалга хийж, нэг checkout-оор дамжуулан худалдан авалт хийх боломжтой.

## Оролцогчид

### 1. Хэрэглэгч (Customer)
- Бараа хайх, сагсанд хийх, захиалга өгөх
- Захиалгын явц хянах
- Бараанд сэтгэгдэл бичих (зөвхөн худалдан авсан бол)
- Хүслийн жагсаалт хөтлөх

### 2. Дэлгүүр эзэмшигч (Store Owner)
- Бараа нэмэх, засах, устгах
- Захиалга хүлээн авах, хүргэлтийн статус шинэчлэх
- QR код скан хийж хүргэлт баталгаажуулах
- Орлогын тайлан харах
- Промо код үүсгэх

### 3. SuperAdmin
- Бүх дэлгүүр, захиалга удирдах
- Дэлгүүр эзэмшигчдийн tier тохируулах
- Бараа зөвшөөрөх/татгалзах
- Захиалгын статус өөрчлөх (Delivered, Bunny, Refunded)
- Баннер, ангилал удирдах
- Санал хүсэлт унших

## Захиалгын урсгал (Order Flow)

```
New → Accepted → (Shipped) → Delivered → Bunny
                                ↓
                             Refunded
```

1. **New** — Захиалга шинээр үүссэн
2. **Accepted** — Дэлгүүр эзэмшигч хүлээн авсан
3. **Shipped** — Илгээсэн (зөвхөн Gold tier, захиалгат бараанд)
4. **Delivered** — Хүргэгдсэн (QR скан эсвэл гар аргаар)
5. **Bunny** — Бүрэн дууссан (SuperAdmin шилжүүлэг хийсэн)
6. **Refunded** — Буцаалт хийгдсэн

### Хүргэлтийн аргууд (Delivery Methods)
- **auto (QR)** — Хэрэглэгчийн QR кодыг скан хийж хүргэлт баталгаажуулсан
- **manual (Гар)** — Дэлгүүр эзэмшигч эсвэл SuperAdmin гар аргаар тэмдэглэсэн

## Fulfillment систем

Нэг захиалга олон дэлгүүрийн бараа агуулж болно. Дэлгүүр тус бүр тусдаа fulfillment статустай:
- Дэлгүүр A: Delivered, Дэлгүүр B: Accepted → Захиалгын ерөнхий статус: Accepted
- Бүх дэлгүүр Delivered → Захиалгын ерөнхий статус: Delivered
- Бүх дэлгүүр Bunny → Захиалгын ерөнхий статус: Bunny

## Tier систем

| Tier | Шимтгэл | Онцлог |
|------|---------|--------|
| Free | 10% | Үндсэн боломжууд |
| Bronze | 8% | Free + нэмэлт |
| Silver | 6% | Bronze + analytics |
| Gold | 4% | Silver + shipped статус + захиалгат бараа |

Шимтгэл = (Захиалгын дүн - QPay 1% - Гүйлгээ хураамж ₮200) × Tier шимтгэл %

## Төлбөрийн урсгал

1. Хэрэглэгч QPay-р төлбөр хийнэ
2. Мөнгө платформд хадгалагдана (escrow)
3. Бараа хүргэгдсэн (Delivered) гэж баталгаажсны дараа SuperAdmin шалгана
4. SuperAdmin "Bunny" тэмдэглэж, дэлгүүр эзэмшигчид мөнгө шилжүүлнэ
5. Шимтгэл хасагдсан дүнг дэлгүүр эзэмшигчийн дансанд шилжүүлнэ

## Мэдэгдлийн систем (Notifications)

- Шинэ захиалга → Дэлгүүр эзэмшигч + Хэрэглэгч
- Статус өөрчлөгдсөн → Хэрэглэгч
- Хүргэлт баталгаажсан → Хэрэглэгч + Дэлгүүр эзэмшигч
- Bunny баталгаажсан → Дэлгүүр эзэмшигч
- Бараа зөвшөөрөгдсөн/татгалзсан → Дэлгүүр эзэмшигч
- Шинэ дэлгүүр бүртгүүлсэн → SuperAdmin
- Push notification (FCM) + In-app toast

## Технологи

- **Frontend:** React, React Router, Tailwind CSS
- **State:** Custom store with useSyncExternalStore
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Push:** Firebase Cloud Messaging (FCM)
- **Төлбөр:** QPay integration
- **i18n:** Монгол, Орос, Англи хэл

## Firebase collection бүтэц

- `products` — Бараанууд (storeId, approvalStatus, price, title, images...)
- `orders` — Захиалгууд (fulfillments, storeBreakdown, customer, deliveryInfo...)
- `stores` — Дэлгүүрүүд (slug, storeName, ownerId...)
- `adminUsers` — Дэлгүүр эзэмшигчид (storeId, tier, bankAccount...)
- `categories` — Ангилал
- `discounts` — Промо кодууд
- `banners` — Баннерууд
- `adminNotifications` — Админ мэдэгдлүүд
- `clientNotifications` — Хэрэглэгчийн мэдэгдлүүд
- `customerTokens` — FCM токенууд
- `feedbacks` — Санал хүсэлтүүд

## URL бүтэц

### Хэрэглэгч
- `/` — Нүүр хуудас
- `/catalog` — Каталог
- `/product/:id` — Барааны дэлгэрэнгүй
- `/stores` — Дэлгүүрүүд
- `/stores/:slug` — Дэлгүүрийн хуудас (slug-аар)
- `/cart` — Сагс
- `/checkout` — Захиалга
- `/orders` — Миний захиалгууд
- `/wishlist` — Хүслийн жагсаалт
- `/account` — Бүртгэл

### Админ
- `/admin` — Dashboard (SuperAdmin: SuperAdminDashboard, Store: StoreWelcomePage)
- `/admin/orders` — Захиалгууд
- `/admin/orders/:id` — Захиалгын дэлгэрэнгүй
- `/admin/products` — Бараанууд
- `/admin/products/new` — Шинэ бараа
- `/admin/categories` — Ангилал
- `/admin/customers` — Хэрэглэгчид
- `/admin/discounts` — Промо кодууд
- `/admin/banners` — Баннерууд
- `/admin/delivery-scan` — QR скан
- `/admin/feedbacks` — Санал хүсэлт (SuperAdmin)
- `/admin/store-owners` — Дэлгүүр эзэмшигчид (SuperAdmin)
