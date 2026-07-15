# Draft Interiors Configurator

The project contains a Vite/React configurator in `client/` and a small Node.js persistence API in `server/`.

## Development

Requirements: Node.js 24 or newer.

```powershell
npm install --prefix server
npm install --prefix client
npm run migrate
npm run dev:server
```

In a second terminal:

```powershell
npm --prefix client run dev
```

Vite proxies `/api` to `http://localhost:8787`. In production, expose the API through the same origin; `VITE_API_BASE_URL` can set that same-origin API prefix when needed. Server settings are read directly from `PORT`, `DATABASE_PATH`, and `JSON_BODY_LIMIT`; see `.env.example` for development values.

## Persistence architecture

`POST /api/v1/configurations` validates and normalizes a configuration, recalculates its INR price from the application catalogue, assigns a UUID, and creates an immutable SQLite record. `GET /api/v1/configurations/:id` restores that record. The public contract is versioned under `/api/v1`.

Route handlers delegate to `ConfigurationService`; SQLite access is isolated in `SqliteConfigurationRepository`. A future PostgreSQL implementation can replace that repository without changing the API or browser service. SQL migrations live in `server/migrations` and are recorded in `schema_migrations` so `npm run migrate` is repeatable.

Browser saves remain authoritative for the anonymous saved-design list. The application writes local storage before attempting the API and attaches a returned `serverId` alongside the existing browser-generated `id`. API failures never delete or replace local records. Existing version-1 inline `design` links remain supported; new share attempts use a server-backed `configuration` ID when available and automatically fall back to the inline format when unavailable.

The public API deliberately supports no update, delete, list, account, authentication, payment, checkout, or administration endpoints. Customer enquiry data can only be written through the public API; it has no public read route.

## Customer enquiries

`POST /api/v1/enquiries` accepts contact and configurator quote enquiries. Customer details are stored in a separate write-only SQLite table and are never returned through a public read or list endpoint. Configurator submissions are normalized against the catalogue and priced again on the server; browser-submitted prices are ignored.

The enquiry flow includes explicit consent, phone and email validation, a honeypot field, per-process rate limiting, safe length limits, generic failure responses, idempotent submission IDs, and automatic deletion of records older than `ENQUIRY_RETENTION_DAYS` (90 days by default). New records receive the business status `new`; notification delivery is tracked separately. The approved customer contact routes are WhatsApp `+91 98666 55409` and `manikanta8686@draftinteriors.com`.

Enquiries are stored successfully even when email delivery is not configured. To send an email notification, set all `SMTP_*` variables shown in `.env.example` in the deployment environment. The server start, development, and migration commands load an optional root `.env` file automatically. SMTP passwords must remain outside source control. `ENQUIRY_RECIPIENT_EMAIL` controls the notification destination.

## Checks

```powershell
npm test
npm run lint
npm run build
```
