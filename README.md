# VotrIA — Votre premier employe IA

Plateforme SaaS multi-tenant d'agents IA autonomes pour les PME francaises.

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | Next.js 15 (App Router, RSC) |
| UI | Tailwind CSS, Lucide Icons, Dark mode |
| Backend API | Next.js API Routes + tRPC |
| Base de donnees | Supabase (PostgreSQL, RLS) |
| ORM | Drizzle ORM |
| Auth | Supabase Auth (password + magic link) |
| Moteur IA | Anthropic Claude API (Sonnet 4 + Haiku 4.5) |
| File d'attente | Inngest (jobs async, CRON, retries) |
| Cache | Upstash Redis |
| Paiement | Stripe (checkout, portal, webhooks) |
| Email | Resend |
| SMS | Twilio (optionnel) |
| Stockage | Supabase Storage (documents) |

## Demarrage rapide

```bash
# 1. Cloner et installer
git clone <repo-url> votria
cd votria
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir toutes les valeurs dans .env.local

# 3. Pousser le schema DB
npm run db:push

# 4. Seeder les donnees demo (optionnel)
npm run db:seed

# 5. Lancer le dev
npm run dev          # Next.js sur :3000
npm run inngest:dev  # Inngest DevServer (optionnel)
```

## Structure du projet

```
votria/
├── src/
│   ├── app/                    ← Pages Next.js (App Router)
│   │   ├── auth/               ← Login, signup, callback
│   │   ├── dashboard/          ← 10 pages dashboard
│   │   │   ├── agents/         ← CRUD agents + setup wizard + detail
│   │   │   ├── tasks/          ← Liste + detail tache
│   │   │   ├── leads/          ← Pipeline + detail + import CSV
│   │   │   ├── documents/      ← Upload + classification auto
│   │   │   ├── analytics/      ← Charts, performance, couts
│   │   │   ├── notifications/  ← Liste notifications + mark read
│   │   │   ├── billing/        ← Plans Stripe + portal
│   │   │   ├── settings/       ← General, notifications, securite, integrations
│   │   │   └── profile/        ← Profil utilisateur + export RGPD
│   │   └── api/                ← tRPC, webhooks, upload, health
│   ├── components/
│   │   ├── ui/                 ← Modal, Toast, Pagination, Search
│   │   ├── layout/             ← Sidebar, TopBar (command palette, dark mode)
│   │   └── dashboard/          ← 15+ composants interactifs
│   ├── lib/                    ← Clients (Supabase, Anthropic, Stripe, Resend...)
│   ├── agents/                 ← Orchestrateur + simulateur trial
│   ├── inngest/                ← Event client + 6 fonctions async
│   ├── trpc/                   ← 8 routers (agents, tasks, leads, billing, settings, notifications, profile, usage)
│   └── db/                     ← Drizzle schema (12 tables, 6 enums)
├── public/                     ← Favicon, OG image
├── scripts/                    ← Seed demo data
└── tests/                      ← Vitest + Playwright
```

## Fonctionnalites

### Agents IA
- 5 types : Email, Commercial, Admin, Support, Direction
- Setup wizard 4 etapes (presentation → prompt → test → activation)
- Configuration modal (prompt, outils, parametres avances)
- Test simulation gratuit (0 EUR API)
- Execution reelle avec suivi tokens/cout
- Clonage d'agents
- Chart activite 14 jours

### Dashboard
- KPIs temps reel avec auto-refresh 60s
- Onboarding checklist (5 etapes)
- Analytics complet (charts, performance agents, funnel leads, couts)
- Command palette (Ctrl+K)
- Raccourcis clavier (G+D, G+A, G+T, G+L...)
- Dark mode
- Toasts feedback

### Pipeline commercial
- CRUD leads avec recherche
- Import bulk CSV (FR/EN, template telechargeable)
- Page detail avec actions (status, score, notes)
- Auto-qualification par agent commercial

### Documents
- Upload drag & drop (20 Mo max, PDF/Word/Excel/Images)
- Classification automatique par agent Admin
- Download via signed URL (Supabase Storage)

### Billing
- Checkout Stripe (Essentiel 990 EUR, Pro 1900 EUR)
- Portal client Stripe
- Webhooks lifecycle (checkout, payment, cancellation)
- Emails automatiques (bienvenue, echec paiement, annulation)

### Securite
- AES-256-GCM encryption (tokens OAuth)
- CSP + HSTS + Permissions-Policy headers
- Audit logging complet
- Rate limiting (Upstash Redis)
- Validation Zod sur tous les inputs
- RGPD : export donnees, suppression compte

## Seed demo

```bash
npm run db:seed
```

Cree :
- 1 tenant "Demo PME SAS" (plan professionnel)
- 1 user admin (demo@votria.fr)
- 5 agents (3 actifs)
- 50 taches avec metriques
- 20 leads avec pipeline
- 8 documents classes

## Deploiement Vercel

```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Deployer
vercel

# 3. Configurer les env vars dans Vercel Dashboard:
#    - Toutes les vars de .env.example
#    - NEXT_PUBLIC_APP_URL = https://app.votria.fr
#    - NODE_ENV = production

# 4. Configurer les webhooks:
#    - Stripe: https://app.votria.fr/api/webhooks/stripe
#    - Gmail Pub/Sub: https://app.votria.fr/api/webhooks/gmail
#    - Inngest: https://app.votria.fr/api/inngest
```

### Setup Supabase Production

```bash
# 1. Creer un projet sur supabase.com (region eu-west-3 Paris)
# 2. Copier DATABASE_URL, SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY

# 3. Appliquer le schema
DATABASE_URL=postgresql://... npm run db:push

# 4. Appliquer les politiques RLS
psql $DATABASE_URL < supabase/migrations/001_initial_rls.sql
psql $DATABASE_URL < supabase/migrations/002_usage_tracking.sql

# 5. Creer le bucket Storage "documents"
# → Supabase Dashboard > Storage > New Bucket > "documents" (private)

# 6. Optionnel: seeder les donnees demo
DATABASE_URL=postgresql://... npm run db:seed
```

### Checklist pre-lancement

- [ ] Env vars configurees sur Vercel
- [ ] Supabase DB creee + schema pousse
- [ ] Bucket Storage "documents" cree
- [ ] Stripe webhooks configures
- [ ] Domaine personnalise (app.votria.fr)
- [ ] DNS configure (Vercel)
- [ ] SSL actif (automatique Vercel)
- [ ] Email verification active dans Supabase Auth settings
- [ ] Inngest connecte (INNGEST_EVENT_KEY + SIGNING_KEY)

## Licence

Confidentiel — AI2 / DATAKOO — Tous droits reserves.
