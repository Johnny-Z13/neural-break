import * as THREE from 'three'
import { Enemy } from './Enemy'
import { Player } from './Player'
import { AudioManager } from '../audio/AudioManager'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { BALANCE_CONFIG } from '../config'
import { ENTITY_PALETTE } from '../config/palette.config'
import { outlinePolygon } from '../graphics/VectorShapes'

/**
 * 🐛 CHAOS WORM - MAGENTA DIAMOND CHAIN 🐛
 * A terrifying 3x sized chaos entity that:
 * - Slithers as a chain of magenta vector diamonds
 * - Needs A LOT of bullets to destroy
 * - Has a spectacular multi-stage death animation
 */
export class ChaosWorm extends Enemy {
  private segments: THREE.Mesh[] = []
  private segmentCount: number = BALANCE_CONFIG.CHAOS_WORM.SEGMENT_COUNT
  private waveOffset: number = 0
  private sceneManager: any = null

  // 💀 DEATH ANIMATION STATE 💀
  private isDying: boolean = false
  private deathTimer: number = 0
  private deathDuration: number = BALANCE_CONFIG.CHAOS_WORM.DEATH_DURATION
  private explodedSegments: Set<number> = new Set()
  private segmentVelocities: THREE.Vector3[] = []

  // 💥 DEATH BULLETS - RUN AWAY! 💥
  private deathProjectiles: EnemyProjectile[] = []
  private static readonly BULLETS_PER_SEGMENT = BALANCE_CONFIG.CHAOS_WORM.BULLETS_PER_SEGMENT
  private static readonly DEATH_BULLET_SPEED = BALANCE_CONFIG.CHAOS_WORM.DEATH_BULLET_SPEED
  private static readonly DEATH_BULLET_DAMAGE = BALANCE_CONFIG.CHAOS_WORM.DEATH_BULLET_DAMAGE

  constructor(x: number, y: number) {
    super(x, y)
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.CHAOS_WORM
    this.health = stats.HEALTH
    this.maxHealth = stats.HEALTH
    this.speed = stats.SPEED
    this.damage = stats.DAMAGE
    this.xpValue = stats.XP_VALUE
    this.radius = stats.RADIUS
    this.trailInterval = 0.1 // Slower trail for performance (parent default is 0.05)
  }
  
  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }
  
  setSceneManager(sceneManager: any): void {
    this.sceneManager = sceneManager
  }
  
  // 💥 GET DEATH PROJECTILES - For collision checking! 💥
  getProjectiles(): EnemyProjectile[] {
    return this.deathProjectiles
  }
  
  // Check if worm is in death animation (still spawning projectiles)
  isDyingAnimation(): boolean {
    return this.isDying
  }

  initialize(): void {
    // Create main body (invisible container)
    const containerGeometry = new THREE.SphereGeometry(0.1, 4, 4)
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)

    // 📐 MAGENTA DIAMOND CHAIN - each segment is one diamond outline 📐
    let headDiamondPoints: THREE.Vector2[] = []
    for (let i = 0; i < this.segmentCount; i++) {
      const s = 0.45 - (i * 0.03) // Compact tapering segments
      const diamondPoints = [
        new THREE.Vector2(0, s),
        new THREE.Vector2(s, 0),
        new THREE.Vector2(0, -s),
        new THREE.Vector2(-s, 0)
      ]
      if (i === 0) headDiamondPoints = diamondPoints

      const segment = outlinePolygon(diamondPoints, 0.06, ENTITY_PALETTE.CHAOS_WORM)

      this.segments.push(segment)
      this.mesh.add(segment)
    }

    this.registerVector(headDiamondPoints, 0.06, ENTITY_PALETTE.CHAOS_WORM,
      this.segments.map(s => s.material as THREE.MeshBasicMaterial))

    // Initialize segment velocities for death animation
    this.segmentVelocities = new Array(this.segmentCount).fill(null).map(() => new THREE.Vector3())
  }

  updateAI(deltaTime: number, player: Player): void {
    // If dying, don't move - just play death animation
    if (this.isDying) {
      this.updateDeathAnimation(deltaTime)
      return
    }
    
    // Serpentine movement toward player
    const playerPos = player.getPosition()
    const direction = playerPos.sub(this.position).normalize()
    
    // Add sinusoidal movement for worm-like motion
    this.waveOffset += deltaTime * 4
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0)
    const waveAmount = Math.sin(this.waveOffset) * 0.75 // Wave motion
    
    this.velocity = direction.multiplyScalar(this.speed)
      .add(perpendicular.multiplyScalar(waveAmount))
  }
  
  // 💀 BESPOKE DEATH ANIMATION 💀
  protected override updateDeathAnimation(deltaTime: number): void {
    this.deathTimer += deltaTime
    const progress = this.deathTimer / this.deathDuration
    
    // Explode segments one by one from tail to head
    const segmentsToExplode = Math.floor(progress * this.segmentCount)
    
    for (let i = this.segmentCount - 1; i >= this.segmentCount - segmentsToExplode; i--) {
      if (i >= 0 && !this.explodedSegments.has(i)) {
        this.explodeSegment(i)
        this.explodedSegments.add(i)
        
        // Play explosion sound for each segment
        if (this.audioManager) {
          this.audioManager.playChaosWormSegmentExplodeSound(i, this.segmentCount)
        }
      }
    }
    
    // 🦴 ANIMATE BREAKING SEGMENTS - diamonds fly off and fade 🦴
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]
      const material = segment.material as THREE.MeshBasicMaterial

      if (this.explodedSegments.has(i)) {
        // Exploded segments fly off
        const velocity = this.segmentVelocities[i]
        segment.position.add(velocity.clone().multiplyScalar(deltaTime))
        segment.rotation.z += deltaTime * 6
      } else {
        // Remaining segments shake violently
        const shake = (progress) * 0.8 + 0.1
        segment.position.x += (Math.random() - 0.5) * shake
        segment.position.y += (Math.random() - 0.5) * shake
      }

      // Fade the whole chain out over the death timeline
      material.opacity = 1 - progress
    }
    
    // 💥 UPDATE DEATH PROJECTILES 💥
    this.updateDeathProjectiles(deltaTime)
    
    // Final explosion when all segments gone
    if (progress >= 1.0) {
      this.finalDeathExplosion()
      this.alive = false
    }
  }
  
  // 💥 UPDATE DEATH PROJECTILES 💥
  private updateDeathProjectiles(deltaTime: number): void {
    for (let i = this.deathProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.deathProjectiles[i]
      projectile.update(deltaTime)
      
      // Remove dead projectiles
      if (!projectile.isAlive()) {
        if (this.sceneManager) {
          this.sceneManager.removeFromScene(projectile.getMesh())
        }
        projectile.dispose()
        this.deathProjectiles.splice(i, 1)
      }
    }
  }
  
  private explodeSegment(index: number): void {
    const segment = this.segments[index]
    if (!segment) return
    
    // Get world position of segment
    const worldPos = new THREE.Vector3()
    segment.getWorldPosition(worldPos)
    
    // Create explosion effect at segment position
    if (this.effectsSystem) {
      const hue = index / this.segmentCount
      const color = new THREE.Color().setHSL(hue, 1.0, 0.6)
      this.effectsSystem.createExplosion(worldPos, 1.5, color)
      
      // Spawn extra particles
      for (let i = 0; i < 8; i++) {
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          0
        )
        this.effectsSystem.createSparkle(worldPos, vel, color, 0.8)
      }
    }
    
    // 💥 SPAWN DEATH BULLETS - GET AWAY FROM THE WORM! 💥
    this.spawnDeathBullets(worldPos, index)
    
    // 🦴 SET BREAK VELOCITY - Segment flies off! 🦴
    const angle = Math.random() * Math.PI * 2
    const speed = 5 + Math.random() * 10
    this.segmentVelocities[index].set(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      (Math.random() - 0.5) * 5
    )
    
    // DO NOT hide the segment immediately, let it fly off in updateDeathAnimation
    // segment.visible = false
  }
  
  // 💥 DEATH BULLETS - Radial spray from each exploding segment! 💥
  private spawnDeathBullets(position: THREE.Vector3, segmentIndex: number): void {
    const bulletsToSpawn = ChaosWorm.BULLETS_PER_SEGMENT
    const baseAngle = (segmentIndex / this.segmentCount) * Math.PI * 2 // Offset based on segment
    
    for (let i = 0; i < bulletsToSpawn; i++) {
      // Spread bullets in a radial pattern with some randomness
      const angle = baseAngle + (i / bulletsToSpawn) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
      const direction = new THREE.Vector3(
        Math.cos(angle),
        Math.sin(angle),
        0
      )
      
      // Vary speed slightly for organic feel
      const speed = ChaosWorm.DEATH_BULLET_SPEED * (0.8 + Math.random() * 0.4)
      
      const projectile = new EnemyProjectile(
        position.clone(),
        direction,
        speed,
        ChaosWorm.DEATH_BULLET_DAMAGE,
        1.0,
        ENTITY_PALETTE.CHAOS_WORM
      )
      
      // Connect effects system for trails
      if (this.effectsSystem) {
        projectile.setEffectsSystem(this.effectsSystem)
      }
      
      this.deathProjectiles.push(projectile)
      
      // Add projectile mesh to scene
      if (this.sceneManager) {
        this.sceneManager.addToScene(projectile.getMesh())
      }
    }
  }
  
  private finalDeathExplosion(): void {
    if (this.effectsSystem) {
      // MASSIVE rainbow explosion
      for (let i = 0; i < 12; i++) {
        const hue = i / 12
        const color = new THREE.Color().setHSL(hue, 1.0, 0.7)
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          0
        )
        this.effectsSystem.createExplosion(
          this.position.clone().add(offset),
          2.0,
          color
        )
      }
      
      // Create shockwave
      this.effectsSystem.addDistortionWave(this.position, 2.0)
      
      // Final death particles
      this.effectsSystem.createEnemyDeathParticles(
        this.position,
        'ChaosWorm',
        new THREE.Color().setHSL(Math.random(), 1.0, 0.6)
      )
    }
    
    // 💥💥💥 FINAL DEATH NOVA - MASSIVE BULLET BURST! 💥💥💥
    this.spawnFinalDeathNova()
    
    // Final sound
    if (this.audioManager) {
      this.audioManager.playChaosWormFinalDeathSound()
    }
  }
  
  // 💥💥💥 DEATH NOVA - Final burst of bullets in all directions! 💥💥💥
  private spawnFinalDeathNova(): void {
    const bulletCount = BALANCE_CONFIG.CHAOS_WORM.FINAL_NOVA_BULLETS
    
    for (let i = 0; i < bulletCount; i++) {
      const angle = (i / bulletCount) * Math.PI * 2
      const direction = new THREE.Vector3(
        Math.cos(angle),
        Math.sin(angle),
        0
      )
      
      // Fast bullets for the final nova!
      const speed = ChaosWorm.DEATH_BULLET_SPEED * 1.5
      
      const projectile = new EnemyProjectile(
        this.position.clone(),
        direction,
        speed,
        ChaosWorm.DEATH_BULLET_DAMAGE * 1.5, // Extra damage for final burst
        1.0,
        ENTITY_PALETTE.CHAOS_WORM
      )
      
      if (this.effectsSystem) {
        projectile.setEffectsSystem(this.effectsSystem)
      }
      
      this.deathProjectiles.push(projectile)
      
      if (this.sceneManager) {
        this.sceneManager.addToScene(projectile.getMesh())
      }
    }
  }

  // 🔴 OVERRIDE TAKE DAMAGE - Base timer flash, don't scale container! 🔴
  takeDamage(damage: number): void {
    this.health -= damage

    // ⚡ VISUAL + AUDIO HIT FEEDBACK - base timer-driven white flash ⚡
    this.flashRed()

    // 🔊 PLAY HIT SOUND!
    if (this.audioManager) {
      this.audioManager.playEnemyHitSound()
    }

    if (this.health <= 0) {
      this.createDeathEffect()
    }
  }

  // Override the default death to trigger custom animation
  protected createDeathEffect(): void {
    // Start the bespoke death animation instead of instant death
    this.isDying = true
    this.deathTimer = 0
    this.explodedSegments.clear()
    
    // Keep alive during death animation
    this.alive = true
    
    // Play death start sound
    if (this.audioManager) {
      this.audioManager.playChaosWormDeathStartSound()
    }
  }

  // 🔫 CLEAR PROJECTILES FOR TRANSFER (don't destroy - they continue their path!) 🔫
  clearProjectilesForTransfer(): void {
    this.deathProjectiles = []
  }
  
  // 🧹 CLEANUP DEATH PROJECTILES WHEN WORM IS REMOVED 🧹
  destroy(): void {
    // DON'T destroy projectiles here - they're transferred to orphaned pool first!
    if (this.deathProjectiles.length > 0) {
      for (const projectile of this.deathProjectiles) {
        if (this.sceneManager) {
          this.sceneManager.removeFromScene(projectile.getMesh())
        }
        projectile.dispose()
      }
      this.deathProjectiles = []
    }
    
    super.destroy()
  }

  protected updateVisuals(deltaTime: number): void {
    void deltaTime // Base timer-driven flash is handled by Enemy.updateFlash()

    // Skip normal visuals if dying
    if (this.isDying) return

    // 🛡️ SAFEGUARD: Ensure container mesh never scales (prevents size growth bug)
    this.mesh.scale.setScalar(1)

    const time = Date.now() * 0.001

    // Update each segment with wave motion - compact spacing
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]
      const offset = i * 0.6
      const wave = Math.sin(time * 3 + offset) * 0.3 // Wave motion

      segment.position.set(
        -i * 0.6 + wave, // Compact spacing
        Math.sin(time * 2 + offset) * 0.2,
        Math.cos(time * 4 + offset) * 0.1
      )

      // Gentle in-plane rotation - keeps the flat diamond outline readable
      segment.rotation.z = time * 1.5 + i * 0.7

      // Scale pulsing - reduced to prevent growing too big
      const scale = 1 + Math.sin(time * 4 + i * 0.5) * 0.1
      segment.scale.setScalar(scale)
    }
  }
}
