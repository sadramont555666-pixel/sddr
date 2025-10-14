# 🌱 راهنمای Seed کاربر ادمین

## ✅ اتمام کار - Seed Script آماده است!

فایل `prisma/seed.js` با موفقیت ساخته شد و **تست شده** است.

## 📋 مشخصات کاربر ادمین پیش‌فرض

| فیلد | مقدار |
|------|-------|
| 📞 شماره موبایل (Username) | `09900314740` |
| 🔑 رمز عبور (Password) | `Admin@2024Strong` |
| 📧 ایمیل | `admin@khanom-sangshekan.ir` |
| 👤 نام | `ادمین` |
| 🎭 نقش | `ADMIN` |

## 🚀 نحوه اجرا

### روش ۱: اجرای مستقیم (توصیه می‌شود)
```bash
node prisma/seed.js
```

### روش ۲: از طریق Prisma CLI
```bash
npx prisma db seed
```

### روش ۳: از طریق npm script (اختیاری)
```bash
npm run seed
```

## 🔐 تنظیم مشخصات سفارشی (اختیاری)

می‌توانید مشخصات ادمین را از طریق **متغیرهای محیطی** تغییر دهید:

```bash
# در فایل .env یا در Liara
ADMIN_PHONE=09123456789
ADMIN_PASSWORD=MySecurePassword123!
ADMIN_EMAIL=admin@example.com
ADMIN_NAME="مدیر ارشد"
```

سپس seed را اجرا کنید:
```bash
node prisma/seed.js
```

## ✨ ویژگی‌های Seed Script

### ✅ Idempotent (امن برای اجرای مکرر)
- اگر کاربر ادمین از قبل وجود داشته باشد، **هیچ کاری انجام نمی‌دهد**
- کاربر تکراری ایجاد **نمی‌شود**
- می‌توانید بدون نگرانی چندین بار اجرا کنید

### 🔒 امنیت
- پسورد با **argon2** (قوی‌ترین الگوریتم) هش می‌شود
- اطلاعات حساس در لاگ **نمایش داده نمی‌شود** (فقط در اجرای اول)

### 📊 لاگ‌های واضح
- **اجرای اول**: جزئیات کامل کاربر ساخته شده
- **اجراهای بعدی**: پیام "Admin already exists"

## 🧪 نتایج تست

### ✅ تست ۱: ایجاد کاربر جدید
```
🎉 Admin user created successfully!
📋 Admin Details:
   👤 Name: ادمین
   📞 Phone: 09900314740
   📧 Email: admin@khanom-sangshekan.ir
   🔑 Role: ADMIN
   🆔 ID: cmgqh4s2p0000uif4ru7vizay
   ✅ Status: ACTIVE
```

### ✅ تست ۲: Idempotency (اجرای مکرر)
```
✅ Admin already exists. No action taken.
   📞 Phone: 09900314740
   👤 Name: ادمین
   🆔 ID: cmgqh4s2p0000uif4ru7vizay
```

## 🌐 استفاده در Production (روی هاست)

### مرحله ۱: آپلود کدها
کل پروژه را روی هاست (Liara/...) آپلود کنید.

### مرحله ۲: اجرای Migrations
```bash
npx prisma migrate deploy
```

### مرحله ۳: اجرای Seed
```bash
node prisma/seed.js
```

یا اگر در `package.json` اسکریپت seed تعریف کردید:
```bash
npm run seed
```

### مرحله ۴: تست ورود
1. به صفحه لاگین بروید
2. Username: `09900314740`
3. Password: `Admin@2024Strong`
4. وارد داشبورد ادمین شوید ✅

## 🔄 اجرای خودکار در Deploy

### برای Liara (اختیاری)
در فایل `liara.json`:
```json
{
  "platform": "node",
  "build": {
    "command": "npm run build"
  },
  "release": {
    "command": "npx prisma migrate deploy && node prisma/seed.js"
  }
}
```

### برای Vercel/Railway (اختیاری)
در `package.json` اضافه کنید:
```json
"scripts": {
  "postinstall": "npx prisma generate",
  "deploy": "npx prisma migrate deploy && node prisma/seed.js"
}
```

## 🛡️ امنیت در Production

### ⚠️ مهم: پسورد پیش‌فرض را تغییر دهید!

پس از اولین ورود:
1. وارد **پنل ادمین** شوید
2. به **تنظیمات پروفایل** بروید
3. **رمز عبور** را تغییر دهید
4. یک پسورد قوی (حداقل 12 کاراکتر) انتخاب کنید

### 🔐 توصیه‌های امنیتی
- ✅ از متغیرهای محیطی برای production استفاده کنید
- ✅ پسورد پیش‌فرض را در production تغییر دهید
- ✅ فایل `.env` را در `.gitignore` قرار دهید
- ✅ اطلاعات ورود را در مکان امن ذخیره کنید

## ❓ رفع مشکلات رایج

### خطا: "Cannot find module '@prisma/client'"
```bash
npm install
npx prisma generate
```

### خطا: "Database connection error"
بررسی کنید `DATABASE_URL` در `.env` صحیح است:
```bash
echo $DATABASE_URL  # Linux/Mac
echo %DATABASE_URL% # Windows
```

### خطا: "Password hashing failed"
بررسی کنید `argon2` نصب شده:
```bash
npm install argon2
```

### کاربر ادمین ساخته نمی‌شود
1. لاگ‌ها را بررسی کنید
2. `console.log` موجود در seed.js را بخوانید
3. مطمئن شوید migration اجرا شده: `npx prisma migrate deploy`

## 📞 پشتیبانی

اگر مشکلی پیش آمد:
1. لاگ کامل seed را بررسی کنید
2. از `node prisma/seed.js` مستقیم استفاده کنید
3. دیتابیس را بررسی کنید:
   ```bash
   npx prisma studio
   ```

## 📝 یادداشت نهایی

✅ **Seed script آماده و تست شده است**
- Idempotent ✓
- امن ✓  
- با لاگ‌های واضح ✓
- سازگار با production ✓

---

**🎉 موفق باشید! کاربر ادمین آماده استفاده است.**

