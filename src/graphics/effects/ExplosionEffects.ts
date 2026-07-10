import * as THREE from 'three'
import { ParticlePool } from './ParticlePool'
import { VectorParticlePool } from './VectorParticles'
import { ScreenEffects } from './ScreenEffects'

/**
 * Helper class for explosion and impact effects
 * Takes dependencies to avoid tight coupling
 */
export class ExplosionEffects {
  constructor(
    private particlePools: Map<string, ParticlePool>,
    private vectorParticlePool: VectorParticlePool | null,
    private screenEffects: ScreenEffects,
    private specializedPools: {
      nebulaPool?: any
      plasmaPool?: any
      stardustPool?: any
    }
  ) {}

  createExplosion(position: THREE.Vector3, intensity: number = 1.0, color?: THREE.Color): void {
    const particleCount = Math.floor(80 * intensity) // EVEN MORE PARTICLES!
    const explosionPool = this.particlePools.get('explosion')!
    
    // 🌟 REGULAR POINT PARTICLES - Enhanced with saturated colors! 🌟
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const speed = (3 + Math.random() * 6) * intensity
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 3 * intensity
      )
      
      // 85% saturated colors, 15% bright - prevents white-out with additive blending
      const useSaturated = Math.random() < 0.85
      const particleColor = color || new THREE.Color().setHSL(
        Math.random() * 0.15 + 0.05, // Orange-red range
        1.0, // Full saturation
        useSaturated ? 0.4 + Math.random() * 0.12 : 0.55 // Darker colors prevent white-out
      )
      
      explosionPool.emit(position, velocity, particleColor, 0.96 + Math.random() * 0.64) // 20% shorter (was 1.2 + 0.8)
    }
    
    // 🎆 VECTOR-STYLE PARTICLES - Geometric shapes with saturated colors! 🎆
    if (this.vectorParticlePool) {
      const vectorCount = Math.floor(50 * intensity) // MORE VECTOR PARTICLES!
      for (let i = 0; i < vectorCount; i++) {
        const angle = (Math.PI * 2 * i) / vectorCount + Math.random() * 0.5
        const speed = (5 + Math.random() * 7) * intensity
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 3 * intensity
        )
        
        // 85% saturated, 15% bright - prevents white-out with additive blending
        const useSaturated = Math.random() < 0.85
        const vectorColor = color || new THREE.Color().setHSL(
          Math.random() * 0.15 + 0.05,
          1.0,
          useSaturated ? 0.45 + Math.random() * 0.12 : 0.58 // Darker colors prevent white-out
        )
        
        const shapeType = Math.floor(Math.random() * 3)
        this.vectorParticlePool.emit(position, velocity, vectorColor, 1.2 + Math.random() * 0.8, shapeType) // 20% shorter (was 1.5 + 1.0)
      }
    }
    
    // 🌌 NEBULA PARTICLES - Swirling cosmic clouds! 🌌
    if (this.specializedPools.nebulaPool && intensity > 0.5) {
      const nebulaCount = Math.floor(25 * intensity) // MORE NEBULA!
      for (let i = 0; i < nebulaCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = (1 + Math.random() * 2) * intensity
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 1
        )
        const nebulaColor = color || new THREE.Color().setHSL(
          Math.random() * 0.3 + 0.5, // Purple-pink range
          0.7,
          0.6
        )
        this.specializedPools.nebulaPool.emit(position, velocity, nebulaColor, 1.6 + Math.random() * 0.8) // 20% shorter (was 2.0 + 1.0)
      }
    }
    
    // ⚡ PLASMA PARTICLES - Electric energy bursts with saturated colors! ⚡
    if (this.specializedPools.plasmaPool && intensity > 0.6) {
      const plasmaCount = Math.floor(35 * intensity) // MORE PLASMA!
      for (let i = 0; i < plasmaCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = (2 + Math.random() * 4) * intensity
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 2
        )
        // 85% saturated, 15% bright - prevents white-out
        const useSaturated = Math.random() < 0.85
        const plasmaColor = color || new THREE.Color().setHSL(
          0.6 + Math.random() * 0.2, // Cyan-blue range
          1.0,
          useSaturated ? 0.45 + Math.random() * 0.12 : 0.58 // Darker colors prevent white-out
        )
        this.specializedPools.plasmaPool.emit(position, velocity, plasmaColor, 1.2 + Math.random() * 0.64) // 20% shorter (was 1.5 + 0.8)
      }
    }
    
    // ✨ STARDUST PARTICLES - Sparkly magic with saturated colors! ✨
    if (this.specializedPools.stardustPool) {
      const stardustCount = Math.floor(40 * intensity) // MORE STARDUST!
      for (let i = 0; i < stardustCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = (1 + Math.random() * 3) * intensity
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 1.5
        )
        // 85% saturated, 15% bright - prevents white-out
        const useSaturated = Math.random() < 0.85
        const stardustColor = new THREE.Color().setHSL(
          Math.random(), // Full rainbow!
          1.0, // Full saturation
          useSaturated ? 0.4 + Math.random() * 0.12 : 0.55 // Darker colors prevent white-out
        )
        this.specializedPools.stardustPool.emit(position, velocity, stardustColor, 0.8 + Math.random() * 0.4) // 20% shorter (was 1.0 + 0.5)
      }
    }
    
    // 💥 SHOCKWAVE EFFECT! 💥
    this.screenEffects.createShockwave(position, intensity)
    
    // 🔴 REMOVED ENERGY RIPPLE - was duplicating brightness with shockwave
    // this.screenEffects.createEnergyRipple(position, intensity)
    
    // Screen shake - REDUCED!
    this.screenEffects.addScreenShake(0.25 * intensity, 0.4)
    
    // Screen flash - 🔴 DRASTICALLY REDUCED to prevent white-out!
    // Use darker saturated color instead of bright yellow-white
    const flashColor = color || new THREE.Color().setHSL(0.08, 1.0, 0.35) // Dark orange
    this.screenEffects.addScreenFlash(0.2 * intensity, flashColor)
    
    // 🌈 BLOOM BURST! 🌈 - Only for BIG explosions
    if (intensity > 1.5) {
      this.screenEffects.createBloomBurst(position, intensity)
    }
    
    // Add slow motion effect for big explosions
    if (intensity > 1.5) {
      this.screenEffects.addSlowMotion(0.3, 0.2)
    }
  }

  createElectricDeath(position: THREE.Vector3): void {
    const electricPool = this.particlePools.get('electric')!
    const sparkPool = this.particlePools.get('spark')!
    
    // Main electric burst - 85% saturated, 15% bright - prevents white-out
    for (let i = 0; i < 50; i++) { // MORE ELECTRIC!
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 3
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 1
      )
      
      const useSaturated = Math.random() < 0.85
      const electricColor = new THREE.Color().setHSL(
        0.55, // Cyan
        1.0,
        useSaturated ? 0.45 + Math.random() * 0.12 : 0.58
      )
      electricPool.emit(position, velocity, electricColor, 0.64 + Math.random() * 0.32) // 20% shorter (was 0.8 + 0.4)
    }
    
    // Electric sparks - 85% saturated, 15% bright - prevents white-out
    for (let i = 0; i < 40; i++) { // MORE SPARKS!
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 1
      )
      
      const useSaturated = Math.random() < 0.85
      const sparkColor = new THREE.Color().setHSL(
        0.55,
        1.0,
        useSaturated ? 0.4 + Math.random() * 0.12 : 0.55
      )
      sparkPool.emit(position, velocity, sparkColor, 0.4 + Math.random() * 0.24) // 20% shorter (was 0.5 + 0.3)
    }
    
    // Vector-style electric particles - 85% saturated, 15% bright
    if (this.vectorParticlePool) {
      for (let i = 0; i < 30; i++) { // MORE VECTOR ELECTRIC!
        const angle = Math.random() * Math.PI * 2
        const speed = 3 + Math.random() * 4
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 1
        )
        
        const useSaturated = Math.random() < 0.85
        const vectorColor = new THREE.Color().setHSL(
          0.55,
          1.0,
          useSaturated ? 0.45 + Math.random() * 0.12 : 0.58
        )
        this.vectorParticlePool.emit(position, velocity, vectorColor, 0.8 + Math.random() * 0.4, 1) // 20% shorter (was 1.0 + 0.5) Line shape
      }
    }
    
    this.screenEffects.addScreenShake(0.15, 0.2)
    // 🔴 REDUCED flash - use dark cyan instead of bright cyan
    this.screenEffects.addScreenFlash(0.15, new THREE.Color().setHSL(0.5, 1.0, 0.35))
  }

  createEnemyDeathParticles(position: THREE.Vector3, enemyType: string, color?: THREE.Color): void {
    const deathPool = this.particlePools.get('death')!
    const sparkPool = this.particlePools.get('spark')!
    
    // Determine particle color based on enemy type
    let particleColor: THREE.Color
    if (color) {
      particleColor = color
    } else {
      switch (enemyType) {
        case 'DataMite':
          particleColor = new THREE.Color().setHSL(0.0, 0.9, 0.6) // Red
          break
        case 'ScanDrone':
          particleColor = new THREE.Color().setHSL(0.1, 0.9, 0.7) // Orange
          break
        case 'ChaosWorm':
          particleColor = new THREE.Color().setHSL(Math.random(), 0.9, 0.7) // Rainbow
          break
        case 'VoidSphere':
          particleColor = new THREE.Color().setHSL(0.8, 1.0, 0.4) // Purple
          break
        case 'CrystalShardSwarm':
          particleColor = new THREE.Color().setHSL(0.5, 1.0, 0.8) // Cyan
          break
        default:
          particleColor = new THREE.Color().setHSL(0.0, 0.8, 0.6) // Default red
      }
    }
    
    // 🌟 ENHANCED DEATH PARTICLES - EVEN MORE! 🌟
    const particleCount = 100
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const speed = 3 + Math.random() * 7 // Faster spread!
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 2
      )
      
      deathPool.emit(position, velocity, particleColor, 0.8 + Math.random() * 0.48) // 20% shorter (was 1.0 + 0.6)
    }
    
    // ✨ ENHANCED SPARK PARTICLES! ✨ - With saturated colors, prevents white-out
    for (let i = 0; i < 50; i++) { // MORE SPARKS!
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 4
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 2
      )
      
      // Use saturated color - 85% saturated, 15% bright
      const sparkColor = particleColor.clone()
      const hsl = { h: 0, s: 0, l: 0 }
      sparkColor.getHSL(hsl)
      const useSaturated = Math.random() < 0.85
      sparkColor.setHSL(hsl.h, 1.0, useSaturated ? 0.45 + Math.random() * 0.12 : 0.58)
      sparkPool.emit(position, velocity, sparkColor, 0.48 + Math.random() * 0.32) // 20% shorter (was 0.6 + 0.4)
    }
    
    // 🎆 VECTOR-STYLE DEATH PARTICLES! 🎆 - With saturated colors, prevents white-out
    if (this.vectorParticlePool) {
      const vectorCount = 45 // MORE VECTOR DEATH PARTICLES!
      for (let i = 0; i < vectorCount; i++) {
        const angle = (Math.PI * 2 * i) / vectorCount + Math.random() * 0.5
        const speed = 4 + Math.random() * 5
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 2
        )
        
        // Use saturated version of particle color - 85% saturated, 15% bright
        const vectorColor = particleColor.clone()
        const hsl = { h: 0, s: 0, l: 0 }
        vectorColor.getHSL(hsl)
        const useSaturated = Math.random() < 0.85
        vectorColor.setHSL(hsl.h, 1.0, useSaturated ? 0.45 + Math.random() * 0.12 : 0.58)
        
        const shapeType = Math.floor(Math.random() * 3)
        this.vectorParticlePool.emit(position, velocity, vectorColor, 1.2 + Math.random() * 0.8, shapeType)
      }
    }
    
    // 🌌 ADD NEBULA PARTICLES FOR DRAMATIC EFFECTS! 🌌
    if (this.specializedPools.nebulaPool) {
      const nebulaCount = 35 // MORE NEBULA!
      for (let i = 0; i < nebulaCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 1
        )
        const nebulaColor = particleColor.clone()
        const hsl = { h: 0, s: 0, l: 0 }
        particleColor.getHSL(hsl)
        nebulaColor.setHSL(hsl.h, 0.7, 0.6)
        this.specializedPools.nebulaPool.emit(position, velocity, nebulaColor, 1.6 + Math.random() * 0.8) // 20% shorter (was 2.0 + 1.0)
      }
    }
    
    // ✨ ADD STARDUST FOR MAGIC! ✨ - With saturated colors, prevents white-out
    if (this.specializedPools.stardustPool) {
      const stardustCount = 50 // MORE STARDUST!
      for (let i = 0; i < stardustCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 1.5
        )
        // 85% saturated, 15% bright - prevents white-out
        const useSaturated = Math.random() < 0.85
        const stardustColor = new THREE.Color().setHSL(
          Math.random(), // Full rainbow!
          1.0, // Full saturation
          useSaturated ? 0.4 + Math.random() * 0.12 : 0.55
        )
        this.specializedPools.stardustPool.emit(position, velocity, stardustColor, 0.8 + Math.random() * 0.4) // 20% shorter (was 1.0 + 0.5)
      }
    }
  }

  createWeaponImpact(position: THREE.Vector3): void {
    const impactPool = this.particlePools.get('impact')!
    const sparkPool = this.particlePools.get('spark')!
    
    // Impact sparks - 85% saturated, 15% bright - prevents white-out
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 2.5
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        Math.random() * 1
      )
      
      const useSaturated = Math.random() < 0.85
      const sparkColor = new THREE.Color().setHSL(0.15, 1.0, useSaturated ? 0.45 : 0.55)
      sparkPool.emit(position, velocity, sparkColor, 0.24) // 20% shorter (was 0.3)
    }
    
    // Impact flash - saturated colors, prevents white-out
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 1
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0
      )
      
      const useSaturated = Math.random() < 0.85
      const flashColor = new THREE.Color().setHSL(0.55, 1.0, useSaturated ? 0.4 : 0.52)
      impactPool.emit(position, velocity, flashColor, 0.16) // 20% shorter (was 0.2)
    }
    
    this.screenEffects.addScreenShake(0.1, 0.1)
  }
}

