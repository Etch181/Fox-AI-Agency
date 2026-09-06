import { FoxAgent, AgentRole, AgentStatus, HealthStatus, AgentCapabilities, AgentModelConfig } from "../types";
import { createAgent, getAgentByRole, listAgents } from "./foxAgentControlPlane";

// ============================================================
// INITIAL AGENT REGISTRY - 9 Specialized Agents
// ============================================================

const INITIAL_AGENTS: Omit<FoxAgent, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "FOX-PRODUCT-DEVELOPER",
    role: "product-developer",
    description: "Develop and modify FOX product code. Implements features, fixes bugs, writes tests, and maintains code quality.",
    status: "active",
    capabilities: {
      allowedActions: [
        "read_codebase",
        "write_code",
        "run_tests",
        "create_files",
        "modify_files",
        "delete_files",
        "run_build",
        "run_lint",
        "git_commit",
        "git_push_staging",
      ],
      restrictedActions: [
        "production_deploy",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["owner_command", "scheduled", "system_event", "workflow_event", "failure_event"],
      workflowIds: ["3TklsTWygq9diIir"], // FOX - Executive Development Cycle
      requiresApprovalFor: ["production_deploy"],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
  {
    name: "FOX-QA-TECHNICAL-REVIEWER",
    role: "qa-technical-reviewer",
    description: "Review code, security, regressions, APIs, integrations and visible UI result. Ensures quality gates pass before staging.",
    status: "active",
    capabilities: {
      allowedActions: [
        "read_codebase",
        "run_tests",
        "run_lint",
        "security_scan",
        "review_pr",
        "check_ui_regression",
        "verify_api_contracts",
        "approve_staging",
        "reject_staging",
      ],
      restrictedActions: [
        "write_code",
        "production_deploy",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["workflow_event", "system_event", "owner_command"],
      workflowIds: ["YwObvos6GEFJ0zmE"], // FOX - AI Technical Reviewer
      requiresApprovalFor: [],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
  {
    name: "FOX-STAGING-RELEASE",
    role: "staging-release",
    description: "Build, deploy and verify staging. Production requires explicit owner approval.",
    status: "active",
    capabilities: {
      allowedActions: [
        "run_build",
        "run_tests",
        "deploy_staging",
        "verify_staging",
        "run_health_checks",
        "rollback_staging",
        "git_tag_staging",
      ],
      restrictedActions: [
        "production_deploy",
        "write_code",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["workflow_event", "owner_command", "system_event"],
      workflowIds: [],
      requiresApprovalFor: ["production_deploy"],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
  {
    name: "FOX-KNOWLEDGE",
    role: "knowledge",
    description: "Manage tenant knowledge bases and knowledge quality. Handles document ingestion, indexing, and retrieval optimization.",
    status: "active",
    capabilities: {
      allowedActions: [
        "read_knowledge_base",
        "write_knowledge_base",
        "index_documents",
        "optimize_retrieval",
        "manage_embeddings",
        "validate_knowledge_quality",
        "sync_tenant_kb",
      ],
      restrictedActions: [
        "write_code",
        "production_deploy",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["owner_command", "scheduled", "system_event", "workflow_event"],
      workflowIds: [],
      requiresApprovalFor: [],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
  {
    name: "FOX-SALES",
    role: "sales",
    description: "CRM leads, qualification, follow-up, upsell and sales operations. Manages the sales pipeline.",
    status: "active",
    capabilities: {
      allowedActions: [
        "read_crm",
        "write_crm",
        "qualify_leads",
        "schedule_followups",
        "send_proposals",
        "track_pipeline",
        "generate_quotes",
        "upsell_customers",
      ],
      restrictedActions: [
        "write_code",
        "production_deploy",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["owner_command", "scheduled", "workflow_event", "system_event"],
      workflowIds: [],
      requiresApprovalFor: ["payment_approval"],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
  {
    name: "FOX-CUSTOMER-SUPPORT",
    role: "customer-support",
    description: "Customer support across connected messaging channels using tenant knowledge. Handles tickets, FAQ, escalation.",
    status: "active",
    capabilities: {
      allowedActions: [
        "read_tickets",
        "write_tickets",
        "respond_to_customer",
        "escalate_ticket",
        "search_knowledge_base",
        "close_ticket",
        "send_satisfaction_survey",
        "manage_faq",
      ],
      restrictedActions: [
        "write_code",
        "production_deploy",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["workflow_event", "system_event", "owner_command", "scheduled"],
      workflowIds: ["cjWlM3JeSQVJyEjm", "EpSgfDSD4zBLXhBd"], // FOX Events Receivers
      requiresApprovalFor: [],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
  {
    name: "FOX-MARKETING",
    role: "marketing",
    description: "Content, campaigns, offers and social publishing. Manages marketing operations and content generation.",
    status: "active",
    capabilities: {
      allowedActions: [
        "create_content",
        "schedule_posts",
        "manage_campaigns",
        "create_offers",
        "publish_social",
        "analyze_metrics",
        "manage_email_campaigns",
        "track_conversions",
      ],
      restrictedActions: [
        "write_code",
        "production_deploy",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["owner_command", "scheduled", "workflow_event"],
      workflowIds: [],
      requiresApprovalFor: [],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
  {
    name: "FOX-MONITORING",
    role: "monitoring",
    description: "Monitor FOX, integrations, n8n and agent failures and attempt self-healing. Runs health checks and alerts.",
    status: "active",
    capabilities: {
      allowedActions: [
        "check_system_health",
        "check_agent_health",
        "check_n8n_workflows",
        "check_integrations",
        "trigger_self_healing",
        "alert_on_failure",
        "collect_metrics",
        "run_diagnostics",
      ],
      restrictedActions: [
        "write_code",
        "production_deploy",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["scheduled", "failure_event", "system_event", "workflow_event"],
      workflowIds: ["LCgXN1BOxPSqMS16", "h39HTybWATXThaOC", "i94QqKzyDhpeMPa2"], // Health Monitor, Exception Alerts, Activity Log
      requiresApprovalFor: [],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
  {
    name: "FOX-EXECUTIVE-REPORTING",
    role: "executive-reporting",
    description: "Produce owner-level executive reports and alerts. Aggregates metrics, generates summaries, and delivers insights.",
    status: "active",
    capabilities: {
      allowedActions: [
        "generate_executive_report",
        "aggregate_metrics",
        "create_dashboard_snapshot",
        "send_alerts",
        "summarize_activity",
        "track_kpis",
        "forecast_trends",
      ],
      restrictedActions: [
        "write_code",
        "production_deploy",
        "delete_production_data",
        "modify_secrets",
        "approve_payments",
      ],
      triggerTypes: ["scheduled", "owner_command", "system_event", "workflow_event"],
      workflowIds: [],
      requiresApprovalFor: [],
    },
    modelConfig: {
      primaryProvider: "openrouter",
      primaryModel: "openrouter/free",
      fallbackProviders: ["openrouter", "openrouter"],
      fallbackModels: ["openrouter/free", "openrouter/free"],
    },
    lastExecutionAt: undefined,
    lastExecutionStatus: undefined,
    successCount: 0,
    failureCount: 0,
    health: "healthy",
  },
];

export async function initializeAgentRegistry(): Promise<FoxAgent[]> {
  const existingAgents = await listAgents();
  const existingNames = new Set(existingAgents.map((a) => a.name));
  
  const created: FoxAgent[] = [];
  
  for (const agentDef of INITIAL_AGENTS) {
    if (!existingNames.has(agentDef.name)) {
      const createdAgent = await createAgent(agentDef);
      created.push(createdAgent);
      console.log(`✅ Created agent: ${agentDef.name} (${agentDef.role})`);
    } else {
      console.log(`⏭️  Agent already exists: ${agentDef.name}`);
      const existing = await getAgentByRole(agentDef.role);
      if (existing) created.push(existing);
    }
  }
  
  return created;
}

export async function ensureAgentRegistry(): Promise<FoxAgent[]> {
  return initializeAgentRegistry();
}

export { INITIAL_AGENTS };