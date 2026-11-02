# HealthTrack V2 production readiness

Classification: **NOT READY**

The Wellness Tracker formulas and `wellness-v1.0` weights were not changed. Nothing was deployed, and no hosted database or email account was provisioned.

## 1. Production architecture

The app is a Next.js 16 server with better-auth and `@libsql/client`. Health records and auth rows live in one SQL database. Sessions are rows in `session`, referenced by the `better-auth.session_token` cookie. There is no separate file store: a chosen lab file stays in the browser and is not uploaded.

Local development uses `file:data/healthtrack.db` on this computer's disk. That file survives restarts of this machine. It does not survive Vercel or Lambda, because those filesystems are ephemeral. Startup now refuses a `file:` URL when `VERCEL=1` or `AWS_LAMBDA_FUNCTION_NAME` is set.

Recommended production database, using the current client and SQL:

- Hosted libSQL, with `DATABASE_URL=libsql://…` and `DATABASE_AUTH_TOKEN`. Turso is the compatible hosted service. No schema rewrite is required.
- Or one long-lived Node process with a persistent disk and `file:…`, plus disk snapshots. This is not appropriate for serverless hosting.

Development applies versioned migrations when the database opens. Production does not change schema on startup. Run `npm run db:migrate` as a controlled step before a release. Applied versions are stored in `schema_migration`. There is no down migration. Backups are not configured in the app. A hosted libSQL database should use the provider's point-in-time backups before launch. A disk-backed file database needs scheduled copies of the database file while the process is stopped or through the host's snapshot tool. The deployment steps are in `docs/HEALTHTRACK_V2_DEPLOYMENT_GUIDE.md`.

## 2. Authentication status

| Flow | Status |
| --- | --- |
| Registration | Implemented with email and password. Minimum password length is 8. |
| Login and logout | Implemented. Logout calls the auth sign-out endpoint. |
| Session expiration | Sessions last 7 days and refresh after 1 day of use. A live wait for expiry was not performed. |
| Password reset | The page refuses to claim a message was sent unless email delivery is configured. Delivery itself is not configured. |
| Email verification | Sent only when Resend is configured. It is currently off, so new accounts are not required to verify. |
| Protected pages | Middleware requires a session cookie value of at least 16 characters. The page then loads the account from the API. |
| Protected APIs | `requireUser()` uses the server session. Unauthenticated requests to coach, logs, export, and cycle returned HTTP 401. |
| Account isolation | Fixture tests confirm one account cannot read or delete the other's logs. |
| Google sign-in | Optional. It appears only when both Google credentials are set. They are not set. |

## 3. Security findings

Fixed in this pass:

- `POST /api/coach` accepted anonymous requests and could forward text to OpenAI. It now requires a session, limits each account to 20 requests a minute, and rejects bodies over 20 KB. It does not query health, cycle, or lab tables.
- Rate-limit keys no longer trust `X-Forwarded-For` unless `VERCEL=1` or `TRUST_PROXY=1`.
- Production runtime requires `BETTER_AUTH_SECRET` and an `https://` `BETTER_AUTH_URL`.
- API responses are marked `private, no-store`. Pages send `nosniff`, a strict referrer policy, `DENY` framing, and a locked-down permissions policy.
- Log and workspace writes reject oversized bodies.
- Export adds the account's measurements and official scores. Device token hashes are not included.

Checked and left as designed:

- Log update and delete statements include `user_id`. A missing row returns 404.
- Cycle coaching context is null unless consent is enabled. Turning consent off does not by itself delete stored entries. Delete is a separate action and was verified in the fixture test.
- Account labs start empty. Uploading a report file does not create a record. The score flags `labsAffectScore` and `cycleAffectsScore` stay false.
- Passwords are stored by better-auth as hashes. The export does not include them.
- Cookies use the secure prefix in production.

Residual risk:

- Authentication, coaching, measurement, and pairing routes now share a libSQL counter in `rate_limit_bucket`, with the process memory limiter still applied first. better-auth's own limiter remains in memory and resets on deploy. A caller-supplied `X-Forwarded-For` value does not select a bucket. On Vercel, or when `TRUST_PROXY=1`, the bucket uses `X-Real-IP`.
- Account deletion in the browser, which requires the account password and calls `/api/auth/delete-user`, was not executed because it would remove the local account. `deleteHealthData` was executed on fixture rows.
- HTTPS and HSTS must be terminated by the host. The app does not send an HSTS header, so a local `next start` on HTTP is not forced into HTTPS.

## 4. Database readiness

The local file database is suitable for development on this computer. It is not a production database until the host is either a persistent disk with backups or hosted libSQL. No production data was migrated.

A fixture file database was closed, reopened, and still contained the row `FIXTURE meal not a patient record`.

## 5. End-to-end test results

Commands after these changes:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- `npm test` passed: 25 tests, 0 failed. That includes the existing scoring suite and four readiness tests.
- `npm run build` passed.

The readiness fixture, using obviously fake records, confirmed:

1. A profile and goals can be stored.
2. Meal, hydration, sleep, activity, and recovery rows can be stored.
3. An official score is saved when the pillars are complete.
4. Editing the fixture meal changes the exact score.
5. A prior `wellness-v1.0` row remains after the current day is recalculated.
6. With fewer than 28 scores, the personal baseline message is still “Your personal baseline is still building.”
7. Deleting recovery leaves a score from the other three pillars, with different weights.
8. Disabling cycle consent removes it from authorized context and does not change the score. Deleting cycle data removes the rows.
9. The second fixture account does not see the first account's meals.
10. `deleteHealthData` removes the fixture meals and official scores.

Unauthenticated HTTP checks against the running app returned 401 for `/api/coach`, `/api/v1/me/logs?kind=meal`, `/api/v1/me/export`, and `/api/v1/me/cycle`.

The signed-in Today page shows the nonclinical disclaimer and the sentence that meal logging and calorie matching are not proof of nutritional health. A brand-new browser registration, a live password reset, and a live account deletion were not run in this pass.

## 6. Remaining blockers

- No hosted database and no backup schedule.
- Email delivery is not configured, so verification and password reset cannot be delivered.
- Rate limits are per process.
- Payments are not implemented.
- Population comparison has no reference cohort.
- The full registration, reset, and account-deletion clicks were not repeated in the browser.

## 7. Required external credentials

| Name | Required for launch |
| --- | --- |
| `BETTER_AUTH_SECRET` | Yes. A long random value, only on the server. |
| `BETTER_AUTH_URL` | Yes. The public `https://` origin. |
| `DATABASE_URL` | Yes. Hosted `libsql://` on ephemeral hosting, or `file:` only on a persistent disk. |
| `DATABASE_AUTH_TOKEN` | Yes when the database is hosted libSQL. |
| `RESEND_API_KEY` and `EMAIL_FROM` | Yes before password reset or verification can be offered. |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | No, unless Google sign-in is part of the launch. |
| `OPENAI_API_KEY` | No. Coaching stays on the deterministic engine. |
| `TRUST_PROXY` | Only when a trusted proxy in front of Node sets `X-Forwarded-For`. |

## 8. Deployment prerequisites

1. Choose hosted libSQL or a single server with a persistent disk.
2. Set the production environment variables above. Do not put secrets in client code.
3. Confirm startup against that database and take a backup before inviting users.
4. Serve the site over HTTPS.
5. Configure Resend before telling users that password reset works.
6. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` on the release commit.
7. Do not point serverless hosting at `file:data/healthtrack.db`.

## 9. Release decision

**NOT READY**

The score engine and the account boundaries covered by the fixture tests can run on a durable database. Launch still needs that database, backups, HTTPS, and working password-reset email. Google sign-in is not required for that decision.
