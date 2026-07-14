# Deployment

Neural Break is a Vite game with a Vercel Function at `/api/highscores` and a
Neon Postgres leaderboard.

## Required setup

```bash
npm install
npm run typecheck
npm run build
```

Create or select a Neon database, then apply the checked-in schema:

```bash
DATABASE_URL='postgresql://...' npm run db:migrate
```

Add the connection string to Vercel as a sensitive server variable:

```bash
vercel env add DATABASE_URL production,preview --sensitive
```

Do not name this variable `VITE_DATABASE_URL`. Vite-prefixed values are bundled
into browser JavaScript.

## Local full-stack test

`npm run dev` runs the Vite frontend only. To serve both the game and the API:

```bash
vercel dev --listen 3000
```

Verify:

```bash
curl 'http://localhost:3000/api/highscores?mode=original'
```

An empty board returns `[]`.

## Deploy

The repository is already linked through `.vercel/project.json`.

```bash
vercel          # preview
vercel --prod   # production
```

`vercel.json` uses Vercel's current Vite configuration. Do not restore the old
legacy `builds` array: it prevented the root `api/` function from being included
in the deployment.

## Post-deploy checks

1. `GET /api/highscores?mode=original` returns JSON.
2. A game-over name submission returns `success: true` when it reaches the top
   ten.
3. The leaderboard displays the submitted entry.
4. `BACK TO MENU` returns to the start screen.
5. A cross-origin POST is rejected with `403`.
6. More than five submissions in one minute receives `429`.

## Relevant environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection for the serverless API |
| `ALLOWED_SCORE_ORIGINS` | No | Extra origins if frontend and API are split |
| `RATE_LIMIT_SALT` | No | Optional dedicated HMAC salt |

The historical `REDIS_URL` is not used by the current code and can be removed
from Vercel after the Neon deployment has been verified.
