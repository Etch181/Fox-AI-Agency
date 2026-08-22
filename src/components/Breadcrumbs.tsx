import React from "react";
import { useApp } from "../context/AppContext";
import { useTranslation } from "../services/LanguageService";
import { ViewTab } from "./Sidebar";
import {
  Home,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  Users,
  CreditCard,
  Key,
  Bot,
  Workflow,
  HelpCircle,
  ShieldCheck,
  Activity,
  Building2,
  UtensilsCrossed,
  Pill,
  ShoppingBag,
  Stethoscope,
  Calendar,
  AlertCircle,
  Sparkles,
  Send,
  MessageSquare,
  Shield,
  UserCheck,
} from "lucide-react";

interface BreadcrumbsProps {
  activeTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  subViewName?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeTab,
  onNavigate,
  subViewName,
}) => {
  const { currentUser, currentWorkspace, language } = useApp();
  const { isAr } = useTranslation();

  const ChevronIcon = isAr ? ChevronLeft : ChevronRight;

  // Generate Tab Metadata
  const getTabDetails = (tab: ViewTab) => {
    switch (tab) {
      // Super Admin Tabs
      case "admin_dashboard":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "لوحة التحكم الرئيسية" : "Super Admin Dashboard",
          icon: LayoutDashboard,
        };
      case "admin_clients":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "مساحات عمل العملاء" : "Client Workspaces",
          icon: Building2,
        };
      case "admin_plans":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "باقات الاشتراكات" : "Subscription Plans",
          icon: CreditCard,
        };
      case "admin_payments":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "بوابات الدفع والمعاملات" : "Payment Gateways",
          icon: CreditCard,
        };
      case "admin_codes":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "أكواد التفعيل" : "Activation Codes",
          icon: Key,
        };
      case "admin_telegram":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "إعدادات البوت المركزي" : "Telegram Bot Engine",
          icon: Send,
        };
      case "admin_n8n":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "محركات الأتمتة n8n" : "n8n Webhook Engine",
          icon: Workflow,
        };
      case "admin_tickets":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "تذاكر الدعم الفني" : "Support Helpdesk",
          icon: HelpCircle,
        };
      case "admin_audit_logs":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "سجلات المراجعة والأمان" : "Audit & Security Logs",
          icon: ShieldCheck,
        };
      case "admin_gemini_status":
        return {
          parentCategory: isAr ? "إدارة النظام" : "System Control",
          label: isAr ? "مراقبة Gemini AI API" : "Gemini API Monitoring",
          icon: Activity,
        };

      // Client Workspace Tabs
      case "client_dashboard":
        return {
          parentCategory: isAr ? "مساحة العمل" : "Workspace",
          label: isAr ? "نظرة عامة والتحليلات" : "Workspace Overview",
          icon: LayoutDashboard,
        };
      case "client_crm":
        return {
          parentCategory: isAr ? "إدارة العلاقات" : "CRM & Sales",
          label: isAr ? "إدارة العملاء المحتملين" : "Customer Leads Pipeline",
          icon: Users,
        };
      case "client_industry_module":
        const industry = currentWorkspace?.industry;
        let indLabel = isAr ? "الكتالوج وقاعدة المعرفة" : "Industry Knowledge Base";
        let indIcon = Building2;
        if (industry === "Clinic") {
          indLabel = isAr ? "الأطباء والخدمات الطبية" : "Medical Services & Doctors";
          indIcon = Stethoscope;
        } else if (industry === "Pharmacy") {
          indLabel = isAr ? "كتالوج الأدوية والمستلزمات" : "Pharmacy Medicines Catalog";
          indIcon = Pill;
        } else if (industry === "Restaurant") {
          indLabel = isAr ? "قائمة الطعام والوجبات" : "Restaurant Menu & Food";
          indIcon = UtensilsCrossed;
        } else if (industry === "Retail") {
          indLabel = isAr ? "كتالوج المنتجات والمخزون" : "Retail Product Catalog";
          indIcon = ShoppingBag;
        }
        return {
          parentCategory: isAr ? "الأنشطة التخصصية" : "Specialized Module",
          label: indLabel,
          icon: indIcon,
        };
      case "client_appointments":
        return {
          parentCategory: isAr ? "العمليات" : "Operations",
          label: isAr ? "جدول الحجوزات والمواعيد" : "Appointments Queue",
          icon: Calendar,
        };
      case "client_complaints":
        return {
          parentCategory: isAr ? "خدمة العملاء" : "Customer Care",
          label: isAr ? "الشكاوى والاقتراحات" : "Complaints & Feedback",
          icon: AlertCircle,
        };
      case "client_ai_settings":
        return {
          parentCategory: isAr ? "إعدادات الذكاء الاصطناعي" : "AI Engine Settings",
          label: isAr ? "تخصيص شخصية Gemini AI" : "Gemini AI Personality & Rules",
          icon: Sparkles,
        };
      case "client_telegram":
        return {
          parentCategory: isAr ? "القنوات" : "Channels",
          label: isAr ? "ربط قناة تليجرام" : "Telegram Bot Integration",
          icon: Send,
        };
      case "client_live_simulator":
        return {
          parentCategory: isAr ? "الاختبار" : "Sandbox",
          label: isAr ? "مُحاكي المحادثات المباشر" : "Live AI Chat Simulator",
          icon: MessageSquare,
        };
      case "client_subscription":
        return {
          parentCategory: isAr ? "الحساب" : "Account",
          label: isAr ? "الاشتراك والفواتير" : "Subscription & Billing",
          icon: CreditCard,
        };
      case "client_n8n":
        return {
          parentCategory: isAr ? "التكاملات" : "Integrations",
          label: isAr ? "ربط الويب هوك n8n" : "n8n Webhook Settings",
          icon: Workflow,
        };
      case "client_staff":
        return {
          parentCategory: isAr ? "إدارة الفريق" : "Team & Security",
          label: isAr ? "الموظفون والصلاحيات" : "Staff & Role Access",
          icon: UserCheck,
        };
      case "client_tickets":
        return {
          parentCategory: isAr ? "المساعدة" : "Help & Support",
          label: isAr ? "تذاكر الدعم الفني" : "Support Tickets",
          icon: HelpCircle,
        };

      default:
        return {
          parentCategory: isAr ? "الرئيسية" : "Main",
          label: isAr ? "الصفحة الرئيسية" : "Home",
          icon: Home,
        };
    }
  };

  const currentTabDetails = getTabDetails(activeTab);
  const TabIcon = currentTabDetails.icon;

  const isSuperAdmin = currentUser?.role === "super_admin";
  const defaultHomeTab: ViewTab = isSuperAdmin ? "admin_dashboard" : "client_dashboard";

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs text-xs transition-all"
    >
      <ol className="flex flex-wrap items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
        {/* Root Node / Workspace Context */}
        <li className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate(defaultHomeTab)}
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 font-bold transition group"
            title={isAr ? "الانتقال إلى لوحة التحكم الرئيسية" : "Go to Main Dashboard"}
          >
            <Home className="h-3.5 w-3.5 text-slate-400 group-hover:text-orange-500 transition" />
            <span>
              {isSuperAdmin
                ? isAr
                  ? "لوحة التحكم الفائقة"
                  : "Super Admin Platform"
                : currentWorkspace
                ? currentWorkspace.name
                : isAr
                ? "مساحة العمل"
                : "Workspace"}
            </span>
          </button>
        </li>

        {/* Separator */}
        <li aria-hidden="true" className="text-slate-300 dark:text-slate-700">
          <ChevronIcon className="h-3.5 w-3.5" />
        </li>

        {/* Parent Category */}
        <li className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[11px] font-semibold">
          <span>{currentTabDetails.parentCategory}</span>
        </li>

        {/* Separator */}
        <li aria-hidden="true" className="text-slate-300 dark:text-slate-700">
          <ChevronIcon className="h-3.5 w-3.5" />
        </li>

        {/* Current Active View Crumb */}
        <li className="flex items-center gap-1.5 text-slate-900 dark:text-white font-extrabold">
          <TabIcon className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          <span>{currentTabDetails.label}</span>
        </li>

        {/* Optional Deeply Nested Sub-View Node */}
        {subViewName && (
          <>
            <li aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              <ChevronIcon className="h-3.5 w-3.5" />
            </li>
            <li className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-[11px] border border-orange-500/20">
              <span>{subViewName}</span>
            </li>
          </>
        )}
      </ol>

      {/* Right side metadata badge */}
      <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
          {activeTab}
        </span>
        {currentWorkspace && (
          <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20">
            {currentWorkspace.industry}
          </span>
        )}
      </div>
    </nav>
  );
};
