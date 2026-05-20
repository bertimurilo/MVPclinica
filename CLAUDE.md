# CLAUDE.md — Cliniq AI

## What is this project?

Cliniq AI is a B2B SaaS platform for aesthetic clinics. It provides an AI-powered WhatsApp agent that automatically responds to incoming leads, qualifies them, follows up, and schedules appointments. The platform includes a CRM, visual pipeline, conversation inbox, and analytics dashboard.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, Server Components, Server Actions)
- **UI:** React + Tailwind CSS (no component library — custom components)
- **Database:** Supabase (PostgreSQL + Realtime + Auth + Edge Functions)
- **WhatsApp:** Z-API (webhook for incoming messages, REST API for outgoing)
- **AI:** OpenAI GPT-4o via `lib/agent.ts` for the conversational agent (migración a Claude Sonnet pendiente para post-MVP)
- **Payments:** Stripe Billing (subscription + usage-based metering)
- **Deployment:** Vercel

## Architecture

### Multi-tenant
Each clinic is a tenant. All tables have a `clinic_id` column. Row Level Security ensures data isolation. Users belong to one clinic.

### Message Flow
1. Client sends WhatsApp message to clinic's number
2. Z-API sends webhook POST to `/api/webhook/zapi`
3. Backend creates/finds lead, stores message in `messages` table
4. Backend calls `lib/agent.ts` with lead context and conversation history
5. `lib/agent.ts` builds prompt with clinic's agent_config + treatments
6. OpenAI GPT-4o generates response (migración a Claude Sonnet pendiente para post-MVP)
7. Backend sends response via Z-API and stores it in `messages` table
8. Dashboard updates in realtime via Supabase Realtime

### Key Directories
```
app/
  (app)/               # Authenticated app routes
    dashboard/         # Main dashboard with KPIs
    leads/             # Lead list and pipeline kanban
    leads/[id]/        # Individual lead profile + conversation
    inbox/             # Unified conversation inbox
    settings/          # Clinic settings, treatments, agent config
    billing/           # Stripe billing portal
  api/
    webhook/zapi/      # Z-API webhook endpoint (POST)
    stripe/webhook/    # Stripe webhook endpoint
  login/               # Auth page
components/
  dashboard/           # Dashboard widgets, stat cards
  leads/               # Lead cards, pipeline columns
  inbox/               # Chat interface, message bubbles
  settings/            # Treatment forms, agent config forms
  layout/              # Sidebar, Topbar, navigation
  ui/                  # Shared UI primitives (badges, chips, buttons)
lib/
  supabase.ts          # Supabase client
  actions.ts           # Server Actions (data fetching, mutations)
  types.ts             # TypeScript interfaces
  agent.ts             # AI agent logic (prompt building, response parsing)
  zapi.ts              # Z-API helper (send message, parse webhook)
  stripe.ts            # Stripe helpers
supabase/
  functions/
    generate-response/ # Edge Function: AI agent response
  schema.sql           # Database schema
```

## Database Schema

See `schema.sql` for the complete schema. Key tables:
- `clinics` — tenant info, Z-API credentials, Stripe IDs
- `users` — login accounts linked to a clinic
- `treatments` — each clinic's services with prices
- `agent_config` — per-clinic agent personality, rules, hours
- `leads` — every person who messages the clinic
- `messages` — full conversation history
- `appointments` — scheduled appointments (tracked for Stripe usage billing)
- `usage_events` — events reported to Stripe for metered billing

## AI Agent Behavior

The agent uses a system prompt built dynamically per clinic:
- Includes clinic name, tone preference, treatment list with prices
- Has conversation history (last 10 messages) for context
- Rules: only discuss configured treatments, escalate unknowns, never invent prices
- Detects intent: info request, pricing question, booking intent, complaint
- Updates lead qualification (frio/tibio/caliente) based on conversation
- Can schedule appointments when lead is ready

## Design Principles

- **Clean, minimal UI.** No component libraries. Tailwind only. White/gray base with one accent color (violet #7C3AED).
- **Mobile-friendly.** Clinic staff use this on phones/tablets at reception.
- **Spanish-first.** All UI text in Spanish. The agent responds in whatever language the client writes.
- **Fast.** Server Components by default. Client Components only for interactivity.
- **Realtime.** New leads and messages appear without page refresh (Supabase Realtime subscriptions).

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx supabase start   # Local Supabase
npx supabase db push # Push schema to remote
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
Z_API_INSTANCE_ID=
Z_API_TOKEN=
Z_API_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

## Current Status

Sprint 1 — Building MVP Core. Priority order:
1. Project setup + Supabase schema ✧ NOW
2. Z-API webhook + message storage
3. AI agent Edge Function
4. Dashboard + Lead pipeline
5. Conversation inbox
6. Agent config panel
7. First beta clinic onboarding
