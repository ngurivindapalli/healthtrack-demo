# HealthTrack V2 deployment guide

This guide prepares a Vercel deployment that uses hosted libSQL and Resend. It does not deploy the application, create a Turso database, or create a Resend account. Email delivery has not been verified with a real message.

The scoring algorithm `wellness-v1.0` is unchanged.

## 1. Turso configuration

Create an empty hosted libSQL database in the Turso dashboard or CLI. Do not point the application at a database that already contains production records until a backup exists and the migration command has been reviewed.

Use the database URL that starts with `libsql://` and a token that can read and write that database. Put both values in the host's environment, not in source code.

Local development keeps working with no `DATABASE_URL`. The application then opens `file:data/healthtrack.db`. A `file:` URL is refused when `VERCEL=1` or `AWS_LAMBDA_FUNCTION_NAME` is set, because that disk disappears between invocations. A hosted `libsql:` URL in production also requires `DATABASE_AUTH_TOKEN`. The process does not print the URL or the token.

## 2. Resend configuration

Create a Resend API key and a verified sender. Set both on the server:

- `RESEND_API_KEY`
- `EMAIL_FROM`, for example `HealthTrack <mail@your-domain>`

When both are set, new accounts must verify email before sign-in, and password reset asks Resend to send a link. The reset token expires after one hour. The link and any `callbackURL` or `redirectTo` parameter must stay on the origin in `BETTER_AUTH_URL`. The server throws if Resend is not configured or if Resend returns an error. The browser is not told that a message arrived. The key is read only in server code.

Until a message is sent to a real inbox and the link is opened, treat email as unproven.

## 3. Vercel configuration

- Framework: Next.js. Build command: `npm run build`. Output is the Next.js default.
- Node runtime is required for the API routes that open libSQL. Those routes set `runtime = "nodejs"`.
- Do not run the migration from a serverless function on every cold start. Run it once before promoting the deployment.
- Set `BETTER_AUTH_URL` to the public `https://` origin. Set `BETTER_AUTH_SECRET` to a unique value of at least 32 characters.
- Vercel sets `VERCEL=1`. The app then sends `Strict-Transport-Security: max-age=31536000; includeSubDomains` and uses the platform `X-Real-IP` header for shared rate-limit buckets. `X-Forwarded-For` is ignored.
- Optional Google sign-in needs both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with the callback `{BETTER_AUTH_URL}/api/auth/callback/google`.
- Optional coaching copy needs `OPENAI_API_KEY`. Without it, the coach route returns the built-in fallback.

## 4. Required environment variables

| Name | Required when | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Production runtime | Signs session cookies. At least 32 characters. |
| `BETTER_AUTH_URL` | Production runtime | Public `https://` origin. Also the only allowed email-link origin. |
| `DATABASE_URL` | Hosted database | `libsql://...` for Turso. Omit locally to use `file:data/healthtrack.db`. |
| `DATABASE_AUTH_TOKEN` | Hosted database | Turso token. Required with a `libsql:` URL in production. |
| `RESEND_API_KEY` | Email | Server-only Resend key. |
| `EMAIL_FROM` | Email | Verified sender. Both email variables must be set together. |
| `TRUST_PROXY` | Non-Vercel proxy | Set to `1` only if that proxy sets `X-Real-IP`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in | Optional. Both or neither. |
| `OPENAI_API_KEY` | Model coaching copy | Optional. |

`.env.example` lists the same names without secret values.

## 5. Database migration commands

From a machine that has the production `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in its environment:

```bash
npm run db:migrate
```

The command loads `.env` and then `.env.local`. It prints whether the target is hosted libSQL or a local file. It does not print the URL or token. It records each version in `schema_migration` and skips versions that are already recorded. The statements create missing tables and add missing columns. They do not drop tables or delete rows.

Run it once per release, after a backup and before traffic uses the new code. Development still applies pending migrations when the local process opens the database. Production startup, including `next build`, does not.

## 6. Backup requirements

Take a Turso point-in-time backup, or an equivalent snapshot, before the first migration and before every later migration. Confirm you can restore that snapshot to a separate database. The application has no backup scheduler and no down migration.

For a local file database, copy `data/healthtrack.db` only while no process has it open, or use a host snapshot. Do not deploy that file to Vercel.

## 7. HTTPS and domain configuration

Serve the site only over HTTPS. Set `BETTER_AUTH_URL` to that exact origin, including the scheme. Production sessions use the secure cookie flag. HSTS is added when `VERCEL=1`. Attach the domain in Vercel and wait until the certificate is active before sending the URL to users. Cookie redirects and email links use this origin. A different preview origin needs its own `BETTER_AUTH_URL` and is not a substitute for the production origin.

## 8. Post-deployment verification

Check these against the deployed origin. Do not treat a local result as proof.

1. `GET /api/health` returns `ok` and does not include a database URL or token.
2. Sign-up with a new mailbox. Open the verification message and sign in. If no message arrives, stop and treat email as failed.
3. Request a password reset, open the one-hour link, set a new password, and confirm the old password no longer works.
4. Repeat a sign-in POST past the limit and confirm HTTP 429, then confirm a database outage would return 503 rather than unlimited attempts.
5. Export data, change cycle consent, and delete an account only with a test account you can afford to remove.
6. Confirm Today still shows wellness `wellness-v1.0` and the nonclinical wording.

## 9. Rollback procedure

1. In Vercel, promote the previous deployment. Environment variables stay with the project, so confirm they still match that build.
2. Do not run a reverse schema change. The shipped migrations only add tables and columns.
3. If a migration must be undone, restore the Turso snapshot taken before that migration onto a new database, point `DATABASE_URL` and `DATABASE_AUTH_TOKEN` at it, and redeploy.
4. If email links use the wrong origin, fix `BETTER_AUTH_URL` and send a new reset. Do not reuse an old link from another origin.

## What is still manual

Turso, Resend, the domain certificate, and backups are outside this repository. None of them were created or tested for this change. The release stays not ready until those exist and section 8 has been completed on the real origin.
