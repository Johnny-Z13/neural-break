# 🎮 BALANCE TUNING GUIDE

## Overview

This guide explains how to balance Neural Break using the centralized configuration system. **All gameplay values are now in ONE file**: `src/config/balance.config.ts`

No more hunting through code to find magic numbers! Edit one file, save, and see changes instantly with hot reload.

---

## 📝 Quick Start

1. Open `src/config/balance.config.ts`
2. Find the section you want to tune (e.g., `PLAYER`, `DATA_MITE`, `WEAPONS`)
3. Change the value
4. Save the file
5. Game auto-reloads with new values!

---

## 🎯 Configuration Sections

### PLAYER Configuration

Location: `BALANCE_CONFIG.PLAYER`

```typescript
BASE_SPEED: 6.25           // How fast player moves (units/sec)
BASE_HEALTH: 100           // Starting health
MAX_HEALTH: 100            // Maximum health
DASH_SPEED: 30             // Speed during dash
DASH_DURATION: 0.4         // How long dash lasts (seconds)
DASH_COOLDOWN: 3.0         // Time between dashes
DASH_INVULNERABLE: true    // Invincible during dash?
MAX_POWER_UP_LEVEL: 10     // Max weapon power level
POWER_UP_DAMAGE_MULTIPLIER: 0.5  // +50% damage per level
MAX_SPEED_LEVEL: 20        // Max speed boost level (100%)
SPEED_BOOST_PER_LEVEL: 0.05      // +5% speed per level
INVULNERABLE_DURATION: 5.0       // Invuln pickup duration
SHIELD_ABSORBS_ONE_HIT: true     // Shield blocks 1 hit or all?
```

**Tuning Tips:**
- Increase `BASE_SPEED` to make movement faster/more responsive
- Increase `DASH_COOLDOWN` to make dashing less spammable
- Decrease `DASH_DURATION` for shorter, tighter dashes
- Adjust `POWER_UP_DAMAGE_MULTIPLIER` to change weapon scaling

---

### WEAPONS Configuration

Location: `BALANCE_CONFIG.WEAPONS`

```typescript
BASE_DAMAGE: 10            // Base bullet damage
BASE_FIRE_RATE: 0.15       // Time between shots (seconds)
BASE_PROJECTILE_SPEED: 20  // Bullet speed (units/sec)
BASE_RANGE: 35             // Max bullet distance

// Heat System
HEAT_ENABLED: true         // Enable overheating?
HEAT_PER_SHOT: 8           // Heat added per shot
HEAT_COOLDOWN_RATE: 25     // Heat removed per second
HEAT_MAX: 100              // Max heat before overheat
OVERHEAT_COOLDOWN: 2.0     // Forced cooldown time
```

**Tuning Tips:**
- Lower `BASE_FIRE_RATE` = faster firing (0.1 = 10 shots/sec)
- Higher `BASE_DAMAGE` = more damage per bullet
- Adjust `HEAT_PER_SHOT` vs `HEAT_COOLDOWN_RATE` for heat balance
- Set `HEAT_ENABLED: false` to disable overheating entirely

---

### ENEMY Configuration

Each enemy type has its own section:

#### DATA_MITE (Basic swarm enemy)

```typescript
HEALTH: 1                  // Dies in 1 hit
SPEED: 2.0                 // Movement speed
DAMAGE: 10                 // Collision damage
XP_VALUE: 1                // XP awarded
RADIUS: 0.42               // Collision radius
DEATH_DAMAGE: 0            // No explosion
DEATH_RADIUS: 0
```

#### SCAN_DRONE (Ranged attacker)

```typescript
HEALTH: 4
SPEED: 1.5
DAMAGE: 15
XP_VALUE: 5
RADIUS: 1.1

FIRE_RATE: 2.0             // Time between shots
BULLET_SPEED: 8.0
BULLET_DAMAGE: 15
DETECTION_RANGE: 15        // Aggro range
PATROL_RANGE: 8            // Patrol radius
```

#### FIZZER (Fast & chaotic)

```typescript
HEALTH: 3
SPEED: 8.0                 // VERY FAST!
DAMAGE: 10
XP_VALUE: 15
RADIUS: 0.35               // Small = hard to hit

FIRE_RATE: 2.5             // Burst attack rate
BURST_COUNT: 3             // Shots per burst
BURST_DELAY: 0.15          // Time between burst shots
BULLET_SPEED: 12.0
BULLET_DAMAGE: 8
DEATH_DAMAGE: 15           // Electric explosion
DEATH_RADIUS: 2.0
```

#### UFO (Hit-and-run)

```typescript
HEALTH: 40
SPEED: 3.5
DAMAGE: 20
XP_VALUE: 25
RADIUS: 1.2

FIRE_RATE: 1.5
BULLET_SPEED: 10.0
BULLET_DAMAGE: 20
DEATH_DAMAGE: 25
DEATH_RADIUS: 3.0
```

#### CHAOS_WORM (Segmented boss)

```typescript
HEALTH: 150                // Massive health pool
SPEED: 2.0
DAMAGE: 25
XP_VALUE: 35
RADIUS: 2.5
SEGMENT_COUNT: 12          // Body segments

DEATH_DURATION: 2.0        // Death animation length
BULLETS_PER_SEGMENT: 6     // Death bullets per segment
DEATH_BULLET_SPEED: 8
DEATH_BULLET_DAMAGE: 15
FINAL_NOVA_BULLETS: 16     // Final burst count
```

#### VOID_SPHERE (Tank)

```typescript
HEALTH: 250
SPEED: 0.6                 // Slow but deadly
DAMAGE: 50                 // DEVASTATING
XP_VALUE: 50
RADIUS: 3.2                // Huge hitbox

FIRE_RATE: 3.0
BURST_COUNT: 5
BURST_DELAY: 0.2
BULLET_SPEED: 6.0
BULLET_DAMAGE: 25
DEATH_DAMAGE: 50
DEATH_RADIUS: 8.0
```

#### CRYSTAL_SWARM (Orbital attacker)

```typescript
HEALTH: 120
SPEED: 1.8
DAMAGE: 40
XP_VALUE: 45
RADIUS: 4.5
SHARD_COUNT: 6             // Orbiting shards
ORBIT_SPEED: 1.5

FIRE_RATE: 2.5
BURST_COUNT: 3
BURST_DELAY: 0.15
BULLET_SPEED: 10.0
BULLET_DAMAGE: 15
SHARDS_THAT_FIRE: 2        // How many fire at once
DEATH_DAMAGE: 30
DEATH_RADIUS: 5.0
```

#### BOSS (Level boss)

```typescript
HEALTH: 250
SPEED: 0.4
DAMAGE: 40
XP_VALUE: 100
RADIUS: 4.0

PHASE_1_FIRE_RATE: 1.0     // Aggressive
PHASE_2_FIRE_RATE: 0.8     // Faster when damaged
PHASE_3_FIRE_RATE: 99      // No firing (ring phase)
BULLET_SPEED: 8.0
BULLET_DAMAGE: 25

PHASE_2_HEALTH_PCT: 0.66   // Enter phase 2 at 66% HP
PHASE_3_HEALTH_PCT: 0.33   // Enter phase 3 at 33% HP

RING_DURATION: 3.0         // Ring attack length
RING_EXPANSION_SPEED: 2.0
RING_DAMAGE: 30
DEATH_DAMAGE: 75
DEATH_RADIUS: 12.0
```

**Tuning Tips:**
- Adjust `HEALTH` to make enemies tankier/weaker
- Change `SPEED` to alter difficulty (fast = harder to hit)
- Modify `FIRE_RATE` to control attack frequency
- Balance `BULLET_DAMAGE` vs `BULLET_SPEED` for fair difficulty
- Scale `DEATH_DAMAGE` and `DEATH_RADIUS` for dramatic deaths

---

### PICKUPS Configuration

Location: `BALANCE_CONFIG.PICKUPS`

```typescript
POWER_UP: {
  SPAWNS_PER_LEVEL: 3      // How many per level
  SPAWN_INTERVAL_MIN: 10   // Min seconds between spawns
  SPAWN_INTERVAL_MAX: 15   // Max seconds between spawns
}

SPEED_UP: {
  SPAWNS_PER_LEVEL: 2
  SPAWN_INTERVAL_MIN: 15
  SPAWN_INTERVAL_MAX: 25
}

MED_PACK: {
  SPAWNS_PER_LEVEL: 2
  SPAWN_INTERVAL_MIN: 20
  SPAWN_INTERVAL_MAX: 30
  HEALTH_THRESHOLD: 0.8    // Only spawn if player < 80% HP
  HEAL_AMOUNT: 30          // Health restored
}

SHIELD: {
  SPAWNS_PER_LEVEL: 2
  SPAWN_INTERVAL_MIN: 20
  SPAWN_INTERVAL_MAX: 30
}

INVULNERABLE: {
  SPAWNS_PER_LEVEL: 1      // Rare!
  SPAWN_INTERVAL_MIN: 60
  SPAWN_INTERVAL_MAX: 90
}

// Magnetism (all pickups)
MAGNET_RADIUS: 4.0         // Pull-in distance
MAGNET_STRENGTH: 12.0      // Attraction force
MAX_MAGNET_SPEED: 18.0     // Max pull speed
```

**Tuning Tips:**
- Increase `SPAWNS_PER_LEVEL` for more pickups
- Decrease `SPAWN_INTERVAL_MIN/MAX` for faster spawning
- Adjust `HEAL_AMOUNT` to change med pack effectiveness
- Change `HEALTH_THRESHOLD` to control when med packs spawn
- Increase `MAGNET_RADIUS` for easier collection

---

### SCORING Configuration

Location: `BALANCE_CONFIG.SCORING`

```typescript
BASE_KILL_POINTS: 100      // Points per enemy
COMBO_TIMER: 3.0           // Combo maintenance time
KILL_CHAIN_WINDOW: 1.5     // Multiplier increase window
MULTIPLIER_DECAY_TIME: 2.0
MAX_MULTIPLIER: 10

LEVEL_COMPLETE_BONUS: 1000
BOSS_KILL_MULTIPLIER: 2.0  // Bosses worth 2x
PERFECT_LEVEL_BONUS: 500   // No damage bonus
```

---

### LEVEL PROGRESSION

Location: `BALANCE_CONFIG.LEVELS`

```typescript
TOTAL_LEVELS: 10

// Per-level scaling
ENEMY_HEALTH_SCALE: 1.1    // +10% health per level
ENEMY_SPEED_SCALE: 1.05    // +5% speed per level
ENEMY_DAMAGE_SCALE: 1.1    // +10% damage per level
SPAWN_RATE_SCALE: 0.9      // -10% spawn time (faster)

LEVEL_DURATION: 120        // 2 minutes per level
BOSS_APPEARS_AT: 100       // Boss spawns at 100 seconds
```

**Tuning Tips:**
- Adjust scaling factors to control difficulty curve
- Lower scale values = easier game
- Higher scale values = brutal endgame
- Use helper function `getEnemyStatsForLevel()` for scaled values

---

### WORLD Settings

Location: `BALANCE_CONFIG.WORLD`

```typescript
SIZE: 60                   // World diameter
BOUNDARY_RADIUS: 29        // Playable area
BOUNDARY_DAMAGE: 10        // Damage/sec outside
SPAWN_BOUNDARY: 28         // Enemy spawn radius
PICKUP_SPAWN_BOUNDARY: 25
MIN_PLAYER_DISTANCE: 5     // Min spawn distance
```

---

### VISUAL FEEDBACK

Location: `BALANCE_CONFIG.FEEDBACK`

```typescript
// Screen Shake
SMALL_SHAKE: { intensity: 0.2, duration: 0.1 }
MEDIUM_SHAKE: { intensity: 0.5, duration: 0.3 }
LARGE_SHAKE: { intensity: 1.0, duration: 0.5 }

// Camera Zoom
MIN_ZOOM: 24               // Zoomed in
MAX_ZOOM: 45               // Zoomed out
ZOOM_SPEED: 3.0

// Effects
PARTICLE_DENSITY: 1.0      // Multiplier for particles
TRAIL_ENABLED: true
EXPLOSION_SCALE: 1.0
```

---

## 🔧 Advanced: Level-Scaled Stats

The config includes a helper function that automatically scales enemy stats:

```typescript
import { BALANCE_CONFIG, getEnemyStatsForLevel } from './config'

// Get DataMite stats for level 5
const stats = getEnemyStatsForLevel('DATA_MITE', 5)
console.log(stats.HEALTH)  // Scaled based on ENEMY_HEALTH_SCALE
console.log(stats.SPEED)   // Scaled based on ENEMY_SPEED_SCALE
console.log(stats.DAMAGE)  // Scaled based on ENEMY_DAMAGE_SCALE
```

This allows enemies to get progressively harder each level without manually defining stats for each level.

---

## 📊 Balance Philosophy

### Easy to Learn, Hard to Master
- Early game should feel manageable
- Late game should be intense and challenging
- Power-ups should feel meaningful but not broken

### Risk vs Reward
- Speed boosts make you faster but reduce control time
- Power-ups increase firepower but raise expectations
- Pickups require movement into danger zones

### Escalation
- Each level should feel slightly harder
- Boss fights should be memorable milestones
- Final levels should be brutal but fair

---

## 🎯 Common Tuning Scenarios

### "Game is too easy"
1. Increase `ENEMY_HEALTH_SCALE` (e.g., 1.15 = +15% per level)
2. Increase `SPAWN_RATE_SCALE` closer to 1.0 (slower spawns = harder)
3. Decrease `PICKUPS.*.SPAWNS_PER_LEVEL`
4. Increase boss `HEALTH` values

### "Game is too hard"
1. Increase `PLAYER.BASE_HEALTH` to 150
2. Increase `PICKUPS.MED_PACK.HEAL_AMOUNT` to 50
3. Decrease enemy `DAMAGE` values by 20-30%
4. Increase `WEAPONS.BASE_DAMAGE`

### "Weapons feel weak"
1. Increase `WEAPONS.BASE_DAMAGE` (10 → 15)
2. Increase `PLAYER.POWER_UP_DAMAGE_MULTIPLIER` (0.5 → 0.75)
3. Decrease `WEAPONS.BASE_FIRE_RATE` (0.15 → 0.1)
4. Increase `WEAPONS.HEAT_COOLDOWN_RATE`

### "Movement feels sluggish"
1. Increase `PLAYER.BASE_SPEED` (6.25 → 7.5)
2. Decrease `PLAYER.DASH_COOLDOWN` (3.0 → 2.0)
3. Increase `PLAYER.DASH_DURATION` (0.4 → 0.6)
4. Increase `SPEED_BOOST_PER_LEVEL` (0.05 → 0.1)

### "Enemy X is too strong/weak"
1. Open `balance.config.ts`
2. Find enemy section (e.g., `FIZZER`)
3. Adjust `HEALTH`, `SPEED`, `DAMAGE` as needed
4. Save and test immediately

---

## 🚀 Hot Reload Workflow

1. Start dev server: `npm run dev`
2. Open `src/config/balance.config.ts`
3. Make changes
4. Save file
5. Game auto-reloads with new values
6. Test changes immediately
7. Iterate quickly!

**No more recompiling or hunting through code!**

---

## 📝 Best Practices

1. **Change One Thing at a Time**: Easier to understand impact
2. **Document Your Changes**: Add comments explaining balance decisions
3. **Test Across Levels**: Changes affect early AND late game
4. **Consider Combinations**: Speed + damage buffs stack!
5. **Watch for Edge Cases**: What happens at max level?
6. **Balance for Fun**: Numbers should serve gameplay, not vice versa

---

## 🔍 Configuration Validation

The config system is type-safe via TypeScript. Invalid values will show compile errors:

```typescript
// ✅ GOOD
HEALTH: 100

// ❌ BAD (type error)
HEALTH: "lots"

// ❌ BAD (typo caught)
HELTH: 100  // Property 'HELTH' does not exist
```

---

## 📚 Further Reading

- `src/config/balance.config.ts` - The master config file
- `src/config/index.ts` - Config exports
- `README.md` - Full project documentation
- PRD docs - Original game design vision

---

## 💡 Tips & Tricks

- Use `const` values for constants, but they can still be edited in the config file
- Search for `BALANCE_CONFIG` in the codebase to see where values are used
- The `as const` at the end makes TypeScript enforce readonly (compile-time only)
- All distances are in world units (not pixels)
- All times are in seconds (not milliseconds)
- All percentages are decimals (0.5 = 50%)

---

**Happy balancing! 🎮**

