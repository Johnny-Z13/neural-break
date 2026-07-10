import { Invulnerable } from '../entities/Invulnerable'
import { Player } from '../entities/Player'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config/balance.config'

export class InvulnerableManager {
  private invulnerables: Invulnerable[] = []
  private sceneManager: SceneManager | null = null
  private player: Player | null = null
  private spawnTimer: number = 0
  // Use average of min/max for regular spawning
  private spawnInterval: number = (BALANCE_CONFIG.PICKUPS.INVULNERABLE.SPAWN_INTERVAL_MIN + BALANCE_CONFIG.PICKUPS.INVULNERABLE.SPAWN_INTERVAL_MAX) / 2
  private maxInvulnerables: number = 1 // Only 1 at a time - keep rare!
  private worldRadius: number = 30 // Match game world size
  
  // 🎲 Rogue mode support
  private isRogueMode: boolean = false
  private rogueBoundaryWidth: number = 16
  
  setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager
  }
  
  setPlayer(player: Player): void {
    this.player = player
  }
  
  /**
   * 🎲 Set Rogue mode for vertical spawning
   */
  setRogueMode(enabled: boolean, boundaryWidth: number = 16): void {
    this.isRogueMode = enabled
    this.rogueBoundaryWidth = boundaryWidth
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
    
    // 🎲 ROGUE MODE: Spawn above player within side barriers
    if (this.isRogueMode && this.player) {
      const playerPos = this.player.getPosition()
      const spawnHeightMin = 10   // Minimum distance above player
      const spawnHeightMax = 20   // Maximum distance above player
      const safeMargin = 2        // Stay away from barriers
      
      // Spawn within the corridor (between side barriers)
      x = (Math.random() - 0.5) * (this.rogueBoundaryWidth - safeMargin) * 2
      // Spawn above the player
      y = playerPos.y + spawnHeightMin + Math.random() * (spawnHeightMax - spawnHeightMin)
    } else {
      // 🔘 CIRCULAR SPAWN LOGIC for Arcade mode 🔘
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * (this.worldRadius - 5) // Keep away from edges
      
      x = Math.cos(angle) * distance
      y = Math.sin(angle) * distance
    }
    
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

