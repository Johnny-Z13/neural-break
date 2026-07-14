import * as THREE from 'three'
import { PostProcessingManager } from '../graphics/PostProcessingManager'
import { PostProcessSettings, PostProcessConfig } from '../config/PostProcessSettings'

/**
 * 🎨 POST-PROCESSING CONTROL PANEL 🎨
 *
 * Debug UI for live-tuning post-processing effects
 * Appears on the right side of screen when enabled in OPTIONS
 *
 * Effects:
 * - Bloom: Neon glow (ON by default)
 * - Chromatic Aberration: RGB split
 * - Vignette: Dark edges
 * - Glitch: Damage feedback (triggered only)
 */
export class PostProcessControlPanel {
  private container: HTMLElement | null = null
  private postProcessing: PostProcessingManager
  private currentConfig: PostProcessConfig
  private fpsElement: HTMLElement | null = null
  private frameCount: number = 0
  private lastFpsUpdate: number = 0
  private fpsHistory: number[] = []

  constructor(postProcessing: PostProcessingManager) {
    this.postProcessing = postProcessing
    this.currentConfig = PostProcessSettings.load()
    this.lastFpsUpdate = performance.now()
  }

  /**
   * Create and show the control panel
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'flex'
      return
    }

    this.container = document.createElement('div')
    this.container.id = 'postProcessControlPanel'
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: calc(100vh - 20px);
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 0, 20, 0.95) 100%);
      border: 3px solid #00FFFF;
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 15px rgba(0, 255, 255, 0.1);
      padding: 15px;
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      color: #FFFFFF;
      z-index: 10000;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `

    this.container.innerHTML = this.buildHTML()
    document.body.appendChild(this.container)

    // Get FPS element reference
    this.fpsElement = this.container.querySelector('#pp-fps')

    // Attach event listeners
    this.attachEventListeners()

    // Apply current settings to UI
    this.updateUI()
  }

  /**
   * Hide the control panel
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none'
    }
  }

  /**
   * Remove the control panel completely
   */
  destroy(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }

  /**
   * Build the HTML for the control panel
   */
  private buildHTML(): string {
    return `
      <!-- TITLE -->
      <div class="pp-title" style="
        text-align: center;
        color: #00FFFF;
        font-size: 11px;
        text-shadow: 0 0 10px #00FFFF;
        letter-spacing: 0.1em;
      ">
        POST-PROCESS
      </div>

      <!-- FPS COUNTER -->
      <div id="pp-fps" style="
        text-align: center;
        color: #00FF00;
        font-size: 14px;
        font-weight: bold;
        text-shadow: 0 0 10px #00FF00;
        padding: 6px;
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #00FF00;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
      ">
        FPS: --
      </div>

      <div class="pp-divider" style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #00FFFF, transparent);"></div>

      <!-- BLOOM EFFECT -->
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="bloom-enabled" ${this.currentConfig.bloom.enabled ? 'checked' : ''}>
          <span style="color: #FF00FF;">BLOOM</span>
        </label>
        <div class="slider-group">
          <label>Intensity: <span id="bloom-intensity-val">${this.currentConfig.bloom.intensity.toFixed(2)}</span></label>
          <input type="range" id="bloom-intensity" min="0" max="2" step="0.05" value="${this.currentConfig.bloom.intensity}">
        </div>
        <div class="slider-group">
          <label>Threshold: <span id="bloom-threshold-val">${this.currentConfig.bloom.threshold.toFixed(2)}</span></label>
          <input type="range" id="bloom-threshold" min="0" max="1" step="0.05" value="${this.currentConfig.bloom.threshold}">
        </div>
        <div class="slider-group">
          <label>Smoothing: <span id="bloom-smoothing-val">${this.currentConfig.bloom.smoothing.toFixed(2)}</span></label>
          <input type="range" id="bloom-smoothing" min="0" max="1" step="0.05" value="${this.currentConfig.bloom.smoothing}">
        </div>
      </div>

      <div class="pp-divider" style="width: 100%; height: 1px; background: rgba(0, 255, 255, 0.3);"></div>

      <!-- CHROMATIC ABERRATION -->
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="chroma-enabled" ${this.currentConfig.chromaticAberration.enabled ? 'checked' : ''}>
          <span style="color: #FF00FF;">CHROMATIC</span>
        </label>
        <div class="slider-group">
          <label>Intensity: <span id="chroma-intensity-val">${(this.currentConfig.chromaticAberration.intensity * 1000).toFixed(1)}</span></label>
          <input type="range" id="chroma-intensity" min="0" max="10" step="0.1" value="${this.currentConfig.chromaticAberration.intensity * 1000}">
        </div>
      </div>

      <div class="pp-divider" style="width: 100%; height: 1px; background: rgba(0, 255, 255, 0.3);"></div>

      <!-- VIGNETTE -->
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="vignette-enabled" ${this.currentConfig.vignette.enabled ? 'checked' : ''}>
          <span style="color: #FF00FF;">VIGNETTE</span>
        </label>
        <div class="slider-group">
          <label>Offset: <span id="vignette-offset-val">${this.currentConfig.vignette.offset.toFixed(2)}</span></label>
          <input type="range" id="vignette-offset" min="0" max="1" step="0.05" value="${this.currentConfig.vignette.offset}">
        </div>
        <div class="slider-group">
          <label>Darkness: <span id="vignette-darkness-val">${this.currentConfig.vignette.darkness.toFixed(2)}</span></label>
          <input type="range" id="vignette-darkness" min="0" max="1" step="0.05" value="${this.currentConfig.vignette.darkness}">
        </div>
      </div>

      <div class="pp-divider" style="width: 100%; height: 1px; background: rgba(0, 255, 255, 0.3);"></div>

      <!-- SCANLINES -->
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="scanlines-enabled" ${this.currentConfig.scanlines.enabled ? 'checked' : ''}>
          <span style="color: #FF00FF;">SCANLINES</span>
        </label>
        <div class="slider-group">
          <label>Density: <span id="scanlines-density-val">${this.currentConfig.scanlines.density.toFixed(1)}</span></label>
          <input type="range" id="scanlines-density" min="0.5" max="3" step="0.1" value="${this.currentConfig.scanlines.density}">
        </div>
        <div class="slider-group">
          <label>Opacity: <span id="scanlines-opacity-val">${this.currentConfig.scanlines.opacity.toFixed(2)}</span></label>
          <input type="range" id="scanlines-opacity" min="0" max="1" step="0.05" value="${this.currentConfig.scanlines.opacity}">
        </div>
      </div>

      <div class="pp-divider" style="width: 100%; height: 1px; background: rgba(0, 255, 255, 0.3);"></div>

      <!-- GLITCH -->
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="glitch-enabled" ${this.currentConfig.glitch.enabled ? 'checked' : ''}>
          <span style="color: #FF00FF;">GLITCH / DAMAGE</span>
        </label>
        <div style="font-size: 8px; color: #888; padding-left: 24px;">Triggers on player damage</div>
      </div>

      <div class="pp-divider" style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #FF00FF, transparent);"></div>

      <!-- ACTION BUTTONS -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="pp-save" style="
          background: rgba(0, 255, 0, 0.2);
          border: 2px solid #00FF00;
          color: #00FF00;
          padding: 8px;
          font-family: inherit;
          font-size: 10px;
          cursor: pointer;
          text-shadow: 0 0 8px #00FF00;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        ">SAVE SETTINGS</button>

        <button id="pp-reset" style="
          background: rgba(255, 255, 0, 0.2);
          border: 2px solid #FFFF00;
          color: #FFFF00;
          padding: 8px;
          font-family: inherit;
          font-size: 10px;
          cursor: pointer;
          text-shadow: 0 0 8px #FFFF00;
          box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
        ">RESET DEFAULTS</button>

        <button id="pp-test-glitch" style="
          background: rgba(255, 0, 255, 0.2);
          border: 2px solid #FF00FF;
          color: #FF00FF;
          padding: 8px;
          font-family: inherit;
          font-size: 10px;
          cursor: pointer;
          text-shadow: 0 0 8px #FF00FF;
          box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
        ">TEST GLITCH</button>

        <button id="pp-test-shockwave" style="
          background: rgba(0, 255, 255, 0.2);
          border: 2px solid #00FFFF;
          color: #00FFFF;
          padding: 8px;
          font-family: inherit;
          font-size: 10px;
          cursor: pointer;
          text-shadow: 0 0 8px #00FFFF;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        ">TEST SHOCK WAVE</button>
      </div>

      <style>
        #postProcessControlPanel::-webkit-scrollbar {
          width: 6px;
        }
        #postProcessControlPanel::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.5);
        }
        #postProcessControlPanel::-webkit-scrollbar-thumb {
          background: #00FFFF;
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .control-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 10px;
        }
        .control-label input[type="checkbox"] {
          width: 14px;
          height: 14px;
          cursor: pointer;
        }
        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-left: 10px;
          font-size: 8px;
          color: #AAAAAA;
        }
        .slider-group label {
          display: flex;
          justify-content: space-between;
        }
        .slider-group input[type="range"] {
          width: 100%;
          cursor: pointer;
          height: 12px;
        }
        #postProcessControlPanel button:hover {
          transform: scale(1.02);
          filter: brightness(1.2);
        }
        #postProcessControlPanel button:active {
          transform: scale(0.98);
        }
      </style>
    `
  }

  /**
   * Attach event listeners to controls
   */
  private attachEventListeners(): void {
    if (!this.container) return

    // Bloom
    this.addListener('bloom-enabled', 'change', (e) => {
      this.currentConfig.bloom.enabled = (e.target as HTMLInputElement).checked
      this.applySettings()
    })
    this.addSliderListener('bloom-intensity', 'bloom-intensity-val', (value) => {
      this.currentConfig.bloom.intensity = value
      this.applySettings()
    })
    this.addSliderListener('bloom-threshold', 'bloom-threshold-val', (value) => {
      this.currentConfig.bloom.threshold = value
      this.applySettings()
    })
    this.addSliderListener('bloom-smoothing', 'bloom-smoothing-val', (value) => {
      this.currentConfig.bloom.smoothing = value
      this.applySettings()
    })

    // Chromatic Aberration (convert from 0-10 display to 0-0.01 actual)
    this.addListener('chroma-enabled', 'change', (e) => {
      this.currentConfig.chromaticAberration.enabled = (e.target as HTMLInputElement).checked
      this.applySettings()
    })
    this.addSliderListener('chroma-intensity', 'chroma-intensity-val', (value) => {
      this.currentConfig.chromaticAberration.intensity = value / 1000 // Convert to 0-0.01 range
      this.applySettings()
    }, 1) // 1 decimal place

    // Vignette
    this.addListener('vignette-enabled', 'change', (e) => {
      this.currentConfig.vignette.enabled = (e.target as HTMLInputElement).checked
      this.applySettings()
    })
    this.addSliderListener('vignette-offset', 'vignette-offset-val', (value) => {
      this.currentConfig.vignette.offset = value
      this.applySettings()
    })
    this.addSliderListener('vignette-darkness', 'vignette-darkness-val', (value) => {
      this.currentConfig.vignette.darkness = value
      this.applySettings()
    })

    // Scanlines
    this.addListener('scanlines-enabled', 'change', (e) => {
      this.currentConfig.scanlines.enabled = (e.target as HTMLInputElement).checked
      this.applySettings()
    })
    this.addSliderListener('scanlines-density', 'scanlines-density-val', (value) => {
      this.currentConfig.scanlines.density = value
      this.applySettings()
    }, 1) // 1 decimal place
    this.addSliderListener('scanlines-opacity', 'scanlines-opacity-val', (value) => {
      this.currentConfig.scanlines.opacity = value
      this.applySettings()
    })

    // Glitch
    this.addListener('glitch-enabled', 'change', (e) => {
      this.currentConfig.glitch.enabled = (e.target as HTMLInputElement).checked
      this.applySettings()
    })

    // Save button
    this.addListener('pp-save', 'click', () => {
      PostProcessSettings.save(this.currentConfig)
      this.showNotification('SETTINGS SAVED', '#78D99A')
    })

    // Reset button
    this.addListener('pp-reset', 'click', () => {
      this.currentConfig = PostProcessSettings.reset()
      this.updateUI()
      this.applySettings()
      this.showNotification('DEFAULTS RESTORED', '#F2B56A')
    })

    // Test glitch button
    this.addListener('pp-test-glitch', 'click', () => {
      this.postProcessing.triggerGlitch(0.8, 0.5)
      this.showNotification('GLITCH TRIGGERED', '#F2B56A')
    })

    // Test shock wave button
    this.addListener('pp-test-shockwave', 'click', () => {
      // Trigger at center of screen (0, 0, 0)
      this.postProcessing.triggerShockWave(new THREE.Vector3(0, 0, 0))
      this.showNotification('SHOCK WAVE TRIGGERED', '#43DFF2')
    })
  }

  /**
   * Helper to add event listener to an element by ID
   */
  private addListener(id: string, event: string, handler: (e: Event) => void): void {
    const element = this.container?.querySelector(`#${id}`)
    if (element) {
      element.addEventListener(event, handler)
    }
  }

  /**
   * Helper to add slider listener with value display
   */
  private addSliderListener(sliderId: string, valueId: string, handler: (value: number) => void, decimals: number = 2): void {
    const slider = this.container?.querySelector(`#${sliderId}`) as HTMLInputElement
    const valueDisplay = this.container?.querySelector(`#${valueId}`)

    if (slider && valueDisplay) {
      slider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value)
        valueDisplay.textContent = value.toFixed(decimals)
        handler(value)
      })
    }
  }

  /**
   * Apply current configuration to PostProcessingManager
   */
  private applySettings(): void {
    this.postProcessing.applyConfig(this.currentConfig)
  }

  /**
   * Update UI to reflect current config
   */
  private updateUI(): void {
    if (!this.container) return

    // Update checkboxes
    this.setChecked('bloom-enabled', this.currentConfig.bloom.enabled)
    this.setChecked('chroma-enabled', this.currentConfig.chromaticAberration.enabled)
    this.setChecked('vignette-enabled', this.currentConfig.vignette.enabled)
    this.setChecked('scanlines-enabled', this.currentConfig.scanlines.enabled)
    this.setChecked('glitch-enabled', this.currentConfig.glitch.enabled)

    // Update sliders
    this.setSlider('bloom-intensity', 'bloom-intensity-val', this.currentConfig.bloom.intensity)
    this.setSlider('bloom-threshold', 'bloom-threshold-val', this.currentConfig.bloom.threshold)
    this.setSlider('bloom-smoothing', 'bloom-smoothing-val', this.currentConfig.bloom.smoothing)
    this.setSlider('chroma-intensity', 'chroma-intensity-val', this.currentConfig.chromaticAberration.intensity * 1000, 1)
    this.setSlider('vignette-offset', 'vignette-offset-val', this.currentConfig.vignette.offset)
    this.setSlider('vignette-darkness', 'vignette-darkness-val', this.currentConfig.vignette.darkness)
    this.setSlider('scanlines-density', 'scanlines-density-val', this.currentConfig.scanlines.density, 1)
    this.setSlider('scanlines-opacity', 'scanlines-opacity-val', this.currentConfig.scanlines.opacity)
  }

  /**
   * Helper to set checkbox state
   */
  private setChecked(id: string, checked: boolean): void {
    const element = this.container?.querySelector(`#${id}`) as HTMLInputElement
    if (element) element.checked = checked
  }

  /**
   * Helper to set slider value and display
   */
  private setSlider(sliderId: string, valueId: string, value: number, decimals: number = 2): void {
    const slider = this.container?.querySelector(`#${sliderId}`) as HTMLInputElement
    const valueDisplay = this.container?.querySelector(`#${valueId}`)

    if (slider) slider.value = value.toString()
    if (valueDisplay) {
      valueDisplay.textContent = value.toFixed(decimals)
    }
  }

  /**
   * Show a temporary notification
   */
  private showNotification(message: string, color: string): void {
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 3px solid ${color};
      color: ${color};
      padding: 20px 40px;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      text-shadow: 0 0 10px ${color};
      box-shadow: 0 0 30px ${color};
      z-index: 20000;
      pointer-events: none;
      animation: ppFadeInOut 1.5s ease-in-out;
    `
    notification.textContent = message

    const style = document.createElement('style')
    style.textContent = `
      @keyframes ppFadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
      }
    `
    document.head.appendChild(style)

    document.body.appendChild(notification)
    setTimeout(() => {
      notification.remove()
      style.remove()
    }, 1500)
  }

  /**
   * Update FPS counter - call every frame
   */
  updateFPS(): void {
    if (!this.fpsElement) return

    this.frameCount++
    const now = performance.now()
    const elapsed = now - this.lastFpsUpdate

    // Update every 500ms
    if (elapsed >= 500) {
      const fps = Math.round((this.frameCount * 1000) / elapsed)

      // Track FPS history for rolling average
      this.fpsHistory.push(fps)
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift()
      }

      const avgFps = Math.round(
        this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      )

      // Color code based on performance
      let color = '#00FF00' // Green for good
      if (fps < 30) {
        color = '#FF0000' // Red for bad
      } else if (fps < 50) {
        color = '#FFFF00' // Yellow for okay
      }

      this.fpsElement.style.color = color
      this.fpsElement.style.textShadow = `0 0 10px ${color}`
      this.fpsElement.style.borderColor = color
      this.fpsElement.textContent = `FPS: ${fps} (avg: ${avgFps})`

      this.frameCount = 0
      this.lastFpsUpdate = now
    }
  }
}
