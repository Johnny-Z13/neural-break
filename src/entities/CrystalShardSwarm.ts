import * as THREE from 'three'
import { Enemy, EnemyState, SpawnConfig } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'
import { ENTITY_PALETTE } from '../config/palette.config'
import { starPolygon, outlinePolygon } from '../graphics/VectorShapes'

/**
 * 💎 CRYSTAL SHARD SWARM - MASSIVE PRISMATIC STORM 💎
 * A terrifying 3x sized crystal entity that:
 * - Fires crystal projectiles at the player
 * - Needs A LOT of bullets to destroy
 */
export class CrystalShardSwarm extends Enemy {
  // 🔫 PROJECTILE SYSTEM 🔫
  private sceneManager: SceneManager | null = null
  private projectiles: EnemyProjectile[] = []
  private fireTimer: number = 0
  private fireRate: number = BALANCE_CONFIG.CRYSTAL_SWARM.FIRE_RATE
  private burstCount: number = 0
  private burstTimer: number = 0
  private maxBurst: number = BALANCE_CONFIG.CRYSTAL_SWARM.BURST_COUNT
  private burstDelay: number = BALANCE_CONFIG.CRYSTAL_SWARM.BURST_DELAY

  // 💎 AMBIENT CRYSTAL HUM 💎
  private humTimer: number = 0
  private humInterval: number = 1.5

  constructor(x: number, y: number) {
    super(x, y)

    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.CRYSTAL_SWARM
    this.health = stats.HEALTH
    this.maxHealth = stats.HEALTH
    this.speed = stats.SPEED
    this.damage = stats.DAMAGE
    this.xpValue = stats.XP_VALUE
    this.radius = stats.RADIUS
    this.trailInterval = 0.1 // Slower trail for performance (parent default is 0.05)

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
    const star = starPolygon(6, 4.6, 2.2)
    this.mesh = outlinePolygon(star, 0.1, ENTITY_PALETTE.CRYSTAL_SWARM)
    this.mesh.position.copy(this.position)
    this.registerVector(star, 0.1, ENTITY_PALETTE.CRYSTAL_SWARM, [this.mesh.material as THREE.MeshBasicMaterial])
  }

  // 🎬 SPAWN CONFIGURATION - Crystal sharding out! (dialed back 60%) 🎬
  protected getSpawnConfig(): SpawnConfig {
    return {
      duration: 1.0, // 1 second spawn animation
      invulnerable: true, // Invulnerable during spawn
      particles: {
        count: 8, // Reduced from 20 (60% less)
        colors: [0x00FFFF, 0xFF00FF, 0xFFFF00, 0x00FF00], // Rainbow prismatic colors
        speed: 2.5, // Reduced from 4
        burstAtStart: true
      },
      screenFlash: {
        intensity: 0.06, // Reduced from 0.15 (60% less)
        color: 0x00FFFF
      }
    }
  }

  // Override update to use parent lifecycle system
  update(deltaTime: number, player: Player): void {
    // Use parent's lifecycle state machine
    super.update(deltaTime, player)

    // 🔫 CRITICAL: Always update projectiles, even during death animation! 🔫
    // This prevents bullets from pausing when the crystal swarm is destroyed
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
    // Erratic movement toward player
    const playerPos = player.getPosition()
    const direction = playerPos.sub(this.position).normalize()
    
    // Add some chaos to movement
    const chaos = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      0
    )
    
    this.velocity = direction.multiplyScalar(this.speed)
      .add(chaos.multiplyScalar(0.4))
    
    // 🔫 FIRE CRYSTAL SHARDS! 🔫
    this.updateFiring(deltaTime, player)
    
    // Update existing projectiles
    this.updateProjectiles(deltaTime)
    
    // 💎 AMBIENT CRYSTAL HUM 💎
    this.humTimer += deltaTime
    if (this.humTimer >= this.humInterval) {
      if (this.audioManager) {
        this.audioManager.playCrystalHumSound()
      }
      this.humTimer = 0
    }
  }
  
  private updateFiring(deltaTime: number, player: Player): void {
    if (!this.sceneManager) return
    
    // Handle burst firing
    if (this.burstCount > 0) {
      this.burstTimer += deltaTime
      if (this.burstTimer >= this.burstDelay) {
        this.fireCrystalShard(player)
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
        
        // 🎵 PLAY CRYSTAL CHARGE SOUND! 🎵
        if (this.audioManager) {
          this.audioManager.playCrystalChargeSound()
        }
      }
    }
  }
  
  private fireCrystalShard(player: Player): void {
    const playerPos = player.getPosition()

    // Fire from a random point around the swarm (shards removed with the vector rework)
    const portAngle = Math.random() * Math.PI * 2
    const worldPos = this.position.clone().add(new THREE.Vector3(
      Math.cos(portAngle) * 3.0,
      Math.sin(portAngle) * 3.0,
      0
    ))

    // Direction towards player
    const direction = playerPos.clone().sub(worldPos).normalize()
    
    const stats = BALANCE_CONFIG.CRYSTAL_SWARM
    const projectile = new EnemyProjectile(
      worldPos,
      direction,
      stats.BULLET_SPEED,
      stats.BULLET_DAMAGE,
      1.0,
      ENTITY_PALETTE.CRYSTAL_SWARM
    )

    this.projectiles.push(projectile)
    if (this.sceneManager) {
      this.sceneManager.addToScene(projectile.getMesh())
    }

    // 🎵 PLAY CRYSTAL FIRE SOUND! 🎵
    if (this.audioManager) {
      this.audioManager.playCrystalFireSound()
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
    this.mesh.rotation.z += deltaTime * 0.4
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
