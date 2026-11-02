# MTcards backend on Render

## Release contents

The deployment branch includes the product authorization baseline, authentication privacy protections, removal of tracked runtime secrets, and tested backend startup changes. React remains on Vercel. MongoDB models and existing records are unchanged. Startup connects once before listening on Render's PORT, disables automatic index creation, and exits with a sanitized message on configuration/connection failures. /healthz returns 200 only while MongoDB is connected; API requests return 503 during database outages. Unknown API routes return JSON rather than React HTML.

Public signup is disabled by default. Existing users can log in; login tokens expire after eight hours. Profile access is limited to the signed-in account. Product writes require a configured ADMIN_EMAILS allowlist; leave this unset until administrator identities are verified. Mass deletion remains disabled.

## Private configuration required

Set DATABASE_ACCESS in the Render Environment tab to a replacement connection string for the SAME existing MongoDB cluster and database. Do not use the credentials exposed in Git history. Replace the exposed database user's password with the provider, retaining existing collections and data. MongoDB network access must allow the Render service outbound addresses while preserving existing required access. Never seed, reset, import or migrate this database for this deployment.

SECRET_OR_KEY is a new randomly generated signing secret in Render; old sessions will require login again. CORS_ORIGINS contains explicit frontend HTTPS origins. Add verified frontend domains as necessary; do not use wildcard origins. ALLOW_REGISTRATION=false keeps signup closed. ADMIN_EMAILS is intentionally unset by default so product mutations fail closed.

The service uses the repository root, npm ci --omit=dev --ignore-scripts followed by npm run test:security, and node server.js. No frontend build, database creation, disk or migration hook is configured. Automatic deployments are off. Creation triggers an initial deployment, which cannot become ready until the private database configuration is supplied. Set /healthz as the Render HTTP health check if creating through the dashboard; render.yaml includes this path.

## Connect Vercel after backend verification

Set VITE_API_BASE_URL to the actual Render HTTPS service URL (no trailing slash) and rebuild the frontend branch containing the catalogue reliability changes. Do not publish this setting before /healthz returns 200 and /allPost returns the existing catalogue as JSON. Audit remaining fetch/axios calls for relative API URLs, including upload and login, before declaring the full application connected.

## Verification and rollback

Run npm run test:security for the exact backend release. Tests use isolated dependencies and fixture data; they do not contact production MongoDB. Verify production readiness, catalogue JSON and existing images with read-only requests. Verify the public user directory stays unavailable, anonymous product mutation fails, and bulk deletion is disabled. Verify authorized administration using explicitly isolated test records only. Save the previous Vercel configuration/deployment for frontend rollback; use Render's previous tested deployment for backend rollback. Do not claim production database or frontend integration verification until those boundaries have passed.
