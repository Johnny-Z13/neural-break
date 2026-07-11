/**
 * 🎨 ENTITY PALETTE - Single source of truth for entity signature colors
 * Neon vector overhaul: one shape, one color per entity. Bloom does the glow.
 * Values match the StartScreen threat-database card colors.
 */
export const ENTITY_PALETTE = {
  DATA_MITE: 0xFF4400,
  SCAN_DRONE: 0xFF8800,
  SCAN_DRONE_ALERT: 0xFF0000,
  CHAOS_WORM: 0xFF00FF,
  CRYSTAL_SWARM: 0x00FFFF,
  VOID_SPHERE: 0xAA00FF,
  FIZZER: 0x00FF88,
  UFO: 0x88AAFF,
  BOSS: 0xFF0000,
  PLAYER: 0xE8F0FF,
  PLAYER_COCKPIT: 0x00FFFF,
  PLAYER_TRACER: 0xCCFFFF,
  PICKUP_MEDPACK: 0x00FF00,
  PICKUP_EMERALD: 0x00DD55,
} as const
