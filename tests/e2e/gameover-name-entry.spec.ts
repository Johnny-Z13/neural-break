import { test, expect, Page } from '@playwright/test'

/**
 * Neural Break — GameOverScreen high-score name entry (Task 1.1).
 *
 * Regression test for a broken keyboard/gamepad handler: GameOverScreen's
 * navigation code queried `#saveButton` / `#nameInput`, but the real
 * element ids are `#saveScoreButton` / `#playerNameInput` (see the markup
 * and the click-handler wiring earlier in the same file). Result: the save
 * button was unreachable via keyboard/gamepad, and typing into the name
 * field was swallowed by menu navigation because the focused-input guard
 * never matched the real input element.
 *
 * Reaches game-over cheaply by clicking the real TEST menu button (live
 * StartScreen click handler, so its own document-level keydown listener is
 * torn down for real via StartScreen.cleanup()), then invoking
 * GameScreens.showGameOverScreen via a dynamic import in page context.
 * GameOverScreen.create() is self-contained (stats, gameMode, audioManager,
 * onRestart) and does not require a running level loop, so this drives the
 * real production code path without adding any new production debug hooks.
 *
 * Note: a dynamic import() from page.evaluate() resolves to a *separate*
 * module graph instance from the one main.ts already booted (verified via
 * CDP: GameScreens.audioManager is null on the freshly-imported class even
 * though the live instance has one set). So cleanup must happen through the
 * real DOM interaction (the click), not by re-importing StartScreen and
 * calling cleanup() on the disconnected copy.
 */

const EMPTY_SCORES: unknown[] = []

/** Mock every endpoint the client can hit under /api/highscores (scores + stats + POST). */
async function mockHighScoresApi(page: Page): Promise<{ postCalled: () => boolean }> {
  let postCalled = false
  let storedScores = [...EMPTY_SCORES]
  await page.route('**/api/highscores*', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('stats') === 'true') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ playCount: 1 }),
      })
      return
    }
    if (route.request().method() === 'POST') {
      postCalled = true
      storedScores = [route.request().postDataJSON(), ...storedScores]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
      return
    }
    // Empty initially, then return the submitted entry on the leaderboard fetch.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(storedScores),
    })
  })
  return { postCalled: () => postCalled }
}

/**
 * Reach game-over cheaply: real-click TEST on the live StartScreen (tears
 * down its keydown listener for real), then dynamically import GameScreens
 * to invoke showGameOverScreen directly with a fake high-score-worthy stats
 * blob — skipping the cost of actually dying in a live TEST run.
 */
async function showGameOverScreen(page: Page): Promise<void> {
  await page.locator('#testButton').click()
  await expect(page.locator('#startScreen')).toHaveCount(0, { timeout: 10_000 })

  await page.evaluate(async () => {
    const gameScreensModule = await import('/src/ui/GameScreens.ts')
    const gameStateModule = await import('/src/core/GameState.ts')

    const stats = {
      score: 999999,
      survivedTime: 100,
      level: 5,
      enemiesKilled: 10,
      dataMinersKilled: 1,
      scanDronesKilled: 1,
      chaosWormsKilled: 1,
      voidSpheresKilled: 1,
      crystalSwarmsKilled: 1,
      fizzersKilled: 1,
      ufosKilled: 1,
      bossesKilled: 1,
      damageTaken: 0,
      totalXP: 0,
      highestCombo: 0,
      highestMultiplier: 1,
      gameCompleted: false,
    }
    await gameScreensModule.GameScreens.showGameOverScreen(
      stats,
      gameStateModule.GameMode.ORIGINAL,
      () => gameScreensModule.GameScreens.showStartScreen(() => {}, () => {})
    )
  })
}

test.describe('GameOverScreen high-score name entry', () => {
  test('pressing Enter saves, opens the leaderboard, and returns to the front screen', async ({ page }) => {
    const api = await mockHighScoresApi(page)

    await page.goto('/')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 15_000 })

    await showGameOverScreen(page)

    const nameInput = page.locator('#playerNameInput')
    await expect(nameInput).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#saveScoreButton')).toBeVisible()

    // Focus + type WASD. If the focused-input guard in the keyboard handler
    // doesn't recognize this element (wrong id), these keys get intercepted
    // as menu navigation instead of reaching the input's value.
    await nameInput.click()
    await nameInput.fill('')
    await page.keyboard.type('WASD')
    await expect(nameInput).toHaveValue('WASD')

    // Enter should trigger save via the keyboard handler's saveButton lookup.
    await page.keyboard.press('Enter')

    await expect.poll(() => api.postCalled()).toBe(true)
    await expect(page.locator('#leaderboardScreen')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#leaderboardScoresList')).toContainText('WASD')
    await expect(page.locator('#backButton')).toBeVisible()

    await page.locator('#backButton').click()
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 10_000 })
  })

  test('clicking save also works (baseline, not keyboard-dependent)', async ({ page }) => {
    const api = await mockHighScoresApi(page)

    await page.goto('/')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 15_000 })

    await showGameOverScreen(page)

    const nameInput = page.locator('#playerNameInput')
    await expect(nameInput).toBeVisible({ timeout: 10_000 })

    await nameInput.fill('ZZZZ')
    await page.locator('#saveScoreButton').click()

    await expect.poll(() => api.postCalled()).toBe(true)
    await expect(page.locator('#leaderboardScreen')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#leaderboardScoresList')).toContainText('ZZZZ')
  })
})
