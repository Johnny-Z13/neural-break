import * as THREE from 'three'

/**
 * Base particle class for all particle effects
 */
export class Particle {
  active: boolean = false
  position: THREE.Vector3 = new THREE.Vector3()
  velocity: THREE.Vector3 = new THREE.Vector3()
  color: THREE.Color = new THREE.Color()
  life: number = 0
  maxLife: number = 1
  size: number = 1
  opacity: number = 1
  gravity: number = -2

  reset(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    this.active = true
    this.position.copy(position)
    this.velocity.copy(velocity)
    this.color.copy(color)
    this.life = life
    this.maxLife = life
    this.size = 1
    this.opacity = 1
  }

  update(deltaTime: number): void {
    if (!this.active) return
    
    this.life -= deltaTime
    
    if (this.life <= 0) {
      this.active = false
      return
    }
    
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    
    // Apply gravity
    this.velocity.z += this.gravity * deltaTime
    
    // Apply drag
    this.velocity.multiplyScalar(0.98)
    
    // Update opacity based on life
    this.opacity = this.life / this.maxLife
  }
}

/**
 * Base effect class for complex effects
 */
export abstract class Effect {
  protected alive: boolean = true
  protected duration: number
  protected elapsed: number = 0

  constructor(duration: number) {
    this.duration = duration
  }

  abstract update(deltaTime: number): void

  isAlive(): boolean {
    return this.alive && this.elapsed < this.duration
  }
}

/**
 * Particle Pool for efficient particle management
 */
export class ParticlePool {
  private particles: Particle[] = []
  private particleSystem: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private activeCount: number = 0
  private poolSize: number
  private colorIntensity: number

  constructor(poolSize: number, effectType: string) {
    this.poolSize = poolSize
    this.colorIntensity = this.getColorIntensity(effectType)
    
    // Initialize geometry
    this.positions = new Float32Array(poolSize * 3)
    this.colors = new Float32Array(poolSize * 3)
    this.sizes = new Float32Array(poolSize)
    
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    
    // Create material based on effect type
    // 🔥 HIGHER OPACITY for more emissive/visible particles!
    this.material = new THREE.PointsMaterial({
      size: this.getBaseSize(effectType),
      vertexColors: true,
      transparent: true,
      opacity: this.getBaseOpacity(effectType),
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
    })
    
    this.particleSystem = new THREE.Points(this.geometry, this.material)
    // Particle vertices move independently across the arena, so the geometry's
    // initial bounds at the origin are not meaningful for culling.
    this.particleSystem.frustumCulled = false
    this.geometry.setDrawRange(0, 0)
    
    // Initialize particles
    for (let i = 0; i < poolSize; i++) {
      this.particles.push(new Particle())
    }
  }
  
  private getBaseSize(effectType: string): number {
    // 🔥 BIGGER, MORE VISIBLE PARTICLES! (explosion/death 2x for player death visibility) 🔥
    switch (effectType) {
      case 'explosion': return 1.26 // Tiny lift while keeping the pixel-scale burst
      case 'spark': return 0.35
      case 'trail': return 0.2
      case 'death': return 1.7      // Slightly clearer enemy-death fragments
      case 'impact': return 0.4
      case 'electric': return 0.5
      default: return 0.4
    }
  }

  private getBaseOpacity(effectType: string): number {
    if (effectType === 'death') return 0.82
    if (effectType === 'explosion') return 0.8
    return 0.75
  }

  private getColorIntensity(effectType: string): number {
    if (effectType === 'death') return 1.12
    if (effectType === 'explosion') return 1.08
    return 1
  }

  emit(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    // Find inactive particle - limit search to prevent performance issues
    const maxSearch = Math.min(this.poolSize, this.activeCount + 50)
    for (let i = 0; i < maxSearch; i++) {
      if (!this.particles[i].active) {
        this.particles[i].reset(position, velocity, color, life)
        if (i >= this.activeCount) {
          this.activeCount = i + 1
        }
        this.syncParticleToGeometry(i)
        return // Exit early when found
      }
    }
    // If pool is exhausted, silently fail (don't spawn particle)
  }

  /**
   * Make a newly emitted particle drawable in the current frame. Effects are
   * commonly emitted after the normal pool update (for example on collision),
   * so waiting for the following frame can lose short-lived/cold-start bursts.
   */
  private syncParticleToGeometry(index: number): void {
    const particle = this.particles[index]
    const i3 = index * 3

    this.positions[i3] = particle.position.x
    this.positions[i3 + 1] = particle.position.y
    this.positions[i3 + 2] = particle.position.z
    this.colors[i3] = particle.color.r * this.colorIntensity
    this.colors[i3 + 1] = particle.color.g * this.colorIntensity
    this.colors[i3 + 2] = particle.color.b * this.colorIntensity
    this.sizes[index] = particle.size

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.setDrawRange(0, this.activeCount)
  }

  update(deltaTime: number): void {
    let newActiveCount = 0
    
    for (let i = 0; i < this.activeCount; i++) {
      const particle = this.particles[i]
      
      if (particle.active) {
        particle.update(deltaTime)

        if (!particle.active) {
          this.sizes[i] = 0
          continue
        }
        
        const i3 = i * 3
        this.positions[i3] = particle.position.x
        this.positions[i3 + 1] = particle.position.y
        this.positions[i3 + 2] = particle.position.z

        // PointsMaterial has one shared alpha, so fade each particle through
        // its vertex colour. Smoothstep removes the bright final-frame pop.
        const fade = particle.opacity * particle.opacity * (3 - 2 * particle.opacity)
        const intensity = this.colorIntensity * fade
        this.colors[i3] = particle.color.r * intensity
        this.colors[i3 + 1] = particle.color.g * intensity
        this.colors[i3 + 2] = particle.color.b * intensity
        
        this.sizes[i] = particle.size * particle.opacity
        
        newActiveCount = Math.max(newActiveCount, i + 1)
      } else {
        // Hide inactive particles
        this.sizes[i] = 0
      }
    }
    
    this.activeCount = newActiveCount
    
    // Update geometry
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    
    // Update draw range for performance
    this.geometry.setDrawRange(0, this.activeCount)
  }

  getParticleSystem(): THREE.Points {
    return this.particleSystem
  }

  reset(): void {
    for (const particle of this.particles) {
      particle.active = false
      particle.life = 0
    }

    this.activeCount = 0
    this.positions.fill(0)
    this.colors.fill(0)
    this.sizes.fill(0)
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.setDrawRange(0, 0)
  }
}
