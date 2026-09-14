import { adminDb } from "./firebaseAdmin";

export type AgentAnalyticsRow = {
  agentId: string;
  agentRole: string;
  executions: number;
  successes: number;
  failures: number;
  successRate: number;
  handoffs: number;
  avgLatencyMs: number;
  lastActivityAt?: string;
};

const clamp = (n:number,min:number,max:number) => Math.max(min, Math.min(max,n));

export async function getAgentAnalytics(workspaceId?: string, days=7): Promise<{from:string;to:string;rows:AgentAnalyticsRow[]}> {
  const to = new Date();
  const from = new Date(to.getTime() - clamp(days,1,90)*86400000);
  const [agentsSnap, activitiesSnap] = await Promise.all([
    adminDb.collection("fox_agents").get(),
    adminDb.collection("fox_activities").where("createdAt", ">=", from.toISOString()).orderBy("createdAt", "desc").limit(10000).get(),
  ]);
  const agents = agentsSnap.docs.map(d=>d.data() as any);
  const activities = activitiesSnap.docs.map(d=>d.data() as any).filter(a=>!workspaceId || String(a.metadata?.workspaceId||"")===workspaceId);
  const by = new Map<string,AgentAnalyticsRow>();
  for (const a of agents) by.set(a.id,{agentId:a.id,agentRole:String(a.role||"unknown"),executions:0,successes:0,failures:0,successRate:0,handoffs:0,avgLatencyMs:0,lastActivityAt:a.lastExecutionAt});
  for (const a of activities) {
    if (!a.agentId) continue; const r=by.get(a.agentId); if(!r) continue;
    if(a.type==="agent_execution_started") r.executions++;
    if(a.type==="agent_execution_completed") r.successes++;
    if(a.type==="agent_execution_failed") r.failures++;
    if(a.type==="custom" && String(a.metadata?.event||"")==="agent_handoff") r.handoffs++;
    if(a.createdAt && (!r.lastActivityAt || a.createdAt>r.lastActivityAt)) r.lastActivityAt=a.createdAt;
    if(typeof a.metadata?.latencyMs==="number") r.avgLatencyMs=r.avgLatencyMs ? (r.avgLatencyMs+a.metadata.latencyMs)/2 : a.metadata.latencyMs;
  }
  for(const r of by.values()) { const total=r.successes+r.failures; r.successRate=total?Math.round(r.successes/total*1000)/10:0; r.avgLatencyMs=Math.round(r.avgLatencyMs||0); }
  return {from:from.toISOString(),to:to.toISOString(),rows:[...by.values()].sort((a,b)=>b.executions-a.executions)};
}

export async function recordAgentHandoff(workspaceId:string, conversationId:string, fromAgent:string, toAgent:string, reason:string) {
  const id=`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  await adminDb.collection("fox_activities").doc(id).set({id,type:"custom",severity:"info",message:`Agent handoff ${fromAgent} -> ${toAgent}`,agentId:toAgent,createdAt:new Date().toISOString(),metadata:{event:"agent_handoff",workspaceId,conversationId,fromAgent,toAgent,reason}});
  return id;
}
