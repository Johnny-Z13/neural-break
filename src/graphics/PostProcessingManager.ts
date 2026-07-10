import * as THREE from 'three'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  ScanlineEffect,
  ShockWaveEffect,
  KernelSize
} from 'postprocessing'
import { DEBUG_MODE } from '../config'
import { PostProcessSettings, PostProcessConfig } from '../config/PostProcessSettings'
import { OptionsScreen } from '../ui/screens/OptionsScreen'

/**
 * 🎨 POST-PROCESSING MANAGER 🎨
 *
 * SIMPLE & RELIABLE ARCHITECTURE:
 * - Master ON/OFF: OptionsScreen.postProcessRendering
 * - Effects: Bloom, Chromatic Aberration, Vignette
 * - Damage feedback: CSS overlay (not WebGL - more reliable)
 */
export class PostProcessingManager {
  private composer: EffectComposer | null = null
  private renderPass: RenderPass | null = null
  private effectPass: EffectPass | null = null

  // Individual effects
  private bloomEffect: BloomEffect | null = null
  private chromaticAberrationEffect: ChromaticAberrationEffect | null = null
  private vignetteEffect: VignetteEffect | null = null
  private scanlineEffect: ScanlineEffect | null = null
  private shockWaveEffect: ShockWaveEffect | null = null
  private shockWavePass: EffectPass | null = null

  // Effect configuration
  private config: PostProcessConfig

  // CSS damage overlay element
  private damageOverlay: HTMLElement | null = null

  // References
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer

  // Track if composer is ready
  private composerReady: boolean = false

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.config = PostProcessSettings.load()

    // Create CSS damage overlay
    this.createDamageOverlay()

    if (DEBUG_MODE) {
      console.log('🎨 PostProcessingManager created')
    }
  }

  /**
   * Create CSS overlay for damage feedback
   */
  private createDamageOverlay(): void {
    this.damageOverlay = document.createElement('div')
    this.damageOverlay.id = 'damage-overlay'
    this.damageOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9000;
      background: radial-gradient(ellipse at center,
        rgba(255, 0, 0, 0) 0%,
        rgba(255, 0, 0, 0.4) 70%,
        rgba(255, 0, 0, 0.8) 100%);
      opacity: 0;
      transition: opacity 0.05s ease-out;
    `
    document.body.appendChild(this.damageOverlay)
  }

  /**
   * Initialize post-processing pipeline
   */
  initialize(): void {
    if (DEBUG_MODE) console.log('🎨 Initializing PostProcessingManager...')

    try {
      // Create effect composer
      this.composer = new EffectComposer(this.renderer, {
        frameBufferType: THREE.HalfFloatType,
        multisampling: 0
      })

      // Add render pass
      this.renderPass = new RenderPass(this.scene, this.camera)
      this.composer.addPass(this.renderPass)

      // Create effects
      this.createEffects()

      // Build effect passes
      this.buildEffectPasses()

      this.composerReady = true

      if (DEBUG_MODE) {
        console.log('✅ PostProcessingManager initialized')
      }
    } catch (error) {
      console.error('❌ Failed to initialize PostProcessingManager:', error)
      this.composerReady = false
    }
  }

  /**
   * Create effects
   */
  private createEffects(): void {
    // Bloom - performant settings
    this.bloomEffect = new BloomEffect({
      intensity: this.config.bloom.intensity,
      luminanceThreshold: this.config.bloom.threshold,
      luminanceSmoothing: this.config.bloom.smoothing,
      mipmapBlur: true,
      kernelSize: KernelSize.SMALL
    })

    // Chromatic aberration
    this.chromaticAberrationEffect = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(
        this.config.chromaticAberration.intensity,
        this.config.chromaticAberration.intensity
      ),
      radialModulation: false,
      modulationOffset: 0.15
    })

    // Vignette
    this.vignetteEffect = new VignetteEffect({
      offset: this.config.vignette.offset,
      darkness: this.config.vignette.darkness,
      eskil: false
    })

    // Scanlines - CRT arcade monitor effect
    this.scanlineEffect = new ScanlineEffect({
      density: this.config.scanlines.density
    })

    // Shock wave - triggered on boss/void sphere death
    this.shockWaveEffect = new ShockWaveEffect(this.camera, new THREE.Vector3(), {
      speed: 2.0,
      maxRadius: 1.5,
      waveSize: 0.3,
      amplitude: 0.08
    })
  }

  /**
   * Build effect passes
   */
  private buildEffectPasses(): void {
    if (!this.composer || !this.camera) return

    const effects: any[] = []

    if (this.config.bloom.enabled && this.bloomEffect) {
      effects.push(this.bloomEffect)
    }
    if (this.config.chromaticAberration.enabled && this.chromaticAberrationEffect) {
      effects.push(this.chromaticAberrationEffect)
    }
    if (this.config.vignette.enabled && this.vignetteEffect) {
      effects.push(this.vignetteEffect)
    }
    if (this.config.scanlines.enabled && this.scanlineEffect) {
      effects.push(this.scanlineEffect)
    }

    if (effects.length > 0) {
      this.effectPass = new EffectPass(this.camera, ...effects)
      this.composer.addPass(this.effectPass)
      if (DEBUG_MODE) {
        console.log(`🎨 Added ${effects.length} effects: bloom=${this.config.bloom.enabled}, chroma=${this.config.chromaticAberration.enabled}, vignette=${this.config.vignette.enabled}`)
      }
    }

    // Add shock wave pass (separate so it can be triggered independently)
    if (this.shockWaveEffect) {
      this.shockWavePass = new EffectPass(this.camera, this.shockWaveEffect)
      this.composer.addPass(this.shockWavePass)
    }
  }

  /**
   * Update - called every frame
   */
  update(): void {
    // Nothing to update now that glitch is CSS-based
  }

  /**
   * Render the scene
   */
  render(deltaTime: number): void {
    const gameSettings = OptionsScreen.loadSettings()
    const usePostProcess = gameSettings.postProcessRendering &&
                          this.composerReady &&
                          this.effectPass !== null

    if (usePostProcess) {
      this.composer!.render(deltaTime)
    } else {
      this.renderer.render(this.scene, this.camera)
    }
  }

  /**
   * ⚡ TRIGGER DAMAGE EFFECT - CSS flash, no WebGL issues! ⚡
   */
  triggerGlitch(intensity: number = 0.8, duration: number = 0.3): void {
    if (!this.config.glitch.enabled || !this.damageOverlay) return

    // Flash the CSS overlay
    this.damageOverlay.style.opacity = String(intensity)

    // Fade out
    setTimeout(() => {
      if (this.damageOverlay) {
        this.damageOverlay.style.opacity = '0'
      }
    }, duration * 1000)
  }

  /**
   * 💥 TRIGGER SHOCK WAVE - Epic death effect for bosses/void spheres 💥
   */
  triggerShockWave(worldPosition: THREE.Vector3): void {
    if (!this.shockWaveEffect) return

    const gameSettings = OptionsScreen.loadSettings()
    if (!gameSettings.postProcessRendering) return

    // Set the epicenter of the shock wave
    this.shockWaveEffect.position.copy(worldPosition)

    // Explode triggers the wave animation
    this.shockWaveEffect.explode()

    if (DEBUG_MODE) {
      console.log('💥 Shock wave triggered at:', worldPosition)
    }
  }

  /**
   * Set bloom intensity
   */
  setBloomIntensity(intensity: number): void {
    if (this.bloomEffect) {
      this.bloomEffect.intensity = intensity
    }
  }

  /**
   * Pulse bloom
   */
  pulseBloom(peakIntensity: number = 2.0, duration: number = 0.5): void {
    if (!this.bloomEffect) return

    const baseIntensity = this.config.bloom.intensity
    const startTime = Date.now()

    const pulse = () => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      this.bloomEffect!.intensity = THREE.MathUtils.lerp(peakIntensity, baseIntensity, eased)

      if (progress < 1) {
        requestAnimationFrame(pulse)
      }
    }

    this.bloomEffect.intensity = peakIntensity
    requestAnimationFrame(pulse)
  }

  /**
   * Handle resize
   */
  setSize(width: number, height: number): void {
    if (this.composer) {
      this.composer.setSize(width, height)
    }
  }

  /**
   * Get config
   */
  getConfig(): PostProcessConfig {
    return { ...this.config }
  }

  /**
   * Apply runtime config
   */
  applyConfig(newConfig: PostProcessConfig): void {
    const needsRebuild =
      this.config.bloom.enabled !== newConfig.bloom.enabled ||
      this.config.chromaticAberration.enabled !== newConfig.chromaticAberration.enabled ||
      this.config.vignette.enabled !== newConfig.vignette.enabled ||
      this.config.scanlines.enabled !== newConfig.scanlines.enabled

    this.config = { ...newConfig }

    // Update effect parameters
    if (this.bloomEffect) {
      this.bloomEffect.intensity = this.config.bloom.intensity
      this.bloomEffect.luminanceMaterial.threshold = this.config.bloom.threshold
      this.bloomEffect.luminanceMaterial.smoothing = this.config.bloom.smoothing
    }

    if (this.chromaticAberrationEffect) {
      this.chromaticAberrationEffect.offset = new THREE.Vector2(
        this.config.chromaticAberration.intensity,
        this.config.chromaticAberration.intensity
      )
    }

    if (this.vignetteEffect) {
      this.vignetteEffect.uniforms.get('offset')!.value = this.config.vignette.offset
      this.vignetteEffect.uniforms.get('darkness')!.value = this.config.vignette.darkness
    }

    if (this.scanlineEffect) {
      this.scanlineEffect.density = this.config.scanlines.density
    }

    if (needsRebuild) {
      this.rebuildEffectPasses()
    }
  }

  /**
   * Rebuild passes
   */
  private rebuildEffectPasses(): void {
    if (!this.composer || !this.camera) return

    // Remove old passes except render pass
    while (this.composer.passes.length > 1) {
      this.composer.removePass(this.composer.passes[this.composer.passes.length - 1])
    }

    this.effectPass = null
    this.buildEffectPasses()
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.composer) this.composer.dispose()
    if (this.bloomEffect) this.bloomEffect.dispose()
    if (this.chromaticAberrationEffect) this.chromaticAberrationEffect.dispose()
    if (this.vignetteEffect) this.vignetteEffect.dispose()
    if (this.scanlineEffect) this.scanlineEffect.dispose()
    if (this.shockWaveEffect) this.shockWaveEffect.dispose()
    if (this.damageOverlay) this.damageOverlay.remove()
  }
}
