# 📱 راهنمای کامل تنظیم SMS با VerifyLookup

## ✅ تغییرات انجام شده

### 1️⃣ **فایل `src/app/api/utils/sms.js`**
- ✅ استفاده از **VerifyLookup API** (روش استاندارد کاوه‌نگار برای OTP)
- ✅ فقط **token** (کد 6 رقمی) ارسال می‌شود
- ✅ **3 حالت** پشتیبانی می‌شود:
  - `TEST_ECHO_OTP=true` → کد در console نمایش داده می‌شود
  - `SMS_MOCK_MODE=true` → حالت Mock کامل
  - `SMS_FALLBACK_TO_ECHO=true` → اگر خطای 501 از کاوه‌نگار آمد، به Echo برمی‌گردد

### 2️⃣ **فایل‌های Route**
- ✅ `auth/otp/send/route.js` - به‌روزرسانی شد
- ✅ `auth/register/route.js` - به‌روزرسانی شد
- ✅ در حالت تست/fallback، `debugCode` در پاسخ برمی‌گردد

### 3️⃣ **متغیرهای محیطی جدید**
```env
TEST_ECHO_OTP="false"
SMS_MOCK_MODE="false"
SMS_FALLBACK_TO_ECHO="false"
```

---

## 🚀 نحوه استفاده

### برای توسعه محلی (بدون ارسال واقعی):

در فایل `.env`:
```env
TEST_ECHO_OTP=true
SMS_MOCK_MODE=true
SMS_FALLBACK_TO_ECHO=true
```

**نتیجه:**
```javascript
// در console سرور:
[sendSMS][ECHO] to=989123456789 token=123456

// در پاسخ API:
{
  "message": "کد تایید ارسال شد (در حالت تست)",
  "phone": "989123456789",
  "expiresIn": 120,
  "debugCode": "123456"  // ← کد برای تست
}
```

### برای Liara (تست موقت):

در **Environment Variables** در پنل Liara:
```
TEST_ECHO_OTP=true
SMS_FALLBACK_TO_ECHO=true
```

**مزایا:**
- ✅ کد در لاگ‌های Liara نمایش داده می‌شود
- ✅ کد در پاسخ API (`debugCode`) برمی‌گردد
- ✅ می‌توانید بدون KYC کاوه‌نگار تست کنید
- ✅ اگر خطای 501 از کاوه‌نگار آمد، به Echo برمی‌گردد

### برای Production (ارسال واقعی):

```env
TEST_ECHO_OTP=false
SMS_MOCK_MODE=false
SMS_FALLBACK_TO_ECHO=false
KAVENEGAR_API_KEY="your-real-api-key"
```

**پیش‌نیازها:**
1. ✅ حساب کاوه‌نگار احراز هویت شده (KYC)
2. ✅ Template با نام `signup` در پنل کاوه‌نگار ساخته و تایید شده
3. ✅ API Key معتبر

---

## 🎨 ساخت Template در کاوه‌نگار

### مرحله 1: ورود به پنل
https://panel.kavenegar.com → **الگوها (Templates)** → **الگوی جدید**

### مرحله 2: مشخصات Template
```
نام الگو: signup
نوع: کد تایید (Verification Code)

متن پیام:
کد تایید شما: %token%
اعتبار: ۲ دقیقه
سامانه مطالعه - خانم سنگ‌شکن
```

⚠️ **نکته مهم:** `%token%` جایگزین می‌شود با کد OTP ارسالی

### مرحله 3: ارسال برای تایید
معمولاً چند ساعت تا 1 روز کاری طول می‌کشد

---

## 🔍 بررسی خطاها

### خطای 501: "امکان ارسال پیامک فقط به شماره صاحب حساب"

**علت:** حساب کاوه‌نگار شما محدود است (نیاز به KYC)

**راه‌حل موقت (برای تست):**
```env
SMS_FALLBACK_TO_ECHO=true
```

**راه‌حل دائم:**
1. احراز هویت حساب کاوه‌نگار
2. شارژ حساب
3. استفاده از API Key معتبر

### خطای 422: "Template not found"

**علت:** Template با نام `signup` در پنل ساخته نشده یا تایید نشده

**راه‌حل:**
1. وارد پنل کاوه‌نگار شوید
2. Template را بسازید (مراحل بالا)
3. منتظر تایید بمانید

---

## 🧪 تست

### تست 1: حالت ECHO (بدون ارسال واقعی)

```env
TEST_ECHO_OTP=true
```

**درخواست:**
```bash
POST /api/auth/register
{
  "phone": "09123456789"
}
```

**پاسخ:**
```json
{
  "message": "کد تایید ارسال شد (در حالت تست)",
  "phone": "989123456789",
  "expiresIn": 120,
  "debugCode": "123456"
}
```

**لاگ سرور:**
```
[sendSMS][ECHO] to=989123456789 token=123456
```

### تست 2: حالت Fallback (خطای 501)

```env
SMS_FALLBACK_TO_ECHO=true
KAVENEGAR_API_KEY="your-limited-api-key"
```

**نتیجه:**
- اول سعی می‌کند واقعی ارسال کند
- اگر خطای 501 آمد، به Echo برمی‌گردد
- کد در پاسخ (`debugCode`) و لاگ نمایش داده می‌شود

### تست 3: حالت Production (ارسال واقعی)

```env
TEST_ECHO_OTP=false
SMS_MOCK_MODE=false
SMS_FALLBACK_TO_ECHO=false
KAVENEGAR_API_KEY="your-verified-api-key"
```

**نتیجه:**
- پیامک واقعی ارسال می‌شود
- `debugCode` در پاسخ نیست
- کد فقط در SMS دریافت می‌شود

---

## 📊 جدول حالت‌ها

| متغیر | Development | Staging | Production |
|-------|------------|---------|------------|
| `TEST_ECHO_OTP` | `true` | `true` | `false` |
| `SMS_MOCK_MODE` | `true` | `false` | `false` |
| `SMS_FALLBACK_TO_ECHO` | `true` | `true` | `false` |
| نتیجه | کد در console + API | Fallback در صورت خطا | ارسال واقعی |

---

## ⚠️ نکات مهم

### 🔴 برای Production:
1. **حتماً** `TEST_ECHO_OTP=false` کنید
2. **حتماً** `SMS_FALLBACK_TO_ECHO=false` کنید
3. **حتماً** حساب کاوه‌نگار را احراز هویت کنید
4. **حتماً** Template را در پنل بسازید

### 🟢 برای Development:
1. از `TEST_ECHO_OTP=true` استفاده کنید
2. کد در console و پاسخ API می‌بینید
3. نیازی به KYC کاوه‌نگار نیست

### 🟡 برای Staging/Testing:
1. از `SMS_FALLBACK_TO_ECHO=true` استفاده کنید
2. اگر خطای 501 آمد، به Echo برمی‌گردد
3. می‌توانید با API Key محدود تست کنید

---

## 🎯 چک‌لیست Deploy به Production

قبل از deploy:

- [ ] `TEST_ECHO_OTP=false` تنظیم شده
- [ ] `SMS_MOCK_MODE=false` تنظیم شده
- [ ] `SMS_FALLBACK_TO_ECHO=false` تنظیم شده
- [ ] `KAVENEGAR_API_KEY` معتبر و احراز هویت شده
- [ ] Template `signup` در پنل ساخته و تایید شده
- [ ] حساب کاوه‌نگار شارژ شده
- [ ] تست نهایی روی Staging انجام شده

---

## 📞 پشتیبانی

### کاوه‌نگار:
- تلفن: ۰۲۱-۹۱۰۰۳۹۰۰
- وب‌سایت: https://kavenegar.com
- پنل: https://panel.kavenegar.com

### لاگ‌ها:
```bash
# در Liara
liara logs --app your-app-name

# در محلی
# بررسی console سرور
```

---

## ✅ خلاصه

**الان چه کاری باید بکنید:**

1. **برای تست فوری:**
   ```env
   TEST_ECHO_OTP=true
   SMS_FALLBACK_TO_ECHO=true
   ```
   
2. **در Liara تنظیم کنید** (Environment Variables)

3. **درخواست OTP بزنید** - کد در لاگ و پاسخ API نمایش داده می‌شود

4. **پس از تست موفق:**
   - Template را در پنل کاوه‌نگار بسازید
   - حساب را احراز هویت کنید
   - متغیرهای تست را خاموش کنید

**همه چیز آماده است!** 🚀

