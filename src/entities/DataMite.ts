import * as THREE from 'three'
import { Enemy, EnemyState, SpawnConfig } from './Enemy'
import { Player } from './Player'
import { BALANCE_CONFIG } from '../config'
import { solidPolygon } from '../graphics/VectorShapes'
import { ENTITY_PALETTE } from '../config/palette.config'

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
    const points = [
      new THREE.Vector2(0, 0.55),
      new THREE.Vector2(-0.38, -0.4),
      new THREE.Vector2(0, -0.18),
      new THREE.Vector2(0.38, -0.4),
    ]
    this.mesh = solidPolygon(points, ENTITY_PALETTE.DATA_MITE)
    this.mesh.position.copy(this.position)
    this.registerVector(points, 0.06, ENTITY_PALETTE.DATA_MITE, [this.mesh.material as THREE.MeshBasicMaterial])
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

    this.mesh.rotation.z += deltaTime * 1.2
  }
}

