import { adminDb } from "./firebaseAdmin";
import type { WorkspaceAgentId, WorkspaceAgentRouting } from "../types";

const DEFAULT_ROUTING: WorkspaceAgentRouting = {
  enabledAgents: ["customer-support", "sales"],
  primaryAgent: "customer-support",
  agentPriorities: { "customer-support": 80, sales: 70 },
  routingMode: "hybrid",
  humanHandoffEnabled: true,
  autoResumeEnabled: true,
  handoffTriggers: ["low_confidence", "customer_requests_human", "agent_error", "policy_required"],
};

const INDUSTRY_DEFAULTS: Record<string, WorkspaceAgentId[]> = {
  Clinic: ["clinic-appointments", "customer-support", "complaints-suggestions", "sales"],
  Pharmacy: ["pharmacy-sales", "customer-support", "complaints-suggestions", "sales"],
  Restaurant: ["restaurant-operations", "sales", "customer-support", "complaints-suggestions"],
  Retail: ["retail-sales", "sales", "customer-support", "complaints-suggestions"],
  "Course Center": ["course-center", "sales", "customer-support", "complaints-suggestions"],
  "Small Business": ["sales", "customer-support", "complaints-suggestions", "marketing"],
};

export function defaultWorkspaceAgentRouting(industry?: string): WorkspaceAgentRouting {
  const enabledAgents = INDUSTRY_DEFAULTS[String(industry || "")] || DEFAULT_ROUTING.enabledAgents;
  const agentPriorities: Partial<Record<WorkspaceAgentId, number>> = {};
  enabledAgents.forEach((id, index) => { agentPriorities[id] = Math.max(50, 100 - index * 10); });
  const primaryAgent = enabledAgents[0] || DEFAULT_ROUTING.primaryAgent;
  return { ...DEFAULT_ROUTING, enabledAgents, primaryAgent, agentPriorities, updatedAt: new Date().toISOString() };
}

export function normalizeWorkspaceAgentRouting(input: any, industry?: string): WorkspaceAgentRouting {
  const fallback = defaultWorkspaceAgentRouting(industry);
  const enabled = Array.isArray(input?.enabledAgents)
    ? input.enabledAgents.filter((id: any) => typeof id === "string") as WorkspaceAgentId[]
    : fallback.enabledAgents;
  const unique = [...new Set(enabled)];
  const primary = unique.includes(input?.primaryAgent) ? input.primaryAgent : (unique[0] || fallback.primaryAgent);
  return {
    enabledAgents: unique.length ? unique : fallback.enabledAgents,
    primaryAgent: primary as WorkspaceAgentId,
    agentPriorities: { ...fallback.agentPriorities, ...(input?.agentPriorities || {}) },
    routingMode: input?.routingMode === "rules" || input?.routingMode === "intent" ? input.routingMode : "hybrid",
    humanHandoffEnabled: input?.humanHandoffEnabled !== false,
    autoResumeEnabled: input?.autoResumeEnabled !== false,
    handoffTriggers: Array.isArray(input?.handoffTriggers) && input.handoffTriggers.length ? input.handoffTriggers.map(String) : fallback.handoffTriggers,
    updatedAt: new Date().toISOString(),
  };
}

export async function getWorkspaceAgentRouting(workspaceId: string, industry?: string): Promise<WorkspaceAgentRouting> {
  const ref = adminDb.collection("workspaces").doc(String(workspaceId));
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  return normalizeWorkspaceAgentRouting(data?.agentRouting, industry || data?.industry);
}

export async function setWorkspaceAgentRouting(workspaceId: string, input: Partial<WorkspaceAgentRouting>, industry?: string): Promise<WorkspaceAgentRouting> {
  const current = await getWorkspaceAgentRouting(workspaceId, industry);
  const next = normalizeWorkspaceAgentRouting({ ...current, ...input }, industry);
  await adminDb.collection("workspaces").doc(String(workspaceId)).set({ agentRouting: next, updatedAt: new Date().toISOString() }, { merge: true });
  return next;
}

function containsAny(message: string, terms: string[]): boolean {
  const value = message.toLowerCase();
  return terms.some((term) => term && value.includes(term.toLowerCase()));
}

const INTENT_TERMS: Record<WorkspaceAgentId, string[]> = {
  "clinic-appointments": ["حجز", "موعد", "دكتور", "كشف", "appointment", "doctor", "book"],
  "complaints-suggestions": ["شكوى", "مشكلة", "غلط", "زعلان", "complaint", "problem", "refund"],
  "pharmacy-sales": ["دواء", "دواء", "صيدلية", "medicine", "pharmacy", "prescription"],
  "retail-sales": ["منتج", "سعر", "مقاس", "شراء", "product", "price", "buy", "stock"],
  "restaurant-operations": ["منيو", "مطعم", "طاولة", "حجز", "طلب", "menu", "table", "order", "restaurant"],
  "course-center": ["كورس", "دورة", "دبلومة", "محاضرة", "course", "class", "training", "enroll"],
  sales: ["سعر", "شراء", "بكام", "عرض", "خصم", "price", "buy", "offer", "discount"],
  "customer-support": ["استفسار", "مساعدة", "مشكلة", "help", "support", "question", "how"],
  marketing: ["تسويق", "بوست", "حملة", "اعلان", "marketing", "campaign", "post"],
  knowledge: ["معلومة", "سياسة", "معلومات", "information", "policy", "details"],
};

export function routeWorkspaceAgent(message: string, routing: WorkspaceAgentRouting): { agent: WorkspaceAgentId; reason: string } {
  const enabled = routing.enabledAgents;
  if (!enabled.length) return { agent: routing.primaryAgent, reason: "primary_agent" };
  const scored = enabled.map((agent) => ({ agent, score: (routing.agentPriorities[agent] || 0) + (containsAny(message, INTENT_TERMS[agent] || []) ? 1000 : 0) }));
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]?.agent || routing.primaryAgent;
  const matched = containsAny(message, INTENT_TERMS[winner] || []);
  return { agent: winner, reason: matched ? "intent_match" : "primary_agent" };
}

export async function ensureWorkspaceAgentRoutingDefaults(): Promise<number> {
  const snapshot = await adminDb.collection("workspaces").get();
  let created = 0;
  let batch = adminDb.batch();
  let pending = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.agentRouting && Array.isArray(data.agentRouting.enabledAgents) && data.agentRouting.enabledAgents.length) continue;
    batch.set(doc.ref, { agentRouting: defaultWorkspaceAgentRouting(data.industry), updatedAt: new Date().toISOString() }, { merge: true });
    created++; pending++;
    if (pending >= 400) { await batch.commit(); batch = adminDb.batch(); pending = 0; }
  }
  if (pending) await batch.commit();
  return created;
}
