import * as THREE from 'three'
import { Enemy, EnemyState, SpawnConfig } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'

/**
 * 💎 CRYSTAL SHARD SWARM - MASSIVE PRISMATIC STORM 💎
 * A terrifying 3x sized crystal entity that:
 * - Orbits with deadly razor-sharp shards
 * - Fires crystal projectiles at the player
 * - Creates mesmerizing lightning effects
 * - Needs A LOT of bullets to destroy
 */
export class CrystalShardSwarm extends Enemy {
  private shards: THREE.Mesh[] = []
  private shardCount: number = BALANCE_CONFIG.CRYSTAL_SWARM.SHARD_COUNT
  private orbitRadius: number = 4.0 // Compact orbit
  private orbitSpeed: number = 0
  private lightningEffects: THREE.Line[] = []
  
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
  
  // 🔴 HIT FLASH STATE 🔴
  private isFlashing: boolean = false
  private flashTimer: number = 0
  private flashDuration: number = 0.15 // 150ms flash
  private originalShardColors: THREE.Color[] = []
  
  // 💀 DEATH ANIMATION STATE 💀
  private isDying: boolean = false
  private deathTimer: number = 0
  private deathDuration: number = 1.0
  private shardVelocities: THREE.Vector3[] = []
  private shardRotations: THREE.Vector3[] = []
  private prismFragments: THREE.Mesh[] = []

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
    this.orbitSpeed = stats.ORBIT_SPEED
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
    // Create invisible center
    const centerGeometry = new THREE.SphereGeometry(0.3, 8, 8)
    const centerMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00FFFF,
      transparent: true, 
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    })
    this.mesh = new THREE.Mesh(centerGeometry, centerMaterial)
    this.mesh.position.copy(this.position)
    
    // 💎 CRYSTAL CORE - Pulsing center 💎
    const coreGeometry = new THREE.OctahedronGeometry(0.8, 2)
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    this.mesh.add(core)
    
    // Core wireframe
    const coreWireGeometry = new THREE.OctahedronGeometry(0.85, 2)
    const coreWireMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const coreWire = new THREE.Mesh(coreWireGeometry, coreWireMaterial)
    this.mesh.add(coreWire)

    // 🎮 ASTEROIDS-STYLE CRYSTAL SHARDS 🎮
    for (let i = 0; i < this.shardCount; i++) {
      // Sharp crystal geometry - compact
      const shardGeometry = new THREE.ConeGeometry(0.3, 1.8, 6)
      
      // Prismatic colors
      const hue = (i / this.shardCount + Math.random() * 0.1) % 1
      const color = new THREE.Color().setHSL(hue, 1.0, 0.7)
      
      const shardMaterial = new THREE.MeshLambertMaterial({
        color: color,
        emissive: color.clone().multiplyScalar(0.5),
        transparent: true,
        opacity: 0.9
      })

      const shard = new THREE.Mesh(shardGeometry, shardMaterial)
      
      // 🌟 WIREFRAME OUTLINE - Classic vector style! 🌟
      const wireframeGeometry = new THREE.ConeGeometry(0.32, 1.85, 6)
      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      })
      const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial)
      shard.add(wireframe)
      
      // 💫 ENERGY AURA - Glowing tip! 💫
      const tipGeometry = new THREE.SphereGeometry(0.24, 8, 8)
      const tipMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      const tip = new THREE.Mesh(tipGeometry, tipMaterial)
      tip.position.y = 0.9
      shard.add(tip)
      
      // ⚡ INNER CRYSTAL GLOW ⚡
      const innerGeometry = new THREE.ConeGeometry(0.15, 1.2, 6)
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      })
      const inner = new THREE.Mesh(innerGeometry, innerMaterial)
      shard.add(inner)
      
      // Position in orbit
      const angle = (i / this.shardCount) * Math.PI * 2
      shard.position.set(
        Math.cos(angle) * this.orbitRadius,
        Math.sin(angle) * this.orbitRadius,
        0
      )
      
      // Point outward
      shard.rotation.z = angle + Math.PI / 2
      
      this.shards.push(shard)
      this.mesh.add(shard)
    }

    // Create MASSIVE lightning effects between shards
    for (let i = 0; i < this.shardCount; i++) {
      const points: THREE.Vector3[] = []
      const nextIndex = (i + 1) % this.shardCount
      
      // Create jagged lightning path
      const start = this.shards[i].position.clone()
      const end = this.shards[nextIndex].position.clone()
      
      points.push(start)
      
      // Add more random points for longer lightning
      for (let j = 1; j < 6; j++) { // More segments
        const t = j / 6
        const midPoint = start.clone().lerp(end, t)
        midPoint.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.6
        ))
        points.push(midPoint)
      }
      
      points.push(end)
      
      const lightningGeometry = new THREE.BufferGeometry().setFromPoints(points)
      const lightningMaterial = new THREE.LineBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
      })
      
      const lightning = new THREE.Line(lightningGeometry, lightningMaterial)
      this.lightningEffects.push(lightning)
      this.mesh.add(lightning)
    }
    
    // 🔮 OUTER ENERGY RINGS 🔮
    // OPTIMIZED: Reduced segments from 32 to 16
    for (let i = 0; i < 3; i++) {
      const ringRadius = this.orbitRadius + 0.5 + i * 0.4
      const ringGeometry = new THREE.RingGeometry(ringRadius - 0.1, ringRadius, 16)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.5 + i * 0.1, 1.0, 0.7),
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      this.mesh.add(ring)
    }
    
    // 🌟 START INVISIBLE FOR SPAWN ANIMATION 🌟
    this.mesh.scale.setScalar(0.01)
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        const material = child.material as THREE.Material
        if ('opacity' in material && material.transparent) {
          material.opacity = 0
        }
      }
    })
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
  
  // 🌟 SPAWN ANIMATION - Shards materialize from center with glow! 🌟
  protected onSpawnUpdate(progress: number): void {
    // Phase 1: Core materializes (0-0.3s)
    if (progress < 0.3) {
      const phaseProgress = progress / 0.3
      
      // Core fades in and scales up
      const core = this.mesh.children[0] as THREE.Mesh
      if (core) {
        const coreMaterial = core.material as THREE.MeshBasicMaterial
        coreMaterial.opacity = phaseProgress * 0.6
        core.scale.setScalar(phaseProgress)
      }
      
      // Core wireframe appears
      const coreWire = this.mesh.children[1] as THREE.Mesh
      if (coreWire) {
        const coreWireMaterial = coreWire.material as THREE.MeshBasicMaterial
        coreWireMaterial.opacity = phaseProgress * 0.9
        coreWire.scale.setScalar(phaseProgress)
      }
      
      // Container mesh scales
      this.mesh.scale.setScalar(phaseProgress * 0.3)
    }
    // Phase 2: Shards materialize outward (0.3-0.7s)
    else if (progress < 0.7) {
      const phaseProgress = (progress - 0.3) / 0.4
      
      // Shards fly out from center with glow
      for (let i = 0; i < this.shards.length; i++) {
        const shard = this.shards[i]
        const angle = (i / this.shardCount) * Math.PI * 2
        const currentRadius = this.orbitRadius * phaseProgress
        
        // Shard position expands outward
        shard.position.set(
          Math.cos(angle) * currentRadius,
          Math.sin(angle) * currentRadius,
          0
        )
        
        // Shard rotates into position
        shard.rotation.z = angle + Math.PI / 2
        shard.rotation.x = (1 - phaseProgress) * Math.PI * 2
        
        // Shard fades in with glow
        const material = shard.material as THREE.MeshLambertMaterial
        material.opacity = phaseProgress * 0.9
        material.emissive.multiplyScalar(2.0) // Extra bright during spawn!
        
        // Shard scales in with bounce
        const bounceScale = phaseProgress + Math.sin(phaseProgress * Math.PI) * 0.2
        shard.scale.setScalar(bounceScale)
        
        // Animate shard children (wireframe, tip, inner glow)
        shard.traverse((child) => {
          if (child !== shard && child instanceof THREE.Mesh) {
            const childMaterial = child.material as THREE.Material
            if ('opacity' in childMaterial) {
              childMaterial.opacity = phaseProgress * (child === shard.children[1] ? 0.9 : 0.7)
            }
          }
        })
        
        // Create sparkle trail as shards fly out
        if (this.effectsSystem && Math.random() < 0.1) {
          const hue = i / this.shardCount
          const color = new THREE.Color().setHSL(hue, 1.0, 0.7)
          const worldPos = new THREE.Vector3()
          shard.getWorldPosition(worldPos)
          const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            0
          )
          this.effectsSystem.createSparkle(worldPos, velocity, color, 0.3)
        }
      }
      
      // Container mesh continues scaling
      this.mesh.scale.setScalar(0.3 + phaseProgress * 0.7)
    }
    // Phase 3: Lightning connects, rings appear (0.7-1.0s)
    else {
      const phaseProgress = (progress - 0.7) / 0.3
      
      // Shards reach final positions
      for (let i = 0; i < this.shards.length; i++) {
        const shard = this.shards[i]
        const angle = (i / this.shardCount) * Math.PI * 2
        
        shard.position.set(
          Math.cos(angle) * this.orbitRadius,
          Math.sin(angle) * this.orbitRadius,
          0
        )
        
        const material = shard.material as THREE.MeshLambertMaterial
        material.opacity = 0.9
        
        // Emissive fades from bright to normal
        material.emissive.multiplyScalar(1 - phaseProgress * 0.5)
        
        shard.scale.setScalar(1)
      }
      
      // Lightning effects fade in
      for (let i = 0; i < this.lightningEffects.length; i++) {
        const lightning = this.lightningEffects[i]
        const lightningMaterial = lightning.material as THREE.LineBasicMaterial
        lightningMaterial.opacity = phaseProgress * 0.8
      }
      
      // Outer rings fade in
      const ringStartIndex = this.shardCount + this.lightningEffects.length + 2
      for (let i = 0; i < 3; i++) {
        const ring = this.mesh.children[ringStartIndex + i] as THREE.Mesh
        if (ring) {
          const ringMaterial = ring.material as THREE.MeshBasicMaterial
          ringMaterial.opacity = phaseProgress * 0.3
          ring.scale.setScalar(0.5 + phaseProgress * 0.5) // Rings expand
        }
      }
      
      // Final container scale
      this.mesh.scale.setScalar(1.0)
    }
  }

  // Override takeDamage to trigger custom death
  takeDamage(damage: number): void {
    if (this.isDying) return
    
    this.health -= damage
    
    // Visual feedback - flash all shards
    this.isFlashing = true
    this.flashTimer = 0
    
    if (this.health <= 0 && !this.isDying) {
      this.startDeathAnimation()
    }
  }

  private startDeathAnimation(): void {
    this.isDying = true
    this.deathTimer = 0
    this.alive = true
    
    // Initialize velocities for each shard
    this.shardVelocities = []
    this.shardRotations = []
    
    for (let i = 0; i < this.shards.length; i++) {
      const angle = (i / this.shards.length) * Math.PI * 2
      const speed = 1.5 + Math.random() * 2.0
      this.shardVelocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 1.5
        )
      )
      this.shardRotations.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        )
      )
    }
    
    // 🎵 PLAY DEATH SOUND! 🎵
    if (this.audioManager) {
      this.audioManager.playEnemyDeathSound('CrystalShardSwarm')
    }
  }

  private updateCrystalSwarmDeathAnimation(deltaTime: number): void {
    if (!this.isDying) return
    
    this.deathTimer += deltaTime
    const progress = this.deathTimer / this.deathDuration

    // Phase 1: Shards fly outward, rainbow colors (0-0.3s)
    if (progress < 0.3) {
      const phaseProgress = progress / 0.3
      
      this.shards.forEach((shard, i) => {
        if (!this.shardVelocities[i]) return
        
        // Move shard outward
        const velocity = this.shardVelocities[i]
        shard.position.add(velocity.clone().multiplyScalar(deltaTime))
        
        // Rotate wildly
        const rotation = this.shardRotations[i]
        shard.rotation.x += rotation.x * deltaTime
        shard.rotation.y += rotation.y * deltaTime
        shard.rotation.z += rotation.z * deltaTime
        
        // Cycle through rainbow colors
        const material = shard.material as THREE.MeshBasicMaterial
        const hue = (i / this.shards.length + phaseProgress * 2) % 1.0
        material.color.setHSL(hue, 1.0, 0.6)
      })
      
      // Lightning between shards
      if (Math.random() < 0.3 && this.effectsSystem) {
        const shard1 = this.shards[Math.floor(Math.random() * this.shards.length)]
        const shard2 = this.shards[Math.floor(Math.random() * this.shards.length)]
        if (shard1 && shard2) {
          this.createLightningBetween(shard1.position, shard2.position)
        }
      }
    }
    // Phase 2: Shards shatter into prisms (0.3-0.5s)
    else if (progress < 0.5) {
      const phaseProgress = (progress - 0.3) / 0.2
      
      // Create prism fragments from each shard
      if (phaseProgress < 0.1 && this.prismFragments.length === 0) {
        this.shards.forEach((shard) => {
          // Create 3 smaller prisms per shard
          for (let j = 0; j < 3; j++) {
            const fragmentGeometry = new THREE.ConeGeometry(0.1, 0.3, 3)
            const material = Array.isArray(shard.material) 
              ? (shard.material[0] as THREE.MeshBasicMaterial).clone()
              : (shard.material as THREE.MeshBasicMaterial).clone()
            const fragment = new THREE.Mesh(fragmentGeometry, material)
            
            fragment.position.copy(shard.position)
            const angle = (j / 3) * Math.PI * 2
            const speed = 2 + Math.random()
            const velocity = new THREE.Vector3(
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              (Math.random() - 0.5) * 2
            )
            
            // Store velocity in userData
            fragment.userData.velocity = velocity
            fragment.userData.rotation = new THREE.Vector3(
              (Math.random() - 0.5) * 15,
              (Math.random() - 0.5) * 15,
              (Math.random() - 0.5) * 15
            )
            
            if (this.mesh.parent) {
              this.mesh.parent.add(fragment)
            }
            this.prismFragments.push(fragment)
          }
          
          // Hide original shard
          shard.visible = false
        })
      }
      
      // Animate prism fragments
      this.prismFragments.forEach(fragment => {
        const velocity = fragment.userData.velocity as THREE.Vector3
        const rotation = fragment.userData.rotation as THREE.Vector3
        
        fragment.position.add(velocity.clone().multiplyScalar(deltaTime))
        fragment.rotation.x += rotation.x * deltaTime
        fragment.rotation.y += rotation.y * deltaTime
        fragment.rotation.z += rotation.z * deltaTime
        
        // Fade out
        const material = fragment.material as THREE.MeshBasicMaterial
        material.opacity = 1 - phaseProgress
      })
    }
    // Phase 3: Rainbow explosion (0.5-0.7s)
    else if (progress < 0.7) {
      const phaseProgress = (progress - 0.5) / 0.2
      
      // Create rainbow particle burst
      if (this.effectsSystem && phaseProgress < 0.2) {
        for (let i = 0; i < 30; i++) {
          const angle = (i / 30) * Math.PI * 2
          const speed = 3 + Math.random() * 2
          const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            (Math.random() - 0.5) * 2
          )
          const hue = i / 30
          const rainbowColor = new THREE.Color().setHSL(hue, 1.0, 0.6)
          this.effectsSystem.createSparkle(
            this.position,
            velocity,
            rainbowColor,
            0.5
          )
        }
        
        // Rainbow screen flash
        this.effectsSystem.addScreenFlash(0.2, new THREE.Color().setHSL(0.5, 1.0, 0.7))
      }
      
      // Fade prism fragments
      this.prismFragments.forEach(fragment => {
        const material = fragment.material as THREE.MeshBasicMaterial
        material.opacity = Math.max(0, 1 - phaseProgress * 2)
      })
    }
    // Phase 4: Prismatic distortion waves (0.7-1.0s)
    else {
      const phaseProgress = (progress - 0.7) / 0.3
      
      // Create expanding rainbow distortion
      if (this.effectsSystem && Math.random() < 0.4) {
        this.effectsSystem.addDistortionWave(
          this.position,
          1.5 + phaseProgress * 2.0
        )
      }
      
      if (progress >= 1.0) {
        this.completeDeath()
      }
    }
  }

  private createLightningBetween(pos1: THREE.Vector3, pos2: THREE.Vector3): void {
    const points = [pos1.clone(), pos2.clone()]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(Math.random(), 1.0, 0.7),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    
    const lightning = new THREE.Line(geometry, material)
    if (this.mesh.parent) {
      this.mesh.parent.add(lightning)
    }
    
    setTimeout(() => {
      if (lightning.parent) {
        lightning.parent.remove(lightning)
      }
    }, 100)
  }

  private completeDeath(): void {
    // Clean up prism fragments
    this.prismFragments.forEach(fragment => {
      if (fragment.parent) {
        fragment.parent.remove(fragment)
      }
    })
    this.prismFragments = []
    
    // Final VFX
    if (this.effectsSystem) {
      const deathColor = new THREE.Color().setHSL(0.7, 1.0, 0.6)
      this.effectsSystem.createExplosion(this.position, 2.0, deathColor)
      this.effectsSystem.addDistortionWave(this.position, 2.0)
    }
    
    this.alive = false
    this.isDying = false
    this.createDeathEffect()
  }

  // Override update to use parent lifecycle system
  update(deltaTime: number, player: Player): void {
    // Use parent's lifecycle state machine
    super.update(deltaTime, player)

    // 🔫 CRITICAL: Always update projectiles, even during death animation! 🔫
    // This prevents bullets from pausing when the crystal swarm is destroyed
    this.updateProjectiles(deltaTime)

    // Custom death animation system (legacy - kept for dramatic effect)
    if (this.isDying) {
      this.updateCrystalSwarmDeathAnimation(deltaTime)
      return
    }

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
    
    // Fire from a random shard
    const shardIndex = Math.floor(Math.random() * this.shards.length)
    const shard = this.shards[shardIndex]
    const worldPos = new THREE.Vector3()
    shard.getWorldPosition(worldPos)
    
    // Direction towards player
    const direction = playerPos.clone().sub(worldPos).normalize()
    
    const stats = BALANCE_CONFIG.CRYSTAL_SWARM
    const projectile = new EnemyProjectile(
      worldPos,
      direction,
      stats.BULLET_SPEED,
      stats.BULLET_DAMAGE
    )
    
    // Set custom color for crystal projectiles - cyan/prismatic
    const mesh = projectile.getMesh()
    const material = mesh.material as THREE.MeshBasicMaterial
    const hue = Math.random() * 0.3 + 0.45 // Cyan to green range
    material.color.setHSL(hue, 1.0, 0.6)
    
    // Update glow color too
    if (mesh.children[0]) {
      const glowMaterial = (mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
      glowMaterial.color.setHSL(hue, 1.0, 0.8)
    }
    
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
    // 🎬 Don't run normal visuals during spawn/death animations! 🎬
    if (this.state !== EnemyState.ALIVE) return
    
    const time = Date.now() * 0.001
    
    // 🛡️ SAFEGUARD: Ensure container mesh never scales (prevents size growth bug)
    this.mesh.scale.setScalar(1)
    
    // 🔴 Handle hit flash 🔴
    if (this.isFlashing) {
      this.flashTimer += deltaTime
      if (this.flashTimer >= this.flashDuration) {
        // Restore original colors
        this.isFlashing = false
        for (let i = 0; i < this.shards.length; i++) {
          const shard = this.shards[i]
          const material = shard.material as THREE.MeshLambertMaterial
          if (this.originalShardColors[i]) {
            material.color.copy(this.originalShardColors[i])
            material.emissive.copy(this.originalShardColors[i]).multiplyScalar(0.5)
          }
        }
        
        // Restore core color
        const core = this.mesh.children[0] as THREE.Mesh
        if (core) {
          const coreMaterial = core.material as THREE.MeshBasicMaterial
          coreMaterial.color.setHex(0x00FFFF)
        }
        
        // Restore lightning color (will be updated by animation anyway)
        for (const lightning of this.lightningEffects) {
          const lightningMaterial = lightning.material as THREE.LineBasicMaterial
          lightningMaterial.color.setHex(0x00FFFF)
        }
      }
    }

    // Orbit shards around center
    for (let i = 0; i < this.shards.length; i++) {
      const shard = this.shards[i]
      const baseAngle = (i / this.shardCount) * Math.PI * 2
      const angle = baseAngle + time * this.orbitSpeed
      
      // Varying orbit radius for more chaos - small variation
      const radius = this.orbitRadius + Math.sin(time * 3 + i) * 0.5
      
      shard.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.sin(time * 4 + i * 0.5) * 0.3
      )
      
      // Point outward and spin
      shard.rotation.z = angle + Math.PI / 2 + time * 4
      shard.rotation.x = time * 2.5 + i
      
      // Color shifting (skip if flashing red)
      if (!this.isFlashing) {
        const material = shard.material as THREE.MeshLambertMaterial
        const hue = (time * 0.25 + i * 0.08) % 1
        const color = new THREE.Color().setHSL(hue, 1.0, 0.7)
        material.color.copy(color)
        material.emissive.copy(color).multiplyScalar(0.5)
      }
      
      // Scale pulsing - minimal to prevent growth
      const scale = 1 + Math.sin(time * 6 + i) * 0.1
      shard.scale.setScalar(scale)
    }

    // 🌈 UPDATE MASSIVE LIGHTNING EFFECTS 🌈
    for (let i = 0; i < this.lightningEffects.length; i++) {
      const lightning = this.lightningEffects[i]
      const material = lightning.material as THREE.LineBasicMaterial
      
      // Update lightning path to connect shards
      const nextIndex = (i + 1) % this.shardCount
      const start = this.shards[i].position.clone()
      const end = this.shards[nextIndex].position.clone()
      
      const points: THREE.Vector3[] = [start]
      for (let j = 1; j < 6; j++) {
        const t = j / 6
        const midPoint = start.clone().lerp(end, t)
        midPoint.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.6
        ))
        points.push(midPoint)
      }
      points.push(end)
      
      lightning.geometry.setFromPoints(points)
      
      // 💫 FLICKERING LIGHTNING - More intense! 💫
      material.opacity = 0.5 + Math.sin(time * 25 + i * 2) * 0.5
      
      // 🌈 COLOR SHIFTING - Rainbow effect! (skip if flashing red) 🌈
      if (!this.isFlashing) {
        const hue = (time * 0.6 + i * 0.08) % 1
        material.color.setHSL(hue, 1.0, 0.7)
      }
    }
    
    // ✨ ANIMATE SHARD DETAILS ✨
    for (let i = 0; i < this.shards.length; i++) {
      const shard = this.shards[i]
      
      // Wireframe
      const wireframe = shard.children[0] as THREE.Mesh
      if (wireframe) {
        wireframe.rotation.copy(shard.rotation)
        const wireframeMaterial = wireframe.material as THREE.MeshBasicMaterial
        wireframeMaterial.opacity = 0.7 + Math.sin(time * 12 + i) * 0.3
      }
      
      // 💫 ANIMATE ENERGY TIPS 💫
      const tip = shard.children[1] as THREE.Mesh
      if (tip) {
        const tipMaterial = tip.material as THREE.MeshBasicMaterial
        tipMaterial.opacity = 0.6 + Math.sin(time * 15 + i) * 0.4
        tip.scale.setScalar(1 + Math.sin(time * 10 + i) * 0.15)
      }
      
      // Inner glow
      const inner = shard.children[2] as THREE.Mesh
      if (inner) {
        const innerMaterial = inner.material as THREE.MeshBasicMaterial
        innerMaterial.opacity = 0.3 + Math.sin(time * 20 + i) * 0.2
      }
    }
    
    // Animate core (skip color update if flashing red)
    const core = this.mesh.children[0] as THREE.Mesh
    if (core) {
      core.rotation.x = time * 2
      core.rotation.y = time * 1.5
      const coreMaterial = core.material as THREE.MeshBasicMaterial
      if (!this.isFlashing) {
        coreMaterial.opacity = 0.4 + Math.sin(time * 8) * 0.3
      }
      // Minimal core scaling to prevent growth
      const coreScale = 1 + Math.sin(time * 6) * 0.05
      core.scale.setScalar(coreScale)
    }
    
    // Animate core wireframe
    const coreWire = this.mesh.children[1] as THREE.Mesh
    if (coreWire) {
      coreWire.rotation.x = -time * 2.5
      coreWire.rotation.y = -time * 2
    }
    
    // Animate outer rings
    const ringStartIndex = this.shardCount + this.lightningEffects.length + 2
    for (let i = 0; i < 3; i++) {
      const ring = this.mesh.children[ringStartIndex + i] as THREE.Mesh
      if (ring && ring.geometry instanceof THREE.RingGeometry) {
        ring.rotation.z = time * (0.5 + i * 0.3) * (i % 2 === 0 ? 1 : -1)
        const ringMaterial = ring.material as THREE.MeshBasicMaterial
        ringMaterial.opacity = 0.2 + Math.sin(time * 4 + i) * 0.15
      }
    }

    // NO whole-mesh scaling - prevents size growth bug!
    // Mesh scale locked to 1 at start of updateVisuals
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
