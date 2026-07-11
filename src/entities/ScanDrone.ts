import * as THREE from 'three'
import { Enemy, EnemyState, SpawnConfig, DeathConfig } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'
import { ENTITY_PALETTE } from '../config/palette.config'
import { regularPolygon, outlinePolygon, tracerQuad } from '../graphics/VectorShapes'

export class ScanDrone extends Enemy {
  private alertState: boolean = false
  private patrolTarget: THREE.Vector3
  private patrolRadius: number = BALANCE_CONFIG.SCAN_DRONE.PATROL_RANGE

  private fireTimer: number = 0
  private fireRate: number = BALANCE_CONFIG.SCAN_DRONE.FIRE_RATE
  private sceneManager: SceneManager | null = null // Will be set by EnemyManager
  private projectiles: EnemyProjectile[] = []
  
  // 📡 Scan sound timer
  private scanSoundTimer: number = 0
  private scanSoundInterval: number = 2.0
  
  // 🔷 MOVEMENT VARIATION - Prevent perfect alignment 🔷
  private movementOffset: number = Math.random() * Math.PI * 2 // Random starting phase
  private swayAmount: number = 0.2 // Amount of perpendicular sway (less than DataMite)
  private swaySpeed: number = 2.0 // Speed of sway oscillation

  constructor(x: number, y: number) {
    super(x, y)
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.SCAN_DRONE
    this.health = stats.HEALTH
    this.maxHealth = stats.HEALTH
    this.speed = stats.SPEED
    this.damage = stats.DAMAGE
    this.xpValue = stats.XP_VALUE
    this.radius = stats.RADIUS
    this.patrolTarget = new THREE.Vector3(x, y, 0)
    
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
    const hex = regularPolygon(6, 1.3)
    this.mesh = outlinePolygon(hex, 0.09, ENTITY_PALETTE.SCAN_DRONE)
    this.mesh.position.copy(this.position)
    const sweep = tracerQuad(0.06, 1.3, ENTITY_PALETTE.SCAN_DRONE)
    sweep.geometry.translate(0, 0.65, 0) // pivot at hex center
    this.mesh.add(sweep) // child 0
    this.registerVector(hex, 0.09, ENTITY_PALETTE.SCAN_DRONE,
      [this.mesh.material as THREE.MeshBasicMaterial, sweep.material as THREE.MeshBasicMaterial])
  }
  
  // 🎬 SPAWN CONFIGURATION 🎬
  protected getSpawnConfig(): SpawnConfig {
    return {
      duration: 0.25,
      invulnerable: true,
      particles: {
        count: 12,
        colors: [0xFF6600, 0x00FFFF], // Alternate orange and cyan
        speed: 3,
        burstAtStart: true
      },
      screenFlash: {
        intensity: 0.05,
        color: 0xFF8800
      }
    }
  }
  
  // 🎬 DEATH CONFIGURATION 🎬
  protected getDeathConfig(): DeathConfig {
    return { duration: 0.4 }
  }

  // 🌟 SPAWN ANIMATION HOOK 🌟
  protected onSpawnUpdate(progress: number): void {
    // Elastic scale for punchy appearance
    const elasticProgress = progress < 1
      ? 1 - Math.pow(1 - progress, 3) * Math.cos(progress * Math.PI * 2)
      : 1

    this.mesh.scale.setScalar(Math.max(0.01, elasticProgress))
  }

  // Override update to use parent lifecycle system
  update(deltaTime: number, player: Player): void {
    // Use parent's lifecycle state machine
    super.update(deltaTime, player)

    // 🔫 CRITICAL: Always update projectiles, even during death animation! 🔫
    // This prevents bullets from pausing when the drone is destroyed
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
    
    const playerPos = player.getPosition()
    const distanceToPlayer = this.position.distanceTo(playerPos)

    // Check if player is within scan range (uses DETECTION_RANGE from balance config)
    if (distanceToPlayer < BALANCE_CONFIG.SCAN_DRONE.DETECTION_RANGE) {
      // 🚨 Play alert sound and flip visuals to red when first entering alert state! 🚨
      if (!this.alertState) {
        if (this.audioManager) {
          this.audioManager.playScanDroneAlertSound()
        }
        const hexMaterial = this.mesh.material as THREE.MeshBasicMaterial
        const sweepMaterial = (this.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
        hexMaterial.color.setHex(ENTITY_PALETTE.SCAN_DRONE_ALERT)
        sweepMaterial.color.setHex(ENTITY_PALETTE.SCAN_DRONE_ALERT)
        this.registerVector(this.vectorOutline!, 0.09, ENTITY_PALETTE.SCAN_DRONE_ALERT, [hexMaterial, sweepMaterial])
      }
      this.alertState = true
    }

    if (this.alertState) {
      // Chase player when alerted with slight sway
      const toPlayer = playerPos.clone().sub(this.position)
      const direction = toPlayer.normalize()
      
      // Add perpendicular sway to prevent perfect alignment
      this.movementOffset += deltaTime * this.swaySpeed
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0)
      const sway = Math.sin(this.movementOffset) * this.swayAmount
      
      // Combine forward movement with perpendicular sway
      this.velocity = direction.clone()
        .add(perpendicular.multiplyScalar(sway))
        .normalize()
        .multiplyScalar(this.speed * 2)

      // 🔫 FIRE BULLETS AT PLAYER! 🔫
      this.fireTimer += deltaTime
      if (this.fireTimer >= this.fireRate && this.sceneManager) {
        this.fireAtPlayer(player)
        this.fireTimer = 0
      }
    } else {
      // 📡 Play periodic scan sound while patrolling 📡
      this.scanSoundTimer += deltaTime
      if (this.scanSoundTimer >= this.scanSoundInterval && this.audioManager) {
        this.audioManager.playScanDroneScanSound()
        this.scanSoundTimer = 0
      }
      // Patrol behavior
      const distanceToPatrol = this.position.distanceTo(this.patrolTarget)
      
      if (distanceToPatrol < 0.5) {
        // Choose new patrol target
        this.patrolTarget = new THREE.Vector3(
          this.position.x + (Math.random() - 0.5) * this.patrolRadius * 2,
          this.position.y + (Math.random() - 0.5) * this.patrolRadius * 2,
          0
        )
      }
      
      const toPatrol = this.patrolTarget.clone().sub(this.position)
      const direction = toPatrol.normalize()
      
      // Add slight sway even during patrol
      this.movementOffset += deltaTime * this.swaySpeed * 0.5
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0)
      const sway = Math.sin(this.movementOffset) * this.swayAmount * 0.5
      
      this.velocity = direction.clone()
        .add(perpendicular.multiplyScalar(sway))
        .normalize()
        .multiplyScalar(this.speed)
    }
  }
  
  private fireAtPlayer(player: Player): void {
    const playerPos = player.getPosition()
    const direction = playerPos.clone().sub(this.position).normalize()
    
    const stats = BALANCE_CONFIG.SCAN_DRONE
    // Create projectile - pass Vector3 position, direction, speed, damage
    const projectile = new EnemyProjectile(
      this.position.clone(),
      direction,
      stats.BULLET_SPEED,
      stats.BULLET_DAMAGE,
      1.0,
      ENTITY_PALETTE.SCAN_DRONE
    )
    
    this.projectiles.push(projectile)
    if (this.sceneManager) {
      this.sceneManager.addToScene(projectile.getMesh())
    }
    
    // 🔫 Play fire sound! 🔫
    if (this.audioManager) {
      this.audioManager.playScanDroneFireSound()
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
    // Don't remove from scene - they're being transferred to orphaned pool
    this.projectiles = []
  }
  
  // 🧹 CLEANUP ON DEATH 🧹
  destroy(): void {
    // DON'T destroy projectiles here - they're transferred to orphaned pool first!
    // If projectiles array is not empty, it means transfer wasn't called - destroy them
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

    // ═══ RADAR SWEEP ROTATION - faster when alerted ═══
    const sweep = this.mesh.children[0] as THREE.Mesh
    if (sweep) {
      sweep.rotation.z -= deltaTime * (this.alertState ? 4 : 2)
    }
  }
}

