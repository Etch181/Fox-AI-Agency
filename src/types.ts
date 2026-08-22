export type UserRole = 'super_admin' | 'client_owner' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  workspaceId?: string;
  avatar?: string;
  createdAt: string;
}

export type PlanId = 'starter' | 'business' | 'enterprise';

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  priceEGP: number;
  duration: string; // e.g. "7 Days", "1 Month"
  aiConversationLimit: number; // -1 for unlimited
  channels: ('telegram' | 'whatsapp')[];
  features: string[];
  badge?: string;
}

export type IndustryType = 'Clinic' | 'Pharmacy' | 'Restaurant' | 'Retail' | 'Small Business' | 'Course Center';

export interface ExtraPackage {
  id: string;
  name: string;
  conversationsAdded: number;
  priceEGP: number;
  addedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  industry: IndustryType;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  status: 'active' | 'pending' | 'suspended';
  planId: PlanId;
  subscriptionExpiresAt: string;
  aiConversationsUsed: number;
  extraConversationsLimit?: number;
  extraPackages?: ExtraPackage[];
  creditBalance?: number;
  totalCustomers: number;
  totalAppointments: number;
  totalComplaints: number;
  createdAt: string;
  aiSettings?: AISettings;
  telegramBotToken?: string;
  telegramBotName?: string;
  telegramBotStatus?: 'connected' | 'disconnected' | 'pending';
  whatsappBotStatus?: 'connected' | 'disconnected' | 'pending';
  whatsappPhoneNumber?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  whatsappConnectedAt?: string;
  registrationSource?: string;

  // FOX LAUNCH ONBOARDING V1
  onboardingStatus?: "in_progress" | "completed";
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  onboardingStep?: number;

  businessDescription?: string;
  onboardingAiReady?: boolean;
  onboardingCatalogReady?: boolean;

  googleSheetsAccessToken?: string;
  crmSpreadsheetId?: string;
  externalCrmWebhookUrl?: string;
}

export interface RegistrationConfirmation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  planId: PlanId;
  industry: IndustryType;
  source: string;
  timestamp: string;
  dbSavedAt: string;
  persistedToFirestore: boolean;
  docPath: string;
}

export interface ActivationCode {
  id: string;
  code: string;
  planId: PlanId;
  codeType?: 'plan' | 'extra_package';
  extraConversationsCount?: number;
  durationDays: number;
  isUsed: boolean;
  createdBy: string;
  usedByWorkspaceId?: string;
  usedByWorkspaceName?: string;
  createdAt: string;
  expiresAt: string;
}

export interface InstapayPayment {
  id: string;
  workspaceId: string;
  workspaceName: string;
  planId: PlanId;
  paymentType?: 'plan' | 'extra_package';
  extraPackageName?: string;
  extraConversationsCount?: number;
  amountEGP: number;
  screenshotUrl: string;
  transactionRef: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  generatedCode?: string;
  rejectionReason?: string;
  // FOX PRODUCTION BILLING V1
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;

  activatedAt?: string;
  subscriptionExpiresAt?: string;


  pricingSource?: "plan_config" | "extra_package";
  paymentMethod?: "instapay";
}

export interface SubscriberModificationRequest {
  id: string;
  workspaceId: string;
  chatId?: string;
  clientEmail?: string;
  clientPhone?: string;
  currentData: {
    name?: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    planId?: PlanId;
  };
  proposedData: {
    name?: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    planId?: PlanId;
  };
  status: 'AWAITING_CLIENT_CONFIRMATION' | 'CLIENT_CONFIRMED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
}

export interface CustomerLead {
  id: string;
  workspaceId: string;
  name: string;
  phone: string;
  email?: string;
  channel: 'whatsapp' | 'telegram' | 'WhatsApp' | 'Telegram' | string;
  status: 'Lead' | 'Prospect' | 'Customer';
  tags: string[];
  notes: string;
  followUpDate?: string;
  totalSpentEGP: number;
  createdAt: string;
  lastInteraction?: string;
  conversationHistory?: { sender: 'user' | 'bot'; text: string; time: string }[];
}

export interface Appointment {
  id: string;
  workspaceId: string;
  doctorName: string;
  specialty: string;
  patientName: string;
  patientPhone: string;
  date: string;
  timeSlot: string;
  status: 'Scheduled' | 'Confirmed' | 'Rescheduled' | 'Cancelled' | 'Completed';
  notes?: string;
  doctorId?: string;
  channel?: string;

  // Optional service identity
  serviceId?: string;
  serviceName?: string;

  // Financial snapshot
  originalAmount?: number;
  couponCode?: string;
  discountAmount?: number;
  finalAmount?: number;
  couponRedemptionId?: string;
}

export interface Doctor {
  id: string;
  workspaceId: string;
  name: string;
  specialty: string;
  slots: string[];
  consultationFeeEGP?: number;
}

export interface ClinicService {
  id: string;
  workspaceId: string;
  name: string;
  price: number;
  durationMinutes: number;
  description?: string;
  available?: boolean;
  alternativeItemName?: string;
}

export interface MenuItem {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
  image?: string;
  alternativeItemName?: string;
  alternativeNotes?: string;
}

export interface MedicineItem {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  requiresPrescription: boolean;
  instructions?: string;
  available: boolean;
  alternativeItemName?: string;
  alternativeNotes?: string;
}

export interface StoreProduct {
  id: string;
  workspaceId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  image?: string;
  available: boolean;
  alternativeItemName?: string;
  alternativeNotes?: string;
}

export interface ServiceRating {
  id: string;
  workspaceId: string;
  customerName: string;
  customerPhone?: string;
  channel: 'whatsapp' | 'telegram' | 'web';
  rating: number; // 1 to 5 stars
  feedback: string;
  createdAt: string;
}

export interface OrderItemDetail {
  itemId?: string;
  itemName: string;
  quantity: number;
  priceEGP: number;
  available: boolean;
  alternativeSuggested?: string;
}

export interface ProductOrder {
  id: string;
  workspaceId: string;
  customerName: string;
  customerPhone: string;
  channel: 'whatsapp' | 'telegram' | 'web';
  items: OrderItemDetail[];
  totalAmountEGP: number;
  status: 'pending_verification' | 'confirmed_available' | 'alternative_offered' | 'dispatched' | 'cancelled';
  ownerNotes?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  workspaceId: string;
  customerName: string;
  phone: string;
  customerPhone?: string;
  channel: 'whatsapp' | 'telegram' | 'WhatsApp' | 'Telegram' | string;
  issue: string;
  aiResponse: string;
  aiAutoResponse?: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  date: string;
}

export interface KnowledgeBaseFact {
  id: string;
  workspaceId: string;
  question: string;
  answer: string;
  fact?: string;
  category: string;
  approved: boolean;
  source: 'manual' | 'ai_extracted' | 'excel_import' | string;
  createdAt: string;
}

export interface N8nWorkflow {
  id: string;
  workspaceId?: string;
  title: string;
  description: string;
  triggerEvent: string;
  status: 'active' | 'inactive';
  executionsCount: number;
  lastRunAt?: string;
}

export interface AISettings {
  agentName: string;
  customPrompt: string;
  tone: 'Professional' | 'Friendly' | 'Formal' | 'Empathetic' | 'Direct';
  autoBookingEnabled: boolean;
  autoComplaintEscalation: boolean;
  enableServiceRating?: boolean;
  serviceRatingPrompt?: string;
  languageMode: 'auto' | 'arabic' | 'english';
  workingHours?: string;
  categories?: string[];
  fallbackMessage?: string;
  supportAgentName?: string;
  supportAgentPrompt?: string;
  salesAgentName?: string;
  salesAgentPrompt?: string;
  marketingAgentName?: string;
  marketingAgentPrompt?: string;
  routerPrompt?: string;
  salesKeywords?: string;
  supportKeywords?: string;
  marketingKeywords?: string;
}

export interface TicketReply {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  workspaceId: string;
  workspaceName: string;
  clientEmail: string;
  clientPhone?: string;
  subject: string;
  category: 'Billing' | 'Technical' | 'AI Agent' | 'Feature Request' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Awaiting Client' | 'Resolved' | 'Closed';
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

export interface TelegramBotConfig {
  botToken: string;
  botName: string;
  autoResponses: { key: string; response: string }[];
  leadsCaptured: number;
  status: 'online' | 'offline';
}

export type AuditLogCategory = 'security' | 'billing' | 'workspace' | 'system' | 'authentication' | 'ticket' | 'api';
export type AuditLogSeverity = 'info' | 'warning' | 'critical';

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole | 'system';
  action: string;
  category: AuditLogCategory;
  severity: AuditLogSeverity;
  target: string;
  details: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface GeminiErrorLog {
  id: string;
  timestamp: string;
  workspaceId: string;
  workspaceName: string;
  errorCode: string;
  errorMessage: string;
  latencyMs: number;
  promptSnippet: string;
  model: string;
}

export interface GeminiTenantMetrics {
  workspaceId: string;
  workspaceName: string;
  industry: IndustryType;
  planId: PlanId;
  activeModel: string;
  totalCalls: number;
  successfulCalls: number;
  errorCalls: number;
  errorRatePercent: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  status: 'healthy' | 'degraded' | 'down';
  lastCallTimestamp: string;
  rpm: number;
  tpm: number;
  latencyTrend: number[];
  errorTrend: number[];
  recentErrorLogs: GeminiErrorLog[];
}


export interface Coupon {
  id: string;
  workspaceId: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  condition: string;
  isActive: boolean;
  aiCanUse: boolean;

  // Real coupon lifecycle
  usageLimit?: number;
  usageCount?: number;
  validFrom?: string;
  validUntil?: string;
  lastUsedAt?: string;

  createdAt: string;
}

export interface CourseItem {
  id: string;
  workspaceId: string;
  name: string;
  price: number;
  duration: string;
  instructor?: string;
  description?: string;
}

export interface CourseReview {
  id: string;
  workspaceId: string;
  studentName: string;
  courseName: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
  status: "published" | "hidden";
  reply?: string;
}
