/**
 * 🎯 LEVEL MANAGER - Objective-Based Level System
 * 
 * Each level has specific kill objectives that must be completed.
 * When objectives are met, all enemies are cleared and level transition plays.
 * 
 * Example: Level 1 = Kill 10 DataMites + 5 ScanDrones
 */

export interface LevelObjectives {
  dataMites: number
  scanDrones: number
  chaosWorms: number
  voidSpheres: number
  crystalSwarms: number
  fizzers: number
  ufos: number
  bosses: number
}

export interface LevelConfig {
  level: number
  name: string
  objectives: LevelObjectives
  miteSpawnRate: number
  droneSpawnRate: number
  wormSpawnRate: number
  voidSpawnRate: number
  crystalSpawnRate: number
  fizzerSpawnRate: number
  ufoSpawnRate: number
  bossSpawnRate: number
}

export interface LevelProgress {
  dataMites: number
  scanDrones: number
  chaosWorms: number
  voidSpheres: number
  crystalSwarms: number
  fizzers: number
  ufos: number
  bosses: number
}

export class LevelManager {
  private static readonly TOTAL_LEVELS = 99
  private currentLevel: number = 1
  private totalElapsedTime: number = 0
  private currentProgress: LevelProgress
  private objectivesComplete: boolean = false

  /**
   * 🎯 LEVEL CONFIGURATIONS WITH OBJECTIVES - 99 LEVELS!
   * Each level defines:
   * - Kill objectives (how many of each enemy to kill)
   * - Spawn rates (how often enemies spawn)
   * 
   * ⏱️ TARGET: 60-120 seconds per level
   * 🎯 ALL ENEMY TYPES BY LEVEL 5 (compressed progression)
   * 🎲 SURPRISE LEVELS EVERY 5 LEVELS!
   * 📈 DIFFICULTY RAMPS CONTINUOUSLY
   */
  static getLevelConfig(level: number): LevelConfig {
    // 🧪 TEST MODE - Return test configuration
    if (level === 999) {
      return this.getTestLevelConfig()
    }
    
    const clampedLevel = Math.max(1, Math.min(level, LevelManager.TOTAL_LEVELS))
    
    // 🎲 CHECK FOR SURPRISE LEVELS (every 5th level)
    if (clampedLevel % 5 === 0 && clampedLevel > 0) {
      return this.getSurpriseLevelConfig(clampedLevel)
    }
    
    // 📈 DYNAMIC LEVEL GENERATION
    return this.generateDynamicLevelConfig(clampedLevel)
  }

  /**
   * 🎲 SURPRISE LEVELS - Special themed levels every 5 levels!
   * These break up the normal progression with unique challenges
   */
  private static getSurpriseLevelConfig(level: number): LevelConfig {
    // Difficulty multiplier based on level
    const difficultyScale = 1 + (level - 1) * 0.03 // 3% increase per level
    const spawnScale = Math.max(0.3, 1 - (level - 1) * 0.008) // Faster spawns
    
    // Cycle through surprise types
    const surpriseType = Math.floor(level / 5) % 10
    
    switch (surpriseType) {
      case 1: // Level 5: 🐛 WORM INVASION
        return {
          level,
          name: "🐛 WORM INVASION!",
          objectives: {
            dataMites: Math.floor(10 * difficultyScale),
            scanDrones: 0,
            chaosWorms: Math.floor(8 * difficultyScale), // LOTS OF WORMS!
            voidSpheres: 0,
            crystalSwarms: 0,
            fizzers: 0,
            ufos: 0,
            bosses: 0
          },
          miteSpawnRate: 2.0 * spawnScale,
          droneSpawnRate: Infinity,
          wormSpawnRate: 8.0 * spawnScale, // RAPID WORM SPAWNS!
          voidSpawnRate: Infinity,
          crystalSpawnRate: Infinity,
          fizzerSpawnRate: Infinity,
          ufoSpawnRate: Infinity,
          bossSpawnRate: Infinity
        }
        
      case 2: // Level 10: ⚡ FIZZER FRENZY
        return {
          level,
          name: "⚡ FIZZER FRENZY!",
          objectives: {
            dataMites: Math.floor(15 * difficultyScale),
            scanDrones: 0,
            chaosWorms: 0,
            voidSpheres: 0,
            crystalSwarms: 0,
            fizzers: Math.floor(20 * difficultyScale), // TONS OF FIZZERS!
            ufos: 0,
            bosses: 0
          },
          miteSpawnRate: 1.5 * spawnScale,
          droneSpawnRate: Infinity,
          wormSpawnRate: Infinity,
          voidSpawnRate: Infinity,
          crystalSpawnRate: Infinity,
          fizzerSpawnRate: 2.5 * spawnScale, // RAPID FIZZER SPAWNS!
          ufoSpawnRate: Infinity,
          bossSpawnRate: Infinity
        }
        
      case 3: // Level 15: 🛸 UFO ARMADA
        return {
          level,
          name: "🛸 UFO ARMADA!",
          objectives: {
            dataMites: Math.floor(20 * difficultyScale),
            scanDrones: Math.floor(5 * difficultyScale),
            chaosWorms: 0,
            voidSpheres: 0,
            crystalSwarms: 0,
            fizzers: 0,
            ufos: Math.floor(12 * difficultyScale), // UFO SWARM!
            bosses: 0
          },
          miteSpawnRate: 1.2 * spawnScale,
          droneSpawnRate: 8.0 * spawnScale,
          wormSpawnRate: Infinity,
          voidSpawnRate: Infinity,
          crystalSpawnRate: Infinity,
          fizzerSpawnRate: Infinity,
          ufoSpawnRate: 6.0 * spawnScale, // RAPID UFO SPAWNS!
          bossSpawnRate: Infinity
        }
        
      case 4: // Level 20: 💎 CRYSTAL CAVERN
        return {
          level,
          name: "💎 CRYSTAL CAVERN!",
          objectives: {
            dataMites: Math.floor(15 * difficultyScale),
            scanDrones: 0,
            chaosWorms: 0,
            voidSpheres: 0,
            crystalSwarms: Math.floor(10 * difficultyScale), // CRYSTAL OVERLOAD!
            fizzers: 0,
            ufos: 0,
            bosses: 0
          },
          miteSpawnRate: 1.5 * spawnScale,
          droneSpawnRate: Infinity,
          wormSpawnRate: Infinity,
          voidSpawnRate: Infinity,
          crystalSpawnRate: 7.0 * spawnScale, // RAPID CRYSTAL SPAWNS!
          fizzerSpawnRate: Infinity,
          ufoSpawnRate: Infinity,
          bossSpawnRate: Infinity
        }
        
      case 5: // Level 25: 👹 BOSS RUSH
        return {
          level,
          name: "👹 BOSS RUSH!",
          objectives: {
            dataMites: Math.floor(30 * difficultyScale),
            scanDrones: Math.floor(10 * difficultyScale),
            chaosWorms: 1,
            voidSpheres: 1,
            crystalSwarms: 1,
            fizzers: 0,
            ufos: 1,
            bosses: Math.floor(3 + level / 25) // MULTIPLE BOSSES!
          },
          miteSpawnRate: 1.0 * spawnScale,
          droneSpawnRate: 6.0 * spawnScale,
          wormSpawnRate: 60.0,
          voidSpawnRate: 60.0,
          crystalSpawnRate: 60.0,
          fizzerSpawnRate: Infinity,
          ufoSpawnRate: 60.0,
          bossSpawnRate: 20.0 * spawnScale // RAPID BOSS SPAWNS!
        }
        
      case 6: // Level 30: 🌀 VOID NIGHTMARE
        return {
          level,
          name: "🌀 VOID NIGHTMARE!",
          objectives: {
            dataMites: Math.floor(25 * difficultyScale),
            scanDrones: Math.floor(8 * difficultyScale),
            chaosWorms: 0,
            voidSpheres: Math.floor(6 * difficultyScale), // VOID SPHERE SWARM!
            crystalSwarms: 0,
            fizzers: 0,
            ufos: 0,
            bosses: 0
          },
          miteSpawnRate: 1.2 * spawnScale,
          droneSpawnRate: 7.0 * spawnScale,
          wormSpawnRate: Infinity,
          voidSpawnRate: 12.0 * spawnScale, // RAPID VOID SPAWNS!
          crystalSpawnRate: Infinity,
          fizzerSpawnRate: Infinity,
          ufoSpawnRate: Infinity,
          bossSpawnRate: Infinity
        }
        
      case 7: // Level 35: 🎯 DRONE SWARM
        return {
          level,
          name: "🎯 DRONE SWARM!",
          objectives: {
            dataMites: Math.floor(20 * difficultyScale),
            scanDrones: Math.floor(40 * difficultyScale), // MASSIVE DRONE COUNT!
            chaosWorms: 0,
            voidSpheres: 0,
            crystalSwarms: 0,
            fizzers: 0,
            ufos: 0,
            bosses: 0
          },
          miteSpawnRate: 1.5 * spawnScale,
          droneSpawnRate: 2.0 * spawnScale, // RAPID DRONE SPAWNS!
          wormSpawnRate: Infinity,
          voidSpawnRate: Infinity,
          crystalSpawnRate: Infinity,
          fizzerSpawnRate: Infinity,
          ufoSpawnRate: Infinity,
          bossSpawnRate: Infinity
        }
        
      case 8: // Level 40: 🔥 MITE APOCALYPSE
        return {
          level,
          name: "🔥 MITE APOCALYPSE!",
          objectives: {
            dataMites: Math.floor(150 * difficultyScale), // ENDLESS MITES!
            scanDrones: 0,
            chaosWorms: 0,
            voidSpheres: 0,
            crystalSwarms: 0,
            fizzers: 0,
            ufos: 0,
            bosses: 0
          },
          miteSpawnRate: 0.3 * spawnScale, // ULTRA RAPID MITE SPAWNS!
          droneSpawnRate: Infinity,
          wormSpawnRate: Infinity,
          voidSpawnRate: Infinity,
          crystalSpawnRate: Infinity,
          fizzerSpawnRate: Infinity,
          ufoSpawnRate: Infinity,
          bossSpawnRate: Infinity
        }
        
      case 9: // Level 45: 🌈 CHAOS MIX
        return {
          level,
          name: "🌈 TOTAL CHAOS!",
          objectives: {
            dataMites: Math.floor(40 * difficultyScale),
            scanDrones: Math.floor(15 * difficultyScale),
            chaosWorms: Math.floor(5 * difficultyScale),
            voidSpheres: Math.floor(3 * difficultyScale),
            crystalSwarms: Math.floor(4 * difficultyScale),
            fizzers: Math.floor(10 * difficultyScale),
            ufos: Math.floor(5 * difficultyScale),
            bosses: 2
          },
          miteSpawnRate: 0.6 * spawnScale,
          droneSpawnRate: 3.0 * spawnScale,
          wormSpawnRate: 15.0 * spawnScale,
          voidSpawnRate: 25.0 * spawnScale,
          crystalSpawnRate: 20.0 * spawnScale,
          fizzerSpawnRate: 5.0 * spawnScale,
          ufoSpawnRate: 15.0 * spawnScale,
          bossSpawnRate: 45.0
        }
        
      case 0: // Level 50, 100, etc: 💀 ULTIMATE CHALLENGE
      default:
        return {
          level,
          name: "💀 NEURAL MELTDOWN!",
          objectives: {
            dataMites: Math.floor(80 * difficultyScale),
            scanDrones: Math.floor(25 * difficultyScale),
            chaosWorms: Math.floor(8 * difficultyScale),
            voidSpheres: Math.floor(4 * difficultyScale),
            crystalSwarms: Math.floor(6 * difficultyScale),
            fizzers: Math.floor(15 * difficultyScale),
            ufos: Math.floor(8 * difficultyScale),
            bosses: Math.floor(2 + level / 20)
          },
          miteSpawnRate: 0.4 * spawnScale,
          droneSpawnRate: 2.5 * spawnScale,
          wormSpawnRate: 10.0 * spawnScale,
          voidSpawnRate: 20.0 * spawnScale,
          crystalSpawnRate: 15.0 * spawnScale,
          fizzerSpawnRate: 4.0 * spawnScale,
          ufoSpawnRate: 12.0 * spawnScale,
          bossSpawnRate: 35.0
        }
    }
  }

  /**
   * 📈 DYNAMIC LEVEL GENERATION - Normal levels with ramping difficulty
   */
  private static generateDynamicLevelConfig(level: number): LevelConfig {
    // Difficulty multiplier (increases 3% per level)
    const difficultyScale = 1 + (level - 1) * 0.03
    
    // Spawn rate multiplier (spawns get faster, minimum 0.3x)
    const spawnScale = Math.max(0.3, 1 - (level - 1) * 0.008)
    
    // Level names based on progression
    const levelNames = [
      "NEURAL INITIALIZATION", "SYSTEM BREACH", "VOID CORRUPTION", "ALIEN INCURSION",
      "DATA STORM", "NEURAL OVERLOAD", "DIGITAL CHAOS", "ALIEN ARMADA",
      "QUANTUM FLUX", "CYBER ASSAULT", "MATRIX COLLAPSE", "BINARY STORM",
      "PROTOCOL BREACH", "FIREWALL FAILURE", "MEMORY LEAK", "STACK OVERFLOW",
      "BUFFER OVERRUN", "KERNEL PANIC", "SYSTEM CRASH", "TOTAL MELTDOWN"
    ]
    const nameIndex = (level - 1) % levelNames.length
    
    // Determine which enemies are available based on level
    const hasWorms = level >= 2
    const hasVoidSpheres = level >= 3
    const hasCrystals = level >= 3
    const hasUFOs = level >= 4
    const hasBosses = level >= 5
    const hasFizzers = level >= 6
    
    // Calculate objectives (more enemies as levels progress)
    const baseObjectives: LevelObjectives = {
      dataMites: Math.floor((20 + level * 2) * difficultyScale),
      scanDrones: Math.floor((5 + level * 0.8) * difficultyScale),
      chaosWorms: hasWorms ? Math.floor((1 + level * 0.15) * difficultyScale) : 0,
      voidSpheres: hasVoidSpheres ? Math.floor((0.5 + level * 0.08) * difficultyScale) : 0,
      crystalSwarms: hasCrystals ? Math.floor((0.5 + level * 0.1) * difficultyScale) : 0,
      fizzers: hasFizzers ? Math.floor((level * 0.1) * difficultyScale) : 0,
      ufos: hasUFOs ? Math.floor((0.5 + level * 0.1) * difficultyScale) : 0,
      bosses: hasBosses ? Math.floor(0.5 + level * 0.05) : 0
    }
    
    // Calculate spawn rates (faster as levels progress)
    const config: LevelConfig = {
      level,
      name: `${levelNames[nameIndex]} - LVL ${level}`,
      objectives: baseObjectives,
      miteSpawnRate: Math.max(0.4, 1.6 - level * 0.012) * spawnScale,
      droneSpawnRate: Math.max(2.0, 10 - level * 0.08) * spawnScale,
      wormSpawnRate: hasWorms ? Math.max(15, 50 - level * 0.4) * spawnScale : Infinity,
      voidSpawnRate: hasVoidSpheres ? Math.max(25, 90 - level * 0.7) * spawnScale : Infinity,
      crystalSpawnRate: hasCrystals ? Math.max(20, 70 - level * 0.5) * spawnScale : Infinity,
      fizzerSpawnRate: hasFizzers ? Math.max(8, 30 - level * 0.2) * spawnScale : Infinity,
      ufoSpawnRate: hasUFOs ? Math.max(20, 55 - level * 0.4) * spawnScale : Infinity,
      bossSpawnRate: hasBosses ? Math.max(30, 110 - level * 0.8) : Infinity
    }
    
    return config
  }

  constructor() {
    this.currentLevel = 1
    this.totalElapsedTime = 0
    this.currentProgress = this.createEmptyProgress()
    this.objectivesComplete = false
  }

  private createEmptyProgress(): LevelProgress {
    return {
      dataMites: 0,
      scanDrones: 0,
      chaosWorms: 0,
      voidSpheres: 0,
      crystalSwarms: 0,
      fizzers: 0,
      ufos: 0,
      bosses: 0
    }
  }

  start(): void {
    this.currentLevel = 1
    this.totalElapsedTime = 0
    this.currentProgress = this.createEmptyProgress()
    this.objectivesComplete = false
  }
  
  startAtLevel(level: number): void {
    this.currentLevel = level
    this.totalElapsedTime = 0
    this.currentProgress = this.createEmptyProgress()
    this.objectivesComplete = false
  }

  update(deltaTime: number): void {
    this.totalElapsedTime += deltaTime
  }

  getCurrentLevel(): number {
    return this.currentLevel
  }

  getCurrentLevelConfig(): LevelConfig {
    return LevelManager.getLevelConfig(this.currentLevel)
  }

  getTotalElapsedTime(): number {
    return this.totalElapsedTime
  }

  // ═══════════════════════════════════════════════════════
  // 🎯 OBJECTIVE TRACKING
  // ═══════════════════════════════════════════════════════

  /**
   * Register an enemy kill for objective tracking
   */
  registerKill(enemyType: string): void {
    if (this.objectivesComplete) return

    switch (enemyType) {
      case 'DataMite':
        this.currentProgress.dataMites++
        break
      case 'ScanDrone':
        this.currentProgress.scanDrones++
        break
      case 'ChaosWorm':
        this.currentProgress.chaosWorms++
        break
      case 'VoidSphere':
        this.currentProgress.voidSpheres++
        break
      case 'CrystalShardSwarm':
        this.currentProgress.crystalSwarms++
        break
      case 'Fizzer':
        this.currentProgress.fizzers++
        break
      case 'UFO':
        this.currentProgress.ufos++
        break
      case 'Boss':
        this.currentProgress.bosses++
        break
    }
  }

  /**
   * Check if all objectives are complete
   */
  checkObjectivesComplete(): boolean {
    if (this.objectivesComplete) return true

    const config = this.getCurrentLevelConfig()
    const objectives = config.objectives
    const progress = this.currentProgress

    const complete = (
      progress.dataMites >= objectives.dataMites &&
      progress.scanDrones >= objectives.scanDrones &&
      progress.chaosWorms >= objectives.chaosWorms &&
      progress.voidSpheres >= objectives.voidSpheres &&
      progress.crystalSwarms >= objectives.crystalSwarms &&
      progress.fizzers >= objectives.fizzers &&
      progress.ufos >= objectives.ufos &&
      progress.bosses >= objectives.bosses
    )

    if (complete) {
      this.objectivesComplete = true
    }

    return complete
  }

  /**
   * Get current progress towards objectives
   */
  getProgress(): LevelProgress {
    return { ...this.currentProgress }
  }

  /**
   * Get objectives for current level
   */
  getObjectives(): LevelObjectives {
    return { ...this.getCurrentLevelConfig().objectives }
  }

  /**
   * Advance to next level (called after transition)
   */
  advanceLevel(): void {
    if (this.currentLevel < LevelManager.TOTAL_LEVELS) {
      this.currentLevel++
      this.currentProgress = this.createEmptyProgress()
      this.objectivesComplete = false
    }
  }

  /**
   * Reset objectives without advancing level
   */
  resetObjectives(): void {
    this.currentProgress = this.createEmptyProgress()
    this.objectivesComplete = false
  }

  /**
   * Check if all levels are complete
   */
  isGameComplete(): boolean {
    return this.currentLevel >= LevelManager.TOTAL_LEVELS && this.objectivesComplete
  }

  /**
   * Get level progress as percentage (0-100)
   */
  getLevelProgress(): number {
    const config = this.getCurrentLevelConfig()
    const objectives = config.objectives
    const progress = this.currentProgress

    // Calculate total kills needed
    const totalNeeded = (
      objectives.dataMites +
      objectives.scanDrones +
      objectives.chaosWorms +
      objectives.voidSpheres +
      objectives.crystalSwarms +
      objectives.fizzers +
      objectives.ufos +
      objectives.bosses
    )

    // Calculate total kills achieved
    const totalAchieved = (
      Math.min(progress.dataMites, objectives.dataMites) +
      Math.min(progress.scanDrones, objectives.scanDrones) +
      Math.min(progress.chaosWorms, objectives.chaosWorms) +
      Math.min(progress.voidSpheres, objectives.voidSpheres) +
      Math.min(progress.crystalSwarms, objectives.crystalSwarms) +
      Math.min(progress.fizzers, objectives.fizzers) +
      Math.min(progress.ufos, objectives.ufos) +
      Math.min(progress.bosses, objectives.bosses)
    )

    if (totalNeeded === 0) return 100
    return Math.min(100, (totalAchieved / totalNeeded) * 100)
  }

  /**
   * Get total game progress as percentage (0-100)
   */
  getTotalProgress(): number {
    const completedLevels = this.currentLevel - 1
    const currentLevelProgress = this.getLevelProgress() / 100
    return ((completedLevels + currentLevelProgress) / LevelManager.TOTAL_LEVELS) * 100
  }

  /**
   * Check if objectives are complete (for transition trigger)
   */
  areObjectivesComplete(): boolean {
    return this.objectivesComplete
  }

  static getTotalLevels(): number {
    return LevelManager.TOTAL_LEVELS
  }
  
  /**
   * 🧪 TEST MODE - Endless level with all enemy types
   * For testing and review purposes
   */
  startTestLevel(): void {
    this.currentLevel = 999 // Special level number for test mode
    this.totalElapsedTime = 0
    this.currentProgress = {
      dataMites: 0,
      scanDrones: 0,
      chaosWorms: 0,
      voidSpheres: 0,
      crystalSwarms: 0,
      fizzers: 0,
      ufos: 0,
      bosses: 0
    }
    this.objectivesComplete = false
  }

  // ═══════════════════════════════════════════════════════
  // 🧪 TEST MODE CONFIGURATION
  // ═══════════════════════════════════════════════════════
  static getTestLevelConfig(): LevelConfig {
    return {
      level: 999,
      name: "TEST MODE - ALL ENEMIES",
      objectives: {
        dataMites: 99999,    // Effectively endless
        scanDrones: 99999,
        chaosWorms: 99999,
        voidSpheres: 99999,
        crystalSwarms: 99999,
        fizzers: 99999,
        ufos: 99999,
        bosses: 99999
      },
      // Fast spawn rates to get all enemy types quickly
      miteSpawnRate: 2.0,
      droneSpawnRate: 8.0,
      wormSpawnRate: 12.0,
      voidSpawnRate: 15.0,
      crystalSpawnRate: 10.0,
      fizzerSpawnRate: 14.0,
      ufoSpawnRate: 18.0,
      bossSpawnRate: 25.0
    }
  }

  // ═══════════════════════════════════════════════════════
  // 🎮 LEGACY COMPATIBILITY (for timer-based systems)
  // ═══════════════════════════════════════════════════════

  /**
   * Legacy method - returns 0 since we're objective-based now
   */
  getLevelElapsedTime(): number {
    return 0
  }

  /**
   * Legacy method - objectives-based system doesn't use time
   * This always returns false now - use checkObjectivesComplete() instead
   */
  checkLevelComplete(): boolean {
    return false
  }
}
