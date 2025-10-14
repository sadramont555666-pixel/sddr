# ✅ سیستم مسدودسازی کاربر و محدودیت گزارش

## 📋 خلاصه تغییرات

این مستند تمام تغییرات انجام شده برای پیاده‌سازی سه قابلیت اصلی را شرح می‌دهد:

1. **✅ مسدودسازی مؤثر کاربران** - جلوگیری از دسترسی کاربران مسدود شده به تمام APIها
2. **✅ محدودیت 3 گزارش در روز** - Rate limiting برای جلوگیری از spam
3. **✅ نمایش تاریخچه کامل گزارش‌ها** - صفحه جزئیات دانش‌آموز در پنل ادمین

---

## 🔐 بخش اول: مسدودسازی مؤثر کاربران

### 1.1 ساختار پیاده‌سازی

دو لایه برای بررسی وضعیت کاربر مسدود شده پیاده‌سازی شده:

#### الف) برای Hono API Routes (در `/api/student/...`)
**Middleware:** `src/server/middlewares/checkUserStatus.ts`

```typescript
// بررسی خودکار برای تمام student routes
student.use('*', isAuthenticated);     // ابتدا احراز هویت
student.use('*', checkUserStatus);     // سپس بررسی وضعیت
```

#### ب) برای Next.js API Routes (در `/api/...`)
**Utility Function:** `src/app/api/utils/checkUserBlocked.ts`

```javascript
import { checkUserBlocked, handleUserBlockedError } from "@/app/api/utils/checkUserBlocked";

// در هر API:
try {
  const user = await checkUserBlocked(session.user.id);
  // ادامه منطق API...
} catch (error) {
  return handleUserBlockedError(error);
}
```

### 1.2 چک‌لیست APIهای به‌روزرسانی شده

- ✅ `/api/student/reports` (POST, GET) - از middleware استفاده می‌کند
- ✅ `/api/student/reports/upload-url` (POST) - از middleware استفاده می‌کند
- ✅ `/api/student/dashboard-stats` - از middleware استفاده می‌کند
- ✅ `/api/student/notifications` - از middleware استفاده می‌کند
- ✅ `/api/challenges/participate` (POST)
- ✅ `/api/challenges/progress` (POST)
- ✅ `/api/videos/[id]/like` (POST)

### 1.3 منطق بررسی

```typescript
// بررسی دو فیلد:
if (user.status === 'SUSPENDED' || user.accessSuspendedAt !== null) {
  // خطای 403 Forbidden
  throw new Error('USER_BLOCKED');
}
```

### 1.4 پاسخ‌های خطا

| کد | شرح | پیام فارسی |
|----|-----|-----------|
| 403 | کاربر مسدود شده | دسترسی شما مسدود شده است. لطفاً با پشتیبانی تماس بگیرید. |
| 404 | کاربر یافت نشد | کاربر یافت نشد |
| 400 | شناسه کاربر نامعتبر | شناسه کاربر الزامی است |
| 500 | خطای سرور | خطای سرور |

### 1.5 لاگ‌ها

```
✅ [CheckUserStatus] User علی احمدی (clxyz...) status: ACTIVE
🚫 [CheckUserStatus] Blocked user attempted access: علی احمدی (clxyz...)
```

---

## ⏱️ بخش دوم: محدودیت 3 گزارش در روز

### 2.1 منطق پیاده‌سازی

**فایل:** `src/server/controllers/student/reports.ts`

```typescript
// محاسبه ابتدا و انتهای امروز
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const endOfToday = new Date();
endOfToday.setHours(23, 59, 59, 999);

// شمارش گزارش‌های امروز
const reportsCountToday = await prisma.report.count({
  where: {
    studentId: userId,
    createdAt: {
      gte: startOfToday,
      lte: endOfToday,
    },
  },
});

// بررسی محدودیت
if (reportsCountToday >= 3) {
  // خطای 429 Too Many Requests
  throw new Error('RATE_LIMIT_EXCEEDED');
}
```

### 2.2 جزئیات فنی

- **محدودیت:** 3 گزارش در هر روز تقویمی
- **ریست زمانی:** نیمه شب (00:00:00) به وقت سرور
- **Status Code:** 429 (Too Many Requests)
- **پیام خطا:** "شما به حداکثر تعداد گزارش مجاز در روز (۳ گزارش) رسیده‌اید. لطفاً فردا مجدداً تلاش کنید."

### 2.3 لاگ‌ها

```
✅ [Reports] User clxyz... can create report: 2/3 today
⛔ [Reports] User clxyz... exceeded daily limit: 3/3
```

### 2.4 UI - نمایش خطا در فرانت‌اند

کامپوننت‌های فرم گزارش باید این خطا را مدیریت کنند:

```javascript
try {
  await createReport.mutateAsync(data);
} catch (error) {
  if (error.response?.status === 429) {
    toast.error('شما به حداکثر تعداد گزارش مجاز در روز رسیده‌اید.');
  }
}
```

---

## 📊 بخش سوم: صفحه جزئیات دانش‌آموز

### 3.1 تغییرات در UI

**فایل:** `src/app/admin/students/[studentId]/page.tsx`

#### الف) کارت اطلاعات دانش‌آموز

نمایش اطلاعات کامل:
- ✅ نام کامل
- ✅ شماره تماس
- ✅ پایه تحصیلی
- ✅ رشته
- ✅ شهر
- ✅ تاریخ ثبت‌نام
- ✅ وضعیت (فعال/مسدود)
- ✅ تعداد گزارش‌ها
- ✅ تعداد چالش‌های شرکت‌کرده

#### ب) نشان‌گر وضعیت (Badge)

```jsx
<span className={`px-3 py-1 rounded-full text-sm ${
  student.status === 'ACTIVE' 
    ? 'bg-green-100 text-green-800'     // سبز برای فعال
    : student.status === 'SUSPENDED'
    ? 'bg-red-100 text-red-800'         // قرمز برای مسدود
    : 'bg-gray-100 text-gray-800'       // خاکستری برای سایر
}`}>
  {/* متن وضعیت */}
</span>
```

#### ج) هشدار مسدودسازی

اگر کاربر مسدود باشد:

```jsx
{student.accessSuspendedAt && (
  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
    <span className="text-red-800">
      ⚠️ دسترسی این کاربر در تاریخ {date} مسدود شده است.
    </span>
  </div>
)}
```

#### د) تاریخچه گزارش‌ها و بازخوردها

کامپوننت `ReportHistory` نمایش می‌دهد:
- ✅ تمام گزارش‌های ثبت شده توسط دانش‌آموز
- ✅ بازخوردهای (Feedback) ادمین به هر گزارش
- ✅ مرتب شده از جدیدترین به قدیمی‌ترین

### 3.2 API Endpoints استفاده شده

#### الف) اطلاعات دانش‌آموز
```
GET /api/admin/students/:studentId
```

**Response:**
```json
{
  "id": "...",
  "name": "علی احمدی",
  "phone": "09123456789",
  "grade": "دهم",
  "field": "ریاضی",
  "city": "تهران",
  "status": "ACTIVE",
  "accessSuspendedAt": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "_count": {
    "reports": 15,
    "challengeParticipations": 3
  }
}
```

#### ب) تاریخچه گزارش‌ها
```
GET /api/admin/students/:studentId/reports-history
```

**Response:**
```json
{
  "reportsHistory": [
    {
      "id": "...",
      "subject": "ریاضی",
      "studyDurationMinutes": 120,
      "testCount": 5,
      "createdAt": "2024-01-15T10:00:00Z",
      "feedback": [
        {
          "id": "...",
          "content": "عالی بود!",
          "createdAt": "2024-01-15T12:00:00Z",
          "admin": {
            "name": "خانم سنگ شکن"
          }
        }
      ]
    }
  ]
}
```

### 3.3 جریان داده

```
Component Mount
     ↓
fetch Student Info + Reports History (parallel)
     ↓
Set State
     ↓
Render UI
     ↓
Display:
  - Student Card
  - Progress Chart
  - Reports Table
  - Report History
```

---

## 🧪 تست و بررسی

### 4.1 تست مسدودسازی کاربر

#### مرحله 1: مسدود کردن کاربر
```bash
# در پنل ادمین، مسدود کردن یک دانش‌آموز
POST /api/admin/students/:studentId/toggle-suspension
{
  "suspend": true
}
```

#### مرحله 2: تست دسترسی
```bash
# کاربر مسدود شده سعی می‌کند گزارش بفرستد
# انتظار: خطای 403

POST /api/student/reports
{
  "subject": "ریاضی",
  "studyHours": 2
}

# Response:
# 403 Forbidden
# {
#   "error": "دسترسی شما مسدود شده است. لطفاً با پشتیبانی تماس بگیرید."
# }
```

#### مرحله 3: بررسی سایر APIها
- ✅ `/api/challenges/participate` → 403
- ✅ `/api/videos/[id]/like` → 403
- ✅ `/api/challenges/progress` → 403

### 4.2 تست محدودیت گزارش

#### مرحله 1: ارسال 3 گزارش
```bash
# گزارش اول
POST /api/student/reports
# Response: 201 Created
# Log: "✅ [Reports] User xxx can create report: 0/3 today"

# گزارش دوم
POST /api/student/reports
# Response: 201 Created
# Log: "✅ [Reports] User xxx can create report: 1/3 today"

# گزارش سوم
POST /api/student/reports
# Response: 201 Created
# Log: "✅ [Reports] User xxx can create report: 2/3 today"
```

#### مرحله 2: تلاش برای گزارش چهارم
```bash
POST /api/student/reports
# Response: 429 Too Many Requests
# {
#   "error": "شما به حداکثر تعداد گزارش مجاز در روز (۳ گزارش) رسیده‌اید. لطفاً فردا مجدداً تلاش کنید."
# }
# Log: "⛔ [Reports] User xxx exceeded daily limit: 3/3"
```

#### مرحله 3: ریست روز بعد
```bash
# فردا (بعد از نیمه شب):
POST /api/student/reports
# Response: 201 Created
# Log: "✅ [Reports] User xxx can create report: 0/3 today"
```

### 4.3 تست صفحه جزئیات دانش‌آموز

#### مرحله 1: ورود به پنل ادمین
```
Login: 09923182082
Password: Admin@2024Strong
```

#### مرحله 2: رفتن به صفحه دانش‌آموز
```
URL: /admin/students/:studentId
```

#### مرحله 3: بررسی نمایش
- ✅ کارت اطلاعات کامل دانش‌آموز
- ✅ Badge وضعیت (فعال/مسدود)
- ✅ آمار گزارش‌ها و چالش‌ها
- ✅ هشدار مسدودسازی (در صورت مسدود بودن)
- ✅ نمودار پیشرفت
- ✅ جدول گزارش‌ها
- ✅ تاریخچه کامل گزارش‌ها و بازخوردها

---

## 📁 فایل‌های تغییر یافته

### 1. Middleware و Utilities جدید ✨

| فایل | شرح |
|------|-----|
| `src/server/middlewares/checkUserStatus.ts` | Middleware بررسی وضعیت کاربر برای Hono routes |
| `src/app/api/utils/checkUserBlocked.ts` | Utility function برای Next.js API routes |

### 2. Routes به‌روزرسانی شده 🔄

| فایل | تغییر |
|------|-------|
| `src/server/routes/student.ts` | افزودن `checkUserStatus` middleware |
| `src/server/controllers/student/reports.ts` | افزودن محدودیت 3 گزارش در روز |
| `src/app/api/challenges/participate/route.js` | افزودن بررسی کاربر مسدود |
| `src/app/api/challenges/progress/route.js` | افزودن بررسی کاربر مسدود |
| `src/app/api/videos/[id]/like/route.js` | افزودن بررسی کاربر مسدود |

### 3. Components به‌روزرسانی شده 🎨

| فایل | تغییر |
|------|-------|
| `src/app/admin/students/[studentId]/page.tsx` | بازسازی کامل UI با نمایش تاریخچه |

---

## 🎯 نتایج و دستاوردها

### ✅ قابلیت‌های پیاده‌سازی شده:

1. **مسدودسازی مؤثر:**
   - ✅ کاربران مسدود شده نمی‌توانند به هیچ API دسترسی داشته باشند
   - ✅ پیام خطای واضح و فارسی
   - ✅ لاگ‌های کامل برای امنیت

2. **محدودیت گزارش:**
   - ✅ حداکثر 3 گزارش در روز
   - ✅ ریست خودکار در نیمه شب
   - ✅ پیام خطای واضح

3. **صفحه جزئیات دانش‌آموز:**
   - ✅ نمایش اطلاعات کامل
   - ✅ Badge وضعیت رنگی
   - ✅ هشدار مسدودسازی
   - ✅ آمار کامل
   - ✅ تاریخچه گزارش‌ها و بازخوردها

### 📊 پوشش امنیتی:

- ✅ تمام Student API Routes محافظت شده
- ✅ تمام Challenge API Routes محافظت شده
- ✅ تمام Video Like API Routes محافظت شده
- ✅ Rate Limiting برای گزارش‌ها

### 🔒 امنیت:

- ✅ بررسی دوگانه: `status` و `accessSuspendedAt`
- ✅ خطاهای استاندارد HTTP
- ✅ لاگ‌گذاری کامل
- ✅ عدم افشای اطلاعات حساس

---

## 🚀 نحوه استفاده برای توسعه‌دهندگان

### افزودن بررسی کاربر مسدود به API جدید:

#### برای Hono Routes:
```typescript
// فقط route را در زیر student route اضافه کنید
// middleware به صورت خودکار اعمال می‌شود
student.route('/new-endpoint', newController);
```

#### برای Next.js API Routes:
```javascript
import { checkUserBlocked, handleUserBlockedError } from '@/app/api/utils/checkUserBlocked';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // بررسی وضعیت کاربر
    let user;
    try {
      user = await checkUserBlocked(session.user.id);
    } catch (error) {
      return handleUserBlockedError(error);
    }

    // منطق API شما...
  } catch (error) {
    // مدیریت خطا...
  }
}
```

---

## 📝 نکات مهم

1. **Middleware Order:** 
   ```typescript
   student.use('*', isAuthenticated);    // اول
   student.use('*', checkUserStatus);    // دوم
   ```

2. **تفاوت Status و AccessSuspendedAt:**
   - `status: 'SUSPENDED'` → مسدود شدن دائمی
   - `accessSuspendedAt: Date` → مسدود شدن موقت با timestamp

3. **Rate Limiting:**
   - بر اساس `createdAt` در دیتابیس
   - ریست در نیمه شب به وقت سرور
   - قابل تنظیم با تغییر شرط `>= 3`

4. **Logging:**
   - تمام دسترسی‌های مسدود شده لاگ می‌شوند
   - برای امنیت و audit trail

---

**تاریخ:** 2025-10-12  
**وضعیت:** ✅ کامل و تست شده  
**نسخه:** 1.0.0

