import { test, expect, Page } from '@playwright/test'

/**
 * Neural Break — Playwright smoke suite.
 * This is the regression gate every later roadmap task runs (`npm test`).
 *
 * Coverage:
 *  (a) boot: page loads, no console errors, #startScreen visible
 *  (b) keyboard menu nav reaches HI SCORES and back
 *  (c) starting ARCADE hides start screen, shows HUD
 *  (d) ESC pauses (overlay visible), ESC resumes
 *  (e) leaderboard shows content or empty state with mocked API
 *
 * Known issue (do not assert on this flow): GameOverScreen high-score
 * name entry is broken (tracked as Task 1.1). This suite never drives
 * a player to game-over.
 *
 * Known issue (pre-existing, not introduced by the Rogue-mode removal):
 * at the 1280x720 test viewport, the fixed-position .controls-legend bar
 * overlaps part of the vertical menu list (confirmed present against the
 * OPTIONS button before this menu was reordered too). #leaderboardButton
 * currently sits partially behind the legend, so tests below navigate to
 * it via keyboard rather than a raw mouse .click() to avoid flakiness.
 */

// Mocked /api/highscores response — matches HighScoreEntry in src/core/GameState.ts
// and the array-of-entries shape read in src/data/HighScoreService.ts.
const MOCK_HIGH_SCORES = [
  {
    name: 'ACE',
    score: 123456,
    survivedTime: 321,
    level: 42,
    date: '07/01/26',
    location: 'USA',
    gameMode: 'original',
  },
  {
    name: 'ZED',
    score: 98765,
    survivedTime: 210,
    level: 30,
    date: '06/28/26',
    location: 'UK',
    gameMode: 'original',
  },
]

/** Mock every endpoint the client can hit under /api/highscores (scores + stats + POST). */
async function mockHighScoresApi(page: Page, scores: unknown[] = MOCK_HIGH_SCORES): Promise<void> {
  await page.route('**/api/highscores*', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('stats') === 'true') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ playCount: 1234 }),
      })
      return
    }
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(scores),
    })
  })
}

/** Attach console-error / pageerror collectors before navigation. */
function collectErrors(page: Page): { errors: string[] } {
  const state = { errors: [] as string[] }
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      state.errors.push(`console.error: ${msg.text()}`)
    }
  })
  page.on('pageerror', (err) => {
    state.errors.push(`pageerror: ${err.message}`)
  })
  return state
}

test.describe('Neural Break smoke suite', () => {
  test('(a) boots with no console errors and #startScreen visible', async ({ page }) => {
    await mockHighScoresApi(page)
    const { errors } = collectErrors(page)

    await page.goto('/')

    const startScreen = page.locator('#startScreen')
    await expect(startScreen).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#arcadeButton')).toBeVisible()

    expect(errors, `Unexpected console/page errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('(b) keyboard menu nav reaches HI SCORES and back', async ({ page }) => {
    await mockHighScoresApi(page)
    await page.goto('/')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 15_000 })

    // Menu order: START GAME(0), OPTIONS(1), HI SCORES(2), TEST(3)
    // Navigate down 2 times from START GAME to reach HI SCORES.
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('#leaderboardButton')).toHaveClass(/selected/)

    await page.keyboard.press('Enter')

    const leaderboardScreen = page.locator('#leaderboardScreen')
    await expect(leaderboardScreen).toBeVisible({ timeout: 10_000 })

    // Back to menu via Escape (LeaderboardScreen treats Escape as "go back").
    await page.keyboard.press('Escape')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 10_000 })
  })

  test('(c) starting ARCADE hides start screen and shows the HUD', async ({ page }) => {
    await mockHighScoresApi(page)
    const { errors } = collectErrors(page)

    await page.goto('/')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 15_000 })

    await page.locator('#arcadeButton').click()

    await expect(page.locator('#startScreen')).toHaveCount(0, { timeout: 10_000 })

    // HUD visibility is per-element (.hud-element), flipped to display:block
    // by UIManager.setHUDVisibility(true) in initializeNewGame().
    const scoreHud = page.locator('#score')
    await expect(scoreHud).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#healthBar')).toBeVisible()

    expect(
      errors.filter((e) => !e.includes('favicon')),
      `Unexpected console/page errors after starting ARCADE:\n${errors.join('\n')}`
    ).toEqual([])
  })

  test('(d) ESC pauses and ESC resumes', async ({ page }) => {
    await mockHighScoresApi(page)
    await page.goto('/')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 15_000 })

    await page.locator('#arcadeButton').click()
    await expect(page.locator('#startScreen')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.locator('#score')).toBeVisible({ timeout: 10_000 })

    // Pause is polled once per frame in Game.update() while gameState === PLAYING;
    // give the loop a moment to be running before pressing Escape.
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')

    const pauseScreen = page.locator('#pauseScreen')
    await expect(pauseScreen).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#pauseTitle')).toContainText('PAUSED')

    // PauseScreen's own keydown listener treats Escape as "continue".
    await page.keyboard.press('Escape')
    await expect(pauseScreen).toHaveCount(0, { timeout: 10_000 })
  })

  test('(e) leaderboard shows mocked scores', async ({ page }) => {
    await mockHighScoresApi(page)
    await page.goto('/')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 15_000 })

    // Menu order: START GAME(0), OPTIONS(1), HI SCORES(2), TEST(3).
    // Navigate via keyboard (see file-level note on the .controls-legend overlap).
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('#leaderboardScreen')).toBeVisible({ timeout: 10_000 })

    const scoresList = page.locator('#leaderboardScoresList')
    await expect(scoresList).toBeVisible()
    await expect(scoresList).toContainText('ACE')
    await expect(scoresList.locator('.score-row')).toHaveCount(2)
  })

  test('(e2) leaderboard shows empty state when API returns no scores', async ({ page }) => {
    await mockHighScoresApi(page, [])
    await page.goto('/')
    await expect(page.locator('#startScreen')).toBeVisible({ timeout: 15_000 })

    // Menu order: START GAME(0), OPTIONS(1), HI SCORES(2), TEST(3).
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.locator('#leaderboardScreen')).toBeVisible({ timeout: 10_000 })

    const scoresList = page.locator('#leaderboardScoresList')
    await expect(scoresList).toContainText('NO SCORES YET')
  })
})
