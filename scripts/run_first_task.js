import { createTask, listTasks, updateTaskStatus, assignTask, logActivity, getAgent } from "../services/foxAgentControlPlane";
import { executiveRouter } from "../services/executiveRouter";

async function runFirstTask() {
  console.log("🔄 Initializing first autonomous test task...");
  
  // Step 1: Create the audit task
  const task = await createTask({
    title: "Audit the current FOX CRM page and identify the next 3 highest-value improvements",
    description: "Audit the current FOX CRM page and identify the next 3 highest-value improvements",
    taskType: "audit",
    intent: "Audit FOX CRM page for improvements",
    priority: "high",
    status: "new",
    targetAgentId: "FOX-PRODUCT-DEVELOPER",
    dependencies: [],
    approvalRequired: false,
    reviewRequired: true,
    triggerType: "owner_command",
    triggerSource: "owner_command",
    payload: { action: "audit_crm_improvements" },
    retryCount: 0,
    maxRetries: 3
  });
  
  console.log("✅ Task created:", task.id);
  console.log("   Title:", task.title);
  console.log("   Type:", task.taskType);
  console.log("   Status:", task.status);
  console.log("   Target Agent:", task.targetAgentId);
  
  // Step 2: Log the task creation
  await logActivity({
    taskId: task.id,
    type: "task_created",
    message: `Task created: ${task.title}`,
    severity: "info",
    metadata: { taskType: task.taskType, priority: task.priority }
  });
  
  // Step 3: List all tasks to verify
  const tasks = await listTasks({ limit: 10 });
  console.log("\n📋 Current task queue:");
  tasks.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.title} (${t.taskType}) - ${t.status}`);
  });
  
  // Step 4: Try to assign to product developer agent
  const agent = await getAgent("FOX-PRODUCT-DEVELOPER");
  if (agent) {
    console.log("\n👤 Agent found:", agent.name, `(${agent.role})`);
    console.log("   Status:", agent.status);
    console.log("   Health:", agent.health);
    
    // Assign task to agent
    const assigned = await assignTask(task.id, agent.id);
    console.log("\n✅ Task assigned to agent");
    console.log("   Assigned task status:", assigned.status);
    
    // Step 5: Execute the task through the executive router
    console.log("\n⚡ Executing task through Executive Router...");
    try {
      const execution = await executiveRouter.executeTask(task.id);
      console.log("✅ Task execution completed");
      console.log("   Execution ID:", execution.id);
      console.log("   Status:", execution.status);
      if (execution.output) {
        console.log("   Output:", JSON.stringify(execution.output, null, 2).substring(0, 200));
      }
      if (execution.error) {
        console.log("   Error:", execution.error);
      }
    } catch (error) {
      console.error("❌ Task execution failed:", error.message);
    }
  } else {
    console.log("\n⚠️ Agent FOX-PRODUCT-DEVELOPER not found, listing all agents:");
    const allAgents = await (async () => {
      // Stub - would list agents from Firestore
      return [];
    })();
    console.log("   (agents would be listed here)");
  }
  
  console.log("\n🎯 First autonomous test task completed!");
}

runFirstTask().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});