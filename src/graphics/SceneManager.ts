import * as THREE from 'three'
import { EffectsSystem } from './EffectsSystem'
import { AudioVisualReactiveSystem } from './AudioVisualReactiveSystem'
import { EnergyBarrier } from './EnergyBarrier'
import { PostProcessingManager } from './PostProcessingManager'
import { DEBUG_MODE } from '../config'

export class SceneManager {
  private scene!: THREE.Scene
  private camera!: THREE.OrthographicCamera
  private renderer!: THREE.WebGLRenderer
  private canvas: HTMLCanvasElement
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private cameraLerpSpeed: number = 5.0
  private shakeIntensity: number = 0
  private shakeDuration: number = 0
  private shakeDecay: number = 0.9
  
  // 🔘 ENERGY BARRIER 🔘
  private energyBarrier!: EnergyBarrier
  
  // 💎 BACKGROUND GRID - For dynamic color updates! 💎
  private backgroundGrid: THREE.GridHelper | null = null
  
  // 🎬 MOTION GRAPHICS - Dynamic Camera Zoom! 🎬
  private baseFrustumSize: number = 30 // More zoomed out default
  private currentFrustumSize: number = 30
  private targetFrustumSize: number = 30
  private zoomLerpSpeed: number = 3.0
  private minZoom: number = 24 // Zoomed in 
  private maxZoom: number = 45 // Zoomed out
  private gameplayIntensity: number = 0 // 0-1, affects zoom
  private enemyCount: number = 0
  private comboCount: number = 0
  
  // 🎬 SCREEN TRANSITION STATE 🎬
  private isTransitioning: boolean = false
  private transitionProgress: number = 0
  private transitionDuration: number = 0.8
  private transitionType: 'fade' | 'zoom' | 'slide' | 'particle' = 'fade'
  
  // 🌟 SUPER CRAZY EFFECTS! 🌟
  private backgroundParticles!: THREE.Points
  private neuralLines: THREE.Line[] = []
  private dataStreams: THREE.Line[] = []
  private glitchEffect!: THREE.Mesh
  private chromaticAberration: number = 0
  private bloomPulse: number = 0
  private timeOffset: number = 0
  
  // ✨ COSMIC STARFIELD ✨
  private cosmicStarfield: THREE.Points | null = null
  private starfieldVelocities: Float32Array | null = null
  private starfieldSpeedLayers: Float32Array | null = null  // Parallax depth layers (0-1, higher = faster/closer)
  
  // 🚀 SUPER JUICY EFFECTS SYSTEM! 🚀
  private effectsSystem!: EffectsSystem

  // 🎨🎵 AUDIO-VISUAL REACTIVE SYSTEM! 🎵🎨
  private audioVisualSystem!: AudioVisualReactiveSystem

  // 🎨 POST-PROCESSING SYSTEM! 🎨
  private postProcessing: PostProcessingManager | null = null

  constructor() {
    // Get canvas element - ensure DOM is ready
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
    if (!this.canvas) {
      console.error('❌ Canvas element not found! Make sure index.html has <canvas id="gameCanvas"></canvas>')
      throw new Error('Canvas element not found')
    }
    if (DEBUG_MODE) console.log('✅ Canvas element found:', this.canvas)
  }

  async initialize(): Promise<void> {
    console.log('🎬 Initializing SceneManager...')
    
    // Create scene
    this.scene = new THREE.Scene()
    // Remove solid background so starfield is visible - use renderer clear color instead
    this.scene.background = null
    console.log('✅ Scene created')

    // Create orthographic camera for top-down view
    // Get size from game container if available, otherwise use window
    const initContainer = document.getElementById('gameContainer')
    const initWidth = initContainer ? initContainer.clientWidth : window.innerWidth
    const initHeight = initContainer ? initContainer.clientHeight : window.innerHeight
    const aspect = (initWidth || window.innerWidth) / (initHeight || window.innerHeight)
    this.baseFrustumSize = 30 // More zoomed out default
    this.currentFrustumSize = this.baseFrustumSize
    this.targetFrustumSize = this.baseFrustumSize
    this.camera = new THREE.OrthographicCamera(
      this.baseFrustumSize * aspect / -2,
      this.baseFrustumSize * aspect / 2,
      this.baseFrustumSize / 2,
      this.baseFrustumSize / -2,
      0.1,
      1000
    )
    this.camera.position.set(0, 0, 10)
    this.camera.lookAt(0, 0, 0)
    console.log('✅ Camera created:', this.camera.position)

    // Create renderer with CRAZY SETTINGS! 🔥
    // 🎨 POST-PROCESSING OPTIMIZED: No antialias (handled by post-processing)
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: false, // Disabled for post-processing performance
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,  // Not needed for our effects
        depth: true      // Needed for proper rendering
      })
      // Get size from game container if available, otherwise use window
      const gameContainer = document.getElementById('gameContainer')
      const width = gameContainer ? gameContainer.clientWidth : window.innerWidth
      const height = gameContainer ? gameContainer.clientHeight : window.innerHeight
      this.renderer.setSize(width || window.innerWidth, height || window.innerHeight)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      this.renderer.setClearColor(0x04040e, 1) // Deep purple-blue background (darkened 12%)
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping
      this.renderer.toneMappingExposure = 1.5 // More intense!
      
      // Enable shadows
      // 🎯 PERFORMANCE: Disable shadow maps - not needed for 2D top-down game
      this.renderer.shadowMap.enabled = false
      // this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      
      console.log('✅ Renderer created and configured:', {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: this.renderer.getPixelRatio()
      })
    } catch (error) {
      console.error('❌ Failed to create WebGL renderer:', error)
      throw error
    }

    // Add cyberpunk lighting
    this.setupLighting()
    console.log('✅ Lighting setup complete')
    
    // Add neural network background
    this.setupBackground()
    console.log('✅ Background setup complete')
    
    // 🔥 Setup SUPER CRAZY EFFECTS! 🔥
    this.setupCrazyEffects()
    console.log('✅ Effects setup complete')
    
    // Initialize SUPER JUICY effects system
    this.effectsSystem = new EffectsSystem(this.scene)
    console.log('✅ EffectsSystem initialized')
    
    // 🎨🎵 Initialize AUDIO-VISUAL REACTIVE SYSTEM! 🎵🎨
    this.audioVisualSystem = new AudioVisualReactiveSystem(this.scene, this.effectsSystem)
    console.log('✅ AudioVisualSystem initialized')

    // Register all lights for reactivity
    this.scene.traverse((object) => {
      if (object instanceof THREE.Light) {
        this.audioVisualSystem.registerLight(object)
      }
    })

    // 🎨 Initialize POST-PROCESSING! 🎨
    this.postProcessing = new PostProcessingManager(this.scene, this.camera, this.renderer)
    this.postProcessing.initialize() // Actually create the effect passes
    console.log('✅ PostProcessingManager initialized')

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize())
    
    // Do an initial render to ensure everything is visible
    this.render()
    console.log('✅ Initial render complete')
    
    // Ensure canvas is visible and on top (but below UI)
    if (this.canvas) {
      this.canvas.style.display = 'block'
      this.canvas.style.visibility = 'visible'
      this.canvas.style.opacity = '1'
      this.canvas.style.zIndex = '1'
      this.canvas.style.position = 'fixed'
      this.canvas.style.top = '0'
      this.canvas.style.left = '0'
      
      const canvasStyle = window.getComputedStyle(this.canvas)
      console.log('📊 Canvas visibility check:', {
        display: canvasStyle.display,
        visibility: canvasStyle.visibility,
        opacity: canvasStyle.opacity,
        width: canvasStyle.width,
        height: canvasStyle.height,
        zIndex: canvasStyle.zIndex
      })
      console.log('✅ SceneManager initialization complete. Scene has', this.scene.children.length, 'objects')
    } else {
      console.error('❌ Canvas element is null!')
    }
  }

  private setupLighting(): void {
    // Ambient light with deep purple tint - MORE INTENSE! 
    const ambientLight = new THREE.AmbientLight(0x170933, 0.35)
    this.scene.add(ambientLight)

    // Main directional light - purple-cyan glow!
    const directionalLight = new THREE.DirectionalLight(0x8844FF, 1.2)
    directionalLight.position.set(0, 0, 5)
    // 🎯 PERFORMANCE: Shadows disabled for 2D game
    directionalLight.castShadow = false
    this.scene.add(directionalLight)

    // Add CRAZY atmospheric point lights that MOVE! - Deep purple-blue tones
    const pointLight1 = new THREE.PointLight(0x6622CC, 0.7, 50)
    pointLight1.position.set(10, 10, 2)
    // 🎯 PERFORMANCE: Shadows disabled
    pointLight1.castShadow = false
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0x2244AA, 0.5, 30)
    pointLight2.position.set(-8, -5, 2)
    // 🎯 PERFORMANCE: Shadows disabled
    pointLight2.castShadow = false
    this.scene.add(pointLight2)
    
    // NEW: Pulsing accent lights - magenta and deep blue
    const accentLight1 = new THREE.PointLight(0xCC0088, 0.4, 25)
    accentLight1.position.set(15, -10, 3)
    this.scene.add(accentLight1)
    
    const accentLight2 = new THREE.PointLight(0x4400AA, 0.35, 20)
    accentLight2.position.set(-12, 8, 3)
    this.scene.add(accentLight2)
  }

  private setupBackground(): void {
    // Create bounded world - 9 screen spaces (3x3 grid)
    // Each screen is roughly 20x20 units, so total world is 60x60
    const worldSize = 60
    
    // 💎 GRID REMOVED - Clean background! 💎
    // Grid was removed per user request
    this.backgroundGrid = null

    // 🔘 Create circular energy barrier 🔘
    this.energyBarrier = new EnergyBarrier(worldSize / 2)
    this.scene.add(this.energyBarrier.getMesh())

    // 🎯 Ensure barrier is visible and correctly positioned
    this.energyBarrier.getMesh().position.z = -0.5
    console.log('✅ Energy Barrier created and added to scene')

    // Add floating data particles within bounds
    this.createDataParticles(worldSize)
    
    // Add neural pathway lines within bounds
    this.createNeuralPathways(worldSize)
    
    // ✨ Add subtle cosmic starfield in deep background ✨
    this.createCosmicStarfield()
  }

  private createDataParticles(worldSize: number): void {
    const particleCount = 500 // MORE PARTICLES!
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      // Random positions within world bounds
      positions[i3] = (Math.random() - 0.5) * worldSize * 0.9
      positions[i3 + 1] = (Math.random() - 0.5) * worldSize * 0.9
      positions[i3 + 2] = Math.random() * 5 - 2

      // RAINBOW COLORS! 🌈
      const hue = Math.random()
      const color = new THREE.Color().setHSL(hue, 0.8, 0.7)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
      
      // Varying sizes
      sizes[i] = Math.random() * 0.2 + 0.05
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
    })

    this.backgroundParticles = new THREE.Points(geometry, material)
    this.scene.add(this.backgroundParticles)
  }

  private createNeuralPathways(worldSize: number): void {
    // Create flowing neural pathway lines within bounds - MORE OF THEM!
    const pathwayCount = 12 // Double the pathways!
    const maxRadius = worldSize * 0.4
    
    for (let i = 0; i < pathwayCount; i++) {
      const points: THREE.Vector3[] = []
      const segments = 30 // More segments for smoother curves
      
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const angle = (i / pathwayCount) * Math.PI * 2
        const radius = maxRadius * 0.5 + Math.sin(t * Math.PI * 4) * maxRadius * 0.4
        
        points.push(new THREE.Vector3(
          Math.cos(angle + t * 0.8) * radius,
          Math.sin(angle + t * 0.8) * radius,
          Math.sin(t * Math.PI * 6) * 2 // Add Z variation
        ))
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      
      // RAINBOW NEURAL PATHWAYS! 🌈
      const hue = i / pathwayCount
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6)
      
      const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      })
      
      const line = new THREE.Line(geometry, material)
      this.neuralLines.push(line)
      this.scene.add(line)
    }
  }

  private createCosmicStarfield(): void {
    // ✨ COSMIC STARFIELD - Parallax background stars with depth layers ✨
    console.log('🌌 Creating cosmic starfield with parallax layers...')
    
    const starCount = 500  // More stars for better parallax effect
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    this.starfieldVelocities = new Float32Array(starCount * 2)
    this.starfieldSpeedLayers = new Float32Array(starCount)  // Parallax depth

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3
      const i2 = i * 2
      
      // Assign to a depth layer (affects speed and appearance)
      // Layer 0: Far background (slow, dim, small)
      // Layer 1: Mid background (medium speed and size)
      // Layer 2: Near foreground (fast, bright, large)
      const layerRoll = Math.random()
      let depthLayer: number
      let brightness: number
      let starSize: number
      
      if (layerRoll < 0.5) {
        // 50% - Far background layer (slow stars)
        depthLayer = 0.2 + Math.random() * 0.2  // 0.2-0.4 speed multiplier
        brightness = 0.2 + Math.random() * 0.2  // Dim
        starSize = 0.4 + Math.random() * 0.4    // Small
      } else if (layerRoll < 0.8) {
        // 30% - Mid layer (medium speed)
        depthLayer = 0.5 + Math.random() * 0.2  // 0.5-0.7 speed multiplier
        brightness = 0.4 + Math.random() * 0.3  // Medium brightness
        starSize = 0.8 + Math.random() * 0.8    // Medium size
      } else if (layerRoll < 0.95) {
        // 15% - Near layer (fast stars)
        depthLayer = 0.8 + Math.random() * 0.15 // 0.8-0.95 speed multiplier
        brightness = 0.6 + Math.random() * 0.3  // Bright
        starSize = 1.5 + Math.random() * 1.5    // Large
      } else {
        // 5% - Very close "streaker" stars (very fast!)
        depthLayer = 1.0 + Math.random() * 0.5  // 1.0-1.5 speed multiplier
        brightness = 0.9 + Math.random() * 0.1  // Very bright
        starSize = 2.5 + Math.random() * 2.0    // Extra large
      }
      
      this.starfieldSpeedLayers[i] = depthLayer
      
      // Spread stars across visible area (wider for scrolling)
      positions[i3] = (Math.random() - 0.5) * 120     // X position (wider)
      positions[i3 + 1] = (Math.random() - 0.5) * 150 // Y position (taller for scrolling)
      positions[i3 + 2] = -2 - (1 - depthLayer) * 2   // Z depth based on layer

      // Colors - closer stars slightly warmer, distant stars cooler
      colors[i3] = brightness
      colors[i3 + 1] = brightness
      colors[i3 + 2] = brightness + 0.1 * (1 - depthLayer) // Distant = more blue
      
      sizes[i] = starSize
      
      // Initial velocities (will be updated based on mode)
      this.starfieldVelocities[i2] = (Math.random() - 0.5) * 0.2
      this.starfieldVelocities[i2 + 1] = (Math.random() - 0.5) * 0.2
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 3.0,  // Doubled from 1.5 for 100% larger stars
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthTest: false,
      depthWrite: false
    })

    this.cosmicStarfield = new THREE.Points(geometry, material)
    this.cosmicStarfield.renderOrder = -1000
    this.scene.add(this.cosmicStarfield)
    
    console.log('🌌 Starfield created with', starCount, 'stars')
  }

  // 🔥 SUPER CRAZY EFFECTS METHOD! 🔥
  private setupCrazyEffects(): void {
    // Create data streams flowing across the screen
    this.createDataStreams()
    
    // Create glitch overlay effect
    this.createGlitchEffect()
    
    // Create holographic scanlines
    this.createScanlines()
  }

  private createDataStreams(): void {
    const streamCount = 8
    
    for (let i = 0; i < streamCount; i++) {
      const points: THREE.Vector3[] = []
      const segments = 50
      
      // Create flowing data stream paths
      for (let j = 0; j < segments; j++) {
        const t = j / segments
        const x = -30 + t * 60 // Flow across entire screen
        const y = -20 + (i / streamCount) * 40 + Math.sin(t * Math.PI * 3) * 5
        const z = Math.cos(t * Math.PI * 2) * 1
        
        points.push(new THREE.Vector3(x, y, z))
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const hue = (i / streamCount + 0.5) % 1
      const color = new THREE.Color().setHSL(hue, 1.0, 0.5)
      
      const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      })
      
      const stream = new THREE.Line(geometry, material)
      this.dataStreams.push(stream)
      this.scene.add(stream)
    }
  }

  private createGlitchEffect(): void {
    // Create a subtle glitch overlay
    const geometry = new THREE.PlaneGeometry(100, 100)
    const material = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.02,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    
    this.glitchEffect = new THREE.Mesh(geometry, material)
    this.glitchEffect.position.z = 5 // Move in front of game objects, behind camera
    this.scene.add(this.glitchEffect)
  }

  private createScanlines(): void {
    // Create horizontal scanlines for that retro feel - deep purple
    const lineCount = 20
    
    for (let i = 0; i < lineCount; i++) {
      const points = [
        new THREE.Vector3(-50, -25 + (i / lineCount) * 50, 0.1),
        new THREE.Vector3(50, -25 + (i / lineCount) * 50, 0.1)
      ]
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: 0x1c0738, // darkened 12%
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending
      })
      
      const scanline = new THREE.Line(geometry, material)
      this.scene.add(scanline)
    }
  }

  addToScene(object: THREE.Object3D): void {
    if (!object) {
      console.error('❌ Cannot add null object to scene!')
      return
    }
    
    console.log('➕ Adding object to scene:', {
      type: object.constructor.name,
      position: object.position.clone(),
      visible: object.visible,
      children: object.children.length,
      sceneChildrenBefore: this.scene.children.length
    })
    
    // Ensure object is at z=0 for top-down view
    if (object.position) {
      object.position.z = 0
    }
    
    // Ensure object is visible
    object.visible = true
    
    this.scene.add(object)
    
    console.log('✅ Object added. Scene now has', this.scene.children.length, 'children')
    
    // Verify it was added
    if (!this.scene.children.includes(object)) {
      console.error('❌ WARNING: Object was not added to scene!')
    }
  }

  removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object)
  }

  update(deltaTime: number): void {
    this.timeOffset += deltaTime
    
    // 🎬 UPDATE SCREEN TRANSITIONS 🎬
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / this.transitionDuration
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1
        this.isTransitioning = false
      }
      this.updateTransition(deltaTime)
    }
    
    // 🎬 UPDATE DYNAMIC CAMERA ZOOM 🎬
    this.updateDynamicZoom(deltaTime)
    
    // Update screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= deltaTime
      this.shakeIntensity *= this.shakeDecay
      
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0
      }
    }
    
    // Calculate shake offset with EXTRA CHAOS!
    const shakeX = this.shakeIntensity * (Math.random() - 0.5) * 3
    const shakeY = this.shakeIntensity * (Math.random() - 0.5) * 3
    
    // Add chromatic aberration during intense shake
    this.chromaticAberration = this.shakeIntensity * 2
    
    // 🔘 UPDATE ENERGY BARRIER 🔘
    if (this.energyBarrier) {
      this.energyBarrier.update(deltaTime)
    }
    
    // ✨ UPDATE COSMIC STARFIELD - Subtle slow drift ✨
    this.updateCosmicStarfield(deltaTime)
    
    // Smoothly move camera towards target with shake
    this.camera.position.x = THREE.MathUtils.lerp(
      this.camera.position.x, 
      this.cameraTarget.x + shakeX, 
      this.cameraLerpSpeed * deltaTime
    )
    this.camera.position.y = THREE.MathUtils.lerp(
      this.camera.position.y, 
      this.cameraTarget.y + shakeY, 
      this.cameraLerpSpeed * deltaTime
    )
    
    // 🔥 UPDATE ALL THE CRAZY EFFECTS! 🔥
    this.updateCrazyEffects(deltaTime)
    
    // Update SUPER JUICY effects system
    this.effectsSystem.update(deltaTime)
    
    // 🎨🎵 UPDATE AUDIO-VISUAL REACTIVE SYSTEM! 🎵🎨
    this.audioVisualSystem.update(deltaTime)

    // 🎨 UPDATE POST-PROCESSING! 🎨
    if (this.postProcessing) {
      this.postProcessing.update()
    }

    // Apply screen shake from effects system
    const effectsShake = this.effectsSystem.getScreenShakeAmount()
    if (effectsShake > 0) {
      const effectsShakeX = effectsShake * (Math.random() - 0.5) * 2
      const effectsShakeY = effectsShake * (Math.random() - 0.5) * 2
      this.camera.position.x += effectsShakeX
      this.camera.position.y += effectsShakeY
    }
  }
  
  // 🎨🎵 GET AUDIO-VISUAL SYSTEM - For external access! 🎵🎨
  getAudioVisualSystem(): AudioVisualReactiveSystem {
    return this.audioVisualSystem
  }

  private updateCrazyEffects(deltaTime: number): void {
    const time = this.timeOffset
    
    // 🎨 GET GAMEPLAY INTENSITY - For reactive effects! 🎨
    const intensity = this.audioVisualSystem.getGameplayIntensity()
    const bgColor = this.audioVisualSystem.getCurrentBackgroundColor()
    
    // Animate background particles with AUDIO-REACTIVE movement!
    if (this.backgroundParticles) {
      const positions = this.backgroundParticles.geometry.attributes.position.array as Float32Array
      const colors = this.backgroundParticles.geometry.attributes.color.array as Float32Array
      const particleCount = positions.length / 3
      
      // 🎵 INTENSITY-BOOSTED SWIRLING - More intense when gameplay is hot! 🎵
      const swirlSpeed = 1.0 + intensity * 2.0 // Speed up with intensity
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        
        // Swirling motion - FASTER with intensity!
        positions[i3] += Math.sin(time * 2 * swirlSpeed + i * 0.1) * 0.02 * (1 + intensity)
        positions[i3 + 1] += Math.cos(time * 1.5 * swirlSpeed + i * 0.1) * 0.02 * (1 + intensity)
        positions[i3 + 2] += Math.sin(time * 3 * swirlSpeed + i * 0.05) * 0.01 * (1 + intensity)
        
        // 🎨 STATIC DARK COLOR - Only react to background, no ambient pulse! 🎨
        // Use the base background color only - no automatic color shifting!
        const reactiveColor = bgColor.clone()
        // Keep colors very dim to avoid ambient glow
        reactiveColor.multiplyScalar(0.3) // Dim particles to 30% of background color
        
        colors[i3] = reactiveColor.r
        colors[i3 + 1] = reactiveColor.g
        colors[i3 + 2] = reactiveColor.b
      }
      
      this.backgroundParticles.geometry.attributes.position.needsUpdate = true
      this.backgroundParticles.geometry.attributes.color.needsUpdate = true
      
      // Rotate the entire particle system - FASTER with intensity!
      this.backgroundParticles.rotation.z += deltaTime * (0.1 + intensity * 0.3)
    }
    
    // 🎨 Animate neural pathways - ONLY intensity reactive, no ambient pulse! 🎨
    for (let i = 0; i < this.neuralLines.length; i++) {
      const line = this.neuralLines[i]
      const material = line.material as THREE.LineBasicMaterial
      
      // 💫 ONLY react to intensity, NO automatic pulsing! 💫
      material.opacity = 0.15 * intensity // Only visible when there's action
      
      // 🎨 STATIC COLOR - Only react to background, no ambient cycling! 🎨
      const reactiveColor = bgColor.clone()
      reactiveColor.multiplyScalar(0.5) // Dim to 50%
      material.color.copy(reactiveColor)
      
      // 🌪️ FASTER ROTATION with intensity! 🌪️
      line.rotation.z += deltaTime * (0.2 + i * 0.05) * (1 + intensity * 1.5)
    }
    
    // 🎵 Animate data streams - ONLY intensity reactive! 🎵
    for (let i = 0; i < this.dataStreams.length; i++) {
      const stream = this.dataStreams[i]
      const material = stream.material as THREE.LineBasicMaterial
      
      // 💫 ONLY react to intensity, NO automatic pulsing! 💫
      material.opacity = 0.1 * intensity // Only visible during action
      
      // 🎨 STATIC COLOR - Only use background color! 🎨
      const reactiveColor = bgColor.clone()
      reactiveColor.multiplyScalar(0.4) // Dim to 40%
      material.color.copy(reactiveColor)
      
      // 🌪️ FASTER MOVEMENT with intensity! 🌪️
      const moveSpeed = 1.0 + intensity * 1.5
      stream.position.x = Math.sin(time * 0.5 * moveSpeed + i) * 2
      stream.position.y = Math.cos(time * 0.3 * moveSpeed + i) * 1
    }
    
    // Animate glitch effect - DISABLED ambient glitches, only intensity-based
    if (this.glitchEffect) {
      const material = this.glitchEffect.material as THREE.MeshBasicMaterial
      
      // Only glitch during high intensity, NO random ambient flashes
      if (intensity > 0.7 && Math.random() < 0.01) { // Only during action
        material.opacity = 0.05 * intensity
        material.color.copy(bgColor)
      } else {
        material.opacity *= 0.9 // Fade out
      }
      
      // Slight rotation
      this.glitchEffect.rotation.z = Math.sin(time * 5) * 0.01
    }
    
    // Update bloom pulse
    this.bloomPulse = Math.sin(time * 3) * 0.5 + 1
    this.renderer.toneMappingExposure = 1.5 + this.bloomPulse * 0.3
    
    // Update lighting for extra drama
    const lights = this.scene.children.filter(child => child instanceof THREE.PointLight)
    lights.forEach((light, index) => {
      if (light instanceof THREE.PointLight) {
        light.intensity = light.userData.baseIntensity || light.intensity
        light.intensity *= (1 + Math.sin(time * (2 + index) + index) * 0.3)
        
        // Store base intensity for first time
        if (!light.userData.baseIntensity) {
          light.userData.baseIntensity = light.intensity / (1 + Math.sin(time * (2 + index) + index) * 0.3)
        }
      }
    })
  }

  private updateCosmicStarfield(deltaTime: number): void {
    // ✨ UPDATE COSMIC STARFIELD - Mode-specific behavior ✨
    if (this.cosmicStarfield && this.starfieldVelocities && this.starfieldSpeedLayers) {
      const positions = this.cosmicStarfield.geometry.attributes.position.array as Float32Array
      const starCount = positions.length / 3

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3
        const i2 = i * 2
        
        // Apply velocity (includes parallax speed for attract mode)
        positions[i3] += this.starfieldVelocities[i2] * deltaTime
        positions[i3 + 1] += this.starfieldVelocities[i2 + 1] * deltaTime

        // Mode-specific wrapping behavior
        if (this.starfieldMode === 'attract') {
          // 🎮 ATTRACT MODE: Radial star tunnel - respawn at center when off-screen
          const maxDist = 60  // Maximum distance from center
          
          const starX = positions[i3]
          const starY = positions[i3 + 1]
          const distFromCenter = Math.sqrt(starX * starX + starY * starY)
          
          // When star goes too far, respawn near center
          if (distFromCenter > maxDist) {
            // Respawn near center with slight random offset
            const spawnDist = 0.5 + Math.random() * 2.0  // 0.5-2.5 units from center
            const spawnAngle = Math.random() * Math.PI * 2
            positions[i3] = Math.cos(spawnAngle) * spawnDist
            positions[i3 + 1] = Math.sin(spawnAngle) * spawnDist
            
            // Recalculate velocity for new position (radial outward)
            const newAngle = Math.atan2(positions[i3 + 1], positions[i3])
            const speedLayer = this.starfieldSpeedLayers[i]
            const baseSpeed = 3.0 + Math.random() * 6.0
            const parallaxSpeed = baseSpeed * speedLayer
            this.starfieldVelocities[i2] = Math.cos(newAngle) * parallaxSpeed
            this.starfieldVelocities[i2 + 1] = Math.sin(newAngle) * parallaxSpeed
          }
        } else {
          // 🎮 ARCADE/TEST MODE: Fixed-position wrapping (no camera tracking)
          const wrapX = 50
          const wrapY = 40  // Smaller bounds for centered view
          
          // Simple wrapping around fixed origin (0, 0)
          if (positions[i3] > wrapX) positions[i3] = -wrapX
          if (positions[i3] < -wrapX) positions[i3] = wrapX
          if (positions[i3 + 1] > wrapY) positions[i3 + 1] = -wrapY
          if (positions[i3 + 1] < -wrapY) positions[i3 + 1] = wrapY
        }
      }
      
      // Mark positions as needing update
      this.cosmicStarfield.geometry.attributes.position.needsUpdate = true
      
      // Subtle twinkle effect
      const material = this.cosmicStarfield.material as THREE.PointsMaterial
      material.opacity = 0.55 + Math.sin(this.timeOffset * 0.5) * 0.1
    }
    
    // 💫 SHOOTING STARS - Disabled for now 💫
    // this.updateShootingStars(deltaTime)
  }
  
  /* 💫 SHOOTING STARS - DISABLED FOR NOW 💫
  private updateShootingStars(deltaTime: number): void {
    // Spawn new shooting stars occasionally
    this.shootingStarTimer += deltaTime
    if (this.shootingStarTimer >= this.shootingStarInterval) {
      this.spawnShootingStar()
      this.shootingStarTimer = 0
      this.shootingStarInterval = 3 + Math.random() * 5 // 3-8 seconds until next
    }
    
    // Update existing shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i]
      
      // Move the shooting star
      star.position.x += star.velocity.x * deltaTime
      star.position.y += star.velocity.y * deltaTime
      star.life -= deltaTime
      
      // Update mesh position
      star.mesh.position.copy(star.position)
      
      // Fade out as life decreases
      const material = star.mesh.material as THREE.MeshBasicMaterial
      material.opacity = Math.max(0, star.life / star.maxLife) * 0.8
      
      // Update trail
      if (star.trail) {
        const trailPositions = star.trail.geometry.attributes.position.array as Float32Array
        // Shift trail positions
        for (let j = trailPositions.length - 3; j >= 3; j -= 3) {
          trailPositions[j] = trailPositions[j - 3]
          trailPositions[j + 1] = trailPositions[j - 2]
          trailPositions[j + 2] = trailPositions[j - 1]
        }
        // Set head position
        trailPositions[0] = star.position.x
        trailPositions[1] = star.position.y
        trailPositions[2] = star.position.z
        star.trail.geometry.attributes.position.needsUpdate = true
        
        // Fade trail
        const trailMaterial = star.trail.material as THREE.LineBasicMaterial
        trailMaterial.opacity = Math.max(0, star.life / star.maxLife) * 0.5
      }
      
      // Remove dead shooting stars
      if (star.life <= 0) {
        this.scene.remove(star.mesh)
        if (star.trail) this.scene.remove(star.trail)
        this.shootingStars.splice(i, 1)
      }
    }
  }
  
  private spawnShootingStar(): void {
    // Random starting position at edge of visible area
    const side = Math.floor(Math.random() * 4) // 0=top, 1=right, 2=bottom, 3=left
    let x: number, y: number, vx: number, vy: number
    
    const speed = 25 + Math.random() * 20 // Fast!
    const angle = Math.random() * Math.PI * 0.4 - Math.PI * 0.2 // Slight angle variation
    
    switch (side) {
      case 0: // From top
        x = (Math.random() - 0.5) * 60
        y = 35
        vx = Math.sin(angle) * speed * 0.3
        vy = -speed
        break
      case 1: // From right
        x = 45
        y = (Math.random() - 0.5) * 60
        vx = -speed
        vy = Math.sin(angle) * speed * 0.3
        break
      case 2: // From bottom
        x = (Math.random() - 0.5) * 60
        y = -35
        vx = Math.sin(angle) * speed * 0.3
        vy = speed
        break
      default: // From left
        x = -45
        y = (Math.random() - 0.5) * 60
        vx = speed
        vy = Math.sin(angle) * speed * 0.3
    }
    
    // Create shooting star mesh (small bright point)
    const geometry = new THREE.CircleGeometry(0.3, 8)
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, -1.5)
    mesh.renderOrder = -500
    this.scene.add(mesh)
    
    // Create trail
    const trailLength = 15
    const trailPoints: THREE.Vector3[] = []
    for (let i = 0; i < trailLength; i++) {
      trailPoints.push(new THREE.Vector3(x, y, -1.5))
    }
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints)
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xCCDDFF,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    })
    const trail = new THREE.Line(trailGeometry, trailMaterial)
    trail.renderOrder = -501
    this.scene.add(trail)
    
    this.shootingStars.push({
      position: new THREE.Vector3(x, y, -1.5),
      velocity: new THREE.Vector3(vx, vy, 0),
      life: 1.5 + Math.random() * 0.5,
      maxLife: 1.5 + Math.random() * 0.5,
      mesh,
      trail
    })
  }
  END SHOOTING STARS */

  setCameraTarget(position: THREE.Vector3): void {
    this.cameraTarget.set(position.x, position.y, 10) // Keep camera at fixed Z distance
    console.log('📷 Camera target set to:', this.cameraTarget.clone())
  }

  // SUPER JUICY screen shake method with EXTRA EFFECTS! 🔥
  addScreenShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity)
    this.shakeDuration = Math.max(this.shakeDuration, duration)
    
    // Also add to effects system for additional juice
    this.effectsSystem.addScreenShake(intensity, duration)
    
    // Add extra visual effects during intense shakes
    if (intensity > 0.3) {
      // Flash the screen
      if (this.glitchEffect) {
        const material = this.glitchEffect.material as THREE.MeshBasicMaterial
        material.opacity = intensity * 0.3
        material.color.setHSL(Math.random(), 1.0, 0.8)
      }
      
      // Boost lighting intensity
      const lights = this.scene.children.filter(child => child instanceof THREE.PointLight)
      lights.forEach(light => {
        if (light instanceof THREE.PointLight) {
          light.intensity *= (1 + intensity)
        }
      })
      
      // Add chromatic aberration
      this.chromaticAberration += intensity * 3
      
      // Add distortion wave effect
      this.effectsSystem.addDistortionWave(new THREE.Vector3(0, 0, 0), intensity)
    }
  }

  // 💎 UPDATE GRID COLORS BASED ON PLAYER STATE 💎
  updateGridColors(playerHealth: number, maxHealth: number, isInvulnerable: boolean): void {
    if (!this.backgroundGrid) return
    
    // GridHelper is a LineSegments with LineBasicMaterial
    const material = this.backgroundGrid.material as THREE.LineBasicMaterial
    if (!material || !material.color) return
    
    if (isInvulnerable) {
      // 🟢 GREEN GLOW - Invulnerable state!
      const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.5 // Pulsing intensity
      material.color.setHex(0x00FF00) // Bright green
      material.opacity = 0.5 + pulse * 0.3 // Pulsing opacity
    } else {
      const healthPercent = playerHealth / maxHealth
      
      if (healthPercent <= 0.25) {
        // 🔴 RED GLOW - Low health warning!
        const pulse = 0.5 + Math.sin(Date.now() * 0.015) * 0.5 // Faster pulse for urgency
        material.color.setHex(0xFF0000) // Danger red
        material.opacity = 0.5 + pulse * 0.4 // Strong pulsing
      } else if (healthPercent <= 0.5) {
        // 🟡 YELLOW TINT - Medium health
        const lerpFactor = (healthPercent - 0.25) / 0.25 // 0 to 1 as health goes from 25% to 50%
        const r = 1.0 // Red channel
        const g = 0.5 + lerpFactor * 0.5 // Green channel interpolates from 0.5 to 1.0
        const b = 0.0 // Blue channel
        material.color.setRGB(r, g, b)
        material.opacity = 0.6
      } else {
        // 💜 NORMAL - Purple-blue tones (original color - use the center line color)
        material.color.setHex(0x250e46) // Purple-blue
        material.opacity = 1.0
      }
    }
  }

  render(): void {
    if (!this.renderer) {
      console.error('❌ Cannot render: renderer is null')
      return
    }
    if (!this.scene) {
      console.error('❌ Cannot render: scene is null')
      return
    }
    if (!this.camera) {
      console.error('❌ Cannot render: camera is null')
      return
    }

    // Debug: Log scene info periodically (every 2 seconds)
    if (Math.random() < 0.001) { // More frequent for debugging
      console.log('🎬 Scene render debug:', {
        sceneChildren: this.scene.children.length,
        cameraPosition: this.camera.position.clone(),
        cameraTarget: this.cameraTarget.clone(),
        cameraLeft: this.camera.left,
        cameraRight: this.camera.right,
        cameraTop: this.camera.top,
        cameraBottom: this.camera.bottom,
        cameraNear: this.camera.near,
        cameraFar: this.camera.far
      })

      // Count visible objects
      const visibleObjects = this.scene.children.filter(obj => obj.visible)
      console.log('👁️ Visible objects:', visibleObjects.length, 'out of', this.scene.children.length)

      // List entity types with positions
      const entityTypes = new Map<string, number>()
      const entityDetails: any[] = []
      this.scene.children.forEach(obj => {
        const type = obj.constructor.name
        entityTypes.set(type, (entityTypes.get(type) || 0) + 1)

        // Log details for Mesh objects (entities)
        if (obj instanceof THREE.Mesh) {
          entityDetails.push({
            type: type,
            position: obj.position.clone(),
            visible: obj.visible,
            material: obj.material ? obj.material.constructor.name : 'NO MATERIAL',
            geometry: obj.geometry ? obj.geometry.constructor.name : 'NO GEOMETRY'
          })
        }
      })
      console.log('📊 Scene object types:', Object.fromEntries(entityTypes))
      if (entityDetails.length > 0) {
        console.log('🎯 Entity details:', entityDetails)
      }
    }

    try {
      // 🎨 USE POST-PROCESSING RENDERER! 🎨
      if (this.postProcessing) {
        this.postProcessing.render(0.016) // ~60fps deltaTime
      } else {
        // Fallback to standard renderer if post-processing not initialized
        this.renderer.render(this.scene, this.camera)
      }
    } catch (error) {
      console.error('❌ Render error:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    }
  }

  getCamera(): THREE.OrthographicCamera {
    return this.camera
  }

  getScene(): THREE.Scene {
    return this.scene
  }
  
  // 🎆 GET EFFECTS SYSTEM FOR EXTERNAL ACCESS 🎆
  getEffectsSystem(): EffectsSystem {
    return this.effectsSystem
  }

  // 🎨 GET POST-PROCESSING MANAGER FOR EXTERNAL ACCESS 🎨
  getPostProcessing(): PostProcessingManager | null {
    return this.postProcessing
  }

  // 🚀 GET ZOOM COMPENSATION SCALE - Keeps player ship visually consistent during dynamic zoom! 🚀
  getZoomCompensationScale(): number {
    // When camera zooms out (larger frustum), return larger scale to compensate
    // When camera zooms in (smaller frustum), return smaller scale to compensate
    return this.currentFrustumSize / this.baseFrustumSize
  }
  
  // 🔘 Hide/Show energy barrier 🔘
  setEnergyBarrierVisible(visible: boolean): void {
    if (this.energyBarrier) {
      this.energyBarrier.getMesh().visible = visible
    }
  }

  // 🌌 STARFIELD MODE TRACKING 🌌
  private starfieldMode: 'arcade' | 'test' | 'attract' = 'arcade'

  // 🎲 MODE-SPECIFIC STARFIELD: Set starfield behavior per game mode 🎲
  // Creates different visual experiences for each mode
  // See src/config/modes.config.ts for configuration values
  setStarfieldDownwardFlow(mode: 'arcade' | 'test' | 'attract' = 'arcade'): void {
    if (!this.starfieldVelocities || !this.starfieldSpeedLayers || !this.cosmicStarfield) {
      console.warn('⚠️ Starfield arrays not initialized - cannot set flow mode!')
      return
    }
    
    // Store current mode for wrapping logic
    this.starfieldMode = mode
    
    const starCount = this.starfieldVelocities.length / 2
    const positions = this.cosmicStarfield.geometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < starCount; i++) {
      const i2 = i * 2
      const i3 = i * 3
      const speedLayer = this.starfieldSpeedLayers[i] // 0.2-1.5 depth multiplier
      
      if (mode === 'attract') {
        // 🎮 ATTRACT MODE: Radial outward from center (flying through space!)
        // Stars fly outward from center at different speeds based on depth
        const baseSpeed = 3.0 + Math.random() * 6.0  // 3-9 units/sec base
        const parallaxSpeed = baseSpeed * speedLayer  // 0.6 to 13.5 units/sec with depth
        
        // Calculate angle from center (0,0) to this star's current position
        // This creates radial outward motion like flying through a star tunnel
        const starX = positions[i3]
        const starY = positions[i3 + 1]
        const angle = Math.atan2(starY, starX)
        
        // Set velocity along the radial direction (outward from center)
        this.starfieldVelocities[i2] = Math.cos(angle) * parallaxSpeed
        this.starfieldVelocities[i2 + 1] = Math.sin(angle) * parallaxSpeed
      } else {
        // ARCADE/TEST MODE: Subtle ambient drift in all directions
        this.starfieldVelocities[i2] = (Math.random() - 0.5) * 0.2
        this.starfieldVelocities[i2 + 1] = (Math.random() - 0.5) * 0.2
      }
    }
    
    console.log(`🌌 Starfield: ${mode.toUpperCase()} MODE - ${mode === 'attract' ? 'radial outward (star tunnel)' : 'ambient drift'}`)
  }

  // 🎬 DYNAMIC ZOOM SYSTEM - Procedural zoom based on gameplay! 🎬
  // 🎯 THROTTLE TIMER - Skip intensive recalculations for performance
  private zoomThrottleTimer: number = 0
  private zoomThrottleInterval: number = 0.05 // Update zoom target every 50ms (20 FPS)
  
  private updateDynamicZoom(deltaTime: number): void {
    // THROTTLE: Only recalculate intensity target periodically
    this.zoomThrottleTimer += deltaTime
    
    if (this.zoomThrottleTimer >= this.zoomThrottleInterval) {
      this.zoomThrottleTimer = 0
      
      // Calculate gameplay intensity (0-1)
      // Based on: enemy count, combo, audio-visual intensity
      const audioIntensity = this.audioVisualSystem.getGameplayIntensity()
      const enemyIntensity = Math.min(this.enemyCount / 20, 1) // Max at 20 enemies
      const comboIntensity = Math.min(this.comboCount / 15, 1) // Max at 15 combo
      
      // Combined intensity - higher = more zoomed out
      this.gameplayIntensity = Math.max(audioIntensity, enemyIntensity, comboIntensity * 0.7)
      
      // Calculate target zoom - zoom out as intensity increases
      const zoomRange = this.maxZoom - this.minZoom
      this.targetFrustumSize = this.minZoom + (this.gameplayIntensity * zoomRange)
    }
    
    // Always lerp to target for smooth animation (cheap operation)
    const previousZoom = this.currentFrustumSize
    this.currentFrustumSize = THREE.MathUtils.lerp(
      this.currentFrustumSize,
      this.targetFrustumSize,
      this.zoomLerpSpeed * deltaTime
    )
    
    // Only update projection matrix if zoom actually changed (avoids GPU overhead)
    if (Math.abs(this.currentFrustumSize - previousZoom) > 0.001) {
      const gameContainer = document.getElementById('gameContainer')
      const width = gameContainer ? gameContainer.clientWidth : window.innerWidth
      const height = gameContainer ? gameContainer.clientHeight : window.innerHeight
      const aspect = (width || window.innerWidth) / (height || window.innerHeight)
      this.camera.left = this.currentFrustumSize * aspect / -2
      this.camera.right = this.currentFrustumSize * aspect / 2
      this.camera.top = this.currentFrustumSize / 2
      this.camera.bottom = this.currentFrustumSize / -2
      this.camera.updateProjectionMatrix()
    }
  }

  // 🎬 SET GAMEPLAY DATA FOR ZOOM CALCULATION 🎬
  setGameplayData(enemyCount: number, comboCount: number): void {
    this.enemyCount = enemyCount
    this.comboCount = comboCount
  }

  // 🎬 SCREEN TRANSITION METHODS 🎬
  startTransition(type: 'fade' | 'zoom' | 'slide' | 'particle' = 'fade', duration: number = 0.8): void {
    this.isTransitioning = true
    this.transitionProgress = 0
    this.transitionDuration = duration
    this.transitionType = type
  }

  private updateTransition(deltaTime: number): void {
    const t = this.transitionProgress

    switch (this.transitionType) {
      case 'fade':
        // Fade effect via camera exposure
        const fadeAmount = Math.abs(t - 0.5) * 2 // 0 at start/end, 1 at middle
        this.renderer.toneMappingExposure = 1.5 - fadeAmount * 0.8
        break
        
      case 'zoom':
        // Zoom in/out during transition
        const zoomAmount = Math.sin(t * Math.PI) * 0.3
        const tempFrustum = this.currentFrustumSize * (1 - zoomAmount)
        const gameContainer = document.getElementById('gameContainer')
        const width = gameContainer ? gameContainer.clientWidth : window.innerWidth
        const height = gameContainer ? gameContainer.clientHeight : window.innerHeight
        const aspect = (width || window.innerWidth) / (height || window.innerHeight)
        this.camera.left = tempFrustum * aspect / -2
        this.camera.right = tempFrustum * aspect / 2
        this.camera.top = tempFrustum / 2
        this.camera.bottom = tempFrustum / -2
        this.camera.updateProjectionMatrix()
        break
        
      case 'slide':
        // Slide camera position
        const slideAmount = Math.sin(t * Math.PI) * 5
        this.camera.position.x += slideAmount * deltaTime * 10
        break
        
      case 'particle':
        // Create particle burst during transition
        if (t < 0.1 && Math.random() < 0.3) {
          const burstPos = new THREE.Vector3(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 40,
            0
          )
          this.effectsSystem.createExplosion(burstPos, 1.0, new THREE.Color().setHSL(Math.random(), 1, 0.7))
        }
        break
    }
  }

  isInTransition(): boolean {
    return this.isTransitioning
  }

  private onWindowResize(): void {
    // Get size from game container if available, otherwise use window
    const gameContainer = document.getElementById('gameContainer')
    const width = gameContainer ? gameContainer.clientWidth : window.innerWidth
    const height = gameContainer ? gameContainer.clientHeight : window.innerHeight
    
    // Prevent zero-size issues
    if (width === 0 || height === 0) return
    
    const aspect = width / height

    this.camera.left = this.currentFrustumSize * aspect / -2
    this.camera.right = this.currentFrustumSize * aspect / 2
    this.camera.top = this.currentFrustumSize / 2
    this.camera.bottom = this.currentFrustumSize / -2
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)

    // 🎨 Update post-processing size! 🎨
    if (this.postProcessing) {
      this.postProcessing.setSize(width, height)
    }
  }
}
