import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Sparkles, TrendingUp, AlertCircle, ShoppingCart } from "lucide-react";
import { INITIAL_PLANS as plans } from "../../data/mockData";

export const PackageRecommendation: React.FC = () => {
  const { currentWorkspace, language } = useApp();
  
  const isAr = language === "ar";
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (!currentWorkspace) return null;

  const creditBalance = currentWorkspace.creditBalance ?? 0;
  const aiConversationsUsed = currentWorkspace.aiConversationsUsed || 0;
  
  // Calculate burn rate or recommend based on consumption
  let recommendation = "";
  let recPlan = null;
  let urgency = "normal";

  if (creditBalance <= 0) {
    urgency = "high";
    recommendation = isAr 
      ? "لقد نفد رصيدك بالكامل! الوكيل الذكي متوقف عن العمل. يرجى الترقية فوراً أو شحن رصيد إضافي لضمان استمرار خدمة عملائك."
      : "Your credit is fully exhausted! The AI agent is stopped. Please upgrade immediately or recharge to ensure continued service for your customers.";
      
    // Recommend a higher plan or highest plan
    recPlan = plans.find(p => p.id === 'business' || p.id === 'enterprise');
  } else if (creditBalance < 100 && aiConversationsUsed > 500) {
    urgency = "medium";
    recommendation = isAr
      ? "رصيدك أوشك على النفاذ ومعدل استهلاكك مرتفع. ننصحك بالترقية إلى باقة أعلى (Business أو Enterprise) لتجنب توقف الخدمة."
      : "Your credit is running low and your usage is high. We recommend upgrading to a higher plan (Business or Enterprise) to avoid service interruption.";
    recPlan = plans.find(p => p.id === 'business');
  } else if (aiConversationsUsed < 100 && currentWorkspace.planId === 'starter') {
    urgency = "normal";
    recommendation = isAr
      ? "باقة Starter الحالية تبدو مناسبة لحجم استهلاكك. استمر في استخدامها بثقة!"
      : "Your current Starter plan seems perfect for your usage level. Keep it up!";
  } else {
    urgency = "normal";
    recommendation = isAr
      ? "أداؤك مستقر. إذا كنت تخطط لزيادة حجم مبيعاتك قريباً، فقد تحتاج للترقية."
      : "Your performance is stable. If you plan to scale sales soon, you might need to upgrade.";
  }

  return (
    <>
      <div className={`rounded-2xl border p-6 shadow-sm ${
        urgency === 'high' 
          ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10' 
          : urgency === 'medium'
            ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10'
            : 'border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/10'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`mt-1 rounded-full p-2 ${
            urgency === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' :
            urgency === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' :
            'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
          }`}>
            {urgency === 'high' ? <AlertCircle className="h-6 w-6" /> :
             urgency === 'medium' ? <TrendingUp className="h-6 w-6" /> :
             <Sparkles className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold mb-2 ${
              urgency === 'high' ? 'text-red-900 dark:text-red-300' :
              urgency === 'medium' ? 'text-amber-900 dark:text-amber-300' :
              'text-indigo-900 dark:text-indigo-300'
            }`}>
              {isAr ? "اقتراح الباقة الذكي" : "Smart Package Recommendation"}
            </h3>
            <p className={`text-sm font-medium ${
              urgency === 'high' ? 'text-red-800 dark:text-red-200' :
              urgency === 'medium' ? 'text-amber-800 dark:text-amber-200' :
              'text-indigo-800 dark:text-indigo-200'
            }`}>
              {recommendation}
            </p>
            
            {recPlan && urgency !== 'normal' && (
              <div className="mt-4">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition ${
                    urgency === 'high' 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isAr ? `الترقية إلى ${recPlan.name}` : `Upgrade to ${recPlan.name}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              {isAr ? "خيارات الشحن والترقية" : "Recharge & Upgrade Options"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {isAr ? "يرجى التواصل مع الدعم الفني لإتمام عملية الدفع وتفعيل الرصيد." : "Please contact support to complete payment and activate credits."}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
