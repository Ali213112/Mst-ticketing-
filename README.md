# TicketChain MST

NFT ticketing platform on MST Blockchain — monorepo scaffold (Steps 0–2).

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop

## Quick start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start Postgres + Redis (Docker)
pnpm docker:up

# 3. Install dependencies
pnpm install
pnpm --filter @ticketchain/shared build

# 4. Run migrations + seed
pnpm migrate
pnpm seed

# 5. Start API
pnpm dev:api
```

API: http://localhost:5000  
Health: http://localhost:5000/health  
Web (placeholder): http://localhost:3000 — run `pnpm dev:web`

## Docker services

| Service  | Host port | Notes                          |
|----------|-----------|--------------------------------|
| Postgres | **15432** | Avoids conflict with local PG  |
| Redis    | 6379      |                                |

## Seed data (dev)

| Role            | Email                   | Password      |
|-----------------|-------------------------|---------------|
| Platform admin  | admin@ticketchain.com   | ChangeMe123!  |
| Org super admin | founder@demo-org.com    | SARAL (mock)  |

Organisation slug: `demo-events`

## Project structure

```
apps/api          Express API + migrations
apps/web          Next.js (placeholder)
packages/shared   Shared types & constants
## Step 3 — Smart contracts

```bash
pnpm contracts:compile          # Compile + copy ABIs to apps/api
pnpm contracts:test             # Run Hardhat tests (7 tests)
pnpm contracts:deploy:local     # Deploy to in-memory Hardhat network
pnpm contracts:deploy:testnet   # Deploy OrgRegistry to MST testnet
```

| Contract | Purpose |
|----------|---------|
| `EventTickets1155` | ERC-1155 + EIP-2981 NFT tickets (one per event) |
| `OrgRegistry` | Registers org wallets on-chain |

Deployed testnet `OrgRegistry`: see `packages/contracts/deployments/mstTestnet.json`

## Step 4 — Web3Auth authentication

**Backend** (`POST /api/auth/verify`):
- Validates Web3Auth `idToken` via JWKS (`https://api-auth.web3auth.io/jwks`)
- Creates/updates user by `web3auth_sub`
- Issues platform JWT in httpOnly cookies (15min access + 7d refresh in Redis)

**Frontend** (`/login`):
- Email passwordless + SMS via `@web3auth/no-modal`
- Sends `idToken` + wallet address to backend

**Setup:**
1. Create a project at [dashboard.web3auth.io](https://dashboard.web3auth.io)
2. Enable Email Passwordless + SMS login
3. Add custom chain: MST Testnet (your `MST_CHAIN_ID` + RPC)
4. Set in `.env`:
   - `WEB3AUTH_CLIENT_ID` (backend)
   - `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` (frontend — same value)
5. Generate JWT keys: `pnpm --filter @ticketchain/api generate:keys`
6. Run migration 016: `pnpm migrate`

**Auth endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/verify` | Web3Auth login |
| POST | `/api/auth/refresh` | Rotate session |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/platform-login` | Platform admin (email/password) |

```

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `pnpm docker:up` | Start Postgres + Redis |
| `pnpm migrate` | Run DB migrations        |
| `pnpm seed`    | Insert dev seed data     |
| `pnpm dev:api` | Start API on port 5000   |

Blockchain: [@mstblockchain/mst-sdk](https://www.npmjs.com/package/@mstblockchain/mst-sdk) — testnet RPC in `.env`.
