# VotrIA — Votre premier employé IA

Plateforme SaaS multi-tenant d'agents IA autonomes pour les PME françaises.

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | Next.js 15 (App Router, RSC) |
| UI | Tailwind CSS + shadcn/ui |
| Backend API | Next.js API Routes + tRPC |
| Base de données | Supabase (PostgreSQL 15, RLS) |
| ORM | Drizzle ORM |
| Auth | Supabase Auth + RBAC |
| Moteur IA | Anthropic Claude API (Sonnet 4 + Haiku 4.5) |
| File d'attente | Inngest (jobs async, CRON, retries) |
| Cache | Upstash Redis |
| Paiement | Stripe |
| Email | Resend |
| SMS | Twilio |
| Hébergement | Vercel + Supabase (eu-west-3 Paris) |
| CDN / DDoS | Cloudflare |

## Démarrage rapide

```bash
# 1. Cloner et installer
git clone <repo-url> votria
cd votria
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir toutes les valeurs dans .env.local

# 3. Configurer Supabase
npx supabase start              # Local Docker
npm run db:push                  # Appliquer le schéma Drizzle
psql $DATABASE_URL < supabase/migrations/001_initial_rls.sql

# 4. Lancer le dev
npm run dev                      # Next.js sur :3000
npm run inngest:dev              # Inngest DevServer
```

## Structure du projet

```
votria/
├── src/
│   ├── app/             ← Pages Next.js (App Router)
│   │   ├── auth/        ← Login, signup, callback
│   │   ├── dashboard/   ← Dashboard, agents, tasks, leads, docs, billing, settings
│   │   └── api/         ← tRPC, webhooks (Stripe, Gmail), Inngest, onboarding
│   ├── components/      ← UI React (layout, dashboard, agents, auth)
│   ├── lib/             ← Clients (Supabase, Anthropic, Stripe, Resend, encryption)
│   ├── agents/          ← Orchestrateur + tools par type d'agent
│   ├── inngest/         ← Event client + fonctions async (jobs, CRON)
│   ├── trpc/            ← tRPC init + routers (agents, tasks, leads, billing)
│   └── db/              ← Drizzle schema + migrations
├── supabase/
│   └── migrations/      ← SQL RLS policies
├── tests/               ← Vitest + Playwright
└── scripts/             ← Scripts admin Python
```

## Agents IA

| Agent | Modèle | Fonction |
|-------|--------|----------|
| Email | Sonnet 4 | Trie, répond, escalade les emails |
| Commercial | Sonnet 4 | Qualifie leads, envoie devis, relances |
| Admin | Haiku 4.5 + Sonnet 4 | Classe documents, extrait données |
| Support | Sonnet 4 | Répond aux clients 24/7, crée tickets |
| Direction | Sonnet 4 | Bilans quotidiens, suivi décisions |

## Sécurité & RGPD

- RLS PostgreSQL — isolation par `tenant_id` sur chaque table
- Chiffrement AES-256-GCM pour les tokens OAuth
- TLS 1.3 (Cloudflare + Vercel)
- Hébergement EU (Supabase eu-west-3 Paris)
- Droit d'accès / oubli / portabilité implémentés
- Audit trail sur toutes les actions admin

## Coûts infrastructure MVP

| Service | Coût/mois |
|---------|-----------|
| Vercel Pro | 20€ |
| Supabase Pro | 25€ |
| Upstash Redis | ~5€ |
| Inngest Pro | 25€ |
| Anthropic API (50 tenants) | ~600€ |
| Resend Pro | 20€ |
| Twilio | ~30€ |
| Sentry Team | 26€ |
| **Total** | **~752€/mois** |

## Licence

Confidentiel — AI2 / DATAKOO — Tous droits réservés.
