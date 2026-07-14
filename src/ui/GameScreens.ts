import { GameStats, GameMode } from '../core/GameState'
import { AudioManager } from '../audio/AudioManager'
import { StarfieldManager } from '../graphics/StarfieldManager'
import { StartScreen } from './screens/StartScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import { OptionsScreen } from './screens/OptionsScreen'
import { ScreenDirection, ScreenTransitions } from './screens/ScreenTransitions'

export class GameScreens {
  private static currentScreen: HTMLElement | null = null
  private static audioManager: AudioManager | null = null
  private static hidePlayerCallback: (() => void) | null = null
  private static isNavigating = false

  static setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  static setHidePlayerCallback(callback: () => void): void {
    this.hidePlayerCallback = callback
  }

  static showStartScreen(onStartGame: () => void, onStartTestMode?: () => void): void {
    StarfieldManager.getInstance().start()
    this.hidePlayerCallback?.()

    void this.replaceScreen(
      () => StartScreen.create(
        this.audioManager,
        () => void this.launchGameplay(onStartGame),
        () => void this.showLeaderboard(() => this.showStartScreen(onStartGame, onStartTestMode)),
        onStartTestMode ? () => void this.launchGameplay(onStartTestMode) : undefined,
        () => this.showOptionsScreen(() => this.showStartScreen(onStartGame, onStartTestMode))
      ),
      'back'
    )
  }

  static showLeaderboard(onBack: () => void): Promise<void> {
    this.hidePlayerCallback?.()

    return this.replaceScreen(
      () => LeaderboardScreen.create(this.audioManager, onBack),
      'forward'
    )
  }

  static showOptionsScreen(onBack: () => void): void {
    this.hidePlayerCallback?.()

    void this.replaceScreen(
      () => OptionsScreen.create(this.audioManager, onBack),
      'forward'
    )
  }

  static showGameOverScreen(
    stats: GameStats,
    gameMode: GameMode,
    onRestart: () => void
  ): Promise<void> {
    return this.replaceScreen(
      () => GameOverScreen.create(
        stats,
        gameMode,
        this.audioManager,
        onRestart,
        () => void this.showLeaderboard(onRestart)
      ),
      'forward'
    )
  }

  private static async replaceScreen(
    createScreen: () => HTMLElement | Promise<HTMLElement>,
    direction: ScreenDirection
  ): Promise<void> {
    if (this.isNavigating) return

    this.isNavigating = true
    const previousScreen = this.currentScreen
    let nextScreen: HTMLElement | null = null

    try {
      if (previousScreen) previousScreen.style.pointerEvents = 'none'

      nextScreen = await createScreen()
      document.body.appendChild(nextScreen)
      this.currentScreen = nextScreen

      await ScreenTransitions.transitionScreens(previousScreen, nextScreen, direction)
      this.disposeScreen(previousScreen)
    } catch (error) {
      nextScreen?.remove()
      this.currentScreen = previousScreen
      if (previousScreen) previousScreen.style.pointerEvents = ''
      console.error('Screen transition failed:', error)
    } finally {
      this.isNavigating = false
    }
  }

  private static async launchGameplay(onLaunch: () => void): Promise<void> {
    if (this.isNavigating) return

    this.isNavigating = true
    const previousScreen = this.currentScreen
    this.currentScreen = null

    try {
      await ScreenTransitions.transitionToGameplay(previousScreen, () => {
        StartScreen.stopStarfield()
        onLaunch()
      })
      this.disposeScreen(previousScreen)
    } catch (error) {
      this.currentScreen = previousScreen
      if (previousScreen) previousScreen.style.pointerEvents = ''
      document.body.classList.remove('ui-game-launching')
      console.error('Game launch transition failed:', error)
    } finally {
      this.isNavigating = false
    }
  }

  private static disposeScreen(screen: HTMLElement | null): void {
    if (!screen) return

    if (screen.id === 'startScreen') StartScreen.cleanup()
    if (screen.id === 'leaderboardScreen') LeaderboardScreen.cleanup()
    if (screen.id === 'optionsScreen') OptionsScreen.cleanup()
    if (screen.id === 'gameOverScreen') GameOverScreen.cleanup()

    screen.remove()
  }
}
