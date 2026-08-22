import React, { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { Pill, Plus, Trash2, Edit2, Check, X, RefreshCw, Sparkles, AlertTriangle, FileText } from "lucide-react";

export const PharmacyInventoryManager: React.FC = () => {
  const { currentWorkspace, medicines, addMedicineItem, updateMedicineItem, deleteMedicineItem, language } = useApp();
  const isAr = language === "ar";

  const [showAddMed, setShowAddMed] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);

  const defaultCategories = isAr
    ? ["مضادات حيوية", "مسكنات وأدوية ألم", "فيتامينات ومكملات", "أدوية ضغط وسكر", "أدوية أطفال", "عناية وبشرة"]
    : ["Antibiotics", "Analgesics & Painkillers", "Vitamins & Supplements", "Chronic Care", "Pediatrics", "Skincare"];

  const [medForm, setMedForm] = useState({
    name: "",
    category: defaultCategories[0],
    price: "",
    stock: "10",
    requiresPrescription: false,
    instructions: "",
    available: true,
    alternativeItemName: "",
    alternativeNotes: "",
  });

  const [editMedForm, setEditMedForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    requiresPrescription: false,
    instructions: "",
    available: true,
    alternativeItemName: "",
    alternativeNotes: "",
  });

  if (!currentWorkspace) return null;

  const workspaceMedicines = medicines.filter((m) => m.workspaceId === currentWorkspace.id);
  const availableMedicines = workspaceMedicines.filter((m) => m.available !== false);

  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.name.trim() || !medForm.price) return;

    addMedicineItem({
      workspaceId: currentWorkspace.id,
      name: medForm.name.trim(),
      category: medForm.category,
      price: Number(medForm.price),
      stock: Number(medForm.stock) || 0,
      requiresPrescription: medForm.requiresPrescription,
      instructions: medForm.instructions,
      available: medForm.available,
      alternativeItemName: medForm.alternativeItemName,
      alternativeNotes: medForm.alternativeNotes,
    });

    setMedForm({
      name: "",
      category: defaultCategories[0],
      price: "",
      stock: "10",
      requiresPrescription: false,
      instructions: "",
      available: true,
      alternativeItemName: "",
      alternativeNotes: "",
    });
    setShowAddMed(false);
  };

  const startEdit = (med: any) => {
    setEditingMedId(med.id);
    setEditMedForm({
      name: med.name,
      category: med.category,
      price: String(med.price),
      stock: String(med.stock || 0),
      requiresPrescription: med.requiresPrescription ?? false,
      instructions: med.instructions || "",
      available: med.available !== false,
      alternativeItemName: med.alternativeItemName || "",
      alternativeNotes: med.alternativeNotes || "",
    });
  };

  const saveEdit = (id: string) => {
    updateMedicineItem(id, {
      name: editMedForm.name,
      category: editMedForm.category,
      price: Number(editMedForm.price),
      stock: Number(editMedForm.stock) || 0,
      requiresPrescription: editMedForm.requiresPrescription,
      instructions: editMedForm.instructions,
      available: editMedForm.available,
      alternativeItemName: editMedForm.alternativeItemName,
      alternativeNotes: editMedForm.alternativeNotes,
    });
    setEditingMedId(null);
  };

  return (
    <div className="space-y-6">
      {/* Banner info */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-extrabold text-slate-900 dark:text-white">
            {isAr ? "نظام ربط الأدوية غير المتاحة بالأدوات البديلة المسجلة" : "Pharmacy Substitute Medicine Linking Engine"}
          </h4>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            {isAr
              ? "عند تحديد أي دواء كـ (غير متاح)، يمكنك اختيار دواء بديل مسجل بالصيدلية تحتوي على نفس المادة الفعالة. سيقوم البوت الذكي باقتراح الدواء البديل تلقائياً للعملاء وطمأنتهم معرفع طلب تأكيد للربط بالمخزن الرئيسي."
              : "Link unavailable medicines to registered alternatives in your pharmacy inventory so the AI assistant automatically suggests them during customer chats."}
          </p>
        </div>
      </div>

      {/* Header and Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Pill className="h-4 w-4 text-emerald-500" />
          <span>{isAr ? "مخزون الصيدلية والأدوية المسجلة" : "Pharmacy Medicines Inventory"}</span>
        </h3>

        <button
          onClick={() => setShowAddMed(!showAddMed)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm"
        >
          {showAddMed ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          <span>{showAddMed ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "إضافة دواء جديد" : "Add New Medicine")}</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddMed && (
        <form onSubmit={handleAddMedicine} className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-4">
          <h4 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
            {isAr ? "تسجيل دواء جديد بالمخزون" : "Register New Medicine"}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "اسم الدواء" : "Medicine Name"}</label>
              <input
                type="text"
                required
                placeholder={isAr ? "مثال: بندول اكسترا 500 ملجم" : "e.g. Panadol Extra 500mg"}
                value={medForm.name}
                onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "التصنيف" : "Category"}</label>
              <select
                value={medForm.category}
                onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-emerald-500"
              >
                {defaultCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "السعر (EGP)" : "Price (EGP)"}</label>
              <input
                type="number"
                required
                value={medForm.price}
                onChange={(e) => setMedForm({ ...medForm, price: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "حالة التوفر" : "Status"}</label>
              <button
                type="button"
                onClick={() => setMedForm({ ...medForm, available: !medForm.available })}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  medForm.available
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                }`}
              >
                {medForm.available ? (isAr ? "✅ متاح بالمخزن" : "✅ Available") : (isAr ? "❌ غير متاح / نفد" : "❌ Out of Stock")}
              </button>
            </div>
          </div>

          {/* Alternative medicine selector */}
          <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 mb-1 block flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span>{isAr ? "ربط بدواء بديل مسجل بالصيدلية (عند عدم التوفر)" : "Link Registered Alternative Medicine"}</span>
              </label>
              <select
                value={medForm.alternativeItemName}
                onChange={(e) => {
                  const selName = e.target.value;
                  const selectedMed = availableMedicines.find((m) => m.name === selName);
                  setMedForm({
                    ...medForm,
                    alternativeItemName: selName,
                    alternativeNotes: selectedMed ? (isAr ? `نفس المادة الفعالة - متوفر بسعر ${selectedMed.price} EGP` : `Same active ingredients - ${selectedMed.price} EGP`) : medForm.alternativeNotes,
                  });
                }}
                className="w-full rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? "-- اختر دواء بديل مسجل --" : "-- Select registered substitute --"}</option>
                {availableMedicines.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.price} EGP)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 mb-1 block">
                {isAr ? "ملاحظات الدواء البديل (الجرعة / المادة الفعالة)" : "Substitute Medicine Notes"}
              </label>
              <input
                type="text"
                placeholder={isAr ? "مثال: أدول 500 ملجم يحتوي على الباراسيتامول بنفس المفعول" : "Notes..."}
                value={medForm.alternativeNotes}
                onChange={(e) => setMedForm({ ...medForm, alternativeNotes: e.target.value })}
                className="w-full rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition shadow-sm"
            >
              {isAr ? "حفظ الدواء بالصيدلية" : "Save Medicine"}
            </button>
          </div>
        </form>
      )}

      {/* Medicines Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
              <th className="py-3.5 px-4">{isAr ? "اسم الدواء" : "Medicine Name"}</th>
              <th className="py-3.5 px-4">{isAr ? "التصنيف" : "Category"}</th>
              <th className="py-3.5 px-4">{isAr ? "السعر" : "Price"}</th>
              <th className="py-3.5 px-4">{isAr ? "التوفر بالصيدلية" : "Status"}</th>
              <th className="py-3.5 px-4">{isAr ? "الدواء البديل المربوط بالذكاء الاصطناعي" : "Linked AI Substitute"}</th>
              <th className="py-3.5 px-4 text-center">{isAr ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {workspaceMedicines.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  {isAr ? "لا توجد أدوية مسجلة بالصيدلية حالياً" : "No medicines registered yet"}
                </td>
              </tr>
            ) : (
              workspaceMedicines.map((med) => (
                <tr key={med.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {editingMedId === med.id ? (
                      <input
                        type="text"
                        value={editMedForm.name}
                        onChange={(e) => setEditMedForm({ ...editMedForm, name: e.target.value })}
                        className="w-full rounded border p-1 text-xs"
                      />
                    ) : (
                      <div>
                        <span>{med.name}</span>
                        {med.requiresPrescription && (
                          <span className="mr-2 text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-bold">
                            {isAr ? "روشتة طبعاً" : "Prescription"}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {editingMedId === med.id ? (
                      <select
                        value={editMedForm.category}
                        onChange={(e) => setEditMedForm({ ...editMedForm, category: e.target.value })}
                        className="w-full rounded border p-1 text-xs"
                      >
                        {defaultCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      med.category
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">
                    {editingMedId === med.id ? (
                      <input
                        type="number"
                        value={editMedForm.price}
                        onChange={(e) => setEditMedForm({ ...editMedForm, price: e.target.value })}
                        className="w-20 rounded border p-1 text-xs"
                      />
                    ) : (
                      `${med.price} EGP`
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {editingMedId === med.id ? (
                      <button
                        type="button"
                        onClick={() => setEditMedForm({ ...editMedForm, available: !editMedForm.available })}
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          editMedForm.available ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                        }`}
                      >
                        {editMedForm.available ? "متاح" : "غير متاح"}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateMedicineItem(med.id, { available: !(med.available ?? true) })}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          med.available !== false
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        }`}
                      >
                        {med.available !== false ? (isAr ? "✅ متاح" : "Available") : (isAr ? "❌ غير متاح" : "Out of Stock")}
                      </button>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {editingMedId === med.id ? (
                      <select
                        value={editMedForm.alternativeItemName}
                        onChange={(e) => {
                          const selName = e.target.value;
                          const selectedMed = availableMedicines.find((m) => m.name === selName);
                          setEditMedForm({
                            ...editMedForm,
                            alternativeItemName: selName,
                            alternativeNotes: selectedMed ? (isAr ? `نفس المادة الفعالة - متوفر بسعر ${selectedMed.price} EGP` : `Same active ingredients - ${selectedMed.price} EGP`) : editMedForm.alternativeNotes,
                          });
                        }}
                        className="w-full rounded border p-1 text-xs"
                      >
                        <option value="">{isAr ? "-- اختر دواء بديل مسجل --" : "-- Alternative --"}</option>
                        {availableMedicines.filter((m) => m.id !== med.id).map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name} ({m.price} EGP)
                          </option>
                        ))}
                      </select>
                    ) : med.alternativeItemName ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          <span>{med.alternativeItemName}</span>
                        </span>
                        {med.alternativeNotes && (
                          <span className="text-[10px] text-slate-400">{med.alternativeNotes}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">{isAr ? "لم يربط بديل بعد" : "No substitute linked"}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {editingMedId === med.id ? (
                      <button
                        onClick={() => saveEdit(med.id)}
                        className="p-1 text-emerald-600 hover:text-emerald-500 font-bold"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(med)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMedicineItem(med.id)}
                          className="p-1 text-rose-500 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
