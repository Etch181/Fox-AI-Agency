import React, { useEffect, useState, useCallback } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useApp } from "../context/AppContext";
import { useTranslation } from "../services/LanguageService";
import { ViewTab } from "./Sidebar";
import { Compass, Sparkles, X, Play, CheckCircle2 } from "lucide-react";

interface OnboardingTourProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  isOpenManual?: boolean;
  onCloseManual?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  activeTab,
  setActiveTab,
  isOpenManual,
  onCloseManual,
}) => {
  const { currentWorkspace, currentUser, darkMode } = useApp();
  const { isAr } = useTranslation();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const workspaceId = currentWorkspace?.id || "default_workspace";
  const storageKey = `fox_onboarding_completed_${workspaceId}_${currentUser?.id || "guest"}`;

  // Check if tour should auto-start on first visit to this workspace
  useEffect(() => {
    const isCompleted = localStorage.getItem(storageKey);
    if (!isCompleted && currentUser) {
      // Small delay to allow initial components to mount
      const timer = setTimeout(() => {
        setShowWelcomeModal(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey, currentUser]);

  // If manual open requested from Navbar or help button
  useEffect(() => {
    if (isOpenManual) {
      setShowWelcomeModal(true);
    }
  }, [isOpenManual]);

  const startTour = useCallback(() => {
    setShowWelcomeModal(false);

    // Define driver.js steps
    const steps: DriveStep[] = [
      {
        element: '[data-tour="tour-workspace-header"]',
        popover: {
          title: isAr
            ? "1️⃣ مرحباً بك في مساحة عملك! 🚀"
            : "1️⃣ Welcome to Your Workspace! 🚀",
          description: isAr
            ? "هنا يمكنك متابعة اسم مساحة العمل، باقة الاشتراك الحالية، واستهلاك المحادثات الذكية عبر Gemini AI."
            : "Here you can monitor your active workspace, current subscription plan, and Gemini AI conversation credits.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="tour-client-crm"]',
        popover: {
          title: isAr
            ? "2️⃣ نظام إدارة العملاء والرسائل (CRM) 👥"
            : "2️⃣ CRM & Customer Leads Management 👥",
          description: isAr
            ? "يتم تجميع جميع عملاء الواتساب والتليجرام تلقائياً هنا! يمكنك تصنيف العملاء، إضافة ملاحظات، وتتبع مراحل المبيعات."
            : "All incoming leads from Telegram & WhatsApp are automatically collected here! Manage customer status, add sales notes, and filter leads.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="tour-client-industry"]',
        popover: {
          title: isAr
            ? "3️⃣ وحدة النشاط والكتالوج المخصص 📦"
            : "3️⃣ Industry Module & Custom Catalog 📦",
          description: isAr
            ? "سواء كان نشاطك عيادة، صيدلية، مطعم أو متجر، يمكنك إدارة الأطباء، الأدوية، الوجبات أو المنتجات ليتعرف عليها الذكاء الاصطناعي."
            : "Whether you operate a Clinic, Pharmacy, Restaurant, or Retail store, customize your offerings here so Gemini AI accurately assists clients.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="tour-client-ai-settings"]',
        popover: {
          title: isAr
            ? "4️⃣ إعدادات وشخصية الذكاء الاصطناعي (Gemini AI) 🤖"
            : "4️⃣ AI Personality & Business Rules 🤖",
          description: isAr
            ? "حدد نبرة الصوت (رسمية، ودية)، تعليمات الرد التلقائي، قواعد الخصومات وساعات العمل لتوجيه المساعد الذكي."
            : "Configure tone of voice, auto-response prompt guidelines, business hours, and discount policies for your AI agent.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="tour-client-live-simulator"]',
        popover: {
          title: isAr
            ? "5️⃣ مُحاكي المحادثة المباشر (Sandbox) 🧪"
            : "5️⃣ Live AI Chat Simulator 🧪",
          description: isAr
            ? "اختبر إجابات المساعد الذكي مباشرة قبل تفعيل البوت للعملاء الحقيقيين لضمان دقة الاستجابة."
            : "Test your AI assistant in real time with simulated customer queries before going live on Telegram or WhatsApp.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="tour-client-telegram"]',
        popover: {
          title: isAr
            ? "6️⃣ ربط قنوات التواصل (Telegram Bot) 📲"
            : "6️⃣ Messaging Channels & Telegram Token 📲",
          description: isAr
            ? "قم بإدخال رمز التفعيل (Telegram Bot Token) لربط البوت بقناتك والبدء في استلام الرسائل تلقائياً."
            : "Enter your Telegram Bot Token or Webhook credentials to connect your live bot to customer chats.",
          side: "right",
          align: "start",
        },
      },
    ];

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: darkMode ? "rgba(15, 23, 42, 0.82)" : "rgba(15, 23, 42, 0.65)",
      nextBtnText: isAr ? "التالي ←" : "Next →",
      prevBtnText: isAr ? "← السابق" : "← Previous",
      doneBtnText: isAr ? "إنهاء الجولة 🎉" : "Finish Tour 🎉",
      steps: steps,
      onHighlightStarted: (element, step) => {
        // Automatically switch tabs based on step index for smooth walkthrough!
        if (step.element === '[data-tour="tour-client-crm"]') {
          setActiveTab("client_crm");
        } else if (step.element === '[data-tour="tour-client-industry"]') {
          setActiveTab("client_industry_module");
        } else if (step.element === '[data-tour="tour-client-ai-settings"]') {
          setActiveTab("client_ai_settings");
        } else if (step.element === '[data-tour="tour-client-live-simulator"]') {
          setActiveTab("client_live_simulator");
        } else if (step.element === '[data-tour="tour-client-telegram"]') {
          setActiveTab("client_telegram");
        }
      },
      onDestroyed: () => {
        localStorage.setItem(storageKey, "true");
        if (onCloseManual) onCloseManual();
      },
    });

    driverObj.drive();
  }, [isAr, darkMode, setActiveTab, storageKey, onCloseManual]);

  const handleSkip = () => {
    localStorage.setItem(storageKey, "true");
    setShowWelcomeModal(false);
    if (onCloseManual) onCloseManual();
  };

  if (!showWelcomeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl transition-all">
        {/* Header decoration */}
        <div className="h-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-indigo-600" />

        <div className="p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-5 ltr:right-5 rtl:left-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            title={isAr ? "إغلاق" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon Badge */}
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-inner">
            <Compass className="h-7 w-7 animate-spin-slow" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-snug">
              {isAr ? "أهلاً بك في منصة Fox AI Agency! 🎉" : "Welcome to Fox AI Agency! 🎉"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? "دعنا نأخذك في جولة تفاعلية سريعة للتعرف على كيفية إدارة العملاء (CRM)، تخصيص الكتالوج، وإعداد الذكاء الاصطناعي لخدمة نشاطك التجاري."
                : "Let us guide you through a quick interactive walkthrough to explore lead management (CRM), catalog settings, and Gemini AI customization."}
            </p>
          </div>

          {/* Key highlights list */}
          <div className="my-6 space-y-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{isAr ? "نظام إدارة العملاء الذكي (CRM)" : "Smart CRM & Leads Engine"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                {isAr
                  ? `وحدة نشاطك: ${currentWorkspace?.industry || "الخدمات"}`
                  : `Industry Module: ${currentWorkspace?.industry || "Services"}`}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{isAr ? "تخصيص تعليمات Gemini AI" : "Gemini AI Custom Instructions"}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSkip}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition"
            >
              {isAr ? "تخطي الجولة" : "Skip Tour"}
            </button>
            <button
              onClick={startTour}
              className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-orange-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isAr ? "بدء الجولة التعريفية الان" : "Start Guided Tour Now"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
