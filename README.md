# Odhu Indhu Admin

Private operations dashboard for the Odhu Indhu learning app.

## What it covers

- Live learner, study-session, topic-generation, and quiz metrics from Neon
- Learner directory and recent learning activity
- Study and topic pipeline health
- Weekly Monday-intention and Sunday-reflection voice-note monitoring
- Private voice-note playback through an authenticated server route
- Weekly report activity and summary metrics

## Access control

Neon Auth provides Google sign-in. Every dashboard data function and private Blob route performs a server-side authorization check. `ACCESS_EMAIL` accepts one verified administrator email or a comma-separated allowlist; a signed-in user with any other email is redirected to the access-denied page. Missing or empty configuration denies everyone.

## Local development

Copy the required values into `.env.local` (never commit it), then run:

```bash
npm install
npm run dev
```

Required services are documented in [`.env.example`](./.env.example). `BLOB_READ_WRITE_TOKEN` authorizes private voice-note retrieval; `BLOB_STORE_ID` is used as a deployment health signal. If `NEON_AUTH_COOKIE_SECRET` is omitted, the existing 32+ character `CRON_SECRET` is used as the session-cookie key.

## Verify

```bash
npm run lint
npm run build
```
