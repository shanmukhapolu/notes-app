# Notes

A minimal private notes app built with React, Auth0, Neon Postgres, and Cloudflare Pages Functions.

## Stack

- React + Vite
- Auth0 SPA SDK for sign-in
- Cloudflare Pages Functions for the API
- Neon PostgreSQL via `@neondatabase/serverless`
- SQL migration in `migrations/001_create_notes.sql`

## 1. Install

```bash
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
```

Fill in the values in both files. Do not commit `.env` or `.dev.vars`.

## 2. Configure Auth0

In the Auth0 Dashboard:

1. Create a **Single Page Application**.
2. Create an **API** with identifier `https://notes-api` and signing algorithm **RS256**.
3. In the SPA settings, add these URLs (replace the production URL with your Cloudflare Pages domain):
   - Allowed Callback URLs: `http://localhost:8788, https://YOUR-PROJECT.pages.dev`
   - Allowed Logout URLs: `http://localhost:8788, https://YOUR-PROJECT.pages.dev`
   - Allowed Web Origins: `http://localhost:8788, https://YOUR-PROJECT.pages.dev`
4. Copy the SPA domain and client ID into `.env`:
   - `VITE_AUTH0_DOMAIN`
   - `VITE_AUTH0_CLIENT_ID`
   - `VITE_AUTH0_AUDIENCE=https://notes-api`
5. Put the same Auth0 tenant domain (without `https://`) and API identifier in `.dev.vars`:
   - `AUTH0_DOMAIN`
   - `AUTH0_AUDIENCE`

The frontend requests an access token for the API audience. The Pages Function validates its signature, issuer, and audience before using the Auth0 `sub` claim as the note owner.

## 3. Configure Neon

Create or use the Neon project and production branch. Copy its pooled or unpooled connection string from Neon and set it as `DATABASE_URL` in `.dev.vars`.

Run the SQL in `migrations/001_create_notes.sql` in the Neon SQL Editor against the production branch. It creates the notes table and index.

For local testing, `.dev.vars` is read by Wrangler. For Cloudflare production, add these environment variables in **Workers & Pages → your Pages project → Settings → Variables and Secrets**:

- `DATABASE_URL` (secret)
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`

Add the three public frontend variables as build environment variables:

- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`

Trigger a new deployment after changing build variables.

## 4. Run locally

```bash
npm run dev:pages
```

This builds the Vite frontend and serves it with Cloudflare Pages Functions through Wrangler at the local Pages URL (normally `http://localhost:8788`).

For frontend-only work, `npm run dev` starts Vite, but the Pages API routes are served by Wrangler, not by the Vite development server.

## 5. Deploy to Cloudflare Pages

Connect this GitHub repository to Cloudflare Pages:

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

Cloudflare Pages automatically discovers the `functions/` directory at the repository root. Configure the environment variables and secret listed above in the Pages project settings.

You can also deploy with Wrangler after authenticating:

```bash
npx wrangler login
npm run deploy
```

## API

- `GET /api/notes` — list the signed-in user's notes
- `POST /api/notes` — create a note
- `PATCH /api/notes/:id` — update a note
- `DELETE /api/notes/:id` — delete a note

Every query is scoped to the verified Auth0 subject. The API never trusts a user ID supplied by the browser.

## Security notes

- Never put `DATABASE_URL`, Neon credentials, or Auth0 client secrets in Vite variables.
- Only the Auth0 domain, SPA client ID, and API audience are public frontend configuration.
- The API verifies Auth0 access tokens using the tenant's JWKS and checks issuer, audience, and RS256 signature.
- SQL values are parameterized through the Neon tagged-template API.
- Each read, update, and delete is constrained by the authenticated user's subject.
- Use HTTPS in production and keep dependencies updated.

## Current scope

This first version intentionally focuses on notes CRUD. File attachments and Neon Object Storage can be added as a separate feature once the database and authentication flow are working.
