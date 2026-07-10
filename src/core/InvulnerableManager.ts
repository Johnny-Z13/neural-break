import { Invulnerable } from '../entities/Invulnerable'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config/balance.config'

export class InvulnerableManager {
  private invulnerables: Invulnerable[] = []
  private sceneManager: SceneManager | null = null
  private spawnTimer: number = 0
  // Use average of min/max for regular spawning
  private spawnInterval: number = (BALANCE_CONFIG.PICKUPS.INVULNERABLE.SPAWN_INTERVAL_MIN + BALANCE_CONFIG.PICKUPS.INVULNERABLE.SPAWN_INTERVAL_MAX) / 2
  private maxInvulnerables: number = 1 // Only 1 at a time - keep rare!
  private worldRadius: number = 30 // Match game world size

  setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager
  }

  update(deltaTime: number): void {
    this.spawnTimer += deltaTime
    
    // Spawn new invulnerable if timer reached and not at max
    if (this.spawnTimer >= this.spawnInterval && this.invulnerables.length < this.maxInvulnerables) {
      this.spawnInvulnerable()
      this.spawnTimer = 0
    }
    
    // Update existing invulnerables (collision handled in Game.ts)
    for (let i = this.invulnerables.length - 1; i >= 0; i--) {
      const invulnerable = this.invulnerables[i]
      
      if (!invulnerable.isAlive()) {
        this.invulnerables.splice(i, 1)
        continue
      }
      
      invulnerable.update(deltaTime)
    }
  }

  private spawnInvulnerable(): void {
    let x: number, y: number

    // 🔘 CIRCULAR SPAWN LOGIC for Arcade mode 🔘
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * (this.worldRadius - 5) // Keep away from edges

    x = Math.cos(angle) * distance
    y = Math.sin(angle) * distance

    const invulnerable = new Invulnerable(x, y)
    this.invulnerables.push(invulnerable)
    
    // Add to scene
    if (this.sceneManager) {
      this.sceneManager.addToScene(invulnerable.getMesh())
    }
  }

  getInvulnerables(): Invulnerable[] {
    return this.invulnerables.filter(inv => inv.isAlive())
  }

  reset(): void {
    // Clean up all invulnerables
    for (const invulnerable of this.invulnerables) {
      if (this.sceneManager) {
        this.sceneManager.removeFromScene(invulnerable.getMesh())
      }
      invulnerable.destroy()
    }
    this.invulnerables = []
    this.spawnTimer = 0
  }

  // For manual spawning (e.g., testing or special events)
  spawnAt(x: number, y: number): void {
    if (this.invulnerables.length < this.maxInvulnerables) {
      const invulnerable = new Invulnerable(x, y)
      this.invulnerables.push(invulnerable)
      
      // Add to scene
      if (this.sceneManager) {
        this.sceneManager.addToScene(invulnerable.getMesh())
      }
    }
  }
}

