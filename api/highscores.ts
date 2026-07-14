import { createHmac, randomUUID } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type GameMode = 'original' | 'test'

interface HighScoreEntry {
  name: string
  score: number
  survivedTime: number
  level: number
  date: string
  location: string
  gameMode: GameMode
  timestamp: number
}

interface ScoreSubmission {
  name: string
  score: number
  survivedTime: number
  level: number
  gameMode: GameMode
}

interface ScoreRow {
  name: string
  score: number | string
  survivedTime: number | string
  level: number | string
  location: string
  gameMode: GameMode
  createdAt: string | Date
  timestamp: number | string
}

interface StatsResponse {
  playCount: number
  playCountOriginal: number
  playCountTest: number
}

const MAX_SCORES_PER_MODE = 10
const MAX_NAME_LENGTH = 20
const MAX_SCORE = 2_147_483_647
const MAX_SURVIVED_TIME_SECONDS = 7 * 24 * 60 * 60
const SUBMISSION_LIMIT = 5
const SUBMISSION_WINDOW_SECONDS = 60
const VALID_GAME_MODES: ReadonlySet<GameMode> = new Set(['original', 'test'])

let sqlClient: ReturnType<typeof neon> | null = null

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }
  return databaseUrl
}

function getSqlClient(): ReturnType<typeof neon> {
  if (!sqlClient) {
    sqlClient = neon(getDatabaseUrl())
  }
  return sqlClient
}

function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && VALID_GAME_MODES.has(value as GameMode)
}

function getHeader(req: VercelRequest, name: string): string | undefined {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function configureCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = getHeader(req, 'origin')
  if (!origin) return true

  const forwardedHost = getHeader(req, 'x-forwarded-host')?.split(',')[0]?.trim()
  const requestHost = forwardedHost || getHeader(req, 'host')
  const configuredOrigins = (process.env.ALLOWED_SCORE_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  let isSameOrigin = false
  try {
    isSameOrigin = new URL(origin).host === requestHost
  } catch {
    isSameOrigin = false
  }

  const isLocalDevelopment = process.env.VERCEL_ENV !== 'production' &&
    (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000')
  const isAllowed = isSameOrigin || isLocalDevelopment || configuredOrigins.includes(origin)

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  return isAllowed
}

function formatServerDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = String(date.getUTCFullYear()).slice(-2)
  return `${month}/${day}/${year}`
}

function sanitizeName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NAME_LENGTH)
}

function sanitizeCountry(value: unknown): string {
  if (typeof value !== 'string') return 'ONLINE'
  const country = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
  return /^[A-Z]{2,3}$/.test(country) ? country : 'ONLINE'
}

function validateSubmission(value: unknown): value is ScoreSubmission {
  if (!value || typeof value !== 'object') return false

  const entry = value as Record<string, unknown>
  const name = typeof entry.name === 'string' ? sanitizeName(entry.name) : ''

  return name.length > 0 &&
    typeof entry.score === 'number' && Number.isSafeInteger(entry.score) &&
      entry.score >= 0 && entry.score <= MAX_SCORE &&
    typeof entry.survivedTime === 'number' && Number.isFinite(entry.survivedTime) &&
      entry.survivedTime >= 0 && entry.survivedTime <= MAX_SURVIVED_TIME_SECONDS &&
    typeof entry.level === 'number' && Number.isInteger(entry.level) &&
      entry.level >= 1 && entry.level <= 99 &&
    isGameMode(entry.gameMode)
}

function sanitizeSubmission(entry: ScoreSubmission, req: VercelRequest): HighScoreEntry {
  const timestamp = Date.now()
  return {
    name: sanitizeName(entry.name),
    score: entry.score,
    survivedTime: Math.floor(entry.survivedTime),
    level: entry.level,
    date: formatServerDate(new Date(timestamp)),
    location: sanitizeCountry(getHeader(req, 'x-vercel-ip-country')),
    gameMode: entry.gameMode,
    timestamp,
  }
}

function mapScoreRow(row: ScoreRow): HighScoreEntry {
  const createdAt = new Date(row.createdAt)
  return {
    name: row.name,
    score: Number(row.score),
    survivedTime: Number(row.survivedTime),
    level: Number(row.level),
    date: formatServerDate(createdAt),
    location: row.location,
    gameMode: row.gameMode,
    timestamp: Number(row.timestamp),
  }
}

function clientIdentifier(req: VercelRequest): string {
  const forwardedFor = getHeader(req, 'x-forwarded-for')?.split(',')[0]?.trim()
  const ip = getHeader(req, 'x-real-ip') || forwardedFor || 'unknown'
  const salt = process.env.RATE_LIMIT_SALT || getDatabaseUrl()
  return createHmac('sha256', salt).update(ip).digest('hex').slice(0, 48)
}

async function getHighScores(gameMode?: GameMode): Promise<HighScoreEntry[]> {
  const sql = getSqlClient()

  const rows = gameMode
    ? await sql`
        SELECT
          name,
          score,
          survived_time AS "survivedTime",
          level,
          location,
          game_mode AS "gameMode",
          created_at AS "createdAt",
          (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT AS timestamp
        FROM neural_break_high_scores
        WHERE game_mode = ${gameMode}
        ORDER BY score DESC, level DESC, survived_time DESC, created_at DESC, id DESC
        LIMIT ${MAX_SCORES_PER_MODE}
      `
    : await sql`
        SELECT
          name,
          score,
          survived_time AS "survivedTime",
          level,
          location,
          game_mode AS "gameMode",
          created_at AS "createdAt",
          timestamp
        FROM (
          SELECT
            name,
            score,
            survived_time,
            level,
            location,
            game_mode,
            created_at,
            id,
            (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT AS timestamp,
            ROW_NUMBER() OVER (
              PARTITION BY game_mode
              ORDER BY score DESC, level DESC, survived_time DESC, created_at DESC, id DESC
            ) AS leaderboard_rank
          FROM neural_break_high_scores
        ) ranked_scores
        WHERE leaderboard_rank <= ${MAX_SCORES_PER_MODE}
        ORDER BY game_mode, leaderboard_rank
      `

  return (rows as ScoreRow[]).map(mapScoreRow)
}

async function getPlayCountStats(): Promise<StatsResponse> {
  const sql = getSqlClient()
  const rows = await sql`
    SELECT
      COALESCE(SUM(play_count), 0)::BIGINT AS "playCount",
      COALESCE(SUM(play_count) FILTER (WHERE game_mode = 'original'), 0)::BIGINT AS "playCountOriginal",
      COALESCE(SUM(play_count) FILTER (WHERE game_mode = 'test'), 0)::BIGINT AS "playCountTest"
    FROM neural_break_play_counts
  `
  const stats = (rows as Array<Record<string, number | string>>)[0]
  return {
    playCount: Number(stats.playCount),
    playCountOriginal: Number(stats.playCountOriginal),
    playCountTest: Number(stats.playCountTest),
  }
}

async function saveHighScore(
  entry: HighScoreEntry,
  req: VercelRequest,
): Promise<{ saved: boolean; rateLimited: boolean; playCount: number }> {
  const sql = getSqlClient()
  const scoreId = randomUUID()
  const clientHash = clientIdentifier(req)

  const results = await sql.transaction(txn => [
    txn`SELECT pg_advisory_xact_lock(hashtext(${`neural-break:${entry.gameMode}`}))`,
    txn`
      WITH rate_limit AS (
        INSERT INTO neural_break_submission_limits AS current_window (
          client_hash,
          window_started_at,
          submission_count
        )
        VALUES (${clientHash}, NOW(), 1)
        ON CONFLICT (client_hash) DO UPDATE SET
          submission_count = CASE
            WHEN current_window.window_started_at <= NOW() - INTERVAL '60 seconds' THEN 1
            ELSE current_window.submission_count + 1
          END,
          window_started_at = CASE
            WHEN current_window.window_started_at <= NOW() - INTERVAL '60 seconds' THEN NOW()
            ELSE current_window.window_started_at
          END
        RETURNING submission_count
      ),
      inserted_score AS (
        INSERT INTO neural_break_high_scores (
          id,
          name,
          score,
          survived_time,
          level,
          location,
          game_mode
        )
        SELECT
          ${scoreId}::UUID,
          ${entry.name},
          ${entry.score},
          ${entry.survivedTime},
          ${entry.level},
          ${entry.location},
          ${entry.gameMode}
        FROM rate_limit
        WHERE submission_count <= ${SUBMISSION_LIMIT}
        RETURNING id
      ),
      counted_play AS (
        INSERT INTO neural_break_play_counts (game_mode, play_count)
        SELECT ${entry.gameMode}, 1
        FROM rate_limit
        WHERE submission_count <= ${SUBMISSION_LIMIT}
        ON CONFLICT (game_mode) DO UPDATE SET
          play_count = neural_break_play_counts.play_count + 1
        RETURNING play_count
      )
      SELECT
        submission_count AS "submissionCount",
        EXISTS (SELECT 1 FROM inserted_score) AS accepted,
        COALESCE((SELECT play_count FROM counted_play), 0)::BIGINT AS "playCount"
      FROM rate_limit
    `,
    txn`
      DELETE FROM neural_break_high_scores
      WHERE id IN (
        SELECT id
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (
              ORDER BY score DESC, level DESC, survived_time DESC, created_at DESC, id DESC
            ) AS leaderboard_rank
          FROM neural_break_high_scores
          WHERE game_mode = ${entry.gameMode}
        ) ranked_scores
        WHERE leaderboard_rank > ${MAX_SCORES_PER_MODE}
      )
    `,
    txn`
      SELECT EXISTS (
        SELECT 1
        FROM neural_break_high_scores
        WHERE id = ${scoreId}::UUID
      ) AS saved
    `,
    txn`
      DELETE FROM neural_break_submission_limits
      WHERE window_started_at < NOW() - INTERVAL '1 day'
        AND client_hash <> ${clientHash}
    `,
  ])

  const submission = (results[1] as Array<Record<string, unknown>>)[0]
  const membership = (results[3] as Array<Record<string, unknown>>)[0]
  const rateLimited = Number(submission.submissionCount) > SUBMISSION_LIMIT || submission.accepted !== true

  return {
    saved: !rateLimited && membership.saved === true,
    rateLimited,
    playCount: Number(submission.playCount) || 0,
  }
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const databaseUrl = process.env.DATABASE_URL
  return databaseUrl ? message.split(databaseUrl).join('[database url redacted]') : message
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const corsAllowed = configureCors(req, res)
  if (req.method === 'OPTIONS') {
    return corsAllowed ? res.status(204).end() : res.status(403).end()
  }

  try {
    if (req.method === 'GET') {
      if (req.query.stats === 'true') {
        return res.status(200).json(await getPlayCountStats())
      }

      const requestedMode = req.query.mode
      if (requestedMode !== undefined && !isGameMode(requestedMode)) {
        return res.status(400).json({ error: 'Invalid game mode' })
      }

      return res.status(200).json(await getHighScores(requestedMode))
    }

    if (req.method === 'POST') {
      if (!corsAllowed) {
        return res.status(403).json({ success: false, error: 'Origin not allowed' })
      }

      const contentType = getHeader(req, 'content-type')?.split(';')[0]?.trim().toLowerCase()
      if (contentType !== 'application/json') {
        return res.status(415).json({ success: false, error: 'Content-Type must be application/json' })
      }

      if (!validateSubmission(req.body)) {
        return res.status(400).json({ success: false, error: 'Invalid high score entry' })
      }

      const entry = sanitizeSubmission(req.body, req)
      const result = await saveHighScore(entry, req)

      if (result.rateLimited) {
        res.setHeader('Retry-After', String(SUBMISSION_WINDOW_SECONDS))
        return res.status(429).json({ success: false, error: 'Too many submissions' })
      }

      if (!result.saved) {
        return res.status(200).json({
          success: false,
          error: 'Score not high enough for leaderboard',
          playCount: result.playCount,
        })
      }

      return res.status(200).json({
        success: true,
        entry,
        persistent: true,
        storage: 'neon-postgres',
        playCount: result.playCount,
      })
    }

    res.setHeader('Allow', 'GET, OPTIONS, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('High Score API error:', safeErrorMessage(error))
    return res.status(503).json({
      success: false,
      error: 'Leaderboard storage unavailable',
    })
  }
}
