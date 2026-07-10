/**
 * Vercel Serverless Function - High Score API
 * Stores high scores in Vercel KV (Redis-based key-value store)
 * 
 * ✅ Setup Complete: @vercel/kv installed, environment variables configured
 * 
 * Endpoints:
 * - GET /api/highscores?mode=original|test - Get high scores for a mode
 * - GET /api/highscores?stats=true - Get play count statistics
 * - POST /api/highscores - Save a new high score
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '@vercel/kv'

// Type definitions
interface HighScoreEntry {
  name: string
  score: number
  survivedTime: number
  level: number
  date: string
  location: string
  gameMode: 'original' | 'test'
  timestamp?: number // For sorting ties
}

interface StatsResponse {
  playCount: number
  playCountOriginal: number
  playCountTest: number
}

const MAX_SCORES_PER_MODE = 10
const MAX_NAME_LENGTH = 20
const KV_KEY = 'neural_break_highscores'
const PLAY_COUNT_KEY = 'neural_break_play_count_total'
const PLAY_COUNT_ORIGINAL_KEY = 'neural_break_play_count_original'
const PLAY_COUNT_TEST_KEY = 'neural_break_play_count_test'

// ═══════════════════════════════════════════════════════════════════
// STORAGE IMPLEMENTATION - Using @vercel/kv SDK
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if Vercel KV is available (production)
 */
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * Get scores from Vercel KV
 */
async function getAllScores(): Promise<HighScoreEntry[]> {
  if (!isKVAvailable()) {
    console.warn('⚠️ Vercel KV not configured')
    return []
  }
  
  try {
    const scores = await kv.get<HighScoreEntry[]>(KV_KEY)
    return scores || []
  } catch (error) {
    console.error('Error getting scores from KV:', error)
    return []
  }
}

/**
 * Save scores to Vercel KV
 */
async function saveAllScores(scores: HighScoreEntry[]): Promise<boolean> {
  if (!isKVAvailable()) {
    console.warn('⚠️ Vercel KV not available - scores will not persist!')
    return false
  }
  
  try {
    await kv.set(KV_KEY, scores)
    console.log('✅ Scores saved to Vercel KV')
    return true
  } catch (error) {
    console.error('Error saving scores to KV:', error)
    return false
  }
}

/**
 * Increment play count for a game mode
 */
async function incrementPlayCount(gameMode: string): Promise<number> {
  if (!isKVAvailable()) {
    return 0
  }
  
  try {
    // Increment total count
    const totalCount = await kv.incr(PLAY_COUNT_KEY)
    
    // Increment mode-specific count
    let modeKey: string
    switch (gameMode) {
      case 'original':
        modeKey = PLAY_COUNT_ORIGINAL_KEY
        break
      case 'test':
        modeKey = PLAY_COUNT_TEST_KEY
        break
      default:
        modeKey = PLAY_COUNT_ORIGINAL_KEY
    }
    
    await kv.incr(modeKey)
    
    console.log(`📊 Play count incremented: ${gameMode} mode, total: ${totalCount}`)
    return totalCount
  } catch (error) {
    console.error('Error incrementing play count:', error)
    return 0
  }
}

/**
 * Get play count statistics
 */
async function getPlayCountStats(): Promise<StatsResponse> {
  if (!isKVAvailable()) {
    return {
      playCount: 0,
      playCountOriginal: 0,
      playCountTest: 0
    }
  }

  try {
    const [total, original, test] = await Promise.all([
      kv.get<number>(PLAY_COUNT_KEY),
      kv.get<number>(PLAY_COUNT_ORIGINAL_KEY),
      kv.get<number>(PLAY_COUNT_TEST_KEY)
    ])

    return {
      playCount: total || 0,
      playCountOriginal: original || 0,
      playCountTest: test || 0
    }
  } catch (error) {
    console.error('Error getting play count stats:', error)
    return {
      playCount: 0,
      playCountOriginal: 0,
      playCountTest: 0
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION & SANITIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate high score entry
 */
function validateEntry(entry: any): entry is HighScoreEntry {
  if (!entry || typeof entry !== 'object') return false
  
  // Validate name
  if (!entry.name || typeof entry.name !== 'string' || entry.name.trim().length === 0) {
    return false
  }
  if (entry.name.length > MAX_NAME_LENGTH) return false
  
  // Validate score
  if (typeof entry.score !== 'number' || !isFinite(entry.score) || entry.score < 0) {
    return false
  }
  
  // Validate survivedTime
  if (typeof entry.survivedTime !== 'number' || !isFinite(entry.survivedTime) || entry.survivedTime < 0) {
    return false
  }
  
  // Validate level
  if (typeof entry.level !== 'number' || !isFinite(entry.level) || entry.level < 1) {
    return false
  }
  
  // Validate date
  if (!entry.date || typeof entry.date !== 'string') return false
  
  // Validate gameMode
  const validModes = ['original', 'test']
  if (!entry.gameMode || !validModes.includes(entry.gameMode)) {
    return false
  }
  
  return true
}

/**
 * Sanitize entry before saving
 */
function sanitizeEntry(entry: HighScoreEntry): HighScoreEntry {
  return {
    name: entry.name.trim().substring(0, MAX_NAME_LENGTH),
    score: Math.floor(Math.max(0, entry.score)),
    survivedTime: Math.max(0, entry.survivedTime),
    level: Math.max(1, Math.floor(entry.level)),
    date: entry.date || new Date().toLocaleDateString('en-US'),
    location: entry.location || 'ONLINE',
    gameMode: entry.gameMode || 'original',
    timestamp: Date.now()
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS for browser requests
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // Log storage mode for debugging
  console.log(`📊 High Score API - KV Available: ${isKVAvailable()}`)
  
  try {
    // GET - Retrieve high scores or stats
    if (req.method === 'GET') {
      const { mode, stats } = req.query
      
      // Return play count statistics
      if (stats === 'true') {
        const playStats = await getPlayCountStats()
        console.log('📊 Returning play count stats:', playStats)
        return res.status(200).json(playStats)
      }
      
      // Return high scores
      let scores = await getAllScores()
      
      // Filter by mode if specified
      if (mode && typeof mode === 'string') {
        scores = scores.filter(s => s.gameMode === mode)
      }
      
      // Sort by score (desc), then by timestamp (newer first)
      scores.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        return (b.timestamp || 0) - (a.timestamp || 0)
      })
      
      return res.status(200).json(scores.slice(0, MAX_SCORES_PER_MODE))
    }
    
    // POST - Save new high score
    if (req.method === 'POST') {
      const entry = req.body
      
      // Validate entry
      if (!validateEntry(entry)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid high score entry' 
        })
      }
      
      // Sanitize entry
      const sanitized = sanitizeEntry(entry)
      
      // Get current scores
      let allScores = await getAllScores()
      
      // Check if this is actually a high score for this mode
      const modeScores = allScores.filter(s => s.gameMode === sanitized.gameMode)
      if (modeScores.length >= MAX_SCORES_PER_MODE) {
        // Sort to find lowest score
        modeScores.sort((a, b) => a.score - b.score)
        const lowestScore = modeScores[0].score
        
        if (sanitized.score <= lowestScore) {
          // Still increment play count even if not a high score
          const playCount = await incrementPlayCount(sanitized.gameMode)
          return res.status(200).json({ 
            success: false, 
            error: 'Score not high enough for leaderboard',
            playCount
          })
        }
      }
      
      // Add new score
      allScores.push(sanitized)
      
      // Sort all scores
      allScores.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        return (b.timestamp || 0) - (a.timestamp || 0)
      })
      
      // Keep top MAX_SCORES_PER_MODE per game mode
      const originalScores = allScores
        .filter(s => s.gameMode === 'original')
        .slice(0, MAX_SCORES_PER_MODE)
      const testScores = allScores
        .filter(s => s.gameMode === 'test')
        .slice(0, MAX_SCORES_PER_MODE)

      const trimmedScores = [...originalScores, ...testScores]
      
      // Save to storage
      const saved = await saveAllScores(trimmedScores)
      
      // Increment play count
      const playCount = await incrementPlayCount(sanitized.gameMode)
      
      return res.status(200).json({ 
        success: saved,
        entry: sanitized,
        persistent: isKVAvailable(),
        playCount
      })
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' })
    
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
}
