export interface TenantClinicService {
  name?: string;
  price?: number;
  durationMinutes?: number;
  description?: string;
  available?: boolean;
}

export interface TenantDoctor {
  name?: string;
  specialty?: string;
  consultationFeeEGP?: number;
}

export interface TenantCoupon {
  code?: string;
  discountType?: "percentage" | "fixed" | string;
  discountValue?: number;
  condition?: string;
  isActive?: boolean;
  aiCanUse?: boolean;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  usageCount?: number;
}

export interface TenantKnowledgeFact {
  question?: string;
  answer?: string;
  approved?: boolean;
}

export interface TenantCatalogItem {
  name?: string;
  price?: number;
  description?: string;
  available?: boolean;
}

export interface TenantBusinessInquiryContext {
  businessName?: string;
  industry?: string;
  businessDescription?: string;
  workingHours?: string;
  clinicServices?: TenantClinicService[];
  doctors?: TenantDoctor[];
  coupons?: TenantCoupon[];
  knowledgeBase?: TenantKnowledgeFact[];
  menu?: TenantCatalogItem[];
  medicines?: TenantCatalogItem[];
  products?: TenantCatalogItem[];
  courses?: TenantCatalogItem[];
}

export interface TenantBusinessInquiryAnswer {
  intent: "pricing" | "services" | "offers" | "hours" | "business_info" | "thanks";
  response: string;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function dateKey(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function availableServices(context: TenantBusinessInquiryContext) {
  return (context.clinicServices || []).filter(
    (service) => service.available !== false && clean(service.name),
  );
}

function pricedDoctors(context: TenantBusinessInquiryContext) {
  return (context.doctors || []).filter(
    (doctor) =>
      clean(doctor.name) &&
      Number.isFinite(Number(doctor.consultationFeeEGP)) &&
      Number(doctor.consultationFeeEGP) > 0,
  );
}

function availableIndustryCatalog(context: TenantBusinessInquiryContext) {
  const industry = clean(context.industry).toLowerCase();
  const catalog = industry === "restaurant"
    ? context.menu
    : industry === "pharmacy"
      ? context.medicines
      : industry === "retail"
        ? context.products
        : industry === "course center"
          ? context.courses
          : [];

  return (catalog || []).filter(
    (item) => item.available !== false && clean(item.name),
  );
}

function eligibleCoupons(context: TenantBusinessInquiryContext, now: Date) {
  const today = dateKey(now);

  return (context.coupons || []).filter((coupon) => {
    if (
      coupon.isActive !== true ||
      coupon.aiCanUse !== true ||
      !clean(coupon.code)
    ) {
      return false;
    }

    const validFrom = clean(coupon.validFrom);
    const validUntil = clean(coupon.validUntil);
    if (validFrom && today < validFrom) return false;
    if (validUntil && today > validUntil) return false;

    const usageLimit = Number(coupon.usageLimit || 0);
    const usageCount = Number(coupon.usageCount || 0);
    return usageLimit <= 0 || usageCount < usageLimit;
  });
}

function priceLine(label: string, value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? `• ${label}: ${amount} جنيه`
    : `• ${label}: السعر غير محدد`;
}

function hasFreshBookingIntent(message: string): boolean {
  return /(عاوز|عايز|أريد|اريد)?\s*(أ?حجز|حجز\s*موعد)|book\s+(?:an?\s+)?appointment|reserve/i.test(
    message,
  );
}

/**
 * Answers factual, high-frequency business inquiries without an LLM.
 * The caller must provide data already scoped to one authoritative workspace.
 * Returning null delegates non-matching messages to the normal router.
 */
export function answerTenantBusinessInquiry(
  message: string,
  context: TenantBusinessInquiryContext,
  now = new Date(),
): TenantBusinessInquiryAnswer | null {
  const normalized = clean(message).toLowerCase();
  if (!normalized || hasFreshBookingIntent(normalized)) return null;

  if (/^(شكرا|شكراً|متشكر|تسلم|thanks|thank you)[!.،\s؟?]*$/i.test(normalized)) {
    return {
      intent: "thanks",
      response: "العفو، تحت أمرك في أي وقت 🙏",
    };
  }

  if (/(عرض|عروض|خصم|خصومات|offer|offers|discount|promotion)/i.test(normalized)) {
    const coupons = eligibleCoupons(context, now);
    if (!coupons.length) {
      return {
        intent: "offers",
        response: "لا توجد عروض متاحة حالياً في بيانات النشاط.",
      };
    }

    const lines = coupons.map((coupon) => {
      const value = Number(coupon.discountValue || 0);
      const discount = coupon.discountType === "percentage"
        ? `${value}%`
        : `${value} جنيه`;
      const condition = clean(coupon.condition);
      return `• ${clean(coupon.code)}: خصم ${discount}${condition ? ` — ${condition}` : ""}`;
    });

    return {
      intent: "offers",
      response: `العروض المتاحة حالياً:\n${lines.join("\n")}`,
    };
  }

  if (/(مواعيدكم|مواعيد العمل|ساعات العمل|بتفتحوا|بتقفلوا|working hours|opening hours|when are you open)/i.test(normalized)) {
    const hours = clean(context.workingHours);
    return {
      intent: "hours",
      response: hours
        ? `مواعيد العمل: ${hours}`
        : "مواعيد العمل غير مضافة حالياً في بيانات النشاط.",
    };
  }

  if (/(سعر|اسعار|أسعار|تكلفة|بكام|كام\s*(?:اصلا|أصلاً)?|price|prices|cost|fee)/i.test(normalized)) {
    const serviceLines = availableServices(context).map((service) =>
      priceLine(clean(service.name), service.price),
    );
    const doctorLines = pricedDoctors(context).map((doctor) =>
      priceLine(
        `كشف د. ${clean(doctor.name)}${clean(doctor.specialty) ? ` (${clean(doctor.specialty)})` : ""}`,
        doctor.consultationFeeEGP,
      ),
    );
    const catalogLines = availableIndustryCatalog(context).map((item) =>
      priceLine(clean(item.name), item.price),
    );
    const lines = [...serviceLines, ...doctorLines, ...catalogLines];

    return {
      intent: "pricing",
      response: lines.length
        ? `الأسعار المسجلة حالياً:\n${lines.join("\n")}`
        : "لا توجد أسعار مضافة حالياً في بيانات النشاط.",
    };
  }

  if (/^(الخدمات|خدماتكم|ايه الخدمات|إيه الخدمات|services|what services)[!.،\s؟?]*$/i.test(normalized)) {
    const services = availableServices(context);
    const serviceLines = services.map((service) => {
      const description = clean(service.description);
      const duration = Number(service.durationMinutes || 0);
      return `• ${clean(service.name)}${Number.isFinite(Number(service.price)) ? ` — ${Number(service.price)} جنيه` : ""}${duration > 0 ? ` — ${duration} دقيقة` : ""}${description ? ` — ${description}` : ""}`;
    });
    const catalogLines = availableIndustryCatalog(context).map((item) => {
      const description = clean(item.description);
      return `• ${clean(item.name)}${Number.isFinite(Number(item.price)) ? ` — ${Number(item.price)} جنيه` : ""}${description ? ` — ${description}` : ""}`;
    });
    const lines = [...serviceLines, ...catalogLines];

    return {
      intent: "services",
      response: lines.length
        ? `الخدمات المتاحة حالياً:\n${lines.join("\n")}`
        : "لا توجد خدمات مضافة حالياً في بيانات النشاط.",
    };
  }

  if (/(مميزات|المميزات|ميزة|نبذة|عن العيادة|عنكم|features|about)/i.test(normalized)) {
    const approvedAnswers = (context.knowledgeBase || [])
      .filter((fact) => fact.approved === true && clean(fact.answer))
      .map((fact) => clean(fact.answer));
    const details = [
      clean(context.businessDescription),
      ...approvedAnswers,
    ].filter((value, index, all) => value && all.indexOf(value) === index);

    return {
      intent: "business_info",
      response: details.length
        ? details.join("\n")
        : "لا توجد معلومات إضافية معتمدة حالياً في بيانات النشاط.",
    };
  }

  return null;
}
