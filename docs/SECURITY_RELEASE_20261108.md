# Security release — 8 November 2026

The active frontend and backend branches diverged from master and the earlier security candidate. This patch targets the actual frontend release branch; a separate backend patch closes the legacy public catalogue disclosure. A consolidated master candidate includes both.

## Frontend

- Remove tracked runtime environment credentials and unused Firebase configuration. Never reuse exposed credentials; deleting files does not revoke historical values.
- Retire the old unsigned Cloudinary upload component, obsolete signup credential logging and unused packages. All image publishing uses the existing authenticated backend upload flow.
- Replace Create React App/Jest with Vite/Vitest, update Axios and remove Firebase SDKs from the browser dependency tree. Lockfiles pin installed versions.
- Preserve REACT_APP_API_BASE_URL, REACT_APP_WHATSAPP_NUMBER and REACT_APP_ENQUIRY_EMAIL as an explicit public-only build whitelist. Secrets and arbitrary environment variables are never bundled. Output remains client/build.
- Use paginated /cards for public data and authenticated /admin/cards for private management data. Customer views and WhatsApp use cPrice; private sPrice/stock are not required by the public UI.
- Logout calls POST /logout and waits for confirmed revocation. Network/malformed-response failures remain retryable and cannot report a successful logout. Clear private session drafts after revocation.
- Disable source maps and add Vercel security headers/CSP at both supported project roots. If the API domain changes, update connect-src together with the public API URL.
- Add source-secret and dependency CI gates. Source secret scans do not certify provider revocation or erase Git history.

## Verification

Frontend regression tests, production bundle checks and npm audit pass. Bundle checks reject old unsigned-upload/configuration markers and source maps. Backend has separate isolated HTTP/database tests; no production records are changed.

## Provider actions still required

The original exposed MongoDB host belongs to an older Atlas project outside the connected MTcards project. Revoke its old database user in that original project. The connected Atlas database user has readWrite access restricted to the mtcards_demo database and mtcards-demo cluster; these are separate resources and deleting it would not revoke the old leaked user.

Cloudinary's available plugin does not manage upload presets. Disable the legacy unsigned card_img preset in Cloudinary Console. Do not put Cloudinary signing secrets into frontend variables. The historical source may contain other API/secret assignments: identify and rotate them privately at their original providers.

Merge/deploy the tested backend privacy fix and this frontend together. Then consolidate master so the default branch cannot restore unauthenticated legacy mutations on a future deployment. Do not deploy the old security/full-audit candidate wholesale over newer admin/upload features.
