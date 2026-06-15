# Authentication Strategy

## Primary: Web3Auth (implemented)

Consumer and org-member login uses **Web3Auth** (`POST /api/auth/verify`):

- Email passwordless and SMS via `@web3auth/no-modal`
- Backend validates `idToken` via JWKS
- Users are keyed by `users.web3auth_sub`
- Custodial-style UX: wallet address is supplied at login; gas is paid by the platform deployer wallet

Platform operators use a **separate path**: email + bcrypt via `platform_admins` (`POST /api/auth/platform-login`). They never authenticate through Web3Auth.

## Legacy / future: SARAL SSO

The master spec describes SARAL Protocol (`saral_user_id`, `@mstblockchain/mst-sdk` SSO). This is **not wired in the current codebase**. Environment variables (`SARAL_APP_ID`, `SARAL_APP_SECRET`) are reserved for a future integration.

When SARAL is added, the recommended approach is:

1. Add `POST /api/auth/saral-verify` parallel to Web3Auth verify
2. Map `saral_user_id` to the same `users` row (nullable `web3auth_sub` / `saral_user_id`)
3. Keep platform admin auth unchanged

## Decision (May 2026)

**Web3Auth is the production consumer auth provider** until SARAL credentials and SDK flows are provisioned for this deployment.
