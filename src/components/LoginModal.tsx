import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { IndustryType } from "../types";
import {
  X,
  PlusCircle,
  Building2,
  Key,
  Mail,
  Phone,
  User,
  ShieldCheck,
  Bot,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, loginWithEmail, logout, registerWorkspace, language, setLanguage } = useApp();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration form
  const [wsName, setWsName] = useState("");
  const [industry, setIndustry] = useState<IndustryType>("Clinic");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [activationCode, setActivationCode] = useState("");

  // FOX PRODUCTION REGISTRATION V1
  const [registerPassword, setRegisterPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registering, setRegistering] = useState(false);

  const isAr = language === "ar";

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    const success =
      await loginWithEmail(
        loginEmail,
        loginPassword
      );

    if (success) {
      onClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !wsName ||
      !ownerName ||
      !email ||
      !registerPassword
    ) {
      return;
    }

    setRegistering(true);

    try {
      const created =
        await registerWorkspace(
          wsName,
          industry,
          ownerName,
          email,
          phone,
          activationCode,
          registerPassword
        );

      if (created) {
        onClose();
      }
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in ${
        isAr ? "dir-rtl" : "dir-ltr"
      }`}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 overflow-hidden items-center justify-center rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm shrink-0">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<svg class="h-7 w-7 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'; }} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isAr ? "تسجيل الدخول وإدارة الحساب" : "User Login & Portal"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "بوابة المشتركين والوكالة" : "Subscribers & Agency Portal"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(isAr ? "en" : "ar")}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-orange-500 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{isAr ? "EN" : "عربي"}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Current Logged In User Info */}
        {currentUser && (
          <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{currentUser.email}</p>
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-extrabold uppercase mt-0.5">
                  {currentUser.role === "super_admin"
                    ? isAr
                      ? "👑 صاحب الـ Agency (Super Admin)"
                      : "👑 Agency Owner (Super Admin)"
                    : isAr
                    ? "🏥 عميل مشترك بالوكالة"
                    : "🏥 Subscriber Workspace Owner"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isAr ? "تسجيل الخروج" : "Sign Out"}</span>
            </button>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="my-4 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === "login"
                ? "bg-white text-orange-600 shadow-sm dark:bg-slate-700 dark:text-orange-400"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === "register"
                ? "bg-white text-orange-600 shadow-sm dark:bg-slate-700 dark:text-orange-400"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isAr ? "تسجيل مشترك جديد" : "Register Business"}</span>
          </button>
        </div>

        {/* Tab 1: Email & Password Login */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 py-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">
              {isAr ? "ادخل البريد وكلمة السر للوصول لحسابك" : "Enter your email and password to log in"}
            </span>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder={isAr ? "أدخل البريد الإلكتروني" : "Enter your email"}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "كلمة المرور" : "Password"}
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                <Lock className="h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 transition"
            >
              {isAr ? "تسجيل الدخول" : "Sign In"}
            </button>
          </form>
        )}

        {/* Tab 2: Register Workspace */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-3 py-1">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "اسم الشركة / النشاط التجاري" : "Business Name"}
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                <Building2 className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? "مثال: مركز الحياة الطبي" : "e.g. Al-Hayat Clinic"}
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="w-full text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "قطاع النشاط" : "Industry"}
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as IndustryType)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Clinic">{isAr ? "عيادة طبية" : "Medical Clinic"}</option>
                  <option value="Pharmacy">{isAr ? "صيدلية" : "Pharmacy"}</option>
                  <option value="Restaurant">{isAr ? "مطعم / كافيه" : "Restaurant / Cafe"}</option>
                  <option value="Retail">{isAr ? "متجر تجاري" : "Retail Store"}</option>
                  <option value="Small Business">{isAr ? "نشاط تجاري" : "Small Business"}</option>
                  <option value="Course Center">{isAr ? "مركز تدريب / كورسات" : "Course Center"}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "اسم صاحب الحساب" : "Owner Name"}
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                  <User className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isAr ? "د. سامح نادر" : "Dr. Sameh Nader"}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "البريد الإلكتروني" : "Email"}
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="owner@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "رقم الهاتف (واتساب)" : "WhatsApp Phone"}
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+2010..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* FOX PRODUCTION REGISTRATION V1 */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "كلمة المرور" : "Password"}
              </label>

              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                <Lock className="h-4 w-4 text-slate-400" />

                <input
                  type={showRegisterPassword ? "text" : "password"}
                  placeholder={
                    isAr
                      ? "8 أحرف على الأقل + حروف وأرقام"
                      : "8+ characters with letters and numbers"
                  }
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowRegisterPassword((v) => !v)
                  }
                  className="text-[10px] font-bold text-slate-500 hover:text-orange-500"
                >
                  {showRegisterPassword
                    ? isAr
                      ? "إخفاء"
                      : "Hide"
                    : isAr
                    ? "إظهار"
                    : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "كود التفعيل (اختياري)" : "Activation Code (Optional)"}
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                <Key className="h-4 w-4 text-orange-500" />
                <input
                  type="text"
                  placeholder="e.g. FOX-BUS-1102-M"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-transparent text-orange-600 dark:text-orange-400 focus:outline-none uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={registering}
              className="mt-2 w-full rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {registering
                ? isAr
                  ? "جاري إنشاء الحساب..."
                  : "Creating account..."
                : isAr
                ? "تسجيل حساب المشترك وبدء الاستخدام"
                : "Create Account & Start"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
