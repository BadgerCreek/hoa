# Badger Creek Ranch HOA — Project Context

## Overview

AI-powered HOA management system for Badger Creek Ranch. Four AI agents (Treasurer, President, VP, Secretary) assist board members with tasks, proposals, payments, meeting minutes, and more. All agent actions require human approval before taking effect.

**Live at:** knightsway.org  
**Fiscal year:** April 1 – March 31 (FY 25/26 = 2025–2026)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js App Router (TypeScript) |
| Database | Neon Postgres + Drizzle ORM |
| Auth | Auth.js v5 — Google OAuth + Resend magic link |
| AI | Anthropic Claude via `@ai-sdk/anthropic` |
| Email | Resend (outbound + inbound webhook) |
| UI | shadcn/ui + Tailwind CSS |
| Hosting | Vercel |

---

## Environment Variables

```
DATABASE_URL                # Neon pooled connection
DATABASE_URL_UNPOOLED       # Neon direct (drizzle-kit only)
ANTHROPIC_API_KEY           # Claude API key (must start with sk-)
RESEND_API_KEY              # Resend API key (full access, verified domain)
RESEND_FROM_EMAIL           # e.g. "Badger Creek Ranch HOA <hoa@knightsway.org>"
RESEND_WEBHOOK_SECRET       # Svix signing secret from Resend webhook settings
AUTH_SECRET                 # openssl rand -base64 32
AUTH_URL                    # https://knightsway.org
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

---

## Database Schema

### Auth (Auth.js v5 adapter)
- **users** — `id(text PK)`, `name`, `email`, `phone`, `role`, `emailVerified`, `image`, `createdAt`
  - `role` enum: `resident | board_president | board_vp | board_secretary | board_treasurer | admin`
- **accounts**, **sessions**, **verificationTokens** — standard Auth.js tables

### HOA Core
- **boardMembers** — `id`, `userId→users`, `termStart`, `termEnd`, `active`
- **properties** — `id`, `ownerId→users`, `address`, `lotNumber`, `unitNumber`, `squareFeet`
- **budgets** — `id`, `fiscalYear(int)`, `totalBudget`, `allocated`, `notes`
- **budgetLineItems** — `id`, `fiscalYear`, `section(income|expense|reserves)`, `description`, `budgetedAmount`, `actualAmount`, `proposedAmount`, `comment`, `sortOrder`
- **transactions** — `id`, `budgetId→budgets`, `amount`, `type(income|expense)`, `description`, `date`, `approvedBy→users`, `agentId`

### Workflows
- **tasks** — `id`, `title`, `description`, `status(pending|in_progress|awaiting_human|approved|completed|rejected)`, `assignedToUserId→users`, `assignedToAgentRole`, `agentThoughts`, `createdByAgent`, `completedBy→users`
- **proposals** — `id`, `title`, `content`, `status(draft|open|closed|approved|rejected)`, `agentId`, `createdBy→users`, `closedAt`
- **votes** — `id`, `proposalId→proposals(cascade)`, `voterId→users`, `vote(yes|no|abstain)`, unique index on `(proposalId, voterId)`
- **payments** — `id`, `title`, `description`, `amount`, `vendor`, `category`, `status(pending|approved|rejected)`, `requestedBy→users`, `approvedBy→users`, `budgetId→budgets`, `transactionId→transactions`, `rejectionReason`, `approvedAt`

### Operations
- **maintenanceRequests** — `id`, `submittedBy→users`, `title`, `description`, `category(plumbing|electrical|landscaping|road|common_area|other)`, `priority(low|medium|high|urgent)`, `status(open|in_progress|resolved|closed)`, `assignedTo→users`, `vendorNotes`, `resolvedAt`
- **meetings** — `id`, `title`, `scheduledAt`, `type(board|annual|special)`, `agenda`, `minutes`, `minutesDocId→documents`, `status(scheduled|completed|cancelled)`, `createdBy→users`
- **arcApplications** — `id`, `propertyId→properties`, `applicantId→users`, `title`, `description`, `status(submitted|under_review|approved|rejected|needs_info)`, `agentSummary`, `decision`, `decidedBy→users`, `decidedAt`
- **duesAssessments** — `id`, `propertyId→properties(cascade)`, `amount`, `dueDate`, `period(monthly|quarterly|annual)`, `status(pending|paid|late|waived)`, `paidAt`
- **documents** — `id`, `title`, `fileUrl`, `category(minutes|financial|legal|maintenance|other)`, `uploadedBy→users`
- **notifications** — `id`, `userId→users(cascade)`, `type`, `message`, `read`, `link`

### Agent Infrastructure
- **agentMemory** — `id`, `agentRole`, `context(jsonb)`, `lastUpdated` — one row per agent role, persists across sessions
- **auditLogs** — `id`, `action`, `entityType`, `entityId`, `performedBy`, `details(jsonb)`, `timestamp` — every significant action logged

---

## Agent Architecture

### Models (`src/lib/venice.ts`)
```ts
VeniceModel.fast  = anthropic('claude-haiku-4-5-20251001')   // agents, webhooks
VeniceModel.smart = anthropic('claude-sonnet-4-6')            // complex tasks
VeniceModel.deep  = anthropic('claude-opus-4-8')              // reserved
```

### Agent Roles & Tools (`src/lib/agents/`)

| Tool | Treasurer | President | VP | Secretary |
|------|-----------|-----------|-----|-----------|
| getCurrentBudget | ✓ | ✓ | | |
| getRecentTransactions | ✓ | | | |
| getDuesStatus | ✓ | | | |
| getPendingPayments | ✓ | | | |
| getMaintenanceRequests | | ✓ | ✓ | |
| getOpenTasks | | ✓ | ✓ | ✓ |
| getDocuments | | | | ✓ |
| getUpcomingMeetings | | | | ✓ |
| getProposalSummary | ✓ | ✓ | ✓ | ✓ |
| requestPayment | | ✓ | ✓ | |
| createTask | ✓ | ✓ | ✓ | ✓ |
| draftProposal | ✓ | ✓ | ✓ | ✓ |
| updateAgentMemory | ✓ | ✓ | ✓ | ✓ |

`updateAgentMemory` is a factory (`createUpdateMemoryTool(role)`) — captures role in closure, upserts `agentMemory` table.

### Agent API Route (`/api/agents/[role]`)
- Auth required: board roles only
- Loads agent memory from DB → appends to system prompt
- Uses `streamText` with `stopWhen: stepCountIs(5)`, `temperature: 0.3`
- Returns `toUIMessageStreamResponse()` — streams to `useChat` in `AgentChat.tsx`

---

## Key Workflows

### Task Status Flow
```
awaiting_human → [Approve] → approved → [Mark Done] → completed
              → [Reject]  → rejected  → [Re-approve] → approved
```
Smart actions on `approved` tasks (detected from title keywords):
- Schedule tasks → Google Calendar pre-fill link
- Follow-up tasks → Agent-generated email draft modal

### Proposal Flow
```
draft → [Open for Voting] → open → [Approve/Reject/Close] → approved|rejected|closed
```
Residents vote yes/no/abstain on `open` proposals. Vote tally live.

### Payment Flow
```
pending → [Treasurer Approve] → approved + transaction created
       → [Treasurer Reject]  → rejected (with reason)
```
Only `board_president` and `admin` can approve/reject payments.

### ARC Application Flow
```
submitted → [Start Review] → under_review → [Approve/Reject/Needs Info]
```

### Meeting Notes (Otter AI → Resend inbound)
1. Otter sends summary to `meetings@autaloujio.resend.app`
2. Resend fires `POST /api/webhooks/meetings` (Svix signature verified)
3. Webhook fetches full email body via `resend.emails.receiving.get(emailId)`
4. Secretary agent (`generateObject`) extracts: summary, action items, decisions, attendees
5. Tasks created as `awaiting_human` for each action item
6. Most recent `scheduled` meeting (within 48h) marked `completed`, minutes saved

---

## Access Control

| Role | Access |
|------|--------|
| `resident` | `/portal`, `/board-members`, vote on proposals |
| `board_*` | All board pages, agent chat, task/proposal management |
| `board_treasurer` + `admin` | Payment approve/reject (only these roles) |

Middleware (`src/middleware.ts`) protects all board paths. API routes do their own role checks.

---

## Pages

### Board Portal (`/app/(board)/`)
- `/dashboard` — Tasks awaiting review, open proposals, budget summary
- `/agents` — AI agent chat (role selector: treasurer/president/vp/secretary)
- `/tasks` — Task queue with approve/reject/complete + smart actions
- `/proposals` — Proposals with vote tallies, status management
- `/payments` — Payment request/approval workflow
- `/budget` — Budget vs Actual + Proposed tabs, inline cell editing, Transactions tab
- `/directory` — Member directory with add/edit/delete (lot, phone, dues status)
- `/maintenance` — Maintenance request queue
- `/arc` — ARC application review
- `/meetings` — Meeting schedule + AI-processed minutes
- `/members` — Board role assignment

### Resident Portal (`/app/(resident)/`)
- `/portal` — Open proposals with live voting, board member info
- `/board-members` — Public board listing

### Auth
- `/login` — Magic link form + Google OAuth button
- `/login/verify` — "Check your email" confirmation

---

## Drizzle

```bash
# Dev: push schema directly (no migration files)
npx drizzle-kit push

# Prod: generate SQL migrations
npx drizzle-kit migrate
```

Config: `drizzle.config.ts` — uses `DATABASE_URL_UNPOOLED` for migrations.

---

## Key Files

```
src/
  app/(board)/          # Board portal pages
  app/(resident)/       # Resident portal pages
  app/api/              # Route handlers
  app/api/webhooks/     # External webhooks (Resend inbound)
  components/           # React components
  components/ui/        # shadcn/ui primitives
  db/schema.ts          # Full Drizzle schema
  db/index.ts           # DB connection
  lib/auth.ts           # Auth.js config (Google + Resend)
  lib/venice.ts         # Anthropic model config
  lib/agents/
    prompts.ts          # System prompts per role
    tools.ts            # Tool definitions + role toolsets
  middleware.ts         # Route protection
```
