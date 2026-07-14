# 🎮 Neural Break

A cyberpunk survival shooter built with Three.js and TypeScript. Clear 99 escalating arcade levels inside a hostile neural network.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Johnny-Z13/Neural-Break)

---

## 🚀 Quick Start

```bash
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run the Playwright regression suite
npm test
```

**First time deploying?** See [📖 Deployment Guide](#-deployment)

---

## ✨ Features

### 🎮 Game Modes
- **Arcade Mode**: 99-level objective-based progression
  - Dynamic difficulty scaling
  - Surprise themed levels every 5 levels
  - Victory screen when beating level 99!

### 🏆 Global Leaderboards
- Separate top 10 for each game mode
- Persistent Neon Postgres storage through a Vercel Function
- Server-side validation, same-origin writes, rate limiting, and atomic ranking
- Real-time competition
- Victory badges for 99-level completions

### 🎯 Combat & Progression
- **99 levels of escalating difficulty**
- 8 unique enemy types (DataMite, ScanDrone, ChaosWorm, VoidSphere, Crystal Swarm, Fizzer, UFO, Boss)
- **10 surprise level types** with unique challenges
- Weapon upgrades and power-ups
- Arcade-style multiplier system
- Objective-based level progression with clear goals

### 🕹️ Full Controller Support
- Xbox and PlayStation controllers
- Haptic feedback
- Menu navigation with gamepad
- Smooth analog movement

---

## 🎯 Controls

### Keyboard
| Action | Keys |
|--------|------|
| Move | `WASD` or Arrow Keys |
| Fire | `Space` |
| Dash | `Shift` |
| Pause | `Escape` |

### Gamepad (Xbox/PlayStation)
| Action | Button |
|--------|--------|
| Move | Left Stick / D-Pad |
| Fire | `A` / `X` or Triggers |
| Dash | `B` / `Circle` or RB |
| Pause | `Start` |

**All menus** support keyboard, mouse, and gamepad navigation!

---

## 📁 Project Structure

```
src/
├── config/              # ⭐ All gameplay values in balance.config.ts
├── core/                # Game systems (Game, Managers, State)
├── entities/            # Player, enemies, pickups
├── weapons/             # Combat system
├── graphics/            # Rendering, effects, particles
├── ui/                  # Screens and HUD
├── audio/               # Sound system
├── data/                # High score persistence
└── utils/               # Helper utilities

api/                     # Serverless functions (Vercel)
└── highscores.ts        # Global leaderboard API

database/                # Idempotent Neon schema
scripts/                 # Database migration utilities
tests/e2e/               # Playwright gameplay and UI regressions
```

---

## 🔧 Development

### Game Balance

**All gameplay values in one file**: `src/config/balance.config.ts`

```typescript
// Easy to tune - just edit and save!
PLAYER: {
  BASE_HEALTH: 100,
  BASE_SPEED: 6.25,
  DASH_COOLDOWN: 3.0,
}

WEAPONS: {
  BASE_DAMAGE: 10,
  BASE_FIRE_RATE: 0.15,
}
```

**See**: [`docs/BALANCE_TUNING_GUIDE.md`](docs/BALANCE_TUNING_GUIDE.md)

### Adding Game Modes

Want to add a new mode? See [`docs/HOW_TO_ADD_NEW_GAME_MODES.md`](docs/HOW_TO_ADD_NEW_GAME_MODES.md)

### Code Architecture

- **Modular Systems**: Each system has single responsibility
- **TypeScript**: Full type safety
- **Spatial Grid**: Optimized O(neighbors) collision detection
- **Entity Pooling**: Efficient memory management
- **Centralized Config**: Easy balance tuning

### Visual tuning

The crisp in-game baseline lives in `src/config/PostProcessSettings.ts`.
Bloom, vignette, and scanlines are intentionally restrained; chromatic
aberration remains off by default. Enable **Post-process debug** in Options to
adjust bloom, vignette, scanline density, and scanline opacity live.

### Verification

```bash
npm run typecheck
npm run build
npm test
```

The browser suite covers menu navigation, pause/resume, leaderboard states,
game-over name submission, first-kill death-particle emission, stable enemy
identity, scheduled objective spawns, every Level 1-99 configuration, and the
live Level 1-to-2 transition.

---

## 🌐 Deployment

### Neon-backed deployment

```bash
npm install
DATABASE_URL='postgresql://...' npm run db:migrate
vercel env add DATABASE_URL production,preview --sensitive
vercel --prod
```

The current Neon project is named **Neural Break High Scores**. `DATABASE_URL`
must remain server-only; never expose it with a `VITE_` prefix. The client does
not silently fall back to a private local leaderboard because that would make
global qualification and ranking inconsistent.

The API prevents casual request tampering but the game simulation remains in
the browser. A fully cheat-proof leaderboard would require server-authoritative
gameplay or server-verifiable run telemetry.

**See**: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for complete guide

---

## 📚 Documentation

### 🚀 Start Here
- **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** - Setup guide for new developers
- **[README.md](README.md)** - This file - project overview

### 🎮 For Players
- [`docs/CONTROLS.md`](docs/CONTROLS.md) - Complete controls reference
- [`docs/HIGH_SCORES.md`](docs/HIGH_SCORES.md) - Leaderboard system guide

### 💻 For Developers
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - Deploy to Vercel with online scores
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System architecture and patterns
- [`docs/BALANCE_TUNING_GUIDE.md`](docs/BALANCE_TUNING_GUIDE.md) - Edit gameplay values
- [`docs/BALANCE_QUICK_REFERENCE.md`](docs/BALANCE_QUICK_REFERENCE.md) - Quick balance reference
- [`docs/HOW_TO_ADD_NEW_GAME_MODES.md`](docs/HOW_TO_ADD_NEW_GAME_MODES.md) - Extend the game
- [`docs/LEVEL_SYSTEM.md`](docs/LEVEL_SYSTEM.md) - Level progression details
- [`design-qa.md`](design-qa.md) - UI and transition review evidence

### 📝 Reference
- [`CHANGELOG.md`](CHANGELOG.md) - Version history
- [`CLAUDE.md`](CLAUDE.md) - AI assistant collaboration notes
- `src/config/balance.config.ts` - Master config file (commented)

---

## 🛠️ Technologies

| Tech | Purpose |
|------|---------|
| **Three.js** | WebGL rendering |
| **TypeScript** | Type-safe development |
| **Vite** | Fast dev server & builds |
| **Vercel** | Serverless deployment |
| **Neon Postgres** | Persistent high-score storage |
| **TWEEN.js** | Smooth animations |
| **Web Audio API** | Sound system |

---

## 🎨 Recent Updates

### July 2026 - Visual and leaderboard reliability
- ✅ Crisper CRT/post-process defaults and a brighter player ship
- ✅ Subtle emissive death particles with reliable first-kill bursts
- ✅ Gameplay alerts presented as unobtrusive text
- ✅ End-to-end name entry → leaderboard → menu flow
- ✅ Persistent Neon Postgres leaderboard with server-side safeguards

### January 2026 - Code Cleanup 🧹
- ✅ Removed ~700 lines of legacy code
- ✅ Consolidated particle pools
- ✅ Extracted modular systems
- ✅ Optimized collision detection

**Full changelog**: See [`CHANGELOG.md`](CHANGELOG.md)

---

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

ISC License - see LICENSE file

---

## 🆘 Support

**Issues?** Check the docs first:
- Build problems → [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Balance questions → [`docs/BALANCE_TUNING_GUIDE.md`](docs/BALANCE_TUNING_GUIDE.md)
- Architecture questions → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

**Still stuck?** Open an issue with:
- What you tried
- Error messages
- Environment (Node version, OS)

---

## 🎯 Development Roadmap

- [ ] Progressive Web App support
- [ ] Social features (share scores)
- [ ] Achievements system
- [ ] Mobile controls

---

**Made with ❤️ using Three.js and TypeScript**
