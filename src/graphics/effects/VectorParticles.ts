import * as THREE from 'three'
import { Particle } from './ParticlePool'

/**
 * Vector particle class - extends regular particle with rotation and shape type
 */
export class VectorParticle extends Particle {
  rotation: number = 0
  rotationSpeed: number = 0
  shapeType: number = 0 // 0=triangle, 1=line, 2=square

  reset(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number, shapeType: number = 0): void {
    super.reset(position, velocity, color, life)
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 10 // Rotation speed
    this.shapeType = shapeType
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    this.rotation += this.rotationSpeed * deltaTime
  }
}

/**
 * 🎮 VECTOR PARTICLE POOL - ASTEROIDS STYLE! 🎮
 * Renders geometric shapes (triangles, lines, squares) like classic vector graphics
 */
export class VectorParticlePool {
  private particles: VectorParticle[] = []
  private lineSystem: THREE.LineSegments
  private lineGeometry: THREE.BufferGeometry
  private lineMaterial: THREE.LineBasicMaterial
  private positions: Float32Array
  private colors: Float32Array
  private activeCount: number = 0
  private poolSize: number

  constructor(poolSize: number) {
    this.poolSize = poolSize
    
    // Initialize geometry for line segments (each particle = 2 points for a line)
    // For triangles: 3 points, for squares: 4 points
    // We'll use line segments and dynamically create shapes
    this.positions = new Float32Array(poolSize * 6) // 2 points per line * 3 coords
    this.colors = new Float32Array(poolSize * 6) // 2 points per line * 3 colors
    
    this.lineGeometry = new THREE.BufferGeometry()
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    
    // NOTE: Lower opacity (0.6) prevents additive blending from causing white-out
    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
      blending: THREE.AdditiveBlending
    })
    
    this.lineSystem = new THREE.LineSegments(this.lineGeometry, this.lineMaterial)
    this.lineSystem.frustumCulled = false
    this.lineGeometry.setDrawRange(0, 0)
    
    // Initialize particles
    for (let i = 0; i < poolSize; i++) {
      this.particles.push(new VectorParticle())
    }
  }

  emit(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number, shapeType: number = 0): void {
    // Find inactive particle - limit search to prevent performance issues
    const maxSearch = Math.min(this.poolSize, this.activeCount + 50)
    for (let i = 0; i < maxSearch; i++) {
      if (!this.particles[i].active) {
        this.particles[i].reset(position, velocity, color, life, shapeType)
        if (i >= this.activeCount) {
          this.activeCount = i + 1
        }
        this.syncParticleToGeometry(i)
        return // Exit early when found
      }
    }
    // If pool is exhausted, silently fail (don't spawn particle)
  }

  private syncParticleToGeometry(index: number, updateDrawState: boolean = true): void {
    const particle = this.particles[index]
    const i6 = index * 6

    if (particle.shapeType === 0) {
      const size = 0.2 * particle.opacity
      const angle = particle.rotation

      this.positions[i6] = particle.position.x + Math.cos(angle) * size
      this.positions[i6 + 1] = particle.position.y + Math.sin(angle) * size
      this.positions[i6 + 2] = particle.position.z
      this.positions[i6 + 3] = particle.position.x + Math.cos(angle + Math.PI * 2/3) * size
      this.positions[i6 + 4] = particle.position.y + Math.sin(angle + Math.PI * 2/3) * size
      this.positions[i6 + 5] = particle.position.z

      this.colors[i6] = particle.color.r
      this.colors[i6 + 1] = particle.color.g
      this.colors[i6 + 2] = particle.color.b
      this.colors[i6 + 3] = particle.color.r
      this.colors[i6 + 4] = particle.color.g
      this.colors[i6 + 5] = particle.color.b
    } else if (particle.shapeType === 1) {
      const size = 0.3 * particle.opacity
      const angle = particle.rotation

      this.positions[i6] = particle.position.x - Math.cos(angle) * size * 0.5
      this.positions[i6 + 1] = particle.position.y - Math.sin(angle) * size * 0.5
      this.positions[i6 + 2] = particle.position.z
      this.positions[i6 + 3] = particle.position.x + Math.cos(angle) * size * 0.5
      this.positions[i6 + 4] = particle.position.y + Math.sin(angle) * size * 0.5
      this.positions[i6 + 5] = particle.position.z

      this.colors[i6] = particle.color.r * 0.5
      this.colors[i6 + 1] = particle.color.g * 0.5
      this.colors[i6 + 2] = particle.color.b * 0.5
      this.colors[i6 + 3] = particle.color.r
      this.colors[i6 + 4] = particle.color.g
      this.colors[i6 + 5] = particle.color.b
    } else {
      const size = 0.15 * particle.opacity
      const angle = particle.rotation

      this.positions[i6] = particle.position.x + Math.cos(angle) * size
      this.positions[i6 + 1] = particle.position.y + Math.sin(angle) * size
      this.positions[i6 + 2] = particle.position.z
      this.positions[i6 + 3] = particle.position.x + Math.cos(angle + Math.PI/2) * size
      this.positions[i6 + 4] = particle.position.y + Math.sin(angle + Math.PI/2) * size
      this.positions[i6 + 5] = particle.position.z

      this.colors[i6] = particle.color.r
      this.colors[i6 + 1] = particle.color.g
      this.colors[i6 + 2] = particle.color.b
      this.colors[i6 + 3] = particle.color.r
      this.colors[i6 + 4] = particle.color.g
      this.colors[i6 + 5] = particle.color.b
    }

    if (updateDrawState) {
      this.lineGeometry.attributes.position.needsUpdate = true
      this.lineGeometry.attributes.color.needsUpdate = true
      this.lineGeometry.setDrawRange(0, this.activeCount * 2)
    }
  }

  update(deltaTime: number): void {
    let newActiveCount = 0
    
    for (let i = 0; i < this.activeCount; i++) {
      const particle = this.particles[i]
      
      if (particle.active) {
        particle.update(deltaTime)

        if (!particle.active) {
          const i6 = i * 6
          this.positions.fill(0, i6, i6 + 6)
          continue
        }

        this.syncParticleToGeometry(i, false)
        
        newActiveCount = Math.max(newActiveCount, i + 1)
      } else {
        // Hide inactive particles
        const i6 = i * 6
        this.positions[i6] = 0
        this.positions[i6 + 1] = 0
        this.positions[i6 + 2] = 0
        this.positions[i6 + 3] = 0
        this.positions[i6 + 4] = 0
        this.positions[i6 + 5] = 0
      }
    }
    
    this.activeCount = newActiveCount
    
    // Update geometry
    this.lineGeometry.attributes.position.needsUpdate = true
    this.lineGeometry.attributes.color.needsUpdate = true
    
    // Update draw range for performance
    this.lineGeometry.setDrawRange(0, this.activeCount * 2) // 2 points per line
  }

  getParticleSystem(): THREE.LineSegments {
    return this.lineSystem
  }

  reset(): void {
    for (const particle of this.particles) {
      particle.active = false
      particle.life = 0
    }

    this.activeCount = 0
    this.positions.fill(0)
    this.colors.fill(0)
    this.lineGeometry.attributes.position.needsUpdate = true
    this.lineGeometry.attributes.color.needsUpdate = true
    this.lineGeometry.setDrawRange(0, 0)
  }
}
