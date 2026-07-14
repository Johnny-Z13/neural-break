# Changelog

All notable changes to Neural Break will be documented in this file.

---

## [Unreleased]

### Added
- Persistent Neon Postgres leaderboard schema and migration command.
- End-to-end coverage for name submission, leaderboard display, and menu return.
- Regression coverage ensuring the first enemy deaths emit particles immediately.
- Adjustable scanline opacity in the post-process debug controls.

### Changed
- Refreshed the shared menu/HUD styling and transition system.
- Reduced bloom, vignette, and scanline strength for a crisper in-game image.
- Brightened the player ship slightly without changing its design.
- Made enemy death particles subtly larger, brighter, and progressively fading.
- Converted gameplay alerts to compact coloured text without opaque boxes.
- Moved leaderboard persistence from Redis/Vercel KV to Neon Postgres.

### Fixed
- First-kill particle bursts no longer disappear because of stale GPU draw state.
- Escape now resumes from pause without immediately reopening the pause screen.
- Enter on the game-over name field now saves and opens the high-score table.
- Leaderboard text is escaped before being inserted into generated markup.

---

## [1.3.0] - 2026-07-10

### Removed
- **Rogue Mode**: Removed entirely — game is now Arcade-only, plus the TEST debug mode. Valid `gameMode` values are `original` and `test`.

### Changed
- **Main Menu**: Renamed/reordered to START GAME / OPTIONS / HI SCORES / TEST
- **Leaderboard**: Now a single Arcade-only board (no more mode toggle)
- Start screen and leaderboard now fit correctly at all window heights

### Added
- Neon glitched-N favicon

---

## [1.2.0] - 2026-01-14

### Added
- **Online High Scores**: Global leaderboards via Vercel deployment
- **Hybrid Storage System**: Automatic API/localStorage detection
- **Mode-Specific Leaderboards**: Separate top 10 for Original and Rogue
- **Vercel Deployment**: Serverless API endpoint for scores
- **Documentation Overhaul**: Clean, organized docs for developers

### Changed
- High score system now supports both local and online storage
- Leaderboard screen properly filters by game mode
- Game over screen displays only current mode's scores
- Improved error handling and fallbacks

### Fixed
- Player spawn position adjusted (Y=6 for better visibility)
- Fixed `rogueLayer` property error in Game.ts
- Game over screen now shows correct mode's high scores

---

## [1.1.0] - 2026-01-10

### Added
- **Codebase Optimization**: Removed ~700 lines of legacy code
- **Consolidated Particle Pools**: Generic `SpecializedParticlePool<T>`
- **Modular Architecture**: Extracted `CollisionSystem` and `GameStateManager`
- **Spatial Grid Optimization**: O(neighbors) collision detection

### Changed
- Throttled dynamic zoom (50ms instead of per-frame)
- Cleaned EffectsSystem (~300 lines removed)
- Improved code organization

### Removed
- 4 orphaned `.bak` files
- ~300 lines of `_LEGACY` and `_DEPRECATED` methods

---

## [1.0.0] - 2026-01-05

### Added
- **Rogue Mode**: Procedural progression with special abilities
- **Centralized Balance System**: All values in `balance.config.ts`
- **Full Gamepad Support**: Xbox/PlayStation controllers
- **Haptic Feedback**: Controller vibration
- **Menu Navigation**: Keyboard and gamepad support everywhere
- **Two New Enemies**: Fizzer and UFO
- **Level System**: Objective-based progression
- **Enhanced Visual Effects**: Staggered explosions, improved particles

### Changed
- Major code refactoring for maintainability
- Modularized UI screens
- Split EffectsSystem into focused modules
- Improved entity management

### Fixed
- UFO spawns now use LevelManager properly
- Power-ups spawn consistently
- Level transitions clean enemies properly
- Enemy hit feedback for all types

---

## [0.9.0] - 2025-12-20

### Added
- **8 Enemy Types**: Complete enemy roster
- **Boss Encounters**: End-level challenges
- **Power-Up System**: Weapon upgrades, health, shields, speed
- **Combo System**: Chain kills for bonuses
- **Multiplier System**: Maintain streaks for higher scores
- **High Score System**: LocalStorage persistence
- **Audio System**: Sound effects and feedback

### Changed
- Improved collision detection
- Better particle effects
- Enhanced visual feedback

---

## [0.5.0] - 2025-12-01

### Added
- **Core Gameplay**: 30-minute survival mode
- **Basic Enemies**: DataMite, ScanDrone, ChaosWorm
- **Player Movement**: Keyboard controls
- **Weapon System**: Projectile-based combat
- **Three.js Integration**: WebGL rendering
- **TypeScript**: Full type safety

---

## Notes

### Version Format
- Major: Breaking changes or major features
- Minor: New features, backwards compatible
- Patch: Bug fixes and small improvements

### Links
- [GitHub Repository](#)
- [Live Demo](#)
- [Documentation](./README.md)
