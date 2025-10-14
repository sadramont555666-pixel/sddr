# 📁 راهنمای راه‌اندازی آپلود فایل

## 🔍 وضعیت فعلی

سیستم آپلود فایل **قبلاً پیاده‌سازی شده** اما نیاز به تنظیم Cloudflare R2 دارد.

---

## ⚠️ مشکل اصلی

خطای `ERR_CONNECTION_CLOSED` به دلیل **عدم تنظیم R2 Credentials** است.

### علت خطا:
```javascript
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env ${name}`);  // ❌ این خطا رخ میده
  }
  return v;
}
```

کد تلاش می‌کنه از environment variables زیر استفاده کنه:
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `ASSET_PUBLIC_BASE_URL`

---

## ✅ راه‌حل‌ها

### گزینه 1: تنظیم Cloudflare R2 (پیشنهادی برای Production)

#### مرحله 1: دریافت Credentials
1. ورود به [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. رفتن به `R2 Object Storage`
3. ایجاد یک Bucket جدید
4. رفتن به `Manage R2 API Tokens` و ایجاد Token

#### مرحله 2: تنظیم .env
فایل `.env` را در `create/apps/web/` ایجاد کنید:

```env
# Database
DATABASE_URL="postgresql://postgres:ssssss@localhost:5432/khanom_sangshekan_db?schema=public"

# Auth
AUTH_SECRET="your-secret-key-here"

# R2 Storage (Cloudflare)
R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET="your-bucket-name"
ASSET_PUBLIC_BASE_URL="https://your-bucket-name.YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"

# SMS
KAVENEGAR_API_KEY="YOUR_API_KEY_HERE"
KAVENEGAR_SENDER_NUMBER="2000660110"

# Other
SUSPEND_DURATION_DAYS=7
FAMILY_CHAT_ENABLED=true
```

#### مرحله 3: راه‌اندازی مجدد سرور
```bash
npm run dev
```

---

### گزینه 2: استفاده از آپلود محلی (برای Development)

اگر فعلاً دسترسی به R2 ندارید، می‌توانید از آپلود محلی استفاده کنید.

#### مرحله 1: ایجاد API آپلود محلی

فایل `src/app/api/student/reports/upload/route.js` ایجاد کنید:

```javascript
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      return Response.json({ error: "File too large" }, { status: 413 });
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${randomUUID()}.${fileExtension}`;
    
    // Create upload directory
    const uploadDir = join(process.cwd(), "public", "uploads", "reports");
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return public URL
    const fileUrl = `/uploads/reports/${fileName}`;

    return Response.json({
      fileKey: fileName,
      fileUrl,
      success: true,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
```

#### مرحله 2: اصلاح Hook آپلود

فایل `src/hooks/student/usePresignedUpload.ts` را به این صورت تغییر دهید:

```typescript
import { useMutation } from '@tanstack/react-query';

export function usePresignedUpload(onProgress?: (pct: number) => void) {
  return useMutation({
    mutationFn: async (file: File) => {
      // استفاده از آپلود مستقیم بجای Presigned URL
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/student/reports/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const result = await response.json();
      
      // شبیه‌سازی progress
      if (onProgress) {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          if (progress >= 100) {
            clearInterval(interval);
            onProgress(100);
          } else {
            onProgress(progress);
          }
        }, 100);
      }

      return { fileKey: result.fileKey, fileUrl: result.fileUrl };
    },
  });
}
```

#### مرحله 3: اصلاح Reports Controller

فایل `src/server/controllers/student/reports.ts` را اصلاح کنید:

```typescript
// خط 36 را تغییر دهید:
// از این:
const fileUrl = data.fileKey ? getPublicUrl(data.fileKey) : undefined;

// به این:
const fileUrl = data.fileKey || data.fileUrl || undefined;
```

---

## 🧪 تست آپلود

### تست با گزینه 1 (R2):
```bash
# بررسی credentials
echo $R2_ENDPOINT
echo $R2_ACCESS_KEY_ID

# راه‌اندازی سرور
npm run dev

# تست در مرورگر
# 1. Login دانش‌آموز
# 2. رفتن به صفحه ثبت گزارش
# 3. انتخاب فایل
# 4. ثبت گزارش
```

### تست با گزینه 2 (Local):
```bash
# ایجاد پوشه uploads
mkdir -p public/uploads/reports

# راه‌اندازی سرور
npm run dev

# تست در مرورگر (همان مراحل بالا)
```

---

## 🔍 دیباگ

### خطا: "Missing env R2_ENDPOINT"
```bash
# چک کردن .env
cat create/apps/web/.env

# اگر فایل وجود نداره، از env.example کپی کنید
cp create/apps/web/env.example create/apps/web/.env
```

### خطا: "ERR_CONNECTION_CLOSED"
این خطا زمانی رخ میده که:
1. R2 credentials اشتباه هست
2. R2 endpoint غیرقابل دسترسی است
3. یا اصلاً تنظیم نشده

**راه‌حل:** استفاده از گزینه 2 (آپلود محلی)

### خطا: "413 Payload Too Large"
فایل بیشتر از 200MB است. حد مجاز رو در کد تغییر دهید.

---

## 📊 مقایسه دو گزینه

| ویژگی | R2 (Cloudflare) | آپلود محلی |
|-------|-----------------|------------|
| سرعت | ⚡ بالا | 🐌 متوسط |
| مقیاس‌پذیری | ✅ عالی | ❌ محدود |
| هزینه | 💰 پولی | 🆓 رایگان |
| پیکربندی | 🔧 نیاز به setup | ✅ آماده |
| برای Production | ✅ پیشنهاد | ❌ نه |
| برای Development | ⚠️ اختیاری | ✅ پیشنهاد |

---

## ✅ خلاصه

**مشکل:** R2 credentials تنظیم نشده → ERR_CONNECTION_CLOSED

**راه‌حل سریع (Development):**
1. ایجاد `/api/student/reports/upload/route.js`
2. اصلاح `usePresignedUpload.ts`
3. اصلاح `reports.ts` controller
4. ✅ آپلود فایل کار می‌کنه!

**راه‌حل بلند-مدت (Production):**
1. ایجاد حساب Cloudflare
2. راه‌اندازی R2 Bucket
3. تنظیم credentials در `.env`
4. ✅ آپلود با کارایی بالا!

---

**تاریخ:** 2025-10-12  
**وضعیت:** 📝 راهنما آماده است

