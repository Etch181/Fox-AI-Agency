import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useTranslation } from "../../services/LanguageService";
import { authenticatedFetch } from "../../services/authenticatedFetch";
import { UserPlus, ShieldCheck, Mail, Power, RefreshCw, UsersRound } from "lucide-react";

type StaffMember = {
  uid: string;
  name: string;
  email: string;
  role: string;
  roleLabel?: { ar: string; en: string };
  permissions: string[];
  active: boolean;
  createdAt?: string | null;
  lastSignInAt?: string | null;
};

const ROLE_OPTIONS = [
  { value: "receptionist", ar: "الاستقبال", en: "Receptionist" },
  { value: "appointment_manager", ar: "مسؤول الحجوزات", en: "Appointment Manager" },
  { value: "sales", ar: "المبيعات", en: "Sales" },
  { value: "support", ar: "خدمة العملاء", en: "Customer Support" },
  { value: "manager", ar: "مدير المنشأة", en: "Workspace Manager" },
] as const;

const PERMISSION_LABELS: Record<string, { ar: string; en: string }> = {
  inbox: { ar: "المحادثات", en: "Inbox" },
  appointments: { ar: "الحجوزات", en: "Appointments" },
  complaints: { ar: "الشكاوى", en: "Complaints" },
  crm: { ar: "CRM", en: "CRM" },
  promotions: { ar: "العروض", en: "Promotions" },
  orders: { ar: "الطلبات", en: "Orders" },
  tickets: { ar: "التذاكر", en: "Tickets" },
  marketing: { ar: "التسويق", en: "Marketing" },
};

export const ClientStaff: React.FC = () => {
  const { currentWorkspace, addToast } = useApp();
  const { isAr } = useTranslation();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("receptionist");
  const [inviteLink, setInviteLink] = useState("");

  const loadStaff = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch("/api/workspaces/" + encodeURIComponent(currentWorkspace.id) + "/staff");
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.code || "STAFF_LOAD_FAILED");
      setStaff(Array.isArray(data.staff) ? data.staff : []);
    } catch (error) {
      console.error("FOX staff load failed:", error);
      addToast(isAr ? "تعذر تحميل فريق العمل." : "Could not load staff members.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadStaff(); }, [currentWorkspace?.id]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !currentWorkspace?.id) return;
    setSubmitting(true);
    setInviteLink("");
    try {
      const response = await authenticatedFetch("/api/workspaces/" + encodeURIComponent(currentWorkspace.id) + "/staff", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.code || "STAFF_CREATE_FAILED");
      if (data?.invite?.resetLink) setInviteLink(data.invite.resetLink);
      addToast(
        data?.invite?.emailSent
          ? (isAr ? "تم إنشاء الحساب وإرسال الدعوة بالبريد." : "Staff account created and invitation sent.")
          : (isAr ? "تم إنشاء الحساب. استخدم رابط التفعيل الظاهر أسفل النموذج." : "Staff account created. Use the activation link shown below."),
        data?.invite?.emailSent ? "success" : "info",
      );
      setName("");
      setEmail("");
      setRole("receptionist");
      await loadStaff();
    } catch (error: any) {
      console.error("FOX staff create failed:", error);
      addToast(isAr ? "تعذر إنشاء عضو الفريق: " + String(error?.message || "خطأ") : "Could not create staff: " + String(error?.message || "error"), "error");
    } finally {
      setSubmitting(false);
    }
  };
  const updateStaff = async (uid: string, payload: Record<string, unknown>, successText: string) => {
    if (!currentWorkspace?.id) return;
    try {
      const response = await authenticatedFetch(
        "/api/workspaces/" + encodeURIComponent(currentWorkspace.id) + "/staff/" + encodeURIComponent(uid),
        { method: "PATCH", body: JSON.stringify(payload) },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.code || "STAFF_UPDATE_FAILED");
      addToast(successText, "success");
      await loadStaff();
    } catch (error) {
      console.error("FOX staff update failed:", error);
      addToast(isAr ? "تعذر تحديث صلاحيات عضو الفريق." : "Could not update staff permissions.", "error");
    }
  };

  const resendInvite = async (uid: string) => {
    if (!currentWorkspace?.id) return;
    try {
      const response = await authenticatedFetch(
        "/api/workspaces/" + encodeURIComponent(currentWorkspace.id) + "/staff/" + encodeURIComponent(uid) + "/resend",
        { method: "POST" },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.code || "STAFF_RESEND_FAILED");
      if (data?.resetLink) setInviteLink(data.resetLink);
      addToast(
        data?.emailSent
          ? (isAr ? "تم إعادة إرسال الدعوة." : "Invitation resent.")
          : (isAr ? "تم إنشاء رابط تفعيل جديد." : "A new activation link was created."),
        data?.emailSent ? "success" : "info",
      );
    } catch (error) {
      console.error("FOX staff resend failed:", error);
      addToast(isAr ? "تعذر إعادة إرسال الدعوة." : "Could not resend invitation.", "error");
    }
  };

  if (!currentWorkspace) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-6 md:p-8 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 border border-orange-400/30">
            <UsersRound className="h-6 w-6 text-orange-300" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">FOX TEAM CONTROL</div>
            <h1 className="mt-1 text-2xl font-black">{isAr ? "فريق العمل والصلاحيات" : "Team & Permissions"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              {isAr
                ? "أنشئ حسابات حقيقية للموظفين واربط كل حساب بمهام محددة داخل نفس المنشأة. الصلاحيات مرتبطة بالمنشأة ولا تسمح بالوصول إلى منشأة أخرى."
                : "Create real staff accounts with role-based access inside this workspace only. Staff permissions are tenant-scoped and cannot cross into another business."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <UserPlus className="h-5 w-5 text-orange-500" />
            {isAr ? "إضافة عضو فريق" : "Add Team Member"}
          </div>
          <form onSubmit={handleAdd} className="mt-5 space-y-4">
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={isAr ? "الاسم الكامل" : "Full name"} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 rtl:right-3 rtl:left-auto" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder={isAr ? "البريد الإلكتروني" : "Email address"} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 pl-9 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white rtl:pr-9 rtl:pl-3" />
            </div>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              {ROLE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isAr ? item.ar : item.en}</option>)}
            </select>
            <button disabled={submitting} className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50">
              {submitting ? (isAr ? "جارٍ إنشاء الحساب..." : "Creating account...") : (isAr ? "إنشاء وإرسال الدعوة" : "Create & Send Invite")}
            </button>
          </form>

          {inviteLink && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="font-black text-amber-800 dark:text-amber-200">{isAr ? "رابط التفعيل الاحتياطي" : "Fallback activation link"}</p>
              <p className="mt-1 break-all text-amber-700 dark:text-amber-300">{inviteLink}</p>
            </div>
          )}
        </div>

        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? "أعضاء المنشأة" : "Workspace members"}</h3>
              <p className="mt-1 text-[11px] text-slate-500">{currentWorkspace.name} · {staff.length}</p>
            </div>
            <button onClick={() => void loadStaff()} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><RefreshCw className="h-4 w-4" /></button>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin" /></div>
            ) : staff.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{isAr ? "لا يوجد أعضاء فريق حتى الآن." : "No staff members yet."}</div>
            ) : staff.map((member) => (
              <div key={member.uid} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">{member.name}</p>
                      <span className={member.active ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-600" : "rounded-full bg-slate-500/10 px-2 py-0.5 text-[9px] font-black text-slate-500"}>
                        {member.active ? (isAr ? "نشط" : "Active") : (isAr ? "موقوف" : "Disabled")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{member.email}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {member.permissions.map((permission) => (
                        <span key={permission} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          {PERMISSION_LABELS[permission]?.[isAr ? "ar" : "en"] || permission}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <select
                      value={member.role}
                      onChange={(e) => void updateStaff(member.uid, { role: e.target.value }, isAr ? "تم تحديث الدور." : "Role updated.")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      {ROLE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isAr ? item.ar : item.en}</option>)}
                    </select>
                    <button onClick={() => void updateStaff(member.uid, { active: !member.active }, isAr ? "تم تحديث حالة الحساب." : "Account status updated.")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
                      <Power className="mr-1 inline h-3.5 w-3.5" />{member.active ? (isAr ? "إيقاف" : "Disable") : (isAr ? "تفعيل" : "Enable")}
                    </button>
                    <button onClick={() => void resendInvite(member.uid)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                      <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />{isAr ? "إرسال الدعوة" : "Resend Invite"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
