# Catalogue frontend

Deploy the React app from `client` on Vercel. Build with `CI=false NODE_OPTIONS=--openssl-legacy-provider npm run build` while the existing React Scripts 4 toolchain remains; output directory is `build`. Existing lint warnings are tracked technical debt.

Configure `REACT_APP_API_BASE_URL` to the HTTPS origin of the tested Express backend. This is a public build-time URL, never a database URI. Configure `REACT_APP_WHATSAPP_NUMBER` to the shop's confirmed international phone number (digits including country code). Inquiry links are hidden until a valid number is configured. No messages are sent automatically.

The current production `/allPost` returns HTML, so the frontend now shows a Hindi retry state instead of failing while filtering a string. Backend provisioning remains a release blocker. Retain the existing MongoDB database and records; do not seed, migrate, or replace it. Deploy the security-reviewed Express server to a managed Node host only after isolated route tests, environment validation, and read-only connectivity checks. Existing server startup has duplicate MongoDB connections and requires correction before that release.

GLB previews are a later incremental change: optional model URLs on existing products, a lazy-loaded viewer with image fallback, URL/size validation, and keyboard/mobile verification. Do not require model files for existing products.

Validation: `CI=true npm test --prefix client -- --watchAll=false --runInBand`, `npm run test:security`, and the frontend production build. Smoke-test `/allPost` for JSON after connecting backend hosting, plus product images, Hindi error/retry, category filters and configured inquiry links.
