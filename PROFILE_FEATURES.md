# سیستم پروفایل و تنظیمات امنیتی

این سند مستندات کامل قابلیت‌های پروفایل کاربری و تنظیمات امنیتی است که برای سامانه گزارش‌گیری مطالعه پیاده‌سازی شده است.

## 📋 فهرست مطالب

1. [پروفایل دانش‌آموز](#پروفایل-دانشآموز)
2. [پروفایل مدیر](#پروفایل-مدیر)
3. [تنظیمات امنیتی](#تنظیمات-امنیتی)
4. [API Endpoints](#api-endpoints)
5. [تغییرات Database Schema](#تغییرات-database-schema)

---

## 🎓 پروفایل دانش‌آموز

### مسیر: `/student-dashboard/profile`

### ویژگی‌ها:
- ✅ نمایش اطلاعات شخصی (نام، شماره تماس، پایه، رشته، شهر، تاریخ ثبت‌نام)
- ✅ آپلود عکس پروفایل (JPG, PNG - حداکثر 200MB)
- ✅ تغییر عکس پروفایل
- ✅ حذف عکس پروفایل
- ✅ نمایش عکس در Dropdown هدر داشبورد

### کامپوننت‌ها:
- `src/components/student/ProfileDropdown.tsx` - منوی کشویی پروفایل در هدر
- `src/components/student/StudentProfilePage.tsx` - صفحه اصلی پروفایل
- `src/app/student-dashboard/profile/page.tsx` - Route handler

### API Endpoints:
- `POST /api/profile/student/avatar` - آپلود عکس
- `DELETE /api/profile/student/avatar` - حذف عکس

---

## 👩‍💼 پروفایل مدیر (خانم سنگ‌شکن)

### مسیر: `/admin/profile`

### ویژگی‌ها:
- ✅ ویرایش نام و نام خانوادگی
- ✅ ویرایش شماره موبایل
- ✅ افزودن شماره تماس ثابت (اختیاری)
- ✅ افزودن آدرس دفتر مشاور (اختیاری)
- ✅ افزودن بیوگرافی/توضیحات (اختیاری)
- ✅ آپلود/تغییر/حذف عکس پروفایل (JPG, PNG - حداکثر 200MB)
- ✅ دکمه ذخیره تغییرات

### کامپوننت‌ها:
- `src/components/admin/AdminProfileDropdown.tsx` - منوی کشویی پروفایل در هدر
- `src/components/admin/AdminProfilePage.tsx` - صفحه ویرایش پروفایل
- `src/app/admin/profile/page.tsx` - Route handler

### API Endpoints:
- `PUT /api/profile/admin` - به‌روزرسانی اطلاعات پروفایل
- `POST /api/profile/admin/avatar` - آپلود عکس
- `DELETE /api/profile/admin/avatar` - حذف عکس

---

## 🔐 تنظیمات امنیتی

### مسیر: `/admin/settings/security`

### ویژگی‌ها:
- ✅ تغییر رمز عبور مدیر
- ✅ اعتبارسنجی رمز فعلی
- ✅ الزامات رمز عبور:
  - حداقل 8 کاراکتر
  - حداقل یک حرف (a-z یا A-Z)
  - حداقل یک عدد (0-9)
- ✅ تایید رمز جدید
- ✅ نمایش/مخفی کردن رمز عبور
- ✅ **Rate Limiting**: محدودیت 5 تلاش در 15 دقیقه
- ✅ پیام‌های خطا و موفقیت واضح
- ✅ لاگ تغییرات امنیتی

### کامپوننت‌ها:
- `src/components/admin/AdminSecurityPage.tsx` - صفحه تنظیمات امنیتی
- `src/app/admin/settings/security/page.tsx` - Route handler

### API Endpoints:
- `POST /api/auth/admin/change-password` - تغییر رمز عبور

### امنیت:
```javascript
// Rate Limiting Configuration
{
  key: 'change_password',
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  limit: 5 // 5 تلاش
}
```

---

## 📡 API Endpoints

### دانش‌آموز

#### `POST /api/profile/student/avatar`
آپلود عکس پروفایل دانش‌آموز

**Request:**
```
Content-Type: multipart/form-data
Body: { avatar: File }
```

**Response:**
```json
{
  "success": true,
  "profileImageUrl": "/uploads/avatars/xxx.jpg"
}
```

#### `DELETE /api/profile/student/avatar`
حذف عکس پروفایل دانش‌آموز

**Response:**
```json
{
  "success": true
}
```

### مدیر

#### `PUT /api/profile/admin`
به‌روزرسانی اطلاعات پروفایل مدیر

**Request:**
```json
{
  "name": "خانم ملیکا سنگ‌شکن",
  "phone": "09123456789",
  "landlinePhone": "02112345678",
  "officeAddress": "تهران، خیابان ولیعصر",
  "bio": "مشاور تحصیلی با 10 سال سابقه"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... }
}
```

#### `POST /api/profile/admin/avatar`
آپلود عکس پروفایل مدیر

**Request:**
```
Content-Type: multipart/form-data
Body: { avatar: File }
```

**Response:**
```json
{
  "success": true,
  "profileImageUrl": "/uploads/avatars/admin-xxx.jpg"
}
```

#### `DELETE /api/profile/admin/avatar`
حذف عکس پروفایل مدیر

**Response:**
```json
{
  "success": true
}
```

### امنیت

#### `POST /api/auth/admin/change-password`
تغییر رمز عبور مدیر

**Request:**
```json
{
  "currentPassword": "Admin@2024Strong",
  "newPassword": "NewPassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "رمز عبور شما با موفقیت تغییر کرد"
}
```

**Response (Error):**
```json
{
  "error": "رمز عبور فعلی اشتباه است",
  "field": "currentPassword"
}
```

**Response (Rate Limited):**
```json
{
  "error": "تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید."
}
```

---

## 💾 تغییرات Database Schema

### فیلدهای جدید در جدول `User`:

```prisma
model User {
  // ... فیلدهای قبلی
  
  // Admin-specific fields
  bio           String?   // بیوگرافی/کامنت مدیر
  officeAddress String?   // آدرس دفتر مشاور
  landlinePhone String?   // شماره تماس ثابت
}
```

### Migration:
```bash
npx prisma migrate dev --name add_admin_profile_fields
```

---

## 🎨 UI/UX ویژگی‌ها

### Dropdown پروفایل:
- عکس پروفایل گرد با gradient background
- نام کاربر
- فلش انیمیشن‌دار
- منوی کشویی با انیمیشن fadeIn
- گزینه‌های:
  - 👤 مشاهده پروفایل
  - ⚙️ تنظیمات
  - 🔒 تنظیمات امنیتی (فقط مدیر)
  - 🚪 خروج از حساب

### صفحه پروفایل:
- هدر با gradient رنگی
- بخش آپلود عکس با preview
- نمایش اطلاعات با آیکون‌های مناسب
- طراحی ریسپانسیو
- دکمه‌های با loading state

### صفحه تنظیمات امنیتی:
- فرم تغییر رمز سه مرحله‌ای
- دکمه نمایش/مخفی رمز
- نمایش الزامات رمز عبور
- پیام‌های خطا/موفقیت واضح
- هشدار امنیتی

---

## 🔒 امنیت

### آپلود فایل:
- ✅ بررسی نوع فایل (فقط JPG, PNG)
- ✅ بررسی حجم فایل (حداکثر 200MB)
- ✅ نام فایل یونیک با timestamp
- ✅ حذف فایل قبلی هنگام آپلود جدید

### تغییر رمز:
- ✅ Rate limiting (5 تلاش در 15 دقیقه)
- ✅ اعتبارسنجی رمز فعلی با argon2
- ✅ الزامات قوی برای رمز جدید
- ✅ هش‌سازی با argon2
- ✅ لاگ تغییرات برای audit

### احراز هویت:
- ✅ بررسی JWT token از cookie
- ✅ بررسی نقش کاربر (ADMIN/STUDENT)
- ✅ Session management

---

## 📝 یادداشت‌های توسعه

### ساختار فایل‌ها:
```
src/
├── components/
│   ├── student/
│   │   ├── ProfileDropdown.tsx
│   │   ├── StudentProfilePage.tsx
│   │   └── StudentDashboardLayout.tsx
│   └── admin/
│       ├── AdminProfileDropdown.tsx
│       ├── AdminProfilePage.tsx
│       ├── AdminSecurityPage.tsx
│       └── AdminLayout.tsx
├── app/
│   ├── student-dashboard/
│   │   └── profile/
│   │       └── page.tsx
│   ├── admin/
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── security/
│   │           └── page.tsx
│   └── api/
│       ├── profile/
│       │   ├── student/
│       │   │   └── avatar/
│       │   │       └── route.js
│       │   └── admin/
│       │       ├── route.js
│       │       └── avatar/
│       │           └── route.js
│       └── auth/
│           └── admin/
│               └── change-password/
│                   └── route.js
└── prisma/
    └── migrations/
        └── 20251010161145_add_admin_profile_fields/
```

### Dependencies استفاده شده:
- `lucide-react` - آیکون‌ها
- `@auth/create/react` - احراز هویت
- `react-router` - navigation
- `argon2` - هش رمز عبور
- `prisma` - ORM

---

## ✅ تست‌ها

### تست دستی:

1. **پروفایل دانش‌آموز:**
   - ✅ ورود به حساب دانش‌آموز
   - ✅ کلیک روی dropdown پروفایل
   - ✅ رفتن به صفحه پروفایل
   - ✅ آپلود عکس جدید
   - ✅ حذف عکس
   - ✅ بررسی نمایش در header

2. **پروفایل مدیر:**
   - ✅ ورود به حساب مدیر
   - ✅ کلیک روی dropdown پروفایل
   - ✅ رفتن به صفحه پروفایل
   - ✅ ویرایش همه فیلدها
   - ✅ آپلود عکس
   - ✅ ذخیره تغییرات

3. **تنظیمات امنیتی:**
   - ✅ رفتن به صفحه تنظیمات امنیتی
   - ✅ تست رمز فعلی اشتباه
   - ✅ تست رمز جدید ضعیف
   - ✅ تست عدم مطابقت رمزها
   - ✅ تغییر رمز موفق
   - ✅ تست rate limiting

---

## 🐛 رفع مشکلات رایج

### مشکل: عکس آپلود نمی‌شود
**راه حل:**
```bash
# ایجاد دایرکتوری uploads
mkdir -p public/uploads/avatars
chmod 755 public/uploads/avatars
```

### مشکل: خطای 401 Unauthorized
**راه حل:**
- بررسی کنید که AUTH_SECRET در .env تنظیم شده باشد
- مطمئن شوید که کوکی session به درستی ست شده است
- کوکی‌های مرورگر را پاک کنید و دوباره لاگین کنید

### مشکل: Rate limiting کار نمی‌کند
**راه حل:**
- بررسی کنید که `rateLimit` utility به درستی import شده باشد
- مطمئن شوید که Redis یا in-memory store فعال است

---

## 📧 پشتیبانی

برای گزارش باگ یا درخواست ویژگی جدید، لطفاً یک Issue در GitHub باز کنید.

---

**نسخه:** 1.0.0  
**تاریخ:** 2025-10-10  
**نویسنده:** توسعه‌دهنده Full-Stack

