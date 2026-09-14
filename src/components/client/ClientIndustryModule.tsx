import React from "react";
import { useApp } from "../../context/AppContext";
import { Sparkles, Calendar, UtensilsCrossed, Pill, Store, BookOpen } from "lucide-react";

import { StoreInventoryManager } from "./store/StoreInventoryManager";
import { PharmacyInventoryManager } from "./pharmacy/PharmacyInventoryManager";
import { RestaurantInventoryManager } from "./restaurant/RestaurantInventoryManager";
import { ClientClinicModule } from "./ClientClinicModule";
import { ClientCourseModule } from "./ClientCourseModule";

export const ClientIndustryModule: React.FC = () => {
  const { currentWorkspace, language } = useApp();
  const isAr = language === "ar";

  if (!currentWorkspace) return null;

  const industry = currentWorkspace.industry;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            {industry === "Clinic" && <Calendar className="h-6 w-6 text-emerald-500" />}
            {industry === "Restaurant" && <UtensilsCrossed className="h-6 w-6 text-orange-500" />}
            {industry === "Pharmacy" && <Pill className="h-6 w-6 text-emerald-500" />}
            {industry === "Course Center" && <BookOpen className="h-6 w-6 text-indigo-500" />}
            {(industry === "Retail" || industry === "Small Business") && <Store className="h-6 w-6 text-amber-500" />}
            
            {isAr 
              ? `إدارة بيئة العمل - ${industry}` 
              : `Industry Module - ${industry}`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? "إدارة الخدمات، الأقسام، المنتجات، الأدوية والأطباق مع ربط الأصناف غير المتاحة ببدائل مسجلة تلقائياً."
              : "Manage services, products, medicines & dishes with automatic substitute linking for unavailable items."}
          </p>
        </div>
      </div>

      {industry === "Clinic" && <ClientClinicModule />}
      {industry === "Course Center" && <ClientCourseModule />}
      {industry === "Pharmacy" && <PharmacyInventoryManager />}
      {industry === "Restaurant" && <RestaurantInventoryManager />}
      {(industry === "Retail" || industry === "Small Business") && <StoreInventoryManager />}
    </div>
  );
};
