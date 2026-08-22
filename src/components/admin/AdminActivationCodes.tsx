import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { PlanId } from "../../types";
import { Key, Plus, Copy, Trash2, Check, Sparkles, Zap, ShieldCheck } from "lucide-react";

export const AdminActivationCodes: React.FC = () => {
  const { activationCodes, generateActivationCode, revokeActivationCode, addToast, language } = useApp();
  const isAr = language === "ar";

  const [codeType, setCodeType] = useState<"plan" | "extra_package">("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("business");
  const [extraConvs, setExtraConvs] = useState<number>(1000);
  const [duration, setDuration] = useState(30);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleGenerate = () => {
    generateActivationCode(selectedPlan, duration, codeType, extraConvs);
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    addToast(isAr ? "تم نسخ الكود للحافظة!" : "Code copied to clipboard!", "info");
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            {isAr ? "مولد أكواد التفعيل الأحادية (Single-Use Codes)" : "Single-Use Activation Codes Generator"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? "الأكواد التي تنشئها هنا يمكن للعميل استخدامها لتفعيل اشتراكه أثناء التسجيل أو من لوحة التحكم."
              : "Codes generated here can be redeemed by clients during registration or in their Subscription panel."}
          </p>
        </div>
      </div>

      {/* Generator Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          {isAr ? "إنشاء كود تفعيل اشتراك أو باقة إضافية" : "Generate Subscription or Extra Package Activation Code"}
        </h3>

        {/* Type Selector */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setCodeType("plan")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              codeType === "plan"
                ? "bg-orange-500 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {isAr ? "كود باقة اشتراك رئيسية" : "Main Subscription Plan"}
          </button>
          <button
            type="button"
            onClick={() => setCodeType("extra_package")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              codeType === "extra_package"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {isAr ? "كود باقة محادثات إضافية ⚡" : "Extra Package Code ⚡"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {codeType === "plan" ? (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "اختر باقة الاشتراك" : "Select Subscription Plan"}
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as PlanId)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="starter">{isAr ? "Fox Starter (تجريبي مجاناً)" : "Fox Starter (Free Trial)"}</option>
                <option value="business">{isAr ? "Fox Business (1000 ج.م / شهر)" : "Fox Business (1000 EGP / Mo)"}</option>
                <option value="enterprise">{isAr ? "Fox Enterprise (2000 ج.م / شهر)" : "Fox Enterprise (2000 EGP / Mo)"}</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? "عدد المحادثات الإضافية" : "Extra Conversations"}
              </label>
              <select
                value={extraConvs}
                onChange={(e) => setExtraConvs(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value={500}>+500 محادثة إضافية</option>
                <option value={1000}>+1000 محادثة إضافية</option>
                <option value={2500}>+2500 محادثة إضافية</option>
                <option value={5000}>+5000 محادثة إضافية</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? "مدة الصلاحية (بالأيام)" : "Duration (Days)"}
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            >
              <option value={7}>{isAr ? "7 أيام (تجريبي)" : "7 Days (Trial)"}</option>
              <option value={30}>{isAr ? "30 يوماً (شهر واحد)" : "30 Days (1 Month)"}</option>
              <option value={90}>{isAr ? "90 يوماً (3 أشهر)" : "90 Days (3 Months)"}</option>
              <option value={365}>{isAr ? "365 يوماً (سنة كاملة)" : "365 Days (1 Year)"}</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition ${
                codeType === "extra_package"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
              }`}
            >
              <Plus className="h-4 w-4" />
              {isAr ? "إنشاء الكود وإضافته" : "Generate Unique Code"}
            </button>
          </div>
        </div>
      </div>

      {/* Activation Codes Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white pb-4">
          {isAr ? `جميع أكواد التفعيل المنيشأة (${activationCodes.length})` : `All Generated Activation Codes (${activationCodes.length})`}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="py-3 px-4">{isAr ? "كود التفعيل" : "Activation Code"}</th>
                <th className="py-3 px-4">{isAr ? "الباقة" : "Plan Target"}</th>
                <th className="py-3 px-4">{isAr ? "المدة" : "Duration"}</th>
                <th className="py-3 px-4">{isAr ? "الحالة" : "Status"}</th>
                <th className="py-3 px-4">{isAr ? "استُخدم بواسطة" : "Redeemed By"}</th>
                <th className="py-3 px-4 text-right">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activationCodes.map((code) => (
                <tr key={code.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">
                    <div className="flex items-center gap-2">
                      <span>{code.code}</span>
                      <button
                        onClick={() => copyToClipboard(code.code, code.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        title={isAr ? "نسخ الكود" : "Copy Code"}
                      >
                        {copiedCodeId === code.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {code.codeType === "extra_package" ? (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        ⚡ +{code.extraConversationsCount || 500} محادثة
                      </span>
                    ) : (
                      <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-orange-600 dark:text-orange-400">
                        {code.planId}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    {code.durationDays} {isAr ? "يوم" : "Days"}
                  </td>

                  <td className="py-3.5 px-4">
                    {code.isUsed ? (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {isAr ? "تم استخدامه" : "Redeemed"}
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {isAr ? "جاهز للاستخدام مرة واحدة" : "Active & Single Use"}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {code.usedByWorkspaceName || "—"}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => revokeActivationCode(code.id)}
                      className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600 hover:bg-rose-500 hover:text-white transition"
                      title={isAr ? "إلغاء الكود" : "Revoke Code"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
