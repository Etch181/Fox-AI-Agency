import React from "react";
import { useApp } from "../../context/AppContext";
import {
  Users,
  CreditCard,
  Bot,
  Zap,
  TrendingUp,
  Receipt,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const AdminDashboard: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const { workspaces, payments, activationCodes, crmLeads, approvePayment, language } = useApp();
  const isAr = language === "ar";

  const totalClients = workspaces.length;
  const activeClients = workspaces.filter((w) => w.status === "active").length;
  const pendingPayments = payments.filter((p) => p.status === "pending");

  const totalRevenueEGP = payments
    .filter((p) => p.status === "approved")
    .reduce((acc, p) => acc + p.amountEGP, 0);

  const totalAIConvs = workspaces.reduce((acc, w) => acc + w.aiConversationsUsed, 0);

  // Revenue chart data
  const revenueData = [
    { month: isAr ? "يناير" : "Jan", EGP: 2000, AI_Calls: 1200 },
    { month: isAr ? "فبراير" : "Feb", EGP: 5000, AI_Calls: 2800 },
    { month: isAr ? "مارس" : "Mar", EGP: 8000, AI_Calls: 4500 },
    { month: isAr ? "أبريل" : "Apr", EGP: 11000, AI_Calls: 6200 },
    { month: isAr ? "مايو" : "May", EGP: 15000, AI_Calls: 8900 },
    { month: isAr ? "يونيو" : "Jun", EGP: 19000, AI_Calls: 12400 },
    { month: isAr ? "يوليو" : "Jul", EGP: totalRevenueEGP + 22000, AI_Calls: totalAIConvs + 15000 },
  ];

  // Distribution by Industry
  const industryCounts: Record<string, number> = {};
  workspaces.forEach((w) => {
    const indName = isAr
      ? w.industry === "Clinic"
        ? "عيادات وطب"
        : w.industry === "Pharmacy"
        ? "صيدليات"
        : w.industry === "Restaurant"
        ? "مطاعم وكافيهات"
        : w.industry === "Retail"
        ? "متاجر تجزئة"
        : "أنشطة تجارية"
      : w.industry;
    industryCounts[indName] = (industryCounts[indName] || 0) + 1;
  });
  const industryData = Object.keys(industryCounts).map((key) => ({
    name: key,
    value: industryCounts[key],
  }));

  const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 p-6 text-white shadow-xl shadow-orange-500/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md">
              {isAr ? "لوحة الإدارة الكلية للوكالة (Super Admin)" : "Super Admin Console"}
            </span>
            <span className="text-xs font-medium opacity-90">Fox AI Agency SaaS</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            {isAr ? "مركز العمليات ومراجعة تحويلات Instapay EGP" : "Platform Operations & Instapay Center"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-orange-100 font-medium max-w-2xl">
            {isAr
              ? "إدارة حسابات المشتركين، واعتماد تحويلات إنستا باي بالجنيه المصري، وإصدار أكواد التفعيل، ومتابعة استهلاك وكلاء الذكاء الاصطناعي."
              : "Manage client multi-tenants, approve Egyptian Instapay payments, issue activation codes, and monitor global Gemini AI usage."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate("admin_payments")}
            className="flex items-center gap-1.5 rounded-xl bg-white/90 px-4 py-2.5 text-xs font-bold text-orange-700 shadow-sm hover:bg-white transition"
          >
            <Receipt className="h-4 w-4" />
            {isAr ? `مراجعة Instapay (${pendingPayments.length})` : `Review Instapay (${pendingPayments.length})`}
          </button>
          <button
            onClick={() => onNavigate("admin_codes")}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900/40 px-4 py-2.5 text-xs font-bold text-white border border-white/20 hover:bg-slate-900/60 transition"
          >
            <Zap className="h-4 w-4 text-amber-300" />
            {isAr ? "إصدار كود تفعيل" : "Generate Code"}
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? "حسابات المشتركين النشطة" : "Active Workspaces"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {activeClients} / {totalClients}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              +12% {isAr ? "شهرياً" : "mo/mo"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isAr ? "عبر العيادات والصيدليات والمطاعم والمتاجر" : "Across Clinic, Pharmacy, Restaurant & Retail"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? "إجمالي الإيرادات (Instapay)" : "Total Revenue (Instapay)"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalRevenueEGP.toLocaleString()} {isAr ? "ج.م (EGP)" : "EGP"}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {isAr ? "مؤكدة" : "Verified"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isAr ? "التحويلات المعتمدة عبر حساب Instapay EGP" : "Instapay EGP proof-of-payment approvals"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? "محادثات الذكاء الاصطناعي" : "Platform AI Convs"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalAIConvs.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Gemini 3.6 Flash
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isAr ? "تفاعلات العملاء عبر واتساب وتليجرام" : "WhatsApp & Telegram customer interactions"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? "تحويلات معلقة للمراجعة" : "Pending Instapay Proofs"}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {pendingPayments.length}
            </span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {isAr ? "تتطلب الموافقة" : "Needs Review"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isAr ? "تتطلب مراجعة الأدمين لإصدار الكود" : "Requires Admin verification to generate code"}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue & AI Traffic Growth */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {isAr ? "نمو الاشتراكات والإيرادات بالجنيه المصري (EGP)" : "Platform Growth & Revenue (EGP)"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "عائدات الاشتراكات الشهرية مقابل حركة رسائل الذكاء الاصطناعي" : "Monthly subscription earnings vs AI message traffic"}
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {isAr ? "مؤشرات مباشرة" : "Live Metrics"}
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorEGP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="EGP" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorEGP)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Industry Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            {isAr ? "توزيع المشتركين حسب القطاع" : "Client Sector Distribution"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? "نسبة الأنشطة التجارية المسجلة" : "Workspaces by Industry"}
          </p>

          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={industryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value">
                  {industryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5">
            {industryData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {item.value} {isAr ? "عميل" : "Clients"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Instapay Approvals Quick Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-orange-500" />
              {isAr ? "تحويلات Instapay بانتظار الاعتماد" : "Pending Instapay Payment Reviews"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? "راجع صور إيصالات التحويل واعتمد الاشتراك فوراً" : "Verify screenshot transfers and issue activation codes"}
            </p>
          </div>
          <button
            onClick={() => onNavigate("admin_payments")}
            className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline dark:text-orange-400"
          >
            {isAr ? `عرض الكل (${payments.length})` : `View All (${payments.length})`} <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {pendingPayments.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-800/40">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? "تمت مراجعة جميع التحويلات بالكامل!" : "All Instapay payments reviewed!"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? "لا توجد أي إيصالات معلقة بانتظار موافقة الإدارة حالياً." : "No pending screenshots awaiting admin approval."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="py-2.5 px-3">{isAr ? "حساب العميل" : "Workspace"}</th>
                  <th className="py-2.5 px-3">{isAr ? "الباقة المطلوبة" : "Plan requested"}</th>
                  <th className="py-2.5 px-3">{isAr ? "المبلغ بالجنيه" : "Amount EGP"}</th>
                  <th className="py-2.5 px-3">{isAr ? "مرجع المعاملة" : "Transaction Ref"}</th>
                  <th className="py-2.5 px-3">{isAr ? "صورة التحويل" : "Screenshot"}</th>
                  <th className="py-2.5 px-3 text-right">{isAr ? "إجراء سريع" : "Quick Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {p.workspaceName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-orange-500/10 px-2 py-0.5 font-bold uppercase text-orange-600 dark:text-orange-400 text-[10px]">
                        {p.planId}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {p.amountEGP} {isAr ? "ج.م" : "EGP"}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {p.transactionRef}
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={p.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {isAr ? "معاينة الصورة" : "View Image"}
                      </a>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => approvePayment(p.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                      >
                        {isAr ? "اعتماد وإصدار الكود" : "Approve & Issue Code"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
