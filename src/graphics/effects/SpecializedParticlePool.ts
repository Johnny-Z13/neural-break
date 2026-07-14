import * as THREE from 'three'
import { Particle } from './ParticlePool'

/**
 * Configuration for specialized particle pools
 */
export interface SpecializedPoolConfig {
  poolSize: number
  materialSize: number
  materialOpacity: number
  /** Factory function to create specialized particles */
  createParticle: () => SpecializedParticle
  /** Function to calculate particle size during update (receives particle and returns size multiplier) */
  calculateSizeMultiplier?: (particle: SpecializedParticle) => number
  /** Function to calculate color multiplier during update (for color effects like pulsing/twinkling) */
  calculateColorMultiplier?: (particle: SpecializedParticle) => number
}

/**
 * Base class for specialized particles with custom animation properties
 */
export class SpecializedParticle extends Particle {
  /** Phase for animation (swirl, pulse, twinkle, etc.) */
  animPhase: number = 0
  /** Speed of animation */
  animSpeed: number = 0

  reset(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    super.reset(position, velocity, color, life)
    this.animPhase = Math.random() * Math.PI * 2
    this.animSpeed = 5 + Math.random() * 5
    this.size = 0.3 + Math.random() * 0.3
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    this.animPhase += this.animSpeed * deltaTime
  }
}

/**
 * 🌌 Nebula Particle - Swirling cosmic clouds
 */
export class NebulaParticle extends SpecializedParticle {
  swirlPhase: number = 0
  swirlSpeed: number = 0

  reset(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    super.reset(position, velocity, color, life)
    this.swirlPhase = Math.random() * Math.PI * 2
    this.swirlSpeed = 2 + Math.random() * 3
    this.size = 0.5 + Math.random() * 0.5
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    this.swirlPhase += this.swirlSpeed * deltaTime
    
    // Swirling motion
    const swirlRadius = 0.3
    this.position.x += Math.cos(this.swirlPhase) * swirlRadius * deltaTime
    this.position.y += Math.sin(this.swirlPhase) * swirlRadius * deltaTime
  }
}

/**
 * ⚡ Plasma Particle - Pulsing energy bursts
 */
export class PlasmaParticle extends SpecializedParticle {
  pulsePhase: number = 0
  pulseSpeed: number = 0

  reset(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    super.reset(position, velocity, color, life)
    this.pulsePhase = Math.random() * Math.PI * 2
    this.pulseSpeed = 10 + Math.random() * 15
    this.size = 0.3 + Math.random() * 0.3
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    this.pulsePhase += this.pulseSpeed * deltaTime
  }
}

/**
 * 🌊 Energy Wave Particle - Traveling energy pulses
 */
export class EnergyWaveParticle extends SpecializedParticle {
  wavePhase: number = 0
  waveSpeed: number = 0

  reset(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    super.reset(position, velocity, color, life)
    this.wavePhase = Math.random() * Math.PI * 2
    this.waveSpeed = 8 + Math.random() * 10
    this.size = 0.4 + Math.random() * 0.4
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    this.wavePhase += this.waveSpeed * deltaTime
  }
}

/**
 * ✨ Stardust Particle - Twinkling sparkles
 */
export class StardustParticle extends SpecializedParticle {
  twinklePhase: number = 0
  twinkleSpeed: number = 0

  reset(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    super.reset(position, velocity, color, life)
    this.twinklePhase = Math.random() * Math.PI * 2
    this.twinkleSpeed = 5 + Math.random() * 10
    this.size = 0.15 + Math.random() * 0.15
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    this.twinklePhase += this.twinkleSpeed * deltaTime
  }
}

/**
 * 🌌 Aurora Particle - Flowing energy streams
 */
export class AuroraParticle extends SpecializedParticle {
  flowPhase: number = 0
  flowSpeed: number = 0

  reset(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    super.reset(position, velocity, color, life)
    this.flowPhase = Math.random() * Math.PI * 2
    this.flowSpeed = 3 + Math.random() * 5
    this.size = 0.4 + Math.random() * 0.3
  }

  update(deltaTime: number): void {
    super.update(deltaTime)
    this.flowPhase += this.flowSpeed * deltaTime
  }
}

/**
 * 🎆 Generic Specialized Particle Pool
 * 
 * A flexible particle pool that can be configured with different particle types
 * and animation behaviors, eliminating code duplication across specialized pools.
 */
export class SpecializedParticlePool<T extends SpecializedParticle> {
  private particles: T[] = []
  private particleSystem: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private activeCount: number = 0
  private poolSize: number
  private config: SpecializedPoolConfig

  constructor(config: SpecializedPoolConfig) {
    this.poolSize = config.poolSize
    this.config = config
    
    this.positions = new Float32Array(config.poolSize * 3)
    this.colors = new Float32Array(config.poolSize * 3)
    this.sizes = new Float32Array(config.poolSize)
    
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    
    this.material = new THREE.PointsMaterial({
      size: config.materialSize,
      vertexColors: true,
      transparent: true,
      opacity: config.materialOpacity,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
    })
    
    this.particleSystem = new THREE.Points(this.geometry, this.material)
    this.particleSystem.frustumCulled = false
    this.geometry.setDrawRange(0, 0)
    
    // Initialize particles using the factory function
    for (let i = 0; i < config.poolSize; i++) {
      this.particles.push(config.createParticle() as T)
    }
  }

  emit(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number): void {
    const maxSearch = Math.min(this.poolSize, this.activeCount + 50)
    for (let i = 0; i < maxSearch; i++) {
      if (!this.particles[i].active) {
        this.particles[i].reset(position, velocity, color, life)
        if (i >= this.activeCount) {
          this.activeCount = i + 1
        }
        this.syncParticleToGeometry(i)
        return
      }
    }
  }

  private syncParticleToGeometry(index: number): void {
    const particle = this.particles[index]
    const i3 = index * 3
    const colorMultiplier = this.config.calculateColorMultiplier?.(particle) ?? 1
    const sizeMultiplier = this.config.calculateSizeMultiplier?.(particle) ?? 1

    this.positions[i3] = particle.position.x
    this.positions[i3 + 1] = particle.position.y
    this.positions[i3 + 2] = particle.position.z
    this.colors[i3] = particle.color.r * colorMultiplier
    this.colors[i3 + 1] = particle.color.g * colorMultiplier
    this.colors[i3 + 2] = particle.color.b * colorMultiplier
    this.sizes[index] = particle.size * sizeMultiplier

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.setDrawRange(0, this.activeCount)
  }

  update(deltaTime: number): void {
    let newActiveCount = 0
    
    const sizeMultiplier = this.config.calculateSizeMultiplier
    const colorMultiplier = this.config.calculateColorMultiplier
    
    for (let i = 0; i < this.activeCount; i++) {
      const particle = this.particles[i]
      const i3 = i * 3
      
      if (particle.active) {
        particle.update(deltaTime)

        if (!particle.active) {
          this.sizes[i] = 0
          continue
        }
        
        this.positions[i3] = particle.position.x
        this.positions[i3 + 1] = particle.position.y
        this.positions[i3 + 2] = particle.position.z

        const fade = particle.opacity * particle.opacity * (3 - 2 * particle.opacity)
        
        // Apply color multiplier if defined
        if (colorMultiplier) {
          const mult = colorMultiplier(particle) * fade
          this.colors[i3] = particle.color.r * mult
          this.colors[i3 + 1] = particle.color.g * mult
          this.colors[i3 + 2] = particle.color.b * mult
        } else {
          this.colors[i3] = particle.color.r * fade
          this.colors[i3 + 1] = particle.color.g * fade
          this.colors[i3 + 2] = particle.color.b * fade
        }
        
        // Apply size multiplier if defined
        if (sizeMultiplier) {
          this.sizes[i] = particle.size * particle.opacity * sizeMultiplier(particle)
        } else {
          this.sizes[i] = particle.size * particle.opacity
        }
        
        newActiveCount = Math.max(newActiveCount, i + 1)
      } else {
        this.sizes[i] = 0
      }
    }
    
    this.activeCount = newActiveCount
    
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
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

// 🏭 Factory functions to create pre-configured pools

/**
 * Creates a Nebula particle pool (swirling cosmic clouds)
 */
export function createNebulaPool(poolSize: number): SpecializedParticlePool<NebulaParticle> {
  return new SpecializedParticlePool<NebulaParticle>({
    poolSize,
    materialSize: 0.8,
    materialOpacity: 0.6,
    createParticle: () => new NebulaParticle(),
    calculateSizeMultiplier: (p) => 1.5 + Math.sin((p as NebulaParticle).swirlPhase) * 0.5
  })
}

/**
 * Creates a Plasma particle pool (pulsing energy bursts)
 */
export function createPlasmaPool(poolSize: number): SpecializedParticlePool<PlasmaParticle> {
  return new SpecializedParticlePool<PlasmaParticle>({
    poolSize,
    materialSize: 0.4,
    materialOpacity: 0.9,
    createParticle: () => new PlasmaParticle(),
    calculateSizeMultiplier: (p) => 1.0 + Math.sin((p as PlasmaParticle).pulsePhase) * 0.5,
    calculateColorMultiplier: (p) => 0.7 + Math.sin((p as PlasmaParticle).pulsePhase) * 0.3
  })
}

/**
 * Creates an Energy Wave particle pool (traveling pulses)
 */
export function createEnergyWavePool(poolSize: number): SpecializedParticlePool<EnergyWaveParticle> {
  return new SpecializedParticlePool<EnergyWaveParticle>({
    poolSize,
    materialSize: 0.6,
    materialOpacity: 0.8,
    createParticle: () => new EnergyWaveParticle(),
    calculateSizeMultiplier: (p) => 1.0 + Math.sin((p as EnergyWaveParticle).wavePhase) * 0.3
  })
}

/**
 * Creates a Stardust particle pool (twinkling sparkles)
 */
export function createStardustPool(poolSize: number): SpecializedParticlePool<StardustParticle> {
  return new SpecializedParticlePool<StardustParticle>({
    poolSize,
    materialSize: 0.2,
    materialOpacity: 0.9,
    createParticle: () => new StardustParticle(),
    calculateSizeMultiplier: (p) => 0.5 + Math.sin((p as StardustParticle).twinklePhase) * 0.5,
    calculateColorMultiplier: (p) => 0.5 + Math.sin((p as StardustParticle).twinklePhase) * 0.5
  })
}

/**
 * Creates an Aurora particle pool (flowing energy streams)
 */
export function createAuroraPool(poolSize: number): SpecializedParticlePool<AuroraParticle> {
  return new SpecializedParticlePool<AuroraParticle>({
    poolSize,
    materialSize: 0.5,
    materialOpacity: 0.7,
    createParticle: () => new AuroraParticle(),
    calculateSizeMultiplier: (p) => 0.6 + Math.sin((p as AuroraParticle).flowPhase) * 0.4,
    calculateColorMultiplier: (p) => 0.6 + Math.sin((p as AuroraParticle).flowPhase) * 0.4
  })
}
