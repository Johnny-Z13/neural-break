import { GameStats, GameMode } from '../core/GameState'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { StarfieldManager } from '../graphics/StarfieldManager'
import { StartScreen } from './screens/StartScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import { OptionsScreen } from './screens/OptionsScreen'
import { ScreenTransitions } from './screens/ScreenTransitions'

export class GameScreens {
  private static currentScreen: HTMLElement | null = null
  private static audioManager: AudioManager | null = null
  private static sceneManager: SceneManager | null = null
  private static hidePlayerCallback: (() => void) | null = null

  static setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  static setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager
  }

  static setHidePlayerCallback(callback: () => void): void {
    this.hidePlayerCallback = callback
  }

  static showStartScreen(onStartGame: () => void, onStartTestMode?: () => void): void {
    // Start the starfield for menu screens
    StarfieldManager.getInstance().start()

    // Hide player ship on start screen
    if (this.hidePlayerCallback) {
      this.hidePlayerCallback()
    }

    ScreenTransitions.transitionOut(
      this.currentScreen,
      this.sceneManager,
      () => {
        this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
        this.showStartScreenContent(onStartGame, onStartTestMode)
      }
    )
  }

  private static showStartScreenContent(onStartGame: () => void, onStartTestMode?: () => void): void {
    const startScreen = StartScreen.create(
      this.audioManager,
      () => {
        this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
        setTimeout(() => {
          onStartGame()
        }, 50)
      },
      () => {
        // Only cleanup styles, starfield persists between menu screens
        StartScreen.cleanup()
        this.showLeaderboard(() => this.showStartScreen(onStartGame, onStartTestMode))
      },
      onStartTestMode ? () => {
        this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
        setTimeout(() => {
          onStartTestMode()
        }, 50)
      } : undefined,
      () => {
        // OPTIONS - cleanup and show options screen
        StartScreen.cleanup()
        this.showOptionsScreen(() => this.showStartScreen(onStartGame, onStartTestMode))
      }
    )

    // Add the screen to DOM
    document.body.appendChild(startScreen)
    this.currentScreen = startScreen

    // 🎬 MOTION GRAPHICS - Animate in! 🎬
    ScreenTransitions.animateScreenIn(startScreen)
  }

  static async showLeaderboard(onBack: () => void): Promise<void> {
    // Hide player ship on leaderboard screen
    if (this.hidePlayerCallback) {
      this.hidePlayerCallback()
    }

    ScreenTransitions.transitionOut(
      this.currentScreen,
      this.sceneManager,
      async () => {
        this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
        const leaderboardScreen = await LeaderboardScreen.create(
          this.audioManager,
          () => {
            this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
            onBack()
          }
        )

        document.body.appendChild(leaderboardScreen)
        this.currentScreen = leaderboardScreen

        // 🎬 MOTION GRAPHICS - Slide in! 🎬
        ScreenTransitions.animateScreenIn(leaderboardScreen, 'slide')
      },
      'slide'
    )
  }

  static showOptionsScreen(onBack: () => void): void {
    // Hide player ship on options screen
    if (this.hidePlayerCallback) {
      this.hidePlayerCallback()
    }

    ScreenTransitions.transitionOut(
      this.currentScreen,
      this.sceneManager,
      () => {
        this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
        const optionsScreen = OptionsScreen.create(
          this.audioManager,
          () => {
            this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
            onBack()
          }
        )

        document.body.appendChild(optionsScreen)
        this.currentScreen = optionsScreen

        // 🎬 MOTION GRAPHICS - Slide in! 🎬
        ScreenTransitions.animateScreenIn(optionsScreen, 'slide')
      },
      'slide'
    )
  }

  static async showGameOverScreen(stats: GameStats, gameMode: GameMode, onRestart: () => void): Promise<void> {
    ScreenTransitions.transitionOut(
      this.currentScreen,
      this.sceneManager,
      async () => {
        this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
        const gameOverScreen = await GameOverScreen.create(
          stats,
          gameMode,
          this.audioManager,
          () => {
            this.currentScreen = ScreenTransitions.hideCurrentScreen(this.currentScreen)
            onRestart()
          }
        )
        
        document.body.appendChild(gameOverScreen)
        this.currentScreen = gameOverScreen
        
        // 🎬 MOTION GRAPHICS - Dramatic entrance! 🎬
        ScreenTransitions.animateScreenIn(gameOverScreen, 'zoom')
      },
      'zoom'
    )
  }
}
