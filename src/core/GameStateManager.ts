import * as THREE from 'three'
import { Player } from '../entities/Player'
import { EnemyManager } from './EnemyManager'
import { WeaponSystem } from '../weapons/WeaponSystem'
import { SceneManager } from '../graphics/SceneManager'
import { AudioManager } from '../audio/AudioManager'
import { InputManager } from './InputManager'
import { UIManager } from '../ui/UIManager'
import { LevelManager } from './LevelManager'
import { PowerUpManager } from './PowerUpManager'
import { MedPackManager } from './MedPackManager'
import { SpeedUpManager } from './SpeedUpManager'
import { ShieldManager } from './ShieldManager'
import { InvulnerableManager } from './InvulnerableManager'
import { GameStateType } from './GameState'
import { DEBUG_MODE } from '../config'

/**
 * GameStateManager - Handles game state transitions, death animations, and level transitions
 * 
 * Extracted from Game.ts for better modularity and maintainability.
 */
export class GameStateManager {
  private sceneManager: SceneManager
  private audioManager: AudioManager
  private uiManager: UIManager
  private inputManager: InputManager
  
  // State
  private gameState: GameStateType = GameStateType.START_SCREEN
  private isPaused: boolean = false
  
  // Death animation state
  private isDeathAnimationPlaying: boolean = false
  private deathAnimationTime: number = 0
  private deathAnimationDuration: number = 2.0
  
  // Level transition state
  private isLevelTransitioning: boolean = false
  private transitionPhase: 'clearing' | 'displaying' | 'complete' = 'clearing'
  private transitionTimer: number = 0
  private clearingDuration: number = 3.0
  private displayDuration: number = 3.0

  constructor(
    sceneManager: SceneManager,
    audioManager: AudioManager,
    uiManager: UIManager,
    inputManager: InputManager
  ) {
    this.sceneManager = sceneManager
    this.audioManager = audioManager
    this.uiManager = uiManager
    this.inputManager = inputManager
  }

  // ═══════════════════════════════════════════════════════
  // STATE GETTERS
  // ═══════════════════════════════════════════════════════

  getGameState(): GameStateType {
    return this.gameState
  }

  setGameState(state: GameStateType): void {
    this.gameState = state
  }

  isPausedState(): boolean {
    return this.isPaused
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused
  }

  isDeathAnimating(): boolean {
    return this.isDeathAnimationPlaying
  }

  isTransitioning(): boolean {
    return this.isLevelTransitioning
  }

  // ═══════════════════════════════════════════════════════
  // 💀 DEATH ANIMATION SYSTEM
  // ═══════════════════════════════════════════════════════

  /**
   * Start the death animation sequence
   */
  startDeathAnimation(player: Player): void {
    if (!player) return
    
    this.isDeathAnimationPlaying = true
    this.deathAnimationTime = 0
    
    // Trigger Asteroids-style ship breakup
    player.explodeIntoFragments()
    
    // Play game over sound immediately
    this.audioManager.playGameOverSound()
    
    // Create dramatic death explosion at player position
    const playerPos = player.getPosition()
    const effectsSystem = this.sceneManager.getEffectsSystem()
    
    // Massive initial screen shake
    this.sceneManager.addScreenShake(2.0, 0.8)
    
    // Multiple explosion layers for dramatic effect
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        effectsSystem.createExplosion(
          playerPos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            0
          )),
          1.5 + Math.random() * 1.5,
          new THREE.Color().setHSL(Math.random() * 0.1, 1.0, 0.5 + Math.random() * 0.2)
        )
      }, i * 120)
    }
    
    // Secondary explosion wave
    setTimeout(() => {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        const distance = 2.0 + Math.random() * 1.0
        effectsSystem.createExplosion(
          playerPos.clone().add(new THREE.Vector3(
            Math.cos(angle) * distance,
            Math.sin(angle) * distance,
            0
          )),
          1.0,
          new THREE.Color().setHSL(0.05, 1.0, 0.6)
        )
      }
      this.sceneManager.addScreenShake(1.5, 0.4)
    }, 600)
  }

  /**
   * Update death animation each frame
   * @returns true if animation is complete
   */
  updateDeathAnimation(deltaTime: number, player: Player, inputManager: InputManager): boolean {
    this.deathAnimationTime += deltaTime
    
    // Animate player fragments during death
    if (player) {
      player.update(deltaTime, inputManager)
    }
    
    // Continue updating scene for visual effects
    this.sceneManager.update(deltaTime)
    
    // Continuous visual effects during death
    const effectsSystem = this.sceneManager.getEffectsSystem()
    
    if (Math.random() < 0.15) {
      const playerPos = player?.getPosition() || new THREE.Vector3(0, 0, 0)
      const sparkVel = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        0
      )
      const sparkColor = new THREE.Color().setHSL(
        Math.random() * 0.1,
        1.0,
        0.5 + Math.random() * 0.3
      )
      effectsSystem.createSparkle(playerPos, sparkVel, sparkColor, 0.5)
    }
    
    // Check if animation is complete
    if (this.deathAnimationTime >= this.deathAnimationDuration) {
      this.isDeathAnimationPlaying = false
      return true
    }
    
    return false
  }

  // ═══════════════════════════════════════════════════════
  // 🎯 LEVEL TRANSITION SYSTEM
  // ═══════════════════════════════════════════════════════

  /**
   * Start level transition sequence
   */
  startLevelTransition(
    enemyManager: EnemyManager,
    effectsSystem: any
  ): void {
    if (this.isLevelTransitioning) return

    if (DEBUG_MODE) console.log('🎯 Level objectives complete! Starting transition...')
    
    this.isLevelTransitioning = true
    this.transitionPhase = 'clearing'
    this.transitionTimer = 0

    // Juicy feedback
    this.audioManager.playLevelCompleteSound()
    this.sceneManager.addScreenShake(1.0, 0.5)
    
    // Clear all enemies with staggered death animations
    this.clearAllEnemies(enemyManager, effectsSystem)
    
    // Stop spawning new enemies
    enemyManager.pauseSpawning()
  }

  /**
   * Update level transition each frame
   * @returns 'complete' when transition is done and level should advance
   */
  updateLevelTransition(
    deltaTime: number,
    levelManager: LevelManager,
    uiManager: UIManager
  ): 'ongoing' | 'complete' | 'game_over' {
    this.transitionTimer += deltaTime

    switch (this.transitionPhase) {
      case 'clearing':
        if (this.transitionTimer >= this.clearingDuration) {
          this.transitionPhase = 'displaying'
          this.transitionTimer = 0
          
          // Check if game is complete
          if (levelManager.isGameComplete()) {
            if (DEBUG_MODE) console.log('🎉 ALL LEVELS COMPLETE!')
            this.isLevelTransitioning = false
            return 'game_over'
          }

          uiManager.showLevelCompleteNotification()
        }
        break

      case 'displaying':
        if (this.transitionTimer >= this.displayDuration) {
          this.transitionPhase = 'complete'
          return 'complete'
        }
        break

      case 'complete':
        this.isLevelTransitioning = false
        break
    }
    
    return 'ongoing'
  }

  /**
   * Complete the transition and prepare for next level
   */
  completeTransition(
    enemyManager: EnemyManager,
    weaponSystem: WeaponSystem,
    levelManager: LevelManager,
    powerUpManager: PowerUpManager,
    medPackManager: MedPackManager,
    speedUpManager: SpeedUpManager,
    shieldManager: ShieldManager,
    invulnerableManager: InvulnerableManager,
    player: Player
  ): void {
    // Force clear any remaining enemies
    if (DEBUG_MODE) console.log('🧹 Force-clearing any remaining enemies...')
    const remainingEnemies = enemyManager.getEnemies()
    if (remainingEnemies.length > 0) {
      console.warn(`⚠️ ${remainingEnemies.length} enemies still present - force removing!`)
      for (const enemy of remainingEnemies) {
        enemy.destroy()
        this.sceneManager.removeFromScene(enemy.getMesh())
      }
    }
    enemyManager.clearAllEnemies()
    
    // Clear all projectiles
    if (DEBUG_MODE) console.log('🧹 Clearing all projectiles...')
    weaponSystem.clearAllProjectiles()
    
    // Clear visual effects
    if (DEBUG_MODE) console.log('🧹 Clearing visual effects...')
    const effectsSystem = this.sceneManager.getEffectsSystem()
    if (effectsSystem?.cleanup) {
      effectsSystem.cleanup()
    }
    
    // Advance to next level
    levelManager.advanceLevel()
    const newLevel = levelManager.getCurrentLevel()
    const config = levelManager.getCurrentLevelConfig()
    
    if (DEBUG_MODE) console.log(`🎯 Starting Level ${newLevel}: ${config.name}`)
    
    // Show new level notification
    this.uiManager.showLevelUpNotification(newLevel)
    
    // Reset managers for new level
    powerUpManager.resetForNewLevel()
    medPackManager.resetForNewLevel()
    speedUpManager.resetForNewLevel()
    shieldManager.resetForNewLevel()
    
    // Clear invulnerable - does NOT carry over between levels
    invulnerableManager.reset()
    player.clearInvulnerable()
    if (DEBUG_MODE) console.log('🚫 Invulnerable state cleared for new level')
    
    // Resume enemy spawning
    enemyManager.resumeSpawning()
    
    // Reset transition state
    this.isLevelTransitioning = false
    this.transitionPhase = 'clearing'
    this.transitionTimer = 0
  }

  /**
   * Clear all enemies with staggered death animations
   */
  private clearAllEnemies(
    enemyManager: EnemyManager,
    effectsSystem: any
  ): void {
    if (DEBUG_MODE) console.log('💥 Clearing all enemies with death animations!')
    
    this.sceneManager.addScreenShake(1.0, 0.5)
    this.inputManager.vibrateExplosion()
    
    const enemies = enemyManager.getEnemies()
    
    // Stagger deaths within 1 second for variety
    enemies.forEach((enemy) => {
      const randomDelay = Math.random() * 1000
      
      setTimeout(() => {
        if (enemy.isAlive()) {
          // Kill with massive damage to trigger proper death sequence
          enemy.takeDamage(999999)
          
          // Add extra cyan glow effect
          effectsSystem.createExplosion(
            enemy.getPosition(),
            2.0,
            new THREE.Color(0, 1, 1)
          )
          
          // Play transition sound
          this.audioManager.playEnemyDeathSound(enemy.constructor.name)
        }
      }, randomDelay)
    })
  }

  /**
   * Reset all state for new game
   */
  reset(): void {
    this.gameState = GameStateType.START_SCREEN
    this.isPaused = false
    this.isDeathAnimationPlaying = false
    this.deathAnimationTime = 0
    this.isLevelTransitioning = false
    this.transitionPhase = 'clearing'
    this.transitionTimer = 0
  }
}
