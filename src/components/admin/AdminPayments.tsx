import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Receipt, CheckCircle2, XCircle, Eye, AlertCircle, Sparkles } from "lucide-react";

export const AdminPayments: React.FC = () => {
  const { payments, approvePayment, rejectPayment, language } = useApp();
  const isAr = language === "ar";

  const [selectedImgUrl, setSelectedImgUrl] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleConfirmReject = (id: string) => {
    if (!rejectionReason) return;
    rejectPayment(id, rejectionReason);
    setRejectingId(null);
    setRejectionReason("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            {isAr ? "مركز مراجعة إيصالات Instapay EGP" : "Instapay Proofs Review Center"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? "مراجعة صور تحويلات إنستا باي المرفوعة بواسطة المشتركين. اعتماد التحويل يقوم بإصدار كود التفعيل وتفعيل الحساب تلقائياً."
              : "Review Egyptian Instapay transfer screenshots uploaded by customers. Approving automatically issues an activation code."}
          </p>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImgUrl && (
        <div
          onClick={() => setSelectedImgUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
        >
          <div className="relative max-w-2xl rounded-2xl bg-white p-2 shadow-2xl dark:bg-slate-900">
            <img
              src={selectedImgUrl}
              alt="Instapay Proof"
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            <p className="py-2 text-center text-xs font-bold text-slate-500">
              {isAr ? "انقر في أي مكان لإغلاق المعاينة" : "Click anywhere to close preview"}
            </p>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="py-3 px-4">{isAr ? "مساحة عمل العميل" : "Client Workspace"}</th>
                <th className="py-3 px-4">{isAr ? "الباقة المستهدفة" : "Target Plan"}</th>
                <th className="py-3 px-4">{isAr ? "المبلغ بالجنيه" : "Amount"}</th>
                <th className="py-3 px-4">{isAr ? "مرجع التحويل" : "Tx Reference"}</th>
                <th className="py-3 px-4">{isAr ? "إيصال التحويل" : "Screenshot"}</th>
                <th className="py-3 px-4">{isAr ? "تاريخ التقديم" : "Submitted"}</th>
                <th className="py-3 px-4">{isAr ? "الحالة" : "Status"}</th>
                <th className="py-3 px-4 text-right">{isAr ? "الإجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {p.workspaceName}
                  </td>

                  <td className="py-3.5 px-4">
                    {p.paymentType === "extra_package" ? (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        ⚡ {p.extraPackageName || `+${p.extraConversationsCount || 500} محادثة`}
                      </span>
                    ) : (
                      <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-orange-600 dark:text-orange-400">
                        {p.planId}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {p.amountEGP} {isAr ? "ج.م" : "EGP"}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {p.transactionRef}
                  </td>

                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => setSelectedImgUrl(p.screenshotUrl)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Eye className="h-3.5 w-3.5 text-orange-500" />
                      {isAr ? "معاينة الإيصال" : "Preview"}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {p.submittedAt}
                  </td>

                  <td className="py-3.5 px-4">
                    {p.status === "approved" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {isAr ? `معتمد (${p.generatedCode || "FOX-PASS"})` : `Approved (${p.generatedCode || "FOX-PASS"})`}
                      </span>
                    )}
                    {p.status === "pending" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        {isAr ? "قيد المراجعة" : "Pending Review"}
                      </span>
                    )}
                    {p.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        <XCircle className="h-3 w-3" />
                        {isAr ? "مرفوض" : "Rejected"}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {p.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        {rejectingId === p.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder={isAr ? "سبب الرفض..." : "Reason..."}
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] dark:border-slate-800 dark:bg-slate-800"
                            />
                            <button
                              onClick={() => handleConfirmReject(p.id)}
                              className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold text-white"
                            >
                              {isAr ? "تأكيد" : "Confirm"}
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => approvePayment(p.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                            >
                              {isAr ? "اعتماد وإصدار الكود" : "Approve"}
                            </button>
                            <button
                              onClick={() => setRejectingId(p.id)}
                              className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500 hover:text-white transition"
                            >
                              {isAr ? "رفض" : "Reject"}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
