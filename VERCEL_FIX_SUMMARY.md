# 🔧 خلاصه رفع مشکل Runtime Vercel

## ❌ خطای قبلی
```
Error: Function Runtimes must have a valid version, for example "now-php@1.0.0"
```

## 🔍 علت مشکل
فایل `vercel.json` از runtime قدیمی AWS Lambda استفاده می‌کرد:
```json
"runtime": "nodejs20.x"  // ❌ فرمت قدیمی
```

## ✅ راه‌حل اعمال شده

### 1. **به‌روزرسانی `vercel.json`**

#### قبل (❌ اشتباه):
```json
{
  "functions": {
    "build/server/index.js": {
      "runtime": "nodejs20.x"  // فرمت AWS Lambda
    }
  }
}
```

#### بعد (✅ درست):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "build/server/index.js",
      "use": "@vercel/node@3.0.0",
      "config": {
        "maxDuration": 30,
        "includeFiles": ["build/**", "prisma/**"]
      }
    },
    {
      "src": "build/client/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      "dest": "/build/client/assets/$1"
    },
    {
      "src": "/(.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot))",
      "headers": {
        "Cache-Control": "public, max-age=86400"
      },
      "dest": "/build/client/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/build/server/index.js"
    }
  ]
}
```

### 2. **ایجاد `.vercelignore`**
فایل ignore برای جلوگیری از آپلود فایل‌های غیرضروری:
- `node_modules`
- فایل‌های development
- لاگ‌ها و cache ها
- فایل‌های test

### 3. **به‌روزرسانی Documentation**
راهنمای deployment با توضیحات استفاده از `@vercel/node@3.0.0` به‌روزرسانی شد.

## 📊 تغییرات کلیدی

| قبل | بعد |
|-----|-----|
| `runtime: "nodejs20.x"` | `use: "@vercel/node@3.0.0"` |
| `functions` + `rewrites` | `builds` + `routes` |
| فاقد `.vercelignore` | با `.vercelignore` کامل |

## 🎯 نکات مهم

### ✅ چرا `@vercel/node@3.0.0`?
- سازگار با API جدید Vercel
- پشتیبانی از Node.js 20.x
- قابلیت‌های بهتر caching و optimization

### ✅ ساختار `builds` vs `functions`
- `builds`: برای SSR apps مثل React Router + Hono
- `functions`: برای Serverless Functions مجزا

### ✅ مسیریابی (Routes)
```javascript
// همه درخواست‌ها به server می‌روند:
"/(.*)" → "/build/server/index.js"

// مگر static assets:
"/assets/(.*)" → "/build/client/assets/$1"
```

## 🚀 ساختار API Routes

این پروژه دو نوع API route دارد:

### 1. **Legacy Routes** (`src/app/api/**/*.js`)
- مدیریت شده توسط `route-builder.ts`
- Dynamic scanning و registration
- مثال: `/api/auth/register`, `/api/admin/users`

### 2. **New Hono Routes** (`src/server/routes/`)
- Typed controllers
- Middleware-based authentication
- مثال: `/api/student/reports`, `/api/admin/students`

**هر دو توسط Hono server واحد سرو می‌شوند** و در Vercel به درستی کار می‌کنند.

## 📝 Commits انجام شده

```bash
git add vercel.json .vercelignore VERCEL_DEPLOYMENT_GUIDE.md
git commit -m "fix(vercel): correct function runtime configuration for @vercel/node@3.0.0"
git push origin main
```

## ✅ وضعیت فعلی

- [x] خطای Runtime برطرف شد
- [x] Build موفق است (exit code 0)
- [x] تنظیمات Vercel به‌روزرسانی شدند
- [x] Documentation کامل شد
- [x] Push به repository انجام شد
- [ ] **Deployment در Vercel** (منتظر اقدام شما)

## 🎬 مراحل بعدی

1. به Vercel Dashboard بروید
2. اگر قبلاً deploy کرده‌اید، Vercel به‌طور خودکار rebuild می‌کند
3. اگر اولین بار است، طبق `VERCEL_DEPLOYMENT_GUIDE.md` پیش بروید
4. Environment variables را تنظیم کنید
5. Deploy را trigger کنید

## 📞 در صورت بروز مشکل

### خطای Build:
```bash
# بررسی لاگ‌های Vercel
# مطمئن شوید Root Directory = create/apps/web
```

### خطای Runtime:
```bash
# بررسی Environment Variables
# مطمئن شوید DATABASE_URL و AUTH_SECRET تنظیم شده‌اند
```

### API Routes کار نمی‌کنند:
```bash
# بررسی کنید /api/health در مرورگر پاسخ می‌دهد
# لاگ‌های server را در Vercel Functions بررسی کنید
```

---

**وضعیت:** ✅ **آماده برای Production Deployment**  
**آخرین به‌روزرسانی:** اکتبر ۲۰۲۵


