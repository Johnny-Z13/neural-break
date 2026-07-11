import * as THREE from 'three'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { ENTITY_PALETTE } from '../config/palette.config'
import { outlinePolygon, starPolygon } from '../graphics/VectorShapes'

export class PowerUp {
  private mesh!: THREE.Mesh
  private position: THREE.Vector3
  private radius: number = 0.5 // Increased by 25% from 0.4
  private alive: boolean = true
  private effectsSystem: EffectsSystem | null = null
  private pulseTime: number = 0
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
    // 🔷 POWER-UP - ONE EMERALD STAR! 🔷
    // Transparent container
    const containerGeometry = new THREE.CircleGeometry(0.125, 8) // Scaled up
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)

    const star = outlinePolygon(starPolygon(4, 0.5, 0.2), 0.07, ENTITY_PALETTE.PICKUP_EMERALD)
    this.mesh.add(star)
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

    // Idle rotation animation
    this.mesh.rotation.z += deltaTime * 1.5

    // Create particle trail effect
    this.updateTrail(deltaTime)
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
    // Dispose geometries and materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
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
