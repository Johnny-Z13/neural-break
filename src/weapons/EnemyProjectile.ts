import * as THREE from 'three'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { tracerQuad } from '../graphics/VectorShapes'

/**
 * Enemy Projectile - owner-colored tracer fired by enemies
 */
export class EnemyProjectile {
  private mesh!: THREE.Mesh
  private position: THREE.Vector3
  private velocity: THREE.Vector3
  private damage: number
  private lifeTime: number = 5.0 // 5 seconds max life
  private radius: number = 0.16 // 2x larger (was 0.08)
  private alive: boolean = true
  private effectsSystem: EffectsSystem | null = null
  private color: number

  constructor(
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    sizeMultiplier: number = 1.0,
    color: number = 0xFF4400,
    _emissiveColor: number = 0xFF2200,
    _glowIntensity: number = 0.4
  ) {
    this.position = startPos.clone()
    this.velocity = direction.normalize().multiplyScalar(speed)
    this.damage = damage
    this.radius = this.radius * sizeMultiplier
    this.color = color

    this.createMesh()
  }

  private createMesh(): void {
    this.mesh = tracerQuad(Math.max(0.08, this.radius), this.radius * 6, this.color)
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
      this.destroy()
    }
  }

  destroy(): void {
    this.alive = false
    
    // Create destruction effect
    if (this.effectsSystem) {
      this.effectsSystem.createExplosion(this.position, 0.5, new THREE.Color(this.color))
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

  isCollidingWith(other: { getPosition(): THREE.Vector3, getRadius(): number }): boolean {
    const distance = this.position.distanceTo(other.getPosition())
    return distance < (this.radius + other.getRadius())
  }

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

  setEffectsSystem(effectsSystem: EffectsSystem): void {
    this.effectsSystem = effectsSystem
  }
}

