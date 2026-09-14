import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { SubscriptionPlan, PlanId } from "../../types";
import {
  Check,
  Zap,
  Sparkles,
  Bot,
  Edit3,
  Plus,
  Trash2,
  Save,
  X,
  RotateCcw,
  Send,
  MessageSquare,
  ShieldCheck,
  Cloud,
} from "lucide-react";

export const AdminPlansManager: React.FC = () => {
  const { plans, updatePlan, resetPlansToDefault, language } = useApp();
  const isAr = language === "ar";

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editName, setEditName] = useState("");
  const [editPriceEGP, setEditPriceEGP] = useState<number>(0);
  const [editDuration, setEditDuration] = useState("");
  const [editAiLimit, setEditAiLimit] = useState<number>(1000);
  const [editBadge, setEditBadge] = useState("");
  const [editChannels, setEditChannels] = useState<("telegram" | "whatsapp")[]>([]);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditPriceEGP(plan.priceEGP);
    setEditDuration(plan.duration);
    setEditAiLimit(plan.aiConversationLimit);
    setEditBadge(plan.badge || "");
    setEditChannels(plan.channels || []);
    setEditFeatures([...plan.features]);
    setNewFeatureText("");
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setEditFeatures((prev) => [...prev, newFeatureText.trim()]);
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index: number) => {
    setEditFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFeatureText = (index: number, val: string) => {
    setEditFeatures((prev) => prev.map((f, i) => (i === index ? val : f)));
  };

  const handleChannelToggle = (channel: "telegram" | "whatsapp") => {
    setEditChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setIsSaving(true);
    try {
      await updatePlan(editingPlan.id, {
        name: editName,
        priceEGP: Number(editPriceEGP) || 0,
        duration: editDuration,
        aiConversationLimit: Number(editAiLimit),
        badge: editBadge,
        channels: editChannels,
        features: editFeatures.filter((f) => f.trim().length > 0),
      });
      setEditingPlan(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5" /> Firestore Dynamic Management
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl tracking-tight">
            {isAr ? "إدارة باقات الاشتراكات ومميزاتها (EGP)" : "SaaS Subscription Plans & Pricing (EGP)"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
            {isAr
              ? "يمكنك تعديل أسعار الباقات بالجنيه المصري، الحدود، وقنوات التواصل المتاحة، وحفظ التغييرات مباشرة في قاعدة بيانات Firestore لتنعكس فورياً للعملاء."
              : "Manage plan prices in EGP, feature checklists, and channel capabilities. Changes persist directly to Firestore in real-time."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => resetPlansToDefault()}
            className="flex items-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-3 text-xs font-bold transition border border-slate-700 shadow-sm"
          >
            <RotateCcw className="h-4 w-4 text-orange-400" />
            <span>{isAr ? "استعادة الباقات الافتراضية" : "Reset Default Plans"}</span>
          </button>
        </div>
      </div>

      {/* Plans Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-3xl border p-6 sm:p-7 transition-all duration-300 ${
              plan.id === "business"
                ? "border-orange-500 bg-slate-900 text-white shadow-2xl shadow-orange-500/10"
                : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3.5 right-6 rounded-full bg-orange-500 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                {plan.badge}
              </span>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 font-black">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{plan.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400">ID: {plan.id}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(plan)}
                  className="flex items-center gap-1.5 text-xs font-extrabold text-orange-500 hover:bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/30 transition"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{isAr ? "تعديل الخطة" : "Edit Plan"}</span>
                </button>
              </div>

              {/* Price & Duration */}
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-black">
                  {plan.priceEGP === 0
                    ? isAr
                      ? "مجاناً"
                      : "Free"
                    : `${plan.priceEGP.toLocaleString()}`}
                </span>
                <span className="text-xs font-bold text-orange-500">
                  {plan.priceEGP > 0 ? "EGP ج.م" : ""}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {plan.duration}
                </span>
              </div>

              {/* AI limit */}
              <div className="mt-2 text-xs font-bold text-slate-400">
                {plan.aiConversationLimit === -1
                  ? isAr
                    ? "⚡ محادثات ذكاء اصطناعي غير محدودة"
                    : "⚡ Unlimited AI Conversations"
                  : isAr
                  ? `💬 ${plan.aiConversationLimit.toLocaleString()} محادثة شهرياً`
                  : `💬 ${plan.aiConversationLimit.toLocaleString()} conversations/mo`}
              </div>

              {/* Channels */}
              <div className="mt-3 flex items-center gap-1.5">
                {plan.channels?.includes("telegram") && (
                  <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-500 dark:text-sky-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-sky-500/20">
                    <Send className="h-3 w-3" /> Telegram
                  </span>
                )}
                {plan.channels?.includes("whatsapp") && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-500/20">
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </span>
                )}
              </div>

              {/* Features checklist */}
              <div className="mt-5 space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {isAr ? `المميزات المضمنة (${plan.features.length}):` : `Included Features (${plan.features.length}):`}
                </p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-medium leading-relaxed">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => handleOpenEdit(plan)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs transition"
              >
                {isAr ? "إدارة المميزات والأسعار" : "Manage Pricing & Features"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <button
              onClick={() => setEditingPlan(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 font-black">
                <Edit3 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {isAr ? `تعديل باقة: ${editingPlan.name}` : `Edit Plan: ${editingPlan.name}`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? "قم بتحديث السعر بالجنيه المصري والمميزات المتاحة وحفظها فورياً في Firestore"
                    : "Update plan pricing in EGP, features checklist, and sync live to Firestore"}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Name & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "اسم الباقة:" : "Plan Name:"}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "الشارة الترويجية (Badge):" : "Badge Text:"}
                  </label>
                  <input
                    type="text"
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    placeholder={isAr ? "مثال: الأكثر طلباً ⭐" : "e.g., Most Popular"}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Price EGP & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "السعر (EGP):" : "Price in EGP:"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editPriceEGP}
                      onChange={(e) => setEditPriceEGP(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-black text-slate-900 dark:text-white focus:border-orange-500 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-black text-orange-500">
                      ج.م
                    </span>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "مدة الاشتراك:" : "Duration Label:"}
                  </label>
                  <input
                    type="text"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? "حد محادثات الذكاء الاصطناعي:" : "AI Conversation Limit:"}
                  </label>
                  <input
                    type="number"
                    value={editAiLimit}
                    onChange={(e) => setEditAiLimit(Number(e.target.value))}
                    placeholder="-1 = غير محدود"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:border-orange-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isAr ? "اكتب (-1) للحدود المفتوحة" : "Type -1 for Unlimited"}
                  </span>
                </div>
              </div>

              {/* Channels checkboxes */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "قنوات التواصل المسموحة:" : "Allowed Channels:"}
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-extrabold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editChannels.includes("telegram")}
                      onChange={() => handleChannelToggle("telegram")}
                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                    <Send className="h-3.5 w-3.5 text-sky-500" /> Telegram
                  </label>

                  <label className="flex items-center gap-2 text-xs font-extrabold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editChannels.includes("whatsapp")}
                      onChange={() => handleChannelToggle("whatsapp")}
                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp
                  </label>
                </div>
              </div>

              {/* Features List Manager */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    {isAr ? "قائمة مميزات الباقة (Features Checklist):" : "Plan Features Checklist:"}
                  </label>
                  <span className="text-[11px] text-slate-400 font-bold">
                    {editFeatures.length} {isAr ? "ميزة" : "features"}
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleUpdateFeatureText(idx, e.target.value)}
                        className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-orange-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new feature input */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
                    placeholder={isAr ? "إضافة ميزة جديدة للباقة..." : "Add a new plan feature..."}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-orange-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 text-xs font-black transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{isAr ? "إضافة" : "Add"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات في Firestore" : "Save to Firestore")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
