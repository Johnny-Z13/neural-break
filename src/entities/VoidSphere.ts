import * as THREE from 'three'
import { Enemy, EnemyState, SpawnConfig, DeathConfig } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'
import { ENTITY_PALETTE } from '../config/palette.config'
import { discSolid, ringOutline, regularPolygon } from '../graphics/VectorShapes'

/**
 * 🌀 VOID SPHERE - MASSIVE COSMIC HORROR 🌀
 * A terrifying 4x sized dark matter entity that:
 * - Needs a LOT of bullets to destroy
 * - Emits void projectiles with cyberpunk sound effects
 * - Black disc with a rotating violet arc
 */
export class VoidSphere extends Enemy {
  private pulseTime: number = 0

  // 🔫 PROJECTILE SYSTEM 🔫
  private sceneManager: SceneManager | null = null
  private projectiles: EnemyProjectile[] = []
  private fireTimer: number = 0
  private fireRate: number = BALANCE_CONFIG.VOID_SPHERE.FIRE_RATE
  private burstCount: number = 0
  private burstTimer: number = 0
  private maxBurst: number = BALANCE_CONFIG.VOID_SPHERE.BURST_COUNT
  private burstDelay: number = BALANCE_CONFIG.VOID_SPHERE.BURST_DELAY

  // 💫 AMBIENT PULSE SOUND TIMER 💫
  private ambientPulseTimer: number = 0
  private ambientPulseInterval: number = 2.0

  // 🎵 SOUND TRACKING 🎵
  private spawnChargeSoundPlayed: boolean = false
  private spawnPulseSoundPlayed: boolean = false

  constructor(x: number, y: number) {
    super(x, y)
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.VOID_SPHERE
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
    this.mesh = discSolid(2.4, 0x000000, 0.98)
    this.mesh.position.copy(this.position)
    const ring = ringOutline(3.2, 0.12, ENTITY_PALETTE.VOID_SPHERE, 0, Math.PI * 1.75) // gapped arc so rotation reads
    this.mesh.add(ring) // child 0
    this.registerVector(regularPolygon(12, 3.2), 0.12, ENTITY_PALETTE.VOID_SPHERE,
      [ring.material as THREE.MeshBasicMaterial])
  }
  
  // 🎬 SPAWN CONFIGURATION 🎬
  protected getSpawnConfig(): SpawnConfig {
    return {
      duration: 1.0,
      invulnerable: true,
      particles: {
        count: 20,
        colors: [0x8800FF, 0xAA00FF],
        speed: 2,
        burstAtStart: false // Custom animation handles particles
      }
    }
  }
  
  // 🎬 DEATH CONFIGURATION 🎬
  protected getDeathConfig(): DeathConfig {
    return {
      duration: 0.6,
      screenFlash: {
        intensity: 0.15,
        color: 0x000000
      }
    }
  }

  // 🌟 SPAWN ANIMATION HOOK 🌟
  protected onSpawnUpdate(progress: number): void {
    // Smooth ease-in-out grow
    const easeProgress = progress * progress * (3 - 2 * progress)
    this.mesh.scale.setScalar(Math.max(0.01, easeProgress))

    // 🎵 PLAY SPAWN SOUND AT START! 🎵
    if (!this.spawnChargeSoundPlayed && this.audioManager) {
      this.spawnChargeSoundPlayed = true
      this.audioManager.playVoidSphereChargeSound() // Dramatic charge sound!
    }

    // 🎵 PLAY PULSE SOUND WHEN FULLY SPAWNED! 🎵
    if (progress >= 0.95 && !this.spawnPulseSoundPlayed && this.audioManager) {
      this.spawnPulseSoundPlayed = true
      this.audioManager.playVoidSpherePulseSound() // Activation sound!
    }
  }

  // Override update to use parent lifecycle system
  update(deltaTime: number, player: Player): void {
    // Use parent's lifecycle state machine
    super.update(deltaTime, player)

    // 🔫 CRITICAL: Always update projectiles, even during death animation! 🔫
    // This prevents bullets from pausing when the void sphere is destroyed
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
    // 🛡️ DON'T MOVE OR ATTACK DURING SPAWN/DEATH! 🛡️
    if (this.state !== EnemyState.ALIVE) {
      this.velocity.set(0, 0, 0)
      return
    }
    
    // Slow, menacing approach
    const playerPos = player.getPosition()
    const direction = playerPos.sub(this.position).normalize()
    
    // Pulsing movement speed
    this.pulseTime += deltaTime
    const speedMultiplier = 1 + Math.sin(this.pulseTime * 2) * 0.5
    
    this.velocity = direction.multiplyScalar(this.speed * speedMultiplier)
    
    // 🔫 FIRE VOID BULLETS! 🔫
    this.updateFiring(deltaTime, player)
    
    // Update existing projectiles
    this.updateProjectiles(deltaTime)
    
    // 💫 AMBIENT PULSE SOUND 💫
    this.ambientPulseTimer += deltaTime
    if (this.ambientPulseTimer >= this.ambientPulseInterval) {
      if (this.audioManager) {
        this.audioManager.playVoidSpherePulseSound()
      }
      this.ambientPulseTimer = 0
    }
  }
  
  private updateFiring(deltaTime: number, player: Player): void {
    if (!this.sceneManager) return
    
    // Handle burst firing
    if (this.burstCount > 0) {
      this.burstTimer += deltaTime
      if (this.burstTimer >= this.burstDelay) {
        this.fireVoidBullet(player)
        this.burstTimer = 0
        this.burstCount--
      }
    } else {
      // Wait for next burst
      this.fireTimer += deltaTime
      if (this.fireTimer >= this.fireRate) {
        this.burstCount = this.maxBurst
        this.burstTimer = 0
        this.fireTimer = 0
        
        // 🎵 PLAY VOID CHARGE SOUND! 🎵
        if (this.audioManager) {
          this.audioManager.playVoidSphereChargeSound()
        }
      }
    }
  }
  
  private fireVoidBullet(player: Player): void {
    const playerPos = player.getPosition()
    
    // Fire from random emission port around the sphere
    const portAngle = Math.random() * Math.PI * 2
    const firePos = this.position.clone().add(new THREE.Vector3(
      Math.cos(portAngle) * 2.5,
      Math.sin(portAngle) * 2.5,
      0
    ))
    
    // Direction towards player with slight spread
    const baseDirection = playerPos.clone().sub(firePos).normalize()
    const spread = 0.15
    const spreadDirection = new THREE.Vector3(
      baseDirection.x + (Math.random() - 0.5) * spread,
      baseDirection.y + (Math.random() - 0.5) * spread,
      0
    ).normalize()
    
    const stats = BALANCE_CONFIG.VOID_SPHERE
    const projectile = new EnemyProjectile(
      firePos,
      spreadDirection,
      stats.BULLET_SPEED,
      stats.BULLET_DAMAGE,
      1.0,
      ENTITY_PALETTE.VOID_SPHERE
    )

    this.projectiles.push(projectile)
    if (this.sceneManager) {
      this.sceneManager.addToScene(projectile.getMesh())
    }

    // 🎵 PLAY VOID FIRE SOUND! 🎵
    if (this.audioManager) {
      this.audioManager.playVoidSphereFireSound()
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

  protected updateVisuals(deltaTime: number): void {
    const child0 = this.mesh.children[0]
    child0.rotation.z += deltaTime * 0.5
  }
  
  // 🔫 CLEAR PROJECTILES FOR TRANSFER (don't destroy - they continue their path!) 🔫
  clearProjectilesForTransfer(): void {
    this.projectiles = []
  }
  
  // Override destroy to cleanup projectiles
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
}
