import * as THREE from 'three'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { BALANCE_CONFIG } from '../config'

export class MedPack {
  private mesh!: THREE.Mesh
  private position: THREE.Vector3
  private radius: number = 0.5 // Increased by 25% from 0.4
  private alive: boolean = true
  private effectsSystem: EffectsSystem | null = null
  private pulseTime: number = 0
  private rotationSpeed: number = 2.5 // Faster for "fizz"
  private healthRestore: number = BALANCE_CONFIG.PICKUPS.MED_PACK.HEAL_AMOUNT
  private glowMesh!: THREE.Mesh
  
  // 🧲 MAGNETISM SYSTEM 🧲
  private static readonly MAGNET_RADIUS = BALANCE_CONFIG.PICKUPS.MAGNET_RADIUS
  private static readonly MAGNET_STRENGTH = BALANCE_CONFIG.PICKUPS.MAGNET_STRENGTH
  private static readonly MAX_MAGNET_SPEED = BALANCE_CONFIG.PICKUPS.MAX_MAGNET_SPEED
  private velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private isMagnetized: boolean = false

  constructor(x: number, y: number) {
    this.position = new THREE.Vector3(x, y, 0)
    this.createMesh()
  }

  private createMesh(): void {
    // 💚 HEALTH PACK - RICH EMERALD GREEN CROSS! 💚
    // Create base container
    const containerGeometry = new THREE.SphereGeometry(0.125, 4, 4) // Scaled up
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)
    
    // 💚 RICH EMERALD GLOWING BASE - Health pickup! 💚
    // OPTIMIZED: Reduced from 16x16 to 8x8 for performance
    const glowGeometry = new THREE.SphereGeometry(0.5, 8, 8)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // BRIGHT GREEN glow (matches INVULNERABLE notification)
      transparent: true,
      opacity: 0.6,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
    this.mesh.add(this.glowMesh)
    
    // 💫 ADDITIONAL EMERALD AURA - Extra glow layer! 💫
    // OPTIMIZED: Reduced from 16x16 to 8x8 for performance
    const outerGlowGeometry = new THREE.SphereGeometry(0.625, 8, 8)
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // BRIGHT GREEN (matches INVULNERABLE notification)
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial)
    this.mesh.add(outerGlow)
    
    // ✨ MAIN CROSS - BRIGHT EMERALD medical cross! ✨
    // Vertical bar - RICH EMERALD!
    const verticalGeometry = new THREE.BoxGeometry(0.15, 0.56, 0.06) // Scaled up
    const verticalMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // BRIGHT GREEN cross (matches INVULNERABLE notification)
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    })
    const verticalBar = new THREE.Mesh(verticalGeometry, verticalMaterial)
    this.mesh.add(verticalBar)
    
    // Horizontal bar - RICH EMERALD!
    const horizontalGeometry = new THREE.BoxGeometry(0.56, 0.15, 0.06) // Scaled up
    const horizontalMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // BRIGHT GREEN cross (matches INVULNERABLE notification)
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    })
    const horizontalBar = new THREE.Mesh(horizontalGeometry, horizontalMaterial)
    this.mesh.add(horizontalBar)
    
    // 💚 BRIGHT INNER CROSS - Glowing center highlight! 💚
    const innerVerticalGeometry = new THREE.BoxGeometry(0.075, 0.44, 0.075) // Scaled up
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // BRIGHT GREEN inner (matches INVULNERABLE notification)
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    })
    const innerVertical = new THREE.Mesh(innerVerticalGeometry, innerMaterial)
    innerVertical.position.z = 0.01
    this.mesh.add(innerVertical)
    
    const innerHorizontalGeometry = new THREE.BoxGeometry(0.44, 0.075, 0.075) // Scaled up
    const innerHorizontal = new THREE.Mesh(innerHorizontalGeometry, innerMaterial.clone())
    innerHorizontal.position.z = 0.01
    this.mesh.add(innerHorizontal)
    
    // 💚 EMERALD WIREFRAME OUTLINE 💚
    const wireframeGeometry = new THREE.SphereGeometry(0.5, 12, 12) // Scaled up
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // BRIGHT GREEN wireframe (matches INVULNERABLE notification)
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial)
    this.mesh.add(wireframe)

    // 💫 ENERGY PARTICLES - 10 particles for more "fizz"! 💫
    for (let i = 0; i < 10; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.04, 6, 6) // Scaled up
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF00, // BRIGHT GREEN particles (matches INVULNERABLE notification)
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      const particle = new THREE.Mesh(particleGeometry, particleMaterial)
      const angle = (i / 10) * Math.PI * 2
      particle.position.set(
        Math.cos(angle) * 0.625, // Scaled up
        Math.sin(angle) * 0.625,
        0
      )
      this.mesh.add(particle)
    }
  }

  update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (!this.alive) return

    // 🧲 APPLY MAGNETISM - Pull towards player! 🧲
    if (playerPosition) {
      this.applyMagnetism(playerPosition, deltaTime)
    }

    // 💚 PULSING ANIMATION - Breathing effect! 💚
    this.pulseTime += deltaTime
    // More dramatic pulse when magnetized!
    const basePulse = this.isMagnetized ? 0.95 : 0.85
    const pulseAmount = this.isMagnetized ? 0.15 : 0.2
    const pulseSpeed = this.isMagnetized ? 10 : 5 // Faster for "fizz"
    const pulse = basePulse + Math.sin(this.pulseTime * pulseSpeed) * pulseAmount
    this.mesh.scale.setScalar(pulse)

    // 🌪️ GENTLE ROTATION (faster when magnetized) 🌪️
    const rotSpeed = this.isMagnetized ? this.rotationSpeed * 3 : this.rotationSpeed
    this.mesh.rotation.z += deltaTime * rotSpeed

    // 💚 ANIMATE EMERALD GLOW - Pulsing rich green aura! 💚
    if (this.glowMesh) {
      const glowMaterial = this.glowMesh.material as THREE.MeshBasicMaterial
      glowMaterial.opacity = 0.5 + Math.sin(this.pulseTime * 6) * 0.3 // Faster for "fizz"
      this.glowMesh.scale.setScalar(1 + Math.sin(this.pulseTime * 7) * 0.2)
      glowMaterial.color.setHex(0x00FF00) // Bright green (matches INVULNERABLE notification)
    }
    
    // Animate outer glow if it exists
    if (this.mesh.children.length > 1) {
      const outerGlow = this.mesh.children[1] as THREE.Mesh
      if (outerGlow && outerGlow !== this.glowMesh) {
        const outerGlowMaterial = outerGlow.material as THREE.MeshBasicMaterial
        outerGlowMaterial.opacity = 0.3 + Math.sin(this.pulseTime * 4) * 0.2
        outerGlow.scale.setScalar(1 + Math.sin(this.pulseTime * 5) * 0.3)
      }
    }
    
    // ✨ ANIMATE GREEN CROSS - Pulsing brightness! ✨
    // Vertical bar (index 2)
    if (this.mesh.children[2]) {
      const verticalBar = this.mesh.children[2] as THREE.Mesh
      const vertMaterial = verticalBar.material as THREE.MeshBasicMaterial
      vertMaterial.opacity = 0.8 + Math.sin(this.pulseTime * 7) * 0.2
    }
    // Horizontal bar (index 3)
    if (this.mesh.children[3]) {
      const horizontalBar = this.mesh.children[3] as THREE.Mesh
      const horizMaterial = horizontalBar.material as THREE.MeshBasicMaterial
      horizMaterial.opacity = 0.8 + Math.sin(this.pulseTime * 7 + 0.5) * 0.2
    }
    
    // ✨ ANIMATE PARTICLES - Orbiting particles (faster when magnetized)! ✨
    const orbitSpeed = this.isMagnetized ? 6 : 3 // Faster for "fizz"
    const particleStartIndex = 8
    const particleCount = 10
    for (let i = particleStartIndex; i < particleStartIndex + particleCount; i++) {
      const child = this.mesh.children[i]
      if (child instanceof THREE.Mesh) {
        const particleIndex = i - particleStartIndex
        const angle = (particleIndex / particleCount) * Math.PI * 2 + this.pulseTime * orbitSpeed
        const radius = 0.625 + Math.sin(this.pulseTime * 5 + particleIndex) * 0.12 // Scaled up
        child.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          Math.sin(this.pulseTime * 6 + particleIndex) * 0.1
        )
        const particleMaterial = child.material as THREE.MeshBasicMaterial
        particleMaterial.opacity = 0.6 + Math.sin(this.pulseTime * 8 + particleIndex) * 0.3
      }
    }
  }

  // 🧲 MAGNETISM - Suck pickup towards player when close! 🧲
  private applyMagnetism(playerPosition: THREE.Vector3, deltaTime: number): void {
    const toPlayer = playerPosition.clone().sub(this.position)
    const distance = toPlayer.length()
    
    if (distance < MedPack.MAGNET_RADIUS && distance > 0.1) {
      this.isMagnetized = true
      
      // Calculate attraction strength (stronger when closer)
      const normalizedDistance = distance / MedPack.MAGNET_RADIUS
      const attractionStrength = MedPack.MAGNET_STRENGTH * (1 - normalizedDistance * 0.5)
      
      // Apply acceleration towards player
      const direction = toPlayer.normalize()
      this.velocity.add(direction.multiplyScalar(attractionStrength * deltaTime))
      
      // Clamp velocity
      if (this.velocity.length() > MedPack.MAX_MAGNET_SPEED) {
        this.velocity.normalize().multiplyScalar(MedPack.MAX_MAGNET_SPEED)
      }
      
      // Update position
      this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
      this.mesh.position.copy(this.position)
    } else {
      this.isMagnetized = false
      // Slow down when not magnetized
      this.velocity.multiplyScalar(0.9)
    }
  }

  collect(): void {
    this.alive = false
    
    // Create collection effect
    if (this.effectsSystem) {
      // Health restoration effect - bright green explosion
      this.effectsSystem.createExplosion(
        this.position, 
        1.2, 
        new THREE.Color().setHSL(0.33, 1.0, 0.5) // Green
      )
      
      // Sparkle effect
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 2
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 1
        )
        const sparkleColor = new THREE.Color().setHSL(0.33, 1.0, 0.7) // Bright green
        this.effectsSystem.createSparkle(this.position, velocity, sparkleColor, 0.8)
      }
    }
  }

  destroy(): void {
    this.alive = false
  }

  // Collision detection
  isCollidingWith(other: { getPosition(): THREE.Vector3, getRadius(): number }): boolean {
    const distance = this.position.distanceTo(other.getPosition())
    return distance < (this.radius + other.getRadius())
  }

  // Getters
  getMesh(): THREE.Mesh {
    return this.mesh
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone()
  }

  getRadius(): number {
    return this.radius
  }

  isAlive(): boolean {
    return this.alive
  }
  
  getHealthRestore(): number {
    return this.healthRestore
  }

  setEffectsSystem(effectsSystem: EffectsSystem): void {
    this.effectsSystem = effectsSystem
  }
}
