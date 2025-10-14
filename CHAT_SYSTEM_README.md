# 💬 سیستم چت و مدیریت محتوا

## ✅ کارهای انجام شده

### 1. Backend (API & Database)

#### **Prisma Schema**
- ✅ Model `ChatMessage` با فیلدهای کامل:
  - محتوا، نوع (public/private)، فرستنده، گیرنده
  - وضعیت (visible/hidden)، پرچم profanity
  - زمان‌ها (createdAt, updatedAt, deletedAt)
  
- ✅ Model `Profanity` برای مدیریت کلمات نامناسب
- ✅ Relations کامل با User model

#### **API Endpoints**

**پیام‌ها:**
- ✅ `GET /api/messages` - دریافت پیام‌ها (public/private)
- ✅ `POST /api/messages` - ارسال پیام جدید با فیلتر profanity
- ✅ `PATCH /api/messages/[id]/hide` - مخفی کردن پیام (ادمین)
- ✅ `GET /api/chat` - backward compatible با کد قدیمی

**کلمات نامناسب:**
- ✅ `GET /api/profanities` - لیست کلمات (ادمین)
- ✅ `POST /api/profanities` - افزودن کلمه (ادمین)
- ✅ `DELETE /api/profanities/[id]` - حذف کلمه (ادمین)

**کاربران:**
- ✅ `GET /api/users` - دریافت لیست کاربران با فیلتر role

#### **فیلتر کلمات نامناسب**
- ✅ Utility: `src/server/utils/profanityFilter.js`
- ✅ نرمال‌سازی متن فارسی (تبدیل آ→ا، ی→ی، حذف فاصله)
- ✅ Regex پیشرفته برای تشخیص با فاصله/نقطه بین حروف
- ✅ کش 5 دقیقه‌ای برای بهینه‌سازی
- ✅ جلوگیری از ارسال پیام‌های حاوی کلمات بد

#### **امنیت**
- ✅ Rate Limiting: حداکثر 5 پیام در دقیقه
- ✅ محدودیت طول پیام: 2000 کاراکتر
- ✅ Authentication با session
- ✅ Authorization (ادمین برای hide/profanity)

---

### 2. Frontend (UI Components)

#### **کامپوننت‌های چت**
- ✅ `PublicChat.jsx` - چت عمومی با:
  - دریافت و نمایش پیام‌ها
  - ارسال پیام با validation
  - نمایش خطای profanity
  - Auto-scroll به آخر
  - Polling هر 5 ثانیه (بدون WebSocket)
  - UI زیبا با gradient و avatar

- ✅ `PrivateChat.jsx` - چت خصوصی با مشاور:
  - یافتن خودکار admin
  - UI متفاوت برای پیام‌های ادمین
  - نمایش وضعیت قفل و محرمانگی

#### **صفحات**
- ✅ `/chat` - صفحه اصلی چت با tabs
  - حذف بخش "رتبه‌برترها" طبق درخواست
  - دو تب: چت عمومی + پیام به مشاور
  - راهنمای استفاده

- ✅ `/admin/chat-management` - پنل مدیریت ادمین:
  - لیست تمام پیام‌ها
  - دکمه مخفی کردن پیام
  - مدیریت کلمات نامناسب (افزودن/حذف)
  - دو تب: پیام‌ها | کلمات

---

### 3. ویژگی‌های اضافی

- ✅ Seed script برای کلمات نامناسب اولیه
- ✅ Error handling جامع در همه endpoints
- ✅ Logging کامل برای debug
- ✅ UI responsive برای موبایل
- ✅ استایل یکپارچه با Tailwind
- ✅ Font فارسی Vazirmatn

---

## 📋 تفاوت‌ها با نسخه قبلی

### ❌ حذف شده:
- ❌ بخش "رتبه‌برترها" از `/chat` (طبق درخواست)
- ❌ SQL queries خام
- ❌ جداول قدیمی `chat_messages`

### ✅ جایگزین شده:
- ✅ Prisma ORM به جای SQL
- ✅ Model `ChatMessage` جدید
- ✅ فیلتر کلمات نامناسب فارسی
- ✅ UI مدرن و زیبا

---

## 🚀 راه‌اندازی

### 1. Migration دیتابیس
```bash
cd create/apps/web
npx prisma db push
npx prisma generate
```

### 2. Seed کلمات نامناسب اولیه
```bash
node prisma/seed-profanity.js
```

### 3. اجرای سرور
```bash
npm run dev
# یا
pnpm dev
```

---

## 📖 نحوه استفاده

### برای دانش‌آموزان:
1. ورود به `/chat`
2. انتخاب تب "گفت‌وگو عمومی" یا "پیام به مشاور"
3. ارسال پیام (حداکثر 2000 کاراکتر، 5 پیام در دقیقه)

### برای مدیر:
1. ورود به `/admin/chat-management`
2. **تب پیام‌ها**: مشاهده و مخفی کردن پیام‌های نامناسب
3. **تب کلمات نامناسب**: 
   - افزودن کلمات جدید
   - حذف کلمات موجود
4. مشاهده پیام‌های خصوصی در `PrivateChat`

---

## ⚠️ نکات مهم

### امنیت:
- ✅ تمام endpoints احراز هویت دارند
- ✅ فقط ادمین می‌تواند پیام مخفی کند
- ✅ Rate limiting برای جلوگیری از spam
- ✅ فیلتر خودکار کلمات نامناسب

### عملکرد:
- ✅ کش 5 دقیقه‌ای برای profanity list
- ✅ Polling هر 5 ثانیه (فعلاً بدون WebSocket)
- ✅ Query optimization با Prisma

### UX:
- ✅ پیام خطای واضح برای profanity
- ✅ Disabled state برای دکمه‌ها
- ✅ Loading states
- ✅ Auto-scroll در چت

---

## 🔮 پیشنهادات برای آینده (اختیاری)

### WebSocket/Real-time
فعلاً سیستم از **polling** (دریافت هر 5 ثانیه) استفاده می‌کند که برای تعداد کم کاربر کافی است.

اگر در آینده بخواهید WebSocket اضافه کنید:

1. نصب Socket.IO:
```bash
npm install socket.io socket.io-client
```

2. ایجاد `src/server/socket.js` (نمونه در پرامپت اصلی موجود است)

3. تغییر `PublicChat` و `PrivateChat` به استفاده از socket events

**مزایا:**
- ✅ بدون تأخیر (instant)
- ✅ کاهش درخواست‌های HTTP

**معایب:**
- ❌ پیچیدگی بیشتر
- ❌ نیاز به سرور جداگانه یا تنظیمات خاص

---

## 🐛 عیب‌یابی

### پیام ارسال نمی‌شود:
1. بررسی console browser (F12)
2. بررسی لاگ سرور
3. چک کردن اتصال دیتابیس
4. بررسی session authentication

### فیلتر کار نمی‌کند:
1. اطمینان از seed شدن کلمات: `node prisma/seed-profanity.js`
2. بررسی `/admin/chat-management` → تب کلمات
3. چک کردن لاگ سرور برای خطای profanity

### خطای 500:
1. بررسی Prisma migration: `npx prisma db push`
2. بررسی اتصال PostgreSQL
3. چک کردن متغیر `DATABASE_URL` در `.env`

---

## 📞 پشتیبانی

برای سوالات یا مشکلات:
- بررسی لاگ سرور
- بررسی console مرورگر
- مطالعه این مستند

---

**توسعه‌دهنده:** AI Assistant  
**تاریخ:** 2025  
**نسخه:** 1.0.0

