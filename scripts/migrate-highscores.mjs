import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'

async function readDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim()
  }

  const lines = createInterface({ input: process.stdin, terminal: false })
  for await (const line of lines) {
    lines.close()
    return line.trim()
  }
  return ''
}

const databaseUrl = await readDatabaseUrl()
if (!databaseUrl) {
  throw new Error('Provide DATABASE_URL in the environment or on stdin')
}

const migrationPath = fileURLToPath(new URL('../database/highscores.sql', import.meta.url))
const migration = await readFile(migrationPath, 'utf8')
const sql = neon(databaseUrl)

const statements = migration
  .split(';')
  .map(statement => statement.trim())
  .filter(Boolean)

await sql.transaction(statements.map(statement => sql.query(statement)))

const verification = await sql`
  SELECT COUNT(*)::INTEGER AS table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'neural_break_high_scores',
      'neural_break_play_counts',
      'neural_break_submission_limits'
    )
`

if (verification[0]?.table_count !== 3) {
  throw new Error('High-score migration did not create all required tables')
}

console.log('Neural Break high-score schema is ready (3 tables).')
