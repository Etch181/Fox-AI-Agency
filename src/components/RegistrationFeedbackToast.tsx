import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  CheckCircle2,
  Database,
  Sparkles,
  X,
  Building2,
  User,
  Phone,
  Mail,
  Zap,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Clock,
  XCircle,
  Trash2,
} from "lucide-react";

export const RegistrationFeedbackToast: React.FC = () => {
  const {
    currentUser,
    latestRegistration,
    dismissRegistrationFeedback,
    setCurrentWorkspaceId,
    deleteWorkspace,
    addToast,
    language,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  const isAr = language === "ar";

  useEffect(() => {
    if (!latestRegistration) {
      setProgress(100);
      return;
    }

    // Reset countdown (paused on hover)
    setProgress(100);
    const durationMs = 15000;
    const intervalMs = 100;
    const decrement = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      if (!isHovered) {
        setProgress((prev) => Math.max(0, prev - decrement));
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [latestRegistration, isHovered]);

  useEffect(() => {
    if (latestRegistration && progress <= 0) {
      dismissRegistrationFeedback();
    }
  }, [progress, latestRegistration, dismissRegistrationFeedback]);

  // FOX SECURITY:
  // Registration approval feedback contains cross-tenant/admin data.
  // It must only ever be visible to the agency Super Admin.
  const isSuperAdmin = currentUser?.role === "super_admin";

  if (!isSuperAdmin || !latestRegistration) return null;

  const handleApproveRegistration = () => {
    addToast(
      isAr
        ? `تمت الموافقة على إضافة المشترك "${latestRegistration.workspaceName}" بنجاح!`
        : `Approved addition of ${latestRegistration.workspaceName}`,
      "success"
    );
    dismissRegistrationFeedback();
  };

  const handleRejectRegistration = async () => {
    const wsId = latestRegistration.workspaceId;
    dismissRegistrationFeedback();
    await deleteWorkspace(wsId);
  };

  const handleCopyCredentials = () => {
    const textToCopy = `FOX AI AGENCY - Registration Credentials
Workspace ID: ${latestRegistration.workspaceId}
Business Name: ${latestRegistration.workspaceName}
Owner Name: ${latestRegistration.ownerName}
Email: ${latestRegistration.ownerEmail}
Phone: ${latestRegistration.phone}
Plan: ${latestRegistration.planId}
Database Document: ${latestRegistration.docPath}
Registered At: ${latestRegistration.timestamp}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGoToWorkspace = () => {
    setCurrentWorkspaceId(latestRegistration.workspaceId);
    dismissRegistrationFeedback();
  };

  return (
    <div
      className={`fixed bottom-6 ltr:right-6 rtl:left-6 z-50 w-full max-w-lg transition-all duration-300 transform animate-slide-up ${
        isAr ? "dir-rtl" : "dir-ltr"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-slate-900/95 text-white p-5 shadow-2xl backdrop-blur-xl ring-1 ring-emerald-500/30">
        {/* Glow Accent Effects */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl pointer-events-none" />

        {/* Real-time Persistence Status Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-6 w-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">
                  {isAr ? "تم تسجيل الحساب وتأكيد البيانات!" : "Registration Confirmed & Persisted!"}
                </h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/30">
                  <Database className="h-3 w-3" />
                  <span>Firestore Saved</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                {isAr
                  ? "تم حفظ وتخزين بيانات المشترك في قاعدة البيانات بنجاح."
                  : "Workspace data successfully committed & synced in persistent storage."}
              </p>
            </div>
          </div>

          <button
            onClick={dismissRegistrationFeedback}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title={isAr ? "إغلاق التنبيه" : "Dismiss Toast"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Database Persistence Verification Metadata Badge */}
        <div className="my-3 flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2 border border-slate-800/80 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="font-bold">{isAr ? "مسار السجل:" : "Doc:"}</span>
            <span className="text-slate-300 truncate max-w-[200px]">{latestRegistration.docPath}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-[10px]">
            <Clock className="h-3 w-3" />
            <span>{latestRegistration.dbSavedAt}</span>
          </div>
        </div>

        {/* Registration Summary Card */}
        <div className="space-y-2 rounded-2xl bg-slate-800/60 p-3.5 border border-slate-700/50 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 font-bold">
              <Building2 className="h-3.5 w-3.5 text-orange-400" />
              {isAr ? "النشاط التجاري:" : "Business:"}
            </span>
            <span className="font-extrabold text-white">{latestRegistration.workspaceName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 font-bold">
              <User className="h-3.5 w-3.5 text-blue-400" />
              {isAr ? "صاحب الحساب:" : "Owner:"}
            </span>
            <span className="font-semibold text-slate-200">
              {latestRegistration.ownerName} ({latestRegistration.phone})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 font-bold">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              {isAr ? "الباقة والمصدر:" : "Plan & Source:"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="uppercase px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {latestRegistration.planId}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
                {latestRegistration.source}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Control Buttons: Approve vs Reject vs Copy */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            onClick={handleApproveRegistration}
            className="w-full sm:flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 px-3 text-xs font-black text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isAr ? "موافقة على الإضافة 🟢" : "Approve Addition 🟢"}</span>
          </button>

          <button
            onClick={handleRejectRegistration}
            className="w-full sm:flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600/90 py-2.5 px-3 text-xs font-black text-white hover:bg-rose-600 shadow-md shadow-rose-600/30 transition cursor-pointer active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isAr ? "رفض وحذف المشترك 🔴" : "Reject & Delete 🔴"}</span>
          </button>

          <button
            onClick={handleCopyCredentials}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 px-3 text-xs font-extrabold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            title={isAr ? "نسخ معلومات المشترك" : "Copy Credentials"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Progress Countdown Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-orange-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
