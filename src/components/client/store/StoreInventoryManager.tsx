import React, { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { Plus, Trash2, Tag, Box, X, Edit2, Check, XCircle } from "lucide-react";

export const StoreInventoryManager: React.FC = () => {
  const { currentWorkspace, products, addProductItem, updateProductItem, deleteProductItem, language, updateWorkspace } = useApp();
  const isAr = language === "ar";
  
  const [categories, setCategories] = useState<string[]>(currentWorkspace?.aiSettings?.categories || []);
  const [newCat, setNewCat] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ old: string, new: string } | null>(null);

  const [showAddProd, setShowAddProd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  
  const [prodForm, setProdForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    sku: "",
    available: true,
    alternativeItemName: "",
    alternativeNotes: "",
  });

  const [editProdForm, setEditProdForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    sku: "",
    available: true,
    alternativeItemName: "",
    alternativeNotes: "",
  });

  const handleAddCategory = () => {
    if (!newCat.trim()) return;
    if (categories.includes(newCat.trim())) return;
    const updated = [...categories, newCat.trim()];
    setCategories(updated);
    setNewCat("");
    if (currentWorkspace) {
      updateWorkspace(currentWorkspace.id, {
        aiSettings: {
          ...currentWorkspace.aiSettings!,
          categories: updated
        }
      });
    }
  };

  const handleRemoveCategory = (cat: string) => {
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    if (currentWorkspace) {
      updateWorkspace(currentWorkspace.id, {
        aiSettings: {
          ...currentWorkspace.aiSettings!,
          categories: updated
        }
      });
    }
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !editingCategory.new.trim()) return;
    const updated = categories.map(c => c === editingCategory.old ? editingCategory.new.trim() : c);
    setCategories(updated);
    setEditingCategory(null);
    if (currentWorkspace) {
      updateWorkspace(currentWorkspace.id, {
        aiSettings: {
          ...currentWorkspace.aiSettings!,
          categories: updated
        }
      });
    }
  };

  const handleAddProduct = () => {
    if (!prodForm.name || !prodForm.category || !prodForm.price) return;
    addProductItem({
      workspaceId: currentWorkspace!.id,
      name: prodForm.name,
      category: prodForm.category,
      price: Number(prodForm.price),
      stock: Number(prodForm.stock) || 0,
      sku: prodForm.sku || `SKU-${Math.floor(Math.random()*10000)}`,
      available: prodForm.available,
      alternativeItemName: prodForm.alternativeItemName,
      alternativeNotes: prodForm.alternativeNotes
    });
    setProdForm({ name: "", category: categories[0] || "", price: "", stock: "", sku: "", available: true, alternativeItemName: "", alternativeNotes: "" });
    setShowAddProd(false);
  };

  const startEditProduct = (prod: any) => {
    setEditingProduct(prod.id);
    setEditProdForm({
      name: prod.name,
      category: prod.category,
      price: String(prod.price),
      stock: String(prod.stock),
      sku: prod.sku,
      available: prod.available ?? true,
      alternativeItemName: prod.alternativeItemName || "",
      alternativeNotes: prod.alternativeNotes || ""
    });
  };

  const handleUpdateProduct = (id: string) => {
    if (!editProdForm.name || !editProdForm.category || !editProdForm.price) return;
    updateProductItem(id, {
      name: editProdForm.name,
      category: editProdForm.category,
      price: Number(editProdForm.price),
      stock: Number(editProdForm.stock) || 0,
      sku: editProdForm.sku,
      available: editProdForm.available,
      alternativeItemName: editProdForm.alternativeItemName,
      alternativeNotes: editProdForm.alternativeNotes
    });
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Categories Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Tag className="h-4 w-4 text-orange-500" />
          {isAr ? "إدارة الأقسام (Categories)" : "Manage Categories"}
        </h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <div key={c} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              {editingCategory?.old === c ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingCategory.new}
                    onChange={(e) => setEditingCategory({ ...editingCategory, new: e.target.value })}
                    className="w-24 text-xs px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 outline-none"
                    autoFocus
                  />
                  <button onClick={handleUpdateCategory} className="text-emerald-500 hover:text-emerald-600">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-rose-500">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{c}</span>
                  <button onClick={() => setEditingCategory({ old: c, new: c })} className="text-slate-400 hover:text-blue-500 transition ml-2">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleRemoveCategory(c)} className="text-slate-400 hover:text-rose-500 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 max-w-sm">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder={isAr ? "اسم القسم الجديد (مثال: لحوم)" : "New category (e.g. Meats)"}
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
          <button
            onClick={handleAddCategory}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition"
          >
            <Plus className="h-3.5 w-3.5" /> {isAr ? "إضافة" : "Add"}
          </button>
        </div>
      </div>

      {/* Products Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Box className="h-4 w-4 text-orange-500" />
            {isAr ? "إدارة المنتجات" : "Manage Products"}
          </h3>
          <button
            onClick={() => setShowAddProd(!showAddProd)}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition shadow-sm shadow-orange-500/20"
          >
            {showAddProd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {isAr ? (showAddProd ? "إلغاء" : "إضافة منتج") : (showAddProd ? "Cancel" : "Add Product")}
          </button>
        </div>

        {showAddProd && (
          <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "اسم المنتج" : "Name"}</label>
                <input type="text" value={prodForm.name} onChange={(e) => setProdForm({...prodForm, name: e.target.value})} className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "القسم" : "Category"}</label>
                <select value={prodForm.category} onChange={(e) => setProdForm({...prodForm, category: e.target.value})} className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                  <option value="">{isAr ? "اختر..." : "Select..."}</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "السعر (EGP)" : "Price"}</label>
                <input type="number" value={prodForm.price} onChange={(e) => setProdForm({...prodForm, price: e.target.value})} className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "المخزون" : "Stock"}</label>
                <input type="number" value={prodForm.stock} onChange={(e) => setProdForm({...prodForm, stock: e.target.value})} className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "حالة التوفر" : "Availability"}</label>
                <button
                  type="button"
                  onClick={() => setProdForm({ ...prodForm, available: !prodForm.available })}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    prodForm.available 
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {prodForm.available ? (isAr ? "✅ متاح بالمتجر" : "✅ Available") : (isAr ? "❌ غير متاح" : "❌ Out of Stock")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "ربط بمنتج بديل مسجل بالمخزن" : "Link Registered Alternative Product"}</label>
                <select
                  value={prodForm.alternativeItemName}
                  onChange={(e) => {
                    const selName = e.target.value;
                    const selectedProd = products.find(p => p.name === selName);
                    setProdForm({
                      ...prodForm,
                      alternativeItemName: selName,
                      alternativeNotes: selectedProd ? (isAr ? `متوفر بسعر ${selectedProd.price} EGP` : `Available for ${selectedProd.price} EGP`) : prodForm.alternativeNotes
                    });
                  }}
                  className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-orange-500"
                >
                  <option value="">{isAr ? "-- اختر منتج بديل مسجل --" : "-- Select registered alternative --"}</option>
                  {products.filter(p => p.available !== false).map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.price} EGP)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">{isAr ? "ملاحظات البديل / تفاصيل العرض" : "Alternative Notes"}</label>
                <input
                  type="text"
                  placeholder={isAr ? "مثال: قطن 100% بنفس الجودة بسعر 790 جنيه" : "Notes about alternative"}
                  value={prodForm.alternativeNotes}
                  onChange={(e) => setProdForm({ ...prodForm, alternativeNotes: e.target.value })}
                  className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={handleAddProduct} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition shadow-sm">
                {isAr ? "حفظ المنتج" : "Save Product"}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="py-3 px-4">{isAr ? "المنتج" : "Product Name"}</th>
                <th className="py-3 px-4">{isAr ? "القسم" : "Category"}</th>
                <th className="py-3 px-4">{isAr ? "السعر" : "Price"}</th>
                <th className="py-3 px-4">{isAr ? "المخزون" : "Stock"}</th>
                <th className="py-3 px-4">{isAr ? "حالة التوفر" : "Availability"}</th>
                <th className="py-3 px-4">{isAr ? "المنتج البديل" : "Alternative Item"}</th>
                <th className="py-3 px-4 text-right">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products
                .filter((p) => p.workspaceId === currentWorkspace?.id)
                .map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {editingProduct === prod.id ? (
                        <input type="text" value={editProdForm.name} onChange={e => setEditProdForm({...editProdForm, name: e.target.value})} className="w-full min-w-[120px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none" />
                      ) : prod.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                      {editingProduct === prod.id ? (
                        <select value={editProdForm.category} onChange={e => setEditProdForm({...editProdForm, category: e.target.value})} className="w-full min-w-[100px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none">
                          <option value="">...</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : prod.category}
                    </td>
                    <td className="py-3.5 px-4 font-black text-amber-600 dark:text-amber-400 text-sm">
                      {editingProduct === prod.id ? (
                        <input type="number" value={editProdForm.price} onChange={e => setEditProdForm({...editProdForm, price: e.target.value})} className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none" />
                      ) : `${prod.price} EGP`}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {editingProduct === prod.id ? (
                        <input type="number" value={editProdForm.stock} onChange={e => setEditProdForm({...editProdForm, stock: e.target.value})} className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none" />
                      ) : prod.stock}
                    </td>
                    <td className="py-3.5 px-4">
                      {editingProduct === prod.id ? (
                        <button
                          type="button"
                          onClick={() => setEditProdForm({ ...editProdForm, available: !editProdForm.available })}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                            editProdForm.available ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"
                          }`}
                        >
                          {editProdForm.available ? (isAr ? "متاح" : "Available") : (isAr ? "غير متاح" : "Unavailable")}
                        </button>
                      ) : (
                        <button
                          onClick={() => updateProductItem(prod.id, { available: !(prod.available ?? true) })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition ${
                            prod.available ?? true
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200"
                          }`}
                        >
                          {prod.available ?? true ? (isAr ? "✅ متاح" : "Available") : (isAr ? "❌ غير متاح" : "Out of Stock")}
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {editingProduct === prod.id ? (
                        <select
                          value={editProdForm.alternativeItemName}
                          onChange={(e) => {
                            const selName = e.target.value;
                            const selectedProd = products.find(p => p.name === selName);
                            setEditProdForm({
                              ...editProdForm,
                              alternativeItemName: selName,
                              alternativeNotes: selectedProd ? (isAr ? `متوفر بسعر ${selectedProd.price} EGP` : `Available for ${selectedProd.price} EGP`) : editProdForm.alternativeNotes
                            });
                          }}
                          className="w-full min-w-[130px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none"
                        >
                          <option value="">{isAr ? "-- اختر منتج بديل مسجل --" : "-- Alternative --"}</option>
                          {products.filter(p => p.available !== false && p.id !== prod.id).map(p => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({p.price} EGP)
                            </option>
                          ))}
                        </select>
                      ) : (
                        prod.alternativeItemName ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{prod.alternativeItemName}</span>
                            {prod.alternativeNotes && <span className="text-[10px] text-slate-400">{prod.alternativeNotes}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">{isAr ? "لم يحدد" : "None"}</span>
                        )
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {editingProduct === prod.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleUpdateProduct(prod.id)} className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white p-1.5 rounded-md transition">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditingProduct(null)} className="bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-md transition">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditProduct(prod)} className="text-slate-400 hover:text-blue-500 p-1 rounded-md transition">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteProductItem(prod.id)} className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              {products.filter((p) => p.workspaceId === currentWorkspace?.id).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 font-medium text-xs">
                    {isAr ? "لا توجد منتجات مضافة." : "No products found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
