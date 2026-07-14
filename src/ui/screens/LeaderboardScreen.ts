import { ScoreManager, GameMode } from '../../core/GameState'
import { AudioManager } from '../../audio/AudioManager'
import { StarfieldManager } from '../../graphics/StarfieldManager'
import { escapeHtml } from '../../utils/escapeHtml'

/**
 * NEURAL BREAK - Leaderboard Screen
 * 80s Arcade / Cyberpunk Aesthetic
 * Uses unified design system CSS variables
 * 
 * 🎮 Supports keyboard and gamepad navigation!
 */
export class LeaderboardScreen {
  private static keyboardListener: ((e: KeyboardEvent) => void) | null = null
  private static gamepadInterval: number | null = null
  private static lastGamepadInput = 0
  private static inputCooldown = 200 // ms between inputs

  static async create(
    audioManager: AudioManager | null,
    onBack: () => void
  ): Promise<HTMLElement> {
    // Ensure starfield is running
    StarfieldManager.getInstance().start()

    const leaderboardScreen = document.createElement('div')
    leaderboardScreen.id = 'leaderboardScreen'
    leaderboardScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      font-family: var(--font-family, 'Press Start 2P', monospace);
      text-align: center;
      z-index: 1000;
      overflow-y: auto;
      image-rendering: pixelated;
      padding: var(--space-md, 1rem);
      padding-bottom: calc(var(--space-md, 1rem) + 3rem);
      box-sizing: border-box;
    `

    leaderboardScreen.innerHTML = `
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
            repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(255, 215, 0, 0.08) 49px, rgba(255, 215, 0, 0.08) 50px),
            repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255, 102, 0, 0.08) 49px, rgba(255, 102, 0, 0.08) 50px);
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
          rgba(255,215,0,0.4) 0%,
          rgba(255,0,255,0.4) 50%,
          rgba(255,215,0,0.4) 100%);
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
        <div style="position: absolute; top: 10px; left: 10px; width: 40px; height: 40px; border-top: 4px solid #FFD700; border-left: 4px solid #FFD700; box-shadow: 0 0 10px #FFD700;"></div>
        <div style="position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; border-top: 4px solid #FF6600; border-right: 4px solid #FF6600; box-shadow: 0 0 10px #FF6600;"></div>
        <div style="position: absolute; bottom: 10px; left: 10px; width: 40px; height: 40px; border-bottom: 4px solid #FF6600; border-left: 4px solid #FF6600; box-shadow: 0 0 10px #FF6600;"></div>
        <div style="position: absolute; bottom: 10px; right: 10px; width: 40px; height: 40px; border-bottom: 4px solid #FFD700; border-right: 4px solid #FFD700; box-shadow: 0 0 10px #FFD700;"></div>
      </div>
      
      <!-- MAIN CONTENT -->
      <div class="leaderboard-content" style="position: relative; z-index: 1; width: 95%; max-width: 900px; margin-top: auto; margin-bottom: auto;">
        
        <!-- LED-STYLE BANNER -->
        <div class="lb-banner" style="
          margin-bottom: var(--space-sm, 0.8rem);
          font-size: clamp(0.6rem, 1.5vw, 0.9rem);
          color: #FFD700;
          text-shadow: 0 0 10px #FFD700, 0 0 20px #FFD700, 2px 2px 0 #886600;
          letter-spacing: 0.5em;
          animation: ledPulse 2s ease-in-out infinite;
          font-weight: bold;
          text-align: center;
        ">
          HALL OF FAME
        </div>

        <!-- TITLE WITH GLOW -->
        <h1 id="leaderboardTitle" class="leaderboard-title" style="
          font-size: clamp(1.5rem, 4vw, 2.5rem);
          margin-bottom: var(--space-sm, 0.8rem);
          color: #FFFF00;
          text-shadow:
            0 0 10px #FFFF00,
            0 0 20px #FFFF00,
            0 0 40px #FFFF00,
            0 0 80px #FFFF00,
            4px 4px 0 #886600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          animation: titleFlicker 0.1s infinite, titleGlow 3s ease-in-out infinite;
          font-weight: bold;
          position: relative;
        ">
          ARCADE HIGH SCORES
        </h1>

        <!-- Subtitle -->
        <div class="lb-subtitle" style="
          margin-bottom: var(--space-md, 1rem);
          font-size: clamp(0.5rem, 1.2vw, 0.75rem);
          color: #FF6600;
          text-shadow: 0 0 10px #FF6600, 2px 2px 0 #663300;
          letter-spacing: 0.3em;
        ">
          TOP NEURAL HACKERS
        </div>

        <!-- Decorative lines -->
        <div id="decorativeLine" style="
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg,
            transparent 0%,
            #FFD700 15%,
            #FFFF00 30%,
            #FFD700 50%,
            #FFFF00 70%,
            #FFD700 85%,
            transparent 100%);
          margin-bottom: var(--space-xs, 0.5rem);
          box-shadow: 0 0 10px #FFD700, 0 0 20px #FFD700;
          animation: lineGlitch 3s ease-in-out infinite;
        "></div>
        <div style="
          width: 80%;
          height: 2px;
          margin: 0 auto var(--space-lg, 1.5rem);
          background: linear-gradient(90deg,
            transparent 0%,
            #FF6600 50%,
            transparent 100%);
          box-shadow: 0 0 10px #FF6600;
        "></div>
        
        <!-- SCORES TABLE -->
        <div id="leaderboardScoresList" class="scores-container" style="
          background: linear-gradient(180deg, var(--color-bg-panel, rgba(0, 0, 0, 0.9)) 0%, rgba(0, 10, 20, 0.9) 100%);
          border: var(--border-thick, 4px) solid var(--color-cyan, #00FFFF);
          padding: var(--space-sm, 0.8rem) var(--space-md, 1.2rem);
          box-shadow: 
            0 0 28px var(--color-cyan-glow, rgba(0, 255, 255, 0.35)),
            var(--shadow-pixel, 4px 4px 0) var(--color-cyan-dark, #006666),
            inset 0 0 25px rgba(0, 255, 255, 0.08);
          min-height: 280px;
          max-height: 50vh;
          overflow-y: auto;
        "></div>
        
        <!-- BUTTONS CONTAINER -->
        <div class="lb-buttons" style="display: flex; flex-direction: column; gap: var(--space-md, 1rem); align-items: center; margin-top: var(--space-lg, 1.5rem);">
          
          <!-- BACK BUTTON -->
          <button id="backButton" class="arcade-button" style="
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
      </div>

      <!-- CONTROLS HINT -->
      <div class="lb-hint" style="
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
        <div class="lb-hint-title" style="margin-bottom: 0.3rem;">TOP NEURAL HACKERS</div>
        <div style="font-size: 0.6em; color: var(--color-cyan, #00FFFF); text-shadow: 0 0 8px var(--color-cyan, #00FFFF);">
          SPACE/ESC TO RETURN
        </div>
      </div>
    `

    // Add styles
    const style = document.createElement('style')
    style.id = 'leaderboard-styles'
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

      @keyframes ledPulse {
        0%, 100% { opacity: 1; filter: brightness(1); }
        50% { opacity: 0.8; filter: brightness(1.3); }
      }

      @keyframes titleGlow {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.2) drop-shadow(0 0 20px #FFFF00); }
      }

      @keyframes lineGlitch {
        0%, 80%, 100% { transform: scaleX(1); opacity: 1; }
        85% { transform: scaleX(0.95); opacity: 0.8; }
        90% { transform: scaleX(1.05); opacity: 1; }
        95% { transform: scaleX(0.98); opacity: 0.9; }
      }

      @keyframes titleFlicker {
        0%, 90%, 100% { opacity: 1; }
        95% { opacity: 0.85; }
      }
      
      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
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
      
      .expanded-view .score-header,
      .expanded-view .score-row {
        grid-template-columns: 50px 1fr 60px 100px 80px 70px 90px !important;
      }
      
      @media (max-width: 600px) {
        .expanded-view .score-header,
        .expanded-view .score-row {
          grid-template-columns: 40px 1fr 50px 80px 60px 60px 70px !important;
        }
      }
      
      #leaderboardScoresList::-webkit-scrollbar {
        width: 10px;
      }
      
      #leaderboardScoresList::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid var(--color-cyan-dark, #006666);
      }
      
      #leaderboardScoresList::-webkit-scrollbar-thumb {
        background: var(--color-cyan, #00FFFF);
        border: 2px solid var(--color-cyan-dark, #006666);
      }
      
      #leaderboardScoresList::-webkit-scrollbar-thumb:hover {
        background: #66FFFF;
      }
      
      .score-row {
        transition: all 0.1s step-end;
      }
      
      .score-row:hover {
        background: rgba(0, 255, 255, 0.12) !important;
        transform: translateX(3px);
        box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.2);
        border-left-width: 5px !important;
      }
      
      @media (max-width: 600px) {
        .score-header,
        .score-row {
          grid-template-columns: 40px 1fr 50px 80px 60px !important;
          font-size: 0.5rem !important;
        }
        
        .expanded-view .score-header,
        .expanded-view .score-row {
          grid-template-columns: 40px 1fr 50px 80px 60px 60px 70px !important;
          font-size: 0.45rem !important;
        }
      }

      /* ═══════════════════════════════════════════════════════════════════
         HEIGHT-RESPONSIVE COMPRESSION
         Shrinks the header chrome and table so the full board + BACK button
         fit above the fixed controls hint at short window heights.
         ═══════════════════════════════════════════════════════════════════ */
      @media (max-height: 900px) {
        .lb-banner {
          margin-bottom: 0.3rem !important;
          font-size: 0.6rem !important;
        }
        .leaderboard-title {
          font-size: clamp(1.1rem, 2.5vw, 1.6rem) !important;
          margin-bottom: 0.4rem !important;
        }
        .lb-subtitle {
          margin-bottom: 0.5rem !important;
        }
        .scores-container {
          min-height: 0 !important;
          max-height: 46vh !important;
        }
        .lb-buttons {
          margin-top: 0.8rem !important;
        }
        .lb-buttons .arcade-button {
          padding: 0.5rem 1.5rem !important;
          font-size: 0.75rem !important;
        }
        .lb-hint-title {
          display: none !important;
        }
      }

      @media (max-height: 760px) {
        .lb-banner {
          display: none !important;
        }
        .leaderboard-title {
          font-size: 1.1rem !important;
        }
        .lb-subtitle {
          display: none !important;
        }
        .scores-container {
          max-height: 52vh !important;
        }
        .score-row,
        .score-header {
          padding-top: 0.3rem !important;
          padding-bottom: 0.3rem !important;
        }
      }
    `
    document.head.appendChild(style)

    // Display high scores - always show expanded view with all columns
    const scoresContainer = leaderboardScreen.querySelector('#leaderboardScoresList') as HTMLElement
    const isExpanded = true // Always show all columns (RANK, NAME, LVL, SCORE, TIME, LOC, DATE)
    
    // Initial display
    if (scoresContainer) {
      scoresContainer.parentElement?.classList.add('expanded-view')
      await LeaderboardScreen.displayHighScoresInElement(scoresContainer, isExpanded)
    }
    
    // Cleanup function (no longer needed for fullscreen, but kept for consistency)
    const cleanupFullscreen = () => {
      // No-op: fullscreen functionality removed
    }

    // Get element references
    const backButton = leaderboardScreen.querySelector('#backButton') as HTMLButtonElement

    // Mouse event listeners - Back Button
    backButton.addEventListener('mouseenter', () => {
      if (audioManager) audioManager.playButtonHoverSound()
    })
    backButton.addEventListener('click', () => {
      if (audioManager) audioManager.playButtonPressSound()
      cleanupFullscreen()
      onBack()
    })

    // 🎮 KEYBOARD NAVIGATION
    LeaderboardScreen.keyboardListener = (e: KeyboardEvent) => {
      const key = e.code.toLowerCase()

      // Go back (Space/Enter/Escape)
      if (key === 'space' || key === 'enter' || key === 'escape') {
        e.preventDefault()
        if (audioManager) audioManager.playButtonPressSound()
        cleanupFullscreen()
        onBack()
      }
    }

    document.addEventListener('keydown', LeaderboardScreen.keyboardListener)

    // 🎮 GAMEPAD NAVIGATION
    LeaderboardScreen.gamepadInterval = window.setInterval(() => {
      const gamepads = navigator.getGamepads()
      const gamepad = gamepads[0] // Use first connected gamepad

      if (!gamepad) return

      const now = Date.now()
      if (now - LeaderboardScreen.lastGamepadInput < LeaderboardScreen.inputCooldown) return

      // A button (Xbox) / X button (PlayStation) or B button to go back
      const aButton = gamepad.buttons[0]?.pressed // A/X - Select
      const bButton = gamepad.buttons[1]?.pressed // B/Circle - Back
      
      if (aButton || bButton) {
        if (audioManager) audioManager.playButtonPressSound()
        cleanupFullscreen()
        onBack()
        LeaderboardScreen.lastGamepadInput = now
      }
    }, 50) // Check gamepad every 50ms

    // Auto-select back button for visual feedback
    backButton.classList.add('selected')

    // 🎵 RESUME AUDIO CONTEXT ON FIRST INTERACTION 🎵
    const resumeAudioOnce = () => {
      if (audioManager) {
        audioManager.resumeAudio().catch(e => console.warn('Audio resume failed:', e))
      }
    }
    
    leaderboardScreen.addEventListener('click', resumeAudioOnce, { once: true })
    leaderboardScreen.addEventListener('keydown', resumeAudioOnce, { once: true })
    window.addEventListener('gamepadbuttondown', resumeAudioOnce, { once: true })

    return leaderboardScreen
  }

  private static async displayHighScoresInElement(container: HTMLElement, expanded: boolean = false): Promise<void> {
    try {
      // Get scores for Arcade mode
      const highScores = await ScoreManager.getHighScores(GameMode.ORIGINAL)
      
      if (highScores.length === 0) {
        container.innerHTML = `
          <div style="
            text-align: center;
            padding: var(--space-xl, 3rem);
            color: var(--color-cyan, #00FFFF);
            text-shadow: 0 0 10px var(--color-cyan, #00FFFF);
          ">
            <div style="font-size: clamp(0.9rem, 2vw, 1.2rem); margin-bottom: var(--space-md, 1rem);">NO SCORES YET!</div>
            <div style="font-size: clamp(0.5rem, 1.2vw, 0.7rem); color: var(--color-magenta, #FF00FF);">
              BE THE FIRST NEURAL HACKER
            </div>
          </div>
        `
        return
      }

      // Header - adjust columns based on expanded view
      const headerColumns = expanded 
        ? '50px 1fr 60px 100px 80px 70px 90px'
        : '50px 1fr 60px 100px 80px'
      
      const headerLabels = expanded
        ? '<span>RANK</span><span>NAME</span><span>LVL</span><span>SCORE</span><span>TIME</span><span>LOC</span><span>DATE</span>'
        : '<span>RANK</span><span>NAME</span><span>LVL</span><span>SCORE</span><span>TIME</span>'
      
      const header = `
        <div class="score-header" style="
          display: grid;
          grid-template-columns: ${headerColumns};
          gap: var(--space-sm, 0.6rem);
          padding: var(--space-sm, 0.9rem) var(--space-xs, 0.6rem);
          border-bottom: 2.5px solid var(--color-yellow, #FFFF00);
          font-weight: bold;
          color: var(--color-yellow, #FFFF00);
          font-size: clamp(0.55rem, 1.3vw, 0.75rem);
          text-shadow: 0 0 12px var(--color-yellow, #FFFF00), 1px 1px 0 var(--color-yellow-dark, #886600);
          background: linear-gradient(180deg, rgba(255, 255, 0, 0.12) 0%, rgba(255, 255, 0, 0.06) 100%);
          letter-spacing: 0.05em;
        ">
          ${headerLabels}
        </div>
      `

      // Generate score rows
      const rowColumns = expanded
        ? '50px 1fr 60px 100px 80px 70px 90px'
        : '50px 1fr 60px 100px 80px'
      
      const rows = highScores.map((entry, index) => {
        let rankColor = '#CCCCCC'
        let rankIcon = `${index + 1}`
        let rowBg = 'transparent'
        let borderLeft = '4px solid transparent'
        
        if (index === 0) {
          rankColor = 'var(--color-gold, #FFD700)'
          rankIcon = '1ST'
          rowBg = 'rgba(255, 215, 0, 0.1)'
          borderLeft = '4px solid var(--color-gold, #FFD700)'
        } else if (index === 1) {
          rankColor = 'var(--color-silver, #C0C0C0)'
          rankIcon = '2ND'
          rowBg = 'rgba(192, 192, 192, 0.08)'
          borderLeft = '4px solid var(--color-silver, #C0C0C0)'
        } else if (index === 2) {
          rankColor = 'var(--color-bronze, #CD7F32)'
          rankIcon = '3RD'
          rowBg = 'rgba(205, 127, 50, 0.08)'
          borderLeft = '4px solid var(--color-bronze, #CD7F32)'
        }

        // Location and date cells (only shown in expanded view)
        const locationCell = expanded 
          ? `<span style="color: var(--color-magenta, #FF00FF); text-shadow: 0 0 8px var(--color-magenta, #FF00FF);">${escapeHtml((entry.location || 'LOCAL').toUpperCase())}</span>`
          : ''
        const dateCell = expanded
          ? `<span style="color: var(--color-yellow, #FFFF00); text-shadow: 0 0 8px var(--color-yellow, #FFFF00);">${escapeHtml(entry.date || 'N/A')}</span>`
          : ''

        return `
          <div class="score-row" style="
            display: grid;
            grid-template-columns: ${rowColumns};
            gap: var(--space-sm, 0.6rem);
            padding: var(--space-sm, 0.7rem) var(--space-xs, 0.6rem);
            border-bottom: 1px solid rgba(0, 255, 255, 0.18);
            font-size: clamp(0.55rem, 1.3vw, 0.7rem);
            color: ${rankColor};
            text-shadow: 0 0 10px ${rankColor}88, 0 0 4px ${rankColor}44;
            background: ${rowBg};
            border-left: ${borderLeft};
            transition: all 0.15s ease;
          ">
            <span style="font-weight: bold; text-shadow: 0 0 8px ${rankColor};">${rankIcon}</span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 0 6px ${rankColor}66;">${escapeHtml(entry.name.toUpperCase())}</span>
            <span style="text-shadow: 0 0 6px ${rankColor}66;">${entry.level}</span>
            <span style="font-weight: bold; color: var(--color-green, #00FF00); text-shadow: 0 0 12px var(--color-green, #00FF00), 0 0 6px rgba(0, 255, 0, 0.5);">
              ${ScoreManager.formatScore(entry.score)}
            </span>
            <span style="color: var(--color-cyan, #00FFFF); text-shadow: 0 0 8px var(--color-cyan, #00FFFF);">${ScoreManager.formatTime(entry.survivedTime)}</span>
            ${locationCell}
            ${dateCell}
          </div>
        `
      }).join('')

      container.innerHTML = header + rows
    } catch (error) {
      console.error('❌ Error displaying high scores:', error)
      container.innerHTML = `
        <div style="
          text-align: center;
          padding: var(--space-lg, 2rem);
          color: var(--color-red, #FF4444);
          text-shadow: 0 0 10px var(--color-red, #FF4444);
        ">
          ERROR LOADING SCORES
        </div>
      `
    }
  }

  static cleanup(): void {
    // Remove styles
    const styleEl = document.getElementById('leaderboard-styles')
    if (styleEl) {
      styleEl.remove()
    }

    // 🎮 Clean up keyboard listener
    if (LeaderboardScreen.keyboardListener) {
      document.removeEventListener('keydown', LeaderboardScreen.keyboardListener)
      LeaderboardScreen.keyboardListener = null
    }

    // 🎮 Clean up gamepad polling
    if (LeaderboardScreen.gamepadInterval !== null) {
      clearInterval(LeaderboardScreen.gamepadInterval)
      LeaderboardScreen.gamepadInterval = null
    }

    // Reset state
    LeaderboardScreen.lastGamepadInput = 0
  }
}
