import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { PlanId } from "../types";
import {
  Check,
  Zap,
  Sparkles,
  Shield,
  Bot,
  Send,
  MessageSquare,
  ArrowRight,
  Star,
  Receipt,
  Headphones,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from "lucide-react";

interface PricingPlansProps {
  onSelectPlan?: (planId: PlanId) => void;
  selectedPlanId?: PlanId;
  showActions?: boolean;
  compact?: boolean;
}

export const PricingPlans: React.FC<PricingPlansProps> = ({
  onSelectPlan,
  selectedPlanId,
  showActions = true,
  compact = false,
}) => {
  const { plans, language } = useApp();
  const isAr = language === "ar";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Fallback plan definitions if plans array is empty
  const defaultPlans = plans && plans.length > 0 ? plans : [
    {
      id: "starter" as PlanId,
      name: "Fox Starter",
      priceEGP: 0,
      duration: isAr ? "تجربة 7 أيام" : "7 Days Trial",
      aiConversationLimit: 50,
      channels: ["telegram"] as ("telegram" | "whatsapp")[],
      badge: isAr ? "تجربة مجانية" : "Free Trial",
      features: isAr ? [
        "وكيل ذكاء اصطناعي واحد",
        "ربط بوت تليجرام فقط",
        "50 محادثة ذكية متضمنة",
        "إدارة عملاء CRM أساسية",
        "نظام حجوزات المواعيد",
        "إدارة وتوثيق الشكاوى",
        "دعم عبر البريد الإلكتروني",
      ] : [
        "1 AI Agent",
        "Telegram Bot Channel",
        "50 AI Conversations",
        "Basic CRM & Leads",
        "Appointment Booking",
        "Complaint Management",
        "Email Support",
      ],
    },
    {
      id: "business" as PlanId,
      name: "Fox Business",
      priceEGP: 1000,
      duration: isAr ? "شهرياً" : "1 Month",
      aiConversationLimit: 1000,
      channels: ["whatsapp", "telegram"] as ("telegram" | "whatsapp")[],
      badge: isAr ? "الأكثر طلباً ⭐" : "Most Popular ⭐",
      features: isAr ? [
        "جميع مميزات Fox Starter",
        "ربط WhatsApp + Telegram معاً",
        "1,000 محادثة ذكية شهرياً",
        "CRM غير محدود للعملاء والطلبات",
        "قائمة الطعام للمطاعم (Menu)",
        "كتالوج الأدوية للصيدليات",
        "استيراد بيانات Excel & Google Sheets",
        "لوحة تحليلات وإحصائيات كاملة",
        "دعم فني أولوية",
      ] : [
        "Everything in Starter",
        "WhatsApp & Telegram Integration",
        "1,000 AI Conversations / month",
        "Unlimited CRM & Customers",
        "Restaurant Menu Upload",
        "Pharmacy Medicine Catalog",
        "Excel & Google Sheets Import",
        "Analytics Dashboard",
        "Priority Support",
      ],
    },
    {
      id: "enterprise" as PlanId,
      name: "Fox Enterprise",
      priceEGP: 2000,
      duration: isAr ? "شهرياً" : "1 Month",
      aiConversationLimit: -1,
      channels: ["whatsapp", "telegram"] as ("telegram" | "whatsapp")[],
      badge: isAr ? "للشركات والمؤسسات" : "Enterprise Grade",
      features: isAr ? [
        "جميع مميزات Fox Business",
        "محادثات ذكاء اصطناعي غير محدودة",
        "سير عمل أتمتة نينجا n8n مخصص",
        "قاعدة معرفة ذاتية التعلم (Self-Learning)",
        "صلاحيات متعددة للموظفين (Staff)",
        "تأكيد فوري لاشتراكات Instapay",
        "مدير حساب شخصي مخصص",
        "دعم فني وتلفوني 24/7",
      ] : [
        "Everything in Business",
        "Unlimited AI Conversations",
        "Custom n8n Automation Workflows",
        "Self-Learning AI Knowledge Base",
        "Multi-Staff Access & Roles",
        "Instant Instapay Clearance",
        "Dedicated Account Manager",
        "24/7 Phone & Priority Support",
      ],
    },
  ];

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Header section */}
      {!compact && (
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>{isAr ? "خطط وأسعار الاشتراكات" : "Subscription Plans & Pricing"}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {isAr
              ? "اختر الخطة المناسبة لحجم أعمالك بالجنيه المصري"
              : "Choose the Perfect Plan for Your Business in EGP"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
            {isAr
              ? "أنظمة أتمتة ذكية متكاملة لإدارة محادثات العملاء عبر Telegram و WhatsApp مع ربط مخصص بـ n8n وخدمة Instapay الفورية."
              : "Complete AI messaging automation for Telegram & WhatsApp with custom n8n workflows and instant Instapay activation."}
          </p>

          {/* Billing Cycle Selector Notice */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <div className="inline-flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-xl transition ${
                  billingCycle === "monthly"
                    ? "bg-orange-500 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {isAr ? "الدفع الشهري" : "Monthly Billing"}
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-orange-500 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>{isAr ? "الدفع السنوي" : "Yearly Billing"}</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-md font-black">
                  {isAr ? "خصم 20%" : "20% OFF"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-7xl mx-auto">
        {defaultPlans.map((plan) => {
          const isBusiness = plan.id === "business";
          const isEnterprise = plan.id === "enterprise";
          const isSelected = selectedPlanId === plan.id;

          // Calculate price based on billing cycle
          let displayPrice = plan.priceEGP;
          if (billingCycle === "yearly" && plan.priceEGP > 0) {
            displayPrice = Math.round(plan.priceEGP * 0.8 * 12); // 20% discount annual
          }

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                isBusiness
                  ? "bg-slate-900/90 text-white border-2 border-orange-500 shadow-2xl shadow-orange-500/20 md:-translate-y-2 z-10"
                  : "bg-slate-900/60 text-white border border-slate-800 shadow-lg hover:border-slate-700"
              } ${isSelected ? "ring-4 ring-orange-500/50" : ""}`}
            >
              {/* Popular Badge */}
              {isBusiness && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[11px] uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-white" />
                  <span>{plan.badge || (isAr ? "الباقة الأكثر طلباً" : "Most Popular")}</span>
                </div>
              )}

              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-xl font-black text-white`}>
                    {plan.name}
                  </h3>

                  {!isBusiness && plan.badge && (
                    <span className="rounded-full bg-slate-800 text-slate-300 px-2.5 py-0.5 text-[10px] font-bold uppercase border border-slate-700">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Subtitle / limits summary */}
                <p className={`mt-2 text-xs font-medium ${isBusiness ? "text-slate-300" : "text-slate-400"}`}>
                  {plan.id === "starter"
                    ? isAr
                      ? "مثالية لتجربة خدمة الرد الآلي واختبار النظام"
                      : "Ideal for testing AI agent capabilities on Telegram"
                    : plan.id === "business"
                    ? isAr
                      ? "الخيار الأمثل للعيادات، الصيدليات والمطاعم"
                      : "Designed for growing clinics, restaurants & retail"
                    : isAr
                    ? "للمؤسسات والشركات ذات الحجم الكبير والربط الخاص"
                    : "For high-volume multi-branch enterprises"}
                </p>

                {/* Price Display */}
                <div className="mt-5 pb-5 border-b border-slate-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl sm:text-4xl font-black tracking-tight text-white`}>
                      {displayPrice.toLocaleString()}
                    </span>
                    <span className={`text-sm font-bold ${isBusiness ? "text-orange-400" : "text-orange-400"}`}>
                      EGP {isAr ? "ج.م" : ""}
                    </span>
                    <span className={`text-xs font-semibold ${isBusiness ? "text-slate-400" : "text-slate-500"}`}>
                      / {billingCycle === "yearly" && plan.priceEGP > 0 ? (isAr ? "سنوياً" : "year") : (isAr ? "شهرياً" : "month")}
                    </span>
                  </div>

                  {/* Channels pill */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${isBusiness ? "text-slate-400" : "text-slate-500"}`}>
                      {isAr ? "القنوات المدعومة:" : "Channels:"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {plan.channels.includes("telegram") && (
                        <span className="flex items-center gap-1 bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-sky-500/30">
                          <Send className="h-3 w-3" /> Telegram
                        </span>
                      )}
                      {plan.channels.includes("whatsapp") && (
                        <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-emerald-500/30">
                          <MessageSquare className="h-3 w-3" /> WhatsApp
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="mt-5 space-y-3">
                  <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isBusiness ? "text-slate-400" : "text-slate-400"}`}>
                    {isAr ? "المميزات والخصائص:" : "Included Features:"}
                  </p>

                  <ul className="space-y-2.5">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isBusiness ? "text-orange-400" : "text-emerald-500"}`} />
                        <span className={`font-medium ${isBusiness ? "text-slate-200" : "text-slate-300"}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Action Footer */}
              {showActions && (
                <div className="mt-8 pt-4 border-t border-slate-800/80 space-y-2">
                  <button
                    type="button"
                    onClick={() => onSelectPlan && onSelectPlan(plan.id)}
                    className={`w-full py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                      isBusiness
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/30"
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    <span>
                      {isSelected
                        ? isAr
                          ? "الخطة المحددة حالياً"
                          : "Selected Plan"
                        : plan.priceEGP === 0
                        ? isAr
                          ? "بدء التجربة المجانية"
                          : "Start Free Trial"
                        : isAr
                        ? `الاشتراك في ${plan.name}`
                        : `Choose ${plan.name}`}
                    </span>
                    <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                  </button>

                  <p className={`text-[10px] text-center font-bold ${isBusiness ? "text-slate-400" : "text-slate-500"}`}>
                    💳 {isAr ? "تفعيل فوري عبر Instapay أو كود الاشتراك" : "Instant clearance via Instapay or code"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instapay & Guarantee Footer Banner */}
      {!compact && (
        <div className="max-w-7xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Receipt className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">
                {isAr ? "الدفع السريع والمباشر عبر Instapay (EGP)" : "Instant Direct Payment via Instapay (EGP)"}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {isAr
                  ? "نقوم بتسهيل عملية الاشتراك بالتحويل الفوري عبر Instapay بدون عمولات إضافية. يمكنك أيضاً تفعيل الخطة فوراً عند الحصول على كود تفعيل من الإدارة."
                  : "Easy EGP payments through Instapay with zero transaction fees. Instant plan activation via activation codes."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right dir-rtl font-mono">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                {isAr ? "العنوان البريدي للإنستاباي" : "Instapay Address"}
              </span>
              <span className="text-sm font-black text-emerald-400">
                etch2410@instapay
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
