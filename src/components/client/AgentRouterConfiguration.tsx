import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { GitMerge, Save, Route, BookOpen, AlertCircle } from "lucide-react";

export const AgentRouterConfiguration: React.FC = () => {
  const { currentWorkspace, updateAISettings, language, addToast } = useApp();
  const isAr = language === "ar";

  if (!currentWorkspace) return null;

  const [routerPrompt, setRouterPrompt] = useState(
    currentWorkspace.aiSettings?.routerPrompt || ""
  );
  const [salesKeywords, setSalesKeywords] = useState(
    currentWorkspace.aiSettings?.salesKeywords || "سعر، شراء، حجز، بكام, price, book, buy"
  );
  const [supportKeywords, setSupportKeywords] = useState(
    currentWorkspace.aiSettings?.supportKeywords || "شكوى، مشكلة، موعد عمل، استفسار, complaint, issue, help"
  );
  const [marketingKeywords, setMarketingKeywords] = useState(
    currentWorkspace.aiSettings?.marketingKeywords || "عروض، خصم، جديد, offer, discount, new"
  );

  const handleSave = () => {
    updateAISettings(currentWorkspace.id, {
      routerPrompt,
      salesKeywords,
      supportKeywords,
      marketingKeywords,
    });
    addToast(isAr ? "تم حفظ إعدادات الموجه بنجاح" : "Router configuration saved", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <GitMerge className="h-5 w-5 text-indigo-500" />
          {isAr ? "إعدادات الموجه الذكي (Router Agent)" : "Smart Router Agent Config"}
        </h3>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Save className="h-4 w-4" />
          {isAr ? "حفظ الإعدادات" : "Save Router Config"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-sm">
          <div className="flex gap-2 items-start">
            <Route className="h-5 w-5 mt-0.5 shrink-0" />
            <p>
              {isAr 
                ? "يتحكم الموجه الذكي في تحليل رسالة العميل وتمريرها للوكيل الأنسب (مبيعات، دعم فني، أو تسويق). يمكنك تخصيص الكلمات الدلالية لكل وكيل لضمان توجيه دقيق." 
                : "The Smart Router analyzes customer messages and routes them to the appropriate agent (Sales, Support, or Marketing). You can customize the keywords for each agent to ensure accurate routing."}
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-emerald-500" />
            {isAr ? "الكلمات الدلالية للمبيعات (Sales Intent)" : "Sales Intent Keywords"}
          </label>
          <input
            type="text"
            value={salesKeywords}
            onChange={(e) => setSalesKeywords(e.target.value)}
            placeholder="مثال: سعر، شراء، حجز"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-blue-500" />
            {isAr ? "الكلمات الدلالية للدعم الفني (Support Intent)" : "Support Intent Keywords"}
          </label>
          <input
            type="text"
            value={supportKeywords}
            onChange={(e) => setSupportKeywords(e.target.value)}
            placeholder="مثال: شكوى، استفسار، مساعدة"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            {isAr ? "الكلمات الدلالية للتسويق (Marketing Intent)" : "Marketing Intent Keywords"}
          </label>
          <input
            type="text"
            value={marketingKeywords}
            onChange={(e) => setMarketingKeywords(e.target.value)}
            placeholder="مثال: خصم، عروض، جديد"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
            <Route className="h-4 w-4 text-purple-500" />
            {isAr ? "تعليمات إضافية للموجه (اختياري)" : "Custom Router Prompt (Optional)"}
          </label>
          <textarea
            value={routerPrompt}
            onChange={(e) => setRouterPrompt(e.target.value)}
            placeholder={isAr ? "أضف شروط توجيه خاصة كأولوية للموجه..." : "Add specific routing conditions or priorities..."}
            className="w-full h-24 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
};
