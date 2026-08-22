import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Workflow, CheckCircle2, AlertCircle, ShoppingBag, MessageCircle, Instagram, Code } from "lucide-react";
import { ClientWhatsAppQR } from "./ClientWhatsAppQR";

export const ClientIntegrations: React.FC = () => {
  const { currentWorkspace, language } = useApp();
  const isAr = language === "ar";
  
  const [activeTab, setActiveTab] = useState<"messaging" | "ecommerce">("messaging");
  const [showWhatsAppQR, setShowWhatsAppQR] = useState(false);

  if (!currentWorkspace) return null;

  const isWhatsappConnected = currentWorkspace.whatsappBotStatus === "connected";
  const isTelegramConnected =
    currentWorkspace.telegramBotStatus === "connected";

  const integrations = {
    messaging: [
      {
        id: "whatsapp",
        name: "WhatsApp Business Cloud API",
        icon: <MessageCircle className="h-6 w-6 text-emerald-500"/>,
        connected: isWhatsappConnected,
        desc: isAr ? "استقبال رسائل WhatsApp والرد التلقائي بالذكاء الاصطناعي عبر Meta Cloud API" : "Receive WhatsApp messages & AI auto-reply via Meta Cloud API",
      },
      {
        id: "instagram",
        name: "Instagram Direct",
        icon: <Instagram className="h-6 w-6 text-pink-500"/>,
        connected: false,
        desc: isAr ? "الرد الآلي على رسائل انستجرام والتعليقات" : "Auto-reply to Instagram DMs & comments",
      },
      {
        id: "telegram",
        name: "Telegram Bot",
        icon: <MessageCircle className="h-6 w-6 text-blue-500"/>,
        connected: isTelegramConnected,
        desc: isAr ? "تفعيل بوت تليجرام لخدمة العملاء بالـ Access Token" : "Activate Telegram bot for customer service via token",
      }
    ],
    ecommerce: [
      { id: "salla", name: "Salla (سلة)", icon: <ShoppingBag className="h-6 w-6 text-teal-500"/>, connected: false, desc: isAr ? "ربط متجر سلة لمزامنة المنتجات والطلبات" : "Connect Salla store to sync products & orders" },
      { id: "zid", name: "Zid (زد)", icon: <ShoppingBag className="h-6 w-6 text-purple-500"/>, connected: false, desc: isAr ? "ربط متجر زد لمزامنة المنتجات والطلبات" : "Connect Zid store to sync products & orders" },
      { id: "shopify", name: "Shopify", icon: <ShoppingBag className="h-6 w-6 text-green-500"/>, connected: false, desc: isAr ? "ربط Shopify لمزامنة المخزون" : "Connect Shopify for inventory sync" },
    ]
  };

  const displayList = activeTab === "messaging" ? integrations.messaging : integrations.ecommerce;

  if (showWhatsAppQR) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowWhatsAppQR(false)}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          {isAr ? "← العودة إلى قائمة التكاملات" : "← Back to Integrations"}
        </button>
        <ClientWhatsAppQR />
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-fade-in ${isAr ? "dir-rtl" : "dir-ltr"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <Workflow className="h-6 w-6 text-indigo-500" />
            <span>{isAr ? "الربط والتكامل (Integrations)" : "Integrations"}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? "إدارة ربط قنوات التواصل ومتاجر التجارة الإلكترونية" : "Manage connections for messaging channels and e-commerce stores"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab("messaging")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "messaging" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
        >
          {isAr ? "قنوات المحادثة" : "Messaging Channels"}
        </button>
        <button
          onClick={() => setActiveTab("ecommerce")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "ecommerce" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
        >
          {isAr ? "المتاجر الإلكترونية" : "E-Commerce"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayList.map(integration => (
          <div key={integration.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  {integration.icon}
                </div>
                {integration.connected ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
                    <CheckCircle2 className="h-3 w-3" /> {isAr ? "متصل والبوت نشط" : "Connected & Live"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                    <AlertCircle className="h-3 w-3" /> {isAr ? "غير متصل" : "Disconnected"}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{integration.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{integration.desc}</p>
            </div>
            
            <button
              onClick={() => {
                if (integration.id === "whatsapp") {
                  setShowWhatsAppQR(true);
                }
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                integration.connected
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              }`}
            >
              {integration.id === "whatsapp"
                ? (integration.connected ? (isAr ? "إدارة WhatsApp Cloud API" : "Manage Cloud API Connection") : (isAr ? "ربط WhatsApp Cloud API الآن" : "Connect WhatsApp Cloud API"))
                : (integration.connected ? (isAr ? "إدارة الربط" : "Manage Connection") : (isAr ? "ربط الآن" : "Connect Now"))
              }
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl">
        <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
          <Code className="h-5 w-5" />
          {isAr ? "ربط مخصص (API/Webhook)" : "Custom Integration (API/Webhook)"}
        </h3>
        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mb-4 max-w-2xl">
          {isAr ? "هل تستخدم نظاماً داخلياً (ERP) أو CRM خاص؟ يمكنك ربط نظامك عبر Webhook لاستقبال وتحديث البيانات لحظياً." : "Using an internal ERP or custom CRM? Connect your system via Webhook to receive and update data in real-time."}
        </p>
        <button className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition">
          {isAr ? "إعداد Webhook مخصص" : "Setup Custom Webhook"}
        </button>
      </div>
    </div>
  );
};

