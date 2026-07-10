import * as THREE from 'three'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { WeaponType } from './WeaponSystem'

export class Projectile {
  private mesh!: THREE.Mesh
  private position: THREE.Vector3
  private velocity: THREE.Vector3
  private damage: number
  private lifeTime: number = 3.0 // 3 seconds max life
  private baseRadius: number = 0.05
  private radius: number = 0.05
  private alive: boolean = true
  private effectsSystem: EffectsSystem | null = null
  private trailTimer: number = 0
  private trailInterval: number = 0.05 // Trail every 50ms - optimized for performance
  private weaponType: WeaponType = WeaponType.BULLETS
  private powerLevel: number = 0 // Track power level for VFX scaling

  constructor(startPos: THREE.Vector3, direction: THREE.Vector3, speed: number, damage: number, sizeMultiplier: number = 1.0, weaponType: WeaponType = WeaponType.BULLETS, powerLevel: number = 0) {
    this.position = startPos.clone()
    this.velocity = direction.normalize().multiplyScalar(speed)
    this.damage = damage
    this.powerLevel = powerLevel

    // 🔥 SCALE BASE RADIUS WITH POWER LEVEL (reduced for balance)! 🔥
    // Power level 0 = normal, Power level 10 = noticeably bigger but not overwhelming
    this.baseRadius = 0.05 + powerLevel * 0.006 // Smaller base scaling
    this.radius = this.baseRadius * sizeMultiplier * (1 + powerLevel * 0.06) // Reduced extra scaling
    this.weaponType = weaponType
    
    this.createMesh()
  }

  private createMesh(): void {
    // 🎯 WEAPON TYPE-SPECIFIC VISUALS - NOW WITH POWER SCALING! 🎯
    let color: number
    let geometry: THREE.BufferGeometry
    
    // 🔥 Higher power = more geometry detail for extra juiciness!
    // OPTIMIZED: Capped at 12 instead of 24 for better performance
    const geometryDetail = Math.min(6 + Math.floor(this.powerLevel * 0.6), 12)
    
    switch (this.weaponType) {
      case WeaponType.BULLETS:
        // Yellow/orange bullets - brighter at higher power
        color = this.powerLevel >= 5 ? 0xFFDD00 : 0xFFAA00
        geometry = new THREE.SphereGeometry(this.radius, geometryDetail, geometryDetail)
        break
      case WeaponType.LASERS:
        // Red/pink lasers - more intense pink at high power
        color = this.powerLevel >= 5 ? 0xFF3399 : 0xFF0066
        // Lasers get LONGER at higher power levels!
        const laserLength = this.radius * 2 * (1 + this.powerLevel * 0.2)
        geometry = new THREE.CylinderGeometry(this.radius * 0.5, this.radius * 0.5, laserLength, geometryDetail)
        break
      case WeaponType.PHOTONS:
        // Blue/cyan photons - more electric at high power
        color = this.powerLevel >= 5 ? 0x66FFFF : 0x00FFFF
        // Higher detail octahedron at higher power
        const octDetail = Math.min(Math.floor(this.powerLevel / 3), 2)
        geometry = new THREE.OctahedronGeometry(this.radius, octDetail)
        break
      default:
        color = 0x00FFFF
        geometry = new THREE.SphereGeometry(this.radius, geometryDetail, geometryDetail)
    }
    
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.copy(this.position)

    // Add multiple glow layers for extra juice - MORE layers at higher power!
    this.createGlowLayers()
  }

  private createGlowLayers(): void {
    // 🎯 PERFORMANCE-OPTIMIZED GLOW - Single glow layer only! 🎯
    // Using ONE glow mesh instead of 3-6 to prevent FPS drops at high fire rates
    
    let glowColor: number
    
    switch (this.weaponType) {
      case WeaponType.BULLETS:
        glowColor = this.powerLevel >= 5 ? 0xFFCC00 : 0xFFAA00
        break
      case WeaponType.LASERS:
        glowColor = this.powerLevel >= 5 ? 0xFF55AA : 0xFF3399
        break
      case WeaponType.PHOTONS:
        glowColor = this.powerLevel >= 5 ? 0x55CCFF : 0x00AAFF
        break
      default:
        glowColor = 0x00AAFF
    }
    
    // Single glow layer - scales slightly with power but stays performant
    const glowScale = 1 + this.powerLevel * 0.04
    const glowGeometry = new THREE.SphereGeometry(this.radius * 1.4 * glowScale, 6, 6)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.35 + this.powerLevel * 0.02,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    this.mesh.add(glow)
  }

  update(deltaTime: number): void {
    if (!this.alive) return

    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    this.mesh.position.copy(this.position)
    
    // Create trail effect with new effects system
    this.updateTrail(deltaTime)

    // Update lifetime
    this.lifeTime -= deltaTime
    if (this.lifeTime <= 0) {
      this.alive = false
    }

    // Fade out as lifetime decreases
    const material = this.mesh.material as THREE.MeshBasicMaterial
    material.opacity = Math.max(0.2, this.lifeTime / 3.0)
    
    // Update glow layers
    this.updateGlowLayers()

    // 🔥 SUPER JUICY visual effects - MORE DRAMATIC AT HIGH POWER! 🔥
    const rotationSpeed = 1 + this.powerLevel * 0.3 // Faster spin at higher power
    this.mesh.rotation.x += deltaTime * 15 * rotationSpeed
    this.mesh.rotation.y += deltaTime * 20 * rotationSpeed
    this.mesh.rotation.z += deltaTime * 10 * rotationSpeed
    
    // 🔥 Pulsing effect - MORE INTENSE AT HIGH POWER! 🔥
    const pulseIntensity = 0.2 + this.powerLevel * 0.05 // Up to 0.7 pulse range at max power
    const pulseSpeed = 0.02 + this.powerLevel * 0.003 // Faster pulsing at high power
    const pulse = 1 + Math.sin(Date.now() * pulseSpeed) * pulseIntensity
    this.mesh.scale.setScalar(pulse)
  }
  
  private updateTrail(deltaTime: number): void {
    if (!this.effectsSystem) return
    
    this.trailTimer += deltaTime
    
    // 🎯 PERFORMANCE-OPTIMIZED: Fixed interval, no scaling that increases particle spam
    // Higher power = slightly longer interval to prevent FPS drops
    const scaledInterval = this.trailInterval * (1 + this.powerLevel * 0.02)
    
    if (this.trailTimer >= scaledInterval) {
      // Create power-scaled trail (capped internally for performance)
      this.effectsSystem.createPowerScaledProjectileTrail(
        this.position, 
        this.velocity, 
        this.powerLevel,
        this.weaponType
      )
      
      // REMOVED: Extra sparkle effects that caused FPS drops at high power
      
      this.trailTimer = 0
    }
  }
  
  private updateGlowLayers(): void {
    // 🎯 SIMPLIFIED GLOW ANIMATION - Less CPU overhead! 🎯
    if (this.mesh.children.length >= 1) {
      const glow = this.mesh.children[0] as THREE.Mesh
      const glowMaterial = glow.material as THREE.MeshBasicMaterial
      
      // Simple pulse using cheaper time calculation
      const pulse = 0.9 + Math.sin(this.lifeTime * 12) * 0.1
      glowMaterial.opacity = (0.35 + this.powerLevel * 0.02) * pulse
    }
  }

  destroy(): void {
    this.alive = false
    
    // Create impact effect when projectile is destroyed by collision
    if (this.effectsSystem) {
      this.effectsSystem.createWeaponImpact(this.position)
    }
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

  getDamage(): number {
    return this.damage
  }

  getRadius(): number {
    return this.radius
  }

  isAlive(): boolean {
    return this.alive
  }
  
  // 🎆 SET EFFECTS SYSTEM FOR SUPER JUICY EFFECTS! 🎆
  setEffectsSystem(effectsSystem: EffectsSystem): void {
    this.effectsSystem = effectsSystem
  }
}
