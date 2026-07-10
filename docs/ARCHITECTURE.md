# 🏗️ System Architecture

Technical overview of Neural Break's codebase structure and design patterns.

---

## Core Systems

### Game.ts - Central Coordinator

The main game loop and system orchestrator.

**Responsibilities:**
- Initialize all subsystems
- Run game loop (update → collision → render)
- Manage game state transitions
- Coordinate system communication

**Key Methods:**
- `initialize()` - Set up all systems
- `start()` / `stop()` - Control game loop
- `update(deltaTime)` - Update all entities
- `handleCollisions()` - Collision detection
- `render()` - Render frame

### SceneManager - Rendering

Three.js scene management and camera control.

**Features:**
- Orthographic camera for 2D gameplay
- Dynamic zoom based on action intensity
- Starfield background
- Visual effects system
- Lighting and post-processing

### Player - Character Control

Player entity with movement, combat, and progression.

**Systems:**
- Analog movement (keyboard + gamepad)
- Smooth acceleration/deceleration
- Dash ability with cooldown
- Health and damage system
- Power-up collection
- Shield and invulnerability

### EnemyManager - Spawn Control

Manages enemy spawning and lifecycle.

**Features:**
- Spatial grid for efficient collision detection
- Wave-based spawning
- Enemy type distribution
- Difficulty scaling
- Boss encounters

### WeaponSystem - Combat

Projectile-based combat with upgrades.

**Features:**
- Heat-based firing system
- Weapon upgrades (10 levels)
- Projectile pooling
- Hit detection
- Damage calculation

---

## Entity System

### Base Classes

**Enemy** (base class)
- Shared behavior for all enemies
- Health, movement, damage
- Death animations
- Spatial grid registration

**PickupManager** (base class)
- Spawn logic
- Collection detection
- Magnetism system
- Visual effects

### Entity Types

**Enemies:**
- DataMite - Fast basic unit
- ScanDrone - Shoots projectiles
- ChaosWorm - Unpredictable movement
- VoidSphere - Area denial
- CrystalShardSwarm - Multi-unit
- Fizzer - Reward enemy
- UFO - Laser attack
- Boss - End-level challenge

**Pickups:**
- PowerUp - Weapon upgrades
- MedPack - Health restore
- SpeedUp - Movement boost
- Shield - Damage absorption
- Invulnerable - Temporary immunity

---

## Graphics System

### EffectsSystem

Modular particle and visual effects.

**Modules:**
- `ParticlePool` - Base particle system
- `SpecializedParticlePool` - Generic specialized effects
- `ExplosionEffects` - Explosions and impacts
- `ScreenEffects` - Screen flashes and distortion
- `VectorParticles` - Vector-style particles

**Performance:**
- Object pooling
- Efficient memory management
- Throttled updates
- Culling off-screen effects

### Starfield

Parallax scrolling background.

**Features:**
- Multiple star layers
- Depth-based speed
- Smooth scrolling
- Twinkling effect

---

## UI System

### Screen Management

**GameScreens** - Screen coordinator
- Manages screen transitions
- Handles screen lifecycle
- Smooth fade in/out

**Screens:**
- `StartScreen` - Main menu
- `GameOverScreen` - End screen with stats
- `LeaderboardScreen` - High score display
- `PauseScreen` - In-game pause
- `RogueChoiceScreen` - Rogue mode upgrades

### UIManager - HUD

In-game heads-up display.

**Elements:**
- Health bar
- Score and multiplier
- Level progress
- Timer
- Notifications
- Combo display

---

## Audio System

### AudioManager

Sound effect management with pooling.

**Features:**
- Sound prioritization
- Volume control
- Spatial audio (future)
- Web Audio API

**Sound Types:**
- Weapon fire
- Enemy death
- Pickups
- Damage
- UI interactions

### MusicManager

Background music system.

**Features:**
- Dynamic music layers
- Intensity-based mixing
- Smooth transitions

---

## Data Systems

### HighScoreService

Persistent score storage.

**Implementations:**
- `LocalStorageHighScoreService` - Browser storage
- `APIHighScoreService` - Vercel API
- `HybridHighScoreService` - Auto-detection

**Features:**
- Mode-specific leaderboards
- Top 10 per mode
- Last name memory
- Smart fallback

### ScoreManager

Score calculation and management.

**Systems:**
- Base score + bonuses
- Multiplier system
- Combo tracking
- High score detection

---

## Configuration System

### balance.config.ts

Master configuration file.

**Sections:**
- Player stats
- Weapon stats
- Enemy configs (all 8 types)
- Pickup spawn rates
- Scoring system
- Level progression
- Visual effects

**Benefits:**
- Single source of truth
- Easy tuning
- Type-safe values
- Hot reload

---

## Collision System

### Spatial Grid

Optimized collision detection.

**How It Works:**
1. World divided into grid cells
2. Entities register in cells
3. Collision checks only nearby cells
4. O(neighbors) instead of O(n²)

**Performance:**
- ~100x faster than brute force
- Scales with entity count
- Minimal memory overhead

---

## State Management

### GameState

Tracks current game state.

**States:**
- `START_SCREEN` - Main menu
- `PLAYING` - Active game
- `GAME_OVER` - End screen
- `PAUSED` - Game paused

### GameStats

Tracks player statistics.

**Data:**
- Score, level, time
- Kills by enemy type
- Damage taken
- Combo/multiplier records
- Power-ups collected

---

## Design Patterns

### Used Patterns

**Factory Pattern**
- `HighScoreServiceFactory` - Create appropriate service

**Object Pool Pattern**
- Projectiles, particles, enemies
- Reduces garbage collection

**Observer Pattern**
- Event callbacks for state changes
- UI updates on game events

**Strategy Pattern**
- Different enemy behaviors
- Mode-specific logic

**Singleton Pattern**
- `StarfieldManager` - Global starfield
- `HighScoreServiceFactory` - Service instance

---

## Performance Optimizations

### Memory Management

✅ Object pooling for frequent allocations  
✅ Proper cleanup on state transitions  
✅ No memory leaks (verified)  
✅ Efficient particle systems  

### Rendering

✅ Throttled camera zoom (50ms)  
✅ Particle culling  
✅ Efficient Three.js usage  
✅ Minimal draw calls  

### Collision Detection

✅ Spatial grid O(neighbors)  
✅ Broad phase + narrow phase  
✅ Early exit conditions  
✅ Bounding box optimization  

---

## Code Organization

### Separation of Concerns

Each file has a single responsibility:
- ✅ Game logic separate from rendering
- ✅ UI separate from game state
- ✅ Configuration separate from code
- ✅ Data separate from presentation

### Modular Architecture

Systems are loosely coupled:
- ✅ Communication through Game coordinator
- ✅ No circular dependencies
- ✅ Easy to test individually
- ✅ Easy to extend

### Type Safety

Full TypeScript coverage:
- ✅ Interfaces for all entities
- ✅ Strict null checks
- ✅ No `any` types
- ✅ Type-safe configs

---

## Extension Points

### Adding New Enemies

1. Create class extending `Enemy`
2. Add config to `balance.config.ts`
3. Register in `EnemyManager`
4. Add to spawn logic

See: `HOW_TO_ADD_NEW_GAME_MODES.md` (in this directory)

### Adding New Pickups

1. Create class extending base pickup
2. Create manager extending `PickupManager`
3. Add config to `balance.config.ts`
4. Add collection logic to `Game.ts`

### Adding New Game Modes

1. Add mode to `GameMode` type
2. Create mode-specific config
3. Add mode selection to `StartScreen`
4. Implement mode-specific logic

See: `HOW_TO_ADD_NEW_GAME_MODES.md` (in this directory)

---

## Dependencies

### Runtime
- `three` - 3D rendering
- `@tweenjs/tween.js` - Animations

### Development
- `typescript` - Type safety
- `vite` - Build tool
- `@vercel/node` - Serverless functions

### Minimal Dependencies

We intentionally keep dependencies minimal:
- ✅ No UI framework needed
- ✅ Vanilla JavaScript for UI
- ✅ No state management library
- ✅ Direct Three.js usage

---

## File Structure Logic

```
src/
├── config/           # Configuration (balance, game settings)
├── core/             # Core game systems (managers, state)
├── entities/         # Game entities (player, enemies, pickups)
├── weapons/          # Combat system (projectiles, weapons)
├── graphics/         # Rendering (scene, effects, particles)
├── ui/               # User interface (screens, HUD)
├── audio/            # Sound system (manager, pool, music)
├── data/             # Data persistence (high scores)
└── utils/            # Utilities (location service, helpers)
```

**Logic:**
- `config/` = Data (what)
- `core/` = Logic (how)
- `entities/` = Objects (what)
- `graphics/` = Visual (how it looks)
- `ui/` = Interface (player interaction)

---

## Best Practices

### Code Style

✅ Descriptive variable names  
✅ Single responsibility functions  
✅ Clear comments for complex logic  
✅ Consistent formatting  
✅ Type annotations everywhere  

### Error Handling

✅ Graceful degradation  
✅ Fallback systems  
✅ Console warnings for debugging  
✅ Never crash the game  

### Testing

✅ Verify builds before commit  
✅ Test all game modes  
✅ Check performance  
✅ Verify high scores work  

---

## Future Improvements

### Planned
- [ ] Unit tests for core systems
- [ ] Integration tests for game flow
- [ ] Performance profiling tools
- [ ] Debug overlay
- [ ] Level editor

### Considered
- [ ] ECS architecture (Entity Component System)
- [ ] WebWorkers for AI
- [ ] WebGPU rendering
- [ ] Multiplayer support

---

**Questions about architecture?** Check the code - it's well-commented!
