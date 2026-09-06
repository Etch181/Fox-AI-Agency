#!/usr/bin/env python3
"""Run the first autonomous test task for FOX AI Agency."""

import asyncio
import os
import sys

# Add the fox-ai-agency directory to the path
sys.path.insert(0, "/opt/data/fox-ai-agency")

async def run_first_task():
    """Execute the first autonomous task through the Agent Control Plane."""
    
    print("\n🔄 Initializing first autonomous test task...\n")
    
    # Import services
    from services.foxAgentControlPlane import (
        createTask, listTasks, updateTaskStatus, 
        assignTask, logActivity, getAgent, getExecutiveOverview
    )
    from services.executiveRouter import executiveRouter
    
    # Step 1: Create the audit task
    task = await createTask({
        "title": "Audit the current FOX CRM page and identify the next 3 highest-value improvements",
        "description": "Audit the current FOX CRM page and identify the next 3 highest-value improvements",
        "taskType": "audit",
        "intent": "Audit FOX CRM page for improvements",
        "priority": "high",
        "status": "new",
        "targetAgentId": "FOX-PRODUCT-DEVELOPER",
        "dependencies": [],
        "approvalRequired": False,
        "reviewRequired": True,
        "triggerType": "owner_command",
        "triggerSource": "owner_command",
        "payload": {"action": "audit_crm_improvements"},
        "retryCount": 0,
        "maxRetries": 3
    })
    
    print(f"✅ Task created: {task.id}")
    print(f"   Title: {task.title}")
    print(f"   Type: {task.taskType}")
    print(f"   Status: {task.status}")
    print(f"   Target Agent: {task.targetAgentId}\n")
    
    # Step 2: Log the task creation
    await logActivity({
        "taskId": task.id,
        "type": "task_created",
        "message": f"Task created: {task.title}",
        "severity": "info",
        "metadata": {"taskType": task.taskType, "priority": task.priority}
    })
    
    # Step 3: List all tasks to verify
    tasks = await listTasks({"limit": 10})
    print(f"📋 Current task queue ({len(tasks)} tasks):")
    for i, t in enumerate(tasks, 1):
        print(f"  {i}. {t.title} ({t.taskType}) - {t.status}")
    print()
    
    # Step 4: Try to assign to product developer agent
    agent = await getAgent("FOX-PRODUCT-DEVELOPER")
    if agent:
        print(f"👤 Agent found: {agent.name} ({agent.role})")
        print(f"   Status: {agent.status}")
        print(f"   Health: {agent.health}")
        print(f"   Success: {agent.successCount}, Failed: {agent.failureCount}\n")
        
        # Assign task to agent
        assigned = await assignTask(task.id, agent.id)
        print(f"✅ Task assigned to agent")
        print(f"   Assigned task status: {assigned.status}\n")
        
        # Step 5: Execute the task through the executive router
        print(f"⚡ Executing task through Executive Router...")
        try:
            execution = await executiveRouter.executeTask(task.id)
            print(f"✅ Task execution completed")
            print(f"   Execution ID: {execution.id}")
            print(f"   Status: {execution.status}")
            if execution.output:
                import json
                out_str = json.dumps(execution.output, null, 2)
                print(f"   Output: {out_str[:500]}")
            if execution.error:
                print(f"   Error: {execution.error}")
        except Exception as e:
            print(f"❌ Task execution failed: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("⚠️ Agent FOX-PRODUCT-DEVELOPER not found")
        print("   (Agents would be listed from Firestore registry)\n")
    
    print(f"\n🎯 First autonomous test task completed!")


if __name__ == "__main__":
    asyncio.run(run_first_task())