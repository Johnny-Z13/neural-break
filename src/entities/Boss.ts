import * as THREE from 'three'
import { Enemy } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { SceneManager } from '../graphics/SceneManager'
import { AudioManager } from '../audio/AudioManager'
import { BALANCE_CONFIG } from '../config'
import { ENTITY_PALETTE } from '../config/palette.config'
import { regularPolygon, outlinePolygon, discSolid } from '../graphics/VectorShapes'

export class Boss extends Enemy {
  private fireTimer: number = 0
  private fireRate: number = BALANCE_CONFIG.BOSS.PHASE_1_FIRE_RATE
  private projectileSpeed: number = BALANCE_CONFIG.BOSS.BULLET_SPEED
  private projectileDamage: number = BALANCE_CONFIG.BOSS.BULLET_DAMAGE
  private projectiles: EnemyProjectile[] = []
  private sceneManager: SceneManager | null = null // Will be set from outside
  private coreMesh!: THREE.Mesh
  private attackPhase: number = 0 // 0 = normal, 1 = rapid fire, 2 = spread
  private phaseTimer: number = 0
  private pulseTimer: number = 0 // Boss-owned visual timer (do NOT use base animTimer - it's driven by spawn/death lifecycle)
  private hitPunchTimer: number = 0 // Counts down from 0.1s after a hit; drives the scale punch

  // 💀 DEATH ANIMATION STATE 💀
  private isDying: boolean = false
  private deathTimer: number = 0
  private deathDuration: number = 3.0 // 3 second epic death sequence

  constructor(x: number, y: number) {
    super(x, y)
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.BOSS
    this.health = stats.HEALTH
    this.maxHealth = stats.HEALTH
    this.speed = stats.SPEED
    this.damage = stats.DAMAGE
    this.xpValue = stats.XP_VALUE
    this.radius = stats.RADIUS
  }

  initialize(): void {
    // 📐 RED HEX FORTRESS - neon vector boss 📐
    const hexPoints = regularPolygon(6, 3.5)
    this.coreMesh = outlinePolygon(hexPoints, 0.15, ENTITY_PALETTE.BOSS)
    const core = discSolid(0.9, ENTITY_PALETTE.BOSS)
    this.coreMesh.add(core) // coreMesh child 0

    // Create container mesh
    const containerGeometry = new THREE.SphereGeometry(0.1, 4, 4)
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)

    // 🔻 SCALE DOWN BY 20% - Make boss smaller! 🔻
    this.mesh.scale.setScalar(0.8)

    this.mesh.add(this.coreMesh)

    this.registerVector(hexPoints, 0.15, ENTITY_PALETTE.BOSS,
      [this.coreMesh.material as THREE.MeshBasicMaterial, core.material as THREE.MeshBasicMaterial])

    // 💥 Death damage properties 💥
    this.deathDamageRadius = 8.0 // MASSIVE explosion radius
    this.deathDamageAmount = 80 // Devastating damage
  }
  updateAI(deltaTime: number, player: Player): void {
    // If dying, don't move - just play death animation
    if (this.isDying) {
      this.updateDeathAnimation(deltaTime)
      return
    }
    
    // Slow, menacing approach toward player
    const playerPos = player.getPosition()
    const direction = playerPos.sub(this.position).normalize()
    
    this.velocity = direction.multiplyScalar(this.speed)
    
    // Update firing
    this.fireTimer += deltaTime
    this.phaseTimer += deltaTime
    
    // Change attack phase logic
    const phaseDuration = this.attackPhase === 3 ? 2.0 : 4.0 // 2 seconds for pause, 4 for others
    
    if (this.phaseTimer >= phaseDuration) {
      this.attackPhase = (this.attackPhase + 1) % 4 // 0=normal, 1=rapid, 2=spread, 3=pause
      this.phaseTimer = 0
      
      // 🔥 Play phase change sound! 🔥
      if (this.audioManager) {
        this.audioManager.playBossPhaseChangeSound()
      }
      
      if (this.attackPhase === 3 && this.effectsSystem) {
        // Visual indicator for pause start
        this.effectsSystem.addDistortionWave(this.position, 2.0)
      }
    }
    
    // Fire based on phase (skip firing in phase 3)
    if (this.attackPhase !== 3 && this.fireTimer >= this.fireRate) {
      this.fireAtPlayer(player)
      this.fireTimer = 0
    }
  }
  
  // 💀 EPIC DREADNOUGHT DEATH ANIMATION 💀
  protected override updateDeathAnimation(deltaTime: number): void {
    this.deathTimer += deltaTime
    const progress = this.deathTimer / this.deathDuration
    
    // Phase 1: Critical damage - systems failing (0-25%)
    if (progress < 0.25) {
      const shake = (0.25 - progress) * 3
      this.mesh.position.x = this.position.x + (Math.random() - 0.5) * shake
      this.mesh.position.y = this.position.y + (Math.random() - 0.5) * shake

      // Flash between red and orange
      const flashPhase = (Date.now() * 0.01) % 1
      const flashColor = new THREE.Color().setHSL(0.08 - flashPhase * 0.08, 1.0, 0.4 + flashPhase * 0.2)
      const coreMaterial = this.coreMesh.material as THREE.MeshBasicMaterial
      coreMaterial.color.copy(flashColor)

      // Sparks from multiple points
      if (this.effectsSystem && Math.random() < 0.4) {
        const sparkPos = this.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 2
        ))
        this.effectsSystem.createExplosion(sparkPos, 0.8, flashColor)

        // Electric arcs
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          0
        )
        this.effectsSystem.createSparkle(sparkPos, vel, new THREE.Color(0x00FFFF), 0.5)
      }
    }

    // Phase 2: Hull breaks apart, secondary explosions (25-50%)
    if (progress >= 0.25 && progress < 0.5) {
      const wingProgress = (progress - 0.25) / 0.25

      // Periodic secondary explosions around the hex perimeter
      if (this.effectsSystem && Math.random() < wingProgress * 0.3) {
        const angle = Math.random() * Math.PI * 2
        const worldPos = this.position.clone().add(new THREE.Vector3(
          Math.cos(angle) * 3.5,
          Math.sin(angle) * 3.5,
          0
        ))
        const hue = Math.random()
        const color = new THREE.Color().setHSL(hue, 1.0, 0.6)
        this.effectsSystem.createExplosion(worldPos, 2.5, color)

        // Debris
        for (let j = 0; j < 12; j++) {
          const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 5
          )
          this.effectsSystem.createSparkle(worldPos, vel, color, 1.2)
        }

        if (this.audioManager) {
          this.audioManager.playEnemyDeathSound('Boss')
        }
      }

      // Hull starts breaking apart
      this.coreMesh.rotation.z += deltaTime * 1.5
    }

    // Phase 3: Core meltdown (50-75%)
    if (progress >= 0.5 && progress < 0.75) {
      const meltdownProgress = (progress - 0.5) / 0.25

      // Violent shaking intensifies
      const shake = meltdownProgress * 2
      this.mesh.position.x = this.position.x + Math.sin(Date.now() * 0.03) * shake
      this.mesh.position.y = this.position.y + Math.cos(Date.now() * 0.025) * shake

      // Core goes white hot
      const coreMaterial = this.coreMesh.material as THREE.MeshBasicMaterial
      const hotColor = new THREE.Color().lerpColors(
        new THREE.Color(0xFF0000),
        new THREE.Color(0xFFFFFF),
        meltdownProgress
      )
      coreMaterial.color.copy(hotColor)
      coreMaterial.opacity = 1.0 - meltdownProgress * 0.3

      // Continuous energy discharge
      if (this.effectsSystem && Math.random() < 0.6) {
        const angle = Math.random() * Math.PI * 2
        const distance = 2 + Math.random() * 3
        const dischargePos = this.position.clone().add(new THREE.Vector3(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          (Math.random() - 0.5) * 2
        ))
        this.effectsSystem.createExplosion(dischargePos, 1.5, hotColor)
      }

      // Spin faster
      this.coreMesh.rotation.z += deltaTime * 6

      // Scale pulses
      const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.3
      this.coreMesh.scale.setScalar(pulse)
    }

    // Phase 4: Critical explosion sequence (75-100%)
    if (progress >= 0.75) {
      const explosionProgress = (progress - 0.75) / 0.25

      // Rapid spinning
      this.coreMesh.rotation.z += deltaTime * 15

      // Core shrinks and brightens
      const coreScale = (1 - explosionProgress) * 1.2
      this.coreMesh.scale.setScalar(Math.max(0.2, coreScale))

      // Pure white energy
      const coreMaterial = this.coreMesh.material as THREE.MeshBasicMaterial
      coreMaterial.color.setHex(0xFFFFFF)

      // Energy vortex
      if (this.effectsSystem && Math.random() < 0.7) {
        const vortexAngle = Date.now() * 0.015 + explosionProgress * Math.PI * 4
        const vortexRadius = (1 - explosionProgress) * 4
        const vortexPos = this.position.clone().add(new THREE.Vector3(
          Math.cos(vortexAngle) * vortexRadius,
          Math.sin(vortexAngle) * vortexRadius,
          Math.sin(vortexAngle * 2) * 2
        ))
        const vortexColor = new THREE.Color().setHSL((vortexAngle / (Math.PI * 2)) % 1, 1.0, 0.6)
        this.effectsSystem.createExplosion(vortexPos, 1.2, vortexColor)
      }

      // Multiple explosion bursts
      if (Math.random() < 0.3 && this.effectsSystem) {
        const burstPos = this.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2
        ))
        this.effectsSystem.createExplosion(burstPos, 2.0, new THREE.Color(0xFFFFFF))
      }

      // Fade the hex out as the final visual beat before the cataclysm fires
      coreMaterial.opacity = Math.max(0, 1 - explosionProgress)
      const discMaterial = (this.coreMesh.children[0] as THREE.Mesh)?.material as THREE.MeshBasicMaterial
      if (discMaterial) discMaterial.opacity = Math.max(0, 1 - explosionProgress)
    }

    // FINAL CATACLYSMIC EXPLOSION
    if (progress >= 1.0) {
      this.executeFinalDeath()
      this.alive = false
    }
  }
  
  private executeFinalDeath(): void {
    if (this.effectsSystem) {
      // MASSIVE central supernova explosion (reduced intensity to avoid giant ring)
      this.effectsSystem.createExplosion(this.position, 1.4, new THREE.Color(0xFFFFFF))
      this.effectsSystem.addScreenFlash(0.5, new THREE.Color(0xFFFFFF))
      this.effectsSystem.addDistortionWave(this.position, 2.0)
      
      // Primary shockwave ring
      for (let ring = 0; ring < 3; ring++) {
        setTimeout(() => {
          for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2
            const hue = i / 24
            const color = new THREE.Color().setHSL(hue, 1.0, 0.6)
            const distance = 4 + ring * 2
            const offset = new THREE.Vector3(
              Math.cos(angle) * distance,
              Math.sin(angle) * distance,
              (Math.random() - 0.5) * 3
            )
            
            if (this.effectsSystem) {
              this.effectsSystem.createExplosion(
                this.position.clone().add(offset),
                3.0,
                color
              )
            }
          }
        }, ring * 100)
      }
      
      // Secondary random explosions
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          if (this.effectsSystem) {
            const randOffset = new THREE.Vector3(
              (Math.random() - 0.5) * 12,
              (Math.random() - 0.5) * 12,
              (Math.random() - 0.5) * 4
            )
            const randColor = new THREE.Color().setHSL(Math.random(), 1.0, 0.5)
            this.effectsSystem.createExplosion(
              this.position.clone().add(randOffset),
              2.5,
              randColor
            )
            
            // Debris particles
            for (let j = 0; j < 5; j++) {
              const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 10
              )
              this.effectsSystem.createSparkle(
                this.position.clone().add(randOffset),
                vel,
                randColor,
                1.5
              )
            }
          }
        }, i * 40)
      }
      
      // Final expanding energy wave
      setTimeout(() => {
        if (this.effectsSystem) {
          for (let i = 0; i < 48; i++) {
            const angle = (i / 48) * Math.PI * 2
            const distance = 8
            const offset = new THREE.Vector3(
              Math.cos(angle) * distance,
              Math.sin(angle) * distance,
              0
            )
            const color = new THREE.Color().setHSL((i / 48), 1.0, 0.7)
            this.effectsSystem.createExplosion(
              this.position.clone().add(offset),
              2.0,
              color
            )
          }
        }
      }, 600)
      
      this.effectsSystem.createEnemyDeathParticles(
        this.position,
        'Boss',
        new THREE.Color(0xFF0000)
      )
    }
    
    // Clean up projectiles
    if (this.sceneManager) {
      for (const projectile of this.projectiles) {
        this.sceneManager.removeFromScene(projectile.getMesh())
        projectile.dispose()
      }
    }
    this.projectiles = []
    
    if (this.audioManager) {
      this.audioManager.playEnemyDeathSound('Boss')
    }
  }

  private fireAtPlayer(player: Player): void {
    if (!this.sceneManager) return
    
    // 🔫 Play boss fire sound! 🔫
    if (this.audioManager) {
      this.audioManager.playBossFireSound()
    }
    
    const playerPos = player.getPosition()
    const direction = playerPos.sub(this.position).normalize()
    
    if (this.attackPhase === 0) {
      // Normal fire - 5 bullets in spread (more!)
      for (let i = 0; i < 5; i++) {
        const angleOffset = (i - 2) * 0.15 // Spread
        const cos = Math.cos(angleOffset)
        const sin = Math.sin(angleOffset)
        const bulletDir = new THREE.Vector3(
          direction.x * cos - direction.y * sin,
          direction.x * sin + direction.y * cos,
          0
        ).normalize()
        
        const projectile = new EnemyProjectile(
          this.position.clone().add(bulletDir.clone().multiplyScalar(2.5)), // Fire from edge
          bulletDir,
          this.projectileSpeed,
          this.projectileDamage
        )
        
        // 🔥 MAKE PROJECTILES MORE VISIBLE! 🔥
        this.styleBossProjectile(projectile, 0xFF0000) // Red
        
        if (this.effectsSystem) {
          projectile.setEffectsSystem(this.effectsSystem)
        }
        
        this.projectiles.push(projectile)
        this.sceneManager.addToScene(projectile.getMesh())
      }
    } else if (this.attackPhase === 1) {
      // Rapid fire - 8 bullets in quick succession (more!)
      for (let i = 0; i < 8; i++) {
        const angleOffset = (i - 3.5) * 0.12
        const cos = Math.cos(angleOffset)
        const sin = Math.sin(angleOffset)
        const bulletDir = new THREE.Vector3(
          direction.x * cos - direction.y * sin,
          direction.x * sin + direction.y * cos,
          0
        ).normalize()
        
        const projectile = new EnemyProjectile(
          this.position.clone().add(bulletDir.clone().multiplyScalar(2.5)),
          bulletDir,
          this.projectileSpeed * 1.3,
          this.projectileDamage
        )
        
        // 🔥 ORANGE rapid fire! 🔥
        this.styleBossProjectile(projectile, 0xFF6600)
        
        if (this.effectsSystem) {
          projectile.setEffectsSystem(this.effectsSystem)
        }
        
        this.projectiles.push(projectile)
        this.sceneManager.addToScene(projectile.getMesh())
      }
    } else {
      // Spread fire - 16 bullets in all directions (double!)
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2
        const bulletDir = new THREE.Vector3(
          Math.cos(angle),
          Math.sin(angle),
          0
        )
        
        const projectile = new EnemyProjectile(
          this.position.clone().add(bulletDir.clone().multiplyScalar(2.5)),
          bulletDir,
          this.projectileSpeed * 0.9,
          this.projectileDamage
        )
        
        // 🔥 YELLOW spread fire! 🔥
        this.styleBossProjectile(projectile, 0xFFFF00)
        
        if (this.effectsSystem) {
          projectile.setEffectsSystem(this.effectsSystem)
        }
        
        this.projectiles.push(projectile)
        this.sceneManager.addToScene(projectile.getMesh())
      }
    }
    
    // Audio feedback
    if (this.audioManager) {
      this.audioManager.playFireSound()
    }
  }
  
  // 🔥 STYLE BOSS PROJECTILES - Visible but not overwhelming! 🔥
  private styleBossProjectile(projectile: EnemyProjectile, color: number): void {
    const mesh = projectile.getMesh()
    
    // Scale projectile - smaller for better gameplay balance
    mesh.scale.setScalar(1.2)
    
    // Set main color
    const material = mesh.material as THREE.MeshBasicMaterial
    material.color.setHex(color)
    
    // Update glow
    if (mesh.children[0]) {
      const glowMaterial = (mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
      glowMaterial.color.setHex(color)
      glowMaterial.opacity = 0.6
      // Smaller glow
      mesh.children[0].scale.setScalar(1.2)
    }
    
    // Add trail effect - smaller trail sphere
    const trailGeometry = new THREE.SphereGeometry(0.2, 8, 8)
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    })
    const trail = new THREE.Mesh(trailGeometry, trailMaterial)
    trail.position.z = -0.2
    mesh.add(trail)
  }

  getProjectiles(): EnemyProjectile[] {
    return this.projectiles.filter(p => p.isAlive())
  }

  setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager
  }

  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  update(deltaTime: number, player: Player): void {
    if (!this.alive) return

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      if (projectile.isAlive()) {
        projectile.update(deltaTime)
      } else {
        if (this.sceneManager) {
          this.sceneManager.removeFromScene(projectile.getMesh())
          projectile.dispose()
        }
        this.projectiles.splice(i, 1)
      }
    }

    // Call parent update
    super.update(deltaTime, player)
  }

  protected updateVisuals(deltaTime: number): void {
    // Skip if dying - death animation handles visuals
    if (this.isDying) return

    // NOTE: increments Boss's OWN pulseTimer, never the base animTimer -
    // animTimer is driven by the base spawn/death lifecycle (see Enemy.ts),
    // and writing to it here would desync the spawn animation/invuln window.
    this.pulseTimer += deltaTime

    // 🔷 HEX ROTATION - menacing spin 🔷
    this.coreMesh.rotation.z += deltaTime * 0.3

    // ⏱️ HIT PUNCH DECAY - counts down after takeDamage() triggers it ⏱️
    if (this.hitPunchTimer > 0) {
      this.hitPunchTimer = Math.max(0, this.hitPunchTimer - deltaTime)
    }

    // 🔴 CORE DISC SCALE-PULSE + HIT PUNCH - composed fresh each frame, never cumulative 🔴
    const core = this.coreMesh.children[0] as THREE.Mesh
    if (core) {
      const pulse = 1 + Math.sin(this.pulseTimer * 3) * 0.08
      const punch = 1 + 0.2 * (this.hitPunchTimer / 0.1)
      core.scale.setScalar(pulse * punch)
    }
  }

  // 🔴 OVERRIDE TAKE DAMAGE - Don't set alive=false immediately! 🔴
  // MUST NOT call super.takeDamage(): Boss runs a fully custom death lifecycle
  // (isDying/deathTimer, never enters base DYING state). registerVector() is set,
  // so routing through the base would ALSO fire the generic fragment death — double-death visual.
  takeDamage(damage: number): void {
    this.health -= damage

    // JUICY visual feedback - timer-driven white flash (hex + core disc via
    // registerVector) plus a scale punch, both composed fresh each frame in
    // updateVisuals() - no setTimeout, so rapid hits can't ratchet or stick white.
    this.flashRed()
    this.hitPunchTimer = 0.1

    if (this.health <= 0) {
      this.createDeathEffect()
    }
  }

  protected createDeathEffect(): void {
    // 💀 START EPIC DEATH ANIMATION 💀
    this.isDying = true
    this.deathTimer = 0

    // Keep alive during death animation
    this.alive = true
    
    // 🎵 Play epic Boss death sound! 🎵
    if (this.audioManager) {
      this.audioManager.playEnemyDeathSound('Boss')
    }
  }

  // 🔫 CLEAR PROJECTILES FOR TRANSFER (don't destroy - they continue their path!) 🔫
  clearProjectilesForTransfer(): void {
    this.projectiles = []
  }
  
  /**
   * 🧹 CLEANUP - Remove all projectiles from scene
   */
  destroy(): void {
    // DON'T destroy projectiles here - they're transferred to orphaned pool first!
    if (this.projectiles.length > 0 && this.sceneManager) {
      for (const projectile of this.projectiles) {
        this.sceneManager.removeFromScene(projectile.getMesh())
        projectile.dispose()
      }
      this.projectiles = []
    }
    
    console.log('🧹 Boss cleanup complete')

    super.destroy()
  }
}

