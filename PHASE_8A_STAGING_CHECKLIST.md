# Phase 8A — Staging and Internal Showroom Beta

This checklist is the launch gate for the Draft Interiors staging environment. Staging must use real infrastructure but must not be publicly promoted or treated as the production system.

## Automated gate

Run these commands from the repository root:

```powershell
npm test
npm run lint
npm run build
npm run staging:check
npm audit --prefix server --omit=dev
npm audit --prefix client --omit=dev
```

`staging:check` reports only pass/fail names. It never prints secret values.

## Required environment

- `NODE_ENV=production`
- `SERVE_CLIENT=true` for the supported single-origin deployment
- `DATABASE_PATH` points to a persistent mounted volume
- `BACKUP_DIRECTORY` points to a separate persistent backup location
- `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and a unique `ADMIN_SESSION_SECRET`
- `ADMIN_SECURE_COOKIES=true`
- Complete `SMTP_*` settings and `ENQUIRY_RECIPIENT_EMAIL`
- `TRUST_PROXY=1` only when the hosting platform places exactly one trusted proxy in front of Node

Never copy the local `.env` file to source control or a container image. Configure secrets through the hosting provider's encrypted environment settings.

## Infrastructure gate

- HTTPS certificate active with HTTP redirected to HTTPS
- Private staging hostname selected
- Persistent disk survives restarts and redeployments
- `/api/v1/health/live` used for process liveness
- `/api/v1/health/ready` used for database readiness
- Logs retained by the hosting platform without customer messages or credentials
- Daily `npm run backup` scheduled
- Backups copied off the application server and retained for at least 30 days
- One restore drill completed into a temporary environment
- Uptime alert configured for readiness failures

## Business acceptance test

1. Submit a real test enquiry from desktop and mobile.
2. Confirm the database record and notification email.
3. Sign in to `/admin` using the real admin account.
4. Change status through the complete sales workflow.
5. Add and retrieve an internal note.
6. Test call, WhatsApp, email, and updated quotation actions.
7. Save and share a configuration in a private browser window.
8. Download and inspect the branded PDF quotation.
9. Restart the service and verify that enquiries remain available.
10. Restore the latest backup and compare enquiry counts.

## Beta release

- Create tag `v1.0.0-beta.1` only after every gate above passes
- Restrict the beta to Draft Interiors staff
- Run the showroom beta for one week
- Record defects and operational friction; avoid speculative feature additions
- Promote to `v1.0.0` only after the beta issues are resolved and a final backup is verified

## Decisions still requiring approval

- Staging hosting provider and region
- Staging hostname or subdomain
- Backup storage provider
- Monitoring and alert destination
- Named staff members who need admin access
