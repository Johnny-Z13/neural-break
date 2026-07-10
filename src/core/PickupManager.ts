import * as THREE from 'three'
import { Player } from '../entities/Player'
import { SceneManager } from '../graphics/SceneManager'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { LevelManager } from './LevelManager'
import { ENEMY_CONFIG } from '../config'
import { DEBUG_MODE } from '../config'

/**
 * Base class for managing pickup entities (PowerUps, MedPacks, SpeedUps)
 * Eliminates code duplication across pickup managers
 * 🧲 Now with magnetism support - pickups get sucked towards player!
 */
export abstract class PickupManager<T extends { getMesh(): THREE.Mesh, isAlive(): boolean, update(deltaTime: number, playerPosition?: THREE.Vector3): void, setEffectsSystem(effectsSystem: EffectsSystem): void, destroy(): void }> {
  protected pickups: T[] = []
  protected sceneManager!: SceneManager // Initialized in initialize() method
  protected player!: Player // Initialized in initialize() method
  protected spawnTimer: number = 0
  protected effectsSystem: EffectsSystem | null = null
  protected levelManager: LevelManager | null = null
  protected spawnsThisLevel: number = 0
  protected lastSpawnTime: number = 0

  // Configuration - subclasses override these
  protected abstract readonly SPAWNS_PER_LEVEL: number
  protected abstract readonly SPAWN_INTERVAL_MIN: number
  protected abstract readonly SPAWN_INTERVAL_MAX: number

  initialize(sceneManager: SceneManager, player: Player): void {
    this.sceneManager = sceneManager
    this.player = player
  }

  setLevelManager(levelManager: LevelManager): void {
    this.levelManager = levelManager
    // Reset spawn counter when level changes
    this.spawnsThisLevel = 0
    this.lastSpawnTime = 0
  }

  setEffectsSystem(effectsSystem: EffectsSystem): void {
    this.effectsSystem = effectsSystem
  }

  update(deltaTime: number): void {
    // Update spawn timer
    this.spawnTimer += deltaTime
    
    // Calculate random spawn interval (FIXED - no longer relies on level duration!)
    const targetSpawns = this.SPAWNS_PER_LEVEL
    const randomInterval = this.SPAWN_INTERVAL_MIN + 
      (Math.random() * (this.SPAWN_INTERVAL_MAX - this.SPAWN_INTERVAL_MIN))
    
    // Check if we should spawn
    const timeSinceLastSpawn = this.spawnTimer - this.lastSpawnTime
    const shouldSpawn = this.shouldSpawn(timeSinceLastSpawn, randomInterval, targetSpawns)
    
    if (shouldSpawn) {
      this.spawnPickup()
      this.lastSpawnTime = this.spawnTimer
      this.spawnsThisLevel++
      
      // Debug logging
      if (DEBUG_MODE) {
        console.log(`✅ Spawned ${this.constructor.name} - Count: ${this.spawnsThisLevel}/${targetSpawns}, Next spawn in: ${randomInterval.toFixed(1)}s`)
      }
    }

    // Update all pickups with player position for magnetism
    const playerPosition = this.player.getPosition()
    for (const pickup of this.pickups) {
      if (pickup.isAlive()) {
        pickup.update(deltaTime, playerPosition)
      }
    }

    // Remove dead pickups
    this.cleanupDeadPickups()
  }

  /**
   * Override this method to add custom spawn conditions (e.g., health check for med packs)
   */
  protected shouldSpawn(timeSinceLastSpawn: number, randomInterval: number, targetSpawns: number): boolean {
    return timeSinceLastSpawn >= randomInterval && 
           this.spawnsThisLevel < targetSpawns
  }

  /**
   * Subclasses implement this to create their specific pickup type
   */
  protected abstract createPickup(x: number, y: number): T

  protected spawnPickup(): void {
    const spawnPos = this.getSpawnPosition()
    const pickup = this.createPickup(spawnPos.x, spawnPos.y)
    
    // Connect effects system
    if (this.effectsSystem) {
      pickup.setEffectsSystem(this.effectsSystem)
    }
    
    this.pickups.push(pickup)
    this.sceneManager.addToScene(pickup.getMesh())
  }

  protected getSpawnPosition(): THREE.Vector3 {
    const minDistanceFromPlayer = ENEMY_CONFIG.PICKUP.MIN_DISTANCE_FROM_PLAYER
    const playerPos = this.player.getPosition()
    
    let attempts = 0
    let x: number, y: number

    // 🔘 CIRCULAR SPAWN LOGIC for Arcade mode 🔘
    const boundaryRadius = 28 // Stay well within the 29.5 radius
    
    do {
      // Random position within circle: sqrt(random) for uniform distribution
      const r = boundaryRadius * Math.sqrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      x = r * Math.cos(theta)
      y = r * Math.sin(theta)
      attempts++
    } while (
      playerPos.distanceTo(new THREE.Vector3(x, y, 0)) < minDistanceFromPlayer &&
      attempts < ENEMY_CONFIG.PICKUP.SPAWN_ATTEMPTS
    )
    
    return new THREE.Vector3(x, y, 0)
  }

  protected cleanupDeadPickups(): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i]
      if (!pickup.isAlive()) {
        this.sceneManager.removeFromScene(pickup.getMesh())
        pickup.destroy()
        this.pickups.splice(i, 1)
      }
    }
  }

  getPickups(): T[] {
    return this.pickups
  }

  removePickup(pickup: T): void {
    const index = this.pickups.indexOf(pickup)
    if (index !== -1) {
      this.sceneManager.removeFromScene(pickup.getMesh())
      pickup.destroy()
      this.pickups.splice(index, 1)
    }
  }

  cleanup(): void {
    // Remove all pickups from scene and clear array
    for (const pickup of this.pickups) {
      this.sceneManager.removeFromScene(pickup.getMesh())
      pickup.destroy()
    }
    this.pickups = []
    
    // Reset spawn counters
    this.spawnTimer = 0
    this.spawnsThisLevel = 0
    this.lastSpawnTime = 0
  }

  // Reset for new level
  resetForNewLevel(): void {
    this.spawnsThisLevel = 0
    this.lastSpawnTime = this.spawnTimer
  }
}

