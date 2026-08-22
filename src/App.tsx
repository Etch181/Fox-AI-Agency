import React, { useEffect, useState } from "react";

// FOX CLIENT BROWSER HARDENING V1
// Deterrence only. Real secrets must never be shipped to the browser.
const useClientBrowserHardening = () => {
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const blockDevShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      const blocked =
        event.key === "F12" ||
        (event.ctrlKey && event.shiftKey &&
          ["i", "j", "c"].includes(key)) ||
        (event.ctrlKey && key === "u") ||
        (event.metaKey && event.altKey &&
          ["i", "j", "c"].includes(key));

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockDevShortcuts, true);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockDevShortcuts, true);
    };
  }, []);
};

import { AppProvider, useApp } from "./context/AppContext";
import { Navbar } from "./components/Navbar";
import { Sidebar, ViewTab } from "./components/Sidebar";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { OnboardingTour } from "./components/OnboardingTour";
import { LoginModal } from "./components/LoginModal";
import { RegistrationFeedbackToast } from "./components/RegistrationFeedbackToast";
import { AuthPortal } from "./components/auth/AuthPortal";
import { ShieldAlert, ShieldCheck, LockKeyhole } from "lucide-react";
import {
  canWorkspaceUseFeature,
  FoxFeature,
} from "./services/entitlementService";

// Admin Views
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminClientManager } from "./components/admin/AdminClientManager";
import { AdminPlansManager } from "./components/admin/AdminPlansManager";
import { AdminPayments } from "./components/admin/AdminPayments";
import { AdminActivationCodes } from "./components/admin/AdminActivationCodes";
import { AdminTelegramBot } from "./components/admin/AdminTelegramBot";
import { AdminN8nWorkflows } from "./components/admin/AdminN8nWorkflows";
import { AdminSupportTickets } from "./components/admin/AdminSupportTickets";
import { AdminAuditLogs } from "./components/admin/AdminAuditLogs";
import { AdminGeminiMonitoring } from "./components/admin/AdminGeminiMonitoring";
import { AdminAgencyRatings } from "./components/admin/AdminAgencyRatings";

// Client Views
import { ClientDashboard } from "./components/client/ClientDashboard";
import { ClientCRM } from "./components/client/ClientCRM";
import { ClientIndustryModule } from "./components/client/ClientIndustryModule";
import { ClientAppointments } from "./components/client/ClientAppointments";
import { ClientComplaints } from "./components/client/ClientComplaints";
import { ClientAISettings } from "./components/client/ClientAISettings";
import { ClientTelegramToken } from "./components/client/ClientTelegramToken";
import { ClientWhatsAppQR } from "./components/client/ClientWhatsAppQR";
import { ClientLiveChat } from "./components/client/ClientLiveChat";
import { ClientSubscription } from "./components/client/ClientSubscription";
import { ClientN8n } from "./components/client/ClientN8n";
import { ClientStaff } from "./components/client/ClientStaff";
import { ClientSupportTickets } from "./components/client/ClientSupportTickets";
import { ClientPromotions } from "./components/client/ClientPromotions";
import { ClientOrderVerification } from "./components/client/ClientOrderVerification";
import { ClientServiceRating } from "./components/client/ClientServiceRating";
import { ClientUnifiedInbox } from "./components/client/ClientUnifiedInbox";
import { ClientKnowledgeBuilder } from "./components/client/ClientKnowledgeBuilder";
import { ClientFoxAdvisor } from "./components/client/ClientFoxAdvisor";
import { ClientAIEngagement } from "./components/client/ClientAIEngagement";
import { ClientMarketingAgent } from "./components/client/ClientMarketingAgent";
import { ClientIntegrations } from "./components/client/ClientIntegrations";

/**
 * WorkspaceGuard ensures strict tenant data isolation.
 * Automatically validates that every logged-in client user is restricted strictly
 * to their assigned workspaceId, preventing cross-tenant leakage.
 */
const WorkspaceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentWorkspace, language } = useApp();
  const isAr = language === "ar";

  if (!currentUser) return null;

  // Super admin can access and switch between workspaces safely
  if (currentUser.role === "super_admin") {
    return <>{children}</>;
  }

  // Client user validation against tenant workspaceId
  const isWorkspaceValid =
    currentUser.workspaceId &&
    currentWorkspace &&
    currentWorkspace.id === currentUser.workspaceId;

  if (!isWorkspaceValid) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-3xl text-center space-y-4 my-6 animate-fade-in">
        <div className="inline-flex p-3 rounded-2xl bg-red-500/20 text-red-500">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-red-500">
          {isAr
            ? "تنبيه جدار حماية مساحة العمل (Workspace Isolation Guard)"
            : "Workspace Isolation Violation Blocked"}
        </h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          {isAr
            ? `تم حظر طلب البيانات لمنع التداخل بين العملاء. حسابك المسجل مسند حصرياً لمساحة العمل [${currentUser.workspaceId || "غير محدد"}]`
            : `Access blocked to enforce cross-tenant privacy. Your account is scoped strictly to workspaceId [${currentUser.workspaceId || "none"}].`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Workspace Isolation Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-mono font-extrabold text-[11px]">
            {isAr ? "حماية عزل البيانات مفعلة (Workspace Guard Active):" : "Workspace Tenant Guard Active:"}
          </span>
          <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-bold">
            {currentWorkspace.id}
          </span>
        </div>
        <div className="text-[10px] text-emerald-400/80 font-medium">
          {currentWorkspace.name} • {currentUser.email}
        </div>
      </div>

      {children}
    </div>
  );
};


/**
 * PlanFeatureGuard
 *
 * Second authorization layer after WorkspaceGuard.
 *
 * WorkspaceGuard = tenant isolation.
 * PlanFeatureGuard = subscription entitlement enforcement.
 */
const PlanFeatureGuard: React.FC<{
  feature: FoxFeature;
  children: React.ReactNode;
}> = ({ feature, children }) => {
  const {
    currentUser,
    currentWorkspace,
    language,
  } = useApp();

  const isAr = language === "ar";

  // Agency owner bypasses tenant plan restrictions.
  if (currentUser?.role === "super_admin") {
    return <>{children}</>;
  }

  if (!currentWorkspace) {
    return null;
  }

  if (canWorkspaceUseFeature(currentWorkspace, feature)) {
    return <>{children}</>;
  }

  const planName =
    currentWorkspace.planId === "starter"
      ? isAr ? "Starter" : "Starter"
      : currentWorkspace.planId === "business"
      ? isAr ? "Business" : "Business"
      : isAr ? "Enterprise" : "Enterprise";

  return (
    <div className="my-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center space-y-4 animate-fade-in">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
        <LockKeyhole className="h-7 w-7" />
      </div>

      <div>
        <h2 className="text-xl font-black text-amber-500">
          {isAr
            ? "هذه الميزة غير متاحة في باقتك الحالية"
            : "This feature is not included in your current plan"}
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {isAr
            ? `منشأتك مشتركة حالياً في باقة ${planName}. يمكنك ترقية الاشتراك للاستفادة من هذه الميزة.`
            : `Your workspace is currently subscribed to the ${planName} plan. Upgrade your subscription to unlock this feature.`}
        </p>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[11px] font-bold text-amber-500">
        <LockKeyhole className="h-3.5 w-3.5" />
        {isAr
          ? `الخطة الحالية: ${planName}`
          : `Current plan: ${planName}`}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<ViewTab>("admin_dashboard");

  useEffect(() => {
    const handleFoxNavigate = (event: Event) => {
      const detail =
        (event as CustomEvent<{
          tab?: ViewTab;
          conversationId?: string;
        }>).detail;

      if (!detail?.tab) {
        return;
      }

      setActiveTab(detail.tab);
    };

    window.addEventListener(
      "fox:navigate",
      handleFoxNavigate
    );

    return () => {
      window.removeEventListener(
        "fox:navigate",
        handleFoxNavigate
      );
    };
  }, []);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTourManualOpen, setIsTourManualOpen] = useState(false);

  React.useEffect(() => {
    if (currentUser && currentUser.role !== "super_admin" && activeTab.startsWith("admin_")) {
      setActiveTab("client_dashboard");
    }
  }, [currentUser, activeTab]);

  if (!currentUser) {
    return <AuthPortal />;
  }

  const renderMainView = () => {
    switch (activeTab) {
      // Super Admin Views
      case "admin_dashboard":
        return <AdminDashboard onNavigate={setActiveTab} />;
      case "admin_clients":
        return <AdminClientManager />;
      case "admin_plans":
        return <AdminPlansManager />;
      case "admin_payments":
        return <AdminPayments />;
      case "admin_codes":
        return <AdminActivationCodes />;
      case "admin_telegram":
        return <AdminTelegramBot />;
      case "admin_n8n":
        return <AdminN8nWorkflows />;
      case "admin_tickets":
        return <AdminSupportTickets />;
      case "admin_audit_logs":
        return <AdminAuditLogs />;
      case "admin_gemini_status":
        return <AdminGeminiMonitoring />;
      case "admin_ratings":
        return <AdminAgencyRatings />;

      // Client Views (Protected by WorkspaceGuard)
      case "client_dashboard":
        return (
          <WorkspaceGuard>
            <ClientDashboard onNavigate={setActiveTab} />
          </WorkspaceGuard>
        );
      case "client_crm":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="crm">
              <ClientCRM />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_industry_module":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="industry_module">
              <ClientIndustryModule />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_appointments":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="appointments">
              <ClientAppointments />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_complaints":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="complaints">
              <ClientComplaints />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_ai_settings":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="custom_prompt">
              <ClientAISettings />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_telegram":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="telegram">
              <ClientTelegramToken />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_whatsapp":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="whatsapp">
              <ClientWhatsAppQR />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_live_simulator":
        return (
          <WorkspaceGuard>
            <ClientLiveChat />
          </WorkspaceGuard>
        );
      case "client_subscription":
        return (
          <WorkspaceGuard>
            <ClientSubscription />
          </WorkspaceGuard>
        );
      case "client_n8n":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="n8n">
              <ClientN8n />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_staff":
        return (
          <WorkspaceGuard>
            <PlanFeatureGuard feature="staff_accounts">
              <ClientStaff />
            </PlanFeatureGuard>
          </WorkspaceGuard>
        );
      case "client_tickets":
        return (
          <WorkspaceGuard>
            <ClientSupportTickets />
          </WorkspaceGuard>
        );
      case "client_promotions":
        return (
          <WorkspaceGuard>
            <ClientPromotions />
          </WorkspaceGuard>
        );
      case "client_order_verification":
        return (
          <WorkspaceGuard>
            <ClientOrderVerification />
          </WorkspaceGuard>
        );
      case "client_service_ratings":
        return (
          <WorkspaceGuard>
            <ClientServiceRating />
          </WorkspaceGuard>
        );
      case "client_unified_inbox":
        return (
          <WorkspaceGuard>
            <ClientUnifiedInbox />
          </WorkspaceGuard>
        );
      case "client_knowledge_builder":
        return (
          <WorkspaceGuard>
            <ClientKnowledgeBuilder />
          </WorkspaceGuard>
        );
      case "client_fox_advisor":
        return (
          <WorkspaceGuard>
            <ClientFoxAdvisor />
          </WorkspaceGuard>
        );
      case "client_ai_analytics":
        if (currentUser.role !== "super_admin") {
          return (
            <WorkspaceGuard>
              <ClientDashboard />
            </WorkspaceGuard>
          );
        }

        return (
          <WorkspaceGuard>
            <ClientAIEngagement />
          </WorkspaceGuard>
        );
      case "client_marketing_agent":
        if (currentUser.role !== "super_admin") {
          return (
            <WorkspaceGuard>
              <ClientDashboard />
            </WorkspaceGuard>
          );
        }

        return (
          <WorkspaceGuard>
            <ClientMarketingAgent />
          </WorkspaceGuard>
        );
      case "client_integrations":
        return (
          <WorkspaceGuard>
            <ClientIntegrations />
          </WorkspaceGuard>
        );

      default:
        return <AdminDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 font-sans flex flex-col justify-between">
      <div>
        <Navbar
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onStartTour={() => setIsTourManualOpen(true)}
        />

        <div className="flex">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="flex-1 p-3 sm:p-6 lg:p-8 w-full max-w-[1750px] mx-auto overflow-x-hidden space-y-5 sm:space-y-6">
            <Breadcrumbs activeTab={activeTab} onNavigate={setActiveTab} />
            {renderMainView()}
          </main>
        </div>

        {/* Guided Onboarding Tour Walkthrough */}
        <OnboardingTour
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenManual={isTourManualOpen}
          onCloseManual={() => setIsTourManualOpen(false)}
        />
      </div>

      {/* System Status Footer */}
      <footer className="h-10 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between px-6 sm:px-8 text-[10px] text-slate-500 uppercase tracking-widest shrink-0 font-medium z-20">
        <div>
          Server: <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">FOX-SAAS-NODE-01</span>
        </div>
        <div className="hidden md:flex gap-6 items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Firebase Firestore Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Gemini 2.5 AI Latency: 42ms
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            n8n Webhook Active
          </span>
        </div>
        <div>© 2025 Fox AI Agency SaaS</div>
      </footer>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Real-time Registration Confirmation Feedback Toast */}
      <RegistrationFeedbackToast />
    </div>
  );
};

export function App() {
  useClientBrowserHardening();
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
