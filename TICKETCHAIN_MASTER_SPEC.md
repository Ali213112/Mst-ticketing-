# TicketChain MST — Master Technical Specification
## Production-Ready Architecture & Implementation Guide v3.0

**Project Name:** TicketChain MST  
**Chain:** MST Blockchain (Testnet → Mainnet)  
**Status:** v3.0 — Master Specification (Merged + Gap-Filled)  
**Date:** May 2026  
**Language:** TypeScript (strict mode, entire monorepo)  
**Audience:** Backend Engineer, Frontend Engineer, Blockchain Engineer, DevOps Engineer

---

> **How to use this document:** This is the single source of truth for every engineering decision in this project. Every module, table, contract, endpoint, and worker is specified here with explicit solutions to known failure modes. Read it top-to-bottom once before writing a single line of code. Refer back to specific sections during implementation.

---

## Table of Contents

1. [Project Vision & Scope](#1-project-vision--scope)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Philosophy](#3-architecture-philosophy)
4. [Platform Hierarchy & User Roles](#4-platform-hierarchy--user-roles)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Database Schema — Complete](#6-database-schema--complete)
7. [Smart Contract Architecture](#7-smart-contract-architecture)
8. [Concurrency & Transaction Safety](#8-concurrency--transaction-safety)
9. [Module 1 — Platform Admin Panel](#9-module-1--platform-admin-panel)
10. [Module 2 — Organisation Dashboard](#10-module-2--organisation-dashboard)
11. [Module 3 — Event & Ticket Management](#11-module-3--event--ticket-management)
12. [Module 4 — Consumer Application](#12-module-4--consumer-application)
13. [Module 5 — Gate Scanner Application](#13-module-5--gate-scanner-application)
14. [Module 6 — Resale Marketplace](#14-module-6--resale-marketplace)
15. [Module 7 — Finance & Settlement System](#15-module-7--finance--settlement-system)
16. [Module 8 — Fraud Detection Engine](#16-module-8--fraud-detection-engine)
17. [Module 9 — Marketing & Loyalty System](#17-module-9--marketing--loyalty-system)
18. [Module 10 — Post-Event Utility](#18-module-10--post-event-utility)
19. [Multi-Tenant & White-Label Architecture](#19-multi-tenant--white-label-architecture)
20. [API Architecture & Complete Endpoints](#20-api-architecture--complete-endpoints)
21. [Queue System & Background Workers](#21-queue-system--background-workers)
22. [Real-Time Infrastructure (WebSocket)](#22-real-time-infrastructure-websocket)
23. [Dynamic QR & NFC Implementation](#23-dynamic-qr--nfc-implementation)
24. [Offline Verification Cache](#24-offline-verification-cache)
25. [Notification & Email System](#25-notification--email-system)
26. [Security Architecture](#26-security-architecture)
27. [Monorepo Folder Structure](#27-monorepo-folder-structure)
28. [Docker & Containerisation](#28-docker--containerisation)
29. [Development Environment Setup](#29-development-environment-setup)
30. [Testing Strategy](#30-testing-strategy)
31. [Implementation Phases](#31-implementation-phases)
32. [Deployment Guide](#32-deployment-guide)
33. [Pre-Deployment Checklist](#33-pre-deployment-checklist)

---

## 1. Project Vision & Scope

### Vision

TicketChain MST is a scalable, enterprise-grade NFT ticketing and digital identity infrastructure built on the MST Blockchain. It eliminates ticket fraud, prevents scalping, enables real-time blockchain verification, and transforms tickets into long-term digital assets with post-event utility.

### What the Platform Must Support

- Concerts and live music events
- Sports ticketing and season passes
- Airline boarding passes (NFT-linked identity)
- University campus passes and attendance verification
- Expo and conference entry systems
- Theme park access and ride management
- VIP memberships and tiered access
- Corporate conference identity credentials

### What the Platform Must Solve (Problems → Solutions)

| Problem | Solution Implemented |
|---|---|
| Fake/counterfeit tickets | NFT ownership on-chain; HMAC-signed dynamic QR with rotating nonce |
| Screenshot/screenshot sharing of QR | QR regenerates every 60 seconds with server-validated nonce |
| Ticket scalping | Smart contract transfer restrictions + resale price caps on-chain |
| Double-entry (same ticket scanned twice) | Redis atomic deduplication at gate + Postgres write-once scan record |
| Overselling under load | Redis DECR fast gate + `SELECT FOR UPDATE` row lock in DB |
| Double-minting on blockchain failure | Idempotency key table + orphan reconciliation worker |
| Crypto barriers for non-crypto users | SARAL custodial wallet — user never sees private key or gas |
| Gas fee confusion | Backend pays gas on user's behalf via deployer wallet |
| IPFS link rot in metadata | Pinata-pinned CIDs verified before event publish; no S3 URLs in token metadata |
| Offline verification at venues | Scanner PWA with IndexedDB snapshot cache + sync-on-reconnect |
| Revenue leakage on resale | EIP-2981 royalty enforced at smart contract level, not application level |
| Org data isolation in multi-tenant | Every query scoped by `org_id`; separate wallet per org; white-label domain support |

### Platform Architecture Model

TicketChain is a **multi-tenant SaaS platform** (not a single-org app). Your company (TicketChain) operates the platform. Client organisations (event companies, clubs, universities) are tenants. Each tenant gets their own isolated dashboard, branding, contracts, and analytics.

---

## 2. Technology Stack

### Backend Core

```
Runtime:           Node.js 20 LTS
Framework:         Express.js 4.x (Modular Monolith structure)
Language:          TypeScript 5.x — strict mode, entire codebase, no exceptions
Package Manager:   pnpm (monorepo workspaces)
Validation:        Zod (runtime schema validation for all request bodies and env vars)
Logging:           Pino (structured JSON — faster than Winston, Sentry-compatible)
Error Tracking:    Sentry (backend + frontend)
```

> **Why TypeScript strict?** This platform processes real financial transactions, NFT ownership, and role-gated access to money. TypeScript strict mode eliminates an entire class of runtime type errors at compile time. It is non-negotiable for every package — backend, frontend, contracts, shared types.

### Frontend Core

```
Framework:         Next.js 14+ (App Router)
Language:          TypeScript 5.x strict
Styling:           Tailwind CSS 3.x (utility-first, no custom CSS files unless unavoidable)
Component Base:    shadcn/ui (headless, Tailwind-compatible)
State (client):    Zustand
State (server):    TanStack Query v5
Real-time:         Socket.IO client (live gate stats, ticket availability)
PWA:               next-pwa (Scanner App runs as installable PWA)
```

### Database & Caching

```
Primary DB:        PostgreSQL 15+
  - All relational data
  - NUMERIC(78,0) for ALL wei/blockchain values (BIGINT overflows at ~10 MSTC)
  - Soft deletes (deletedAt) on all financial and ticketing tables
  - Row-level locking (SELECT FOR UPDATE) for concurrency-critical operations
  - Read replica for analytics/reporting queries (never hit primary for reads)
  - Full-text search via GIN index on events.name + description

Cache / Sessions:  Redis 7+
  - HTTP-only session store (never localStorage)
  - Refresh token registry with TTL
  - Atomic ticket availability counters (DECR — prevents oversell)
  - Distributed locks via Redlock (for high-demand minting)
  - Rate limiting per user/IP per route
  - Dynamic QR nonce store (60-second TTL per ticket)
  - Offline scanner snapshot cache (event + tier + ticket list)
  - Real-time pub/sub for WebSocket events

Message Queue:     BullMQ (Redis-backed, TypeScript-native)
  - Email delivery (transactional)
  - Blockchain transaction confirmation tracking
  - Orphan mint reconciliation (every 5 minutes)
  - Invite expiry processing
  - Resale settlement processing
  - Fraud alert processing
  - Post-event collectible distribution
```

### Blockchain Integration

```
Smart Contract Language:   Solidity 0.8.20+
Development Framework:     Hardhat (local node for dev/test — no faucet dependency)
Deployment Targets:        MST Testnet (staging) → MST Mainnet (production)
Contract Interaction:      ethers.js 6.x
Metadata Storage:          IPFS via Pinata (ALL assets — images AND JSON metadata)
Temporary Upload Buffer:   AWS S3 (staging only — never in final NFT metadata)
Standards:                 ERC-1155 (multi-tier tickets) + EIP-2981 (on-chain royalties)
Identity / SSO:            SARAL Protocol (@mstblockchain/mst-sdk) — custodial wallets
RPC:                       MST Public RPC (primary) + Alchemy MST endpoint (failover)
```

### External Services

```
Email:             SendGrid (transactional email)
File Storage:      IPFS via Pinata (permanent NFT storage)
                   AWS S3 ap-south-1 (temporary upload staging only)
NFC:               Web NFC API (browser) + react-native-nfc-manager (mobile)
Device Fingerprint: FingerprintJS Pro (fraud detection)
Error Tracking:    Sentry
Analytics:         Self-hosted (Postgres + Grafana); optionally Mixpanel
```

### DevOps

```
Containerisation:  Docker + Docker Compose
Orchestration:     Docker Compose (dev), Kubernetes (production)
CI/CD:             GitHub Actions
Cloud:             AWS (ap-south-1 — Mumbai, for India latency)
Monitoring:        Prometheus + Grafana (infra), Sentry (errors), Pino (logs)
Log Aggregation:   CloudWatch (AWS) or Datadog
Secrets:           AWS Secrets Manager (never .env files in production)
CDN:               Cloudflare (static assets, API DDoS protection)
```

### Development Tools

```
Linting:           ESLint (typescript-eslint, strict ruleset)
Formatting:        Prettier
Testing:           Vitest (unit), Supertest (integration), Playwright (E2E)
Contract Testing:  Hardhat local node (deterministic, funded wallets, no faucets)
API Testing:       Bruno (open-source Postman alternative)
DB Migrations:     node-pg-migrate (plain SQL, version-controlled, reversible)
Monorepo:          pnpm workspaces
```

---

## 3. Architecture Philosophy

### Why a Modular Monolith (Not Microservices)

A flat Express structure (`/routes`, `/controllers`, `/models`) entangles business logic across Auth, Ticketing, and Blockchain as complexity grows. A microservices split adds network latency, distributed tracing complexity, and operational overhead that a v1 team cannot sustain.

A **Modular Monolith** groups code by domain (not by technical layer). Each module owns its routes, controllers, services, repositories, and types. Modules communicate through clean internal interfaces, not cross-boundary imports.

This gives you:
- **Now:** the simplicity of one deployable app, one CI pipeline, one Postgres connection pool
- **Later:** the ability to extract any module (e.g., the scanner service, the fraud engine, the BullMQ workers) into a standalone microservice with minimal refactoring — boundaries are already clean

### Key Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| JWT storage | HTTP-only `Secure` `SameSite=Strict` cookie | Prevents XSS from stealing tokens — non-negotiable for a financial platform |
| Refresh tokens | Redis with TTL + rotation | Enables instant revocation; rotation prevents token replay |
| Ticket availability | Redis `DECRBY` + `SELECT FOR UPDATE` | Two-layer guard: Redis for speed, Postgres for correctness |
| Blockchain idempotency | `mint_idempotency` table + tx hash deduplication | Prevents double-minting when DB write fails after chain succeeds |
| Wei storage | `NUMERIC(78, 0)` everywhere | `BIGINT` overflows; `FLOAT` loses precision on large wei values |
| NFT image storage | IPFS (Pinata) only | S3 URLs in token metadata create permanent dead-link risk |
| Soft deletes | `deleted_at TIMESTAMPTZ` on all key tables | Required for audit, refund disputes, fraud investigation |
| Platform Admin auth | Separate `platform_admins` table, email+bcrypt | Company staff sit above all orgs; cannot be spoofed via SARAL |
| Royalties | EIP-2981 on-chain | Royalties enforced at contract level, not app level — cannot be bypassed |
| QR validity | HMAC-signed payload, 60-second rotating nonce | Screenshot-proof; server validates nonce freshness at gate |
| Multi-tenancy | `org_id` FK on every tenant-scoped table | Hard isolation; all queries scoped; no cross-org data leakage |
| Gas payment | Backend deployer wallet pays gas | Users (SARAL custodial) never see gas — seamless UX for non-crypto users |

---

## 4. Platform Hierarchy & User Roles

### Corrected Platform Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                  TICKETCHAIN (Your Company)                   │
│               Platform Admins  ← internal staff              │
│       Full visibility: all orgs, all events, all tickets      │
│           Separate auth path (email + bcrypt, no SARAL)       │
└──────────────────────────┬──────────────────────────────────┘
                           │  creates / approves / suspends orgs
         ┌─────────────────┼──────────────────┐
         │                 │                  │
  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
  │   Org A     │   │   Org B     │   │   Org C     │
  │ Super Admin │   │ Super Admin │   │ Super Admin │
  └──────┬──────┘   └─────────────┘   └─────────────┘
         │  (manages within Org A only)
  ┌──────▼──────┐
  │   Admins    │  (create & manage events within Org A)
  └──────┬──────┘
         │
  ┌──────┴────────────────────────┐
  │                               │
┌──▼──────────┐           ┌───────▼────────┐
│  Volunteers │           │   Consumers    │
│ (per event) │           │ (ticket buyers)│
└─────────────┘           └────────────────┘
```

> **Critical note:** "Platform Admin" is TicketChain's own internal staff. They are NOT org members. They do NOT log in via SARAL. They have a completely separate auth path (`platform_admins` table, email + bcrypt). "Super Admin" means the founder of a single Organisation — they control only their own org.

### Role Definitions

| Role | Code | Scope | Description |
|---|---|---|---|
| `PLATFORM_ADMIN` | 99 | Global | TicketChain staff. Full read/write all orgs, events, users. Separate auth path. |
| `SUPER_ADMIN` | 3 | Single Org | Org founder. Full control within their org only. |
| `ADMIN` | 2 | Single Org | Org staff. Manages events and volunteers within their org. |
| `VOLUNTEER` | 1 | Per Event (assigned) | Gate staff. Check-in only. No financial or user data access. |
| `CONSUMER` | 0 | Platform-wide | Ticket buyer. No org affiliation. |

```typescript
// packages/shared/src/constants/roles.ts
export const ROLES = {
  CONSUMER:       0,
  VOLUNTEER:      1,
  ADMIN:          2,
  SUPER_ADMIN:    3,
  PLATFORM_ADMIN: 99,
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
```

### Permissions Matrix

| Action | Platform Admin | Super Admin | Admin | Volunteer | Consumer |
|---|:---:|:---:|:---:|:---:|:---:|
| **Platform Management** | | | | | |
| Create / suspend orgs | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all orgs & events | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage subscription plans | ✅ | ❌ | ❌ | ❌ | ❌ |
| View platform revenue | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve KYC / org verification | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Org Management** | | | | | |
| View own org dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update org branding/details | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage org subscription | ✅ | ✅ | ❌ | ❌ | ❌ |
| Withdraw org funds | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite / remove admins | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Event Management** | | | | | |
| Create / edit events | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete events (soft) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deploy smart contract | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Publish / end event | ✅ | ✅ | ✅ | ❌ | ❌ |
| View event analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configure resale rules | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Volunteer Management** | | | | | |
| Invite / assign volunteers | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Check-in** | | | | | |
| Access scanner / check-in portal | ✅ | ✅ | ✅ | ✅ | ❌ |
| Scan QR & mark ticket used | ✅ | ✅ | ✅ | ✅ | ❌ |
| View live gate stats | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ticketing** | | | | | |
| Purchase ticket | — | optional | optional | ❌ | ✅ |
| View / transfer owned tickets | — | ✅ | ✅ | ❌ | ✅ |
| List ticket for resale | — | if enabled | if enabled | ❌ | if enabled |
| **Finance** | | | | | |
| View org earnings report | ✅ | ✅ | ❌ | ❌ | ❌ |
| Process refunds | ✅ | ✅ | ❌ | ❌ | ❌ |
| View settlement reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Fraud** | | | | | |
| View fraud alerts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Blacklist wallet | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 5. Authentication & Authorization

### Two Distinct Auth Paths

```
Path A — Platform Admins (TicketChain internal staff)
  ├─ Login:  POST /api/auth/platform-login  (email + bcrypt password)
  ├─ Table:  platform_admins
  ├─ Token:  JWT RS256 in HTTP-only cookie (access 15min / refresh 7d in Redis)
  └─ Access: /platform/* dashboard only

Path B — All Other Users (Super Admin, Admin, Volunteer, Consumer)
  ├─ Login:  SARAL SSO (Google OAuth / Phone OTP)
  ├─ Table:  users + org_members
  ├─ Token:  JWT RS256 in HTTP-only cookie (access 15min / refresh 7d in Redis)
  └─ Access: Role-based dashboards
```

### SARAL SSO Flow (Path B — Step by Step)

```
1. User opens app
   └─ Frontend checks context: invite token in URL? → admin/volunteer path | default → consumer

2. User clicks "Sign in with SARAL"
   └─ Frontend: window.saralAuth.initiateSSO({ provider: 'google' | 'phone' })

3. SARAL Modal completes auth
   └─ Returns: { accessToken, userEmail, saralUserId, walletAddress }
   └─ NOTE: walletAddress is a SARAL custodial wallet — user never manages private key

4. Frontend: POST /api/auth/identify
   Body: { accessToken: string, inviteToken?: string }

5. Backend: saralAuth.verifyToken(accessToken) → user metadata
   └─ If invalid → 401

6. Backend resolves user
   ├─ User exists (saral_user_id in DB) → load profile + org membership
   └─ User doesn't exist → create user + wallet record

7. Backend determines role
   ├─ No invite token → CONSUMER
   ├─ Valid invite token → role from invites table (ADMIN | VOLUNTEER)
   │   └─ Create org_members record; mark invite accepted
   └─ Org founder path → SUPER_ADMIN (set at org creation time)

8. Backend issues JWT (RS256)
   Payload: { userId, orgId?, role, walletAddress, isPlatformAdmin: false }
   ├─ Access token:  JWT, 15 min expiry, RS256 signed
   └─ Refresh token: opaque random string, 7 days, stored in Redis
      Key: refresh:{userId}:{tokenId}  Value: { userId, role, issuedAt }

9. Backend sets HTTP-only cookies — NEVER localStorage
   Set-Cookie: access_token=<jwt>;  HttpOnly; Secure; SameSite=Strict; Path=/
   Set-Cookie: refresh_token=<str>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh

10. Frontend redirects by role
    ├─ CONSUMER    → /events
    ├─ VOLUNTEER   → /checkin/{eventId}
    ├─ ADMIN       → /admin/events
    └─ SUPER_ADMIN → /admin/organisation
```

### Token Refresh Flow

```
1. API returns 401 (access token expired)
2. Frontend interceptor auto-calls POST /api/auth/refresh
3. Backend reads refresh_token cookie
   ├─ Valid → issue new access token + rotate refresh token (old one deleted from Redis)
   └─ Invalid / not found → 401, clear both cookies → redirect to login
4. Frontend retries original request with new access token
```

### Auth Middleware (TypeScript)

```typescript
// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/token.service';
import { ROLES, Role } from '@ticketchain/shared';

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token;
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }
  req.user = payload;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireOrgMembership(req: Request, res: Response, next: NextFunction): void {
  const orgId = req.params.orgId ?? req.user?.orgId;
  if (req.user?.isPlatformAdmin) { next(); return; }  // Platform admins bypass org check
  if (!req.user?.orgId || req.user.orgId !== orgId) {
    res.status(403).json({ success: false, error: 'Not a member of this organisation' });
    return;
  }
  next();
}

export function requireEventPermission(req: Request, res: Response, next: NextFunction): void {
  // For volunteers: check event_member_permissions table
  // Admins/Super Admins within same org can access all org events
  if (req.user?.role >= ROLES.ADMIN) { next(); return; }
  // Volunteer: check Redis cache first, then DB for event assignment
  // See checkin module for full implementation
  next();
}
```

---

## 6. Database Schema — Complete

> **Rules applied to every table:**
> - `id` is always `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
> - All wei/token amounts use `NUMERIC(78, 0)` — never `BIGINT` or `FLOAT`
> - All financial/ticketing tables have `deleted_at TIMESTAMPTZ` (soft delete)
> - All timestamps use `TIMESTAMPTZ` (timezone-aware)
> - Indexes cover all FK columns and common filter columns

### Table 1: platform_admins

```sql
CREATE TABLE platform_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,         -- bcrypt, min 12 rounds
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended')),
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 2: users

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SARAL Integration
  saral_user_id     VARCHAR(100) UNIQUE NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  wallet_address    VARCHAR(42)  UNIQUE NOT NULL,  -- SARAL custodial wallet

  -- Profile
  first_name        VARCHAR(100),
  last_name         VARCHAR(100),
  phone_number      VARCHAR(20),
  profile_image     VARCHAR(500),

  -- Base role: only meaningful for consumers.
  -- Org-specific role always resolved from org_members at auth time.
  base_role         SMALLINT NOT NULL DEFAULT 0,

  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'deleted')),
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_users_email       ON users(email)          WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_wallet      ON users(wallet_address)  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_saral_id    ON users(saral_user_id)   WHERE deleted_at IS NULL;
```

### Table 3: organisations

```sql
CREATE TABLE organisations (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name                          VARCHAR(255) NOT NULL,
  slug                          VARCHAR(100) UNIQUE NOT NULL,  -- URL-safe identifier
  description                   TEXT,
  logo_url                      VARCHAR(500),
  banner_url                    VARCHAR(500),
  website_url                   VARCHAR(255),
  custom_domain                 VARCHAR(255),   -- white-label: tickets.theirorg.com
  brand_primary_color           VARCHAR(7),     -- hex: #FF5500
  brand_secondary_color         VARCHAR(7),

  -- Legal / KYC
  tax_id                        VARCHAR(50),
  gst_number                    VARCHAR(50),
  registration_number           VARCHAR(100),
  country                       VARCHAR(100),
  city                          VARCHAR(100),
  kyc_documents                 JSONB,          -- encrypted document references

  -- Org founder (SUPER_ADMIN)
  super_admin_id                UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  super_admin_wallet_address    VARCHAR(42) NOT NULL,

  -- Blockchain
  org_registry_contract_address VARCHAR(42),
  chain_id                      INTEGER NOT NULL DEFAULT 56789,

  -- Subscription
  subscription_plan             VARCHAR(50) NOT NULL DEFAULT 'starter'
                                CHECK (subscription_plan IN ('starter', 'growth', 'enterprise')),
  subscription_expires_at       TIMESTAMPTZ,
  api_key                       VARCHAR(100) UNIQUE,         -- for third-party integrations
  api_key_created_at            TIMESTAMPTZ,

  -- Status
  status                        VARCHAR(20) NOT NULL DEFAULT 'pending_verification'
                                CHECK (status IN ('pending_verification', 'active', 'suspended', 'inactive')),
  verification_status           VARCHAR(20) NOT NULL DEFAULT 'unverified'
                                CHECK (verification_status IN ('unverified', 'under_review', 'verified', 'rejected')),
  verified_at                   TIMESTAMPTZ,
  verified_by_id                UUID REFERENCES platform_admins(id),

  -- Commission
  platform_commission_bps       SMALLINT NOT NULL DEFAULT 200  -- 200 = 2%
                                CHECK (platform_commission_bps BETWEEN 0 AND 10000),

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                    TIMESTAMPTZ,

  UNIQUE (super_admin_id)   -- one user = one org's super admin
);

CREATE INDEX idx_organisations_status ON organisations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organisations_slug   ON organisations(slug);
```

### Table 4: org_members

```sql
CREATE TABLE org_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  role            SMALLINT NOT NULL CHECK (role IN (1, 2, 3)),  -- 1=volunteer, 2=admin, 3=super_admin
  assigned_by_id  UUID REFERENCES users(id),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_org    ON org_members(org_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_org_members_user   ON org_members(user_id) WHERE deleted_at IS NULL;
```

### Table 5: event_member_permissions

```sql
-- Stores per-event access for volunteers and scoped admins.
CREATE TABLE event_member_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id   UUID NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id)      ON DELETE CASCADE,
  permission      VARCHAR(30) NOT NULL DEFAULT 'checkin_only'
                  CHECK (permission IN ('checkin_only', 'full_admin')),
  zone_access     TEXT[],    -- NULL = all zones; array of zone names if restricted
  granted_by_id   UUID REFERENCES users(id),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_member_id, event_id)
);

CREATE INDEX idx_event_perms_member ON event_member_permissions(org_member_id);
CREATE INDEX idx_event_perms_event  ON event_member_permissions(event_id);
```

### Table 6: invites

```sql
CREATE TABLE invites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invited_by_id       UUID NOT NULL REFERENCES users(id),
  invitee_email       VARCHAR(255) NOT NULL,
  invitee_phone       VARCHAR(20),
  role_to_assign      SMALLINT NOT NULL CHECK (role_to_assign IN (1, 2)),  -- 1=volunteer, 2=admin
  event_id            UUID REFERENCES events(id),   -- for volunteer invites
  invite_token        VARCHAR(500) UNIQUE NOT NULL,
  token_expires_at    TIMESTAMPTZ NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  accepted_at         TIMESTAMPTZ,
  accepted_by_id      UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_email   ON invites(invitee_email);
CREATE INDEX idx_invites_status  ON invites(status);
CREATE INDEX idx_invites_expires ON invites(token_expires_at);
```

### Table 7: venues

```sql
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  address         TEXT,
  city            VARCHAR(100),
  country         VARCHAR(100),
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  capacity        INTEGER,
  -- Seat map: JSON definition of zones and sections
  seat_map        JSONB,  -- { zones: [{name, capacity, color}, ...] }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_venues_org_id ON venues(org_id) WHERE deleted_at IS NULL;
```

### Table 8: events

```sql
CREATE TABLE events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by_id           UUID NOT NULL REFERENCES users(id),
  venue_id                UUID REFERENCES venues(id),

  -- Details
  name                    VARCHAR(255) NOT NULL,
  description             TEXT,
  image_ipfs_hash         VARCHAR(100),    -- IPFS CID — NOT an S3 URL
  image_ipfs_url          VARCHAR(500),    -- ipfs://Qm... via gateway
  category                VARCHAR(100),
  tags                    TEXT[],
  age_restriction         SMALLINT,

  -- Date & Location (denormalised for query performance)
  event_date              TIMESTAMPTZ NOT NULL,
  event_end_date          TIMESTAMPTZ,
  venue_name              VARCHAR(255),
  city                    VARCHAR(100),
  country                 VARCHAR(100),
  latitude                DECIMAL(10, 8),
  longitude               DECIMAL(11, 8),

  -- Zones (for multi-zone events: GA, VIP, Backstage etc.)
  zones                   JSONB,  -- [{ name: "GA", color: "#00FF00" }, ...]

  -- Blockchain
  contract_address        VARCHAR(42),
  contract_deployment_tx  VARCHAR(66),
  chain_id                INTEGER NOT NULL DEFAULT 56789,

  -- Resale Rules (can be overridden per tier)
  resale_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  resale_price_cap_bps    SMALLINT CHECK (resale_price_cap_bps BETWEEN 0 AND 100000), -- e.g. 15000 = 150% of face
  resale_royalty_bps      SMALLINT CHECK (resale_royalty_bps BETWEEN 0 AND 10000),

  -- Status
  status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'published', 'live', 'ended', 'cancelled')),

  -- Denormalised counters (updated by application logic on mint/checkin)
  total_tickets_sold      INTEGER NOT NULL DEFAULT 0,
  total_revenue_wei       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  total_checked_in        INTEGER NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at            TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_events_org_id   ON events(org_id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_events_status   ON events(status)     WHERE deleted_at IS NULL;
CREATE INDEX idx_events_date     ON events(event_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_city     ON events(city)       WHERE deleted_at IS NULL;
CREATE INDEX idx_events_category ON events(category)   WHERE deleted_at IS NULL;
-- Full-text search
CREATE INDEX idx_events_fts ON events USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(city, ''))
);
```

### Table 9: ticket_tiers

```sql
CREATE TABLE ticket_tiers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_index            SMALLINT NOT NULL,   -- ERC-1155 token ID (1, 2, 3...)
  name                  VARCHAR(100) NOT NULL,
  description           TEXT,
  zone                  VARCHAR(100),        -- must match an event.zones[].name

  -- Supply
  total_supply          INTEGER NOT NULL CHECK (total_supply > 0),
  minted                INTEGER NOT NULL DEFAULT 0 CHECK (minted >= 0),
  max_per_wallet        SMALLINT NOT NULL DEFAULT 4,

  -- Pricing — NUMERIC(78,0) for wei
  price_wei             NUMERIC(78, 0) NOT NULL,
  price_display         NUMERIC(20, 8),   -- human-readable in MSTC

  -- Sale windows
  sale_start_at         TIMESTAMPTZ,
  sale_end_at           TIMESTAMPTZ,
  early_bird_end_at     TIMESTAMPTZ,
  early_bird_price_wei  NUMERIC(78, 0),

  -- Blockchain
  is_transferable       BOOLEAN NOT NULL DEFAULT TRUE,
  royalty_bps           SMALLINT NOT NULL DEFAULT 500 CHECK (royalty_bps BETWEEN 0 AND 10000),

  -- IPFS metadata — image on IPFS, not S3
  metadata_ipfs_hash    VARCHAR(100),
  metadata_ipfs_uri     VARCHAR(500),

  -- Resale overrides for this tier
  resale_enabled        BOOLEAN,   -- NULL = inherit from event
  resale_price_cap_bps  SMALLINT,  -- NULL = inherit from event

  status                VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'sold_out', 'disabled')),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  UNIQUE (event_id, tier_index)
);

CREATE INDEX idx_tiers_event_id ON ticket_tiers(event_id) WHERE deleted_at IS NULL;
```

### Table 10: mint_idempotency

```sql
-- CRITICAL: Prevents double-minting when DB write fails after blockchain tx succeeds.
-- Write here FIRST before touching the blockchain. If tx hash exists, it's a duplicate.
CREATE TABLE mint_idempotency (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  VARCHAR(200) UNIQUE NOT NULL,  -- userId + tierId + client-nonce
  transaction_hash VARCHAR(66) UNIQUE,
  token_id         INTEGER,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'failed')),
  user_id          UUID NOT NULL REFERENCES users(id),
  tier_id          UUID NOT NULL REFERENCES ticket_tiers(id),
  quantity         SMALLINT NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ NOT NULL   -- pending records expire after 10 minutes
);

CREATE INDEX idx_idempotency_key    ON mint_idempotency(idempotency_key);
CREATE INDEX idx_idempotency_tx     ON mint_idempotency(transaction_hash);
CREATE INDEX idx_idempotency_status ON mint_idempotency(status);
CREATE INDEX idx_idempotency_expiry ON mint_idempotency(expires_at) WHERE status = 'pending';
```

### Table 11: tickets

```sql
CREATE TABLE tickets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                UUID NOT NULL REFERENCES events(id),
  tier_id                 UUID NOT NULL REFERENCES ticket_tiers(id),
  tier_index              SMALLINT NOT NULL,

  -- Ownership
  owner_user_id           UUID REFERENCES users(id),
  owner_wallet_address    VARCHAR(42) NOT NULL,

  -- Blockchain
  token_id                INTEGER NOT NULL,
  contract_address        VARCHAR(42) NOT NULL,
  transaction_hash        VARCHAR(66) NOT NULL,
  minted_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- QR
  qr_secret               VARCHAR(64) NOT NULL,   -- HMAC secret for dynamic QR (never expose)

  -- Status
  status                  VARCHAR(20) NOT NULL DEFAULT 'valid'
                          CHECK (status IN ('valid', 'used', 'cancelled', 'transferred', 'listed_for_resale')),
  used_at                 TIMESTAMPTZ,
  used_by_volunteer_id    UUID REFERENCES users(id),
  seat_number             VARCHAR(20),    -- if seat-mapped event

  -- Promo/discount tracking
  promo_code_used         VARCHAR(50),
  discount_applied_bps    SMALLINT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  FOREIGN KEY (event_id, tier_index) REFERENCES ticket_tiers(event_id, tier_index)
);

CREATE INDEX idx_tickets_event_id  ON tickets(event_id);
CREATE INDEX idx_tickets_owner     ON tickets(owner_user_id);
CREATE INDEX idx_tickets_status    ON tickets(status);
CREATE INDEX idx_tickets_contract  ON tickets(contract_address, token_id);
```

### Table 12: ticket_transfers

```sql
CREATE TABLE ticket_transfers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id             UUID NOT NULL REFERENCES tickets(id),
  event_id              UUID NOT NULL REFERENCES events(id),
  from_user_id          UUID NOT NULL REFERENCES users(id),
  from_wallet_address   VARCHAR(42) NOT NULL,
  to_user_id            UUID REFERENCES users(id),
  to_wallet_address     VARCHAR(42) NOT NULL,
  transfer_type         VARCHAR(20) NOT NULL DEFAULT 'gift'
                        CHECK (transfer_type IN ('gift', 'resale')),
  sale_price_wei        NUMERIC(78, 0),
  royalty_paid_wei      NUMERIC(78, 0),
  platform_fee_wei      NUMERIC(78, 0),
  transaction_hash      VARCHAR(66),
  block_number          BIGINT,
  transaction_timestamp TIMESTAMPTZ,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transfers_ticket  ON ticket_transfers(ticket_id);
CREATE INDEX idx_transfers_from    ON ticket_transfers(from_user_id);
CREATE INDEX idx_transfers_to      ON ticket_transfers(to_user_id);
CREATE INDEX idx_transfers_status  ON ticket_transfers(status);
```

### Table 13: resale_listings

```sql
CREATE TABLE resale_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id           UUID NOT NULL UNIQUE REFERENCES tickets(id),
  event_id            UUID NOT NULL REFERENCES events(id),
  tier_id             UUID NOT NULL REFERENCES ticket_tiers(id),
  seller_user_id      UUID NOT NULL REFERENCES users(id),
  seller_wallet       VARCHAR(42) NOT NULL,

  -- Pricing
  face_price_wei      NUMERIC(78, 0) NOT NULL,  -- original price paid
  ask_price_wei       NUMERIC(78, 0) NOT NULL,  -- seller's asking price
  max_price_wei       NUMERIC(78, 0) NOT NULL,  -- cap enforced at contract + app level

  -- Status
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
  expires_at          TIMESTAMPTZ,

  -- Settlement
  buyer_user_id       UUID REFERENCES users(id),
  sold_at             TIMESTAMPTZ,
  sale_price_wei      NUMERIC(78, 0),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resale_event_id  ON resale_listings(event_id)  WHERE status = 'active';
CREATE INDEX idx_resale_seller    ON resale_listings(seller_user_id);
CREATE INDEX idx_resale_status    ON resale_listings(status);
```

### Table 14: checkins

```sql
CREATE TABLE checkins (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES events(id),
  ticket_id             UUID NOT NULL REFERENCES tickets(id),
  checked_in_by_id      UUID NOT NULL REFERENCES users(id),

  -- QR verification data
  qr_signature          VARCHAR(500),     -- HMAC signature from QR payload
  qr_nonce              VARCHAR(100),     -- must be active in Redis at scan time
  qr_timestamp          BIGINT,          -- Unix timestamp from QR payload

  -- NFC data (if NFC scan)
  nfc_uid               VARCHAR(100),
  scan_method           VARCHAR(10) NOT NULL DEFAULT 'qr'
                        CHECK (scan_method IN ('qr', 'nfc', 'manual')),

  verification_success  BOOLEAN NOT NULL,
  failure_reason        VARCHAR(100),    -- 'already_used' | 'invalid_sig' | 'expired_qr' | 'blacklisted'

  zone_accessed         VARCHAR(100),
  device_id             VARCHAR(100),    -- scanner device identifier

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkins_event    ON checkins(event_id);
CREATE INDEX idx_checkins_ticket   ON checkins(ticket_id);
CREATE INDEX idx_checkins_volunteer ON checkins(checked_in_by_id);
CREATE INDEX idx_checkins_time     ON checkins(created_at);
-- One successful check-in per ticket
CREATE UNIQUE INDEX idx_checkins_used ON checkins(ticket_id) WHERE verification_success = TRUE;
```

### Table 15: wallets

```sql
CREATE TABLE wallets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  wallet_address        VARCHAR(42) UNIQUE NOT NULL,
  balance_wei           NUMERIC(78, 0) NOT NULL DEFAULT 0,
  balance_display       NUMERIC(20, 8) NOT NULL DEFAULT 0,
  total_earnings_wei    NUMERIC(78, 0) NOT NULL DEFAULT 0,    -- for organiser wallets
  total_withdrawn_wei   NUMERIC(78, 0) NOT NULL DEFAULT 0,
  is_verified           BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 16: settlements

```sql
CREATE TABLE settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organisations(id),
  event_id            UUID REFERENCES events(id),   -- NULL = platform-wide settlement

  -- Amounts — all in wei
  gross_revenue_wei       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  platform_commission_wei NUMERIC(78, 0) NOT NULL DEFAULT 0,
  royalties_paid_wei      NUMERIC(78, 0) NOT NULL DEFAULT 0,
  refunds_issued_wei      NUMERIC(78, 0) NOT NULL DEFAULT 0,
  net_payout_wei          NUMERIC(78, 0) NOT NULL DEFAULT 0,

  period_start        TIMESTAMPTZ NOT NULL,
  period_end          TIMESTAMPTZ NOT NULL,

  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  transaction_hash    VARCHAR(66),   -- on-chain settlement tx
  settled_at          TIMESTAMPTZ,
  settled_by_id       UUID REFERENCES platform_admins(id),

  gst_applicable      BOOLEAN NOT NULL DEFAULT FALSE,
  gst_amount_wei      NUMERIC(78, 0) NOT NULL DEFAULT 0,
  invoice_number      VARCHAR(50),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlements_org    ON settlements(org_id);
CREATE INDEX idx_settlements_event  ON settlements(event_id);
CREATE INDEX idx_settlements_status ON settlements(status);
```

### Table 17: refunds

```sql
CREATE TABLE refunds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id           UUID NOT NULL REFERENCES tickets(id),
  event_id            UUID NOT NULL REFERENCES events(id),
  user_id             UUID NOT NULL REFERENCES users(id),

  original_price_wei  NUMERIC(78, 0) NOT NULL,
  refund_amount_wei   NUMERIC(78, 0) NOT NULL,
  refund_reason       VARCHAR(255),

  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by_id      UUID REFERENCES users(id),
  reviewed_at         TIMESTAMPTZ,
  processed_at        TIMESTAMPTZ,
  transaction_hash    VARCHAR(66),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_event  ON refunds(event_id);
CREATE INDEX idx_refunds_user   ON refunds(user_id);
CREATE INDEX idx_refunds_status ON refunds(status);
```

### Table 18: promo_codes

```sql
CREATE TABLE promo_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id),    -- NULL = org-wide promo
  tier_id           UUID REFERENCES ticket_tiers(id),  -- NULL = all tiers

  code              VARCHAR(50) NOT NULL,
  discount_type     VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_wei')),
  discount_value    NUMERIC(78, 0) NOT NULL,  -- bps if percentage, wei if fixed
  max_uses          INTEGER,
  uses_remaining    INTEGER,
  max_per_user      SMALLINT NOT NULL DEFAULT 1,

  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'exhausted', 'expired')),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (org_id, code)
);

CREATE INDEX idx_promos_event  ON promo_codes(event_id) WHERE status = 'active';
CREATE INDEX idx_promos_code   ON promo_codes(code);
```

### Table 19: loyalty_rewards

```sql
CREATE TABLE loyalty_rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  event_id        UUID REFERENCES events(id),

  reward_type     VARCHAR(50) NOT NULL
                  CHECK (reward_type IN ('attendance_badge', 'vip_unlock', 'discount_token',
                                         'collectible_nft', 'early_access', 'referral_bonus')),
  reward_metadata JSONB,             -- e.g. { badge_name: "Superfan", level: 3 }
  token_id        INTEGER,           -- NFT token ID if minted as collectible
  contract_address VARCHAR(42),

  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  redeemed_at     TIMESTAMPTZ
);

CREATE INDEX idx_rewards_user ON loyalty_rewards(user_id);
CREATE INDEX idx_rewards_org  ON loyalty_rewards(org_id);
```

### Table 20: referrals

```sql
CREATE TABLE referrals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id    UUID NOT NULL REFERENCES users(id),
  referred_user_id    UUID NOT NULL REFERENCES users(id),
  event_id            UUID REFERENCES events(id),
  referral_code       VARCHAR(50) NOT NULL,
  reward_issued       BOOLEAN NOT NULL DEFAULT FALSE,
  reward_type         VARCHAR(50),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referrer_user_id, referred_user_id)
);
```

### Table 21: fraud_logs

```sql
CREATE TABLE fraud_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        VARCHAR(100) NOT NULL,   -- 'bulk_purchase' | 'duplicate_qr' | 'blacklisted_wallet'
  severity          VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  user_id           UUID REFERENCES users(id),
  wallet_address    VARCHAR(42),
  ip_address        VARCHAR(45),
  device_fingerprint VARCHAR(200),
  user_agent        TEXT,

  event_id          UUID REFERENCES events(id),
  ticket_id         UUID REFERENCES tickets(id),

  details           JSONB,
  resolved          BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at       TIMESTAMPTZ,
  resolved_by_id    UUID REFERENCES platform_admins(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_user     ON fraud_logs(user_id);
CREATE INDEX idx_fraud_wallet   ON fraud_logs(wallet_address);
CREATE INDEX idx_fraud_event    ON fraud_logs(event_id);
CREATE INDEX idx_fraud_severity ON fraud_logs(severity) WHERE resolved = FALSE;
```

### Table 22: blacklisted_wallets

```sql
CREATE TABLE blacklisted_wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  VARCHAR(42) UNIQUE NOT NULL,
  reason          TEXT,
  blacklisted_by  UUID REFERENCES platform_admins(id),
  blacklisted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ   -- NULL = permanent
);

CREATE INDEX idx_blacklist_wallet ON blacklisted_wallets(wallet_address);
```

### Table 23: audit_logs

```sql
-- Append-only. Never UPDATE or DELETE a row in this table.
CREATE TABLE audit_logs (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action                          VARCHAR(100) NOT NULL,   -- e.g. 'event.published', 'ticket.refunded'
  entity_type                     VARCHAR(50)  NOT NULL,
  entity_id                       UUID,
  performed_by_id                 UUID REFERENCES users(id),
  performed_by_platform_admin_id  UUID REFERENCES platform_admins(id),
  performed_by_wallet             VARCHAR(42),
  changes                         JSONB,   -- { before: {...}, after: {...} }
  status                          VARCHAR(10) NOT NULL DEFAULT 'success'
                                  CHECK (status IN ('success', 'failed')),
  error_message                   TEXT,
  ip_address                      VARCHAR(45),
  user_agent                      TEXT,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_action    ON audit_logs(action);
CREATE INDEX idx_audit_entity    ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_performer ON audit_logs(performed_by_id);
CREATE INDEX idx_audit_time      ON audit_logs(created_at);
CREATE INDEX idx_audit_changes   ON audit_logs USING GIN (changes);
```

### Table 24: org_white_label_config

```sql
CREATE TABLE org_white_label_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE CASCADE,
  custom_domain         VARCHAR(255),      -- tickets.theirorg.com
  ssl_cert_status       VARCHAR(20) DEFAULT 'pending',
  primary_color         VARCHAR(7),        -- #hex
  secondary_color       VARCHAR(7),
  font_family           VARCHAR(100),
  logo_url              VARCHAR(500),
  favicon_url           VARCHAR(500),
  email_from_name       VARCHAR(100),
  email_from_address    VARCHAR(255),
  footer_text           TEXT,
  social_links          JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 25: subscription_plans

```sql
CREATE TABLE subscription_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(50) UNIQUE NOT NULL,   -- 'starter' | 'growth' | 'enterprise'
  monthly_price_wei   NUMERIC(78, 0) NOT NULL,
  max_events          INTEGER,       -- NULL = unlimited
  max_tickets_per_event INTEGER,
  commission_bps      SMALLINT NOT NULL,
  white_label_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  api_access_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  analytics_advanced  BOOLEAN NOT NULL DEFAULT FALSE,
  resale_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data:
INSERT INTO subscription_plans VALUES
  (gen_random_uuid(), 'starter',    0, 3,    500,  300, false, false, false, false, NOW()),
  (gen_random_uuid(), 'growth',     <price_wei>, 20,   5000, 250, true,  false, true,  true,  NOW()),
  (gen_random_uuid(), 'enterprise', <price_wei>, NULL, NULL, 200, true,  true,  true,  true,  NOW());
```

---

## 7. Smart Contract Architecture

### Contract Overview

| Contract | Standard | Purpose |
|---|---|---|
| `EventTickets1155` | ERC-1155 + EIP-2981 | NFT ticket ownership, multi-tier per event, royalties |
| `OrgRegistry` | Custom | Registers org wallets on-chain; authorises which wallets can deploy EventTickets contracts |
| `TicketMarketplace` | Custom | On-chain resale with price cap enforcement and royalty distribution |
| `LoyaltyBadge` | ERC-1155 | Post-event collectibles and loyalty NFTs (separate from tickets) |

### EventTickets1155 — Solidity Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ERC-1155 Multi-tier ticket contract — one deployment per event
// EIP-2981 royalty info enforced at contract level
interface IEventTickets1155 {

    // ─── Structs ────────────────────────────────────────────────
    struct TierConfig {
        uint256 maxSupply;
        uint256 priceWei;
        bool    isTransferable;
        uint16  royaltyBps;     // basis points, e.g. 500 = 5%
        bool    paused;
    }

    // ─── Admin (called by backend deployer wallet) ───────────────
    // Called once per tier when event is configured
    function setTier(
        uint256 tierId,
        uint256 supply,
        uint256 priceWei,
        bool    isTransferable,
        uint16  royaltyBps
    ) external;

    function pauseTier(uint256 tierId) external;
    function unpauseTier(uint256 tierId) external;

    // ─── Minting ────────────────────────────────────────────────
    // Backend calls this on behalf of buyer. msg.value must == priceWei.
    // Returns the new token ID minted.
    function mintTicket(
        address to,
        uint256 tierId,
        uint256 quantity   // always 1 for standard tickets
    ) external payable returns (uint256 tokenId);

    // Lazy minting: backend validates off-chain then calls this
    // Useful when buyer pays in fiat and backend settles off-chain
    function adminMint(
        address to,
        uint256 tierId,
        uint256 quantity
    ) external returns (uint256 tokenId);

    // ─── Transfers ──────────────────────────────────────────────
    // Enforces isTransferable. Reverts if tier is non-transferable.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    // ─── Ownership / Supply ─────────────────────────────────────
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function totalMinted(uint256 tierId) external view returns (uint256);
    function maxSupply(uint256 tierId) external view returns (uint256);
    function isTransferable(uint256 tierId) external view returns (bool);
    function getTierConfig(uint256 tierId) external view returns (TierConfig memory);

    // ─── Royalties (EIP-2981) ───────────────────────────────────
    // Returns (royaltyReceiver, royaltyAmount) for a given sale price
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount);

    // ─── Finance ────────────────────────────────────────────────
    function withdrawFunds(address to) external;

    // ─── Events (emitted on-chain) ───────────────────────────────
    event TicketMinted(address indexed to, uint256 indexed tierId, uint256 tokenId);
    event TicketTransferred(address indexed from, address indexed to, uint256 indexed tokenId);
    event TierPaused(uint256 indexed tierId);
    event FundsWithdrawn(address indexed to, uint256 amount);
}
```

### TicketMarketplace — Anti-Scalping Logic

```solidity
// TicketMarketplace.sol — enforces price caps on-chain
interface ITicketMarketplace {

    struct Listing {
        address seller;
        uint256 ticketContractAddress;  // ERC-1155 contract
        uint256 tokenId;
        uint256 tierId;
        uint256 askPriceWei;
        uint256 maxPriceWei;            // set by org at listing time
        bool    active;
    }

    // Seller lists ticket. Backend validates price cap before calling.
    // maxPriceWei is enforced by the contract — cannot be bypassed.
    function listTicket(
        address ticketContract,
        uint256 tokenId,
        uint256 tierId,
        uint256 askPriceWei,
        uint256 maxPriceWei
    ) external;

    // Buyer purchases. msg.value must == askPriceWei.
    // Contract distributes: royalty to org → platform fee → net to seller.
    function buyTicket(uint256 listingId) external payable;

    function cancelListing(uint256 listingId) external;

    event TicketListed(uint256 indexed listingId, address indexed seller, uint256 askPriceWei);
    event TicketSold(uint256 indexed listingId, address indexed buyer, uint256 salePrice);
}
```

### Contract Interaction Service (ethers.js 6.x)

```typescript
// apps/api/src/shared/blockchain/contracts/EventTickets1155.ts
import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import abi from '../abis/EventTickets1155.json';

export class EventTickets1155Contract {
  private contract: Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.contract = new Contract(address, abi, signer);
  }

  async mintTicket(
    to: string,
    tierId: number,
    priceWei: bigint
  ): Promise<ContractTransactionResponse> {
    return this.contract.mintTicket(to, tierId, 1, { value: priceWei });
  }

  async adminMint(
    to: string,
    tierId: number
  ): Promise<ContractTransactionResponse> {
    // Used for lazy/fiat-paid minting — no msg.value required
    return this.contract.adminMint(to, tierId, 1);
  }

  async getTierSupply(tierId: number): Promise<{ minted: bigint; max: bigint }> {
    const [minted, max] = await Promise.all([
      this.contract.totalMinted(tierId) as Promise<bigint>,
      this.contract.maxSupply(tierId)   as Promise<bigint>,
    ]);
    return { minted, max };
  }

  async verifyOwnership(wallet: string, tierId: number): Promise<boolean> {
    const balance = await this.contract.balanceOf(wallet, tierId) as bigint;
    return balance > 0n;
  }
}
```

### Blockchain Service (RPC + Failover)

```typescript
// apps/api/src/shared/blockchain/blockchain.service.ts
import { ethers } from 'ethers';
import { env } from '../../config/env';

class BlockchainService {
  private provider: ethers.Provider;
  private signer: ethers.Wallet;

  constructor() {
    // Primary + failover RPC
    this.provider = new ethers.FallbackProvider([
      new ethers.JsonRpcProvider(env.MST_RPC_URL),
      new ethers.JsonRpcProvider(env.MST_RPC_FALLBACK_URL),
    ]);
    this.signer = new ethers.Wallet(env.MST_DEPLOYER_PRIVATE_KEY, this.provider);
  }

  async deployEventContract(
    orgWallet: string,
    eventId: string
  ): Promise<{ address: string; txHash: string }> {
    // Deploy EventTickets1155 — org wallet is set as royalty receiver
    const factory = new ethers.ContractFactory(abi, bytecode, this.signer);
    const contract = await factory.deploy(orgWallet, eventId);
    await contract.waitForDeployment();
    return {
      address: await contract.getAddress(),
      txHash:  contract.deploymentTransaction()!.hash,
    };
  }
}

export const blockchainService = new BlockchainService();
```

---

## 8. Concurrency & Transaction Safety

### The Problem: Overselling Under Load

Without concurrency controls, a flash sale causes:

```
Request A reads: tier.minted = 99, total_supply = 100  → OK, proceed
Request B reads: tier.minted = 99, total_supply = 100  → OK, proceed
Request A mints: tier.minted becomes 100  ✅
Request B mints: tier.minted becomes 101  ❌ OVERSOLD
```

### Solution: Two-Layer Guard

**Layer 1 — Redis Atomic Counter (fast gate, runs before any DB work)**

```typescript
// apps/api/src/modules/tickets/tickets.service.ts

async function checkAndReserveTicket(tierId: string, quantity: number): Promise<boolean> {
  const redis = getRedisClient();
  const key = `tier:available:${tierId}`;

  // DECRBY is atomic in Redis — if result < 0, roll back and deny
  const remaining = await redis.decrBy(key, quantity);

  if (remaining < 0) {
    // Restore counter — purchase denied
    await redis.incrBy(key, quantity);
    return false;
  }
  return true;
}

// Seed this counter when event is published:
// redis.set(`tier:available:${tierId}`, tier.total_supply - tier.minted)
```

**Layer 2 — Postgres FOR UPDATE (correctness guard, inside DB transaction)**

```typescript
// Full mint transaction with idempotency + row lock
async function mintTicketTransaction(
  db: Database,
  tierId: string,
  userId: string,
  idempotencyKey: string
): Promise<Tier> {
  return db.tx(async (t) => {
    // 1. Check idempotency — has this exact purchase been attempted before?
    const existing = await t.oneOrNone<MintIdempotency>(
      `SELECT * FROM mint_idempotency WHERE idempotency_key = $1`,
      [idempotencyKey]
    );
    if (existing?.status === 'confirmed') throw new DuplicateMintError(existing);

    // 2. Lock the tier row — exclusive lock until transaction commits
    const tier = await t.one<TicketTier>(
      `SELECT * FROM ticket_tiers WHERE id = $1 FOR UPDATE`,
      [tierId]
    );

    if (tier.minted + 1 > tier.total_supply) {
      throw new TicketSoldOutError();
    }

    // 3. Write idempotency record (status: pending)
    await t.none(
      `INSERT INTO mint_idempotency
         (idempotency_key, user_id, tier_id, status, expires_at)
       VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '10 minutes')`,
      [idempotencyKey, userId, tierId]
    );

    // 4. Increment minted counter inside locked transaction
    await t.none(
      `UPDATE ticket_tiers SET minted = minted + 1, updated_at = NOW() WHERE id = $1`,
      [tierId]
    );

    return tier;
    // Transaction commits — blockchain call happens OUTSIDE this block
  });
}
```

**Orphan Reconciliation — handles DB success + blockchain failure:**

```typescript
// apps/api/src/shared/queue/workers/orphan-reconcile.worker.ts
// BullMQ repeatable job: runs every 5 minutes

// For each mint_idempotency record where:
//   status = 'pending' AND expires_at < NOW()
// Action:
//   A. Check on-chain: did the tx succeed?
//      - Yes → update status='confirmed', write ticket record, mark tier.minted confirmed
//      - No  → update status='failed', decrement tier.minted, restore Redis counter
```

**For ultra-high-demand drops (Redlock before Redis DECR):**

```typescript
import Redlock from 'redlock';
const redlock = new Redlock([redis]);

async function purchaseWithDistributedLock(tierId: string, userId: string) {
  const lock = await redlock.acquire([`lock:tier:${tierId}`], 5000); // 5s TTL
  try {
    return await mintTicketTransaction(db, tierId, userId, generateIdempotencyKey());
  } finally {
    await lock.release();
  }
}
```

---

## 9. Module 1 — Platform Admin Panel

**Who uses this:** TicketChain internal staff (Platform Admins)  
**Auth path:** Email + bcrypt, separate from SARAL  
**URL:** /platform/*

### Features & Solutions

**Organisation Management:**
- Create org on behalf of a client (if onboarding offline)
- View all orgs with status, revenue, ticket volume
- Approve / reject org KYC (documents uploaded by org; reviewed here)
- Suspend / reactivate org (cascades to disabling org's events)
- Set per-org commission override (default from subscription plan)
- Generate / rotate API keys for enterprise clients

**Subscription & Billing Management:**
- Assign subscription plan to org
- Track plan expiry and trigger renewal reminders
- Handle plan upgrades/downgrades

**Platform-Wide Analytics Dashboard:**
- Total tickets minted (all orgs, filterable by period)
- Platform revenue (commissions collected)
- Active events count
- Top-performing orgs by revenue
- Fraud alerts summary
- Blockchain node health (RPC response time)

**Blockchain Monitoring:**
- Transaction explorer (filterable by org / event)
- Deployer wallet balance and gas usage
- Failed transaction alerts (from BullMQ dead-letter queue)

**KYC Review Flow:**
```
Org submits KYC documents → platform_admin reviews in dashboard
→ Approve: org.verification_status = 'verified'; org.status = 'active'; send welcome email
→ Reject:  org.verification_status = 'rejected'; org.status stays 'pending_verification'; send reason
```

**Dispute & Refund Management:**
- View all refund requests across all orgs
- Approve / reject refund (triggers BullMQ settlement job)
- View dispute history per ticket

**Audit Log Viewer:**
- Query by entity (org / event / ticket / user)
- Query by action type
- Query by performer
- Export as CSV

---

## 10. Module 2 — Organisation Dashboard

**Who uses this:** Super Admins and Admins of a specific organisation  
**URL:** /admin/*  
**Isolation:** Every query is scoped to the authenticated user's `org_id`. Cross-org access is impossible.

### Organisation Setup

When a Super Admin first logs in after KYC approval:
1. Complete org profile: name, logo, GST number, bank/wallet details
2. Set up white-label config (if Growth/Enterprise plan)
3. Connect payment wallet
4. Create first venue

### White-Label Setup Flow

```
1. Super Admin enters custom domain: tickets.theirorg.com
2. Backend generates DNS CNAME instructions: point to ticketchain-wl.yourplatform.com
3. Cloudflare Worker proxies requests based on Host header → org lookup by custom_domain
4. Backend issues SSL cert via Let's Encrypt (automated with cert-manager on K8s)
5. org_white_label_config stores all branding tokens
6. All consumer-facing pages for this org render with their branding
```

### Member Management

- Invite admins via email → invite token → SARAL login → org_members record
- Invite volunteers per-event via email or phone OTP
- View member list with roles and last activity
- Suspend / remove members (soft delete from org_members)

### Org Analytics Dashboard

- Total revenue (all events, filterable by date / event)
- Tickets sold vs capacity utilisation
- Top ticket tiers by revenue
- Attendance rate (checked in / sold)
- Fraud attempt summary
- Resale marketplace activity (volume, royalties earned)

### Finance Summary (detailed in Module 7)

- Pending settlement amount
- Completed settlements history
- Refunds processed
- Royalties earned from resale

---

## 11. Module 3 — Event & Ticket Management

### Event Lifecycle

```
draft → published → live → ended
                  ↓
               cancelled (soft delete)
```

| State | Description |
|---|---|
| `draft` | Being configured. Tickets not visible. No contract deployed. |
| `published` | Live for sale. Contract deployed. Tickets visible and purchasable. |
| `live` | Event day. Check-in gate is open. QR validation active. |
| `ended` | Event over. Check-in closed. Post-event utility distributed. |
| `cancelled` | Refunds triggered automatically. Resale listings cancelled. |

### Event Creation Flow (Step by Step)

```
Step 1: Create event record (name, description, date, venue, category, zones)
Step 2: Upload banner image → S3 temp → Pinata IPFS pin → store CID
Step 3: Configure ticket tiers (name, supply, price, zone assignment)
Step 4: Upload tier NFT images → S3 temp → Pinata pin → generate metadata JSON → pin JSON
Step 5: Set resale rules (enabled?, price cap %, royalty %)
Step 6: Configure promo codes (optional)
Step 7: Deploy smart contract → EventTickets1155 deployed on MST
         → Tiers registered on-chain via setTier()
         → contract_address stored in events table
Step 8: Verify all metadata CIDs are resolvable via IPFS gateway (pre-publish check)
Step 9: Publish event → status = 'published'
         → Seed Redis availability counters: SET tier:available:{tierId} {totalSupply}
```

### IPFS Metadata Standard (ERC-1155 compatible)

```json
{
  "name": "General Admission — TechFest 2026",
  "description": "Your NFT ticket grants access to TechFest 2026, Mumbai, Sept 15.",
  "image": "ipfs://Qm<image_cid>",
  "external_url": "https://ticketchain.com/events/<eventId>",
  "attributes": [
    { "trait_type": "Event",      "value": "TechFest 2026" },
    { "trait_type": "Tier",       "value": "General Admission" },
    { "trait_type": "Venue",      "value": "NSCI Dome, Mumbai" },
    { "trait_type": "Date",       "value": "2026-09-15" },
    { "trait_type": "Zone",       "value": "GA" },
    { "trait_type": "Transferable", "value": "Yes" }
  ]
}
```

> **Critical:** The `"image"` field MUST use `ipfs://` URI. Never an S3 URL. S3 links become dead links. Metadata JSON itself must also be pinned on IPFS. Verify CID resolves before publishing.

### Seat Mapping (Optional)

For seated events, venues have a `seat_map` JSONB field:

```json
{
  "zones": [
    { "name": "Stalls",   "capacity": 200, "rows": ["A","B","C","D"], "seats_per_row": 20 },
    { "name": "Balcony",  "capacity": 100, "rows": ["E","F"],         "seats_per_row": 50 },
    { "name": "VIP Box",  "capacity": 20,  "rows": ["VIP"],           "seats_per_row": 20 }
  ]
}
```

Seat assignment logic:
- During mint, backend assigns next available seat from the zone matching the tier
- Seat number written to `tickets.seat_number`
- Shown on digital ticket and QR payload

### Ticket Minting — Custodial Flow

Because users have SARAL custodial wallets, the backend controls gas. Users never touch private keys.

```
1. Consumer calls POST /api/tickets/mint (with Idempotency-Key header)
2. Backend validates:
   - Idempotency key not already used
   - Promo code (if provided) — validates, reserves usage
   - Wallet not blacklisted
   - Device fingerprint not flagged for bulk buying
3. Layer 1: Redis DECRBY — reserve availability
4. Layer 2: DB transaction — FOR UPDATE lock, idempotency record
5. Backend's deployer wallet calls contract.mintTicket(userWallet, tierId, quantity)
   - Backend pays gas — user sees none of this
6. Await tx confirmation (or BullMQ async tracking)
7. On confirmation: create tickets record, update idempotency status, send email
8. Return ticket ID + QR endpoint URL to consumer
```

### Lazy Minting (for fiat payments)

When a user pays with fiat (credit card via payment gateway):
1. Payment gateway webhook confirms payment
2. Backend calls `contract.adminMint(userWallet, tierId, 1)` — no msg.value needed
3. Ticket minted without on-chain payment; backend has already reconciled fiat payment
4. `tickets` record created with `promo_code_used` if applicable

---

## 12. Module 4 — Consumer Application

**Who uses this:** Ticket buyers  
**URL:** /events, /tickets, /profile

### Event Discovery

- Browse events: filter by city, category, date range, price range, text search
- Full-text search using Postgres GIN index (no Elasticsearch needed at MVP scale)
- Featured events (curated by org/platform admin)
- Map-based discovery (latitude/longitude in events table)

### Ticket Purchase Flow (Consumer View)

```
1. Browse events → select tier → enter quantity (max: max_per_wallet)
2. Apply promo code (optional) — backend validates + shows discounted price
3. Confirm purchase → backend initiates mint (see Module 3 minting flow)
4. Success screen: digital ticket + QR code link
5. Email confirmation with ticket PDF (generated by BullMQ job)
```

### Digital Wallet & Ticket Management

- View owned tickets (paginated, filterable by upcoming / past)
- Each ticket shows: event name, tier, date, venue, QR code, transfer/resale options
- Transfer ticket: select ticket → enter recipient wallet / email → backend calls `safeTransferFrom`
- Resell ticket: list on resale marketplace (if enabled by org for that tier)
- Download ticket as PDF (server-generated, includes dynamic QR)

### Post-Event Features

- Access post-event collectible NFTs (issued by org after event ends)
- View loyalty badges earned
- Redeem discount tokens for future events from same org
- Access community/Discord links (if org grants community access)

### User Profile

- Update name, phone
- View wallet address (SARAL custodial — read-only, cannot change)
- View purchase history
- View referral code + referral earnings

---

## 13. Module 5 — Gate Scanner Application

**Who uses this:** Volunteers and Admins at event gates  
**URL:** /checkin (separate route group, installable as PWA)  
**Auth:** Same SARAL SSO → but lands on /checkin/{eventId} after login

### Architecture: PWA with Offline Cache

The Scanner App is a **Progressive Web App** built with Next.js + next-pwa. Gate staff install it to their phone home screen. It works offline.

#### Online Mode (Primary)

```
1. Volunteer scans QR → frontend decodes QR payload
2. POST /api/volunteer/checkin/verify { qrPayload, deviceId }
3. Backend:
   a. Decode QR payload (ticketId + nonce + timestamp + HMAC signature)
   b. Verify HMAC signature (ticketId + nonce + timestamp, key = ticket.qr_secret)
   c. Check nonce exists in Redis (key: qr:nonce:{ticketId}:{nonce}) — must be active
   d. Check ticket status = 'valid' in Postgres
   e. Check wallet not blacklisted
   f. Check zone_access matches volunteer's permitted zones
   g. Attempt INSERT into checkins (unique index prevents double-entry)
   h. If success: UPDATE tickets SET status='used' → broadcast via WebSocket
4. Scanner shows GREEN (admit) or RED (deny) with reason
```

#### Offline Mode (Fallback)

See Section 24 for full IndexedDB snapshot implementation.

### Real-Time Gate Stats (WebSocket)

Volunteers and admins see live check-in count update in real-time:

```
Backend: On each successful check-in →
  redis.publish(`event:${eventId}:checkins`, JSON.stringify({ count, tierBreakdown }))

Frontend: Socket.IO client subscribes to event room →
  Updates live counter on screen without page refresh
```

### Scanner UI Requirements

- Full-screen camera QR scan (jsQR or ZXing)
- NFC scan button (Web NFC API on supported Android devices)
- Large, high-contrast result: ✅ ADMIT (green) / ❌ DENY (red) + reason
- Live counter: "247 / 500 checked in"
- Recent scans log (last 10, stored locally)
- Offline mode indicator badge
- Battery-friendly: camera auto-pauses after 5 seconds of inactivity

### Zone-Based Access

For multi-zone events (e.g. GA, VIP, Backstage):
- Each gate volunteer is assigned zones via `event_member_permissions.zone_access`
- Backend checks ticket tier's zone against volunteer's permitted zones
- Backstage scanner cannot admit GA tickets

---

## 14. Module 6 — Resale Marketplace

### Anti-Scalping Architecture

Scalping prevention is enforced at **three layers**:

| Layer | Mechanism |
|---|---|
| Smart Contract | `TicketMarketplace.buyTicket()` reverts if `msg.value > maxPriceWei` |
| Application | `resale_listings.ask_price_wei` validated against cap before creating listing |
| Policy | `events.resale_price_cap_bps` set by org (e.g. 15000 = max 150% of face price) |

### Resale Listing Flow

```
1. Consumer: POST /api/tickets/{ticketId}/resell { askPriceWei }
2. Backend validates:
   - Ticket status = 'valid' (not used or transferred)
   - Resale enabled for this tier (check tier override → event default)
   - askPriceWei ≤ (face_price_wei * resale_price_cap_bps / 10000)
   - Wallet not blacklisted
3. Create resale_listings record
4. Update ticket.status = 'listed_for_resale'
5. Call TicketMarketplace contract: listTicket(...)
6. Listing appears in marketplace
```

### Resale Purchase Flow

```
1. Buyer: POST /api/marketplace/listings/{listingId}/buy
2. Backend validates:
   - Listing is active
   - Buyer wallet has sufficient balance
3. Call TicketMarketplace.buyTicket() — contract handles all distribution:
   a. royaltyBps % → org wallet (EIP-2981)
   b. platformCommissionBps % → TicketChain deployer wallet
   c. Remainder → seller wallet
4. Await confirmation
5. Update: listing.status = 'sold', ticket.owner_wallet = buyer, ticket.status = 'valid'
6. Update ticket_transfers record
7. Invalidate old QR nonce in Redis; generate new QR secret for new owner
8. Email both parties: seller (sale receipt) + buyer (ticket confirmation)
```

### Royalty Distribution (EIP-2981)

Royalties are enforced **on-chain** in the TicketMarketplace contract. The application cannot bypass them. Flow:

```
Sale price: 150 MSTC
Royalty (5% / 500 bps): 7.5 MSTC → org wallet
Platform fee (2% / 200 bps): 3 MSTC → TicketChain wallet
Net to seller: 139.5 MSTC
```

---

## 15. Module 7 — Finance & Settlement System

### Revenue Flow

```
Ticket sale:
  Gross revenue = ticket price in wei
  Platform commission = gross * org.platform_commission_bps / 10000
  Net to org = gross - commission
  
  On-chain: full price goes to EventTickets1155 contract
  Off-chain: commission is tracked in settlements table
  Payout: on settlement, contract.withdrawFunds() sends net to org wallet
           platform commission is retained by TicketChain deployer wallet
```

### Settlement Lifecycle

```
1. Event ends (status → 'ended')
2. BullMQ worker triggers: CreateSettlementJob
3. Worker computes:
   - gross_revenue_wei  = SUM of all confirmed ticket prices for this event
   - platform_commission_wei = gross * commission_bps / 10000
   - royalties_paid_wei = SUM of royalties from resale_listings (settled)
   - refunds_issued_wei = SUM of processed refunds
   - net_payout_wei     = gross - commission - refunds
4. Creates settlements record (status: pending)
5. Platform Admin reviews → approves
6. System calls EventTickets1155.withdrawFunds(orgWallet)
7. settlements.status = 'completed'; settled_at = NOW()
8. GST invoice generated if org.gst_number is set
9. Email to org Super Admin: settlement summary + invoice PDF
```

### GST Invoice Generation

```
If org.gst_applicable = true:
  GST amount = platform_commission_wei * 0.18 (18% GST on platform fee)
  Invoice includes: org name, GST number, commission amount, GST amount, total
  Invoice PDF generated via BullMQ job and emailed to org Super Admin
  invoice_number = INV-{year}-{orgSlug}-{sequential_number}
```

### Refund Processing

```
Consumer requests refund (only for cancelled events; org discretion otherwise):
  POST /api/tickets/{ticketId}/refund  { reason }
  → Creates refunds record (status: pending)
  → Org Super Admin reviews in dashboard
  → Approves: BullMQ job processes on-chain refund
              ticket.status = 'cancelled'
              refunds.status = 'processed'
              settlement.refunds_issued_wei updated
  → Rejects: refunds.status = 'rejected'; consumer notified via email
```

### Org Earnings Dashboard

Accessible to Super Admins and Admins:
- Total earned (all time / by date range)
- Per-event revenue breakdown
- Commission deducted
- Royalties earned from resale
- Refunds issued
- Pending settlement amount
- Completed settlement history (downloadable CSV)
- GST invoices (downloadable PDF)

---

## 16. Module 8 — Fraud Detection Engine

### Fraud Signals Monitored

| Signal | Threshold | Action |
|---|---|---|
| Bulk purchase | >4 tickets from same wallet/IP in 5 minutes | Flag + rate limit |
| Multiple wallets from same device fingerprint | >3 wallets per device per event | Flag |
| Suspicious wallet activity | New wallet + large purchase within 1 hour of event | Flag |
| QR duplicate scan | Same ticket scanned twice | Deny second scan; log fraud_logs |
| Blacklisted wallet attempts purchase | Any attempt | Hard deny |
| Resale price manipulation | Listing above price cap | Hard deny at app + contract level |
| Bot-pattern purchase | Purchase within 100ms of ticket sale start | FingerprintJS check |

### Device Fingerprinting Integration

```typescript
// Frontend: FingerprintJS Pro on every purchase attempt
import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';

const fp = await FingerprintJS.load({ apiKey: env.NEXT_PUBLIC_FP_API_KEY });
const result = await fp.get();
const visitorId = result.visitorId;  // Send this with purchase request
```

```typescript
// Backend: fraud check before processing any mint
async function checkFraud(
  userId: string,
  tierId: string,
  ip: string,
  fingerprint: string,
  walletAddress: string
): Promise<{ allowed: boolean; reason?: string }> {

  const redis = getRedisClient();
  const eventId = await getEventIdFromTier(tierId);

  // 1. Blacklist check (Redis cache of blacklisted wallets, refreshed every 5 min)
  const isBlacklisted = await redis.sIsMember('blacklisted:wallets', walletAddress);
  if (isBlacklisted) {
    await logFraud('blacklisted_wallet_attempt', userId, walletAddress, eventId, ip, fingerprint);
    return { allowed: false, reason: 'WALLET_BLACKLISTED' };
  }

  // 2. Bulk purchase check (Redis counter per ip+event)
  const bulkKey = `fraud:bulk:${ip}:${eventId}`;
  const purchases = await redis.incr(bulkKey);
  await redis.expire(bulkKey, 300); // 5-minute window
  if (purchases > 4) {
    await logFraud('bulk_purchase', userId, walletAddress, eventId, ip, fingerprint);
    return { allowed: false, reason: 'BULK_PURCHASE_DETECTED' };
  }

  // 3. Device fingerprint check (multiple wallets same device per event)
  const fpKey = `fraud:fp:${fingerprint}:${eventId}`;
  const walletCount = await redis.sCard(fpKey);
  await redis.sAdd(fpKey, walletAddress);
  await redis.expire(fpKey, 86400); // 24hr window
  if (walletCount >= 3) {
    await logFraud('fingerprint_abuse', userId, walletAddress, eventId, ip, fingerprint);
    return { allowed: false, reason: 'DEVICE_ABUSE_DETECTED' };
  }

  return { allowed: true };
}
```

### Fraud Alert Dashboard (Platform Admin)

- Real-time feed of fraud_logs (severity-sorted)
- One-click blacklist wallet from fraud alert
- View fraud attempts per event
- Export fraud report CSV

---

## 17. Module 9 — Marketing & Loyalty System

### Promo Code Engine

```typescript
// Validation at purchase time
async function validatePromoCode(
  code: string,
  tierId: string,
  userId: string
): Promise<{ valid: boolean; discountWei: bigint; reason?: string }> {
  const promo = await db.oneOrNone(
    `SELECT * FROM promo_codes
     WHERE code = $1 AND status = 'active'
       AND (event_id IS NULL OR event_id = (SELECT event_id FROM ticket_tiers WHERE id = $2))
       AND (tier_id IS NULL OR tier_id = $2)
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until >= NOW())`,
    [code, tierId]
  );

  if (!promo) return { valid: false, reason: 'INVALID_CODE', discountWei: 0n };
  if (promo.uses_remaining !== null && promo.uses_remaining <= 0) {
    return { valid: false, reason: 'CODE_EXHAUSTED', discountWei: 0n };
  }

  // Check max per user
  const userUses = await db.one<{ count: string }>(
    `SELECT COUNT(*) FROM tickets WHERE promo_code_used = $1 AND owner_user_id = $2`,
    [code, userId]
  );
  if (parseInt(userUses.count) >= promo.max_per_user) {
    return { valid: false, reason: 'MAX_USES_REACHED', discountWei: 0n };
  }

  const tierPrice = await getTierPriceWei(tierId);
  let discountWei: bigint;
  if (promo.discount_type === 'percentage') {
    discountWei = (tierPrice * BigInt(promo.discount_value)) / 10000n;
  } else {
    discountWei = BigInt(promo.discount_value);
  }

  return { valid: true, discountWei };
}
```

### Referral System

```
1. Each user has a unique referral code (stored in users table or derived from userId)
2. Consumer shares referral link: https://ticketchain.com/events/{eventId}?ref={code}
3. New user signs up via referral link → referrals record created
4. On new user's first purchase → trigger ReferralRewardJob
5. Reward issued to referrer (promo credit / loyalty badge / discount token)
6. Both users notified via email
```

### Loyalty Program

Events can configure loyalty rewards distributed post-event:

```typescript
// PostEventLoyaltyJob (triggered when event.status → 'ended')
const rewards: LoyaltyReward[] = [];

for (const ticket of checkedInTickets) {
  rewards.push({
    user_id:       ticket.owner_user_id,
    org_id:        event.org_id,
    event_id:      event.id,
    reward_type:   'attendance_badge',
    reward_metadata: {
      badge_name:  `${event.name} — Attendee`,
      event_date:  event.event_date,
      tier:        ticket.tier_name,
    }
  });
}

// If org configured collectible NFT: mint LoyaltyBadge NFT to each attendee
// If org configured discount token: create promo_code for next event
```

### Email Campaigns

Org admins can send targeted emails to ticket holders:

- Pre-event reminder (24h before)
- Event day logistics (schedule, parking, rules)
- Post-event thank-you + loyalty rewards notification
- Future event early access announcement

All emails go through BullMQ → SendGrid. Rate-limited to avoid spam classification.

---

## 18. Module 10 — Post-Event Utility

After `event.status` transitions to `ended`, the following is distributed automatically via BullMQ jobs:

### Collectible NFTs (if configured)

```
1. Org admin configured: "Issue attendance collectible NFT"
2. PostEventCollectibleJob:
   - Query all tickets WHERE event_id = X AND status = 'used'
   - For each: call LoyaltyBadge contract.mint(ownerWallet, collectibleTokenId)
   - Write loyalty_rewards record
   - Email attendee: "Your TechFest 2026 collectible NFT is in your wallet"
```

### VIP Unlocks (if configured)

```
If tier.name contains 'VIP' and org has configured VIP unlock:
- Issue loyalty_rewards record with reward_type = 'vip_unlock'
- Email with access link to VIP community (Discord invite / private URL)
- Reward expires based on org configuration
```

### Future Discount Tokens

```
Org can configure: "Attendees get 15% off next event"
PostEventDiscountJob:
  - Generate unique promo_codes for each attendee (or a shared code with per-user limit)
  - Write promo_codes record
  - Email to each attendee with the promo code
```

### CPD / Attendance Certificates (for Conferences)

```
For conference-type events (category = 'conference'):
Org can configure certificate template
PostEventCertificateJob:
  - Generate PDF certificate per checked-in attendee
  - Include: attendee name, event name, date, CPD hours
  - Issue as loyalty_reward with reward_type = 'attendance_badge'
  - Email PDF to attendee
```

---

## 19. Multi-Tenant & White-Label Architecture

### Tenant Isolation

Every query that touches tenant data includes an `org_id` condition:

```typescript
// Example: orgs can NEVER see each other's events
const events = await db.any(
  `SELECT * FROM events WHERE org_id = $1 AND deleted_at IS NULL ORDER BY event_date`,
  [req.user.orgId]  // always from JWT — not from request body
);
// NEVER: trust orgId from req.body — always use JWT payload
```

### Custom Domain Routing (White-Label)

```
                    DNS → ticketchain-wl.yourplatform.com
                             │
                    Cloudflare Worker
                             │
               reads Host header from request
                             │
          looks up org by Host in org_white_label_config
                             │
              injects org branding tokens (colors, logo)
                             │
           renders Next.js app with org theme applied
```

Implementation:

```typescript
// apps/web/src/middleware.ts (Next.js middleware)
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const isCustomDomain = !host.includes('ticketchain.com');

  if (isCustomDomain) {
    // Rewrite to same Next.js app but inject org context via header
    const response = NextResponse.rewrite(req.url);
    response.headers.set('x-org-domain', host);
    return response;
  }
}
```

```typescript
// Backend: resolve org from custom domain
async function getOrgByDomain(domain: string) {
  return db.oneOrNone(
    `SELECT o.*, wl.* FROM organisations o
     JOIN org_white_label_config wl ON wl.org_id = o.id
     WHERE wl.custom_domain = $1 AND o.status = 'active'`,
    [domain]
  );
}
```

### Subscription Plan Enforcement

```typescript
// Middleware: check plan limits before creating events
async function checkPlanLimits(orgId: string, action: 'create_event' | 'enable_resale' | 'api_access') {
  const org = await getOrgWithPlan(orgId);
  const plan = await getPlan(org.subscription_plan);

  if (action === 'create_event' && plan.max_events !== null) {
    const eventCount = await countActiveEvents(orgId);
    if (eventCount >= plan.max_events) throw new PlanLimitError('Event limit reached');
  }
  if (action === 'enable_resale' && !plan.resale_enabled) {
    throw new PlanLimitError('Resale requires Growth or Enterprise plan');
  }
  if (action === 'api_access' && !plan.api_access_enabled) {
    throw new PlanLimitError('API access requires Enterprise plan');
  }
}
```

---

## 20. API Architecture & Complete Endpoints

### Global Conventions

**Request validation:** Every route uses Zod schema middleware. Invalid requests return `400` with field-level errors before hitting the controller.

**Response envelope:**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;       // machine-readable error code: 'TIER_SOLD_OUT', 'WALLET_BLACKLISTED'
  meta?: {
    page: number;
    limit: number;
    total: number;
    nextCursor?: string;
  };
}
```

**Pagination:** All list endpoints support `?page=1&limit=20&cursor=<uuid>` (cursor preferred).

**Idempotency:** Mint and settlement endpoints require `Idempotency-Key: <client-uuid>` header.

---

### Platform Admin Routes — `/api/platform`
*Requires: PLATFORM_ADMIN cookie (email+bcrypt auth)*

```
POST   /api/auth/platform-login                       ← email + password
POST   /api/auth/platform-refresh
POST   /api/auth/platform-logout

GET    /api/platform/dashboard                        ← platform-wide stats
GET    /api/platform/organisations                    ← list all orgs (paginated + filterable)
POST   /api/platform/organisations                    ← create org (offline onboarding)
GET    /api/platform/organisations/:orgId             ← org details
PATCH  /api/platform/organisations/:orgId             ← update org
DELETE /api/platform/organisations/:orgId             ← soft delete
PATCH  /api/platform/organisations/:orgId/status      ← suspend / reactivate
PATCH  /api/platform/organisations/:orgId/verify      ← approve / reject KYC
PATCH  /api/platform/organisations/:orgId/plan        ← change subscription plan
POST   /api/platform/organisations/:orgId/api-key     ← generate new API key

GET    /api/platform/events                           ← all events all orgs (paginated, filterable)
GET    /api/platform/tickets                          ← all tickets (paginated, filterable)

GET    /api/platform/admins                           ← list platform admins
POST   /api/platform/admins                           ← invite platform admin
PATCH  /api/platform/admins/:adminId                  ← update / suspend
DELETE /api/platform/admins/:adminId                  ← remove

GET    /api/platform/settlements                      ← all pending settlements
PATCH  /api/platform/settlements/:id/approve          ← approve → triggers payout job
GET    /api/platform/settlements/:id                  ← settlement details

GET    /api/platform/refunds                          ← all refund requests
PATCH  /api/platform/refunds/:id/review               ← approve / reject refund

GET    /api/platform/fraud-logs                       ← all fraud alerts (severity-sorted)
POST   /api/platform/fraud-logs/:id/resolve           ← mark resolved
POST   /api/platform/blacklist                        ← add wallet to blacklist
DELETE /api/platform/blacklist/:walletAddress         ← remove from blacklist

GET    /api/platform/audit-logs                       ← query audit logs (paginated + filterable)
GET    /api/platform/blockchain/health                ← RPC health, deployer balance, gas stats
```

---

### Auth Routes — `/api/auth`

```
POST   /api/auth/identify                             ← SARAL token → issue cookie (Path B)
POST   /api/auth/refresh                              ← rotate refresh token → new access token
POST   /api/auth/logout                               ← clear cookies, revoke refresh token
GET    /api/auth/me                                   ← current user profile + role
POST   /api/auth/accept-invite                        ← accept org invite via token
```

---

### Organisation Admin Routes — `/api/admin`
*Requires: ADMIN or SUPER_ADMIN + org membership from JWT*

```
GET    /api/admin/organisation                        ← org details + stats dashboard
PATCH  /api/admin/organisation                        ← update org details (SUPER_ADMIN only)
PATCH  /api/admin/organisation/branding               ← white-label config (SUPER_ADMIN only)

GET    /api/admin/members                             ← list members (paginated)
POST   /api/admin/members/invite                      ← invite admin or volunteer
PATCH  /api/admin/members/:memberId                   ← update role or status
DELETE /api/admin/members/:memberId                   ← remove member

GET    /api/admin/venues                              ← list org venues
POST   /api/admin/venues                              ← create venue
PATCH  /api/admin/venues/:venueId                     ← update venue
DELETE /api/admin/venues/:venueId                     ← soft delete

GET    /api/admin/events                              ← list org events (paginated + filterable)
POST   /api/admin/events                              ← create event
GET    /api/admin/events/:eventId                     ← event details
PATCH  /api/admin/events/:eventId                     ← update event
DELETE /api/admin/events/:eventId                     ← soft delete (SUPER_ADMIN only)
POST   /api/admin/events/:eventId/deploy              ← deploy smart contract
POST   /api/admin/events/:eventId/publish             ← publish event
POST   /api/admin/events/:eventId/go-live             ← open check-in gate
POST   /api/admin/events/:eventId/end                 ← end event + trigger post-event jobs
POST   /api/admin/events/:eventId/cancel              ← cancel + trigger refunds

GET    /api/admin/events/:eventId/tiers               ← list tiers
POST   /api/admin/events/:eventId/tiers               ← create tier
PATCH  /api/admin/events/:eventId/tiers/:tierId       ← update tier (draft only)
DELETE /api/admin/events/:eventId/tiers/:tierId       ← soft delete (draft only)
POST   /api/admin/events/:eventId/tiers/:tierId/upload-image  ← S3 → IPFS pipeline

GET    /api/admin/events/:eventId/analytics           ← sales + attendance stats
GET    /api/admin/events/:eventId/tickets             ← all tickets for event (paginated)
GET    /api/admin/events/:eventId/checkins            ← check-in log (paginated)
GET    /api/admin/events/:eventId/checkins/live       ← WebSocket upgrade → live gate stream

GET    /api/admin/promo-codes                         ← list org promo codes
POST   /api/admin/promo-codes                         ← create promo code
PATCH  /api/admin/promo-codes/:id                     ← update (pause / unpause)
DELETE /api/admin/promo-codes/:id                     ← delete

GET    /api/admin/finance/earnings                    ← earnings report (date range)
GET    /api/admin/finance/settlements                 ← settlement history
GET    /api/admin/finance/refunds                     ← refund requests
POST   /api/admin/finance/refunds/:id/review          ← approve / reject refund
GET    /api/admin/finance/settlements/:id/invoice     ← download GST invoice PDF

GET    /api/admin/fraud-logs                          ← org-scoped fraud alerts
POST   /api/admin/blacklist                           ← blacklist wallet (scoped to org events)

GET    /api/admin/audit-logs                          ← org-scoped audit logs
```

---

### Volunteer Routes — `/api/volunteer`
*Requires: VOLUNTEER + event assignment from event_member_permissions*

```
GET    /api/volunteer/events                          ← assigned events only
GET    /api/volunteer/events/:eventId                 ← event detail + gate info

POST   /api/volunteer/checkin/verify                  ← verify QR or NFC → mark used
GET    /api/volunteer/checkin/stats                   ← live attendance summary
GET    /api/volunteer/checkin/history                 ← scan log (paginated)
GET    /api/volunteer/checkin/offline-snapshot        ← download IndexedDB snapshot for offline use
```

---

### Consumer Routes — `/api`
*Public for browsing; authenticated for purchases*

```
GET    /api/events                                    ← browse events (paginated + filterable + full-text search)
GET    /api/events/:eventId                           ← event details + tier availability
GET    /api/events/:eventId/tiers                     ← tier list with live availability
GET    /api/events/featured                           ← curated featured events

POST   /api/tickets/mint                              ← purchase ticket (Idempotency-Key required)
POST   /api/tickets/mint/validate-promo               ← validate promo code without purchasing
GET    /api/tickets                                   ← my tickets (paginated)
GET    /api/tickets/:ticketId                         ← ticket details
GET    /api/tickets/:ticketId/qr                      ← generate dynamic QR (60s nonce)
POST   /api/tickets/:ticketId/transfer                ← gift transfer to another wallet/email
POST   /api/tickets/:ticketId/resell                  ← list on resale marketplace
DELETE /api/tickets/:ticketId/resell                  ← cancel resale listing

GET    /api/marketplace                               ← browse active resale listings
GET    /api/marketplace/:listingId                    ← listing detail
POST   /api/marketplace/:listingId/buy                ← purchase from resale (Idempotency-Key required)

GET    /api/profile                                   ← user profile
PATCH  /api/profile                                   ← update profile
GET    /api/profile/wallet                            ← wallet + balance
GET    /api/profile/rewards                           ← loyalty rewards + badges
GET    /api/profile/referral                          ← referral code + stats
```

---

### Webhooks — `/api/webhooks`
*HMAC-verified. Reject any request with invalid signature.*

```
POST   /api/webhooks/saral                            ← SARAL auth callbacks
POST   /api/webhooks/blockchain                       ← on-chain event stream (TicketMinted, etc.)
POST   /api/webhooks/payments                         ← fiat payment gateway confirmation
```

### Webhook HMAC Validation

```typescript
// apps/api/src/middleware/webhookValidator.ts
export function validateWebhookHMAC(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers['x-webhook-signature'] as string;
    const payload = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      return;
    }
    next();
  };
}
```

### Rate Limiting Per Route

```typescript
// apps/api/src/middleware/rateLimiter.ts
export const rateLimits = {
  global:        { windowMs: 60_000, max: 100  },  // 100 req/min per IP
  auth:          { windowMs: 60_000, max: 10   },  // 10 login attempts/min
  mintTicket:    { windowMs: 60_000, max: 5    },  // 5 purchase attempts/min per user
  promoValidate: { windowMs: 60_000, max: 20   },  // 20 promo checks/min
  checkin:       { windowMs: 60_000, max: 120  },  // 2 scans/sec for volunteers
  publicEvents:  { windowMs: 60_000, max: 300  },  // Higher for public browsing
  webhooks:      { windowMs: 60_000, max: 500  },  // High for blockchain events
} as const;
```

---

## 21. Queue System & Background Workers

### BullMQ Job Definitions

```typescript
// apps/api/src/shared/queue/queue.types.ts

export type JobName =
  | 'email.send'
  | 'email.ticket_confirmation'
  | 'blockchain.confirm_mint'
  | 'blockchain.confirm_transfer'
  | 'orphan.reconcile'
  | 'settlement.create'
  | 'settlement.process'
  | 'refund.process'
  | 'post_event.distribute_rewards'
  | 'post_event.distribute_collectibles'
  | 'post_event.generate_certificates'
  | 'invite.expire'
  | 'fraud.alert_notify'
  | 'promo.expire';
```

### Critical Workers

**orphan-reconcile.worker.ts** (every 5 minutes)
```typescript
// Find all mint_idempotency where status='pending' AND expires_at < NOW()
// For each:
//   if transaction_hash exists: check on-chain confirmation
//     → confirmed on-chain: status='confirmed', create tickets record
//     → not on chain: status='failed', decrement tier.minted, restore Redis counter
//   if no transaction_hash: status='failed', decrement tier.minted, restore Redis counter
```

**blockchain-confirm.worker.ts**
```typescript
// Polls for transaction receipt on pending blockchain operations
// Exponential backoff: 2s → 4s → 8s → 16s → 32s (max 5 retries)
// On confirmation: update DB record, send email, update Redis counters
// On failure (5 retries exhausted): mark failed, trigger orphan-reconcile
```

**settlement.worker.ts**
```typescript
// Triggered: event.status → 'ended'
// 1. Compute settlement amounts for the event
// 2. Create settlements record
// 3. (Optional) Auto-approve if below threshold; else wait for platform admin
// 4. On approval: call EventTickets1155.withdrawFunds(orgWallet)
// 5. Generate GST invoice PDF if applicable
// 6. Email org Super Admin
```

**post-event.worker.ts**
```typescript
// Triggered: event.status → 'ended'
// Sequential jobs (not parallel — chain them):
// 1. post_event.distribute_rewards
// 2. post_event.distribute_collectibles (if configured)
// 3. post_event.generate_certificates (if conference)
```

---

## 22. Real-Time Infrastructure (WebSocket)

### Technology: Socket.IO (server + client)

```typescript
// apps/api/src/shared/realtime/socket.service.ts
import { Server } from 'socket.io';
import { verifyAccessToken } from '../modules/auth/token.service';

export function initSocketIO(httpServer: http.Server) {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  // Authenticate socket connections via cookie
  io.use((socket, next) => {
    const token = socket.handshake.headers.cookie
      ?.split(';')
      .find(c => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    const payload = verifyAccessToken(token ?? '');
    if (!payload) return next(new Error('Unauthorized'));
    socket.data.user = payload;
    next();
  });

  io.on('connection', (socket) => {
    // Volunteer/admin joins event room on connect
    socket.on('join:event', (eventId: string) => {
      socket.join(`event:${eventId}:checkins`);
    });
  });

  return io;
}

// Emit from checkin service on each successful scan:
// io.to(`event:${eventId}:checkins`).emit('checkin:update', { count, tierBreakdown })
```

### Redis Pub/Sub Integration

```typescript
// Subscriber (in Socket.IO server process)
const subscriber = redis.duplicate();
await subscriber.subscribe('event:*:checkins');

subscriber.on('message', (channel, message) => {
  const eventId = channel.split(':')[1];
  io.to(`event:${eventId}:checkins`).emit('checkin:update', JSON.parse(message));
});
```

---

## 23. Dynamic QR & NFC Implementation

### Why Dynamic QR (Not Static)?

A static QR code (just ticketId) can be screenshot and shared. A dynamic QR rotates every 60 seconds with a server-validated nonce — screenshots become useless in under a minute.

### Dynamic QR Architecture

```
QR Payload Structure (JSON, base64-encoded in QR):
{
  "tid":  "ticket-uuid",       // ticket ID
  "ts":   1748000000,          // Unix timestamp of generation
  "n":    "abc123xyz",         // random nonce (stored in Redis with 60s TTL)
  "sig":  "hmac_sha256_hex"    // HMAC-SHA256(tid + ts + n, ticket.qr_secret)
}
```

**QR Generation (backend — called every 60 seconds from frontend)**

```typescript
// GET /api/tickets/:ticketId/qr
async function generateDynamicQR(ticketId: string, userId: string) {
  const ticket = await getTicketForUser(ticketId, userId);  // validates ownership
  if (ticket.status !== 'valid') throw new InvalidTicketError();

  const nonce = crypto.randomBytes(16).toString('hex');
  const ts = Math.floor(Date.now() / 1000);

  // Sign: HMAC-SHA256(ticketId + ts + nonce, qr_secret)
  const sig = crypto.createHmac('sha256', ticket.qr_secret)
    .update(`${ticketId}:${ts}:${nonce}`)
    .digest('hex');

  // Store nonce in Redis with 90-second TTL (60s display + 30s grace)
  await redis.set(`qr:nonce:${ticketId}:${nonce}`, '1', { EX: 90 });

  const payload = Buffer.from(JSON.stringify({ tid: ticketId, ts, n: nonce, sig }))
    .toString('base64');

  return { payload, expiresIn: 60 };  // frontend refreshes every 60s
}
```

**QR Verification (backend — at gate)**

```typescript
async function verifyQRPayload(
  qrPayload: string,
  volunteerId: string,
  deviceId: string
): Promise<VerifyResult> {
  const { tid, ts, n, sig } = JSON.parse(Buffer.from(qrPayload, 'base64').toString());

  // 1. Timestamp freshness check (reject if > 90 seconds old)
  const age = Math.floor(Date.now() / 1000) - ts;
  if (age > 90) return { success: false, reason: 'QR_EXPIRED' };

  // 2. Nonce check in Redis (must still be active)
  const nonceActive = await redis.get(`qr:nonce:${tid}:${n}`);
  if (!nonceActive) return { success: false, reason: 'QR_EXPIRED' };

  // 3. Verify HMAC signature
  const ticket = await db.one<Ticket>(`SELECT * FROM tickets WHERE id = $1`, [tid]);
  const expected = crypto.createHmac('sha256', ticket.qr_secret)
    .update(`${tid}:${ts}:${n}`)
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { success: false, reason: 'INVALID_SIGNATURE' };
  }

  // 4. Ticket status check
  if (ticket.status !== 'valid') {
    return { success: false, reason: ticket.status === 'used' ? 'ALREADY_USED' : 'INVALID_TICKET' };
  }

  // 5. Blacklist check
  const blacklisted = await redis.sIsMember('blacklisted:wallets', ticket.owner_wallet_address);
  if (blacklisted) return { success: false, reason: 'WALLET_BLACKLISTED' };

  // 6. Atomic write to checkins (unique index prevents race)
  try {
    await db.none(
      `INSERT INTO checkins (event_id, ticket_id, checked_in_by_id, qr_signature, qr_nonce,
         qr_timestamp, scan_method, verification_success, zone_accessed, device_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'qr', TRUE, $7, $8)`,
      [ticket.event_id, tid, volunteerId, sig, n, ts, ticket.zone, deviceId]
    );
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) return { success: false, reason: 'ALREADY_USED' };
    throw err;
  }

  // 7. Mark ticket used + invalidate nonce
  await Promise.all([
    db.none(`UPDATE tickets SET status='used', used_at=NOW(), used_by_volunteer_id=$1 WHERE id=$2`,
      [volunteerId, tid]),
    redis.del(`qr:nonce:${tid}:${n}`),
    // Broadcast to event WebSocket room
    redis.publish(`event:${ticket.event_id}:checkins`, JSON.stringify({ ticketId: tid })),
  ]);

  return { success: true, ticket };
}
```

### NFC Implementation

```typescript
// Frontend (Scanner PWA) — Web NFC API (Android Chrome only)
async function startNFCScan() {
  if (!('NDEFReader' in window)) {
    alert('NFC not supported on this device');
    return;
  }
  const reader = new NDEFReader();
  await reader.scan();

  reader.addEventListener('reading', ({ message }) => {
    for (const record of message.records) {
      if (record.recordType === 'text') {
        const payload = new TextDecoder().decode(record.data);
        // payload is the same base64 QR payload — same verification flow
        verifyTicket(payload, 'nfc');
      }
    }
  });
}
```

NFC tickets work identically to QR tickets at the backend level — same payload structure, same verification endpoint. The `scan_method` field in checkins records whether it was QR or NFC.

---

## 24. Offline Verification Cache

### Problem

Gate venues may have unreliable internet. If the backend is unreachable, gate staff are stuck.

### Solution: IndexedDB Snapshot + Sync-on-Reconnect

```typescript
// Offline snapshot structure (stored in IndexedDB via idb library)
interface OfflineSnapshot {
  eventId:      string;
  generatedAt:  number;  // Unix timestamp
  expiresAt:    number;  // generatedAt + 4 hours
  tickets: Array<{
    id:             string;
    tokenId:        number;
    ownerWallet:    string;
    tierName:       string;
    zone:           string;
    status:         'valid' | 'used';
    qr_secret:      string;  // HMAC secret — needed for offline sig verification
  }>;
  blacklistedWallets: string[];
}
```

**Snapshot Generation (backend):**

```typescript
// GET /api/volunteer/checkin/offline-snapshot
// Returns encrypted snapshot for the volunteer's assigned event
// Volunteer downloads this when online; it lasts 4 hours
async function generateOfflineSnapshot(eventId: string, volunteerId: string) {
  const [tickets, blacklist] = await Promise.all([
    db.any(`SELECT t.id, t.token_id, t.owner_wallet_address, t.status,
                   t.zone, t.qr_secret, tt.name as tier_name
            FROM tickets t
            JOIN ticket_tiers tt ON tt.id = t.tier_id
            WHERE t.event_id = $1 AND t.status != 'cancelled'`, [eventId]),
    db.any(`SELECT wallet_address FROM blacklisted_wallets`),
  ]);

  // Encrypt snapshot with volunteer session key before sending
  // (so qr_secrets are not in plaintext in browser storage)
  return encrypt({ eventId, tickets, blacklistedWallets: blacklist.map(b => b.wallet_address),
                   generatedAt: Date.now(), expiresAt: Date.now() + 4*60*60*1000 });
}
```

**Offline Scan (frontend, IndexedDB + HMAC):**

```typescript
async function verifyOffline(qrPayload: string, deviceId: string) {
  const snapshot = await getOfflineSnapshot();    // from IndexedDB
  if (!snapshot || Date.now() > snapshot.expiresAt) {
    return { success: false, reason: 'SNAPSHOT_EXPIRED_PLEASE_RECONNECT' };
  }

  const { tid, ts, n, sig } = JSON.parse(atob(qrPayload));

  // Age check
  if (Math.floor(Date.now() / 1000) - ts > 90) return { success: false, reason: 'QR_EXPIRED' };

  const ticket = snapshot.tickets.find(t => t.id === tid);
  if (!ticket) return { success: false, reason: 'TICKET_NOT_FOUND' };
  if (ticket.status === 'used') return { success: false, reason: 'ALREADY_USED' };

  // Verify HMAC using local qr_secret from snapshot
  const expected = await hmacSHA256(`${tid}:${ts}:${n}`, ticket.qr_secret);
  if (sig !== expected) return { success: false, reason: 'INVALID_SIGNATURE' };

  if (snapshot.blacklistedWallets.includes(ticket.ownerWallet)) {
    return { success: false, reason: 'WALLET_BLACKLISTED' };
  }

  // Mark used locally (in IndexedDB) to prevent double-scan offline
  await markUsedInSnapshot(tid);

  // Queue for sync when online
  await addToSyncQueue({ type: 'checkin', ticketId: tid, ts: Date.now(), deviceId });

  return { success: true, ticket, offlineMode: true };
}
```

**Sync-on-Reconnect:**

```typescript
// When network comes back online (navigator.onLine event)
window.addEventListener('online', async () => {
  const pendingSyncs = await getSyncQueue();
  for (const sync of pendingSyncs) {
    try {
      await api.post('/api/volunteer/checkin/sync', sync);
      await removeSyncEntry(sync.id);
    } catch (err) {
      // If ticket already marked used server-side: ignore. Otherwise: flag for review.
    }
  }
});
```

---

## 25. Notification & Email System

### Email Templates (SendGrid Dynamic Templates)

| Template | Trigger | Recipients |
|---|---|---|
| `ticket_confirmation` | Ticket minted | Buyer |
| `ticket_transfer_sent` | Ticket transferred out | Sender |
| `ticket_transfer_received` | Ticket transferred in | Recipient |
| `resale_listed` | Ticket listed for resale | Seller |
| `resale_sold` | Resale purchase confirmed | Seller + Buyer |
| `org_invite_admin` | Admin invited to org | Invitee |
| `org_invite_volunteer` | Volunteer invited to event | Invitee |
| `event_reminder_24h` | 24h before event | All ticket holders |
| `settlement_complete` | Payout processed | Org Super Admin |
| `refund_approved` | Refund approved | Consumer |
| `refund_rejected` | Refund rejected | Consumer |
| `loyalty_reward` | Post-event reward issued | Attendee |
| `collectible_nft` | NFT collectible minted | Attendee |
| `kyc_approved` | Org KYC approved | Org Super Admin |
| `kyc_rejected` | Org KYC rejected | Org Super Admin |
| `fraud_alert` | High-severity fraud detected | Platform Admins |
| `promo_code` | Post-event discount issued | Attendee |

All emails queued via BullMQ `email.send` job → SendGrid API.

---

## 26. Security Architecture

### Authentication Security

- JWTs stored in HTTP-only, Secure, SameSite=Strict cookies — **never localStorage**
- RS256 signing (asymmetric key pair) — not HS256
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry, stored in Redis, rotated on every use
- Platform admin password: bcrypt, minimum 12 salt rounds
- Login rate limited: 10 attempts/min per IP (Redis-backed)

### Authorisation Security

- Every route has an explicit role guard — no unprotected sensitive endpoints
- Org membership verified on every org-scoped request via JWT payload (not request body)
- Volunteers can only access events they are explicitly assigned to (event_member_permissions)
- Platform admins cannot be impersonated via SARAL tokens (separate auth path, separate table)

### Blockchain & Financial Security

- Idempotency keys required on all mint and purchase requests
- Orphan reconciliation worker running every 5 minutes
- All wei values: NUMERIC(78,0) — no BIGINT, no FLOAT, no JavaScript number
- RPC failover: Alchemy as secondary (ethers.js FallbackProvider)
- Deployer private key in AWS Secrets Manager — never in .env file or code
- Smart contract royalties enforced on-chain — cannot be bypassed at app level

### QR & Ticket Security

- HMAC-signed dynamic QR with 60-second rotating nonce
- Screenshot-captured QR becomes invalid within 60–90 seconds
- Unique `qr_secret` per ticket — compromising one ticket's QR doesn't compromise others
- UNIQUE index on checkins(ticket_id) WHERE verification_success = TRUE — prevents race on double-scan

### Data Security

- Soft deletes on all financial/ticketing tables — audit trail preserved
- Audit logs are append-only — no UPDATE/DELETE on audit_logs table
- JSONB `changes` field stores before/after state on all mutations
- All queries scoped by `org_id` from JWT — no cross-tenant data possible
- Webhook HMAC signatures validated before processing (timing-safe compare)

### Infrastructure Security

- All secrets in AWS Secrets Manager — never committed to git
- Redis AUTH password required in production
- PostgreSQL only accessible from API/worker containers — no public exposure
- CORS restricted to exact production domain(s)
- Cloudflare in front of everything: DDoS protection, WAF, rate limiting at edge
- SSL/TLS on all endpoints; HSTS headers set

---

## 27. Monorepo Folder Structure

```
ticketchain/                            ← pnpm monorepo root
│
├── apps/
│   ├── api/                            ← Express.js backend (modular monolith)
│   │   ├── src/
│   │   │   ├── modules/                ← ONE FOLDER PER DOMAIN
│   │   │   │   ├── platform/           ← Platform Admin (TicketChain staff)
│   │   │   │   │   ├── platform.routes.ts
│   │   │   │   │   ├── platform.controller.ts
│   │   │   │   │   ├── platform.service.ts
│   │   │   │   │   ├── platform.repository.ts
│   │   │   │   │   └── platform.types.ts
│   │   │   │   │
│   │   │   │   ├── auth/               ← SARAL SSO, JWT, platform auth, refresh
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── saral.service.ts
│   │   │   │   │   ├── token.service.ts
│   │   │   │   │   └── auth.types.ts
│   │   │   │   │
│   │   │   │   ├── organisation/       ← Org CRUD, invites, white-label, KYC
│   │   │   │   │   ├── organisation.routes.ts
│   │   │   │   │   ├── organisation.controller.ts
│   │   │   │   │   ├── organisation.service.ts
│   │   │   │   │   ├── organisation.repository.ts
│   │   │   │   │   ├── invite.service.ts
│   │   │   │   │   ├── whitelabel.service.ts
│   │   │   │   │   └── organisation.types.ts
│   │   │   │   │
│   │   │   │   ├── events/             ← Event lifecycle, venues, tiers, contract deploy
│   │   │   │   │   ├── events.routes.ts
│   │   │   │   │   ├── events.controller.ts
│   │   │   │   │   ├── events.service.ts
│   │   │   │   │   ├── events.repository.ts
│   │   │   │   │   ├── tiers.service.ts
│   │   │   │   │   ├── venues.service.ts
│   │   │   │   │   └── events.types.ts
│   │   │   │   │
│   │   │   │   ├── tickets/            ← Minting, transfer, idempotency, QR gen
│   │   │   │   │   ├── tickets.routes.ts
│   │   │   │   │   ├── tickets.controller.ts
│   │   │   │   │   ├── tickets.service.ts
│   │   │   │   │   ├── tickets.repository.ts
│   │   │   │   │   ├── idempotency.service.ts
│   │   │   │   │   ├── qr.service.ts
│   │   │   │   │   └── tickets.types.ts
│   │   │   │   │
│   │   │   │   ├── checkin/            ← QR+NFC verification, offline sync, gate
│   │   │   │   │   ├── checkin.routes.ts
│   │   │   │   │   ├── checkin.controller.ts
│   │   │   │   │   ├── checkin.service.ts
│   │   │   │   │   ├── checkin.repository.ts
│   │   │   │   │   ├── offline-snapshot.service.ts
│   │   │   │   │   └── checkin.types.ts
│   │   │   │   │
│   │   │   │   ├── marketplace/        ← Resale listings, anti-scalping, royalties
│   │   │   │   │   ├── marketplace.routes.ts
│   │   │   │   │   ├── marketplace.controller.ts
│   │   │   │   │   ├── marketplace.service.ts
│   │   │   │   │   └── marketplace.types.ts
│   │   │   │   │
│   │   │   │   ├── finance/            ← Settlements, refunds, GST invoices
│   │   │   │   │   ├── finance.routes.ts
│   │   │   │   │   ├── finance.controller.ts
│   │   │   │   │   ├── finance.service.ts
│   │   │   │   │   ├── settlement.service.ts
│   │   │   │   │   ├── refund.service.ts
│   │   │   │   │   └── finance.types.ts
│   │   │   │   │
│   │   │   │   ├── fraud/              ← Detection, blacklist, device fingerprint
│   │   │   │   │   ├── fraud.routes.ts
│   │   │   │   │   ├── fraud.controller.ts
│   │   │   │   │   ├── fraud.service.ts
│   │   │   │   │   └── fraud.types.ts
│   │   │   │   │
│   │   │   │   ├── marketing/          ← Promo codes, referrals, loyalty, campaigns
│   │   │   │   │   ├── marketing.routes.ts
│   │   │   │   │   ├── marketing.controller.ts
│   │   │   │   │   ├── marketing.service.ts
│   │   │   │   │   ├── promo.service.ts
│   │   │   │   │   ├── referral.service.ts
│   │   │   │   │   ├── loyalty.service.ts
│   │   │   │   │   └── marketing.types.ts
│   │   │   │   │
│   │   │   │   └── consumer/           ← Public browsing, profile, wallet
│   │   │   │       ├── consumer.routes.ts
│   │   │   │       ├── consumer.controller.ts
│   │   │   │       ├── consumer.service.ts
│   │   │   │       └── consumer.types.ts
│   │   │   │
│   │   │   ├── shared/                 ← Cross-module services (no business logic)
│   │   │   │   ├── blockchain/
│   │   │   │   │   ├── blockchain.service.ts     ← ethers.js FallbackProvider
│   │   │   │   │   ├── contracts/
│   │   │   │   │   │   ├── EventTickets1155.ts
│   │   │   │   │   │   ├── TicketMarketplace.ts
│   │   │   │   │   │   ├── LoyaltyBadge.ts
│   │   │   │   │   │   └── abis/
│   │   │   │   │   └── blockchain.types.ts
│   │   │   │   │
│   │   │   │   ├── ipfs/
│   │   │   │   │   ├── ipfs.service.ts           ← Pinata upload + verify CID
│   │   │   │   │   └── ipfs.types.ts
│   │   │   │   │
│   │   │   │   ├── queue/
│   │   │   │   │   ├── queue.service.ts          ← BullMQ producer
│   │   │   │   │   ├── workers/
│   │   │   │   │   │   ├── email.worker.ts
│   │   │   │   │   │   ├── blockchain-confirm.worker.ts
│   │   │   │   │   │   ├── orphan-reconcile.worker.ts
│   │   │   │   │   │   ├── settlement.worker.ts
│   │   │   │   │   │   ├── post-event.worker.ts
│   │   │   │   │   │   └── refund.worker.ts
│   │   │   │   │   └── queue.types.ts
│   │   │   │   │
│   │   │   │   ├── email/
│   │   │   │   │   ├── email.service.ts
│   │   │   │   │   └── templates/                ← SendGrid dynamic template IDs
│   │   │   │   │
│   │   │   │   ├── realtime/
│   │   │   │   │   └── socket.service.ts         ← Socket.IO init + Redis pub/sub
│   │   │   │   │
│   │   │   │   ├── cache/
│   │   │   │   │   └── redis.service.ts          ← Redis client + Redlock
│   │   │   │   │
│   │   │   │   └── db/
│   │   │   │       └── postgres.service.ts       ← pg-promise connection pool
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts               ← authenticateJWT, requireRole, requireOrgMembership
│   │   │   │   ├── rateLimiter.ts
│   │   │   │   ├── validate.ts           ← Zod schema validation
│   │   │   │   ├── errorHandler.ts       ← global error handler
│   │   │   │   ├── auditLog.ts           ← writes audit_logs on state-changing routes
│   │   │   │   ├── planLimit.ts          ← subscription plan enforcement
│   │   │   │   ├── webhookValidator.ts   ← HMAC webhook validation
│   │   │   │   └── pagination.ts
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── env.ts                ← Zod-validated env vars (fail fast on bad config)
│   │   │   │   └── constants.ts
│   │   │   │
│   │   │   └── app.ts                    ← Express app setup + route mounting
│   │   │
│   │   ├── migrations/                   ← node-pg-migrate SQL (version-controlled)
│   │   │   ├── 001_create_platform_admins.sql
│   │   │   ├── 002_create_users.sql
│   │   │   ├── 003_create_organisations.sql
│   │   │   ├── 004_create_org_members.sql
│   │   │   ├── 005_create_invites.sql
│   │   │   ├── 006_create_venues.sql
│   │   │   ├── 007_create_events.sql
│   │   │   ├── 008_create_ticket_tiers.sql
│   │   │   ├── 009_create_mint_idempotency.sql
│   │   │   ├── 010_create_tickets.sql
│   │   │   ├── 011_create_ticket_transfers.sql
│   │   │   ├── 012_create_resale_listings.sql
│   │   │   ├── 013_create_checkins.sql
│   │   │   ├── 014_create_wallets.sql
│   │   │   ├── 015_create_settlements.sql
│   │   │   ├── 016_create_refunds.sql
│   │   │   ├── 017_create_promo_codes.sql
│   │   │   ├── 018_create_loyalty_rewards.sql
│   │   │   ├── 019_create_referrals.sql
│   │   │   ├── 020_create_fraud_logs.sql
│   │   │   ├── 021_create_blacklisted_wallets.sql
│   │   │   ├── 022_create_audit_logs.sql
│   │   │   ├── 023_create_white_label_config.sql
│   │   │   ├── 024_create_event_member_permissions.sql
│   │   │   └── 025_create_subscription_plans.sql
│   │   │
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   │
│   │   ├── Dockerfile
│   │   ├── Dockerfile.prod
│   │   └── package.json
│   │
│   └── web/                             ← Next.js 14 frontend (App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (platform)/          ← Platform admin dashboard (PLATFORM_ADMIN only)
│       │   │   ├── (admin)/             ← Org admin portal (SUPER_ADMIN / ADMIN)
│       │   │   ├── (checkin)/           ← Scanner PWA (VOLUNTEER / ADMIN)
│       │   │   └── (consumer)/          ← Public marketplace + ticket wallet
│       │   ├── components/
│       │   │   ├── ui/                  ← shadcn/ui base components
│       │   │   └── features/            ← domain-specific components
│       │   ├── hooks/
│       │   ├── lib/
│       │   │   ├── api.ts               ← TanStack Query + axios with cookie interceptor
│       │   │   ├── socket.ts            ← Socket.IO client setup
│       │   │   └── offline-db.ts        ← IndexedDB wrapper (idb)
│       │   └── styles/
│       │       └── globals.css          ← Tailwind base + CSS vars only
│       ├── public/
│       │   └── manifest.json            ← PWA manifest for Scanner App
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/
│   ├── shared/                          ← Shared TypeScript types + constants
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.types.ts
│   │   │   │   ├── event.types.ts
│   │   │   │   ├── ticket.types.ts
│   │   │   │   ├── settlement.types.ts
│   │   │   │   └── api.types.ts
│   │   │   ├── constants/
│   │   │   │   ├── roles.ts
│   │   │   │   └── errors.ts
│   │   │   └── utils/
│   │   │       └── wei.ts               ← Wei ↔ display conversion (NUMERIC-safe)
│   │   └── package.json
│   │
│   └── contracts/                       ← Hardhat project
│       ├── contracts/
│       │   ├── EventTickets1155.sol
│       │   ├── OrgRegistry.sol
│       │   ├── TicketMarketplace.sol
│       │   └── LoyaltyBadge.sol
│       ├── scripts/
│       │   ├── deploy-local.ts
│       │   ├── deploy-testnet.ts
│       │   └── deploy-mainnet.ts
│       ├── test/
│       │   ├── EventTickets1155.test.ts
│       │   ├── TicketMarketplace.test.ts
│       │   └── LoyaltyBadge.test.ts
│       ├── hardhat.config.ts
│       └── package.json
│
├── docker-compose.yml                   ← dev: postgres, redis, api, worker, hardhat-node
├── docker-compose.prod.yml
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore                           ← must include .env, certs/, dist/
└── tsconfig.base.json                   ← strict: true — extended by all packages
```

---

## 28. Docker & Containerisation

### docker-compose.yml (Development)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ticketchain
      POSTGRES_USER: ticketchain_user
      POSTGRES_PASSWORD: dev_password
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ticketchain_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  hardhat-node:
    image: node:20-alpine
    working_dir: /app
    volumes: [./packages/contracts:/app]
    command: npx hardhat node --hostname 0.0.0.0
    ports: ["8545:8545"]

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://ticketchain_user:dev_password@postgres:5432/ticketchain
      REDIS_URL: redis://redis:6379
      MST_RPC_URL: http://hardhat-node:8545
    ports: ["5000:5000"]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    command: pnpm run dev

  worker:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://ticketchain_user:dev_password@postgres:5432/ticketchain
      REDIS_URL: redis://redis:6379
      WORKER_MODE: "true"
    depends_on: [postgres, redis]
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    command: pnpm run worker:dev

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:5000
    depends_on: [api]
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    command: pnpm run dev

volumes:
  postgres_data:
  redis_data:
```

### Production Dockerfile (API)

```dockerfile
# Dockerfile.prod
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter shared run build
RUN pnpm --filter api run build

# Production image
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist         ./apps/api/dist
COPY --from=builder /app/apps/api/migrations   ./apps/api/migrations

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node apps/api/dist/healthcheck.js || exit 1

EXPOSE 5000
CMD ["node", "apps/api/dist/app.js"]
```

---

## 29. Development Environment Setup

### Prerequisites

```bash
Node.js  20 LTS     # use nvm: nvm install 20
pnpm     9+         # npm install -g pnpm
Docker   24+
Docker Compose 2.x
Git
```

### Setup Steps

```bash
# 1. Clone and install
git clone https://github.com/yourcompany/ticketchain-mst.git
cd ticketchain-mst
pnpm install
cp .env.example .env
# Fill in SARAL credentials, Pinata keys, SendGrid key

# 2. Start infrastructure (Postgres + Redis + local Hardhat blockchain)
docker-compose up -d postgres redis hardhat-node

# 3. Run migrations
pnpm --filter api run migrate

# 4. Deploy contracts to LOCAL Hardhat node (instant, no faucets)
pnpm --filter contracts run deploy:local

# 5. Seed dev data (platform admin, sample org, sample events)
pnpm --filter api run seed

# 6. Generate RS256 keypair for JWT signing (dev only)
mkdir -p apps/api/certs
openssl genrsa -out apps/api/certs/private.pem 2048
openssl rsa -in apps/api/certs/private.pem -pubout -out apps/api/certs/public.pem

# 7. Start servers
# Terminal 1: API
pnpm --filter api run dev

# Terminal 2: BullMQ worker
pnpm --filter api run worker:dev

# Terminal 3: Frontend
pnpm --filter web run dev
```

URLs:
- Frontend: `http://localhost:3000`
- API: `http://localhost:5000`
- Hardhat node: `http://localhost:8545`

### Environment Variables (.env)

```bash
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug

# SARAL SSO
SARAL_APP_ID=your_app_id
SARAL_APP_SECRET=your_app_secret
SARAL_ENVIRONMENT=testnet

# Database
DATABASE_URL=postgresql://ticketchain_user:dev_password@localhost:5432/ticketchain
DATABASE_POOL_SIZE=10
DATABASE_READ_REPLICA_URL=  # leave empty in dev; set in production

# Redis
REDIS_URL=redis://localhost:6379

# JWT (RS256)
JWT_PRIVATE_KEY_PATH=./certs/private.pem
JWT_PUBLIC_KEY_PATH=./certs/public.pem
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cookies
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false          # true in production

# MST Blockchain (local dev → Hardhat)
MST_RPC_URL=http://localhost:8545
MST_RPC_FALLBACK_URL=        # set in staging/prod
MST_CHAIN_ID=31337
MST_NETWORK=local
MST_DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract addresses (filled after deploy:local)
ORG_REGISTRY_ADDRESS=0x...
EVENT_FACTORY_ADDRESS=0x...
MARKETPLACE_CONTRACT_ADDRESS=0x...
LOYALTY_BADGE_ADDRESS=0x...

# IPFS / Pinata
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret
PINATA_GATEWAY=https://gateway.pinata.cloud

# AWS S3 (temp upload staging)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=ticketchain-staging-uploads
AWS_REGION=ap-south-1

# Email
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@ticketchain.com

# Error Tracking
SENTRY_DSN=your_sentry_dsn

# Fraud Detection
FINGERPRINTJS_API_KEY=your_fp_key

# CORS
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000
```

---

## 30. Testing Strategy

### Unit Tests (Vitest)

Test pure business logic in isolation, mocking all external dependencies:

```typescript
// apps/api/src/modules/tickets/tests/unit/tickets.service.test.ts
describe('checkAndReserveTicket', () => {
  it('should return false when Redis counter is at zero', async () => {
    vi.mocked(redis.decrBy).mockResolvedValue(-1);
    vi.mocked(redis.incrBy).mockResolvedValue(0);
    const result = await checkAndReserveTicket('tier-123', 1);
    expect(result).toBe(false);
    expect(redis.incrBy).toHaveBeenCalledWith('tier:available:tier-123', 1);
  });

  it('should return true and not restore when counter >= 1', async () => {
    vi.mocked(redis.decrBy).mockResolvedValue(5);
    const result = await checkAndReserveTicket('tier-123', 1);
    expect(result).toBe(true);
    expect(redis.incrBy).not.toHaveBeenCalled();
  });
});
```

### Integration Tests (Supertest)

Test routes against a real test DB and Redis:

```typescript
// Concurrency test — must pass with zero oversells
describe('Concurrent ticket minting', () => {
  it('should sell exactly 10 tickets for a tier with supply=10 under 50 concurrent requests', async () => {
    const tier = await createTestTier({ total_supply: 10 });
    await redis.set(`tier:available:${tier.id}`, 10);

    const requests = Array.from({ length: 50 }, (_, i) =>
      request(app)
        .post('/api/tickets/mint')
        .set('Cookie', `access_token=${userTokens[i % 20]}`)
        .set('Idempotency-Key', `key-${i}`)
        .send({ tierId: tier.id, quantity: 1 })
    );

    const results = await Promise.all(requests);
    const successes = results.filter(r => r.statusCode === 200);
    const soldOuts  = results.filter(r => r.statusCode === 410);

    expect(successes).toHaveLength(10);
    expect(soldOuts).toHaveLength(40);

    const mintedCount = await db.one<{ count: string }>(
      `SELECT COUNT(*) FROM tickets WHERE tier_id = $1`, [tier.id]
    );
    expect(parseInt(mintedCount.count)).toBe(10);  // EXACTLY 10, never 11
  });
});
```

### RBAC Tests

```typescript
describe('RBAC enforcement', () => {
  it('should 403 volunteer accessing sales analytics', async () => {
    const token = await loginAs('volunteer');
    const res = await request(app)
      .get(`/api/admin/events/${eventId}/analytics`)
      .set('Cookie', `access_token=${token}`);
    expect(res.statusCode).toBe(403);
  });

  it('should 403 admin from Org B accessing Org A event', async () => {
    const token = await loginAs('admin', orgB.id);
    const res = await request(app)
      .get(`/api/admin/events/${orgAEventId}`)
      .set('Cookie', `access_token=${token}`);
    expect(res.statusCode).toBe(403);
  });
});
```

### Smart Contract Tests (Hardhat)

```typescript
// packages/contracts/test/EventTickets1155.test.ts
describe('EventTickets1155', () => {
  it('should prevent minting beyond maxSupply', async () => {
    await contract.setTier(1, 2, parseEther('0.1'), true, 500);
    await contract.mintTicket(buyer.address, 1, 1, { value: parseEther('0.1') });
    await contract.mintTicket(buyer.address, 1, 1, { value: parseEther('0.1') });
    await expect(
      contract.mintTicket(buyer.address, 1, 1, { value: parseEther('0.1') })
    ).to.be.revertedWith('TierSoldOut');
  });

  it('should enforce non-transferable tier', async () => {
    await contract.setTier(2, 10, parseEther('0.1'), false, 0);
    await contract.mintTicket(buyer.address, 2, 1, { value: parseEther('0.1') });
    await expect(
      contract.connect(buyer).safeTransferFrom(buyer.address, other.address, tokenId, 1, '0x')
    ).to.be.revertedWith('NotTransferable');
  });

  it('should distribute royalties correctly on resale', async () => {
    // ... marketplace test: verify 5% goes to org wallet on every resale
  });
});
```

### E2E Tests (Playwright)

Key flows to cover:
- Full purchase flow: browse → select tier → purchase → view ticket → QR appears
- Check-in flow: volunteer logs in → scans QR → gets ADMIT result → counter increments
- Resale flow: list ticket → buy → verify ownership transferred → old QR invalidated
- Org onboarding: platform admin creates org → org admin logs in → creates event → deploys contract

---

## 31. Implementation Phases

### Phase 1 — MVP (Weeks 1–8)

**Goal:** Working platform for a single org running a single event

**Deliverables:**
- [ ] Postgres schema (migrations 001–015)
- [ ] Auth module: SARAL SSO + platform admin login + HTTP-only cookies
- [ ] Organisation module: create, KYC basic, invite admins
- [ ] Events module: create, configure tiers, IPFS upload, deploy contract, publish
- [ ] Tickets module: mint with idempotency + concurrency guards, QR generation
- [ ] Checkin module: online QR verification, duplicate prevention
- [ ] Consumer UI: event browse, tier listing, purchase, wallet view
- [ ] Admin UI: event creation, tier config, basic analytics
- [ ] Scanner PWA: QR scan, result display
- [ ] BullMQ: email confirmation, blockchain confirmation, orphan reconciliation
- [ ] Smart contracts: EventTickets1155 (mint, transfer, royalty), OrgRegistry
- [ ] Docker Compose dev environment
- [ ] GitHub Actions CI (lint + type-check + tests)

**Out of scope for MVP:** Resale marketplace, fraud engine, marketing tools, settlements, white-label

---

### Phase 2 — Platform Hardening (Weeks 9–14)

**Goal:** Multi-tenant, production-ready

**Deliverables:**
- [ ] Platform Admin panel: org management, KYC review, blockchain monitoring
- [ ] Multi-tenant isolation verification (all queries org-scoped, audit tests pass)
- [ ] Finance module: settlements, refunds, GST invoice generation
- [ ] Fraud Detection Engine: device fingerprinting, blacklist, bulk-buy detection
- [ ] Offline Scanner: IndexedDB snapshot, HMAC offline verification, sync-on-reconnect
- [ ] Dynamic QR: rotating nonce, 60-second refresh
- [ ] NFC verification support (Web NFC API)
- [ ] Zone-based access control (event zones + volunteer zone assignment)
- [ ] Resale Marketplace: listings, price cap enforcement, on-chain royalty distribution
- [ ] Real-time WebSocket: live gate stats
- [ ] Performance: Redis caching, read replica for analytics, CDN for static assets
- [ ] K8s manifests for production deployment
- [ ] Comprehensive test suite: unit + integration + E2E + contract tests

---

### Phase 3 — Growth Features (Weeks 15–20)

**Goal:** Revenue-generating features for org retention

**Deliverables:**
- [ ] White-label: custom domains, SSL automation, branding config
- [ ] Subscription plans: enforced plan limits, plan management in platform admin
- [ ] Marketing module: promo codes, referral system
- [ ] Loyalty module: attendance badges, post-event collectibles, discount tokens
- [ ] Email campaigns: pre-event reminders, post-event thank-you
- [ ] Seat mapping: venue seat map config, per-ticket seat assignment
- [ ] Enterprise API: public REST API with API key auth for integration partners
- [ ] Advanced analytics: custom dashboards, export CSV/PDF
- [ ] CPD certificates for conference events
- [ ] LoyaltyBadge smart contract: post-event collectible NFTs

---

### Phase 4 — Enterprise & Expansion (Weeks 21+)

**Goal:** Enterprise sales enablement and vertical expansion

**Deliverables:**
- [ ] Ticketmaster / Eventbrite API integration (import events)
- [ ] ERP / CRM integration hooks
- [ ] University passes: student identity NFTs, campus access, attendance verification
- [ ] Airline boarding: NFT boarding passes, identity-linked transfer restrictions
- [ ] Theme park: ride access NFTs, VIP lane system
- [ ] Multi-language support (i18n)
- [ ] Mobile app (React Native): full consumer wallet + scanner functionality
- [ ] GDPR / data retention policy enforcement
- [ ] SOC 2 compliance audit

---

## 32. Deployment Guide

### Infrastructure Architecture (Production)

```
Internet
   │
Cloudflare (WAF, DDoS protection, CDN for static assets)
   │
AWS ALB (Application Load Balancer)
   │
Kubernetes (EKS — ap-south-1)
   ├── ticketchain-api (Deployment, 3+ replicas, HPA)
   ├── ticketchain-worker (Deployment, 2 replicas — BullMQ workers)
   ├── ticketchain-web (Deployment, 3+ replicas)
   └── cert-manager (Let's Encrypt for white-label custom domains)
   │
AWS RDS PostgreSQL 15 (Multi-AZ, read replica)
AWS ElastiCache Redis (Cluster mode, 3 shards)
AWS S3 (temp upload staging)
Pinata IPFS (permanent NFT storage)
MST Blockchain (via RPC + Alchemy failover)
```

### Deployment Steps

```bash
# 1. Merge to main → GitHub Actions CI runs:
#    - tsc --noEmit (type check all packages)
#    - ESLint strict pass
#    - Vitest unit + integration tests
#    - Hardhat contract tests (local node)
#    - Build Docker images

# 2. Push images to ECR
docker build -t ticketchain-api:$GIT_SHA -f apps/api/Dockerfile.prod .
docker push $ECR_URL/ticketchain-api:$GIT_SHA

# 3. Deploy to K8s (rolling update)
kubectl set image deployment/ticketchain-api api=$ECR_URL/ticketchain-api:$GIT_SHA
kubectl rollout status deployment/ticketchain-api

# 4. Run migrations (zero-downtime — backward-compatible migrations only)
kubectl exec deploy/ticketchain-api -- pnpm --filter api run migrate

# 5. Smoke tests
curl https://api.ticketchain.com/health
curl https://api.ticketchain.com/api/events?limit=1

# 6. Monitor 30 minutes
#    - Sentry: error rate
#    - Pino/CloudWatch: response times
#    - Redis: memory + hit rate
#    - Postgres: slow query log
#    - BullMQ: failed job count
```

### Production Environment Variables

```bash
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

SARAL_APP_ID=prod_saral_app_id
SARAL_APP_SECRET=<secrets manager>
SARAL_ENVIRONMENT=mainnet

DATABASE_URL=postgresql://prod_user:<pass>@prod-postgres.internal:5432/ticketchain_prod
DATABASE_READ_REPLICA_URL=postgresql://prod_user:<pass>@prod-postgres-read.internal:5432/ticketchain_prod
DATABASE_POOL_SIZE=20

REDIS_URL=redis://prod-redis-cluster.internal:6379

JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public.pem
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

COOKIE_DOMAIN=ticketchain.com
COOKIE_SECURE=true

MST_RPC_URL=https://mainnet-rpc.mstblockchain.com
MST_RPC_FALLBACK_URL=https://mst-mainnet.g.alchemy.com/v2/<key>
MST_CHAIN_ID=56789
MST_NETWORK=mainnet
MST_DEPLOYER_PRIVATE_KEY=<secrets manager>

ORG_REGISTRY_ADDRESS=0x...         # deployed + verified on mainnet
MARKETPLACE_CONTRACT_ADDRESS=0x...
LOYALTY_BADGE_ADDRESS=0x...

FRONTEND_URL=https://ticketchain.com
API_BASE_URL=https://api.ticketchain.com

AWS_ACCESS_KEY_ID=<secrets manager>
AWS_SECRET_ACCESS_KEY=<secrets manager>
AWS_S3_BUCKET=ticketchain-uploads-staging
AWS_REGION=ap-south-1

PINATA_API_KEY=<secrets manager>
PINATA_SECRET_KEY=<secrets manager>
PINATA_GATEWAY=https://gateway.pinata.cloud

SENDGRID_API_KEY=<secrets manager>
EMAIL_FROM=noreply@ticketchain.com

SENTRY_DSN=<secrets manager>

FINGERPRINTJS_API_KEY=<secrets manager>

SSL_CERT_PATH=/etc/ssl/certs/ticketchain.crt
SSL_KEY_PATH=/etc/ssl/private/ticketchain.key
```

---

## 33. Pre-Deployment Checklist

### Security

- [ ] HTTP-only, Secure, SameSite=Strict cookies confirmed in production config
- [ ] JWT uses RS256 with production keypair (NOT HS256 with shared secret)
- [ ] All secrets in AWS Secrets Manager — zero .env files in production
- [ ] No secrets committed to git (verify with `git log -S <secret>`)
- [ ] SSL/TLS certificate installed (cert path contains NO spaces)
- [ ] CORS restricted to production domain only (`ticketchain.com`)
- [ ] Rate limiting tuned and tested under load
- [ ] Webhook HMAC signatures validated on all webhook endpoints
- [ ] FingerprintJS Pro configured for production domain

### Database

- [ ] All 25 migrations run on production DB
- [ ] Connection pool size correct (`DATABASE_POOL_SIZE=20`)
- [ ] Read replica configured and tested (`DATABASE_READ_REPLICA_URL`)
- [ ] Daily snapshot backup + PITR enabled (RDS)
- [ ] NUMERIC(78,0) columns verified — zero BIGINT for wei values anywhere
- [ ] Unique index on `checkins(ticket_id)` WHERE success=TRUE verified
- [ ] Audit logs table has no UPDATE/DELETE permissions for API user

### Blockchain

- [ ] EventTickets1155 deployed and verified on MST Mainnet
- [ ] OrgRegistry deployed and verified on MST Mainnet
- [ ] TicketMarketplace deployed and verified on MST Mainnet
- [ ] LoyaltyBadge deployed and verified on MST Mainnet
- [ ] Deployer wallet funded with sufficient MSTC for gas
- [ ] Alchemy failover RPC configured and tested
- [ ] Smart contract audited (before mainnet deploy)

### Infrastructure

- [ ] Redis cluster mode (NOT single node) for production
- [ ] BullMQ worker deployed as separate K8s Deployment (not same pod as API)
- [ ] Orphan reconciliation job scheduled (every 5 minutes)
- [ ] Sentry DSN configured (backend + frontend)
- [ ] Pino logs shipping to CloudWatch / Datadog
- [ ] Socket.IO sticky sessions configured on ALB (or Redis adapter for multi-instance)
- [ ] Cloudflare WAF rules active
- [ ] Horizontal Pod Autoscaler configured (API: scale at 70% CPU)

### IPFS

- [ ] Pinata API key has sufficient pinning quota
- [ ] All tier metadata CIDs verified as resolvable via gateway before event publish
- [ ] Zero S3 URLs in any NFT metadata JSON (grep check)

### Email

- [ ] SendGrid domain authentication complete (SPF, DKIM, DMARC)
- [ ] All 18 email templates tested in SendGrid
- [ ] Email `from` address verified

### Testing

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Concurrency test passing: exactly 10 tickets sold for supply=10 under 50 concurrent requests (zero oversell)
- [ ] RBAC tests passing: volunteers cannot access admin routes; cross-org access returns 403
- [ ] Contract tests passing on testnet
- [ ] E2E purchase flow passing on staging environment
- [ ] Offline scanner flow tested: scan → mark offline → reconnect → sync verified

### Performance

- [ ] Load test run: 1,000 concurrent users, p95 ticket purchase < 2 seconds
- [ ] Ticket verification (gate scan): p95 < 500ms
- [ ] Dashboard load time: < 2 seconds
- [ ] Redis hit rate > 90% for availability counters

---

**Document Version:** 3.0  
**Supersedes:** v2.0 (May 2026) + MST SRS  
**Last Updated:** May 2026  
**Status:** Ready for Implementation  
**Audience:** Backend Engineer · Frontend Engineer · Blockchain Engineer · DevOps Engineer  
**Owner:** TicketChain MST Engineering Team
