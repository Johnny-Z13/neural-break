import * as THREE from 'three'
import { Enemy, EnemyState } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'
import { ENTITY_PALETTE } from '../config/palette.config'
import { tracerQuad } from '../graphics/VectorShapes'

/**
 * ⚡ FIZZER - CHAOS INCARNATE ⚡
 * A tiny, hyperactive menace that:
 * - Spawns when player achieves high multiplier without taking hits
 * - Moves erratically and unpredictably - like a caffeinated UFO
 * - Small and fast = hard to hit
 * - Fires rapid bursts of bullets
 * - Adds pure chaos to reward skilled players with... more challenge!
 */
export class Fizzer extends Enemy {
  private sceneManager: SceneManager | null = null
  private projectiles: EnemyProjectile[] = []
  
  // ⚡ ERRATIC MOVEMENT STATE ⚡
  private erraticTimer: number = 0
  private erraticInterval: number = 0.15 // Change direction every 150ms!
  private currentDirection: THREE.Vector3 = new THREE.Vector3()
  private jitterAmount: number = 0
  private phaseOffset: number = Math.random() * Math.PI * 2
  
  // 🔫 FIRING STATE 🔫
  private fireTimer: number = 0
  private fireRate: number = BALANCE_CONFIG.FIZZER.FIRE_RATE
  private burstCount: number = 0
  private burstTimer: number = 0
  private maxBurst: number = BALANCE_CONFIG.FIZZER.BURST_COUNT
  private burstDelay: number = BALANCE_CONFIG.FIZZER.BURST_DELAY

  constructor(x: number, y: number) {
    super(x, y)
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.FIZZER
    this.health = stats.HEALTH
    this.maxHealth = stats.HEALTH
    this.speed = stats.SPEED
    this.damage = stats.DAMAGE
    this.xpValue = stats.XP_VALUE
    this.radius = stats.RADIUS
    
    // 💥 DEATH DAMAGE 💥
    this.deathDamageRadius = stats.DEATH_RADIUS
    this.deathDamageAmount = stats.DEATH_DAMAGE
  }

  setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager
  }

  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  getProjectiles(): EnemyProjectile[] {
    return this.projectiles
  }

  initialize(): void {
    this.mesh = tracerQuad(0.14, 0.7, ENTITY_PALETTE.FIZZER)
    const bar2 = tracerQuad(0.14, 0.7, ENTITY_PALETTE.FIZZER)
    bar2.rotation.z = Math.PI / 2
    this.mesh.add(bar2) // child 0
    this.mesh.position.copy(this.position)
    const cross = [new THREE.Vector2(0, 0.35), new THREE.Vector2(0.35, 0), new THREE.Vector2(0, -0.35), new THREE.Vector2(-0.35, 0)]
    this.registerVector(cross, 0.1, ENTITY_PALETTE.FIZZER,
      [this.mesh.material as THREE.MeshBasicMaterial, bar2.material as THREE.MeshBasicMaterial])

    // Initialize random direction
    this.randomizeDirection()
  }

  private randomizeDirection(): void {
    // Completely random direction change
    const angle = Math.random() * Math.PI * 2
    this.currentDirection.set(
      Math.cos(angle),
      Math.sin(angle),
      0
    )
    this.jitterAmount = 0.5 + Math.random() * 0.5
  }

  // Override update: route through base lifecycle (spawn/flash/death), keep bespoke AI timing
  update(deltaTime: number, player: Player): void {
    // Use parent's lifecycle state machine (handles hit-flash + vector fragment death)
    super.update(deltaTime, player)

    // 🔫 CRITICAL: Always update projectiles, even during death animation! 🔫
    this.updateProjectiles(deltaTime)

    // Only do custom updates when alive
    if (this.state !== EnemyState.ALIVE) return
    if (!this.alive) return

    // Store last position for trail calculation
    this.lastPosition.copy(this.position)

    this.updateAI(deltaTime, player)

    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    this.mesh.position.set(this.position.x, this.position.y, 0)

    // Create trail effects
    this.updateTrails(deltaTime)

    // Update visual effects
    this.updateVisuals(deltaTime)
  }

  updateAI(deltaTime: number, player: Player): void {
    // Don't run AI during spawn/death
    if (this.state !== EnemyState.ALIVE) return

    const time = Date.now() * 0.001
    const playerPos = player.getPosition()
    
    // ⚡ ERRATIC MOVEMENT - Change direction frequently! ⚡
    this.erraticTimer += deltaTime
    if (this.erraticTimer >= this.erraticInterval) {
      this.erraticTimer = 0
      this.erraticInterval = 0.1 + Math.random() * 0.15 // Vary the interval too!
      
      // 70% chance to jitter randomly, 30% chance to aim at player
      if (Math.random() < 0.7) {
        this.randomizeDirection()
      } else {
        // Briefly aim at player
        this.currentDirection = playerPos.clone().sub(this.position).normalize()
      }
    }
    
    // Add extra jitter on top of current direction
    const jitterX = (Math.random() - 0.5) * this.jitterAmount
    const jitterY = (Math.random() - 0.5) * this.jitterAmount
    
    // Sinusoidal overlay for extra chaos
    const sinOffset = Math.sin(time * 15 + this.phaseOffset) * 0.5
    const cosOffset = Math.cos(time * 12 + this.phaseOffset) * 0.5
    
    this.velocity.set(
      (this.currentDirection.x + jitterX + sinOffset) * this.speed,
      (this.currentDirection.y + jitterY + cosOffset) * this.speed,
      0
    )
    
    // Clamp to world bounds with bounce
    const worldBound = 26
    if (Math.abs(this.position.x) > worldBound) {
      this.currentDirection.x *= -1
      this.position.x = Math.sign(this.position.x) * worldBound
    }
    if (Math.abs(this.position.y) > worldBound) {
      this.currentDirection.y *= -1
      this.position.y = Math.sign(this.position.y) * worldBound
    }
    
    // 🔫 FIRING LOGIC 🔫
    const distanceToPlayer = this.position.distanceTo(playerPos)
    
    if (distanceToPlayer < 15) { // Only fire when somewhat close
      if (this.burstCount > 0) {
        // In burst mode
        this.burstTimer += deltaTime
        if (this.burstTimer >= this.burstDelay) {
          this.fireAtPlayer(player)
          this.burstTimer = 0
          this.burstCount--
        }
      } else {
        // Check for new burst
        this.fireTimer += deltaTime
        if (this.fireTimer >= this.fireRate) {
          this.burstCount = this.maxBurst
          this.burstTimer = 0
          this.fireTimer = 0
        }
      }
    }
  }

  private fireAtPlayer(player: Player): void {
    const playerPos = player.getPosition()
    
    // Add some inaccuracy - fitting for the erratic nature
    const spread = 0.3
    const direction = playerPos.clone().sub(this.position).normalize()
    direction.x += (Math.random() - 0.5) * spread
    direction.y += (Math.random() - 0.5) * spread
    direction.normalize()
    
    // ⚡ FIZZER BULLETS: 40% smaller ⚡
    const stats = BALANCE_CONFIG.FIZZER
    const projectile = new EnemyProjectile(
      this.position.clone(),
      direction,
      stats.BULLET_SPEED,
      stats.BULLET_DAMAGE,
      0.6, // 40% smaller (60% of original size)
      ENTITY_PALETTE.FIZZER
    )
    
    // Connect effects system for trails
    if (this.effectsSystem) {
      projectile.setEffectsSystem(this.effectsSystem)
    }
    
    this.projectiles.push(projectile)
    if (this.sceneManager) {
      this.sceneManager.addToScene(projectile.getMesh())
    }
    
    // Play zap sound
    if (this.audioManager) {
      this.audioManager.playFizzerZapSound()
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      projectile.update(deltaTime)
      
      if (!projectile.isAlive()) {
        if (this.sceneManager) {
          this.sceneManager.removeFromScene(projectile.getMesh())
        }
        projectile.dispose()
        this.projectiles.splice(i, 1)
      }
    }
  }

  // 🔫 CLEAR PROJECTILES FOR TRANSFER (don't destroy - they continue their path!) 🔫
  clearProjectilesForTransfer(): void {
    this.projectiles = []
  }
  
  destroy(): void {
    // DON'T destroy projectiles here - they're transferred to orphaned pool first!
    if (this.projectiles.length > 0) {
      for (const projectile of this.projectiles) {
        if (this.sceneManager) {
          this.sceneManager.removeFromScene(projectile.getMesh())
        }
        projectile.dispose()
      }
      this.projectiles = []
    }

    super.destroy()
  }

  protected updateVisuals(deltaTime: number): void {
    // 🎬 Don't run normal visuals during spawn/death animations! 🎬
    if (this.state !== EnemyState.ALIVE) return

    // ⚡ FAST SPIN - idle animation for the cross ⚡
    this.mesh.rotation.z += deltaTime * 6
  }
}

