import { AudioManager } from '../../audio/AudioManager'
import { StarfieldManager } from '../../graphics/StarfieldManager'

/**
 * Neural Break title screen.
 *
 * The live Threat Database and starfield are the visual identity. The UI shell
 * deliberately stays restrained so enemy colours carry meaning instead of
 * competing with rainbow menu chrome.
 */
export class StartScreen {
  private static selectedButtonIndex = 0
  private static keyboardListener: ((event: KeyboardEvent) => void) | null = null
  private static resumeAudioListener: (() => void) | null = null
  private static gamepadInterval: number | null = null
  private static lastGamepadInput = 0
  private static readonly gamepadDeadzone = 0.5
  private static readonly inputCooldown = 200

  static create(
    audioManager: AudioManager | null,
    onStartGame: () => void,
    onShowLeaderboard: () => void,
    onStartTestMode?: () => void,
    onShowOptions?: () => void
  ): HTMLElement {
    StarfieldManager.getInstance().start()

    const startScreen = document.createElement('div')
    startScreen.id = 'startScreen'
    startScreen.innerHTML = `
      <div class="holo-grid" aria-hidden="true">
        <div class="grid-plane"></div>
      </div>

      <div class="crt-overlay" aria-hidden="true"></div>
      <div class="scanlines" aria-hidden="true"></div>

      <main class="start-content">
        <header class="title-container">
          <h1 id="neural-break-title" class="game-title">NEURAL BREAK</h1>
          <p class="game-subtitle">NEURAL SYSTEMS v2.6.9</p>
        </header>

        <section class="threat-database" aria-labelledby="threat-database-title">
          <h2 id="threat-database-title">THREAT DATABASE</h2>
          <div class="enemy-grid">
            ${StartScreen.createEnemyCard('DATA MITE', 'datamite', '#FF4400', 100)}
            ${StartScreen.createEnemyCard('SCAN DRONE', 'scandrone', '#FF8800', 250)}
            ${StartScreen.createEnemyCard('CHAOS WORM', 'chaosworm', '#FF00FF', 500)}
            ${StartScreen.createEnemyCard('CRYSTAL SWARM', 'crystalswarm', '#00FFFF', 750)}
            ${StartScreen.createEnemyCard('VOID SPHERE', 'voidsphere', '#AA00FF', 1000)}
            ${StartScreen.createEnemyCard('FIZZER', 'fizzer', '#00FF88', 200)}
            ${StartScreen.createEnemyCard('UFO', 'ufo', '#88AAFF', 1500)}
            ${StartScreen.createEnemyCard('BOSS', 'boss', '#FF0000', 5000, true)}
          </div>
        </section>

        <nav class="arcade-menu" aria-label="Main menu">
          <div class="menu-list">
            <button id="arcadeButton" class="menu-item" type="button">START GAME</button>
            <button id="optionsButton" class="menu-item" type="button">OPTIONS</button>
            <button id="leaderboardButton" class="menu-item" type="button">HI SCORES</button>
            <button id="testButton" class="menu-item" type="button">TEST</button>
          </div>
        </nav>
      </main>

      <aside class="controls-legend" aria-label="Game controls">
        <div class="control-item">
          <span class="key-cap">WASD</span>
          <span class="control-action">MOVE</span>
        </div>
        <div class="control-item">
          <span class="key-cap">SPACE</span>
          <span class="control-action">FIRE</span>
        </div>
        <div class="control-item">
          <span class="key-cap">SHIFT</span>
          <span class="control-action">DASH</span>
        </div>
        <div class="control-item control-item--gamepad">
          <span class="key-cap">GAMEPAD</span>
          <span
            id="gamepadStatus"
            class="control-action gamepad-status"
            aria-live="polite"
            aria-atomic="true"
          >OFF</span>
        </div>
      </aside>
    `

    const style = document.createElement('style')
    style.id = 'start-screen-styles'
    style.textContent = `
      #startScreen {
        --start-text: #edf4f6;
        --start-muted: #aab4b8;
        --start-cyan: #43dff2;
        --start-red: #ff5b45;
        --start-green: #78d99a;
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-sizing: border-box;
        padding: clamp(2rem, 5vh, 4rem) clamp(1rem, 4vw, 3rem) clamp(6rem, 12vh, 8rem);
        color: var(--start-text);
        font-family: 'IBM Plex Mono', 'Courier New', monospace;
        text-align: center;
        pointer-events: auto;
        image-rendering: auto;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }

      #startScreen *,
      #startScreen *::before,
      #startScreen *::after {
        box-sizing: border-box;
      }

      #startScreen .holo-grid,
      #startScreen .crt-overlay,
      #startScreen .scanlines {
        position: fixed;
        inset: 0;
        pointer-events: none;
      }

      #startScreen .holo-grid {
        z-index: 0;
        overflow: hidden;
        perspective: 500px;
        opacity: 0.55;
      }

      #startScreen .grid-plane {
        position: absolute;
        bottom: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background-image:
          repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(67, 223, 242, 0.08) 49px, rgba(67, 223, 242, 0.08) 50px),
          repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(67, 223, 242, 0.06) 49px, rgba(67, 223, 242, 0.06) 50px);
        transform: rotateX(60deg);
        animation: startGridScroll 20s linear infinite;
      }

      #startScreen .crt-overlay {
        z-index: 9997;
        background: radial-gradient(ellipse at center, transparent 35%, rgba(0, 4, 10, 0.16) 72%, rgba(0, 2, 7, 0.72) 100%);
        box-shadow: inset 0 0 140px rgba(0, 0, 0, 0.65);
      }

      #startScreen .scanlines {
        z-index: 9998;
        opacity: 0.3;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.12) 0,
          rgba(0, 0, 0, 0.12) 1px,
          transparent 1px,
          transparent 3px
        );
      }

      #startScreen .start-content {
        position: relative;
        z-index: 9999;
        display: flex;
        width: min(100%, 950px);
        flex-direction: column;
        align-items: center;
      }

      #startScreen .title-container {
        margin: 0 0 clamp(1rem, 2.4vh, 1.8rem);
      }

      #startScreen .game-title {
        margin: 0;
        color: var(--start-text);
        font-family: 'Rajdhani', 'Arial Narrow', sans-serif;
        font-size: clamp(2.4rem, 6.2vw, 5rem);
        font-weight: 600;
        letter-spacing: 0.12em;
        line-height: 0.95;
        text-transform: uppercase;
        text-shadow: 0 0 18px rgba(237, 244, 246, 0.16);
      }

      #startScreen .game-subtitle {
        margin: clamp(0.45rem, 1vh, 0.7rem) 0 0;
        color: var(--start-cyan);
        font-size: clamp(0.58rem, 1.2vw, 0.8rem);
        font-weight: 500;
        letter-spacing: 0.36em;
        line-height: 1;
        text-transform: uppercase;
        text-shadow: 0 0 10px rgba(67, 223, 242, 0.28);
      }

      #startScreen .threat-database {
        width: min(100%, 880px);
        margin: 0 0 clamp(-1rem, -1.8vh, -0.5rem);
        pointer-events: none;
      }

      #startScreen .threat-database h2 {
        margin: 0 0 clamp(0.75rem, 1.8vh, 1.25rem);
        color: var(--start-red);
        font-size: clamp(0.86rem, 1.65vw, 1.2rem);
        font-weight: 600;
        letter-spacing: 0.3em;
        line-height: 1;
        text-transform: uppercase;
        text-shadow: 0 0 10px rgba(255, 91, 69, 0.22);
      }

      #startScreen .enemy-grid {
        display: grid;
        width: min(100%, 700px);
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(0.65rem, 1.2vh, 0.85rem) clamp(1rem, 2.5vw, 2.25rem);
        margin: 0 auto;
      }

      #startScreen .enemy-card:nth-child(7) {
        grid-column: 1;
      }

      #startScreen .enemy-card:nth-child(8) {
        grid-column: 3;
      }

      #startScreen .enemy-card {
        display: flex;
        min-width: 0;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: clamp(0.12rem, 0.5vh, 0.3rem);
        padding: clamp(0.1rem, 0.5vh, 0.25rem);
        color: var(--enemy-color);
      }

      #startScreen .enemy-visual {
        width: clamp(58px, 7.5vw, 78px);
        aspect-ratio: 1;
      }

      #startScreen .enemy-name {
        max-width: 100%;
        color: var(--enemy-color);
        font-size: clamp(0.56rem, 0.95vw, 0.7rem);
        font-weight: 600;
        letter-spacing: 0.08em;
        line-height: 1.15;
        text-align: center;
        text-shadow: 0 0 6px color-mix(in srgb, var(--enemy-color) 45%, transparent);
        text-transform: uppercase;
        white-space: nowrap;
      }

      #startScreen .enemy-points {
        color: var(--enemy-color);
        font-size: clamp(0.52rem, 0.86vw, 0.65rem);
        font-weight: 500;
        letter-spacing: 0.05em;
        line-height: 1;
        text-shadow: 0 0 5px color-mix(in srgb, var(--enemy-color) 34%, transparent);
      }

      #startScreen .arcade-menu {
        width: min(100%, 220px);
      }

      #startScreen .menu-list {
        display: flex;
        flex-direction: column;
        gap: clamp(0.3rem, 1vh, 0.7rem);
      }

      #startScreen .menu-item {
        width: 100%;
        min-height: 2.25rem;
        border: 0;
        border-left: 2px solid transparent;
        padding: clamp(0.35rem, 0.8vh, 0.55rem) 1.35rem;
        background: transparent;
        color: var(--start-muted);
        font-family: 'Rajdhani', 'Arial Narrow', sans-serif;
        font-size: clamp(1.05rem, 2.25vw, 1.5rem);
        font-weight: 600;
        letter-spacing: 0.15em;
        line-height: 1;
        text-align: center;
        text-transform: uppercase;
        text-shadow: none;
        cursor: pointer;
        transition: color 140ms ease, border-color 140ms ease, background-color 140ms ease, transform 140ms ease;
      }

      #startScreen .menu-item:hover,
      #startScreen .menu-item:focus-visible,
      #startScreen .menu-item.selected {
        border-left-color: var(--start-cyan);
        background: transparent;
        color: var(--start-text);
        outline: none;
        text-shadow: 0 0 13px rgba(237, 244, 246, 0.18);
        transform: translateX(0.2rem);
      }

      #startScreen .menu-item:focus-visible {
        box-shadow: none;
      }

      #startScreen .menu-item:active {
        transform: translateX(0.2rem) translateY(1px);
      }

      #startScreen .controls-legend {
        position: fixed;
        left: 50%;
        bottom: clamp(0.85rem, 2.2vh, 1.5rem);
        z-index: 9999;
        display: grid;
        width: min(calc(100vw - 2rem), 720px);
        grid-template-columns: minmax(16px, 1fr) repeat(4, minmax(64px, 76px)) minmax(16px, 1fr);
        gap: clamp(0.35rem, 1vw, 0.65rem);
        align-items: center;
        transform: translateX(-50%);
      }

      #startScreen .controls-legend::before,
      #startScreen .controls-legend::after {
        width: 100%;
        height: 1px;
        background: rgba(67, 223, 242, 0.72);
        content: '';
      }

      #startScreen .control-item {
        display: flex;
        min-width: 0;
        flex-direction: column;
        align-items: center;
        gap: clamp(0.35rem, 0.8vh, 0.55rem);
      }

      #startScreen .key-cap {
        display: inline-flex;
        width: min(100%, 92px);
        min-height: 2rem;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(67, 223, 242, 0.82);
        padding: 0.35rem 0.55rem;
        color: var(--start-cyan);
        font-size: clamp(0.65rem, 1.2vw, 0.82rem);
        font-weight: 500;
        letter-spacing: 0.14em;
        line-height: 1;
        text-shadow: 0 0 7px rgba(67, 223, 242, 0.22);
      }

      #startScreen .control-action {
        color: var(--start-text);
        font-size: clamp(0.55rem, 1.05vw, 0.72rem);
        font-weight: 500;
        letter-spacing: 0.16em;
        line-height: 1;
        text-transform: uppercase;
      }

      #startScreen .gamepad-status {
        width: 3.25rem;
        color: var(--start-muted);
        text-align: center;
      }

      #startScreen .gamepad-status.is-active {
        color: var(--start-green);
        text-shadow: 0 0 7px rgba(120, 217, 154, 0.28);
      }

      @keyframes startGridScroll {
        from { transform: rotateX(60deg) translateY(0); }
        to { transform: rotateX(60deg) translateY(50px); }
      }

      @media (max-width: 768px) {
        #startScreen {
          align-items: center;
          justify-content: flex-start;
          padding: clamp(2.6rem, 7vh, 3.5rem) 1rem 6.7rem;
        }

        #startScreen .game-title {
          font-size: clamp(2rem, 6.5vw, 2.55rem);
        }

        #startScreen .enemy-grid {
          width: min(100%, 640px);
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(0.45rem, 1.5vh, 0.8rem) clamp(0.65rem, 2.5vw, 1.2rem);
        }

        #startScreen .enemy-visual {
          width: clamp(46px, 11vw, 68px);
        }

        #startScreen .arcade-menu {
          width: min(100%, 220px);
        }
      }

      @media (max-height: 800px) {
        #startScreen {
          align-items: center;
          justify-content: flex-start;
          padding-top: 3.2rem;
          padding-bottom: 6.4rem;
        }

        #startScreen .title-container {
          margin-bottom: 0.85rem;
        }

        #startScreen .game-title {
          font-size: 2.55rem;
          letter-spacing: 0.16em;
          transform: scaleX(1.2);
          transform-origin: center;
        }

        #startScreen .game-subtitle {
          margin-top: 0.42rem;
          font-size: 0.62rem;
        }

        #startScreen .threat-database h2 {
          margin-bottom: 0.6rem;
          font-size: 1.1rem;
          letter-spacing: 0.32em;
        }

        #startScreen .enemy-grid {
          gap: 0.42rem clamp(1.5rem, 7vw, 2.8rem);
        }

        #startScreen .enemy-card {
          gap: 0.15rem;
          padding: 0.08rem;
        }

        #startScreen .enemy-visual {
          width: 56px;
        }

        #startScreen .enemy-name {
          font-size: 0.72rem;
        }

        #startScreen .enemy-points {
          font-size: 0.68rem;
        }

        #startScreen .menu-list {
          gap: 0.22rem;
        }

        #startScreen .menu-item {
          min-height: 1.9rem;
          padding: 0.3rem 1.2rem;
          font-size: 1.3rem;
          letter-spacing: 0.19em;
        }

        #startScreen .controls-legend {
          bottom: 3.55rem;
        }

        #startScreen .key-cap {
          min-height: 1.75rem;
          padding: 0.28rem 0.35rem;
        }
      }

      @media (max-width: 460px) {
        #startScreen {
          padding-right: 0.75rem;
          padding-left: 0.75rem;
        }

        #startScreen .game-title {
          font-size: 1.85rem;
          letter-spacing: 0.08em;
        }

        #startScreen .game-subtitle {
          letter-spacing: 0.22em;
        }

        #startScreen .enemy-grid {
          column-gap: 0.45rem;
        }

        #startScreen .enemy-visual {
          width: clamp(38px, 12vw, 52px);
        }

        #startScreen .enemy-name {
          font-size: 0.56rem;
        }

        #startScreen .menu-item {
          font-size: 1rem;
        }

        #startScreen .controls-legend {
          width: calc(100vw - 1rem);
          gap: 0.35rem;
          padding-right: 0.25rem;
          padding-left: 0.25rem;
        }

        #startScreen .key-cap {
          min-height: 1.7rem;
          padding: 0.25rem 0.15rem;
          font-size: 0.58rem;
          letter-spacing: 0.07em;
        }

        #startScreen .control-action {
          font-size: 0.5rem;
          letter-spacing: 0.08em;
        }
      }

      @media (max-height: 680px) {
        #startScreen {
          padding-top: 1rem;
          padding-bottom: 5rem;
        }

        #startScreen .title-container {
          margin-bottom: 0.5rem;
        }

        #startScreen .game-title {
          font-size: 1.65rem;
        }

        #startScreen .game-subtitle {
          display: none;
        }

        #startScreen .threat-database h2 {
          margin-bottom: 0.3rem;
          font-size: 0.68rem;
        }

        #startScreen .enemy-grid {
          gap: 0.1rem 1rem;
        }

        #startScreen .enemy-visual {
          width: 34px;
        }

        #startScreen .enemy-name {
          font-size: 0.48rem;
        }

        #startScreen .enemy-points {
          font-size: 0.46rem;
        }

        #startScreen .menu-list {
          gap: 0.05rem;
        }

        #startScreen .menu-item {
          min-height: 1.55rem;
          padding: 0.2rem 1rem;
          font-size: 0.88rem;
        }

        #startScreen .controls-legend {
          bottom: 0.35rem;
          padding-top: 0.45rem;
        }

        #startScreen .key-cap {
          min-height: 1.35rem;
          font-size: 0.5rem;
        }

        #startScreen .control-action {
          font-size: 0.45rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #startScreen .grid-plane {
          animation: none;
        }

        #startScreen .menu-item {
          transition: none;
        }
      }
    `
    document.head.appendChild(style)

    const arcadeButton = startScreen.querySelector('#arcadeButton') as HTMLButtonElement
    const optionsButton = startScreen.querySelector('#optionsButton') as HTMLButtonElement
    const leaderboardButton = startScreen.querySelector('#leaderboardButton') as HTMLButtonElement
    const testButton = startScreen.querySelector('#testButton') as HTMLButtonElement
    const buttons = [arcadeButton, optionsButton, leaderboardButton, testButton]

    const runAction = (index: number): void => {
      if (audioManager) audioManager.playButtonPressSound()

      if (index === 0) {
        onStartGame()
      } else if (index === 1) {
        onShowOptions?.()
      } else if (index === 2) {
        onShowLeaderboard()
      } else if (index === 3) {
        onStartTestMode?.()
      }
    }

    const selectButton = (index: number, silent: boolean = false, moveFocus: boolean = false): void => {
      StartScreen.selectedButtonIndex = Math.max(0, Math.min(buttons.length - 1, index))
      StartScreen.updateButtonSelection(buttons, audioManager, silent)
      if (moveFocus) buttons[StartScreen.selectedButtonIndex].focus({ preventScroll: true })
    }

    buttons.forEach((button, index) => {
      button.addEventListener('mouseenter', () => selectButton(index))
      button.addEventListener('focus', () => {
        if (StartScreen.selectedButtonIndex !== index) selectButton(index)
      })
      button.addEventListener('click', () => {
        selectButton(index, true)
        runAction(index)
      })
    })

    StartScreen.keyboardListener = (event: KeyboardEvent) => {
      const key = event.code.toLowerCase()

      if (key === 'arrowup' || key === 'keyw') {
        event.preventDefault()
        selectButton(StartScreen.selectedButtonIndex - 1, false, true)
      } else if (key === 'arrowdown' || key === 'keys') {
        event.preventDefault()
        selectButton(StartScreen.selectedButtonIndex + 1, false, true)
      } else if (key === 'space' || key === 'enter') {
        event.preventDefault()
        runAction(StartScreen.selectedButtonIndex)
      }
    }
    document.addEventListener('keydown', StartScreen.keyboardListener)

    const gamepadStatus = startScreen.querySelector<HTMLSpanElement>('#gamepadStatus')
    const getConnectedGamepad = (): Gamepad | null => (
      Array.from(navigator.getGamepads()).find(
        (candidate): candidate is Gamepad => candidate !== null
      ) ?? null
    )
    let gamepadWasConnected: boolean | null = null
    const updateGamepadStatus = (isConnected: boolean): void => {
      if (!gamepadStatus || gamepadWasConnected === isConnected) return

      gamepadWasConnected = isConnected
      gamepadStatus.textContent = isConnected ? 'ON' : 'OFF'
      gamepadStatus.classList.toggle('is-active', isConnected)
    }

    updateGamepadStatus(Boolean(getConnectedGamepad()))

    StartScreen.gamepadInterval = window.setInterval(() => {
      const gamepad = getConnectedGamepad()
      updateGamepadStatus(Boolean(gamepad))
      if (!gamepad) return

      const now = Date.now()
      if (now - StartScreen.lastGamepadInput < StartScreen.inputCooldown) return

      const dpadUp = gamepad.buttons[12]?.pressed
      const dpadDown = gamepad.buttons[13]?.pressed
      const leftStickY = gamepad.axes[1] || 0

      if (dpadUp || leftStickY < -StartScreen.gamepadDeadzone) {
        selectButton(StartScreen.selectedButtonIndex - 1, false, true)
        StartScreen.lastGamepadInput = now
      } else if (dpadDown || leftStickY > StartScreen.gamepadDeadzone) {
        selectButton(StartScreen.selectedButtonIndex + 1, false, true)
        StartScreen.lastGamepadInput = now
      } else if (gamepad.buttons[0]?.pressed) {
        runAction(StartScreen.selectedButtonIndex)
        StartScreen.lastGamepadInput = now
      }
    }, 50)

    StartScreen.updateButtonSelection(buttons, audioManager, true)

    StartScreen.resumeAudioListener = () => {
      audioManager?.resumeAudio().catch(error => console.warn('Audio resume failed:', error))
    }
    startScreen.addEventListener('click', StartScreen.resumeAudioListener, { once: true })
    startScreen.addEventListener('keydown', StartScreen.resumeAudioListener, { once: true })
    window.addEventListener('gamepadbuttondown', StartScreen.resumeAudioListener, { once: true })

    return startScreen
  }

  private static updateButtonSelection(
    buttons: HTMLButtonElement[],
    audioManager: AudioManager | null,
    silent: boolean = false
  ): void {
    buttons.forEach((button, index) => {
      const selected = index === StartScreen.selectedButtonIndex
      button.classList.toggle('selected', selected)
      button.tabIndex = selected ? 0 : -1
      if (selected && !silent) audioManager?.playButtonHoverSound()
    })
  }

  private static createEnemyCard(
    name: string,
    type: string,
    color: string,
    points: number,
    isBoss: boolean = false
  ): string {
    const sizeClass = isBoss ? 'boss-card' : ''

    // AttractMode pins the live 3D enemy directly behind this transparent
    // exhibit window. Keep this structure stable when styling the screen.
    return `
      <div class="enemy-card ${sizeClass}" style="--enemy-color: ${color}">
        <div class="enemy-visual" data-exhibit="${type}" aria-hidden="true"></div>
        <div class="enemy-name">${name}</div>
        <div class="enemy-points">${points.toLocaleString()}</div>
      </div>
    `
  }

  static stopStarfield(): void {
    StarfieldManager.getInstance().stop()
  }

  static cleanup(): void {
    document.getElementById('start-screen-styles')?.remove()

    if (StartScreen.keyboardListener) {
      document.removeEventListener('keydown', StartScreen.keyboardListener)
      StartScreen.keyboardListener = null
    }

    if (StartScreen.gamepadInterval !== null) {
      clearInterval(StartScreen.gamepadInterval)
      StartScreen.gamepadInterval = null
    }

    if (StartScreen.resumeAudioListener) {
      window.removeEventListener('gamepadbuttondown', StartScreen.resumeAudioListener)
      StartScreen.resumeAudioListener = null
    }

    StartScreen.selectedButtonIndex = 0
    StartScreen.lastGamepadInput = 0
  }
}
