# FOX AI Agent Runtime Contract

## Tenant visibility boundary

Workspace owners and staff never receive n8n workflow definitions, node graphs, webhook URLs, credentials, execution controls, or n8n administration.

Workspace owners receive only a tenant-scoped Agent view: agent identity, domain, operational status, task/outcome summaries, timestamps, and safe activity messages.

Only `super_admin` may administer n8n itself. Server-side authorization is authoritative; UI hiding is not the security boundary.

## Runtime execution

Every specialized workflow follows this logical chain:

Trigger -> Agent -> Decision -> Tool/Action -> CRM -> Notification -> Follow-up -> Activity

n8n is the orchestration layer. FOX remains the tenant boundary, business-data authority, AI provider boundary, and audit boundary.

## Supported specialized agents

- Clinic appointments: availability, booking, reschedule, cancellation, reminders.
- Complaints & suggestions: intake, classification, priority, escalation, follow-up.
- Pharmacy sales: catalog, availability, alternatives, prescription gating, lead/order intent.
- Retail sales: product qualification, catalog, stock, order intent, follow-up.
- Restaurant operations: menu, reservation, order intent, customer handoff.
- Course center: course discovery, schedules, fees, enrollment and lead capture.
- Marketing & social: strategy, content, campaign tasks, publishing only through verified social APIs, analytics and optimization.
- Customer support: knowledge-grounded resolution, ticketing and human escalation.

## No fabricated execution

An agent may never claim a booking, CRM write, notification, social publication, payment, inventory result, or metric unless the action returned a verified result. Failed or unavailable providers are surfaced as failures.

## Configuration boundary

The workflows in this repository are import-ready artifacts. They remain inactive until n8n shared-secret configuration, FOX internal endpoint configuration, AI credentials, tenant routing, and required external integration credentials are explicitly configured by the agency administrator.

## Owner-facing presentation

The client application should present the agents as a managed service, not as an n8n console. The activity feed is workspace-scoped and intentionally omits implementation details that could expose other tenants or the automation engine.

The Super Admin console may expose workflow inventory and operational controls after authenticated authorization. Client accounts must be denied even when they attempt direct navigation to privileged views or endpoints.
