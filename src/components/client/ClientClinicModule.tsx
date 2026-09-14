import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Plus, Trash2, Calendar, Stethoscope, Sparkles, X } from "lucide-react";
import { ClinicServicesManager } from "./clinic/ClinicServicesManager";
import { BookingCalendar } from "./clinic/BookingCalendar";

export const ClientClinicModule: React.FC = () => {
  const { currentWorkspace, doctors, clinicServices, addDoctor, deleteDoctor, addClinicService, deleteClinicService, language } = useApp();
  const isAr = language === "ar";
  
  const [showAddDoc, setShowAddDoc] = useState(false);
  
  
  const [docForm, setDocForm] = useState({ name: "", specialty: "", slots: "10:00 AM, 12:00 PM", fee: "" });
  

  const handleAddDoc = () => {
    if (!docForm.name || !docForm.specialty) return;
    addDoctor({
      workspaceId: currentWorkspace!.id,
      name: docForm.name,
      specialty: docForm.specialty,
      slots: docForm.slots.split(",").map(s => s.trim()).filter(Boolean),
      consultationFeeEGP: Number(docForm.fee) || 0
    });
    setDocForm({ name: "", specialty: "", slots: "10:00 AM, 12:00 PM", fee: "" });
    setShowAddDoc(false);
  };

  

  return (
    <div className="space-y-6">
      <BookingCalendar />
      <ClinicServicesManager />

      {/* Doctors Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-500" />
            {isAr ? "إدارة الأطباء والمواعيد" : "Manage Doctors"}
          </h3>
          <button
            onClick={() => setShowAddDoc(!showAddDoc)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20"
          >
            {showAddDoc ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {isAr ? (showAddDoc ? "إلغاء" : "إضافة طبيب") : (showAddDoc ? "Cancel" : "Add Doctor")}
          </button>
        </div>

        {showAddDoc && (
          <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "اسم الطبيب" : "Doctor Name"}</label>
              <input type="text" value={docForm.name} onChange={(e) => setDocForm({...docForm, name: e.target.value})} className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "التخصص" : "Specialty"}</label>
              <input type="text" value={docForm.specialty} onChange={(e) => setDocForm({...docForm, specialty: e.target.value})} className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "المواعيد المتاحة (مفصولة بفاصلة)" : "Available Slots (comma separated)"}</label>
              <input type="text" value={docForm.slots} onChange={(e) => setDocForm({...docForm, slots: e.target.value})} className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "رسوم الكشف (EGP)" : "Consultation Fee"}</label>
              <div className="flex gap-2">
                <input type="number" value={docForm.fee} onChange={(e) => setDocForm({...docForm, fee: e.target.value})} className="flex-1 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                <button onClick={handleAddDoc} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg px-4 py-1.5 text-xs font-bold hover:opacity-90 transition">
                  {isAr ? "حفظ" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {doctors
            .filter(d => d.workspaceId === currentWorkspace?.id)
            .map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">{doc.name}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{doc.specialty}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{isAr ? "سعر الكشف" : "Fee"}: {doc.consultationFeeEGP || 0} EGP</p>
                  </div>
                  <button onClick={() => deleteDoctor(doc.id)} className="text-slate-400 hover:text-rose-500 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {doc.slots.map(s => (
                    <span key={s} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
          ))}
          {doctors.filter(d => d.workspaceId === currentWorkspace?.id).length === 0 && (
            <div className="col-span-full py-6 text-center text-slate-400 font-medium text-xs">
              {isAr ? "لا يوجد أطباء مضافين." : "No doctors found."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
