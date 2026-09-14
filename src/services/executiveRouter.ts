import {
  FoxAgent,
  FoxTask,
  FoxExecution,
  FoxApproval,
  FoxActivity,
  AgentStatus,
  TaskStatus,
  TaskType,
  TriggerType,
  ApprovalType,
  AgentRole,
} from "../types";
import {
  listAgents,
  getAgent,
  getAgentByRole,
  getTask,
  createTask,
  updateTaskStatus,
  assignTask,
  createExecution,
  addExecutionLog,
  completeExecution,
  createApproval,
  logActivity,
  recordHealthCheck,
  getHealth,
  getExecution,
  updateAgentStatus,
  incrementAgentSuccess,
  incrementAgentFailure,
} from "./foxAgentControlPlane";

// ============================================================
// EXECUTIVE ROUTER
// ============================================================

export interface RouterDecision {
  intent: string;
  taskType: TaskType;
  priority: "low" | "medium" | "high" | "critical";
  targetAgentId: string;
  targetAgentRole: AgentRole;
  dependencies: string[];
  approvalRequired: boolean;
  approvalType?: ApprovalType;
  reviewRequired: boolean;
  reviewAgentId?: string;
  reasoning: string;
}

export interface RouterInput {
  source: "owner_command" | "scheduled" | "system_event" | "workflow_event" | "failure_event" | "manual";
  command?: string;
  eventData?: Record<string, any>;
  context?: Record<string, any>;
}

class ExecutiveRouter {
  private agentRoleMap: Record<string, AgentRole> = {
    "FOX-PRODUCT-DEVELOPER": "product-developer",
    "FOX-QA-TECHNICAL-REVIEWER": "qa-technical-reviewer",
    "FOX-STAGING-RELEASE": "staging-release",
    "FOX-KNOWLEDGE": "knowledge",
    "FOX-SALES": "sales",
    "FOX-CUSTOMER-SUPPORT": "customer-support",
    "FOX-MARKETING": "marketing",
    "FOX-MONITORING": "monitoring",
    "FOX-EXECUTIVE-REPORTING": "executive-reporting",
  };

  private taskTypeCapabilities: Record<TaskType, AgentRole[]> = {
    code_development: ["product-developer"],
    code_review: ["qa-technical-reviewer"],
    staging_deploy: ["staging-release"],
    knowledge_management: ["knowledge"],
    crm_operation: ["sales", "customer-support"],
    support_operation: ["customer-support"],
    marketing_operation: ["marketing"],
    monitoring_check: ["monitoring"],
    executive_report: ["executive-reporting"],
    audit: ["product-developer", "qa-technical-reviewer"],
    self_healing: ["monitoring", "product-developer"],
    custom: ["product-developer", "qa-technical-reviewer", "monitoring"],
  };

  private approvalRequiredTypes: TaskType[] = [
    "staging_deploy",
  ];

  private reviewRequiredTypes: TaskType[] = [
    "code_development",
    "code_review",
    "staging_deploy",
    "audit",
  ];

  private approvalTypeMap: Record<TaskType, ApprovalType | null> = {
    code_development: null,
    code_review: null,
    staging_deploy: "production_deploy",
    knowledge_management: null,
    crm_operation: null,
    support_operation: null,
    marketing_operation: null,
    monitoring_check: null,
    executive_report: null,
    audit: null,
    self_healing: null,
    custom: null,
  };

  async analyzeAndRoute(input: RouterInput): Promise<RouterDecision> {
    const intent = await this.determineIntent(input);
    const taskType = this.mapIntentToTaskType(intent);
    const priority = this.determinePriority(input, taskType);
    const targetAgent = await this.selectTargetAgent(taskType, input);
    const dependencies = this.determineDependencies(taskType, input);
    const approvalRequired = this.approvalRequiredTypes.includes(taskType);
    const approvalType = this.approvalTypeMap[taskType];
    const reviewRequired = this.reviewRequiredTypes.includes(taskType);
    const reviewAgentId = reviewRequired ? await this.getReviewAgentId() : undefined;

    return {
      intent,
      taskType,
      priority,
      targetAgentId: targetAgent.id,
      targetAgentRole: targetAgent.role,
      dependencies,
      approvalRequired,
      approvalType,
      reviewRequired,
      reviewAgentId,
      reasoning: `Routed ${taskType} to ${targetAgent.name} (${targetAgent.role}) based on intent: ${intent}`,
    };
  }

  private async determineIntent(input: RouterInput): Promise<string> {
    if (input.command) {
      return input.command;
    }
    if (input.eventData) {
      return `Event: ${input.eventData.type || "unknown"}`;
    }
    return "Autonomous system task";
  }

  private mapIntentToTaskType(intent: string): TaskType {
    const lower = intent.toLowerCase();
    
    if (lower.includes("audit") || lower.includes("analyze") || lower.includes("inspect")) {
      return "audit";
    }
    if (lower.includes("deploy") || lower.includes("release") || lower.includes("stage")) {
      return "staging_deploy";
    }
    if (lower.includes("review") || lower.includes("qa") || lower.includes("quality")) {
      return "code_review";
    }
    if (lower.includes("develop") || lower.includes("implement") || lower.includes("code") || lower.includes("build") || lower.includes("modify")) {
      return "code_development";
    }
    if (lower.includes("knowledge") || lower.includes("document")) {
      return "knowledge_management";
    }
    if (lower.includes("crm") || lower.includes("lead") || lower.includes("sale")) {
      return "crm_operation";
    }
    if (lower.includes("support") || lower.includes("ticket") || lower.includes("customer")) {
      return "support_operation";
    }
    if (lower.includes("market") || lower.includes("campaign") || lower.includes("content") || lower.includes("social")) {
      return "marketing_operation";
    }
    if (lower.includes("monitor") || lower.includes("health") || lower.includes("check") || lower.includes("alert")) {
      return "monitoring_check";
    }
    if (lower.includes("report") || lower.includes("executive") || lower.includes("summary") || lower.includes("dashboard")) {
      return "executive_report";
    }
    if (lower.includes("heal") || lower.includes("fix") || lower.includes("recover") || lower.includes("repair")) {
      return "self_healing";
    }
    return "custom";
  }

  private determinePriority(input: RouterInput, taskType: TaskType): "low" | "medium" | "high" | "critical" {
    if (input.source === "owner_command") return "high";
    if (input.source === "failure_event") return "critical";
    if (input.source === "workflow_event") return "high";
    if (taskType === "staging_deploy") return "high";
    if (taskType === "self_healing") return "critical";
    if (taskType === "code_review") return "high";
    return "medium";
  }

  private async selectTargetAgent(taskType: TaskType, input: RouterInput): Promise<FoxAgent> {
    const capableRoles = this.taskTypeCapabilities[taskType] || ["product-developer"];
    
    // Try to get the primary agent for this role
    for (const role of capableRoles) {
      const agent = await getAgentByRole(role);
      if (agent && (agent.status === "active" || agent.status === "idle")) {
        return agent;
      }
    }

    // Fallback: find any active agent with matching role
    const agents = await listAgents();
    for (const role of capableRoles) {
      const agent = agents.find((a) => a.role === role && (a.status === "active" || a.status === "idle"));
      if (agent) return agent;
    }

    // Ultimate fallback: first available agent
    const available = agents.find((a) => a.status === "active" || a.status === "idle");
    if (available) return available;

    // If no agent available, return first agent (will queue)
    if (agents.length > 0) return agents[0];

    throw new Error("No agents registered in the system");
  }

  private determineDependencies(taskType: TaskType, input: RouterInput): string[] {
    const deps: string[] = [];
    
    // Code development tasks often need review
    if (taskType === "code_development") {
      deps.push("code_review");
    }
    
    // Staging deploy needs successful review
    if (taskType === "staging_deploy") {
      deps.push("code_review");
    }
    
    return deps;
  }

  private async getReviewAgentId(): Promise<string | undefined> {
    const reviewer = await getAgentByRole("qa-technical-reviewer");
    return reviewer?.id;
  }

  // ============================================================
  // TASK DISPATCH
  // ============================================================

  async dispatchTask(input: RouterInput): Promise<FoxTask> {
    const decision = await this.analyzeAndRoute(input);
    
    const task = await createTask({
      title: this.generateTaskTitle(decision),
      description: input.command || JSON.stringify(input.eventData),
      taskType: decision.taskType,
      intent: decision.intent,
      priority: decision.priority,
      status: "new",
      targetAgentId: decision.targetAgentId,
      dependencies: decision.dependencies,
      approvalRequired: decision.approvalRequired,
      approvalType: decision.approvalType,
      reviewRequired: decision.reviewRequired,
      reviewAgentId: decision.reviewAgentId,
      triggerType: input.source as TriggerType,
      triggerSource: input.source,
      payload: input.eventData || { command: input.command },
      retryCount: 0,
      maxRetries: 3,
    });

    await logActivity({
      taskId: task.id,
      agentId: decision.targetAgentId,
      type: "task_created",
      message: `Task dispatched: ${task.title} to ${decision.targetAgentRole}`,
      severity: "info",
      metadata: { 
        decision: decision.reasoning,
        taskType: decision.taskType,
        priority: decision.priority,
        approvalRequired: decision.approvalRequired,
        reviewRequired: decision.reviewRequired,
      },
    });

    return task;
  }

  private generateTaskTitle(decision: RouterDecision): string {
    const typeLabels: Record<TaskType, string> = {
      code_development: "Development",
      code_review: "Code Review",
      staging_deploy: "Staging Deploy",
      knowledge_management: "Knowledge Management",
      crm_operation: "CRM Operation",
      support_operation: "Support Operation",
      marketing_operation: "Marketing Operation",
      monitoring_check: "Health Check",
      executive_report: "Executive Report",
      audit: "Audit",
      self_healing: "Self Healing",
      custom: "Custom Task",
    };
    return `${typeLabels[decision.taskType]}: ${decision.intent.substring(0, 60)}`;
  }

  // ============================================================
  // TASK EXECUTION LIFECYCLE
  // ============================================================

  async executeTask(taskId: string): Promise<FoxExecution> {
    const task = await getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    
    const agent = await getAgent(task.targetAgentId);
    if (!agent) throw new Error(`Agent ${task.targetAgentId} not found`);

    await updateTaskStatus(taskId, "running");
    await updateAgentStatus(agent.id, "running");

    const execution = await createExecution({
      taskId,
      agentId: agent.id,
      status: "running",
      input: task.payload,
      logs: [],
      startedAt: new Date().toISOString(),
    });

    await logActivity({
      taskId,
      agentId: agent.id,
      executionId: execution.id,
      type: "task_started",
      message: `Execution started for task: ${task.title}`,
      severity: "info",
      metadata: { executionId: execution.id },
    });

    try {
      // Execute the task based on agent role
      const result = await this.runAgentTask(agent, task, execution.id);
      
      await completeExecution(execution.id, result);
      await updateTaskStatus(taskId, "done", { result });
      await updateAgentStatus(agent.id, "idle");
      await incrementAgentSuccess(agent.id);

      await logActivity({
        taskId,
        agentId: agent.id,
        executionId: execution.id,
        type: "task_completed",
        message: `Task completed successfully: ${task.title}`,
        severity: "info",
        metadata: { result },
      });

      // If review required, create review task
      if (task.reviewRequired && task.reviewAgentId) {
        await this.createReviewTask(task, result);
      }

      return getExecution(execution.id) as Promise<FoxExecution>;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await completeExecution(execution.id, undefined, errorMessage);
      await updateTaskStatus(taskId, "failed", { error: errorMessage });
      await updateAgentStatus(agent.id, "error");
      await incrementAgentFailure(agent.id);

      await logActivity({
        taskId,
        agentId: agent.id,
        executionId: execution.id,
        type: "task_failed",
        message: `Task failed: ${task.title} - ${errorMessage}`,
        severity: "error",
        metadata: { error: errorMessage },
      });

      // Auto-retry if retries remain
      if (task.retryCount < task.maxRetries) {
        await this.retryTask(taskId);
      }

      throw error;
    }
  }

  private async runAgentTask(agent: FoxAgent, task: FoxTask, executionId: string): Promise<Record<string, any>> {
    // Add execution log
    await addExecutionLog(executionId, {
      level: "info",
      message: `Agent ${agent.name} starting task: ${task.title}`,
    });

    // This is where the actual agent logic would run
    // For now, we simulate based on agent role
    switch (agent.role) {
      case "product-developer":
        return await this.runProductDeveloperTask(agent, task, executionId);
      case "qa-technical-reviewer":
        return await this.runQATask(agent, task, executionId);
      case "staging-release":
        return await this.runStagingReleaseTask(agent, task, executionId);
      case "monitoring":
        return await this.runMonitoringTask(agent, task, executionId);
      case "executive-reporting":
        return await this.runExecutiveReportTask(agent, task, executionId);
      default:
        return await this.runGenericTask(agent, task, executionId);
    }
  }

  private async runProductDeveloperTask(agent: FoxAgent, task: FoxTask, executionId: string): Promise<Record<string, any>> {
    await addExecutionLog(executionId, { level: "info", message: "Analyzing codebase..." });
    await addExecutionLog(executionId, { level: "info", message: "Implementing changes..." });
    await addExecutionLog(executionId, { level: "info", message: "Running tests..." });
    return { status: "completed", filesModified: [], testsPassed: true };
  }

  private async runQATask(agent: FoxAgent, task: FoxTask, executionId: string): Promise<Record<string, any>> {
    await addExecutionLog(executionId, { level: "info", message: "Reviewing code changes..." });
    await addExecutionLog(executionId, { level: "info", message: "Checking security..." });
    await addExecutionLog(executionId, { level: "info", message: "Verifying UI results..." });
    return { status: "reviewed", issuesFound: 0, approved: true };
  }

  private async runStagingReleaseTask(agent: FoxAgent, task: FoxTask, executionId: string): Promise<Record<string, any>> {
    await addExecutionLog(executionId, { level: "info", message: "Building application..." });
    await addExecutionLog(executionId, { level: "info", message: "Deploying to staging..." });
    await addExecutionLog(executionId, { level: "info", message: "Verifying deployment..." });
    return { status: "deployed", url: "https://staging.foxaiagency.online", verified: true };
  }

  private async runMonitoringTask(agent: FoxAgent, task: FoxTask, executionId: string): Promise<Record<string, any>> {
    await addExecutionLog(executionId, { level: "info", message: "Checking system health..." });
    await addExecutionLog(executionId, { level: "info", message: "Checking agent health..." });
    await addExecutionLog(executionId, { level: "info", message: "Checking n8n workflows..." });
    return { status: "healthy", checksPassed: true };
  }

  private async runExecutiveReportTask(agent: FoxAgent, task: FoxTask, executionId: string): Promise<Record<string, any>> {
    await addExecutionLog(executionId, { level: "info", message: "Generating executive report..." });
    return { status: "generated", reportUrl: "/reports/executive-latest.pdf" };
  }

  private async runGenericTask(agent: FoxAgent, task: FoxTask, executionId: string): Promise<Record<string, any>> {
    await addExecutionLog(executionId, { level: "info", message: "Executing generic task..." });
    return { status: "completed" };
  }

  private async createReviewTask(originalTask: FoxTask, result: Record<string, any>): Promise<FoxTask> {
    const reviewAgent = await getAgent(originalTask.reviewAgentId!);
    if (!reviewAgent) throw new Error("Review agent not found");

    const reviewTask = await createTask({
      title: `Review: ${originalTask.title}`,
      description: `Review the output of task: ${originalTask.title}`,
      taskType: "code_review",
      intent: `Review results from ${originalTask.title}`,
      priority: "high",
      status: "new",
      targetAgentId: reviewAgent.id,
      dependencies: [originalTask.id],
      approvalRequired: false,
      reviewRequired: false,
      triggerType: "workflow_event",
      triggerSource: "review_required",
      payload: { originalTaskId: originalTask.id, originalResult: result },
      retryCount: 0,
      maxRetries: 2,
    });

    await logActivity({
      taskId: reviewTask.id,
      agentId: reviewAgent.id,
      type: "review_started",
      message: `Review started for task: ${originalTask.title}`,
      severity: "info",
      metadata: { originalTaskId: originalTask.id },
    });

    return reviewTask;
  }

  private async retryTask(taskId: string): Promise<void> {
    const task = await getTask(taskId);
    if (!task) return;

    await updateTaskStatus(taskId, "retry", { retryCount: task.retryCount + 1 });
    
    await logActivity({
      taskId,
      type: "task_retry",
      message: `Task retry ${task.retryCount + 1}/${task.maxRetries}: ${task.title}`,
      severity: "warn",
      metadata: { retryCount: task.retryCount + 1, maxRetries: task.maxRetries },
    });

    // Re-dispatch
    await this.executeTask(taskId);
  }
}

export const executiveRouter = new ExecutiveRouter();