# 🚀 Getting Started with Neural Break

Quick guide for new developers joining the project.

---

## Welcome! 👋

This is Neural Break - a cyberpunk survival shooter built with Three.js and TypeScript. Here's everything you need to get up and running.

---

## 📦 Setup (5 minutes)

### 1. Prerequisites
- Node.js v16+ ([download](https://nodejs.org))
- Git
- Code editor (VS Code recommended)

### 2. Clone and Install
```bash
git clone <repository-url>
cd neural-break
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 and start playing!

---

## 📁 Project Structure

```
neural-break/
├── src/                    # Source code
│   ├── config/            # ⭐ balance.config.ts - Edit gameplay values here!
│   ├── core/              # Game systems (managers, state)
│   ├── entities/          # Player, enemies, pickups
│   ├── weapons/           # Combat system
│   ├── graphics/          # Visual effects, particles
│   ├── ui/                # Screens and menus
│   ├── audio/             # Sound system
│   └── data/              # High score persistence
├── docs/                  # 📚 Documentation
│   ├── DEPLOYMENT.md      # Vercel deployment guide
│   ├── ARCHITECTURE.md    # System architecture
│   ├── CONTROLS.md        # Player controls reference
│   └── HIGH_SCORES.md     # Leaderboard system
├── api/                   # Serverless functions (Vercel)
├── README.md              # Main readme
└── package.json           # Dependencies
```

---

## 🎯 Common Tasks

### Make Game Easier/Harder

Edit `src/config/balance.config.ts`:

```typescript
// Make easier
PLAYER: {
  BASE_HEALTH: 150,      // Was 100
  BASE_SPEED: 7.5,       // Was 6.25
}

// Make harder
ENEMIES: {
  DATA_MITE: {
    HEALTH: 30,          // Was 25
    SPEED: 5.0,          // Was 4.5
  }
}
```

Save file → Game auto-reloads! ✨

### Add New Enemy Type

See: [`HOW_TO_ADD_NEW_GAME_MODES.md`](HOW_TO_ADD_NEW_GAME_MODES.md)

### Test Locally

```bash
npm run dev          # Development mode
npm run build        # Production build
npm run preview      # Test production build
```

### Deploy to Vercel

See: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

```bash
npm install -g vercel
vercel
```

---

## 🎮 How to Play

**Keyboard:**
- `WASD` - Move
- `Space` - Fire
- `Shift` - Dash
- `Escape` - Pause

**Gamepad:**
- Left Stick - Move
- `A`/`X` - Fire
- `B`/`Circle` - Dash
- `Start` - Pause

Full controls: [`docs/CONTROLS.md`](docs/CONTROLS.md)

---

## 📚 Documentation Index

### For Players
- [`docs/CONTROLS.md`](docs/CONTROLS.md) - Complete controls
- [`docs/HIGH_SCORES.md`](docs/HIGH_SCORES.md) - Leaderboards

### For Developers
| File | Purpose |
|------|---------|
| **[README.md](README.md)** | Main overview |
| **[GETTING_STARTED.md](GETTING_STARTED.md)** | This file - quick start |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System architecture |
| **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Deploy to Vercel |
| **[BALANCE_TUNING_GUIDE.md](BALANCE_TUNING_GUIDE.md)** | Gameplay tuning |
| **[BALANCE_QUICK_REFERENCE.md](BALANCE_QUICK_REFERENCE.md)** | Quick balance ref |
| **[HOW_TO_ADD_NEW_GAME_MODES.md](HOW_TO_ADD_NEW_GAME_MODES.md)** | Add game modes |
| **[LEVEL_SYSTEM.md](LEVEL_SYSTEM.md)** | Level progression |
| **[CHANGELOG.md](CHANGELOG.md)** | Version history |
| **[CLAUDE.md](CLAUDE.md)** | AI assistant notes |

---

## 🔧 Development Tips

### Debug Mode

Enable in `src/config/game.config.ts`:
```typescript
export const DEBUG_MODE = true  // Show console logs
```

### Hot Reload

Vite automatically reloads when you save files!

### Build Errors?

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript Errors?

Check these files:
- Type definitions in `src/entities/`
- Interfaces in `src/core/GameState.ts`
- Config types in `src/config/`

---

## 🎨 Code Style

### Naming Conventions
```typescript
// Classes: PascalCase
class EnemyManager { }

// Functions/variables: camelCase
function updateEnemies() { }
const playerHealth = 100

// Constants: UPPER_SNAKE_CASE
const MAX_ENEMIES = 50

// Files: PascalCase for classes, lowercase for utils
EnemyManager.ts
gameState.ts
```

### Comments
```typescript
// Single-line comment for brief explanation

/**
 * Multi-line comment for:
 * - Complex logic
 * - Public API
 * - System overview
 */
```

### Code Organization
- One class per file
- Group related functionality
- Keep functions small (<50 lines)
- Use descriptive names
- Avoid magic numbers (use config!)

---

## 🐛 Common Issues

### Game Won't Start

**Check:**
1. `npm install` completed
2. No console errors
3. Correct Node version (v16+)
4. Port 3000 not in use

### Enemies Not Spawning

**Check:**
1. `DEBUG_MODE = true` to see logs
2. `balance.config.ts` spawn rates
3. `EnemyManager.ts` initialization

### Controls Not Working

**Check:**
1. Game window focused (click on it)
2. No browser key conflicts
3. Gamepad connected before starting

### Build Fails

**Try:**
```bash
rm -rf node_modules dist
npm install
npm run build
```

---

## 🤝 Contributing

### Workflow

1. **Create branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes**
   - Edit code
   - Test locally (`npm run dev`)
   - Check build (`npm run build`)

3. **Commit**
   ```bash
   git add .
   git commit -m "Add: my feature"
   ```

4. **Push**
   ```bash
   git push origin feature/my-feature
   ```

5. **Test deployment**
   ```bash
   vercel
   ```

### Commit Messages

Format: `Type: Description`

**Types:**
- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Improve existing feature
- `Remove:` Delete code
- `Refactor:` Code cleanup
- `Docs:` Documentation

**Examples:**
```
Add: shield pickup system
Fix: enemy spawn rate bug
Update: improve dash cooldown
Docs: add deployment guide
```

---

## 📖 Learning Resources

### Three.js
- [Three.js Docs](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [Three.js Journey](https://threejs-journey.com/) (paid course)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Game Development
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [Gamasutra Articles](https://www.gamedeveloper.com/)

---

## 🎯 Next Steps

1. ✅ Set up development environment
2. ✅ Run game locally
3. 📖 Read `README.md` for overview
4. 🎮 Play the game to understand mechanics
5. 📝 Review `balance.config.ts` to see tunable values
6. 🔧 Make a small change and test
7. 🚀 Deploy to Vercel (optional)
8. 💬 Ask questions if stuck!

---

## 💬 Getting Help

**Questions?**
1. Check documentation (see index above)
2. Search existing issues
3. Ask in team chat
4. Create new issue with details

**When asking:**
- What you tried
- Error messages (full text)
- Environment (OS, Node version)
- Steps to reproduce

---

**Welcome to the team! Happy coding!** 🎮✨
