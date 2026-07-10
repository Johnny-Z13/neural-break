import * as THREE from 'three'
import { Enemy } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'

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
  
  // ✨ VISUAL STATE ✨
  private trailParticles!: THREE.Points
  private trailPositions!: Float32Array
  private trailColors!: Float32Array
  private trailIndex: number = 0
  private maxTrailParticles: number = 30

  // 💀 DEATH ANIMATION STATE 💀
  private isDying: boolean = false
  private deathTimer: number = 0
  private deathDuration: number = 0.8
  private electricBolts: THREE.Line[] = []

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
    // Create invisible container
    const containerGeometry = new THREE.CircleGeometry(0.01, 4)
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)

    // ⚡ MAIN BODY - Tiny glowing orb ⚡
    // OPTIMIZED: Reduced from 16x16 to 10x8 for performance
    const coreGeometry = new THREE.SphereGeometry(0.25, 10, 8)
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    this.mesh.add(core)

    // ⚡ INNER ELECTRIC CORE ⚡
    const innerGeometry = new THREE.IcosahedronGeometry(0.15, 1)
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    })
    const inner = new THREE.Mesh(innerGeometry, innerMaterial)
    this.mesh.add(inner)

    // ⚡ ELECTRIC SPIKES - Random directions ⚡
    for (let i = 0; i < 8; i++) {
      const spikeGeometry = new THREE.ConeGeometry(0.04, 0.2, 4)
      const spikeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      })
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial)
      
      // Random direction
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      spike.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.25,
        Math.sin(phi) * Math.sin(theta) * 0.25,
        Math.cos(phi) * 0.25
      )
      spike.lookAt(spike.position.clone().multiplyScalar(2))
      this.mesh.add(spike)
    }

    // ⚡ ORBITING SPARKS ⚡
    for (let i = 0; i < 4; i++) {
      const sparkGeometry = new THREE.OctahedronGeometry(0.06, 0)
      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00FF00 : 0x00FFFF,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      const spark = new THREE.Mesh(sparkGeometry, sparkMaterial)
      spark.userData.orbitOffset = (i / 4) * Math.PI * 2
      spark.userData.orbitRadius = 0.35
      this.mesh.add(spark)
    }

    // ⚡ GLOWING RING ⚡
    const ringGeometry = new THREE.RingGeometry(0.3, 0.35, 16)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    this.mesh.add(ring)

    // ⚡ TRAIL PARTICLE SYSTEM ⚡
    this.trailPositions = new Float32Array(this.maxTrailParticles * 3)
    this.trailColors = new Float32Array(this.maxTrailParticles * 3)
    
    for (let i = 0; i < this.maxTrailParticles; i++) {
      const i3 = i * 3
      this.trailPositions[i3] = this.position.x
      this.trailPositions[i3 + 1] = this.position.y
      this.trailPositions[i3 + 2] = 0
      this.trailColors[i3] = 0
      this.trailColors[i3 + 1] = 1
      this.trailColors[i3 + 2] = 0.5
    }
    
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3))
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3))
    
    const trailMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
    })
    
    this.trailParticles = new THREE.Points(trailGeometry, trailMaterial)
    this.mesh.add(this.trailParticles)
    
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

  // Override takeDamage to trigger custom death
  takeDamage(damage: number): void {
    if (this.isDying) return
    
    this.health -= damage
    
    // Visual feedback - electric flash
    const core = this.mesh.children[0] as THREE.Mesh
    if (core) {
      const material = core.material as THREE.MeshBasicMaterial
      const originalColor = material.color.clone()
      material.color.setHex(0xFFFFFF)
      setTimeout(() => {
        material.color.copy(originalColor)
      }, 80)
    }

    if (this.health <= 0 && !this.isDying) {
      this.startDeathAnimation()
    }
  }

  private startDeathAnimation(): void {
    this.isDying = true
    this.deathTimer = 0
    this.alive = true
    this.velocity.multiplyScalar(0.3) // Slow down
    
    // 🎵 PLAY DEATH SOUND! 🎵
    if (this.audioManager) {
      this.audioManager.playEnemyDeathSound('Fizzer')
    }
  }

  private updateFizzerDeathAnimation(deltaTime: number): void {
    if (!this.isDying) return
    
    this.deathTimer += deltaTime
    const progress = this.deathTimer / this.deathDuration
    
    // Phase 1: Electric overload buildup (0-0.25s)
    if (progress < 0.25) {
      const phaseProgress = progress / 0.25

      // Increase glow intensity
      const core = this.mesh.children[0] as THREE.Mesh
      if (core) {
        const material = core.material as THREE.MeshBasicMaterial
        material.color.setHSL(0.15, 1.0, 0.5 + phaseProgress * 0.5)
        core.scale.setScalar(1 + phaseProgress * 2)
      }
      
      // Rapid flickering
      this.mesh.visible = Math.random() > 0.3
      
      // Create electric arcs
      if (Math.random() < 0.5) {
        this.createElectricBolt()
      }
    }
    // Phase 2: Violent discharge (0.25-0.4s)
    else if (progress < 0.4) {
      const phaseProgress = (progress - 0.25) / 0.15
      
      // Rapid expansion
      this.mesh.scale.setScalar(1 + phaseProgress * 3)
      
      // Create radial lightning
      if (this.effectsSystem && phaseProgress < 0.3) {
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2
          const distance = 2.0
          const velocity = new THREE.Vector3(
            Math.cos(angle) * distance,
            Math.sin(angle) * distance,
            0
          )
          const yellowColor = new THREE.Color(0xFFFF00)
          this.effectsSystem.createSparkle(
            this.position,
            velocity,
            yellowColor,
            0.4
          )
        }
        
        // Electric screen flash
        this.effectsSystem.addScreenFlash(0.15, new THREE.Color(0xFFFF00))
      }
      
      // More electric bolts
      if (Math.random() < 0.7) {
        this.createElectricBolt()
      }
    }
    // Phase 3: Fragmentation (0.4-0.6s)
    else if (progress < 0.6) {
      const phaseProgress = (progress - 0.4) / 0.2
      
      // Break apart into electric particles
      if (this.effectsSystem && Math.random() < 0.4) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 2
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 1
        )
        const electricColor = new THREE.Color().setHSL(0.15, 1.0, 0.6)
        this.effectsSystem.createSparkle(
          this.position,
          velocity,
          electricColor,
          0.3
        )
      }
      
      // Fade out
      this.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshBasicMaterial
          if (material) {
            material.opacity = 1 - phaseProgress
          }
        }
      })
    }
    // Phase 4: Final electric discharge (0.6-1.0s)
    else {
      // Create electric trails
      if (this.effectsSystem && Math.random() < 0.3) {
        const angle = Math.random() * Math.PI * 2
        const distance = 1.5
        const velocity = new THREE.Vector3(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          0
        )
        const sparkColor = new THREE.Color(0xFFFF00)
        this.effectsSystem.createSparkle(
          this.position,
          velocity,
          sparkColor,
          0.5
        )
      }
      
      if (progress >= 1.0) {
        this.completeDeath()
      }
    }
  }

  private createElectricBolt(): void {
    const angle = Math.random() * Math.PI * 2
    const distance = 0.5 + Math.random() * 1.0
    
    const endPoint = new THREE.Vector3(
      this.position.x + Math.cos(angle) * distance,
      this.position.y + Math.sin(angle) * distance,
      0
    )
    
    const points = [this.position.clone(), endPoint]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    
    const bolt = new THREE.Line(geometry, material)
    if (this.mesh.parent) {
      this.mesh.parent.add(bolt)
    }
    
    this.electricBolts.push(bolt)
    
    setTimeout(() => {
      if (bolt.parent) {
        bolt.parent.remove(bolt)
      }
      this.disposeBolt(bolt)
      const index = this.electricBolts.indexOf(bolt)
      if (index > -1) {
        this.electricBolts.splice(index, 1)
      }
    }, 150)
  }

  // 🧹 Dispose bolt GPU resources - bolts live in the scene, not under this.mesh
  private disposeBolt(bolt: THREE.Line): void {
    bolt.geometry.dispose()
    const material = bolt.material as THREE.Material
    material.dispose()
  }

  private completeDeath(): void {
    // Clean up electric bolts
    this.electricBolts.forEach(bolt => {
      if (bolt.parent) {
        bolt.parent.remove(bolt)
      }
      this.disposeBolt(bolt)
    })
    this.electricBolts = []
    
    // Final VFX
    if (this.effectsSystem) {
      const deathColor = new THREE.Color(0xFFFF00)
      this.effectsSystem.createElectricDeath(this.position)
      this.effectsSystem.createExplosion(this.position, 1.0, deathColor)
    }
    
    this.alive = false
    this.isDying = false
    this.createDeathEffect()
  }

  // Override update to handle death animation
  update(deltaTime: number, player: Player): void {
    // Update projectiles (they get cleaned up on death via destroy())
    this.updateProjectiles(deltaTime)
    
    if (this.isDying) {
      this.updateFizzerDeathAnimation(deltaTime)
      return
    }
    
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
    
    // 🔴 FIZZER BULLETS: 40% smaller, BRIGHT RED with extra glow! 🔴
    const stats = BALANCE_CONFIG.FIZZER
    const projectile = new EnemyProjectile(
      this.position.clone(),
      direction,
      stats.BULLET_SPEED,
      stats.BULLET_DAMAGE,
      0.6, // 40% smaller (60% of original size)
      0xFF0000, // Pure bright red
      0xFF0000, // Bright red emissive
      0.7 // Stronger glow (was 0.4)
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
    
    // Clean up electric bolts
    this.electricBolts.forEach(bolt => {
      if (bolt.parent) {
        bolt.parent.remove(bolt)
      }
      this.disposeBolt(bolt)
    })
    this.electricBolts = []
    
    super.destroy()
  }

  protected updateVisuals(deltaTime: number): void {
    const time = Date.now() * 0.001
    
    // ⚡ RAPID ROTATION ⚡
    this.mesh.rotation.z += deltaTime * 8
    this.mesh.rotation.x = Math.sin(time * 10) * 0.3
    this.mesh.rotation.y = Math.cos(time * 8) * 0.3
    
    // ⚡ SCALE PULSE - Rapid and erratic ⚡
    const pulse = 1 + Math.sin(time * 20) * 0.15 + Math.sin(time * 33) * 0.1
    this.mesh.scale.setScalar(pulse)
    
    // ⚡ UPDATE INNER CORE ⚡
    const inner = this.mesh.children[1] as THREE.Mesh
    if (inner) {
      inner.rotation.x += deltaTime * 15
      inner.rotation.y += deltaTime * 12
      const innerMaterial = inner.material as THREE.MeshBasicMaterial
      innerMaterial.opacity = 0.7 + Math.sin(time * 25) * 0.3
    }
    
    // ⚡ ANIMATE SPIKES ⚡
    for (let i = 2; i < 10; i++) {
      const spike = this.mesh.children[i] as THREE.Mesh
      if (spike && spike.geometry instanceof THREE.ConeGeometry) {
        const spikeMaterial = spike.material as THREE.MeshBasicMaterial
        spikeMaterial.opacity = 0.5 + Math.sin(time * 15 + i) * 0.5
        
        // Extend/retract spikes
        const extension = 1 + Math.sin(time * 20 + i * 0.7) * 0.4
        spike.scale.y = extension
      }
    }
    
    // ⚡ ANIMATE ORBITING SPARKS ⚡
    for (let i = 10; i < 14; i++) {
      const spark = this.mesh.children[i] as THREE.Mesh
      if (spark && spark.userData.orbitOffset !== undefined) {
        const orbitAngle = time * 8 + spark.userData.orbitOffset
        const radius = spark.userData.orbitRadius + Math.sin(time * 15 + i) * 0.1
        spark.position.set(
          Math.cos(orbitAngle) * radius,
          Math.sin(orbitAngle) * radius,
          Math.sin(time * 10 + i) * 0.15
        )
        spark.rotation.z = orbitAngle * 2
      }
    }
    
    // ⚡ ANIMATE RING ⚡
    const ring = this.mesh.children[14] as THREE.Mesh
    if (ring) {
      ring.rotation.x = Math.sin(time * 6) * 0.5
      ring.rotation.y = Math.cos(time * 5) * 0.5
      const ringMaterial = ring.material as THREE.MeshBasicMaterial
      ringMaterial.opacity = 0.4 + Math.sin(time * 12) * 0.3
    }
    
    // ⚡ UPDATE TRAIL ⚡
    const i3 = this.trailIndex * 3
    this.trailPositions[i3] = -this.position.x // Relative to mesh
    this.trailPositions[i3 + 1] = -this.position.y
    this.trailPositions[i3 + 2] = 0
    
    // Fade older particles
    for (let i = 0; i < this.maxTrailParticles; i++) {
      const age = (this.trailIndex - i + this.maxTrailParticles) % this.maxTrailParticles
      const fade = 1 - (age / this.maxTrailParticles)
      const ci = i * 3
      this.trailColors[ci] = fade * 0.2
      this.trailColors[ci + 1] = fade
      this.trailColors[ci + 2] = fade * 0.5
    }
    
    this.trailIndex = (this.trailIndex + 1) % this.maxTrailParticles
    this.trailParticles.geometry.attributes.position.needsUpdate = true
    this.trailParticles.geometry.attributes.color.needsUpdate = true
  }
}

