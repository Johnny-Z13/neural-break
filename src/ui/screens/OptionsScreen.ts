import { AudioManager } from '../../audio/AudioManager'
import { StarfieldManager } from '../../graphics/StarfieldManager'
import { PostProcessSettings } from '../../config/PostProcessSettings'

/**
 * NEURAL BREAK - Options Screen
 * 80s Arcade / Cyberpunk Aesthetic
 * Uses unified design system CSS variables
 * 
 * 🎮 Supports keyboard and gamepad navigation!
 */

// Settings storage key
const SETTINGS_KEY = 'neural-break-settings'

export interface GameSettings {
  fullscreen: boolean
  postProcessRendering: boolean
  postProcessDebug: boolean
}

// Default settings
const DEFAULT_SETTINGS: GameSettings = {
  fullscreen: true, // ON by default
  postProcessRendering: true, // ON by default - use post-processing
  postProcessDebug: false // OFF by default - debug controls
}

export class OptionsScreen {
  private static selectedOptionIndex = 0
  private static keyboardListener: ((e: KeyboardEvent) => void) | null = null
  private static gamepadInterval: number | null = null
  private static lastGamepadInput = 0
  private static gamepadDeadzone = 0.5
  private static inputCooldown = 200 // ms between inputs

  /**
   * Load settings from localStorage
   */
  static loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('⚠️ Could not load settings:', e)
    }
    return { ...DEFAULT_SETTINGS }
  }

  /**
   * Save settings to localStorage
   */
  static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      console.log('💾 Settings saved:', settings)
    } catch (e) {
      console.warn('⚠️ Could not save settings:', e)
    }
  }

  /**
   * Apply fullscreen setting
   * @param requestAPI - Whether to call Fullscreen API (only works with user gesture)
   */
  static async applyFullscreenSetting(fullscreen: boolean, requestAPI: boolean = true): Promise<void> {
    const gameContainer = document.getElementById('gameContainer')
    const gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null
    const body = document.body
    const html = document.documentElement

    if (fullscreen) {
      // TRUE FULLSCREEN using Fullscreen API (only if requestAPI is true)
      if (requestAPI) {
        try {
          if (!document.fullscreenElement) {
            // Request fullscreen on the document element
            await document.documentElement.requestFullscreen()
          }
        } catch (err) {
          console.warn('⚠️ Fullscreen request failed:', err)
          // Fallback to styled fullscreen if browser doesn't support it
        }
      }

      // Style for fullscreen mode
      html.style.cssText = `
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden !important;
      `
      body.style.cssText = `
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden !important;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000011;
      `

      if (gameContainer) {
        gameContainer.style.cssText = `
          width: 100%;
          height: 100%;
          position: fixed;
          top: 0;
          left: 0;
          overflow: hidden;
          border: none;
          box-shadow: none;
          border-radius: 0;
        `
      }

      if (gameCanvas) {
        gameCanvas.style.cssText = `
          display: block;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        `
      }
    } else {
      // Exit true fullscreen
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen()
        }
      } catch (err) {
        console.warn('⚠️ Exit fullscreen failed:', err)
      }

      // Windowed mode - half screen size centered with border
      const windowedWidth = Math.floor(window.innerWidth * 0.5)
      const windowedHeight = Math.floor(window.innerHeight * 0.5)

      html.style.cssText = `
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden !important;
      `
      body.style.cssText = `
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden !important;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #000000;
      `

      if (gameContainer) {
        gameContainer.style.cssText = `
          width: ${windowedWidth}px;
          height: ${windowedHeight}px;
          position: relative;
          overflow: hidden;
          border: 4px solid #00FFFF;
          box-shadow: 0 0 40px rgba(0, 255, 255, 0.5), 0 0 80px rgba(0, 255, 255, 0.3);
          border-radius: 4px;
        `
      }

      if (gameCanvas) {
        gameCanvas.style.cssText = `
          display: block;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        `
      }
    }

    // Trigger resize event so Three.js renderer and other components update
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 50)
  }

  static create(
    audioManager: AudioManager | null,
    onBack: () => void
  ): HTMLElement {
    // Ensure starfield is running
    StarfieldManager.getInstance().start()

    // Load current settings
    const settings = OptionsScreen.loadSettings()

    const optionsScreen = document.createElement('div')
    optionsScreen.id = 'optionsScreen'
    optionsScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: var(--font-family, 'Press Start 2P', monospace);
      text-align: center;
      z-index: 1000;
      overflow: hidden;
      image-rendering: pixelated;
      padding: var(--space-md, 1rem);
      box-sizing: border-box;
    `

    optionsScreen.innerHTML = `
      <!-- HOLOGRAPHIC GRID BACKGROUND -->
      <div class="holo-grid" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        perspective: 500px;
        overflow: hidden;
      ">
        <div class="grid-plane" style="
          position: absolute;
          bottom: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(0, 255, 255, 0.08) 49px, rgba(0, 255, 255, 0.08) 50px),
            repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255, 0, 255, 0.08) 49px, rgba(255, 0, 255, 0.08) 50px);
          transform: rotateX(60deg);
          animation: gridScroll 20s linear infinite;
        "></div>
      </div>

      <!-- VHS TRACKING NOISE -->
      <div class="vhs-noise" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: linear-gradient(90deg,
          rgba(0,255,255,0.4) 0%,
          rgba(255,0,255,0.4) 50%,
          rgba(0,255,255,0.4) 100%);
        pointer-events: none;
        z-index: 9997;
        animation: vhsTrackingNoise 3s linear infinite;
        opacity: 0.6;
        filter: blur(1px);
      "></div>

      <!-- CRT MONITOR OVERLAY -->
      <div class="crt-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        background: radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.6) 100%);
        box-shadow: inset 0 0 200px rgba(0,0,0,0.9);
      "></div>

      <!-- SCANLINES OVERLAY -->
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
        <div style="position: absolute; top: 10px; left: 10px; width: 40px; height: 40px; border-top: 4px solid #00FFFF; border-left: 4px solid #00FFFF; box-shadow: 0 0 10px #00FFFF;"></div>
        <div style="position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; border-top: 4px solid #FF00FF; border-right: 4px solid #FF00FF; box-shadow: 0 0 10px #FF00FF;"></div>
        <div style="position: absolute; bottom: 10px; left: 10px; width: 40px; height: 40px; border-bottom: 4px solid #FF00FF; border-left: 4px solid #FF00FF; box-shadow: 0 0 10px #FF00FF;"></div>
        <div style="position: absolute; bottom: 10px; right: 10px; width: 40px; height: 40px; border-bottom: 4px solid #00FFFF; border-right: 4px solid #00FFFF; box-shadow: 0 0 10px #00FFFF;"></div>
      </div>
      
      <!-- MAIN CONTENT -->
      <div class="options-content" style="position: relative; z-index: 1; width: 95%; max-width: 700px;">
        
        <!-- TITLE WITH GLOW -->
        <h1 class="options-title" style="
          font-size: clamp(1.5rem, 4vw, 2.5rem);
          margin-bottom: var(--space-lg, 1.5rem);
          color: #00FFFF;
          text-shadow:
            0 0 10px #00FFFF,
            0 0 20px #00FFFF,
            0 0 40px #00FFFF,
            0 0 80px #00FFFF,
            4px 4px 0 #006666;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          animation: titleFlicker 0.1s infinite, titleGlow 3s ease-in-out infinite;
          font-weight: bold;
        ">
          OPTIONS
        </h1>

        <!-- Decorative lines -->
        <div class="options-divider" style="
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg,
            transparent 0%,
            #00FFFF 15%,
            #FF00FF 30%,
            #00FFFF 50%,
            #FF00FF 70%,
            #00FFFF 85%,
            transparent 100%);
          margin-bottom: var(--space-xs, 0.5rem);
          box-shadow: 0 0 10px #00FFFF, 0 0 20px #FF00FF;
        "></div>
        <div class="options-divider" style="
          width: 80%;
          height: 2px;
          margin: 0 auto var(--space-xl, 2rem);
          background: linear-gradient(90deg,
            transparent 0%,
            #FF00FF 50%,
            transparent 100%);
          box-shadow: 0 0 10px #FF00FF;
        "></div>
        
        <!-- OPTIONS CONTAINER -->
        <div class="options-container" style="
          background: linear-gradient(180deg, var(--color-bg-panel, rgba(0, 0, 0, 0.9)) 0%, rgba(0, 10, 20, 0.9) 100%);
          border: var(--border-thick, 4px) solid var(--color-cyan, #00FFFF);
          padding: var(--space-lg, 1.5rem) var(--space-xl, 2rem);
          box-shadow: 
            0 0 28px var(--color-cyan-glow, rgba(0, 255, 255, 0.35)),
            var(--shadow-pixel, 4px 4px 0) var(--color-cyan-dark, #006666),
            inset 0 0 25px rgba(0, 255, 255, 0.08);
        ">
          <!-- FULLSCREEN TOGGLE -->
          <div id="fullscreenOption" class="option-row" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-md, 1rem) var(--space-sm, 0.8rem);
            margin-bottom: var(--space-md, 1rem);
            border: 3px solid transparent;
            cursor: pointer;
            transition: all 0.1s step-end;
          ">
            <span style="
              color: #FFFF00;
              font-size: clamp(0.7rem, 1.8vw, 1rem);
              text-shadow: 0 0 10px #FFFF00, 2px 2px 0 #886600;
              letter-spacing: 0.1em;
            ">FULL SCREEN</span>
            <div id="fullscreenToggle" class="toggle-switch" style="
              display: flex;
              gap: var(--space-sm, 0.8rem);
            ">
              <span id="fullscreenOff" class="toggle-option ${!settings.fullscreen ? 'active' : ''}" style="
                padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
                border: 2px solid ${!settings.fullscreen ? '#FF0000' : '#444444'};
                color: ${!settings.fullscreen ? '#FF0000' : '#666666'};
                font-size: clamp(0.6rem, 1.4vw, 0.8rem);
                text-shadow: ${!settings.fullscreen ? '0 0 10px #FF0000' : 'none'};
                background: ${!settings.fullscreen ? 'rgba(255, 0, 0, 0.2)' : 'transparent'};
                box-shadow: ${!settings.fullscreen ? '0 0 15px rgba(255, 0, 0, 0.4)' : 'none'};
              ">OFF</span>
              <span id="fullscreenOn" class="toggle-option ${settings.fullscreen ? 'active' : ''}" style="
                padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
                border: 2px solid ${settings.fullscreen ? '#00FF00' : '#444444'};
                color: ${settings.fullscreen ? '#00FF00' : '#666666'};
                font-size: clamp(0.6rem, 1.4vw, 0.8rem);
                text-shadow: ${settings.fullscreen ? '0 0 10px #00FF00' : 'none'};
                background: ${settings.fullscreen ? 'rgba(0, 255, 0, 0.2)' : 'transparent'};
                box-shadow: ${settings.fullscreen ? '0 0 15px rgba(0, 255, 0, 0.4)' : 'none'};
              ">ON</span>
            </div>
          </div>

          <!-- HINT TEXT -->
          <div style="
            color: #888888;
            font-size: clamp(0.45rem, 1vw, 0.6rem);
            text-align: center;
            margin-bottom: var(--space-lg, 1.5rem);
            letter-spacing: 0.1em;
          ">
            OFF = WINDOWED MODE (HALF SCREEN SIZE)
          </div>

          <!-- POST PROCESSING RENDERING TOGGLE -->
          <div id="postProcessRenderingOption" class="option-row" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-md, 1rem) var(--space-sm, 0.8rem);
            margin-bottom: var(--space-md, 1rem);
            border: 3px solid transparent;
            cursor: pointer;
            transition: all 0.1s step-end;
          ">
            <span style="
              color: #FF00FF;
              font-size: clamp(0.6rem, 1.6vw, 0.9rem);
              text-shadow: 0 0 10px #FF00FF, 2px 2px 0 #660066;
              letter-spacing: 0.08em;
            ">POST PROCESSING RENDERING</span>
            <div id="postProcessRenderingToggle" class="toggle-switch" style="
              display: flex;
              gap: var(--space-sm, 0.8rem);
            ">
              <span id="postProcessRenderingOff" class="toggle-option ${!settings.postProcessRendering ? 'active' : ''}" style="
                padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
                border: 2px solid ${!settings.postProcessRendering ? '#FF0000' : '#444444'};
                color: ${!settings.postProcessRendering ? '#FF0000' : '#666666'};
                font-size: clamp(0.6rem, 1.4vw, 0.8rem);
                text-shadow: ${!settings.postProcessRendering ? '0 0 10px #FF0000' : 'none'};
                background: ${!settings.postProcessRendering ? 'rgba(255, 0, 0, 0.2)' : 'transparent'};
                box-shadow: ${!settings.postProcessRendering ? '0 0 15px rgba(255, 0, 0, 0.4)' : 'none'};
              ">OFF</span>
              <span id="postProcessRenderingOn" class="toggle-option ${settings.postProcessRendering ? 'active' : ''}" style="
                padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
                border: 2px solid ${settings.postProcessRendering ? '#00FF00' : '#444444'};
                color: ${settings.postProcessRendering ? '#00FF00' : '#666666'};
                font-size: clamp(0.6rem, 1.4vw, 0.8rem);
                text-shadow: ${settings.postProcessRendering ? '0 0 10px #00FF00' : 'none'};
                background: ${settings.postProcessRendering ? 'rgba(0, 255, 0, 0.2)' : 'transparent'};
                box-shadow: ${settings.postProcessRendering ? '0 0 15px rgba(0, 255, 0, 0.4)' : 'none'};
              ">ON</span>
            </div>
          </div>

          <!-- POST PROCESSING RENDERING HINT -->
          <div style="
            color: #888888;
            font-size: clamp(0.45rem, 1vw, 0.6rem);
            text-align: center;
            margin-bottom: var(--space-lg, 1.5rem);
            letter-spacing: 0.1em;
          ">
            ENABLE VISUAL EFFECTS (BLOOM, VIGNETTE, ETC.)
          </div>

          <!-- POST PROCESS DEBUG TOGGLE -->
          <div id="postProcessDebugOption" class="option-row" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-md, 1rem) var(--space-sm, 0.8rem);
            margin-bottom: var(--space-md, 1rem);
            border: 3px solid transparent;
            cursor: pointer;
            transition: all 0.1s step-end;
          ">
            <span style="
              color: #00FFFF;
              font-size: clamp(0.6rem, 1.6vw, 0.9rem);
              text-shadow: 0 0 10px #00FFFF, 2px 2px 0 #006666;
              letter-spacing: 0.08em;
            ">POST PROCESS CONTROLS</span>
            <div id="postProcessDebugToggle" class="toggle-switch" style="
              display: flex;
              gap: var(--space-sm, 0.8rem);
            ">
              <span id="postProcessDebugOff" class="toggle-option ${!settings.postProcessDebug ? 'active' : ''}" style="
                padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
                border: 2px solid ${!settings.postProcessDebug ? '#FF0000' : '#444444'};
                color: ${!settings.postProcessDebug ? '#FF0000' : '#666666'};
                font-size: clamp(0.6rem, 1.4vw, 0.8rem);
                text-shadow: ${!settings.postProcessDebug ? '0 0 10px #FF0000' : 'none'};
                background: ${!settings.postProcessDebug ? 'rgba(255, 0, 0, 0.2)' : 'transparent'};
                box-shadow: ${!settings.postProcessDebug ? '0 0 15px rgba(255, 0, 0, 0.4)' : 'none'};
              ">OFF</span>
              <span id="postProcessDebugOn" class="toggle-option ${settings.postProcessDebug ? 'active' : ''}" style="
                padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
                border: 2px solid ${settings.postProcessDebug ? '#00FF00' : '#444444'};
                color: ${settings.postProcessDebug ? '#00FF00' : '#666666'};
                font-size: clamp(0.6rem, 1.4vw, 0.8rem);
                text-shadow: ${settings.postProcessDebug ? '0 0 10px #00FF00' : 'none'};
                background: ${settings.postProcessDebug ? 'rgba(0, 255, 0, 0.2)' : 'transparent'};
                box-shadow: ${settings.postProcessDebug ? '0 0 15px rgba(0, 255, 0, 0.4)' : 'none'};
              ">ON</span>
            </div>
          </div>

          <!-- POST PROCESS HINT TEXT -->
          <div style="
            color: #888888;
            font-size: clamp(0.45rem, 1vw, 0.6rem);
            text-align: center;
            margin-top: var(--space-md, 1rem);
            letter-spacing: 0.1em;
          ">
            SHOW DEBUG PANEL WITH SLIDERS AND FPS COUNTER
          </div>
        </div>
        
        <!-- BACK BUTTON -->
        <button id="backButton" class="arcade-button" style="
          margin-top: var(--space-xl, 2rem);
          background: var(--color-bg-panel, rgba(0, 0, 0, 0.85));
          border: var(--border-thick, 4px) solid var(--color-red, #FF4444);
          color: var(--color-red, #FF4444);
          font-family: inherit;
          font-size: clamp(0.8rem, 2vw, 1rem);
          font-weight: bold;
          padding: var(--space-sm, 0.8rem) var(--space-lg, 2rem);
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-shadow: 0 0 10px var(--color-red, #FF4444);
          box-shadow: 
            0 0 20px var(--color-red-glow, rgba(255, 68, 68, 0.4)),
            var(--shadow-pixel, 4px 4px 0) var(--color-red-dark, #662222);
          transition: all 0.1s step-end;
        ">
          BACK TO MENU
        </button>
      </div>
      
      <!-- CONTROLS HINT -->
      <div class="screen-controls-hint" style="
        position: fixed;
        bottom: var(--space-md, 1rem);
        left: 50%;
        transform: translateX(-50%);
        color: var(--color-yellow, #FFFF00);
        font-size: clamp(0.5rem, 1.2vw, 0.7rem);
        text-shadow: 0 0 10px var(--color-yellow, #FFFF00);
        letter-spacing: 0.15em;
        z-index: 1;
        text-align: center;
      ">
        <div style="margin-bottom: 0.3rem;">SPACE / ENTER TO TOGGLE &nbsp;&nbsp; ESC TO RETURN</div>
        <div style="font-size: 0.6em; color: var(--color-cyan, #00FFFF); text-shadow: 0 0 8px var(--color-cyan, #00FFFF);">
          ARROW KEYS OR WASD TO NAVIGATE
        </div>
      </div>
    `

    // Add styles
    const style = document.createElement('style')
    style.id = 'options-styles'
    style.textContent = `
      /* VHS CYBERPUNK ARCADE ANIMATIONS */
      @keyframes gridScroll {
        0% { transform: rotateX(60deg) translateY(0); }
        100% { transform: rotateX(60deg) translateY(50px); }
      }

      @keyframes vhsTrackingNoise {
        0% { transform: translateY(0); opacity: 0.6; }
        50% { transform: translateY(100vh); opacity: 0.6; }
        100% { transform: translateY(200vh); opacity: 0.6; }
      }

      @keyframes scanlineScroll {
        0% { transform: translateY(0); }
        100% { transform: translateY(4px); }
      }

      @keyframes titleGlow {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.2) drop-shadow(0 0 20px #00FFFF); }
      }

      @keyframes titleFlicker {
        0%, 90%, 100% { opacity: 1; }
        95% { opacity: 0.85; }
      }
      
      .option-row.selected {
        border-color: #00FFFF !important;
        background: rgba(0, 255, 255, 0.1);
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 15px rgba(0, 255, 255, 0.1);
      }
      
      .option-row:hover {
        border-color: #00FFFF;
        background: rgba(0, 255, 255, 0.05);
      }
      
      #backButton:hover,
      #backButton.selected {
        background: #330000 !important;
        box-shadow: 
          0 0 30px rgba(255, 68, 68, 0.6),
          4px 4px 0 var(--color-red, #FF4444) !important;
        transform: translate(-2px, -2px);
      }
      
      #backButton:active {
        transform: translate(2px, 2px);
        box-shadow: 
          0 0 15px rgba(255, 68, 68, 0.4),
          0 0 0 var(--color-red-dark, #662222) !important;
      }
    `
    document.head.appendChild(style)

    // Get element references
    const backButton = optionsScreen.querySelector('#backButton') as HTMLButtonElement
    const fullscreenOption = optionsScreen.querySelector('#fullscreenOption') as HTMLElement
    const fullscreenOn = optionsScreen.querySelector('#fullscreenOn') as HTMLElement
    const fullscreenOff = optionsScreen.querySelector('#fullscreenOff') as HTMLElement
    const postProcessRenderingOption = optionsScreen.querySelector('#postProcessRenderingOption') as HTMLElement
    const postProcessRenderingOn = optionsScreen.querySelector('#postProcessRenderingOn') as HTMLElement
    const postProcessRenderingOff = optionsScreen.querySelector('#postProcessRenderingOff') as HTMLElement
    const postProcessDebugOption = optionsScreen.querySelector('#postProcessDebugOption') as HTMLElement
    const postProcessDebugOn = optionsScreen.querySelector('#postProcessDebugOn') as HTMLElement
    const postProcessDebugOff = optionsScreen.querySelector('#postProcessDebugOff') as HTMLElement

    // Current settings state
    let currentSettings = { ...settings }

    // Toggle fullscreen function
    const toggleFullscreen = () => {
      currentSettings.fullscreen = !currentSettings.fullscreen
      OptionsScreen.saveSettings(currentSettings)
      OptionsScreen.applyFullscreenSetting(currentSettings.fullscreen)
      updateToggleVisuals()
      if (audioManager) audioManager.playButtonPressSound()
    }

    // Toggle post-process rendering function
    const togglePostProcessRendering = () => {
      currentSettings.postProcessRendering = !currentSettings.postProcessRendering
      OptionsScreen.saveSettings(currentSettings)
      // This will be applied when game starts - no need to apply now
      updateToggleVisuals()
      if (audioManager) audioManager.playButtonPressSound()
    }

    // Toggle post-process debug function
    const togglePostProcessDebug = () => {
      currentSettings.postProcessDebug = !currentSettings.postProcessDebug
      OptionsScreen.saveSettings(currentSettings)
      PostProcessSettings.setDebugControlsEnabled(currentSettings.postProcessDebug)
      updateToggleVisuals()
      if (audioManager) audioManager.playButtonPressSound()
    }

    // Update toggle visuals
    const updateToggleVisuals = () => {
      fullscreenOn.classList.toggle('active', currentSettings.fullscreen)
      fullscreenOff.classList.toggle('active', !currentSettings.fullscreen)
      postProcessRenderingOn.classList.toggle('active', currentSettings.postProcessRendering)
      postProcessRenderingOff.classList.toggle('active', !currentSettings.postProcessRendering)
      postProcessDebugOn.classList.toggle('active', currentSettings.postProcessDebug)
      postProcessDebugOff.classList.toggle('active', !currentSettings.postProcessDebug)

      fullscreenOption.setAttribute('aria-pressed', String(currentSettings.fullscreen))
      postProcessRenderingOption.setAttribute('aria-pressed', String(currentSettings.postProcessRendering))
      postProcessDebugOption.setAttribute('aria-pressed', String(currentSettings.postProcessDebug))

      // Fullscreen toggle
      if (currentSettings.fullscreen) {
        fullscreenOn.style.border = '2px solid #00FF00'
        fullscreenOn.style.color = '#00FF00'
        fullscreenOn.style.textShadow = '0 0 10px #00FF00'
        fullscreenOn.style.background = 'rgba(0, 255, 0, 0.2)'
        fullscreenOn.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.4)'

        fullscreenOff.style.border = '2px solid #444444'
        fullscreenOff.style.color = '#666666'
        fullscreenOff.style.textShadow = 'none'
        fullscreenOff.style.background = 'transparent'
        fullscreenOff.style.boxShadow = 'none'
      } else {
        fullscreenOff.style.border = '2px solid #FF0000'
        fullscreenOff.style.color = '#FF0000'
        fullscreenOff.style.textShadow = '0 0 10px #FF0000'
        fullscreenOff.style.background = 'rgba(255, 0, 0, 0.2)'
        fullscreenOff.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.4)'

        fullscreenOn.style.border = '2px solid #444444'
        fullscreenOn.style.color = '#666666'
        fullscreenOn.style.textShadow = 'none'
        fullscreenOn.style.background = 'transparent'
        fullscreenOn.style.boxShadow = 'none'
      }

      // Post-process rendering toggle
      if (currentSettings.postProcessRendering) {
        postProcessRenderingOn.style.border = '2px solid #00FF00'
        postProcessRenderingOn.style.color = '#00FF00'
        postProcessRenderingOn.style.textShadow = '0 0 10px #00FF00'
        postProcessRenderingOn.style.background = 'rgba(0, 255, 0, 0.2)'
        postProcessRenderingOn.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.4)'

        postProcessRenderingOff.style.border = '2px solid #444444'
        postProcessRenderingOff.style.color = '#666666'
        postProcessRenderingOff.style.textShadow = 'none'
        postProcessRenderingOff.style.background = 'transparent'
        postProcessRenderingOff.style.boxShadow = 'none'
      } else {
        postProcessRenderingOff.style.border = '2px solid #FF0000'
        postProcessRenderingOff.style.color = '#FF0000'
        postProcessRenderingOff.style.textShadow = '0 0 10px #FF0000'
        postProcessRenderingOff.style.background = 'rgba(255, 0, 0, 0.2)'
        postProcessRenderingOff.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.4)'

        postProcessRenderingOn.style.border = '2px solid #444444'
        postProcessRenderingOn.style.color = '#666666'
        postProcessRenderingOn.style.textShadow = 'none'
        postProcessRenderingOn.style.background = 'transparent'
        postProcessRenderingOn.style.boxShadow = 'none'
      }

      // Post-process debug toggle
      if (currentSettings.postProcessDebug) {
        postProcessDebugOn.style.border = '2px solid #00FF00'
        postProcessDebugOn.style.color = '#00FF00'
        postProcessDebugOn.style.textShadow = '0 0 10px #00FF00'
        postProcessDebugOn.style.background = 'rgba(0, 255, 0, 0.2)'
        postProcessDebugOn.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.4)'

        postProcessDebugOff.style.border = '2px solid #444444'
        postProcessDebugOff.style.color = '#666666'
        postProcessDebugOff.style.textShadow = 'none'
        postProcessDebugOff.style.background = 'transparent'
        postProcessDebugOff.style.boxShadow = 'none'
      } else {
        postProcessDebugOff.style.border = '2px solid #FF0000'
        postProcessDebugOff.style.color = '#FF0000'
        postProcessDebugOff.style.textShadow = '0 0 10px #FF0000'
        postProcessDebugOff.style.background = 'rgba(255, 0, 0, 0.2)'
        postProcessDebugOff.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.4)'

        postProcessDebugOn.style.border = '2px solid #444444'
        postProcessDebugOn.style.color = '#666666'
        postProcessDebugOn.style.textShadow = 'none'
        postProcessDebugOn.style.background = 'transparent'
        postProcessDebugOn.style.boxShadow = 'none'
      }
    }

    // Update selection visuals
    const updateSelection = () => {
      // 0 = fullscreen, 1 = rendering, 2 = debug, 3 = back button
      fullscreenOption.classList.toggle('selected', OptionsScreen.selectedOptionIndex === 0)
      postProcessRenderingOption.classList.toggle('selected', OptionsScreen.selectedOptionIndex === 1)
      postProcessDebugOption.classList.toggle('selected', OptionsScreen.selectedOptionIndex === 2)
      backButton.classList.toggle('selected', OptionsScreen.selectedOptionIndex === 3)
    }

    // Mouse event listeners
    fullscreenOption.addEventListener('mouseenter', () => {
      OptionsScreen.selectedOptionIndex = 0
      updateSelection()
      if (audioManager) audioManager.playButtonHoverSound()
    })
    fullscreenOption.addEventListener('click', toggleFullscreen)

    fullscreenOn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (!currentSettings.fullscreen) toggleFullscreen()
    })
    fullscreenOff.addEventListener('click', (e) => {
      e.stopPropagation()
      if (currentSettings.fullscreen) toggleFullscreen()
    })

    postProcessRenderingOption.addEventListener('mouseenter', () => {
      OptionsScreen.selectedOptionIndex = 1
      updateSelection()
      if (audioManager) audioManager.playButtonHoverSound()
    })
    postProcessRenderingOption.addEventListener('click', togglePostProcessRendering)

    postProcessRenderingOn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (!currentSettings.postProcessRendering) togglePostProcessRendering()
    })
    postProcessRenderingOff.addEventListener('click', (e) => {
      e.stopPropagation()
      if (currentSettings.postProcessRendering) togglePostProcessRendering()
    })

    postProcessDebugOption.addEventListener('mouseenter', () => {
      OptionsScreen.selectedOptionIndex = 2
      updateSelection()
      if (audioManager) audioManager.playButtonHoverSound()
    })
    postProcessDebugOption.addEventListener('click', togglePostProcessDebug)

    postProcessDebugOn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (!currentSettings.postProcessDebug) togglePostProcessDebug()
    })
    postProcessDebugOff.addEventListener('click', (e) => {
      e.stopPropagation()
      if (currentSettings.postProcessDebug) togglePostProcessDebug()
    })

    backButton.addEventListener('mouseenter', () => {
      OptionsScreen.selectedOptionIndex = 3
      updateSelection()
      if (audioManager) audioManager.playButtonHoverSound()
    })
    backButton.addEventListener('click', () => {
      if (audioManager) audioManager.playButtonPressSound()
      onBack()
    })

    // 🎮 KEYBOARD NAVIGATION
    OptionsScreen.keyboardListener = (e: KeyboardEvent) => {
      const key = e.code.toLowerCase()
      
      // Navigate up/down
      if (key === 'arrowup' || key === 'keyw') {
        e.preventDefault()
        OptionsScreen.selectedOptionIndex = Math.max(0, OptionsScreen.selectedOptionIndex - 1)
        updateSelection()
        if (audioManager) audioManager.playButtonHoverSound()
      } else if (key === 'arrowdown' || key === 'keys') {
        e.preventDefault()
        OptionsScreen.selectedOptionIndex = Math.min(3, OptionsScreen.selectedOptionIndex + 1)
        updateSelection()
        if (audioManager) audioManager.playButtonHoverSound()
      }
      // Toggle/Select
      else if (key === 'space' || key === 'enter') {
        e.preventDefault()
        if (OptionsScreen.selectedOptionIndex === 0) {
          toggleFullscreen()
        } else if (OptionsScreen.selectedOptionIndex === 1) {
          togglePostProcessRendering()
        } else if (OptionsScreen.selectedOptionIndex === 2) {
          togglePostProcessDebug()
        } else if (OptionsScreen.selectedOptionIndex === 3) {
          if (audioManager) audioManager.playButtonPressSound()
          onBack()
        }
      }
      // Left/Right to toggle when on an option
      else if ((key === 'arrowleft' || key === 'keya' || key === 'arrowright' || key === 'keyd')) {
        e.preventDefault()
        if (OptionsScreen.selectedOptionIndex === 0) {
          toggleFullscreen()
        } else if (OptionsScreen.selectedOptionIndex === 1) {
          togglePostProcessRendering()
        } else if (OptionsScreen.selectedOptionIndex === 2) {
          togglePostProcessDebug()
        }
      }
      // Escape to go back
      else if (key === 'escape') {
        e.preventDefault()
        if (audioManager) audioManager.playButtonPressSound()
        onBack()
      }
    }
    
    document.addEventListener('keydown', OptionsScreen.keyboardListener)

    // 🎮 GAMEPAD NAVIGATION
    OptionsScreen.gamepadInterval = window.setInterval(() => {
      const gamepads = navigator.getGamepads()
      const gamepad = gamepads[0]
      
      if (!gamepad) return
      
      const now = Date.now()
      if (now - OptionsScreen.lastGamepadInput < OptionsScreen.inputCooldown) return
      
      // D-pad or left stick navigation
      const dpadUp = gamepad.buttons[12]?.pressed
      const dpadDown = gamepad.buttons[13]?.pressed
      const dpadLeft = gamepad.buttons[14]?.pressed
      const dpadRight = gamepad.buttons[15]?.pressed
      const leftStickY = gamepad.axes[1] || 0
      const leftStickX = gamepad.axes[0] || 0
      
      if (dpadUp || leftStickY < -OptionsScreen.gamepadDeadzone) {
        OptionsScreen.selectedOptionIndex = Math.max(0, OptionsScreen.selectedOptionIndex - 1)
        updateSelection()
        if (audioManager) audioManager.playButtonHoverSound()
        OptionsScreen.lastGamepadInput = now
      } else if (dpadDown || leftStickY > OptionsScreen.gamepadDeadzone) {
        OptionsScreen.selectedOptionIndex = Math.min(3, OptionsScreen.selectedOptionIndex + 1)
        updateSelection()
        if (audioManager) audioManager.playButtonHoverSound()
        OptionsScreen.lastGamepadInput = now
      }

      // Left/Right to toggle when on an option
      if ((dpadLeft || dpadRight || Math.abs(leftStickX) > OptionsScreen.gamepadDeadzone)) {
        if (OptionsScreen.selectedOptionIndex === 0) {
          toggleFullscreen()
          OptionsScreen.lastGamepadInput = now
        } else if (OptionsScreen.selectedOptionIndex === 1) {
          togglePostProcessRendering()
          OptionsScreen.lastGamepadInput = now
        } else if (OptionsScreen.selectedOptionIndex === 2) {
          togglePostProcessDebug()
          OptionsScreen.lastGamepadInput = now
        }
      }

      // A button to select/toggle
      const aButton = gamepad.buttons[0]?.pressed
      if (aButton) {
        if (OptionsScreen.selectedOptionIndex === 0) {
          toggleFullscreen()
        } else if (OptionsScreen.selectedOptionIndex === 1) {
          togglePostProcessRendering()
        } else if (OptionsScreen.selectedOptionIndex === 2) {
          togglePostProcessDebug()
        } else {
          if (audioManager) audioManager.playButtonPressSound()
          onBack()
        }
        OptionsScreen.lastGamepadInput = now
      }
      
      // B button to go back
      const bButton = gamepad.buttons[1]?.pressed
      if (bButton) {
        if (audioManager) audioManager.playButtonPressSound()
        onBack()
        OptionsScreen.lastGamepadInput = now
      }
    }, 50)

    // Initialize selection
    updateSelection()

    // 🎵 RESUME AUDIO CONTEXT ON FIRST INTERACTION
    const resumeAudioOnce = () => {
      if (audioManager) {
        audioManager.resumeAudio().catch(e => console.warn('Audio resume failed:', e))
      }
    }
    
    optionsScreen.addEventListener('click', resumeAudioOnce, { once: true })
    optionsScreen.addEventListener('keydown', resumeAudioOnce, { once: true })

    return optionsScreen
  }

  static cleanup(): void {
    // Remove styles
    const styleEl = document.getElementById('options-styles')
    if (styleEl) {
      styleEl.remove()
    }

    // Clean up keyboard listener
    if (OptionsScreen.keyboardListener) {
      document.removeEventListener('keydown', OptionsScreen.keyboardListener)
      OptionsScreen.keyboardListener = null
    }

    // Clean up gamepad polling
    if (OptionsScreen.gamepadInterval !== null) {
      clearInterval(OptionsScreen.gamepadInterval)
      OptionsScreen.gamepadInterval = null
    }

    // Reset state
    OptionsScreen.selectedOptionIndex = 0
    OptionsScreen.lastGamepadInput = 0
  }
}
