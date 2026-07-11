import { AudioManager } from '../../audio/AudioManager'
import { StarfieldManager } from '../../graphics/StarfieldManager'

/**
 * NEURAL BREAK - Start Screen
 * 80s Arcade / Cyberpunk Aesthetic
 * Uses unified design system CSS variables
 * 
 * 🎮 Supports keyboard and gamepad navigation!
 */
export class StartScreen {
  private static selectedButtonIndex = 0
  private static keyboardListener: ((e: KeyboardEvent) => void) | null = null
  private static gamepadInterval: number | null = null
  private static lastGamepadInput = 0
  private static gamepadDeadzone = 0.5
  private static inputCooldown = 200 // ms between inputs

  static create(
    audioManager: AudioManager | null,
    onStartGame: () => void,
    onShowLeaderboard: () => void,
    onStartTestMode?: () => void,
    onShowOptions?: () => void
  ): HTMLElement {
    console.log('🎮 StartScreen.create() called with:', {
      audioManager: !!audioManager,
      onStartGame: !!onStartGame,
      onShowLeaderboard: !!onShowLeaderboard,
      onStartTestMode: !!onStartTestMode,
      onShowOptions: !!onShowOptions
    })
    
    // Start the shared starfield background
    StarfieldManager.getInstance().start()

    const startScreen = document.createElement('div')
    startScreen.id = 'startScreen'
    startScreen.style.cssText = `
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
      pointer-events: auto;
      image-rendering: pixelated;
      padding: var(--space-md, 1rem);
      padding-bottom: calc(var(--space-md, 1rem) + 6.5rem);
      box-sizing: border-box;
    `

    startScreen.innerHTML = `
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
          rgba(255,0,0,0.3) 0%,
          rgba(0,255,0,0.3) 33%,
          rgba(0,0,255,0.3) 66%,
          rgba(255,0,0,0.3) 100%);
        pointer-events: none;
        z-index: 9997;
        animation: vhsTrackingNoise 3s linear infinite;
        opacity: 0.6;
        filter: blur(1px);
      "></div>

      <!-- CRT MONITOR OVERLAY WITH BARREL DISTORTION -->
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
        <!-- Top Left -->
        <div style="position: absolute; top: 10px; left: 10px; width: 40px; height: 40px; border-top: 4px solid #00FFFF; border-left: 4px solid #00FFFF; box-shadow: 0 0 10px #00FFFF;"></div>
        <!-- Top Right -->
        <div style="position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; border-top: 4px solid #FF00FF; border-right: 4px solid #FF00FF; box-shadow: 0 0 10px #FF00FF;"></div>
        <!-- Bottom Left -->
        <div style="position: absolute; bottom: 10px; left: 10px; width: 40px; height: 40px; border-bottom: 4px solid #FF00FF; border-left: 4px solid #FF00FF; box-shadow: 0 0 10px #FF00FF;"></div>
        <!-- Bottom Right -->
        <div style="position: absolute; bottom: 10px; right: 10px; width: 40px; height: 40px; border-bottom: 4px solid #00FFFF; border-right: 4px solid #00FFFF; box-shadow: 0 0 10px #00FFFF;"></div>
      </div>
      
      <!-- MAIN CONTENT -->
      <div class="start-content" style="position: relative; z-index: 1; max-width: 950px; width: 100%; display: flex; flex-direction: column; align-items: center; margin-top: auto; margin-bottom: auto;">
        
        <!-- INSERT COIN BANNER -->
        <div class="insert-coin" style="
          margin-bottom: var(--space-md, 1rem);
          font-size: clamp(0.7rem, 1.8vw, 1.1rem);
          color: #FFFF00;
          text-shadow:
            0 0 10px #FFFF00,
            0 0 20px #FFFF00,
            0 0 30px #FFFF00,
            2px 2px 0 #886600;
          letter-spacing: 0.3em;
          animation: coinBlink 1s step-end infinite;
          font-weight: bold;
        ">
          ▼ INSERT COIN ▼
        </div>

        <!-- MAIN TITLE -->
        <div class="title-container" style="margin-bottom: var(--space-md, 1rem); text-align: center; position: relative;">
          <!-- Main Title -->
          <h1 class="game-title" style="
            position: relative;
            font-size: clamp(1.8rem, 5vw, 3.5rem);
            font-weight: bold;
            letter-spacing: 0.2em;
            margin: 0;
            text-transform: uppercase;
            color: #00FFFF;
            text-shadow:
              0 0 10px #00FFFF,
              0 0 20px #00FFFF,
              0 0 40px #00FFFF,
              0 0 80px #00FFFF,
              4px 4px 0 #006666;
            animation: titleGlitch 8s ease-in-out infinite, titleFlicker 0.1s infinite;
          ">
            NEURAL BREAK
          </h1>

          <!-- Subtitle -->
          <div style="
            margin-top: var(--space-xs, 0.5rem);
            font-size: clamp(0.5rem, 1.2vw, 0.75rem);
            color: #FF00FF;
            text-shadow: 0 0 10px #FF00FF, 2px 2px 0 #660066;
            letter-spacing: 0.3em;
            animation: subtitlePulse 2s ease-in-out infinite;
          ">
            NEURAL SYSTEMS v2.6.9
          </div>

          <!-- Decorative lines with glitch -->
          <div style="
            position: relative;
            margin: var(--space-sm, 0.6rem) auto;
            width: 80%;
            height: 4px;
            background: linear-gradient(90deg,
              transparent 0%,
              #00FFFF 15%,
              #FF00FF 30%,
              #FFFF00 50%,
              #FF00FF 70%,
              #00FFFF 85%,
              transparent 100%);
            box-shadow: 0 0 10px #00FFFF, 0 0 20px #FF00FF;
            animation: lineGlitch 3s ease-in-out infinite;
          "></div>
          <div style="
            margin: var(--space-xs, 0.2rem) auto;
            width: 60%;
            height: 2px;
            background: linear-gradient(90deg,
              transparent 0%,
              #FFFF00 50%,
              transparent 100%);
            box-shadow: 0 0 10px #FFFF00;
          "></div>
        </div>
        
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- ENEMY DATABASE - REFINED COMPACT LAYOUT -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div class="threat-database" style="
          background: linear-gradient(180deg, var(--color-bg-panel, rgba(0, 0, 0, 0.95)) 0%, rgba(20, 0, 10, 0.95) 100%);
          border: var(--border-thick, 4px) solid var(--color-red, #FF0000);
          padding: var(--space-md, 1.2rem) var(--space-lg, 1.5rem);
          max-width: 850px;
          width: 100%;
          margin: 0 auto var(--space-md, 1rem);
          box-shadow: 
            0 0 35px rgba(255, 0, 0, 0.35),
            inset 0 0 25px rgba(255, 0, 0, 0.08),
            var(--shadow-pixel, 5px 5px 0) #660000;
          text-align: center;
          pointer-events: none;
          animation: threatDatabaseWarning 0.5s step-end infinite;
        ">
          <h3 style="
            font-size: clamp(0.85rem, 1.8vw, 1.2rem);
            margin-bottom: var(--space-md, 1rem);
            color: var(--color-red, #FF0000);
            text-shadow: 
              2px 2px 0 #880000, 
              0 0 15px var(--color-red, #FF0000),
              0 0 30px rgba(255, 0, 0, 0.4);
            letter-spacing: 0.15em;
            text-transform: uppercase;
            animation: dangerPulse 1.2s ease-in-out infinite;
            text-align: center;
          ">⚠ THREAT DATABASE ⚠</h3>
          
          <div class="enemy-grid" style="
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: var(--space-sm, 0.7rem);
          ">
            ${StartScreen.createEnemyCard('DATA MITE', 'datamite', '#FF4400', 100)}
            ${StartScreen.createEnemyCard('SCAN DRONE', 'scandrone', '#FF8800', 250)}
            ${StartScreen.createEnemyCard('CHAOS WORM', 'chaosworm', '#FF00FF', 500)}
            ${StartScreen.createEnemyCard('CRYSTAL SWARM', 'crystalswarm', '#00FFFF', 750)}
            ${StartScreen.createEnemyCard('VOID SPHERE', 'voidsphere', '#AA00FF', 1000)}
            ${StartScreen.createEnemyCard('FIZZER', 'fizzer', '#00FF88', 200)}
            ${StartScreen.createEnemyCard('UFO', 'ufo', '#88AAFF', 1500)}
            ${StartScreen.createEnemyCard('BOSS', 'boss', '#FF0000', 5000, true)}
          </div>
        </div>

        <!-- VERTICAL ARCADE MENU -->
        <div class="arcade-menu" style="
          padding: clamp(1.5rem, 3vw, 2.5rem) clamp(2rem, 5vw, 4rem);
          margin: var(--space-lg, 1.5rem) auto;
          max-width: clamp(400px, 60vw, 600px);
        ">
          <!-- MENU TITLE -->
          <div class="menu-title" style="
            text-align: center;
            font-size: clamp(0.8rem, 2vw, 1.2rem);
            color: #FFFF00;
            letter-spacing: 0.3em;
            text-shadow: 0 0 20px #FFFF00, 0 0 40px #FFFF00, 3px 3px 0 #886600;
            margin-bottom: clamp(1.5rem, 3vw, 2.5rem);
            animation: menuTitlePulse 2s ease-in-out infinite;
            font-weight: bold;
          ">
            ▼ SELECT MODE ▼
          </div>

          <!-- VERTICAL MENU ITEMS -->
          <div style="display: flex; flex-direction: column; gap: clamp(0.8rem, 2vw, 1.2rem);">

            <!-- START GAME -->
            <button id="arcadeButton" class="menu-item" style="
              background: transparent;
              border: none;
              color: #FFFF00;
              font-family: inherit;
              font-size: clamp(0.9rem, 2.25vw, 1.5rem);
              font-weight: bold;
              padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 3rem);
              cursor: pointer;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              text-align: center;
              text-shadow: 0 0 20px #FFFF00, 4px 4px 0 #886600;
              transition: all 0.1s step-end;
              position: relative;
              border-left: 6px solid transparent;
            ">
              START GAME
            </button>

            <!-- OPTIONS -->
            <button id="optionsButton" class="menu-item" style="
              background: transparent;
              border: none;
              color: #00FF88;
              font-family: inherit;
              font-size: clamp(0.9rem, 2.25vw, 1.5rem);
              font-weight: bold;
              padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 3rem);
              cursor: pointer;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              text-align: center;
              text-shadow: 0 0 20px #00FF88, 4px 4px 0 #006644;
              transition: all 0.1s step-end;
              position: relative;
              border-left: 6px solid transparent;
            ">
              OPTIONS
            </button>

            <!-- HI SCORES -->
            <button id="leaderboardButton" class="menu-item" style="
              background: transparent;
              border: none;
              color: #00FFFF;
              font-family: inherit;
              font-size: clamp(0.9rem, 2.25vw, 1.5rem);
              font-weight: bold;
              padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 3rem);
              cursor: pointer;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              text-align: center;
              text-shadow: 0 0 20px #00FFFF, 4px 4px 0 #006666;
              transition: all 0.1s step-end;
              position: relative;
              border-left: 6px solid transparent;
            ">
              HI SCORES
            </button>

            <!-- TEST -->
            <button id="testButton" class="menu-item" style="
              background: transparent;
              border: none;
              color: #FF6600;
              font-family: inherit;
              font-size: clamp(0.9rem, 2.25vw, 1.5rem);
              font-weight: bold;
              padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 4vw, 3rem);
              cursor: pointer;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              text-align: center;
              text-shadow: 0 0 20px #FF6600, 4px 4px 0 #663300;
              transition: all 0.1s step-end;
              position: relative;
              border-left: 6px solid transparent;
            ">
              TEST
            </button>
          </div>
        </div>
      </div>
      
      <!-- CONTROLS LEGEND -->
      <div class="controls-legend" style="
        position: fixed;
        bottom: var(--space-md, 1rem);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: var(--space-lg, 1.5rem);
        padding: var(--space-sm, 0.8rem) var(--space-lg, 1.5rem);
        background: linear-gradient(180deg, var(--color-bg-panel, rgba(0, 0, 0, 0.95)) 0%, rgba(0, 10, 20, 0.95) 100%);
        border: var(--border-thick, 4px) solid var(--color-cyan, #00FFFF);
        box-shadow: 
          0 0 25px rgba(0, 255, 255, 0.4),
          inset 0 0 20px rgba(0, 255, 255, 0.08),
          4px 4px 0 var(--color-cyan-dark, #006666);
        z-index: 1;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        border-radius: 2px;
      ">
        <div class="control-item" style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
          <div style="display: flex; gap: 4px;">
            <span class="key-cap">W</span>
            <span class="key-cap">A</span>
            <span class="key-cap">S</span>
            <span class="key-cap">D</span>
          </div>
          <span style="color: var(--color-cyan, #00FFFF); font-size: clamp(0.5rem, 1.2vw, 0.75rem); text-shadow: 0 0 8px var(--color-cyan, #00FFFF); letter-spacing: 0.05em;">MOVE/MENU</span>
        </div>
        
        <div class="control-item" style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
          <span class="key-cap key-space" style="border-color: var(--color-orange, #FF6600); color: var(--color-orange, #FF6600); box-shadow: 0 0 10px rgba(255, 102, 0, 0.5), 3px 3px 0 #883300;">SPACE</span>
          <span style="color: var(--color-orange, #FF6600); font-size: clamp(0.5rem, 1.2vw, 0.75rem); text-shadow: 0 0 8px var(--color-orange, #FF6600); letter-spacing: 0.05em;">FIRE/SELECT</span>
        </div>
        
        <div class="control-item" style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
          <span class="key-cap key-shift" style="border-color: var(--color-green, #00FF00); color: var(--color-green, #00FF00); box-shadow: 0 0 10px rgba(0, 255, 0, 0.5), 3px 3px 0 #006600;">SHIFT</span>
          <span style="color: var(--color-green, #00FF00); font-size: clamp(0.5rem, 1.2vw, 0.75rem); text-shadow: 0 0 8px var(--color-green, #00FF00); letter-spacing: 0.05em;">DASH</span>
        </div>
        
        <div class="control-item" style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
          <span class="key-cap" style="border-color: var(--color-yellow, #FFFF00); color: var(--color-yellow, #FFFF00); box-shadow: 0 0 10px rgba(255, 255, 0, 0.5), 3px 3px 0 #888800; font-size: clamp(0.9rem, 1.8vw, 1.2rem);">🎮</span>
          <span style="color: var(--color-yellow, #FFFF00); font-size: clamp(0.5rem, 1.2vw, 0.75rem); text-shadow: 0 0 8px var(--color-yellow, #FFFF00); letter-spacing: 0.05em;">GAMEPAD</span>
        </div>
      </div>
      
      <!-- COPYRIGHT -->
      <div style="
        position: fixed;
        bottom: 0.3rem;
        right: 0.5rem;
        color: #666666;
        font-size: clamp(0.4rem, 0.8vw, 0.6rem);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        z-index: 1;
      ">
        © 2026 NEURAL SYSTEMS
      </div>
      
      <!-- PLAY COUNT DISPLAY - ARCADE COUNTER STYLE -->
      <div class="play-count-display" style="
        position: fixed;
        top: var(--space-md, 1rem);
        left: var(--space-md, 1rem);
        z-index: 1;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 0, 40, 0.95) 100%);
        border: 2px solid #FF00FF;
        border-radius: 12px;
        padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.2rem, 3vw, 2rem);
        box-shadow:
          0 0 20px rgba(255, 0, 255, 0.5),
          0 0 40px rgba(0, 255, 255, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        transform-style: preserve-3d;
        animation: play-count-pulse 2s ease-in-out infinite;
      ">
        <style>
          @keyframes play-count-pulse {
            0%, 100% {
              box-shadow:
                0 0 20px rgba(255, 0, 255, 0.5),
                0 0 40px rgba(0, 255, 255, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                inset 0 -1px 0 rgba(0, 0, 0, 0.5);
            }
            50% {
              box-shadow:
                0 0 30px rgba(255, 0, 255, 0.8),
                0 0 60px rgba(0, 255, 255, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.2),
                inset 0 -1px 0 rgba(0, 0, 0, 0.5);
            }
          }
          @keyframes counter-flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.95; }
          }
          @keyframes digit-glow {
            0%, 100% {
              text-shadow:
                0 0 10px #00FFFF,
                0 0 20px #00FFFF,
                0 0 30px #00FFFF,
                0 0 5px rgba(0, 255, 255, 0.5);
            }
            50% {
              text-shadow:
                0 0 15px #00FFFF,
                0 0 30px #00FFFF,
                0 0 45px #00FFFF,
                0 0 8px rgba(0, 255, 255, 0.8);
            }
          }
        </style>
        <div style="
          color: #FF00FF;
          font-size: clamp(0.65rem, 1.4vw, 0.85rem);
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: clamp(0.3rem, 0.8vw, 0.5rem);
          text-shadow:
            0 0 10px rgba(255, 0, 255, 0.8),
            2px 2px 0 rgba(0, 0, 0, 0.8);
          opacity: 0.9;
        ">🎮 GAMES PLAYED</div>
        <div style="
          display: flex;
          align-items: center;
          gap: clamp(0.4rem, 1vw, 0.6rem);
        ">
          <div style="
            width: clamp(0.4rem, 1vw, 0.5rem);
            height: clamp(0.4rem, 1vw, 0.5rem);
            background: #00FF00;
            border-radius: 50%;
            box-shadow: 0 0 10px #00FF00, 0 0 20px rgba(0, 255, 0, 0.5);
            animation: counter-flicker 1.5s ease-in-out infinite;
          "></div>
          <div id="totalPlayCount" style="
            font-size: clamp(1.6rem, 4vw, 2.4rem);
            font-weight: 900;
            color: #00FFFF;
            letter-spacing: 0.08em;
            font-variant-numeric: tabular-nums;
            text-shadow:
              0 0 10px #00FFFF,
              0 0 20px #00FFFF,
              0 0 30px #00FFFF,
              0 0 5px rgba(0, 255, 255, 0.5),
              3px 3px 0 rgba(0, 0, 0, 0.8);
            animation: digit-glow 2s ease-in-out infinite;
            min-width: clamp(3rem, 8vw, 5rem);
            text-align: center;
          ">---</div>
        </div>
      </div>
    `
    
    console.log('🎮 StartScreen HTML created with mode buttons')

    // Add styles
    const style = document.createElement('style')
    style.id = 'start-screen-styles'
    style.textContent = `
      /* ═══════════════════════════════════════════════════════════════════
         VHS CYBERPUNK ARCADE ANIMATIONS
         ═══════════════════════════════════════════════════════════════════ */

      @keyframes gridScroll {
        0% { transform: rotateX(60deg) translateY(0); }
        100% { transform: rotateX(60deg) translateY(50px); }
      }

      @keyframes vhsTrackingNoise {
        0% { transform: translateY(0); opacity: 0.6; }
        25% { opacity: 0.8; }
        50% { transform: translateY(100vh); opacity: 0.6; }
        75% { opacity: 0.4; }
        100% { transform: translateY(200vh); opacity: 0.6; }
      }

      @keyframes scanlineScroll {
        0% { transform: translateY(0); }
        100% { transform: translateY(4px); }
      }

      @keyframes coinBlink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0.3; }
      }

      @keyframes rgbShiftRed {
        0%, 100% { transform: translate(calc(-50% - 1px), 0px); }
        25% { transform: translate(calc(-50% - 1.5px), -0.5px); }
        50% { transform: translate(calc(-50% - 0.5px), 0.5px); }
        75% { transform: translate(calc(-50% - 1px), 0px); }
      }

      @keyframes rgbShiftGreen {
        0%, 100% { transform: translate(calc(-50% + 0.5px), 0.5px); }
        25% { transform: translate(calc(-50% + 0px), -0.5px); }
        50% { transform: translate(calc(-50% + 1px), 0px); }
        75% { transform: translate(calc(-50% + 0.5px), 0.5px); }
      }

      @keyframes rgbShiftBlue {
        0%, 100% { transform: translate(calc(-50% + 0px), -0.5px); }
        25% { transform: translate(calc(-50% + 1px), 0.5px); }
        50% { transform: translate(calc(-50% + 0.5px), -0.5px); }
        75% { transform: translate(calc(-50% + 0px), 0px); }
      }

      @keyframes titleGlitch {
        0%, 90%, 100% { transform: translate(0, 0); filter: none; }
        91% { transform: translate(-2px, 0); filter: hue-rotate(90deg); }
        92% { transform: translate(2px, 1px); filter: hue-rotate(-90deg); }
        93% { transform: translate(0, -1px); filter: none; }
        94% { transform: translate(1px, 0); filter: hue-rotate(45deg); }
        95% { transform: translate(0, 0); filter: none; }
      }

      @keyframes lineGlitch {
        0%, 80%, 100% { transform: scaleX(1); opacity: 1; }
        85% { transform: scaleX(0.95); opacity: 0.8; }
        90% { transform: scaleX(1.05); opacity: 1; }
        95% { transform: scaleX(0.98); opacity: 0.9; }
      }

      @keyframes subtitlePulse {
        0%, 100% { opacity: 1; filter: brightness(1); }
        50% { opacity: 0.8; filter: brightness(1.2); }
      }

      @keyframes titleFlicker {
        0%, 90%, 100% { opacity: 1; }
        95% { opacity: 0.85; }
      }

      @keyframes arcadeColorCycle {
        0% { 
          color: #FF0000;
          text-shadow: 4px 4px 0 #880000, -2px -2px 0 #FF6600, 0 0 30px #FF0000, 0 0 60px #FF0000;
        }
        16% { 
          color: #FF6600;
          text-shadow: 4px 4px 0 #883300, -2px -2px 0 #FFFF00, 0 0 30px #FF6600, 0 0 60px #FF6600;
        }
        33% { 
          color: #FFFF00;
          text-shadow: 4px 4px 0 #888800, -2px -2px 0 #00FF00, 0 0 30px #FFFF00, 0 0 60px #FFFF00;
        }
        50% { 
          color: #00FF00;
          text-shadow: 4px 4px 0 #008800, -2px -2px 0 #00FFFF, 0 0 30px #00FF00, 0 0 60px #00FF00;
        }
        66% { 
          color: #00FFFF;
          text-shadow: 4px 4px 0 #008888, -2px -2px 0 #0088FF, 0 0 30px #00FFFF, 0 0 60px #00FFFF;
        }
        83% { 
          color: #FF00FF;
          text-shadow: 4px 4px 0 #880088, -2px -2px 0 #FF0088, 0 0 30px #FF00FF, 0 0 60px #FF00FF;
        }
        100% { 
          color: #FF0000;
          text-shadow: 4px 4px 0 #880000, -2px -2px 0 #FF6600, 0 0 30px #FF0000, 0 0 60px #FF0000;
        }
      }

      @keyframes selectModeFlash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      @keyframes menuTitlePulse {
        0%, 100% { opacity: 1; filter: brightness(1); }
        50% { opacity: 0.85; filter: brightness(1.3); }
      }

      @keyframes subtitlePulse {
        0%, 100% { opacity: 0.8; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.02); }
      }

      /* Vertical Menu Item Styles */
      .menu-item.selected {
        background: rgba(0, 255, 255, 0.15) !important;
        border-left: 6px solid currentColor !important;
        transform: translateX(10px) scale(1.05);
        filter: brightness(1.5) drop-shadow(0 0 20px currentColor);
      }

      .menu-item:hover {
        background: rgba(0, 255, 255, 0.1);
        border-left: 6px solid currentColor;
        transform: translateX(8px) scale(1.03);
        filter: brightness(1.3);
      }
      
      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      
      @keyframes dangerPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes enemyFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      
      @keyframes enemyGlow {
        0%, 100% { filter: drop-shadow(0 0 5px currentColor); }
        50% { filter: drop-shadow(0 0 15px currentColor); }
      }
      
      @keyframes wormWiggle {
        0%, 100% { transform: rotate(-3deg); }
        50% { transform: rotate(3deg); }
      }
      
      @keyframes orbitRing {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes crystalSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes threatDatabaseWarning {
        0%, 50% { 
          border-color: #FF0000; 
          box-shadow: 
            0 0 35px rgba(255, 0, 0, 0.6),
            inset 0 0 25px rgba(255, 0, 0, 0.15),
            5px 5px 0 #660000;
        }
        51%, 100% { 
          border-color: #FFFF00; 
          box-shadow: 
            0 0 35px rgba(255, 255, 0, 0.6),
            inset 0 0 25px rgba(255, 255, 0, 0.15),
            5px 5px 0 #666600;
        }
      }
      
      .key-cap {
        min-width: 36px;
        height: 36px;
        padding: 0 8px;
        background: #111111;
        border: 3px solid var(--color-cyan, #00FFFF);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-cyan, #00FFFF);
        font-size: clamp(0.7rem, 1.5vw, 1rem);
        font-weight: bold;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 3px 3px 0 var(--color-cyan-dark, #006666);
        line-height: 1;
        text-align: center;
      }
      
      .key-space { 
        min-width: 90px;
        padding: 0 12px;
      }
      
      .key-shift { 
        min-width: 75px;
        padding: 0 10px;
      }
      
      /* START GAME BUTTON - Yellow/Gold theme */
      #arcadeButton:hover,
      #arcadeButton.selected {
        background: #333300 !important;
        box-shadow:
          0 0 40px rgba(255, 255, 0, 0.6),
          4px 4px 0 var(--color-yellow, #FFFF00) !important;
        transform: translate(-2px, -2px) scale(1.05);
        text-shadow:
          0 0 30px var(--color-yellow, #FFFF00),
          0 0 60px var(--color-yellow, #FFFF00),
          3px 3px 0 var(--color-orange, #FF6600) !important;
      }

      #arcadeButton:active {
        transform: translate(2px, 2px) scale(1);
        box-shadow:
          0 0 15px rgba(255, 255, 0, 0.4),
          0 0 0 var(--color-yellow-dark, #886600) !important;
      }

      /* TEST BUTTON - Orange theme */
      #testButton:hover,
      #testButton.selected {
        background: #332200 !important;
        box-shadow: 
          0 0 40px rgba(255, 102, 0, 0.6),
          4px 4px 0 var(--color-orange, #FF6600) !important;
        transform: translate(-2px, -2px) scale(1.05);
        text-shadow: 
          0 0 30px var(--color-orange, #FF6600),
          0 0 60px var(--color-orange, #FF6600),
          3px 3px 0 #663300 !important;
      }
      
      #testButton:active {
        transform: translate(2px, 2px) scale(1);
        box-shadow: 
          0 0 15px rgba(255, 102, 0, 0.4),
          0 0 0 var(--color-orange-dark, #663300) !important;
      }
      
      /* HIGH SCORES BUTTON - Magenta theme */
      #leaderboardButton:hover,
      #leaderboardButton.selected {
        background: #330033 !important;
        box-shadow: 
          0 0 30px rgba(255, 0, 255, 0.6),
          4px 4px 0 var(--color-magenta, #FF00FF) !important;
        transform: translate(-2px, -2px);
      }
      
      #leaderboardButton:active {
        transform: translate(2px, 2px);
        box-shadow: 
          0 0 15px rgba(255, 0, 255, 0.4),
          0 0 0 var(--color-magenta-dark, #660066) !important;
      }
      
      /* OPTIONS BUTTON - Green/Cyan theme */
      #optionsButton:hover,
      #optionsButton.selected {
        background: #003322 !important;
        box-shadow: 
          0 0 30px rgba(0, 255, 136, 0.6),
          4px 4px 0 #00FF88 !important;
        transform: translate(-2px, -2px);
      }
      
      #optionsButton:active {
        transform: translate(2px, 2px);
        box-shadow: 
          0 0 15px rgba(0, 255, 136, 0.4),
          0 0 0 #006644 !important;
      }
      
      .enemy-card {
        transition: all 0.15s ease;
        cursor: default;
      }
      
      .enemy-card:hover {
        transform: translateY(-3px) scale(1.03);
        z-index: 10;
        box-shadow: 
          0 0 25px currentColor,
          inset 0 0 20px currentColor,
          4px 4px 0 currentColor !important;
      }
      
      .enemy-card:hover .enemy-visual {
        animation-duration: 0.4s;
        filter: brightness(1.2);
      }
      
      @media (max-width: 1024px) {
        .enemy-grid {
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 0.75rem !important;
        }
      }
      
      @media (max-width: 768px) {
        .controls-legend {
          flex-direction: row !important;
          gap: 0.8rem !important;
          padding: 0.4rem 0.6rem !important;
        }
        
        .enemy-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 0.6rem !important;
        }
        
        .threat-database {
          padding: 0.75rem !important;
        }
      }
      
      @media (max-width: 480px) {
        .enemy-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 0.5rem !important;
        }
        
        .enemy-card {
          padding: 0.5rem !important;
        }
        
        .enemy-visual {
          width: 40px !important;
          height: 40px !important;
        }
      }

      /* ═══════════════════════════════════════════════════════════════════
         HEIGHT-RESPONSIVE COMPRESSION
         The full layout needs ~1150px of height; these tiers shrink the
         decorative chrome so the menu always fits (and stays clickable)
         above the fixed controls legend at common window/fullscreen sizes.
         ═══════════════════════════════════════════════════════════════════ */
      @media (max-height: 1150px) {
        .game-title {
          font-size: clamp(1.6rem, 4vw, 2.6rem) !important;
        }
        .enemy-visual {
          width: clamp(34px, 5vw, 46px) !important;
          height: clamp(34px, 5vw, 46px) !important;
        }
        .arcade-menu {
          padding: clamp(0.8rem, 1.5vw, 1.4rem) clamp(2rem, 5vw, 4rem) !important;
          margin: var(--space-sm, 0.8rem) auto !important;
        }
        .menu-title {
          margin-bottom: clamp(0.8rem, 1.5vw, 1.4rem) !important;
        }
        .menu-item {
          padding: clamp(0.5rem, 1.2vw, 0.8rem) clamp(1.5rem, 4vw, 3rem) !important;
        }
      }

      @media (max-height: 900px) {
        .insert-coin {
          margin-bottom: 0.4rem !important;
          font-size: 0.65rem !important;
        }
        .game-title {
          font-size: clamp(1.4rem, 3vw, 1.9rem) !important;
        }
        .title-container {
          margin-bottom: 0.5rem !important;
        }
        .threat-database {
          padding: 0.6rem 1rem !important;
          margin-bottom: 0.6rem !important;
        }
        .threat-database h3 {
          font-size: 0.75rem !important;
          margin-bottom: 0.5rem !important;
        }
        .enemy-grid {
          gap: 0.45rem !important;
        }
        .enemy-card {
          padding: 0.4rem 0.3rem !important;
          gap: 0.25rem !important;
        }
        .enemy-visual {
          width: 32px !important;
          height: 32px !important;
        }
        .arcade-menu {
          padding: 0.5rem 2rem !important;
          margin: 0.4rem auto !important;
        }
        .menu-title {
          font-size: 0.8rem !important;
          margin-bottom: 0.7rem !important;
        }
        .menu-item {
          font-size: clamp(0.8rem, 1.8vw, 1.1rem) !important;
          padding: 0.45rem 1.5rem !important;
        }
        .controls-legend {
          padding: 0.4rem 1rem !important;
          gap: 1rem !important;
          bottom: 0.5rem !important;
        }
        .key-cap {
          padding: 0.25rem 0.4rem !important;
          font-size: 0.55rem !important;
        }
      }

      @media (max-height: 780px) {
        .insert-coin {
          display: none !important;
        }
        .game-title {
          font-size: 1.4rem !important;
        }
        .enemy-visual {
          width: 26px !important;
          height: 26px !important;
        }
        .enemy-card > div:nth-child(2) {
          font-size: 0.42rem !important;
        }
        .enemy-card > div:nth-child(3) {
          font-size: 0.4rem !important;
        }
        .menu-title {
          font-size: 0.7rem !important;
          margin-bottom: 0.5rem !important;
        }
        .menu-item {
          font-size: 0.8rem !important;
          padding: 0.35rem 1.5rem !important;
        }
      }

      /* GAMES PLAYED badge collides with the centered panel on narrow windows */
      @media (max-width: 1250px), (max-height: 900px) {
        .play-count-display {
          transform: scale(0.7);
          transform-origin: top left;
        }
      }
    `
    document.head.appendChild(style)

    // Get button references - Order: START GAME, OPTIONS, HI SCORES, TEST
    const arcadeButton = startScreen.querySelector('#arcadeButton') as HTMLButtonElement
    const optionsButton = startScreen.querySelector('#optionsButton') as HTMLButtonElement
    const leaderboardButton = startScreen.querySelector('#leaderboardButton') as HTMLButtonElement
    const testButton = startScreen.querySelector('#testButton') as HTMLButtonElement

    console.log('🎮 StartScreen buttons found:', {
      arcadeButton: !!arcadeButton,
      optionsButton: !!optionsButton,
      leaderboardButton: !!leaderboardButton,
      testButton: !!testButton
    })

    const buttons = [arcadeButton, optionsButton, leaderboardButton, testButton]

    // Mouse event listeners
    arcadeButton.addEventListener('mouseenter', () => {
      StartScreen.selectedButtonIndex = 0
      StartScreen.updateButtonSelection(buttons, audioManager)
    })
    arcadeButton.addEventListener('click', () => {
      if (audioManager) audioManager.playButtonPressSound()
      StartScreen.stopStarfield()
      StartScreen.cleanup()
      setTimeout(() => {
        onStartGame()
      }, 50)
    })

    optionsButton.addEventListener('mouseenter', () => {
      StartScreen.selectedButtonIndex = 1
      StartScreen.updateButtonSelection(buttons, audioManager)
    })
    optionsButton.addEventListener('click', () => {
      if (audioManager) audioManager.playButtonPressSound()
      if (onShowOptions) onShowOptions()
    })

    leaderboardButton.addEventListener('mouseenter', () => {
      StartScreen.selectedButtonIndex = 2
      StartScreen.updateButtonSelection(buttons, audioManager)
    })
    leaderboardButton.addEventListener('click', () => {
      if (audioManager) audioManager.playButtonPressSound()
      onShowLeaderboard()
    })

    testButton.addEventListener('mouseenter', () => {
      StartScreen.selectedButtonIndex = 3
      StartScreen.updateButtonSelection(buttons, audioManager)
    })
    testButton.addEventListener('click', () => {
      if (audioManager) audioManager.playButtonPressSound()
      StartScreen.stopStarfield()
      StartScreen.cleanup()
      setTimeout(() => {
        if (onStartTestMode) onStartTestMode()
      }, 50)
    })

    // 🎮 KEYBOARD NAVIGATION
    StartScreen.keyboardListener = (e: KeyboardEvent) => {
      const key = e.code.toLowerCase()

      // Navigate up/down
      if (key === 'arrowup' || key === 'keyw') {
        e.preventDefault()
        StartScreen.selectedButtonIndex = Math.max(0, StartScreen.selectedButtonIndex - 1)
        StartScreen.updateButtonSelection(buttons, audioManager)
      } else if (key === 'arrowdown' || key === 'keys') {
        e.preventDefault()
        StartScreen.selectedButtonIndex = Math.min(buttons.length - 1, StartScreen.selectedButtonIndex + 1)
        StartScreen.updateButtonSelection(buttons, audioManager)
      }
      // Select button - Order: START GAME(0), OPTIONS(1), HI SCORES(2), TEST(3)
      else if (key === 'space' || key === 'enter') {
        e.preventDefault()
        if (audioManager) audioManager.playButtonPressSound()

        if (StartScreen.selectedButtonIndex === 0) {
          // START GAME (ARCADE MODE)
          StartScreen.stopStarfield()
          StartScreen.cleanup()
          setTimeout(() => {
            onStartGame()
          }, 50)
        } else if (StartScreen.selectedButtonIndex === 1) {
          // OPTIONS
          if (onShowOptions) onShowOptions()
        } else if (StartScreen.selectedButtonIndex === 2) {
          // HIGH SCORES
          onShowLeaderboard()
        } else if (StartScreen.selectedButtonIndex === 3) {
          // TEST MODE
          StartScreen.stopStarfield()
          StartScreen.cleanup()
          setTimeout(() => {
            if (onStartTestMode) onStartTestMode()
          }, 50)
        }
      }
    }

    document.addEventListener('keydown', StartScreen.keyboardListener)

    // 🎮 GAMEPAD NAVIGATION
    StartScreen.gamepadInterval = window.setInterval(() => {
      const gamepads = navigator.getGamepads()
      const gamepad = gamepads[0] // Use first connected gamepad

      if (!gamepad) return

      const now = Date.now()
      if (now - StartScreen.lastGamepadInput < StartScreen.inputCooldown) return

      // D-pad or left stick navigation
      const dpadUp = gamepad.buttons[12]?.pressed
      const dpadDown = gamepad.buttons[13]?.pressed
      const leftStickY = gamepad.axes[1] || 0

      if (dpadUp || leftStickY < -StartScreen.gamepadDeadzone) {
        StartScreen.selectedButtonIndex = Math.max(0, StartScreen.selectedButtonIndex - 1)
        StartScreen.updateButtonSelection(buttons, audioManager)
        StartScreen.lastGamepadInput = now
      } else if (dpadDown || leftStickY > StartScreen.gamepadDeadzone) {
        StartScreen.selectedButtonIndex = Math.min(buttons.length - 1, StartScreen.selectedButtonIndex + 1)
        StartScreen.updateButtonSelection(buttons, audioManager)
        StartScreen.lastGamepadInput = now
      }

      // A button (Xbox) / X button (PlayStation) to select
      // Order: START GAME(0), OPTIONS(1), HI SCORES(2), TEST(3)
      const aButton = gamepad.buttons[0]?.pressed
      if (aButton) {
        if (now - StartScreen.lastGamepadInput < StartScreen.inputCooldown) return

        if (audioManager) audioManager.playButtonPressSound()

        if (StartScreen.selectedButtonIndex === 0) {
          // START GAME (ARCADE MODE)
          StartScreen.stopStarfield()
          StartScreen.cleanup()
          setTimeout(() => {
            onStartGame()
          }, 50)
        } else if (StartScreen.selectedButtonIndex === 1) {
          // OPTIONS
          if (onShowOptions) onShowOptions()
        } else if (StartScreen.selectedButtonIndex === 2) {
          // HIGH SCORES
          onShowLeaderboard()
        } else if (StartScreen.selectedButtonIndex === 3) {
          // TEST MODE
          StartScreen.stopStarfield()
          StartScreen.cleanup()
          setTimeout(() => {
            if (onStartTestMode) onStartTestMode()
          }, 50)
        }

        StartScreen.lastGamepadInput = now
      }
    }, 50) // Check gamepad every 50ms

    // Initialize button selection
    StartScreen.updateButtonSelection(buttons, audioManager, true)

    // 📊 FETCH AND DISPLAY PLAY COUNT 📊
    const fetchPlayCount = async () => {
      try {
        const response = await fetch('/api/highscores?stats=true')
        if (response.ok) {
          try {
            const stats = await response.json()
            const playCountEl = startScreen.querySelector('#totalPlayCount')
            if (playCountEl && stats.playCount !== undefined) {
              playCountEl.textContent = stats.playCount.toLocaleString()
              console.log('📊 Play count loaded:', stats.playCount)
            }
          } catch (jsonError) {
            // JSON parse error - API not available in local dev
            throw new Error('API endpoint not available')
          }
        } else {
          // Fallback for local dev: Show localStorage count
          const playCountEl = startScreen.querySelector('#totalPlayCount') as HTMLElement
          if (playCountEl) {
            playCountEl.textContent = 'LOCAL'
            playCountEl.style.fontSize = 'clamp(0.6rem, 1.2vw, 0.9rem)'
            console.log('💾 API not available, showing LOCAL mode indicator')
          }
        }
      } catch (error) {
        // Silently handle in local dev - API only works in production
        console.log('💾 Running in local development mode')
        // Fallback for local dev
        const playCountEl = startScreen.querySelector('#totalPlayCount') as HTMLElement
        if (playCountEl) {
          playCountEl.textContent = 'LOCAL'
          playCountEl.style.fontSize = 'clamp(0.6rem, 1.2vw, 0.9rem)'
        }
      }
    }

    // Fetch play count on load
    fetchPlayCount()

    // 🎵 RESUME AUDIO CONTEXT ON FIRST INTERACTION 🎵
    // Add one-time listeners to ensure audio works on first interaction
    const resumeAudioOnce = () => {
      if (audioManager) {
        audioManager.resumeAudio().catch(e => console.warn('Audio resume failed:', e))
      }
    }
    
    // Resume on any interaction
    startScreen.addEventListener('click', resumeAudioOnce, { once: true })
    startScreen.addEventListener('keydown', resumeAudioOnce, { once: true })
    window.addEventListener('gamepadbuttondown', resumeAudioOnce, { once: true })

    return startScreen
  }

  // 🎮 Update visual selection state of buttons
  private static updateButtonSelection(
    buttons: HTMLButtonElement[], 
    audioManager: AudioManager | null,
    silent: boolean = false
  ): void {
    buttons.forEach((button, index) => {
      if (index === StartScreen.selectedButtonIndex) {
        button.classList.add('selected')
        if (!silent && audioManager) {
          audioManager.playButtonHoverSound()
        }
      } else {
        button.classList.remove('selected')
      }
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENEMY CARD GENERATOR - With visual representation
  // ═══════════════════════════════════════════════════════════════════════════
  private static createEnemyCard(name: string, type: string, color: string, points: number, isBoss: boolean = false): string {
    const enemyVisual = StartScreen.getEnemyVisual(type)
    const sizeClass = isBoss ? 'boss-card' : ''
    
    return `
      <div class="enemy-card ${sizeClass}" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-xs, 0.4rem);
        padding: var(--space-sm, 0.7rem) var(--space-xs, 0.5rem);
        background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(15,5,25,0.9) 100%);
        border: 2.5px solid ${color};
        border-radius: 3px;
        box-shadow: 
          0 0 15px ${color}55,
          inset 0 0 12px ${color}18,
          2px 2px 0 ${color}33;
      ">
        <!-- ENEMY VISUAL -->
        <div class="enemy-visual" style="
          width: clamp(42px, 7vw, 60px);
          height: clamp(42px, 7vw, 60px);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: enemyFloat 2.2s ease-in-out infinite;
          filter: drop-shadow(0 0 8px ${color}88);
        ">
          ${enemyVisual}
        </div>
        
        <!-- ENEMY NAME -->
        <div style="
          color: ${color};
          font-size: clamp(0.5rem, 1.1vw, 0.7rem);
          font-weight: bold;
          text-transform: uppercase;
          text-shadow: 0 0 8px ${color}, 1px 1px 0 ${color}44;
          letter-spacing: 0.08em;
          line-height: 1.2;
          text-align: center;
        ">${name}</div>
        
        <!-- POINTS VALUE -->
        <div style="
          color: var(--color-yellow, #FFFF00);
          font-size: clamp(0.45rem, 0.95vw, 0.6rem);
          text-shadow: 0 0 6px var(--color-yellow, #FFFF00);
          font-weight: bold;
        ">${points.toLocaleString()}</div>
      </div>
    `
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SVG ENEMY VISUALS - Detailed representations
  // ═══════════════════════════════════════════════════════════════════════════
  private static getEnemyVisual(type: string): string {
    switch (type) {
      case 'datamite':
        return `
          <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" stroke-linejoin="round">
            <polygon points="30,8 14,46 30,36 46,46" fill="#FF4400"/>
          </svg>
        `

      case 'scandrone':
        return `
          <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" stroke-linejoin="round">
            <polygon points="30,6 51,18 51,42 30,54 9,42 9,18" fill="none" stroke="#FF8800" stroke-width="3"/><line x1="30" y1="30" x2="30" y2="8" stroke="#FF8800" stroke-width="2"><animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="3s" repeatCount="indefinite"/></line>
          </svg>
        `

      case 'chaosworm':
        return `
          <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" stroke-linejoin="round">
            <polygon points="16,22 24,30 16,38 8,30" fill="none" stroke="#FF00FF" stroke-width="2.5"/><polygon points="32,18 42,30 32,42 22,30" fill="none" stroke="#FF00FF" stroke-width="3"/><polygon points="48,24 54,30 48,36 42,30" fill="none" stroke="#FF00FF" stroke-width="2"/>
          </svg>
        `

      case 'voidsphere':
        return `
          <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" stroke-linejoin="round">
            <circle cx="30" cy="30" r="14" fill="#000000"/><circle cx="30" cy="30" r="21" fill="none" stroke="#AA00FF" stroke-width="3" stroke-dasharray="115 17"/>
          </svg>
        `

      case 'crystalswarm':
        return `
          <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" stroke-linejoin="round">
            <polygon points="30,4 36,20 54,17 42,30 54,43 36,40 30,56 24,40 6,43 18,30 6,17 24,20" fill="none" stroke="#00FFFF" stroke-width="2.5"/>
          </svg>
        `

      case 'fizzer':
        return `
          <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" stroke-linejoin="round">
            <rect x="26" y="8" width="8" height="44" fill="#00FF88"/><rect x="8" y="26" width="44" height="8" fill="#00FF88"/>
          </svg>
        `

      case 'ufo':
        return `
          <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" stroke-linejoin="round">
            <polygon points="6,32 18,26 42,26 54,32 42,38 18,38" fill="none" stroke="#88AAFF" stroke-width="3"/><path d="M 20 26 A 10 10 0 0 1 40 26" fill="none" stroke="#88AAFF" stroke-width="3"/>
          </svg>
        `

      case 'boss':
        return `
          <svg viewBox="0 0 60 60" width="100%" height="100%" fill="none" stroke-linejoin="round">
            <polygon points="30,4 53,17 53,43 30,56 7,43 7,17" fill="none" stroke="#FF0000" stroke-width="3.5"/><circle cx="30" cy="30" r="7" fill="#FF0000"/>
          </svg>
        `

      default:
        return `<div style="width: 40px; height: 40px; background: ${type}; border-radius: 50%;"></div>`
    }
  }

  static stopStarfield(): void {
    StarfieldManager.getInstance().stop()
  }

  static cleanup(): void {
    // Remove styles
    const styleEl = document.getElementById('start-screen-styles')
    if (styleEl) {
      styleEl.remove()
    }

    // 🎮 Clean up keyboard listener
    if (StartScreen.keyboardListener) {
      document.removeEventListener('keydown', StartScreen.keyboardListener)
      StartScreen.keyboardListener = null
    }

    // 🎮 Clean up gamepad polling
    if (StartScreen.gamepadInterval !== null) {
      clearInterval(StartScreen.gamepadInterval)
      StartScreen.gamepadInterval = null
    }

    // Reset state
    StartScreen.selectedButtonIndex = 0
    StartScreen.lastGamepadInput = 0
  }
}
