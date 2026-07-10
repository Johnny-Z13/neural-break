/**
 * High Score Service - Abstracted storage layer
 * Supports localStorage (current) and can be extended for backend API
 */

import { HighScoreEntry } from '../core/GameState'

export interface IHighScoreService {
  saveHighScore(entry: HighScoreEntry): Promise<boolean>
  getHighScores(gameMode?: string): Promise<HighScoreEntry[]>
  clearAllScores(): Promise<void>
  getLastPlayerName?(): string
}

/**
 * LocalStorage implementation (current - for development/local)
 * ⚠️ WARNING: Not secure, can be manipulated, domain-specific
 */
export class LocalStorageHighScoreService implements IHighScoreService {
  private readonly STORAGE_KEY = 'neural_break_high_scores'
  private readonly LAST_NAME_KEY = 'neural_break_last_player_name' // Remember last name
  private readonly MAX_SCORES = 10
  private readonly MAX_NAME_LENGTH = 20

  async saveHighScore(entry: HighScoreEntry): Promise<boolean> {
    try {
      // Validate entry
      if (!this.validateEntry(entry)) {
        console.warn('❌ Invalid high score entry:', entry)
        return false
      }

      // Sanitize entry
      const sanitized = this.sanitizeEntry(entry)

      const highScores = await this.getHighScores()
      
      // Check if this is actually a high score FOR THIS GAME MODE
      const modeScores = highScores.filter(s => s.gameMode === sanitized.gameMode)
      if (modeScores.length >= this.MAX_SCORES) {
        const lowestScore = modeScores[modeScores.length - 1].score
        if (sanitized.score <= lowestScore) {
          return false // Not a high score for this mode
        }
      }

      highScores.push(sanitized)
      
      // Sort by score descending, then by date (newer first for ties)
      highScores.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        // For ties, prefer newer entries
        return this.parseDate(b.date).getTime() - this.parseDate(a.date).getTime()
      })
      
      // Keep top MAX_SCORES per game mode
      const arcadeScores = highScores.filter(s => s.gameMode === 'original').slice(0, this.MAX_SCORES)
      const testScores = highScores.filter(s => s.gameMode === 'test').slice(0, this.MAX_SCORES)
      const trimmedScores = [...arcadeScores, ...testScores]
      
      // Save to localStorage
      if (this.isLocalStorageAvailable()) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedScores))
        
        // 💾 REMEMBER LAST PLAYER NAME for convenience! 💾
        localStorage.setItem(this.LAST_NAME_KEY, sanitized.name)
        
        // Verify the entry was saved (check by score and name)
        const saved = trimmedScores.some(
          s => s.score === sanitized.score && s.name === sanitized.name
        )
        
        if (saved) {
          console.log(`✅ High score saved successfully: ${sanitized.name} - ${sanitized.score}`)
        }
        
        return saved
      } else {
        console.warn('⚠️ localStorage not available')
        return false
      }
    } catch (error) {
      console.error('❌ Error saving high score:', error)
      return false
    }
  }

  async getHighScores(gameMode?: string): Promise<HighScoreEntry[]> {
    try {
      if (!this.isLocalStorageAvailable()) {
        return []
      }

      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return []
      }

      const parsed = JSON.parse(stored) as HighScoreEntry[]
      
      // Validate all entries
      let validScores = parsed.filter(entry => this.validateEntry(entry))
      
      // Filter by game mode if specified
      if (gameMode) {
        validScores = validScores.filter(entry => entry.gameMode === gameMode)
      }
      
      // Re-sort in case of corruption
      validScores.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        return this.parseDate(b.date).getTime() - this.parseDate(a.date).getTime()
      })
      
      return validScores.slice(0, this.MAX_SCORES)
    } catch (error) {
      console.error('❌ Error loading high scores:', error)
      // Try to recover by clearing corrupted data
      try {
        localStorage.removeItem(this.STORAGE_KEY)
      } catch (e) {
        // Ignore
      }
      return []
    }
  }

  async clearAllScores(): Promise<void> {
    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.removeItem(this.STORAGE_KEY)
      }
    } catch (error) {
      console.error('❌ Error clearing high scores:', error)
    }
  }

  private validateEntry(entry: HighScoreEntry): boolean {
    // Check required fields
    if (!entry || typeof entry !== 'object') {
      return false
    }

    // Validate name
    if (!entry.name || typeof entry.name !== 'string' || entry.name.trim().length === 0) {
      return false
    }

    if (entry.name.length > this.MAX_NAME_LENGTH) {
      return false
    }

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
    if (!entry.date || typeof entry.date !== 'string') {
      return false
    }

    // Validate location (optional but should be string if present)
    if (entry.location !== undefined && typeof entry.location !== 'string') {
      return false
    }

    // Validate gameMode (required)
    if (!entry.gameMode || typeof entry.gameMode !== 'string') {
      return false
    }

    const validModes = ['original', 'test']
    if (!validModes.includes(entry.gameMode)) {
      return false
    }

    return true
  }

  private sanitizeEntry(entry: HighScoreEntry): HighScoreEntry {
    return {
      name: entry.name.trim().substring(0, this.MAX_NAME_LENGTH),
      score: Math.floor(Math.max(0, entry.score)),
      survivedTime: Math.max(0, entry.survivedTime),
      level: Math.max(1, Math.floor(entry.level)),
      date: entry.date || '12/29/25',
      location: entry.location || 'LOCAL',
      gameMode: entry.gameMode || 'original' // Default to original/arcade mode
    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Parse date string in MM/DD/YY format
   */
  private parseDate(dateStr: string): Date {
    // Try to parse MM/DD/YY format
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (match) {
      const month = parseInt(match[1], 10) - 1 // Month is 0-indexed
      const day = parseInt(match[2], 10)
      let year = parseInt(match[3], 10)
      // Convert 2-digit year to 4-digit (assume 2000s)
      if (year < 100) {
        year += 2000
      }
      return new Date(year, month, day)
    }
    // Fallback to standard Date parsing
    return new Date(dateStr)
  }
  
  // 💾 GET LAST PLAYER NAME - For convenience! 💾
  getLastPlayerName(): string {
    try {
      if (this.isLocalStorageAvailable()) {
        const lastName = localStorage.getItem(this.LAST_NAME_KEY)
        return lastName || ''
      }
    } catch (error) {
      console.warn('⚠️ Error getting last player name:', error)
    }
    return ''
  }
}

/**
 * API High Score Service (for Vercel deployment with online persistence)
 * Uses serverless function at /api/highscores
 */
export class APIHighScoreService implements IHighScoreService {
  private readonly API_URL = import.meta.env.VITE_API_URL || '/api/highscores'
  private readonly LAST_NAME_KEY = 'neural_break_last_player_name' // Still store last name locally

  async saveHighScore(entry: HighScoreEntry): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // 💾 REMEMBER LAST PLAYER NAME locally for convenience! 💾
        try {
          localStorage.setItem(this.LAST_NAME_KEY, entry.name)
        } catch (e) {
          // Ignore localStorage errors
        }
        
        console.log(`✅ High score saved to online leaderboard: ${entry.name} - ${entry.score}`)
      }
      
      return result.success === true
    } catch (error) {
      console.error('❌ Error saving high score to API:', error)
      return false
    }
  }

  async getHighScores(gameMode?: string): Promise<HighScoreEntry[]> {
    try {
      // Build URL with optional game mode filter
      const url = gameMode 
        ? `${this.API_URL}?mode=${encodeURIComponent(gameMode)}`
        : this.API_URL
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('❌ Error loading high scores from API:', error)
      return []
    }
  }

  async clearAllScores(): Promise<void> {
    // Not typically available via API for security
    console.warn('⚠️ clearAllScores not available via API')
  }
  
  // 💾 GET LAST PLAYER NAME - From local storage for convenience! 💾
  getLastPlayerName(): string {
    try {
      const lastName = localStorage.getItem(this.LAST_NAME_KEY)
      return lastName || ''
    } catch (error) {
      console.warn('⚠️ Error getting last player name:', error)
    }
    return ''
  }
}

/**
 * Simplified High Score Service
 * Always attempts to use API first (works both locally and in production)
 * Only localStorage is used for remembering the last player name (convenience feature)
 *
 * NOTE: No fallback to localStorage for scores - all scores should go to Vercel KV
 * This ensures consistency across all players and makes testing easier
 */
export class SimplifiedHighScoreService implements IHighScoreService {
  private apiService: APIHighScoreService
  private readonly LAST_NAME_KEY = 'neural_break_last_player_name'

  constructor() {
    this.apiService = new APIHighScoreService()
    console.log('🌐 High Score Service: Always using API endpoint (/api/highscores)')
    console.log('   → Scores will persist to Vercel KV when deployed')
    console.log('   → Development: API will handle gracefully if KV unavailable')
  }

  async saveHighScore(entry: HighScoreEntry): Promise<boolean> {
    // Always try to save to API (Vercel KV)
    const success = await this.apiService.saveHighScore(entry)

    if (success) {
      // Remember last player name locally for convenience
      try {
        localStorage.setItem(this.LAST_NAME_KEY, entry.name)
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    return success
  }

  async getHighScores(gameMode?: string): Promise<HighScoreEntry[]> {
    // Always fetch from API
    return await this.apiService.getHighScores(gameMode)
  }

  async clearAllScores(): Promise<void> {
    // API doesn't support clearing (security feature)
    console.warn('⚠️ clearAllScores not available via API')
  }

  getLastPlayerName(): string {
    // Get last player name from local storage for convenience
    try {
      return localStorage.getItem(this.LAST_NAME_KEY) || ''
    } catch (error) {
      console.warn('⚠️ Error getting last player name:', error)
      return ''
    }
  }
}

/**
 * Factory to get the appropriate service
 * Uses SimplifiedHighScoreService which always attempts to use the API
 */
export class HighScoreServiceFactory {
  private static instance: IHighScoreService | null = null

  static getService(): IHighScoreService {
    if (this.instance) {
      return this.instance
    }

    // Use simplified service that always uses API endpoint
    this.instance = new SimplifiedHighScoreService()

    return this.instance
  }

  static setService(service: IHighScoreService): void {
    this.instance = service
  }
}

