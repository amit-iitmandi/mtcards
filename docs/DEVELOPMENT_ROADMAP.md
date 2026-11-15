# Incremental delivery and security baseline

## Business goal
Hindi-first wedding-card catalogue for blank cards, printed cards and bulk enquiries. Product pages may include images and optional GLB previews. Customers review a prefilled WhatsApp enquiry and send it themselves.

## Release workflow
1. One scoped issue and feature branch per increment.
2. Preserve existing records and public interfaces; document migrations and rollback before data changes.
3. Run lint, build, automated tests, dependency audit and targeted security tests.
4. Review pull request; deploy preview and verify mobile, Hindi content and enquiry flows.
5. Promote only after approval; smoke-test production and monitor; revert on regression.

## Phase sequence
- 0: Audit and critical security fixes.
- 1: Responsive Hindi storefront and catalogue.
- 2: WhatsApp enquiry builder with encoded fields and configurable shop number.
- 3: Admin catalogue, protected uploads and SKU management.
- 4: Optional GLB preview with strict file validation, size caps and image fallback.
- 5: Printing, quantity tiers and bulk quotes.
- 6: SEO, monitoring, backups and production hardening.

## Immediate security findings (static review, not yet tested)
- The tracked root .env file may expose secrets. Treat contents as sensitive: inspect privately, rotate any credentials it contains, remove from tracking in a dedicated reviewed change, and purge history if necessary. Adding to .gitignore alone does not remove historical exposure.
- POST /createPost lacks authentication and authorization.
- DELETE /allPost permits unauthenticated mass deletion.
- DELETE /deletePost/:postId lacks authentication and authorization.
- Old dependencies require an audit and carefully tested upgrades.
- Ensure JWT verification rejects deleted users and enforces role checks for admin actions.

## Security acceptance criteria for next PR
- All product mutations require authenticated admin authorization.
- Public mass-delete endpoint is removed or disabled.
- Inputs are validated and error responses are deterministic.
- Existing product data remains intact.
- Automated tests cover unauthorized, non-admin, invalid-input and valid-admin cases.
- No secrets are committed, printed in logs, or exposed in client bundles.

## Deployment gate
Do not deploy the current backend publicly until critical authorization issues are resolved. Confirm hosting target, runtime configuration, backup and rollback strategy before production changes.
