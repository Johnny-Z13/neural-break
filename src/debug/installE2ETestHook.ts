import type { EnemyType } from '../entities'
import type { LevelManager, LevelObjectives, LevelProgress } from '../core/LevelManager'

interface E2ETestHookContext {
  getLevelManager: () => LevelManager
  getStatsLevel: () => number
  isTransitioning: () => boolean
}

declare global {
  interface Window {
    __NEURAL_BREAK_E2E__?: {
      completeCurrentObjectives: () => void
      getProgressionState: () => {
        currentLevel: number
        statsLevel: number
        isTransitioning: boolean
        objectives: LevelObjectives
        progress: LevelProgress
      }
    }
  }
}

const OBJECTIVE_TYPES: Array<[keyof LevelObjectives, EnemyType]> = [
  ['dataMites', 'DataMite'],
  ['scanDrones', 'ScanDrone'],
  ['chaosWorms', 'ChaosWorm'],
  ['voidSpheres', 'VoidSphere'],
  ['crystalSwarms', 'CrystalShardSwarm'],
  ['fizzers', 'Fizzer'],
  ['ufos', 'UFO'],
  ['bosses', 'Boss'],
]

export function installE2ETestHook(context: E2ETestHookContext): void {
  window.__NEURAL_BREAK_E2E__ = {
    completeCurrentObjectives: () => {
      const levelManager = context.getLevelManager()
      const objectives = levelManager.getObjectives()
      const progress = levelManager.getProgress()

      for (const [objective, enemyType] of OBJECTIVE_TYPES) {
        const remainingKills = Math.max(0, objectives[objective] - progress[objective])
        for (let kill = 0; kill < remainingKills; kill++) {
          levelManager.registerKill(enemyType)
        }
      }
    },
    getProgressionState: () => {
      const levelManager = context.getLevelManager()
      return {
        currentLevel: levelManager.getCurrentLevel(),
        statsLevel: context.getStatsLevel(),
        isTransitioning: context.isTransitioning(),
        objectives: levelManager.getObjectives(),
        progress: levelManager.getProgress(),
      }
    },
  }
}
