import * as THREE from 'three'
import { ParticlePool, Effect } from './effects/ParticlePool'
import { VectorParticlePool } from './effects/VectorParticles'
import { ScreenEffects } from './effects/ScreenEffects'
import { ExplosionEffects } from './effects/ExplosionEffects'
import {
  SpecializedParticlePool,
  NebulaParticle,
  PlasmaParticle,
  EnergyWaveParticle,
  StardustParticle,
  AuroraParticle,
  createNebulaPool,
  createPlasmaPool,
  createEnergyWavePool,
  createStardustPool,
  createAuroraPool
} from './effects/SpecializedParticlePool'

// 🌟✨ FLAMBOYANT VFX SYSTEM - SHOWING MY FLARE! ✨🌟
// A truly EXTRAVAGANT particle system with maximum visual flair!
export class EffectsSystem {
  private scene: THREE.Scene
  private particlePools: Map<string, ParticlePool> = new Map()
  private vectorParticlePool: VectorParticlePool | null = null
  private activeEffects: Effect[] = []
  private screenEffects: ScreenEffects
  private explosionEffects: ExplosionEffects
  
  // 🎆 SPECIALIZED PARTICLE POOLS (using consolidated generic pool) 🎆
  private nebulaPool: SpecializedParticlePool<NebulaParticle> | null = null
  private plasmaPool: SpecializedParticlePool<PlasmaParticle> | null = null
  private energyWavePool: SpecializedParticlePool<EnergyWaveParticle> | null = null
  private stardustPool: SpecializedParticlePool<StardustParticle> | null = null
  private auroraPool: SpecializedParticlePool<AuroraParticle> | null = null
  
  private timeOffset: number = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.screenEffects = new ScreenEffects(scene)
    this.initializeParticlePools()
    // Initialize explosion effects after pools are created
    // Note: specialized pools are passed by reference, so they'll be available when used
    this.explosionEffects = new ExplosionEffects(
      this.particlePools,
      this.vectorParticlePool,
      this.screenEffects,
      {
        nebulaPool: this.nebulaPool,
        plasmaPool: this.plasmaPool,
        stardustPool: this.stardustPool
      }
    )
  }

  private initializeParticlePools(): void {
    // Create different particle pools - ENHANCED FOR FLAMBOYANCE!
    this.particlePools.set('explosion', new ParticlePool(400, 'explosion'))
    this.particlePools.set('spark', new ParticlePool(600, 'spark'))
    this.particlePools.set('trail', new ParticlePool(800, 'trail'))
    this.particlePools.set('death', new ParticlePool(350, 'death'))
    this.particlePools.set('impact', new ParticlePool(300, 'impact'))
    this.particlePools.set('electric', new ParticlePool(400, 'electric'))
    
    // Vector-style particles (Asteroids style)
    this.vectorParticlePool = new VectorParticlePool(500)
    
    // 🎆 SPECIALIZED PARTICLE SYSTEMS (using factory functions) 🎆
    this.nebulaPool = createNebulaPool(200)
    this.plasmaPool = createPlasmaPool(300)
    this.energyWavePool = createEnergyWavePool(150)
    this.stardustPool = createStardustPool(400)
    this.auroraPool = createAuroraPool(250)
    
    // Add all particle systems to scene
    this.particlePools.forEach(pool => {
      this.scene.add(pool.getParticleSystem())
    })
    
    // Add vector particle system to scene
    this.scene.add(this.vectorParticlePool.getParticleSystem())
    
    // Add specialized particle systems to scene
    this.scene.add(this.nebulaPool.getParticleSystem())
    this.scene.add(this.plasmaPool.getParticleSystem())
    this.scene.add(this.energyWavePool.getParticleSystem())
    this.scene.add(this.stardustPool.getParticleSystem())
    this.scene.add(this.auroraPool.getParticleSystem())
  }

  // 💥💥💥 FLAMBOYANT EXPLOSION EFFECTS - MAXIMUM FLARE! 💥💥💥
  createExplosion(position: THREE.Vector3, intensity: number = 1.0, color?: THREE.Color): void {
    this.explosionEffects.createExplosion(position, intensity, color)
  }

  // ⚡ ELECTRIC DEATH EFFECT ⚡ - With saturated colors
  createElectricDeath(position: THREE.Vector3): void {
    this.explosionEffects.createElectricDeath(position)
  }

  // 🌟 ENEMY TRAILS 🌟
  createEnemyTrail(position: THREE.Vector3, velocity: THREE.Vector3, enemyType: string): void {
    const trailPool = this.particlePools.get('trail')!
    
    let trailColor: THREE.Color
    let particleCount: number
    
    switch (enemyType) {
      case 'DataMite':
        trailColor = new THREE.Color().setHSL(0.0, 0.8, 0.6) // Red trail
        particleCount = 2
        break
      case 'ChaosWorm':
        trailColor = new THREE.Color().setHSL(Math.random(), 0.9, 0.7) // Rainbow trail
        particleCount = 5
        break
      case 'VoidSphere':
        trailColor = new THREE.Color().setHSL(0.8, 1.0, 0.4) // Purple trail
        particleCount = 3
        break
      case 'CrystalShardSwarm':
        trailColor = new THREE.Color().setHSL(0.5, 1.0, 0.8) // Cyan trail
        particleCount = 4
        break
      default:
        trailColor = new THREE.Color().setHSL(0.1, 0.7, 0.5)
        particleCount = 2
    }
    
    for (let i = 0; i < particleCount; i++) {
      const trailVelocity = velocity.clone().multiplyScalar(-0.3 + Math.random() * 0.2)
      trailVelocity.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3
      ))
      
      trailPool.emit(position, trailVelocity, trailColor, 0.4)
    }
  }

  // 💀💀💀 FLAMBOYANT ENEMY DEATH PARTICLES - MAXIMUM FLARE! 💀💀💀
  createEnemyDeathParticles(position: THREE.Vector3, enemyType: string, color?: THREE.Color): void {
    this.explosionEffects.createEnemyDeathParticles(position, enemyType, color)
  }

  // 💫 WEAPON IMPACT EFFECTS 💫 - With saturated colors
  createWeaponImpact(position: THREE.Vector3): void {
    this.explosionEffects.createWeaponImpact(position)
  }

  // ✨ SPARKLE PARTICLES (for power-ups and effects) ✨
  createSparkle(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number = 0.5): void {
    const sparkPool = this.particlePools.get('spark')!
    sparkPool.emit(position, velocity, color, life)
  }

  // 🚀 JET VFX - Vector-style jet particles for dash/thrust effects 🚀
  createJetVector(position: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, life: number = 0.6, shapeType: number = 1): void {
    if (this.vectorParticlePool) {
      this.vectorParticlePool.emit(position, velocity, color, life, shapeType)
    }
  }

  // 🔥 PROJECTILE TRAIL 🔥 - With saturated colors
  createProjectileTrail(position: THREE.Vector3, velocity: THREE.Vector3): void {
    // Use default power level 0 for backwards compatibility
    this.createPowerScaledProjectileTrail(position, velocity, 0, 'bullets')
  }
  
  // 🔥 PERFORMANCE-OPTIMIZED PROJECTILE TRAIL 🔥
  // Capped particle counts to maintain smooth FPS during rapid fire
  createPowerScaledProjectileTrail(position: THREE.Vector3, velocity: THREE.Vector3, powerLevel: number, weaponType: string): void {
    const trailPool = this.particlePools.get('trail')!
    
    // 🎯 FIXED particle count - no scaling to prevent FPS drops
    // Visual intensity comes from color/opacity, not particle spam
    const particleCount = 2
    
    // 🎨 Weapon-type specific colors
    let baseHue: number
    switch (weaponType) {
      case 'lasers':
        baseHue = 0.95 // Red/pink
        break
      case 'photons':
        baseHue = 0.55 // Cyan/blue
        break
      default: // bullets
        baseHue = 0.1 // Orange/yellow
    }
    
    // Trail particles - fixed count, power affects color intensity only
    for (let i = 0; i < particleCount; i++) {
      const trailVelocity = velocity.clone().multiplyScalar(-0.1 - Math.random() * 0.1)
      const spread = 0.25
      trailVelocity.add(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.5
      ))
      
      const hueVariation = baseHue + (Math.random() - 0.5) * 0.1
      // Higher power = brighter trail color (visual impact without more particles)
      const lightness = 0.5 + powerLevel * 0.02
      const trailColor = new THREE.Color().setHSL(hueVariation, 1.0, lightness)
      const life = 0.35 + Math.random() * 0.15
      trailPool.emit(position, trailVelocity, trailColor, life)
    }
    
    // VECTOR-STYLE TRAIL - Only ONE vector particle, always
    if (this.vectorParticlePool && Math.random() < 0.5) { // 50% chance for variety
      const trailVectorVelocity = velocity.clone().multiplyScalar(-0.15)
      trailVectorVelocity.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        0
      ))
      
      const lightness = 0.55 + powerLevel * 0.02
      const vectorColor = new THREE.Color().setHSL(baseHue, 1.0, lightness)
      this.vectorParticlePool.emit(position, trailVectorVelocity, vectorColor, 0.4, 1)
    }
  }

  // 📺 SCREEN EFFECTS 📺
  addScreenFlash(intensity: number, color: THREE.Color): void {
    this.screenEffects.addScreenFlash(intensity, color)
  }

  addScreenShake(intensity: number, duration: number): void {
    this.screenEffects.addScreenShake(intensity, duration)
  }

  addSlowMotion(factor: number, duration: number): void {
    this.screenEffects.addSlowMotion(factor, duration)
  }

  addDistortionWave(center: THREE.Vector3, intensity: number): void {
    this.screenEffects.addDistortionWave(center, intensity)
  }

  // 💥 SHOCKWAVE EFFECT - Expanding energy rings! 💥
  createShockwave(position: THREE.Vector3, intensity: number): void {
    this.screenEffects.createShockwave(position, intensity)
  }
  
  // 🌊 ENERGY RIPPLE - Concentric energy waves! 🌊
  createEnergyRipple(position: THREE.Vector3, intensity: number): void {
    this.screenEffects.createEnergyRipple(position, intensity)
  }
  
  // 🌈 BLOOM BURST - Dramatic energy release with saturated colors! 🌈
  createBloomBurst(position: THREE.Vector3, intensity: number): void {
    this.screenEffects.createBloomBurst(position, intensity)
  }
  
  // 🌌 AURORA EFFECT - Flowing energy streams with saturated colors! 🌌
  createAurora(position: THREE.Vector3, direction: THREE.Vector3, intensity: number): void {
    if (!this.auroraPool) return
    
    const auroraCount = Math.floor(30 * intensity)
    for (let i = 0; i < auroraCount; i++) {
      const angle = (Math.PI * 2 * i) / auroraCount + Math.random() * 0.3
      const speed = (2 + Math.random() * 4) * intensity
      const velocity = direction.clone().multiplyScalar(speed)
      velocity.add(new THREE.Vector3(
        Math.cos(angle) * speed * 0.3,
        Math.sin(angle) * speed * 0.3,
        (Math.random() - 0.5) * 1
      ))
      
      // 75% saturated, 25% bright
      const useSaturated = Math.random() < 0.75
      const auroraColor = new THREE.Color().setHSL(
        0.6 + Math.random() * 0.2, // Cyan-green range
        1.0,
        useSaturated ? 0.5 + Math.random() * 0.1 : 0.65
      )
      this.auroraPool.emit(position, velocity, auroraColor, 2.0 + Math.random() * 1.0)
    }
  }
  
  // ⚡ ENERGY WAVE - Traveling energy pulse with saturated colors! ⚡
  createEnergyWave(startPos: THREE.Vector3, endPos: THREE.Vector3, intensity: number): void {
    if (!this.energyWavePool) return
    
    const direction = endPos.clone().sub(startPos).normalize()
    const distance = startPos.distanceTo(endPos)
    const waveCount = Math.floor(distance * 2 * intensity)
    
    for (let i = 0; i < waveCount; i++) {
      const t = i / waveCount
      const position = startPos.clone().lerp(endPos, t)
      const velocity = direction.clone().multiplyScalar(5 + Math.random() * 3)
      
      // 75% saturated, 25% bright
      const useSaturated = Math.random() < 0.75
      const waveColor = new THREE.Color().setHSL(
        0.55 + Math.random() * 0.1, // Cyan range
        1.0,
        useSaturated ? 0.55 + Math.random() * 0.1 : 0.75
      )
      this.energyWavePool.emit(position, velocity, waveColor, 1.0 + Math.random() * 0.5)
    }
  }

  // Update system - ENHANCED WITH FLAMBOYANT EFFECTS!
  update(deltaTime: number): void {
    this.timeOffset += deltaTime
    
    // Apply slow motion to deltaTime
    const adjustedDeltaTime = deltaTime * this.screenEffects.getSlowMotionFactor()
    
    // Update all particle pools
    this.particlePools.forEach(pool => {
      pool.update(adjustedDeltaTime)
    })
    
    // Update vector particle pool
    if (this.vectorParticlePool) {
      this.vectorParticlePool.update(adjustedDeltaTime)
    }
    
    // 🎆 UPDATE SPECIALIZED PARTICLE SYSTEMS! 🎆
    if (this.nebulaPool) {
      this.nebulaPool.update(adjustedDeltaTime)
    }
    if (this.plasmaPool) {
      this.plasmaPool.update(adjustedDeltaTime)
    }
    if (this.energyWavePool) {
      this.energyWavePool.update(adjustedDeltaTime)
    }
    if (this.stardustPool) {
      this.stardustPool.update(adjustedDeltaTime)
    }
    if (this.auroraPool) {
      this.auroraPool.update(adjustedDeltaTime)
    }
    
    // Update screen effects (includes TWEEN updates and chromatic aberration)
    this.screenEffects.update(deltaTime)
    
    // Update active effects
    this.activeEffects = this.activeEffects.filter(effect => {
      effect.update(adjustedDeltaTime)
      return effect.isAlive()
    })
  }

  getScreenShakeAmount(): number {
    return this.screenEffects.getScreenShakeAmount()
  }

  getSlowMotionFactor(): number {
    return this.screenEffects.getSlowMotionFactor()
  }

  // 🧹 CLEANUP - Clear all particles and effects for fresh start! 🧹
  cleanup(): void {
    // Reset CPU particles and GPU draw state together so the first burst after
    // a menu/game/level transition cannot inherit a stale draw range.
    this.particlePools.forEach(pool => {
      pool.reset()
    })
    
    this.vectorParticlePool?.reset()
    
    // Deactivate specialized particle pools
    const specializedPools = [
      this.nebulaPool,
      this.plasmaPool,
      this.energyWavePool,
      this.stardustPool,
      this.auroraPool
    ]
    
    specializedPools.forEach(pool => {
      pool?.reset()
    })
    
    // Clear active effects
    this.activeEffects = []
    
    // Clear screen effects
    if (this.screenEffects && (this.screenEffects as any).cleanup) {
      (this.screenEffects as any).cleanup()
    }
  }
}
