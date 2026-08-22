import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { PlanId } from "../../types";
import { PricingPlans } from "../PricingPlans";
import {
  Receipt,
  Upload,
  Key,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  ShieldCheck,
  CreditCard,
  FileText,
  Building2,
} from "lucide-react";

export const ClientSubscription: React.FC = () => {
  const {
    currentWorkspace,
    currentUser,
    plans,
    submitInstapayPayment,
    redeemActivationCode,
    payments,
    addToast,
    language,
    modificationRequests,
    confirmModificationByClient,
    rejectSubscriberModificationRequest,
  } = useApp();

  const isAr = language === "ar";

  const [purchaseCategory, setPurchaseCategory] = useState<"plan" | "extra_package">("plan");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("business");
  const [selectedExtraConvs, setSelectedExtraConvs] = useState<number>(1000);
  const [txRef, setTxRef] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [activationCodeInput, setActivationCodeInput] = useState("");

  if (!currentWorkspace) return null;

  const pendingModReq = modificationRequests?.find(
    (r) => r.workspaceId === currentWorkspace.id && r.status === "AWAITING_CLIENT_CONFIRMATION"
  );

  const myPayments = payments.filter((p) => p.workspaceId === currentWorkspace.id);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[1];

  const extraPackageOptions = [
    { convs: 500, price: 250, labelAr: "500 محادثة إضافية (250 ج.م)", labelEn: "500 Extra Conversations (250 EGP)" },
    { convs: 1000, price: 450, labelAr: "1000 محادثة إضافية (450 ج.م)", labelEn: "1000 Extra Conversations (450 EGP)" },
    { convs: 2500, price: 900, labelAr: "2500 محادثة إضافية (900 ج.م)", labelEn: "2500 Extra Conversations (900 EGP)" },
    { convs: 5000, price: 1600, labelAr: "5000 محادثة إضافية (1600 ج.م)", labelEn: "5000 Extra Conversations (1600 EGP)" },
  ];

  const currentExtraOption = extraPackageOptions.find((o) => o.convs === selectedExtraConvs) || extraPackageOptions[1];

  const calculateAmount = () => {
    if (purchaseCategory === "extra_package") {
      return currentExtraOption.price;
    }
    return selectedPlan.priceEGP;
  };

  const handleSimulateScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mockUrl = URL.createObjectURL(file);
      setScreenshotUrl(mockUrl);
      addToast(isAr ? "تم تحديد صوره إيصال التحويل!" : "Screenshot selected!", "info");
    }
  };

  const handleSubmitInstapay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txRef || !screenshotUrl) {
      addToast(
        isAr ? "يرجى كتابة المرجع وإرفاق صوره تحويل InstaPay" : "Please provide transaction reference and upload screenshot",
        "error"
      );
      return;
    }

    if (purchaseCategory === "extra_package") {
      submitInstapayPayment(
        currentWorkspace.id,
        currentWorkspace.planId,
        currentExtraOption.price,
        screenshotUrl,
        txRef,
        "extra_package",
        isAr ? `باقة +${currentExtraOption.convs} محادثة إضافية` : `+${currentExtraOption.convs} Extra Convs Pack`,
        currentExtraOption.convs
      );
    } else {
      submitInstapayPayment(
        currentWorkspace.id,
        selectedPlanId,
        selectedPlan.priceEGP,
        screenshotUrl,
        txRef,
        "plan"
      );
    }

    setTxRef("");
    setScreenshotUrl("");
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activationCodeInput.trim()) {
      return;
    }

    const ok =
      await redeemActivationCode(
        currentWorkspace.id,
        activationCodeInput.trim()
      );

    if (ok) {
      setActivationCodeInput("");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Client Pending Data Modification Request Notification Banner */}
      {pendingModReq && (
        <div className="rounded-3xl border-2 border-indigo-500/80 bg-gradient-to-r from-indigo-900/90 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl animate-fade-in space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-700/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-white font-bold shadow-md">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black">
                  {isAr ? "⚠️ إشعار تعديل بيانات الحساب من إدارة الوكالة FOX AI AGENCY" : "Account Data Update Notice"}
                </h3>
                <p className="text-xs text-indigo-200">
                  {isAr ? "يرجى مراجعة التغييرات المطلوبة وتأكيد موافقتك لتحديث البيانات رسمياً" : "Please review proposed changes and confirm your agreement"}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 animate-pulse">
              {isAr ? "مطلوب تأكيدك الآن" : "Action Required"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md space-y-1">
              <p className="text-[10px] font-extrabold text-indigo-300 uppercase">{isAr ? "البيانات الحالية" : "Current Data"}</p>
              <p className="font-bold">اسم النشاط: {pendingModReq.currentData.name}</p>
              <p>اسم المالك: {pendingModReq.currentData.ownerName}</p>
              <p className="font-mono">الهاتف: {pendingModReq.currentData.phone}</p>
              <p>البريد: {pendingModReq.currentData.email}</p>
            </div>

            <div className="rounded-2xl bg-indigo-500/20 border border-indigo-400/40 p-3.5 backdrop-blur-md space-y-1">
              <p className="text-[10px] font-extrabold text-emerald-400 uppercase">{isAr ? "البيانات الجديدة المقترحة" : "Proposed New Data"}</p>
              <p className="font-extrabold text-emerald-300">اسم النشاط: {pendingModReq.proposedData.name}</p>
              <p className="font-bold text-emerald-200">اسم المالك: {pendingModReq.proposedData.ownerName}</p>
              <p className="font-mono text-emerald-200">الهاتف: {pendingModReq.proposedData.phone}</p>
              <p className="text-emerald-200">البريد: {pendingModReq.proposedData.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => rejectSubscriberModificationRequest(pendingModReq.id)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white font-bold text-xs transition"
            >
              {isAr ? "رفض التعديل ❌" : "Reject Modification"}
            </button>

            <button
              onClick={() => confirmModificationByClient(pendingModReq.id)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isAr ? "موافقة وتأكيد التعديل 🟢" : "Confirm & Accept Modification"}</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <Receipt className="h-6 w-6 text-orange-500" />
            {isAr ? "مركز الاشتراكات والدفع عبر InstaPay" : "Subscription & Instapay Payment Center"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? "دفع الاشتراكات والباقات الإضافية عبر InstaPay، أو إدخال كود التفعيل المبعوث من إدارة الوكالة."
              : "Pay for plans or extra packages via Instapay (EGP) or enter an Activation Code issued by Super Admin."}
          </p>
        </div>
      </div>

      {/* Super Admin / Agency Owner Unlimited Access Notice */}
      {currentUser?.role === "super_admin" && (
        <div className="rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-emerald-400">
                  {isAr ? "حساب مالك وصانع الوكالة (Agency Owner - Master Account)" : "Agency Owner Master Account"}
                </h3>
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {isAr ? "جميع المميزات مفتوحة بلا حدود" : "All Features Unlocked"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isAr
                  ? "بما أنك صانع ومالك الوكالة، جميع الباقات والبوتات وأدوات الذكاء الاصطناعي وربط الـ WhatsApp والـ Telegram وربط n8n متاحة لك بالكامل وبلا حدود."
                  : "As the agency owner & creator, all features, AI agents, WhatsApp/Telegram connections, and n8n automations are 100% unlocked with unlimited capacity."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              {isAr ? "الخطة: ENTERPRISE MASTER (غير محدود)" : "Plan: ENTERPRISE MASTER (Unlimited)"}
            </span>
          </div>
        </div>
      )}

      {/* Current Active Plan & Usage Card */}
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-slate-900/10 p-6 shadow-sm dark:border-orange-500/40 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-800 uppercase">
              {isAr ? "الباقة الحالية:" : "Current Plan:"} {currentWorkspace.planId.toUpperCase()}
            </span>
            <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
              {currentWorkspace.name} - {isAr ? "حالة الاشتراك والاستهلاك" : "Subscription Status"}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              {isAr ? "صالح حتى:" : "Valid until:"}{" "}
              <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                {currentWorkspace.subscriptionExpiresAt}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-4 text-center dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm min-w-[160px]">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {isAr ? "المحادثات المستهلكة" : "Conversations Used"}
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {currentWorkspace.aiConversationsUsed}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                {isAr ? "وكيل الذكاء الاصطناعي نشط" : "AI Agents Active"}
              </p>
            </div>

            {currentWorkspace.extraConversationsLimit ? (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center border border-emerald-200 dark:border-emerald-800 shadow-sm min-w-[160px]">
                <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {isAr ? "باقات إضافية مفعلة" : "Extra Limit Active"}
                </p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  +{currentWorkspace.extraConversationsLimit}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {isAr ? "محادثة مضافة" : "Extra Convs"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Method 1: Activation Code Redemption */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Key className="h-4 w-4 text-orange-500" />
            {isAr ? "إدخال كود التفعيل (Activation Code)" : "Redeem Activation Code"}
          </h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isAr
              ? "إذا كان لديك كود تفعيل مبعوث من إدارة الوكالة (لباقة أساسية أو باقة إضافية)، أدخله هنا لتفعيله فوراً."
              : "Have a code issued by Fox AI Agency admin? Enter it below to activate your plan or extra package instantly."}
          </p>

          <form onSubmit={handleRedeemCode} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "كود التفعيل" : "Activation Code"}
              </label>
              <input
                type="text"
                placeholder={isAr ? "مثال: FOX-BUS-1102-M أو FOX-EXTRA-1000-8812" : "e.g. FOX-BUS-1102-M"}
                value={activationCodeInput}
                onChange={(e) => setActivationCodeInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono font-bold text-orange-600 dark:border-slate-800 dark:bg-slate-800 dark:text-orange-400 uppercase focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-600 transition"
            >
              <Zap className="h-4 w-4" />
              {isAr ? "تفعيل الكود فوراً 🚀" : "Redeem Code & Activate"}
            </button>
          </form>
        </div>

        {/* Method 2: Instapay EGP Upload */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Receipt className="h-4 w-4 text-emerald-500" />
            {isAr ? "الدفع عبر InstaPay ورفع الإيصال" : "Instapay EGP Transfer & Screenshot Upload"}
          </h3>

          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
            <p className="font-extrabold">{isAr ? "عنوان حساب InstaPay الرسمي:" : "Official Instapay Account:"}</p>
            <p className="font-mono text-xs font-bold">etch2410@instapay</p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
              {isAr
                ? "قم بتحويل المبلغ المطلوبة، ثم ارفع صورة إيصال التحويل واكتب رقم المرجع ليقوم صاحب الوكالة بالاعتماد وإرسال الكود."
                : "Transfer requested amount in EGP, then upload screenshot below for Super Admin clearance."}
            </p>
          </div>

          <form onSubmit={handleSubmitInstapay} className="mt-4 space-y-3 text-xs">
            {/* Purchase Category Selector */}
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPurchaseCategory("plan")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  purchaseCategory === "plan"
                    ? "bg-white text-orange-600 shadow-xs dark:bg-slate-900 dark:text-orange-400"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {isAr ? "تجديد / ترقية اشتراك الخطة" : "Plan Subscription"}
              </button>
              <button
                type="button"
                onClick={() => setPurchaseCategory("extra_package")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  purchaseCategory === "extra_package"
                    ? "bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {isAr ? "شراء باقة محادثات إضافية ⚡" : "Extra Package"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {purchaseCategory === "extra_package"
                    ? isAr
                      ? "اختر الباقة الإضافية"
                      : "Select Extra Pack"
                    : isAr
                    ? "اختر الخطة المطلوبة"
                    : "Target Plan"}
                </label>

                {purchaseCategory === "extra_package" ? (
                  <select
                    value={selectedExtraConvs}
                    onChange={(e) => setSelectedExtraConvs(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    {extraPackageOptions.map((opt) => (
                      <option key={opt.convs} value={opt.convs}>
                        {isAr ? opt.labelAr : opt.labelEn}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value as PlanId)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="business">Fox Business (1000 EGP/mo)</option>
                    <option value="enterprise">Fox Enterprise (2000 EGP/mo)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "المبلغ المطلوب (ج.م)" : "Amount (EGP)"}
                </label>
                <input
                  type="text"
                  value={`${calculateAmount()} EGP`}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2 font-black text-emerald-600 dark:border-slate-800 dark:bg-slate-800 dark:text-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "الرقم المرجعي للتحويل في InstaPay" : "Instapay Reference / Tx Number"}
              </label>
              <input
                type="text"
                placeholder="e.g. INSTA-99201-EG"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "رفع صوره إيصال التحويل" : "Upload Transfer Screenshot Proof"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleSimulateScreenshot}
                className="mt-1 block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-500 file:text-white hover:file:bg-orange-600"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 font-bold text-white shadow-md hover:bg-emerald-700 transition"
            >
              <Upload className="h-4 w-4" />
              {isAr
                ? "إرسال طلب الدفع لإدارة الوكالة للمراجعة"
                : "Submit Payment for Super Admin Approval"}
            </button>
          </form>
        </div>
      </div>

      {/* Pricing Plans Overview */}
      <div className="pt-4">
        <PricingPlans
          selectedPlanId={selectedPlanId}
          onSelectPlan={(planId: PlanId) => setSelectedPlanId(planId)}
        />
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white pb-3">
          {isAr ? "سجل المدفوعات وطلبات InstaPay الخاصة بك" : "Your Payment History"}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="py-2.5 px-3">{isAr ? "نوع الطلب / الباقة" : "Target / Package"}</th>
                <th className="py-2.5 px-3">{isAr ? "المبلغ" : "Amount"}</th>
                <th className="py-2.5 px-3">{isAr ? "المرجع" : "Tx Ref"}</th>
                <th className="py-2.5 px-3">{isAr ? "تاريخ التقديم" : "Submitted"}</th>
                <th className="py-2.5 px-3">{isAr ? "الحالة وكود التفعيل" : "Status & Code"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {myPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                    {isAr ? "لا توجد عمليات دفع سابقة" : "No payment logs found."}
                  </td>
                </tr>
              ) : (
                myPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-3">
                      {p.paymentType === "extra_package" ? (
                        <span className="inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          {p.extraPackageName || `+${p.extraConversationsCount || 500} محادثة إضافية`}
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-orange-600 dark:text-orange-400">
                          {isAr ? `خطة ${p.planId}` : `Plan: ${p.planId}`}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-bold text-emerald-600">{p.amountEGP} EGP</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{p.transactionRef}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{p.submittedAt}</td>
                    <td className="py-3 px-3 font-bold">
                      {p.status === "approved" ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {isAr ? "معتمد" : "Approved"} ({p.generatedCode})
                          </span>
                        </div>
                      ) : p.status === "rejected" ? (
                        <span className="text-rose-500">{isAr ? "مرفوض" : "Rejected"}</span>
                      ) : (
                        <span className="text-amber-500">{isAr ? "بانتظار الاعتماد" : "Pending Review"}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
