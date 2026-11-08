# Catalogue privacy fix — 8 November 2026

The legacy unauthenticated GET /allPost selected every non-archived record and serialized the full Mongoose document. This exposed drafts and internal fields such as sPrice, stock and imageAssetIds. It now uses the same published/legacy-published visibility filter and public field allowlist as /cards. Its compatibility response is bounded to 500 items; new clients use paginated /cards. The obsolete /myPost private listing now requires an administrator.

The coordinated frontend release moves the storefront to /cards, management to authenticated /admin/cards, and displays cPrice as the public customer price. Existing records, IDs, inventory and media are unchanged.

Validation: security unit/HTTP tests and isolated database integration tests pass, including draft/archive exclusion, private-field removal and non-admin denial. The integration harness permits an explicit MONGOMS_VERSION override: the environment's MongoDB 8.0.17 binary aborts during CPU detection; local verification used an isolated MongoDB 7.0.24 replica set. CI retains MongoDB 8.0.17 by default. Tests never contact the hosted database or live image/email providers.

Secret scanning now also rejects tracked runtime environment files and recognizes the historical API_KEY/API_SECRET/SECRET_KEY and current provider environment keys. Old Git history is not rewritten, and provider revocation must be verified separately.
