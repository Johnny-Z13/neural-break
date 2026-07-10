# ⚡ BALANCE QUICK REFERENCE

**One-page cheat sheet for game balancing**

---

## 🎯 THE FILE

**`src/config/balance.config.ts`** ← Edit this to balance the game!

---

## 🚀 WORKFLOW

1. Open `balance.config.ts`
2. Change values
3. Save (Ctrl+S / Cmd+S)
4. Game reloads automatically!
5. Test and iterate

**That's it!**

---

## 📝 COMMON TWEAKS

### Make Game Easier

```typescript
PLAYER: {
  BASE_HEALTH: 150        // ↑ From 100
  BASE_SPEED: 7.5         // ↑ From 6.25
}
WEAPONS: {
  BASE_DAMAGE: 15         // ↑ From 10
}
```

### Make Game Harder

```typescript
LEVELS: {
  ENEMY_HEALTH_SCALE: 1.2 // ↑ From 1.1 (+20% per level)
  SPAWN_RATE_SCALE: 0.85  // ↓ From 0.9 (spawn faster)
}
```

### Fix Overpowered Enemy

```typescript
FIZZER: {
  SPEED: 6.0              // ↓ From 8.0
  DAMAGE: 8               // ↓ From 10
  HEALTH: 2               // ↓ From 3
}
```

### Buff Weak Enemy

```typescript
SCAN_DRONE: {
  HEALTH: 8               // ↑ From 4
  FIRE_RATE: 1.5          // ↓ From 2.0 (shoots faster)
  BULLET_DAMAGE: 20       // ↑ From 15
}
```

### Tune Weapons

```typescript
WEAPONS: {
  BASE_FIRE_RATE: 0.1     // ↓ From 0.15 (faster shooting)
  HEAT_COOLDOWN_RATE: 30  // ↑ From 25 (less overheating)
}
```

### Tune Pickups

```typescript
PICKUPS: {
  MED_PACK: {
    HEAL_AMOUNT: 40       // ↑ From 30
    SPAWNS_PER_LEVEL: 3   // ↑ From 2
  }
}
```

---

## 📊 ENEMY CHEAT SHEET

| Enemy | Current Stats | Common Tweaks |
|-------|---------------|---------------|
| **DataMite** | HP:1, SPD:2.0 | Increase `SPEED` for harder |
| **ScanDrone** | HP:4, SPD:1.5 | Lower `FIRE_RATE` = shoots faster |
| **Fizzer** | HP:3, SPD:8.0 | Most tweaked: too fast/hard |
| **UFO** | HP:40, SPD:3.5 | Balance `HEALTH` vs `DAMAGE` |
| **ChaosWorm** | HP:150, SPD:2.0 | Adjust `BULLETS_PER_SEGMENT` |
| **VoidSphere** | HP:250, SPD:0.6 | Tank: tune `BURST_COUNT` |
| **CrystalSwarm** | HP:120, SPD:1.8 | Change `SHARD_COUNT` |
| **Boss** | HP:250, SPD:0.4 | 3 phases: tune each `PHASE_X_FIRE_RATE` |

---

## 🎮 PLAYER TUNING

```typescript
// Movement
BASE_SPEED: 6.25          // Units per second
DASH_SPEED: 30            // Dash speed boost
DASH_COOLDOWN: 3.0        // Seconds between dashes

// Survivability
BASE_HEALTH: 100          // Starting HP
INVULNERABLE_DURATION: 5  // Invuln pickup length

// Power-ups
MAX_POWER_UP_LEVEL: 10    // Max weapon level
POWER_UP_DAMAGE_MULTIPLIER: 0.5  // +50% dmg per level
MAX_SPEED_LEVEL: 20       // Max speed level
SPEED_BOOST_PER_LEVEL: 0.05      // +5% speed per level
```

---

## 🔫 WEAPONS TUNING

```typescript
// Base Stats
BASE_DAMAGE: 10           // Bullet damage
BASE_FIRE_RATE: 0.15      // Seconds between shots (lower = faster)
BASE_PROJECTILE_SPEED: 20 // Bullet speed
BASE_RANGE: 35            // Max distance

// Heat System
HEAT_PER_SHOT: 8          // Heat added per shot
HEAT_COOLDOWN_RATE: 25    // Heat removed per second
HEAT_MAX: 100             // Overheat threshold
OVERHEAT_COOLDOWN: 2.0    // Forced cooldown time
```

---

## 💎 PICKUPS TUNING

```typescript
// Med Pack
HEAL_AMOUNT: 30           // HP restored
SPAWNS_PER_LEVEL: 2       // How many spawn
SPAWN_INTERVAL_MIN: 20    // Min seconds between
HEALTH_THRESHOLD: 0.8     // Only spawn if HP < 80%

// Magnetism (all pickups)
MAGNET_RADIUS: 4.0        // Pull-in distance
MAGNET_STRENGTH: 12.0     // Attraction force
```

---

## 📈 LEVEL SCALING

```typescript
// Difficulty Curve
ENEMY_HEALTH_SCALE: 1.1   // +10% HP per level
ENEMY_SPEED_SCALE: 1.05   // +5% speed per level
ENEMY_DAMAGE_SCALE: 1.1   // +10% damage per level
SPAWN_RATE_SCALE: 0.9     // -10% spawn time (faster)

// Duration
LEVEL_DURATION: 120       // 2 minutes per level
BOSS_APPEARS_AT: 100      // Boss spawns at 100s
```

---

## 🎯 QUICK FIXES

### "Player dies too quickly"
- ↑ `PLAYER.BASE_HEALTH` to 150
- ↑ `PICKUPS.MED_PACK.HEAL_AMOUNT` to 40
- ↓ Enemy `DAMAGE` values by 20%

### "Weapons feel weak"
- ↑ `WEAPONS.BASE_DAMAGE` to 15
- ↓ `WEAPONS.BASE_FIRE_RATE` to 0.1
- ↑ `PLAYER.POWER_UP_DAMAGE_MULTIPLIER` to 0.75

### "Not enough pickups"
- ↑ All `SPAWNS_PER_LEVEL` values
- ↓ `SPAWN_INTERVAL_MIN/MAX` values

### "Game too easy late-game"
- ↑ `LEVELS.ENEMY_HEALTH_SCALE` to 1.15
- ↑ `LEVELS.ENEMY_SPEED_SCALE` to 1.08
- ↓ `LEVELS.SPAWN_RATE_SCALE` to 0.85

### "Boss too hard"
- ↓ `BOSS.HEALTH` to 200
- ↑ `BOSS.PHASE_1_FIRE_RATE` to 1.2 (slower)
- ↓ `BOSS.BULLET_DAMAGE` to 20

---

## 💡 PRO TIPS

### 🔍 Finding Values
Use Ctrl+F / Cmd+F in `balance.config.ts` to search for:
- Enemy name (e.g., "FIZZER")
- Stat name (e.g., "HEALTH")
- System (e.g., "WEAPONS")

### ⚡ Fast Iteration
1. Keep game running in browser
2. Keep `balance.config.ts` open in editor
3. Change → Save → Auto-reload → Test
4. Repeat until perfect!

### 📊 Testing Changes
- Test early game (Level 1-3)
- Test mid game (Level 5-7)
- Test late game (Level 8-10)
- Test boss fights

### 🎨 Balance Philosophy
- Early game: Forgiving
- Mid game: Challenging
- Late game: Intense
- Boss fights: Memorable

---

## 🆘 HELP

**Full Guide**: `BALANCE_TUNING_GUIDE.md`  
**Technical Details**: `CODE_REVIEW_SUMMARY.md`  
**Project Docs**: `README.md`

**The Config File**: `src/config/balance.config.ts`

---

## 📐 FORMULAS

### Fire Rate
```
Shots per second = 1 / FIRE_RATE
Example: FIRE_RATE: 0.2 = 5 shots/sec
```

### Level Scaling
```
Level X stat = Base × (Scale ^ (X - 1))
Example: Level 5 health = 100 × (1.1 ^ 4) = 146.4
```

### Speed Boost
```
Final speed = BASE_SPEED × (1 + LEVEL × BOOST_PER_LEVEL)
Example: Level 10 = 6.25 × (1 + 10 × 0.05) = 9.375
```

---

## ✅ CHECKLIST

Before committing balance changes:

- [ ] Tested early game
- [ ] Tested mid game
- [ ] Tested late game
- [ ] Tested boss fights
- [ ] Feels fun (most important!)
- [ ] Added comments explaining changes

---

**Happy balancing! ⚖️**

*Remember: Change one thing at a time, test, iterate!*

