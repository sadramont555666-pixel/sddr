# Admin Dashboard - Complete Implementation Guide

این سند راهنمای کامل پیاده‌سازی پنل مدیریت خانم سنگ‌شکن است.

## 📋 فهرست مطالب

1. [معماری Backend](#backend-architecture)
2. [معماری Frontend](#frontend-architecture)
3. [API Endpoints](#api-endpoints)
4. [نحوه استفاده](#usage)
5. [تست API](#testing)

---

## 🏗️ Backend Architecture

### Middlewares

#### `src/server/middlewares/isAdmin.ts`
- وابسته به `isAuthenticated` است (باید قبل از آن اجرا شود)
- کاربر را از دیتابیس با `c.get('userId')` بارگذاری می‌کند
- چک می‌کند که `role === 'ADMIN'`
- در صورت موفقیت، `c.set('adminId', userId)` را تنظیم می‌کند
- در غیر این صورت 403 Forbidden را برمی‌گرداند

### Controllers

#### 1. `src/server/controllers/admin/students.ts`
**Endpoints:**
- `GET /api/admin/students` - لیست دانش‌آموزان با pagination
  - Query Params: `?page=1&pageSize=28&search=&status=ALL|ACTIVE|SUSPENDED`
  - Response: `{ items, total, page, pageSize, totalPages }`
  - هر آیتم شامل: `id, name, phone, grade, field, city, profileImageUrl, status, accessSuspendedAt, pendingReportsCount`

- `GET /api/admin/students/:studentId` - جزئیات کامل یک دانش‌آموز

- `POST /api/admin/students/:studentId/toggle-suspension` - مسدودسازی/رفع مسدودیت
  - Body: `{ suspend: boolean, reason?: string }`
  - تاریخ `accessSuspendedAt` را تنظیم یا پاک می‌کند
  - `status` را به `SUSPENDED` یا `ACTIVE` تغییر می‌دهد

#### 2. `src/server/controllers/admin/reports.ts`
**Endpoints:**
- `GET /api/admin/reports` - لیست گزارش‌ها با فیلتر و pagination
  - Query Params: `?page=1&pageSize=20&studentId=&status=ALL|PENDING|APPROVED|REJECTED&sortBy=date|createdAt&sortOrder=asc|desc`
  - Response: `{ items, total, page, pageSize, totalPages }`
  - هر آیتم شامل: student info + feedback (اگر وجود داشته باشد)

- `GET /api/admin/reports/:reportId` - جزئیات کامل گزارش

- `POST /api/admin/reports/:reportId/feedback` - ثبت بازخورد
  - Body: `{ content: string, decision: 'APPROVED'|'REJECTED' }`
  - با استفاده از `upsert` بازخورد را ایجاد یا به‌روزرسانی می‌کند
  - وضعیت گزارش را بر اساس `decision` به‌روزرسانی می‌کند
  - از transaction برای consistency استفاده می‌کند

- `DELETE /api/admin/reports/:reportId` - حذف گزارش

#### 3. `src/server/controllers/admin/challenges.ts`
**CRUD کامل برای Challenges:**
- `GET /api/admin/challenges` - لیست با pagination
  - Query: `?page=1&pageSize=20&isActive=true|false|all`
- `GET /api/admin/challenges/:id` - دریافت یک چالش
- `POST /api/admin/challenges` - ایجاد چالش جدید
  - Body: `{ title, description, isActive, startDate, endDate }`
- `PUT /api/admin/challenges/:id` - به‌روزرسانی چالش
- `DELETE /api/admin/challenges/:id` - حذف چالش

#### 4. `src/server/controllers/admin/videos.ts`
**CRUD کامل برای Videos:**
- `GET /api/admin/videos` - لیست با pagination و فیلتر دسته‌بندی
  - Query: `?page=1&pageSize=20&category=`
- `GET /api/admin/videos/:id` - دریافت یک ویدیو
- `POST /api/admin/videos` - ایجاد ویدیو جدید
  - Body: `{ title, category, videoUrl }`
  - `uploadedById` به‌صورت خودکار از `adminId` تنظیم می‌شود
- `PUT /api/admin/videos/:id` - به‌روزرسانی ویدیو
- `DELETE /api/admin/videos/:id` - حذف ویدیو
- `GET /api/admin/videos/categories/list` - لیست دسته‌بندی‌های یونیک

### Routing

#### `src/server/routes/admin.ts`
```typescript
import { Hono } from 'hono';
import isAuthenticated from '../middlewares/isAuthenticated';
import isAdmin from '../middlewares/isAdmin';

const admin = new Hono();

// All admin routes require authentication and admin role
admin.use('*', isAuthenticated, isAdmin);

// Mount sub-routes
admin.route('/students', studentsController);
admin.route('/reports', reportsController);
admin.route('/challenges', challengesController);
admin.route('/videos', videosController);
```

#### `src/server/routes/index.ts`
```typescript
routes.route('/admin', admin);
```

---

## 🎨 Frontend Architecture

### Data Hooks (`src/hooks/admin/`)

#### `useAdminStats.ts`
```typescript
useAdminStats() // Returns { totalStudents, pendingReports }
```

#### `useAdminStudents.ts`
```typescript
useAdminStudents(page: number)
useToggleSuspension() // Mutation: { studentId, suspend: boolean }
```

#### `useAdminReports.ts`
```typescript
useAdminReports({ studentId?, status?, page })
useAdminReport(reportId: string)
useAdminFeedback() // Mutation: { reportId, content, decision }
```

#### `useAdminChallengesVideos.ts`
```typescript
// Challenges
useAdminChallenges(page: number)
useCreateChallenge()
useUpdateChallenge()
useDeleteChallenge()

// Videos
useAdminVideos(page: number)
useCreateVideo()
useUpdateVideo()
useDeleteVideo()
```

### Components (`src/components/admin/`)

#### `AdminLayout.tsx`
- Layout اصلی با sidebar navigation
- Header با عنوان و دکمه خروج
- Sidebar با آیتم‌های منو:
  - داشبورد
  - دانش‌آموزان
  - گزارش‌ها
  - چالش‌ها
  - ویدیوها

#### `StudentsGrid.tsx`
- Grid 7 ستونی (responsive)
- هر کارت شامل: avatar، نام، تعداد گزارش‌های pending
- دکمه‌ها: مشاهده صفحه شخصی، مسدود/رفع مسدودیت
- Pagination

#### `ReportsTable.tsx`
- جدول گزارش‌ها با ستون‌های: تاریخ، موضوع، تست، ساعت، وضعیت
- دکمه "بازخورد" برای هر گزارش
- فیلتر بر اساس studentId و status
- Pagination

#### `FeedbackModal.tsx`
- Modal برای ثبت بازخورد
- نمایش جزئیات گزارش
- لینک دانلود فایل (اگر وجود داشته باشد)
- Textarea برای متن بازخورد
- دو دکمه: "تایید و ارسال" / "رد و ارسال"

### Pages (`src/app/admin/`)

#### `/admin/page.tsx` (Dashboard)
- نمایش آمار: تعداد دانش‌آموزان، گزارش‌های در انتظار
- `StudentsGrid` component

#### `/admin/students/[studentId]/page.tsx` (Student Profile)
- Header با اطلاعات دانش‌آموز
- `ProgressChart` component
- `ReportsTable` فیلتر شده برای این دانش‌آموز

#### `/admin/reports/page.tsx`
- `ReportsTable` component با تمام گزارش‌ها

#### `/admin/challenges/page.tsx`
- لیست چالش‌ها با جدول
- Modal CRUD برای ایجاد/ویرایش
- دکمه‌های حذف

#### `/admin/videos/page.tsx`
- لیست ویدیوها با جدول
- Modal CRUD برای ایجاد/ویرایش
- دکمه‌های حذف
- لینک مشاهده ویدیو

---

## 🔌 API Endpoints Summary

### Authentication
```
POST /api/auth/credentials-login
Body: { identifier, password }
Response: { success, user, nextUrl }
```

### Students
```
GET    /api/admin/students?page=1&pageSize=28
GET    /api/admin/students/:id
POST   /api/admin/students/:id/toggle-suspension
```

### Reports
```
GET    /api/admin/reports?page=1&status=PENDING
GET    /api/admin/reports/:id
POST   /api/admin/reports/:id/feedback
DELETE /api/admin/reports/:id
```

### Challenges
```
GET    /api/admin/challenges?page=1
GET    /api/admin/challenges/:id
POST   /api/admin/challenges
PUT    /api/admin/challenges/:id
DELETE /api/admin/challenges/:id
```

### Videos
```
GET    /api/admin/videos?page=1&category=
GET    /api/admin/videos/:id
POST   /api/admin/videos
PUT    /api/admin/videos/:id
DELETE /api/admin/videos/:id
GET    /api/admin/videos/categories/list
```

---

## 🚀 Usage

### 1. ورود به پنل ادمین
```
URL: http://localhost:4002/account/signin
Phone: 09923182082
Password: Admin@2024Strong
```

پس از ورود موفق، به `/admin` هدایت می‌شوید.

### 2. دسترسی به صفحات
- Dashboard: `/admin`
- دانش‌آموزان: `/admin/students`
- گزارش‌ها: `/admin/reports`
- چالش‌ها: `/admin/challenges`
- ویدیوها: `/admin/videos`

---

## 🧪 Testing

### PowerShell Test Script
فایل `test-admin-api.ps1` را اجرا کنید:
```powershell
cd F:\ddgub\ddgub2\create\apps\web
.\test-admin-api.ps1
```

### Manual curl Tests

#### 1. Login
```bash
curl -X POST http://localhost:4002/api/auth/credentials-login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"09923182082","password":"Admin@2024Strong"}' \
  -c cookies.txt
```

#### 2. List Students
```bash
curl -X GET "http://localhost:4002/api/admin/students?page=1&pageSize=5" \
  -b cookies.txt
```

#### 3. List Reports
```bash
curl -X GET "http://localhost:4002/api/admin/reports?status=PENDING&page=1" \
  -b cookies.txt
```

#### 4. Create Challenge
```bash
curl -X POST http://localhost:4002/api/admin/challenges \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Test Challenge",
    "description": "Test Description",
    "isActive": true,
    "startDate": "2025-01-01T00:00:00",
    "endDate": "2025-01-31T23:59:59"
  }'
```

---

## 📝 Notes

### Security
- تمام endpoint های admin نیازمند authentication و admin role هستند
- از middleware های `isAuthenticated` و `isAdmin` استفاده شده
- Session cookies با `HttpOnly` و `SameSite=lax` تنظیم می‌شوند

### Performance
- از `_count` در Prisma برای `pendingReportsCount` استفاده شده تا از N+1 جلوگیری شود
- Pagination در تمام لیست‌ها پیاده‌سازی شده
- React Query برای caching و invalidation استفاده می‌شود

### Error Handling
- تمام controller ها با try-catch محافظت شده‌اند
- خطاهای Prisma (مثل P2002) به‌طور خاص handle می‌شوند
- پیام‌های خطا به فارسی برای UX بهتر

### Validation
- از zod برای validation ورودی‌های API استفاده شده
- خطاهای validation با status 400 برگردانده می‌شوند

---

## ✅ Completion Status

### Backend
- ✅ isAdmin middleware
- ✅ Students controller (list, detail, toggle-suspension)
- ✅ Reports controller (list, detail, feedback, delete)
- ✅ Challenges controller (full CRUD)
- ✅ Videos controller (full CRUD)
- ✅ Admin routes configuration

### Frontend
- ✅ Admin hooks (stats, students, reports, challenges, videos)
- ✅ AdminLayout component
- ✅ StudentsGrid component
- ✅ ReportsTable component
- ✅ FeedbackModal component
- ✅ Dashboard page
- ✅ Student profile page
- ✅ Reports page
- ✅ Challenges CRUD page
- ✅ Videos CRUD page

### Testing
- ✅ PowerShell test script
- ⏳ Manual UI testing (نیاز به راه‌اندازی سرور)

---

**تاریخ تکمیل**: 2025-10-10
**نسخه**: 1.0.0

