import { AudioManager } from '../../audio/AudioManager'

/**
 * 🛑 PAUSE SCREEN - Pause Menu with Continue/End Game options
 */
export class PauseScreen {
  private static selectedButtonIndex: number = 0
  private static gamepadInterval: number | null = null
  private static lastGamepadInput: number = 0
  private static inputCooldown: number = 200 // ms
  private static gamepadDeadzone: number = 0.5
  private static keyboardListener: ((e: KeyboardEvent) => void) | null = null

  static create(
    audioManager: AudioManager | null,
    onContinue: () => void,
    onEndGame: () => void
  ): HTMLElement {
    const pauseScreen = document.createElement('div')
    pauseScreen.id = 'pauseScreen'
    pauseScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: white;
      font-family: var(--font-family, 'Press Start 2P', monospace);
      text-transform: uppercase;
    `

    // Add HTML structure with effects
    pauseScreen.innerHTML = `
      <!-- DARK OVERLAY -->
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.75);
        z-index: 0;
        backdrop-filter: blur(8px);
      "></div>

      <!-- DIMMED HOLOGRAPHIC GRID -->
      <div class="holo-grid" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        perspective: 500px;
        overflow: hidden;
        opacity: 0.3;
      ">
        <div class="grid-plane" style="
          position: absolute;
          bottom: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(0, 255, 255, 0.15) 49px, rgba(0, 255, 255, 0.15) 50px),
            repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(0, 255, 255, 0.15) 49px, rgba(0, 255, 255, 0.15) 50px);
          transform: rotateX(60deg);
          animation: gridScroll 20s linear infinite;
        "></div>
      </div>

      <!-- SCANLINES -->
      <div class="scanlines" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9998;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.15) 0px,
          rgba(0, 0, 0, 0.15) 1px,
          transparent 1px,
          transparent 2px
        );
        animation: scanlineScroll 10s linear infinite;
      "></div>

      <!-- ARCADE CABINET CORNER BRACKETS -->
      <div class="arcade-corners" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9996;
      ">
        <div style="position: absolute; top: 10px; left: 10px; width: 40px; height: 40px; border-top: 4px solid #00FFFF; border-left: 4px solid #00FFFF; box-shadow: 0 0 10px #00FFFF; animation: pausePulse 2s ease-in-out infinite;"></div>
        <div style="position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; border-top: 4px solid #00FFFF; border-right: 4px solid #00FFFF; box-shadow: 0 0 10px #00FFFF; animation: pausePulse 2s ease-in-out infinite 0.5s;"></div>
        <div style="position: absolute; bottom: 10px; left: 10px; width: 40px; height: 40px; border-bottom: 4px solid #00FFFF; border-left: 4px solid #00FFFF; box-shadow: 0 0 10px #00FFFF; animation: pausePulse 2s ease-in-out infinite 0.5s;"></div>
        <div style="position: absolute; bottom: 10px; right: 10px; width: 40px; height: 40px; border-bottom: 4px solid #00FFFF; border-right: 4px solid #00FFFF; box-shadow: 0 0 10px #00FFFF; animation: pausePulse 2s ease-in-out infinite;"></div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="pause-content" style="position: relative; z-index: 2; text-align: center;">
        <!-- PAUSED TITLE -->
        <h1 id="pauseTitle" style="
          font-size: clamp(2rem, 5vw, 3.5rem);
          color: #00FFFF;
          text-shadow:
            0 0 10px #00FFFF,
            0 0 20px #00FFFF,
            0 0 40px #00FFFF,
            0 0 80px #00FFFF,
            4px 4px 0 #006666;
          margin-bottom: clamp(2rem, 5vw, 3rem);
          letter-spacing: 0.2em;
          animation: pauseTitlePulse 2s ease-in-out infinite;
          font-weight: bold;
        ">
          PAUSED
        </h1>

        <!-- BUTTON CONTAINER -->
        <div id="buttonContainer" style="
          display: flex;
          flex-direction: column;
          gap: var(--space-lg, 1.5rem);
          align-items: center;
        ">
          <!-- Buttons will be added here -->
        </div>

        <!-- INSTRUCTIONS -->
        <div class="pause-instructions" style="
          margin-top: clamp(2rem, 5vw, 3rem);
          font-size: clamp(0.5rem, 1.2vw, 0.7rem);
          color: #FFFF00;
          text-shadow: 0 0 10px #FFFF00;
          letter-spacing: 0.15em;
          opacity: 0.8;
        ">
          ARROWS / WASD TO MOVE<br>ENTER TO SELECT / ESC TO CONTINUE
        </div>
      </div>
    `

    // Add CSS animations
    const style = document.createElement('style')
    style.id = 'pause-screen-styles'
    style.textContent = `
      @keyframes gridScroll {
        0% { transform: rotateX(60deg) translateY(0); }
        100% { transform: rotateX(60deg) translateY(50px); }
      }

      @keyframes scanlineScroll {
        0% { transform: translateY(0); }
        100% { transform: translateY(4px); }
      }

      @keyframes pausePulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @keyframes pauseTitlePulse {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.3) drop-shadow(0 0 30px #00FFFF); }
      }
    `
    document.head.appendChild(style)

    // Get the button container from the innerHTML
    const buttonContainer = pauseScreen.querySelector('#buttonContainer') as HTMLElement

    // Continue button
    const continueButton = document.createElement('button')
    continueButton.textContent = 'CONTINUE'
    continueButton.id = 'continueButton'
    continueButton.style.cssText = this.getButtonStyle()
    continueButton.addEventListener('mouseenter', () => {
      PauseScreen.selectedButtonIndex = 0
      PauseScreen.updateButtonSelection([continueButton, endGameButton], audioManager)
    })
    continueButton.addEventListener('click', () => {
      if (audioManager) audioManager.playButtonPressSound()
      onContinue()
    })
    buttonContainer.appendChild(continueButton)

    // End Game button
    const endGameButton = document.createElement('button')
    endGameButton.textContent = 'END SESSION'
    endGameButton.id = 'endGameButton'
    endGameButton.style.cssText = this.getButtonStyle()
    endGameButton.addEventListener('mouseenter', () => {
      PauseScreen.selectedButtonIndex = 1
      PauseScreen.updateButtonSelection([continueButton, endGameButton], audioManager)
    })
    endGameButton.addEventListener('click', () => {
      if (audioManager) audioManager.playButtonPressSound()
      onEndGame()
    })
    buttonContainer.appendChild(endGameButton)

    const buttons = [continueButton, endGameButton]
    PauseScreen.selectedButtonIndex = 0

    // 🎮 KEYBOARD NAVIGATION
    PauseScreen.keyboardListener = (e: KeyboardEvent) => {
      const key = e.code.toLowerCase()
      
      // Navigate up/down
      if (key === 'arrowup' || key === 'keyw') {
        e.preventDefault()
        PauseScreen.selectedButtonIndex = Math.max(0, PauseScreen.selectedButtonIndex - 1)
        PauseScreen.updateButtonSelection(buttons, audioManager)
      } else if (key === 'arrowdown' || key === 'keys') {
        e.preventDefault()
        PauseScreen.selectedButtonIndex = Math.min(buttons.length - 1, PauseScreen.selectedButtonIndex + 1)
        PauseScreen.updateButtonSelection(buttons, audioManager)
      } 
      // Select button
      else if (key === 'space' || key === 'enter') {
        e.preventDefault()
        if (audioManager) audioManager.playButtonPressSound()
        
        if (PauseScreen.selectedButtonIndex === 0) {
          onContinue()
        } else if (PauseScreen.selectedButtonIndex === 1) {
          onEndGame()
        }
      }
      // ESC to continue
      else if (key === 'escape') {
        e.preventDefault()
        if (audioManager) audioManager.playButtonPressSound()
        onContinue()
      }
    }
    
    document.addEventListener('keydown', PauseScreen.keyboardListener)

    // 🎮 GAMEPAD NAVIGATION
    PauseScreen.gamepadInterval = window.setInterval(() => {
      const gamepads = navigator.getGamepads()
      const gamepad = gamepads[0]
      
      if (!gamepad) return
      
      const now = Date.now()
      if (now - PauseScreen.lastGamepadInput < PauseScreen.inputCooldown) return
      
      // D-pad or left stick navigation
      const dpadUp = gamepad.buttons[12]?.pressed
      const dpadDown = gamepad.buttons[13]?.pressed
      const leftStickY = gamepad.axes[1] || 0
      
      if (dpadUp || leftStickY < -PauseScreen.gamepadDeadzone) {
        PauseScreen.selectedButtonIndex = Math.max(0, PauseScreen.selectedButtonIndex - 1)
        PauseScreen.updateButtonSelection(buttons, audioManager)
        PauseScreen.lastGamepadInput = now
      } else if (dpadDown || leftStickY > PauseScreen.gamepadDeadzone) {
        PauseScreen.selectedButtonIndex = Math.min(buttons.length - 1, PauseScreen.selectedButtonIndex + 1)
        PauseScreen.updateButtonSelection(buttons, audioManager)
        PauseScreen.lastGamepadInput = now
      }
      
      // A button (Xbox) / X button (PlayStation) to select
      const aButton = gamepad.buttons[0]?.pressed
      const bButton = gamepad.buttons[1]?.pressed // B/Circle to go back (continue)
      
      if (aButton) {
        if (now - PauseScreen.lastGamepadInput < PauseScreen.inputCooldown) return
        
        if (audioManager) audioManager.playButtonPressSound()
        
        if (PauseScreen.selectedButtonIndex === 0) {
          onContinue()
        } else if (PauseScreen.selectedButtonIndex === 1) {
          onEndGame()
        }
        
        PauseScreen.lastGamepadInput = now
      } else if (bButton) {
        if (now - PauseScreen.lastGamepadInput < PauseScreen.inputCooldown) return
        
        if (audioManager) audioManager.playButtonPressSound()
        onContinue()
        
        PauseScreen.lastGamepadInput = now
      }
    }, 50)

    // Initialize button selection
    PauseScreen.updateButtonSelection(buttons, audioManager, true)

    // 🎵 RESUME AUDIO CONTEXT ON FIRST INTERACTION 🎵
    const resumeAudioOnce = () => {
      if (audioManager) {
        audioManager.resumeAudio().catch(e => console.warn('Audio resume failed:', e))
      }
    }
    
    pauseScreen.addEventListener('click', resumeAudioOnce, { once: true })
    pauseScreen.addEventListener('keydown', resumeAudioOnce, { once: true })
    window.addEventListener('gamepadbuttondown', resumeAudioOnce, { once: true })

    return pauseScreen
  }

  private static getButtonStyle(): string {
    return `
      padding: clamp(0.8rem, 2vw, 1.2rem) clamp(2rem, 5vw, 3rem);
      font-size: clamp(0.9rem, 2vw, 1.3rem);
      font-family: var(--font-family, 'Press Start 2P', monospace);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      background: rgba(0, 0, 0, 0.85);
      color: #00FFFF;
      border: 4px solid #00FFFF;
      box-shadow:
        0 0 20px rgba(0, 255, 255, 0.4),
        4px 4px 0 #006666;
      text-shadow: 0 0 10px #00FFFF;
      cursor: pointer;
      transition: all 0.1s step-end;
      min-width: clamp(250px, 50vw, 350px);
      text-align: center;
      font-weight: bold;
    `
  }

  private static updateButtonSelection(
    buttons: HTMLButtonElement[],
    audioManager: AudioManager | null,
    silent: boolean = false
  ): void {
    buttons.forEach((button, index) => {
      if (index === PauseScreen.selectedButtonIndex) {
        button.classList.add('selected')
        button.style.background = 'rgba(0, 255, 255, 0.2)'
        button.style.boxShadow = '0 0 35px rgba(0, 255, 255, 0.8), 4px 4px 0 #00FFFF'
        button.style.color = '#FFFFFF'
        button.style.textShadow = '0 0 15px #00FFFF'
        button.style.transform = 'translate(-2px, -2px) scale(1.05)'
        button.style.filter = 'brightness(1.3)'

        if (!silent && audioManager) {
          audioManager.playButtonHoverSound()
        }
      } else {
        button.classList.remove('selected')
        button.style.background = 'rgba(0, 0, 0, 0.85)'
        button.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4), 4px 4px 0 #006666'
        button.style.color = '#00FFFF'
        button.style.textShadow = '0 0 10px #00FFFF'
        button.style.transform = 'translate(0, 0) scale(1)'
        button.style.filter = 'brightness(1)'
      }
    })
  }

  static cleanup(): void {
    // Remove styles
    const styleEl = document.getElementById('pause-screen-styles')
    if (styleEl) {
      styleEl.remove()
    }

    // Remove keyboard listener
    if (PauseScreen.keyboardListener) {
      document.removeEventListener('keydown', PauseScreen.keyboardListener)
      PauseScreen.keyboardListener = null
    }

    // Clear gamepad interval
    if (PauseScreen.gamepadInterval !== null) {
      clearInterval(PauseScreen.gamepadInterval)
      PauseScreen.gamepadInterval = null
    }

    // Remove the pause screen from DOM
    const pauseScreen = document.getElementById('pauseScreen')
    if (pauseScreen && pauseScreen.parentNode) {
      pauseScreen.parentNode.removeChild(pauseScreen)
    }
  }
}
