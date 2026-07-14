import { expect, test } from '@playwright/test'
import type * as THREE from 'three'

test.describe('enemy lifecycle', () => {
  test('hit flashes are frame-driven and restore visuals before disposal', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(async () => {
      const [{ ScanDrone }, { EnemyState }] = await Promise.all([
        import('/src/entities/ScanDrone.ts'),
        import('/src/entities/Enemy.ts'),
      ])
      const enemy = new ScanDrone(0, 0)
      enemy.initialize()
      Object.assign(enemy, { state: EnemyState.ALIVE })

      const mesh = enemy.getMesh()
      const material = mesh.material as THREE.MeshBasicMaterial
      const originalColor = material.color.getHex()
      const originalScale = mesh.scale.x
      const updateHitFlash = (deltaTime: number) => {
        (enemy as unknown as { updateHitFlash: (deltaTime: number) => void })
          .updateHitFlash(deltaTime)
      }

      enemy.takeDamage(1)
      const initialFlash = { color: material.color.getHex(), scale: mesh.scale.x }
      updateHitFlash(0.06)
      const whiteFlash = material.color.getHex()
      updateHitFlash(0.05)
      const fadingFlash = { color: material.color.getHex(), scale: mesh.scale.x }
      updateHitFlash(0.1)
      const restoredColor = material.color.getHex()

      enemy.takeDamage(1)
      enemy.destroy()

      return {
        originalColor,
        originalScale,
        initialFlash,
        whiteFlash,
        fadingFlash,
        restoredColor,
        colorAfterDestroy: material.color.getHex(),
        scaleAfterDestroy: mesh.scale.x,
      }
    })

    expect(result.initialFlash.color).toBe(0xFF0000)
    expect(result.initialFlash.scale).toBeCloseTo(result.originalScale * 1.3)
    expect(result.whiteFlash).toBe(0xFFAAAA)
    expect(result.fadingFlash.color).toBe(0xFF4444)
    expect(result.fadingFlash.scale).toBeCloseTo(result.originalScale)
    expect(result.restoredColor).toBe(result.originalColor)
    expect(result.colorAfterDestroy).toBe(result.originalColor)
    expect(result.scaleAfterDestroy).toBeCloseTo(result.originalScale)
  })
})
