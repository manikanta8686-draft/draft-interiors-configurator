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

The API deliberately supports no update, delete, list, account, authentication, customer-data, payment, checkout, or administration endpoints.

## Checks

```powershell
npm test
npm run lint
npm run build
```
