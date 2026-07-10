/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 GAME MODE CONFIGURATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Central configuration for all game mode settings.
 * Edit this file to adjust mode-specific behavior.
 * 
 * MODES:
 * - ARCADE: Classic objective-based gameplay (centered player, circular boundary)
 * - TEST:   Development mode (arcade with invincibility)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🌌 STARFIELD SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const STARFIELD_CONFIG = {
  /**
   * ARCADE MODE - Subtle ambient drift
   * Stars drift slowly in random directions
   */
  ARCADE: {
    horizontalDriftMin: -0.2,
    horizontalDriftMax: 0.2,
    verticalDriftMin: -0.2,
    verticalDriftMax: 0.2,
    description: 'Subtle ambient drift in all directions'
  },
  
  /**
   * TEST MODE - Same as Arcade
   */
  TEST: {
    horizontalDriftMin: -0.2,
    horizontalDriftMax: 0.2,
    verticalDriftMin: -0.2,
    verticalDriftMax: 0.2,
    description: 'Same as Arcade mode'
  }
} as const

// ═══════════════════════════════════════════════════════════════════════════
// 📷 CAMERA SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const CAMERA_CONFIG = {
  /**
   * ARCADE MODE - Centered player
   */
  ARCADE: {
    verticalOffset: 0,        // Player centered on screen
    followSmoothing: 5.0,     // Camera lerp speed
    description: 'Player centered on screen'
  },
  
  /**
   * TEST MODE - Same as Arcade
   */
  TEST: {
    verticalOffset: 0,
    followSmoothing: 5.0,
    description: 'Same as Arcade mode'
  }
} as const

// ═══════════════════════════════════════════════════════════════════════════
// 🚧 BOUNDARY SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const BOUNDARY_CONFIG = {
  /**
   * ARCADE MODE - Circular arena
   */
  ARCADE: {
    type: 'circular' as const,
    radius: 29.5,             // Circular boundary radius
    description: 'Circular energy barrier arena'
  },
  
  /**
   * TEST MODE - Same as Arcade
   */
  TEST: {
    type: 'circular' as const,
    radius: 29.5,
    description: 'Same as Arcade mode'
  }
} as const

// ═══════════════════════════════════════════════════════════════════════════
// 👾 ENEMY SPAWN SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const ENEMY_SPAWN_CONFIG = {
  /**
   * ARCADE MODE - Spawn around circular edge
   */
  ARCADE: {
    mode: 'circular' as const,
    spawnRadius: 31.5,        // Just outside boundary
    description: 'Enemies spawn around circular boundary edge'
  },
  
  /**
   * TEST MODE - Same as Arcade
   */
  TEST: {
    mode: 'circular' as const,
    spawnRadius: 31.5,
    description: 'Same as Arcade mode'
  }
} as const

// ═══════════════════════════════════════════════════════════════════════════
// 🎁 PICKUP SPAWN SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const PICKUP_SPAWN_CONFIG = {
  /**
   * ARCADE MODE - Random within arena
   */
  ARCADE: {
    mode: 'circular' as const,
    spawnRadius: 28,          // Within boundary
    minDistanceFromPlayer: 5,
    description: 'Pickups spawn randomly within arena'
  },
  
  /**
   * TEST MODE - Same as Arcade
   */
  TEST: {
    mode: 'circular' as const,
    spawnRadius: 28,
    minDistanceFromPlayer: 5,
    description: 'Same as Arcade mode'
  }
} as const

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 LEVEL/PROGRESSION SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const PROGRESSION_CONFIG = {
  /**
   * ARCADE MODE - Objective-based levels
   */
  ARCADE: {
    usesObjectives: true,     // Kill X enemies to advance
    usesLevelProgression: true,
    startingLevel: 1,
    levelLabel: 'Level',
    description: 'Complete objectives to advance levels'
  },
  
  /**
   * TEST MODE - Same as Arcade but invincible
   */
  TEST: {
    usesObjectives: true,
    usesLevelProgression: true,
    startingLevel: 1,
    levelLabel: 'Level',
    playerInvincible: true,
    description: 'Arcade mode with invincibility for testing'
  }
} as const

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 VISUAL SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const VISUAL_MODE_CONFIG = {
  /**
   * ARCADE MODE
   */
  ARCADE: {
    showCircularBoundary: true,
    backgroundColor: '#000011',
    description: 'Classic arcade visuals'
  },

  /**
   * TEST MODE
   */
  TEST: {
    showCircularBoundary: true,
    backgroundColor: '#000011',
    description: 'Same as Arcade mode'
  }
} as const
