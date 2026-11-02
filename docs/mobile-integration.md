# Companion app integration

The web app is the account system and the API. The mobile app uploads measurements after a person pairs it. The mobile app is not shipped with this repository, and the website does not pretend a device is connected.

## API base URL

Local: `http://localhost:3000`

Production base URL is the deployed origin. The versioned API is `{origin}/api/v1`. The OpenAPI document is `docs/openapi/v1.yaml`.

People sign in through `{origin}/api/auth/*` (Better Auth). Device uploads do not use that session. They use the bearer token from pairing.

## Pairing

1. The person signs in on the web and opens Devices.
2. The web app calls `POST /api/v1/pairing-sessions` with the session cookie.
3. The response contains an 8-character code and `expiresAt`. The code expires in 10 minutes and works once. Creating another code immediately invalidates the previous unused code for that account.
4. The mobile app calls `POST /api/v1/pairing-sessions/complete` with JSON:

```json
{
  "code": "K7M2Q9LP",
  "installationId": "installation-uuid",
  "name": "Noel's iPhone",
  "platform": "ios"
}
```

5. A successful response is `201`:

```json
{
  "deviceId": "uuid",
  "token": "store-this-once",
  "categories": ["sleep", "recovery", "activity", "heart"]
}
```

Store the token in the platform keychain or keystore. The server stores only a hash. A second attempt with the same code fails. An expired code fails. Create a new code on the web.

## Uploading measurements

`POST /api/v1/measurements`

`Authorization: Bearer {token}`

`Idempotency-Key: {stable-key-for-this-attempt}`

`Content-Type: application/json`

Maximum 500 records and 1 MB.

```json
{
  "measurements": [
    {
      "sourceRecordId": "steps-2026-10-16",
      "metric": "steps",
      "value": 8420,
      "unit": "count",
      "startTime": "2026-10-16T15:00:00.000Z",
      "endTime": "2026-10-16T23:00:00.000Z",
      "timezone": "America/New_York"
    }
  ]
}
```

Success:

```json
{
  "accepted": 1,
  "duplicates": 0,
  "rejected": [],
  "replayed": false
}
```

Send the same `Idempotency-Key` when retrying an unchanged batch. The original result is returned and no second copy is stored. Use a new key only for a new batch. Keep `sourceRecordId` stable for the same source sample so a later batch counts it as a duplicate instead of a second row.

`GET /api/v1/sync` with the same bearer token returns `deviceId`, `status`, `lastSyncAt`, and `latestBatch`. `lastSyncAt` changes only when at least one record is accepted.

## Metrics and units

| Metric | Unit |
| --- | --- |
| steps | count |
| active_minutes | min |
| sleep_hours | h |
| sleep_efficiency | percent |
| bedtime_minutes | min |
| resting_heart_rate | bpm |
| heart_rate | bpm |
| hrv_ms | ms |
| evening_walk_minutes | min |

`startTime` and `endTime` are ISO-8601. `timezone` is an IANA name and is used to place the record on a local calendar day, including daylight-saving changes. Do not send a user id. Values must be zero or greater. `startTime` more than 24 hours in the future is rejected. A wrong unit is rejected and does not fail the rest of the batch.

Rejected items include `sourceRecordId`, `code`, and `message`. They do not include the measurement value. Retry only the records that were not accepted or counted as duplicates.

`heart_rate` is stored but is not copied into the daily resting-heart-rate field. Missing daily fields stay null. They are not zero.

## Disconnect

The person can disconnect from Devices. That calls `DELETE /api/v1/devices/{deviceId}` with the session cookie. The token stops working. Stored measurements remain until the person deletes health data or the account.

## Errors

Errors use `{ "error": { "code": "...", "message": "..." } }`.

- `401` missing, unknown, or revoked device token, or missing web session
- `400` invalid body, missing `Idempotency-Key`, expired, used, or replaced pairing code, or more than 500 records
- `413` body larger than 1 MB
- `429` rate limit

Do not log tokens or measurement payloads.

## Environment and infrastructure

See `.env.example`.

The web developer owns accounts, the database, pairing, validation, and the Today dashboard. The mobile developer owns the iOS or Android app, HealthKit or Health Connect permission, secure token storage, and calling this contract. Do not invent a bundle id, signing key, store URL, or OAuth client in the mobile app until those values are agreed and placed in environment configuration.

## Open decisions

- Production database URL. Local development uses SQLite. Vercel needs a hosted libSQL database (`DATABASE_URL` and `DATABASE_AUTH_TOKEN`).
- Email provider (`RESEND_API_KEY`, `EMAIL_FROM`) before verification and password-reset mail can send.
- Google OAuth client (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) before Google sign-in appears.
- Mobile platform, bundle identifier, and where the pairing code is entered. The web app shows the code as text. It does not publish a QR code or a store link until the app exists.
- Rate limits are in memory on one server instance and are not shared across a fleet. A multi-instance deployment needs a shared limiter. `POST /api/v1/measurements` requires an `Idempotency-Key`. `name` and `platform` are optional on pairing completion.
- `OPENAI_API_KEY` is optional. Coaching still has a deterministic fallback.
