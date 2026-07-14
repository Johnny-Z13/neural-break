export enum GameMode {
  ORIGINAL = 'original',
  TEST = 'test'
}

export enum GameStateType {
  START_SCREEN = 'start_screen',
  PLAYING = 'playing',
  GAME_OVER = 'game_over'
}

export interface GameStats {
  score: number
  survivedTime: number
  level: number
  enemiesKilled: number
  dataMinersKilled: number
  scanDronesKilled: number
  chaosWormsKilled: number
  voidSpheresKilled: number
  crystalSwarmsKilled: number
  fizzersKilled: number       // Chaos reward enemies
  ufosKilled: number          // Late-game UFO craft
  bossesKilled: number
  damageTaken: number
  totalXP: number
  highestCombo: number
  highestMultiplier: number // Track highest multiplier achieved
  gameCompleted: boolean    // True if player beat all 99 levels
}

export interface HighScoreEntry {
  name: string
  score: number
  survivedTime: number
  level: number
  date: string
  location: string // Country code (e.g., "UK", "USA", "POL")
  gameMode: GameMode // Track which mode the score was achieved in
}

import { HighScoreServiceFactory } from '../data/HighScoreService'
import type { EnemyType } from '../entities/Enemy'

// 🎯 ARCADE-STYLE POINT VALUES - Only for SHOOTING enemies! 🎯
export const KILL_POINTS = {
  DataMite: 100,
  ScanDrone: 250,
  ChaosWorm: 500,
  VoidSphere: 1000,
  CrystalShardSwarm: 750,
  Fizzer: 200,      // Chaos reward enemy - hard to hit!
  UFO: 1500,        // Late-game dangerous craft
  Boss: 5000
} as const

export class ScoreManager {
  private static readonly MAX_HIGH_SCORES = 10

  // 🎮 GET BASE POINTS FOR ENEMY TYPE 🎮
  static getKillPoints(enemyType: EnemyType): number {
    return KILL_POINTS[enemyType]
  }

  // Score is now tracked directly via addKillScore - this just returns the current score
  static calculateScore(stats: GameStats): number {
    // Score is now accumulated directly from kills with multipliers
    // This method just returns the current score (already calculated)
    return stats.score
  }

  /**
   * Save high score using the configured service (localStorage or API)
   * Returns true if the score was successfully saved and made it to the leaderboard
   */
  static async saveHighScore(entry: HighScoreEntry): Promise<boolean> {
    const service = HighScoreServiceFactory.getService()
    return await service.saveHighScore(entry)
  }

  /**
   * Get high scores using the configured service
   * @param gameMode Optional filter for specific game mode
   */
  static async getHighScores(gameMode?: GameMode): Promise<HighScoreEntry[]> {
    const service = HighScoreServiceFactory.getService()
    return await service.getHighScores(gameMode)
  }

  /**
   * Check if a score qualifies as a high score
   * @param gameMode Check against specific game mode leaderboard
   */
  static async isHighScore(score: number, gameMode: GameMode): Promise<boolean> {
    try {
      const highScores = await this.getHighScores(gameMode)
      if (highScores.length < this.MAX_HIGH_SCORES) return true
      return score > highScores[highScores.length - 1].score
    } catch (error) {
      console.error('❌ Unable to check the online leaderboard:', error)
      return false
    }
  }

  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  static formatScore(score: number): string {
    return score.toLocaleString()
  }

  /**
   * Format date as MM/DD/YY
   */
  static formatDate(date?: Date): string {
    const d = date || new Date()
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const year = d.getFullYear().toString() // Full 4-digit year (e.g., 2025)
    return `${month}/${day}/${year}`
  }

  // Debug method to test high score system
  static async addTestScore(): Promise<void> {
    const testEntry: HighScoreEntry = {
      name: 'TestPlayer',
      score: 12345,
      survivedTime: 180, // 3 minutes
      level: 5,
      date: '12/29/2025',
      location: 'UK',
      gameMode: GameMode.TEST
    }
    const saved = await this.saveHighScore(testEntry)
    console.log('🧪 Test high score added:', testEntry, saved ? '✅' : '❌')
  }

  // Debug method to clear all scores
  static async clearAllScores(): Promise<void> {
    const service = HighScoreServiceFactory.getService()
    await service.clearAllScores()
    console.log('🗑️ All high scores cleared')
  }
  
  // 💾 GET LAST PLAYER NAME - For convenience! 💾
  static getLastPlayerName(): string {
    const service = HighScoreServiceFactory.getService()
    return service.getLastPlayerName?.() ?? ''
  }
}
