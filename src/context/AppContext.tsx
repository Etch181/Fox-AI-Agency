import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, where, getDoc } from "firebase/firestore";
import { db, auth, sanitizeForFirestore } from "../services/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { subscribeToFirestoreTranslations } from "../services/LanguageService";
import {
  User,
  Workspace,
  SubscriptionPlan,
  ActivationCode,
  InstapayPayment,
  CustomerLead,
  Appointment,
  Doctor,
  MenuItem,
  MedicineItem,
  StoreProduct,
  ClinicService,
  CourseItem,
  CourseReview,
  ExtraPackage,
  Complaint,
  KnowledgeBaseFact,
  Coupon,
  N8nWorkflow,
  PlanId,
  SupportTicket,
  AuditLog,
  AuditLogCategory,
  AuditLogSeverity,
  GeminiTenantMetrics,
  GeminiErrorLog,
  RegistrationConfirmation,
  SubscriberModificationRequest,
  ProductOrder,
  ServiceRating,
} from "../types";
import {
  DEMO_USERS,
  INITIAL_PLANS,
  INITIAL_WORKSPACES,
  INITIAL_ACTIVATION_CODES,
  INITIAL_PAYMENTS,
  INITIAL_CRM_LEADS,
  INITIAL_DOCTORS,
  INITIAL_APPOINTMENTS,
  INITIAL_MENU,
  INITIAL_MEDICINES,
  INITIAL_PRODUCTS,
  INITIAL_PRODUCT_ORDERS,
  INITIAL_SERVICE_RATINGS,
  INITIAL_COMPLAINTS,
  INITIAL_KNOWLEDGE_FACTS,
  INITIAL_COUPONS,
  INITIAL_N8N_WORKFLOWS,
  INITIAL_SUPPORT_TICKETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_GEMINI_METRICS,
} from "../data/mockData";
import { authenticatedFetch } from "../services/authenticatedFetch";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspaceId: (id: string) => void;
  plans: SubscriptionPlan[];
  activationCodes: ActivationCode[];
  payments: InstapayPayment[];
  crmLeads: CustomerLead[];
  doctors: Doctor[];
  appointments: Appointment[];
  menuItems: MenuItem[];
  medicines: MedicineItem[];
  products: StoreProduct[];
  productOrders: ProductOrder[];
  serviceRatings: ServiceRating[];
  addProductOrder: (order: Omit<ProductOrder, "id">) => void;
  updateProductOrderStatus: (id: string, status: ProductOrder["status"], ownerNotes?: string) => void;
  addServiceRating: (rating: Omit<ServiceRating, "id">) => void;
  clinicServices: ClinicService[];
  courses: CourseItem[];
  courseReviews: CourseReview[];
  addCourseReview: (review: Omit<CourseReview, "id" | "workspaceId" | "date">) => void;
  updateCourseReview: (id: string, updates: Partial<CourseReview>) => void;
  deleteCourseReview: (id: string) => void;
  addCourse: (course: Omit<CourseItem, "id" | "workspaceId">) => void;
  updateCourse: (id: string, updates: Partial<CourseItem>) => void;
  deleteCourse: (id: string) => void;
  addClinicService: (service: Omit<ClinicService,
   "id">) => void;
  deleteClinicService: (id: string) => void;
  updateClinicService: (id: string, updates: Partial<ClinicService>) => void;
  addDoctor: (doc: Omit<Doctor, "id">) => void;
  deleteDoctor: (id: string) => void;
  updateDoctor: (id: string, updates: Partial<Doctor>) => void;
  deleteProductItem: (id: string) => void;
  deleteMedicineItem: (id: string) => void;
  deleteMenuItem: (id: string) => void;
  complaints: Complaint[];
  knowledgeFacts: KnowledgeBaseFact[];
  coupons: Coupon[];
  n8nWorkflows: N8nWorkflow[];
  supportTickets: SupportTicket[];
  auditLogs: AuditLog[];
  addAuditLog: (entry: {
    action: string;
    category: AuditLogCategory;
    severity?: AuditLogSeverity;
    target: string;
    details: string;
    actorName?: string;
    actorEmail?: string;
    actorRole?: any;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }) => Promise<AuditLog>;
  geminiMetrics: GeminiTenantMetrics[];
  recordGeminiCall: (
    workspaceId: string,
    latencyMs: number,
    success: boolean,
    errorCode?: string,
    errorMessage?: string,
    promptSnippet?: string
  ) => void;
  simulateGeminiPing: (
    workspaceId: string
  ) => Promise<{ latencyMs: number; success: boolean; errorCode?: string }>;
  clearTenantErrorLogs: (workspaceId: string) => void;
  resetGeminiMetrics: () => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  
  // Real-time Registration Feedback
  latestRegistration: RegistrationConfirmation | null;
  triggerRegistrationFeedback: (info: Partial<RegistrationConfirmation>) => void;
  dismissRegistrationFeedback: () => void;
  
  // Plan Management
  updatePlan: (planId: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  resetPlansToDefault: () => Promise<void>;
  
  // Actions
  loginAs: (userId: string) => void;
  loginWithEmail: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  registerWorkspace: (
    workspaceName: string,
    industry: any,
    ownerName: string,
    email: string,
    phone: string,
    initialCode?: string,
    password?: string
  ) => Promise<Workspace | null>;
  generateActivationCode: (
    planId: PlanId,
    durationDays?: number,
    codeType?: 'plan' | 'extra_package',
    extraConversationsCount?: number
  ) => Promise<ActivationCode | null>;

  revokeActivationCode: (
    codeId: string
  ) => Promise<boolean>;
  redeemActivationCode: (
    workspaceId: string,
    codeStr: string
  ) => Promise<boolean>;
  submitInstapayPayment: (
    workspaceId: string,
    planId: PlanId,
    amountEGP: number,
    screenshotUrl: string,
    txRef: string,
    paymentType?: 'plan' | 'extra_package',
    extraPackageName?: string,
    extraConversationsCount?: number
  ) => void;
  approvePayment: (paymentId: string) => void;
  rejectPayment: (paymentId: string, reason: string) => void;
  updateWorkspaceStatus: (workspaceId: string, status: "active" | "pending" | "suspended") => void;
  updateWorkspacePlan: (workspaceId: string, planId: PlanId) => void;
  updateWorkspaceField: (workspaceId: string, updates: Partial<Workspace>) => void;
  updateWorkspace?: (workspaceId: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (workspaceId: string) => void;
  
  // Support Tickets
  createSupportTicket: (ticket: Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "replies"> & { initialMessage: string }) => SupportTicket;
  addTicketReply: (ticketId: string, message: string) => void;
  updateTicketStatus: (ticketId: string, status: SupportTicket["status"]) => void;
  
  // CRM & Industry actions
  addCustomerLead: (lead: Omit<CustomerLead, "id" | "createdAt">) => void;
  updateLeadStatus: (leadId: string, status: CustomerLead["status"]) => void;
  addAppointment: (apt: Omit<Appointment, "id">) => void;
  updateAppointmentStatus: (aptId: string, status: Appointment["status"]) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  addMedicineItem: (med: Omit<MedicineItem, "id">) => void;
  updateMedicineItem: (id: string, updates: Partial<MedicineItem>) => void;
  addProductItem: (prod: Omit<StoreProduct, "id">) => void;
  updateProductItem: (id: string, updates: Partial<StoreProduct>) => void;
  addComplaint: (cmp: Omit<Complaint, "id" | "date">) => void;
  updateComplaintStatus: (cmpId: string, status: Complaint["status"]) => void;
  
  // Knowledge Base / Self-Learning
  knowledgeBase?: KnowledgeBaseFact[];
  approveKnowledgeFact: (factId: string) => void;
  rejectKnowledgeFact: (factId: string) => void;
  addKnowledgeFact: (fact: Omit<KnowledgeBaseFact, "id" | "createdAt">) => void;
  addCoupon: (coupon: Omit<Coupon, "id" | "createdAt">) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponAI: (id: string) => void;
  updateAISettings: (workspaceId: string, settings: any) => void;
  updateTelegramBotToken: (workspaceId: string, token: string, botName?: string) => Promise<void>;
  updateWhatsAppBotStatus: (workspaceId: string, status: 'connected' | 'disconnected', phone?: string) => void;
  
  // Subscriber Modification Requests
  modificationRequests: SubscriberModificationRequest[];
  createSubscriberModificationRequest: (workspaceId: string, proposedData: any, adminNotes?: string) => Promise<any>;
  confirmModificationByClient: (requestId: string) => Promise<boolean>;
  approveSubscriberModificationRequest: (requestId: string, adminNotes?: string) => Promise<boolean>;
  rejectSubscriberModificationRequest: (requestId: string, adminNotes?: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ONE-TIME CLEANUP: remove legacy demo data cached in the browser.
if (typeof window !== "undefined") {
  const cleanupKey = "fox_real_data_cleanup_v1";

  if (!localStorage.getItem(cleanupKey)) {
    [
      "fox_activation_codes",
      "fox_payments",
      "fox_crm_leads",
      "fox_appointments",
      "fox_menu",
      "fox_medicines",
      "fox_products",
      "fox_product_orders",
      "fox_service_ratings",
      "fox_complaints",
      "fox_kb",
      "fox_coupons",
      "fox_support_tickets",
      "fox_audit_logs",
      "fox_gemini_metrics"
    ].forEach((key) => localStorage.removeItem(key));

    localStorage.setItem(cleanupKey, "done");

    console.log("🧹 FOX legacy demo cache cleaned");
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // LocalStorage initialization or default fallbacks
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("fox_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("fox_users");
    return saved ? JSON.parse(saved) : DEMO_USERS;
  });

  useEffect(() => {
    localStorage.setItem("fox_users", JSON.stringify(allUsers));
  }, [allUsers]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("fox_theme");
    return saved ? saved === "dark" : true; // Premium Dark default
  });

  useEffect(() => {
    localStorage.setItem("fox_theme", darkMode ? "dark" : "light");
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const [language, setLanguage] = useState<'ar' | 'en'>(() => {
    const saved = localStorage.getItem("fox_lang");
    return (saved === "en" || saved === "ar") ? saved : "ar";
  });

  const [, setTranslationsVersion] = useState(0);

  // Automated real-time Firestore sync for localized translation dictionaries
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreTranslations(() => {
      setTranslationsVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("fox_lang", language);
    const dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", language);
    document.body.setAttribute("dir", dir);
  }, [language]);

  const [deletedWorkspaceIds, setDeletedWorkspaceIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("fox_deleted_workspaces");
    return saved ? JSON.parse(saved) : [];
  });

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  
  // Helper to sync Firestore to local state
  const useCollectionSync = (colName: string, setter: any) => {
    useEffect(() => {
      if (!currentUser) return;
      const isSuper = currentUser?.role === "super_admin";
      const colRef = collection(db, colName);
      const q = isSuper 
        ? colRef 
        : query(colRef, where("workspaceId", "==", currentUser.workspaceId));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setter(snapshot.docs.map(d => d.data()));
        } else {
          setter([]);
        }
      }, (err) => console.warn(`Firestore ${colName} sync notice:`, err));
      return () => unsubscribe();
    }, [currentUser, currentUser?.workspaceId]);
  };

  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string>(() => {
    return currentUser?.workspaceId || "";
  });

  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => {
    const saved = localStorage.getItem("fox_plans");
    return saved ? JSON.parse(saved) : INITIAL_PLANS;
  });

  const [latestRegistration, setLatestRegistration] = useState<RegistrationConfirmation | null>(null);

  const triggerRegistrationFeedback = (info: Partial<RegistrationConfirmation>) => {
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
    const confirmation: RegistrationConfirmation = {
      id: info.id || `reg_${Date.now()}`,
      workspaceId: info.workspaceId || "ws_demo",
      workspaceName: info.workspaceName || "نشاط تجاري جديد",
      ownerName: info.ownerName || "مشترك جديد",
      ownerEmail: info.ownerEmail || "client@foxaiagency.com",
      phone: info.phone || "+20 100 000 0000",
      planId: info.planId || "business",
      industry: info.industry || "Clinic",
      source: info.source || "Web Portal",
      timestamp: nowStr,
      dbSavedAt: nowStr,
      persistedToFirestore: true,
      docPath: `workspaces/${info.workspaceId || "ws_demo"}`,
    };
    setLatestRegistration(confirmation);
  };

  const dismissRegistrationFeedback = () => {
    setLatestRegistration(null);
  };

  // Real-time Firestore sync for Workspaces
  useEffect(() => {
    if (!currentUser) return;
    
    const isSuperAdmin = currentUser?.role === "super_admin";
    const workspacesRef = collection(db, "workspaces");
    const q = isSuperAdmin 
      ? workspacesRef 
      : query(workspacesRef, where("id", "==", currentUser.workspaceId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Workspace, "id">),
          }))
          .filter((w) => !deletedWorkspaceIds.includes(w.id));

        // Firestore is the ONLY source of truth for tenants.
        // Never preserve demo/local workspaces absent from Firestore.
        setWorkspaces(fetched);

        // Optional diagnostic cache only.
        // This cache is never used to seed workspace state.
        localStorage.setItem(
          "fox_workspaces",
          JSON.stringify(fetched)
        );

        // Keep Super Admin selection valid.
        if (currentUser?.role === "super_admin") {
          setCurrentWorkspaceIdState((currentId) => {
            if (fetched.length === 0) return "";

            return fetched.some((w) => w.id === currentId)
              ? currentId
              : fetched[0].id;
          });
        }
      },
      (err) => {
        console.warn("Firestore workspaces sync notice:", err);
      }
    );
    return () => unsubscribe();
  }, [currentUser, deletedWorkspaceIds]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "plans"),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map((d) => ({
            ...d.data(),
            id: d.id as PlanId,
          })) as SubscriptionPlan[];

          const order: Record<string, number> = { starter: 1, business: 2, enterprise: 3 };
          fetched.sort((a, b) => (order[a.id] || 99) - (order[b.id] || 99));

          setPlans(fetched);
          localStorage.setItem("fox_plans", JSON.stringify(fetched));
        }
      },
      (error) => {
        console.warn("Firestore plans sync fallback:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  
  // Sync Firebase workspaces to Node.js backend so Telegram bot knows about them for anti-fraud
  useEffect(() => {
    if (workspaces.length > 0) {
      fetch("/api/agency/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaces })
      }).catch(() => {});
    }
  }, [workspaces.length]);

  // Sync Telegram Bot Client Registrations & Leads from Agency Server Engine
  useEffect(() => {
    const syncTelegramRegistrations = async () => {
      try {
        const resClients = await fetch("/api/agency/clients");
        if (resClients.ok) {
          const data = await resClients.json();
          if (data.success && Array.isArray(data.clients) && data.clients.length > 0) {
            setWorkspaces((prev) => {
              const cleanPrev = prev.filter((w) => !deletedWorkspaceIds.includes(w.id));
              const prevMap = new Map<string, Workspace>(cleanPrev.map((w) => [w.id, w]));
              let hasNew = false;
              for (const tgClient of data.clients) {
                if (!prevMap.has(tgClient.id) && !deletedWorkspaceIds.includes(tgClient.id)) {
                  prevMap.set(tgClient.id, tgClient);
                  hasNew = true;
                  triggerRegistrationFeedback({
                    id: `reg_tg_${tgClient.id}`,
                    workspaceId: tgClient.id,
                    workspaceName: tgClient.name,
                    ownerName: tgClient.ownerName,
                    ownerEmail: tgClient.ownerEmail,
                    phone: tgClient.phone,
                    planId: tgClient.planId,
                    industry: tgClient.industry,
                    source: "Telegram Bot",
                  });
                }
              }
              if (hasNew || cleanPrev.length !== prev.length) {
                const updated = Array.from(prevMap.values()).filter((w) => !deletedWorkspaceIds.includes(w.id));
                localStorage.setItem("fox_workspaces", JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          }
        }

        const resLeads = await fetch("/api/agency/leads");
        if (resLeads.ok) {
          const dataLeads = await resLeads.json();
          if (dataLeads.success && Array.isArray(dataLeads.leads) && dataLeads.leads.length > 0) {
            setCrmLeads((prev) => {
              const prevMap = new Map(prev.map((l) => [l.id, l]));
              let hasNew = false;
              for (const tgLead of dataLeads.leads) {
                if (!prevMap.has(tgLead.id)) {
                  prevMap.set(tgLead.id, tgLead);
                  hasNew = true;
                }
              }
              if (hasNew) {
                const updated = Array.from(prevMap.values());
                localStorage.setItem("fox_leads", JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        // quiet fallback
      }
    };

    syncTelegramRegistrations();
    const interval = setInterval(syncTelegramRegistrations, 4000);
    return () => clearInterval(interval);
  }, []);
  // FOX ACTIVATION SECURITY V2
  // Activation code inventory is never loaded from browser storage.
  // Only Super Admin may receive it from the authenticated backend.
  const [activationCodes, setActivationCodes] =
    useState<ActivationCode[]>([]);

  // =========================================================
  // FOX PRODUCTION BILLING V1 - FIRESTORE PAYMENTS
  // =========================================================
  // Firestore is the source of truth.
  // Local React state is only the live UI cache.
  const [payments, setPayments] =
    useState<InstapayPayment[]>([]);

  useCollectionSync(
    "payments",
    setPayments
  );

  const [crmLeads, setCrmLeads] = useState<CustomerLead[]>(() => {
    const saved = localStorage.getItem("fox_leads");
    return saved ? JSON.parse(saved) : [];
  });

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem("fox_apts");
    return saved ? JSON.parse(saved) : [];
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem("fox_menu");
    return saved ? JSON.parse(saved) : [];
  });

  const [medicines, setMedicines] = useState<MedicineItem[]>(() => {
    const saved = localStorage.getItem("fox_meds");
    return saved ? JSON.parse(saved) : [];
  });

  const [clinicServices, setClinicServices] = useState<ClinicService[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseReviews, setCourseReviews] = useState<CourseReview[]>([
    {
      id: "rev-1",
      workspaceId: "ws-1",
      studentName: "أحمد محمود",
      courseName: "دبلومة المحادثة الشاملة",
      rating: 5,
      comment: "كورس ممتاز جداً واستفدت منه كتير في تطوير لغتي",
      date: new Date().toISOString(),
      status: "published",
      reply: "شكراً لك يا أحمد، نتمنى لك التوفيق دائماً!"
    },
    {
      id: "rev-2",
      workspaceId: "ws-1",
      studentName: "سارة حسن",
      courseName: "كورس التسويق الرقمي",
      rating: 4,
      comment: "المحتوى رائع بس ياريت لو فيه أمثلة عملية أكتر",
      date: new Date(Date.now() - 86400000).toISOString(),
      status: "published"
    }
  ]);
  const [products, setProducts] = useState<StoreProduct[]>(() => {
    const saved = localStorage.getItem("fox_products");
    return saved ? JSON.parse(saved) : [];
  });

  const [productOrders, setProductOrders] = useState<ProductOrder[]>(() => {
    const saved = localStorage.getItem("fox_product_orders");
    return saved ? JSON.parse(saved) : [];
  });

  const [serviceRatings, setServiceRatings] = useState<ServiceRating[]>(() => {
    const saved = localStorage.getItem("fox_service_ratings");
    return saved ? JSON.parse(saved) : [];
  });

  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem("fox_complaints");
    return saved ? JSON.parse(saved) : [];
  });

  const [knowledgeFacts, setKnowledgeFacts] = useState<KnowledgeBaseFact[]>(() => {
    const saved = localStorage.getItem("fox_kb");
    return saved ? JSON.parse(saved) : [];
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem("fox_coupons");
    return saved ? JSON.parse(saved) : [];
  });
  const [n8nWorkflows] = useState<N8nWorkflow[]>([]);
  
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem("fox_support_tickets");
    return saved ? JSON.parse(saved) : [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem("fox_audit_logs");
    return saved ? JSON.parse(saved) : [];
  });

  const [geminiMetrics, setGeminiMetrics] = useState<GeminiTenantMetrics[]>(() => {
    const saved = localStorage.getItem("fox_gemini_metrics");
    return saved ? JSON.parse(saved) : [];
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  useCollectionSync("crmLeads", setCrmLeads);
  useCollectionSync("appointments", setAppointments);
  useCollectionSync("menuItems", setMenuItems);
  useCollectionSync("medicines", setMedicines);
  useCollectionSync("products", setProducts);
  useCollectionSync("productOrders", setProductOrders);
  useCollectionSync("complaints", setComplaints);
  useCollectionSync("knowledgeFacts", setKnowledgeFacts);
  useCollectionSync("coupons", setCoupons);
  useCollectionSync("supportTickets", setSupportTickets);

  // Firestore Real-time Sync for Service Ratings (Works for both Guests & Logged in Admins)
  useEffect(() => {
    const colRef = collection(db, "serviceRatings");
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: ServiceRating[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ServiceRating, "id">),
          }));
          setServiceRatings((prev) => {
            const map = new Map<string, ServiceRating>();
            prev.forEach((r) => map.set(r.id, r));
            fetched.forEach((r) => map.set(r.id, r));
            const list = Array.from(map.values());
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            return list;
          });
        }
      },
      (err) => console.warn("Firestore serviceRatings sync notice:", err)
    );
    return () => unsubscribe();
  }, []);


  // Firestore Gemini Metrics Sync
  useEffect(() => {
    if (!currentUser) return;
    const isSuperAdmin = currentUser?.role === "super_admin";
    const q = isSuperAdmin
      ? collection(db, "gemini_metrics")
      : query(collection(db, "gemini_metrics"), where("workspaceId", "==", currentUser.workspaceId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: GeminiTenantMetrics[] = snapshot.docs.map((d) => d.data() as GeminiTenantMetrics);
          setGeminiMetrics(fetched);
          localStorage.setItem("fox_gemini_metrics", JSON.stringify(fetched));
        }
      },
      (err) => {
        console.warn("Firestore gemini metrics sync notice:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("fox_gemini_metrics", JSON.stringify(geminiMetrics));
  }, [geminiMetrics]);

  const recordGeminiCall = (
    workspaceId: string,
    latencyMs: number,
    success: boolean,
    errorCode?: string,
    errorMessage?: string,
    promptSnippet?: string
  ) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    setGeminiMetrics((prev) => {
      return prev.map((m) => {
        if (m.workspaceId !== workspaceId) return m;

        const totalCalls = m.totalCalls + 1;
        const successfulCalls = success ? m.successfulCalls + 1 : m.successfulCalls;
        const errorCalls = success ? m.errorCalls : m.errorCalls + 1;
        const errorRatePercent = Number(((errorCalls / totalCalls) * 100).toFixed(2));

        const avgLatencyMs = Math.round((m.avgLatencyMs * m.totalCalls + latencyMs) / totalCalls);
        const p95LatencyMs = Math.max(m.p95LatencyMs, Math.round(latencyMs * 1.15));

        const latencyTrend = [...m.latencyTrend.slice(1), latencyMs];
        const errorTrend = [...m.errorTrend.slice(1), success ? 0 : 1];

        let status: "healthy" | "degraded" | "down" = "healthy";
        if (errorRatePercent > 10 || avgLatencyMs > 1500) {
          status = "down";
        } else if (errorRatePercent > 3 || avgLatencyMs > 700) {
          status = "degraded";
        }

        let recentErrorLogs = m.recentErrorLogs;
        if (!success) {
          const newErr: GeminiErrorLog = {
            id: `ERR-${Date.now().toString().slice(-6)}`,
            timestamp: formattedDate,
            workspaceId: m.workspaceId,
            workspaceName: m.workspaceName,
            errorCode: errorCode || "500_UNKNOWN_ERROR",
            errorMessage: errorMessage || "An unexpected error occurred during Gemini API generation.",
            latencyMs,
            promptSnippet: promptSnippet || "Live chat prompt execution...",
            model: m.activeModel || "gemini-2.5-flash",
          };
          recentErrorLogs = [newErr, ...m.recentErrorLogs].slice(0, 15);
        }

        const newMetric: GeminiTenantMetrics = {
          ...m,
          totalCalls,
          successfulCalls,
          errorCalls,
          errorRatePercent,
          avgLatencyMs,
          p95LatencyMs,
          status,
          lastCallTimestamp: formattedDate,
          latencyTrend,
          errorTrend,
          recentErrorLogs,
        };

        setDoc(doc(db, "gemini_metrics", workspaceId), sanitizeForFirestore(newMetric)).catch((err) =>
          console.warn("Firestore sync gemini metric error:", err)
        );

        return newMetric;
      });
    });
  };

  const simulateGeminiPing = async (
    workspaceId: string
  ): Promise<{ latencyMs: number; success: boolean; errorCode?: string }> => {
    const baseLatency = Math.floor(Math.random() * 250) + 180;
    const isErrorOccurred = Math.random() < 0.12;

    let latencyMs = baseLatency;
    let success = true;
    let errorCode = undefined;
    let errorMessage = undefined;

    if (isErrorOccurred) {
      success = false;
      const errorTypes = [
        { code: "429_RATE_LIMIT", msg: "Quota exceeded for quota metric 'GenerateContent requests per minute'", extraLatency: 50 },
        { code: "500_TIMEOUT", msg: "Upstream Google Gemini API Gateway socket connection timed out after 10000ms", extraLatency: 3500 },
        { code: "400_SAFETY_FILTER", msg: "Candidate was blocked due to SAFETY threshold check", extraLatency: 120 },
      ];
      const err = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      errorCode = err.code;
      errorMessage = err.msg;
      latencyMs += err.extraLatency;
    }

    await new Promise((r) => setTimeout(r, Math.min(latencyMs / 2, 400)));

    recordGeminiCall(
      workspaceId,
      latencyMs,
      success,
      errorCode,
      errorMessage,
      "Simulated real-time diagnostic ping..."
    );

    return { latencyMs, success, errorCode };
  };

  const clearTenantErrorLogs = (workspaceId: string) => {
    setGeminiMetrics((prev) =>
      prev.map((m) =>
        m.workspaceId === workspaceId
          ? { ...m, recentErrorLogs: [], errorCalls: 0, errorRatePercent: 0, status: "healthy" }
          : m
      )
    );
  };

  const resetGeminiMetrics = () => {
    setGeminiMetrics(INITIAL_GEMINI_METRICS);
    localStorage.setItem("fox_gemini_metrics", JSON.stringify(INITIAL_GEMINI_METRICS));
  };

  // Firestore Audit Logs Sync
  useEffect(() => {
    if (!currentUser) return;
    const isSuperAdmin = currentUser?.role === "super_admin";
    const q = isSuperAdmin
      ? collection(db, "audit_logs")
      : query(collection(db, "audit_logs"), where("workspaceId", "==", currentUser.workspaceId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedLogs: AuditLog[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AuditLog, "id">),
          }));
          fetchedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(fetchedLogs);
          localStorage.setItem("fox_audit_logs", JSON.stringify(fetchedLogs));
        }
      },
      (err) => {
        console.warn("Firestore audit logs sync notice:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("fox_audit_logs", JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = async (entry: {
    action: string;
    category: AuditLogCategory;
    severity?: AuditLogSeverity;
    target: string;
    details: string;
    actorName?: string;
    actorEmail?: string;
    actorRole?: any;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    
    const newLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      timestamp: formattedDate,
      actorName: entry.actorName || currentUser?.name || "System Admin",
      actorEmail: entry.actorEmail || currentUser?.email || "system@foxaiagency.com",
      actorRole: entry.actorRole || currentUser?.role || "system",
      action: entry.action,
      category: entry.category,
      severity: entry.severity || "info",
      target: entry.target,
      details: entry.details,
      ipAddress: entry.ipAddress || "197.38.12.45",
      metadata: entry.metadata,
    };

    setAuditLogs((prev) => [newLog, ...prev]);

    try {
      await setDoc(doc(db, "audit_logs", newLog.id), sanitizeForFirestore(newLog));
    } catch (err) {
      console.warn("Firestore save audit log notice:", err);
    }

    return newLog;
  };

  useEffect(() => {
    localStorage.setItem("fox_support_tickets", JSON.stringify(supportTickets));
  }, [supportTickets]);

  useEffect(() => {
    localStorage.setItem("fox_user", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("fox_theme", darkMode ? "dark" : "light");
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("fox_workspaces", JSON.stringify(workspaces));
  }, [workspaces]);

  // Remove any legacy activation-code cache from the browser.
  useEffect(() => {
    localStorage.removeItem("fox_codes");
  }, []);

  // FOX Production Billing:
  // payments are persisted in Firestore, not localStorage.

  useEffect(() => {
    localStorage.setItem("fox_leads", JSON.stringify(crmLeads));
  }, [crmLeads]);

  useEffect(() => {
    localStorage.setItem("fox_apts", JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem("fox_menu", JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem("fox_meds", JSON.stringify(medicines));
  }, [medicines]);

  useEffect(() => {
    localStorage.setItem("fox_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("fox_complaints", JSON.stringify(complaints));
  }, [complaints]);

  useEffect(() => {
    localStorage.setItem("fox_kb", JSON.stringify(knowledgeFacts));
  }, [knowledgeFacts]);

  useEffect(() => {
    localStorage.setItem("fox_coupons", JSON.stringify(coupons));
  }, [coupons]);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const isSuperAdmin = currentUser?.role === "super_admin";

  // Lock workspace context to authenticated profile for non-admin users
  const currentWorkspace = useMemo(() => {
    if (currentUser && !isSuperAdmin && currentUser.workspaceId) {
      const userWs = workspaces.find((w) => w.id === currentUser.workspaceId);
      if (userWs) return userWs;
    }
    return workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0] || null;
  }, [currentUser, isSuperAdmin, currentWorkspaceId, workspaces]);

  const setCurrentWorkspaceId = (id: string) => {
    if (!isSuperAdmin) {
      addToast("غير مسموح للمشترك بالتنقل لحسابات عملاء آخرين", "error");
      return;
    }
    setCurrentWorkspaceIdState(id);
  };

  // Multi-tenancy Scoped State Views for Non-Admin Users
  const scopedCrmLeads = useMemo(() => {
    if (isSuperAdmin) return crmLeads;
    return crmLeads.filter((l) => l.workspaceId === currentWorkspace?.id);
  }, [crmLeads, currentWorkspace?.id, isSuperAdmin]);

  const scopedDoctors = useMemo(() => {
    if (isSuperAdmin) return doctors;
    return doctors.filter((d) => d.workspaceId === currentWorkspace?.id);
  }, [doctors, currentWorkspace?.id, isSuperAdmin]);

  const scopedAppointments = useMemo(() => {
    if (isSuperAdmin) return appointments;
    return appointments.filter((a) => a.workspaceId === currentWorkspace?.id);
  }, [appointments, currentWorkspace?.id, isSuperAdmin]);

  const scopedMenuItems = useMemo(() => {
    if (isSuperAdmin) return menuItems;
    return menuItems.filter((m) => m.workspaceId === currentWorkspace?.id);
  }, [menuItems, currentWorkspace?.id, isSuperAdmin]);

  const scopedMedicines = useMemo(() => {
    if (isSuperAdmin) return medicines;
    return medicines.filter((m) => m.workspaceId === currentWorkspace?.id);
  }, [medicines, currentWorkspace?.id, isSuperAdmin]);

  const scopedClinicServices = useMemo(() => {
    if (isSuperAdmin) return clinicServices;
    return clinicServices.filter((s) => s.workspaceId === currentWorkspace?.id);
  }, [clinicServices, currentWorkspace?.id, isSuperAdmin]);
  const scopedCourses = useMemo(() => {
    if (isSuperAdmin) return courses;
    return courses.filter((s) => s.workspaceId === currentWorkspace?.id);
  }, [courses, currentWorkspace?.id, isSuperAdmin]);

  const scopedProducts = useMemo(() => {
    if (isSuperAdmin) return products;
    return products.filter((p) => p.workspaceId === currentWorkspace?.id);
  }, [products, currentWorkspace?.id, isSuperAdmin]);

  const scopedProductOrders = useMemo(() => {
    if (isSuperAdmin) return productOrders;
    return productOrders.filter((o) => o.workspaceId === currentWorkspace?.id);
  }, [productOrders, currentWorkspace?.id, isSuperAdmin]);

  const scopedServiceRatings = useMemo(() => {
    if (isSuperAdmin) return serviceRatings;
    return serviceRatings.filter((r) => r.workspaceId === currentWorkspace?.id);
  }, [serviceRatings, currentWorkspace?.id, isSuperAdmin]);

  const scopedComplaints = useMemo(() => {
    if (isSuperAdmin) return complaints;
    return complaints.filter((c) => c.workspaceId === currentWorkspace?.id);
  }, [complaints, currentWorkspace?.id, isSuperAdmin]);

  const scopedKnowledgeFacts = useMemo(() => {
    if (isSuperAdmin) return knowledgeFacts;
    return knowledgeFacts.filter((k) => k.workspaceId === currentWorkspace?.id);
  }, [knowledgeFacts, currentWorkspace?.id, isSuperAdmin]);

  const scopedCoupons = useMemo(() => {
    if (isSuperAdmin) return coupons;
    return coupons.filter((c) => c.workspaceId === currentWorkspace?.id);
  }, [coupons, currentWorkspace?.id, isSuperAdmin]);

  const scopedN8nWorkflows = useMemo(() => {
    if (isSuperAdmin) return n8nWorkflows;
    return n8nWorkflows.filter((w) => w.workspaceId === currentWorkspace?.id);
  }, [n8nWorkflows, currentWorkspace?.id, isSuperAdmin]);

  const scopedSupportTickets = useMemo(() => {
    if (isSuperAdmin) return supportTickets;
    return supportTickets.filter((t) => t.workspaceId === currentWorkspace?.id);
  }, [supportTickets, currentWorkspace?.id, isSuperAdmin]);

  const loginAs = (userId: string) => {
    const found = allUsers.find((u) => u.id === userId) || DEMO_USERS.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      if (found.workspaceId) {
        setCurrentWorkspaceIdState(found.workspaceId);
      }
      addToast(`تم تسجيل الدخول بحساب: ${found.name}`, "info");
    }
  };

  const loginWithEmail = async (
    email: string,
    password?: string
  ): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      addToast("يرجى إدخال البريد الإلكتروني وكلمة المرور", "error");
      return false;
    }

    try {
      // Firebase Authentication is the source of truth.
      const credential =
        await signInWithEmailAndPassword(
          auth,
          trimmedEmail,
          password
        );

      const uid = credential.user.uid;

      // User profile contains role + tenant workspace binding.
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await firebaseSignOut(auth);

        addToast(
          "تم التحقق من الحساب ولكن ملف المستخدم غير موجود بالمنظومة",
          "error"
        );

        return false;
      }

      const profile = userSnap.data() as any;

      const appUser: User = {
        id: uid,
        name:
          profile.name ||
          credential.user.displayName ||
          trimmedEmail,
        email:
          profile.email ||
          credential.user.email ||
          trimmedEmail,
        role: profile.role || "client_owner",
        workspaceId: profile.workspaceId,
        createdAt:
          profile.createdAt ||
          new Date().toISOString(),
      };

      if (
        appUser.role !== "super_admin" &&
        !appUser.workspaceId
      ) {
        await firebaseSignOut(auth);

        addToast(
          "الحساب غير مربوط بمنشأة. تواصل مع إدارة FOX AI AGENCY.",
          "error"
        );

        return false;
      }

      setCurrentUser(appUser);
      localStorage.setItem(
        "fox_user",
        JSON.stringify(appUser)
      );

      if (appUser.workspaceId) {
        setCurrentWorkspaceIdState(
          appUser.workspaceId
        );
      }

      addToast(
        appUser.role === "super_admin"
          ? "مرحباً بك في لوحة إدارة FOX AI AGENCY"
          : `مرحباً بك ${appUser.name}`,
        "success"
      );

      return true;

    } catch (error: any) {
      console.error(
        "[FOX AUTH] Login failed:",
        error
      );

      addToast(
        "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        "error"
      );

      return false;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.warn("[FOX AUTH] Firebase logout notice:", error);
    }

    setCurrentUser(null);
    setCurrentWorkspaceIdState("");

    localStorage.removeItem("fox_user");
    localStorage.removeItem("fox_current_workspace");

    addToast("تم تسجيل الخروج بنجاح", "info");

    // Force the UI back to the public login portal.
    window.setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  // =========================================================
  // FOX PRODUCTION REGISTRATION V1
  // =========================================================
  //
  // Firebase Authentication is the identity source of truth.
  //
  // Registration flow:
  // 1. Validate input.
  // 2. Create Firebase Auth user.
  // 3. Create tenant workspace.
  // 4. Create users/{uid} profile.
  // 5. Bind user -> workspace.
  // 6. Keep Firebase session active.
  // =========================================================
  const registerWorkspace = async (
    workspaceName: string,
    industry: any,
    ownerName: string,
    email: string,
    phone: string,
    initialCode?: string,
    password?: string
  ): Promise<Workspace | null> => {
    const cleanWorkspaceName =
      workspaceName.trim();

    const cleanOwnerName =
      ownerName.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanPhone =
      phone.trim();

    const cleanPassword =
      password || "";

    if (
      !cleanWorkspaceName ||
      !cleanOwnerName ||
      !cleanEmail
    ) {
      addToast(
        language === "ar"
          ? "يرجى استكمال بيانات التسجيل المطلوبة."
          : "Please complete the required registration fields.",
        "error"
      );

      return null;
    }

    if (
      !cleanEmail.includes("@")
    ) {
      addToast(
        language === "ar"
          ? "يرجى إدخال بريد إلكتروني صحيح."
          : "Please enter a valid email address.",
        "error"
      );

      return null;
    }

    if (
      cleanPassword.length < 8 ||
      !/[A-Za-z]/.test(cleanPassword) ||
      !/[0-9]/.test(cleanPassword)
    ) {
      addToast(
        language === "ar"
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام."
          : "Password must be at least 8 characters and contain letters and numbers.",
        "error"
      );

      return null;
    }

    const newWsId =
      `ws_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

    let planId: PlanId =
      "starter";

    let codeObj:
      | ActivationCode
      | undefined;

    if (initialCode?.trim()) {
      codeObj =
        activationCodes.find(
          (c) =>
            c.code
              .trim()
              .toUpperCase() ===
              initialCode
                .trim()
                .toUpperCase() &&
            !c.isUsed
        );

      if (!codeObj) {
        addToast(
          language === "ar"
            ? "كود التفعيل غير صحيح أو تم استخدامه من قبل."
            : "Activation code is invalid or already used.",
          "error"
        );

        return null;
      }

      planId =
        codeObj.planId;
    }

    // Trial anti-abuse check.
    if (!initialCode?.trim()) {
      const normalizedPhone =
        cleanPhone.replace(
          /[\s\-\+\(\)]/g,
          ""
        );

      const hasUsedTrial =
        workspaces.some((w) => {
          const wPhone =
            (w.phone || "").replace(
              /[\s\-\+\(\)]/g,
              ""
            );

          const wEmail =
            (w.ownerEmail || "")
              .trim()
              .toLowerCase();

          return (
            (
              normalizedPhone &&
              wPhone === normalizedPhone
            ) ||
            wEmail === cleanEmail
          );
        });

      if (hasUsedTrial) {
        addToast(
          language === "ar"
            ? "هذا البريد الإلكتروني أو رقم الهاتف استفاد من التجربة المجانية من قبل. لا يمكن بدء تجربة مجانية جديدة. استخدم الاشتراك المدفوع أو كود تفعيل صالح."
            : "This email or phone already used the free trial. Another free trial cannot be created. Please use a paid subscription or a valid activation code.",
          "error"
        );

        return null;
      }
    }

    try {
      // -----------------------------------------------------
      // CREATE FIREBASE AUTH IDENTITY
      // -----------------------------------------------------

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          cleanPassword
        );

      const uid =
        credential.user.uid;

      const nowIso =
        new Date().toISOString();

      const expiry =
        new Date(
          Date.now() +
            30 *
              24 *
              60 *
              60 *
              1000
        )
          .toISOString()
          .split("T")[0];

      const newWorkspace: Workspace = {
        id: newWsId,
        name: cleanWorkspaceName,
        industry,
        ownerName: cleanOwnerName,
        ownerEmail: cleanEmail,
        phone: cleanPhone,

        ownerUid: uid,

        status: "active",
        planId,

        subscriptionExpiresAt:
          expiry,

        aiConversationsUsed: 0,
        totalCustomers: 0,
        totalAppointments: 0,
        totalComplaints: 0,

        createdAt:
          nowIso.split("T")[0],

        registrationSource:
          "web_portal",

        onboardingStatus:
          "in_progress",

        onboardingCompleted:
          false,

        onboardingStep: 1,

        businessDescription:
          "",

        onboardingAiReady:
          false,

        onboardingCatalogReady:
          false,

        aiSettings: {
          agentName:
            `${cleanWorkspaceName} AI Assistant`,

          customPrompt:
            `Assist customers for ${cleanWorkspaceName}. Be polite and helpful.`,

          tone: "Friendly",

          autoBookingEnabled:
            true,

          autoComplaintEscalation:
            true,

          languageMode:
            "auto",
        },
      };

      const newUser: User = {
        id: uid,
        name: cleanOwnerName,
        email: cleanEmail,
        role: "client_owner",
        workspaceId: newWsId,
        createdAt: nowIso,
      };

      // -----------------------------------------------------
      // FIRESTORE
      // -----------------------------------------------------

      await setDoc(
        doc(
          db,
          "workspaces",
          newWsId
        ),
        sanitizeForFirestore(
          newWorkspace
        )
      );

      await setDoc(
        doc(
          db,
          "users",
          uid
        ),
        sanitizeForFirestore(
          {
            ...newUser,

            uid,

            workspaceId:
              newWsId,

            role:
              "client_owner",

            active:
              true,

            createdAt:
              nowIso,
          }
        )
      );

      // -----------------------------------------------------
      // MARK ACTIVATION CODE USED
      // only after Auth + workspace creation succeeds
      // -----------------------------------------------------

      if (codeObj) {
        const updatedCode = {
          ...codeObj,

          isUsed:
            true,

          usedByWorkspaceId:
            newWsId,

          usedByWorkspaceName:
            cleanWorkspaceName,
        };

        setActivationCodes(
          (prev) =>
            prev.map((c) =>
              c.id === codeObj!.id
                ? updatedCode
                : c
            )
        );

        setDoc(
          doc(
            db,
            "activationCodes",
            codeObj.id
          ),
          sanitizeForFirestore(
            updatedCode
          ),
          {
            merge: true,
          }
        ).catch((error) =>
          console.warn(
            "[FOX REGISTRATION] Activation code sync notice:",
            error
          )
        );
      }

      // -----------------------------------------------------
      // LIVE APP SESSION
      // -----------------------------------------------------

      setWorkspaces(
        (prev) => [
          newWorkspace,
          ...prev.filter(
            (w) =>
              w.id !==
              newWorkspace.id
          ),
        ]
      );

      setAllUsers(
        (prev) => [
          newUser,
          ...prev.filter(
            (u) =>
              u.id !== uid
          ),
        ]
      );

      setCurrentUser(
        newUser
      );

      setCurrentWorkspaceIdState(
        newWsId
      );

      localStorage.setItem(
        "fox_user",
        JSON.stringify(
          newUser
        )
      );

      localStorage.setItem(
        "fox_current_workspace",
        newWsId
      );

      // -----------------------------------------------------
      // REGISTRATION CONFIRMATION
      // -----------------------------------------------------

      triggerRegistrationFeedback({
        id:
          `reg_${Date.now()}`,

        workspaceId:
          newWsId,

        workspaceName:
          cleanWorkspaceName,

        ownerName:
          cleanOwnerName,

        ownerEmail:
          cleanEmail,

        phone:
          cleanPhone ||
          "+20 100 000 0000",

        planId,

        industry:
          industry ||
          "Clinic",

        source:
          "Web Portal",
      });

      addToast(
        language === "ar"
          ? `تم إنشاء حساب ${cleanWorkspaceName} بنجاح. مرحباً بك في FOX AI AGENCY!`
          : `${cleanWorkspaceName} account created successfully. Welcome to FOX AI AGENCY!`,
        "success"
      );

      return newWorkspace;

    } catch (error: any) {
      console.error(
        "[FOX REGISTRATION] Registration failed:",
        error
      );

      const code =
        String(
          error?.code || ""
        );

      let message =
        language === "ar"
          ? "تعذر إنشاء الحساب. حاول مرة أخرى."
          : "Unable to create the account. Please try again.";

      if (
        code.includes(
          "email-already-in-use"
        )
      ) {
        message =
          language === "ar"
            ? "هذا البريد الإلكتروني مسجل بالفعل. استخدم تسجيل الدخول."
            : "This email is already registered. Please sign in.";
      } else if (
        code.includes(
          "weak-password"
        )
      ) {
        message =
          language === "ar"
            ? "كلمة المرور ضعيفة. استخدم كلمة مرور أقوى."
            : "Password is too weak. Please choose a stronger password.";
      } else if (
        code.includes(
          "invalid-email"
        )
      ) {
        message =
          language === "ar"
            ? "البريد الإلكتروني غير صحيح."
            : "Invalid email address.";
      }

      addToast(
        message,
        "error"
      );

      return null;
    }
  };

  // =========================================================
  // FOX SECURE ADMIN ACTIVATION V1
  // =========================================================

  const loadActivationCodesForAdmin =
    async (): Promise<ActivationCode[]> => {

      if (!isSuperAdmin) {
        setActivationCodes([]);
        return [];
      }

      try {
        const response =
          await authenticatedFetch(
            "/api/admin/activation-codes"
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load activation codes"
          );
        }

        const codes =
          Array.isArray(data?.codes)
            ? data.codes
            : [];

        setActivationCodes(codes);

        return codes;

      } catch (error) {
        console.error(
          "[FOX Activation Admin] Load failed:",
          error
        );

        setActivationCodes([]);

        return [];
      }
    };


  const generateActivationCode = async (
    planId: PlanId,
    durationDays: number = 30,
    codeType:
      | "plan"
      | "extra_package" =
      "plan",
    extraConversationsCount?: number
  ): Promise<ActivationCode | null> => {

    if (!isSuperAdmin) {
      addToast(
        language === "ar"
          ? "هذا الإجراء متاح فقط لمدير النظام Super Admin"
          : "Super Admin access required.",
        "error"
      );

      return null;
    }

    try {
      const response =
        await authenticatedFetch(
          "/api/admin/activation-codes",
          {
            method: "POST",
            body: JSON.stringify({
              planId,
              durationDays,
              codeType,
              extraConversationsCount:
                extraConversationsCount || 0,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to generate activation code"
        );
      }

      const created =
        data.activationCode as ActivationCode;

      await loadActivationCodesForAdmin();

      addToast(
        language === "ar"
          ? `تم إنشاء كود التفعيل ${created.code}`
          : `Activation code created: ${created.code}`,
        "success"
      );

      return created;

    } catch (error) {
      console.error(
        "[FOX Activation Admin] Create failed:",
        error
      );

      addToast(
        language === "ar"
          ? "تعذر إنشاء كود التفعيل."
          : "Unable to generate activation code.",
        "error"
      );

      return null;
    }
  };


  const revokeActivationCode =
    async (
      codeId: string
    ): Promise<boolean> => {

      if (!isSuperAdmin) {
        addToast(
          language === "ar"
            ? "هذا الإجراء متاح فقط لمدير النظام Super Admin"
            : "Super Admin access required.",
          "error"
        );

        return false;
      }

      try {
        const response =
          await authenticatedFetch(
            `/api/admin/activation-codes/${encodeURIComponent(codeId)}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to revoke activation code"
          );
        }

        await loadActivationCodesForAdmin();

        addToast(
          language === "ar"
            ? "تم إلغاء كود التفعيل."
            : "Activation code revoked.",
          "info"
        );

        return true;

      } catch (error) {
        console.error(
          "[FOX Activation Admin] Revoke failed:",
          error
        );

        addToast(
          language === "ar"
            ? "تعذر إلغاء كود التفعيل."
            : "Unable to revoke activation code.",
          "error"
        );

        return false;
      }
    };


  // Load code inventory only for Super Admin.
  useEffect(() => {
    if (
      currentUser?.role ===
      "super_admin"
    ) {
      void loadActivationCodesForAdmin();
    } else {
      // Tenant/client browsers must never retain code inventory.
      setActivationCodes([]);
      localStorage.removeItem("fox_codes");
    }
  }, [
    currentUser?.id,
    currentUser?.role,
  ]);


  // =========================================================
  // FOX SECURE CLIENT REDEEM V1
  // Activation-code inventory never participates in client validation.
  // The browser submits only the code typed by the customer.
  // =========================================================
  const redeemActivationCode = async (
    workspaceId: string,
    codeStr: string
  ): Promise<boolean> => {
    const cleanCode =
      String(codeStr || "").trim();

    if (!cleanCode) {
      addToast(
        language === "ar"
          ? "يرجى إدخال كود التفعيل."
          : "Please enter an activation code.",
        "error"
      );

      return false;
    }

    try {
      const response =
        await authenticatedFetch(
          `/api/workspaces/${encodeURIComponent(workspaceId)}/redeem-activation-code`,
          {
            method: "POST",
            body: JSON.stringify({
              code: cleanCode,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        const errorCode =
          String(data?.code || "");

        let message =
          language === "ar"
            ? "كود التفعيل غير صحيح."
            : "Invalid activation code.";

        if (
          errorCode ===
          "ACTIVATION_CODE_ALREADY_USED"
        ) {
          message =
            language === "ar"
              ? "تم استخدام كود التفعيل من قبل."
              : "This activation code has already been used.";
        }

        if (
          errorCode ===
          "ACTIVATION_CODE_EXPIRED"
        ) {
          message =
            language === "ar"
              ? "انتهت صلاحية كود التفعيل."
              : "This activation code has expired.";
        }

        addToast(
          message,
          "error"
        );

        return false;
      }

      if (
        data?.codeType ===
        "extra_package"
      ) {
        addToast(
          language === "ar"
            ? `تمت إضافة ${data.extraConversationsCount || 0} محادثة بنجاح.`
            : `${data.extraConversationsCount || 0} conversations added successfully.`,
          "success"
        );
      } else {
        addToast(
          language === "ar"
            ? `تم تفعيل باقة ${String(data?.planId || "").toUpperCase()} بنجاح.`
            : `${String(data?.planId || "").toUpperCase()} plan activated successfully.`,
          "success"
        );
      }

      return true;

    } catch (error) {
      console.error(
        "[FOX Activation] Secure redeem failed:",
        error
      );

      addToast(
        language === "ar"
          ? "تعذر التحقق من كود التفعيل حالياً."
          : "Unable to verify activation code right now.",
        "error"
      );

      return false;
    }
  };


  const submitInstapayPayment = (
    workspaceId: string,
    planId: PlanId,
    amountEGP: number,
    screenshotUrl: string,
    txRef: string,
    paymentType: 'plan' | 'extra_package' = 'plan',
    extraPackageName?: string,
    extraConversationsCount?: number
  ) => {
    const targetWsId =
      !isSuperAdmin
        ? currentWorkspace?.id || workspaceId
        : workspaceId;

    const ws =
      workspaces.find(
        (w) => w.id === targetWsId
      );

    if (!ws) {
      addToast(
        language === "ar"
          ? "تعذر العثور على المنشأة."
          : "Workspace not found.",
        "error"
      );
      return;
    }

    const cleanTxRef =
      String(txRef || "")
        .trim()
        .toUpperCase();

    const cleanProof =
      String(screenshotUrl || "")
        .trim();

    if (!cleanTxRef) {
      addToast(
        language === "ar"
          ? "الرقم المرجعي للتحويل مطلوب."
          : "Transaction reference is required.",
        "error"
      );
      return;
    }

    if (!cleanProof) {
      addToast(
        language === "ar"
          ? "يجب إرفاق إثبات التحويل."
          : "Payment proof is required.",
        "error"
      );
      return;
    }

    // Prevent duplicate transaction references.
    const duplicated =
      payments.some(
        (payment) =>
          String(
            payment.transactionRef || ""
          )
            .trim()
            .toUpperCase() === cleanTxRef &&
          payment.status !== "rejected"
      );

    if (duplicated) {
      addToast(
        language === "ar"
          ? "هذا الرقم المرجعي مستخدم في طلب دفع سابق."
          : "This transaction reference was already submitted.",
        "error"
      );
      return;
    }

    let verifiedAmount =
      Number(amountEGP || 0);

    let pricingSource:
      "plan_config" |
      "extra_package" =
      "extra_package";

    // NEVER trust the amount coming from the client UI
    // when purchasing a subscription plan.
    if (paymentType === "plan") {
      const plan =
        plans.find(
          (x) => x.id === planId
        );

      if (!plan) {
        addToast(
          language === "ar"
            ? "الباقة المحددة غير موجودة."
            : "Selected plan was not found.",
          "error"
        );
        return;
      }

      verifiedAmount =
        Number(
          plan.priceEGP || 0
        );

      pricingSource =
        "plan_config";
    }

    if (
      !Number.isFinite(
        verifiedAmount
      ) ||
      verifiedAmount < 0
    ) {
      addToast(
        language === "ar"
          ? "قيمة الدفع غير صحيحة."
          : "Invalid payment amount.",
        "error"
      );
      return;
    }

    const paymentId =
      `pay_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    const payment: InstapayPayment = {
      id: paymentId,

      workspaceId:
        targetWsId,

      workspaceName:
        ws.name,

      planId,
      paymentType,

      extraPackageName,
      extraConversationsCount,

      amountEGP:
        verifiedAmount,

      screenshotUrl:
        cleanProof,

      transactionRef:
        cleanTxRef,

      status:
        "pending",

      submittedAt:
        new Date().toISOString(),

      pricingSource,

      paymentMethod:
        "instapay",
    };

    setPayments(
      (prev) => [
        payment,
        ...prev.filter(
          (x) => x.id !== paymentId
        ),
      ]
    );

    setDoc(
      doc(
        db,
        "payments",
        paymentId
      ),
      sanitizeForFirestore(
        payment
      )
    ).catch((error) => {
      console.error(
        "❌ [FOX Billing] Payment save failed:",
        error
      );

      setPayments(
        (prev) =>
          prev.filter(
            (x) =>
              x.id !== paymentId
          )
      );

      addToast(
        language === "ar"
          ? "تعذر حفظ طلب الدفع."
          : "Unable to save payment request.",
        "error"
      );
    });

    addToast(
      language === "ar"
        ? "تم إرسال إثبات التحويل للمراجعة."
        : "Payment proof submitted for review.",
      "success"
    );
  };


  const approvePayment = (
    paymentId: string
  ) => {
    if (!isSuperAdmin) {
      addToast(
        "هذا الإجراء متاح فقط لمدير النظام Super Admin",
        "error"
      );
      return;
    }

    const payment =
      payments.find(
        (x) =>
          x.id === paymentId
      );

    if (!payment) {
      addToast(
        language === "ar"
          ? "طلب الدفع غير موجود."
          : "Payment request not found.",
        "error"
      );
      return;
    }

    if (
      payment.status !==
      "pending"
    ) {
      addToast(
        language === "ar"
          ? "يمكن اعتماد طلبات الدفع المعلقة فقط."
          : "Only pending payments can be approved.",
        "error"
      );
      return;
    }

    const ws =
      workspaces.find(
        (x) =>
          x.id ===
          payment.workspaceId
      );

    if (!ws) {
      addToast(
        language === "ar"
          ? "المنشأة المرتبطة بالدفع غير موجودة."
          : "Workspace linked to this payment was not found.",
        "error"
      );
      return;
    }

    const now =
      new Date();

    const nowIso =
      now.toISOString();

    let newExpiry:
      string | undefined =
      undefined;

    // =====================================================
    // MAIN PLAN PAYMENT
    // =====================================================

    if (
      payment.paymentType !==
      "extra_package"
    ) {
      const selectedPlan =
        plans.find(
          (x) =>
            x.id ===
            payment.planId
        );

      if (!selectedPlan) {
        addToast(
          language === "ar"
            ? "الباقة لم تعد موجودة."
            : "Subscription plan no longer exists.",
          "error"
        );
        return;
      }

      const expectedAmount =
        Number(
          selectedPlan.priceEGP || 0
        );

      if (
        Number(
          payment.amountEGP
        ) !== expectedAmount
      ) {
        addToast(
          language === "ar"
            ? `قيمة الدفع لا تطابق سعر الباقة الحالي: ${expectedAmount} ج.م`
            : `Payment does not match current plan price: ${expectedAmount} EGP`,
          "error"
        );
        return;
      }

      // Renewal:
      // If subscription is still active,
      // extend 30 days from current expiry.
      // Otherwise start 30 days from today.
      const existingExpiry =
        ws.subscriptionExpiresAt
          ? new Date(
              `${ws.subscriptionExpiresAt}T23:59:59`
            )
          : null;

      const base =
        existingExpiry &&
        Number.isFinite(
          existingExpiry.getTime()
        ) &&
        existingExpiry > now
          ? existingExpiry
          : now;

      const expiry =
        new Date(
          base.getTime() +
            30 *
              24 *
              60 *
              60 *
              1000
        );

      newExpiry =
        expiry
          .toISOString()
          .split("T")[0];

      const updates:
        Partial<Workspace> = {
        planId:
          payment.planId,

        status:
          "active",

        subscriptionExpiresAt:
          newExpiry,

        // New monthly cycle.
        aiConversationsUsed:
          0,
      };

      setWorkspaces(
        (prev) =>
          prev.map(
            (item) =>
              item.id === ws.id
                ? {
                    ...item,
                    ...updates,
                  }
                : item
          )
      );

      setDoc(
        doc(
          db,
          "workspaces",
          ws.id
        ),
        sanitizeForFirestore(
          updates
        ),
        {
          merge: true,
        }
      ).catch((error) =>
        console.error(
          "❌ [FOX Billing] Subscription activation failed:",
          error
        )
      );

    } else {
      // ===================================================
      // EXTRA CONVERSATION PACKAGE
      // ===================================================

      const conversations =
        Math.max(
          0,
          Number(
            payment.extraConversationsCount ||
            0
          )
        );

      if (
        conversations <= 0
      ) {
        addToast(
          language === "ar"
            ? "عدد المحادثات الإضافية غير صحيح."
            : "Invalid extra conversation amount.",
          "error"
        );
        return;
      }

      const pkg: ExtraPackage = {
        id:
          `pkg_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 7)}`,

        name:
          payment.extraPackageName ||
          `+${conversations} conversations`,

        conversationsAdded:
          conversations,

        priceEGP:
          Number(
            payment.amountEGP || 0
          ),

        addedAt:
          nowIso,
      };

      const updates:
        Partial<Workspace> = {
        extraConversationsLimit:
          Number(
            ws.extraConversationsLimit ||
            0
          ) +
          conversations,

        extraPackages: [
          ...(ws.extraPackages || []),
          pkg,
        ],
      };

      setWorkspaces(
        (prev) =>
          prev.map(
            (item) =>
              item.id === ws.id
                ? {
                    ...item,
                    ...updates,
                  }
                : item
          )
      );

      setDoc(
        doc(
          db,
          "workspaces",
          ws.id
        ),
        sanitizeForFirestore(
          updates
        ),
        {
          merge: true,
        }
      ).catch((error) =>
        console.error(
          "❌ [FOX Billing] Extra package activation failed:",
          error
        )
      );
    }

    const generatedCode =
      payment.generatedCode ||
      (
        payment.paymentType ===
        "extra_package"
          ? `FOX-EXTRA-PAID-${Date.now()
              .toString()
              .slice(-6)}`
          : `FOX-PAID-${String(
              payment.planId
            ).toUpperCase()}-${Date.now()
              .toString()
              .slice(-6)}`
      );

    const paymentUpdate:
      Partial<InstapayPayment> = {
      status:
        "approved",

      approvedAt:
        nowIso,

      approvedBy:
        currentUser?.email ||
        "super_admin",

      activatedAt:
        nowIso,

      generatedCode,

      subscriptionExpiresAt:
        newExpiry,
    };

    setPayments(
      (prev) =>
        prev.map(
          (item) =>
            item.id === paymentId
              ? {
                  ...item,
                  ...paymentUpdate,
                }
              : item
        )
    );

    setDoc(
      doc(
        db,
        "payments",
        paymentId
      ),
      sanitizeForFirestore(
        paymentUpdate
      ),
      {
        merge: true,
      }
    ).catch((error) =>
      console.error(
        "❌ [FOX Billing] Payment approval save failed:",
        error
      )
    );

    addToast(
      payment.paymentType ===
      "extra_package"
        ? language === "ar"
          ? "✅ تم اعتماد الدفع وإضافة المحادثات."
          : "✅ Payment approved and conversations added."
        : language === "ar"
        ? `✅ تم اعتماد الدفع وتفعيل الباقة حتى ${newExpiry}.`
        : `✅ Payment approved. Subscription active until ${newExpiry}.`,
      "success"
    );
  };


  const rejectPayment = (
    paymentId: string,
    reason: string
  ) => {
    if (!isSuperAdmin) {
      addToast(
        "هذا الإجراء متاح فقط لمدير النظام Super Admin",
        "error"
      );
      return;
    }

    const payment =
      payments.find(
        (x) =>
          x.id === paymentId
      );

    if (!payment) {
      return;
    }

    if (
      payment.status !==
      "pending"
    ) {
      addToast(
        language === "ar"
          ? "يمكن رفض الطلبات المعلقة فقط."
          : "Only pending payments can be rejected.",
        "error"
      );
      return;
    }

    const cleanReason =
      String(reason || "")
        .trim();

    if (!cleanReason) {
      addToast(
        language === "ar"
          ? "اكتب سبب الرفض."
          : "Enter a rejection reason.",
        "error"
      );
      return;
    }

    const updates:
      Partial<InstapayPayment> = {
      status:
        "rejected",

      rejectionReason:
        cleanReason,

      rejectedAt:
        new Date().toISOString(),

      rejectedBy:
        currentUser?.email ||
        "super_admin",
    };

    setPayments(
      (prev) =>
        prev.map(
          (item) =>
            item.id === paymentId
              ? {
                  ...item,
                  ...updates,
                }
              : item
        )
    );

    setDoc(
      doc(
        db,
        "payments",
        paymentId
      ),
      sanitizeForFirestore(
        updates
      ),
      {
        merge: true,
      }
    ).catch((error) =>
      console.error(
        "❌ [FOX Billing] Rejection save failed:",
        error
      )
    );

    addToast(
      language === "ar"
        ? "تم رفض طلب الدفع وتسجيل السبب."
        : "Payment rejected and reason recorded.",
      "info"
    );
  };


  const updateWorkspaceStatus = (workspaceId: string, status: "active" | "pending" | "suspended") => {
    if (!isSuperAdmin) {
      addToast("هذا الإجراء متاح فقط لمدير النظام Super Admin", "error");
      return;
    }
    setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? { ...w, status } : w)));
    addToast(`Workspace status updated to ${status}`, "info");
  };

  const updateWorkspacePlan = (workspaceId: string, planId: PlanId) => {
    if (!isSuperAdmin) {
      addToast("هذا الإجراء متاح فقط لمدير النظام Super Admin", "error");
      return;
    }
    setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? { ...w, planId } : w)));
    addToast(`Workspace upgraded/downgraded to ${planId}`, "success");
  };

  const updateWorkspaceField = (workspaceId: string, updates: Partial<Workspace>) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? { ...w, ...updates } : w)));
  };

  const deleteWorkspace = async (workspaceId: string) => {
    if (!isSuperAdmin) {
      addToast("هذا الإجراء متاح فقط لمدير النظام Super Admin", "error");
      return;
    }

    // Blacklist workspace ID locally to prevent background auto-resync
    setDeletedWorkspaceIds((prev) => {
      const updated = Array.from(new Set([...prev, workspaceId]));
      localStorage.setItem("fox_deleted_workspaces", JSON.stringify(updated));
      return updated;
    });

    // Remove from workspaces state and local storage
    setWorkspaces((prev) => {
      const updated = prev.filter((w) => w.id !== workspaceId);
      localStorage.setItem("fox_workspaces", JSON.stringify(updated));
      return updated;
    });

    // Dismiss latest registration toast if it matches this workspace
    setLatestRegistration((prev) => (prev?.workspaceId === workspaceId ? null : prev));

    // Delete from persistent Firestore database
    try {
      await deleteDoc(doc(db, "workspaces", workspaceId));
    } catch (err) {
      console.warn("Firestore delete workspace notice:", err);
    }

    // Delete from Node.js agency backend store
    try {
      await fetch(`/api/agency/clients/${workspaceId}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Backend client deletion notice:", err);
    }

    addToast(
      language === "ar"
        ? "تم حذف المشترك نهائياً وإزالته من قاعدة البيانات ولن يظهر مجدداً"
        : "Workspace permanently deleted from database",
      "info"
    );
  };

  // CRM & Industry actions with strict tenant boundary checks
  const addCustomerLead = (lead: Omit<CustomerLead, "id" | "createdAt">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (lead.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newLead: CustomerLead = {
      ...lead,
      workspaceId: targetWsId,
      id: `lead_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setCrmLeads((prev) => [newLead, ...prev]); setDoc(doc(db, "crmLeads", newLead.id), newLead).catch(console.error);
    
    // Update workspace totals
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === targetWsId ? { ...w, totalCustomers: w.totalCustomers + 1 } : w))
    );
    addToast("CRM Record created", "success");
  };

  const updateLeadStatus = (leadId: string, status: CustomerLead["status"]) => {
    const existing = crmLeads.find((l) => l.id === leadId);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }
    setCrmLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l))); updateDoc(doc(db, "crmLeads", leadId), { status }).catch(console.error);
    addToast(`Lead status set to ${status}`, "info");
  };

  const addAppointment = (apt: Omit<Appointment, "id">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (apt.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newApt: Appointment = {
      ...apt,
      workspaceId: targetWsId,
      id: `apt_${Math.random().toString(36).substring(2, 8)}`,
    };
    // Keep dashboard-compatible and backend-compatible fields together.
    const syncedApt: any = {
      ...newApt,
      customerName: newApt.patientName,
      phone: newApt.patientPhone,
      time: newApt.timeSlot,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setAppointments((prev) => [newApt, ...prev]);

    // Root collection used by dashboard realtime sync.
    setDoc(
      doc(db, "appointments", newApt.id),
      syncedApt
    ).catch(console.error);

    // Tenant-isolated source used by FOX AI / Telegram.
    setDoc(
      doc(
        db,
        "workspaces",
        targetWsId,
        "appointments",
        newApt.id
      ),
      syncedApt
    ).catch((error) => {
      console.warn(
        "[FOX CRM] Tenant appointment create sync failed:",
        error
      );
    });

    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === targetWsId
          ? { ...w, totalAppointments: w.totalAppointments + 1 }
          : w
      )
    );

    addToast("Appointment scheduled!", "success");
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    const existing = appointments.find((a) => a.id === id);
    if (!existing) return;

    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }

    // Keep backend canonical fields compatible with dashboard fields.
    const syncedUpdates: any = { ...updates };

    if (updates.patientName !== undefined) {
      syncedUpdates.customerName = updates.patientName;
    }

    if (updates.patientPhone !== undefined) {
      syncedUpdates.phone = updates.patientPhone;
    }

    if (updates.timeSlot !== undefined) {
      syncedUpdates.time = updates.timeSlot;
    }

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      )
    );

    // Root collection used by the current dashboard.
    updateDoc(
      doc(db, "appointments", id),
      syncedUpdates
    ).catch(console.error);

    // Tenant-isolated collection used by FOX AI / Telegram.
    if (existing.workspaceId) {
      updateDoc(
        doc(
          db,
          "workspaces",
          existing.workspaceId,
          "appointments",
          id
        ),
        syncedUpdates
      ).catch((error) => {
        console.warn(
          "[FOX CRM] Tenant appointment update sync failed:",
          error
        );
      });
    }

    addToast("Appointment updated", "success");
  };

  const updateAppointmentStatus = (
    aptId: string,
    status: Appointment["status"]
  ) => {
    const existing = appointments.find((a) => a.id === aptId);
    if (!existing) return;

    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }

    const updates = {
      status,
      updatedAt: new Date().toISOString(),
      ...(status === "Cancelled"
        ? { cancelledAt: new Date().toISOString() }
        : {})
    };

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === aptId ? { ...a, status } : a
      )
    );

    // Root dashboard collection.
    updateDoc(
      doc(db, "appointments", aptId),
      updates
    ).catch(console.error);

    // Tenant CRM collection.
    if (existing.workspaceId) {
      updateDoc(
        doc(
          db,
          "workspaces",
          existing.workspaceId,
          "appointments",
          aptId
        ),
        updates
      ).catch((error) => {
        console.warn(
          "[FOX CRM] Tenant appointment status sync failed:",
          error
        );
      });
    }

    addToast(`Appointment status updated: ${status}`, "info");
  };

  const addMenuItem = (item: Omit<MenuItem, "id">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (item.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newItem: MenuItem = { ...item, workspaceId: targetWsId, id: `m_${Math.random().toString(36).substring(2, 8)}` };
    setMenuItems((prev) => [newItem, ...prev]); setDoc(doc(db, "menuItems", newItem.id), newItem).catch(console.error);
    addToast("Menu item added", "success");
  };

  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    const existing = menuItems.find((m) => m.id === id);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }
    setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m))); updateDoc(doc(db, "menuItems", id), updates).catch(console.error);
  };

  const addMedicineItem = (med: Omit<MedicineItem, "id">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (med.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newMed: MedicineItem = { ...med, workspaceId: targetWsId, id: `med_${Math.random().toString(36).substring(2, 8)}` };
    setMedicines((prev) => [newMed, ...prev]); setDoc(doc(db, "medicines", newMed.id), newMed).catch(console.error);
    addToast("Medicine added to inventory", "success");
  };

  const updateMedicineItem = (id: string, updates: Partial<MedicineItem>) => {
    const existing = medicines.find((m) => m.id === id);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m))); updateDoc(doc(db, "medicines", id), updates).catch(console.error);
  };

  
  const addCourse = (course: Omit<CourseItem, "id" | "workspaceId">) => {
    if (!currentWorkspace) return;
    const newCourse: CourseItem = { ...course, id: Date.now().toString(), workspaceId: currentWorkspace.id };
    setCourses((prev) => [newCourse, ...prev]);
  };
  const updateCourse = (id: string, updates: Partial<CourseItem>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };
  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const addCourseReview = (review: Omit<CourseReview, "id" | "workspaceId" | "date">) => {
    if (!currentWorkspaceId) return;
    const newReview: CourseReview = {
      ...review,
      id: "rev-" + Math.random().toString(36).substring(2, 9),
      workspaceId: currentWorkspaceId,
      date: new Date().toISOString()
    };
    setCourseReviews((prev) => [newReview, ...prev]);
  };

  const updateCourseReview = (id: string, updates: Partial<CourseReview>) => {
    setCourseReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteCourseReview = (id: string) => {
    setCourseReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const addClinicService = (service: Omit<ClinicService,
   "id">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (service.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;
    const newService: ClinicService = { ...service, workspaceId: targetWsId, id: `srv_${Math.random().toString(36).substring(2, 8)}` };
    setClinicServices((prev) => [newService, ...prev]); setDoc(doc(db, "clinicServices", newService.id), newService).catch(console.error);
    addToast("Clinic service added", "success");
  };

  const updateClinicService = (id: string, updates: Partial<ClinicService>) => {
    setClinicServices((prev) => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    updateDoc(doc(db, "clinicServices", id), updates).catch(console.error);
    addToast("Clinic service updated", "success");
  };

  const deleteClinicService = (id: string) => {
    setClinicServices((prev) => prev.filter((s) => s.id !== id)); deleteDoc(doc(db, "clinicServices", id)).catch(console.error);
    addToast("Clinic service removed", "info");
  };

  const addDoctor = (docItem: Omit<Doctor, "id">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (docItem.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;
    const newDoc: Doctor = { ...docItem, workspaceId: targetWsId, id: `doc_${Math.random().toString(36).substring(2, 8)}` };
    setDoctors((prev) => [newDoc, ...prev]); setDoc(doc(db, "doctors", newDoc.id), newDoc).catch(console.error);
    addToast("Doctor added", "success");
  };

  const updateDoctor = (id: string, updates: Partial<Doctor>) => {
    setDoctors((prev) => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    updateDoc(doc(db, "doctors", id), updates).catch(console.error);
    addToast("Doctor updated", "success");
  };

  const deleteDoctor = (id: string) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id)); deleteDoc(doc(db, "doctors", id)).catch(console.error);
    addToast("Doctor removed", "info");
  };

  const deleteProductItem = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id)); deleteDoc(doc(db, "products", id)).catch(console.error);
    addToast("Product removed", "info");
  };

  const deleteMedicineItem = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id)); deleteDoc(doc(db, "medicines", id)).catch(console.error);
    addToast("Medicine removed", "info");
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((m) => m.id !== id)); deleteDoc(doc(db, "menuItems", id)).catch(console.error);
    addToast("Menu item removed", "info");
  };

  const updateProductItem = (id: string, updates: Partial<StoreProduct>) => {
    setProducts((prev) => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    updateDoc(doc(db, "products", id), updates).catch(console.error);
    addToast("Product updated", "success");
  };

  const addProductOrder = (order: Omit<ProductOrder, "id">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (order.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newOrder: ProductOrder = { ...order, workspaceId: targetWsId, id: `ord_${Math.random().toString(36).substring(2, 8)}` };
    setProductOrders((prev) => [newOrder, ...prev]); setDoc(doc(db, "productOrders", newOrder.id), newOrder).catch(console.error);
    addToast("تم إرسال طلب الأوردر لصاحب المنشأة للتحقق من التوفر", "success");
  };

  const updateProductOrderStatus = (id: string, status: ProductOrder["status"], ownerNotes?: string) => {
    setProductOrders((prev) => prev.map(o => o.id === id ? { ...o, status, ownerNotes: ownerNotes ?? o.ownerNotes } : o));
    updateDoc(doc(db, "productOrders", id), { status, ...(ownerNotes !== undefined ? { ownerNotes } : {}) }).catch(console.error);
    addToast(`تم تحديث حالة الطلب: ${status}`, "info");
  };

  useEffect(() => {
    localStorage.setItem("fox_service_ratings", JSON.stringify(serviceRatings));
  }, [serviceRatings]);

  const addServiceRating = (rating: Omit<ServiceRating, "id">) => {
    const targetWsId = rating.workspaceId || currentWorkspace?.id || currentUser?.workspaceId || "ws_agency";

    const newRating: ServiceRating = {
      ...rating,
      workspaceId: targetWsId,
      id: `rat_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: rating.createdAt || new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    setServiceRatings((prev) => [newRating, ...prev.filter((r) => r.id !== newRating.id)]);
    setDoc(doc(db, "serviceRatings", newRating.id), sanitizeForFirestore(newRating)).catch(console.error);
    addToast(
      language === "ar"
        ? "شكراً لك! تم تسجيل تقييم الخدمة بنجاح ورفعه لقاعدة البيانات السحابية Firebase ☁️."
        : "Thank you! Your rating has been submitted successfully to Cloud Firebase.",
      "success"
    );
  };

  const addProductItem = (prod: Omit<StoreProduct, "id">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (prod.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newProd: StoreProduct = { ...prod, workspaceId: targetWsId, id: `p_${Math.random().toString(36).substring(2, 8)}` };
    setProducts((prev) => [newProd, ...prev]); setDoc(doc(db, "products", newProd.id), newProd).catch(console.error);
    addToast("Product added to catalog", "success");
  };

  const addComplaint = (cmp: Omit<Complaint, "id" | "date">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (cmp.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newCmp: Complaint = {
      ...cmp,
      workspaceId: targetWsId,
      id: `cmp_${Math.random().toString(36).substring(2, 8)}`,
      date: new Date().toISOString().split("T")[0],
    };
    setComplaints((prev) => [newCmp, ...prev]); setDoc(doc(db, "complaints", newCmp.id), newCmp).catch(console.error);
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === targetWsId ? { ...w, totalComplaints: w.totalComplaints + 1 } : w))
    );
    addToast("Complaint logged in CRM", "info");
  };

  const updateComplaintStatus = (cmpId: string, status: Complaint["status"]) => {
    const existing = complaints.find((c) => c.id === cmpId);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }
    setComplaints((prev) => prev.map((c) => (c.id === cmpId ? { ...c, status } : c))); updateDoc(doc(db, "complaints", cmpId), { status }).catch(console.error);
    addToast(`Complaint status updated to ${status}`, "info");
  };

  // Knowledge Base Fact Actions
  const approveKnowledgeFact = (factId: string) => {
    const existing = knowledgeFacts.find((k) => k.id === factId);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }
    setKnowledgeFacts((prev) => prev.map((k) => (k.id === factId ? { ...k, approved: true } : k))); updateDoc(doc(db, "knowledgeFacts", factId), { approved: true }).catch(console.error);
    addToast("Knowledge Fact Approved for Live AI Agent!", "success");
  };

  const rejectKnowledgeFact = (factId: string) => {
    const existing = knowledgeFacts.find((k) => k.id === factId);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }
    setKnowledgeFacts((prev) => prev.filter((k) => k.id !== factId)); deleteDoc(doc(db, "knowledgeFacts", factId)).catch(console.error);
    addToast("Fact rejected and removed", "info");
  };

  const addKnowledgeFact = async (fact: Omit<KnowledgeBaseFact, "id" | "createdAt">) => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (fact.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newFact: KnowledgeBaseFact = {
      ...fact,
      workspaceId: targetWsId,
      id: `kb_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setKnowledgeFacts((prev) => [newFact, ...prev]); setDoc(doc(db, "knowledgeFacts", newFact.id), sanitizeForFirestore(newFact)).catch(console.error);

    try {
      const kbRef = doc(db, "workspaces", targetWsId, "knowledgeBase", newFact.id);
      await setDoc(kbRef, sanitizeForFirestore(newFact));
    } catch (err) {
      console.warn("Firestore save knowledge fact fallback:", err);
    }

    addToast("New knowledge entry added!", "success");
  };

  const updateAISettings = async (workspaceId: string, settings: any) => {
    if (!isSuperAdmin && workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل إعدادات هذا الحساب", "error");
      return;
    }
    const targetWs = workspaces.find((w) => w.id === workspaceId);
    const updatedAISettings = { ...(targetWs?.aiSettings || {}), ...settings };

    setWorkspaces((prev) =>
      prev.map((w) => (w.id === workspaceId ? { ...w, aiSettings: updatedAISettings } : w))
    );

    try {
      const wsRef = doc(db, "workspaces", workspaceId);
      await setDoc(
        wsRef,
        {
          id: workspaceId,
          aiSettings: updatedAISettings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Firestore save for workspace AI settings fallback:", err);
    }

    addToast("تم حفظ وتحديث إعدادات وكيل الذكاء الاصطناعي بنجاح في Firestore!", "success");
  };

  const updateTelegramBotToken = async (
    workspaceId: string,
    token: string,
    botName?: string
  ) => {
    const trimmed = token.trim();

    if (!trimmed) {
      addToast(
        "توكن Telegram مطلوب لإتمام الربط.",
        "error"
      );
      return;
    }

    try {
      const response = await authenticatedFetch(
        `/api/telegram/workspace/${encodeURIComponent(
          workspaceId
        )}/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: trimmed,
            botName:
              botName?.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          "Telegram connection failed"
        );
      }

      // IMPORTANT:
      // Never store the real Telegram token in React state,
      // localStorage or Firestore.
      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w.id !== workspaceId) {
            return w;
          }

          const safeWorkspace: any = {
            ...w,
            telegramBotStatus: "connected",
            telegramBotName:
              data.telegramBotName ||
              (data.botInfo?.username
                ? `@${data.botInfo.username}`
                : botName ||
                  w.telegramBotName),
            telegramBotId:
              data.botInfo?.id ||
              (w as any).telegramBotId,
            telegramConnectedAt:
              new Date().toISOString(),
          };

          delete safeWorkspace.telegramBotToken;

          return safeWorkspace;
        })
      );

      addToast(
        "تم تشفير وحفظ Telegram Token وربط بوت المنشأة بنجاح!",
        "success"
      );

    } catch (err: any) {
      console.error(
        "Secure Telegram connection failed:",
        err
      );

      addToast(
        err?.message ||
        "تعذر ربط بوت Telegram.",
        "error"
      );

      throw err;
    }
  };

  const updateWhatsAppBotStatus = (workspaceId: string, status: 'connected' | 'disconnected', phone?: string) => {
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              whatsappBotStatus: status,
              whatsappPhoneNumber: phone || w.whatsappPhoneNumber || w.phone || "+20 100 000 0000",
              whatsappConnectedAt: status === "connected" ? new Date().toISOString() : undefined,
            }
          : w
      )
    );
    if (status === "connected") {
      addToast("تم ربط الواتساب بنجاح وتفعيل بوت الذكاء الاصطناعي 🟢", "success");
    } else {
      addToast("تم قطع ربط حساب الواتساب.", "info");
    }
  };

  const updatePlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    if (!isSuperAdmin) {
      addToast("هذا الإجراء متاح فقط لمدير النظام Super Admin", "error");
      return;
    }

    const updatedPlans = plans.map((p) => (p.id === planId ? { ...p, ...updates } : p));
    setPlans(updatedPlans);
    localStorage.setItem("fox_plans", JSON.stringify(updatedPlans));

    try {
      const targetPlan = updatedPlans.find((p) => p.id === planId);
      if (targetPlan) {
        const planRef = doc(db, "plans", planId);
        await setDoc(planRef, targetPlan, { merge: true });
      }
    } catch (err) {
      console.warn("Firestore save for plan update error:", err);
    }

    addToast(`تم تحديث باقة (${updates.name || planId}) بنجاح في Firestore!`, "success");
  };

  const resetPlansToDefault = async () => {
    if (!isSuperAdmin) {
      addToast("هذا الإجراء متاح فقط لمدير النظام Super Admin", "error");
      return;
    }

    setPlans(INITIAL_PLANS);
    localStorage.setItem("fox_plans", JSON.stringify(INITIAL_PLANS));

    try {
      for (const p of INITIAL_PLANS) {
        await setDoc(doc(db, "plans", p.id), p);
      }
    } catch (err) {
      console.warn("Firestore reset plans error:", err);
    }

    addToast("تمت استعادة أسعار ومميزات الباقات الافتراضية بنجاح في Firestore!", "info");
  };

  // Support Ticket Actions
  const createSupportTicket = (
    data: Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "replies"> & { initialMessage: string }
  ): SupportTicket => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (data.workspaceId || currentWorkspace?.id);
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const newId = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialReply = {
      id: `rep_${Math.random().toString(36).substring(2, 8)}`,
      senderId: currentUser?.id || "user_client",
      senderName: currentUser?.name || data.clientEmail,
      senderRole: currentUser?.role || "client_owner",
      message: data.initialMessage,
      createdAt: nowStr,
    };

    const newTicket: SupportTicket = {
      id: newId,
      workspaceId: targetWsId || "ws_default",
      workspaceName: data.workspaceName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      status: "Open",
      createdAt: nowStr,
      updatedAt: nowStr,
      replies: [initialReply],
    };

    setSupportTickets((prev) => [newTicket, ...prev]); setDoc(doc(db, "supportTickets", newTicket.id), sanitizeForFirestore(newTicket)).catch(console.error);
    addToast(`تذكرة الدعم ${newId} تم إنشاؤها بنجاح!`, "success");
    return newTicket;
  };

  const addTicketReply = (ticketId: string, message: string) => {
    if (!message.trim()) return;
    const existing = supportTickets.find((t) => t.id === ticketId);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذه التذكرة", "error");
      return;
    }

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);

    const replyObj = {
      id: `rep_${Math.random().toString(36).substring(2, 8)}`,
      senderId: currentUser?.id || "user_current",
      senderName: currentUser?.name || (isSuperAdmin ? "Hesham M. (Super Admin)" : "Client User"),
      senderRole: currentUser?.role || "client_owner",
      message: message.trim(),
      createdAt: nowStr,
    };

    setSupportTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        let newStatus = t.status;
        if (isSuperAdmin) {
          newStatus = "Awaiting Client";
        } else if (t.status === "Awaiting Client" || t.status === "Open" || t.status === "Resolved") {
          newStatus = "In Progress";
        }

        return {
          ...t,
          status: newStatus,
          updatedAt: nowStr,
          replies: [...t.replies, replyObj],
        };
      })
    );

    addToast(isSuperAdmin ? "تم إرسال رد إدارة الوكالة بنجاح!" : "تم إرسال ردك للدعم الفني!", "success");
  };

  
  const addCoupon = (couponData: Omit<Coupon, "id" | "createdAt">) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: `coup_${Math.random().toString(36).substring(2, 9)}`,
      code: String(couponData.code || "").trim().toUpperCase(),
      usageCount: couponData.usageCount ?? 0,
      usageLimit: couponData.usageLimit ?? 0,
      createdAt: new Date().toISOString()
    };
    setCoupons(prev => [newCoupon, ...prev]);
    setDoc(doc(db, "coupons", newCoupon.id), sanitizeForFirestore(newCoupon)).catch(console.error);
    addToast("Coupon added successfully", "success");
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, "coupons", id)).catch(console.error);
    addToast("Coupon deleted", "info");
  };

  const toggleCouponAI = (id: string) => {
    const existing = coupons.find(c => c.id === id);
    if (!existing) return;
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, aiCanUse: !c.aiCanUse } : c));
    updateDoc(doc(db, "coupons", id), { aiCanUse: !existing.aiCanUse }).catch(console.error);
    addToast("Coupon AI permissions updated", "info");
  };

  const updateTicketStatus = (ticketId: string, status: SupportTicket["status"]) => {
    const existing = supportTickets.find((t) => t.id === ticketId);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذه التذكرة", "error");
      return;
    }

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    setSupportTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status, updatedAt: nowStr } : t))); updateDoc(doc(db, "supportTickets", ticketId), { status, updatedAt: nowStr }).catch(console.error);
    addToast(`تم تحديث حالة التذكرة إلى (${status})`, "info");
  };

  // Subscriber Modification Requests state and logic
  const [modificationRequests, setModificationRequests] = useState<SubscriberModificationRequest[]>([]);

  const fetchModificationRequests = async () => {
    try {
      const res = await fetch("/api/agency/modification-requests");
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && Array.isArray(data.requests)) {
        setModificationRequests(data.requests);
      }
    } catch {
      // Quiet fallback during dev server restarts or temporary connection blips
    }
  };

  useEffect(() => {
    fetchModificationRequests();
    const interval = setInterval(fetchModificationRequests, 4000);
    return () => clearInterval(interval);
  }, []);

  const createSubscriberModificationRequest = async (workspaceId: string, proposedData: any, adminNotes?: string) => {
    try {
      const res = await fetch("/api/agency/modification-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, proposedData, adminNotes }),
      });
      const data = await res.json();
      if (data.success && data.requests) {
        setModificationRequests(data.requests);
        addToast("تم إنشاء طلب تعديل البيانات وإرسال إشعار التأكيد للعميل عبر تليجرام!", "success");
        return data.request;
      } else {
        addToast(data.error || "فشل إنشاء طلب التعديل", "error");
        return null;
      }
    } catch {
      addToast("خطأ في الاتصال بالسيرفر", "error");
      return null;
    }
  };

  const confirmModificationByClient = async (requestId: string) => {
    try {
      const res = await fetch(`/api/agency/modification-requests/${requestId}/confirm-by-client`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.requests) {
        setModificationRequests(data.requests);
        addToast("تم تأكيد التعديل بنجاح من العميل! الطلب الآن بانتظار موافقة صاحب الوكالة.", "success");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const approveSubscriberModificationRequest = async (requestId: string, adminNotes?: string) => {
    try {
      const res = await fetch(`/api/agency/modification-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setModificationRequests(data.requests || []);
        if (data.clients) {
          setWorkspaces(data.clients);
          localStorage.setItem("fox_workspaces", JSON.stringify(data.clients));
        }
        addToast("تمت الموافقة على طلب التعديل وتحديث بيانات المشترك بنجاح!", "success");
        return true;
      } else {
        addToast(data.error || "فشل اعتماد الطلب", "error");
        return false;
      }
    } catch {
      addToast("خطأ في السيرفر", "error");
      return false;
    }
  };

  const rejectSubscriberModificationRequest = async (requestId: string, adminNotes?: string) => {
    try {
      const res = await fetch(`/api/agency/modification-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setModificationRequests(data.requests || []);
        addToast("تم رفض طلب التعديل.", "info");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        darkMode,
        setDarkMode,
        language,
        setLanguage,
        workspaces,
        currentWorkspace,
        setCurrentWorkspaceId,
        plans,
        activationCodes,
        payments,
        crmLeads: scopedCrmLeads,
        doctors: scopedDoctors,
        appointments: scopedAppointments,
        menuItems: scopedMenuItems,
        medicines: scopedMedicines,
        products: scopedProducts,
        productOrders: scopedProductOrders,
        serviceRatings: scopedServiceRatings,
        addProductOrder,
        updateProductOrderStatus,
        addServiceRating,
        clinicServices: scopedClinicServices,
        courses: scopedCourses,
        courseReviews,
        addCourseReview,
        updateCourseReview,
        deleteCourseReview,
        addCourse,
        updateCourse,
        deleteCourse,
        addClinicService,
  
        deleteClinicService,
  
        updateClinicService,
  
        addDoctor,
        deleteDoctor,
        updateDoctor,
        deleteProductItem,
        deleteMedicineItem,
        deleteMenuItem,
        complaints: scopedComplaints,
        knowledgeFacts: scopedKnowledgeFacts,
        knowledgeBase: scopedKnowledgeFacts,
        coupons: scopedCoupons,
        n8nWorkflows: scopedN8nWorkflows,
        supportTickets: scopedSupportTickets,
        auditLogs,
        addAuditLog,
        geminiMetrics,
        recordGeminiCall,
        simulateGeminiPing,
        clearTenantErrorLogs,
        resetGeminiMetrics,
        toasts,
        addToast,
        latestRegistration,
        triggerRegistrationFeedback,
        dismissRegistrationFeedback,
        loginAs,
        loginWithEmail,
        logout,
        registerWorkspace,
        generateActivationCode,
        revokeActivationCode,
        redeemActivationCode,
        submitInstapayPayment,
        approvePayment,
        rejectPayment,
        updateWorkspaceStatus,
        updateWorkspacePlan,
        updateWorkspaceField,
        updateWorkspace: updateWorkspaceField,
        deleteWorkspace,
        createSupportTicket,
        addTicketReply,
        updateTicketStatus,
        addCustomerLead,
        updateLeadStatus,
        addAppointment,
        updateAppointmentStatus,
        updateAppointment,
        addMenuItem,
        updateMenuItem,
        addMedicineItem,
        updateMedicineItem,
        addProductItem,
        updateProductItem,
        addComplaint,
        updateComplaintStatus,
        approveKnowledgeFact,
        rejectKnowledgeFact,
        addKnowledgeFact,
        addCoupon,
        deleteCoupon,
        toggleCouponAI,
        updateAISettings,
        updateTelegramBotToken,
        updateWhatsAppBotStatus,
        updatePlan,
        resetPlansToDefault,
        modificationRequests,
        createSubscriberModificationRequest,
        confirmModificationByClient,
        approveSubscriberModificationRequest,
        rejectSubscriberModificationRequest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
