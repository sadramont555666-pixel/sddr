# سیستم پیام‌رسانی مهمان و لیست اعضای Pinned

مستندات کامل سیستم پیام‌رسانی مهمان، لیست اعضای ویژه و پنل مدیریت

## 📋 فهرست

1. [خلاصه سیستم](#خلاصه-سیستم)
2. [مدل‌های Database](#مدلهای-database)
3. [API Endpoints](#api-endpoints)
4. [کامپوننت‌های Frontend](#کامپوننتهای-frontend)
5. [سناریوهای استفاده](#سناریوهای-استفاده)
6. [امنیت](#امنیت)
7. [تست](#تست)

---

## 🎯 خلاصه سیستم

این سیستم شامل سه بخش اصلی است:

### 1. لیست اعضای Pinned
- نمایش کاربران ویژه در بالای لیست با جزئیات کامل
- امکان Pin/Unpin کاربران توسط ادمین
- نمایش اطلاعات کامل برای اعضای pinned

### 2. سیستم پیام‌رسانی مهمان
- ارسال پیام بدون نیاز به ثبت‌نام
- احراز هویت با OTP از طریق SMS
- سیستم یک‌طرفه (بدون پاسخ)

### 3. پنل مدیریت پیام‌ها
- مشاهده پیام‌های دریافتی
- مسدود کردن شماره‌های نامناسب
- آرشیو پیام‌ها

---

## 💾 مدل‌های Database

### User (به‌روزرسانی شده)
```prisma
model User {
  // ... existing fields
  pinned Boolean @default(false) // نمایش در لیست اعضای ویژه
}
```

### GuestMessage
```prisma
model GuestMessage {
  id          String   @id @default(cuid())
  senderPhone String
  body        String
  status      String   @default("new") // "new", "read", "archived"
  createdAt   DateTime @default(now())

  @@index([status])
  @@index([createdAt])
}
```

### OtpVerification
```prisma
model OtpVerification {
  id        String   @id @default(cuid())
  phone     String   @unique
  otpHash   String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### AdminSettings
```prisma
model AdminSettings {
  id             String   @id @default(cuid())
  allowGuestChat Boolean  @default(true)
  blockedPhones  Json     @default("[]") // Array of phone numbers
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 📡 API Endpoints

### مهمان (عمومی)

#### `POST /api/guest/request-otp`
درخواست کد OTP برای ارسال پیام

**Request:**
```json
{
  "phone": "09123456789"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "کد تأیید به شماره شما ارسال شد"
}
```

**Checks:**
- ✅ AdminSettings.allowGuestChat فعال باشد
- ✅ شماره در blockedPhones نباشد
- ✅ Rate limiting: 3 تلاش در 5 دقیقه

---

#### `POST /api/guest/send-message`
ارسال پیام پس از تأیید OTP

**Request:**
```json
{
  "phone": "09123456789",
  "otp": "123456",
  "messageBody": "متن پیام..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "پیام شما با موفقیت برای مدیریت ارسال شد."
}
```

**Validations:**
- کد OTP معتبر و منقضی نشده باشد
- متن پیام حداقل 10 کاراکتر
- حداکثر 1000 کاراکتر
- Rate limiting: 5 پیام در 1 ساعت

---

### کاربران (نیازمند Authentication)

#### `GET /api/users/list`
لیست دو بخشی کاربران (pinned + others)

**Query Parameters:**
- `page` (optional): شماره صفحه (default: 1)
- `pageSize` (optional): تعداد آیتم (default: 20)

**Response:**
```json
{
  "pinnedUsers": [
    {
      "id": "...",
      "name": "خانم سنگ‌شکن",
      "phone": "09923182082",
      "role": "ADMIN",
      "profileImageUrl": "/uploads/...",
      "bio": "مشاور تحصیلی",
      "officeAddress": "تهران، ...",
      "landlinePhone": "021...",
      "pinned": true
    }
  ],
  "otherUsers": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### ادمین (نیازمند ADMIN Role)

#### `GET /api/admin/guest-messages`
لیست پیام‌های مهمان

**Query Parameters:**
- `page` (optional)
- `pageSize` (optional)
- `status` (optional): "new" | "read" | "archived"

**Response:**
```json
{
  "messages": [
    {
      "id": "...",
      "senderPhone": "+989123456789",
      "body": "سلام، من یک سوال دارم...",
      "status": "new",
      "createdAt": "2025-10-10T..."
    }
  ],
  "pagination": {...}
}
```

---

#### `PUT /api/admin/guest-messages`
تغییر وضعیت پیام

**Request:**
```json
{
  "messageId": "...",
  "status": "read" // or "archived"
}
```

---

#### `POST /api/admin/block-phone`
مسدود کردن شماره تلفن

**Request:**
```json
{
  "phone": "+989123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "شماره تلفن با موفقیت مسدود شد"
}
```

---

#### `DELETE /api/admin/block-phone`
رفع مسدودیت شماره

**Request:**
```json
{
  "phone": "+989123456789"
}
```

---

#### `PUT /api/admin/users/:userId/toggle-pin`
تغییر وضعیت pin کاربر

**Response:**
```json
{
  "success": true,
  "message": "کاربر به لیست اعضای ویژه اضافه شد",
  "user": {
    "id": "...",
    "name": "...",
    "pinned": true
  }
}
```

---

## 🎨 کامپوننت‌های Frontend

### 1. MembersList.tsx
**مسیر:** `/members`

**ویژگی‌ها:**
- ✅ نمایش اعضای pinned با کارت‌های بزرگ و جزئیات کامل
- ✅ نمایش سایر اعضا با کارت‌های کوچک‌تر
- ✅ دکمه Pin/Unpin برای ادمین
- ✅ Pagination برای سایر اعضا
- ✅ طراحی ریسپانسیو

**کاربرد:**
```tsx
import MembersList from '@/components/MembersList';

<MembersList />
```

---

### 2. GuestMessageForm.tsx
**مسیر:** `/contact`

**ویژگی‌ها:**
- ✅ فرم دو مرحله‌ای (Phone → OTP + Message)
- ✅ اعتبارسنجی ورودی‌ها
- ✅ نمایش پیام‌های خطا/موفقیت
- ✅ بررسی وضعیت allowGuestChat
- ✅ طراحی زیبا و کاربرپسند

**مراحل:**
1. کاربر شماره تلفن وارد می‌کند
2. کد OTP دریافت می‌کند
3. کد و متن پیام را وارد می‌کند
4. پیام ارسال می‌شود

---

### 3. AdminGuestMessagesDashboard.tsx
**مسیر:** `/admin/guest-messages`

**ویژگی‌ها:**
- ✅ جدول پیام‌ها با فیلتر وضعیت
- ✅ دکمه آرشیو برای هر پیام
- ✅ دکمه مسدود کردن فرستنده
- ✅ نمایش تاریخ فارسی
- ✅ Badge رنگی برای وضعیت
- ✅ Pagination
- ✅ Auto-read برای پیام‌های جدید

**Actions:**
- 📥 آرشیو پیام
- 🚫 مسدود کردن شماره فرستنده
- 👁️ علامت‌گذاری به عنوان خوانده شده

---

## 🎬 سناریوهای استفاده

### سناریو 1: ارسال پیام توسط والد

1. والد به صفحه `/contact` می‌رود
2. شماره تلفن خود را وارد می‌کند: `09123456789`
3. دکمه "دریافت کد تأیید" را می‌زند
4. SMS با کد 6 رقمی دریافت می‌کند
5. کد و متن پیام را وارد می‌کند
6. دکمه "ارسال پیام" را می‌زند
7. پیام موفقیت نمایش داده می‌شود

---

### سناریو 2: مدیریت پیام‌ها توسط ادمین

1. ادمین وارد `/admin/guest-messages` می‌شود
2. لیست پیام‌های جدید را مشاهده می‌کند
3. روی یک پیام کلیک می‌کند (auto-read)
4. برای پیام نامناسب، دکمه "مسدود کردن" را می‌زند
5. برای پیام‌های دیگر، دکمه "آرشیو" را می‌زند
6. فیلتر "آرشیو" را انتخاب می‌کند تا پیام‌های قدیمی را ببیند

---

### سناریو 3: Pin کردن کاربر توسط ادمین

1. ادمین به `/members` می‌رود
2. در بخش "سایر اعضا"، کاربر مورد نظر را پیدا می‌کند
3. دکمه "افزودن به ویژه" را می‌زند
4. کاربر به بخش "اعضای ویژه" منتقل می‌شود
5. اطلاعات کامل کاربر برای همه نمایش داده می‌شود

---

## 🔒 امنیت

### Rate Limiting

```javascript
// درخواست OTP
{
  key: 'guest_request_otp',
  windowMs: 5 * 60 * 1000, // 5 دقیقه
  limit: 3 // 3 تلاش
}

// ارسال پیام
{
  key: 'guest_send_message',
  windowMs: 60 * 60 * 1000, // 1 ساعت
  limit: 5 // 5 پیام
}
```

### هش OTP
```javascript
import { hash as argonHash } from 'argon2';

const otpHash = await argonHash(otpCode);
```

### بررسی‌های امنیتی

✅ **AdminSettings.allowGuestChat:** قبل از ارسال OTP  
✅ **Blocked Phones:** بررسی در لیست مسدودی  
✅ **OTP Expiration:** 5 دقیقه  
✅ **Message Length:** 10-1000 کاراکتر  
✅ **Admin Authorization:** بررسی نقش ADMIN  
✅ **JWT Validation:** تأیید session cookie  

---

## 🧪 تست

### تست دستی

#### 1. تست ارسال پیام مهمان

```bash
# Step 1: Request OTP
curl -X POST http://localhost:4000/api/guest/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"09123456789"}'

# Check SMS for OTP code

# Step 2: Send Message
curl -X POST http://localhost:4000/api/guest/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone":"09123456789",
    "otp":"123456",
    "messageBody":"این یک پیام تست است"
  }'
```

#### 2. تست مسدود کردن شماره

```bash
# با حساب ادمین لاگین کنید
# سپس:
curl -X POST http://localhost:4000/api/admin/block-phone \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=..." \
  -d '{"phone":"+989123456789"}'
```

#### 3. تست Pin کردن کاربر

```bash
curl -X PUT http://localhost:4000/api/admin/users/USER_ID/toggle-pin \
  -H "Cookie: authjs.session-token=..."
```

---

## 📁 ساختار فایل‌ها

```
src/
├── app/
│   ├── api/
│   │   ├── guest/
│   │   │   ├── request-otp/route.js
│   │   │   └── send-message/route.js
│   │   ├── users/
│   │   │   └── list/route.js
│   │   └── admin/
│   │       ├── guest-messages/route.js
│   │       ├── block-phone/route.js
│   │       └── users/[userId]/toggle-pin/route.js
│   ├── members/page.tsx
│   ├── contact/page.tsx
│   └── admin/
│       └── guest-messages/page.tsx
├── components/
│   ├── MembersList.tsx
│   ├── GuestMessageForm.tsx
│   └── admin/
│       └── AdminGuestMessagesDashboard.tsx
└── prisma/
    └── schema.prisma (updated)
```

---

## 🚀 استقرار و راه‌اندازی

### 1. Migration

```bash
cd create/apps/web
npx prisma migrate dev --name add_guest_messaging_system
```

### 2. تنظیمات اولیه

اطمینان حاصل کنید که در `.env` موارد زیر تنظیم شده‌اند:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
KAVENEGAR_API_KEY="..."
```

### 3. تست

1. سرور را راه‌اندازی کنید: `npm run dev`
2. به `/contact` بروید و پیامی ارسال کنید
3. با حساب ادمین وارد `/admin/guest-messages` شوید
4. به `/members` بروید و کاربری را Pin کنید

---

## 📝 نکات مهم

### 1. SMS Provider
- کد OTP از طریق Kavenegar ارسال می‌شود
- مطمئن شوید که `KAVENEGAR_API_KEY` معتبر است

### 2. Blocked Phones
- آرایه‌ای از شماره‌های نرمال شده (`+98...`)
- بررسی می‌شود قبل از ارسال OTP

### 3. OTP Security
- هش می‌شود با argon2
- 5 دقیقه اعتبار دارد
- پس از استفاده حذف می‌شود

### 4. Pinned Users
- جزئیات کامل نمایش داده می‌شود
- فقط ادمین می‌تواند Pin/Unpin کند
- در بالای لیست نمایش داده می‌شوند

---

## 🐛 رفع مشکلات

### مشکل: OTP ارسال نمی‌شود
**راه‌حل:**
- `KAVENEGAR_API_KEY` را بررسی کنید
- لاگ‌های سرور را چک کنید
- اعتبار حساب Kavenegar را تأیید کنید

### مشکل: پیام ذخیره نمی‌شود
**راه‌حل:**
- migration را اجرا کنید
- connection string دیتابیس را چک کنید
- Prisma client را regenerate کنید

### مشکل: دکمه Pin/Unpin کار نمی‌کند
**راه‌حل:**
- مطمئن شوید با حساب ADMIN لاگین کرده‌اید
- session cookie را بررسی کنید
- Network tab را در DevTools چک کنید

---

**نسخه:** 1.0.0  
**تاریخ:** 2025-10-10  
**نویسنده:** Full-Stack Developer

