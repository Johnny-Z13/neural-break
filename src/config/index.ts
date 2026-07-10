/**
 * Centralized configuration module
 * All game configuration constants and flags
 */

// Debug mode: Enabled in development, disabled in production builds
// Vite automatically sets import.meta.env.PROD = true for production builds
export const DEBUG_MODE = !import.meta.env.PROD

// Re-export all config modules
export * from './game.config'
export * from './enemy.config'
export * from './visual.config'
export * from './balance.config'
export * from './modes.config'  // Game mode-specific settings (Arcade, Test)

