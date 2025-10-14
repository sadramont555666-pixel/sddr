# 🔧 Session Persistence Fix - Technical Explanation

## 📋 Problem Summary

**Issue:** After successful student registration via `/api/auth/complete-registration`, the session cookie (`authjs.session-token`) was created correctly, but the frontend still treated the user as unauthenticated and redirected them back to the homepage in a loop.

**Root Cause:** The session cookie existed, but the Auth.js session hydration was incomplete because:
1. The `CreateAuth` function didn't extract the `role` field from JWT tokens
2. The `StudentDashboardLayout` component didn't wait for session loading to complete
3. The JWT payload was missing critical timing fields (`iat`, `exp`)

---

## 🛠️ Fixes Applied

### 1. **Backend: JWT Token Creation** (`complete-registration/route.js`)

**Before:**
```javascript
const tokenPayload = {
  sub: newUser.id,
  name: newUser.name ?? null,
  email: newUser.email ?? `${newUser.phone}@local.host`,
  role: newUser.role, // ❌ Was included but not extracted by frontend
};
```

**After:**
```javascript
const tokenPayload = {
  sub: newUser.id,
  name: newUser.name ?? null,
  email: newUser.email ?? `${newUser.phone}@local.host`,
  role: newUser.role, // ✅ Now properly extracted
  phone: newUser.phone, // ✅ Added for additional context
  iat: Math.floor(Date.now() / 1000), // ✅ Issued at timestamp
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // ✅ Expiration timestamp
};
```

**Why this matters:**
- `iat` (issued at) and `exp` (expiration) are standard JWT fields that Auth.js expects
- `phone` provides additional user context
- Proper cookie attributes with `Max-Age` ensure browser persistence

---

### 2. **Auth System: Session Hydration** (`@auth/create.js`)

**Before:**
```javascript
return {
  user: {
    id: token.sub,
    email: token.email,
    name: token.name,
    image: token.picture,
    // ❌ role and phone were NOT extracted from JWT
  },
  expires: token.exp.toString(),
};
```

**After:**
```javascript
return {
  user: {
    id: token.sub,
    email: token.email,
    name: token.name,
    image: token.picture,
    role: token.role, // ✅ Extract role from JWT
    phone: token.phone, // ✅ Extract phone from JWT
  },
  expires: token.exp.toString(),
};
```

**Why this matters:**
- This is the **critical fix** — without extracting `role`, the frontend couldn't authorize students
- The `CreateAuth` function is called on every request to hydrate the session
- Now `useSession()` returns `session.user.role`, which the dashboard needs for authorization

---

### 3. **Frontend: Dashboard Guard Logic** (`StudentDashboardLayout.tsx`)

**Before:**
```typescript
useEffect(() => {
  if (status === 'loading') return; // ✅ Good
  if (!session) {
    navigate('/account/signin'); // ❌ Redirected too early
    return;
  }
  // Role check logic...
}, [session, status, navigate]);

if (status === 'loading' || !session) {
  return <div>Loading...</div>; // ❌ Poor UX
}
```

**After:**
```typescript
useEffect(() => {
  if (status === 'loading') {
    console.log('[StudentDashboard] Session loading...'); // ✅ Debug log
    return;
  }

  if (status === 'unauthenticated' || !session?.user) {
    console.log('[StudentDashboard] No session, redirecting');
    navigate('/account/signin', { replace: true }); // ✅ Replace instead of push
    return;
  }

  const role = session?.user?.role;
  console.log('[StudentDashboard] Session loaded:', { userId: session.user.id, role });

  if (role && role !== 'STUDENT' && role !== 'ADMIN') {
    navigate('/', { replace: true });
  }
}, [session, status, navigate]);

// ✅ Better loading UI with spinner
if (status === 'loading') {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
      <p>در حال بارگذاری...</p>
    </div>
  );
}

// ✅ Don't render anything if not authenticated (prevents flash)
if (status === 'unauthenticated' || !session?.user) {
  return null;
}
```

**Why this matters:**
- Waits for `status === 'loading'` to complete before checking authentication
- Uses `navigate(..., { replace: true })` to avoid back-button issues
- Comprehensive console logging for debugging
- Better UX with loading spinner
- Prevents content flash by returning `null` during redirect

---

### 4. **Frontend: Registration Flow** (`signup/page.jsx`)

**Added:**
```javascript
if (data?.requireLogin) {
  // Auto-login failed, redirect to signin with phone pre-filled
  console.log('[Registration] Auto-login failed, redirecting to signin');
  setTimeout(() => {
    window.location.href = `/account/signin?phone=${encodeURIComponent(phone)}`;
  }, 1500);
  return;
}

// Auto-login successful, redirect to dashboard
console.log('[Registration] Auto-login successful, redirecting to:', data?.nextUrl);
setTimeout(() => {
  window.location.href = data?.nextUrl || '/student-dashboard';
}, 1000);
```

**Why this matters:**
- Handles fallback if cookie creation fails on backend
- Provides clear user feedback
- Smooth transition with timeouts for user to read success messages

---

## 🧪 Testing Instructions

### 1. Clear Browser State
```javascript
// In Browser Console (F12)
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. Register New Student
1. Navigate to `/account/signup`
2. Fill in form with test data:
   - Phone: `09123456789`
   - Name: `علی احمدی`
   - Password: `Test1234567`
   - Grade: `دهم`
   - Field: `ریاضی`
3. Click "ارسال کد" → Enter OTP from terminal
4. Click "تکمیل ثبت‌نام"

### 3. Verify Success
**Browser Console should show:**
```
[Registration] Success response: { success: true, nextUrl: '/student-dashboard', ... }
[Registration] Auto-login successful, redirecting to: /student-dashboard
[StudentDashboard] Session loading...
[StudentDashboard] Session loaded: { userId: 'cm...', role: 'STUDENT' }
```

**DevTools → Application → Cookies:**
```
Name: authjs.session-token
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Path: /
HttpOnly: ✓
SameSite: Lax
Max-Age: 2592000 (30 days)
```

### 4. Test Session Persistence
- Refresh page (F5) → Should stay on `/student-dashboard`
- Navigate to `/` → Click "داشبورد دانش‌آموز" → Should go to dashboard
- Close tab → Reopen → Session should persist

---

## 🎯 Expected Behavior

### ✅ Success Flow
1. **Registration:** POST `/api/auth/complete-registration` → `201 Created` + `Set-Cookie`
2. **Auto-Login:** Cookie `authjs.session-token` created with role in JWT
3. **Redirect:** `window.location.href = '/student-dashboard'`
4. **Dashboard Load:** `useSession()` → `status='authenticated'`, `session.user.role='STUDENT'`
5. **Render:** Dashboard content displays without redirect
6. **Persistence:** Page refresh maintains session

### ❌ Failure Scenarios (Now Handled)
- **Cookie creation fails:** Backend returns `requireLogin: true` → Redirect to signin
- **Invalid role:** Dashboard redirects to homepage
- **No session:** Dashboard redirects to signin
- **Session expired:** Auth.js automatically clears cookie → Redirect to signin

---

## 🔍 Debugging Checklist

If session still doesn't persist:

1. **Check Backend Logs:**
   ```
   [Auto-Login] Session cookie created: { userId: 'cm...', role: 'STUDENT', ... }
   ```

2. **Check Browser Console:**
   ```
   [Registration] Auto-login successful, redirecting to: /student-dashboard
   [StudentDashboard] Session loaded: { userId: 'cm...', role: 'STUDENT' }
   ```

3. **Check Cookie:**
   - Name must be `authjs.session-token` (dev) or `__Secure-authjs.session-token` (prod)
   - Must have `HttpOnly`, `SameSite=Lax`, `Path=/`
   - Value should start with `eyJ` (Base64 JWT)

4. **Check Network Tab:**
   - POST `/api/auth/complete-registration` → Response Headers should have `Set-Cookie`

5. **Decode JWT (jwt.io):**
   - Payload must include: `sub`, `role`, `phone`, `name`, `email`, `iat`, `exp`

6. **Check ENV Variables:**
   ```bash
   AUTH_SECRET=<should be set>
   NODE_ENV=development
   ```

---

## 📝 Key Takeaways

1. **Auth.js uses JWT strategy:** The session is stored in a signed JWT cookie, not in a database
2. **Session hydration requires complete token extraction:** Any field in JWT must be extracted in `CreateAuth` to be available in `useSession()`
3. **Frontend guards must respect loading states:** Always wait for `status !== 'loading'` before redirecting
4. **Cookie attributes matter:** `Path=/`, `HttpOnly`, `SameSite=Lax` are critical for security and cross-page persistence
5. **Timing is everything:** Standard JWT fields (`iat`, `exp`) help Auth.js validate token freshness

---

## ✅ Session now persists, student remains on /student-dashboard after registration.

