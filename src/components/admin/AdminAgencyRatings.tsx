import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Star, MessageSquare, Award, ThumbsUp, Plus, Filter, Heart, CheckCircle2, Bot, Sparkles, Trash2, ShieldCheck, Zap } from "lucide-react";

export const AdminAgencyRatings: React.FC = () => {
  const { serviceRatings, addServiceRating, language } = useApp();
  const isAr = language === "ar";

  // Persistent state for Agency Bot Rating setting
  const [isAgencyRatingEnabled, setIsAgencyRatingEnabled] = useState(() => {
    const saved = localStorage.getItem("fox_agency_rating_enabled");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleAgencyRating = () => {
    const nextVal = !isAgencyRatingEnabled;
    setIsAgencyRatingEnabled(nextVal);
    localStorage.setItem("fox_agency_rating_enabled", JSON.stringify(nextVal));
  };

  const [showSimModal, setShowSimModal] = useState(false);
  const [filterStar, setFilterStar] = useState<number | "all">("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [simName, setSimName] = useState("");
  const [simPhone, setSimPhone] = useState("");
  const [simChannel, setSimChannel] = useState<"telegram" | "whatsapp" | "web">("telegram");
  const [simRating, setSimRating] = useState<number>(5);
  const [simFeedback, setSimFeedback] = useState("");

  // Filter ratings that belong to Agency or general agency client feedback
  const agencyRatings = serviceRatings.filter(
    (r) => r.workspaceId === "ws_agency" || r.workspaceId === "agency_main" || !r.workspaceId
  );

  const avgRating = agencyRatings.length > 0
    ? (agencyRatings.reduce((acc, curr) => acc + curr.rating, 0) / agencyRatings.length).toFixed(1)
    : "5.0";

  const positiveRatingsCount = agencyRatings.filter((r) => r.rating >= 4).length;
  const satisfactionRate = agencyRatings.length > 0
    ? Math.round((positiveRatingsCount / agencyRatings.length) * 100)
    : 100;

  const filteredRatings = agencyRatings.filter((r) => {
    if (filterStar !== "all" && r.rating !== filterStar) return false;
    if (filterChannel !== "all" && r.channel !== filterChannel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.customerName?.toLowerCase().includes(q);
      const matchPhone = r.customerPhone?.toLowerCase().includes(q);
      const matchText = r.feedback?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchText) return false;
    }
    return true;
  });

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim() || !simFeedback.trim()) return;

    addServiceRating({
      workspaceId: "ws_agency",
      customerName: simName.trim(),
      customerPhone: simPhone.trim() || "+20 100 000 0000",
      channel: simChannel,
      rating: simRating,
      feedback: simFeedback.trim(),
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    });

    setSimName("");
    setSimPhone("");
    setSimFeedback("");
    setSimRating(5);
    setShowSimModal(false);
  };

  return (
    <div className={`space-y-6 animate-fade-in ${isAr ? "dir-rtl" : "dir-ltr"}`}>
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2.5">
            <Award className="h-7 w-7 text-amber-500" />
            <span>{isAr ? "تقييمات خدمة بوت الوكالة الرئيسي (Agency Bot Ratings)" : "Agency Main Bot Service Ratings"}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "متابعة وإدارة آراء وتقييمات المشتركين والعملاء الموجهة لبوت الوكالة الرئيسي والتحكم في ظهور طلب التقييم."
              : "Monitor client feedback and ratings for the main FOX AI Agency Bot with full configuration controls."}
          </p>
        </div>

        <button
          onClick={() => setShowSimModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-black text-white hover:opacity-90 transition shadow-lg shadow-amber-500/20 active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          <span>{isAr ? "محاكاة تقييم جديد للوكالة" : "Simulate Agency Rating"}</span>
        </button>
      </div>

      {/* Control Toggle Banner for Agency Main Bot */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isAgencyRatingEnabled
          ? "bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-900/50"
          : "bg-slate-100 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl font-bold text-white ${isAgencyRatingEnabled ? "bg-amber-500 shadow-md shadow-amber-500/30" : "bg-slate-400"}`}>
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? "طلب تقييم الخدمة في بوت الوكالة الرئيسي (1-5 نجوم)" : "Main Agency Bot Service Rating Prompt"}</span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                isAgencyRatingEnabled ? "bg-amber-500 text-white" : "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}>
                {isAgencyRatingEnabled ? (isAr ? "مفعّلة بالوكالة 🟢" : "Enabled 🟢") : (isAr ? "معطّلة بالوكالة 🔴" : "Disabled 🔴")}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? "عند التفعيل، سيطلب بوت FOX AI AGENCY الذكي تلقائياً من العملاء والمشتركين تقييم الخدمة وإبداء رأيهم في نهاية المحادثة."
                : "When enabled, the main FOX AI Agency Bot prompts users to rate their experience at the end of conversations."}
            </p>
          </div>
        </div>

        <button
          onClick={toggleAgencyRating}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition shadow-sm active:scale-95 shrink-0 ${
            isAgencyRatingEnabled
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
              : "bg-amber-500 text-white hover:bg-amber-600"
          }`}
        >
          {isAgencyRatingEnabled ? (isAr ? "تعطيل طلب التقييمات" : "Disable Rating Prompt") : (isAr ? "تفعيل طلب التقييمات" : "Enable Rating Prompt")}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{isAr ? "متوسط تقييم الوكالة" : "Average Agency Rating"}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{avgRating}</span>
              <span className="text-xs text-amber-600 font-bold">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3.5 w-3.5 ${
                    s <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
            <Star className="h-6 w-6 fill-white" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-blue-200/80 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-800 dark:text-blue-300">{isAr ? "إجمالي آراء وتقييمات الوكالة" : "Total Agency Reviews"}</p>
            <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">{agencyRatings.length}</span>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
              {isAr ? "تقييمات موثقة عبر تليجرام وواتساب" : "Verified via Telegram & WhatsApp"}
            </p>
          </div>
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-600/20">
            <MessageSquare className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{isAr ? "نسبة رضا عملاء الوكالة" : "Client Satisfaction Rate"}</p>
            <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">{satisfactionRate}%</span>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              <span>{isAr ? "تقييم 4 نجوم أو أكثر" : "4+ Stars Rating"}</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
            <Heart className="h-6 w-6 fill-white" />
          </div>
        </div>
      </div>

      {/* Filters and Ratings List */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Filter className="h-4 w-4 text-amber-500" />
            <span>{isAr ? "سجل تقييمات وتغذية آراء العملاء" : "Agency Reviews Directory"}</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={isAr ? "بحث باسم العميل أو التعليق..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs outline-none focus:border-amber-500 min-w-[160px]"
            />

            <select
              value={filterStar}
              onChange={(e) => setFilterStar(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs outline-none focus:border-amber-500"
            >
              <option value="all">{isAr ? "جميع النجوم" : "All Stars"}</option>
              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
              <option value="4">⭐⭐⭐⭐ (4)</option>
              <option value="3">⭐⭐⭐ (3)</option>
            </select>

            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs outline-none focus:border-amber-500"
            >
              <option value="all">{isAr ? "جميع القنوات" : "All Channels"}</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Web</option>
            </select>
          </div>
        </div>

        {/* List of Reviews */}
        <div className="space-y-3">
          {filteredRatings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {isAr ? "لا توجد تقييمات مسجلة لبوت الوكالة وفقاً للترشيح الحالي" : "No agency ratings match the filter criteria."}
            </div>
          ) : (
            filteredRatings.map((rating) => (
              <div
                key={rating.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-amber-300 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {rating.customerName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase">
                      {rating.channel}
                    </span>
                    <span className="text-[10px] text-slate-400">{rating.createdAt}</span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= rating.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                      ({rating.rating}/5)
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    "{rating.feedback}"
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg shrink-0 border border-emerald-200/50 dark:border-emerald-900/50">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isAr ? "مُوثق لبوت الوكالة" : "Verified Agency Review"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Simulation */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>{isAr ? "إضافة تقييم تجريبي لبوت الوكالة" : "Simulate Agency Rating"}</span>
              </h3>
              <button
                onClick={() => setShowSimModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                  {isAr ? "اسم العميل / المشترك" : "Client / Subscriber Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? "مثال: م. أحمد سامي (شركة المدى)" : "e.g. Ahmed Sami"}
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                  {isAr ? "رقم الهاتف / وسيلة التواصل" : "Phone / Contact"}
                </label>
                <input
                  type="text"
                  placeholder="+20 100 000 0000"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    {isAr ? "قناة التواصل" : "Channel"}
                  </label>
                  <select
                    value={simChannel}
                    onChange={(e) => setSimChannel(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 outline-none focus:border-amber-500"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="web">Web</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    {isAr ? "التقييم بالنجوم" : "Rating Stars"}
                  </label>
                  <select
                    value={simRating}
                    onChange={(e) => setSimRating(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                    <option value="4">⭐⭐⭐⭐ (4)</option>
                    <option value="3">⭐⭐⭐ (3)</option>
                    <option value="2">⭐⭐ (2)</option>
                    <option value="1">⭐ (1)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                  {isAr ? "ملاحظات وتغذية الرأي (Feedback)" : "Feedback Text"}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={isAr ? "اكتب تفاصيل تجربة العميل مع بوت الوكالة..." : "Feedback details..."}
                  value={simFeedback}
                  onChange={(e) => setSimFeedback(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 shadow-md transition"
                >
                  {isAr ? "حفظ التقييم" : "Save Rating"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
