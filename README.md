# FOX AI Agency

**Multi-tenant SaaS platform for AI-powered customer engagement across industries**

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

## 🎯 Overview

FOX AI Agency is an enterprise-grade platform that provides specialized AI agents for businesses across 6 industries: Clinics, Pharmacies, Restaurants, Retail, Course Centers, and Small Businesses. The platform enables 24/7 customer engagement through multiple channels (Telegram, Instagram, Messenger, WhatsApp) with intelligent routing, CRM integration, and marketing automation.

### Key Features

- 🤖 **10 Specialized AI Agents** - Industry-specific agents with custom workflows
- 💬 **Multi-Channel Support** - Telegram, Instagram, Messenger, WhatsApp
- 🔐 **Enterprise Security** - Multi-tenant isolation, encrypted secrets, RBAC
- 📊 **Built-in CRM** - Customer management, lead tracking, conversion analytics
- 📅 **Smart Scheduling** - Appointment booking, reminders, follow-ups
- 🎨 **Marketing Engine** - Content generation, scheduling, social publishing
- 🔄 **n8n Integration** - 19 pre-built automation workflows
- 📈 **Analytics Dashboard** - Agent performance, customer insights, revenue tracking

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│   React 19 + Vite + TypeScript Frontend     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│   Express + Node.js 24 Backend              │
│   - 32 Service Modules (27K+ lines)         │
│   - 30+ RESTful API Endpoints               │
│   - Firebase Auth + Firestore               │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴─────────┬────────────────┐
        │                    │                │
┌───────▼────────┐  ┌────────▼──────┐  ┌────▼────┐
│  Firestore DB  │  │  n8n (2.35.0) │  │ Qdrant  │
│  20+ Collections│  │  19 Workflows │  │ Vector  │
└────────────────┘  └───────────────┘  └─────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 24.0.0
- npm ≥ 11.0.0
- Docker & Docker Compose (for deployment)
- Firebase project (Firestore + Authentication)

### Development Setup

```bash
# Clone repository
git clone https://github.com/Etch181/Fox-AI-Agency.git
cd Fox-AI-Agency

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Firebase credentials and API keys

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Environment Variables

Required variables in `.env`:

```bash
# Firebase Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json

# Security
FOX_SECRET_KEY=your-secret-key-base64

# AI Providers
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key

# Public URL
FOX_PUBLIC_BASE_URL=https://your-domain.com

# Channel Integrations
TELEGRAM_BOT_TOKEN=your-bot-token
META_PAGE_ACCESS_TOKEN=your-meta-token
```

## 📦 Available Scripts

```bash
npm run dev           # Start development server with Vite HMR
npm run build         # Build for production
npm run start         # Start production server
npm test              # Run unit tests
npm run test:integration  # Run integration tests
npm run test:firestore-rules  # Test Firestore security rules
npm run lint          # TypeScript type checking
npm run verify        # Run all checks (lint + build + tests)
```

## 🏭 Deployment

### Staging Deployment (VPS)

The project uses a secure broker system for staging deployments:

```bash
# Ensure you're on the safety branch
git checkout safety/pre-vps-audit-2026-08-26

# Commit your changes
git add .
git commit -m "feat: your feature description"

# Push through VPS broker (automated via Hermes agent)
# The broker verifies SHA256 hashes and deploys only approved commits
```

**Deployment Architecture:**
- **VPS Broker**: Python-based secure deployment gateway
- **Docker Compose**: Container orchestration
- **Traefik**: Reverse proxy with automatic SSL (Let's Encrypt)
- **Health Checks**: Automated verification post-deployment

### Production Deployment

Production deployment requires additional security review and manual approval. Contact the system administrator for production deployment procedures.

## 🤖 AI Agents

FOX provides 10 specialized agents:

| Agent | Industry | Capabilities |
|-------|----------|--------------|
| **Clinic Appointments** | Healthcare | Booking, rescheduling, reminders, cancellations |
| **Pharmacy Sales** | Pharmacy | Product catalog, prescriptions, alternatives, inventory |
| **Restaurant Operations** | Food & Beverage | Menu, reservations, orders, delivery coordination |
| **Retail Sales** | Retail | Product recommendations, stock queries, order processing |
| **Course Center** | Education | Course discovery, enrollment, schedules, payments |
| **Sales Agent** | All | Lead qualification, product recommendations, upselling |
| **Customer Support** | All | Knowledge base queries, ticket creation, escalation |
| **Marketing Agent** | All | Content generation, campaign management, social posting |
| **Complaints & Suggestions** | All | Complaint intake, classification, routing, follow-up |
| **Knowledge Agent** | All | Vector search, semantic Q&A, context retrieval |

### Agent Routing

Agents use hybrid routing with:
- **Intent Detection**: Keyword matching + sentiment analysis
- **Priority Scoring**: Configurable per workspace
- **Hard Operational Intents**: Cancel, reschedule, complaint detection
- **Human Handoff**: Automatic escalation on complex queries

## 🔐 Security

### Multi-Tenant Isolation

- **Firestore Rules**: Strict workspace-level access control
- **Server-Side Authorization**: Every request validates workspace membership
- **Secret Vault**: AES-256 encrypted storage for API keys and tokens
- **Session Management**: Firebase Auth with custom claims

### Authentication & Authorization

4 user roles:
- `super_admin` - Full system access
- `client_owner` - Workspace owner with admin rights
- `staff` - Limited workspace access
- `agency_salesman` - Sales and onboarding access

### Password Security

- **Algorithm**: scrypt with 64-byte output
- **Salt**: 16-byte random salt per password
- **Comparison**: `timingSafeEqual` to prevent timing attacks
- **Migration**: Legacy plaintext passwords auto-migrated on login

## 📊 Database Schema

### Core Collections

- `workspaces` - Tenant accounts and configuration
- `users` - User accounts with role-based access
- `customers` - CRM customer database
- `conversations` - Chat history and agent interactions
- `appointments` - Booking and scheduling data
- `shared_memory` - Agent context and conversation state
- `knowledge_base` - Q&A pairs with vector embeddings
- `social_posts` - Marketing content and publishing schedule
- `payment_transactions` - Billing and subscription data

### Qdrant Integration

Vector database for semantic search:
- **Collection per workspace**: `workspace_{id}_knowledge`
- **Embedding size**: 1536 (OpenAI compatible)
- **Distance metric**: Cosine similarity
- **Search threshold**: 0.7

## 🔄 n8n Workflows

19 pre-built workflows in `deploy/n8n-staging/workflows/`:

**Core Workflows:**
1. `00-fox-unified-agent-router.json` - Central routing and authentication
2. `01-incoming-channel-message.json` - Message intake from all channels
3. `02-new-lead-crm-sync.json` - Automatic CRM synchronization
4. `03-appointment-reminder.json` - Scheduled appointment reminders
5. `04-appointment-follow-up.json` - Post-appointment follow-ups
6. `05-escalation-human.json` - Human handoff workflow
7. `07-marketing-scheduled-post.json` - Social media publishing
8. `08-daily-workspace-summary.json` - Daily analytics reports

**Agent Workflows** (in `workflows/agents/`):
- 8 industry-specific agent implementations with specialized logic

See `deploy/n8n-staging/README.md` for setup instructions.

## 🧪 Testing

### Test Coverage

- **Unit Tests**: 286 tests covering core services
- **Integration Tests**: API endpoint testing
- **Firestore Rules Tests**: Security rule validation
- **E2E Tests**: Critical user flows

```bash
# Run all tests
npm run verify

# Run specific test suite
npm test -- tests/appAuthorization.test.ts

# Run with coverage
npm test -- --coverage
```

## 📁 Project Structure

```
fox-ai-agency/
├── src/
│   ├── components/         # React components (59 files)
│   │   ├── admin/          # Admin dashboard components
│   │   ├── client/         # Client workspace components
│   │   ├── auth/           # Authentication components
│   │   ├── public/         # Public landing pages
│   │   └── common/         # Shared UI components
│   ├── services/           # Business logic (32 services)
│   │   ├── aiAgentService.ts
│   │   ├── workspaceCrmService.ts
│   │   ├── conversationService.ts
│   │   ├── marketingEngineService.ts
│   │   └── ... (28 more)
│   ├── security/           # Auth & authorization
│   ├── utils/              # Helper functions
│   ├── context/            # React context providers
│   └── types.ts            # TypeScript definitions
├── server.ts               # Express backend (353KB)
├── tests/                  # Test suites (50+ files)
├── scripts/                # Build and utility scripts
├── deploy/                 # Deployment configurations
│   ├── n8n-staging/        # n8n workflows and docs
│   ├── nginx/              # Reverse proxy config
│   └── trusted-staging/    # Secure deployment scripts
├── firestore.rules         # Firestore security rules
├── Dockerfile              # Container build
└── docker-compose.staging.yml
```

## 🛠️ Tech Stack

### Frontend
- React 19.0.1
- TypeScript 5.8.2
- Vite 6.2.3
- TailwindCSS 4.1.14
- Motion (Framer Motion) 12.23.24
- Lucide React (icons)
- Recharts (charts)

### Backend
- Node.js 24+
- Express 4.21.2
- Firebase Admin SDK 14.2.0
- Google Gemini AI 2.4.0
- OpenAI SDK 7.4.0

### Infrastructure
- Docker & Docker Compose
- Traefik (reverse proxy)
- n8n 2.35.0 (automation)
- Qdrant (vector database)

## 📖 Documentation

- [Agent Workflows Catalog](deploy/n8n-staging/AGENT_WORKFLOW_CATALOG.md)
- [Agent Runtime Contract](deploy/n8n-staging/AGENT_RUNTIME_CONTRACT.md)
- [n8n Setup Guide](deploy/n8n-staging/README.md)
- [Integration Checklist](config/REAL-INTEGRATION-CHECKLIST.md)
- [SMTP Readiness](config/smtp-readiness.md)

## 🐛 Troubleshooting

### Common Issues

**Build fails with TypeScript errors:**
```bash
npm run lint  # Check for type errors
# Fix reported issues, then rebuild
```

**Container health check fails:**
```bash
docker logs fox-ai-staging --tail 50
curl http://localhost:3000/api/health
```

**Firebase connection errors:**
```bash
# Verify credentials file exists and is readable
ls -la /path/to/serviceAccount.json
# Check GOOGLE_APPLICATION_CREDENTIALS in .env
```

**n8n webhooks not working:**
```bash
# Verify FOX_SECRET_KEY matches between n8n and FOX
# Check n8n workflow is activated
# Test webhook with curl:
curl -X POST http://n8n:5678/webhook/fox-unified-events \
  -H "Content-Type: application/json" \
  -H "X-FOX-SECRET: your-secret" \
  -d '{"test": true}'
```

## 🤝 Contributing

This is a proprietary project. Contributions require explicit authorization.

## 📄 License

Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

## 👥 Team

- **Architecture & Development**: Autonomous Hermes Agent
- **Infrastructure**: VPS Broker System
- **Project Owner**: [Project Owner Name]

## 📞 Support

For issues and support requests:
- Check the [Troubleshooting](#troubleshooting) section
- Review deployment logs in `/docker/hermes-agent-6pb0/data/fox-autonomous-operations/`
- Contact system administrator

---

**Built with ❤️ using Claude AI and autonomous development practices**

Last Updated: 2026-09-14
