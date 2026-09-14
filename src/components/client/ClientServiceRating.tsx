import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Star, MessageSquare, Award, ThumbsUp, Plus, Filter, Heart, CheckCircle2 } from "lucide-react";

export const ClientServiceRating: React.FC = () => {
  const { currentWorkspace, serviceRatings, addServiceRating, updateAISettings, language } = useApp();
  const isAr = language === "ar";

  const [showSimModal, setShowSimModal] = useState(false);
  const [simRating, setSimRating] = useState(5);
  const [simCustomer, setSimCustomer] = useState("");
  const [simFeedback, setSimFeedback] = useState("");
  const [simChannel, setSimChannel] = useState<"whatsapp" | "telegram" | "web">("whatsapp");

  if (!currentWorkspace) return null;

  const isServiceRatingEnabled = currentWorkspace.aiSettings?.enableServiceRating ?? true;

  const workspaceRatings = serviceRatings.filter((r) => r.workspaceId === currentWorkspace.id);

  const avgRating = workspaceRatings.length > 0
    ? (workspaceRatings.reduce((sum, r) => sum + r.rating, 0) / workspaceRatings.length).toFixed(1)
    : "5.0";

  const handleAddSimRating = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simCustomer.trim() || !simFeedback.trim()) return;

    addServiceRating({
      workspaceId: currentWorkspace.id,
      customerName: simCustomer,
      channel: simChannel,
      rating: simRating,
      feedback: simFeedback,
      createdAt: new Date().toLocaleString("ar-EG")
    });

    setSimCustomer("");
    setSimFeedback("");
    setShowSimModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            <span>{isAr ? "سجل تقييمات وتجارب الخدمة (Service Ratings & Reviews)" : "Service Ratings & Customer Reviews"}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "متابعة وتقييم مستوى رضا العملاء عن خدمات البوت والمتاجر والعيادات والصيدليات فور انتهاء المحادثة"
              : "Track customer satisfaction ratings and feedback across all communication channels"}
          </p>
        </div>

        <button
          onClick={() => setShowSimModal(!showSimModal)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-extrabold text-xs hover:bg-amber-600 transition shadow-md shadow-amber-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>{isAr ? "محاكاة تسجيل تقييم جديد" : "Simulate Customer Rating"}</span>
        </button>
      </div>

      {/* Control Toggle Banner */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isServiceRatingEnabled
          ? "bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-900/50"
          : "bg-slate-100 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl font-bold text-white ${isServiceRatingEnabled ? "bg-amber-500" : "bg-slate-400"}`}>
            <Star className="h-5 w-5 fill-white text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? "خدمة طلب تقييم الخدمة من العملاء (1-5 نجوم)" : "Customer Service Rating Prompt"}</span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                isServiceRatingEnabled ? "bg-amber-500 text-white" : "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}>
                {isServiceRatingEnabled ? (isAr ? "مفعّلة بالمنشأة" : "Enabled") : (isAr ? "معطّلة بالمنشأة" : "Disabled")}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? "عند التفعيل، سيطلب البوت الذكي تلقائياً من العميل تقييم الخدمة في نهاية المحادثة لمتابعة الأداء وإبداء الرأي."
                : "When enabled, the AI agent prompts customers to rate service from 1-5 stars at the end of interactions."}
            </p>
          </div>
        </div>

        <button
          onClick={() => updateAISettings(currentWorkspace.id, { enableServiceRating: !isServiceRatingEnabled })}
          className={`px-5 py-2 rounded-xl text-xs font-extrabold transition shadow-sm ${
            isServiceRatingEnabled
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
              : "bg-amber-500 text-white hover:bg-amber-600"
          }`}
        >
          {isServiceRatingEnabled ? (isAr ? "تعطيل طلب التقييمات" : "Disable Rating Prompt") : (isAr ? "تفعيل طلب التقييمات" : "Enable Rating Prompt")}
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{isAr ? "متوسط التقييم العام" : "Average Rating"}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{avgRating}</span>
              <span className="text-xs text-amber-600 font-bold">/ 5.0</span>
            </div>
          </div>
          <div className="flex text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">{isAr ? "إجمالي التقييمات المسجلة" : "Total Ratings"}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{workspaceRatings.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <MessageSquare className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{isAr ? "نسبة الرضا العالية (4-5 نجوم)" : "High Satisfaction Rate"}</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {workspaceRatings.length > 0
                ? `${Math.round((workspaceRatings.filter((r) => r.rating >= 4).length / workspaceRatings.length) * 100)}%`
                : "100%"}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500 text-white">
            <ThumbsUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Simulate Rating Modal / Card */}
      {showSimModal && (
        <form onSubmit={handleAddSimRating} className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/30 space-y-4">
          <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span>{isAr ? "محاكاة تقييم عميل جديد (تجربة التفعيل)" : "Simulate Customer Feedback Rating"}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "اسم العميل" : "Customer Name"}</label>
              <input
                type="text"
                required
                value={simCustomer}
                onChange={(e) => setSimCustomer(e.target.value)}
                placeholder={isAr ? "مثال: عبد الله أحمد" : "e.g. John Doe"}
                className="w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "القناة" : "Channel"}</label>
              <select
                value={simChannel}
                onChange={(e) => setSimChannel(e.target.value as any)}
                className="w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-amber-500"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="web">Web Chat</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "التقييم بالنجوم (1 إلى 5)" : "Rating (1 to 5)"}</label>
              <div className="flex items-center gap-1 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSimRating(star)}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= simRating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "تعليق ورأي العميل:" : "Feedback Comment:"}</label>
            <input
              type="text"
              required
              value={simFeedback}
              onChange={(e) => setSimFeedback(e.target.value)}
              placeholder={isAr ? "مثال: رد البوت كان ممتاز واقترح لي الدواء البديل بسرعة كبيرة" : "Feedback..."}
              className="w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSimModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition shadow-sm"
            >
              {isAr ? "حفظ التقييم" : "Save Rating"}
            </button>
          </div>
        </form>
      )}

      {/* Ratings Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-500" />
          <span>{isAr ? "الآراء والتقييمات المسجلة حديثاً:" : "Recent Customer Ratings & Feedback:"}</span>
        </h3>

        {workspaceRatings.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500">{isAr ? "لا توجد تقييمات مسجلة بعد لهذه المنشأة" : "No ratings logged yet"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaceRatings.map((rating) => (
              <div
                key={rating.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-600 font-black flex items-center justify-center text-xs">
                      {rating.customerName[0] || "U"}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white">{rating.customerName}</p>
                      <p className="text-[10px] text-slate-400">{rating.createdAt} • <span className="uppercase">{rating.channel}</span></p>
                    </div>
                  </div>

                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= rating.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 pt-1 italic">
                  "{rating.feedback}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
