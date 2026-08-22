import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ProductOrder } from "../../types";
import { PackageCheck, AlertCircle, CheckCircle, RefreshCw, Send, ShoppingBag, Clock, FileText } from "lucide-react";

export const ClientOrderVerification: React.FC = () => {
  const { currentWorkspace, productOrders, updateProductOrderStatus, language } = useApp();
  const isAr = language === "ar";

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingNotesOrderId, setEditingNotesOrderId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  if (!currentWorkspace) return null;

  const workspaceOrders = productOrders.filter((o) => o.workspaceId === currentWorkspace.id);

  const filteredOrders = workspaceOrders.filter((o) => {
    if (filterStatus === "all") return true;
    return o.status === filterStatus;
  });

  const getStatusBadge = (status: ProductOrder["status"]) => {
    switch (status) {
      case "pending_verification":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-extrabold">
            <Clock className="h-3 w-3 animate-spin" />
            {isAr ? "قيد التأكد من التوفر" : "Pending Verification"}
          </span>
        );
      case "confirmed_available":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-extrabold">
            <CheckCircle className="h-3 w-3" />
            {isAr ? "متوفر ومؤكد" : "Confirmed Available"}
          </span>
        );
      case "alternative_offered":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs font-extrabold">
            <RefreshCw className="h-3 w-3" />
            {isAr ? "تم إرسال اقتراح دواء/منتج بديل" : "Alternative Suggested"}
          </span>
        );
      case "dispatched":
        return (
          <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full text-xs font-extrabold">
            <PackageCheck className="h-3 w-3" />
            {isAr ? "تم الشحن والتعليمات" : "Dispatched"}
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-extrabold">
            <AlertCircle className="h-3 w-3" />
            {isAr ? "غير متوفر وملغي" : "Cancelled"}
          </span>
        );
    }
  };

  const handleUpdateNotes = (orderId: string) => {
    updateProductOrderStatus(orderId, "alternative_offered", noteText);
    setEditingNotesOrderId(null);
    setNoteText("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-orange-500" />
            <span>{isAr ? "التحقق من توفر المنتجات والأدوية للأوردرات" : "Order Stock Verification & Alternatives"}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "استقبال طلبات الأدوية والمنتجات الحية من العمال للتحقق من توافرها بالمخزن الرئيسي واقتراح البدائل المتاحة فوراً"
              : "Verify stock availability for incoming medicine and store orders and offer alternative products when items are out of stock"}
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 text-xs font-bold">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg transition ${filterStatus === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}
          >
            {isAr ? "الكل" : "All"} ({workspaceOrders.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending_verification")}
            className={`px-3 py-1.5 rounded-lg transition ${filterStatus === "pending_verification" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500"}`}
          >
            {isAr ? "معلقة للتحقق" : "Pending"} ({workspaceOrders.filter(o => o.status === "pending_verification").length})
          </button>
          <button
            onClick={() => setFilterStatus("alternative_offered")}
            className={`px-3 py-1.5 rounded-lg transition ${filterStatus === "alternative_offered" ? "bg-blue-500 text-white shadow-sm" : "text-slate-500"}`}
          >
            {isAr ? "مقترحات البدائل" : "Alternatives"} ({workspaceOrders.filter(o => o.status === "alternative_offered").length})
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <ShoppingBag className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {isAr ? "لا توجد طلبات تحقق من التوفر حالياً" : "No pending order verification requests"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? "عندما يطلب العميل دواء أو منتج من البوت، سيظهر هنا مباشرة لتأكيد توفره" : "Customer requests for medicines or store items will show up here"}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4 hover:border-orange-500/40 transition"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 font-black text-xs">
                    #{order.id}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{order.customerName}</span>
                      <span className="text-xs font-normal text-slate-400">({order.customerPhone})</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{order.createdAt}</span>
                      <span>•</span>
                      <span className="uppercase font-bold text-orange-500">{order.channel}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">{isAr ? "إجمالي الأوردر" : "Total"}</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 text-sm">{order.totalAmountEGP} EGP</span>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isAr ? "الأصناف والمنتجات المطلوبة:" : "Requested Items:"}</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        item.available
                          ? "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                          : "border-rose-200/80 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.itemName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {isAr ? `الكمية: ${item.quantity} | السعر: ${item.priceEGP} EGP` : `Qty: ${item.quantity} | ${item.priceEGP} EGP`}
                        </p>
                        {item.alternativeSuggested && (
                          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {isAr ? "💡 البديل المقترح:" : "Suggested:"} {item.alternativeSuggested}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          item.available
                            ? "bg-emerald-500 text-white"
                            : "bg-rose-500 text-white"
                        }`}
                      >
                        {item.available ? (isAr ? "متوفر" : "Available") : (isAr ? "غير متوفر" : "Out of stock")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Owner Notes & Alternative Section */}
              {order.ownerNotes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <p className="text-[10px] font-bold text-slate-400 mb-0.5">{isAr ? "ملاحظات صاحب المنشأة والاقتراح المرسل للعميل:" : "Owner Notes & Suggestions:"}</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{order.ownerNotes}</p>
                </div>
              )}

              {/* Action Buttons for Facility Owner */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateProductOrderStatus(order.id, "confirmed_available", "تم التأكد من توفر جميع المنتجات بالمخزن وجاري التجهيز.")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition shadow-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{isAr ? "تأكيد التوفر بالمخزن" : "Confirm Stock Available"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingNotesOrderId(order.id);
                      setNoteText(order.ownerNotes || "المنتج الاصلي غير متوفر حاليا، نقترح البديل بنفس المادة الفعالة والجودة.");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{isAr ? "اقتراح بديل للعميل" : "Offer Alternative Item"}</span>
                  </button>
                </div>

                <button
                  onClick={() => updateProductOrderStatus(order.id, "cancelled", "المنتج غير متوفر حاليا ولا يوجد بديل مناسب.")}
                  className="px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition"
                >
                  {isAr ? "إلغاء الطلب لعدم التوفر" : "Cancel (Out of Stock)"}
                </button>
              </div>

              {/* Alternative Input Dialog inside card */}
              {editingNotesOrderId === order.id && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2 mt-2">
                  <label className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
                    {isAr ? "أدخل تفاصيل ومواصفات المنتج/الدواء البديل لإرساله للعميل:" : "Enter alternative item specs for customer:"}
                  </label>
                  <textarea
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingNotesOrderId(null)}
                      className="px-3 py-1 rounded-lg text-slate-500 text-xs font-bold"
                    >
                      {isAr ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      onClick={() => handleUpdateNotes(order.id)}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
                    >
                      <Send className="h-3 w-3" />
                      <span>{isAr ? "إرسال الاقتراح للعميل" : "Send Alternative Suggestion"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
