/**
 * ═══════════════════════════════════════════════════════════════════
 * NEURAL BREAK - MASTER BALANCE CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This file contains ALL gameplay balance values in one place.
 * Edit these values to tune game difficulty and feel.
 * 
 * 📝 USAGE:
 * - All values are organized by system (Player, Enemies, Weapons, etc.)
 * - Each enemy type has its own section
 * - Comments explain what each value does
 * - Changes here automatically affect the entire game
 * 
 * ⚖️ BALANCE PHILOSOPHY:
 * - Easy to learn, hard to master
 * - Fast-paced arcade action
 * - Risk/reward choices
 * - Escalating difficulty through levels
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

export const BALANCE_CONFIG = {
  // ═══════════════════════════════════════════════════════════════════
  // PLAYER CONFIGURATION (BALANCED - Easier but not overpowered)
  // ═══════════════════════════════════════════════════════════════════
  PLAYER: {
    // Core Stats
    BASE_SPEED: 7.0,               // Movement speed (was 6.25) - slightly faster
    BASE_HEALTH: 130,              // Starting health (was 100) - 30% more
    MAX_HEALTH: 130,               // Maximum health (was 100)
    
    // Dash Ability
    DASH_SPEED: 32,                // Speed during dash (was 30) - slightly faster
    DASH_DURATION: 0.45,           // How long dash lasts (was 0.4) - slightly longer
    DASH_COOLDOWN: 2.5,            // Time between dashes (was 3.0) - moderate cooldown
    DASH_INVULNERABLE: true,       // Invincible during dash?
    
    // Power-Up System
    MAX_POWER_UP_LEVEL: 10,        // Max weapon power level
    POWER_UP_DAMAGE_MULTIPLIER: 0.6, // Damage increase per level (was 0.5) - 60% per level
    
    // Speed System
    MAX_SPEED_LEVEL: 20,           // Max speed boost level
    SPEED_BOOST_PER_LEVEL: 0.05,   // Speed increase per level (5%)
    
    // Invulnerability Pickup
    INVULNERABLE_DURATION: 7.0,    // How long invulnerability lasts (was 5.0) - longer!
    
    // Shield Pickup
    SHIELD_ABSORBS_ONE_HIT: true,  // Does shield block 1 hit or all damage?
  },

  // ═══════════════════════════════════════════════════════════════════
  // WEAPON SYSTEM (BALANCED)
  // ═══════════════════════════════════════════════════════════════════
  WEAPONS: {
    // Base Weapon Stats (Level 0)
    BASE_DAMAGE: 12,               // Base bullet damage (was 10) - 20% more damage
    BASE_FIRE_RATE: 0.12,          // Time between shots (was 0.15) - 25% faster
    BASE_PROJECTILE_SPEED: 22,     // Bullet speed (was 20) - slightly faster
    BASE_RANGE: 38,                // Max bullet distance (was 35) - slightly longer
    
    // Heat System
    HEAT_ENABLED: true,            // Enable weapon overheating?
    HEAT_PER_SHOT: 0.8,            // Heat added per shot (was 1) - slightly less heat
    HEAT_COOLDOWN_RATE: 85,        // Heat removed per second (was 75) - faster cooling
    HEAT_MAX: 100,                 // Max heat before overheat
    OVERHEAT_COOLDOWN: 0.8,        // Forced cooldown time (was 1.0) - slightly shorter
    
    // Weapon Types
    BULLETS: {
      DAMAGE_MULTIPLIER: 1.0,      // Standard damage
      FIRE_RATE_MULTIPLIER: 1.0,   // Standard fire rate
      HEAT_MULTIPLIER: 1.0,        // Standard heat
    },
    LASERS: {
      DAMAGE_MULTIPLIER: 1.5,      // 50% more damage
      FIRE_RATE_MULTIPLIER: 0.7,   // 30% slower fire rate
      HEAT_MULTIPLIER: 1.3,        // 30% more heat
    },
    PHOTONS: {
      DAMAGE_MULTIPLIER: 0.8,      // 20% less damage
      FIRE_RATE_MULTIPLIER: 1.5,   // 50% faster fire rate
      HEAT_MULTIPLIER: 0.8,        // 20% less heat
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENEMY: DATA MITE (Basic small enemy) - EASY MODE
  // ═══════════════════════════════════════════════════════════════════
  DATA_MITE: {
    HEALTH: 1,                     // Dies in 1 hit
    SPEED: 1.5,                    // Movement speed (was 2.0) - slower!
    DAMAGE: 5,                     // Collision damage to player (was 10) - 50% less!
    XP_VALUE: 1,                   // XP awarded on kill
    RADIUS: 0.42,                  // Collision radius
    DEATH_DAMAGE: 0,               // No death explosion
    DEATH_RADIUS: 0,               // No area damage
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENEMY: SCAN DRONE (Ranged attacker) - EASY MODE
  // ═══════════════════════════════════════════════════════════════════
  SCAN_DRONE: {
    HEALTH: 30,                     // Takes a few hits
    SPEED: 1.2,                    // Moderate speed
    DAMAGE: 15,                     // Collision damage
    XP_VALUE: 6,                   // Better reward
    RADIUS: 1.2,                   // Medium size
    
    // Shooting Behavior
    FIRE_RATE: 2.0,                // Time between shots
    BULLET_SPEED: 7.0,             // Projectile speed
    BULLET_DAMAGE: 15,             // Bullet damage
    DETECTION_RANGE: 15,           // Aggro range
    PATROL_RANGE: 10,               // Patrol radius
    
    DEATH_DAMAGE: 0,               // No death explosion
    DEATH_RADIUS: 0,
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENEMY: FIZZER (Fast agile enemy) - EASY MODE
  // ═══════════════════════════════════════════════════════════════════
  FIZZER: {
    HEALTH: 2,                     // Low health
    SPEED: 8.0,                    // VERY FAST! 
    DAMAGE: 6,                     // Collision damage (was 10) - less damage!
    XP_VALUE: 15,                  // Good reward for difficulty
    RADIUS: 0.35,                  // Small = hard to hit
    
    // Shooting Behavior (Burst fire)
    FIRE_RATE: 3.0,                // Time between bursts
    BURST_COUNT: 2,                // Shots per burst (was 3) - fewer shots!
    BURST_DELAY: 0.2,              // Time between burst shots (was 0.15) - slower!
    BULLET_SPEED: 9.0,             // Fast bullets (was 12.0) - easier to dodge!
    BULLET_DAMAGE: 6,              // Lower individual damage (was 8) - less damage!
    
    DEATH_DAMAGE: 15,              // Electric explosion!
    DEATH_RADIUS: 2.0,             // Small explosion radius
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENEMY: UFO (Hit-and-run attacker) - EASY MODE
  // ═══════════════════════════════════════════════════════════════════
  UFO: {
    HEALTH: 30,                    // Sturdy craft (was 40) - easier to kill!
    SPEED: 2.8,                    // Fast movement (was 3.5) - slower!
    DAMAGE: 12,                    // Collision damage (was 20) - less damage!
    XP_VALUE: 25,                  // Good reward
    RADIUS: 1.2,                   // Medium size
    
    // Shooting Behavior
    FIRE_RATE: 2.0,                // Time between shots (was 1.5) - less frequent!
    BULLET_SPEED: 8.0,             // Projectile speed (was 10.0) - easier to dodge!
    BULLET_DAMAGE: 14,             // Bullet damage (was 20) - less damage!
    
    DEATH_DAMAGE: 25,              // Alien tech explosion
    DEATH_RADIUS: 3.0,             // Medium explosion
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENEMY: CHAOS WORM (Segmented boss) - EASY MODE
  // ═══════════════════════════════════════════════════════════════════
  CHAOS_WORM: {
    HEALTH: 100,                   // MASSIVE health pool (was 150) - easier!
    SPEED: 1.5,                    // Moderate speed (was 2.0) - slower!
    DAMAGE: 15,                    // High collision damage (was 25) - less damage!
    XP_VALUE: 35,                  // Big reward
    RADIUS: 2.5,                   // Large hitbox
    SEGMENT_COUNT: 12,             // Number of body segments
    
    // Death Animation
    DEATH_DURATION: 2.0,           // How long death takes (seconds)
    BULLETS_PER_SEGMENT: 6,        // Death bullets per segment
    DEATH_BULLET_SPEED: 8,         // Death bullet speed
    DEATH_BULLET_DAMAGE: 15,       // Death bullet damage
    FINAL_NOVA_BULLETS: 16,        // Final burst bullet count
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENEMY: VOID SPHERE (Tank) - EASY MODE
  // ═══════════════════════════════════════════════════════════════════
  VOID_SPHERE: {
    HEALTH: 650,                   // MASSIVE health pool (3x tougher!) - epic boss-tier enemy!
    SPEED: 0.5,                    // Slow but deadly (was 0.6) - slower!
    DAMAGE: 40,                    // DEVASTATING collision
    XP_VALUE: 50,                  // Massive reward
    RADIUS: 3.2,                   // Huge hitbox (4x normal)
    
    // Shooting Behavior (Burst)
    FIRE_RATE: 3.0,                // Time between bursts
    BURST_COUNT: 4,                // Shots per burst
    BURST_DELAY: 0.25,             // Time between burst shots (was 0.2) - slower!
    BULLET_SPEED: 5.0,             // Slow heavy bullets (was 6.0) - easier to dodge!
    BULLET_DAMAGE: 20,             // High damage per bullet
    
    DEATH_DAMAGE: 50,              // MASSIVE implosion
    DEATH_RADIUS: 8.0,             // Huge explosion radius
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENEMY: CRYSTAL SHARD SWARM (Orbital attacker) - TOUGHER
  // ═══════════════════════════════════════════════════════════════════
  CRYSTAL_SWARM: {
    HEALTH: 250,                    // Higher health (was 200)
    SPEED: 1.8,                    // Faster movement (was 1.4)
    DAMAGE: 25,                    // High collision damage (was 40) - less damage!
    XP_VALUE: 45,                  // Big reward
    RADIUS: 4.5,                   // Large orbital radius
    SHARD_COUNT: 6,                // Number of orbiting shards
    ORBIT_SPEED: 1.5,              // Rotation speed

    // Shooting Behavior (Burst from shards)
    FIRE_RATE: 3.5,                // Time between bursts (was 2.5) - less frequent!
    BURST_COUNT: 2,                // Shots per burst (was 3) - fewer shots!
    BURST_DELAY: 0.2,              // Time between burst shots (was 0.15) - slower!
    BULLET_SPEED: 8.0,             // Projectile speed (was 10.0) - easier to dodge!
    BULLET_DAMAGE: 10,             // Damage per bullet (was 15) - less damage!
    SHARDS_THAT_FIRE: 2,           // How many shards fire at once
    
    DEATH_DAMAGE: 30,              // Crystal explosion
    DEATH_RADIUS: 5.0,             // Large explosion
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENEMY: BOSS (Level boss) - EASY MODE
  // ═══════════════════════════════════════════════════════════════════
  BOSS: {
    HEALTH: 180,                   // Boss health (was 250) - easier!
    SPEED: 0.3,                    // Slow but menacing (was 0.4) - slower!
    DAMAGE: 25,                    // High collision damage (was 40) - less damage!
    XP_VALUE: 100,                 // Huge reward
    RADIUS: 3.5,                   // Large ship
    
    // Shooting Behavior (Multi-phase)
    PHASE_1_FIRE_RATE: 1.5,        // Aggressive firing (was 1.0) - slower!
    PHASE_2_FIRE_RATE: 1.2,        // Faster when damaged (was 0.8) - still slower!
    PHASE_3_FIRE_RATE: 99,         // No firing (ring phase)
    BULLET_SPEED: 6.5,             // Projectile speed (was 8.0) - easier to dodge!
    BULLET_DAMAGE: 18,             // High damage (was 25) - less damage!
    
    // Phase Thresholds
    PHASE_2_HEALTH_PCT: 0.66,      // Enter phase 2 at 66% health
    PHASE_3_HEALTH_PCT: 0.33,      // Enter phase 3 at 33% health
    
    // Boss Ring Attack (Phase 3)
    RING_DURATION: 3.0,            // How long ring lasts
    RING_EXPANSION_SPEED: 2.0,     // Ring growth rate
    RING_DAMAGE: 30,               // Damage from touching ring
    
    DEATH_DAMAGE: 75,              // Massive explosion
    DEATH_RADIUS: 12.0,            // Huge explosion radius
  },

  // ═══════════════════════════════════════════════════════════════════
  // PICKUP CONFIGURATION (BALANCED - Not too generous!)
  // ═══════════════════════════════════════════════════════════════════
  PICKUPS: {
    // Power-Up (Weapon boost)
    POWER_UP: {
      SPAWNS_PER_LEVEL: 2,         // How many spawn per level - LIMITED!
      SPAWN_INTERVAL_MIN: 30,      // Min time between spawns - RARE!
      SPAWN_INTERVAL_MAX: 45,      // Max time between spawns
    },
    
    // Speed-Up (Movement boost)
    SPEED_UP: {
      SPAWNS_PER_LEVEL: 2,         // Limited spawns
      SPAWN_INTERVAL_MIN: 25,      // Less frequent
      SPAWN_INTERVAL_MAX: 35,
    },
    
    // Med Pack (Health restore)
    MED_PACK: {
      SPAWNS_PER_LEVEL: 3,         // Moderate amount
      SPAWN_INTERVAL_MIN: 20,      // Reasonable frequency
      SPAWN_INTERVAL_MAX: 30,
      HEALTH_THRESHOLD: 0.8,       // Only spawn if player < 80% health
      HEAL_AMOUNT: 35,             // Health restored
    },
    
    // Shield (One-hit protection)
    SHIELD: {
      SPAWNS_PER_LEVEL: 2,
      SPAWN_INTERVAL_MIN: 20,
      SPAWN_INTERVAL_MAX: 30,
    },
    
    // Invulnerable (Rare god mode)
    INVULNERABLE: {
      SPAWNS_PER_LEVEL: 1,         // Rare spawn
      SPAWN_INTERVAL_MIN: 60,      // Only once per minute minimum
      SPAWN_INTERVAL_MAX: 90,
    },
    
    // Magnetism (All pickups)
    MAGNET_RADIUS: 5.0,            // Distance at which pickup moves to player
    MAGNET_STRENGTH: 16.0,         // Attraction force
    MAX_MAGNET_SPEED: 18.0,        // Max speed when being pulled
  },

  // ═══════════════════════════════════════════════════════════════════
  // SCORING SYSTEM
  // ═══════════════════════════════════════════════════════════════════
  SCORING: {
    // Base Points
    BASE_KILL_POINTS: 100,         // Points per enemy kill
    
    // Multiplier System
    COMBO_TIMER: 3.0,              // Time to maintain combo (seconds)
    KILL_CHAIN_WINDOW: 1.5,        // Time window for multiplier increase
    MULTIPLIER_DECAY_TIME: 2.0,    // Time before multiplier decays
    MAX_MULTIPLIER: 15,            // Maximum score multiplier
    
    // Bonus Points
    LEVEL_COMPLETE_BONUS: 1000,    // Bonus for completing a level
    BOSS_KILL_MULTIPLIER: 2.0,     // Boss kills worth 2x points
    PERFECT_LEVEL_BONUS: 500,      // Bonus for no damage taken
  },

  // ═══════════════════════════════════════════════════════════════════
  // LEVEL PROGRESSION - 99 LEVELS WITH RAMPING DIFFICULTY!
  // ═══════════════════════════════════════════════════════════════════
  LEVELS: {
    TOTAL_LEVELS: 99,              // 99 LEVELS OF CHAOS!
    
    // Difficulty Scaling (per level) - Gradual ramp for 99 levels
    ENEMY_HEALTH_SCALE: 1.025,     // 2.5% more health per level (compounds to ~10x at level 99)
    ENEMY_SPEED_SCALE: 1.012,      // 1.2% faster per level (compounds to ~3x at level 99)
    ENEMY_DAMAGE_SCALE: 1.02,      // 2% more damage per level (compounds to ~6x at level 99)
    SPAWN_RATE_SCALE: 0.992,       // 0.8% faster spawns per level
    
    // Level Duration
    LEVEL_DURATION: 90,            // Seconds per level (1.5 minutes)
    BOSS_APPEARS_AT: 70,           // Boss spawns at this time (seconds)
  },

  // ═══════════════════════════════════════════════════════════════════
  // WORLD SETTINGS
  // ═══════════════════════════════════════════════════════════════════
  WORLD: {
    SIZE: 80,                      // World diameter
    BOUNDARY_RADIUS: 29,           // Playable area radius
    BOUNDARY_DAMAGE: 10,           // Damage per second outside boundary
    SPAWN_BOUNDARY: 28,            // Enemy spawn radius
    PICKUP_SPAWN_BOUNDARY: 25,     // Pickup spawn radius
    MIN_PLAYER_DISTANCE: 5,        // Min distance from player for spawns
  },

  // ═══════════════════════════════════════════════════════════════════
  // VISUAL & AUDIO FEEDBACK
  // ═══════════════════════════════════════════════════════════════════
  FEEDBACK: {
    // Screen Shake
    SMALL_SHAKE: { intensity: 0.2, duration: 0.1 },
    MEDIUM_SHAKE: { intensity: 0.5, duration: 0.3 },
    LARGE_SHAKE: { intensity: 1.0, duration: 0.5 },
    
    // Camera Zoom
    MIN_ZOOM: 24,                  // Zoomed in (intense action)
    MAX_ZOOM: 45,                  // Zoomed out (many enemies)
    ZOOM_SPEED: 3.0,               // How fast zoom changes
    
    // Particle Effects
    PARTICLE_DENSITY: 1.0,         // Multiplier for particle count (1.0 = normal)
    TRAIL_ENABLED: true,           // Enemy trails on/off
    EXPLOSION_SCALE: 1.0,          // Explosion size multiplier
  },
} as const

// ═══════════════════════════════════════════════════════════════════
// HELPER: Get scaled value for current level
// ═══════════════════════════════════════════════════════════════════
export function getScaledValue(baseValue: number, level: number, scalePerLevel: number): number {
  return baseValue * Math.pow(scalePerLevel, level - 1)
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Get enemy stats for current level
// ═══════════════════════════════════════════════════════════════════
export function getEnemyStatsForLevel(enemyType: keyof typeof BALANCE_CONFIG, level: number): any {
  const baseStats = BALANCE_CONFIG[enemyType]
  if (!baseStats || typeof baseStats !== 'object') {
    return baseStats
  }
  
  const scaledStats: any = { ...baseStats }
  
  // Scale health, speed, damage for current level
  if ('HEALTH' in scaledStats && typeof scaledStats.HEALTH === 'number') {
    scaledStats.HEALTH = Math.ceil(getScaledValue(
      scaledStats.HEALTH as number,
      level,
      BALANCE_CONFIG.LEVELS.ENEMY_HEALTH_SCALE
    ))
  }
  
  if ('SPEED' in scaledStats && typeof scaledStats.SPEED === 'number') {
    scaledStats.SPEED = getScaledValue(
      scaledStats.SPEED as number,
      level,
      BALANCE_CONFIG.LEVELS.ENEMY_SPEED_SCALE
    )
  }
  
  if ('DAMAGE' in scaledStats && typeof scaledStats.DAMAGE === 'number') {
    scaledStats.DAMAGE = Math.ceil(getScaledValue(
      scaledStats.DAMAGE as number,
      level,
      BALANCE_CONFIG.LEVELS.ENEMY_DAMAGE_SCALE
    ))
  }
  
  return scaledStats
}
