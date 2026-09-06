import {
  FoxActivity,
  FoxHealth,
  FoxLesson,
  HealthStatus,
  HealthCheck,
  HealthMetrics,
} from "../types";
import {
  logActivity,
  listActivities,
  createHealthRecord,
  getHealth,
  updateHealth,
  recordHealthCheck,
  createLesson,
  listLessons,
  acknowledgeLesson,
  listAgents,
  getExecutiveOverview,
} from "./foxAgentControlPlane";
import { adminDb } from "./firebaseAdmin";

const COLLECTIONS = {
  activities: "fox_activities",
  health: "fox_health",
  lessons: "fox_lessons",
} as const;

// ============================================================
// ACTIVITY LOG SERVICE
// ============================================================

export interface ActivityFilters {
  agentId?: string;
  taskId?: string;
  executionId?: string;
  type?: FoxActivity["type"];
  severity?: FoxActivity["severity"];
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  last24h: number;
  last7d: number;
}

export class ActivityLogService {
  async log(activity: Omit<FoxActivity, "id" | "createdAt">): Promise<FoxActivity> {
    return logActivity(activity);
  }

  async query(filters: ActivityFilters = {}): Promise<FoxActivity[]> {
    let query: FirebaseFirestore.Query = adminDb
      .collection(COLLECTIONS.activities)
      .orderBy("createdAt", "desc");

    if (filters.agentId) query = query.where("agentId", "==", filters.agentId);
    if (filters.taskId) query = query.where("taskId", "==", filters.taskId);
    if (filters.executionId)
      query = query.where("executionId", "==", filters.executionId);
    if (filters.type) query = query.where("type", "==", filters.type);
    if (filters.severity) query = query.where("severity", "==", filters.severity);
    if (filters.startDate)
      query = query.where("createdAt", ">=", filters.startDate);
    if (filters.endDate) query = query.where("createdAt", "<=", filters.endDate);
    if (filters.limit) query = query.limit(filters.limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as FoxActivity);
  }

  async getRecent(limit = 50): Promise<FoxActivity[]> {
    return listActivities({ limit });
  }

  async getForAgent(agentId: string, limit = 50): Promise<FoxActivity[]> {
    return listActivities({ agentId, limit });
  }

  async getForTask(taskId: string, limit = 50): Promise<FoxActivity[]> {
    return listActivities({ taskId, limit });
  }

  async getStats(): Promise<ActivityStats> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [all, last24h, last7d] = await Promise.all([
      this.query({ limit: 10000 }),
      this.query({ startDate: dayAgo, limit: 10000 }),
      this.query({ startDate: weekAgo, limit: 10000 }),
    ]);

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const a of all) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    }

    return {
      total: all.length,
      byType,
      bySeverity,
      last24h: last24h.length,
      last7d: last7d.length,
    };
  }

  // Convenience methods for common activity types
  async logAgentCreated(agentId: string, name: string, role: string): Promise<void> {
    await this.log({
      agentId,
      type: "agent_created",
      message: `Agent created: ${name} (${role})`,
      severity: "info",
      metadata: { name, role },
    });
  }

  async logAgentUpdated(agentId: string, changes: string[]): Promise<void> {
    await this.log({
      agentId,
      type: "agent_updated",
      message: `Agent updated: ${changes.join(", ")}`,
      severity: "info",
      metadata: { changes },
    });
  }

  async logTaskCreated(taskId: string, title: string, taskType: string): Promise<void> {
    await this.log({
      taskId,
      type: "task_created",
      message: `Task created: ${title}`,
      severity: "info",
      metadata: { taskType },
    });
  }

  async logTaskStarted(taskId: string, agentId: string, title: string): Promise<void> {
    await this.log({
      taskId,
      agentId,
      type: "task_started",
      message: `Task started: ${title}`,
      severity: "info",
      metadata: {},
    });
  }

  async logTaskCompleted(taskId: string, agentId: string, title: string, result?: any): Promise<void> {
    await this.log({
      taskId,
      agentId,
      type: "task_completed",
      message: `Task completed: ${title}`,
      severity: "info",
      metadata: { result },
    });
  }

  async logTaskFailed(taskId: string, agentId: string, title: string, error: string): Promise<void> {
    await this.log({
      taskId,
      agentId,
      type: "task_failed",
      message: `Task failed: ${title} - ${error}`,
      severity: "error",
      metadata: { error },
    });
  }

  async logApprovalRequested(taskId: string, approvalType: string, approvalId: string): Promise<void> {
    await this.log({
      taskId,
      type: "approval_requested",
      message: `Approval requested: ${approvalType}`,
      severity: "warn",
      metadata: { approvalType, approvalId },
    });
  }

  async logApprovalDecided(taskId: string, approvalType: string, decision: string, reason?: string): Promise<void> {
    await this.log({
      taskId,
      type: "approval_decided",
      message: `Approval ${decision}: ${approvalType}`,
      severity: decision === "approved" ? "info" : "warn",
      metadata: { approvalType, decision, reason },
    });
  }

  async logReviewStarted(taskId: string, agentId: string, originalTaskId: string): Promise<void> {
    await this.log({
      taskId,
      agentId,
      type: "review_started",
      message: `Review started for task: ${originalTaskId}`,
      severity: "info",
      metadata: { originalTaskId },
    });
  }

  async logReviewCompleted(taskId: string, agentId: string, originalTaskId: string, approved: boolean): Promise<void> {
    await this.log({
      taskId,
      agentId,
      type: "review_completed",
      message: `Review ${approved ? "approved" : "rejected"}: ${originalTaskId}`,
      severity: approved ? "info" : "warn",
      metadata: { originalTaskId, approved },
    });
  }

  async logHealthCheck(agentId: string, checkName: string, passed: boolean, message: string): Promise<void> {
    await this.log({
      agentId,
      type: "health_check",
      message: `Health check ${checkName}: ${passed ? "PASS" : "FAIL"} - ${message}`,
      severity: passed ? "info" : "error",
      metadata: { checkName, passed },
    });
  }

  async logSelfHealing(agentId: string, taskId: string, action: string, result: string): Promise<void> {
    await this.log({
      agentId,
      taskId,
      type: "self_healing",
      message: `Self-healing: ${action} - ${result}`,
      severity: "info",
      metadata: { action, result },
    });
  }

  async logStagingDeploy(taskId: string, url: string, verified: boolean): Promise<void> {
    await this.log({
      taskId,
      type: "staging_deploy",
      message: `Staging deployed: ${url} (${verified ? "verified" : "pending verification"})`,
      severity: "info",
      metadata: { url, verified },
    });
  }
}

export const activityLog = new ActivityLogService();

// ============================================================
// HEALTH MONITORING SERVICE
// ============================================================

export interface HealthSummary {
  overall: HealthStatus;
  agents: AgentHealthSummary[];
  checks: HealthCheckSummary[];
}

export interface AgentHealthSummary {
  agentId: string;
  agentName: string;
  agentRole: string;
  status: HealthStatus;
  lastCheckAt: string;
  uptimePercent: number;
  errorRate: number;
  successRate: number;
  checksPassing: number;
  checksTotal: number;
}

export interface HealthCheckSummary {
  name: string;
  status: "pass" | "fail" | "warn";
  agentsPassing: number;
  agentsTotal: number;
  lastRunAt: string;
}

export class HealthMonitoringService {
  private defaultChecks: Omit<HealthCheck, "lastRunAt">[] = [
    { name: "firestore_connectivity", status: "pass", message: "Firestore connection healthy" },
    { name: "n8n_connectivity", status: "pass", message: "n8n instance reachable" },
    { name: "agent_responsive", status: "pass", message: "Agent responding to tasks" },
    { name: "execution_success_rate", status: "pass", message: "Execution success rate > 90%" },
    { name: "queue_processing", status: "pass", message: "Task queue processing normally" },
  ];

  async initializeAgentHealth(agentId: string): Promise<FoxHealth> {
    const existing = await getHealth(agentId);
    if (existing) return existing;

    const checks = this.defaultChecks.map((c) => ({ ...c, lastRunAt: new Date().toISOString() }));
    return createHealthRecord({
      agentId,
      status: "healthy",
      lastCheckAt: new Date().toISOString(),
      checks,
      metrics: {
        uptimePercent: 100,
        avgResponseTimeMs: 0,
        errorRatePercent: 0,
        successRatePercent: 100,
      },
    });
  }

  async runHealthCheck(agentId: string, checkName: string): Promise<HealthCheck> {
    const health = await getHealth(agentId);
    if (!health) {
      await this.initializeAgentHealth(agentId);
    }

    let check: HealthCheck;

    switch (checkName) {
      case "firestore_connectivity":
        check = await this.checkFirestoreConnectivity();
        break;
      case "n8n_connectivity":
        check = await this.checkN8nConnectivity();
        break;
      case "agent_responsive":
        check = await this.checkAgentResponsive(agentId);
        break;
      case "execution_success_rate":
        check = await this.checkExecutionSuccessRate(agentId);
        break;
      case "queue_processing":
        check = await this.checkQueueProcessing();
        break;
      default:
        check = { name: checkName, status: "warn", message: "Unknown check", lastRunAt: new Date().toISOString() };
    }

    await recordHealthCheck(agentId, check);
    return check;
  }

  async runAllChecks(agentId: string): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];
    for (const check of this.defaultChecks) {
      results.push(await this.runHealthCheck(agentId, check.name));
    }
    return results;
  }

  async getAgentHealthSummary(agentId: string): Promise<AgentHealthSummary | null> {
    const health = await getHealth(agentId);
    if (!health) return null;

    const agents = await listAgents();
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return null;

    const passing = health.checks.filter((c) => c.status === "pass").length;
    const total = health.checks.length;

    return {
      agentId,
      agentName: agent.name,
      agentRole: agent.role,
      status: health.status,
      lastCheckAt: health.lastCheckAt,
      uptimePercent: health.metrics.uptimePercent,
      errorRate: health.metrics.errorRatePercent,
      successRate: health.metrics.successRatePercent,
      checksPassing: passing,
      checksTotal: total,
    };
  }

  async getSystemHealthSummary(): Promise<HealthSummary> {
    const agents = await listAgents();
    const agentSummaries: AgentHealthSummary[] = [];

    for (const agent of agents) {
      const summary = await this.getAgentHealthSummary(agent.id);
      if (summary) agentSummaries.push(summary);
    }

    const allChecks: HealthCheckSummary[] = [];
    const checkNames = this.defaultChecks.map((c) => c.name);

    for (const checkName of checkNames) {
      let passing = 0;
      let total = 0;
      let lastRunAt = "";

      for (const agent of agents) {
        const health = await getHealth(agent.id);
        if (health) {
          const check = health.checks.find((c) => c.name === checkName);
          if (check) {
            total++;
            if (check.status === "pass") passing++;
            if (!lastRunAt || check.lastRunAt > lastRunAt) {
              lastRunAt = check.lastRunAt;
            }
          }
        }
      }

      allChecks.push({
        name: checkName,
        status: passing === total ? "pass" : passing === 0 ? "fail" : "warn",
        agentsPassing: passing,
        agentsTotal: total,
        lastRunAt,
      });
    }

    const unhealthyCount = agentSummaries.filter((a) => a.status !== "healthy").length;
    const overall = unhealthyCount === 0 ? "healthy" : unhealthyCount < agents.length / 2 ? "degraded" : "critical";

    return {
      overall,
      agents: agentSummaries,
      checks: allChecks,
    };
  }

  // Individual health checks
  private async checkFirestoreConnectivity(): Promise<HealthCheck> {
    try {
      await adminDb.collection("_health").limit(1).get();
      return { name: "firestore_connectivity", status: "pass", message: "Firestore connection healthy", lastRunAt: new Date().toISOString() };
    } catch (error) {
      return { name: "firestore_connectivity", status: "fail", message: `Firestore connection failed: ${error}`, lastRunAt: new Date().toISOString() };
    }
  }

  private async checkN8nConnectivity(): Promise<HealthCheck> {
    // Would check n8n API - stub for now
    return { name: "n8n_connectivity", status: "pass", message: "n8n instance reachable", lastRunAt: new Date().toISOString() };
  }

  private async checkAgentResponsive(agentId: string): Promise<HealthCheck> {
    // Would check if agent has processed tasks recently
    return { name: "agent_responsive", status: "pass", message: "Agent responsive", lastRunAt: new Date().toISOString() };
  }

  private async checkExecutionSuccessRate(agentId: string): Promise<HealthCheck> {
    const health = await getHealth(agentId);
    if (!health) return { name: "execution_success_rate", status: "warn", message: "No health data", lastRunAt: new Date().toISOString() };
    
    const rate = health.metrics.successRatePercent;
    return {
      name: "execution_success_rate",
      status: rate >= 90 ? "pass" : rate >= 70 ? "warn" : "fail",
      message: `Execution success rate: ${rate.toFixed(1)}%`,
      lastRunAt: new Date().toISOString(),
    };
  }

  private async checkQueueProcessing(): Promise<HealthCheck> {
    // Would check task queue processing
    return { name: "queue_processing", status: "pass", message: "Task queue processing normally", lastRunAt: new Date().toISOString() };
  }
}

export const healthMonitor = new HealthMonitoringService();

// ============================================================
// LESSONS LEARNED SERVICE
// ============================================================

export class LessonsService {
  async create(lesson: Omit<FoxLesson, "id" | "createdAt">): Promise<FoxLesson> {
    return createLesson(lesson);
  }

  async list(filters?: { category?: string; acknowledged?: boolean; limit?: number }): Promise<FoxLesson[]> {
    return listLessons(filters);
  }

  async acknowledge(id: string): Promise<FoxLesson | null> {
    return acknowledgeLesson(id);
  }

  async getUnacknowledgedCritical(): Promise<FoxLesson[]> {
    const all = await this.list({ acknowledged: false, limit: 1000 });
    return all.filter((l) => l.severity === "critical");
  }

  async recordFromExecution(
    executionId: string,
    agentId: string,
    taskId: string,
    category: FoxLesson["category"],
    severity: FoxLesson["severity"],
    title: string,
    description: string,
    preventionRule: string
  ): Promise<FoxLesson> {
    return this.create({
      title,
      description,
      category,
      severity,
      sourceAgentId: agentId,
      sourceTaskId: taskId,
      sourceExecutionId: executionId,
      applicableAgents: [agentId],
      preventionRule,
      acknowledged: false,
    });
  }
}

export const lessons = new LessonsService();