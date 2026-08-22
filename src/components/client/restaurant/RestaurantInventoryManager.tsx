import React, { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { UtensilsCrossed, Plus, Trash2, Edit2, Check, X, RefreshCw, Sparkles } from "lucide-react";

export const RestaurantInventoryManager: React.FC = () => {
  const { currentWorkspace, menuItems, addMenuItem, updateMenuItem, deleteMenuItem, language } = useApp();
  const isAr = language === "ar";

  const [showAddDish, setShowAddDish] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  const defaultCategories = isAr
    ? ["وجبات رئيسية", "مشويات", "مقبلات وسلطات", "مشروبات وعصائر", "حلويات", "عروض وجبات"]
    : ["Main Dishes", "Grill", "Appetizers & Salads", "Beverages & Juices", "Desserts", "Combo Deals"];

  const [dishForm, setDishForm] = useState({
    name: "",
    category: defaultCategories[0],
    price: "",
    description: "",
    available: true,
    alternativeItemName: "",
    alternativeNotes: "",
  });

  const [editDishForm, setEditDishForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    available: true,
    alternativeItemName: "",
    alternativeNotes: "",
  });

  if (!currentWorkspace) return null;

  const workspaceMenuItems = menuItems.filter((m) => m.workspaceId === currentWorkspace.id);
  const availableMenuItems = workspaceMenuItems.filter((m) => m.available !== false);

  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishForm.name.trim() || !dishForm.price) return;

    addMenuItem({
      workspaceId: currentWorkspace.id,
      name: dishForm.name.trim(),
      category: dishForm.category,
      price: Number(dishForm.price),
      description: dishForm.description,
      available: dishForm.available,
      alternativeItemName: dishForm.alternativeItemName,
      alternativeNotes: dishForm.alternativeNotes,
    });

    setDishForm({
      name: "",
      category: defaultCategories[0],
      price: "",
      description: "",
      available: true,
      alternativeItemName: "",
      alternativeNotes: "",
    });
    setShowAddDish(false);
  };

  const startEdit = (dish: any) => {
    setEditingDishId(dish.id);
    setEditDishForm({
      name: dish.name,
      category: dish.category,
      price: String(dish.price),
      description: dish.description || "",
      available: dish.available !== false,
      alternativeItemName: dish.alternativeItemName || "",
      alternativeNotes: dish.alternativeNotes || "",
    });
  };

  const saveEdit = (id: string) => {
    updateMenuItem(id, {
      name: editDishForm.name,
      category: editDishForm.category,
      price: Number(editDishForm.price),
      description: editDishForm.description,
      available: editDishForm.available,
      alternativeItemName: editDishForm.alternativeItemName,
      alternativeNotes: editDishForm.alternativeNotes,
    });
    setEditingDishId(null);
  };

  return (
    <div className="space-y-6">
      {/* Banner info */}
      <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-extrabold text-slate-900 dark:text-white">
            {isAr ? "نظام ربط الأطباق والمشروبات غير المتاحة بأطباق بديلة مسجلة" : "Restaurant Substitute Dish Linking Engine"}
          </h4>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            {isAr
              ? "عند تحديد أي صنف أو وجبة كـ (نفدت / غير متاحة اليوم)، يمكنك اختيار طبق بديل مسجل بالمنيو ليقترحه الذكاء الاصطناعي فوراً للعملاء عبر واتساب وتليجرام."
              : "Link unavailable menu items to registered substitute dishes so your AI agent suggests delicious alternatives automatically."}
          </p>
        </div>
      </div>

      {/* Header and Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-orange-500" />
          <span>{isAr ? "قائمة أطباق ووجبات المطعم" : "Restaurant Menu Items"}</span>
        </h3>

        <button
          onClick={() => setShowAddDish(!showAddDish)}
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition shadow-sm"
        >
          {showAddDish ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          <span>{showAddDish ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "إضافة صنف/طبق جديد" : "Add New Dish")}</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddDish && (
        <form onSubmit={handleAddDish} className="p-5 rounded-2xl border border-orange-200 bg-orange-50/30 dark:border-orange-900/40 dark:bg-orange-950/20 space-y-4">
          <h4 className="text-xs font-extrabold text-orange-900 dark:text-orange-300">
            {isAr ? "تسجيل طبق جديد بالمنيو" : "Register New Dish"}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "اسم الطبق/المنتج" : "Dish Name"}</label>
              <input
                type="text"
                required
                placeholder={isAr ? "مثال: برجر دجاج كرسبي سوبريم" : "e.g. Crispy Chicken Supreme"}
                value={dishForm.name}
                onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "قسم المنيو" : "Category"}</label>
              <select
                value={dishForm.category}
                onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-orange-500"
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
                value={dishForm.price}
                onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "حالة التوفر اليوم" : "Availability"}</label>
              <button
                type="button"
                onClick={() => setDishForm({ ...dishForm, available: !dishForm.available })}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  dishForm.available
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                }`}
              >
                {dishForm.available ? (isAr ? "✅ متاح بالمنيو" : "✅ Available") : (isAr ? "❌ غير متاح / نفد" : "❌ Out of Stock")}
              </button>
            </div>
          </div>

          {/* Alternative Dish Selector */}
          <div className="pt-3 border-t border-orange-200/60 dark:border-orange-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-orange-800 dark:text-orange-300 mb-1 block flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span>{isAr ? "ربط بطبق بديل مسجل بالمنيو (عند عدم التوفر)" : "Link Registered Substitute Dish"}</span>
              </label>
              <select
                value={dishForm.alternativeItemName}
                onChange={(e) => {
                  const selName = e.target.value;
                  const selectedDish = availableMenuItems.find((m) => m.name === selName);
                  setDishForm({
                    ...dishForm,
                    alternativeItemName: selName,
                    alternativeNotes: selectedDish ? (isAr ? `طبق بديل بنفس الطعم والجودة بسعر ${selectedDish.price} EGP` : `Substitute dish available for ${selectedDish.price} EGP`) : dishForm.alternativeNotes,
                  });
                }}
                className="w-full rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-orange-500"
              >
                <option value="">{isAr ? "-- اختر طبق بديل مسجل --" : "-- Select registered substitute --"}</option>
                {availableMenuItems.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.price} EGP)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-orange-800 dark:text-orange-300 mb-1 block">
                {isAr ? "ملاحظات وتفاصيل الطبق البديل" : "Substitute Dish Notes"}
              </label>
              <input
                type="text"
                placeholder={isAr ? "مثال: وجبة كرسبي حارة بنفس الحجم والصلصة" : "Notes..."}
                value={dishForm.alternativeNotes}
                onChange={(e) => setDishForm({ ...dishForm, alternativeNotes: e.target.value })}
                className="w-full rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition shadow-sm"
            >
              {isAr ? "حفظ الطبق بالمنيو" : "Save Dish"}
            </button>
          </div>
        </form>
      )}

      {/* Dishes Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
              <th className="py-3.5 px-4">{isAr ? "اسم الصنف/الطبق" : "Dish Name"}</th>
              <th className="py-3.5 px-4">{isAr ? "القسم" : "Category"}</th>
              <th className="py-3.5 px-4">{isAr ? "السعر" : "Price"}</th>
              <th className="py-3.5 px-4">{isAr ? "حالة التوفر اليوم" : "Status"}</th>
              <th className="py-3.5 px-4">{isAr ? "الطبق البديل المربوط بالذكاء الاصطناعي" : "Linked AI Substitute"}</th>
              <th className="py-3.5 px-4 text-center">{isAr ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {workspaceMenuItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  {isAr ? "لا توجد أصناف مسجلة بالمنيو حالياً" : "No dishes registered yet"}
                </td>
              </tr>
            ) : (
              workspaceMenuItems.map((dish) => (
                <tr key={dish.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {editingDishId === dish.id ? (
                      <input
                        type="text"
                        value={editDishForm.name}
                        onChange={(e) => setEditDishForm({ ...editDishForm, name: e.target.value })}
                        className="w-full rounded border p-1 text-xs"
                      />
                    ) : (
                      dish.name
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {editingDishId === dish.id ? (
                      <select
                        value={editDishForm.category}
                        onChange={(e) => setEditDishForm({ ...editDishForm, category: e.target.value })}
                        className="w-full rounded border p-1 text-xs"
                      >
                        {defaultCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      dish.category
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-black text-amber-600 dark:text-amber-400">
                    {editingDishId === dish.id ? (
                      <input
                        type="number"
                        value={editDishForm.price}
                        onChange={(e) => setEditDishForm({ ...editDishForm, price: e.target.value })}
                        className="w-20 rounded border p-1 text-xs"
                      />
                    ) : (
                      `${dish.price} EGP`
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {editingDishId === dish.id ? (
                      <button
                        type="button"
                        onClick={() => setEditDishForm({ ...editDishForm, available: !editDishForm.available })}
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          editDishForm.available ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                        }`}
                      >
                        {editDishForm.available ? "متاح" : "غير متاح"}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateMenuItem(dish.id, { available: !(dish.available ?? true) })}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          dish.available !== false
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        }`}
                      >
                        {dish.available !== false ? (isAr ? "✅ متاح" : "Available") : (isAr ? "❌ غير متاح" : "Out of Stock")}
                      </button>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {editingDishId === dish.id ? (
                      <select
                        value={editDishForm.alternativeItemName}
                        onChange={(e) => {
                          const selName = e.target.value;
                          const selectedDish = availableMenuItems.find((m) => m.name === selName);
                          setEditDishForm({
                            ...editDishForm,
                            alternativeItemName: selName,
                            alternativeNotes: selectedDish ? (isAr ? `طبق بديل بنفس الطعم والجودة بسعر ${selectedDish.price} EGP` : `Substitute dish available for ${selectedDish.price} EGP`) : editDishForm.alternativeNotes,
                          });
                        }}
                        className="w-full rounded border p-1 text-xs"
                      >
                        <option value="">{isAr ? "-- اختر طبق بديل مسجل --" : "-- Alternative --"}</option>
                        {availableMenuItems.filter((m) => m.id !== dish.id).map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name} ({m.price} EGP)
                          </option>
                        ))}
                      </select>
                    ) : dish.alternativeItemName ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          <span>{dish.alternativeItemName}</span>
                        </span>
                        {dish.alternativeNotes && (
                          <span className="text-[10px] text-slate-400">{dish.alternativeNotes}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">{isAr ? "لم يربط بديل بعد" : "No substitute linked"}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {editingDishId === dish.id ? (
                      <button
                        onClick={() => saveEdit(dish.id)}
                        className="p-1 text-emerald-600 hover:text-emerald-500 font-bold"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(dish)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMenuItem(dish.id)}
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
