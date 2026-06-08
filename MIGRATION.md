# PsyConnect Migration Notes

This clean export removes Replit-only cache folders and generated output. It is ready to upload to GitHub.

## What This App Is

- Package manager: pnpm workspace
- Runtime: Node.js 24
- Frontend: Vite React app in `artifacts/psyconnect`
- Backend: Express API in `artifacts/api-server`
- Database: PostgreSQL via Drizzle in `lib/db`

## Required Environment Variables

Copy these from Replit Secrets into the new host:

- `DATABASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `ELEVEN_LABS_API_KEY`
- `LOG_LEVEL` optional

The hosting provider will usually set `PORT` automatically for the API server.

## Recommended Hosting

Use Render or Railway for the API because it is an Express server that needs PostgreSQL and server-side environment variables.

You can host the frontend separately on Vercel or Netlify. The frontend currently calls `/api/...` relative paths, so one of these must be true:

- the frontend host rewrites `/api/*` to the deployed API URL, or
- the frontend code is updated to call `setBaseUrl("https://your-api-host")` from `@workspace/api-client-react`.

This export now includes that frontend wiring. Set `VITE_API_BASE_URL` on the frontend service to your deployed API URL, for example:

```text
https://psyconnect-api.onrender.com
```

## Render Blueprint

This folder includes `render.yaml`, which can create:

- `psyconnect-db` PostgreSQL database
- `psyconnect-api` Node web service
- `psyconnect-web` static frontend

After pushing this folder to GitHub, in Render choose New > Blueprint and select the repository.

Render will ask for the secret values marked `sync: false`. Paste the matching values from Replit Secrets.

## API Service

Root directory: repository root

Render service type: Web Service

Build command:

```bash
pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build
```

Start command:

```bash
pnpm --filter @workspace/api-server run start
```

Health route:

```text
/api/healthz
```

Environment variables:

- `NODE_VERSION=24.11.1`
- `NODE_ENV=production`
- `DATABASE_URL` from Render Postgres
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `ELEVEN_LABS_API_KEY`

## Frontend Service

Root directory: repository root

Render service type: Static Site

Build command:

```bash
pnpm install --frozen-lockfile && PORT=3000 BASE_PATH=/ pnpm --filter @workspace/psyconnect run build
```

Publish directory:

```text
artifacts/psyconnect/dist/public
```

Environment variables:

- `NODE_VERSION=24.11.1`
- `PORT=3000`
- `BASE_PATH=/`
- `VITE_API_BASE_URL=https://your-api-service.onrender.com`

Add this rewrite rule for the static site:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

If the frontend host does not support Unix-style inline environment variables, set these in the host dashboard instead:

- `PORT=3000`
- `BASE_PATH=/`

## Database

Provision a PostgreSQL database, copy its connection string into `DATABASE_URL`, then apply the schema:

```bash
pnpm --filter @workspace/db run push
```

Run this only after `DATABASE_URL` points to the new database.

## Removed From Original Replit ZIP

- `.local/` Replit cache and templates
- `.git/` local Git metadata
- `.agents/`
- `dist/`, `build/`, `.next/`, `node_modules/`, `.cache/`
