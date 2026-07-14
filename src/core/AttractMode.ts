/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 ATTRACT MODE - Visual Demo System
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Drives the title screen's THREAT DATABASE: one real, live enemy instance
 * pinned behind each card's transparent window. No player, no gameplay.
 *
 * - Real entity classes, idle-animating, clipped to their card slots
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
  private static readonly EXHIBIT_FILL_RATIO = 0.82

  private scene: THREE.Scene
  private isActive: boolean = false

  // Threat-database exhibits: one REAL enemy instance pinned behind each card's
  // transparent window (element rect → NDC → unproject). The menu never lies.
  private static readonly EXHIBIT_TYPES: Record<string, ExhibitType> = {
    datamite: { create: () => new DataMite(0, 0), visualRadius: 0.7 },
    scandrone: { create: () => new ScanDrone(0, 0), visualRadius: 1.6 },
    chaosworm: { create: () => new ChaosWorm(0, 0), visualRadius: 1.3 },
    crystalswarm: { create: () => new CrystalShardSwarm(0, 0), visualRadius: 5.8 },
    voidsphere: { create: () => new VoidSphere(0, 0), visualRadius: 4.8 },
    fizzer: { create: () => new Fizzer(0, 0), visualRadius: 0.4 },
    ufo: { create: () => new UFO(0, 0), visualRadius: 1.25 },
    boss: { create: () => new Boss(0, 0), visualRadius: 3.6 },
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
    console.log('🎮 Attract Mode: Started (threat-database exhibits)')
  }

  /**
   * Stop attract mode and cleanup all enemies
   */
  stop(): void {
    if (!this.isActive) return

    this.isActive = false
    this.clearExhibits()
    console.log('🎮 Attract Mode: Stopped and cleaned up')
  }

  /**
   * Update attract mode - move fizzers around
   */
  update(deltaTime: number): void {
    if (!this.isActive) return

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
    const desiredRadius =
      (Math.min(rect.width, rect.height) / 2) * AttractMode.EXHIBIT_FILL_RATIO * worldPerPx
    // Cap at 1: a specimen never renders larger than its true in-game size
    const scale = exhibit.displayScale ?? Math.min(1, desiredRadius / exhibit.visualRadius)
    const startScreen = exhibit.element.closest<HTMLElement>('#startScreen')
    const screenOpacity = startScreen ? Number.parseFloat(getComputedStyle(startScreen).opacity) : 1
    const transitionScale = Math.max(0, Math.min(1, screenOpacity))
    mesh.visible = transitionScale > 0.02
    mesh.scale.set(scale * transitionScale, scale * transitionScale, 1)

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
   * Check if attract mode is currently active
   */
  isRunning(): boolean {
    return this.isActive
  }

}
