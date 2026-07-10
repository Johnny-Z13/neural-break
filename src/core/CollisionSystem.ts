import * as THREE from 'three'
import { Player } from '../entities/Player'
import { Enemy } from '../entities'
import { EnemyManager } from './EnemyManager'
import { WeaponSystem } from '../weapons/WeaponSystem'
import { PowerUpManager } from './PowerUpManager'
import { MedPackManager } from './MedPackManager'
import { SpeedUpManager } from './SpeedUpManager'
import { ShieldManager } from './ShieldManager'
import { InvulnerableManager } from './InvulnerableManager'
import { SceneManager } from '../graphics/SceneManager'
import { AudioManager } from '../audio/AudioManager'
import { InputManager } from './InputManager'
import { UIManager } from '../ui/UIManager'
import { GameStats, ScoreManager } from './GameState'
import { DEBUG_MODE } from '../config'

/**
 * Callback interface for collision events that affect game state
 */
export interface CollisionCallbacks {
  /** Called when player takes damage */
  onPlayerDamage: (damage: number) => void
  /** Called when an enemy is killed */
  onEnemyKill: (enemy: Enemy, screenPos: { x: number, y: number }) => void
  /** Called when multiplier changes */
  onMultiplierChange: (newMultiplier: number, lost: boolean) => void
  /** Called when Fizzer should spawn */
  onFizzerSpawnTrigger: () => void
  /** Called to get current time */
  getCurrentTime: () => number
  /** Convert world position to screen position */
  worldToScreen: (worldPos: THREE.Vector3) => { x: number, y: number }
}

/**
 * CollisionSystem - Handles all collision detection and response
 * 
 * Extracted from Game.ts for better modularity and maintainability.
 * Manages collisions between:
 * - Player and enemies
 * - Player and enemy projectiles
 * - Player and UFO lasers
 * - Player projectiles and enemies
 * - Player and pickups (power-ups, med packs, speed-ups, shields, invulnerables)
 */
export class CollisionSystem {
  private player: Player
  private enemyManager: EnemyManager
  private weaponSystem: WeaponSystem
  private powerUpManager: PowerUpManager
  private medPackManager: MedPackManager
  private speedUpManager: SpeedUpManager
  private shieldManager: ShieldManager
  private invulnerableManager: InvulnerableManager
  private sceneManager: SceneManager
  private audioManager: AudioManager
  private inputManager: InputManager
  private uiManager: UIManager
  
  private callbacks: CollisionCallbacks
  
  // 🎯 ARCADE-STYLE MULTIPLIER SYSTEM STATE
  private scoreMultiplier: number = 1
  private multiplierDecayTime: number = 2.0
  private lastKillTime: number = 0
  private killChainWindow: number = 1.5
  private lastMultiplierShown: number = 0
  
  // Combo state
  private combo: number = 0
  private comboTimer: number = 0

  constructor(
    player: Player,
    enemyManager: EnemyManager,
    weaponSystem: WeaponSystem,
    powerUpManager: PowerUpManager,
    medPackManager: MedPackManager,
    speedUpManager: SpeedUpManager,
    shieldManager: ShieldManager,
    invulnerableManager: InvulnerableManager,
    sceneManager: SceneManager,
    audioManager: AudioManager,
    inputManager: InputManager,
    uiManager: UIManager,
    callbacks: CollisionCallbacks
  ) {
    this.player = player
    this.enemyManager = enemyManager
    this.weaponSystem = weaponSystem
    this.powerUpManager = powerUpManager
    this.medPackManager = medPackManager
    this.speedUpManager = speedUpManager
    this.shieldManager = shieldManager
    this.invulnerableManager = invulnerableManager
    this.sceneManager = sceneManager
    this.audioManager = audioManager
    this.inputManager = inputManager
    this.uiManager = uiManager
    this.callbacks = callbacks
  }

  /**
   * Reset all collision system state
   */
  reset(): void {
    this.scoreMultiplier = 1
    this.lastKillTime = 0
    this.lastMultiplierShown = 0
    this.combo = 0
    this.comboTimer = 0
  }

  /**
   * Get current score multiplier
   */
  getScoreMultiplier(): number {
    return this.scoreMultiplier
  }

  /**
   * Get current combo count
   */
  getCombo(): number {
    return this.combo
  }

  /**
   * Update combo timer (called each frame)
   */
  updateComboTimer(deltaTime: number): void {
    this.comboTimer -= deltaTime
    if (this.comboTimer <= 0) {
      this.combo = 0
    }
  }

  /**
   * Check and handle all collisions
   */
  checkCollisions(gameStats: GameStats): void {
    if (!this.player || !this.enemyManager || !this.weaponSystem) {
      return
    }
    
    const enemies = this.enemyManager.getEnemies()
    
    // Check player-enemy collisions
    this.checkPlayerEnemyCollisions(enemies)
    
    // Check enemy projectile-player collisions
    this.checkEnemyProjectileCollisions()
    
    // Check UFO laser hits
    this.checkUFOLaserCollisions()
    
    // Check weapon-enemy collisions
    this.checkWeaponEnemyCollisions(enemies, gameStats)
    
    // Check pickup collisions
    this.checkPowerUpCollisions()
    this.checkSpeedUpCollisions()
    this.checkMedPackCollisions()
    this.checkShieldCollisions()
    this.checkInvulnerableCollisions()
  }

  /**
   * Check player-enemy collisions
   */
  private checkPlayerEnemyCollisions(enemies: Enemy[]): void {
    if (this.player.isInvulnerableNow()) return
    
    for (const enemy of enemies) {
      if (enemy.isAlive() && this.player.isCollidingWith(enemy)) {
        this.player.takeDamage(enemy.getDamage())
        this.audioManager.playHitSound()
        this.sceneManager.addScreenShake(0.5, 0.2)
        this.inputManager.vibrateHeavy()
        
        // Kill enemy with massive damage
        enemy.takeDamage(9999)
        
        // Reset multiplier on damage
        this.resetMultiplier()
        
        // Reset Fizzer streak
        this.enemyManager.resetFizzerStreak()
        
        this.callbacks.onPlayerDamage(enemy.getDamage())
      }
    }
  }

  /**
   * Check enemy projectile-player collisions
   */
  private checkEnemyProjectileCollisions(): void {
    if (this.player.isInvulnerableNow()) return
    
    const enemyProjectiles = this.enemyManager.getAllEnemyProjectiles()
    for (const enemyProjectile of enemyProjectiles) {
      if (enemyProjectile.isAlive() && enemyProjectile.isCollidingWith(this.player)) {
        this.player.takeDamage(enemyProjectile.getDamage())
        this.audioManager.playHitSound()
        this.sceneManager.addScreenShake(0.3, 0.15)
        this.inputManager.vibrateMedium()
        enemyProjectile.destroy()
        
        this.resetMultiplier()
        this.enemyManager.resetFizzerStreak()
        
        this.callbacks.onPlayerDamage(enemyProjectile.getDamage())
      }
    }
  }

  /**
   * Check UFO laser-player collisions
   */
  private checkUFOLaserCollisions(): void {
    if (this.player.isInvulnerableNow()) return
    
    const laserHit = this.enemyManager.checkUFOLaserHits(this.player)
    if (laserHit.hit) {
      this.player.takeDamage(laserHit.damage)
      this.audioManager.playHitSound()
      this.sceneManager.addScreenShake(0.6, 0.3)
      this.inputManager.vibrateExplosion()
      
      this.resetMultiplier()
      this.enemyManager.resetFizzerStreak()
      
      this.callbacks.onPlayerDamage(laserHit.damage)
    }
  }

  /**
   * Check weapon-enemy collisions and handle kills
   */
  private checkWeaponEnemyCollisions(enemies: Enemy[], gameStats: GameStats): void {
    const projectiles = this.weaponSystem.getProjectiles()
    
    for (const projectile of projectiles) {
      for (const enemy of enemies) {
        if (enemy.isAlive() && projectile.isCollidingWith(enemy)) {
          enemy.takeDamage(projectile.getDamage())
          projectile.destroy()
          this.weaponSystem.removeProjectile(projectile)
          
          // Check if kill should be tracked (handles death animations)
          if (enemy.shouldTrackKill()) {
            enemy.markKillTracked()
            this.handleEnemyKill(enemy, gameStats)
          }
          break
        }
      }
    }
  }

  /**
   * Handle enemy kill - scoring, multiplier, effects
   */
  private handleEnemyKill(enemy: Enemy, gameStats: GameStats): void {
    const currentTime = this.callbacks.getCurrentTime()
    const timeSinceLastKill = currentTime - this.lastKillTime
    const enemyType = enemy.constructor.name
    
    // Check if kill is within chain window
    if (timeSinceLastKill <= this.killChainWindow && this.lastKillTime > 0) {
      const oldMultiplier = this.scoreMultiplier
      this.scoreMultiplier = Math.min(this.scoreMultiplier + 1, 15)
      
      // Show multiplier increase notification (throttled)
      if (this.scoreMultiplier > oldMultiplier && 
          currentTime - this.lastMultiplierShown > 0.3) {
        this.uiManager.showMultiplierIncrease(this.scoreMultiplier)
        this.lastMultiplierShown = currentTime
        this.callbacks.onMultiplierChange(this.scoreMultiplier, false)
      }
      
      // Spawn Fizzer at high multiplier
      if (this.scoreMultiplier === 5 || this.scoreMultiplier === 8 || this.scoreMultiplier === 11) {
        this.callbacks.onFizzerSpawnTrigger()
      }
    }
    
    // Add score with multiplier
    const basePoints = ScoreManager.getKillPoints(enemyType)
    const totalPoints = basePoints * this.scoreMultiplier
    gameStats.score += totalPoints
    
    // Track highest multiplier
    gameStats.highestMultiplier = Math.max(gameStats.highestMultiplier, this.scoreMultiplier)
    
    // Show arcade score popup
    const screenPos = this.callbacks.worldToScreen(enemy.getPosition())
    this.uiManager.showKillScore(basePoints, this.scoreMultiplier, screenPos.x, screenPos.y)
    
    this.lastKillTime = currentTime
    
    // Add combo
    this.combo++
    this.comboTimer = 3.0
    
    // Add XP
    this.player.addXP(enemy.getXPValue())
    
    // Play enemy-specific death sound
    this.audioManager.playEnemyDeathSound(enemyType)
    
    // Audio-visual reaction
    const audioVisualSystem = this.sceneManager.getAudioVisualSystem()
    const deathIntensity = 1.0 + (this.scoreMultiplier * 0.1)
    audioVisualSystem.onEnemyDeath(enemyType, enemy.getPosition(), deathIntensity)
    
    // Play combo sound if high enough
    if (this.combo >= 2) {
      this.audioManager.playComboSound(this.combo)
      audioVisualSystem.onCombo(this.combo)
    }
    
    // Screen shake on kill
    this.sceneManager.addScreenShake(0.3, 0.1)
    this.inputManager.vibrateLight()
    
    // Notify callback
    this.callbacks.onEnemyKill(enemy, screenPos)
  }

  /**
   * Reset multiplier (called on player damage)
   */
  private resetMultiplier(): void {
    if (this.scoreMultiplier >= 3) {
      this.uiManager.showMultiplierLost()
      this.callbacks.onMultiplierChange(1, true)
    }
    this.scoreMultiplier = 1
    this.combo = 0
  }

  /**
   * Check and update multiplier decay
   */
  updateMultiplierDecay(currentTime: number, gameStats: GameStats): void {
    const timeSinceLastKill = currentTime - this.lastKillTime
    if (timeSinceLastKill > this.multiplierDecayTime && this.scoreMultiplier > 1) {
      if (this.scoreMultiplier >= 3) {
        this.uiManager.showMultiplierLost()
      }
      this.scoreMultiplier = 1
      this.callbacks.onMultiplierChange(1, true)
    }
    
    gameStats.highestCombo = Math.max(gameStats.highestCombo, this.combo)
  }

  /**
   * Check power-up collisions
   */
  private checkPowerUpCollisions(): void {
    const powerUps = this.powerUpManager.getPowerUps()
    for (const powerUp of powerUps) {
      if (powerUp.isAlive() && this.player.isCollidingWith(powerUp)) {
        const wasAtMax = this.player.isAtMaxPowerUp()
        const oldLevel = this.player.getPowerUpLevel()
        const wasCollected = this.player.collectPowerUp()
        const newLevel = this.player.getPowerUpLevel()
        
        if (wasCollected && newLevel > oldLevel) {
          powerUp.collect()
          this.powerUpManager.removePowerUp(powerUp)
          this.weaponSystem.cycleWeaponType()
          
          const newWeaponType = this.weaponSystem.getCurrentWeaponType()
          this.uiManager.updateWeaponType(newWeaponType)
          this.uiManager.showWeaponTypeChangeNotification(newWeaponType)
          this.sceneManager.addScreenShake(0.2, 0.1)
          this.uiManager.showPowerUpCollected(newLevel)
          this.audioManager.playPowerUpCollectSound()
          
          if (DEBUG_MODE) {
            console.log(`💎 Power-Up collected! Level: ${oldLevel} → ${newLevel}/10 | Weapon: ${newWeaponType.toUpperCase()}`)
          }
        } else if (wasAtMax) {
          this.uiManager.showAlreadyAtMax('weapons')
          this.audioManager.playPowerUpCollectSound()
        }
      }
    }
  }

  /**
   * Check speed-up collisions
   */
  private checkSpeedUpCollisions(): void {
    const speedUps = this.speedUpManager.getSpeedUps()
    for (const speedUp of speedUps) {
      if (speedUp.isAlive() && this.player.isCollidingWith(speedUp)) {
        const wasAtMax = this.player.isAtMaxSpeed()
        const oldLevel = this.player.getSpeedUpLevel()
        const wasCollected = this.player.collectSpeedUp()
        const newLevel = this.player.getSpeedUpLevel()
        
        if (wasCollected && newLevel > oldLevel) {
          speedUp.collect()
          this.speedUpManager.removeSpeedUp(speedUp)
          this.sceneManager.addScreenShake(0.2, 0.1)
          this.uiManager.showSpeedUpCollected(newLevel)
          this.audioManager.playSpeedUpCollectSound()
          
          if (DEBUG_MODE) {
            console.log(`⚡ Speed-Up collected! Level: ${oldLevel} → ${newLevel}/20 (${newLevel * 5}% boost)`)
          }
        } else if (wasAtMax) {
          this.uiManager.showAlreadyAtMax('speed')
          this.audioManager.playSpeedUpCollectSound()
        }
      }
    }
  }

  /**
   * Check med pack collisions
   */
  private checkMedPackCollisions(): void {
    const medPacks = this.medPackManager.getMedPacks()
    for (const medPack of medPacks) {
      if (medPack.isAlive() && this.player.isCollidingWith(medPack)) {
        this.player.heal(medPack.getHealthRestore())
        medPack.collect()
        this.medPackManager.removeMedPack(medPack)
        this.sceneManager.addScreenShake(0.15, 0.1)
        this.audioManager.playMedPackCollectSound()
      }
    }
  }

  /**
   * Check shield collisions
   */
  private checkShieldCollisions(): void {
    const shields = this.shieldManager.getShields()
    for (const shield of shields) {
      if (shield.isAlive() && this.player.isCollidingWith(shield)) {
        const wasCollected = this.player.collectShield()
        if (wasCollected) {
          shield.collect()
          this.shieldManager.removeShield(shield)
        }
      }
    }
  }

  /**
   * Check invulnerable collisions
   */
  private checkInvulnerableCollisions(): void {
    const invulnerables = this.invulnerableManager.getInvulnerables()
    for (const invulnerable of invulnerables) {
      if (invulnerable.isAlive() && this.player.isCollidingWith(invulnerable)) {
        const wasCollected = this.player.collectInvulnerable()
        if (wasCollected) {
          invulnerable.setAlive(false)
          this.sceneManager.removeFromScene(invulnerable.getMesh())
          this.sceneManager.addScreenShake(0.3, 0.15)
          
          if (DEBUG_MODE) {
            console.log('⚡ Invulnerable collected! Player is invulnerable! ⚡')
          }
        }
      }
    }
  }
}
