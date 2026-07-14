import { expect, test } from '@playwright/test'

test.describe('level progression', () => {
  test('enemy identities and score values remain stable', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(async () => {
      const [entities, { KILL_POINTS, ScoreManager }] = await Promise.all([
        import('/src/entities/index.ts'),
        import('/src/core/GameState.ts'),
      ])

      const enemies = [
        new entities.DataMite(0, 0),
        new entities.ScanDrone(0, 0),
        new entities.ChaosWorm(0, 0),
        new entities.VoidSphere(0, 0),
        new entities.CrystalShardSwarm(0, 0),
        new entities.Fizzer(0, 0),
        new entities.UFO(0, 0),
        new entities.Boss(0, 0),
      ]

      return enemies.map((enemy) => ({
        type: enemy.getType(),
        points: ScoreManager.getKillPoints(enemy.getType()),
        expectedPoints: KILL_POINTS[enemy.getType()],
      }))
    })

    expect(result).toEqual([
      { type: 'DataMite', points: 100, expectedPoints: 100 },
      { type: 'ScanDrone', points: 250, expectedPoints: 250 },
      { type: 'ChaosWorm', points: 500, expectedPoints: 500 },
      { type: 'VoidSphere', points: 1000, expectedPoints: 1000 },
      { type: 'CrystalShardSwarm', points: 750, expectedPoints: 750 },
      { type: 'Fizzer', points: 200, expectedPoints: 200 },
      { type: 'UFO', points: 1500, expectedPoints: 1500 },
      { type: 'Boss', points: 5000, expectedPoints: 5000 },
    ])
  })

  test('every configured level has reachable objectives and advances through Level 99', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(async () => {
      const { LevelManager } = await import('/src/core/LevelManager.ts')

      const objectiveTypes = {
        dataMites: 'DataMite',
        scanDrones: 'ScanDrone',
        chaosWorms: 'ChaosWorm',
        voidSpheres: 'VoidSphere',
        crystalSwarms: 'CrystalShardSwarm',
        fizzers: 'Fizzer',
        ufos: 'UFO',
        bosses: 'Boss',
      } as const
      const spawnRates = {
        dataMites: 'miteSpawnRate',
        scanDrones: 'droneSpawnRate',
        chaosWorms: 'wormSpawnRate',
        voidSpheres: 'voidSpawnRate',
        crystalSwarms: 'crystalSpawnRate',
        fizzers: 'fizzerSpawnRate',
        ufos: 'ufoSpawnRate',
        bosses: 'bossSpawnRate',
      } as const

      const levelManager = new LevelManager()
      const failures: string[] = []

      for (let expectedLevel = 1; expectedLevel <= LevelManager.getTotalLevels(); expectedLevel++) {
        const config = levelManager.getCurrentLevelConfig()

        if (config.level !== expectedLevel || levelManager.getCurrentLevel() !== expectedLevel) {
          failures.push(`Level sequence mismatch at ${expectedLevel}`)
        }

        for (const objectiveKey of Object.keys(objectiveTypes) as Array<keyof typeof objectiveTypes>) {
          const requiredKills = config.objectives[objectiveKey]
          const spawnRate = config[spawnRates[objectiveKey]]

          if (!Number.isInteger(requiredKills) || requiredKills < 0) {
            failures.push(`Level ${expectedLevel} has invalid ${objectiveKey} objective: ${requiredKills}`)
          }
          if (requiredKills > 0 && (!Number.isFinite(spawnRate) || spawnRate <= 0)) {
            failures.push(`Level ${expectedLevel} requires ${objectiveKey} with spawn rate ${spawnRate}`)
          }

          for (let kill = 0; kill < requiredKills; kill++) {
            levelManager.registerKill(objectiveTypes[objectiveKey])
          }
        }

        if (!levelManager.checkObjectivesComplete()) {
          failures.push(`Level ${expectedLevel} did not complete after meeting every objective`)
        }

        if (expectedLevel < LevelManager.getTotalLevels()) {
          levelManager.advanceLevel()
        }
      }

      return {
        failures,
        finalLevel: levelManager.getCurrentLevel(),
        gameComplete: levelManager.isGameComplete(),
        totalProgress: levelManager.getTotalProgress(),
      }
    })

    expect(result.failures).toEqual([])
    expect(result.finalLevel).toBe(99)
    expect(result.gameComplete).toBe(true)
    expect(result.totalProgress).toBe(100)
  })

  test('scheduled Fizzers are not blocked by the multiplier reward cap', async ({ page }) => {
    await page.goto('/')

    const scheduledSpawns = await page.evaluate(async () => {
      const { EnemyManager } = await import('/src/core/EnemyManager.ts')
      const manager = new EnemyManager()
      let spawnCount = 0

      Object.assign(manager, {
        levelManager: {
          getCurrentLevelConfig: () => ({
            level: 10,
            name: 'FIZZER TIMER TEST',
            objectives: {
              dataMites: 0,
              scanDrones: 0,
              chaosWorms: 0,
              voidSpheres: 0,
              crystalSwarms: 0,
              fizzers: 4,
              ufos: 0,
              bosses: 0,
            },
            miteSpawnRate: Infinity,
            droneSpawnRate: Infinity,
            wormSpawnRate: Infinity,
            voidSpawnRate: Infinity,
            crystalSpawnRate: Infinity,
            fizzerSpawnRate: 0.5,
            ufoSpawnRate: Infinity,
            bossSpawnRate: Infinity,
          }),
        },
        spawnScheduledFizzer: () => { spawnCount++ },
        resolveEnemyCollisions: () => {},
        cleanupDeadEnemies: () => {},
        updateOrphanedProjectiles: () => {},
      })

      for (let i = 0; i < 4; i++) {
        manager.update(1)
      }

      return spawnCount
    })

    expect(scheduledSpawns).toBe(4)
  })

  test('the live Game transition advances the HUD and run stats to Level 2', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 15_000 })
    await page.locator('#arcadeButton').click()

    await expect(page.locator('#score')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#gameLevel')).toHaveText('1', { timeout: 10_000 })
    await expect(page.locator('#timer')).toContainText('M:0/22 D:0/5')

    await page.evaluate(() => {
      if (!window.__NEURAL_BREAK_E2E__) {
        throw new Error('Neural Break E2E hook was not installed')
      }
      window.__NEURAL_BREAK_E2E__.completeCurrentObjectives()
    })

    await expect(page.locator('#gameLevel')).toHaveText('2', { timeout: 10_000 })
    await expect.poll(async () => page.evaluate(() => (
      window.__NEURAL_BREAK_E2E__?.getProgressionState()
    ))).toMatchObject({
      currentLevel: 2,
      statsLevel: 2,
      isTransitioning: false,
    })
  })
})
