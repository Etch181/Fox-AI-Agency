import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  Tag,
  Plus,
  Trash2,
  Zap,
  Percent,
  Banknote,
  CalendarDays,
  Users,
  Activity,
  Clock3,
} from "lucide-react";

export const ClientPromotions: React.FC = () => {
  const { currentWorkspace, coupons, addCoupon, deleteCoupon, toggleCouponAI, language } = useApp();
  const isAr = language === "ar";
  
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    condition: "",
    aiCanUse: true,
    usageLimit: "",
    validFrom: "",
    validUntil: "",
  });

  const handleAdd = () => {
    if (
      !currentWorkspace ||
      !form.code.trim() ||
      !form.discountValue ||
      !form.condition.trim()
    ) {
      return;
    }

    const discountValue = Number(form.discountValue);
    const usageLimit = Number(form.usageLimit || 0);

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0
    ) {
      return;
    }

    if (
      form.discountType === "percentage" &&
      discountValue > 100
    ) {
      return;
    }

    if (
      form.validFrom &&
      form.validUntil &&
      form.validUntil < form.validFrom
    ) {
      return;
    }

    addCoupon({
      workspaceId: currentWorkspace.id,
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue,
      condition: form.condition.trim(),
      isActive: true,
      aiCanUse: form.aiCanUse,
      usageCount: 0,
      usageLimit:
        Number.isFinite(usageLimit) && usageLimit > 0
          ? Math.floor(usageLimit)
          : 0,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || undefined,
    });

    setForm({
      code: "",
      discountType: "percentage",
      discountValue: "",
      condition: "",
      aiCanUse: true,
      usageLimit: "",
      validFrom: "",
      validUntil: "",
    });

    setShowAdd(false);
  };

  const getCouponState = (coupon: any) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const usageCount = Number(coupon.usageCount || 0);
    const usageLimit = Number(coupon.usageLimit || 0);

    if (!coupon.isActive) {
      return {
        label: isAr ? "غير نشط" : "Inactive",
        className:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      };
    }

    if (
      coupon.validFrom &&
      today < String(coupon.validFrom).slice(0, 10)
    ) {
      return {
        label: isAr ? "لم يبدأ بعد" : "Scheduled",
        className:
          "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
      };
    }

    if (
      coupon.validUntil &&
      today > String(coupon.validUntil).slice(0, 10)
    ) {
      return {
        label: isAr ? "منتهي" : "Expired",
        className:
          "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
      };
    }

    if (
      usageLimit > 0 &&
      usageCount >= usageLimit
    ) {
      return {
        label: isAr ? "اكتمل الاستخدام" : "Limit Reached",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      };
    }

    return {
      label: isAr ? "نشط" : "Active",
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  };

  const formatCouponDate = (value?: string) => {
    if (!value) {
      return isAr ? "غير محدد" : "Not set";
    }

    const date = new Date(
      String(value).length === 10
        ? `${value}T00:00:00`
        : value
    );

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      isAr ? "ar-EG" : "en-GB",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="h-6 w-6 text-indigo-500" />
            {isAr ? "إدارة العروض والكوبونات" : "Promotions & Coupons"}
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? "أنشئ عروضاً خاصة وحدد ما إذا كان بإمكان الذكاء الاصطناعي استخدامها لإقناع العملاء المترددين." : "Create special offers and choose if the AI can use them to close deals with hesitant customers."}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {isAr ? "إضافة عرض جديد" : "Add Promotion"}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <h3 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-200 mb-4">
            {isAr ? "إنشاء كوبون جديد" : "Create New Coupon"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">{isAr ? "كود الخصم" : "Coupon Code"}</label>
              <input 
                type="text" 
                value={form.code}
                onChange={(e) => setForm({...form, code: e.target.value})}
                placeholder={isAr ? "مثال: LASER20" : "e.g. SUMMER20"}
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">{isAr ? "نوع الخصم" : "Discount Type"}</label>
              <select 
                value={form.discountType}
                onChange={(e) => setForm({...form, discountType: e.target.value as any})}
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              >
                <option value="percentage">{isAr ? "نسبة مئوية (%)" : "Percentage (%)"}</option>
                <option value="fixed">{isAr ? "مبلغ ثابت" : "Fixed Amount"}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">{isAr ? "القيمة" : "Value"}</label>
              <input 
                type="number" 
                value={form.discountValue}
                onChange={(e) => setForm({...form, discountValue: e.target.value})}
                placeholder="20"
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">{isAr ? "شروط الاستخدام" : "Conditions"}</label>
              <input 
                type="text" 
                value={form.condition}
                onChange={(e) => setForm({...form, condition: e.target.value})}
                placeholder={isAr ? "مثال: خصم على جلسات الليزر" : "e.g. On all laser sessions"}
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">
                {isAr ? "الحد الأقصى للاستخدام" : "Usage Limit"}
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    usageLimit: e.target.value,
                  })
                }
                placeholder={
                  isAr
                    ? "0 = غير محدود"
                    : "0 = Unlimited"
                }
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />

              <p className="mt-1 text-[10px] font-medium text-slate-400">
                {isAr
                  ? "اتركه 0 أو فارغًا للسماح بعدد غير محدود."
                  : "Leave 0 or empty for unlimited usage."}
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">
                {isAr ? "يبدأ من" : "Valid From"}
              </label>

              <input
                type="date"
                value={form.validFrom}
                onChange={(e) =>
                  setForm({
                    ...form,
                    validFrom: e.target.value,
                  })
                }
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">
                {isAr ? "ينتهي في" : "Valid Until"}
              </label>

              <input
                type="date"
                value={form.validUntil}
                min={form.validFrom || undefined}
                onChange={(e) =>
                  setForm({
                    ...form,
                    validUntil: e.target.value,
                  })
                }
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-indigo-200 dark:border-indigo-900/40 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.aiCanUse}
                onChange={(e) => setForm({...form, aiCanUse: e.target.checked})}
                className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
              />
              <div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  {isAr ? "السماح للذكاء الاصطناعي باستخدامه" : "Allow AI to use this coupon"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? "سيقوم الوكيل بعرض هذا الخصم فقط للعملاء المترددين لإتمام الحجز." : "AI will selectively offer this to hesitant customers to close the deal."}
                </div>
              </div>
            </label>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowAdd(false)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-300 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 transition"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button 
                onClick={handleAdd}
                className="flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
              >
                {isAr ? "حفظ وتفعيل" : "Save & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {coupons.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/30">
            <Tag className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{isAr ? "لا توجد عروض نشطة" : "No active promotions"}</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">{isAr ? "قم بإنشاء كوبون خصم لمساعدة الذكاء الاصطناعي في زيادة مبيعاتك" : "Create a coupon to help the AI increase your sales"}</p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl"></div>
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                    {coupon.discountType === 'percentage' ? <Percent className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                  </div>
                  <div>
                    <span className="block text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${coupon.discountValue} EGP`}
                    </span>
                    {(() => {
                      const state = getCouponState(coupon);

                      return (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${state.className}`}
                        >
                          {state.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <button 
                  onClick={() => deleteCoupon(coupon.id)}
                  className="text-slate-400 hover:text-rose-500 transition p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? "كود الخصم" : "Code"}</div>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">{coupon.code}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 mb-0.5">
                    {isAr ? "شروط الاستخدام" : "Conditions"}
                  </div>

                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {coupon.condition}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      {isAr ? "الاستخدام" : "Usage"}
                    </div>

                    <div className="text-sm font-black text-slate-800 dark:text-white">
                      {Number(coupon.usageCount || 0)}
                      {" / "}
                      {Number(coupon.usageLimit || 0) > 0
                        ? Number(coupon.usageLimit)
                        : isAr
                          ? "∞"
                          : "∞"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Activity className="h-3.5 w-3.5" />
                      {isAr ? "آخر استخدام" : "Last Used"}
                    </div>

                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {coupon.lastUsedAt
                        ? formatCouponDate(coupon.lastUsedAt)
                        : isAr
                          ? "لم يُستخدم"
                          : "Never"}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="mb-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {isAr ? "فترة الصلاحية" : "Validity"}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {isAr ? "من" : "From"}
                      </div>
                      <div className="mt-0.5 font-bold text-slate-700 dark:text-slate-300">
                        {formatCouponDate(coupon.validFrom)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {isAr ? "إلى" : "Until"}
                      </div>
                      <div className="mt-0.5 font-bold text-slate-700 dark:text-slate-300">
                        {formatCouponDate(coupon.validUntil)}
                      </div>
                    </div>
                  </div>
                </div>

                {Number(coupon.usageLimit || 0) > 0 && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>
                        {isAr ? "نسبة الاستهلاك" : "Redemption Progress"}
                      </span>

                      <span>
                        {Math.min(
                          100,
                          Math.round(
                            (Number(coupon.usageCount || 0) /
                              Number(coupon.usageLimit || 1)) *
                              100
                          )
                        )}
                        %
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (Number(coupon.usageCount || 0) /
                              Number(coupon.usageLimit || 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className={`h-4 w-4 ${coupon.aiCanUse ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${coupon.aiCanUse ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>
                      {isAr ? "صلاحية الذكاء الاصطناعي" : "AI Authorization"}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleCouponAI(coupon.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${coupon.aiCanUse ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    role="switch"
                    aria-checked={coupon.aiCanUse}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${coupon.aiCanUse ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
