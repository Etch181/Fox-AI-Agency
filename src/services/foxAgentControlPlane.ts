import { adminDb } from "./firebaseAdmin";
import {
  FoxAgent,
  FoxTask,
  FoxExecution,
  FoxApproval,
  FoxActivity,
  FoxHealth,
  FoxLesson,
  AgentStatus,
  TaskStatus,
  HealthStatus,
  AgentRole,
  ExecutionLog,
  HealthCheck,
} from "../types";

const COLLECTIONS = {
  agents: "fox_agents",
  tasks: "fox_tasks",
  executions: "fox_executions",
  approvals: "fox_approvals",
  activities: "fox_activities",
  health: "fox_health",
  lessons: "fox_lessons",
} as const;

function now(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================
// AGENTS
// ============================================================

export async function createAgent(agent: Omit<FoxAgent, "id" | "createdAt" | "updatedAt">): Promise<FoxAgent> {
  const id = generateId();
  const fullAgent: FoxAgent = {
    ...agent,
    id,
    createdAt: now(),
    updatedAt: now(),
  };
  await adminDb.collection(COLLECTIONS.agents).doc(id).set(fullAgent);
  await logActivity({
    agentId: id,
    type: "agent_created",
    message: `Agent created: ${agent.name} (${agent.role})`,
    severity: "info",
    metadata: { role: agent.role },
  });
  return fullAgent;
}

export async function getAgent(id: string): Promise<FoxAgent | null> {
  const doc = await adminDb.collection(COLLECTIONS.agents).doc(id).get();
  return doc.exists ? (doc.data() as FoxAgent) : null;
}

export async function getAgentByRole(role: AgentRole): Promise<FoxAgent | null> {
  const snapshot = await adminDb.collection(COLLECTIONS.agents).where("role", "==", role).limit(1).get();
  return snapshot.empty ? null : (snapshot.docs[0].data() as FoxAgent);
}

export async function listAgents(): Promise<FoxAgent[]> {
  const snapshot = await adminDb.collection(COLLECTIONS.agents).orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => doc.data() as FoxAgent);
}

export async function updateAgent(id: string, updates: Partial<FoxAgent>): Promise<FoxAgent | null> {
  const ref = adminDb.collection(COLLECTIONS.agents).doc(id);
  const data = { ...updates, updatedAt: now() };
  await ref.update(data);
  const updated = await getAgent(id);
  if (updated) {
    await logActivity({
      agentId: id,
      type: "agent_updated",
      message: `Agent updated: ${updated.name}`,
      severity: "info",
      metadata: { changes: Object.keys(updates) },
    });
  }
  return updated;
}

export async function updateAgentStatus(id: string, status: AgentStatus): Promise<FoxAgent | null> {
  return updateAgent(id, { status, updatedAt: now() });
}

export async function incrementAgentSuccess(id: string): Promise<void> {
  const ref = adminDb.collection(COLLECTIONS.agents).doc(id);
  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) {
      const agent = doc.data() as FoxAgent;
      tx.update(ref, { successCount: agent.successCount + 1, lastExecutionStatus: "done", lastExecutionAt: now() });
    }
  });
}

export async function incrementAgentFailure(id: string): Promise<void> {
  const ref = adminDb.collection(COLLECTIONS.agents).doc(id);
  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) {
      const agent = doc.data() as FoxAgent;
      tx.update(ref, { failureCount: agent.failureCount + 1, lastExecutionStatus: "failed", lastExecutionAt: now() });
    }
  });
}

// ============================================================
// TASKS
// ============================================================

export async function createTask(task: Omit<FoxTask, "id" | "createdAt" | "updatedAt">): Promise<FoxTask> {
  const id = generateId();
  const fullTask: FoxTask = {
    ...task,
    id,
    createdAt: now(),
    updatedAt: now(),
  };
  await adminDb.collection(COLLECTIONS.tasks).doc(id).set(fullTask);
  await logActivity({
    taskId: id,
    type: "task_created",
    message: `Task created: ${task.title}`,
    severity: "info",
    metadata: { taskType: task.taskType, priority: task.priority, targetAgentId: task.targetAgentId },
  });
  return fullTask;
}

export async function getTask(id: string): Promise<FoxTask | null> {
  const doc = await adminDb.collection(COLLECTIONS.tasks).doc(id).get();
  return doc.exists ? (doc.data() as FoxTask) : null;
}

export async function listTasks(filters?: { status?: TaskStatus; targetAgentId?: string; limit?: number }): Promise<FoxTask[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.tasks).orderBy("createdAt", "desc");
  if (filters?.status) query = query.where("status", "==", filters.status);
  if (filters?.targetAgentId) query = query.where("targetAgentId", "==", filters.targetAgentId);
  if (filters?.limit) query = query.limit(filters.limit);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as FoxTask);
}

export async function updateTaskStatus(id: string, status: TaskStatus, updates: Partial<FoxTask> = {}): Promise<FoxTask | null> {
  const data = { ...updates, status, updatedAt: now() };
  if (status === "running") data.startedAt = now();
  if (status === "done" || status === "verified" || status === "failed") data.completedAt = now();
  await adminDb.collection(COLLECTIONS.tasks).doc(id).update(data);
  const updated = await getTask(id);
  if (updated) {
    await logActivity({
      taskId: id,
      type: status === "running" ? "task_started" : status === "done" ? "task_completed" : status === "failed" ? "task_failed" : status === "retry" ? "task_retry" : "custom",
      message: `Task ${status}: ${updated.title}`,
      severity: status === "failed" ? "error" : "info",
      metadata: { previousStatus: updated.status, newStatus: status },
    });
  }
  return updated;
}

export async function assignTask(id: string, agentId: string): Promise<FoxTask | null> {
  await adminDb.collection(COLLECTIONS.tasks).doc(id).update({ assignedAgentId: agentId, status: "assigned", updatedAt: now() });
  const updated = await getTask(id);
  if (updated) {
    await logActivity({
      taskId: id,
      agentId,
      type: "task_assigned",
      message: `Task assigned to agent: ${updated.title}`,
      severity: "info",
      metadata: { agentId },
    });
  }
  return updated;
}

// ============================================================
// EXECUTIONS
// ============================================================

export async function createExecution(execution: Omit<FoxExecution, "id">): Promise<FoxExecution> {
  const id = generateId();
  const fullExecution: FoxExecution = { ...execution, id };
  await adminDb.collection(COLLECTIONS.executions).doc(id).set(fullExecution);
  return fullExecution;
}

export async function getExecution(id: string): Promise<FoxExecution | null> {
  const doc = await adminDb.collection(COLLECTIONS.executions).doc(id).get();
  return doc.exists ? (doc.data() as FoxExecution) : null;
}

export async function listExecutionsByTask(taskId: string): Promise<FoxExecution[]> {
  const snapshot = await adminDb.collection(COLLECTIONS.executions).where("taskId", "==", taskId).orderBy("startedAt", "desc").get();
  return snapshot.docs.map((doc) => doc.data() as FoxExecution);
}

export async function updateExecution(executionId: string, updates: Partial<FoxExecution>): Promise<FoxExecution | null> {
  await adminDb.collection(COLLECTIONS.executions).doc(executionId).update(updates);
  return getExecution(executionId);
}

export async function completeExecution(executionId: string, output?: Record<string, any>, error?: string): Promise<FoxExecution | null> {
  const execution = await getExecution(executionId);
  if (!execution) return null;
  const completedAt = now();
  const durationMs = new Date(completedAt).getTime() - new Date(execution.startedAt).getTime();
  await updateExecution(executionId, { output, error, completedAt, durationMs, status: error ? "failed" : "done" });
  return getExecution(executionId);
}

export async function addExecutionLog(executionId: string, log: Omit<ExecutionLog, "timestamp">): Promise<void> {
  const timestamp = now();
  const ref = adminDb.collection(COLLECTIONS.executions).doc(executionId);
  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) {
      const execution = doc.data() as FoxExecution;
      const logs = execution.logs || [];
      logs.push({ ...log, timestamp });
      tx.update(ref, { logs });
    }
  });
}

// ============================================================
// APPROVALS
// ============================================================

export async function createApproval(approval: Omit<FoxApproval, "id" | "requestedAt">): Promise<FoxApproval> {
  const id = generateId();
  const fullApproval: FoxApproval = { ...approval, id, requestedAt: now() };
  await adminDb.collection(COLLECTIONS.approvals).doc(id).set(fullApproval);
  await logActivity({
    taskId: approval.taskId,
    type: "approval_requested",
    message: `Approval requested: ${approval.type}`,
    severity: "warn",
    metadata: { approvalType: approval.type, approvalId: id },
  });
  return fullApproval;
}

export async function getApproval(id: string): Promise<FoxApproval | null> {
  const doc = await adminDb.collection(COLLECTIONS.approvals).doc(id).get();
  return doc.exists ? (doc.data() as FoxApproval) : null;
}

export async function listPendingApprovals(): Promise<FoxApproval[]> {
  const snapshot = await adminDb.collection(COLLECTIONS.approvals).where("status", "==", "pending").orderBy("requestedAt", "asc").get();
  return snapshot.docs.map((doc) => doc.data() as FoxApproval);
}

export async function decideApproval(id: string, decidedBy: string, decision: "approved" | "rejected", decisionReason?: string): Promise<FoxApproval | null> {
  const now_ = now();
  await adminDb.collection(COLLECTIONS.approvals).doc(id).update({ status: decision, decidedBy, decidedAt: now_, decision: decisionReason });
  const updated = await getApproval(id);
  if (updated) {
    await logActivity({
      taskId: updated.taskId,
      type: "approval_decided",
      message: `Approval ${decision}: ${updated.type}`,
      severity: decision === "approved" ? "info" : "warn",
      metadata: { approvalId: id, decision, reason: decisionReason },
    });
  }
  return updated;
}

// ============================================================
// ACTIVITIES
// ============================================================

export async function logActivity(activity: Omit<FoxActivity, "id" | "createdAt">): Promise<FoxActivity> {
  const id = generateId();
  const fullActivity: FoxActivity = { ...activity, id, createdAt: now() };
  await adminDb.collection(COLLECTIONS.activities).doc(id).set(fullActivity);
  return fullActivity;
}

export async function listActivities(filters?: { agentId?: string; taskId?: string; limit?: number }): Promise<FoxActivity[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.activities).orderBy("createdAt", "desc");
  if (filters?.agentId) query = query.where("agentId", "==", filters.agentId);
  if (filters?.taskId) query = query.where("taskId", "==", filters.taskId);
  if (filters?.limit) query = query.limit(filters.limit);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as FoxActivity);
}

// ============================================================
// HEALTH
// ============================================================

export async function createHealthRecord(health: Omit<FoxHealth, "id">): Promise<FoxHealth> {
  const id = generateId();
  const fullHealth: FoxHealth = { ...health, id };
  await adminDb.collection(COLLECTIONS.health).doc(id).set(fullHealth);
  return fullHealth;
}

export async function getHealth(agentId: string): Promise<FoxHealth | null> {
  const snapshot = await adminDb.collection(COLLECTIONS.health).where("agentId", "==", agentId).orderBy("lastCheckAt", "desc").limit(1).get();
  return snapshot.empty ? null : (snapshot.docs[0].data() as FoxHealth);
}

export async function updateHealth(agentId: string, updates: Partial<FoxHealth>): Promise<FoxHealth | null> {
  const existing = await getHealth(agentId);
  if (!existing) return null;
  await adminDb.collection(COLLECTIONS.health).doc(existing.id).update({ ...updates, lastCheckAt: now() });
  return getHealth(agentId);
}

export async function recordHealthCheck(agentId: string, check: Omit<HealthCheck, "lastRunAt">): Promise<void> {
  const health = await getHealth(agentId);
  if (!health) return;
  const checks = [...health.checks, { ...check, lastRunAt: now() }];
  const status = checks.some((c) => c.status === "fail") ? "critical" : checks.some((c) => c.status === "warn") ? "degraded" : "healthy";
  await adminDb.collection(COLLECTIONS.health).doc(health.id).update({ checks, status, lastCheckAt: now() });
}

// ============================================================
// LESSONS
// ============================================================

export async function createLesson(lesson: Omit<FoxLesson, "id" | "createdAt">): Promise<FoxLesson> {
  const id = generateId();
  const fullLesson: FoxLesson = { ...lesson, id, createdAt: now() };
  await adminDb.collection(COLLECTIONS.lessons).doc(id).set(fullLesson);
  return fullLesson;
}

export async function listLessons(filters?: { category?: string; acknowledged?: boolean; limit?: number }): Promise<FoxLesson[]> {
  let query: FirebaseFirestore.Query = adminDb.collection(COLLECTIONS.lessons).orderBy("createdAt", "desc");
  if (filters?.category) query = query.where("category", "==", filters.category);
  if (filters?.acknowledged !== undefined) query = query.where("acknowledged", "==", filters.acknowledged);
  if (filters?.limit) query = query.limit(filters.limit);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as FoxLesson);
}

export async function acknowledgeLesson(id: string): Promise<FoxLesson | null> {
  await adminDb.collection(COLLECTIONS.lessons).doc(id).update({ acknowledged: true });
  const doc = await adminDb.collection(COLLECTIONS.lessons).doc(id).get();
  return doc.exists ? (doc.data() as FoxLesson) : null;
}

// ============================================================
// EXECUTIVE OVERVIEW QUERIES
// ============================================================

export async function getExecutiveOverview(): Promise<{
  totalAgents: number;
  activeAgents: number;
  agentsByStatus: Record<AgentStatus, number>;
  agentsByRole: Record<string, number>;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  pendingApprovals: number;
  recentActivities: FoxActivity[];
  systemHealth: "healthy" | "degraded" | "critical";
}> {
  const [agents, tasks, approvals, activities] = await Promise.all([
    listAgents(),
    listTasks(),
    listPendingApprovals(),
    listActivities({ limit: 20 }),
  ]);

  const agentsByStatus: Record<AgentStatus, number> = {
    active: 0, idle: 0, running: 0, paused: 0, error: 0, offline: 0,
  };
  const agentsByRole: Record<string, number> = {};
  let activeAgents = 0;
  for (const a of agents) {
    agentsByStatus[a.status]++;
    agentsByRole[a.role] = (agentsByRole[a.role] || 0) + 1;
    if (a.status === "active" || a.status === "running") activeAgents++;
  }

  const tasksByStatus: Record<TaskStatus, number> = {
    new: 0, planned: 0, assigned: 0, running: 0, review: 0, verified: 0, done: 0,
    failed: 0, diagnose: 0, retry: 0, blocked_owner: 0,
  };
  for (const t of tasks) {
    tasksByStatus[t.status]++;
  }

  const healthChecks = await Promise.all(agents.map((a) => getHealth(a.id)));
  const unhealthy = healthChecks.filter((h) => h && h.status !== "healthy").length;
  const systemHealth = unhealthy === 0 ? "healthy" : unhealthy < agents.length / 2 ? "degraded" : "critical";

  return {
    totalAgents: agents.length,
    activeAgents,
    agentsByStatus,
    agentsByRole,
    totalTasks: tasks.length,
    tasksByStatus,
    pendingApprovals: approvals.length,
    recentActivities: activities,
    systemHealth,
  };
}