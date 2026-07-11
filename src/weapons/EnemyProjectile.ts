import * as THREE from 'three'
import { EffectsSystem } from '../graphics/EffectsSystem'

/**
 * Enemy Projectile - Red/orange projectiles fired by enemies
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
  private trailTimer: number = 0
  private trailInterval: number = 0.05
  private color: number
  private emissiveColor: number
  private glowIntensity: number

  constructor(
    startPos: THREE.Vector3, 
    direction: THREE.Vector3, 
    speed: number, 
    damage: number,
    sizeMultiplier: number = 1.0,
    color: number = 0xFF4400,
    emissiveColor: number = 0xFF2200,
    glowIntensity: number = 0.4
  ) {
    this.position = startPos.clone()
    this.velocity = direction.normalize().multiplyScalar(speed)
    this.damage = damage
    this.radius = this.radius * sizeMultiplier
    this.color = color
    this.emissiveColor = emissiveColor
    this.glowIntensity = glowIntensity
    
    this.createMesh()
  }

  private createMesh(): void {
    // 🔴 ENEMY PROJECTILE - RED/ORANGE DANGER COLOR! 🔴
    // Using lower poly count for performance (was 12,12)
    const geometry = new THREE.SphereGeometry(this.radius, 8, 6)
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.95
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.copy(this.position)
    
    // 🔥 OUTER GLOW - Danger aura! (optimized low-poly)
    const glowGeometry = new THREE.SphereGeometry(this.radius * 1.5, 6, 4)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.emissiveColor,
      transparent: true,
      opacity: this.glowIntensity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    this.mesh.add(glow)
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

    // Create trail effects
    this.updateTrail(deltaTime)

    // Update visuals
    this.updateVisuals(deltaTime)
  }

  private updateTrail(deltaTime: number): void {
    if (!this.effectsSystem) return

    this.trailTimer += deltaTime
    if (this.trailTimer >= this.trailInterval) {
      const trailVelocity = this.velocity.clone().multiplyScalar(-0.2)
      const trailColor = new THREE.Color(this.color)
      this.effectsSystem.createSparkle(this.position, trailVelocity, trailColor, 0.3)
      this.trailTimer = 0
    }
  }

  private updateVisuals(deltaTime: number): void {
    // Rotate projectile
    this.mesh.rotation.x += deltaTime * 5
    this.mesh.rotation.y += deltaTime * 3

    // Pulsing glow
    const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 1
    if (this.mesh.children[0]) {
      const glow = this.mesh.children[0] as THREE.Mesh
      glow.scale.setScalar(pulse)
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

