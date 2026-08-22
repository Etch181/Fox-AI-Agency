import { collection, doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useApp } from "../context/AppContext";

export type Language = "ar" | "en";
export type TextDirection = "rtl" | "ltr";

export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}

// In-memory cache of dynamic Firestore translations
export const dynamicTranslations: Record<Language, TranslationDictionary> = {
  ar: {},
  en: {},
};

// Deep merge helper
function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== "object") return target;
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      output[key] = deepMerge(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

export const translations: Record<Language, TranslationDictionary> = {
  ar: {
    common: {
      save: "حفظ",
      cancel: "إلغاء",
      delete: "حذف",
      edit: "تعديل",
      create: "إنشاء",
      search: "بحث...",
      filter: "تصفية",
      status: "الحالة",
      active: "نشط",
      pending: "قيد الانتظار",
      suspended: "موقوف",
      close: "إغلاق",
      back: "الرجوع",
      loading: "جاري التحميل...",
      success: "تمت العملية بنجاح",
      error: "حدث خطأ غير متوقع",
      actions: "الإجراءات",
      confirm: "تأكيد",
      view: "عرض",
      details: "التفاصيل",
      language: "اللغة",
      arabic: "العربية",
      english: "English",
      theme: "المظهر",
      logout: "تسجيل الخروج",
      login: "تسجيل الدخول",
      register: "إنشاء حساب جديد",
      unlimited: "غير محدود",
    },
    nav: {
      dashboard: "لوحة التحكم الرئيسية",
      crm: "إدارة العملاء والفرص CRM",
      industryModule: "وحدة النشاط التجاري",
      appointments: "حجوزات المواعيد",
      complaints: "الشكاوى والمتابعات",
      aiSettings: "إعدادات الذكاء الاصطناعي",
      telegramToken: "ربط بوت تليجرام",
      liveChat: "محاكي الرد الآلي المباشر",
      subscription: "الاشتراك وInstapay",
      n8nWorkflows: "سير أتمتة n8n",
      staff: "إدارة الموظفين والصلاحيات",
      clients: "إدارة المشتركين",
      plans: "باقات الاشتراكات",
      agencyDashboard: "لوحة أدمين الوكالة",
    },
    workspace: {
      guardTitle: "تنبيه جدار حماية مساحة العمل (Workspace Isolation Guard)",
      guardBlocked: "تم حظر طلب البيانات لمنع التداخل بين العملاء. حسابك المسجل مسند حصرياً لمساحة العمل [{workspaceId}]",
      guardActive: "حماية عزل البيانات مفعلة (Workspace Guard Active):",
      currentPlan: "الخطة الحالية",
      usage: "الاستهلاك",
      owner: "المالك",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      statusActive: "الحساب نشط",
      statusPending: "قيد المراجعة",
    },
    auth: {
      welcome: "مرحباً بك في منصة Fox AI Agency",
      loginTitle: "تسجيل الدخول للحساب",
      registerTitle: "إنشاء حساب مشترك جديد",
      emailPlaceholder: "البريد الإلكتروني",
      passwordPlaceholder: "كلمة المرور",
      loginBtn: "دخول المنصة",
      registerBtn: "إنشاء الحساب والتفعيل",
      selectPlan: "اختر خطة الاشتراك",
      instapayNotice: "الدفع الفوري والتفعيل متوفر عبر Instapay EGP",
    },
    pricing: {
      title: "خطط وأسعار الاشتراكات",
      subtitle: "اختر الخطة المناسبة لحجم أعمالك بالجنيه المصري EGP",
      monthly: "الدفع الشهري",
      yearly: "الدفع السنوي (خصم 20%)",
      starter: "Fox Starter",
      business: "Fox Business",
      enterprise: "Fox Enterprise",
      choosePlan: "الاشتراك في الباقة",
      trialBtn: "بدء التجربة المجانية",
      instapayFoot: "تفعيل فوري عبر Instapay أو كود التفعيل",
    },
    telegram: {
      tokenTitle: "ربط Telegram Access Token",
      botUsername: "اسم المستخدم للبوت",
      saveToken: "حفظ التوكن",
      connected: "مربوط بنجاح",
      disconnected: "غير مربوط",
      tokenGuide: "إرشادات الحصول على Token عبر @BotFather",
    },
    crm: {
      totalCustomers: "إجمالي العملاء المسجلين",
      addCustomer: "إضافة عميل جديد",
      customerName: "اسم العميل",
      phone: "رقم الهاتف",
      stage: "المرحلة",
      notes: "ملاحظات",
    },
    ai: {
      agentName: "اسم وكيل الذكاء الاصطناعي",
      systemPrompt: "تعليمات ونبرة الوكيل (System Prompt)",
      autoReply: "الرد الآلي التلقائي",
      knowledgeBase: "قاعدة المعرفة والحقائق",
      pendingFacts: "حقائق معلقة تنتظر الاعتماد",
    },
  },
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      search: "Search...",
      filter: "Filter",
      status: "Status",
      active: "Active",
      pending: "Pending",
      suspended: "Suspended",
      close: "Close",
      back: "Back",
      loading: "Loading...",
      success: "Action completed successfully",
      error: "An unexpected error occurred",
      actions: "Actions",
      confirm: "Confirm",
      view: "View",
      details: "Details",
      language: "Language",
      arabic: "العربية",
      english: "English",
      theme: "Theme",
      logout: "Log Out",
      login: "Log In",
      register: "Create Account",
      unlimited: "Unlimited",
    },
    nav: {
      dashboard: "Main Dashboard",
      crm: "CRM & Leads Management",
      industryModule: "Industry Module",
      appointments: "Appointments",
      complaints: "Complaints & Feedback",
      aiSettings: "AI Agent Settings",
      telegramToken: "Telegram Bot Integration",
      liveChat: "Live AI Simulator",
      subscription: "Subscription & Instapay",
      n8nWorkflows: "n8n Automation",
      staff: "Staff & Permissions",
      clients: "Clients Management",
      plans: "Subscription Plans",
      agencyDashboard: "Agency Admin Board",
    },
    workspace: {
      guardTitle: "Workspace Isolation Violation Blocked",
      guardBlocked: "Access blocked to enforce cross-tenant privacy. Your account is scoped strictly to workspaceId [{workspaceId}].",
      guardActive: "Workspace Tenant Guard Active:",
      currentPlan: "Current Plan",
      usage: "Usage",
      owner: "Owner",
      phone: "Phone",
      email: "Email",
      statusActive: "Active Tenant",
      statusPending: "Pending Review",
    },
    auth: {
      welcome: "Welcome to Fox AI Agency Platform",
      loginTitle: "Log in to your account",
      registerTitle: "Register new client workspace",
      emailPlaceholder: "Email address",
      passwordPlaceholder: "Password",
      loginBtn: "Sign In",
      registerBtn: "Register & Activate",
      selectPlan: "Select Subscription Plan",
      instapayNotice: "Instant activation available via Instapay EGP",
    },
    pricing: {
      title: "Subscription Plans & Pricing",
      subtitle: "Choose the perfect plan for your business in EGP",
      monthly: "Monthly Billing",
      yearly: "Yearly Billing (20% OFF)",
      starter: "Fox Starter",
      business: "Fox Business",
      enterprise: "Fox Enterprise",
      choosePlan: "Subscribe Plan",
      trialBtn: "Start Free Trial",
      instapayFoot: "Instant clearance via Instapay or activation code",
    },
    telegram: {
      tokenTitle: "Telegram Access Token Integration",
      botUsername: "Bot Username",
      saveToken: "Save Token",
      connected: "Connected",
      disconnected: "Disconnected",
      tokenGuide: "How to get HTTP API Token from @BotFather",
    },
    crm: {
      totalCustomers: "Total Registered Customers",
      addCustomer: "Add New Customer",
      customerName: "Customer Name",
      phone: "Phone Number",
      stage: "Stage",
      notes: "Notes",
    },
    ai: {
      agentName: "AI Agent Name",
      systemPrompt: "Agent System Prompt & Tone",
      autoReply: "Automated AI Replies",
      knowledgeBase: "Knowledge Base & Facts",
      pendingFacts: "Pending Facts Awaiting Approval",
    },
  },
};

/**
 * Subscribe to automated real-time Firestore translation updates.
 * Listens to the `translations` collection in Firestore.
 */
export const subscribeToFirestoreTranslations = (
  onChange?: (updated: Record<Language, TranslationDictionary>) => void
) => {
  try {
    const unsub = onSnapshot(
      collection(db, "translations"),
      (snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          const lang = docSnap.id as Language;
          if (lang === "ar" || lang === "en") {
            const data = docSnap.data() as TranslationDictionary;
            dynamicTranslations[lang] = deepMerge(dynamicTranslations[lang] || {}, data);
          }
        });
        if (onChange) onChange(dynamicTranslations);
      },
      (err) => {
        console.warn("Firestore translation subscription notice:", err);
      }
    );
    return unsub;
  } catch (err) {
    console.warn("Firestore translation init notice:", err);
    return () => {};
  }
};

/**
 * Save or update a single nested translation keyPath (e.g., 'common.save') to Firestore
 */
export const saveTranslationToFirestore = async (
  lang: Language,
  keyPath: string,
  textValue: string
): Promise<void> => {
  const keys = keyPath.split(".");
  const updateObj: any = {};
  let current = updateObj;

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (i === keys.length - 1) {
      current[k] = textValue;
    } else {
      current[k] = {};
      current = current[k];
    }
  }

  const docRef = doc(db, "translations", lang);
  await setDoc(docRef, updateObj, { merge: true });
};

/**
 * Save an entire dictionary object to Firestore for a language
 */
export const saveFullDictionaryToFirestore = async (
  lang: Language,
  dict: TranslationDictionary
): Promise<void> => {
  const docRef = doc(db, "translations", lang);
  await setDoc(docRef, dict, { merge: true });
};

/**
 * Seed or sync default built-in translations to Firestore
 */
export const syncDefaultsToFirestore = async (): Promise<void> => {
  await setDoc(doc(db, "translations", "ar"), translations.ar, { merge: true });
  await setDoc(doc(db, "translations", "en"), translations.en, { merge: true });
};

/**
 * Get nested translation string by path key (e.g., 'common.save'),
 * dynamically checking Firestore dynamic translations first, then default translations.
 */
export const t = (
  key: string,
  lang: Language = "ar",
  params?: Record<string, string | number>
): string => {
  const keys = key.split(".");

  const resolveKey = (dict: any): string | undefined => {
    let curr = dict;
    for (const k of keys) {
      if (curr && typeof curr === "object" && k in curr) {
        curr = curr[k];
      } else {
        return undefined;
      }
    }
    return typeof curr === "string" ? curr : undefined;
  };

  // 1. Try dynamic Firestore translation for requested language
  let found = resolveKey(dynamicTranslations[lang]);

  // 2. Try static default translation for requested language
  if (!found) {
    found = resolveKey(translations[lang]);
  }

  // 3. Fallback to English dynamic translation
  if (!found && lang !== "en") {
    found = resolveKey(dynamicTranslations.en);
  }

  // 4. Fallback to English static translation
  if (!found && lang !== "en") {
    found = resolveKey(translations.en);
  }

  // 5. Final fallback to raw key
  if (!found) {
    found = key;
  }

  let result = found;
  if (params) {
    Object.entries(params).forEach(([pKey, pVal]) => {
      result = result.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
    });
  }

  return result;
};

/**
 * Get text direction for language
 */
export const getDirection = (lang: Language): TextDirection => {
  return lang === "ar" ? "rtl" : "ltr";
};

/**
 * Toggle language helper
 */
export const toggleLanguageCode = (current: Language): Language => {
  return current === "ar" ? "en" : "ar";
};

/**
 * React Hook for component translation and language controls
 */
export const useTranslation = () => {
  const { language, setLanguage } = useApp();

  const isAr = language === "ar";
  const isRtl = isAr;
  const dir: TextDirection = getDirection(language);

  const translate = (key: string, params?: Record<string, string | number>): string => {
    return t(key, language, params);
  };

  const toggle = () => {
    setLanguage(toggleLanguageCode(language));
  };

  return {
    t: translate,
    language,
    setLanguage,
    toggleLanguage: toggle,
    isAr,
    isRtl,
    dir,
  };
};

export class LanguageService {
  public static translate(key: string, lang: Language = "ar", params?: Record<string, string | number>): string {
    return t(key, lang, params);
  }

  public static getDirection(lang: Language): TextDirection {
    return getDirection(lang);
  }

  public static getSupportedLanguages(): { code: Language; name: string; nativeName: string }[] {
    return [
      { code: "ar", name: "Arabic", nativeName: "العربية" },
      { code: "en", name: "English", nativeName: "English" },
    ];
  }

  public static subscribeToFirestore(onChange?: () => void) {
    return subscribeToFirestoreTranslations(() => {
      if (onChange) onChange();
    });
  }

  public static async updateTranslation(lang: Language, keyPath: string, textValue: string) {
    await saveTranslationToFirestore(lang, keyPath, textValue);
  }

  public static async syncDefaults() {
    await syncDefaultsToFirestore();
  }
}
