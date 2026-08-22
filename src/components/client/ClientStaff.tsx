import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { UserPlus, ShieldCheck, Mail, Phone, Lock, CheckCircle2 } from "lucide-react";

export const ClientStaff: React.FC = () => {
  const { currentWorkspace, addToast } = useApp();

  const [staff, setStaff] = useState([
    { id: "st_1", name: "Sara Ahmed", email: "sara@clinic.com", role: "Receptionist", status: "Active" },
    { id: "st_2", name: "Omar Hassan", email: "omar@clinic.com", role: "Appointment Manager", status: "Active" },
  ]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Receptionist");

  if (!currentWorkspace) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setStaff((prev) => [
      ...prev,
      { id: `st_${Date.now()}`, name, email, role, status: "Active" },
    ]);

    addToast(`Added staff user ${name}`, "success");
    setName("");
    setEmail("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-orange-500" />
            Multi-Staff & Roles Manager (Enterprise Feature)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Grant receptionists, doctors, or store managers access to {currentWorkspace.name}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            Invite Staff User
          </h3>

          <form onSubmit={handleAdd} className="mt-4 space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Staff Full Name</label>
              <input
                type="text"
                placeholder="e.g. Sara Ahmed"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Staff Email</label>
              <input
                type="email"
                placeholder="sara@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="Receptionist">Receptionist / Front Desk</option>
                <option value="Appointment Manager">Appointment Scheduler</option>
                <option value="CRM Agent">CRM Sales Agent</option>
                <option value="Manager">Workspace Manager</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-orange-500 py-2.5 font-bold text-white shadow-md hover:bg-orange-600 transition"
            >
              Send Staff Invite
            </button>
          </form>
        </div>

        {/* Staff Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            Active Staff Members ({staff.length})
          </h3>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono">{s.email}</td>
                    <td className="py-3 px-3 font-semibold text-orange-600 dark:text-orange-400">{s.role}</td>
                    <td className="py-3 px-3 font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {s.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
