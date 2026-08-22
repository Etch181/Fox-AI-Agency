import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { PlanId, ExtraPackage } from "../../types";
import {
  Search,
  Building2,
  CheckCircle2,
  Coins,
  AlertTriangle,
  Ban,
  Trash2,
  Zap,
  Filter,
  UserCheck,
  RotateCcw,
  PackagePlus,
  Plus,
  Sparkles,
  Check,
  Layers,
  Edit3,
  Send,
  Clock,
  ShieldCheck,
  X,
  FileEdit,
} from "lucide-react";

export const AdminClientManager: React.FC = () => {
  const {
    workspaces,
    updateWorkspaceStatus,
    updateWorkspacePlan,
    deleteWorkspace,
    updateWorkspaceField,
    setCurrentWorkspaceId,
    triggerRegistrationFeedback,
    addToast,
    language,
    modificationRequests,
    createSubscriberModificationRequest,
    confirmModificationByClient,
    approveSubscriberModificationRequest,
    rejectSubscriberModificationRequest,
    registerWorkspace,
  } = useApp();

  const isAr = language === "ar";

  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [selectedWorkspaceForModal, setSelectedWorkspaceForModal] = useState<any>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<any>(null);

  // Manual Workspace Creation Modal State
  const [isAddWsModalOpen, setIsAddWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsIndustry, setNewWsIndustry] = useState<any>("Clinic");
  const [newWsOwnerName, setNewWsOwnerName] = useState("");
  const [newWsEmail, setNewWsEmail] = useState("");
  const [newWsPhone, setNewWsPhone] = useState("");
  const [newWsPlanId, setNewWsPlanId] = useState<PlanId>("business");
  const [newWsStatus, setNewWsStatus] = useState<"active" | "pending">("active");
  const [newWsInitialExtraConvs, setNewWsInitialExtraConvs] = useState<number>(0);
  const [newWsAgentName, setNewWsAgentName] = useState("");
  const [submittingNewWs, setSubmittingNewWs] = useState(false);

  const handleCreateWorkspaceManually = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim() || !newWsOwnerName.trim() || !newWsEmail.trim() || !newWsPhone.trim()) {
      addToast(
        isAr
          ? "يرجى ملء كافة الحقول الأساسية المطلوبة: اسم المنشأة، اسم المالك، البريد الإلكتروني، ورقم الهاتف."
          : "Please fill in all required fields (Workspace name, Owner name, Email, Phone).",
        "error"
      );
      return;
    }

    setSubmittingNewWs(true);
    try {
      const createdWs = registerWorkspace(
        newWsName.trim(),
        newWsIndustry,
        newWsOwnerName.trim(),
        newWsEmail.trim(),
        newWsPhone.trim()
      );

      if (createdWs) {
        const updates: Partial<any> = {
          status: newWsStatus,
          planId: newWsPlanId,
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        };

        if (newWsInitialExtraConvs > 0) {
          updates.extraConversationsLimit = newWsInitialExtraConvs;
          updates.extraPackages = [
            {
              id: `pkg_manual_${Date.now()}`,
              name: isAr ? `باقة ترحيبية مانيوال (+${newWsInitialExtraConvs} محادثة)` : `Manual Initial Pack (+${newWsInitialExtraConvs} convs)`,
              conversationsAdded: newWsInitialExtraConvs,
              priceEGP: 0,
              addedAt: new Date().toISOString().split("T")[0],
            },
          ];
        }

        if (newWsAgentName.trim()) {
          updates.aiSettings = {
            ...createdWs.aiSettings,
            agentName: newWsAgentName.trim(),
          };
        }

        updateWorkspaceField(createdWs.id, updates);

        triggerRegistrationFeedback({
          workspaceId: createdWs.id,
          workspaceName: createdWs.name,
          ownerName: createdWs.ownerName,
          ownerEmail: createdWs.ownerEmail,
          phone: createdWs.phone,
          planId: newWsPlanId,
          industry: newWsIndustry,
          source: isAr ? "إضافة مانيوال من المالك (Super Admin Manual)" : "Super Admin Manual Creation",
        });

        addToast(
          isAr
            ? `تم إضافة المنشأة (${createdWs.name}) بنجاح وإسناد باقة ${newWsPlanId.toUpperCase()} لها! 🚀`
            : `Workspace (${createdWs.name}) created successfully with ${newWsPlanId.toUpperCase()} plan!`,
          "success"
        );
      }

      setNewWsName("");
      setNewWsOwnerName("");
      setNewWsEmail("");
      setNewWsPhone("");
      setNewWsPlanId("business");
      setNewWsIndustry("Clinic");
      setNewWsStatus("active");
      setNewWsInitialExtraConvs(0);
      setNewWsAgentName("");
      setIsAddWsModalOpen(false);
    } catch (err: any) {
      addToast(isAr ? `حدث خطأ أثناء إضافة المنشأة: ${err?.message || ""}` : `Error creating workspace: ${err?.message || ""}`, "error");
    } finally {
      setSubmittingNewWs(false);
    }
  };

  // Modification modal state
  const [selectedWorkspaceForMod, setSelectedWorkspaceForMod] = useState<any>(null);
  const [modName, setModName] = useState("");
  const [modOwnerName, setModOwnerName] = useState("");
  const [modPhone, setModPhone] = useState("");
  const [modEmail, setModEmail] = useState("");
  const [modPlanId, setModPlanId] = useState<PlanId>("business");
  const [submittingMod, setSubmittingMod] = useState(false);

  const openModModal = (ws: any) => {
    setSelectedWorkspaceForMod(ws);
    setModName(ws.name || "");
    setModOwnerName(ws.ownerName || "");
    setModPhone(ws.phone || "");
    setModEmail(ws.ownerEmail || "");
    setModPlanId(ws.planId || "business");
  };

  const handleSendModRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceForMod) return;

    setSubmittingMod(true);
    try {
      await createSubscriberModificationRequest(selectedWorkspaceForMod.id, {
        name: modName,
        ownerName: modOwnerName,
        phone: modPhone,
        email: modEmail,
        planId: modPlanId,
      });
      setSelectedWorkspaceForMod(null);
    } finally {
      setSubmittingMod(false);
    }
  };

  // Extra package form states
  const [selectedPreset, setSelectedPreset] = useState<string>("500");
  const [customPackageName, setCustomPackageName] = useState("");
  const [customConvs, setCustomConvs] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const filtered = workspaces.filter((w) => {
    const wsName = w.name || "";
    const ownerName = w.ownerName || "";
    const ownerEmail = w.ownerEmail || "";
    const matchesSearch =
      wsName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter === "all" || w.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  const handleResetCounter = (ws: any) => {
    updateWorkspaceField(ws.id, { aiConversationsUsed: 0 });
    if (selectedWorkspaceForModal?.id === ws.id) {
      setSelectedWorkspaceForModal({ ...selectedWorkspaceForModal, aiConversationsUsed: 0 });
    }
    addToast(
      isAr
        ? `تم تسفير عداد المحادثات لـ (${ws.name}) بنجاح!`
        : `Conversation counter reset to 0 for ${ws.name}`,
      "success"
    );
  };

  const handleAddExtraPackage = (ws: any) => {
    let name = "";
    let convsAdded = 0;
    let price = 0;

    if (selectedPreset === "500") {
      name = isAr ? "باقة 500 محادثة إضافية" : "500 Extra Conversations Pack";
      convsAdded = 500;
      price = 250;
    } else if (selectedPreset === "1000") {
      name = isAr ? "باقة 1000 محادثة إضافية" : "1000 Extra Conversations Pack";
      convsAdded = 1000;
      price = 450;
    } else if (selectedPreset === "2500") {
      name = isAr ? "باقة 2500 محادثة إضافية" : "2500 Extra Conversations Pack";
      convsAdded = 2500;
      price = 900;
    } else if (selectedPreset === "5000") {
      name = isAr ? "باقة 5000 محادثة إضافية" : "5000 Extra Conversations Pack";
      convsAdded = 5000;
      price = 1600;
    } else {
      if (!customConvs || isNaN(Number(customConvs)) || Number(customConvs) <= 0) {
        addToast(isAr ? "يرجى تحديد عدد محادثات صحيح" : "Please enter valid conversation count", "error");
        return;
      }
      convsAdded = Number(customConvs);
      price = Number(customPrice) || 0;
      name = customPackageName.trim() || (isAr ? `باقة إضافية (+${convsAdded} محادثة)` : `Extra Pack (+${convsAdded} convs)`);
    }

    const newPackage: ExtraPackage = {
      id: `pkg_${Math.random().toString(36).substring(2, 9)}`,
      name,
      conversationsAdded: convsAdded,
      priceEGP: price,
      addedAt: new Date().toISOString().split("T")[0],
    };

    const updatedExtraLimit = (ws.extraConversationsLimit || 0) + convsAdded;
    const existingPackages = ws.extraPackages || [];
    const updatedPackages = [...existingPackages, newPackage];

    updateWorkspaceField(ws.id, {
      extraConversationsLimit: updatedExtraLimit,
      extraPackages: updatedPackages,
    });

    const updatedWs = {
      ...ws,
      extraConversationsLimit: updatedExtraLimit,
      extraPackages: updatedPackages,
    };

    setSelectedWorkspaceForModal(updatedWs);
    setCustomPackageName("");
    setCustomConvs("");
    setCustomPrice("");

    addToast(
      isAr
        ? `تم إضافة (${name}) بنجاح وزيادة الرصيد بـ +${convsAdded} محادثة!`
        : `Successfully added (${name}) with +${convsAdded} extra conversations!`,
      "success"
    );
  };

  const handleRemoveExtraPackage = (ws: any, pkgId: string) => {
    const pkgToRemove = (ws.extraPackages || []).find((p: ExtraPackage) => p.id === pkgId);
    if (!pkgToRemove) return;

    const updatedPackages = (ws.extraPackages || []).filter((p: ExtraPackage) => p.id !== pkgId);
    const updatedExtraLimit = Math.max(0, (ws.extraConversationsLimit || 0) - pkgToRemove.conversationsAdded);

    updateWorkspaceField(ws.id, {
      extraConversationsLimit: updatedExtraLimit,
      extraPackages: updatedPackages,
    });

    const updatedWs = {
      ...ws,
      extraConversationsLimit: updatedExtraLimit,
      extraPackages: updatedPackages,
    };

    setSelectedWorkspaceForModal(updatedWs);
    addToast(isAr ? "تم حذف الباقة الإضافية" : "Extra package removed", "info");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            {isAr ? "دليل حسابات المشتركين (Client Workspaces)" : "Client Workspaces Directory"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? "إدارة تعدد المستأجرين: تفعيل، إيقاف، ترقية الباقات، إضافة باقات إضافية، وتسفير العداد لكل مشترك."
              : "Multi-tenant management: Activate, suspend, upgrade, add extra packages, and reset counter."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => setIsAddWsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? "إضافة منشأة جديدة مانيوال 🏢" : "Add Workspace Manually 🏢"}</span>
          </button>

          <button
            onClick={() =>
              triggerRegistrationFeedback({
                workspaceId: `ws_test_${Math.floor(1000 + Math.random() * 9000)}`,
                workspaceName: "مستشفى السلام التخصصي",
                ownerName: "د. عبد الله المنسي",
                ownerEmail: "dr.abdallah@al-salam.com",
                phone: "01099887766",
                planId: "enterprise",
                industry: "Clinic",
                source: "Live Admin Test",
              })
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            <span>{isAr ? "اختبار التنبيه اللحظي للتسجيل 🚀" : "Test Real-Time Registration Feedback"}</span>
          </button>
        </div>
      </div>

      {/* Pending Subscriber Modification Requests Section */}
      {modificationRequests && modificationRequests.length > 0 && (
        <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 p-5 shadow-lg dark:border-indigo-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <FileEdit className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isAr ? "طلبات تعديل بيانات المشتركين" : "Subscriber Data Modification Requests"}</span>
                  <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs text-white font-black">
                    {modificationRequests.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? "يتطلب كل طلب تأكيد المشترك عبر بوت تليجرام أولاً، ثم موافقة صاحب الوكالة النهائية لتطبيق التغييرات."
                    : "Requests require client confirmation via Telegram first, followed by Super Admin final approval."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-1 lg:grid-cols-2">
            {modificationRequests.map((req) => (
              <div
                key={req.id}
                className={`rounded-2xl border p-4 transition-all ${
                  req.status === "CLIENT_CONFIRMED"
                    ? "border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md shadow-emerald-500/10"
                    : req.status === "AWAITING_CLIENT_CONFIRMATION"
                    ? "border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20"
                    : req.status === "APPROVED"
                    ? "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40 opacity-75"
                    : "border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {req.currentData.name}
                    </span>
                  </div>

                  {req.status === "AWAITING_CLIENT_CONFIRMATION" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-black text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      {isAr ? "⏳ بانتظار تأكيد العميل عبر تليجرام" : "Awaiting Client Confirmation"}
                    </span>
                  )}
                  {req.status === "CLIENT_CONFIRMED" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 animate-pulse">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {isAr ? "🟢 تم التأكيد من العميل - بانتظار موافقتك" : "Client Confirmed - Pending Approval"}
                    </span>
                  )}
                  {req.status === "APPROVED" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isAr ? "✅ تم الاعتماد والتعديل" : "Approved & Applied"}
                    </span>
                  )}
                  {req.status === "REJECTED" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <X className="h-3.5 w-3.5" />
                      {isAr ? "❌ مرفوض" : "Rejected"}
                    </span>
                  )}
                </div>

                {/* Proposed vs Current Comparison */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-2.5 border border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{isAr ? "البيانات الحالية" : "Current"}</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">الاسم: {req.currentData.name}</p>
                    <p className="text-slate-600 dark:text-slate-400">المالك: {req.currentData.ownerName}</p>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">📱 {req.currentData.phone}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">✉️ {req.currentData.email}</p>
                  </div>

                  <div className="rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 p-2.5 border border-indigo-200/80 dark:border-indigo-800/80 space-y-1">
                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">{isAr ? "البيانات المقترحة (الجديدة)" : "Proposed"}</p>
                    <p className="font-bold text-indigo-950 dark:text-indigo-200">الاسم: {req.proposedData.name}</p>
                    <p className="font-semibold text-indigo-900 dark:text-indigo-300">المالك: {req.proposedData.ownerName}</p>
                    <p className="font-mono text-indigo-800 dark:text-indigo-300 text-[11px]">📱 {req.proposedData.phone}</p>
                    <p className="text-indigo-800 dark:text-indigo-300 text-[11px]">✉️ {req.proposedData.email}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">
                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className="flex items-center gap-2">
                    {req.status === "AWAITING_CLIENT_CONFIRMATION" && (
                      <button
                        onClick={() => confirmModificationByClient(req.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{isAr ? "إرسال تأكيد العميل (محاكاة)" : "Simulate Client Confirm"}</span>
                      </button>
                    )}

                    {req.status === "CLIENT_CONFIRMED" && (
                      <>
                        <button
                          onClick={() => approveSubscriberModificationRequest(req.id)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition active:scale-95"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>{isAr ? "موافقة صاحب الوكالة (اعتماد)" : "Approve & Apply"}</span>
                        </button>
                        <button
                          onClick={() => rejectSubscriberModificationRequest(req.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 text-xs font-bold transition"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>{isAr ? "رفض" : "Reject"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              isAr
                ? "ابحث باسم النشاط التجارية، اسم المالك، أو البريد الإلكتروني..."
                : "Search by business name, owner, or email..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium bg-transparent text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">{isAr ? "جميع القطاعات" : "All Sectors"}</option>
            <option value="Clinic">{isAr ? "العيادات والطب" : "Medical Clinics"}</option>
            <option value="Pharmacy">{isAr ? "الصيدليات" : "Pharmacies"}</option>
            <option value="Restaurant">{isAr ? "المطاعم والكافيهات" : "Restaurants"}</option>
            <option value="Retail">{isAr ? "متاجر التجزئة" : "Retail Stores"}</option>
            <option value="Course Center">{isAr ? "مراكز الكورسات" : "Course Centers"}</option>
            <option value="Small Business">{isAr ? "أنشطة تجارية أخرى" : "Small Businesses"}</option>
          </select>
        </div>
      </div>

      {/* Workspaces Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="py-3 px-4 min-w-[200px]">{isAr ? "المشترك والمالك" : "Workspace & Owner"}</th>
                <th className="py-3 px-4 min-w-[110px]">{isAr ? "القطاع" : "Sector"}</th>
                <th className="py-3 px-4 min-w-[150px]">{isAr ? "الباقة والحالة" : "Plan & Status"}</th>
                <th className="py-3 px-4 min-w-[140px]">{isAr ? "استهلاك الذكاء الاصطناعي" : "AI Usage"}</th>
                <th className="py-3 px-4 min-w-[110px]">{isAr ? "تاريخ الانتهاء" : "Expiration"}</th>
                <th className="py-3 px-4 text-right min-w-[320px]">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((ws) => (
                <tr key={ws.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{ws.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words">
                          {ws.ownerName} <span className="opacity-80">({ws.ownerEmail})</span>
                        </p>
                        {ws.phone && (
                          <p className="text-[10px] text-slate-400 font-mono dir-ltr text-left">📱 {ws.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {isAr
                        ? ws.industry === "Clinic"
                          ? "عيادة"
                          : ws.industry === "Pharmacy"
                          ? "صيدلية"
                          : ws.industry === "Restaurant"
                          ? "مطعم"
                          : ws.industry === "Retail"
                          ? "متجر"
                          : ws.industry === "Course Center"
                          ? "مركز كورسات"
                          : "نشاط تجاري"
                        : ws.industry}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-extrabold text-orange-600 dark:text-orange-400 uppercase">
                        {ws.planId}
                      </span>

                      {ws.status === "active" && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> {isAr ? "نشط" : "Active"}
                        </span>
                      )}
                      {ws.status === "pending" && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> {isAr ? "معلق" : "Pending"}
                        </span>
                      )}
                      {ws.status === "suspended" && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          <Ban className="h-3 w-3" /> {isAr ? "موقوف" : "Suspended"}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {ws.aiConversationsUsed}
                          </span>
                          <span className="text-slate-400 text-[10px]">{isAr ? "محادثة" : "convs"}</span>
                        </div>
                        {ws.extraConversationsLimit && ws.extraConversationsLimit > 0 ? (
                          <span className="inline-block text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                            +{ws.extraConversationsLimit} {isAr ? "محادثة إضافية" : "extra"}
                          </span>
                        ) : null}
                      </div>

                      {/* Quick Reset Counter Button */}
                      <button
                        onClick={() => handleResetCounter(ws)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-500 dark:bg-slate-800 dark:hover:bg-orange-500 transition shadow-xs"
                        title={isAr ? "تسفير العداد (إعادة الضبط إلى 0)" : "Reset Counter to 0"}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {ws.subscriptionExpiresAt}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap min-w-[340px]">
                      {/* Modify Subscriber Data Button */}
                      <button
                        onClick={() => openModModal(ws)}
                        className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-600 hover:text-white transition dark:text-blue-400 flex items-center gap-1 shadow-xs"
                        title={isAr ? "تعديل بيانات المشترك مع تأكيد العميل" : "Request Subscriber Data Modification"}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>{isAr ? "تعديل البيانات" : "Edit Data"}</span>
                      </button>

                      {/* Manage Packages & Reset Modal Button */}
                      <button
                        onClick={() => setSelectedWorkspaceForModal(ws)}
                        className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition dark:text-indigo-400 flex items-center gap-1 shadow-xs"
                        title={isAr ? "إدارة الباقات الإضافية وتسفير العداد" : "Manage Extra Packages & Reset Counter"}
                      >
                        <PackagePlus className="h-3.5 w-3.5" />
                        <span>{isAr ? "باقة إضافية" : "Extra Package"}</span>
                      </button>

                      <button
                        onClick={() => setCurrentWorkspaceId(ws.id)}
                        className="rounded-lg bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-500 hover:text-white transition dark:text-orange-400"
                        title={isAr ? "الانتقال لمعاينة مساحة العمل" : "Inspect Workspace"}
                      >
                        {isAr ? "تبديل المنظور" : "Switch View"}
                      </button>

                      {/* Plan Upgrade Selector */}
                      <select
                        value={ws.planId}
                        onChange={(e) => updateWorkspacePlan(ws.id, e.target.value as PlanId)}
                        className="rounded-lg border border-slate-200 bg-slate-50 py-1 px-1.5 text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="starter">{isAr ? "Starter (مجاني)" : "Starter"}</option>
                        <option value="business">{isAr ? "Business (1000ج)" : "Business"}</option>
                        <option value="enterprise">{isAr ? "Enterprise (2000ج)" : "Enterprise"}</option>
                      </select>

                      {ws.status === "active" ? (
                        <button
                          onClick={() => updateWorkspaceStatus(ws.id, "suspended")}
                          className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600 hover:bg-rose-500 hover:text-white transition"
                          title={isAr ? "إيقاف المشترك" : "Suspend Client"}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateWorkspaceStatus(ws.id, "active")}
                          className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
                          title={isAr ? "تفعيل المشترك" : "Activate Client"}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setWorkspaceToDelete(ws)}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-400 hover:bg-rose-600 hover:text-white transition dark:bg-slate-800 cursor-pointer"
                        title={isAr ? "حذف الحساب نهائياً" : "Delete Workspace"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* Modal for Reset Counter & Extra Package Management */}
      {selectedWorkspaceForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {isAr ? "إدارة باقات وعداد المنشأة" : "Manage Workspace Packages & Usage"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedWorkspaceForModal.name} ({selectedWorkspaceForModal.ownerName})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedWorkspaceForModal(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Section 1: Counter Reset */}
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isAr ? "عداد الاستهلاك الحالي" : "Current AI Usage Counter"}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {selectedWorkspaceForModal.aiConversationsUsed}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      {isAr ? "محادثة مستهلكة" : "conversations used"}
                    </span>
                  </div>
                  {selectedWorkspaceForModal.extraConversationsLimit ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      {isAr
                        ? `⚡ باقات إضافية مفعلة: +${selectedWorkspaceForModal.extraConversationsLimit} محادثة`
                        : `⚡ Active Extra Limit: +${selectedWorkspaceForModal.extraConversationsLimit} convs`}
                    </p>
                  ) : null}
                </div>

                <button
                  onClick={() => handleResetCounter(selectedWorkspaceForModal)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-md transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{isAr ? "تسفير العداد إلى (0)" : "Reset Counter to (0)"}</span>
                </button>
              </div>
            </div>

            {/* Section 2: Add Extra Package */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {isAr ? "إضافة باقة إضافية جديدة (Add Extra Package)" : "Add New Extra Package"}
              </h4>

              {/* Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPreset("500")}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                    selectedPreset === "500"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-extrabold shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <span className="text-sm font-black">+500</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">250 ج.م</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPreset("1000")}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                    selectedPreset === "1000"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-extrabold shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <span className="text-sm font-black">+1000</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">450 ج.م</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPreset("2500")}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                    selectedPreset === "2500"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-extrabold shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <span className="text-sm font-black">+2500</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">900 ج.م</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPreset("custom")}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                    selectedPreset === "custom"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-extrabold shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <span className="text-sm font-black">{isAr ? "مخصصة" : "Custom"}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{isAr ? "تحديد اليدوي" : "Manual"}</span>
                </button>
              </div>

              {/* Custom fields if selectedPreset === "custom" */}
              {selectedPreset === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {isAr ? "اسم الباقة" : "Package Name"}
                    </label>
                    <input
                      type="text"
                      placeholder={isAr ? "مثال: باقة رمضان" : "e.g. Special Pack"}
                      value={customPackageName}
                      onChange={(e) => setCustomPackageName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {isAr ? "عدد المحادثات" : "Extra Conversations"}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={customConvs}
                      onChange={(e) => setCustomConvs(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {isAr ? "السعر (ج.م)" : "Price (EGP)"}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 600"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => handleAddExtraPackage(selectedWorkspaceForModal)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? "تفعيل وإضافة الباقة الإضافية للمنشأة 🚀" : "Add & Activate Extra Package"}</span>
              </button>
            </div>

            {/* Section 3: Active Extra Packages List */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" />
                {isAr ? "الباقات الإضافية المفعلة حالياً" : "Active Extra Packages"}
              </h4>

              {(!selectedWorkspaceForModal.extraPackages || selectedWorkspaceForModal.extraPackages.length === 0) ? (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-medium">
                    {isAr ? "لا توجد باقات إضافية مضافة لهذه المنشأة بعد." : "No extra packages added yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedWorkspaceForModal.extraPackages.map((pkg: ExtraPackage) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/80 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {pkg.name}
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            +{pkg.conversationsAdded} {isAr ? "محادثة" : "convs"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {isAr ? "السعر:" : "Price:"} {pkg.priceEGP} ج.م • {isAr ? "تاريخ الإضافة:" : "Added:"} {pkg.addedAt}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveExtraPackage(selectedWorkspaceForModal, pkg.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 transition"
                        title={isAr ? "حذف الباقة" : "Delete Package"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedWorkspaceForModal(null)}
                className="rounded-xl px-5 py-2.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Subscriber Data Modification Request */}
      {selectedWorkspaceForMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {isAr ? "تعديل بيانات المشترك" : "Modify Subscriber Data"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedWorkspaceForMod.name} ({selectedWorkspaceForMod.ownerName})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedWorkspaceForMod(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendModRequest} className="space-y-4">
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                📌 {isAr ? "عند إرسال هذا الطلب، سيتم إرسال إشعار فوري إلى تليجرام العميل يطلب منه تأكيد التعديلات. وبعد تأكيد العميل، سيظهر لك الطلب هنا وفي بوت التليجرام للموافقة والاعتماد النهائي." : "Submitting will notify the client on Telegram to confirm changes first, before your final approval."}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "اسم النشاط / المؤسسة" : "Workspace Name"}
                </label>
                <input
                  type="text"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "اسم المالك / المسجل" : "Owner Name"}
                </label>
                <input
                  type="text"
                  value={modOwnerName}
                  onChange={(e) => setModOwnerName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "رقم الهاتف" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={modPhone}
                    onChange={(e) => setModPhone(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? "البريد الإلكتروني" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={modEmail}
                    onChange={(e) => setModEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "الباقة المخصصة" : "Subscription Plan"}
                </label>
                <select
                  value={modPlanId}
                  onChange={(e) => setModPlanId(e.target.value as PlanId)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="starter">Fox Starter (مجاني / تجريبي)</option>
                  <option value="business">Fox Business (1000 EGP)</option>
                  <option value="enterprise">Fox Enterprise (2000 EGP)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedWorkspaceForMod(null)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingMod}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {submittingMod
                      ? isAr
                        ? "جاري إرسال الطلب..."
                        : "Sending Request..."
                      : isAr
                      ? "إرسال طلب التعديل وتنبيه العميل عبر تليجرام 🚀"
                      : "Send Request & Notify Client"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {workspaceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="rounded-xl bg-rose-500/10 p-3">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isAr ? "تأكيد الحذف النهائي للمشترك" : "Confirm Permanent Delete"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {workspaceToDelete.name} ({workspaceToDelete.id})
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {isAr
                ? `هل أنت تأكد تماماً من رغبتك في حذف المشترك "${workspaceToDelete.name}"؟ سيتم إزالته نهائياً من قاعدة البيانات والسيرفر ولن يظهر في القائمة مجدداً.`
                : `Are you sure you want to permanently delete workspace "${workspaceToDelete.name}"? This will remove it from database and server permanently.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setWorkspaceToDelete(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const wsId = workspaceToDelete.id;
                  setWorkspaceToDelete(null);
                  await deleteWorkspace(wsId);
                }}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isAr ? "نعم، حذف المشترك نهائياً 🗑️" : "Yes, Delete Permanently 🗑️"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Workspace Creation Modal (Agency Owner Feature) */}
      {isAddWsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{isAr ? "إضافة منشأة / مشترك جديد مانيوال" : "Add New Workspace Manually"}</span>
                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      {isAr ? "مالك الوكالة" : "Super Admin"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isAr
                      ? "إنشاء مساحة عمل مستقلة وإسناد البيانات والباقة وحالة التفعيل مباشرة من اللوحة."
                      : "Create isolated workspace and assign plan, owner info, and activation status directly."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspaceManually} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-1 py-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Workspace Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "اسم المنشأة / المشروع التجاري *" : "Workspace / Business Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? "مثال: مستشفى الشفاء التخصصي، مطعم وكافيه العمدة..." : "e.g. Al-Shifa Hospital, El-Omda Cafe"}
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Industry / Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "مجال النشاط / القطاع *" : "Industry / Category *"}
                    </label>
                    <select
                      value={newWsIndustry}
                      onChange={(e) => setNewWsIndustry(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Clinic">{isAr ? "🏥 عيادات ومراكز طبية (Clinic)" : "Clinic / Medical Center"}</option>
                      <option value="Pharmacy">{isAr ? "💊 صيدليات ومستلزمات (Pharmacy)" : "Pharmacy / Medical Supplies"}</option>
                      <option value="Restaurant">{isAr ? "🍔 مطاعم وكافيهات (Restaurant)" : "Restaurant & Cafe"}</option>
                      <option value="Retail">{isAr ? "🛍️ متاجر وتجزئة (Retail)" : "Retail & Shops"}</option>
                      <option value="E-Commerce">{isAr ? "🛒 تجارة إلكترونية (E-Commerce)" : "E-Commerce Store"}</option>
                      <option value="Real Estate">{isAr ? "🏢 عقارات واستثمار (Real Estate)" : "Real Estate & Investments"}</option>
                      <option value="Education">{isAr ? "🎓 تعليم وتدريب (Education)" : "Education & Academies"}</option>
                      <option value="Services">{isAr ? "⚙️ خدمات واستشارات (Services)" : "Professional Services"}</option>
                    </select>
                  </div>

                  {/* Owner Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "اسم صاحب المنشأة / المالك *" : "Owner Name *"}</label>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? "مثال: د. أحمد المحمدي" : "e.g. Dr. Ahmed El-Mohamady"}
                      value={newWsOwnerName}
                      onChange={(e) => setNewWsOwnerName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Owner Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "البريد الإلكتروني *" : "Owner Email *"}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="client@foxaiagency.com"
                      value={newWsEmail}
                      onChange={(e) => setNewWsEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "رقم الهاتف / الواتساب *" : "Phone / WhatsApp Number *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+20 100 123 4567"
                      value={newWsPhone}
                      onChange={(e) => setNewWsPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {/* Subscription Plan Selection */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      {isAr ? "خطة الاشتراك المخصصة للمنشأة *" : "Assigned Subscription Plan *"}
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setNewWsPlanId("starter")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer ${
                          newWsPlanId === "starter"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold ring-2 ring-emerald-500/30"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-black uppercase">STARTER</span>
                        <span className="text-[10px] opacity-80 mt-0.5">{isAr ? "200 محادثة" : "200 Convs"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewWsPlanId("business")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer ${
                          newWsPlanId === "business"
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold ring-2 ring-indigo-500/30"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-black uppercase">BUSINESS</span>
                        <span className="text-[10px] opacity-80 mt-0.5">{isAr ? "1000 محادثة" : "1000 Convs"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewWsPlanId("enterprise")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer ${
                          newWsPlanId === "enterprise"
                            ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold ring-2 ring-amber-500/30"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-black uppercase">ENTERPRISE</span>
                        <span className="text-[10px] opacity-80 mt-0.5">{isAr ? "2000+ محادثة" : "2000+ Convs"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "حالة التفعيل الأولي *" : "Initial Status *"}
                    </label>
                    <select
                      value={newWsStatus}
                      onChange={(e) => setNewWsStatus(e.target.value as "active" | "pending")}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="active">{isAr ? "🟢 نشط ومفعل فوراً (Active)" : "Active Immediately"}</option>
                      <option value="pending">{isAr ? "⏳ معلق بانتظار الدفع/المراجعة (Pending)" : "Pending Approval"}</option>
                    </select>
                  </div>

                  {/* Initial Bonus Conversations */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "رصيد محادثات ترحيبي إضافي (اختياري)" : "Bonus Initial Convs (Optional)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="0"
                      value={newWsInitialExtraConvs || ""}
                      onChange={(e) => setNewWsInitialExtraConvs(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {/* Custom AI Agent Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? "اسم بوت الذكاء الاصطناعي الخاص بالمنشأة (اختياري)" : "AI Agent Assistant Name (Optional)"}
                    </label>
                    <input
                      type="text"
                      placeholder={isAr ? `افتراضي: ${newWsName || "المنشأة"} AI Assistant` : `Default: ${newWsName || "Workspace"} AI Assistant`}
                      value={newWsAgentName}
                      onChange={(e) => setNewWsAgentName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddWsModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={submittingNewWs}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>{submittingNewWs ? (isAr ? "جاري الإنشاء..." : "Creating...") : (isAr ? "حفظ وإضافة المنشأة 🚀" : "Create & Save Workspace 🚀")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
