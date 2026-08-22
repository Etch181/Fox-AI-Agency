import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { useTranslation } from "../services/LanguageService";
import {
  Sun,
  Moon,
  Building2,
  ShieldAlert,
  UserCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Bot,
  Zap,
  Globe,
  Compass,
} from "lucide-react";

interface NavbarProps {
  onOpenLoginModal: () => void;
  onStartTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLoginModal, onStartTour }) => {
  const { t, isAr, toggleLanguage } = useTranslation();
  const {
    currentUser,
    darkMode,
    setDarkMode,
    workspaces,
    currentWorkspace,
    setCurrentWorkspaceId,
    toasts,
    logout,
  } = useApp();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 md:px-8">
      {/* Toast Overlay */}
      <div className="fixed top-4 ltr:right-4 rtl:left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between rounded-xl px-4 py-3 shadow-xl border text-xs font-semibold transition-all duration-300 animate-slide-in ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800"
                : toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800"
                : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-800"
            }`}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Brand Identity - Professional Polish */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden shrink-0">
          <img src="/logo.png" alt="Fox AI Agency Logo" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<svg class="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.2] text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'; }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-lg">
              FOX AI <span className="text-orange-500">AGENCY</span>
            </span>
            <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 border border-orange-500/20">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
            {isAr ? "محرك وكلاء الذكاء الاصطناعي متعدد المستأجرين" : "Multi-Tenant AI Agent Engine"}
          </p>
        </div>
      </div>

      {/* Workspace Switcher & User Profile Controls */}
      <div className="flex items-center gap-3">
        {/* Workspace Display / Switcher */}
        {isSuperAdmin ? (
          <div className="relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition"
            >
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              <span className="max-w-[130px] truncate sm:max-w-[180px]">
                {isAr ? "👑 مالك الوكالة (سوبر أدمين)" : "👑 Agency Owner (Super Admin)"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {workspaceMenuOpen && (
              <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {isAr ? "تبديل منظور العرض للمعاينة" : "Switch Preview Perspective"}
                  </p>
                </div>

                {/* Super Admin option */}
                <button
                  onClick={() => {
                    // Agency Admin view must not depend on a fake/demo workspace.
                    // Keep the currently selected real workspace context.
                    setWorkspaceMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-orange-600/10 hover:text-orange-500 transition"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-orange-500 shrink-0" />
                    <div>
                      <p className="font-bold">{isAr ? "منصة أدمين الوكالة" : "Super Admin Platform"}</p>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {isAr ? "لوحة الإدارة الكلية للوكالة" : "Full Agency Overview"}
                      </p>
                    </div>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {isAr ? "معاينة حسابات العملاء" : "Preview Client Workspaces"}
                </p>

                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setCurrentWorkspaceId(ws.id);
                      setWorkspaceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-start text-xs transition ${
                      currentWorkspace?.id === ws.id
                        ? "bg-orange-600/10 text-orange-500 font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate font-semibold">{ws.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {ws.industry || (isAr ? "نشاط غير محدد" : "Unknown Industry")} • {(ws.planId || "unknown").toUpperCase()}
                      </p>
                    </div>
                    {ws.status === "active" && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Pinned Subscriber Workspace Badge */
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <Building2 className="h-4 w-4 text-orange-500" />
            <span className="max-w-[150px] truncate sm:max-w-[200px]">
              {currentWorkspace?.name || (isAr ? "حساب المشترك" : "Subscriber Workspace")}
            </span>
            <span className="ml-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold text-orange-500 uppercase">
              {currentWorkspace?.planId || "Starter"}
            </span>
          </div>
        )}

        {/* Guided Onboarding Tour Button */}
        {onStartTour && (
          <button
            onClick={onStartTour}
            className="flex h-9 items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs transition hover:bg-amber-500/20 shadow-2xs cursor-pointer"
            title={isAr ? "بدء الجولة التعريفية التفاعلية" : "Start Guided Tour"}
          >
            <Compass className="h-4 w-4 text-amber-500 animate-spin-slow shrink-0" />
            <span className="hidden md:inline">{isAr ? "جولة تعريفية" : "Guided Tour"}</span>
          </button>
        )}

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex h-9 items-center gap-1.5 px-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-xs transition hover:bg-orange-500/20 shadow-2xs cursor-pointer"
          title={isAr ? "Switch to English" : "التحويل للغة العربية"}
        >
          <Globe className="h-4 w-4 text-orange-500" />
          <span className="font-bold">{isAr ? "English" : "العربية"}</span>
        </button>

        {/* User-Accessible Theme Toggle (Light / Dark Mode) */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex h-9 items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white shadow-2xs cursor-pointer"
          title={isAr ? (darkMode ? "تفعيل المظهر الفاتح (Light Mode)" : "تفعيل المظهر الداكن (Dark Mode)") : (darkMode ? "Switch to Light Mode" : "Switch to Dark Mode")}
          aria-label={isAr ? "تبديل المظهر" : "Toggle Theme"}
        >
          {darkMode ? (
            <>
              <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 hover:rotate-45 shrink-0" />
              <span className="text-xs font-bold hidden md:inline text-amber-300">{isAr ? "فاتح" : "Light"}</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 transition-transform duration-300 hover:-rotate-12 shrink-0" />
              <span className="text-xs font-bold hidden md:inline text-slate-700">{isAr ? "داكن" : "Dark"}</span>
            </>
          )}
        </button>

        {/* Role Switcher / Account Settings */}
        <button
          onClick={onOpenLoginModal}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <UserCheck className="h-3.5 w-3.5 text-slate-500" />
          <span className="hidden sm:inline">{isAr ? "الحساب" : "Account"}</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-600/20 hover:bg-orange-500 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{isAr ? "تسجيل الخروج" : "Logout"}</span>
        </button>
      </div>
    </header>
  );
};
