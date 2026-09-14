import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../../services/LanguageService";
import { useApp } from "../../context/AppContext";
import { Bot, Send, Sparkles, Loader2, Lightbulb } from "lucide-react";
import ReactMarkdown from "react-markdown";

// Since we can't easily call the exact same endpoint without knowing its structure, 
// we'll mock the internal call or simulate the Advisor response if there's no specific API.
// Wait, the prompt says "عبارة عن دردشة مع Gemini AI مدربة على تقديم نصائح".
// Let's create a small function that uses the existing Gemini client if available.
// Or we can just build a placeholder that looks real and add a comment, 
// or implement a real server endpoint if it's a full-stack app.
// I will check if there is an api/gemini route. Let me create the basic UI first.

export const ClientFoxAdvisor: React.FC = () => {
  const { isAr } = useTranslation();
  const { currentWorkspace, currentUser } = useApp();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: isAr
        ? "مرحباً بك في مستشار فوكس الذكي 🦊. أنا هنا لمساعدتك في تحليل أداء بوتاتك وتقديم نصائح لتحسين المبيعات وخدمة العملاء. كيف يمكنني مساعدتك اليوم؟"
        : "Welcome to Smart Fox Advisor 🦊. I'm here to help you analyze your bots' performance and provide tips to improve sales and customer service. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/fox-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: messages,
          workspace: currentWorkspace,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch advice");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.response }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: isAr
            ? "عذراً، حدث خطأ أثناء الاتصال بمستشار فوكس. يرجى المحاولة مرة أخرى."
            : "Sorry, an error occurred while connecting to Fox Advisor. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isEnterprise = isSuperAdmin || currentWorkspace?.planId === 'enterprise';

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {isAr ? "مستشار فوكس الذكي" : "Smart Fox Advisor"}
              </h1>
              <p className="text-sm font-medium text-slate-400 mt-1">
                {isAr
                  ? "مساعدك المدعوم بالذكاء الاصطناعي لتحسين أداء بوتاتك"
                  : "Your AI-powered assistant to optimize bot performance"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!isEnterprise ? (
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-6 shadow-xl shadow-orange-500/10">
            <Bot className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">
            {isAr ? "ميزة حصرية لباقة فوكس إنتربرايز" : "Exclusive to Fox Enterprise Plan"}
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed font-medium">
            {isAr
              ? "مستشار فوكس الذكي يتوفر فقط لعملاء باقة Fox Enterprise. قم بترقية باقتك الآن للحصول على نصائح مخصصة بالذكاء الاصطناعي لزيادة المبيعات وتحسين أداء بوتاتك."
              : "Smart Fox Advisor is only available for Fox Enterprise customers. Upgrade your plan now to get customized AI advice to increase sales and optimize your bots."}
          </p>
          <button className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95">
            {isAr ? "الترقية إلى Fox Enterprise" : "Upgrade to Fox Enterprise"}
          </button>
        </div>
      ) : (
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col relative backdrop-blur-sm">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  msg.role === "user"
                    ? "bg-slate-800 text-slate-300"
                    : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                }`}
              >
                {msg.role === "user" ? (
                  <span className="font-bold text-sm">
                    {currentWorkspace?.name?.charAt(0) || "U"}
                  </span>
                ) : (
                  <Bot className="h-5 w-5" />
                )}
              </div>
              
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                  msg.role === "user"
                    ? "bg-slate-800 text-white rounded-tr-sm"
                    : "bg-slate-950/80 text-slate-300 border border-slate-800 rounded-tl-sm"
                }`}
              >
                {msg.role === "ai" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Bot className="h-5 w-5" />
              </div>
              <div className="max-w-[80%] rounded-2xl px-5 py-4 bg-slate-950/80 border border-slate-800 rounded-tl-sm flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                <span className="text-xs text-slate-400">
                  {isAr ? "المستشار يكتب..." : "Advisor is typing..."}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries */}
        {messages.length === 1 && (
          <div className="px-4 sm:px-6 pb-2 flex flex-wrap gap-2">
             <button
                onClick={() => setInput(isAr ? "كيف يمكنني تحسين مبيعات متجري؟" : "How can I improve my store sales?")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition border border-slate-700"
              >
                <Lightbulb className="h-3 w-3 text-amber-400" />
                {isAr ? "كيف يمكنني تحسين مبيعات متجري؟" : "How can I improve my store sales?"}
              </button>
              <button
                onClick={() => setInput(isAr ? "هل لديك نصائح لتحديث بيانات المنتجات؟" : "Any tips for updating product data?")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition border border-slate-700"
              >
                <Lightbulb className="h-3 w-3 text-amber-400" />
                {isAr ? "هل لديك نصائح لتحديث بيانات المنتجات؟" : "Any tips for updating product data?"}
              </button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-slate-900/80 border-t border-slate-800 shrink-0">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isAr
                  ? "اسأل المستشار الذكي عن أي شيء يخص أداء البوت..."
                  : "Ask the Smart Advisor anything about bot performance..."
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 ltr:pl-5 rtl:pr-5 ltr:pr-14 rtl:pl-14 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder-slate-500 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute ltr:right-2 rtl:left-2 p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:hover:bg-orange-500 transition shadow-lg shadow-orange-500/20"
            >
              <Send className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
            </button>
          </form>
        </div>
      </div>
      )}
    </div>
  );
};
