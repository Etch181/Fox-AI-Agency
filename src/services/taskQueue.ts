import {
  FoxTask,
  FoxExecution,
  TaskStatus,
  TaskType,
  AgentStatus,
} from "../types";
import {
  listTasks,
  getTask,
  updateTaskStatus,
  assignTask,
  createExecution,
  addExecutionLog,
  completeExecution,
  logActivity,
  updateAgentStatus,
  incrementAgentSuccess,
  incrementAgentFailure,
  getAgent,
} from "./foxAgentControlPlane";
import { executiveRouter } from "./executiveRouter";

// ============================================================
// TASK QUEUE SERVICE - State Machine Implementation
// ============================================================

export interface TaskQueueStats {
  pending: number;
  running: number;
  review: number;
  completed: number;
  failed: number;
  blocked: number;
  total: number;
}

export class TaskQueueService {
  private processing = false;
  private pollInterval: NodeJS.Timeout | null = null;

  // ============================================================
  // STATE MACHINE TRANSITIONS
  // ============================================================

  private validTransitions: Record<TaskStatus, TaskStatus[]> = {
    new: ["planned", "assigned", "failed"],
    planned: ["assigned", "failed"],
    assigned: ["running", "failed"],
    running: ["review", "verified", "done", "failed", "diagnose"],
    review: ["verified", "failed", "diagnose"],
    verified: ["done", "failed"],
    done: [], // Terminal state
    failed: ["diagnose", "retry", "blocked_owner"],
    diagnose: ["retry", "blocked_owner"],
    retry: ["running", "failed"],
    blocked_owner: ["new", "planned", "assigned"], // Owner can unblock
  };

  canTransition(from: TaskStatus, to: TaskStatus): boolean {
    return this.validTransitions[from]?.includes(to) || false;
  }

  async transitionTask(taskId: string, newStatus: TaskStatus, updates: Partial<FoxTask> = {}): Promise<FoxTask | null> {
    const task = await getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (!this.canTransition(task.status, newStatus)) {
      throw new Error(`Invalid transition from ${task.status} to ${newStatus}`);
    }

    return updateTaskStatus(taskId, newStatus, updates);
  }

  // ============================================================
  // QUEUE OPERATIONS
  // ============================================================

  async enqueueTask(task: FoxTask): Promise<FoxTask> {
    // Task is already created with status "new"
    // Move to planned if no approval needed, or keep as new if approval needed
    if (!task.approvalRequired) {
      return this.transitionTask(task.id, "planned");
    }
    return task;
  }

  async getNextRunnableTask(agentId: string): Promise<FoxTask | null> {
    const tasks = await listTasks({
      status: "planned",
      targetAgentId: agentId,
      limit: 1,
    });

    for (const task of tasks) {
      // Check if dependencies are satisfied
      const depsMet = await this.checkDependencies(task);
      if (depsMet) {
        await this.transitionTask(task.id, "assigned", { assignedAgentId: agentId });
        return task;
      }
    }
    return null;
  }

  private async checkDependencies(task: FoxTask): Promise<boolean> {
    if (!task.dependencies || task.dependencies.length === 0) return true;

    for (const depId of task.dependencies) {
      const depTask = await getTask(depId);
      if (!depTask) return false;
      if (depTask.status !== "done" && depTask.status !== "verified") return false;
    }
    return true;
  }

  // ============================================================
  // PROCESSING LOOP
  // ============================================================

  startProcessing(intervalMs = 5000): void {
    if (this.processing) return;
    this.processing = true;
    
    this.pollInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error("Task queue processing error:", error);
      }
    }, intervalMs);

    console.log("🔄 Task queue processor started");
  }

  stopProcessing(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.processing = false;
    console.log("⏹️ Task queue processor stopped");
  }

  private async processQueue(): Promise<void> {
    // Get all agents
    // This would need listAgents imported - for now process pending tasks
    const pendingTasks = await listTasks({ status: "planned", limit: 50 });
    
    for (const task of pendingTasks) {
      const agent = await getAgent(task.targetAgentId);
      if (!agent) continue;
      
      if (agent.status === "active" || agent.status === "idle") {
        const depsMet = await this.checkDependencies(task);
        if (depsMet) {
          await assignTask(task.id, agent.id);
          // Execute asynchronously
          this.executeTaskAsync(task.id, agent.id);
        }
      }
    }
  }

  private async executeTaskAsync(taskId: string, agentId: string): Promise<void> {
    try {
      await executiveRouter.executeTask(taskId);
    } catch (error) {
      console.error(`Task ${taskId} execution failed:`, error);
    }
  }

  // ============================================================
  // QUERY METHODS
  // ============================================================

  async getQueueStats(): Promise<TaskQueueStats> {
    const tasks = await listTasks({ limit: 1000 });
    
    const stats: TaskQueueStats = {
      pending: 0,
      running: 0,
      review: 0,
      completed: 0,
      failed: 0,
      blocked: 0,
      total: tasks.length,
    };

    for (const task of tasks) {
      switch (task.status) {
        case "new":
        case "planned":
          stats.pending++;
          break;
        case "assigned":
        case "running":
          stats.running++;
          break;
        case "review":
        case "verified":
          stats.review++;
          break;
        case "done":
          stats.completed++;
          break;
        case "failed":
        case "diagnose":
          stats.failed++;
          break;
        case "retry":
          stats.running++;
          break;
        case "blocked_owner":
          stats.blocked++;
          break;
      }
    }

    return stats;
  }

  async getTasksByAgent(agentId: string): Promise<FoxTask[]> {
    return listTasks({ targetAgentId: agentId, limit: 100 });
  }

  async getActiveExecutions(): Promise<FoxExecution[]> {
    // This would need a query for running executions
    // For now, return empty - would be implemented with proper query
    return [];
  }

  // ============================================================
  // MANUAL CONTROL
  // ============================================================

  async retryTask(taskId: string): Promise<FoxTask | null> {
    const task = await getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (task.status !== "failed" && task.status !== "diagnose") {
      throw new Error(`Cannot retry task in status ${task.status}`);
    }

    if (task.retryCount >= task.maxRetries) {
      return this.transitionTask(taskId, "blocked_owner", { 
        error: "Max retries exceeded" 
      });
    }

    return this.transitionTask(taskId, "retry");
  }

  async blockTask(taskId: string, reason: string): Promise<FoxTask | null> {
    return this.transitionTask(taskId, "blocked_owner", { error: reason });
  }

  async unblockTask(taskId: string): Promise<FoxTask | null> {
    const task = await getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (task.status !== "blocked_owner") {
      throw new Error(`Task is not blocked`);
    }

    return this.transitionTask(taskId, "planned", { error: undefined });
  }

  async approveTask(taskId: string): Promise<FoxTask | null> {
    const task = await getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (!task.approvalRequired) {
      return task; // No approval needed
    }

    // Approval would be handled by the approval system
    // Here we just transition to planned
    return this.transitionTask(taskId, "planned");
  }
}

export const taskQueue = new TaskQueueService();