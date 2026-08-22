import React, { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { Plus, Trash2, HeartPulse, X, Edit2, Check } from "lucide-react";

export const ClinicServicesManager: React.FC = () => {
  const { currentWorkspace, clinicServices, addClinicService, updateClinicService, deleteClinicService, language } = useApp();
  const isAr = language === "ar";
  
  const [showAddSrv, setShowAddSrv] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);

  const [srvForm, setSrvForm] = useState({
    name: "",
    duration: "",
    price: "",
  });

  const [editSrvForm, setEditSrvForm] = useState({
    name: "",
    duration: "",
    price: "",
  });

  const handleAddSrv = () => {
    if (!srvForm.name || !srvForm.price || !srvForm.duration) return;
    addClinicService({
      workspaceId: currentWorkspace!.id,
      name: srvForm.name,
      durationMinutes: Number(srvForm.duration),
      price: Number(srvForm.price),
    });
    setSrvForm({ name: "", duration: "", price: "" });
    setShowAddSrv(false);
  };

  const startEditService = (srv: any) => {
    setEditingService(srv.id);
    setEditSrvForm({
      name: srv.name,
      duration: String(srv.durationMinutes),
      price: String(srv.price),
    });
  };

  const handleUpdateService = (id: string) => {
    if (!editSrvForm.name || !editSrvForm.price || !editSrvForm.duration) return;
    updateClinicService(id, {
      name: editSrvForm.name,
      durationMinutes: Number(editSrvForm.duration),
      price: Number(editSrvForm.price),
    });
    setEditingService(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-emerald-500" />
          {isAr ? "إدارة خدمات العيادة" : "Manage Clinic Services"}
        </h3>
        <button
          onClick={() => setShowAddSrv(!showAddSrv)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20"
        >
          {showAddSrv ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {isAr ? (showAddSrv ? "إلغاء" : "إضافة خدمة") : (showAddSrv ? "Cancel" : "Add Service")}
        </button>
      </div>

      {showAddSrv && (
        <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "اسم الخدمة" : "Service Name"}</label>
            <input type="text" value={srvForm.name} onChange={(e) => setSrvForm({...srvForm, name: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "السعر (EGP)" : "Price"}</label>
            <input type="number" value={srvForm.price} onChange={(e) => setSrvForm({...srvForm, price: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "المدة (دقائق)" : "Duration (mins)"}</label>
            <input type="number" value={srvForm.duration} onChange={(e) => setSrvForm({...srvForm, duration: e.target.value})} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="sm:col-span-4 flex justify-end mt-2">
            <button onClick={handleAddSrv} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg px-6 py-2 text-xs font-bold hover:opacity-90 transition">
              {isAr ? "حفظ" : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
              <th className="py-3 px-4">{isAr ? "الخدمة" : "Service"}</th>
              <th className="py-3 px-4">{isAr ? "المدة" : "Duration"}</th>
              <th className="py-3 px-4">{isAr ? "السعر" : "Price"}</th>
              <th className="py-3 px-4 text-right">{isAr ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {clinicServices
              .filter((s) => s.workspaceId === currentWorkspace?.id)
              .map((srv) => (
                <tr key={srv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {editingService === srv.id ? (
                      <input type="text" value={editSrvForm.name} onChange={e => setEditSrvForm({...editSrvForm, name: e.target.value})} className="w-full min-w-[120px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none" />
                    ) : srv.name}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                    {editingService === srv.id ? (
                      <input type="number" value={editSrvForm.duration} onChange={e => setEditSrvForm({...editSrvForm, duration: e.target.value})} className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none" />
                    ) : `${srv.durationMinutes} ${isAr ? "دقيقة" : "min"}`}
                  </td>
                  <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {editingService === srv.id ? (
                      <input type="number" value={editSrvForm.price} onChange={e => setEditSrvForm({...editSrvForm, price: e.target.value})} className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none" />
                    ) : `${srv.price} EGP`}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {editingService === srv.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleUpdateService(srv.id)} className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white p-1.5 rounded-md transition">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingService(null)} className="bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-md transition">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditService(srv)} className="text-slate-400 hover:text-blue-500 p-1 rounded-md transition">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteClinicService(srv.id)} className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            {clinicServices.filter((s) => s.workspaceId === currentWorkspace?.id).length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400 font-medium text-xs">
                  {isAr ? "لا توجد خدمات مضافة." : "No services found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
