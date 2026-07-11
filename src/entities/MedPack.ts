import * as THREE from 'three'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { BALANCE_CONFIG } from '../config'
import { ENTITY_PALETTE } from '../config/palette.config'
import { tracerQuad } from '../graphics/VectorShapes'

export class MedPack {
  private mesh!: THREE.Mesh
  private position: THREE.Vector3
  private radius: number = 0.5 // Increased by 25% from 0.4
  private alive: boolean = true
  private effectsSystem: EffectsSystem | null = null
  private pulseTime: number = 0
  private healthRestore: number = BALANCE_CONFIG.PICKUPS.MED_PACK.HEAL_AMOUNT

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
    // 💚 HEALTH PACK - ONE SOLID GREEN CROSS! 💚
    // Transparent container
    const containerGeometry = new THREE.SphereGeometry(0.125, 4, 4) // Scaled up
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)

    // Solid green cross - two stacked bars
    const verticalBar = tracerQuad(0.16, 0.6, ENTITY_PALETTE.PICKUP_MEDPACK)
    this.mesh.add(verticalBar)

    const horizontalBar = tracerQuad(0.16, 0.6, ENTITY_PALETTE.PICKUP_MEDPACK)
    horizontalBar.rotation.z = Math.PI / 2
    this.mesh.add(horizontalBar)
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

    // 🌪️ IDLE ROTATION 🌪️
    this.mesh.rotation.z += deltaTime * 1.5
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
  
  getHealthRestore(): number {
    return this.healthRestore
  }

  setEffectsSystem(effectsSystem: EffectsSystem): void {
    this.effectsSystem = effectsSystem
  }
}
