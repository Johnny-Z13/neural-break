# Neural Break Improvement Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bugs, leaks, and API holes found in the 2026-07-10 review, then pay down the architecture debt that makes every future change expensive.

**Architecture:** Six independent phases, each shippable on its own. Phase 0 builds the safety net (typecheck gate + smoke tests) that everything else is verified against. Fable acts as orchestrator/reviewer; implementation is dispatched to cheaper subagents wherever the spec is exact.

**Tech Stack:** Three.js 0.179 + TypeScript 5.9 (strict) + Vite 7, DOM/CSS UI, Web Audio, Vercel serverless + KV (Redis), Playwright.

## Model-tier legend (cost control)

| Tier | Used for | How dispatched |
|------|----------|----------------|
| 🟣 **Fable** | Decisions, gnarly refactors, collision/physics correctness, reviewing every subagent diff | This session |
| 🔵 **Sonnet** | Standard implementation from an exact spec | `Agent` tool, `model: sonnet` |
| ⚪ **Haiku** | Mechanical sweeps, one-line fixes, doc edits | `Agent` tool, `model: haiku` |

**Rules:** Every subagent diff gets a Fable review before commit (cheap — read the diff, not the repo). One task = one commit. Any task that fails twice escalates to Fable instead of retrying. Run `npm run typecheck` (added in Task 0.2) after every task once it exists.

## Global Constraints

- No behavior changes unless the task explicitly says so — refactors must be play-identical.
- Match existing code style exactly (no reformatting, no quote-style churn).
- Balance/tuning values live in `src/config/balance.config.ts` — never hardcode new ones.
- `DEBUG_MODE` (from `src/config/index.ts`) gates all new console logging.
- Verify gameplay-touching changes in the running game (`npm run dev`, port 3000), not just typecheck.
- Confirm before any destructive git/filesystem action.

---

## Phase 0 — Safety net (do first; everything else is verified against it)

### Task 0.1: Fix documentation drift ⚪ Haiku

**Files:**
- Modify: `CLAUDE.md` (Testing Strategy section)

**Problem:** CLAUDE.md describes a Playwright suite (`tests/e2e/`, cross-browser, config) that does not exist. `tests/` contains only `README.md` and `test_highscore.html`.

- [x] **Step 1:** Rewrite the "Testing Strategy" section of CLAUDE.md to describe the actual state: manual test page at `tests/test_highscore.html`; Playwright smoke suite being added at `tests/e2e/` (Task 0.3). Remove claims of existing cross-browser/visual-regression coverage.
- [x] **Step 2:** Commit: `docs: fix CLAUDE.md testing section to match reality`

### Task 0.2: Typecheck gate + burn down 227 TS errors 🔵 Sonnet (4 chunks) + 🟣 Fable review

**Files:**
- Modify: `package.json`, `tsconfig.json`, and ~20 source files across `src/`

**Problem:** `tsconfig.json` is strict but nothing runs `tsc`; `tsc --noEmit` reports 227 errors. Top offenders: `ui/UIManager.ts` (23), `core/AttractMode.ts` (22), `core/EnemyManager.ts` (17), `graphics/SceneManager.ts` (15), `entities/Enemy.ts` (14).

- [x] **Step 1:** Add scripts to `package.json`:

```json
"typecheck": "tsc --noEmit",
"build": "tsc --noEmit && vite build"
```

- [x] **Step 2:** Fix `src/config/index.ts(8)` `import.meta.env` error by adding to `tsconfig.json` compilerOptions: `"types": ["vite/client"]`.
- [x] **Step 3 (chunked, one subagent per chunk, commit per chunk):** Fix errors by directory: (a) `src/core/`, (b) `src/entities/`, (c) `src/ui/`, (d) `src/graphics/` + `src/weapons/`. Error classes and required treatment:
  - `TS6133` unused vars/imports → delete the dead symbol (do NOT `_`-prefix to silence).
  - `TS2445` protected access (`AttractMode.ts` reaching into `Enemy.mesh`/`position`) → add narrow public read-only accessors on `Enemy` (`getMesh(): THREE.Group`, `getPosition(): THREE.Vector3`) and use them; 🟣 Fable reviews this API addition specifically.
  - `TS2564` uninitialized fields (`EnemyManager.ts:14-15`) → definite-assignment via constructor wiring, not `!` unless initialization truly happens in `initialize()` (then `!` with the existing pattern).
  - `TS2322` `Fizzer` vs `Enemy` private-member conflict → move the duplicated private `updateDeathAnimation` up to the base class or rename; Fable reviews.
  - While in `src/entities/`: replace `private sceneManager: any` with `SceneManager` and `getProjectiles(): any[]` with `EnemyProjectile[]` (`Fizzer.ts:18`, `VoidSphere.ts:26`, `CrystalShardSwarm.ts:24`, `UFO.ts:17`, `ChaosWorm.ts:26`, `ScanDrone.ts:16-17`); type `getEnemyStatsForLevel`'s return in `balance.config.ts:384-418`.
- [x] **Step 4:** Run `npm run typecheck` → 0 errors. Run the game (`npm run dev`), play 60 seconds of Arcade: menu → game → pause → resume → die → game over.
- [x] **Step 5:** Commit per chunk: `fix(types): clean tsc errors in <dir>`

### Task 0.3: Playwright smoke suite 🔵 Sonnet

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `package.json` (`"test": "playwright test"`)

**Interfaces:**
- Produces: `npm test` — the regression gate every later task runs.

- [x] **Step 1:** `playwright.config.ts`: chromium only (keep it fast), `webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: true }`.
- [x] **Step 2:** Write `tests/e2e/smoke.spec.ts` covering: (a) page boots with no console errors and `#startScreen` visible; (b) keyboard menu nav reaches HI SCORES and back; (c) starting ARCADE hides the start screen and shows the HUD; (d) ESC pauses (pause overlay visible) and ESC resumes; (e) leaderboard screen shows loading→content or empty state with the `/api/highscores` request mocked via `page.route`.
- [x] **Step 3:** Run `npx playwright test` → all pass. Commit: `test: add Playwright smoke suite`

---

> **Plan drift (2026-07-10, user-directed, out of plan):** Rogue mode was deleted entirely (3c07a55) — menu is now START GAME / OPTIONS / HI SCORES / TEST, the leaderboard mode toggle is gone, and `'rogue'` is no longer a valid gameMode. Consequences for this plan: Task 5.2's "drop Tab from the leaderboard mode-toggle" bullet is moot (toggle deleted); Task 3.2's mode references reduce to Arcade/Test. Also shipped out of plan: favicon (d594273) and height-responsive fit fixes for StartScreen/Leaderboard (52830b2).

## Phase 1 — Bugs & leaks (cheap, high value, do second)

### Task 1.1: Fix broken high-score name entry 🔵 Sonnet

**Files:**
- Modify: `src/ui/screens/GameOverScreen.ts:783,809`
- Test: `tests/e2e/gameover-name-entry.spec.ts` (create)

**Problem:** Line 783 queries `#saveButton` (real id: `#saveScoreButton`, line 415); line 809 queries `#nameInput` (real id: `#playerNameInput`, line 403). Save is unreachable by keyboard/gamepad, and typing W/A/S/D into the name field is swallowed by menu navigation because the focused-input guard never matches.

- [x] **Step 1:** Write failing Playwright test: reach game over (drive via a debug hook or by mocking; if no cheap path to game over exists, test the screen in isolation by calling `GameOverScreen.show(...)` via `page.evaluate` — check how `GameScreens.ts` exposes it), focus the name input, type `WASD`, assert input value is `"WASD"`, press Enter, assert save request fires.
- [x] **Step 2:** Fix the two selectors:

```ts
const saveButton = gameOverScreen.querySelector('#saveScoreButton') as HTMLButtonElement | null
// ...
const nameInput = gameOverScreen.querySelector('#playerNameInput') as HTMLInputElement | null
```

- [x] **Step 3:** Test passes. Commit: `fix(ui): repair keyboard/gamepad high-score entry (wrong element ids)`

### Task 1.2: Dispose enemy GPU resources 🔵 Sonnet + 🟣 Fable review

**Files:**
- Modify: `src/entities/Enemy.ts:496-498` (base `destroy()`), subclass overrides (`Boss.ts:977`, `ChaosWorm.ts:521`, and any other `destroy()` overrides — grep `destroy()` across `src/entities/`)

**Problem:** `destroy()` only sets `this.alive = false`; geometries/materials are never disposed. Every restart/level-clear leaks VRAM.

- [ ] **Step 1:** In base `Enemy.destroy()`, traverse and dispose:

```ts
this.mesh.traverse((child) => {
  const m = child as THREE.Mesh
  if (m.geometry) m.geometry.dispose()
  if (m.material) {
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(mat => mat.dispose())
  }
})
```

- [ ] **Step 2:** Ensure every subclass override calls `super.destroy()`. Ensure destroy runs after `removeFromScene`, and that death-animation code never touches materials post-destroy (interacts with Task 1.3).
- [ ] **Step 3:** Verify in the running game with `renderer.info.memory` logged under `DEBUG_MODE`: play a level, note geometry count, restart 3×, count must return to baseline (report actual before/after numbers).
- [ ] **Step 4:** Commit: `fix(entities): dispose enemy geometry/materials on destroy`

### Task 1.3: Replace flashRed setTimeouts with update-driven flash 🔵 Sonnet

**Files:**
- Modify: `src/entities/Enemy.ts:377-405`

**Problem:** 4 chained `setTimeout`s per hit retain material refs and fire after death/dispose.

- [ ] **Step 1:** Replace with a `flashTimer` field decremented in `update(deltaTime)`; toggle emissive/color from the timer's phase; reset material state when it expires or on `destroy()`. No timeouts.
- [ ] **Step 2:** Verify in-game: hit flashes still visible; kill an enemy mid-flash — no console errors. Commit: `fix(entities): drive hit flash from update loop, not setTimeout`

### Task 1.4: Listener hygiene 🔵 Sonnet

**Files:**
- Modify: `src/core/InputManager.ts:35-49`, `src/core/Game.ts:211-213`, `src/ui/screens/LeaderboardScreen.ts:575`, `src/ui/screens/PauseScreen.ts:326`, `src/ui/screens/StartScreen.ts:1211`

- [ ] **Step 1:** InputManager: store bound handler refs; add `dispose()` that removes them.
- [ ] **Step 2:** Game audio-resume listeners: register with `{ once: true }` or guard against re-registration across `initialize()` calls.
- [ ] **Step 3:** Screens: remove the `gamepadbuttondown` audio-resume listener in each screen's `cleanup()` (`{ once: true }` only self-removes if it fires).
- [ ] **Step 4:** Verify: navigate menu ↔ leaderboard ↔ options 10×, check `getEventListeners(window)` in devtools (or count via debug log) doesn't grow. Commit: `fix: remove leaked event listeners across screens and input`

### Task 1.5: Route all SFX through AudioPool 🔵 Sonnet (mechanical, pattern exists) + 🟣 Fable review

**Files:**
- Modify: `src/audio/AudioManager.ts` (44 `queueSound` call sites)

**Problem:** Only 2 of 46 sound paths use `createManagedSound`, so oscillator/gain/filter nodes are `.stop()`ed but never `.disconnect()`ed and never counted against `MAX_CONCURRENT_SOUNDS`.

- [ ] **Step 1:** Study the 2 existing `createManagedSound` call sites — replicate that exact pattern across the other 44. Pure plumbing; do not change any synthesized sound parameters.
- [ ] **Step 2:** Verify: play 2 minutes with heavy combat; under `DEBUG_MODE` log `AudioPool` active-node count — must stay bounded (report the number). All SFX still audible.
- [ ] **Step 3:** Commit: `fix(audio): route all SFX through AudioPool for disconnect + concurrency limits`

---

## Phase 2 — High-score API hardening (independent; ship any time)

### Task 2.1: Score plausibility validation 🔵 Sonnet

**Files:**
- Modify: `api/highscores.ts:184-205`

- [ ] **Step 1:** Compute a generous max-score-per-second from `src/config/balance.config.ts` (max enemy score value × plausible kill rate × max multiplier — document the arithmetic in a comment). Reject with 400 when `score > survivedTime * MAX_SCORE_PER_SECOND` or `score > ABSOLUTE_MAX` (pick 10× the current #1 legit score as the ceiling constant).
- [ ] **Step 2:** Also bound `survivedTime` (< 24h) and `level` (1–99); trim/whitelist name chars (10 chars max already enforced client-side — enforce server-side too).
- [ ] **Step 3:** Test with `curl` POSTs: legit score passes, `score: 999999999, survivedTime: 1` rejected. Commit: `fix(api): reject implausible score submissions`

### Task 2.2: Per-IP rate limiting 🔵 Sonnet

**Files:**
- Modify: `api/highscores.ts` (POST handler, `:279-350`)

- [ ] **Step 1:** On POST, key `ratelimit:{ip}` from `x-forwarded-for` (first hop), `kv.incr` + `kv.expire(key, 60)` on first hit; return 429 above 5 submissions/minute.
- [ ] **Step 2:** `curl` 6 rapid POSTs → 6th returns 429. Commit: `fix(api): per-IP rate limit on score submission`

### Task 2.3: Atomic score storage (sorted sets) 🔵 Sonnet + 🟣 Fable review (data migration)

**Files:**
- Modify: `api/highscores.ts:294-339`

**Problem:** get-JSON-blob → mutate → set loses writes under concurrency.

- [ ] **Step 1:** Store per-mode sorted sets (`zadd('nb:scores:{mode}', { score, member: JSON.stringify(entry) })`), read with `zrange(..., { rev: true, count: N })`. Keep entry metadata (name, level, time, location, date) inside the member JSON.
- [ ] **Step 2:** Migration: on first read, if legacy key `neural_break_highscores` exists, backfill the sorted sets from it, then leave the legacy key untouched (rollback safety). 🟣 Fable reviews this step before it merges.
- [ ] **Step 3:** Verify on a Vercel preview deploy with real KV, not just locally: existing scores still appear; two parallel `curl` POSTs both land. Commit: `fix(api): atomic sorted-set score storage`

### Task 2.4: Restrict CORS ⚪ Haiku

**Files:**
- Modify: `api/highscores.ts:235-236`

- [ ] **Step 1:** Replace `Access-Control-Allow-Origin: '*'` with the deployed origin(s) (read the production domain from `vercel.json`/project settings; allow `http://localhost:3000` when `process.env.VERCEL_ENV !== 'production'`). Drop the meaningless `Allow-Credentials: true`.
- [ ] **Step 2:** Verify leaderboard still loads on the preview deploy. Commit: `fix(api): restrict CORS to game origins`

---

## Phase 3 — Core refactors 🟣 Fable-led (the expensive, judgment-heavy phase)

**Order matters: 3.1 → 3.2 → 3.3.** Each must leave the game play-identical (smoke suite + manual play verify).

### Task 3.1: One collision system + broad-phase + enemy cap 🟣 Fable

**Files:**
- Modify: `src/core/Game.ts:1789-2138` (inline `checkCollisions`), `src/core/EnemyManager.ts` (spatial grid `:189-233`, spawn methods `:83-163`), `src/config/balance.config.ts`
- Delete: `src/core/CollisionSystem.ts` (486 lines, never instantiated)

**Decision (made):** Delete the never-wired `CollisionSystem.ts` and extract a fresh module from the *live* inline code — the inline version is what's actually been played and tuned; the dead extraction has already drifted (e.g. multiplier cap).

- [ ] **Step 1:** Resolve the multiplier-cap conflict: code says 15 (`Game.ts:1906`), config says `MAX_MULTIPLIER: 10`. Keep current gameplay (15), update config to 15, make code read the config.
- [ ] **Step 2:** Extract `checkCollisions` into a new `src/core/Collisions.ts` module operating on injected refs (player, enemies, weapon system, callbacks) — behavior-identical, verified by smoke suite + manual play.
- [ ] **Step 3:** Reuse `EnemyManager`'s spatial grid for projectile→enemy and player→enemy queries (currently only enemy-enemy separation). Cache `getAllEnemyProjectiles()` per frame instead of rebuilding via `instanceof` chains (`EnemyManager.ts:902`).
- [ ] **Step 4:** Add `MAX_ACTIVE_ENEMIES` to `balance.config.ts` (pick from observed late-level counts; log peak count under `DEBUG_MODE` during a level-20 run to choose it) and gate spawns on it.
- [ ] **Step 5:** Delete `CollisionSystem.ts`. Verify: typecheck clean, smoke suite green, manual play of Arcade + Rogue feels identical, report frame-time before/after at high enemy counts. Commit per step.

### Task 3.2: Deduplicate Game session init + fix pause/stop sequencing 🟣 Fable

**Files:**
- Modify: `src/core/Game.ts` (`initializeNewGame`/`initializeRogueMode`/`initializeTestMode` `:349-1050`, pause `:302-319`, `endGame`/`startNewGame` timers `:329,341,557,836`)

- [ ] **Step 1:** Extract one `setupGameSession(config: SessionConfig)` covering the ~90% shared body (stats reset, Player + callbacks, WeaponSystem + heat callbacks, pickup managers, camera/frustum). The three mode methods become thin config wrappers. Play-identical.
- [ ] **Step 2:** Replace pause-by-loop-teardown with a `paused` flag checked inside `gameLoop` (RAF keeps running, update skipped; reset `lastTime` on unpause). Remove the `setTimeout(…,100)` sequencing in `endGame`/`startNewGame` by making `stop()` synchronous.
- [ ] **Step 3:** Verify: pause/resume during heavy combat, rapid restart double-click spam, mode switching Arcade↔Rogue↔Test. Smoke suite green. Commit per step.

### Task 3.3: Extract animation controllers 🔵 Sonnet (spec written by Fable after 3.2)

**Files:**
- Create: `src/core/DeathSequence.ts`, `src/core/LevelTransition.ts` (exact split decided in 3.2's aftermath)
- Modify: `src/core/Game.ts`

- [ ] **Step 1:** Fable writes the extraction spec (state fields + methods to move, exact interfaces) as a task prompt once 3.2 lands.
- [ ] **Step 2:** Sonnet executes; play-identical verify; commit.

### Task 3.4: Dead code sweep 🔵 Sonnet

**Files:**
- Modify: `src/entities/Enemy.ts:408-480` (`createDeathEffect` no-op + `createOldDeathEffect`), `src/core/EnemyManager.ts:300-342` (legacy spawn-rate methods), `src/core/Game.ts:541` (`(this as any).lastFrameTime`), `src/weapons/WeaponSystem.ts:423-438`

- [ ] **Step 1:** Delete the dead methods/assignments listed above (verify zero call sites first with grep).
- [ ] **Step 2:** `WeaponSystem.setWeaponType()`: replace hardcoded `damage = 2/3/4`, `fireRate = 0.2/0.15/0.1` with values derived from `BALANCE_CONFIG.WEAPONS.*` multipliers. ⚠️ This may change live tuning — first log the effective before/after numbers per weapon; if they differ, set the config multipliers so the derived values EQUAL current hardcoded behavior (no balance change in this task).
- [ ] **Step 3:** Typecheck + play verify + commit: `refactor: remove dead code, derive weapon stats from config`

---

## Phase 4 — Performance

### Task 4.1: Quality profiles (HIGH/LOW) 🟣 Fable design + 🔵 Sonnet plumbing

**Files:**
- Create: `src/config/quality.config.ts`
- Modify: `src/graphics/SceneManager.ts`, `src/graphics/PostProcessingManager.ts`, `src/graphics/effects/*` (pool sizes), `src/ui/screens/OptionsScreen.ts` (setting)

- [ ] **Step 1 (Fable):** Design the profile shape — knobs: particle pool sizes, point-light count, post passes enabled (bloom-only on LOW), composer resolution scale, pixel-ratio cap (2 HIGH / 1 LOW). Auto-pick via `navigator.hardwareConcurrency <= 4 || deviceMemory <= 4` → LOW; user-overridable in Options. Per house convention: every future perf knob must exist in both profiles.
- [ ] **Step 2 (Sonnet):** Implement plumbing from the spec; verify both profiles render correctly and report FPS on LOW vs HIGH.
- [ ] **Step 3:** Commit: `feat(perf): HIGH/LOW quality profiles with auto-detect`

### Task 4.2: Hot-path fixes batch 🔵 Sonnet (one commit per fix, all exactly specified)

**Files & fixes:**
- `src/graphics/PostProcessingManager.ts:217` — stop calling `OptionsScreen.loadSettings()` per frame; cache and refresh only when Options applies changes.
- `src/graphics/effects/ParticlePool.ts:39` — replace `this.velocity.clone().multiplyScalar(dt)` with inline component math (no allocation).
- `src/graphics/SceneManager.ts:757,1010` — cache point-light refs at setup instead of `scene.children.filter` per frame.
- `src/graphics/SceneManager.ts:1076-1116` — gate the `Math.random() < 0.001` scene-walk debug block behind `DEBUG_MODE`.
- `src/graphics/SceneManager.ts:1121` — thread real `deltaTime` into `postProcessing.render()` instead of hardcoded `0.016`.
- `src/graphics/PostProcessingManager.ts:284-297` — replace per-call `pulseBloom` RAF recursion with a single pulse state updated in the existing `update()`.
- `src/graphics/Starfield.ts:859-880` — delete the synchronous 300-frame pre-simulation; seed star positions/z randomly instead.
- `src/core/Game.ts:1606` — throttle `checkObjectivesComplete()` to 4×/sec; reuse scratch `Vector3`s in the update loop (`:1554` and wormhole/camera math).
- `src/ui/UIManager.ts:125-167` — stop the notification-queue RAF loop when the queue is empty; restart it on enqueue.

- [ ] Verify after the batch: smoke suite green, manual play, report frame-time before/after during heavy combat (use devtools performance panel or a `DEBUG_MODE` frame-time log).

### Task 4.3: Vite chunking ⚪ Haiku

**Files:**
- Modify: `vite.config.ts:11-16`

- [ ] Add `postprocessing`, `three.quarks`, `@tweenjs/tween.js` to `manualChunks`; run `npm run build`, report chunk sizes before/after. Commit.

---

## Phase 5 — UX & design polish

### Task 5.1: Loading states for score fetches 🔵 Sonnet

**Files:** `src/ui/screens/LeaderboardScreen.ts:580`, `src/ui/screens/GameOverScreen.ts:931`

- [ ] Render a `LOADING SCORES...` placeholder (styled like the existing empty state) before the `await`; existing error/empty states stay. Playwright: delay the mocked API 2s, assert placeholder shows. Commit.

### Task 5.2: Input semantics cleanup 🔵 Sonnet

**Files:** `src/ui/screens/LeaderboardScreen.ts:293,510`, `src/core/Game.ts:1451`, `src/ui/screens/*`

- [ ] Drop Tab from the leaderboard mode-toggle (arrows/bumpers only), update the hint text, stop `preventDefault`ing Tab.
- [ ] Queue a pending pause when ESC is pressed during level transitions/wormhole animation — apply it when the animation ends (don't silently swallow).
- [ ] Standardize ESC = back/close on every screen (it already means continue on Pause — keep that, it IS back).
- [ ] `ScreenTransitions.ts:127-139`: stop blindly removing `#startScreen`/`#leaderboardScreen`/`#gameOverScreen` on every hide — remove only the passed `currentScreen`; if a screen then lingers during testing, fix that screen's `cleanup()` instead.
- [ ] Verify each manually + smoke suite. Commit per fix.

### Task 5.3: Name-entry flow — allow correction 🔵 Sonnet

**Files:** `src/ui/screens/GameOverScreen.ts:707-716,651`

- [ ] After a successful save, keep an `EDIT` affordance until the player leaves the screen: re-showing the input pre-filled and re-submitting replaces their entry (client sends same name+score; dedupe server-side is out of scope — simplest: only allow re-edit before navigating away, replacing the just-saved entry via the existing update path if one exists, otherwise delay the actual POST until the player confirms or leaves the screen — **prefer the delayed-POST version, it's simpler and atomic**). Playwright test the happy path + edit path. Commit.

### Task 5.4: LocationService honesty 🔵 Sonnet

**Files:** `src/utils/LocationService.ts:54,113`, leaderboard rendering of the LOC column

- [ ] Delete `getFallbackLocation`'s fabricated date-hash country; on API failure return `null` and render a blank/`--` LOC cell.
- [ ] Add a one-line notice near name entry: "Country detected via IP for the leaderboard" (consent gate deferred — flag for user if they want a toggle in Options).
- [ ] Commit: `fix(ux): never fabricate leaderboard locations; disclose IP geolocation`

### Task 5.5: Shared arcade chrome 🟣 Fable design + 🔵 Sonnet migration (one screen per subagent)

**Files:**
- Create: `src/ui/ArcadeChrome.ts`
- Modify: `index.html` (move shared keyframes into the global design-system `<style>`), then each of `StartScreen.ts`, `GameOverScreen.ts`, `LeaderboardScreen.ts`, `OptionsScreen.ts`, `PauseScreen.ts`

**Problem:** Scanlines/CRT/VHS-noise/holo-grid/corner-bracket blocks + their keyframes (`gridScroll`, `scanlineScroll`, `vhsTrackingNoise`, `blink`) are re-authored inline in 5 screens (~60% of 400–1,600-line files; duplicate global keyframe names collide during transition overlap).

- [ ] **Step 1 (Fable):** Design `createArcadeChrome(opts: { accent: string; corners?: boolean; grid?: boolean; noise?: boolean }): HTMLElement` + move the 4 shared keyframe sets into `index.html` once. Write the exact helper implementation.
- [ ] **Step 2 (Sonnet ×5, sequential):** Migrate one screen at a time to the helper — pixel-identical output (compare screenshots via Playwright `toHaveScreenshot` before/after per screen). Commit per screen.

### Task 5.6: Hex → CSS variable sweep ⚪ Haiku (after 5.5 to avoid churn conflicts)

**Files:** all `src/ui/**` (~800 raw hex literals), `index.html` `:root`

- [ ] **Step 1:** Build the mapping: every hex that exactly matches an existing `--color-*` value → `var(--color-*)`. Promote recurring unmatched hexes (e.g. the red/orange danger set in GameOverScreen, gold leaderboard set, purple rogue set) into new `:root` variables; leave true one-offs alone.
- [ ] **Step 2:** Screenshot-compare each screen (same Playwright baseline as 5.5). Commit: `refactor(ui): use design-system color variables`

### Task 5.7: Accessibility batch 🔵 Sonnet

**Files:** `index.html`, `src/ui/UIManager.ts:183-313,830`, `src/ui/screens/GameOverScreen.ts:279`, `index.html:950-1086`

- [ ] Add a global `@media (prefers-reduced-motion: reduce)` block disabling the decorative infinite keyframes (glitch, flicker, blink, heat pulse, tracking noise) and skip the `startHealthPulse` RAF loop when the media query matches (this is a photosensitivity issue, not just polish).
- [ ] Add `aria-live="polite"` to score/level announcements, `role="dialog"` + `aria-label` on screen overlays.
- [ ] Pair color-only states with text tokens: heat bar gains `OVERHEAT` label at threshold, health gains `CRITICAL` (reuse existing warning-text elements where present).
- [ ] Replace the random `ERROR CODE: 0x…` (`GameOverScreen.ts:279`) with a static flavor string (e.g. `NEURAL LINK SEVERED // SIGNAL LOST`).
- [ ] Raise mobile font-size floors in `index.html:950-1086` (nothing below `0.5rem` for Press Start 2P).
- [ ] Verify with devtools reduced-motion emulation + screenshots. Commit per bullet.

---

### Task 5.8: Desktop-only notice for touch devices 🔵 Sonnet

**Files:**
- Modify: `index.html`, `src/main.ts` (or `StartScreen.ts` — wherever boot happens before Game init)

**Decision (user, 2026-07-10):** No mobile controls for now — show an honest notice instead of a silently unplayable game.

- [ ] **Step 1:** Detect touch-primary devices via `window.matchMedia('(pointer: coarse) and (hover: none)').matches` (NOT user-agent sniffing; laptops with touchscreens keep hover/fine pointer and must NOT be blocked).
- [ ] **Step 2:** When matched, render a full-screen overlay styled with the design-system palette: `DESKTOP ONLY` + one flavor line (e.g. `NEURAL LINK REQUIRES KEYBOARD INTERFACE`) and skip Game/audio init.
- [ ] **Step 3:** Verify via devtools device emulation (iPhone profile shows notice; desktop unaffected; smoke suite green). Commit: `feat(ux): desktop-only notice on touch devices`

## Phase 6 — Deferred decisions (user input needed)
- **Geolocation consent toggle** in Options (5.4 ships the honest minimum).
- **`AudioManager.ts` split** (3,854 lines): works after 1.5; split is cosmetic — only worth doing if audio work is planned.

## Sequencing & cost summary

| Phase | Tier mix | Depends on | Est. dispatches |
|-------|----------|-----------|-----------------|
| 0 Safety net | ⚪1 🔵5 | — | 6 subagents |
| 1 Bugs/leaks | 🔵5 | 0.2 | 5 subagents |
| 2 API | ⚪1 🔵3 | — (parallel with 1) | 4 subagents |
| 3 Core refactors | 🟣 heavy, 🔵2 | 0, 1 | Fable + 2 subagents |
| 4 Performance | 🟣 design, 🔵1 ⚪1 | 3 (touches Game.ts) | Fable + ~9 small dispatches |
| 5 UX/design | 🟣 design, 🔵 ~10 ⚪1 | 0.3 (screenshot baselines) | Fable + ~12 subagents |

Fable-token exposure concentrates in Phase 3 and the two design steps (4.1, 5.5); everything else is Sonnet/Haiku execution + Fable diff review.
