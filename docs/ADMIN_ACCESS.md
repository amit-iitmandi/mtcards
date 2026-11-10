# Shop administrator access

The frontend has /login, /admin/setup and a protected /upload route. Login validates the bearer session with GET /admin/session before storing it in sessionStorage. Upload rechecks the server role when opened. Authentication is enforced by backend middleware, not just the UI. Logout removes the browser session.

Public registration remains off. Configure ADMIN_EMAILS privately in Render to the owner-confirmed shop administrator address. Provision a new users document only after checking the address does not already exist. Store an unusable initial password, a SHA-256 hash of a cryptographically random 24-byte base64url setup code, and setupExpiresAt as a Unix timestamp in milliseconds, no more than 24 hours ahead. Never store or commit the raw code or a plaintext password. Supply the one-time code privately to the owner; do not put it in a URL, analytics, logs or email without authorization.

POST /admin/setup accepts the code and the user's chosen password in the HTTPS request body. It hashes the password with bcrypt cost 12 and atomically replaces the password only on a matching unexpired invitation for an allowlisted email, removing the invitation fields in the same update. Invalid, expired or consumed invitations cannot change the password. The password requires at least 12 characters and at most 72 UTF-8 bytes. Invitation fields are excluded from normal Mongoose queries. Existing catalogue data and account passwords are not modified during provisioning.

After successful setup, the owner signs in at /login. New login tokens expire in eight hours. No password reset is exposed through public registration. Replacement invitations require explicit owner support and verification.

Tests cover replay, expiry, concurrent redemption, validation and permission checks with isolated fixtures. Never use the owner's real invitation in smoke tests. Verify production setup by rejecting a synthetic invalid code and observing the mounted session route without changing account or catalogue data.
