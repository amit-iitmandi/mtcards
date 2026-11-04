# MTcards API contract — backend delivery 1

Status: implementation target. The deployed baseline is `deploy/render-backend` at d80556f; security PR #10 is not deployed. This contract is published before implementation. No production migration or seed is part of delivery.

Base URL: `https://mtcards-api.onrender.com`. JSON requests use `Content-Type: application/json`. Times are UTC ISO 8601; identifiers are strings; prices retain existing `cPrice` / `sPrice` strings (INR), without renaming historical values. Existing Post IDs and collection `posts` remain intact. New optional fields are additive. Anonymous responses exclude private prices; legacy `/allPost` remains temporarily compatible and must be retired after the frontend moves to `/cards`.

## Shared rules

Every `/admin/*` management route requires `Authorization: Bearer <login token>` and a server-verified account whose email is in Render's ADMIN_EMAILS allowlist. Public signup remains disabled. Never trust a client role or actor ID. CORS allows only explicit frontend origins. Multipart parsing happens after authentication. Secrets and provider credentials belong only in Render environment settings.

Success envelopes: `{card}`, `{inventory,movement}`, `{items,total,page,limit}`, or `{success:true}`. GET lists use 1-based `page` (default 1) and `limit` (default 20, max 100), stable `_id` ordering and a total matching the same filters. User search is escaped literal text, not executable regex or MongoDB operators.

Errors: `{error:"Human-readable message",code:"VERSION_CONFLICT",requestId:"...",fieldErrors:{}}`. No stack, password, bearer token, upload signature or database URI is returned/logged. Codes/status: INVALID_INPUT 422, BAD_JSON 400, UNAUTHENTICATED 401, FORBIDDEN 403, NOT_FOUND 404, VERSION_CONFLICT/INSUFFICIENT_STOCK/ALREADY_INITIALIZED/IDEMPOTENCY_CONFLICT 409, PAYLOAD_TOO_LARGE 413, UNSUPPORTED_MEDIA 415, RATE_LIMITED 429 (Retry-After), DEPENDENCY_UNAVAILABLE 503, INTERNAL_ERROR 500. Legacy routes retain their existing string error format for compatibility.

## Authentication

| Method | Path | Result |
|---|---|---|
| POST | `/login` | Existing `{email,userPass}` -> `{success:true,token:"Bearer ..."}`; eight-hour expiry. |
| GET | `/me` | Authenticated `{user:{id,name,email,isAdmin}}`, no password/setup fields. |
| GET | `/admin/session` | Existing admin-only `{email,name}` verification. |
| POST | `/logout` | Authenticated; invalidates all sessions for this account, returns `{success:true}`. |
| POST | `/admin/setup` | Existing single-use expiring invitation password setup; public redemption with high-entropy code, not open signup. |

New JWTs carry account sessionVersion. Logout increments it; middleware checks it on every protected request. Replacing the signing key invalidates historical tokens. Password setup/login never logs credentials. Frontend removes its session on 401 or logout.

## Cards

Public: `GET /cards?q=&category=&format=&page=&limit=`, `GET /cards/:id`. Only published, unarchived cards appear. Historical records with no status are treated as published. Public fields: `_id,title,type1,type2,description,cPrice,image,status,version`; never `sPrice`, exact stock or internal asset IDs.

Admin: `GET /admin/cards?q=&category=&format=&status=&page=&limit=`, `GET /admin/cards/:id`; return legacy fields plus `{status,version,imageAssetIds,updatedAt}`. Missing historical version is exposed as zero. Allowed statuses: draft, published, archived.

`POST /admin/cards` example:

```json
{"title":"MT 205","type1":"Hindu Wedding Card","type2":"Double Fold Card","description":"गुलाबी विवाह निमंत्रण","cPrice":"18.50","sPrice":"15.00","status":"draft","imageAssetIds":[]}
```

Returns 201 `{card:{_id:"...",title:"MT 205",stock:0,status:"draft",version:0,...}}`. Creates inventory with 0 sets. Initial balances then use the reasoned stock-adjustment API. Publishing requires at least one managed image. Asset IDs must belong to the authenticated admin and be ready or already attached to this card.

`PATCH /admin/cards/:id` example:

```json
{"expectedVersion":0,"title":"MT 205 — गुलाबी","cPrice":"19.00","status":"published","imageAssetIds":["asset-id"]}
```

Returns `{card:{...,version:1}}`. Metadata, prices, status and image ordering are allowlisted. `stock`, actor IDs, unknown fields and MongoDB operators are rejected. Conditional version update prevents lost changes; stale updates return 409. Omitting imageAssetIds preserves all historical image URLs. Replacing images only detaches old assets; physical removal is a separate checked operation. Every write has a sanitized audit event.

`DELETE /admin/cards/:id` body `{expectedVersion:1}` archives the card, preserving references and inventory. No bulk-delete API. Legacy `DELETE /deletePost/:id` is changed to archive rather than physical removal. Archived records remain visible to admins. Frontend should label this action Archive.

## Signed, validated image uploads

Two-step backend upload, not unsigned browser-to-Cloudinary uploads:

1. `POST /admin/uploads/sign` body `{"files":[{"mimeType":"image/jpeg","size":123456}]}` -> 201 `{ticketId,uploadUrl:"/admin/uploads?ticketId=...",expiresAt,limits:{maxFiles:12,maxFileBytes:5242880,maxTotalBytes:26214400}}`.
2. POST multipart `files` to that uploadUrl with the same admin bearer token. The ticket expires after ten minutes, is owner-bound and single-use. The backend checks actual decoded image type, dimensions (max 40 megapixels), declared size, byte/count/total limits, then signs provider uploads server-side. JPEG/PNG/WebP only; SVG, GIF, video, URL fetches and mismatched MIME are rejected. Return 201 `{assets:[{id,url,mimeType,bytes,width,height}]}`. Provider secrets/signatures never reach the browser.
3. Attach returned IDs in create/PATCH. `DELETE /admin/uploads/:assetId` removes only an owned, unreferenced asset. Attached/in-use assets return 409. A deletion marks the asset unavailable before provider deletion; failed provider cleanup remains retryable. Partial-upload failures attempt cleanup and retain recoverable cleanup records.

Missing Cloudinary configuration returns 503 before accepting upload bytes. Environment: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. Disable the old unsigned preset in Cloudinary itself. No hardcoded legacy cloud or preset is used.

## Inventory and sets

Historical stock has not been silently reinterpreted or migrated. `GET /admin/inventory` returns `{items,total,page,limit}`. Each item includes `cardId,title,unit:"set",initialized,onHand,reserved,available,lowStockThreshold,version`; missing inventory is `initialized:false` with null balances, not zero.

An admin explicitly confirms historical conversion once: `POST /admin/inventory/:cardId/initialize` with `{"unit":"set","onHand":100,"expectedLegacyStock":100,"lowStockThreshold":20}`. Reject if already initialized or legacy stock changed. Record the confirmation and balance in the movement ledger atomically. Existing historical stock is not changed by inspection. New cards are initialized at zero.

`POST /admin/inventory/:cardId/adjustments`:

```json
{"delta":-5,"reason":"wastage","note":"Screen printing spoilage","expectedVersion":0,"idempotencyKey":"business-operation-uuid"}
```

Reasons: purchase, sale, wastage, correction. Nonzero integer delta, required reason, note up to 500 characters, key 8–100 characters. Reject negative balances, deduction below reserved sets, overflow, missing initialization and stale version. A MongoDB transaction updates inventory, legacy card stock and an immutable ledger record together. No partial balances/history on failure. Same key + same payload returns the original result, with `replayed:true`; same key + different payload returns 409. Concurrent deductions cannot oversell. No reservation/order workflow is invented in this delivery; reserved starts at zero and is read-only.

`GET /admin/inventory/:cardId/movements?page=&limit=` -> actor, UTC time, reason, note, delta, before, after and version. `PATCH /admin/inventory/:cardId` with `{expectedVersion,lowStockThreshold}` changes threshold with version control.

## Dashboard

`GET /admin/summary` -> `{designs:{total,published,draft,archived},inventory:{unit:"set",initializedCards,uninitializedCards,onHand,reserved,available,lowStockCards,outOfStockCards},inquiries:{new,total}}`. Totals are server aggregates over all relevant records, not a single frontend page. Archived cards are excluded from available/low/out-of-stock totals. Unknown historical balances are counted separately.

## Inquiries and notification delivery

`POST /enquiries` body:

```json
{"cardId":"...","quantity":250,"customerName":"Sample customer","phone":"9876543210","email":"customer@example.com","message":"कृपया प्रिंटिंग सहित कीमत बताएं।","idempotencyKey":"customer-request-uuid"}
```

Card must be public/published; quantity is 1–1000000 sets. Name up to 120, message up to 2000 characters; at least one validated phone/email. Reject operators, oversized strings and unknown fields. Rate-limit submissions. Persist inquiry and its notification status before attempting email; notification failure does not lose the inquiry or report false delivery. Retry of the same key does not duplicate inquiries. Return 201 `{id,status:"new",notification:{status:"sent|pending|disabled|failed"}}`.

`GET /admin/enquiries?status=&q=&page=&limit=`, `PATCH /admin/enquiries/:id` with `{expectedVersion,status,notes}`; statuses new, contacted, quoted, closed, spam. Admin notes max 2000. `POST /admin/enquiries/:id/notification` retries pending/failed notification using the original provider idempotency key. Environment: RESEND_API_KEY, INQUIRY_NOTIFY_FROM (verified sender), INQUIRY_NOTIFY_TO (owner-approved recipient). No sender credentials in frontend. Provider deduplication window is documented in the operations runbook; ambiguous/outside-window retries need manual review. Direct WhatsApp links do not prove message delivery.

## Deployment and acceptance

Implement/test on a separate disposable replica-set database with a test-only database name. Tests must refuse production/demo DATABASE_ACCESS and never seed/drop `mtcards_demo`. Include MongoDB transaction rollback, concurrent stock updates, replay, stale card edits, image validation/ownership/removal and notification failure/retry tests. External media/email calls are mocked in integration tests; actual provider verification awaits private configuration.

Release gates: dependency/secret scans, unit tests, real MongoDB integration tests, frontend build compatibility and read-only production smoke tests. Take/verify a backup before any intentional future data migration. Default indexes/migrations stay off at runtime; add only new collections explicitly. Roll back code/config, never roll back balances blindly. Keep provider-side revocation and unconfigured services marked outstanding until evidence confirms completion.
