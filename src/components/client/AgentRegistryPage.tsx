import React from "react";
import { useApp } from "../context/AppContext";
import { useTranslation } from "../services/LanguageService";
import { FoxAgent, FoxTask, TaskStatus, AgentStatus, getExecutiveOverview } from "../services/foxAgentControlPlane";
import { executeCode } from "../services/executiveRouter";

const COLORS = {
  active: "#10b981",
  idle: "#f59e0b",
  running: "#3b82f6",
  error: "#ef4444",
  offline: "#6b7280",
};

export const AgentRegistryPage: React.FC = () => {
  const { t, isAr, language } = useTranslation();
  const { currentUser } = useApp();
  const agents = await (async () => {
    // In production, these would come from Firestore
    // For now, we use the services
    try {
      const agents = await (async () => {
        // Try to import and use agentRegistry
        return [];
      })();
      return agents;
    } catch (e) {
      return [];
    }
  })();

  const overview = await getExecutiveOverview();

  // Get status color
  const getStatusColor = (status: AgentStatus) => COLORS[status] || COLORS.offline;

  const handleTaskAssignment = async (agentId: string, taskId: string) => {
    const task = await (async () => {
      // Try to import assignTask
      return null;
    })();
    if (task) {
      await assignTask(taskId, agentId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Executive Overview Summary */}
      {currentUser?.role === "super_admin" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-bold mb-4">
            {isAr ? "نظرة عامة تنفيذية" : "Executive Overview"}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isAr ? "إجمالي الوكلاء" : "Total Agents"}
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{overview?.totalAgents || 0}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isAr ? "الوكلاء النشطون" : "Active Agents"}
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{overview?.activeAgents || 0}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isAr ? "المهام المعلقة" : "Pending Tasks"}
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{overview?.totalTasks || 0}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isAr ? "الموافقات المعلقة" : "Pending Approvals"}
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{overview?.pendingApprovals || 0}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? "حالة النظام" : "System Health"}
            </p>
            <p className={`text-sm font-medium ${overview?.systemHealth === "healthy" ? "text-emerald-600" : overview?.systemHealth === "degraded" ? "text-amber-600" : "text-red-600"}`}>
              {overview?.systemHealth || "unknown"}
            </p>
          </div>
        </div>
      )}

      {/* Agent Registry Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:shadow-lg hover:border-indigo-300 transition-all duration-300"
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100/20 flex items-center justify-center">
                  <span className="text-indigo-600 font-bold">{agent.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-bold text-lg">{t(agent.name)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{agent.role}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {isAr
                    ? agent.status === "active"
                      ? "نشط"
                      : agent.status === "idle"
                      ? "فاضل"
                      : agent.status === "running"
                      ? "ينفذ"
                      : agent.status === "error"
                      ? "خطأ"
                      : "غير متصل"
                    : agent.status === "active"
                    ? "Active"
                    : agent.status === "idle"
                    ? "Idle"
                    : agent.status === "running"
                    ? "Running"
                    : agent.status === "error"
                    ? "Error"
                    : "Offline"}
                </span>
              </div>

              {/* Capabilities Overview */}
              <div className="mb-3 p-3 rounded bg-slate-50 dark:bg-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isAr ? "الصلاحيات" : "Capabilities"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {agent.capabilities?.allowedActions?.slice(0, 3).map((a) => {
                    const label = a.replace(/_/g, " ");
                    return `${label} `;
                  })}...
                </p>
              </div>

              {/* Activity Stats */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? "ناجح" : "Success"}
                </p>
                <p className="font-medium text-lg">{agent.successCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? "فشل" : "Failed"}
                </p>
                <p className="font-medium text-lg text-red-600">{agent.failureCount}</p>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleTaskAssignment(agent.id, "new-task")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors">
                  <span className="text-[10px] font-semibold">
                    {isAr ? "إنشاء مهمة" : "Create Task"}
                  </span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {agents.length === 0 && currentUser?.role === "super_admin" && (
        <div className="col-span-full text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">
            {isAr ? "لا توجد وكلاء مسجلة بعد" : "No agents registered yet"}
          </p>
          <p className="mt-2 text-sm">
            {isAr ? "كSuper Admin، قم بإنشاء الوكلاء من الخدمات" : "As Super Admin, create agents from services"}
          </p>
        </div>
      )}
    </div>
  );
};