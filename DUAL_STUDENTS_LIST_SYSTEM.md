# سیستم لیست دانش‌آموزان دو بخشی با قابلیت سنجاق

مستندات کامل سیستم مدیریت لیست دانش‌آموزان در داشبورد ادمین

## 📋 فهرست

1. [خلاصه سیستم](#خلاصه-سیستم)
2. [تغییرات Database](#تغییرات-database)
3. [تغییرات Backend](#تغییرات-backend)
4. [تغییرات Frontend](#تغییرات-frontend)
5. [راهنمای استفاده](#راهنمای-استفاده)
6. [Testing](#testing)

---

## 🎯 خلاصه سیستم

این سیستم به ادمین اجازه می‌دهد تا دانش‌آموزان را به دو دسته تقسیم کند:

### **1. دانش‌آموزان سنجاق‌شده (Pinned)**
- همیشه در بالای لیست نمایش داده می‌شوند
- **بدون صفحه‌بندی** - همه در یک نگاه قابل مشاهده هستند
- با رنگ و استایل متمایز نمایش داده می‌شوند
- ایده‌آل برای: دانش‌آموزان VIP، نیازمند توجه ویژه، یا موارد فوری

### **2. سایر دانش‌آموزان (Normal)**
- در زیر لیست سنجاق‌شده‌ها نمایش داده می‌شوند
- **با صفحه‌بندی** - هر صفحه ۲۸ نفر (قابل تنظیم)
- با استایل استاندارد

### **3. دکمه سنجاق (Pin Button)**
- یک آیکون دایره‌ای کوچک در گوشه بالا-چپ هر کارت
- **Pinned:** دایره زرد توپُر با آیکون سفید
- **Not Pinned:** دایره خاکستری توخالی
- کلیک روی آن → جابجایی فوری بین دو لیست

---

## 💾 تغییرات Database

### Schema Update

فیلد `pinned` به مدل `User` اضافه شد:

```prisma
model User {
  // ... existing fields
  pinned Boolean @default(false) // برای سنجاق کردن در لیست
  
  // ... relations
}
```

### Migration

```bash
# Migration قبلاً اجرا شده است
npx prisma migrate dev --name add_pinned_to_user
```

---

## 🔧 تغییرات Backend

### 1. API Endpoint: Toggle Pin Status

**مسیر:** `PATCH /api/admin/users/:userId/toggle-pin`

**کاربرد:** تغییر وضعیت سنجاق یک کاربر

**Authentication:** نیازمند نقش ADMIN

**Request:**
```http
PATCH /api/admin/users/clx123.../toggle-pin
Cookie: authjs.session-token=...
```

**Response (Success):**
```json
{
  "success": true,
  "message": "کاربر به لیست اعضای ویژه اضافه شد",
  "user": {
    "id": "clx...",
    "name": "علی احمدی",
    "pinned": true,
    "profileImageUrl": null,
    "role": "STUDENT",
    "grade": "دهم",
    "field": "ریاضی",
    "phone": "09123456789"
  }
}
```

**منطق:**
1. دریافت `userId` از URL params
2. یافتن کاربر در database
3. برعکس کردن مقدار `pinned` (`true` → `false` یا برعکس)
4. بازگشت کاربر به‌روز شده

**پیاده‌سازی:**
```typescript
// src/app/api/admin/users/[userId]/toggle-pin/route.js
async function togglePinHandler(request, { params }) {
  const user = await getUserFromRequest(request);
  
  // Check admin role
  if (user.role !== 'ADMIN') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId } = params;
  
  // Get current user
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinned: true },
  });

  // Toggle pinned status
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { pinned: !targetUser.pinned },
  });

  return Response.json({ success: true, user: updatedUser });
}

export async function PATCH(request, { params }) {
  return await togglePinHandler(request, { params });
}
```

---

### 2. API Endpoint: List Students (Updated)

**مسیر:** `GET /api/admin/students`

**تغییرات:**
- اضافه شدن فیلد `pinned` به response
- مرتب‌سازی بر اساس `pinned` (نزولی) سپس `createdAt`

**Response:**
```json
{
  "items": [
    {
      "id": "clx...",
      "name": "سارا رضایی",
      "pinned": true,    // ← جدید
      "grade": "یازدهم",
      "pendingReportsCount": 3,
      // ... other fields
    },
    {
      "id": "clx...",
      "name": "محمد جوادی",
      "pinned": false,   // ← جدید
      "grade": "دهم",
      "pendingReportsCount": 1,
      // ... other fields
    }
  ],
  "total": 45,
  "page": 1,
  "pageSize": 28
}
```

**پیاده‌سازی:**
```typescript
// src/server/controllers/admin/students.ts
const students = await prisma.user.findMany({
  where: { role: 'STUDENT' },
  select: {
    id: true,
    name: true,
    pinned: true,  // ← اضافه شد
    // ... other fields
  },
  orderBy: [
    { pinned: 'desc' }, // ← سنجاق‌شده‌ها اول
    { createdAt: 'desc' },
  ],
  skip,
  take: pageSize,
});
```

---

## 🎨 تغییرات Frontend

### 1. کامپوننت جدید: `StudentsGridDual.tsx`

**مسیر:** `src/components/admin/StudentsGridDual.tsx`

**ویژگی‌ها:**
- ✅ تفکیک خودکار دانش‌آموزان به دو لیست
- ✅ آیکون سنجاق در هر کارت
- ✅ refetch خودکار پس از toggle
- ✅ UI واکنش‌گرا (responsive)
- ✅ نمایش تعداد در هر بخش

**ساختار:**
```tsx
export default function StudentsGridDual() {
  const { data, refetch } = useAdminStudents(page);
  const items = data?.items ?? [];
  
  // تفکیک به دو لیست
  const pinnedUsers = items.filter(s => s.pinned === true);
  const normalUsers = items.filter(s => s.pinned !== true);

  // تابع toggle
  const handleTogglePin = async (studentId, currentPinned) => {
    await fetch(`/api/admin/users/${studentId}/toggle-pin`, {
      method: 'PATCH',
    });
    refetch(); // ← به‌روزرسانی UI
  };

  return (
    <div className="space-y-8">
      {/* بخش سنجاق‌شده */}
      {pinnedUsers.length > 0 && (
        <div className="bg-yellow-50 border-yellow-200">
          <h2>دانش‌آموزان سنجاق‌شده</h2>
          <div className="grid">
            {pinnedUsers.map(s => (
              <StudentCard student={s} isPinned={true} />
            ))}
          </div>
        </div>
      )}
      
      {/* بخش عادی */}
      <div className="bg-white">
        <h2>سایر دانش‌آموزان</h2>
        <div className="grid">
          {normalUsers.map(s => (
            <StudentCard student={s} isPinned={false} />
          ))}
        </div>
        {/* صفحه‌بندی فقط اینجا */}
        <Pagination />
      </div>
    </div>
  );
}
```

---

### 2. کامپوننت کارت دانش‌آموز

**ویژگی‌ها:**
- آیکون سنجاق در گوشه بالا-چپ
- استایل متفاوت برای pinned/normal
- دکمه‌های عملیات (مشاهده، مسدود)

**پیاده‌سازی:**
```tsx
const StudentCard = ({ student, isPinned }) => (
  <div className={`border rounded-lg p-3 relative ${
    isPinned ? 'border-yellow-400 bg-yellow-50' : ''
  }`}>
    {/* آیکون سنجاق */}
    <button
      onClick={() => handleTogglePin(student.id, student.pinned)}
      className={`absolute top-2 left-2 p-1.5 rounded-full ${
        student.pinned
          ? 'bg-yellow-500 hover:bg-yellow-600'
          : 'bg-gray-200 hover:bg-gray-300'
      }`}
    >
      <Pin className={`w-3.5 h-3.5 ${
        student.pinned ? 'text-white fill-white' : 'text-gray-600'
      }`} />
    </button>

    {/* محتوای کارت */}
    <img src={student.profileImageUrl} />
    <div>{student.name}</div>
    <div>در انتظار: {student.pendingReportsCount}</div>
    
    {/* دکمه‌های عملیات */}
    <a href={`/admin/students/${student.id}`}>مشاهده</a>
    <button>مسدود</button>
  </div>
);
```

---

### 3. صفحه داشبورد ادمین (Updated)

**مسیر:** `src/app/admin/page.tsx`

**تغییر:**
```tsx
// قبل:
import StudentsGrid from '@/components/admin/StudentsGrid';

// بعد:
import StudentsGridDual from '@/components/admin/StudentsGridDual';

export default function Page() {
  return (
    <AdminLayout>
      {/* Stats cards */}
      <StudentsGridDual /> {/* ← به جای StudentsGrid */}
    </AdminLayout>
  );
}
```

---

## 📖 راهنمای استفاده

### برای ادمین

#### سنجاق کردن دانش‌آموز

1. در داشبورد ادمین (`/admin`), لیست دانش‌آموزان را مشاهده کنید
2. روی **آیکون دایره خاکستری** (⚪) در گوشه بالا-چپ کارت دانش‌آموز کلیک کنید
3. آیکون تبدیل به **دایره زرد** (🟡) می‌شود
4. دانش‌آموز به بخش "دانش‌آموزان سنجاق‌شده" منتقل می‌شود
5. **بدون نیاز به رفرش صفحه!**

#### حذف از سنجاق

1. روی **آیکون دایره زرد** (🟡) دانش‌آموز سنجاق‌شده کلیک کنید
2. آیکون تبدیل به **دایره خاکستری** (⚪) می‌شود
3. دانش‌آموز به بخش "سایر دانش‌آموزان" منتقل می‌شود

#### تصویر سیستم

```
┌─────────────────────────────────────────────────────┐
│ داشبورد ادمین                                       │
├─────────────────────────────────────────────────────┤
│ [آمار کلی]                                          │
├─────────────────────────────────────────────────────┤
│ 📌 دانش‌آموزان سنجاق‌شده [3]                       │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ │🟡 Pin    │ │🟡 Pin    │ │🟡 Pin    │             │
│ │👤 سارا   │ │👤 علی    │ │👤 زهرا   │             │
│ │📊 3 گزارش│ │📊 5 گزارش│ │📊 2 گزارش│             │
│ └──────────┘ └──────────┘ └──────────┘             │
├─────────────────────────────────────────────────────┤
│ سایر دانش‌آموزان [42]                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ │⚪ Pin    │ │⚪ Pin    │ │⚪ Pin    │ │⚪ Pin    ││
│ │👤 محمد   │ │👤 فاطمه  │ │👤 حسین   │ │👤 مریم   ││
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                     │
│ [قبلی]  صفحه 1 از 2  [بعدی]  ← فقط اینجا          │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Manual Testing

#### 1. تست سنجاق کردن

```bash
# لاگین به عنوان ادمین
# رفتن به /admin
# کلیک روی یک آیکون خاکستری
# بررسی:
✓ آیکون به زرد تبدیل شد؟
✓ دانش‌آموز به بالای لیست منتقل شد؟
✓ بدون رفرش صفحه؟
```

#### 2. تست حذف از سنجاق

```bash
# کلیک روی یک آیکون زرد
# بررسی:
✓ آیکون به خاکستری تبدیل شد؟
✓ دانش‌آموز به لیست عادی منتقل شد؟
```

#### 3. تست صفحه‌بندی

```bash
# رفتن به صفحه 2
# بررسی:
✓ دانش‌آموزان سنجاق‌شده همچنان در بالا هستند؟
✓ فقط دانش‌آموزان عادی صفحه‌بندی دارند؟
```

---

### API Testing

```bash
# تست toggle pin
curl -X PATCH http://localhost:4000/api/admin/users/USER_ID/toggle-pin \
  -H "Cookie: authjs.session-token=..." \
  | jq

# Expected response:
{
  "success": true,
  "message": "کاربر به لیست اعضای ویژه اضافه شد",
  "user": {
    "id": "...",
    "pinned": true,
    ...
  }
}

# تست لیست دانش‌آموزان
curl http://localhost:4000/api/admin/students \
  -H "Cookie: authjs.session-token=..." \
  | jq '.items[] | select(.pinned == true)'
```

---

## 🐛 Troubleshooting

### مشکل: دانش‌آموز جابجا نمی‌شود

**علت:** `refetch()` فراخوانی نشده  
**راه‌حل:**
```tsx
const { data, refetch } = useAdminStudents(page);

const handleTogglePin = async (studentId) => {
  await fetch(...);
  await refetch(); // ← این خط ضروری است
};
```

---

### مشکل: آیکون سنجاق نمایش داده نمی‌شود

**علت:** فیلد `pinned` در API response نیست  
**راه‌حل:**
```typescript
// در students.ts controller
select: {
  id: true,
  name: true,
  pinned: true, // ← اضافه کنید
}
```

---

### مشکل: ارور 403 Forbidden

**علت:** کاربر ادمین نیست  
**راه‌حل:**
```bash
# بررسی session
console.log(session?.user?.role); // باید 'ADMIN' باشد
```

---

## 📊 مقایسه قبل و بعد

| ویژگی | قبل | بعد |
|-------|-----|-----|
| **لیست دانش‌آموزان** | تک لیست | دو لیست (pinned + normal) |
| **سنجاق کردن** | ❌ | ✅ آیکون دایره‌ای |
| **صفحه‌بندی** | برای همه | فقط برای normal |
| **Visual Feedback** | معمولی | pinned با پس‌زمینه زرد |
| **دسته‌بندی** | ❌ | ✅ خودکار |

---

## 🚀 آماده استفاده!

همه چیز آماده است:

1. ✅ Database schema به‌روز شده (فیلد `pinned`)
2. ✅ API endpoint برای toggle (`PATCH /api/admin/users/:id/toggle-pin`)
3. ✅ API endpoint لیست به‌روز شده (مرتب‌سازی با `pinned`)
4. ✅ کامپوننت `StudentsGridDual` با دو بخش
5. ✅ صفحه داشبورد ادمین به‌روز شده

**برای تست:**
```
http://localhost:4000/admin
```

**ادمین credentials:**
```
Phone: 09923182082
Password: Admin@2024Strong
```

---

**نسخه:** 1.0.0  
**تاریخ:** 2025-10-11  
**پشتیبانی:** Full-Stack Development Team

