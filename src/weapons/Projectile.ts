import * as THREE from 'three'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { WeaponType } from './WeaponSystem'
import { tracerQuad } from '../graphics/VectorShapes'
import { ENTITY_PALETTE } from '../config/palette.config'

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
  private weaponType: WeaponType = WeaponType.BULLETS

  constructor(startPos: THREE.Vector3, direction: THREE.Vector3, speed: number, damage: number, sizeMultiplier: number = 1.0, weaponType: WeaponType = WeaponType.BULLETS, powerLevel: number = 0) {
    this.position = startPos.clone()
    this.velocity = direction.normalize().multiplyScalar(speed)
    this.damage = damage

    // 🔥 SCALE BASE RADIUS WITH POWER LEVEL (reduced for balance)! 🔥
    // Power level 0 = normal, Power level 10 = noticeably bigger but not overwhelming
    this.baseRadius = 0.05 + powerLevel * 0.006 // Smaller base scaling
    this.radius = this.baseRadius * sizeMultiplier * (1 + powerLevel * 0.06) // Reduced extra scaling
    this.weaponType = weaponType
    
    this.createMesh()
  }

  private createMesh(): void {
    const length = this.weaponType === WeaponType.LASERS ? this.radius * 14 : this.radius * 8
    const width = Math.max(0.06, this.radius * 0.9)
    this.mesh = tracerQuad(width, length, ENTITY_PALETTE.PLAYER_TRACER)
    this.mesh.position.copy(this.position)
    this.mesh.rotation.z = Math.atan2(this.velocity.y, this.velocity.x) - Math.PI / 2
  }

  update(deltaTime: number): void {
    if (!this.alive) return

    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    this.mesh.position.copy(this.position)

    // Update lifetime
    this.lifeTime -= deltaTime
    if (this.lifeTime <= 0) {
      this.alive = false
    }

    // Fade out as lifetime decreases
    const material = this.mesh.material as THREE.MeshBasicMaterial
    material.opacity = Math.max(0.2, this.lifeTime / 3.0)
  }

  destroy(): void {
    this.alive = false

    // Create impact effect when projectile is destroyed by collision
    if (this.effectsSystem) {
      this.effectsSystem.createWeaponImpact(this.position)
    }
  }

  // 🧹 DISPOSE GPU RESOURCES - call after removing the mesh from the scene! 🧹
  dispose(): void {
    this.mesh.traverse((child) => {
      const m = child as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      if (m.material) {
        (Array.isArray(m.material) ? m.material : [m.material]).forEach(mat => mat.dispose())
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
