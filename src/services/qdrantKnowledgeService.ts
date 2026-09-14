import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";

const collection = "fox_knowledge";

function qdrantUrl() { return String(process.env.FOX_QDRANT_URL || "").replace(/\/$/, ""); }
function qdrantKey() { return String(process.env.FOX_QDRANT_API_KEY || "").trim(); }
function headers() { return { "Content-Type": "application/json", ...(qdrantKey() ? { "api-key": qdrantKey() } : {}) }; }

async function qFetch(path: string, init: RequestInit = {}) {
  const base = qdrantUrl();
  if (!base) throw new Error("QDRANT_NOT_CONFIGURED");
  const response = await fetch(`${base}${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`QDRANT_HTTP_${response.status}`);
  return response.json();
}

async function embed(text: string): Promise<number[]> {
  const key = String(process.env.GEMINI_API_KEY || "").trim();
  if (!key) throw new Error("GEMINI_NOT_CONFIGURED");
  const ai = new GoogleGenAI({ apiKey: key });
  const result = await ai.models.embedContent({ model: "gemini-embedding-001", contents: text });
  const values = (result as any)?.embeddings?.[0]?.values;
  if (!Array.isArray(values) || !values.length) throw new Error("EMBEDDING_EMPTY");
  return values.map(Number);
}

export async function ensureKnowledgeCollection() {
  try { await qFetch(`/collections/${collection}`); return; } catch {}
  const vector = await embed("FOX knowledge collection initialization");
  await qFetch(`/collections/${collection}`, { method: "PUT", body: JSON.stringify({ vectors: { size: vector.length, distance: "Cosine" } }) });
}

export async function indexKnowledgeFact(input: { workspaceId: string; question: string; answer: string; factId?: string; approved?: boolean }) {
  if (input.approved === false) return { indexed: false, reason: "not_approved" };
  await ensureKnowledgeCollection();
  const text = `Question: ${input.question}\nAnswer: ${input.answer}`;
  const vector = await embed(text);
  const id = input.factId || randomUUID();
  await qFetch(`/collections/${collection}/points`, { method: "PUT", body: JSON.stringify({ points: [{ id, vector, payload: { workspaceId: input.workspaceId, question: input.question, answer: input.answer, approved: true, indexedAt: new Date().toISOString() } }] }) });
  return { indexed: true, id };
}

export async function searchKnowledge(workspaceId: string, query: string, limit = 5) {
  if (!qdrantUrl()) return [];
  await ensureKnowledgeCollection();
  const vector = await embed(query);
  const result = await qFetch(`/collections/${collection}/points/search`, { method: "POST", body: JSON.stringify({ vector, limit, with_payload: true, filter: { must: [{ key: "workspaceId", match: { value: workspaceId } }, { key: "approved", match: { value: true } }] } }) });
  return Array.isArray(result?.result) ? result.result : [];
}

export async function deleteKnowledgeFact(factId: string) {
  const id = String(factId || "").trim();
  if (!id || !qdrantUrl()) return { deleted: false, reason: "not_configured_or_missing_id" };
  try {
    await ensureKnowledgeCollection();
    await qFetch(`/collections/${collection}/points`, {
      method: "DELETE",
      body: JSON.stringify({ points: [id] }),
    });
    return { deleted: true, id };
  } catch (error) {
    console.warn("[FOX Qdrant] Knowledge delete failed:", error);
    return { deleted: false, id };
  }
}

export async function indexWorkspaceKnowledge(workspaceId: string, facts: any[]) {
  const approved = facts.filter((f) => f?.approved !== false && f?.question && f?.answer);
  const results = [];
  for (const fact of approved) {
    results.push(await indexKnowledgeFact({ workspaceId, factId: fact.id, question: String(fact.question), answer: String(fact.answer), approved: fact.approved }));
  }
  return results;
}

export function formatKnowledgeResults(results: any[]): string {
  return results
    .map((r) => r?.payload)
    .filter((p) => p?.workspaceId && p?.approved === true && p?.question && p?.answer)
    .map((p) => `Q: ${p.question}\nA: ${p.answer}`)
    .join("\n\n");
}
