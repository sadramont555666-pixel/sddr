# پیش‌نمایش غنی لینک و سیستم بازدید یکتا ویدیوها

این سند تمام تغییرات اعمال شده برای پیاده‌سازی دو قابلیت کلیدی را شرح می‌دهد:

## ✨ قابلیت‌های پیاده‌سازی شده

### 1. پیش‌نمایش غنی لینک (Rich Link Preview)
کارت‌های ویدیو در داشبورد دانش‌آموز اکنون پیش‌نمایش غنی (تصویر، عنوان، توضیحات) از URL ویدیو را دقیقاً مانند تلگرام نمایش می‌دهند.

### 2. سیستم شمارش بازدید یکتا (Unique View Tracking)
شمارنده بازدید هر ویدیو فقط یک بار به ازای هر کاربر افزایش می‌یابد، صرف‌نظر از اینکه کاربر چند بار روی ویدیو کلیک کرده یا مودال آن را باز می‌کند.

---

## 📦 تغییرات دیتابیس (Prisma Schema)

### فیلدهای جدید در مدل `Video`:
```prisma
model Video {
  // ... فیلدهای قبلی
  
  // فیلدهای پیش‌نمایش غنی
  previewTitle       String?     // عنوان پیش‌نمایش
  previewDescription String?     // توضیحات پیش‌نمایش
  previewImage       String?     // تصویر پیش‌نمایش
  
  // رابطه با مدل ردیابی بازدید
  viewedBy     VideoView[]
}
```

### مدل جدید `VideoView`:
```prisma
model VideoView {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  video   Video  @relation(fields: [videoId], references: [id], onDelete: Cascade)
  videoId String

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String

  @@unique([userId, videoId]) // هر کاربر فقط یک بار بازدید ثبت می‌شود
}
```

### رابطه در مدل `User`:
```prisma
model User {
  // ... فیلدهای قبلی
  videoViews VideoView[] // رابطه با مدل ردیابی بازدید
}
```

**Migration اجرا شده:**
```bash
npx prisma generate
npx prisma migrate dev --name add_video_preview_and_views
```

---

## 🔧 تغییرات بک‌اند

### 1. کنترلر ادمین ویدیوها (`src/server/controllers/admin/videos.ts`)

#### تابع کمکی برای استخراج پیش‌نمایش:
```typescript
import { getLinkPreview } from 'link-preview-js';

async function fetchLinkPreview(url: string) {
  try {
    const previewData = await getLinkPreview(url, {
      timeout: 5000,
      followRedirects: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    return {
      previewTitle: previewData.title || null,
      previewDescription: previewData.description || null,
      previewImage: (previewData.images && previewData.images[0]) || 
                    (previewData.favicons && previewData.favicons[0]) || 
                    null,
    };
  } catch (error) {
    console.error('خطا در استخراج پیش‌نمایش لینک:', error);
    return {
      previewTitle: null,
      previewDescription: null,
      previewImage: null,
    };
  }
}
```

#### POST /api/admin/videos (ایجاد ویدیو):
- استخراج خودکار متادیتای پیش‌نمایش از `videoUrl`
- ذخیره `previewTitle`, `previewDescription`, `previewImage` در دیتابیس

#### PUT /api/admin/videos/:videoId (ویرایش ویدیو):
- اگر `videoUrl` تغییر کند، پیش‌نمایش جدید استخراج و ذخیره می‌شود

### 2. API بازدید یکتا (`src/app/api/videos/[id]/view/route.js`)

#### منطق بازدید یکتا:
```javascript
try {
  // ۱. تلاش برای ایجاد رکورد بازدید جدید
  await prisma.videoView.create({
    data: { userId, videoId },
  });

  // ۲. اگر موفق بود، شمارنده را افزایش بده
  const updatedVideo = await prisma.video.update({
    where: { id: videoId },
    data: { views: { increment: 1 } },
  });

  return Response.json({ 
    success: true, 
    views: updatedVideo.views,
    message: 'بازدید با موفقیت ثبت شد'
  });

} catch (error) {
  // ۳. اگر محدودیت یکتا (P2002) رخ داد، بازدید قبلاً ثبت شده
  if (error.code === 'P2002') {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    return Response.json({ 
      success: true,
      views: video?.views || 0, 
      message: 'بازدید قبلاً ثبت شده است.' 
    });
  }
  throw error;
}
```

**ویژگی‌های کلیدی:**
- ✅ هر کاربر فقط یک بار می‌تواند یک ویدیو را ببیند
- ✅ محدودیت یکتای دیتابیس (`@@unique([userId, videoId])`) از تکرار جلوگیری می‌کند
- ✅ در صورت تلاش مجدد، پاسخ موفق با تعداد بازدید فعلی برگردانده می‌شود

### 3. API لیست ویدیوها (`src/app/api/videos/route.js`)

#### فیلدهای جدید در select:
```javascript
select: {
  // ... فیلدهای قبلی
  previewTitle: true,
  previewDescription: true,
  previewImage: true,
}
```

#### فرمت خروجی:
```javascript
const formattedVideos = videos.map(video => ({
  // ... فیلدهای قبلی
  preview_title: video.previewTitle,
  preview_description: video.previewDescription,
  preview_image: video.previewImage,
}));
```

---

## 🎨 تغییرات فرانت‌اند

### صفحه ویدیوها (`src/app/videos/page.jsx`)

#### نمایش پیش‌نمایش غنی:
```jsx
{videos.map((video) => {
  // استفاده از پیش‌نمایش غنی یا fallback به YouTube thumbnail
  const videoId = extractVideoId(video.video_url);
  const thumbnailUrl = video.preview_image || 
    (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={video.preview_title || video.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.target.src = "/placeholder-video.jpg";
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Play className="w-16 h-16 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-2 line-clamp-2">
          {video.preview_title || video.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {video.preview_description || video.description}
        </p>
      </div>
    </div>
  );
})}
```

**ویژگی‌های کلیدی:**
- ✅ اولویت با `preview_image` استخراج شده از لینک
- ✅ Fallback به YouTube thumbnail اگر پیش‌نمایش موجود نباشد
- ✅ Placeholder زیبا اگر هیچ تصویری موجود نباشد
- ✅ نمایش عنوان و توضیحات استخراج شده از لینک

#### ثبت بازدید یکتا:
```javascript
const openVideoModal = async (video) => {
  setSelectedVideo(video);
  
  // افزایش بازدید (fire-and-forget)
  try {
    await fetch(`/api/videos/${video.id}/view`, {
      method: "POST",
    });
  } catch (error) {
    console.error("Error incrementing view:", error);
  }
};
```

**نکات مهم:**
- ✅ درخواست به صورت "fire-and-forget" ارسال می‌شود
- ✅ باز شدن مودال منتظر پاسخ API نمی‌ماند
- ✅ تجربه کاربری روان و سریع

---

## 📦 وابستگی‌های جدید

```bash
npm install link-preview-js
```

**استفاده شده در:**
- `src/server/controllers/admin/videos.ts`

---

## 🧪 تست قابلیت‌ها

### 1. تست پیش‌نمایش غنی:

1. **ورود به پنل ادمین** (`/admin/videos`)
2. **افزودن ویدیو جدید** با یک URL (مثلاً YouTube, Aparat, Instagram)
3. **بررسی لاگ سرور** برای مشاهده استخراج موفق متادیتا
4. **مراجعه به داشبورد دانش‌آموز** (`/videos`)
5. **بررسی نمایش:**
   - ✅ تصویر پیش‌نمایش استخراج شده
   - ✅ عنوان لینک (نه عنوان دستی ادمین)
   - ✅ توضیحات لینک

### 2. تست بازدید یکتا:

1. **ورود به سیستم** با یک حساب دانش‌آموز
2. **کلیک روی یک ویدیو** و باز کردن مودال
3. **بستن و باز کردن مجدد** همان ویدیو چندین بار
4. **بررسی شمارنده بازدید:**
   - ✅ فقط یک واحد افزایش یافته است
5. **ورود با حساب دیگر** و کلیک روی همان ویدیو
6. **بررسی شمارنده بازدید:**
   - ✅ یک واحد دیگر افزایش یافته است

### 3. تست Fallback:

1. **افزودن ویدیو با URL نامعتبر** یا سایتی که متادیتا ندارد
2. **بررسی داشبورد دانش‌آموز:**
   - ✅ placeholder زیبا نمایش داده می‌شود
   - ✅ عنوان دستی ادمین نمایش داده می‌شود
   - ✅ هیچ خطایی در console نیست

---

## 🔒 امنیت و بهینه‌سازی

### امنیت:
- ✅ محدودیت یکتای دیتابیس از بازدیدهای تقلبی جلوگیری می‌کند
- ✅ تمام endpoint های بازدید نیازمند احراز هویت هستند
- ✅ استخراج پیش‌نمایش فقط توسط ادمین قابل اجرا است

### بهینه‌سازی:
- ✅ استخراج پیش‌نمایش فقط یک بار (هنگام ایجاد/ویرایش) انجام می‌شود
- ✅ داده‌های پیش‌نمایش در دیتابیس ذخیره می‌شوند (کش شده)
- ✅ timeout 5 ثانیه برای استخراج پیش‌نمایش
- ✅ در صورت خطا، ویدیو با مقادیر null ذخیره می‌شود

---

## 🐛 رفع عیب

### مشکل: پیش‌نمایش نمایش داده نمی‌شود

**راه حل:**
1. بررسی لاگ سرور برای خطاهای استخراج
2. اطمینان از نصب `link-preview-js`
3. بررسی فایروال/پروکسی برای دسترسی به URL

### مشکل: بازدید چندین بار شمرده می‌شود

**راه حل:**
1. بررسی migration دیتابیس با `npx prisma studio`
2. اطمینان از وجود محدودیت یکتا در جدول `VideoView`
3. بررسی `userId` در session

---

## 📝 نکات پیاده‌سازی

1. **پیش‌نمایش غنی**:
   - از `link-preview-js` برای استخراج متادیتا استفاده شده
   - پشتیبانی از YouTube, Aparat, Instagram و هر سایتی با Open Graph tags
   - Fallback ایمن به تصاویر YouTube یا placeholder

2. **بازدید یکتا**:
   - استفاده از محدودیت یکتای دیتابیس (`@@unique`)
   - رویکرد "try-create-catch-P2002"
   - بدون نیاز به کوئری اضافی قبل از ایجاد

3. **تجربه کاربری**:
   - تصاویر پیش‌نمایش با کیفیت بالا
   - placeholder های زیبا برای حالات خطا
   - بدون تاخیر در باز شدن مودال (fire-and-forget)

---

## ✅ خلاصه تغییرات

### دیتابیس:
- ✅ 3 فیلد جدید به `Video`
- ✅ مدل جدید `VideoView`
- ✅ رابطه جدید در `User`

### بک‌اند:
- ✅ تابع استخراج پیش‌نمایش
- ✅ اصلاح POST/PUT ویدیو
- ✅ اصلاح API بازدید با منطق یکتا
- ✅ اصلاح API لیست ویدیوها

### فرانت‌اند:
- ✅ نمایش پیش‌نمایش غنی
- ✅ Fallback به YouTube thumbnail
- ✅ Placeholder برای حالات خطا
- ✅ فراخوانی API بازدید

### وابستگی‌ها:
- ✅ نصب `link-preview-js`

---

تمام تغییرات بدون آسیب به بخش‌های دیگر سایت اعمال شده‌اند و سیستم به طور کامل عملیاتی است! 🎉

