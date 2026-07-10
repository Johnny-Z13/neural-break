import * as THREE from 'three'
import { Enemy, EnemyState, SpawnConfig, DeathConfig } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'

/**
 * 🌀 VOID SPHERE - MASSIVE COSMIC HORROR 🌀
 * A terrifying 4x sized dark matter entity that:
 * - Needs a LOT of bullets to destroy
 * - Emits void projectiles with cyberpunk sound effects
 * - Pulses with ominous energy
 */
export class VoidSphere extends Enemy {
  private voidRings: THREE.Mesh[] = []
  private distortionField!: THREE.Mesh
  private gravityWaves!: THREE.Points
  private waveGeometry!: THREE.BufferGeometry
  private wavePositions!: Float32Array
  private ringCount: number = 7 // More rings for bigger sphere
  private pulseTime: number = 0
  private waveUpdateSkipFrames: number = 0 // Throttle wave updates for performance
  
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
  
  // 💀 DEATH ANIMATION STATE 💀
  private implosionScale: number = 1.0
  private voidRingsCollapsed: boolean[] = []
  
  // 🎵 SOUND TRACKING 🎵
  private spawnChargeSoundPlayed: boolean = false
  private spawnPulseSoundPlayed: boolean = false
  private deathInitialized: boolean = false

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
    // 🌀 CREATE MASSIVE CENTRAL VOID SPHERE - 4X SIZE! 🌀
    // OPTIMIZED: Reduced poly count from 32x32 to 16x12 for performance
    const coreGeometry = new THREE.SphereGeometry(2.4, 16, 12)
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.98
    })
    this.mesh = new THREE.Mesh(coreGeometry, coreMaterial)
    this.mesh.position.copy(this.position)
    
    // 💀 INNER VOID CORE - Pulsing darkness 💀
    // OPTIMIZED: Reduced from 24x24 to 12x8
    const innerCoreGeometry = new THREE.SphereGeometry(1.8, 12, 8)
    const innerCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0x110022,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    const innerCore = new THREE.Mesh(innerCoreGeometry, innerCoreMaterial)
    this.mesh.add(innerCore)

    // 🎮 ASTEROIDS-STYLE SWIRLING VOID RINGS - 4X BIGGER! 🎮
    // OPTIMIZED: Reduced ring segments from 12x48 to 6x24, particles from 8x8 to 4x4
    for (let i = 0; i < this.ringCount; i++) {
      const ringRadius = 3.2 + i * 1.2
      const ringGeometry = new THREE.TorusGeometry(ringRadius, 0.2, 6, 24)
      const ringColor = new THREE.Color().setHSL(0.8 + i * 0.03, 1.0, 0.3 + i * 0.08)
      
      // Main ring
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
      
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.random() * Math.PI
      ring.rotation.y = Math.random() * Math.PI
      ring.rotation.z = Math.random() * Math.PI
      
      // 🌟 WIREFRAME OUTLINE - Vector style! 🌟
      // OPTIMIZED: Reuse ring geometry instead of creating new one
      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: ringColor,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      const wireframe = new THREE.Mesh(ringGeometry, wireframeMaterial)
      wireframe.rotation.copy(ring.rotation)
      ring.add(wireframe)
      
      // 💫 ENERGY PARTICLES - Orbiting around ring! 💫
      // OPTIMIZED: Reduced particles from 12 to 6, geometry from 8x8 to 4x4
      for (let j = 0; j < 6; j++) {
        const particleGeometry = new THREE.SphereGeometry(0.12, 4, 4)
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending
        })
        const particle = new THREE.Mesh(particleGeometry, particleMaterial)
        const angle = (j / 6) * Math.PI * 2
        particle.position.set(
          Math.cos(angle) * ringRadius,
          Math.sin(angle) * ringRadius,
          0
        )
        ring.add(particle)
      }
      
      // 🌟 START RINGS INVISIBLE AND SMALL FOR SPAWN ANIMATION 🌟
      ring.scale.setScalar(0.01)
      const ringMat = ring.material as THREE.MeshBasicMaterial
      ringMat.opacity = 0
      
      this.voidRings.push(ring)
      this.mesh.add(ring)
    }
    
    // 🌟 START MESH SMALL FOR SPAWN ANIMATION 🌟
    this.mesh.scale.setScalar(0.01)
    
    // ⚡ ENERGY TENDRILS - Reaching out! ⚡
    // OPTIMIZED: Reduced from 8 tendrils to 6, geometry segments from 8 to 6
    for (let i = 0; i < 6; i++) {
      const tendrilGeometry = new THREE.CylinderGeometry(0.08, 0.25, 4, 6)
      const tendrilMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.75, 1.0, 0.5),
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      })
      const tendril = new THREE.Mesh(tendrilGeometry, tendrilMaterial)
      const angle = (i / 6) * Math.PI * 2
      tendril.position.set(
        Math.cos(angle) * 2.8,
        Math.sin(angle) * 2.8,
        0
      )
      tendril.rotation.z = angle + Math.PI / 2
      this.mesh.add(tendril)
    }

    // Create MASSIVE distortion field effect
    // OPTIMIZED: Reduced from 48x48 to 16x12
    const distortGeometry = new THREE.SphereGeometry(6, 16, 12)
    const distortMaterial = new THREE.MeshBasicMaterial({
      color: 0x660088,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    this.distortionField = new THREE.Mesh(distortGeometry, distortMaterial)
    this.mesh.add(this.distortionField)
    
    // 🔮 SECONDARY DISTORTION SHELL 🔮
    // OPTIMIZED: Reduced from 32x32 to 12x8
    const outerDistortGeometry = new THREE.SphereGeometry(8, 12, 8)
    const outerDistortMaterial = new THREE.MeshBasicMaterial({
      color: 0x440066,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    const outerDistortion = new THREE.Mesh(outerDistortGeometry, outerDistortMaterial)
    this.mesh.add(outerDistortion)

    // Create MASSIVE gravity wave particles
    // OPTIMIZED: Reduced from 300 to 150 for better performance
    const waveCount = 150
    this.wavePositions = new Float32Array(waveCount * 3)
    const waveColors = new Float32Array(waveCount * 3)

    for (let i = 0; i < waveCount; i++) {
      const i3 = i * 3
      const angle = (i / waveCount) * Math.PI * 2
      const radius = 8 + Math.random() * 12 // 4x (was 2 + random * 3)
      
      this.wavePositions[i3] = Math.cos(angle) * radius
      this.wavePositions[i3 + 1] = Math.sin(angle) * radius
      this.wavePositions[i3 + 2] = (Math.random() - 0.5) * 8 // 4x depth
      
      // Purple/pink/cyan colors - cyberpunk palette!
      const hue = 0.75 + Math.random() * 0.15
      const color = new THREE.Color().setHSL(hue, 1.0, 0.5 + Math.random() * 0.3)
      waveColors[i3] = color.r
      waveColors[i3 + 1] = color.g
      waveColors[i3 + 2] = color.b
    }

    this.waveGeometry = new THREE.BufferGeometry()
    this.waveGeometry.setAttribute('position', new THREE.BufferAttribute(this.wavePositions, 3))
    this.waveGeometry.setAttribute('color', new THREE.BufferAttribute(waveColors, 3))

    const waveMaterial = new THREE.PointsMaterial({
      size: 0.4, // 4x (was 0.1)
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })

    this.gravityWaves = new THREE.Points(this.waveGeometry, waveMaterial)
    this.mesh.add(this.gravityWaves)
    
    // 🔥 EMISSION PORTS - Where bullets come from! 🔥
    for (let i = 0; i < 6; i++) {
      const portAngle = (i / 6) * Math.PI * 2
      const portGeometry = new THREE.RingGeometry(0.3, 0.5, 8)
      const portMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF00FF,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
      const port = new THREE.Mesh(portGeometry, portMaterial)
      port.position.set(
        Math.cos(portAngle) * 2.5,
        Math.sin(portAngle) * 2.5,
        0
      )
      port.lookAt(0, 0, 0)
      this.mesh.add(port)
    }
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
      duration: 1.5,
      particles: {
        count: 20,
        colors: [0x8800FF, 0xAA00FF],
        speed: 3
      },
      explosion: {
        size: 3.0,
        color: 0x8800FF
      },
      distortionWave: {
        radius: 2.5
      }
    }
  }
  
  // 🌟 SPAWN ANIMATION HOOK 🌟
  protected onSpawnUpdate(progress: number): void {
    // 🌀 RINGS MORPH INTO EXISTENCE - FROM INSIDE OUT! 🌀
    const easeProgress = progress * progress * (3 - 2 * progress) // Smooth ease-in-out
    
    // Grow main mesh
    this.mesh.scale.setScalar(easeProgress)
    
    // Rings appear one by one from inside out with dramatic growth
    const spawnDuration = 1.0
    for (let i = 0; i < this.ringCount; i++) {
      const ring = this.voidRings[i]
      
      // Each ring starts appearing after the previous one
      const ringDelay = i * 0.12 // 0.12s delay between rings
      const ringProgress = Math.max(0, Math.min(1, (progress - ringDelay / spawnDuration) * 1.5))
      
      if (ringProgress > 0) {
        // Ease-out elastic growth for dramatic effect
        const elasticScale = ringProgress < 1 
          ? ringProgress * ringProgress * ((2.5 + 1) * ringProgress - 2.5) + 1 
          : 1
        
        ring.scale.setScalar(Math.max(0.01, elasticScale))
        
        const material = ring.material as THREE.MeshBasicMaterial
        material.opacity = Math.min(0.7, ringProgress * 1.2) // Target opacity 0.7
        
        // Animate wireframe too
        const wireframe = ring.children[0] as THREE.Mesh
        if (wireframe) {
          const wireMaterial = wireframe.material as THREE.MeshBasicMaterial
          wireMaterial.opacity = Math.min(0.9, ringProgress * 1.5)
        }
        
        // Fade in particles
        for (let j = 1; j < ring.children.length; j++) {
          const particle = ring.children[j] as THREE.Mesh
          if (particle) {
            const particleMaterial = particle.material as THREE.MeshBasicMaterial
            particleMaterial.opacity = Math.min(0.8, ringProgress * 1.2)
          }
        }
      }
    }
    
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

  // 💀 DEATH ANIMATION HOOK 💀
  protected onDeathUpdate(progress: number): void {
    // Initialize on first call
    if (!this.deathInitialized) {
      this.deathInitialized = true
      this.voidRingsCollapsed = new Array(this.ringCount).fill(false)
    }
    
    // Phase 1: Rings collapse inward (0-0.27s)
    if (progress < 0.27) {
      const phaseProgress = progress / 0.27
      
      // Collapse rings one by one from outside in
      const ringsToCollapse = Math.floor(phaseProgress * this.ringCount)
      for (let i = 0; i < ringsToCollapse; i++) {
        const ringIndex = this.ringCount - 1 - i
        if (!this.voidRingsCollapsed[ringIndex] && this.voidRings.length > ringIndex) {
          const ring = this.voidRings[ringIndex]
          ring.scale.setScalar(0.1)
          const material = ring.material as THREE.MeshBasicMaterial
          material.opacity = 0
          this.voidRingsCollapsed[ringIndex] = true
        }
      }
      
      // Main sphere starts shrinking
      this.implosionScale = 1.0 - phaseProgress * 0.3
      this.mesh.scale.setScalar(this.implosionScale)
    }
    // Phase 2: Extreme implosion - singularity (0.27-0.4s)
    else if (progress < 0.4) {
      const phaseProgress = (progress - 0.27) / 0.13
      
      // Rapid shrink to singularity
      this.implosionScale = 0.7 - phaseProgress * 0.65
      this.mesh.scale.setScalar(this.implosionScale)
      
      // Distortion intensifies
      if (this.distortionField) {
        const material = this.distortionField.material as THREE.MeshBasicMaterial
        material.opacity = 0.3 + phaseProgress * 0.7
      }
      
      // Dark flash effect
      if (this.effectsSystem && phaseProgress > 0.5) {
        // Negative exposure flash
        this.effectsSystem.addScreenFlash(0.15, new THREE.Color(0x000000))
      }
    }
    // Phase 3: Violent void burst (0.4-0.67s)
    else if (progress < 0.67) {
      const phaseProgress = (progress - 0.4) / 0.27
      
      // Explode outward
      this.implosionScale = 0.05 + phaseProgress * 3.0
      this.mesh.scale.setScalar(this.implosionScale)
      
      // Purple void energy burst
      if (this.effectsSystem && phaseProgress < 0.2) {
        const purpleColor = new THREE.Color(0x7F00FF)
        this.effectsSystem.createExplosion(this.position, 3.0, purpleColor)
        
        // Void tendrils
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2
          const speed = 2 + Math.random() * 3
          const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            (Math.random() - 0.5) * 2
          )
          this.effectsSystem.createSparkle(
            this.position,
            velocity,
            purpleColor,
            0.6
          )
        }
      }
      
      // Fade out
      const core = this.mesh.children[0] as THREE.Mesh
      if (core) {
        const material = core.material as THREE.MeshBasicMaterial
        material.opacity = 1 - phaseProgress
      }
    }
    // Phase 4: Distortion waves ripple outward (0.67-1.0s)
    else {
      const phaseProgress = (progress - 0.67) / 0.33
      
      // Create expanding distortion waves
      if (this.effectsSystem) {
        const waveCount = Math.floor(phaseProgress * 5)
        if (waveCount > 0 && Math.random() < 0.3) {
          this.effectsSystem.addDistortionWave(
            this.position,
            2.5 + phaseProgress * 2.0
          )
        }
      }
      
      // Fade everything
      this.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshBasicMaterial
          if (material) {
            material.opacity = Math.max(0, 1 - phaseProgress * 2)
          }
        }
      })
      
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
      stats.BULLET_DAMAGE
    )
    
    // Set custom color for void projectiles
    const mesh = projectile.getMesh()
    const material = mesh.material as THREE.MeshBasicMaterial
    material.color.setHex(0xFF00FF) // Magenta void color
    
    // Update glow color too
    if (mesh.children[0]) {
      const glowMaterial = (mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
      glowMaterial.color.setHex(0x8800FF) // Purple glow
    }
    
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
    const time = Date.now() * 0.001

    // 🌪️ ROTATE VOID RINGS - Enhanced with wireframe! 🌪️
    for (let i = 0; i < this.voidRings.length; i++) {
      const ring = this.voidRings[i]
      ring.rotation.x += deltaTime * (0.8 + i * 0.2)
      ring.rotation.y += deltaTime * (0.4 + i * 0.15)
      ring.rotation.z += deltaTime * (0.6 + i * 0.08)
      
      // 💫 PULSING OPACITY - More dramatic! 💫
      const material = ring.material as THREE.MeshBasicMaterial
      material.opacity = 0.5 + Math.sin(time * 4 + i) * 0.4
      
      // 🌟 ANIMATE WIREFRAME - Rotating outline! 🌟
      const wireframe = ring.children[0] as THREE.Mesh
      if (wireframe) {
        wireframe.rotation.copy(ring.rotation)
        const wireframeMaterial = wireframe.material as THREE.MeshBasicMaterial
        wireframeMaterial.opacity = 0.7 + Math.sin(time * 5 + i) * 0.3
      }
      
      // ⚡ ANIMATE ENERGY PARTICLES - Orbiting! ⚡
      for (let j = 1; j < ring.children.length; j++) {
        const particle = ring.children[j] as THREE.Mesh
        if (particle) {
          const angle = ((j - 1) / 12) * Math.PI * 2 + time * (1.5 + i * 0.3)
          const ringRadius = 3.2 + i * 1.2
          particle.position.set(
            Math.cos(angle) * ringRadius,
            Math.sin(angle) * ringRadius,
            Math.sin(time * 3 + j) * 0.4
          )
          const particleMaterial = particle.material as THREE.MeshBasicMaterial
          particleMaterial.opacity = 0.6 + Math.sin(time * 8 + j) * 0.4
        }
      }
    }
    
    // ⚡ ANIMATE ENERGY TENDRILS ⚡
    const tendrilStartIndex = this.ringCount + 1 // After inner core and rings
    for (let i = 0; i < 8; i++) {
      const tendrilIndex = tendrilStartIndex + i
      const tendril = this.mesh.children[tendrilIndex] as THREE.Mesh
      if (tendril && tendril.geometry instanceof THREE.CylinderGeometry) {
        const angle = (i / 8) * Math.PI * 2 + time * 0.5
        const reach = 2.8 + Math.sin(time * 3 + i) * 0.8
        tendril.position.set(
          Math.cos(angle) * reach,
          Math.sin(angle) * reach,
          Math.sin(time * 2 + i * 0.5) * 0.5
        )
        tendril.rotation.z = angle + Math.PI / 2 + Math.sin(time * 4 + i) * 0.3
        
        const tendrilMaterial = tendril.material as THREE.MeshBasicMaterial
        tendrilMaterial.opacity = 0.4 + Math.sin(time * 6 + i) * 0.3
      }
    }

    // Distortion field breathing effect
    const breathe = 1 + Math.sin(time * 2) * 0.3
    this.distortionField.scale.setScalar(breathe)
    
    const distortMaterial = this.distortionField.material as THREE.MeshBasicMaterial
    distortMaterial.opacity = 0.1 + Math.sin(time * 4) * 0.1

    // OPTIMIZED: Animate gravity waves spiraling inward (throttled to every 3rd frame)
    this.waveUpdateSkipFrames++
    if (this.waveUpdateSkipFrames >= 3) {
      this.waveUpdateSkipFrames = 0
      
      // Update particle positions
      for (let i = 0; i < this.wavePositions.length / 3; i++) {
        const i3 = i * 3
        const angle = time * 1.5 + (i / (this.wavePositions.length / 3)) * Math.PI * 2
        const radius = 12 - (time * 0.5 + i * 0.01) % 12
        
        this.wavePositions[i3] = Math.cos(angle) * radius
        this.wavePositions[i3 + 1] = Math.sin(angle) * radius
        this.wavePositions[i3 + 2] = Math.sin(time * 3 + i * 0.1) * 2
      }

      this.waveGeometry.attributes.position.needsUpdate = true
    }

    // Core void pulsing - BIGGER pulse for massive sphere
    const corePulse = 1 + Math.sin(time * 4) * 0.15
    this.mesh.scale.setScalar(corePulse)
    
    // 🔮 INNER CORE ANIMATION 🔮
    const innerCore = this.mesh.children[0] as THREE.Mesh
    if (innerCore) {
      const innerMaterial = innerCore.material as THREE.MeshBasicMaterial
      innerMaterial.opacity = 0.6 + Math.sin(time * 6) * 0.3
      innerCore.rotation.x += deltaTime * 0.5
      innerCore.rotation.y += deltaTime * 0.3
    }
    
    // 🔥 ANIMATE EMISSION PORTS 🔥
    const portStartIndex = this.mesh.children.length - 6
    for (let i = 0; i < 6; i++) {
      const port = this.mesh.children[portStartIndex + i] as THREE.Mesh
      if (port && port.geometry instanceof THREE.RingGeometry) {
        const portMaterial = port.material as THREE.MeshBasicMaterial
        // Pulse when charging
        const chargeIntensity = this.burstCount > 0 ? 1.0 : 0.5 + Math.sin(time * 8 + i) * 0.3
        portMaterial.opacity = chargeIntensity
        
        // Rotate ports
        port.rotation.z += deltaTime * 3
      }
    }
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
