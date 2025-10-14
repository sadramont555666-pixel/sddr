"use client";

import { useState, useEffect } from "react";
import { User, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import useAuth from "@/utils/useAuth";

export default function SignInPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState(""); // phone or email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  const { signInWithCredentials } = useAuth();

  // Handle URL parameters for special flows
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const message = urlParams.get("message");
      const autoLogin = urlParams.get("autoLogin");
      const callbackUrl = urlParams.get("callbackUrl");

      if (message === "signup_success") {
        setSuccessMessage("🎉 ثبت‌نام با موفقیت انجام شد! اکنون وارد شوید.");
      }

      // Auto-populate email from localStorage if available (from recent signup)
      const recentSignupEmail = localStorage.getItem("recentSignupEmail");
      if (recentSignupEmail && autoLogin === "true" && !autoLoginAttempted) {
        setEmail(recentSignupEmail);
        setAutoLoginAttempted(true);

        // Show auto-login message
        setSuccessMessage(
          "🚀 در حال ورود خودکار... لطفاً رمز عبور خود را وارد کنید.",
        );

        // Focus password field
        setTimeout(() => {
          const passwordField = document.querySelector(
            'input[name="password"]',
          );
          if (passwordField) passwordField.focus();
        }, 500);
      }
    }
  }, [autoLoginAttempted]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!identifier || !password) {
      setError("لطفاً همه فیلدها را پر کنید");
      setLoading(false);
      return;
    }

    try {
      // Clear any stored signup email
      localStorage.removeItem("recentSignupEmail");

      const res = await fetch('/api/auth/credentials-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Field-specific error messages without refresh
        setError(data?.error || 'ورود ناموفق بود');
        setLoading(false);
        return;
      }
      // Success: redirect based on role
      window.location.href = data?.nextUrl || '/';
    } catch (err) {
      setError('خطای شبکه/سرور. لطفاً دوباره تلاش کنید.');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%)",
      }}
    >
      <div className="w-full max-w-md">
        <form
          noValidate
          onSubmit={onSubmit}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">خوش آمدید</h1>
            <p className="text-gray-600">وارد سامانه گزارش‌گیری مطالعه شوید</p>
          </div>

          <div className="space-y-6">
            {/* Phone or Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                شماره موبایل یا ایمیل
              </label>
              <div className="relative">
                <input
                  required
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="09xxxxxxxxx یا example@mail.com"
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  required
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور خود را وارد کنید"
                  className="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-600 flex items-center">
                <CheckCircle className="w-4 h-4 ml-2 flex-shrink-0" />
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 px-6 rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? "در حال ورود..." : "ورود"}
            </button>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-600">
              حساب کاربری ندارید؟{" "}
              <a
                href={`/account/signup${
                  typeof window !== "undefined" ? window.location.search : ""
                }`}
                className="text-teal-600 hover:text-teal-700 font-semibold"
              >
                ثبت‌نام کنید
              </a>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            سامانه گزارش‌گیری مطالعه - خانم ملیکا سنگ‌شکن
          </p>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Vazirmatn', sans-serif;
          direction: rtl;
        }
      `}</style>
    </div>
  );
}
