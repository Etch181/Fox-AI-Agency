import React from "react";
import { useApp } from "../context/AppContext";
import {
  canWorkspaceUseFeature,
  getIndustryModuleName,
} from "../services/entitlementService";
import { useTranslation } from "../services/LanguageService";
import {
  BookOpen,
  LayoutDashboard,
  Tag,
  Users,
  CreditCard,
  Key,
  Receipt,
  Bot,
  Workflow,
  Calendar,
  UtensilsCrossed,
  Pill,
  ShoppingBag,
  MessageSquareWarning,
  Sparkles,
  MessageSquare,
  Zap,
  ShieldCheck,
  UserPlus,
  HelpCircle,
  Headphones,
  LifeBuoy,
  ShieldAlert,
  Activity,
  PackageCheck,
  Award,
  BarChart2,
  Megaphone,
  MessageCircle,
} from "lucide-react";

export type ViewTab =
  | "admin_dashboard"
  | "admin_clients"
  | "admin_plans"
  | "admin_payments"
  | "admin_codes"
  | "admin_telegram"
  | "admin_n8n"
  | "admin_tickets"
  | "admin_audit_logs"
  | "admin_gemini_status"
  | "admin_ratings"
  | "client_dashboard"
  | "client_crm"
  | "client_industry_module"
  | "client_appointments"
  | "client_complaints"
  | "client_ai_settings"
  | "client_telegram"
  | "client_whatsapp"
  | "client_live_simulator"
  | "client_subscription"
  | "client_n8n"
  | "client_staff"
  | "client_tickets"
  | "client_promotions"
  | "client_order_verification"
  | "client_service_ratings"
  | "client_unified_inbox"
  | "client_knowledge_builder"
  | "client_integrations"
  | "client_fox_advisor"
  | "client_ai_analytics"
  | "client_marketing_agent";

interface SidebarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t, isAr, dir } = useTranslation();
  const { currentUser, currentWorkspace, supportTickets } = useApp();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const adminOpenTicketsCount = (supportTickets || []).filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  ).length;

  const clientActiveTicketsCount = (supportTickets || []).filter(
    (t) => t.workspaceId === currentWorkspace?.id && (t.status === "Open" || t.status === "In Progress" || t.status === "Awaiting Client")
  ).length;

  const industry = currentWorkspace?.industry || "Small Business";

  // Centralized subscription feature gate.
  // Super Admin can inspect all modules.
  const canUse = (feature: any) =>
    isSuperAdmin ||
    canWorkspaceUseFeature(currentWorkspace, feature);


  const getIndustryIcon = () => {
    switch (industry) {
      case "Clinic":
        return <Calendar className="h-4 w-4" />;
      case "Restaurant":
        return <UtensilsCrossed className="h-4 w-4" />;
      case "Pharmacy":
        return <Pill className="h-4 w-4" />;
      case "Retail":
        return <ShoppingBag className="h-4 w-4" />;
      case "Course Center":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <ShoppingBag className="h-4 w-4" />;
    }
  };

  const getIndustryLabel = () => {
    if (isAr) {
      switch (industry) {
        case "Clinic":
          return "العيادة والأطباء والحجوزات";
        case "Restaurant":
          return "قائمة الطعام والوجبات";
        case "Pharmacy":
          return "مخزون الأدوية والبدائل";
        case "Retail":
          return "كتالوج المنتجات والمنتجات";
        case "Course Center":
          return "الدورات والكورسات والمدربين";
        default:
          return "إدارة خدمات النشاط التجاري";
      }
    }
    switch (industry) {
      case "Clinic":
        return "Clinic & Doctors";
      case "Restaurant":
        return "Menu Catalog";
      case "Pharmacy":
        return "Medicine Inventory";
      case "Retail":
        return "Products Catalog";
      case "Course Center":
        return "Courses & Instructors";
      default:
        return "Industry Catalog";
    }
  };

  return (
    <aside
      className="w-64 shrink-0 ltr:border-r rtl:border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between py-6 px-4 min-h-[calc(100vh-4rem)]"
    >
      <div className="space-y-6">
        {/* Current Context / User Badge */}
        <div data-tour="tour-workspace-header" className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
              {currentUser?.name?.charAt(0) || "U"}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.name}
              </p>
              <p className="text-[10px] text-orange-600 dark:text-orange-500 font-semibold uppercase tracking-wider">
                {isSuperAdmin
                  ? isAr
                    ? "👑 صاحب الـ Agency"
                    : "👑 Agency Owner"
                  : `${currentWorkspace?.name}`}
              </p>
            </div>
          </div>
        </div>

        {/* Super Admin Navigation */}
        {isSuperAdmin && (
          <div className="space-y-1">
            <div className="py-1 px-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isAr ? "إدارة الوكالة (Super Admin)" : "Agency Admin Management"}
              </p>
            </div>

            <button
              onClick={() => setActiveTab("admin_dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_dashboard"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{isAr ? "لوحة التحليلات الإجمالية" : "Global Dashboard"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_clients")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_clients"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>{isAr ? "إدارة العملاء المشتركين" : "Subscribers & Workspaces"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_payments")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_payments"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>{isAr ? "مدفوعات Instapay EGP" : "Instapay EGP Payments"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_codes")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_codes"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Key className="h-4 w-4" />
              <span>{isAr ? "أكواد التفعيل والاشتراك" : "Activation Codes"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_plans")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_plans"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>{isAr ? "إدارة الخطط والأسعار" : "Plans & Pricing"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_telegram")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_telegram"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>{isAr ? "بوت تليجرام الرسمي" : "Telegram Official Bot"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_n8n")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_n8n"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Workflow className="h-4 w-4" />
              <span>{isAr ? "سير عمليات n8n" : "n8n Workflows Engine"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_tickets")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_tickets"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <LifeBuoy className="h-4 w-4 text-orange-500" />
                <span>{isAr ? "تذاكر الدعم الفني" : "Support Tickets"}</span>
              </div>
              {adminOpenTicketsCount > 0 && (
                <span className="bg-orange-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {adminOpenTicketsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("admin_audit_logs")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_audit_logs"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              <span>{isAr ? "سجلات المراجعة والأمان" : "Audit & Security Logs"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_gemini_status")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_gemini_status"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Activity className="h-4 w-4 text-indigo-500 animate-pulse" />
              <span>{isAr ? "مراقبة Gemini AI API" : "Gemini API Monitoring"}</span>
            </button>

            <button
              onClick={() => setActiveTab("admin_ratings")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "admin_ratings"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Award className="h-4 w-4 text-amber-500" />
              <span>{isAr ? "تقييمات وآراء الوكالة" : "Agency Service Ratings"}</span>
            </button>

            {/* Agency-only AI tools */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="px-2 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {isAr ? "أدوات الوكالة والذكاء الاصطناعي" : "Agency AI & Growth Tools"}
              </p>
            </div>

            <button
              onClick={() => setActiveTab("client_marketing_agent")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "client_marketing_agent"
                  ? "bg-orange-600/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Megaphone className="h-4 w-4 text-orange-500" />
              <span>
                {isAr
                  ? "تسويق الوكالة والسوشيال ميديا"
                  : "Agency Social Marketing"}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("client_ai_analytics")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "client_ai_analytics"
                  ? "bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <BarChart2 className="h-4 w-4 text-blue-500" />
              <span>
                {isAr
                  ? "تحليلات الذكاء الاصطناعي للوكالة"
                  : "Agency AI Analytics"}
              </span>
            </button>
          </div>
        )}

        {/* Client Workspace Navigation */}
        <div className="space-y-1">
          <div className="py-1 px-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {isSuperAdmin
                ? isAr
                  ? `🏢 إدارة المنشأة: ${currentWorkspace?.name || "بدون منشأة محددة"}`
                  : `🏢 Workspace: ${currentWorkspace?.name || "No workspace selected"}`
                : currentWorkspace?.name || (isAr ? "مساحة عمل المشترك" : "Client Workspace")}
            </p>
          </div>

          <button
            data-tour="tour-client-dashboard"
            onClick={() => setActiveTab("client_dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_dashboard"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>{isAr ? "لوحة التحكم الرئيسية" : "Dashboard"}</span>
          </button>

          <button
            data-tour="tour-client-crm"
            onClick={() => setActiveTab("client_crm")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_crm"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>{isAr ? "إدارة العملاء والرسائل" : "CRM & Leads"}</span>
          </button>

          {/* Industry Specific Module */}
          {canUse("industry_module") && (
          <button
            data-tour="tour-client-industry"
            onClick={() => setActiveTab("client_industry_module")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_industry_module"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {getIndustryIcon()}
            <span>{getIndustryLabel()}</span>
          </button>
          )}

          {(isSuperAdmin ||
            (
              canUse("appointments") &&
              (
                industry === "Clinic" ||
                industry === "Restaurant" ||
                industry === "Course Center"
              )
            )) && (
            <button
              onClick={() => setActiveTab("client_appointments")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "client_appointments"
                  ? "bg-orange-600/10 text-orange-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>{isAr ? "جدول الحجوزات الطبية" : "Appointments"}</span>
            </button>
          )}

          {canUse("complaints") && (
          <button
            onClick={() => setActiveTab("client_complaints")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_complaints"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <MessageSquareWarning className="h-4 w-4" />
            <span>{isAr ? "الشكاوى والبلاغات" : "Complaints & Escalations"}</span>
          </button>
          )}

          {(isSuperAdmin || industry === "Pharmacy" || industry === "Retail" || industry === "Restaurant") && (
            <button
              onClick={() => setActiveTab("client_order_verification")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "client_order_verification"
                  ? "bg-amber-600/10 text-amber-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <PackageCheck className="h-4 w-4" />
              <span>{isAr ? "التحقق من توفر الأوردرات والبدائل" : "Order Stock Verification"}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("client_service_ratings")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_service_ratings"
                ? "bg-amber-600/10 text-amber-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Award className="h-4 w-4" />
            <span>{isAr ? "تقييمات الخدمة والآراء" : "Service Ratings"}</span>
          </button>

          <button
            onClick={() => setActiveTab("client_promotions")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_promotions"
                ? "bg-indigo-600/10 text-indigo-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>{isAr ? "العروض والكوبونات" : "Promotions & Coupons"}</span>
          </button>
          {canUse("custom_prompt") && (
          <button
            data-tour="tour-client-ai-settings"
            onClick={() => setActiveTab("client_ai_settings")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_ai_settings"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>{isAr ? "إعدادات وكيل AI والقوالب" : "AI Agent & Custom Prompts"}</span>
          </button>
          )}

          {canUse("telegram") && (
          <button
            data-tour="tour-client-telegram"
            onClick={() => setActiveTab("client_telegram")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_telegram"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Bot className="h-4 w-4 text-blue-500" />
            <span>{isAr ? "ربط بوت التليجرام (Telegram Token)" : "Telegram Access Token"}</span>
          </button>
          )}

          {canUse("whatsapp") && (
          <button
            onClick={() => setActiveTab("client_whatsapp")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_whatsapp"
                ? "bg-emerald-600/10 text-emerald-500 font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            <span>{isAr ? "ربط WhatsApp Cloud API" : "WhatsApp Cloud API"}</span>
          </button>
          )}

          <button
            data-tour="tour-client-live-simulator"
            onClick={() => setActiveTab("client_live_simulator")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_live_simulator"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <MessageSquare className="h-4 w-4 text-emerald-500" />
            <span>{isAr ? "مُحاكي المحادثة المباشرة" : "Live Channel Simulator"}</span>
          </button>

          <button
            onClick={() => setActiveTab("client_subscription")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_subscription"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>{isAr ? "الاشتراك والدفع Instapay" : "Subscription & Instapay"}</span>
          </button>

          <button
            onClick={() => setActiveTab("client_unified_inbox")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_unified_inbox"
                ? "bg-indigo-600/10 text-indigo-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>{isAr ? "صندوق الوارد الموحد" : "Unified Inbox"}</span>
          </button>

          <button
            onClick={() => setActiveTab("client_knowledge_builder")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_knowledge_builder"
                ? "bg-indigo-600/10 text-indigo-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>{isAr ? "تدريب البوت (قاعدة المعرفة)" : "Knowledge Base Builder"}</span>
          </button>

          <button
            onClick={() => setActiveTab("client_fox_advisor")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_fox_advisor"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Bot className="h-4 w-4 text-orange-500" />
            <span>{isAr ? "مستشار فوكس الذكي" : "Smart Fox Advisor"}</span>
          </button>





          <button
            onClick={() => setActiveTab("client_integrations")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_integrations"
                ? "bg-indigo-600/10 text-indigo-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Workflow className="h-4 w-4" />
            <span>{isAr ? "الربط والتكامل" : "Integrations"}</span>
          </button>

          <button
            onClick={() => setActiveTab("client_n8n")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_n8n"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Zap className="h-4 w-4 text-amber-500" />
            <span>{isAr ? "ربط أتمتة n8n" : "n8n Automation"}</span>
          </button>

          <button
            onClick={() => setActiveTab("client_staff")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_staff"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>{isAr ? "فريق العمل والصلاحيات" : "Staff Accounts"}</span>
          </button>

          <button
            onClick={() => setActiveTab("client_tickets")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "client_tickets"
                ? "bg-orange-600/10 text-orange-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <Headphones className="h-4 w-4 text-orange-500" />
              <span>{isAr ? "الدعم الفني وتذاكر الخدمة" : "Support & Help"}</span>
            </div>
            {clientActiveTicketsCount > 0 && (
              <span className="bg-orange-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full">
                {clientActiveTicketsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Subscription Progress Box */}
      {(() => {
        const used = currentWorkspace?.aiConversationsUsed || 0;
        const isUnlimited = currentWorkspace?.planId === "enterprise";

        const baseLimit =
          currentWorkspace?.planId === "starter"
            ? 50
            : currentWorkspace?.planId === "business"
              ? 1000
              : -1;

        const extraLimit =
          currentWorkspace?.extraConversationsLimit || 0;

        const totalLimit =
          isUnlimited
            ? -1
            : baseLimit + extraLimit;

        const remaining =
          isUnlimited
            ? -1
            : typeof currentWorkspace?.creditBalance === "number"
              ? currentWorkspace.creditBalance
              : Math.max(0, totalLimit - used);

        const pct =
          isUnlimited
            ? 0
            : totalLimit > 0
              ? Math.min(
                  100,
                  Math.round((used / totalLimit) * 100)
                )
              : 100;

        return (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800/80">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                  {currentWorkspace?.name || "Fox Business"}
                </span>
                <span className="text-[10px] text-orange-500 font-bold uppercase">
                  {currentWorkspace?.planId || "PRO"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {isUnlimited
                    ? (isAr
                        ? `${used} مستخدمة / غير محدود`
                        : `${used} used / Unlimited`)
                    : (isAr
                        ? `${remaining} متبقية من ${totalLimit}`
                        : `${remaining} remaining of ${totalLimit}`)}
                </p>
                {extraLimit > 0 && (
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                    (+{extraLimit})
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 px-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">WhatsApp</span>
                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  {isAr ? "نشط" : "Active"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Telegram</span>
                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  {isAr ? "متصل" : "Connected"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Gemini AI</span>
                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  {isAr ? "متصل 3.6 Flash" : "Connected 3.6 Flash"}
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </aside>
  );
};
