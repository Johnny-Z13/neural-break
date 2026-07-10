import * as THREE from 'three'
import { Enemy } from './Enemy'
import { Player } from './Player'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'

/**
 * 🛸 UFO - INTELLIGENT ALIEN CRAFT 🛸
 * A sleek spacecraft piloted by intelligent beings:
 * - Later game enemy (spawns after level 5+)
 * - Moves in organic, curved paths - as if piloted intelligently
 * - Slightly larger than player
 * - Classic flying saucer design with jet trails
 * - Fires laser BEAMS (not bullets) - 10% damage (reduced for testing)
 */
export class UFO extends Enemy {
  private sceneManager: SceneManager | null = null
  
  // 🛸 ORGANIC MOVEMENT STATE 🛸
  private targetPoint: THREE.Vector3 = new THREE.Vector3()
  private controlPoint: THREE.Vector3 = new THREE.Vector3() // Bezier control point
  private pathProgress: number = 0
  private pathDuration: number = 3.0 // Time to complete path
  private startPoint: THREE.Vector3 = new THREE.Vector3()
  private orbitAngle: number = 0
  private orbitMode: boolean = false // Sometimes orbits player
  
  // 🔴 LASER BEAM STATE 🔴
  private laserChargeTime: number = 0
  private laserChargeDuration: number = 1.5 // Charge up before firing
  private isCharging: boolean = false
  private isFiring: boolean = false
  private laserExtendDuration: number = 0.3 // Time for beam to extend to edge
  private laserHoldDuration: number = 0.8 // Time beam stays at full length
  private laserRetractDuration: number = 0.2 // Time for beam to retract
  private laserTimer: number = 0
  private laserCooldown: number = 4.0 // Time between laser attacks
  private laserCooldownTimer: number = 2.0 // Start partially charged
  private laserBeam: THREE.Mesh | null = null
  private laserBeamGlow: THREE.Mesh | null = null // Outer glow layer
  private laserTarget: THREE.Vector3 = new THREE.Vector3()
  private laserPulseTime: number = 0 // For pulsing effect
  
  // ✨ VISUAL COMPONENTS ✨
  private jetTrails: THREE.Points[] = []
  private trailPositions: Float32Array[] = []
  private trailIndex: number = 0
  private maxTrailParticles: number = 40
  private domeLights: THREE.Mesh[] = []

  // ⚡ LASER ELECTRIC PARTICLES ⚡
  private laserParticles: THREE.Points | null = null
  private laserParticlePositions: Float32Array = new Float32Array(0)
  private laserParticleVelocities: Float32Array = new Float32Array(0)
  private maxLaserParticles: number = 60 // Sizzly effect!
  
  // 💀 DEATH ANIMATION STATE 💀
  private isDying: boolean = false
  private deathTimer: number = 0
  private deathDuration: number = 1.2
  private spinSpeed: number = 0
  private wobbleIntensity: number = 0
  private debrisFragments: THREE.Mesh[] = []

  constructor(x: number, y: number) {
    super(x, y)
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.UFO
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

  initialize(): void {
    // Create container
    const containerGeometry = new THREE.CircleGeometry(0.01, 4)
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)

    // 🛸 MAKE UFO 10% LARGER 🛸
    this.mesh.scale.setScalar(1.1)

    // 🛸 MAIN SAUCER BODY 🛸
    const saucerGeometry = new THREE.CylinderGeometry(1.0, 1.2, 0.3, 24)
    const saucerMaterial = new THREE.MeshBasicMaterial({
      color: 0x445566,
      transparent: true,
      opacity: 0.9
    })
    const saucer = new THREE.Mesh(saucerGeometry, saucerMaterial)
    saucer.rotation.x = Math.PI / 2
    this.mesh.add(saucer)

    // 🛸 SAUCER WIREFRAME OUTLINE 🛸
    const wireframeGeometry = new THREE.CylinderGeometry(1.02, 1.22, 0.32, 24)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial)
    wireframe.rotation.x = Math.PI / 2
    this.mesh.add(wireframe)

    // 🛸 COCKPIT DOME 🛸
    const domeGeometry = new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const domeMaterial = new THREE.MeshBasicMaterial({
      color: 0x88AAFF,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
    const dome = new THREE.Mesh(domeGeometry, domeMaterial)
    dome.position.z = 0.15
    this.mesh.add(dome)

    // 🛸 DOME WIREFRAME 🛸
    const domeWireGeometry = new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const domeWireMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    })
    const domeWire = new THREE.Mesh(domeWireGeometry, domeWireMaterial)
    domeWire.position.z = 0.15
    this.mesh.add(domeWire)

    // 🛸 RUNNING LIGHTS AROUND EDGE 🛸
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const lightGeometry = new THREE.SphereGeometry(0.08, 8, 8)
      const lightMaterial = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xFF0000 : (i % 3 === 1 ? 0x00FF00 : 0x0088FF),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      const light = new THREE.Mesh(lightGeometry, lightMaterial)
      light.position.set(
        Math.cos(angle) * 1.1,
        Math.sin(angle) * 1.1,
        0
      )
      this.domeLights.push(light)
      this.mesh.add(light)
    }

    // 🛸 BOTTOM GLOW / TRACTOR BEAM EMITTER 🛸
    const glowGeometry = new THREE.CircleGeometry(0.6, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.z = -0.2
    this.mesh.add(glow)

    // 🔴 LASER WEAPON (initially hidden) - EXTENDS TO SCREEN EDGE! 🔴
    // Core beam (bright red)
    const laserGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 8) // Unit length, will be scaled
    const laserMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    })
    this.laserBeam = new THREE.Mesh(laserGeometry, laserMaterial)
    this.laserBeam.visible = false
    this.laserBeam.position.set(0, 0, 0) // Center of UFO
    // Rotate cylinder to lie flat in XY plane (cylinder points along Y axis by default)
    this.laserBeam.rotation.x = Math.PI / 2
    this.mesh.add(this.laserBeam)

    // Outer glow layer (softer, wider)
    const laserGlowGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 8)
    const laserGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF3333,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    })
    this.laserBeamGlow = new THREE.Mesh(laserGlowGeometry, laserGlowMaterial)
    this.laserBeamGlow.visible = false
    this.laserBeamGlow.position.set(0, 0, 0)
    this.laserBeamGlow.rotation.x = Math.PI / 2
    this.mesh.add(this.laserBeamGlow)

    // 🔥 JET TRAILS (2 engines) 🔥
    for (let j = 0; j < 2; j++) {
      const positions = new Float32Array(this.maxTrailParticles * 3)
      const colors = new Float32Array(this.maxTrailParticles * 3)
      
      for (let i = 0; i < this.maxTrailParticles; i++) {
        const i3 = i * 3
        positions[i3] = 0
        positions[i3 + 1] = 0
        positions[i3 + 2] = 0
        colors[i3] = 1
        colors[i3 + 1] = 0.5
        colors[i3 + 2] = 0
      }
      
      const trailGeometry = new THREE.BufferGeometry()
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      
      const trailMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: false
      })
      
      const trail = new THREE.Points(trailGeometry, trailMaterial)
      this.jetTrails.push(trail)
      this.trailPositions.push(positions)
      this.mesh.add(trail)
    }

    // ⚡ LASER ELECTRIC PARTICLES - SIZZLY BLUE ENERGY! ⚡
    this.laserParticlePositions = new Float32Array(this.maxLaserParticles * 3)
    this.laserParticleVelocities = new Float32Array(this.maxLaserParticles * 3)
    const laserColors = new Float32Array(this.maxLaserParticles * 3)

    for (let i = 0; i < this.maxLaserParticles; i++) {
      const i3 = i * 3
      this.laserParticlePositions[i3] = 0
      this.laserParticlePositions[i3 + 1] = 0
      this.laserParticlePositions[i3 + 2] = 0
      // Electric blue colors with white/cyan variation
      laserColors[i3] = 0.2 + Math.random() * 0.3     // R: 20-50%
      laserColors[i3 + 1] = 0.5 + Math.random() * 0.5 // G: 50-100% (cyan tint)
      laserColors[i3 + 2] = 1.0                       // B: 100% (bright blue)
    }

    const laserParticleGeometry = new THREE.BufferGeometry()
    laserParticleGeometry.setAttribute('position', new THREE.BufferAttribute(this.laserParticlePositions, 3))
    laserParticleGeometry.setAttribute('color', new THREE.BufferAttribute(laserColors, 3))

    const laserParticleMaterial = new THREE.PointsMaterial({
      size: 0.15, // Smaller for electric sizzle
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
    })

    this.laserParticles = new THREE.Points(laserParticleGeometry, laserParticleMaterial)
    this.laserParticles.visible = false // Hidden until laser is active
    this.mesh.add(this.laserParticles)

    // Initialize first path
    this.generateNewPath()
  }

  private generateNewPath(): void {
    this.startPoint.copy(this.position)
    this.pathProgress = 0
    
    // 30% chance to enter orbit mode around player
    this.orbitMode = Math.random() < 0.3
    
    if (!this.orbitMode) {
      // Generate a curved path with bezier control point
      const angle = Math.random() * Math.PI * 2
      const distance = 8 + Math.random() * 12
      
      this.targetPoint.set(
        this.position.x + Math.cos(angle) * distance,
        this.position.y + Math.sin(angle) * distance,
        0
      )
      
      // Clamp to world bounds
      const worldBound = 25
      this.targetPoint.x = Math.max(-worldBound, Math.min(worldBound, this.targetPoint.x))
      this.targetPoint.y = Math.max(-worldBound, Math.min(worldBound, this.targetPoint.y))
      
      // Control point perpendicular to path for curved motion
      const midPoint = this.startPoint.clone().add(this.targetPoint).multiplyScalar(0.5)
      const perpAngle = angle + Math.PI / 2
      const curveAmount = (Math.random() - 0.5) * 10
      
      this.controlPoint.set(
        midPoint.x + Math.cos(perpAngle) * curveAmount,
        midPoint.y + Math.sin(perpAngle) * curveAmount,
        0
      )
      
      this.pathDuration = 2 + Math.random() * 2
    }
  }

  private quadraticBezier(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3): THREE.Vector3 {
    const oneMinusT = 1 - t
    return p0.clone().multiplyScalar(oneMinusT * oneMinusT)
      .add(p1.clone().multiplyScalar(2 * oneMinusT * t))
      .add(p2.clone().multiplyScalar(t * t))
  }

  // Override takeDamage to trigger custom death
  takeDamage(damage: number): void {
    if (this.isDying) return
    
    this.health -= damage
    
    // Visual feedback - dome flickers
    const dome = this.mesh.children.find(child => child.userData.isDome) as THREE.Mesh
    if (dome) {
      const material = dome.material as THREE.MeshBasicMaterial
      const originalOpacity = material.opacity
      material.opacity = 1.0
      setTimeout(() => {
        material.opacity = originalOpacity
      }, 100)
    }

    if (this.health <= 0 && !this.isDying) {
      this.startDeathAnimation()
    }
  }

  private startDeathAnimation(): void {
    this.isDying = true
    this.deathTimer = 0
    this.alive = true
    this.spinSpeed = 2
    this.wobbleIntensity = 0
    
    // Disable laser
    if (this.laserBeam && this.laserBeam.parent) {
      this.laserBeam.parent.remove(this.laserBeam)
      this.laserBeam = null
    }
    
    // 🎵 PLAY DEATH SOUND! 🎵
    if (this.audioManager) {
      this.audioManager.playEnemyDeathSound('UFO')
    }
  }

  private updateUFODeathAnimation(deltaTime: number): void {
    if (!this.isDying) return
    
    this.deathTimer += deltaTime
    const progress = this.deathTimer / this.deathDuration
    
    // Phase 1: Loss of control - wobble and spin (0-0.25s)
    if (progress < 0.25) {
      const phaseProgress = progress / 0.25
      this.wobbleIntensity = phaseProgress * 2
      this.spinSpeed = 2 + phaseProgress * 8
      
      // Wobble movement
      const wobbleX = Math.sin(this.deathTimer * 10) * this.wobbleIntensity
      const wobbleY = Math.cos(this.deathTimer * 8) * this.wobbleIntensity
      this.velocity.set(wobbleX, wobbleY, 0)
      
      // Spin faster
      this.mesh.rotation.z += deltaTime * this.spinSpeed
      
      // Lights flicker
      this.domeLights.forEach((light) => {
        const material = light.material as THREE.MeshBasicMaterial
        material.opacity = Math.random() > 0.5 ? 0.8 : 0.2
      })
    }
    // Phase 2: Tractor beam collapse (0.25-0.4s)
    else if (progress < 0.4) {
      const phaseProgress = (progress - 0.25) / 0.15
      
      // Tractor beam implodes
      const tractorBeam = this.mesh.children.find(child => child.userData.isTractorBeam) as THREE.Mesh
      if (tractorBeam) {
        tractorBeam.scale.y = 1 - phaseProgress
        const material = tractorBeam.material as THREE.MeshBasicMaterial
        material.opacity = 0.3 * (1 - phaseProgress)
      }
      
      // Continue spinning faster
      this.spinSpeed = 10 + phaseProgress * 10
      this.mesh.rotation.z += deltaTime * this.spinSpeed
      
      // Tilt
      this.mesh.rotation.x = phaseProgress * Math.PI * 0.3
      
      // Sparks
      if (this.effectsSystem && Math.random() < 0.4) {
        const angle = Math.random() * Math.PI * 2
        const velocity = new THREE.Vector3(
          Math.cos(angle) * (1 + Math.random()),
          Math.sin(angle) * (1 + Math.random()),
          (Math.random() - 0.5) * 0.5
        )
        const sparkColor = new THREE.Color(0xFF8800)
        this.effectsSystem.createSparkle(
          this.position,
          velocity,
          sparkColor,
          0.3
        )
      }
    }
    // Phase 3: Hull breach - debris (0.4-0.7s)
    else if (progress < 0.7) {
      const phaseProgress = (progress - 0.4) / 0.3
      
      // Create debris fragments
      if (phaseProgress < 0.2 && this.debrisFragments.length < 8) {
        for (let i = 0; i < 2; i++) {
          const fragmentGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1)
          const fragmentMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 1.0
          })
          const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterial)
          
          fragment.position.copy(this.position)
          const angle = Math.random() * Math.PI * 2
          const speed = 1 + Math.random() * 2
          const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            (Math.random() - 0.5) * 1
          )
          
          fragment.userData.velocity = velocity
          fragment.userData.rotation = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          )
          
          if (this.mesh.parent) {
            this.mesh.parent.add(fragment)
          }
          this.debrisFragments.push(fragment)
        }
      }
      
      // Animate debris
      this.debrisFragments.forEach(fragment => {
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
      
      // Main UFO fades
      this.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshBasicMaterial
          if (material) {
            material.opacity = Math.max(0, 1 - phaseProgress * 0.5)
          }
        }
      })
      
      // More sparks
      if (this.effectsSystem && Math.random() < 0.5) {
        const angle = Math.random() * Math.PI * 2
        const velocity = new THREE.Vector3(
          Math.cos(angle) * 2,
          Math.sin(angle) * 2,
          (Math.random() - 0.5) * 1
        )
        const fireColor = new THREE.Color(0xFF4400)
        this.effectsSystem.createSparkle(
          this.position,
          velocity,
          fireColor,
          0.4
        )
      }
    }
    // Phase 4: Final explosion (0.7-1.0s)
    else {
      const phaseProgress = (progress - 0.7) / 0.3
      
      // Explosion at start of phase
      if (this.effectsSystem && phaseProgress < 0.1) {
        const explosionColor = new THREE.Color(0xFF6600)
        this.effectsSystem.createExplosion(this.position, 2.0, explosionColor)
        
        // Radial debris burst
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2
          const speed = 2 + Math.random() * 2
          const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            (Math.random() - 0.5) * 1.5
          )
          this.effectsSystem.createSparkle(
            this.position,
            velocity,
            explosionColor,
            0.6
          )
        }
        
        this.effectsSystem.addScreenFlash(0.15, explosionColor)
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
      
      this.debrisFragments.forEach(fragment => {
        const material = fragment.material as THREE.MeshBasicMaterial
        material.opacity = Math.max(0, 1 - phaseProgress * 2)
      })
      
      if (progress >= 1.0) {
        this.completeDeath()
      }
    }
  }

  private completeDeath(): void {
    // Clean up debris
    this.debrisFragments.forEach(fragment => {
      if (fragment.parent) {
        fragment.parent.remove(fragment)
      }
    })
    this.debrisFragments = []
    
    // Final VFX
    if (this.effectsSystem) {
      const deathColor = new THREE.Color(0xFF6600)
      this.effectsSystem.createExplosion(this.position, 2.5, deathColor)
      this.effectsSystem.addDistortionWave(this.position, 1.5)
    }
    
    this.alive = false
    this.isDying = false
    this.createDeathEffect()
  }

  // Override update to handle death animation
  update(deltaTime: number, player: Player): void {
    if (this.isDying) {
      this.updateUFODeathAnimation(deltaTime)
      // Still update position during death
      this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
      this.mesh.position.set(this.position.x, this.position.y, 0)
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
    const playerPos = player.getPosition()
    const distanceToPlayer = this.position.distanceTo(playerPos)
    
    // 🛸 ORGANIC MOVEMENT 🛸
    if (this.orbitMode) {
      // Orbit around player
      this.orbitAngle += deltaTime * 1.5
      const orbitRadius = 10 + Math.sin(this.orbitAngle * 0.5) * 3
      
      const targetX = playerPos.x + Math.cos(this.orbitAngle) * orbitRadius
      const targetY = playerPos.y + Math.sin(this.orbitAngle) * orbitRadius
      
      const direction = new THREE.Vector3(targetX - this.position.x, targetY - this.position.y, 0)
      direction.normalize()
      
      this.velocity = direction.multiplyScalar(this.speed)
      
      // Exit orbit mode after a while
      if (Math.random() < deltaTime * 0.3) {
        this.orbitMode = false
        this.generateNewPath()
      }
    } else {
      // Follow curved bezier path
      this.pathProgress += deltaTime / this.pathDuration
      
      if (this.pathProgress >= 1) {
        this.generateNewPath()
      } else {
        const targetPos = this.quadraticBezier(
          this.pathProgress,
          this.startPoint,
          this.controlPoint,
          this.targetPoint
        )
        
        const direction = targetPos.clone().sub(this.position)
        if (direction.length() > 0.1) {
          direction.normalize()
          this.velocity = direction.multiplyScalar(this.speed)
        }
      }
    }
    
    // 🔴 LASER ATTACK LOGIC 🔴
    if (!this.isCharging && !this.isFiring) {
      this.laserCooldownTimer += deltaTime
      
      // Start charging when cooldown complete and player is in range
      if (this.laserCooldownTimer >= this.laserCooldown && distanceToPlayer < 18) {
        this.isCharging = true
        this.laserChargeTime = 0
        this.laserTarget.copy(playerPos)
        
        if (this.audioManager) {
          this.audioManager.playUFOChargeSound()
        }
      }
    }
    
    if (this.isCharging) {
      this.laserChargeTime += deltaTime
      // Track player during charge
      this.laserTarget.lerp(playerPos, deltaTime * 2)
      
      if (this.laserChargeTime >= this.laserChargeDuration) {
        // FIRE!
        this.isCharging = false
        this.isFiring = true
        this.laserTimer = 0
        
        if (this.audioManager) {
          this.audioManager.playUFOLaserSound()
        }
      }
    }
    
    if (this.isFiring) {
      this.laserTimer += deltaTime
      this.laserPulseTime += deltaTime // Update pulse timer

      const totalDuration = this.laserExtendDuration + this.laserHoldDuration + this.laserRetractDuration
      if (this.laserTimer >= totalDuration) {
        this.isFiring = false
        this.laserCooldownTimer = 0
        if (this.laserBeam) {
          this.laserBeam.visible = false
        }
        if (this.laserBeamGlow) {
          this.laserBeamGlow.visible = false
        }
      }
    }
  }

  // 🔴 CHECK IF LASER HITS PLAYER 🔴
  checkLaserHit(player: Player): boolean {
    if (!this.isFiring || !this.laserBeam) return false
    
    const playerPos = player.getPosition()
    const playerRadius = player.getRadius()
    
    // Line-circle intersection check
    const laserStart = this.position.clone()
    const laserEnd = this.laserTarget.clone()
    const laserDir = laserEnd.clone().sub(laserStart).normalize()
    const laserLength = 20
    
    // Project player position onto laser line
    const toPlayer = playerPos.clone().sub(laserStart)
    const projection = toPlayer.dot(laserDir)
    
    if (projection < 0 || projection > laserLength) return false
    
    const closestPoint = laserStart.clone().add(laserDir.multiplyScalar(projection))
    const distance = playerPos.distanceTo(closestPoint)
    
    return distance < playerRadius + 0.4 // Laser is THICKER now (was 0.2)
  }

  getLaserDamage(): number {
    return 10 // 10% of player health (reduced for testing - TODO: balance pass later)
  }

  isLaserActive(): boolean {
    return this.isFiring
  }

  /**
   * Calculate the distance from UFO position to screen edge in the given direction
   */
  private calculateBeamLengthToEdge(direction: THREE.Vector3, screenBounds: number): number {
    // Ray trace from UFO position to screen edge
    // Calculate intersection with screen bounds rectangle
    const t_x = direction.x !== 0 ? (Math.sign(direction.x) * screenBounds - this.position.x) / direction.x : Infinity
    const t_y = direction.y !== 0 ? (Math.sign(direction.y) * screenBounds - this.position.y) / direction.y : Infinity

    // Take the minimum positive t (first intersection)
    const t = Math.min(Math.abs(t_x), Math.abs(t_y))

    return t > 0 ? t : 50 // Fallback to 50 units if calculation fails
  }

  /**
   * ⚡ UPDATE LASER ELECTRIC PARTICLES - SIZZLY BLUE ENERGY! ⚡
   */
  private updateLaserParticles(direction: THREE.Vector3, beamLength: number, deltaTime: number, isCharging: boolean): void {
    if (!this.laserParticles) return

    this.laserParticles.visible = true

    // Update each particle
    for (let i = 0; i < this.maxLaserParticles; i++) {
      const i3 = i * 3

      // Get current position
      let px = this.laserParticlePositions[i3]
      let py = this.laserParticlePositions[i3 + 1]
      let pz = this.laserParticlePositions[i3 + 2]

      // If particle is dead (distance > beam length) or just starting, respawn along beam
      const distFromCenter = Math.sqrt(px * px + py * py)
      if (distFromCenter < 0.1 || distFromCenter > beamLength) {
        // Spawn along the beam
        const t = Math.random() // Random position along beam length
        const beamPos = t * beamLength

        px = direction.x * beamPos
        py = direction.y * beamPos
        pz = 0.05 + (Math.random() - 0.5) * 0.1 // Slightly above/below beam

        // Random perpendicular offset for width
        const perpX = -direction.y
        const perpY = direction.x
        const perpOffset = (Math.random() - 0.5) * 0.3 * (isCharging ? 0.3 : 1.0) // Narrower when charging
        px += perpX * perpOffset
        py += perpY * perpOffset

        // Set velocity for sizzle movement
        this.laserParticleVelocities[i3] = (Math.random() - 0.5) * 2.0     // X velocity
        this.laserParticleVelocities[i3 + 1] = (Math.random() - 0.5) * 2.0 // Y velocity
        this.laserParticleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.5 // Z velocity
      } else {
        // Update particle with sizzly movement
        px += this.laserParticleVelocities[i3] * deltaTime
        py += this.laserParticleVelocities[i3 + 1] * deltaTime
        pz += this.laserParticleVelocities[i3 + 2] * deltaTime

        // Add electric jitter
        px += (Math.random() - 0.5) * 0.05
        py += (Math.random() - 0.5) * 0.05
      }

      // Write back positions
      this.laserParticlePositions[i3] = px
      this.laserParticlePositions[i3 + 1] = py
      this.laserParticlePositions[i3 + 2] = pz
    }

    // Update buffer
    this.laserParticles.geometry.attributes.position.needsUpdate = true
  }

  protected updateVisuals(deltaTime: number): void {
    const time = Date.now() * 0.001
    
    // 🛸 GENTLE HOVER MOTION 🛸
    this.mesh.position.z = Math.sin(time * 2) * 0.1
    
    // 🛸 SLIGHT TILT BASED ON VELOCITY 🛸
    const tiltX = this.velocity.y * 0.05
    const tiltY = -this.velocity.x * 0.05
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, tiltX, deltaTime * 5)
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, tiltY, deltaTime * 5)
    
    // 🛸 RUNNING LIGHTS ANIMATION 🛸
    for (let i = 0; i < this.domeLights.length; i++) {
      const light = this.domeLights[i]
      const material = light.material as THREE.MeshBasicMaterial
      const phase = (time * 3 + i * 0.5) % 1
      material.opacity = 0.3 + phase * 0.7
      
      // Pulse size
      const scale = 0.8 + Math.sin(time * 8 + i) * 0.3
      light.scale.setScalar(scale)
    }
    
    // 🛸 DOME GLOW 🛸
    const dome = this.mesh.children[2] as THREE.Mesh
    if (dome) {
      const domeMaterial = dome.material as THREE.MeshBasicMaterial
      domeMaterial.opacity = 0.5 + Math.sin(time * 3) * 0.2
    }
    
    // 🛸 BOTTOM GLOW 🛸
    const bottomGlow = this.mesh.children[16] as THREE.Mesh
    if (bottomGlow) {
      const glowMaterial = bottomGlow.material as THREE.MeshBasicMaterial
      glowMaterial.opacity = 0.3 + Math.sin(time * 4) * 0.2
      bottomGlow.scale.setScalar(1 + Math.sin(time * 6) * 0.1)
    }
    
    // 🔴 LASER BEAM VISUAL - EXTENDS TO SCREEN EDGE WITH ANIMATION! 🔴
    // NOTE: Beam is a child of the UFO mesh, so we need to work in LOCAL space
    // and compensate for the UFO's rotation (tilt based on velocity)
    if (this.laserBeam && this.laserBeamGlow) {
      const laserMaterial = this.laserBeam.material as THREE.MeshBasicMaterial
      const glowMaterial = this.laserBeamGlow.material as THREE.MeshBasicMaterial

      if (this.isCharging || this.isFiring) {
        // Calculate direction to target in WORLD space
        const worldDirection = this.laserTarget.clone().sub(this.position).normalize()

        // Convert direction to LOCAL space by counter-rotating by mesh rotation
        // Create inverse rotation matrix from mesh rotation
        const localDirection = worldDirection.clone()
        localDirection.applyAxisAngle(new THREE.Vector3(1, 0, 0), -this.mesh.rotation.x)
        localDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.mesh.rotation.y)
        localDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), -this.mesh.rotation.z)

        // Calculate distance to screen edge in this direction (uses world direction)
        const screenBounds = 32
        const maxBeamLength = this.calculateBeamLengthToEdge(worldDirection, screenBounds)

        // Calculate angle for beam rotation (in local space)
        const angle = Math.atan2(localDirection.y, localDirection.x)

        if (this.isCharging) {
          // Show charging effect - thin beam preview
          this.laserBeam.visible = true
          this.laserBeamGlow.visible = false
          laserMaterial.opacity = (this.laserChargeTime / this.laserChargeDuration) * 0.4
          laserMaterial.color.setHSL(0, 1, 0.3 + (this.laserChargeTime / this.laserChargeDuration) * 0.4)

          this.laserBeam.rotation.z = angle - Math.PI / 2

          const chargeScale = this.laserChargeTime / this.laserChargeDuration
          const currentBeamLength = maxBeamLength * chargeScale
          const offsetDistance = currentBeamLength / 2

          // Position in LOCAL space - beam starts at UFO center (0,0)
          this.laserBeam.position.set(
            localDirection.x * offsetDistance,
            localDirection.y * offsetDistance,
            0.05
          )

          this.laserBeam.scale.set(chargeScale * 0.5, currentBeamLength, chargeScale * 0.5)

          // ⚡ ELECTRIC PARTICLES ⚡
          this.updateLaserParticles(localDirection, currentBeamLength, deltaTime, true)
        } else {
          // FIRING - ANIMATED LASER with three phases: EXTEND -> HOLD -> RETRACT
          this.laserBeam.visible = true
          this.laserBeamGlow.visible = true

          this.laserBeam.rotation.z = angle - Math.PI / 2
          this.laserBeamGlow.rotation.z = angle - Math.PI / 2

          // Determine current phase and length scale
          let lengthScale = 1.0
          let coreOpacity = 0.9
          let glowOpacity = 0.4

          if (this.laserTimer < this.laserExtendDuration) {
            const extendProgress = this.laserTimer / this.laserExtendDuration
            lengthScale = extendProgress
            coreOpacity = 0.9 * extendProgress
            glowOpacity = 0.4 * extendProgress
          } else if (this.laserTimer < this.laserExtendDuration + this.laserHoldDuration) {
            lengthScale = 1.0
            const holdProgress = (this.laserTimer - this.laserExtendDuration) / this.laserHoldDuration
            const pulse = 0.9 + Math.sin(holdProgress * Math.PI * 8) * 0.1
            coreOpacity = pulse
            glowOpacity = 0.4 * pulse
          } else {
            const retractStart = this.laserExtendDuration + this.laserHoldDuration
            const retractProgress = (this.laserTimer - retractStart) / this.laserRetractDuration
            lengthScale = 1.0 - retractProgress
            coreOpacity = 0.9 * (1.0 - retractProgress)
            glowOpacity = 0.4 * (1.0 - retractProgress)
          }

          const currentBeamLength = maxBeamLength * lengthScale
          const offsetDistance = currentBeamLength / 2

          // Position in LOCAL space
          this.laserBeam.position.set(
            localDirection.x * offsetDistance,
            localDirection.y * offsetDistance,
            0.05
          )
          this.laserBeamGlow.position.set(
            localDirection.x * offsetDistance,
            localDirection.y * offsetDistance,
            0.05
          )

          this.laserBeam.scale.set(1.0, currentBeamLength, 1.0)
          this.laserBeamGlow.scale.set(1.0, currentBeamLength, 1.0)

          laserMaterial.opacity = coreOpacity
          laserMaterial.color.setRGB(1, 0.1, 0.1)
          glowMaterial.opacity = glowOpacity
          glowMaterial.color.setRGB(1, 0.3, 0.3)

          // ⚡ ELECTRIC PARTICLES ⚡
          if (lengthScale > 0.1) {
            this.updateLaserParticles(localDirection, currentBeamLength, deltaTime, false)
          }
        }
      } else {
        // Laser off
        this.laserBeam.visible = false
        this.laserBeamGlow.visible = false
        laserMaterial.opacity = 0
        glowMaterial.opacity = 0
        if (this.laserParticles) {
          this.laserParticles.visible = false
        }
      }
    }
    
    // 🔥 JET TRAILS 🔥
    const trailOffsets = [
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 }
    ]
    
    for (let j = 0; j < 2; j++) {
      const positions = this.trailPositions[j]
      const i3 = this.trailIndex * 3
      
      // Engine position relative to UFO
      const engineX = trailOffsets[j].x * Math.cos(-this.velocity.x * 0.1)
      const engineY = trailOffsets[j].y
      
      // Trail goes opposite to velocity
      const trailX = -this.velocity.x * 0.02
      const trailY = -this.velocity.y * 0.02
      
      positions[i3] = engineX + trailX
      positions[i3 + 1] = engineY + trailY
      positions[i3 + 2] = -0.3 // Below the ship
      
      // Update colors (fade older particles)
      const colors = this.jetTrails[j].geometry.attributes.color.array as Float32Array
      for (let i = 0; i < this.maxTrailParticles; i++) {
        const age = (this.trailIndex - i + this.maxTrailParticles) % this.maxTrailParticles
        const fade = 1 - (age / this.maxTrailParticles)
        const ci = i * 3
        colors[ci] = fade // Red
        colors[ci + 1] = fade * 0.5 + Math.sin(time * 10 + i) * 0.2 // Orange variation
        colors[ci + 2] = fade * 0.1 // Slight blue
      }
      
      this.jetTrails[j].geometry.attributes.position.needsUpdate = true
      this.jetTrails[j].geometry.attributes.color.needsUpdate = true
    }
    
    this.trailIndex = (this.trailIndex + 1) % this.maxTrailParticles
  }

  /**
   * 🧹 CLEANUP - Remove laser beam and jet trails from scene
   */
  destroy(): void {
    // Remove laser beam if it exists
    if (this.laserBeam && this.laserBeam.parent) {
      this.laserBeam.parent.remove(this.laserBeam)
      this.laserBeam = null
    }
    
    // Remove jet trails
    if (this.sceneManager) {
      for (const trail of this.jetTrails) {
        this.sceneManager.removeFromScene(trail)
      }
    }
    this.jetTrails = []
    
    console.log('🧹 UFO visuals cleaned up')
  }
}

