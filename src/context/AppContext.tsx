import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, where, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, auth, sanitizeForFirestore } from "../services/firebase";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import type { User as FirebaseAuthUser } from "firebase/auth";
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
  INITIAL_PLANS,
  INITIAL_WORKSPACES,
  INITIAL_ACTIVATION_CODES,
  INITIAL_PAYMENTS,
  INITIAL_DOCTORS,
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
import { createAuditLogId } from "../utils/auditLog";
import { calculateEntitlementRenewal } from "../utils/entitlementRenewal";
import { resolveAuthorizedWorkspaceSelection } from "../utils/workspaceHydration";
import { isValidDateOnlyKey } from "../utils/dateOnly";
import { resolveAuthoritativeUserRole } from "../security/appAuthorization";
import {
  RegistrationCoordinator,
  rollbackCreatedAuthIdentity,
  shouldRollbackRegistration,
  type RegistrationProvisioningOperation,
} from "../security/registrationProvisioning";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface AppContextType {
  currentUser: User | null;
  authHydrated: boolean;
  workspacesLoading: boolean;
  workspacesError: string | null;
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
  crmLeadsLoading: boolean;
  crmLeadsError: string | null;
  doctors: Doctor[];
  appointments: Appointment[];
  appointmentsLoading: boolean;
  appointmentsError: string | null;
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
  addCustomerLead: (lead: Omit<CustomerLead, "id" | "createdAt">) => Promise<void>;
  updateLeadStatus: (leadId: string, status: CustomerLead["status"]) => Promise<void>;
  addAppointment: (apt: Omit<Appointment, "id">) => Promise<boolean>;
  updateAppointmentStatus: (aptId: string, status: Appointment["status"]) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
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
  // Firebase Auth + users/{uid} are authoritative. Browser storage must
  // never impersonate an authenticated user while Firebase restores.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  const registrationCoordinatorRef = useRef(
    new RegistrationCoordinator(),
  );
  const mountedRef = useRef(true);
  const lastObservedAuthUidRef = useRef("");
  const authHydrationRef = useRef<{
    uid: string;
    status: "pending" | "success" | "failure";
    user: User | null;
  }>({ uid: "", status: "pending", user: null });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const waitForAuthHydration = async (
    uid: string,
    timeoutMs = 10000,
  ): Promise<User | null> => {
    const deadline = timeoutMs > 0 ? Date.now() + timeoutMs : Number.POSITIVE_INFINITY;

    while (Date.now() < deadline) {
      if (!mountedRef.current) return null;

      const result = authHydrationRef.current;
      if (
        auth.currentUser?.uid !== uid &&
        result.uid !== uid
      ) {
        return null;
      }
      if (result.uid === uid && result.status !== "pending") {
        return result.status === "success" ? result.user : null;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }

    return null;
  };

  useEffect(() => {
    let cancelled = false;
    let revision = 0;

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        const currentRevision = ++revision;
        const nextUid = firebaseUser?.uid || "";
        const previousUid = lastObservedAuthUidRef.current;
        lastObservedAuthUidRef.current = nextUid;
        authHydrationRef.current = {
          uid: nextUid,
          status: "pending",
          user: null,
        };
        setAuthHydrated(false);
        setCurrentUser(null);
        setWorkspaces([]);
        setWorkspacesLoading(true);
        setCrmLeads([]);
        setAppointments([]);
        if (previousUid && previousUid !== nextUid) {
          setCurrentWorkspaceIdState("");
          localStorage.removeItem("fox_current_workspace");
        }

        void (async () => {
          if (!firebaseUser) {
            if (!cancelled && currentRevision === revision) {
              setCurrentUser(null);
              setAuthHydrated(true);
              authHydrationRef.current = {
                uid: "",
                status: "success",
                user: null,
              };
              localStorage.removeItem("fox_user");
            }
            return;
          }

          let provisioning: RegistrationProvisioningOperation | null = null;

          try {
            const profileRef = doc(db, "users", firebaseUser.uid);
            let profileSnapshot: any = null;

            provisioning = await registrationCoordinatorRef.current
              .waitForAuthOperation(
                firebaseUser.uid,
                firebaseUser.email,
              );

            if (provisioning) {
              await provisioning.profileReady;

              if (provisioning.outcome !== "committed") {
                throw new Error("AUTH_PROFILE_PROVISIONING_FAILED");
              }

              while (!cancelled && currentRevision === revision) {
                try {
                  profileSnapshot = await getDoc(profileRef);
                  if (profileSnapshot.exists()) break;
                } catch (profileError) {
                  console.warn(
                    "[FOX AUTH] Waiting for provisioned profile:",
                    profileError,
                  );
                }

                await new Promise((resolve) =>
                  window.setTimeout(resolve, 250),
                );
              }

              if (cancelled || currentRevision !== revision) return;
            } else {
              profileSnapshot = await getDoc(profileRef);
            }

            if (!profileSnapshot?.exists()) {
              throw new Error("AUTH_PROFILE_NOT_FOUND");
            }

            const profile = profileSnapshot.data() as any;
            const authoritativeRole = resolveAuthoritativeUserRole(
              profile.role,
            );
            if (!authoritativeRole) {
              throw new Error("AUTH_PROFILE_ROLE_INVALID");
            }

            const restoredUser: User = {
              id: firebaseUser.uid,
              name:
                profile.name ||
                firebaseUser.displayName ||
                firebaseUser.email ||
                "FOX User",
              email:
                profile.email ||
                firebaseUser.email ||
                "",
              role: authoritativeRole,
              workspaceId: profile.workspaceId,
              createdAt:
                profile.createdAt ||
                new Date().toISOString(),
            };

            if (
              restoredUser.role !== "super_admin" &&
              !restoredUser.workspaceId
            ) {
              throw new Error("AUTH_WORKSPACE_BINDING_REQUIRED");
            }

            if (!cancelled && currentRevision === revision) {
              setCurrentUser(restoredUser);
              setAuthHydrated(true);
              authHydrationRef.current = {
                uid: firebaseUser.uid,
                status: "success",
                user: restoredUser,
              };
              localStorage.setItem(
                "fox_user",
                JSON.stringify(restoredUser),
              );

              if (restoredUser.workspaceId) {
                setCurrentWorkspaceIdState(
                  restoredUser.workspaceId,
                );
              }
            }
          } catch (error) {
            console.error(
              "[FOX AUTH] Session restoration failed:",
              error,
            );

            if (
              !(
                provisioning &&
                registrationCoordinatorRef.current.isCurrent(provisioning) &&
                provisioning.uid === firebaseUser.uid &&
                provisioning.outcome !== "committed"
              ) &&
              auth.currentUser?.uid === firebaseUser.uid
            ) {
              try {
                await firebaseSignOut(auth);
                return;
              } catch (signOutError) {
                console.warn(
                  "[FOX AUTH] Failed to clear invalid restored session:",
                  signOutError,
                );
              }
            }

            if (!cancelled && currentRevision === revision) {
              setCurrentUser(null);
              setAuthHydrated(true);
              authHydrationRef.current = {
                uid: firebaseUser.uid,
                status: "failure",
                user: null,
              };
              localStorage.removeItem("fox_user");
            }
          }
        })();
      },
    );

    return () => {
      cancelled = true;
      revision += 1;
      unsubscribe();
    };
  }, []);

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("fox_users");
    return saved ? JSON.parse(saved) : [];
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
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [workspacesError, setWorkspacesError] = useState<string | null>(null);
  const [workspaceDirectoryRefresh, setWorkspaceDirectoryRefresh] = useState(0);

  useEffect(() => {
    if (!authHydrated || currentUser?.role !== "super_admin") return;

    const refreshOnFocus = () => {
      setWorkspaceDirectoryRefresh((revision) => revision + 1);
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [authHydrated, currentUser?.role]);

  
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
    return localStorage.getItem("fox_current_workspace") || "";
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

  // Tenant workspaces use a direct document listener. Super-admin
  // directories come from the authenticated, secret-free DTO API.
  useEffect(() => {
    if (!authHydrated) {
      setWorkspaces([]);
      setWorkspacesLoading(true);
      setWorkspacesError(null);
      return;
    }

    if (!currentUser) {
      setWorkspaces([]);
      setWorkspacesLoading(false);
      setWorkspacesError(null);
      return;
    }

    setWorkspacesLoading(true);
    setWorkspacesError(null);

    if (currentUser.role === "super_admin") {
      let cancelled = false;

      void authenticatedFetch("/api/agency/clients")
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok || !payload.success) {
            throw new Error(payload.error || "Workspace directory failed to load");
          }

          if (cancelled) return;

          const fetched = (Array.isArray(payload.clients)
            ? payload.clients
            : []
          ).map((workspace: any) => ({
            ...workspace,
            entitlementExpiresAt:
              Number.isFinite(workspace.entitlementExpiresAtMillis)
                ? {
                    toMillis: () => workspace.entitlementExpiresAtMillis,
                  }
                : undefined,
          })) as Workspace[];

          setWorkspaces(fetched);
          setWorkspacesError(null);
          setCurrentWorkspaceIdState((currentId) => {
            return resolveAuthorizedWorkspaceSelection(
              fetched,
              currentId,
              { isSuperAdmin: true },
            );
          });
          setWorkspacesLoading(false);
        })
        .catch((error) => {
          if (!cancelled) {
            console.warn("Workspace directory sync notice:", error);
            setWorkspaces([]);
            setWorkspacesLoading(false);
            setWorkspacesError("Workspace directory could not be loaded.");
          }
        });

      return () => {
        cancelled = true;
      };
    }

    if (!currentUser.workspaceId) {
      setWorkspaces([]);
      setWorkspacesLoading(false);
      setWorkspacesError("Authenticated user has no workspace binding.");
      return;
    }

    if (currentUser.role === "staff") {
      let cancelled = false;
      void authenticatedFetch(
        `/api/workspaces/${encodeURIComponent(currentUser.workspaceId)}/context`,
      )
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok || !payload.success) {
            throw new Error(payload.error || "Workspace context failed to load");
          }
          if (cancelled) return;

          const workspace = {
            ...payload.workspace,
            entitlementExpiresAt: Number.isFinite(
              payload.workspace?.entitlementExpiresAtMillis,
            )
              ? Timestamp.fromMillis(
                  payload.workspace.entitlementExpiresAtMillis,
                )
              : undefined,
          } as Workspace;
          if (workspace.id !== currentUser.workspaceId) {
            throw new Error("WORKSPACE_CONTEXT_MISMATCH");
          }

          setWorkspaces([workspace]);
          setWorkspacesError(null);
          setCurrentWorkspaceIdState(currentUser.workspaceId);
          setWorkspacesLoading(false);
        })
        .catch((error) => {
          if (!cancelled) {
            console.warn("Staff workspace context sync notice:", error);
            setWorkspaces([]);
            setWorkspacesLoading(false);
            setWorkspacesError("Workspace context could not be loaded.");
          }
        });

      return () => {
        cancelled = true;
      };
    }

    const workspaceRef = doc(
      db,
      "workspaces",
      currentUser.workspaceId,
    );

    return onSnapshot(
      workspaceRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setWorkspaces([]);
          setCurrentWorkspaceIdState("");
          setWorkspacesLoading(false);
          setWorkspacesError("Authorized workspace was not found.");
          return;
        }

        const workspace = {
          ...(snapshot.data() as Omit<Workspace, "id">),
          id: snapshot.id,
        };
        setWorkspaces([workspace]);
        setWorkspacesError(null);
        setCurrentWorkspaceIdState(
          resolveAuthorizedWorkspaceSelection(
            [workspace],
            currentWorkspaceId,
            {
              isSuperAdmin: false,
              userWorkspaceId: currentUser.workspaceId,
            },
          ),
        );
        setWorkspacesLoading(false);
        localStorage.setItem("fox_workspaces", JSON.stringify([workspace]));
      },
      (error) => {
        console.warn("Firestore workspace sync notice:", error);
        setWorkspaces([]);
        setWorkspacesLoading(false);
        setWorkspacesError("Workspace could not be loaded.");
      },
    );
  }, [
    authHydrated,
    currentUser?.id,
    currentUser?.role,
    currentUser?.workspaceId,
    workspaceDirectoryRefresh,
  ]);

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


  // Client owners use a direct listener; staff receive a least-privilege DTO.
  // Runtime server cache refreshes use Admin SDK reads and never browser JSON.

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

  const [crmLeads, setCrmLeads] = useState<CustomerLead[]>([]);
  const [crmLeadsLoading, setCrmLeadsLoading] = useState(true);
  const [crmLeadsError, setCrmLeadsError] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

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
          const fetchedLogs: AuditLog[] = snapshot.docs.map((d) => {
            const data = d.data() as Record<string, any>;
            const storedTimestamp = data.timestamp;

            return {
              ...data,
              id: d.id,
              timestamp:
                typeof storedTimestamp === "string"
                  ? storedTimestamp
                  : storedTimestamp?.toDate?.().toISOString() || "",
            } as AuditLog;
          });
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
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> => {
    const actorUid = auth.currentUser?.uid;

    if (!actorUid || !currentUser || currentUser.role !== "super_admin") {
      throw new Error("AUTH_REQUIRED_FOR_AUDIT_LOG");
    }

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    
    const newLog: AuditLog = {
      id: createAuditLogId(),
      timestamp: formattedDate,
      actorUid,
      actorName: currentUser.name,
      actorEmail: currentUser.email,
      actorRole: "super_admin",
      action: entry.action,
      category: entry.category,
      severity: entry.severity || "info",
      target: entry.target,
      details: entry.details,
      ipAddress: entry.ipAddress || "197.38.12.45",
      metadata: entry.metadata,
    };

    await setDoc(
      doc(db, "audit_logs", newLog.id),
      sanitizeForFirestore({
        ...newLog,
        timestamp: serverTimestamp(),
      })
    );

    setAuditLogs((prev) => [newLog, ...prev]);

    return newLog;
  };

  useEffect(() => {
    localStorage.setItem("fox_support_tickets", JSON.stringify(supportTickets));
  }, [supportTickets]);

  useEffect(() => {
    if (!authHydrated) return;

    if (currentUser) {
      localStorage.setItem("fox_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("fox_user");
    }
  }, [authHydrated, currentUser]);

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
    if (!authHydrated || workspacesLoading) return null;

    if (currentUser && !isSuperAdmin && currentUser.workspaceId) {
      const userWs = workspaces.find((w) => w.id === currentUser.workspaceId);
      return userWs || null;
    }

    return (
      workspaces.find((w) => w.id === currentWorkspaceId) ||
      null
    );
  }, [
    authHydrated,
    workspacesLoading,
    currentUser,
    isSuperAdmin,
    currentWorkspaceId,
    workspaces,
  ]);

  const setCurrentWorkspaceId = (id: string) => {
    if (!isSuperAdmin) {
      addToast("غير مسموح للمشترك بالتنقل لحسابات عملاء آخرين", "error");
      return;
    }

    if (!workspaces.some((workspace) => workspace.id === id)) {
      addToast("مساحة العمل المطلوبة غير متاحة", "error");
      return;
    }

    if (id === currentWorkspaceId) return;

    setCrmLeads([]);
    setCrmLeadsLoading(true);
    setCrmLeadsError(null);
    setAppointments([]);
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    setCurrentWorkspaceIdState(id);
    localStorage.setItem("fox_current_workspace", id);
  };

  useEffect(() => {
    if (
      workspacesLoading ||
      !currentWorkspaceId ||
      !workspaces.some(
        (workspace) => workspace.id === currentWorkspaceId,
      )
    ) {
      return;
    }

    localStorage.setItem(
      "fox_current_workspace",
      currentWorkspaceId,
    );
  }, [currentWorkspaceId, workspaces, workspacesLoading]);

  // Tenant-facing CRM reads are authoritative only from
  // workspaces/{workspaceId}/crmLeads. Root crmLeads is compatibility-only.
  useEffect(() => {
    if (!authHydrated || workspacesLoading) {
      setCrmLeads([]);
      setCrmLeadsLoading(true);
      setCrmLeadsError(null);
      return;
    }

    if (!currentWorkspace?.id) {
      setCrmLeads([]);
      setCrmLeadsLoading(false);
      setCrmLeadsError(null);
      return;
    }

    setCrmLeads([]);
    setCrmLeadsLoading(true);
    setCrmLeadsError(null);

    const ref = query(
      collection(
        db,
        "workspaces",
        currentWorkspace.id,
        "crmLeads",
      ),
      where("workspaceId", "==", currentWorkspace.id),
    );

    return onSnapshot(
      ref,
      (snapshot) => {
        const rows = snapshot.docs
          .map((snapshotDoc) => ({
            ...snapshotDoc.data(),
            id: snapshotDoc.id,
          }))
          .filter(
            (lead: any) =>
              String(lead.workspaceId || "") ===
              currentWorkspace.id,
          )
          .sort((a: any, b: any) =>
            String(b.lastInteraction || b.updatedAt || "")
              .localeCompare(
                String(a.lastInteraction || a.updatedAt || ""),
              ),
          ) as CustomerLead[];

        setCrmLeads(rows);
        setCrmLeadsLoading(false);
        setCrmLeadsError(null);
      },
      (error) => {
        console.error(
          "[FOX CRM] Authoritative tenant subscription failed:",
          error,
        );
        setCrmLeads([]);
        setCrmLeadsLoading(false);
        setCrmLeadsError("CRM data could not be loaded.");
      },
    );
  }, [
    authHydrated,
    workspacesLoading,
    currentWorkspace?.id,
  ]);

  // Tenant-facing appointment reads use the same nested collection as the
  // Telegram booking writer. Root appointments remains compatibility-only.
  useEffect(() => {
    if (!authHydrated || workspacesLoading) {
      setAppointments([]);
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      return;
    }

    if (!currentWorkspace?.id) {
      setAppointments([]);
      setAppointmentsLoading(false);
      setAppointmentsError(null);
      return;
    }

    setAppointments([]);
    setAppointmentsLoading(true);
    setAppointmentsError(null);

    const ref = query(
      collection(
        db,
        "workspaces",
        currentWorkspace.id,
        "appointments",
      ),
      where("workspaceId", "==", currentWorkspace.id),
    );

    return onSnapshot(
      ref,
      (snapshot) => {
        const rows = snapshot.docs
          .map((snapshotDoc) => {
            const data: any = snapshotDoc.data();

            return {
              ...data,
              id: snapshotDoc.id,
              workspaceId: String(data.workspaceId || ""),
              patientName:
                data.patientName || data.customerName || "",
              patientPhone:
                data.patientPhone || data.phone || "",
              timeSlot:
                data.timeSlot || data.time || "",
              date: String(data.date || ""),
            } as Appointment;
          })
          .filter(
            (appointment) =>
              appointment.workspaceId === currentWorkspace.id,
          )
          .sort((a, b) =>
            `${a.date || ""} ${a.timeSlot || ""}`.localeCompare(
              `${b.date || ""} ${b.timeSlot || ""}`,
            ),
          );

        setAppointments(rows);
        setAppointmentsLoading(false);
        setAppointmentsError(null);
      },
      (error) => {
        console.error(
          "[FOX Appointments] Authoritative tenant subscription failed:",
          error,
        );
        setAppointments([]);
        setAppointmentsLoading(false);
        setAppointmentsError("Appointments could not be loaded.");
      },
    );
  }, [
    authHydrated,
    workspacesLoading,
    currentWorkspace?.id,
  ]);

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
      const appUser = await waitForAuthHydration(uid);

      if (!appUser) {
        if (auth.currentUser?.uid === uid) {
          await firebaseSignOut(auth);
        }
        addToast(
          "تم التحقق من الحساب ولكن تعذر تحميل ملف المستخدم المصرح به",
          "error",
        );
        return false;
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
      !cleanEmail ||
      !cleanPhone
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

    if (cleanPhone.replace(/\D/g, "").length < 8) {
      addToast(
        language === "ar"
          ? "يرجى إدخال رقم هاتف صحيح."
          : "Please enter a valid phone number.",
        "error",
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

    // Paid activation must be performed by a trusted server flow.
    // Browser-created workspaces are restricted to the starter plan
    // by Firestore Rules so clients cannot self-provision entitlements.
    if (initialCode?.trim()) {
      addToast(
        language === "ar"
          ? "تفعيل الباقات المدفوعة يتطلب مسار تفعيل آمن من الخادم. يرجى التواصل مع الدعم."
          : "Paid plan activation requires the secure server activation flow. Please contact support.",
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

    const registrationOperation =
      registrationCoordinatorRef.current.begin(cleanEmail);
    if (!registrationOperation) {
      addToast(
        language === "ar"
          ? "هناك عملية تسجيل أخرى قيد التنفيذ. انتظر حتى تنتهي."
          : "Another registration is already in progress. Wait for it to finish.",
        "error",
      );
      return null;
    }

    let createdUid = "";
    let createdAuthUser: FirebaseAuthUser | null = null;
    let registrationCommitAttempted = false;
    let registrationBatchCommitted = false;
    let provisionedWorkspace: Workspace | null = null;
    let authRollbackResult:
      | Awaited<ReturnType<typeof rollbackCreatedAuthIdentity>>
      | null = null;

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
      createdUid = uid;
      createdAuthUser = credential.user;
      if (
        !registrationCoordinatorRef.current.bindUid(
          registrationOperation,
          uid,
        )
      ) {
        throw new Error("REGISTRATION_OPERATION_STALE");
      }

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

      let newWorkspace: Workspace = {
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

        entitlementExpiresAt:
          Timestamp.fromMillis(
            Date.now() +
              30 * 24 * 60 * 60 * 1000
          ),

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
      provisionedWorkspace = newWorkspace;

      const newUser: User = {
        id: uid,
        name: cleanOwnerName,
        email: cleanEmail,
        role: "client_owner",
        workspaceId: newWsId,
        createdAt: nowIso,
      };

      // -----------------------------------------------------
      // TRUSTED SERVER PROVISIONING
      // -----------------------------------------------------
      registrationCommitAttempted = true;
      const provisioningResponse = await authenticatedFetch(
        "/api/registration/provision-workspace",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: newWsId,
            workspaceName: cleanWorkspaceName,
            ownerName: cleanOwnerName,
            phone: cleanPhone,
            industry,
          }),
        },
      );
      const provisioningPayload = await provisioningResponse.json();
      if (!provisioningResponse.ok || !provisioningPayload.success) {
        const provisioningError: any = new Error(
          provisioningPayload.error || "Trusted registration failed",
        );
        provisioningError.code =
          provisioningPayload.code || "REGISTRATION_PROVISIONING_FAILED";
        throw provisioningError;
      }

      const authoritativeWorkspace = provisioningPayload.workspace || {};
      if (
        authoritativeWorkspace.id !== newWsId ||
        authoritativeWorkspace.ownerUid !== uid ||
        authoritativeWorkspace.planId !== "starter" ||
        !Number.isFinite(
          authoritativeWorkspace.entitlementExpiresAtMillis,
        )
      ) {
        throw new Error("REGISTRATION_PROVISIONING_RESPONSE_INVALID");
      }
      newWorkspace = {
        ...authoritativeWorkspace,
        entitlementExpiresAt: Timestamp.fromMillis(
          authoritativeWorkspace.entitlementExpiresAtMillis,
        ),
      } as Workspace;
      provisionedWorkspace = newWorkspace;
      registrationBatchCommitted = true;
      registrationCoordinatorRef.current.settle(
        registrationOperation,
        "committed",
      );

      const hydratedUser = await waitForAuthHydration(uid, 0);
      if (!hydratedUser) {
        throw new Error("AUTH_PROFILE_HYDRATION_FAILED");
      }

      if (
        !registrationCoordinatorRef.current.canApplyUi(
          registrationOperation,
          mountedRef.current,
          auth.currentUser?.uid,
        )
      ) {
        throw new Error("REGISTRATION_IDENTITY_CHANGED_AFTER_COMMIT");
      }

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

      setCurrentWorkspaceIdState(
        newWsId
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

      const failureCode = String(error?.code || "");

      // A transport error can arrive after Firestore committed the atomic
      // batch. Probe the exact documents before classifying it as pre-commit;
      // if the probe is unavailable, preserve Auth for account recovery.
      if (
        registrationCommitAttempted &&
        !registrationBatchCommitted &&
        createdUid &&
        provisionedWorkspace &&
        auth.currentUser?.uid === createdUid
      ) {
        try {
          const [workspaceSnapshot, profileSnapshot] = await Promise.all([
            getDoc(doc(db, "workspaces", provisionedWorkspace.id)),
            getDoc(doc(db, "users", createdUid)),
          ]);
          const workspaceData = workspaceSnapshot.data() as any;
          const profileData = profileSnapshot.data() as any;
          if (
            workspaceSnapshot.exists() &&
            profileSnapshot.exists() &&
            workspaceData?.ownerUid === createdUid &&
            profileData?.workspaceId === provisionedWorkspace.id &&
            profileData?.role === "client_owner"
          ) {
            registrationBatchCommitted = true;
          }
        } catch (verificationError) {
          console.warn(
            "[FOX REGISTRATION] Commit outcome could not be verified:",
            verificationError,
          );
        }
      }

      registrationCoordinatorRef.current.settle(
        registrationOperation,
        registrationBatchCommitted ? "committed" : "failed",
      );

      if (registrationBatchCommitted && provisionedWorkspace) {
        if (mountedRef.current) {
          addToast(
            language === "ar"
              ? "تم إنشاء الحساب بنجاح، لكن تعذر إكمال تحديث الواجهة. حدّث الصفحة وسجّل الدخول."
              : "The account was created, but the local confirmation was interrupted. Refresh and sign in.",
            "info",
          );
        }
        return provisionedWorkspace;
      }

      if (
        createdAuthUser &&
        createdUid &&
        shouldRollbackRegistration(registrationOperation.outcome, {
          commitAttempted: registrationCommitAttempted,
          failureCode,
        })
      ) {
        authRollbackResult = await rollbackCreatedAuthIdentity({
          createdUser: createdAuthUser,
          createdUid,
          getCurrentUid: () => auth.currentUser?.uid,
          deleteCreatedUser: (user) => deleteUser(user),
          signOutCurrentIdentity: () => firebaseSignOut(auth),
        });
      }

      const code = failureCode;

      let message =
        language === "ar"
          ? "تعذر إنشاء الحساب. حاول مرة أخرى."
          : "Unable to create the account. Please try again.";

      if (
        createdUid &&
        authRollbackResult !== "deleted"
      ) {
        message =
          language === "ar"
            ? "تعذر إكمال التسجيل وقد يكون حساب الدخول موجوداً بالفعل. لا تُنشئ حساباً مكرراً؛ استخدم تسجيل الدخول أو استعادة الحساب."
            : "Registration was interrupted and the sign-in account may already exist. Do not register again; sign in or recover the account.";
      }

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

      if (mountedRef.current) {
        addToast(
          message,
          "error"
        );
      }

      return null;
    } finally {
      registrationCoordinatorRef.current.settle(
        registrationOperation,
        registrationBatchCommitted ? "committed" : "failed",
      );
      registrationCoordinatorRef.current.finish(registrationOperation);
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


  const submitInstapayPayment = async (
    workspaceId: string,
    planId: PlanId,
    _amountEGP: number,
    screenshotUrl: string,
    txRef: string,
    paymentType: "plan" | "extra_package" = "plan",
    _extraPackageName?: string,
    extraConversationsCount?: number,
  ) => {
    const targetWorkspaceId = !isSuperAdmin
      ? currentWorkspace?.id || workspaceId
      : workspaceId;

    try {
      const response = await authenticatedFetch("/api/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: targetWorkspaceId,
          planId,
          paymentType,
          extraConversationsCount,
          transactionRef: txRef,
          screenshotUrl,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        addToast(
          payload.error ||
            (language === "ar"
              ? "تعذر إرسال طلب الدفع."
              : "Payment submission failed."),
          "error",
        );
        return;
      }

      addToast(
        language === "ar"
          ? "تم إرسال طلب الدفع للمراجعة."
          : "Payment submitted for review.",
        "success",
      );
    } catch (error) {
      console.error("[FOX Billing] Authoritative payment submission failed:", error);
      addToast(
        language === "ar"
          ? "تعذر إرسال طلب الدفع حالياً."
          : "Payment submission is currently unavailable.",
        "error",
      );
    }
  };

  const transitionPaymentViaServer = async (
    paymentId: string,
    action: "approve" | "reject",
    reason?: string
  ) => {
    if (!isSuperAdmin) {
      addToast(
        "هذا الإجراء متاح فقط لمدير النظام Super Admin",
        "error"
      );
      return;
    }

    try {
      const response = await authenticatedFetch(
        `/api/admin/payments/${encodeURIComponent(paymentId)}/transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Authoritative payment transition failed"
        );
      }

      addToast(
        action === "approve"
          ? language === "ar"
            ? "✅ تم اعتماد الدفع من المصدر الموثوق."
            : "✅ Payment approved by the authoritative server."
          : language === "ar"
            ? "✅ تم رفض طلب الدفع من المصدر الموثوق."
            : "✅ Payment rejected by the authoritative server.",
        "success"
      );
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : "Payment transition failed",
        "error"
      );
    }
  };

  const approvePayment = (paymentId: string) => {
    void transitionPaymentViaServer(paymentId, "approve");
  };

  const rejectPayment = (paymentId: string, reason: string) => {
    void transitionPaymentViaServer(paymentId, "reject", reason);
  };


  const updateWorkspaceStatus = async (
    workspaceId: string,
    status: "active" | "pending" | "suspended",
  ) => {
    if (!isSuperAdmin) {
      addToast("هذا الإجراء متاح فقط لمدير النظام Super Admin", "error");
      return;
    }

    try {
      const response = await authenticatedFetch(
        `/api/admin/workspaces/${workspaceId}/operational`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Workspace update failed");
      }
      setWorkspaces((previous) =>
        previous.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, ...payload.workspace, status }
            : workspace,
        ),
      );
      addToast(`Workspace status updated to ${status}`, "success");
    } catch (error) {
      console.error("Workspace status update failed:", error);
      addToast("Workspace status was not changed", "error");
    }
  };

  const updateWorkspacePlan = (_workspaceId: string, _planId: PlanId) => {
    addToast(
      "Plan changes require an approved payment or activation-code transaction.",
      "error",
    );
  };

  const updateWorkspaceField = (
    _workspaceId: string,
    _updates: Partial<Workspace>,
  ) => {
    addToast(
      "Direct billing, counter, and package changes are disabled. Use an authoritative workflow.",
      "error",
    );
  };

  const deleteWorkspace = async (workspaceId: string) => {
    if (!isSuperAdmin) {
      addToast("هذا الإجراء متاح فقط لمدير النظام Super Admin", "error");
      return;
    }

    try {
      const response = await authenticatedFetch(
        `/api/admin/workspaces/${workspaceId}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Workspace access revocation failed");
      }

      setWorkspaces((previous) =>
        previous.filter((workspace) => workspace.id !== workspaceId),
      );
      setLatestRegistration((previous) =>
        previous?.workspaceId === workspaceId ? null : previous,
      );
      addToast(
        language === "ar"
          ? "تم إيقاف الوصول للمنشأة مع الاحتفاظ بالبيانات وفق سياسة الحذف."
          : "Workspace access revoked; data retained under the deletion policy.",
        "success",
      );
    } catch (error) {
      console.error("Workspace access revocation failed:", error);
      addToast(
        language === "ar"
          ? "تعذر إيقاف الوصول للمنشأة. لم يتم تغيير الحالة."
          : "Workspace access was not changed.",
        "error",
      );
    }
  };

  // CRM & Industry actions with strict tenant boundary checks
  const addCustomerLead = async (lead: Omit<CustomerLead, "id" | "createdAt">): Promise<void> => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (lead.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return;

    const newLead: CustomerLead = {
      ...lead,
      workspaceId: targetWsId,
      id: `lead_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString().split("T")[0],
    };

    try {
      await setDoc(
        doc(db, "workspaces", targetWsId, "crmLeads", newLead.id),
        newLead,
      );
    } catch (error) {
      console.error("[FOX CRM] Tenant lead create failed:", error);
      addToast("Failed to create the tenant CRM record.", "error");
      return;
    }

    // Legacy root mirror is compatibility-only and is never used for reads.
    void setDoc(doc(db, "crmLeads", newLead.id), newLead).catch(
      (error) => {
        console.warn("[FOX CRM] Root lead compatibility sync failed:", error);
      },
    );
    
    // Update workspace totals
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === targetWsId ? { ...w, totalCustomers: w.totalCustomers + 1 } : w))
    );
    addToast("CRM Record created", "success");
  };

  const updateLeadStatus = async (leadId: string, status: CustomerLead["status"]): Promise<void> => {
    const existing = crmLeads.find((l) => l.id === leadId);
    if (!existing) return;
    if (!isSuperAdmin && existing.workspaceId !== currentWorkspace?.id) {
      addToast("ليس لديك صلاحية لتعديل بيانات هذا الحساب", "error");
      return;
    }

    const lastInteraction = new Date().toISOString();
    try {
      await updateDoc(
        doc(
          db,
          "workspaces",
          existing.workspaceId,
          "crmLeads",
          leadId,
        ),
        { status, lastInteraction },
      );
    } catch (error) {
      console.error("[FOX CRM] Tenant lead status update failed:", error);
      addToast("Failed to update the tenant CRM record.", "error");
      return;
    }

    // Legacy root mirror is compatibility-only.
    void updateDoc(doc(db, "crmLeads", leadId), { status, lastInteraction }).catch(
      (error) => {
        console.warn("[FOX CRM] Root lead compatibility sync failed:", error);
      },
    );
    addToast(`Lead status set to ${status}`, "info");
  };

  const addAppointment = async (apt: Omit<Appointment, "id">): Promise<boolean> => {
    const targetWsId = !isSuperAdmin ? currentWorkspace?.id || currentUser?.workspaceId : (apt.workspaceId || currentWorkspace?.id);
    if (!targetWsId) return false;

    if (!isValidDateOnlyKey(String(apt.date || ""))) {
      addToast("Appointment date must use a valid YYYY-MM-DD value.", "error");
      return false;
    }

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

    try {
      await setDoc(
        doc(
          db,
          "workspaces",
          targetWsId,
          "appointments",
          newApt.id
        ),
        syncedApt
      );
    } catch (error) {
      console.warn("[FOX CRM] Tenant appointment create failed:", error);
      addToast("Failed to create the tenant appointment.", "error");
      return false;
    }

    // Legacy root mirror is compatibility-only and is never used for reads.
    void setDoc(
      doc(db, "appointments", newApt.id),
      syncedApt
    ).catch((error) => {
      console.warn(
        "[FOX Appointments] Root compatibility sync failed:",
        error,
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
    return true;
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<void> => {
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

    try {
      await updateDoc(
        doc(
          db,
          "workspaces",
          existing.workspaceId,
          "appointments",
          id
        ),
        syncedUpdates,
      );
    } catch (error) {
      console.warn("[FOX CRM] Tenant appointment update failed:", error);
      addToast("Failed to update the tenant appointment.", "error");
      return;
    }

    // Legacy root mirror is compatibility-only.
    void updateDoc(
      doc(db, "appointments", id),
      syncedUpdates
    ).catch((error) => {
      console.warn(
        "[FOX Appointments] Root compatibility sync failed:",
        error,
      );
    });

    addToast("Appointment updated", "success");
  };

  const updateAppointmentStatus = async (
    aptId: string,
    status: Appointment["status"]
  ): Promise<void> => {
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

    try {
      await updateDoc(
        doc(
          db,
          "workspaces",
          existing.workspaceId,
          "appointments",
          aptId
        ),
        updates,
      );
    } catch (error) {
      console.warn("[FOX CRM] Tenant appointment status update failed:", error);
      addToast("Failed to update the tenant appointment status.", "error");
      return;
    }

    // Legacy root mirror is compatibility-only.
    void updateDoc(
      doc(db, "appointments", aptId),
      updates
    ).catch((error) => {
      console.warn(
        "[FOX Appointments] Root compatibility sync failed:",
        error,
      );
    });

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
      const res = await authenticatedFetch("/api/agency/modification-requests");
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
      const res = await authenticatedFetch("/api/agency/modification-requests", {
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
      const res = await authenticatedFetch(`/api/agency/modification-requests/${requestId}/confirm-by-client`, {
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
      const res = await authenticatedFetch(`/api/agency/modification-requests/${requestId}/approve`, {
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
      const res = await authenticatedFetch(`/api/agency/modification-requests/${requestId}/reject`, {
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
        authHydrated,
        workspacesLoading,
        workspacesError,
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
        crmLeadsLoading,
        crmLeadsError,
        doctors: scopedDoctors,
        appointments: scopedAppointments,
        appointmentsLoading,
        appointmentsError,
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
