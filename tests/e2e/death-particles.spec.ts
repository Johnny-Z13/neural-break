import { test, expect } from '@playwright/test'
import type * as THREE from 'three'

test.describe('enemy death particles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('the first pooled particle is drawable immediately and after reset', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { ParticlePool } = await import('/src/graphics/effects/ParticlePool.ts')
      const pool = new ParticlePool(8, 'death')
      const system = pool.getParticleSystem()
      const position = system.position.clone().set(7, -3, 0.5)
      const velocity = system.position.clone().set(1, 0, 0)
      const material = system.material as THREE.PointsMaterial
      const color = material.color.clone().setRGB(1, 0.25, 0.1)

      const snapshot = () => {
        const positions = system.geometry.attributes.position.array as Float32Array
        return {
          drawCount: system.geometry.drawRange.count,
          position: Array.from(positions.slice(0, 3)),
          frustumCulled: system.frustumCulled,
        }
      }

      const initialDrawCount = system.geometry.drawRange.count
      pool.emit(position, velocity, color, 1)
      const firstEmission = snapshot()
      pool.reset()
      const resetDrawCount = system.geometry.drawRange.count
      pool.emit(position, velocity, color, 1)

      return {
        initialDrawCount,
        firstEmission,
        resetDrawCount,
        postResetEmission: snapshot(),
      }
    })

    expect(result.initialDrawCount).toBe(0)
    expect(result.firstEmission.drawCount).toBe(1)
    expect(result.firstEmission.position).toEqual([7, -3, 0.5])
    expect(result.firstEmission.frustumCulled).toBe(false)
    expect(result.resetDrawCount).toBe(0)
    expect(result.postResetEmission.drawCount).toBe(1)
    expect(result.postResetEmission.position).toEqual([7, -3, 0.5])
  })

  test('each of the first three enemy deaths populates both explosion layers immediately', async ({ page }) => {
    const bursts = await page.evaluate(async () => {
      const { DataMite } = await import('/src/entities/DataMite.ts')
      const { EnemyState } = await import('/src/entities/Enemy.ts')
      const { EffectsSystem } = await import('/src/graphics/EffectsSystem.ts')
      const effects = new EffectsSystem({ add: () => {}, remove: () => {} } as never)
      const pools = (effects as unknown as {
        particlePools: Map<string, { getParticleSystem: () => THREE.Points }>
      }).particlePools
      const results: Array<{
        explosionCount: number
        deathCount: number
        explosionOrigin: number[]
        deathOrigin: number[]
      }> = []

      for (let i = 0; i < 3; i++) {
        effects.cleanup()

        const enemy = new DataMite(i + 1, -i)
        enemy.initialize()
        Object.assign(enemy, { state: EnemyState.ALIVE })
        enemy.setEffectsSystem(effects)
        enemy.takeDamage(9999)

        const explosionSystem = pools.get('explosion')!.getParticleSystem()
        const deathSystem = pools.get('death')!.getParticleSystem()
        const explosionPositions = explosionSystem.geometry.attributes.position.array as Float32Array
        const deathPositions = deathSystem.geometry.attributes.position.array as Float32Array
        const normalizeSignedZero = (value: number) => Object.is(value, -0) ? 0 : value
        results.push({
          explosionCount: explosionSystem.geometry.drawRange.count,
          deathCount: deathSystem.geometry.drawRange.count,
          explosionOrigin: Array.from(explosionPositions.slice(0, 3), normalizeSignedZero),
          deathOrigin: Array.from(deathPositions.slice(0, 3), normalizeSignedZero),
        })
      }

      return results
    })

    expect(bursts).toEqual([
      { explosionCount: 96, deathCount: 100, explosionOrigin: [1, 0, 0], deathOrigin: [1, 0, 0] },
      { explosionCount: 96, deathCount: 100, explosionOrigin: [2, -1, 0], deathOrigin: [2, -1, 0] },
      { explosionCount: 96, deathCount: 100, explosionOrigin: [3, -2, 0], deathOrigin: [3, -2, 0] },
    ])
  })
})
