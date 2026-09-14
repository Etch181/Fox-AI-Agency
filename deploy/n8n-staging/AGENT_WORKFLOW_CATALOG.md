# FOX AI AGENCY — n8n Agent Mesh

The n8n layer is the orchestration engine. Each tenant event enters an industry-specific workflow, is authenticated with the shared FOX secret, and is dispatched to the FOX tenant/security boundary at `/api/automation/agent`.

## Agent map

| Agent | Workflow | Scope | Core responsibility |
|---|---|---|---|
| Clinic Appointment | `01-clinic-appointment-agent.json` | Clinic | availability, booking, reschedule, cancel, escalation |
| Complaints & Suggestions | `02-complaints-suggestions-agent.json` | All | classify, capture, prioritize, escalate, follow-up |
| Pharmacy Sales | `03-pharmacy-sales-agent.json` | Pharmacy | catalog sales, availability, alternatives, prescription gate |
| Retail Sales | `04-retail-sales-agent.json` | Retail | qualification, recommendations, stock/order intent |
| Restaurant | `05-restaurant-agent.json` | Restaurant | menu, reservations, order intent, handoff |
| Course Center | `06-course-center-agent.json` | Course Center | course discovery, enrollment, lead capture |
| Marketing & Social | `07-marketing-social-agent.json` | All | strategy, content, campaign tasks, optimization |
| Customer Support | `08-customer-support-agent.json` | All | knowledge-grounded support and escalation |

## Runtime contract

n8n sends `workspaceId`, `agent`, `message`, `channel`, `sessionId`, and optional `chatHistory` to the FOX agent endpoint. The endpoint verifies the n8n secret, resolves the trusted tenant, injects the specialized agent policy, and fails closed when no real AI provider response is available.

## Activation policy

The **FOX Unified Agent Router v3** is the live staging ingress at `POST /webhook/fox-unified-events`; it is signed, tenant-scoped, and calls FOX `/api/automation/agent`. The eight industry workflows in `agents/` remain **import-ready but inactive** until their individual external credentials, tenant routing, and policy gates are reviewed. Marketing/social publishing additionally requires real Meta/Instagram credentials and consent/policy gates.

## Next layer

After the core agent mesh is connected, each agent should be expanded with domain tools: calendar/booking, CRM/ticketing, catalog/stock, order/fulfillment, social publishing/analytics, notifications, human escalation, and audit logging. Those tools remain tenant-scoped and must never be inferred from customer payloads.
