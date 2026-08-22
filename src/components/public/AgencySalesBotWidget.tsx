import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  Bot,
  MessageSquare,
  X,
  Send,
  Sparkles,
  Star,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  CreditCard,
  Building2,
  ChevronDown,
  RefreshCw,
  ThumbsUp,
  Heart
} from "lucide-react";
import { PlanId } from "../../types";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  type?: "text" | "plans_card" | "rating_prompt";
  timestamp: string;
}

interface AgencySalesBotWidgetProps {
  onSelectPlanAndRegister?: (planId: PlanId) => void;
}

export const AgencySalesBotWidget: React.FC<AgencySalesBotWidgetProps> = ({ onSelectPlanAndRegister }) => {
  const { addServiceRating, plans, language } = useApp();
  const isAr = language === "ar";

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_1",
      sender: "bot",
      text: isAr
        ? "أهلاً بك في وكالة FOX AI للأتمتة والذكاء الاصطناعي! 🚀\nأنا مساعدك الذكي المباشر. كيف يمكنني مساعدتك اليوم في تنمية نشاطك التجاري والاشتراك في منصتنا؟"
        : "Welcome to FOX AI Agency! 🚀\nI am your AI assistant. How can I help you choose a plan or integrate AI into your business today?",
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Rating Form State inside chat
  const [ratingVal, setRatingVal] = useState(5);
  const [userName, setUserName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (userQuery?: string) => {
    const textToSend = userQuery || inputText;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: "user_" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userQuery) setInputText("");

    // Simulate AI thinking and response
    setTimeout(() => {
      const botResponse = generateBotResponse(textToSend);
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (query: string): ChatMessage => {
    const q = query.toLowerCase().trim();
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Detect direct rating numbers like 5, 4, 3, 2, 1 or "5 نجوم"
    if (q === "5" || q === "4" || q === "3" || q === "2" || q === "1" || q.includes("نجوم") || q.includes("تقييم") || q.includes("رأي") || q.includes("راي") || q.includes("rate") || q.includes("rating") || q.includes("review")) {
      const parsedNum = parseInt(q);
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 5) {
        setRatingVal(parsedNum);
      }
      setRatingSubmitted(false);

      return {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: isAr
          ? "يسعدنا جداً تقييمك لخدمات وكالة FOX AI! 🌟\nيرجى تحديد عدد النجوم من 1 إلى 5 وكتابة اسمك وملاحظاتك المباشرة أدناه لإضافتها فوراً إلى لوحة تحكم الوكالة 👇"
          : "We value your rating for FOX AI Agency! 🌟 Please select stars (1-5 ⭐) and enter your feedback below 👇",
        type: "rating_prompt",
        timestamp: now,
      };
    }

    if (q.includes("سعر") || q.includes("باق") || q.includes("تكلف") || q.includes("اسعار") || q.includes("price") || q.includes("plan")) {
      return {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: isAr
          ? "تعتمد وكالة FOX AI على باقات مرنة تناسب كافة الأحجام:\n\n1️⃣ **الباقة الأساسية (Starter)**: 499 ج.م / شهرياً - مثالية للمتاجر الصغيرة مع 1000 محادثة.\n2️⃣ **باقة الأعمال (Business Pro)**: 1,200 ج.م / شهرياً - أتمتة كاملة للواتساب وتليجرام وn8n وتدريب متقدم.\n3️⃣ **باقة المؤسسات (Enterprise)**: 2,500 ج.م / شهرياً - لارج كاستم وسيرفرات خاصة وربط API مباشر.\n\nيمكنك استكشاف الباقات والاشتراك المباشر أدناه 👇"
          : "FOX AI offers flexible subscription plans:\n1. Starter (499 EGP/mo)\n2. Business Pro (1,200 EGP/mo)\n3. Enterprise (2,500 EGP/mo)",
        type: "plans_card",
        timestamp: now,
      };
    }

    if (q.includes("عياد") || q.includes("مطعم") || q.includes("صيدلي") || q.includes("متجر") || q.includes("نشاط") || q.includes("clinic") || q.includes("store")) {
      return {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: isAr
          ? "يدعم بوت FOX AI التخصص الذكي لجميع الأنشطة التجارية:\n\n🏥 **العيادات والمراكز**: حجز المواعيد آلياً وتأكيد الكشوفات والتذكير.\n💊 **الصيدليات**: الاستعلام عن الأدوية واقتراح البدائل المسجلة تلقائياً.\n🍔 **المطاعم**: عرض المنيو والتأكد من توفر الأطباق واقتراح بدائل الأصناف النافذة.\n🛍️ **المتاجر والشركات**: عرض المنتجات، إدارة الطلبات وأتمتة خدمة العملاء 24/7."
          : "FOX AI customizes AI agents for Clinics, Pharmacies, Restaurants, and Retail Stores with auto-substitute linking and 24/7 scheduling.",
        type: "text",
        timestamp: now,
      };
    }

    if (q.includes("تفعيل") || q.includes("اشتراك") || q.includes("تسجيل") || q.includes("كود") || q.includes("register") || q.includes("subscribe")) {
      return {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: isAr
          ? "الاشتراك بسيط جداً وسريع! ⚡\nيمكنك إنشاء حساب جديد ببيانات منشأتك وإدخال كود التنشيط الخاص بك، أو إرفاق إيصال الدفع البنكي ليتم تفعيل حسابك فوراً وتلقي بوت تليجرام/واتساب الخا بك."
          : "Subscribing is easy! Register your workspace, enter your activation code or submit payment proof to activate instantly.",
        type: "text",
        timestamp: now,
      };
    }

    // Default Fallback
    return {
      id: "bot_" + Date.now(),
      sender: "bot",
      text: isAr
        ? "أنا هنا للإجابة على جميع استفساراتك حول وكالة FOX AI للأتمتة الذكية. يمكنك الاستفسار عن الباقات، ربط تليجرام وواتساب، أو تجربة البوت. كما يسعدنا تلقي تقييمك لخدمتنا في أي وقت!"
        : "I'm here to answer all your questions regarding FOX AI Agency automation. Feel free to ask about plans, WhatsApp/Telegram integration, or rate our service!",
      type: "text",
      timestamp: now,
    };
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !feedbackText.trim()) return;

    addServiceRating({
      workspaceId: "ws_agency",
      customerName: userName.trim(),
      customerPhone: "+20 100 000 0000",
      channel: "web",
      rating: ratingVal,
      feedback: feedbackText.trim(),
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    });

    setRatingSubmitted(true);
  };

  return (
    <>
      {/* Floating Action Button Badge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 ${
            isAr ? "left-6" : "right-6"
          } z-50 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 px-5 py-3 text-white font-extrabold shadow-2xl shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all animate-bounce duration-1000 border-2 border-white/20`}
        >
          <div className="relative">
            <Bot className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
          </div>
          <span className="text-xs sm:text-sm">
            {isAr ? "مساعد FOX AI للاشتراك والتقييم 🤖" : "FOX AI Agency Assistant 🤖"}
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-4 ${
            isAr ? "left-4" : "right-4"
          } z-50 w-[92vw] sm:w-[400px] h-[560px] max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-fade-in text-white`}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                <Bot className="h-6 w-6 text-white" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                  <span>FOX AI Agency Bot</span>
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                </h3>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  <span>{isAr ? "متواجد الآن لمساعدتك" : "Online & Ready"}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Action Chips Bar */}
          <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
            <button
              onClick={() => handleSend(isAr ? "ما هي باقات وأسعار وكالة FOX AI؟" : "What are the subscription plans?")}
              className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold hover:bg-amber-500/25 shrink-0 transition"
            >
              💳 {isAr ? "الباقات والأسعار" : "Plans & Pricing"}
            </button>
            <button
              onClick={() => handleSend(isAr ? "كيف يخدم البوت نشاطي التجاري؟" : "How does the bot help my business?")}
              className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold hover:bg-blue-500/25 shrink-0 transition"
            >
              🏥 {isAr ? "فوائد الأنشطة" : "Business Benefits"}
            </button>
            <button
              onClick={() => handleSend(isAr ? "أريد تقييم خدمة بوت الوكالة" : "Rate Agency Bot")}
              className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/25 shrink-0 transition"
            >
              ⭐ {isAr ? "تقييم الخدمة" : "Rate Service"}
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-900/95">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-amber-500 text-white rounded-br-none shadow-md"
                      : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Interactive Plans Card inside chat */}
                  {msg.type === "plans_card" && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-slate-700/80">
                      {plans.map((p) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-extrabold text-amber-400 block">{p.name}</span>
                            <span className="text-[10px] text-slate-400">{p.priceEGP} ج.م / شهر</span>
                          </div>
                          <button
                            onClick={() => {
                              if (onSelectPlanAndRegister) {
                                onSelectPlanAndRegister(p.id);
                              } else {
                                const regForm = document.getElementById("register-form-section");
                                if (regForm) regForm.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-[10px] hover:opacity-90 transition shadow-sm"
                          >
                            {isAr ? "اختر واشترك" : "Select & Join"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive Rating Prompt inside chat */}
                  {msg.type === "rating_prompt" && (
                    <div className="mt-3 pt-3 border-t border-slate-700/80">
                      {!ratingSubmitted ? (
                        <form onSubmit={handleRatingSubmit} className="space-y-3 bg-slate-900/95 p-3.5 rounded-2xl border border-amber-500/40 shadow-xl">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <p className="font-extrabold text-[11px] text-amber-400 flex items-center gap-1.5">
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              <span>{isAr ? "نظام تقييم خدمات وكالة FOX AI" : "Agency Service Rating"}</span>
                            </p>
                            <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                              {ratingVal} / 5 ⭐
                            </span>
                          </div>

                          {/* Big Interactive Star Selector */}
                          <div className="flex flex-col items-center gap-1 py-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  type="button"
                                  key={star}
                                  onClick={() => setRatingVal(star)}
                                  className="p-1 hover:scale-125 active:scale-95 transition-all transform"
                                  title={`${star} Stars`}
                                >
                                  <Star
                                    className={`h-7 w-7 transition-all ${
                                      star <= ratingVal
                                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                        : "text-slate-700 hover:text-slate-500"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-amber-400">
                              {ratingVal === 5 && (isAr ? "⭐⭐⭐⭐⭐ (5/5) رائع جداً 🌟" : "5/5 Excellent 🌟")}
                              {ratingVal === 4 && (isAr ? "⭐⭐⭐⭐ (4/5) رائع جداً 👍" : "4/5 Excellent 👍")}
                              {ratingVal === 3 && (isAr ? "⭐⭐⭐ (3/5) وسط 👌" : "3/5 Average 👌")}
                              {ratingVal === 2 && (isAr ? "⭐⭐ (2/5) سئ جداً ⚠️" : "2/5 Very Bad ⚠️")}
                              {ratingVal === 1 && (isAr ? "⭐ (1/5) سئ جداً 💔" : "1/5 Very Bad 💔")}
                            </span>
                          </div>

                          {/* Quick Select Rating Pills */}
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            {[5, 4, 3, 2, 1].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setRatingVal(s)}
                                className={`flex-1 py-1 rounded-lg font-extrabold transition border ${
                                  ratingVal === s
                                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                }`}
                              >
                                {s} ⭐
                              </button>
                            ))}
                          </div>

                          {/* Name Input */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 mb-1 block">
                              {isAr ? "الاسم أو اسم المنشأة:" : "Your Name / Business:"}
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={isAr ? "اكتب اسمك الكريم..." : "Your name..."}
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-[11px] text-white outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Feedback Textarea */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 mb-1 block">
                              {isAr ? "رأيك وملاحظاتك المباشرة:" : "Your Feedback:"}
                            </label>
                            <textarea
                              required
                              rows={2}
                              placeholder={isAr ? "اكتب ملاحظاتك وتقييمك لخدمة الوكالة..." : "Write your review..."}
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-[11px] text-white outline-none focus:border-amber-500 resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-white font-black text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Star className="h-4 w-4 fill-white" />
                            <span>{isAr ? "إرسال التقييم للوكالة ⭐" : "Submit Rating"}</span>
                          </button>
                        </form>
                      ) : (
                        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-center text-xs space-y-2 animate-fade-in shadow-lg">
                          <CheckCircle2 className="h-7 w-7 text-emerald-400 mx-auto" />
                          <p className="font-extrabold text-emerald-300 text-sm">
                            {isAr ? `تم تسجيل تقييمك (${ratingVal}/5 ⭐) بنجاح!` : `Rating (${ratingVal}/5 ⭐) Submitted!`}
                          </p>
                          <p className="text-[10px] text-slate-300 leading-relaxed">
                            {isAr
                              ? "شكراً لك! تم حفظ تقييمك بنجاح ورفعه مباشرة إلى لوحة تحكم وكالة FOX AI."
                              : "Thank you! Your review is stored and sent directly to the Agency dashboard."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setRatingSubmitted(false);
                              setFeedbackText("");
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 text-[10px] font-bold transition"
                          >
                            {isAr ? "إضافة تقييم آخر" : "Submit Another Rating"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              placeholder={isAr ? "اكتب سؤالك لبوت الوكالة..." : "Type your question..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
            />
            <button
              onClick={() => handleSend()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 active:scale-95 transition shadow-md"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
