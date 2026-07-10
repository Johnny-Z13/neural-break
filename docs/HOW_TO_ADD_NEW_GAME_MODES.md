# 🎮 HOW TO ADD NEW GAME MODES

**Last Updated:** 2026-07-10
**Current Modes:** ARCADE (`original`), TEST (`test`)
**Ease of Adding:** 🟢 EASY (follow this guide)

> **Note:** Rogue mode was removed in July 2026 (game is now Arcade-only, plus the TEST debug mode).
> This guide's worked example previously used Rogue; it has been rewritten below around a
> hypothetical **MIRROR** mode. The `GameModeManager` / `modes.config.ts` system it teaches
> is unchanged and still supports adding new modes the same way.

---

## 📋 OVERVIEW

Neural Break uses a **mode-based architecture** that makes adding new game modes straightforward. This guide will walk you through adding a 3rd, 4th, or any new game mode.

**Time Estimate:** 1-3 hours per new mode (depending on complexity)

---

## 🎯 STEP-BY-STEP GUIDE

### Step 1: Add Mode to GameState Enum (5 mins)

**File:** `src/core/GameState.ts`

```typescript
export enum GameMode {
  ORIGINAL = 'original',
  TEST = 'test',
  YOUR_NEW_MODE = 'your_new_mode'  // ⬅️ ADD THIS
}
```

**Example for a hypothetical "MIRROR" mode:**
```typescript
export enum GameMode {
  ORIGINAL = 'original',
  TEST = 'test',
  MIRROR = 'mirror'  // ⬅️ NEW MODE
}
```

---

### Step 2: Create Mode Configuration (30-60 mins)

**File:** `src/core/GameModeManager.ts`

Add your mode configuration to `GAME_MODE_CONFIGS`. The `GameModeConfig` interface currently defines these fields:

```typescript
export interface GameModeConfig {
  name: string
  description: string

  // Level system
  usesObjectiveSystem: boolean      // Does this mode use kill objectives?
  usesLevelProgression: boolean     // Does this mode advance through numbered levels?
  startingLevel: number             // What level does this mode start at?

  // Boundaries
  usesCircularBoundary: boolean     // Does this mode use the circular energy barrier?
  usesSideBoundaries: boolean       // Does this mode use left/right walls?
  boundaryWidthMultiplier: number   // Multiplier for side boundary width (1.0 = full screen)

  // Scrolling
  scrollSpeed: number               // Units per second (0 = no scroll)
  cameraVerticalOffset: number      // Offset camera above player (positive = player at bottom of screen)

  // Enemy spawning
  enemySpawnMode: 'circular' | 'vertical' | 'custom'  // How enemies spawn

  // Special features
  starfieldFlowsDown: boolean       // Does the starfield flow downward?

  // UI
  showLevelNumber: boolean          // Show "Level X"?
  levelLabel: string                // e.g. "Level"
}
```

Add your mode to `GAME_MODE_CONFIGS`:

```typescript
export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  // ... existing modes (ORIGINAL, TEST) ...

  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 YOUR NEW MODE - Description here
  // ═══════════════════════════════════════════════════════════════════════════
  [GameMode.YOUR_NEW_MODE]: {
    name: 'YOUR MODE NAME',
    description: 'Brief description of gameplay',

    // Level system
    usesObjectiveSystem: true,            // Kill objectives?
    usesLevelProgression: true,           // Level-based progression?
    startingLevel: 1,                     // Starting level number

    // Boundaries
    usesCircularBoundary: true,           // Circular energy barrier?
    usesSideBoundaries: false,            // Side walls?
    boundaryWidthMultiplier: 1.0,         // Width multiplier (1.0 = full screen)

    // Scrolling
    scrollSpeed: 0,                       // Units/second (0 = no scroll)
    cameraVerticalOffset: 0,              // Camera offset (0 = centered)

    // Enemy spawning
    enemySpawnMode: 'circular',           // 'circular', 'vertical', or 'custom'

    // Special features
    starfieldFlowsDown: false,            // Starfield direction

    // UI
    showLevelNumber: true,
    levelLabel: 'Level'                   // e.g. "Level" or "Wave"
  }
}
```

#### 🎨 Configuration Example: "MIRROR" Mode

A hypothetical mode where the arena is mirrored and enemies spawn faster — same boundary/spawn shape as Arcade, just re-themed:

```typescript
[GameMode.MIRROR]: {
  name: 'MIRROR MODE',
  description: 'Arcade gameplay in a mirrored arena with faster spawns',

  usesObjectiveSystem: true,        // Same kill-objective system as Arcade
  usesLevelProgression: true,
  startingLevel: 1,

  usesCircularBoundary: true,       // Circular arena
  usesSideBoundaries: false,
  boundaryWidthMultiplier: 1.0,

  scrollSpeed: 0,                   // Static camera
  cameraVerticalOffset: 0,

  enemySpawnMode: 'circular',

  starfieldFlowsDown: false,

  showLevelNumber: true,
  levelLabel: 'Level'
}
```

---

### Step 3: Add Mode-Specific Configs (30 mins)

**File:** `src/config/modes.config.ts`

Add your mode to each config section:

#### Starfield Config
```typescript
export const STARFIELD_CONFIG = {
  // ... existing modes ...

  YOUR_NEW_MODE: {
    horizontalDriftMin: -0.2,
    horizontalDriftMax: 0.2,
    verticalDriftMin: -0.2,
    verticalDriftMax: 0.2,
    description: 'Your starfield behavior'
  }
}
```

#### Camera Config
```typescript
export const CAMERA_CONFIG = {
  // ... existing modes ...

  YOUR_NEW_MODE: {
    verticalOffset: 0,
    followSmoothing: 5.0,
    description: 'Your camera behavior'
  }
}
```

#### Boundary Config
```typescript
export const BOUNDARY_CONFIG = {
  // ... existing modes ...

  YOUR_NEW_MODE: {
    type: 'circular' as const,  // or another shape if you add one
    radius: 29.5,               // if circular
    description: 'Your boundary setup'
  }
}
```

#### Enemy Spawn Config
```typescript
export const ENEMY_SPAWN_CONFIG = {
  // ... existing modes ...

  YOUR_NEW_MODE: {
    mode: 'circular' as const,  // or 'vertical' or 'custom'
    spawnRadius: 31.5,          // if circular
    description: 'Your spawn behavior'
  }
}
```

#### Pickup Spawn Config
```typescript
export const PICKUP_SPAWN_CONFIG = {
  // ... existing modes ...

  YOUR_NEW_MODE: {
    mode: 'circular' as const,
    spawnRadius: 28,
    minDistanceFromPlayer: 5,
    description: 'Your pickup spawn behavior'
  }
}
```

#### Progression Config
```typescript
export const PROGRESSION_CONFIG = {
  // ... existing modes ...

  YOUR_NEW_MODE: {
    usesObjectives: true,
    usesLevelProgression: true,
    startingLevel: 1,
    levelLabel: 'Level',
    description: 'Your progression system'
  }
}
```

#### Visual Config
```typescript
export const VISUAL_MODE_CONFIG = {
  // ... existing modes ...

  YOUR_NEW_MODE: {
    showCircularBoundary: true,
    backgroundColor: '#000011',
    description: 'Your visual setup'
  }
}
```

---

### Step 4: Add Level Configuration (15-30 mins)

**File:** `src/core/LevelManager.ts`

Add your mode's level config in `getLevelConfig()`:

```typescript
static getLevelConfig(level: number): LevelConfig {
  // 🆕 YOUR NEW MODE - Return your mode's configuration
  if (level === 995) {  // Choose a unique level number
    return this.getYourNewModeConfig()
  }

  // ... existing modes ...
}

// Add your mode's config method
static getYourNewModeConfig(): LevelConfig {
  return {
    level: 995,
    name: "YOUR MODE NAME",
    objectives: {
      dataMites: 30,
      scanDrones: 12,
      chaosWorms: 2,
      voidSpheres: 1,
      crystalSwarms: 1,
      fizzers: 0,
      ufos: 1,
      bosses: 0
    },
    // Spawn rates
    miteSpawnRate: 1.2,
    droneSpawnRate: 6.0,
    wormSpawnRate: 40.0,
    voidSpawnRate: 50.0,
    crystalSpawnRate: 45.0,
    fizzerSpawnRate: 18.0,
    ufoSpawnRate: 60.0,
    bossSpawnRate: Infinity
  }
}
```

**Tips:**
- Use a unique level number (995, 994, 993, etc.)
- Adjust spawn rates for desired difficulty/pacing
- Set `Infinity` for spawn rates if that enemy shouldn't spawn

---

### Step 5: Add Start Screen Menu Item (30-60 mins)

**File:** `src/ui/screens/StartScreen.ts`

The current start screen is a single hardcoded HTML template (a vertical arcade-style menu), not a reusable button-factory function. The menu order is fixed: **START GAME (`arcadeButton`) / OPTIONS (`optionsButton`) / HI SCORES (`leaderboardButton`) / TEST (`testButton`)**, each with its own `id` and inline neon color styling, plus index-based keyboard/gamepad navigation (`0` = START GAME, `1` = OPTIONS, `2` = HI SCORES, `3` = TEST).

`StartScreen.create()` currently has this signature:

```typescript
static create(
  audioManager: AudioManager | null,
  onStartGame: () => void,
  onShowLeaderboard: () => void,
  onStartTestMode?: () => void,
  onShowOptions?: () => void
): HTMLElement
```

To add a new mode's menu entry you must, by hand:
1. Add a new `<button id="yourModeButton" class="menu-item" ...>` block to the template string, styled to match the existing neon buttons.
2. Extend `create()`'s parameter list with a new callback (e.g. `onStartYourMode?: () => void`).
3. Update the index-based keyboard/gamepad select handlers (`~line 1108` and `~line 1165` in the current file) to include the new button in the navigation order and wire its click/select action to the new callback.

There is no `createModeButton()` helper to call — every menu item is written out directly in the template. Read the existing `arcadeButton`/`optionsButton`/`leaderboardButton`/`testButton` blocks in the file first and copy their structure exactly.

---

### Step 6: Wire Up Mode in Game.ts (30-60 mins)

**File:** `src/core/Game.ts`

`Game.ts` currently wires up modes via `startNewGame()` (Arcade) and `startTestMode()` (Test). Follow the same pattern for your mode.

#### A. Add mode start method

```typescript
private startYourMode(): void {
  if (DEBUG_MODE) console.log('🆕 startYourMode() called')

  // Cleanup
  this.cleanupGameObjects()

  // Delay and initialize
  setTimeout(() => {
    this.isRunning = false
    if (DEBUG_MODE) console.log('🆕 Starting initializeYourMode()...')
    this.initializeYourMode()
  }, 100)
}
```

#### B. Add mode initialization method

```typescript
private initializeYourMode(): void {
  if (DEBUG_MODE) console.log('🆕 Starting Your Mode...')

  // Set game state
  this.gameState = GameStateType.PLAYING
  this.gameMode = GameMode.YOUR_NEW_MODE
  this.gameModeManager.setMode(GameMode.YOUR_NEW_MODE)
  this.isTestMode = false  // Unless your mode uses invincibility

  // Apply mode-specific settings
  const config = this.gameModeManager.getConfig()

  // Boundaries
  this.sceneManager.setEnergyBarrierVisible(config.usesCircularBoundary)
  this.sceneManager.setStarfieldDownwardFlow('arcade')  // or 'test' — takes a mode string, see SceneManager.ts

  // Show HUD
  this.uiManager.setHUDVisibility(true)

  // Reset stats
  this.gameStats = this.createEmptyStats()
  this.combo = 0
  this.comboTimer = 0
  this.scoreMultiplier = 1
  this.multiplierTimer = 0

  // Start audio
  this.audioManager.startAmbientSoundscape()

  // Start level manager
  const startingLevel = this.gameModeManager.getStartingLevel()
  this.levelManager.startAtLevel(startingLevel)

  // Initialize player
  this.player = new Player()
  this.player.initialize(this.audioManager)
  this.player.setTestMode(false)  // Unless needed

  // Set player callbacks
  this.player.setShieldCallbacks(
    () => this.uiManager.showShieldActivated(),
    () => this.uiManager.showShieldDeactivated()
  )
  this.player.setInvulnerableCallbacks(
    () => this.uiManager.showInvulnerableActivated(),
    () => this.uiManager.showInvulnerableDeactivated()
  )

  // Add player to scene
  const playerMesh = this.player.getMesh()
  this.sceneManager.addToScene(playerMesh)

  // Camera setup
  const playerPos = this.player.getPosition()
  const cameraOffset = this.gameModeManager.getCameraVerticalOffset()
  const cameraTargetY = playerPos.y + cameraOffset
  this.sceneManager.setCameraTarget(new THREE.Vector3(playerPos.x, cameraTargetY, 0))

  // Initialize weapon system
  this.weaponSystem = new WeaponSystem()
  this.weaponSystem.initialize(this.player, this.sceneManager, this.audioManager)

  // Connect effects
  const effectsSystem = this.sceneManager.getEffectsSystem()
  this.weaponSystem.setEffectsSystem(effectsSystem)
  this.player.setEffectsSystem(effectsSystem)

  // Initialize enemy manager
  this.enemyManager = new EnemyManager()
  this.enemyManager.initialize(this.sceneManager, this.player)
  this.enemyManager.setLevelManager(this.levelManager)
  this.enemyManager.setEffectsSystem(effectsSystem)
  this.enemyManager.setAudioManager(this.audioManager)

  // Initialize pickup managers
  this.powerUpManager = new PowerUpManager()
  this.powerUpManager.initialize(this.sceneManager, this.player)
  this.powerUpManager.setLevelManager(this.levelManager)
  this.powerUpManager.setEffectsSystem(effectsSystem)

  // Similar for other pickup managers...

  // Start game loop
  if (!this.isRunning) {
    this.start()
  }

  if (DEBUG_MODE) console.log('✅ Your Mode initialization complete!')
}
```

#### C. Connect to start screen

The real integration point is `GameScreens.showStartScreen()`, called from `Game.ts`'s `showStartScreen()` method:

```typescript
// src/core/Game.ts — showStartScreen()
GameScreens.showStartScreen(
  () => this.startNewGame(),
  () => this.startTestMode()
)
```

`GameScreens.showStartScreen()` (in `src/ui/GameScreens.ts`) forwards these callbacks into `StartScreen.create()`, along with its own internally-wired leaderboard/options callbacks. To add a new mode, extend both signatures — `GameScreens.showStartScreen(onStartGame, onStartTestMode, onStartYourMode?)` and the corresponding `StartScreen.create()` parameter — then pass `() => this.startYourMode()` from `Game.ts`'s call site above.

#### D. Update mode-specific logic (if needed)

If your mode has unique per-frame behavior, add it to the `update()` method:

```typescript
update(deltaTime: number): void {
  // ... existing update logic ...

  // Mode-specific updates
  if (this.gameModeManager.getMode() === GameMode.YOUR_NEW_MODE) {
    this.updateYourModeLogic(deltaTime)
  }
}

private updateYourModeLogic(deltaTime: number): void {
  // Your mode's unique update logic
}
```

---

### Step 7: Test Your Mode (30-60 mins)

#### Testing Checklist

- [ ] Mode appears on start screen
- [ ] Mode button launches correctly
- [ ] Player spawns and is visible
- [ ] Camera is positioned correctly
- [ ] Boundaries work (circular or side walls)
- [ ] Enemies spawn in correct locations
- [ ] Pickups spawn in correct locations
- [ ] Starfield behaves correctly
- [ ] Level progression works (if applicable)
- [ ] Scoring works
- [ ] Game over works
- [ ] Return to start screen works

#### Debug Tips

Add logging to track initialization:
```typescript
if (DEBUG_MODE) {
  console.log('═════════════════════════════════════')
  console.log(`🆕 ${config.name} INITIALIZED`)
  console.log(`   Starting Level: ${startingLevel}`)
  console.log(`   Boundary Type: ${config.usesCircularBoundary ? 'Circular' : 'Corridor'}`)
  console.log(`   Scroll Speed: ${config.scrollSpeed}`)
  console.log(`   Spawn Mode: ${config.enemySpawnMode}`)
  console.log('═════════════════════════════════════')
}
```

---

## 🎨 CUSTOMIZATION IDEAS

### Wave-Based Survival Mode
- No objectives, endless waves
- Difficulty increases over time
- Track best survival time
- Boss every 5 waves

### Time Attack Mode
- Kill objectives with strict time limits
- Speed bonuses for fast completion
- Penalties for taking damage
- Leaderboard for fastest times

### Boss Rush Mode
- Fight bosses back-to-back
- Limited continues
- Track fastest clear time

### Mirror Mode
- Same arena shape as Arcade, mirrored visuals
- Faster spawn rates for extra challenge
- Shared leaderboard or its own — your call

### Chaos Mode
- Random enemy types
- Random pickups
- Random modifiers each wave
- Unpredictable and fun

---

## 🔧 ADVANCED: CUSTOM ENEMY SPAWNING

`GameModeConfig.enemySpawnMode` currently accepts `'circular' | 'vertical' | 'custom'` and `GameModeManager.getEnemySpawnMode()` exposes it, but **`EnemyManager.ts` does not currently read this value** — Arcade and Test both spawn enemies around the circular boundary unconditionally. If your new mode needs different spawn geometry, you'll need to add that branching logic to `EnemyManager` yourself (it doesn't exist yet to copy from). Read `src/core/EnemyManager.ts`'s spawn methods first to see the current (circular-only) implementation before adding a branch.

---

## 📚 REFERENCE: EXISTING MODE PATTERNS

### Pattern 1: Static Arena (Arcade/Test)
- Circular boundary
- Player centered
- Enemies spawn around edge
- Objective-based progression

This is the only pattern currently implemented. `usesSideBoundaries`, `scrollSpeed`, and `enemySpawnMode: 'vertical' | 'custom'` exist in the config shape for future modes but have no consuming logic in `EnemyManager`/`Game.ts` today — treat them as scaffolding, not proven paths.

---

## ✅ FINAL CHECKLIST

Before releasing your new mode:

- [ ] Mode enum added to GameState.ts
- [ ] Mode config added to GameModeManager.ts
- [ ] Mode configs added to modes.config.ts
- [ ] Level config added to LevelManager.ts
- [ ] Start button added to StartScreen.ts
- [ ] Mode methods added to Game.ts
- [ ] Mode connected to start screen
- [ ] Tested: Mode launches
- [ ] Tested: Gameplay works
- [ ] Tested: Progression works
- [ ] Tested: Game over works
- [ ] Tested: Return to menu works
- [ ] Added to README.md
- [ ] Added to game mode selection screen
- [ ] Balanced for fun gameplay

---

## 🚀 EXAMPLE: ADDING "MIRROR MODE"

Here's a complete example of adding a hypothetical Mirror mode:

### 1. GameState.ts
```typescript
export enum GameMode {
  ORIGINAL = 'original',
  TEST = 'test',
  MIRROR = 'mirror'  // ⬅️ NEW
}
```

### 2. GameModeManager.ts
```typescript
[GameMode.MIRROR]: {
  name: 'MIRROR MODE',
  description: 'Arcade gameplay in a mirrored arena with faster spawns',
  usesObjectiveSystem: true,
  usesLevelProgression: true,
  startingLevel: 1,
  usesCircularBoundary: true,
  usesSideBoundaries: false,
  boundaryWidthMultiplier: 1.0,
  scrollSpeed: 0,
  cameraVerticalOffset: 0,
  enemySpawnMode: 'circular',
  starfieldFlowsDown: false,
  showLevelNumber: true,
  levelLabel: 'Level'
}
```

### 3. LevelManager.ts
```typescript
if (level === 995) {
  return this.getMirrorModeConfig()
}

static getMirrorModeConfig(): LevelConfig {
  return {
    level: 995,
    name: "MIRROR MODE",
    objectives: {
      dataMites: 25,
      scanDrones: 8,
      chaosWorms: 1,
      voidSpheres: 1,
      crystalSwarms: 1,
      fizzers: 0,
      ufos: 1,
      bosses: 0
    },
    // Faster spawn rates than Arcade
    miteSpawnRate: 1.0,
    droneSpawnRate: 5.0,
    wormSpawnRate: 30.0,
    voidSpawnRate: 40.0,
    crystalSpawnRate: 35.0,
    fizzerSpawnRate: 15.0,
    ufoSpawnRate: 50.0,
    bossSpawnRate: Infinity
  }
}
```

### 4. Game.ts
```typescript
private startMirrorMode(): void {
  this.cleanupGameObjects()
  setTimeout(() => {
    this.isRunning = false
    this.initializeMirrorMode()
  }, 100)
}

private initializeMirrorMode(): void {
  // Standard initialization (copy from initializeNewGame)
  this.gameState = GameStateType.PLAYING
  this.gameMode = GameMode.MIRROR
  this.gameModeManager.setMode(GameMode.MIRROR)

  // ... rest of initialization ...
}
```

### 5. StartScreen.ts
Add a `<button id="mirrorButton" class="menu-item" ...>MIRROR</button>` block to the template (copy the `testButton` block's structure/styling), extend `create()`'s signature with `onStartMirrorMode?: () => void`, and add it to the index-based menu navigation alongside START GAME / OPTIONS / HI SCORES / TEST.

Done! Your Mirror mode is now playable.

---

## 💡 TIPS & BEST PRACTICES

1. **Start Simple** - Copy an existing mode and modify it
2. **Use Unique Level Numbers** - 995, 994, 993, etc. (Arcade uses 1-99; TEST reuses 1-99 too)
3. **Test Early** - Get the mode loading before adding custom logic
4. **Debug Logging** - Add console.log statements liberally
5. **Reuse Systems** - Don't reinvent the wheel (enemy spawning, pickups, etc.)
6. **Balance Later** - Get it working first, tune difficulty afterward
7. **Document Configs** - Add description fields to your configs

---

## 🆘 TROUBLESHOOTING

### Mode doesn't appear on start screen
- Check GameState.ts enum is updated
- Check StartScreen.ts has button
- Check callback is passed to `StartScreen.create()`

### Mode crashes on start
- Check all configs are added (GameModeManager, modes.config, LevelManager)
- Check startingLevel is unique
- Add debug logging to find exact crash point

### Enemies spawn in wrong locations
- Check ENEMY_SPAWN_CONFIG in modes.config.ts
- Check enemySpawnMode in GameModeManager.ts

### Boundaries don't work
- Check usesCircularBoundary and usesSideBoundaries in config
- Check sceneManager.setEnergyBarrierVisible() is called

### Camera is positioned wrong
- Check cameraVerticalOffset in GameModeManager config
- Check sceneManager.setCameraTarget() is called with correct offset
- Verify camera update logic in Game.ts update() method

---

**End of Guide**

Good luck creating your new game modes! 🎮🚀
