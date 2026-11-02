# Security audit — 2 November 2026

This branch combines the previously open frontend, backend and security work so it can be tested together against master. It preserves MongoDB models and data; tests use isolated fixtures and never contact the production database.

## Remediated

- Removed tracked runtime environment file (from earlier security work) and unused hardcoded Firebase configuration.
- Disabled the unsigned Cloudinary upload UI. Re-enable only after implementing authenticated, administrator-authorized signed uploads. Existing catalogue images remain readable.
- Removed registration credential logging. Test JWT signing keys are generated at runtime.
- Updated backend runtime dependencies and removed unused dependencies. Updated browser Axios and replaced the vulnerable Create React App build/test toolchain with Vite/Vitest. Removed unused Firebase SDKs, including firebase-admin, from the browser project.
- Added bounded authentication request limits and API security/no-store headers. The limiter deliberately ignores untrusted forwarding headers; behind a shared proxy it is conservative and may throttle multiple clients together. It is process-local; a multi-instance deployment needs a shared limiter with verified proxy configuration.
- Added frontend hosting headers, removed unused third-party analytics scripts, and disabled generated source maps.
- Added a CI source-secret scan and dependency audit gates. The custom scanner detects common credential formats and database URIs; it is defense in depth, not proof that every possible secret format is absent.
- Retained prior fail-closed admin authorization, closed user directory, input validation, disabled bulk deletion, bounded JWT lifetime, restricted CORS and generic errors.

## Exposure still requiring provider action

Reachable Git history contains old MongoDB/JWT environment configuration and Firebase configuration. Removing source files cannot revoke credentials or erase public copies. Revoke/replace the old MongoDB database user credentials and JWT signing key privately, keep the same existing database, and invalidate old tokens. Inspect MongoDB access logs and network rules. Check Firebase API restrictions/rules and disable the old unsigned Cloudinary upload preset in its dashboard. Firebase browser configuration is generally public identification, but should still be reviewed for restrictions.

Do not redeploy the backend using an exposed credential. No database users, data, hosting secrets or repository history were modified by this audit. History rewriting requires coordinated work across branches and clones and cannot make an exposed credential safe again. Run `node scripts/scan-secrets.js --history` to report affected blob identifiers and paths without revealing values.

## Frontend deployment configuration

Build command: `cd client && npm ci && npm run build`; output: `client/build` (or `build` with client as project root). Use Node 24. Set public `VITE_API_BASE_URL` and `VITE_WHATSAPP_NUMBER` in Vercel, replacing the prior REACT_APP names. Never put database URLs, JWT signing keys, service-account keys or upload signing secrets into VITE variables: they are bundled into browser JavaScript. Security headers are supplied in both repository-root and client-root Vercel configurations.

## Verification scope

Validated: 28 backend security/HTTP integration tests, 6 frontend regression tests, production build, and source secret scan pass. Backend and frontend npm audits each report zero vulnerabilities. MongoDB persistence, live authentication, provider revocation and production deployment are not verified by fixture tests. Dependency advisory results are time-sensitive; CI repeats them on each PR.
