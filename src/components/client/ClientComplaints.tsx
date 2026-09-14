import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { MessageSquareWarning, CheckCircle2, Clock, Bot, AlertTriangle, Send } from "lucide-react";

export const ClientComplaints: React.FC = () => {
  const { currentWorkspace, complaints, updateComplaintStatus, addComplaint } = useApp();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  if (!currentWorkspace) return null;

  const workspaceCmps = complaints.filter((c) => c.workspaceId === currentWorkspace.id);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !issue) return;

    addComplaint({
      workspaceId: currentWorkspace.id,
      customerName,
      customerPhone,
      phone: customerPhone,
      issue,
      aiResponse: `Thank you ${customerName}. Your feedback has been escalated to management at ${currentWorkspace.name}. We will contact you at ${customerPhone}.`,
      aiAutoResponse: `Thank you ${customerName}. Your feedback has been escalated to management at ${currentWorkspace.name}. We will contact you at ${customerPhone}.`,
      status: "In Progress",
      priority: "High",
      channel: "WhatsApp",
    });

    setIsAdding(false);
    setCustomerName("");
    setCustomerPhone("");
    setIssue("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6 text-rose-500" />
            Customer Complaints & Escalations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Complaints handled politely by AI Agent with auto-escalation to human manager.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-orange-600 transition"
        >
          Log Manual Complaint
        </button>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        {workspaceCmps.map((cmp) => (
          <div
            key={cmp.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {cmp.customerName} ({cmp.customerPhone})
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Logged on {cmp.date} • {cmp.channel}</span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                    cmp.status === "Resolved"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {cmp.status}
                </span>

                {cmp.status !== "Resolved" && (
                  <button
                    onClick={() => updateComplaintStatus(cmp.id, "Resolved")}
                    className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Customer Issue:</span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300 bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-200/40 dark:border-rose-900/40 font-medium">
                  "{cmp.issue}"
                </p>
              </div>

              {cmp.aiAutoResponse && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-orange-500" />
                    AI Agent Auto-Response Sent:
                  </span>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300 bg-orange-50/50 dark:bg-orange-950/20 p-2.5 rounded-xl border border-orange-200/40 dark:border-orange-900/40 font-medium italic">
                    "{cmp.aiAutoResponse}"
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Log Complaint
            </h3>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+2010..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Complaint Issue Details
                </label>
                <textarea
                  rows={3}
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-500 py-2 text-xs font-bold text-white shadow-md hover:bg-orange-600"
                >
                  Save Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
