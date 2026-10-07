# Daily OS security review — October 7, 2026

Scope: this website, its installed iPhone PWA, bundled dependencies, supplied backend SQL, repository/history secret patterns, and read-only anonymous probes against the supplied live Supabase project. There is no separate native iPhone source in this repository.

This is a bounded code/security review, not a guarantee that every possible flaw is absent. No existing user records or photos were deliberately deleted or rewritten during the audit. Browser tests use an isolated profile and generated photos; backend tests use a temporary PostgreSQL engine, not the production database.

## Issues and action

| Severity | Finding | Action / remaining work |
|---|---|---|
| High | Signing out left private local records/photos visible in the app | Sign-in gate hides all personal pages and modals after sign-out. Offline copies remain saved for recovery. Device/browser storage is not encrypted by this UI gate; use your device passcode and private browser profile. |
| High | Live public signup is enabled (`disable_signup:false`) | Removed client signup UI/API path. **Administrator must disable new signups in Supabase Authentication**; hiding the button alone does not stop direct signup requests. |
| High | Original policies allowed any registered account its own namespace, rather than exclusively the owner's account | Prepared singleton owner restriction in `supabase-security-hardening.sql`; ambiguous owner selection stops safely. **Apply to live database.** |
| High | Pre-existing permissive policies could broaden record/photo access | Setup adds restrictive owner/folder policies and an anonymous photo guard. **Apply revised SQL and inspect all other tables/buckets with supplied check script.** |
| Medium | Uploads lacked explicit type/size limits | Client accepts supported raster photos under 25 MiB and converts to JPEG under 10 MiB. Backend bucket now requires JPEG/10 MiB in supplied SQL. Original saved photos remain intact. Server checks declared MIME/size; it is not a deep file-content malware scanner. |
| Medium | Stored backend settings could bypass rejection of secret/service-role keys | Validate public key on every connection as well as configuration. No embedded private keys matched the current-source or 45-commit history pattern scan. Pattern scanning cannot prove absence of every possible secret. |
| Medium | Malformed cloud paths/cross-tab JSON could crash sync or assign unsafe object properties | Validate records, paths and photo ownership; reject unsafe fields; handle malformed storage events. |
| Medium | Multiple tabs could overwrite pending queues, replay acknowledged changes, or stamp incoming updates as new edits | Merge durable metadata on persistence; preserve in-flight edits; track acknowledgements; apply storage notifications without duplicating local edits. Added delayed-RPC regression. |
| Medium | Overlapping catch-up operations and cloud root deletion could leave stale data displayed | Serialize catch-up operations and clear deleted documents/photos. Tombstones and offline queues retained. |
| Medium | Backup restore could partially replace data, accept malformed photos, and bypass sync | Validate supported backup and JPEG contents before writes; batch photos into one database transaction; roll back local values if storage fails; queue successful restores for sync. Restore remains an explicitly confirmed overwrite of matching data, not an automatic merge. |
| Medium | Service worker's broad cache could store future private/signed URLs or delete other app caches | Cache only approved public assets; bypass private requests; scope cleanup to Daily OS; handle cache quota failures. |
| Medium | Saved photos with matching timestamps could incorrectly be treated as the same file | Check cloud file path as well as timestamp before retaining downloaded copy. |
| Medium | Missing content policy and privacy referrer setting | Added provider-scoped meta CSP, blocked objects/base/form navigation, HTTPS upgrading and no-referrer. Existing providers remain allowed. Runtime Babel requires inline scripts/styles; CSP therefore is not a full defense against script injection. |
| Medium, remaining | Optional private food/voice provider keys live in the browser for direct provider calls | No such keys are embedded in source, backups or sync. **A server-side proxy with securely configured provider credentials is required to eliminate browser-held private AI keys.** Normal login access/refresh tokens also necessarily exist in this browser client; XSS or a compromised device can expose them. |
| Low | Babel runtime was outdated | Updated standalone to 7.29.6 with matching integrity hash and browser/compiler validation. Kept React/Supabase compatibility; reviewed advisories did not establish an exploitable issue in these installed versions. |
| Low, remaining | GitHub Pages cannot configure all desired response headers | HTTPS/HSTS were present live. Meta CSP cannot implement frame-ancestors, HTTP-only cookies, Permissions-Policy, or X-Content-Type-Options. Full response-header control requires a hosting/proxy change; existing iPhone origin was preserved. |
| Low | Photo decode failures, stale thumbnail reloads and oversized views | Reject failed image conversions; release object URLs; guard reload races; use cached thumbnails and a viewport-bound body-portal dialog. |
| Medium | Bodyweight history used one atomic list, risking loss of simultaneous entries on different dates | Store date-keyed sync items without changing the public log shape. Distinct dates merge; same-day conflicting weight changes retain latest-edit-wins behavior. |

## Live results and limits

Using the public publishable key only: anonymous Daily OS record read was denied (HTTP 401); bucket and progress-photo listings revealed nothing; public photo routes reported “Bucket not found” (consistent with private storage, but also possible for an absent bucket). Auth settings confirmed public signup enabled. Owner migration table was absent from the API schema cache, indicating owner-only hardening appears pending.

An owner session/admin connection is still required to verify all actual tables, all buckets, stored files, owner access and a second signed-in account end to end. Public schema enumeration requires an administrator key. No signup, upload or production write was used to probe security.

## Administrator steps

1. Download an app backup before backend changes. Identify your account UUID under Supabase Authentication → Users.
2. Disable **Allow new users to sign up** under Authentication settings. Keep email/password login enabled for your existing account; check email recovery and redirect URLs.
3. Run `supabase-setup.sql`, then `supabase-security-hardening.sql` in the project's SQL Editor. If multiple users exist, replace `owner_override uuid := null` with your UUID before running the second file. It refuses ambiguous choices and never selects another owner automatically. These scripts change access rules and bucket limits, not existing records/photos.
4. Run `supabase-security-check.sql`. Its probes roll back. Review the resulting inventory: every additional application table needs appropriate row rules and each bucket must be intentionally private. These scripts do not change unrelated application tables/buckets automatically.
5. With the actual owner account, test a habit tick, a per-day time edit/deletion, offline/reconnect, and a new photo between phone and laptop. If testing another existing account, confirm it cannot read/write Daily OS. Do not reopen public signup just for testing.
6. Keep weekly exported backups including photos; consider paid automatic database backups. A server-side AI proxy and a host supporting response headers are follow-up work if you require stronger browser-key and framing protections.

## Verification

Regression suites cover record merges, XP deduplication/reversal, per-day deletion/time isolation, offline queue restart/retry, concurrent tabs with delayed network acknowledgement, public-key rejection, malformed path defense, private photo download checks, service-worker privacy/offline behavior, responsive photos and dialog behavior, auth gating, export/restore, and PostgreSQL policy enforcement. SQL was tested for idempotence and for denial even when a permissive policy is deliberately added. Live phone/laptop owner sync was not tested without your signed-in session.

Same-field conflicts still use timestamp/device ordering. Clock skew can influence which edit wins; use automatic device clocks. Non-ID legacy arrays can still merge as a whole list. This preserves existing conflict behavior instead of attempting an unreviewed destructive data migration.

References: [Supabase row security](https://supabase.com/docs/guides/database/postgres/row-level-security), [private storage](https://supabase.com/docs/guides/storage/security/access-control), [upload limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [Supabase auth advisory](https://github.com/advisories/GHSA-8r88-6cj9-9fh5), [Babel advisories](https://github.com/babel/babel/security/advisories), [frame-ancestors limitations](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).
