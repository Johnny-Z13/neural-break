import * as THREE from 'three'
import { Enemy, EnemyState, SpawnConfig, DeathConfig } from './Enemy'
import { Player } from './Player'
import { BALANCE_CONFIG } from '../config'

export class DataMite extends Enemy {
  // 🔷 MOVEMENT VARIATION - Prevent perfect alignment 🔷
  private movementOffset: number = Math.random() * Math.PI * 2 // Random starting phase
  private swayAmount: number = 0.3 // Amount of perpendicular sway
  private swaySpeed: number = 3.0 // Speed of sway oscillation
  
  constructor(x: number, y: number) {
    super(x, y)
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.DATA_MITE
    this.health = stats.HEALTH
    this.maxHealth = stats.HEALTH
    this.speed = stats.SPEED
    this.damage = stats.DAMAGE
    this.xpValue = stats.XP_VALUE
    this.radius = stats.RADIUS
    
    // 💥 DEATH DAMAGE 💥
    this.deathDamageRadius = stats.DEATH_RADIUS
    this.deathDamageAmount = stats.DEATH_DAMAGE
  }

  initialize(): void {
    // 🎮 ASTEROIDS-STYLE VECTOR DATA MITE - WIREFRAME + GLOW! 🎮
    // 30% smaller and 20% more transparent
    const geometry = new THREE.CircleGeometry(0.56, 16) // 30% smaller (was 0.8)
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF4400,
      transparent: true,
      opacity: 0.8, // 20% more transparent (was 1.0)
      side: THREE.DoubleSide // Ensure visible from both sides
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.set(this.position.x, this.position.y, 0) // Ensure z=0
    this.mesh.visible = true // Explicitly set visibility
    this.mesh.renderOrder = 100 // Ensure it renders on top
    
    // 🌟 WIREFRAME OUTLINE - Classic Asteroids style! 🌟
    const wireframeGeometry = new THREE.CircleGeometry(0.56, 16) // 30% smaller (was 0.8)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF6600,
      wireframe: true,
      transparent: true,
      opacity: 0.72, // 20% more transparent (was 0.9)
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial)
    this.mesh.add(wireframe)
    
    // 💫 OUTER GLOW EFFECT - Enhanced! 💫
    const glowGeometry = new THREE.CircleGeometry(0.7, 16) // 30% smaller (was 1.0)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF2200,
      transparent: true,
      opacity: 0.24, // 20% more transparent (was 0.3)
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    this.mesh.add(glow)
    
    // ⚡ ENERGY AURA - Pulsing ring! ⚡
    const auraGeometry = new THREE.RingGeometry(0.56, 0.7, 16) // 30% smaller (was 0.8, 1.0)
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF4400,
      transparent: true,
      opacity: 0.48, // 20% more transparent (was 0.6)
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const aura = new THREE.Mesh(auraGeometry, auraMaterial)
    // No rotation needed for top-down view
    this.mesh.add(aura)
    
    // ✨ INNER CORE - Bright center! ✨
    const coreGeometry = new THREE.CircleGeometry(0.21, 12) // 30% smaller (was 0.3)
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.72, // 20% more transparent (was 0.9)
      blending: THREE.AdditiveBlending
    })
    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    this.mesh.add(core)
    
    // 🔥 ENERGY SPIKES - Vector-style! 🔥
    for (let i = 0; i < 8; i++) {
      const spikeGeometry = new THREE.ConeGeometry(0.014, 0.105, 4) // 30% smaller (was 0.02, 0.15)
      const spikeMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF6600,
        transparent: true,
        opacity: 0.64, // 20% more transparent (was 0.8)
        blending: THREE.AdditiveBlending
      })
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial)
      const angle = (i / 8) * Math.PI * 2
      spike.position.set(
        Math.cos(angle) * 0.21, // 30% smaller (was 0.3)
        Math.sin(angle) * 0.21,
        0
      )
      spike.rotation.z = angle + Math.PI / 2
      this.mesh.add(spike)
    }
    
    // 🌟 START SMALL FOR SPAWN ANIMATION 🌟
    this.mesh.scale.setScalar(0.01)
  }
  
  // 🎬 SPAWN CONFIGURATION 🎬
  protected getSpawnConfig(): SpawnConfig {
    return {
      duration: 0.2,
      invulnerable: true,
      particles: {
        count: 8,
        colors: [0xFF4400, 0xFF6600],
        speed: 2,
        burstAtStart: true
      }
    }
  }
  
  // 🎬 DEATH CONFIGURATION 🎬
  protected getDeathConfig(): DeathConfig {
    return {
      duration: 0,
      particles: {
        count: 8,
        colors: [0xFF4400, 0xFF6600],
        speed: 2
      },
      explosion: {
        size: 1.2,
        color: 0xFF5500
      }
    }
  }
  
  // 🌟 SPAWN ANIMATION HOOK 🌟
  protected onSpawnUpdate(progress: number): void {
    // Simple elastic scale-in
    const elasticProgress = progress < 1 
      ? 1 - Math.pow(1 - progress, 3)
      : 1
    this.mesh.scale.setScalar(Math.max(0.01, elasticProgress))
  }

  // Override update to use parent lifecycle system
  update(deltaTime: number, player: Player): void {
    // Use parent's lifecycle state machine
    super.update(deltaTime, player)
    
    // Only do custom updates when alive
    if (this.state !== EnemyState.ALIVE) return
    if (!this.alive) return
    
    // Store last position for trail calculation
    this.lastPosition.copy(this.position)
    
    this.updateAI(deltaTime, player)
    
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    this.mesh.position.set(this.position.x, this.position.y, 0)
    
    // Create trail effects if moving fast enough and effects system is available
    this.updateTrails(deltaTime)

    // Update visual effects
    this.updateVisuals(deltaTime)
  }

  updateAI(deltaTime: number, player: Player): void {
    // Don't run AI during spawn/death
    if (this.state !== EnemyState.ALIVE) return
    
    // Simple pathfinding toward player with slight sway
    const playerPos = player.getPosition()
    const toPlayer = playerPos.clone().sub(this.position)
    const direction = toPlayer.normalize()
    
    // Add perpendicular sway to prevent perfect alignment
    this.movementOffset += deltaTime * this.swaySpeed
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0)
    const sway = Math.sin(this.movementOffset) * this.swayAmount
    
    // Combine forward movement with perpendicular sway
    this.velocity = direction.clone()
      .add(perpendicular.multiplyScalar(sway))
      .normalize()
      .multiplyScalar(this.speed)
  }

  protected updateVisuals(deltaTime: number): void {
    // Only animate when alive
    if (this.state !== EnemyState.ALIVE) return
    
    const time = Date.now() * 0.001
    
    // 🎮 FASTER PULSING - More aggressive! 🎮
    const pulse = Math.sin(time * 20) * 0.3 + 1
    this.mesh.scale.setScalar(pulse)
    
    // 🌪️ AGGRESSIVE ROTATION - All axes! 🌪️
    this.mesh.rotation.x += deltaTime * 6
    this.mesh.rotation.y += deltaTime * 7
    this.mesh.rotation.z += deltaTime * 5
    
    // 💫 ANIMATE WIREFRAME - Pulsing! 💫
    const wireframe = this.mesh.children[0] as THREE.Mesh
    if (wireframe) {
      const wireframeMaterial = wireframe.material as THREE.MeshBasicMaterial
      wireframeMaterial.opacity = 0.56 + Math.sin(time * 25) * 0.24 // 20% more transparent (was 0.7 + 0.3)
      wireframe.rotation.x += deltaTime * 3
      wireframe.rotation.y += deltaTime * 4
    }
    
    // 🌟 ANIMATE GLOW EFFECT - Breathing! 🌟
    const glow = this.mesh.children[1] as THREE.Mesh
    if (glow) {
      const glowMaterial = glow.material as THREE.MeshBasicMaterial
      glowMaterial.opacity = 0.16 + Math.sin(time * 15) * 0.16 // 20% more transparent (was 0.2 + 0.2)
      glow.scale.setScalar(1 + Math.sin(time * 12) * 0.2)
    }
    
    // ⚡ ANIMATE ENERGY AURA - Rotating ring! ⚡
    const aura = this.mesh.children[2] as THREE.Mesh
    if (aura) {
      const auraMaterial = aura.material as THREE.MeshBasicMaterial
      auraMaterial.opacity = 0.32 + Math.sin(time * 18) * 0.24 // 20% more transparent (was 0.4 + 0.3)
      aura.rotation.z += deltaTime * 8
      aura.scale.setScalar(1 + Math.sin(time * 10) * 0.3)
    }
    
    // ✨ ANIMATE CORE - Pulsing center! ✨
    const core = this.mesh.children[3] as THREE.Mesh
    if (core) {
      const coreMaterial = core.material as THREE.MeshBasicMaterial
      coreMaterial.opacity = 0.56 + Math.sin(time * 30) * 0.24 // 20% more transparent (was 0.7 + 0.3)
      core.scale.setScalar(0.8 + Math.sin(time * 25) * 0.4)
    }
    
    // 🔥 ANIMATE ENERGY SPIKES - Rotating spikes! 🔥
    for (let i = 4; i < this.mesh.children.length; i++) {
      const spike = this.mesh.children[i] as THREE.Mesh
      if (spike) {
        spike.rotation.z += deltaTime * (10 + i * 2)
        const spikeMaterial = spike.material as THREE.MeshBasicMaterial
        spikeMaterial.opacity = 0.48 + Math.sin(time * 20 + i) * 0.24 // 20% more transparent (was 0.6 + 0.3)
      }
    }
  }
}

