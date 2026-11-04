# Maa Tara frontend / backend handoff

Frontend branch: `design/admin-workspace`, based on `feature/admin-login` (PR #14). This PR changes frontend and this document only. No database writes, migrations or backend deployment were performed during development.

## Screens delivered

- `/`: existing photographic storefront, upgraded product presentation and navigation.
- `/catalogue`: dedicated searchable catalogue, categories and gallery with product information.
- `/enquiry?card=MT.%20108`: enquiry composer; opens WhatsApp/email for customer to send. It does not submit, store or send messages automatically. Configure public `REACT_APP_WHATSAPP_NUMBER` and `REACT_APP_ENQUIRY_EMAIL`. Do not put mail-provider credentials in frontend variables.
- `/login`, `/admin/setup`: redesigned existing authentication flows.
- `/admin`: overview; `/admin/cards`: searchable library; `/admin/stock`: stock table; `/admin/cards/new`: creation/editor; `/admin/cards/:id/edit`: live visual edit preview + browser-session draft; `/admin/enquiries`: disconnected inbox layout; `/admin/settings`: read-only settings layout.
- `/upload` redirects to `/admin/cards/new`. Missing/expired sessions redirect to login. Admin workspace mounts only after `/admin/session` verification. Backend must enforce permissions on every protected endpoint independently.

## Existing APIs used now

| Method | Endpoint | Request / response |
|---|---|---|
| POST | `/login` | `{email,userPass}` -> `{token:"Bearer …"}` |
| GET | `/admin/session` | Authorization bearer header; 200 verifies admin |
| POST | `/admin/setup` | `{token,password}` -> `{success:true}` |
| GET | `/allPost` | array of existing products |
| POST | `/createPost` | existing product fields -> 201 `{post:{…}}` |
| DELETE | `/deletePost/:id` | bearer admin; `{success:true}`; explicit confirmation in UI |

On branch `fix/signed-admin-image-upload`, new-card creation requires local JPG/PNG/WebP photos and sends them to the authenticated two-step `/admin/uploads/sign` + multipart `/admin/uploads` API, then attaches returned `imageAssetIds` to `POST /admin/cards` with `status:published`. Initial stock above zero is recorded using an idempotent `POST /admin/inventory/:cardId/adjustments` request; a failed or ambiguous stock response is explicitly retryable without making another card. Existing legacy CreatePost remains unmounted by App routes and must not be re-enabled.

## Needed APIs (proposed, not called by this frontend yet)

| Area | Contract |
|---|---|
| Private catalogue | `GET /admin/cards?q=&category=&stock=&page=&limit=` -> `{items,total,page,limit}`. Include private prices and stock only for admins. Keep public responses to customer-safe fields. |
| Card read/update | `GET /admin/cards/:id`; `PATCH /admin/cards/:id` allowlisted fields, version conflict protection -> `{card}`. UI publishing of edit drafts is currently disabled. |
| Lifecycle | `PATCH /admin/cards/:id` with `status:draft/published/archived`; prefer archive for referenced products. Current deletion is permanent through existing endpoint; backend should reject referenced-card deletion with 409. No bulk-delete endpoint. |
| Secure media | `POST /admin/uploads/sign` -> short-lived upload parameters/URL; confirm uploaded assets before attaching to products. Validate type, actual content, size, count, ownership and host. Return canonical image URL and asset ID; support ordering/removal. No signing secrets in React. |
| Inventory | `GET /admin/inventory` -> per SKU `{cardId,unit:"set",onHand,reserved,available,lowStockThreshold,envelopeMode,envelopeStock,version}`. `available=onHand-reserved` computed server-side. |
| Stock adjustments | `POST /admin/inventory/:cardId/adjustments` with `{delta,reason,note,expectedVersion,idempotencyKey}`; reason purchase/sale/wastage/correction. Return updated inventory + ledger entry. Reject invalid/negative balances and stale versions. |
| Stock history | `GET /admin/inventory/:cardId/movements` paginated; actor, time, reason, delta, before/after, reference. Orders/reservations must be transactional and release on cancellation/expiry. |
| Enquiries | `POST /enquiries` -> 201 `{id,status:"new"}` from validated customer/card/quantity/date/message/contact/channel. Add rate limits and spam protection. `GET /admin/enquiries?status=&q=&page=`; `PATCH /admin/enquiries/:id` for follow-up status/notes. |
| Notifications | Enquiry record persistence and email notification service server-side. WhatsApp click links do not import conversations or guarantee delivery. Automatic WhatsApp notifications require an approved provider integration and appropriate consent/templates. Return honest per-channel delivery status; retries must not duplicate enquiries. |
| Settings | `GET/PATCH /admin/settings` for shop profile/contact info, stock preferences. `GET /shop` exposes public contact data only. |
| Dashboard | `GET /admin/summary` from full filtered inventory, not paginated frontend data; counts, low stock, unread enquiries. |

## Existing product shape

`{_id,title,type1,type2,description,cPrice,sPrice,stock,image:[httpsUrl]}`. Existing prices are strings and stock is numeric. Frontend preserves this shape. Confirm what cPrice/sPrice represent before renaming or migrating them. New editor labels preserve the old Customer Price / Seller Price semantics (Selling price in UI = sPrice).

**Do not reinterpret existing `stock` as sets without verification.** The stock screen says "recorded units"; it does not invent envelope counts or reservations. Missing/invalid stock is unknown, not zero. Overview totals are legacy recorded units. Low stock currently means 1–20 units, a display filter only. Add per-card thresholds and confirmed set mapping in backend with a reviewed migration and backup plan. Preserve current MongoDB records and IDs.

## Shared API rules

- Bearer auth/admin authorization on all private endpoints; never trust frontend route guards. 401 clears session; 403 means insufficient permissions.
- 400/422 for validation; 404 missing record; 409 version/reference conflict; 429 throttled; consistent safe `{error,code,fieldErrors}` payloads. Never expose credentials or stack traces.
- Timeouts/errors must not clear entered form values. Confirmed success only after a valid server response.
- Audit card writes/deletes, settings and stock movements. Do not store passwords, tokens or upload signatures in audits.
- UTC timestamps, stable IDs, INR monetary precision, pagination, maximum field lengths and image limits. Backend secrets stay on Render.

## Acceptance checks for backend developer

Test anonymous/non-admin denials, admin create/update/archive, referenced delete denial, malformed IDs and payloads, unauthorized uploads, expired sessions, stock conflicts/double submission/rollback, enquiry persistence and notification failure/retry. Use isolated test persistence. Frontend tests do not contact or mutate production data.

## Integration work remaining in frontend after backend delivery

Wire PATCH/save/publish, secure upload, stock movement forms/history, inquiry lists/status changes and editable shop settings to the agreed endpoints. Current session drafts are local convenience only, not shared records. Do not enable disabled publish controls until those flows are tested.

## Secure upload rollout gate (branch fix/signed-admin-image-upload)

- Backend PR #17 (`backend/card-stock-media-api`) implements the required authenticated API; it has **not been deployed** merely by opening this frontend PR. Deploy backend first, after owner-managed Cloudinary setup.
- Render service must have `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` configured privately. Disable the legacy unsigned `card_img` preset in Cloudinary provider settings; never put signing credentials or unsigned preset in frontend.
- A returned upload URL is accepted only if it matches a same-origin relative `/admin/uploads?ticketId=...` path, avoiding bearer token exfiltration. Size constraints: 12 images, 5 MiB/file, 25 MiB total, JPEG/PNG/WebP only; backend must validate actual bytes.
- Before public promotion, smoke-test an authenticated admin upload, a denied anonymous upload, one card with multiple images, initial stock >0, and deliberate Cloudinary failure (503). Verify Vercel `REACT_APP_API_BASE_URL` points to the Render API and CORS permits `https://mtcards.in`.
- This frontend PR changes no deployed service, MongoDB records, or Cloudinary configuration. The live site will continue to show the existing upload limitation until compatible backend and frontend are deployed.
