import * as THREE from 'three'
import { EffectsSystem } from '../graphics/EffectsSystem'

export class PowerUp {
  private mesh!: THREE.Mesh
  private position: THREE.Vector3
  private radius: number = 0.5 // Increased by 25% from 0.4
  private alive: boolean = true
  private effectsSystem: EffectsSystem | null = null
  private pulseTime: number = 0
  private rotationSpeed: number = 3.5 // Faster rotation for "fizz"
  private trailTimer: number = 0
  private trailInterval: number = 0.07 // Faster trail for "fizz"

  // 🧲 MAGNETISM SYSTEM 🧲
  private static readonly MAGNET_RADIUS = 4.0        // Distance at which magnetism kicks in
  private static readonly MAGNET_STRENGTH = 12.0     // Acceleration towards player
  private static readonly MAX_MAGNET_SPEED = 18.0    // Max speed when being pulled
  private velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private isMagnetized: boolean = false

  constructor(x: number, y: number) {
    this.position = new THREE.Vector3(x, y, 0)
    this.createMesh()
  }

  private createMesh(): void {
    // 🔷 POWER-UP - DEEP EMERALD/FOREST GREEN with 'P' letter! 🔷
    // Create base container
    const containerGeometry = new THREE.CircleGeometry(0.125, 8) // Scaled up
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)

    // 💚 DEEP EMERALD GLOWING BASE 💚
    const glowGeometry = new THREE.CircleGeometry(0.56, 32) // Scaled up from 0.45
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00AA44, // DEEP EMERALD GREEN - distinct from bright green enemies
      transparent: true,
      opacity: 0.9, // More opaque for stronger glow
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.z = -0.01
    this.mesh.add(glow)

    // 💫 OUTER GLOW RING - FOREST GREEN 💫
    const outerRingGeometry = new THREE.RingGeometry(0.625, 0.81, 32) // Scaled up from 0.5, 0.65
    const outerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x009933, // FOREST GREEN for outer ring - darker, more distinct
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial)
    this.mesh.add(outerRing)

    // 🟢 INNER RING - VIBRANT JADE GREEN 🟢
    const innerRingGeometry = new THREE.RingGeometry(0.44, 0.525, 32) // Scaled up from 0.35, 0.42
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00DD55, // JADE GREEN - brighter accent
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial)
    this.mesh.add(innerRing)
    
    // ✨ 'P' LETTER - WEAPON POWER! ✨
    this.createLetterP()
    
    // 💫 ENERGY PARTICLES - Deep emerald/jade tones! 💫
    for (let i = 0; i < 12; i++) {
      const particleGeometry = new THREE.CircleGeometry(0.06, 8) // Slightly larger, more segments
      // Alternate between deep emerald and jade green
      const particleColor = i % 2 === 0 ? 0x00AA44 : 0x00DD55
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: particleColor, // DEEP EMERALD or JADE GREEN alternating
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      })
      const particle = new THREE.Mesh(particleGeometry, particleMaterial)
      const angle = (i / 12) * Math.PI * 2
      particle.position.set(
        Math.cos(angle) * 0.7, // Scaled up
        Math.sin(angle) * 0.7,
        0
      )
      this.mesh.add(particle)
    }
  }

  private createLetterP(): void {
    // Create 'P' shape using box geometries
    const letterColor = 0xFFFFFF // Bright white letter for maximum contrast against deep green
    const letterMaterial = new THREE.MeshBasicMaterial({
      color: letterColor,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    })
    
    // Create a group for the letter - SCALED UP
    const letterGroup = new THREE.Group()
    letterGroup.scale.setScalar(1.25)
    
    // Vertical bar of P
    const verticalGeometry = new THREE.BoxGeometry(0.08, 0.4, 0.01)
    const verticalBar = new THREE.Mesh(verticalGeometry, letterMaterial.clone())
    verticalBar.position.set(-0.06, -0.02, 0.02)
    letterGroup.add(verticalBar)
    
    // Top horizontal bar of P
    const topBarGeometry = new THREE.BoxGeometry(0.18, 0.08, 0.01)
    const topBar = new THREE.Mesh(topBarGeometry, letterMaterial.clone())
    topBar.position.set(0.03, 0.14, 0.02)
    letterGroup.add(topBar)
    
    // Middle horizontal bar of P
    const midBarGeometry = new THREE.BoxGeometry(0.18, 0.08, 0.01)
    const midBar = new THREE.Mesh(midBarGeometry, letterMaterial.clone())
    midBar.position.set(0.03, 0.0, 0.02)
    letterGroup.add(midBar)
    
    // Right curved part of P (simplified as vertical bar)
    const rightBarGeometry = new THREE.BoxGeometry(0.08, 0.22, 0.01)
    const rightBar = new THREE.Mesh(rightBarGeometry, letterMaterial.clone())
    rightBar.position.set(0.12, 0.07, 0.02)
    letterGroup.add(rightBar)
    
    this.mesh.add(letterGroup)
  }

  update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    if (!this.alive) return

    // 🧲 APPLY MAGNETISM - Pull towards player! 🧲
    if (playerPosition) {
      this.applyMagnetism(playerPosition, deltaTime)
    }

    // 💠 DRAMATIC PULSING ANIMATION 💠
    this.pulseTime += deltaTime
    // More dramatic pulse when magnetized!
    const basePulse = this.isMagnetized ? 0.95 : 0.85
    const pulseAmount = this.isMagnetized ? 0.15 : 0.2
    const pulseSpeed = this.isMagnetized ? 12 : 6 // Faster for "fizz"
    const pulse = basePulse + Math.sin(this.pulseTime * pulseSpeed) * pulseAmount
    this.mesh.scale.setScalar(pulse)

    // Gentle rotation animation
    this.mesh.rotation.z += deltaTime * this.rotationSpeed

    // ✨ ANIMATE PARTICLES - Orbiting with lighter green glow! ✨
    const children = this.mesh.children
    const particleCount = 12
    for (let i = 4; i < 4 + particleCount; i++) { // Skip glow, rings, and letter group
      const child = children[i]
      if (child instanceof THREE.Mesh) {
        const particleIndex = i - 4
        const angle = ((particleIndex) / particleCount) * Math.PI * 2 + this.pulseTime * 4 // Faster "fizz"
        const radius = 0.7 + Math.sin(this.pulseTime * 5 + particleIndex) * 0.15 // Scaled up
        child.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        )
        const particleMaterial = child.material as THREE.MeshBasicMaterial
        // All particles have the same bright green with varied opacity
        const baseOpacity = 0.75
        particleMaterial.opacity = baseOpacity + Math.sin(this.pulseTime * 7 + particleIndex) * 0.2
      }
    }

    // Update glow and ring pulsing
    this.updateGlowEffects()

    // Create particle trail effect
    this.updateTrail(deltaTime)
  }

  private updateGlowEffects(): void {
    const time = this.pulseTime
    
    // Update main glow - More dramatic pulsing for vibrant look
    if (this.mesh.children[0]) {
      const glow = this.mesh.children[0] as THREE.Mesh
      const glowMaterial = glow.material as THREE.MeshBasicMaterial
      glowMaterial.opacity = 0.6 + Math.sin(time * 4) * 0.25 // Stronger opacity pulse
      glow.scale.setScalar(1 + Math.sin(time * 5) * 0.2) // More dramatic scale
    }
    
    // Update outer ring - Lighter green with gentle pulse
    if (this.mesh.children[1]) {
      const outerRing = this.mesh.children[1] as THREE.Mesh
      const outerRingMaterial = outerRing.material as THREE.MeshBasicMaterial
      outerRingMaterial.opacity = 0.75 + Math.sin(time * 3) * 0.2
      outerRing.scale.setScalar(1 + Math.sin(time * 4) * 0.12)
    }
    
    // Update inner ring - Vibrant deep green with subtle pulse
    if (this.mesh.children[2]) {
      const innerRing = this.mesh.children[2] as THREE.Mesh
      const innerRingMaterial = innerRing.material as THREE.MeshBasicMaterial
      innerRingMaterial.opacity = 0.85 + Math.sin(time * 5) * 0.15
    }
  }

  private updateTrail(deltaTime: number): void {
    if (!this.effectsSystem) return

    this.trailTimer += deltaTime
    // Faster trail when magnetized!
    const interval = this.isMagnetized ? this.trailInterval * 0.5 : this.trailInterval
    if (this.trailTimer >= interval) {
      // Create sparkle particles - DEEP EMERALD/JADE colors
      const sparkleVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3
      )

      // Deep emerald to jade green sparkles - more saturated and darker
      const sparkleColor = new THREE.Color().setHSL(
        0.38 + Math.sin(this.pulseTime * 3) * 0.02, // Emerald/jade hue range
        0.85, // High saturation
        0.45 + Math.random() * 0.15 // Darker, varied brightness for depth
      )

      this.effectsSystem.createSparkle(this.position, sparkleVelocity, sparkleColor, 0.6)

      this.trailTimer = 0
    }
  }

  // 🧲 MAGNETISM - Suck pickup towards player when close! 🧲
  private applyMagnetism(playerPosition: THREE.Vector3, deltaTime: number): void {
    const toPlayer = playerPosition.clone().sub(this.position)
    const distance = toPlayer.length()
    
    if (distance < PowerUp.MAGNET_RADIUS && distance > 0.1) {
      this.isMagnetized = true
      
      // Calculate attraction strength (stronger when closer)
      const normalizedDistance = distance / PowerUp.MAGNET_RADIUS
      const attractionStrength = PowerUp.MAGNET_STRENGTH * (1 - normalizedDistance * 0.5)
      
      // Apply acceleration towards player
      const direction = toPlayer.normalize()
      this.velocity.add(direction.multiplyScalar(attractionStrength * deltaTime))
      
      // Clamp velocity
      if (this.velocity.length() > PowerUp.MAX_MAGNET_SPEED) {
        this.velocity.normalize().multiplyScalar(PowerUp.MAX_MAGNET_SPEED)
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

    // Create collection effect - DEEP EMERALD EXPLOSION!
    if (this.effectsSystem) {
      // Deep emerald explosion effect with multiple bursts
      this.effectsSystem.createExplosion(this.position, 1.8, new THREE.Color(0x00AA44)) // Deep emerald
      this.effectsSystem.createExplosion(this.position, 1.2, new THREE.Color(0x00DD55)) // Jade green
      this.effectsSystem.createExplosion(this.position, 0.8, new THREE.Color(0x009933)) // Forest green

      // Electric burst with deep emerald tint
      this.effectsSystem.createElectricDeath(this.position)
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

  setEffectsSystem(effectsSystem: EffectsSystem): void {
    this.effectsSystem = effectsSystem
  }
}
