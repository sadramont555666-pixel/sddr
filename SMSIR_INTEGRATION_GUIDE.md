# 📱 راهنمای کامل یکپارچه‌سازی SMS.ir

## ✅ تغییرات انجام شده

پروژه به طور کامل از **Kavenegar** به **SMS.ir** منتقل شده است.

### 🔄 فایل‌های به‌روزرسانی شده:

1. ✅ **`src/app/api/utils/sms.js`** - ماژول اصلی SMS
   - استفاده از SMS.ir Verify API
   - پشتیبانی از Template-based sending
   - فقط کد OTP ارسال می‌شود (Template متن را مدیریت می‌کند)

2. ✅ **`src/app/api/auth/register/route.js`** - مسیر ثبت‌نام
   - حذف ساخت پیام دستی
   - ارسال فقط کد OTP

3. ✅ **`src/app/api/auth/otp/send/route.js`** - مسیر ارسال OTP
   - حذف ساخت پیام دستی
   - ارسال فقط کد OTP

4. ✅ **`env.example`** - پیکربندی محیطی
   - افزوده شدن متغیرهای SMS.ir

---

## 🚀 راه‌اندازی

### مرحله 1: دریافت API Key از SMS.ir

1. وارد پنل SMS.ir شوید: **https://www.sms.ir/panel**
2. از منو: **تنظیمات** → **کلید API**
3. کلید API خود را کپی کنید

### مرحله 2: ساخت Template

1. در پنل SMS.ir: **الگوها (Templates)** → **الگوی جدید**
2. مشخصات Template:

```
نام الگو: signup_otp (یا هر نام دیگری)
نوع: کد تایید

متن پیام:
کد تایید شما: #code#
اعتبار: ۲ دقیقه
سامانه مطالعه - خانم سنگ‌شکن
```

⚠️ **نکته مهم:** 
- پارامتر باید دقیقاً `#code#` نامیده شود
- این نام در کد ما به صورت `code` استفاده می‌شود

3. Template را ذخیره کنید و منتظر تایید بمانید (معمولاً چند ساعت)

### مرحله 3: تنظیم متغیرهای محیطی

در فایل `.env`:

```env
# SMS Driver (اجباری)
SMS_DRIVER=smsir

# SMS.ir API Key (اجباری - از پنل SMS.ir)
SMS_API_KEY=your_actual_api_key_here

# نام یا ID Template (اجباری - از پنل SMS.ir)
SMS_TEMPLATE_NAME=signup_otp

# حالت تست (اختیاری)
# true = کد در console نمایش داده می‌شود، پیامک واقعی ارسال نمی‌شود
# false = پیامک واقعی ارسال می‌شود
TEST_ECHO_OTP=false
SMS_MOCK_MODE=false
```

---

## 📋 متغیرهای محیطی

### اجباری:

| متغیر | توضیحات | مثال |
|-------|---------|------|
| `SMS_DRIVER` | باید `smsir` باشد | `smsir` |
| `SMS_API_KEY` | کلید API از پنل SMS.ir | `abc123...` |
| `SMS_TEMPLATE_NAME` | نام یا ID template | `signup_otp` |

### اختیاری:

| متغیر | توضیحات | پیش‌فرض |
|-------|---------|---------|
| `TEST_ECHO_OTP` | حالت تست (true/false) | `false` |
| `SMS_MOCK_MODE` | حالت Mock کامل | `false` |

---

## 🧪 تست

### تست محلی (بدون ارسال واقعی):

```env
SMS_DRIVER=smsir
TEST_ECHO_OTP=true
```

**نتیجه:**
```bash
[sendSMS][MOCK] to=989123456789 code=123456
```

کد در console نمایش داده می‌شود و پیامک واقعی ارسال نمی‌شود.

### تست واقعی (ارسال به SMS.ir):

```env
SMS_DRIVER=smsir
SMS_API_KEY=your_real_api_key
SMS_TEMPLATE_NAME=your_template_name
TEST_ECHO_OTP=false
SMS_MOCK_MODE=false
```

**پیش‌نیازها:**
- ✅ API Key معتبر
- ✅ Template تایید شده
- ✅ اعتبار کافی در حساب SMS.ir

---

## 🔍 عیب‌یابی

### خطا: "SMS_DRIVER must be set to 'smsir'"

**علت:** متغیر `SMS_DRIVER` تنظیم نشده یا مقدار اشتباه دارد

**راه‌حل:**
```env
SMS_DRIVER=smsir
```

### خطا: "SMS_API_KEY is required"

**علت:** کلید API تنظیم نشده

**راه‌حل:**
```env
SMS_API_KEY=your_actual_api_key_here
```

### خطا: "SMS_TEMPLATE_NAME is required"

**علت:** نام Template تنظیم نشده

**راه‌حل:**
```env
SMS_TEMPLATE_NAME=your_template_name
```

### خطا: "Unauthorized" یا HTTP 401

**علت:** API Key نامعتبر است

**راه‌حل:**
1. کلید API را از پنل SMS.ir مجدداً کپی کنید
2. مطمئن شوید فاصله یا کاراکتر اضافی ندارد

### خطا: "Template not found"

**علت:** 
- Template هنوز تایید نشده
- نام Template اشتباه است

**راه‌حل:**
1. در پنل SMS.ir بررسی کنید Template تایید شده باشد
2. نام دقیق Template را در `.env` قرار دهید

---

## 📊 نحوه کار API

### درخواست به SMS.ir:

```javascript
POST https://ws.sms.ir/api/v1/send/verify

Headers:
  Content-Type: application/json
  x-api-key: YOUR_API_KEY

Body:
{
  "Mobile": "989123456789",
  "TemplateId": "signup_otp",
  "Parameters": [
    {
      "Name": "code",
      "Value": "123456"
    }
  ]
}
```

### پاسخ موفق:

```json
{
  "status": 1,
  "message": "عملیات موفق",
  "data": {...}
}
```

### پاسخ ناموفق:

```json
{
  "status": 0,
  "message": "توضیحات خطا"
}
```

---

## 🔄 مقایسه با Kavenegar

| ویژگی | Kavenegar | SMS.ir |
|-------|-----------|--------|
| API Method | VerifyLookup | Verify |
| Endpoint | `/verify/lookup.json` | `/send/verify` |
| Authentication | API Key در URL | Header: `x-api-key` |
| Parameter Name | `token` | `Name: "code"` |
| Success Status | `return.status: 200` | `status: 1` |

---

## ⚠️ نکات مهم

### برای Production:

1. ✅ **حتماً** `TEST_ECHO_OTP=false` کنید
2. ✅ **حتماً** API Key واقعی استفاده کنید
3. ✅ **حتماً** Template تایید شده باشد
4. ✅ **حتماً** حساب SMS.ir را شارژ کنید
5. ✅ **حتماً** متغیر `SMS_DRIVER=smsir` تنظیم شود

### برای Development:

1. ✅ از `TEST_ECHO_OTP=true` استفاده کنید
2. ✅ کد در console می‌بینید
3. ✅ نیازی به API Key واقعی نیست
4. ✅ هزینه‌ای ندارد

---

## 📞 پشتیبانی SMS.ir

- 🌐 وب‌سایت: https://www.sms.ir
- 📧 پنل: https://www.sms.ir/panel
- 📚 مستندات API: https://www.sms.ir/api
- ☎️ پشتیبانی: از طریق پنل کاربری

---

## ✅ چک‌لیست نهایی

قبل از استقرار در Production:

- [ ] API Key از پنل SMS.ir دریافت شده
- [ ] Template با پارامتر `#code#` ساخته شده
- [ ] Template تایید شده است
- [ ] حساب SMS.ir شارژ شده
- [ ] متغیر `SMS_DRIVER=smsir` تنظیم شده
- [ ] متغیر `SMS_API_KEY` با کلید واقعی تنظیم شده
- [ ] متغیر `SMS_TEMPLATE_NAME` با نام Template تنظیم شده
- [ ] `TEST_ECHO_OTP=false` تنظیم شده
- [ ] `SMS_MOCK_MODE=false` تنظیم شده
- [ ] تست نهایی انجام شده

---

## 🎉 نتیجه

✅ **یکپارچه‌سازی SMS.ir کامل شد!**

شما اکنون می‌توانید:
1. در حالت تست با `TEST_ECHO_OTP=true` کار کنید
2. با تنظیم API Key و Template واقعی، پیامک ارسال کنید
3. از Template‌های سفارشی استفاده کنید

**موفق باشید!** 🚀

