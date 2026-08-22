import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  CheckCheck,
  RefreshCw,
  Zap,
  Sparkles,
  Globe,
  Settings,
  Sliders,
  Check,
} from "lucide-react";

export const ClientLiveChat: React.FC = () => {
  const {
    currentWorkspace,
    knowledgeBase,
    menuItems,
    medicines,
    products,
    clinicServices,
    courses,
    courseReviews,
    language,
  } = useApp();
  const isAr = language === "ar";

  const [channel, setChannel] = useState<"WhatsApp" | "Telegram">("WhatsApp");
  const [messages, setMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; time: string; lang?: string }>
  >([
    {
      sender: "ai",
      text: isAr
        ? `أهلاً بك! أنا وكيل الذكاء الاصطناعي لـ ${
            currentWorkspace?.name || "النشاط التجاري"
          }. كيف يمكنني مساعدتك اليوم؟`
        : `Hello! I am the AI Agent for ${
            currentWorkspace?.name || "Business"
          }. How can I assist you today?`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      lang: isAr ? "ar" : "en",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!currentWorkspace) return null;

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const userText = customText || input;
    if (!userText.trim() || loading) return;

    if (!customText) setInput("");

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isUserAr = /[\u0600-\u06FF]/.test(userText);

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userText, time: now, lang: isUserAr ? "ar" : "en" },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: {
            ...currentWorkspace,
            knowledgeBase,
            menu: menuItems,
            medicines,
            products,
            clinicServices,
            courses,
            courseReviews
          },
          workspaceId: currentWorkspace.id,
          channel: channel.toLowerCase(),
          customerMessage: userText,
          userMessage: userText,
          chatHistory: messages.slice(-6),
        }),
      });

      const data = await res.json();
      const reply = data.response || data.aiResponse || (isUserAr ? "أنا هنا لمساعدتك!" : "I am here to help you!");

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          lang: data.detectedLanguage || (isUserAr ? "ar" : "en"),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: isUserAr
            ? `شكراً لتواصلك مع ${currentWorkspace.name}! وكيل الذكاء الاصطناعي جاهز ومعد لخدمتك.`
            : `Thank you for contacting ${currentWorkspace.name}! Our AI agent is configured and ready.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          lang: isUserAr ? "ar" : "en",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = isAr
    ? currentWorkspace.industry === "Clinic"
      ? [
          "بكم الكشف في العيادة وما هي أوقات العمل؟",
          "عايز احجز موعد كشف بكرة مع الدكتور",
          "عندكم عيادة أسنان وأطفال؟",
        ]
      : currentWorkspace.industry === "Restaurant"
      ? [
          "ممكن تبعتلي قائمة الطعام والوجبات المتاحة؟",
          "بكم وجبة الفراخ المشوية والمشروبات؟",
          "هل متاح توصيل للبيت وتكلفة الدليفري كام؟",
        ]
      : currentWorkspace.industry === "Pharmacy"
      ? [
          "هل دواء بنادول نايت متوفر وبكم السعر؟",
          "محتاج علاج للبرد وهل يحتاج روشتة؟",
          "عندكم توصيل أدوية منازل؟",
        ]
      : [
          "ما هي المنتجات والخدمات المتاحة وأسعارها؟",
          "عايز أعمل طلب جديد واتواصل مع المبيعات",
          "كيف أستطيع تقديم شكوى أو استفسار؟",
        ]
    : [
        "What are your working hours and pricing?",
        "Can I book an appointment for tomorrow?",
        "Do you offer home delivery?",
      ];

  return (
    <div className={`space-y-6 animate-fade-in ${isAr ? "dir-rtl" : "dir-ltr"}`}>
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-500" />
            <span>
              {isAr
                ? "مُحاكي القنوات المباشرة (واتساب وتليجرام)"
                : "Live Channel Simulator (WhatsApp & Telegram)"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "اختبر استجابة وكيل Gemini AI الذكي باللغتين العربية والإنجليزي مع التعرّف التلقائي الفوري"
              : "Test Gemini AI Agent auto-responses in real-time with multi-language auto-detection"}
          </p>
        </div>

        {/* Channel Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setChannel("WhatsApp")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              channel === "WhatsApp"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>WhatsApp Simulator</span>
          </button>
          <button
            onClick={() => setChannel("Telegram")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              channel === "Telegram"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-blue-300 animate-pulse" />
            <span>Telegram Simulator</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Test Prompts */}
      <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 mb-2.5">
          <Zap className="h-4 w-4" />
          <span>{isAr ? "أسئلة سريعة لاختبار استجابة الذكاء الاصطناعي:" : "Quick Test Prompts:"}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((promptText, i) => (
            <button
              key={i}
              onClick={() => handleSend(undefined, promptText)}
              disabled={loading}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 text-slate-800 dark:text-slate-200 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition shadow-sm"
            >
              "{promptText}"
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Frame */}
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col h-[540px]">
        {/* Chat Header */}
        <div
          className={`flex items-center justify-between p-4 text-white shadow-md ${
            channel === "WhatsApp"
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700"
              : "bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-sm">{currentWorkspace.name} AI Agent</p>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  {currentWorkspace.industry}
                </span>
              </div>
              <p className="text-[11px] opacity-90 font-medium">
                {isAr
                  ? `متصل الآن • مدعوم بـ Gemini AI (${channel})`
                  : `Online • Powered by Gemini AI (${channel})`}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              setMessages([
                {
                  sender: "ai",
                  text: isAr
                    ? `أهلاً بك! أنا وكيل الذكاء الاصطناعي لـ ${currentWorkspace.name}. كيف يمكنني مساعدتك؟`
                    : `Hello! I am the AI Agent for ${currentWorkspace.name}. How can I assist you today?`,
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  lang: isAr ? "ar" : "en",
                },
              ])
            }
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
            title={isAr ? "إعادة تعيين المحادثة" : "Reset Chat"}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isAr ? "إعادة مسح" : "Reset"}</span>
          </button>
        </div>

        {/* Message Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 dark:bg-slate-950/70">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-lg rounded-2xl p-4 text-xs shadow-sm whitespace-pre-wrap leading-relaxed ${
                  m.sender === "user"
                    ? channel === "WhatsApp"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-blue-600 text-white rounded-br-none"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                }`}
              >
                <p>{m.text}</p>
                <div className="mt-2 pt-1 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[10px] opacity-75">
                  <span className="font-bold flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {m.lang === "ar" ? "العربية 🇪🇬" : "English 🇺🇸"}
                  </span>
                  <div className="flex items-center gap-1">
                    <span>{m.time}</span>
                    {m.sender === "user" && <CheckCheck className="h-3.5 w-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-3.5 text-xs text-slate-500 font-bold animate-pulse flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                <Sparkles className="h-4 w-4 text-orange-500 animate-spin" />
                <span>
                  {isAr
                    ? "وكيل الذكاء الاصطناعي يفكر ويكتب الرد..."
                    : "Gemini AI Agent is thinking and typing response..."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Form Input */}
        <form
          onSubmit={(e) => handleSend(e)}
          className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2"
        >
          <input
            type="text"
            placeholder={
              isAr
                ? "اكتب سؤالك بالعربية أو الإنجليزية للاختبار..."
                : "Type your message in Arabic or English to test..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50 ${
              channel === "WhatsApp"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            <Send className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
            <span>{isAr ? "إرسال" : "Send"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
