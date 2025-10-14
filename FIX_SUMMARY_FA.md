# 🎯 خلاصه رفع مشکل Session Persistence برای داشبورد دانش‌آموز

## 🔴 مشکل قبلی

بعد از ثبت‌نام موفق دانش‌آموز:
- کوکی `authjs.session-token` به درستی ساخته می‌شد ✅
- اما فرانت‌اند کاربر را احراز هویت نمی‌کرد ❌
- کاربر به صفحه اصلی برمی‌گشت (redirect loop) ❌
- هر بار رفرش صفحه، session از بین می‌رفت ❌

---

## 🔧 علت اصلی مشکل

**۱. Backend:** JWT Token شامل `role` بود اما فیلدهای timing (`iat`, `exp`) نداشت

**۲. Auth System:** تابع `CreateAuth` فیلد `role` را از JWT استخراج نمی‌کرد
```javascript
// قبل:
user: {
  id: token.sub,
  email: token.email,
  name: token.name,
  // ❌ role استخراج نمی‌شد
}

// بعد:
user: {
  id: token.sub,
  email: token.email,
  name: token.name,
  role: token.role, // ✅ الان استخراج می‌شود
  phone: token.phone,
}
```

**۳. Frontend Guard:** کامپوننت `StudentDashboardLayout` منتظر تکمیل loading نمی‌شد
```typescript
// قبل:
if (!session) {
  navigate('/account/signin'); // ❌ خیلی زود redirect می‌کرد
}

// بعد:
if (status === 'loading') {
  return <Loading />; // ✅ منتظر می‌مانیم
}
if (status === 'unauthenticated') {
  navigate('/account/signin'); // ✅ الان درست است
}
```

---

## ✅ تغییرات انجام شده

### 1️⃣ فایل: `src/app/api/auth/complete-registration/route.js`
```javascript
const tokenPayload = {
  sub: newUser.id,
  name: newUser.name ?? null,
  email: newUser.email ?? `${newUser.phone}@local.host`,
  role: newUser.role, // ✅ نقش کاربر
  phone: newUser.phone, // ✅ شماره تلفن
  iat: Math.floor(Date.now() / 1000), // ✅ زمان صدور
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // ✅ زمان انقضا (۳۰ روز)
};

const cookieHeader = `${cookieName}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*30}`;
```

**نتیجه:**
- JWT کامل با تمام فیلدهای ضروری
- کوکی با attribute های صحیح
- لاگ کامل برای debug

---

### 2️⃣ فایل: `src/__create/@auth/create.js`
```javascript
return {
  user: {
    id: token.sub,
    email: token.email,
    name: token.name,
    image: token.picture,
    role: token.role, // ✅ استخراج role از JWT
    phone: token.phone, // ✅ استخراج phone از JWT
  },
  expires: token.exp.toString(),
};
```

**نتیجه:**
- `useSession()` الان `session.user.role` را برمی‌گرداند
- داشبورد می‌تواند نقش کاربر را بررسی کند
- authorization صحیح کار می‌کند

---

### 3️⃣ فایل: `src/components/student/StudentDashboardLayout.tsx`
```typescript
useEffect(() => {
  if (status === 'loading') {
    console.log('[StudentDashboard] Session loading...');
    return; // ✅ منتظر می‌مانیم
  }

  if (status === 'unauthenticated' || !session?.user) {
    console.log('[StudentDashboard] No session, redirecting');
    navigate('/account/signin', { replace: true });
    return;
  }

  const role = session?.user?.role;
  if (role && role !== 'STUDENT' && role !== 'ADMIN') {
    navigate('/', { replace: true });
  }
}, [session, status, navigate]);

// UI بهتر برای loading
if (status === 'loading') {
  return <LoadingSpinner />;
}
```

**نتیجه:**
- منتظر تکمیل loading می‌ماند
- redirect loop دیگر رخ نمی‌دهد
- لاگ کامل در console برای debug
- UI بهتر با spinner

---

### 4️⃣ فایل: `src/app/account/signup/page.jsx`
```javascript
if (data?.requireLogin) {
  // اگر auto-login ناموفق بود
  setTimeout(() => {
    window.location.href = `/account/signin?phone=${phone}`;
  }, 1500);
} else {
  // auto-login موفق بود
  setTimeout(() => {
    window.location.href = data?.nextUrl || '/student-dashboard';
  }, 1000);
}
```

**نتیجه:**
- مدیریت fallback اگر کوکی ساخته نشود
- پیام‌های واضح برای کاربر
- انتقال نرم به داشبورد

---

## 🧪 نحوه تست

### مرحله ۱: پاک کردن کوکی‌های قبلی
```javascript
// در Console مرورگر (F12):
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
localStorage.clear();
location.reload();
```

### مرحله ۲: ثبت‌نام کاربر جدید
1. برو به `http://localhost:4000/account/signup`
2. اطلاعات تست را وارد کن:
   ```
   شماره موبایل: 09123456789
   نام: علی احمدی
   رمز عبور: Test1234567
   پایه: دهم
   رشته: ریاضی
   ```
3. کلیک روی "ارسال کد"
4. کد OTP را از terminal کپی کن و وارد کن
5. کلیک روی "تکمیل ثبت‌نام"

### مرحله ۳: بررسی موفقیت

**در Console مرورگر باید ببینی:**
```
[Registration] Success response: { success: true, nextUrl: '/student-dashboard', ... }
[Registration] Auto-login successful, redirecting to: /student-dashboard
[StudentDashboard] Session loading...
[StudentDashboard] Session loaded: { userId: 'cm...', role: 'STUDENT' }
```

**در DevTools → Application → Cookies:**
```
Name: authjs.session-token
Value: eyJhbGciOiJI... (شروع با eyJ)
Path: /
HttpOnly: ✓
SameSite: Lax
Max-Age: 2592000 (۳۰ روز)
```

### مرحله ۴: تست پایداری Session
- ✅ رفرش صفحه (F5) → باید در `/student-dashboard` بمانی
- ✅ برو به صفحه اصلی → کلیک روی "داشبورد دانش‌آموز" → برگردی به dashboard
- ✅ تب را ببند → دوباره باز کن → session همچنان فعال است

---

## 🎯 رفتار مورد انتظار

### ✅ فلوی موفق
```
ثبت‌نام → ایجاد کوکی → redirect به dashboard → نمایش محتوا → رفرش → همچنان در dashboard
```

### درباره Admin Dashboard
- **نگران نباش!** تغییرات به admin dashboard آسیب نمی‌زنند
- Admin همچنان با `role: 'ADMIN'` کار می‌کند
- `StudentDashboardLayout` هم ADMIN و هم STUDENT را قبول می‌کند:
  ```typescript
  if (role && role !== 'STUDENT' && role !== 'ADMIN') {
    navigate('/'); // فقط نقش‌های دیگر رد می‌شوند
  }
  ```

---

## 🐛 اگر هنوز کار نکرد

۱. **لاگ‌های Backend را چک کن:**
   - باید ببینی: `[Auto-Login] Session cookie created: { userId: '...', role: 'STUDENT' }`

۲. **Console مرورگر را چک کن:**
   - دنبال لاگ‌های `[Registration]` و `[StudentDashboard]` بگرد
   - اگر error دیدی، کپی کن و بررسی کن

۳. **کوکی را بررسی کن:**
   - F12 → Application → Cookies → localhost
   - نام باید `authjs.session-token` باشد
   - مقدار باید با `eyJ` شروع شود (Base64 JWT)

۴. **Network Tab را چک کن:**
   - POST `/api/auth/complete-registration`
   - Response Headers باید `Set-Cookie` داشته باشد

۵. **JWT را decode کن (jwt.io):**
   - باید شامل این فیلدها باشد: `sub`, `role`, `phone`, `name`, `email`, `iat`, `exp`

---

## 📌 نکات مهم

1. ✅ Session در JWT cookie ذخیره می‌شود (نه database)
2. ✅ هر فیلدی که در JWT باشد باید در `CreateAuth` استخراج شود
3. ✅ Frontend guard باید منتظر `status !== 'loading'` بماند
4. ✅ Cookie attributes مهم هستند: `Path=/`, `HttpOnly`, `SameSite=Lax`
5. ✅ فیلدهای `iat` و `exp` برای validation توسط Auth.js ضروری هستند

---

## 🎉 نتیجه نهایی

### ✅ Session الان پایدار است و دانش‌آموز بعد از ثبت‌نام در `/student-dashboard` می‌ماند

**تبریک! مشکل حل شد. 🚀**

---

## 📞 در صورت بروز مشکل

اگر بعد از این تغییرات هنوز مشکل داری:

1. کش مرورگر را کامل پاک کن (Ctrl+Shift+Delete)
2. سرور را restart کن
3. با یک شماره تلفن کاملاً جدید ثبت‌نام کن
4. لاگ‌های console و terminal را با هم مقایسه کن
5. فایل `SESSION_FIX_EXPLANATION.md` را برای جزئیات بیشتر بخوان

**موفق باشی! 💪**

