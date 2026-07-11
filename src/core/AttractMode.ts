/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 ATTRACT MODE - Visual Demo System
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Runs behind the title screen showing enemies flying around.
 * No player, no gameplay - just a visual showcase of enemy types.
 * 
 * Features:
 * - Random enemy spawning
 * - Autonomous movement patterns
 * - Visual variety with all enemy types
 * - Automatic cleanup when game starts
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three'
import { Enemy, EnemyState } from '../entities/Enemy'
import { DataMite } from '../entities/DataMite'
import { Fizzer } from '../entities/Fizzer'
import { ScanDrone } from '../entities/ScanDrone'
import { ChaosWorm } from '../entities/ChaosWorm'
import { CrystalShardSwarm } from '../entities/CrystalShardSwarm'
import { UFO } from '../entities/UFO'
import { VoidSphere } from '../entities/VoidSphere'
import { Boss } from '../entities/Boss'

interface RosterEntry {
  create: (x: number, y: number) => Enemy
  max: number
}

interface AttractEnemy {
  enemy: Enemy
  velocity: THREE.Vector2
  targetPosition: THREE.Vector2
  retargetTimer: number
  retargetInterval: number
  rosterIndex: number
}

interface ExhibitType {
  create: () => Enemy
  visualRadius: number // world units of the entity's silhouette, for fit-scaling into a card slot
  displayScale?: number // override: render larger than slot-fit (clip planes crop the spill)
}

interface Exhibit {
  enemy: Enemy
  element: HTMLElement
  visualRadius: number
  displayScale?: number
  clipPlanes: THREE.Plane[]
}

export class AttractMode {
  private enemies: AttractEnemy[] = []
  private scene: THREE.Scene
  private isActive: boolean = false
  private readonly boundaryRadius: number = 35 // Larger than gameplay area

  // Full living enemy roster for the title screen backdrop. Boss stays out
  // deliberately - a 7-unit hex dominates the menu backdrop.
  private static readonly ROSTER: RosterEntry[] = [
    { create: (x, y) => new DataMite(x, y), max: 3 },
    { create: (x, y) => new Fizzer(x, y), max: 2 },
    { create: (x, y) => new ScanDrone(x, y), max: 1 },
    { create: (x, y) => new ChaosWorm(x, y), max: 1 },
    { create: (x, y) => new CrystalShardSwarm(x, y), max: 1 },
    { create: (x, y) => new UFO(x, y), max: 1 },
    { create: (x, y) => new VoidSphere(x, y), max: 1 },
  ]

  // Threat-database exhibits: one REAL enemy instance pinned behind each card's
  // transparent window (element rect → NDC → unproject). The menu never lies.
  private static readonly EXHIBIT_TYPES: Record<string, ExhibitType> = {
    datamite: { create: () => new DataMite(0, 0), visualRadius: 0.55 },
    scandrone: { create: () => new ScanDrone(0, 0), visualRadius: 1.4 },
    chaosworm: { create: () => new ChaosWorm(0, 0), visualRadius: 1.3 },
    crystalswarm: { create: () => new CrystalShardSwarm(0, 0), visualRadius: 4.0 },
    voidsphere: { create: () => new VoidSphere(0, 0), visualRadius: 3.4 },
    fizzer: { create: () => new Fizzer(0, 0), visualRadius: 0.4 },
    // Pale hairline strokes need to render larger to read; the clip planes crop the spill
    ufo: { create: () => new UFO(0, 0), visualRadius: 0.95, displayScale: 0.75 },
    boss: { create: () => new Boss(0, 0), visualRadius: 3.0 },
  }

  private exhibits: Exhibit[] = []
  private camera: THREE.OrthographicCamera | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /**
   * Camera used to pin exhibits behind their DOM card slots
   */
  setCamera(camera: THREE.OrthographicCamera): void {
    this.camera = camera
  }

  /**
   * Start attract mode - spawns the full roster immediately
   */
  start(): void {
    if (this.isActive) return

    this.isActive = true
    console.log('🎮 Attract Mode: Started (full roster)')

    // Spawn each roster type up to its max
    for (let rosterIndex = 0; rosterIndex < AttractMode.ROSTER.length; rosterIndex++) {
      const entry = AttractMode.ROSTER[rosterIndex]
      for (let i = 0; i < entry.max; i++) {
        this.spawnOfType(rosterIndex)
      }
    }
  }

  /**
   * Stop attract mode and cleanup all enemies
   */
  stop(): void {
    if (!this.isActive) return
    
    this.isActive = false

    // Remove all enemies from scene
    for (const attractEnemy of this.enemies) {
      const mesh = attractEnemy.enemy.getMesh()
      if (mesh) {
        this.scene.remove(mesh)
      }
      attractEnemy.enemy.destroy()
    }

    this.enemies = []
    this.clearExhibits()
    console.log('🎮 Attract Mode: Stopped and cleaned up')
  }

  /**
   * Update attract mode - move fizzers around
   */
  update(deltaTime: number): void {
    if (!this.isActive) return

    // Update all fizzers
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const attractEnemy = this.enemies[i]

      // Update enemy animation (but catch any errors from missing game systems)
      try {
        // @ts-expect-error - attract mode has no Player; the surrounding try/catch is
        // load-bearing (enemy AI throws on the missing player and no-ops). A typed fix
        // requires guarding player access in all subclass updateAI overrides — deferred.
        attractEnemy.enemy.update(deltaTime, undefined)
      } catch {
        // AI threw before reaching its updateVisuals() call (missing player/scene
        // systems) — run the idle animation directly so sweep/spin/etc. still play.
        ;(attractEnemy.enemy as unknown as { updateVisuals?(dt: number): void }).updateVisuals?.(deltaTime)
      }

      // Update autonomous movement - fizzers zip around fast!
      this.updateEnemyMovement(attractEnemy, deltaTime)

      // Wrap around screen edges instead of removing
      const mesh = attractEnemy.enemy.getMesh()
      const pos = mesh.position
      const wrapRadius = this.boundaryRadius * 0.8

      if (pos.x > wrapRadius) pos.x = -wrapRadius
      if (pos.x < -wrapRadius) pos.x = wrapRadius
      if (pos.y > wrapRadius) pos.y = -wrapRadius
      if (pos.y < -wrapRadius) pos.y = wrapRadius
    }

    // Respawn whichever roster type died/expired, back up to its max
    for (let rosterIndex = 0; rosterIndex < AttractMode.ROSTER.length; rosterIndex++) {
      const entry = AttractMode.ROSTER[rosterIndex]
      let count = 0
      for (const attractEnemy of this.enemies) {
        if (attractEnemy.rosterIndex === rosterIndex) count++
      }
      while (count < entry.max) {
        this.spawnOfType(rosterIndex)
        count++
      }
    }

    this.updateExhibits(deltaTime)
  }

  /**
   * Update the threat-database exhibits: real enemies pinned behind card slots
   */
  private updateExhibits(deltaTime: number): void {
    if (!this.camera) return

    // (Re)bind whenever the start-screen DOM was (re)built — screens are torn
    // down and recreated when navigating to/from the leaderboard/options.
    if (this.exhibits.length === 0 || this.exhibits.some(e => !e.element.isConnected)) {
      this.rebindExhibits()
    }

    for (const exhibit of this.exhibits) {
      try {
        // @ts-expect-error - same missing-player pattern as the drifting roster above
        exhibit.enemy.update(deltaTime, undefined)
      } catch {
        ;(exhibit.enemy as unknown as { updateVisuals?(dt: number): void }).updateVisuals?.(deltaTime)
      }
      this.placeExhibit(exhibit)
    }
  }

  /**
   * Destroy current exhibits and rebuild them from [data-exhibit] card slots
   */
  private rebindExhibits(): void {
    this.clearExhibits()

    const slots = document.querySelectorAll<HTMLElement>('[data-exhibit]')
    slots.forEach(element => {
      const spec = AttractMode.EXHIBIT_TYPES[element.dataset.exhibit ?? '']
      if (!spec) return

      let enemy: Enemy | null = null
      try {
        enemy = spec.create()
        enemy.initialize()
      } catch (error) {
        console.warn('⚠️ Attract Mode: Failed to create exhibit:', error)
        return
      }

      // @ts-ignore - accessing protected property for attract mode
      enemy.state = EnemyState.ALIVE
      const mesh = enemy.getMesh()
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as any).opacity = 1
      }
      this.scene.add(mesh)

      // Clip the exhibit to its card window so oversized specimens crop cleanly
      const clipPlanes = [
        new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
      ]
      mesh.traverse(child => {
        const mat = (child as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
        if (!mat) return
        for (const m of Array.isArray(mat) ? mat : [mat]) m.clippingPlanes = clipPlanes
      })

      const exhibit: Exhibit = { enemy, element, visualRadius: spec.visualRadius, displayScale: spec.displayScale, clipPlanes }
      this.placeExhibit(exhibit)
      this.exhibits.push(exhibit)
    })
  }

  /**
   * Pin an exhibit's mesh behind its card slot: rect center → NDC → world,
   * scaled so the silhouette fits the slot at any window size.
   */
  private placeExhibit(exhibit: Exhibit): void {
    if (!this.camera) return
    const mesh = exhibit.enemy.getMesh()
    const rect = exhibit.element.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) {
      mesh.visible = false
      return
    }
    mesh.visible = true

    const ndcX = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1
    const ndcY = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1
    const world = new THREE.Vector3(ndcX, ndcY, 0).unproject(this.camera)
    mesh.position.set(world.x, world.y, 0)

    const worldPerPx = (this.camera.top - this.camera.bottom) / window.innerHeight
    const desiredRadius = (Math.min(rect.width, rect.height) / 2) * 0.95 * worldPerPx
    const scale = exhibit.displayScale ?? desiredRadius / exhibit.visualRadius
    mesh.scale.set(scale, scale, 1)

    // Clip to the window rect (world space): +x, -x, +y, -y bounds
    const left = world.x - (rect.width / 2) * worldPerPx
    const right = world.x + (rect.width / 2) * worldPerPx
    const bottom = world.y - (rect.height / 2) * worldPerPx
    const top = world.y + (rect.height / 2) * worldPerPx
    exhibit.clipPlanes[0].constant = -left
    exhibit.clipPlanes[1].constant = right
    exhibit.clipPlanes[2].constant = -bottom
    exhibit.clipPlanes[3].constant = top
  }

  private clearExhibits(): void {
    for (const exhibit of this.exhibits) {
      this.scene.remove(exhibit.enemy.getMesh())
      exhibit.enemy.destroy()
    }
    this.exhibits = []
  }

  /**
   * Spawn an enemy of the given roster type at a random position
   */
  private spawnOfType(rosterIndex: number): void {
    const entry = AttractMode.ROSTER[rosterIndex]

    // Spawn at random position within bounds
    const angle = Math.random() * Math.PI * 2
    const spawnRadius = Math.random() * this.boundaryRadius * 0.6
    const x = Math.cos(angle) * spawnRadius
    const y = Math.sin(angle) * spawnRadius

    let enemy: Enemy | null = null

    try {
      enemy = entry.create(x, y)
    } catch (error) {
      console.warn('⚠️ Attract Mode: Failed to create enemy:', error)
      return
    }

    if (!enemy) return

    // Initialize enemy to create its mesh
    enemy.initialize()

    // Skip spawn animation - set enemy to ALIVE state immediately
    // @ts-ignore - accessing protected property for attract mode
    enemy.state = EnemyState.ALIVE

    const mesh = enemy.getMesh()
    if (mesh) {
      mesh.scale.set(1, 1, 1)
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as any).opacity = 1
      }
      // Add enemy mesh to scene so it's visible!
      this.scene.add(mesh)
    }

    // Set random initial target
    const targetAngle = Math.random() * Math.PI * 2
    const targetDist = Math.random() * this.boundaryRadius * 0.6
    const targetX = Math.cos(targetAngle) * targetDist
    const targetY = Math.sin(targetAngle) * targetDist

    // Create attract enemy wrapper with fast retargeting for zippy movement
    const attractEnemy: AttractEnemy = {
      enemy,
      velocity: new THREE.Vector2(
        (Math.random() - 0.5) * 10, // Start with some velocity
        (Math.random() - 0.5) * 10
      ),
      targetPosition: new THREE.Vector2(targetX, targetY),
      retargetTimer: 0,
      retargetInterval: 1.0 + Math.random() * 1.5, // Fast retargeting: 1-2.5 seconds
      rosterIndex
    }

    this.enemies.push(attractEnemy)
  }

  /**
   * Update fizzer movement - fast and zippy!
   */
  private updateEnemyMovement(attractEnemy: AttractEnemy, deltaTime: number): void {
    const enemy = attractEnemy.enemy
    const pos = enemy.getMesh().position

    // Retarget frequently for erratic movement
    attractEnemy.retargetTimer += deltaTime
    if (attractEnemy.retargetTimer >= attractEnemy.retargetInterval) {
      attractEnemy.retargetTimer = 0
      attractEnemy.retargetInterval = 0.8 + Math.random() * 1.2 // Very fast retargeting

      // Pick new random target within bounds
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * this.boundaryRadius * 0.7
      attractEnemy.targetPosition.set(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist
      )
    }

    // Move towards target with snappy acceleration
    const dx = attractEnemy.targetPosition.x - pos.x
    const dy = attractEnemy.targetPosition.y - pos.y
    const distToTarget = Math.sqrt(dx * dx + dy * dy)

    if (distToTarget > 1) {
      // Normalize direction
      const dirX = dx / distToTarget
      const dirY = dy / distToTarget

      // Fast fizzer speed!
      const baseSpeed = 12.0
      const acceleration = 25.0

      // Snappy acceleration towards target
      attractEnemy.velocity.x += dirX * acceleration * deltaTime
      attractEnemy.velocity.y += dirY * acceleration * deltaTime

      // Limit velocity
      const speed = Math.sqrt(
        attractEnemy.velocity.x * attractEnemy.velocity.x +
        attractEnemy.velocity.y * attractEnemy.velocity.y
      )
      if (speed > baseSpeed) {
        attractEnemy.velocity.x = (attractEnemy.velocity.x / speed) * baseSpeed
        attractEnemy.velocity.y = (attractEnemy.velocity.y / speed) * baseSpeed
      }
    } else {
      // Quick direction change when reaching target
      attractEnemy.retargetTimer = attractEnemy.retargetInterval // Force retarget
    }

    // Apply velocity
    pos.x += attractEnemy.velocity.x * deltaTime
    pos.y += attractEnemy.velocity.y * deltaTime
  }

  /**
   * Check if attract mode is currently active
   */
  isRunning(): boolean {
    return this.isActive
  }

  /**
   * Get current enemy count (for debugging)
   */
  getEnemyCount(): number {
    return this.enemies.length
  }
}
