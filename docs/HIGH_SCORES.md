# High-score system

Neural Break stores a global top ten for each game mode in Neon Postgres through
the server-only `/api/highscores` Vercel Function.

## Player flow

1. When the game ends, the client checks whether the score reaches the current
   top ten for that mode.
2. A qualifying player enters a name and presses Enter or selects Save.
3. The API validates and normalizes the submission, writes it, and atomically
   trims the mode back to ten entries.
4. The game opens the leaderboard. `BACK TO MENU` returns to the start screen.

## Ranking

Entries are ranked by:

1. Score (highest first)
2. Level (highest first)
3. Survival time (longest first)
4. Submission time (newest first)

Arcade and test-mode entries are stored separately.

## API

### Read scores

```http
GET /api/highscores?mode=original
GET /api/highscores?mode=test
```

Without `mode`, the API returns the top ten from both modes. Responses are never
cached.

### Save a score

```http
POST /api/highscores
Content-Type: application/json

{
  "name": "ACE",
  "score": 150000,
  "survivedTime": 1800,
  "level": 10,
  "gameMode": "original"
}
```

The server supplies the date and country code. Client-provided date and location
values are ignored.

## Persistence and security

- `DATABASE_URL` is server-only and must never use a `VITE_` prefix.
- SQL values are parameterized by the Neon serverless driver.
- The database enforces name, score, time, level, location, and mode constraints.
- Same-origin POST requests are required unless an origin is explicitly listed
  in `ALLOWED_SCORE_ORIGINS`.
- Each derived client identifier is rate-limited to five submissions per minute.
  The identifier is an HMAC; raw IP addresses are not stored.
- Per-mode advisory locks make insert-and-prune operations deterministic under
  concurrent submissions.
- Player names are escaped again before rendering in the game UI.

This protects the database and prevents casual request tampering. It does not
make a browser-generated score mathematically cheat-proof: the gameplay and
final score still run on the client. Strong anti-cheat would require
server-authoritative simulation or server-verifiable run telemetry.

## Database setup

The schema is in `database/highscores.sql` and is applied with:

```bash
DATABASE_URL='postgresql://...' npm run db:migrate
```

The migration is idempotent.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string used only by the API |
| `ALLOWED_SCORE_ORIGINS` | No | Comma-separated extra web origins |
| `RATE_LIMIT_SALT` | No | Dedicated HMAC salt; `DATABASE_URL` is the fallback |

Local Vite development does not serve Vercel Functions. Use `vercel dev` when
testing the real API locally; the existing Playwright tests mock the endpoint to
exercise the screen flow deterministically.
