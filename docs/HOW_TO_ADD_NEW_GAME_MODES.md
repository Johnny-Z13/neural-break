# 🎮 HOW TO ADD NEW GAME MODES

**Last Updated:** 2026-01-12  
**Current Modes:** ARCADE, ROGUE, TEST  
**Ease of Adding:** 🟢 EASY (follow this guide)

---

## 📋 OVERVIEW

Neural Break uses a **mode-based architecture** that makes adding new game modes straightforward. This guide will walk you through adding a 4th, 5th, or any new game mode.

**Time Estimate:** 1-3 hours per new mode (depending on complexity)

---

## 🎯 STEP-BY-STEP GUIDE

### Step 1: Add Mode to GameState Enum (5 mins)

**File:** `src/core/GameState.ts`

```typescript
export enum GameMode {
  ORIGINAL = 'original',
  ROGUE = 'rogue',
  TEST = 'test',
  YOUR_NEW_MODE = 'your_new_mode'  // ⬅️ ADD THIS
}
```

**Example for a "SURVIVAL" mode:**
```typescript
export enum GameMode {
  ORIGINAL = 'original',
  ROGUE = 'rogue',
  TEST = 'test',
  SURVIVAL = 'survival'  // ⬅️ NEW MODE
}
```

---

### Step 2: Create Mode Configuration (30-60 mins)

**File:** `src/core/GameModeManager.ts`

Add your mode configuration to `GAME_MODE_CONFIGS`:

```typescript
export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  // ... existing modes ...
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 YOUR NEW MODE - Description here
  // ═══════════════════════════════════════════════════════════════════════════
  [GameMode.YOUR_NEW_MODE]: {
    name: 'YOUR MODE NAME',
    description: 'Brief description of gameplay',
    
    // Level system
    usesObjectiveSystem: true/false,      // Kill objectives?
    usesLevelProgression: true/false,     // Level-based progression?
    startingLevel: 1,                     // Starting level number
    
    // Boundaries
    usesCircularBoundary: true/false,     // Circular energy barrier?
    usesSideBoundaries: true/false,       // Side walls?
    boundaryWidthMultiplier: 1.0,         // Width multiplier (1.0 = full screen)
    
    // Scrolling
    hasVerticalScroll: true/false,        // Camera scrolls?
    scrollSpeed: 0,                       // Units/second (0 = no scroll)
    cameraVerticalOffset: 0,              // Camera offset (0 = centered)
    
    // Enemy spawning
    enemySpawnMode: 'circular',           // 'circular', 'vertical', or 'custom'
    
    // Special features
    hasWormholeExit: false,               // Wormhole exits?
    hasSpecialChoices: false,             // Power-up choices?
    starfieldFlowsDown: false,            // Starfield direction
    
    // UI
    showLevelNumber: true,
    levelLabel: 'Level'                   // "Level" or "Layer" or "Wave"
  }
}
```

#### 🎨 Configuration Templates

**Radial Arena Mode (like Arcade):**
```typescript
[GameMode.SURVIVAL]: {
  name: 'SURVIVAL MODE',
  description: 'Survive endless waves in the arena',
  
  usesObjectiveSystem: false,       // No objectives - just survive
  usesLevelProgression: false,      // Endless
  startingLevel: 997,               // Special ID for survival
  
  usesCircularBoundary: true,       // Circular arena
  usesSideBoundaries: false,
  boundaryWidthMultiplier: 1.0,
  
  hasVerticalScroll: false,         // Static camera
  scrollSpeed: 0,
  cameraVerticalOffset: 0,
  
  enemySpawnMode: 'circular',
  
  hasWormholeExit: false,
  hasSpecialChoices: false,
  starfieldFlowsDown: false,
  
  showLevelNumber: false,           // Show time survived instead
  levelLabel: 'Wave'
}
```

**Vertical Shooter Mode (like Rogue):**
```typescript
[GameMode.ASCENT]: {
  name: 'ASCENT MODE',
  description: 'Climb through vertical sectors',
  
  usesObjectiveSystem: false,
  usesLevelProgression: false,
  startingLevel: 996,
  
  usesCircularBoundary: false,
  usesSideBoundaries: true,
  boundaryWidthMultiplier: 0.7,     // Narrower corridor
  
  hasVerticalScroll: true,
  scrollSpeed: 5.0,                 // Faster scroll
  cameraVerticalOffset: 10,
  
  enemySpawnMode: 'vertical',
  
  hasWormholeExit: true,
  hasSpecialChoices: true,
  starfieldFlowsDown: true,
  
  showLevelNumber: true,
  levelLabel: 'Sector'
}
```

**Hybrid Mode:**
```typescript
[GameMode.BOSS_RUSH]: {
  name: 'BOSS RUSH',
  description: 'Battle bosses in sequence',
  
  usesObjectiveSystem: true,        // Kill the boss
  usesLevelProgression: true,       // Boss 1, Boss 2, etc.
  startingLevel: 1,
  
  usesCircularBoundary: true,
  usesSideBoundaries: false,
  boundaryWidthMultiplier: 1.0,
  
  hasVerticalScroll: false,
  scrollSpeed: 0,
  cameraVerticalOffset: 0,
  
  enemySpawnMode: 'custom',         // Boss-specific spawning
  
  hasWormholeExit: false,
  hasSpecialChoices: true,          // Choose power-up after each boss
  starfieldFlowsDown: false,
  
  showLevelNumber: true,
  levelLabel: 'Boss'
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
    scrollSpeed: 0,  // If applicable
    description: 'Your camera behavior'
  }
}
```

#### Boundary Config
```typescript
export const BOUNDARY_CONFIG = {
  // ... existing modes ...
  
  YOUR_NEW_MODE: {
    type: 'circular' as const,  // or 'corridor'
    radius: 29.5,               // if circular
    widthMultiplier: 1.0,       // if corridor
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
    // OR
    spawnHeightMin: 20,         // if vertical
    spawnHeightVariance: 5,
    horizontalSpread: 20,
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
    usesObjectives: true/false,
    usesLevelProgression: true/false,
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
    showCircularBoundary: true/false,
    showSideBarriers: true/false,
    showWormholeExit: true/false,
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

### Step 5: Add Start Screen Button (30 mins)

**File:** `src/ui/screens/StartScreen.ts`

Add a button to launch your mode:

```typescript
// Find the createModeButtons() method and add your mode:

const yourModeButton = this.createModeButton(
  'YOUR MODE',
  'Brief description of your mode',
  () => {
    cleanup()
    onStartYourMode()  // ⬅️ You'll define this callback
  },
  audioManager
)

// Add to button container
buttonContainer.appendChild(arcadeButton)
buttonContainer.appendChild(rogueButton)
buttonContainer.appendChild(testButton)
buttonContainer.appendChild(yourModeButton)  // ⬅️ ADD THIS
```

**Then update the create() signature:**
```typescript
static async create(
  onStartArcade: () => void,
  onStartRogue: () => void,
  onStartTest: () => void,
  onStartYourMode: () => void,  // ⬅️ ADD THIS
  audioManager: AudioManager | null
): Promise<HTMLElement> {
  // ...
}
```

---

### Step 6: Wire Up Mode in Game.ts (30-60 mins)

**File:** `src/core/Game.ts`

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
  this.sceneManager.setStarfieldDownwardFlow(config.starfieldFlowsDown)
  
  // Side barriers (if needed)
  if (config.usesSideBoundaries) {
    const aspect = window.innerWidth / window.innerHeight
    const frustumSize = 30
    const screenWidth = frustumSize * aspect
    const barrierWidth = screenWidth * config.boundaryWidthMultiplier
    this.rogueSideBarriers = new RogueSideBarriers(barrierWidth)
    this.sceneManager.addToScene(this.rogueSideBarriers.getLeftWall())
    this.sceneManager.addToScene(this.rogueSideBarriers.getRightWall())
  }
  
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
  
  // Set spawn mode
  const spawnMode = this.gameModeManager.getEnemySpawnMode()
  if (spawnMode === 'vertical') {
    this.enemyManager.setRogueMode(true)
  }
  
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

```typescript
// In initialize() method, update GameScreens.showStartScreen() call:

GameScreens.showStartScreen(
  () => this.startNewGame(),
  () => this.startRogueMode(),
  () => this.startTestMode(),
  () => this.startYourMode(),  // ⬅️ ADD THIS
  this.audioManager
).catch(err => {
  console.error('Error showing start screen:', err)
})
```

#### D. Update mode-specific logic (if needed)

If your mode has unique behavior (like Rogue's wormhole system), add it to the `update()` method:

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
- Choose power-up between bosses
- Limited continues
- Track fastest clear time

### Maze Runner Mode
- Procedurally generated maze
- Find exit portal
- Enemies patrol corridors
- Time pressure

### Chaos Mode
- Random enemy types
- Random pickups
- Random modifiers each wave
- Unpredictable and fun

---

## 🔧 ADVANCED: CUSTOM ENEMY SPAWNING

If your mode needs custom enemy spawning logic:

**File:** `src/core/EnemyManager.ts`

```typescript
// Add method to set custom spawn mode
setCustomSpawnMode(customLogic: (player: Vector3) => Vector3): void {
  this.customSpawnLogic = customLogic
}

// In spawn methods, check for custom logic:
private spawnEnemy(enemyType: string): void {
  let position: THREE.Vector3
  
  const spawnMode = this.getCurrentSpawnMode()
  
  if (spawnMode === 'custom' && this.customSpawnLogic) {
    position = this.customSpawnLogic(this.player.getPosition())
  } else if (spawnMode === 'vertical') {
    // Vertical spawn logic
  } else {
    // Circular spawn logic
  }
  
  // Create enemy at position...
}
```

**In your mode initialization:**
```typescript
// Set custom spawn logic
this.enemyManager.setCustomSpawnMode((playerPos) => {
  // Your custom spawn position calculation
  const angle = Math.random() * Math.PI * 2
  const distance = 25 + Math.random() * 10
  return new THREE.Vector3(
    playerPos.x + Math.cos(angle) * distance,
    playerPos.y + Math.sin(angle) * distance,
    0
  )
})
```

---

## 📚 REFERENCE: EXISTING MODE PATTERNS

### Pattern 1: Static Arena (Arcade/Test)
- Circular boundary
- Player centered
- Enemies spawn around edge
- Objective-based progression

### Pattern 2: Vertical Scroller (Rogue)
- Side barriers
- Camera scrolls upward
- Player at bottom
- Wormhole exit as goal
- Special choices between layers

### Pattern 3: Hybrid
- Mix elements from both patterns
- Example: Vertical scroller with objectives
- Example: Arena with wormhole exit

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

## 🚀 EXAMPLE: ADDING "SURVIVAL MODE"

Here's a complete example of adding a wave-based survival mode:

### 1. GameState.ts
```typescript
export enum GameMode {
  ORIGINAL = 'original',
  ROGUE = 'rogue',
  TEST = 'test',
  SURVIVAL = 'survival'  // ⬅️ NEW
}
```

### 2. GameModeManager.ts
```typescript
[GameMode.SURVIVAL]: {
  name: 'SURVIVAL MODE',
  description: 'Survive endless waves of enemies',
  usesObjectiveSystem: false,
  usesLevelProgression: false,
  startingLevel: 997,
  usesCircularBoundary: true,
  usesSideBoundaries: false,
  boundaryWidthMultiplier: 1.0,
  hasVerticalScroll: false,
  scrollSpeed: 0,
  cameraVerticalOffset: 0,
  enemySpawnMode: 'circular',
  hasWormholeExit: false,
  hasSpecialChoices: false,
  starfieldFlowsDown: false,
  showLevelNumber: false,
  levelLabel: 'Wave'
}
```

### 3. LevelManager.ts
```typescript
if (level === 997) {
  return this.getSurvivalModeConfig()
}

static getSurvivalModeConfig(): LevelConfig {
  return {
    level: 997,
    name: "SURVIVAL MODE",
    objectives: {
      dataMites: 99999,    // Endless
      scanDrones: 99999,
      chaosWorms: 99999,
      voidSpheres: 99999,
      crystalSwarms: 99999,
      fizzers: 99999,
      ufos: 99999,
      bosses: 99999
    },
    // Fast spawn rates - constant pressure
    miteSpawnRate: 1.0,
    droneSpawnRate: 5.0,
    wormSpawnRate: 30.0,
    voidSpawnRate: 40.0,
    crystalSpawnRate: 35.0,
    fizzerSpawnRate: 15.0,
    ufoSpawnRate: 50.0,
    bossSpawnRate: 120.0  // Boss every 2 minutes
  }
}
```

### 4. Game.ts
```typescript
private startSurvivalMode(): void {
  this.cleanupGameObjects()
  setTimeout(() => {
    this.isRunning = false
    this.initializeSurvivalMode()
  }, 100)
}

private initializeSurvivalMode(): void {
  // Standard initialization (copy from initializeNewGame)
  this.gameState = GameStateType.PLAYING
  this.gameMode = GameMode.SURVIVAL
  this.gameModeManager.setMode(GameMode.SURVIVAL)
  
  // ... rest of initialization ...
  
  // Track survival time
  this.survivalStartTime = Date.now()
}

// Add survival-specific update logic
private updateSurvivalMode(deltaTime: number): void {
  // Increase difficulty over time
  const survivalTime = (Date.now() - this.survivalStartTime) / 1000
  const difficultyMultiplier = 1 + (survivalTime / 60) * 0.1 // +10% per minute
  
  // Apply to enemy managers...
}
```

### 5. StartScreen.ts
```typescript
const survivalButton = this.createModeButton(
  'SURVIVAL',
  'Survive endless waves',
  () => {
    cleanup()
    onStartSurvival()
  },
  audioManager
)
buttonContainer.appendChild(survivalButton)
```

Done! Your Survival mode is now playable.

---

## 💡 TIPS & BEST PRACTICES

1. **Start Simple** - Copy an existing mode and modify it
2. **Use Unique Level Numbers** - 998 (Rogue), 997 (Survival), 996 (next), etc.
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
- Check callback is passed to GameScreens.showStartScreen()

### Mode crashes on start
- Check all configs are added (GameModeManager, modes.config, LevelManager)
- Check startingLevel is unique
- Add debug logging to find exact crash point

### Enemies spawn in wrong locations
- Check ENEMY_SPAWN_CONFIG in modes.config.ts
- Check enemySpawnMode in GameModeManager.ts
- Verify EnemyManager.setRogueMode() is called if using vertical spawning

### Boundaries don't work
- Check usesCircularBoundary and usesSideBoundaries in config
- Check sceneManager.setEnergyBarrierVisible() is called
- Check RogueSideBarriers are created if using side boundaries

### Camera is positioned wrong
- Check cameraVerticalOffset in GameModeManager config
- Check sceneManager.setCameraTarget() is called with correct offset
- Verify camera update logic in Game.ts update() method

---

**End of Guide**

Good luck creating your new game modes! 🎮🚀
