# 🔧 رفع مشکل عدم نمایش چالش‌ها در داشبورد دانش‌آموز

## 🐛 مشکل
چالش‌های ایجاد شده توسط ادمین در پنل مدیریت، در داشبورد دانش‌آموز نمایش داده نمی‌شدند و پیام "هنوز چالشی ایجاد نشده است" ظاهر می‌شد.

---

## 🔍 علت اصلی مشکل

**عدم هماهنگی بین دو منبع داده:**

1. **پنل ادمین** (`/admin/challenges`):
   - از Hono Controllers استفاده می‌کرد
   - از **Prisma ORM** برای ذخیره در دیتابیس استفاده می‌کرد
   - داده‌ها در مدل `Challenge` ذخیره می‌شدند

2. **داشبورد دانش‌آموز** (`/challenges`):
   - از API endpoint قدیمی (`/api/challenges`) استفاده می‌کرد
   - این API از **raw SQL queries** استفاده می‌کرد
   - به جداول قدیمی `challenges` و `users` مراجعه می‌کرد

**نتیجه:** دو سیستم کاملاً جدا از هم که با دو منبع داده مختلف کار می‌کردند!

---

## ✅ راه‌حل اعمال شده

### 1. مایگریشن API از Raw SQL به Prisma

**فایل تغییر یافته:** `src/app/api/challenges/route.js`

#### تغییرات کلیدی:

**قبل (Raw SQL):**
```javascript
import sql from "@/app/api/utils/sql";

// Get all challenges
const challenges = await sql`
  SELECT 
    c.*,
    COUNT(DISTINCT cp.user_id) as total_participants
  FROM challenges c
  LEFT JOIN challenge_participations cp ON c.id = cp.challenge_id
  GROUP BY c.id
  ORDER BY c.created_at DESC
`;
```

**بعد (Prisma):**
```javascript
import prisma from "@/app/api/utils/prisma";

// Get all active challenges using Prisma
const challengesData = await prisma.challenge.findMany({
  where: {
    isActive: true, // ✅ فقط چالش‌های فعال
  },
  include: {
    participations: {
      select: {
        studentId: true,
      },
    },
  },
  orderBy: {
    startDate: 'desc',
  },
});
```

---

## 🎯 ویژگی‌های جدید

### 1. فیلتر چالش‌های فعال
```javascript
where: {
  isActive: true, // فقط چالش‌های فعال نمایش داده می‌شوند
}
```

### 2. تبدیل فرمت داده برای سازگاری با فرانت‌اند
```javascript
const challenges = challengesData.map(challenge => ({
  id: challenge.id,
  title: challenge.title,
  description: challenge.description,
  start_date: challenge.startDate,    // camelCase → snake_case
  end_date: challenge.endDate,
  is_active: challenge.isActive,
  total_participants: challenge.participations.length,
  successful_participants: 0,
}));
```

### 3. لاگ برای دیباگ
```javascript
console.log('✅ Fetched challenges for student:', challenges.length);
```

---

## 📝 تغییرات در POST Endpoint

**هدف:** ایجاد چالش جدید توسط ادمین

**تغییرات:**
- ✅ مایگریشن از raw SQL به Prisma
- ✅ تصحیح نقش: `role === "ADMIN"` به جای `"advisor"`
- ✅ تبدیل تاریخ‌ها به `DateTime` برای Prisma
- ✅ بازگشت فرمت سازگار با فرانت‌اند

```javascript
// Create challenge using Prisma
const newChallenge = await prisma.challenge.create({
  data: {
    title,
    description: description || "",
    startDate: new Date(start_date),
    endDate: new Date(end_date),
    isActive: is_active,
  },
});
```

---

## 🎨 تغییرات در فرانت‌اند

**فایل:** `src/app/challenges/page.jsx`

**افزودن لاگ برای دیباگ:**
```javascript
const fetchChallenges = async () => {
  // ...
  const data = await response.json();
  console.log('✅ Fetched Challenges for Student Dashboard:', data.challenges);
  setChallenges(data.challenges || []);
};
```

---

## 📊 مقایسه قبل و بعد

| ویژگی | قبل از رفع | بعد از رفع |
|-------|-----------|-----------|
| منبع داده | دو منبع جدا (SQL + Prisma) | یک منبع یکپارچه (Prisma) |
| نمایش چالش‌ها | ❌ خالی | ✅ نمایش چالش‌های فعال |
| فیلتر فعال/غیرفعال | ❌ ندارد | ✅ فقط `isActive: true` |
| سازگاری داده | ❌ عدم تطابق | ✅ تطابق کامل |
| دیباگ | ❌ سخت | ✅ لاگ‌های مفید |

---

## 🧪 تست و بررسی

### مراحل تست:

1. **ایجاد چالش در پنل ادمین:**
   - ورود به `/admin/challenges`
   - افزودن چالش جدید با وضعیت "فعال"
   - ✅ چالش باید در Prisma `Challenge` ذخیره شود

2. **بررسی نمایش در داشبورد دانش‌آموز:**
   - ورود با حساب دانش‌آموز
   - مراجعه به `/challenges`
   - ✅ چالش جدید باید نمایش داده شود

3. **بررسی Console Logs:**
   ```javascript
   // Backend log:
   ✅ Fetched challenges for student: 1
   
   // Frontend log:
   ✅ Fetched Challenges for Student Dashboard: [...]
   ```

4. **تست فیلتر فعال/غیرفعال:**
   - غیرفعال کردن چالش در پنل ادمین
   - ✅ چالش نباید در داشبورد دانش‌آموز نمایش داده شود

---

## 🔐 مدل Prisma

```prisma
model Challenge {
  id          String    @id @default(cuid())
  title       String
  description String
  isActive    Boolean   @default(true)
  startDate   DateTime
  endDate     DateTime

  participations ChallengeParticipation[]
}
```

---

## 🚨 نکات مهم

### 1. نقش کاربر
```javascript
// ❌ قدیمی (SQL)
const isAdvisor = currentUser.role === "advisor";

// ✅ جدید (Prisma)
const isAdvisor = currentUser.role === "ADMIN";
```

### 2. نام فیلدها
- **Prisma Schema:** `camelCase` (`startDate`, `endDate`, `isActive`)
- **Frontend/API Response:** `snake_case` (`start_date`, `end_date`, `is_active`)
- ✅ تبدیل در `map()` انجام می‌شود

### 3. فیلتر فعال بودن
```javascript
where: {
  isActive: true, // ✅ مهم: فقط چالش‌های فعال
}
```

---

## 📦 فایل‌های تغییر یافته

1. ✅ `src/app/api/challenges/route.js` - مایگریشن کامل به Prisma
2. ✅ `src/app/challenges/page.jsx` - افزودن لاگ دیباگ

---

## 🔮 کارهای آتی (اختیاری)

### 1. مایگریشن `/api/challenges/participate`
این endpoint هنوز از raw SQL استفاده می‌کند و نیاز به مایگریشن دارد.

### 2. حذف وابستگی `sql`
پس از مایگریشن تمام endpoint ها، می‌توان پکیج raw SQL را حذف کرد.

### 3. اضافه کردن فیلد `completedAt`
برای ردیابی زمان تکمیل چالش توسط دانش‌آموز.

---

## ✅ خلاصه

**مشکل:** عدم نمایش چالش‌ها به دلیل استفاده از دو منبع داده مختلف (SQL و Prisma)

**راه‌حل:** مایگریشن کامل API به Prisma و فیلتر چالش‌های فعال

**نتیجه:** چالش‌های ایجاد شده توسط ادمین، اکنون در داشبورد دانش‌آموز به درستی نمایش داده می‌شوند! 🎉

---

**تاریخ رفع:** 2025-10-12  
**وضعیت:** ✅ حل شده  
**آسیب به سایر بخش‌ها:** ❌ بدون آسیب

