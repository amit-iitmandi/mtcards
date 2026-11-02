# MTcards backend on Render

Status: preparation only; no service has been created and no production API URL is assigned.

## Release prerequisites

Integrate and test the Phase 0 fixes before creating this Blueprint: product authorization (#2), authentication privacy (#3), and removal of tracked runtime secrets (#5). Replace exposed provider credentials using the same existing MongoDB cluster and database; do not create an empty replacement database. Complete authentication validation/error handling. Fix the duplicate mongoose.connect calls in server.js so startup connects once, reports readiness only after MongoDB connects, and exits on failure. Add a database-aware health endpoint and restrict browser CORS to the verified frontend origins. Test these runtime changes in an isolated environment before production deployment.

Blueprint creation starts an initial deploy even with automatic deploys off. Do not create the service until these prerequisites pass. Do not deploy this preparation branch directly.

## Service configuration

Use the repository root and render.yaml after merging the tested release into the default branch. This creates only a Node web service, with no database, disk, migrations or seed hooks. The backend installs root dependencies and runs security tests; React remains on Vercel. Start with node server.js, bypassing the existing npm start command that launches both frontend and backend development servers. Render supplies PORT. Automatic deployments stay off so backend releases remain deliberate.

Set DATABASE_ACCESS privately in Render to the existing database URI with replaced credentials. Set SECRET_OR_KEY to a strong replacement signing secret (existing sessions will require login again). Set ADMIN_EMAILS to the authorized shop administrator emails. Never copy values from the committed .env file. Allow the Render service outbound addresses in the existing MongoDB provider network rules without removing current access.

## Connect the frontend

After the backend passes verification, integrate the catalogue reliability change (#4). Set Vercel REACT_APP_API_BASE_URL to the actual Render HTTPS service URL (no trailing slash), then rebuild the frontend. Check remaining fetch/axios calls, including authentication and administration, for relative API URLs; update those to use the same backend configuration before claiming the full application is connected. Never set an API URL to an assumed or unverified hostname.

## Verify and rollback

Run security tests and frontend production build for the exact release. Verify database-aware readiness, GET /allPost JSON and existing catalogue records/images. Verify GET /register does not list users, anonymous mutations fail, and authorized administration works using isolated test records. Check frontend catalogue, login and inquiries against the actual service. Do not run bulk deletion, seed, import or reset commands. Save the previous Vercel API URL and deployment so frontend configuration can be rolled back independently; use Render's previous tested deployment for backend rollback. No production write tests without explicitly isolated records.
