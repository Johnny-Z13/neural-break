/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 GAME MODE MANAGER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Central system for managing different game modes (Arcade, Test, etc.)
 * Makes it easy to add new modes without touching core game logic.
 * 
 * 📋 TO ADD A NEW GAME MODE:
 * 1. Add new mode to GameMode enum in GameState.ts
 * 2. Create mode config in GAME_MODE_CONFIGS below
 * 3. Implement mode-specific logic in the config
 * 4. That's it! The system handles the rest.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { GameMode } from './GameState'

/**
 * Configuration for a game mode
 */
export interface GameModeConfig {
  name: string
  description: string
  
  // Level system
  usesObjectiveSystem: boolean      // Does this mode use kill objectives?
  usesLevelProgression: boolean     // Does this mode advance through numbered levels?
  startingLevel: number             // What level/layer does this mode start at?
  
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
  showLevelNumber: boolean          // Show "Level X" or "Layer X"?
  levelLabel: string                // "Level" or "Layer"
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 GAME MODE CONFIGURATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🕹️ ARCADE MODE - Classic objective-based gameplay
  // ═══════════════════════════════════════════════════════════════════════════
  [GameMode.ORIGINAL]: {
    name: 'ARCADE MODE',
    description: 'Classic objective-based gameplay with level progression',
    
    // Level system
    usesObjectiveSystem: true,
    usesLevelProgression: true,
    startingLevel: 1,
    
    // Boundaries
    usesCircularBoundary: true,
    usesSideBoundaries: false,
    boundaryWidthMultiplier: 1.0,

    // Scrolling
    scrollSpeed: 0,
    cameraVerticalOffset: 0,          // Centered camera

    // Enemy spawning
    enemySpawnMode: 'circular',

    // Special features
    starfieldFlowsDown: false,

    // UI
    showLevelNumber: true,
    levelLabel: 'Level'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 TEST MODE - For development and testing
  // ═══════════════════════════════════════════════════════════════════════════
  [GameMode.TEST]: {
    name: 'TEST MODE',
    description: 'Development mode with unlimited health',

    // Level system
    usesObjectiveSystem: true,
    usesLevelProgression: true,
    startingLevel: 1,

    // Boundaries
    usesCircularBoundary: true,
    usesSideBoundaries: false,
    boundaryWidthMultiplier: 1.0,

    // Scrolling
    scrollSpeed: 0,
    cameraVerticalOffset: 0,          // Centered camera

    // Enemy spawning
    enemySpawnMode: 'circular',

    // Special features
    starfieldFlowsDown: false,

    // UI
    showLevelNumber: true,
    levelLabel: 'Level'
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 GAME MODE MANAGER CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export class GameModeManager {
  private currentMode: GameMode = GameMode.ORIGINAL
  private currentConfig: GameModeConfig
  
  constructor(initialMode: GameMode = GameMode.ORIGINAL) {
    this.currentMode = initialMode
    this.currentConfig = GAME_MODE_CONFIGS[initialMode]
  }
  
  /**
   * Switch to a different game mode
   */
  setMode(mode: GameMode): void {
    this.currentMode = mode
    this.currentConfig = GAME_MODE_CONFIGS[mode]
  }
  
  /**
   * Get current game mode
   */
  getMode(): GameMode {
    return this.currentMode
  }
  
  /**
   * Get current mode configuration
   */
  getConfig(): GameModeConfig {
    return this.currentConfig
  }
  
  /**
   * Check if current mode uses a specific feature
   */
  usesObjectiveSystem(): boolean {
    return this.currentConfig.usesObjectiveSystem
  }
  
  usesCircularBoundary(): boolean {
    return this.currentConfig.usesCircularBoundary
  }
  
  usesSideBoundaries(): boolean {
    return this.currentConfig.usesSideBoundaries
  }
  
  getEnemySpawnMode(): 'circular' | 'vertical' | 'custom' {
    return this.currentConfig.enemySpawnMode
  }
  
  getScrollSpeed(): number {
    return this.currentConfig.scrollSpeed
  }
  
  getCameraVerticalOffset(): number {
    return this.currentConfig.cameraVerticalOffset
  }
  
  getBoundaryWidthMultiplier(): number {
    return this.currentConfig.boundaryWidthMultiplier
  }
  
  getStartingLevel(): number {
    return this.currentConfig.startingLevel
  }
  
  getLevelLabel(): string {
    return this.currentConfig.levelLabel
  }
  
  /**
   * Check if this is Arcade mode (convenience method)
   */
  isArcadeMode(): boolean {
    return this.currentMode === GameMode.ORIGINAL
  }
  
  /**
   * Check if this is Test mode (convenience method)
   */
  isTestMode(): boolean {
    return this.currentMode === GameMode.TEST
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Get all available game modes
 */
export function getAllGameModes(): GameMode[] {
  return Object.values(GameMode)
}

/**
 * Get config for a specific mode
 */
export function getGameModeConfig(mode: GameMode): GameModeConfig {
  return GAME_MODE_CONFIGS[mode]
}

/**
 * Get mode name
 */
export function getGameModeName(mode: GameMode): string {
  return GAME_MODE_CONFIGS[mode].name
}
