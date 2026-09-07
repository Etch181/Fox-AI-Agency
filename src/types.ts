import type { Timestamp } from "firebase/firestore";
import type { UserRole } from "./security/appAuthorization.ts";

export type { UserRole } from "./security/appAuthorization.ts";

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
  ownerUid?: string;
  name: string;
  industry: IndustryType;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  status: 'active' | 'pending' | 'suspended';
  planId: PlanId;
  subscriptionExpiresAt: string;
  entitlementExpiresAt?: Timestamp;
  aiConversationsUsed: number;
  extraConversationsLimit?: number;
  extraPackages?: ExtraPackage[];
  creditBalance?: number;
  totalCustomers: number;
  totalAppointments: number;
  totalComplaints: number;
  createdAt: string;
  aiSettings?: AISettings;
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

  crmSpreadsheetId?: string;
  googleSheetsConnectedAt?: string;
  externalCrmWebhookConfigured?: boolean;
  externalCrmWebhookUpdatedAt?: string;

  // Instagram Business Account (workspace-scoped)
  instagramBusinessAccountId?: string;
  instagramConnectedAt?: string;
  instagramBotStatus?: "connected" | "disconnected" | "pending";
  metaPageId?: string;
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
  status: 'Lead' | 'Prospect' | 'Qualified' | 'Contacted' | 'Proposal' | 'Customer' | 'Won' | 'Lost' | 'VIP';
  tags: string[];
  notes: string;
  followUpDate?: string;
  nextAction?: string;
  aiLeadScore?: number;
  aiTemperature?: 'hot' | 'warm' | 'cold';
  aiSummary?: string;
  aiNextAction?: string;
  aiFollowUpMessage?: string;
  aiRecommendedStage?: CustomerLead['status'];
  aiAnalysisReason?: string;
  aiAnalyzedAt?: string;
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
  actorUid?: string;
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

// ============================================================
// FOX AGENT CONTROL PLANE TYPES
// ============================================================

export type AgentStatus = 'active' | 'idle' | 'running' | 'paused' | 'error' | 'offline';
export type AgentRole = 
  | 'product-developer'
  | 'qa-technical-reviewer'
  | 'staging-release'
  | 'knowledge'
  | 'sales'
  | 'customer-support'
  | 'marketing'
  | 'monitoring'
  | 'executive-reporting'
  | 'clinic-appointments'
  | 'complaints-suggestions'
  | 'pharmacy-sales'
  | 'retail-sales'
  | 'restaurant-operations'
  | 'course-center'
  | 'custom';

export type TaskStatus = 
  | 'new'
  | 'planned'
  | 'assigned'
  | 'running'
  | 'review'
  | 'verified'
  | 'done'
  | 'failed'
  | 'diagnose'
  | 'retry'
  | 'blocked_owner';

export type TaskType = 
  | 'code_development'
  | 'code_review'
  | 'staging_deploy'
  | 'knowledge_management'
  | 'crm_operation'
  | 'support_operation'
  | 'marketing_operation'
  | 'monitoring_check'
  | 'executive_report'
  | 'audit'
  | 'self_healing'
  | 'custom';

export type TriggerType = 
  | 'owner_command'
  | 'scheduled'
  | 'system_event'
  | 'workflow_event'
  | 'failure_event'
  | 'manual';

export type ApprovalType = 
  | 'production_deploy'
  | 'new_secret'
  | 'destructive_action'
  | 'payment_approval'
  | 'third_party_approval'
  | 'business_decision';

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface AgentModelConfig {
  primaryProvider: string;
  primaryModel: string;
  fallbackProviders: string[];
  fallbackModels: string[];
}

export interface AgentCapabilities {
  allowedActions: string[];
  restrictedActions: string[];
  triggerTypes: TriggerType[];
  workflowIds: string[];
  requiresApprovalFor: ApprovalType[];
}

export interface FoxAgent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  status: AgentStatus;
  capabilities: AgentCapabilities;
  modelConfig: AgentModelConfig;
  lastExecutionAt?: string;
  lastExecutionStatus?: TaskStatus;
  successCount: number;
  failureCount: number;
  health: HealthStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FoxTask {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  intent: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: TaskStatus;
  targetAgentId: string;
  assignedAgentId?: string;
  dependencies: string[];
  approvalRequired: boolean;
  approvalType?: ApprovalType;
  reviewRequired: boolean;
  reviewAgentId?: string;
  triggerType: TriggerType;
  triggerSource: string;
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface FoxExecution {
  id: string;
  taskId: string;
  agentId: string;
  status: TaskStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  logs: ExecutionLog[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, any>;
}

export interface FoxApproval {
  id: string;
  taskId: string;
  type: ApprovalType;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decision?: string;
  metadata: Record<string, any>;
}

export interface FoxActivity {
  id: string;
  agentId?: string;
  taskId?: string;
  executionId?: string;
  type: 'agent_created' | 'agent_updated' | 'task_created' | 'task_assigned' | 'task_started' | 'task_completed' | 'task_failed' | 'task_retry' | 'approval_requested' | 'approval_decided' | 'review_started' | 'review_completed' | 'health_check' | 'self_healing' | 'staging_deploy' | 'custom';
  message: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  metadata: Record<string, any>;
  createdAt: string;
}

export interface FoxHealth {
  id: string;
  agentId: string;
  status: HealthStatus;
  lastCheckAt: string;
  checks: HealthCheck[];
  metrics: HealthMetrics;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  lastRunAt: string;
}

export interface HealthMetrics {
  uptimePercent: number;
  avgResponseTimeMs: number;
  errorRatePercent: number;
  successRatePercent: number;
  lastExecutionDurationMs?: number;
}

export interface FoxLesson {
  id: string;
  title: string;
  description: string;
  category: 'workflow_engineering' | 'agent_operation' | 'deployment' | 'security' | 'performance' | 'custom';
  severity: 'info' | 'warn' | 'critical';
  sourceAgentId?: string;
  sourceTaskId?: string;
  sourceExecutionId?: string;
  applicableAgents: string[];
  preventionRule: string;
  createdAt: string;
  acknowledged: boolean;
}
