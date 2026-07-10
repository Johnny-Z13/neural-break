import * as THREE from 'three'
import { InputManager } from '../core/InputManager'
import { AudioManager } from '../audio/AudioManager'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { PostProcessingManager } from '../graphics/PostProcessingManager'
import { BALANCE_CONFIG } from '../config'

export class Player {
  private mesh!: THREE.Mesh // Initialized in initialize() method
  private position: THREE.Vector3
  private velocity: THREE.Vector3
  private health: number = BALANCE_CONFIG.PLAYER.BASE_HEALTH
  private maxHealth: number = BALANCE_CONFIG.PLAYER.MAX_HEALTH
  private baseSpeed: number = BALANCE_CONFIG.PLAYER.BASE_SPEED
  private speed: number = BALANCE_CONFIG.PLAYER.BASE_SPEED
  private dashCooldown: number = 0
  private dashDuration: number = 0
  private dashSpeed: number = BALANCE_CONFIG.PLAYER.DASH_SPEED
  private level: number = 1
  private xp: number = 0
  private xpToNext: number = 15
  private powerUpLevel: number = 0 // Power-up level (0-MAX_POWER_UP_LEVEL)
  private speedUpLevel: number = 0 // Speed-up level (0-MAX_SPEED_LEVEL)
  private shieldCount: number = 1 // 🛡️ SHIELD COUNT - Start with 1, max 3
  private static readonly MAX_SHIELDS = 3 // Maximum shield capacity
  private shieldMesh: THREE.Mesh | null = null // 🛡️ FORCE FIELD VISUAL
  private isDashing: boolean = false
  private isInvulnerable: boolean = false // Invulnerability during dash
  private isInvulnerablePickup: boolean = false // 🌟 INVULNERABLE PICKUP STATE 🌟
  private invulnerableTimer: number = 0 // Timer for invulnerable duration
  private invulnerableDuration: number = BALANCE_CONFIG.PLAYER.INVULNERABLE_DURATION
  
  // 💀 DEATH FRAGMENTS - Asteroids style! 💀
  private fragments: { mesh: THREE.Mesh, velocity: THREE.Vector3, angularVelocity: number }[] = []
  private isExploded: boolean = false
  
  private audioManager: AudioManager | null = null
  private effectsSystem: EffectsSystem | null = null
  private postProcessing: PostProcessingManager | null = null
  private lastDashDirection: THREE.Vector3 = new THREE.Vector3(0, -1, 0) // Default backward
  private jetTrailTimer: number = 0
  private jetTrailInterval: number = 0.01 // Jet particles every 10ms
  
  // 🎮 ANALOG CONTROLS - Smooth movement! 🎮
  private targetVelocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private acceleration: number = 15.0 // How fast the ship accelerates
  private deceleration: number = 12.0 // How fast the ship decelerates
  private rotationSpeed: number = 6.0 // How fast the ship rotates towards target
  private targetRotation: number | null = null // Target rotation angle (null = hold current rotation)
  private isRotating: boolean = false // Track if ship should be rotating
  
  // Speed boost constants (from config)
  private static readonly MAX_SPEED_LEVEL = BALANCE_CONFIG.PLAYER.MAX_SPEED_LEVEL
  private static readonly SPEED_BOOST_PER_LEVEL = BALANCE_CONFIG.PLAYER.SPEED_BOOST_PER_LEVEL
  
  // 🎬 ZOOM COMPENSATION - Keep ship visually consistent during camera zoom! 🎬
  private zoomCompensationCallback: (() => number) | null = null

  // 🛡️ SHIELD NOTIFICATION CALLBACKS 🛡️
  private onShieldActivatedCallback: (() => void) | null = null
  private onShieldDeactivatedCallback: (() => void) | null = null
  private onShieldCountChangedCallback: ((count: number) => void) | null = null
  
  // 🌟 INVULNERABLE NOTIFICATION CALLBACKS 🌟
  private onInvulnerableActivatedCallback: (() => void) | null = null
  private onInvulnerableDeactivatedCallback: (() => void) | null = null
  
  // 🧪 TEST MODE - Unlimited health for testing 🧪
  private isTestMode: boolean = false
  
  // 🎲 ROGUE MODE MUTATIONS 🎲
  private movementSpeedMultiplier: number = 1.0
  private shieldCapacityBonus: number = 0 // Additional shields beyond base
  private isRogueMode: boolean = false // Track if in Rogue mode for boundary behavior

  constructor() {
    this.position = new THREE.Vector3(0, 0, 0)
    this.velocity = new THREE.Vector3(0, 0, 0)
  }

  initialize(audioManager?: AudioManager): void {
    this.audioManager = audioManager || null
    
    // 🚀 RETRO PIXEL-ART SPACESHIP - Inspired by classic arcade fighters! 🚀
    // Silver metallic hull with blue cockpit and orange engine flames
    const scale = 0.75
    
    // === MAIN HULL - Silver/metallic fuselage ===
    const hullShape = new THREE.Shape()
    // More detailed angular body shape
    hullShape.moveTo(0 * scale, 1.3 * scale)           // Nose tip
    hullShape.lineTo(0.15 * scale, 0.9 * scale)        // Nose right edge
    hullShape.lineTo(0.2 * scale, 0.5 * scale)         // Upper body right
    hullShape.lineTo(0.25 * scale, 0.1 * scale)        // Mid body right
    hullShape.lineTo(0.7 * scale, -0.2 * scale)        // Right wing start
    hullShape.lineTo(0.85 * scale, -0.5 * scale)       // Right wing tip
    hullShape.lineTo(0.5 * scale, -0.4 * scale)        // Right wing inner
    hullShape.lineTo(0.35 * scale, -0.6 * scale)       // Right booster top
    hullShape.lineTo(0.35 * scale, -0.9 * scale)       // Right booster bottom
    hullShape.lineTo(0.15 * scale, -0.85 * scale)      // Center right
    hullShape.lineTo(0 * scale, -0.95 * scale)         // Center engine
    hullShape.lineTo(-0.15 * scale, -0.85 * scale)     // Center left
    hullShape.lineTo(-0.35 * scale, -0.9 * scale)      // Left booster bottom
    hullShape.lineTo(-0.35 * scale, -0.6 * scale)      // Left booster top
    hullShape.lineTo(-0.5 * scale, -0.4 * scale)       // Left wing inner
    hullShape.lineTo(-0.85 * scale, -0.5 * scale)      // Left wing tip
    hullShape.lineTo(-0.7 * scale, -0.2 * scale)       // Left wing start
    hullShape.lineTo(-0.25 * scale, 0.1 * scale)       // Mid body left
    hullShape.lineTo(-0.2 * scale, 0.5 * scale)        // Upper body left
    hullShape.lineTo(-0.15 * scale, 0.9 * scale)       // Nose left edge
    hullShape.lineTo(0 * scale, 1.3 * scale)           // Back to nose
    
    const hullGeometry = new THREE.ShapeGeometry(hullShape)
    
    // Silver/metallic hull material
    const hullMaterial = new THREE.MeshLambertMaterial({
      color: 0xB8C4D0,       // Silver-blue metallic
      emissive: 0x334455,    // Subtle metallic glow
      transparent: true,     // Required for death animation fade-out
      opacity: 1.0
    })
    
    this.mesh = new THREE.Mesh(hullGeometry, hullMaterial)
    this.mesh.position.set(this.position.x, this.position.y, 0)
    this.mesh.visible = true
    
    // === DARK PANEL LINES - Adds depth and detail ===
    const panelShape = new THREE.Shape()
    panelShape.moveTo(0 * scale, 0.85 * scale)
    panelShape.lineTo(0.12 * scale, 0.5 * scale)
    panelShape.lineTo(0.15 * scale, -0.2 * scale)
    panelShape.lineTo(0.1 * scale, -0.6 * scale)
    panelShape.lineTo(-0.1 * scale, -0.6 * scale)
    panelShape.lineTo(-0.15 * scale, -0.2 * scale)
    panelShape.lineTo(-0.12 * scale, 0.5 * scale)
    panelShape.lineTo(0 * scale, 0.85 * scale)
    
    const panelGeometry = new THREE.ShapeGeometry(panelShape)
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x556677,       // Darker panel for depth
      transparent: true,
      opacity: 0.6
    })
    const panelLines = new THREE.Mesh(panelGeometry, panelMaterial)
    panelLines.position.z = 0.005
    this.mesh.add(panelLines) // Child 0: Panel lines
    
    // === COCKPIT - Glowing blue window (like the pixel art) ===
    const cockpitShape = new THREE.Shape()
    cockpitShape.moveTo(0 * scale, 0.7 * scale)        // Top point
    cockpitShape.lineTo(0.1 * scale, 0.4 * scale)      // Right
    cockpitShape.lineTo(0.08 * scale, 0.15 * scale)    // Bottom right
    cockpitShape.lineTo(-0.08 * scale, 0.15 * scale)   // Bottom left
    cockpitShape.lineTo(-0.1 * scale, 0.4 * scale)     // Left
    cockpitShape.lineTo(0 * scale, 0.7 * scale)        // Back to top
    
    const cockpitGeometry = new THREE.ShapeGeometry(cockpitShape)
    const cockpitMaterial = new THREE.MeshBasicMaterial({
      color: 0x44AAFF,        // Bright blue cockpit glass
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial)
    cockpit.position.z = 0.01
    this.mesh.add(cockpit) // Child 1: Cockpit
    
    // === COCKPIT HIGHLIGHT - Light reflection on glass ===
    const highlightGeometry = new THREE.CircleGeometry(0.04 * scale, 6)
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
    const cockpitHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial)
    cockpitHighlight.position.set(-0.03 * scale, 0.5 * scale, 0.015)
    this.mesh.add(cockpitHighlight) // Child 2: Cockpit highlight
    
    // === ENGINE FLAMES - Orange/red thruster fire (3 engines) ===
    // Center main engine (larger)
    const mainFlameShape = new THREE.Shape()
    mainFlameShape.moveTo(-0.08 * scale, -0.95 * scale)
    mainFlameShape.lineTo(0 * scale, -1.4 * scale)     // Flame tip
    mainFlameShape.lineTo(0.08 * scale, -0.95 * scale)
    
    const mainFlameGeometry = new THREE.ShapeGeometry(mainFlameShape)
    const flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF6600,        // Orange flame
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    })
    const mainFlame = new THREE.Mesh(mainFlameGeometry, flameMaterial)
    mainFlame.position.z = -0.01
    this.mesh.add(mainFlame) // Child 3: Main flame
    
    // Inner flame (brighter yellow core)
    const innerFlameShape = new THREE.Shape()
    innerFlameShape.moveTo(-0.04 * scale, -0.95 * scale)
    innerFlameShape.lineTo(0 * scale, -1.25 * scale)
    innerFlameShape.lineTo(0.04 * scale, -0.95 * scale)
    
    const innerFlameGeometry = new THREE.ShapeGeometry(innerFlameShape)
    const innerFlameMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFCC00,        // Yellow inner flame
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial)
    innerFlame.position.z = -0.005
    this.mesh.add(innerFlame) // Child 4: Inner flame
    
    // Left booster flame
    const leftBoosterFlameShape = new THREE.Shape()
    leftBoosterFlameShape.moveTo(-0.28 * scale, -0.9 * scale)
    leftBoosterFlameShape.lineTo(-0.32 * scale, -1.2 * scale)
    leftBoosterFlameShape.lineTo(-0.36 * scale, -0.9 * scale)
    
    const leftBoosterGeometry = new THREE.ShapeGeometry(leftBoosterFlameShape)
    const leftBoosterMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF4400,        // Slightly redder flame
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const leftBoosterFlame = new THREE.Mesh(leftBoosterGeometry, leftBoosterMaterial)
    leftBoosterFlame.position.z = -0.01
    this.mesh.add(leftBoosterFlame) // Child 5: Left booster flame
    
    // Right booster flame
    const rightBoosterFlameShape = new THREE.Shape()
    rightBoosterFlameShape.moveTo(0.28 * scale, -0.9 * scale)
    rightBoosterFlameShape.lineTo(0.32 * scale, -1.2 * scale)
    rightBoosterFlameShape.lineTo(0.36 * scale, -0.9 * scale)
    
    const rightBoosterGeometry = new THREE.ShapeGeometry(rightBoosterFlameShape)
    const rightBoosterMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF4400,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const rightBoosterFlame = new THREE.Mesh(rightBoosterGeometry, rightBoosterMaterial)
    rightBoosterFlame.position.z = -0.01
    this.mesh.add(rightBoosterFlame) // Child 6: Right booster flame
    
    // === RED ACCENT STRIPES - Classic retro detail ===
    const leftStripeShape = new THREE.Shape()
    leftStripeShape.moveTo(-0.6 * scale, -0.3 * scale)
    leftStripeShape.lineTo(-0.75 * scale, -0.45 * scale)
    leftStripeShape.lineTo(-0.7 * scale, -0.48 * scale)
    leftStripeShape.lineTo(-0.55 * scale, -0.33 * scale)
    
    const stripeGeometry = new THREE.ShapeGeometry(leftStripeShape)
    const stripeMaterial = new THREE.MeshBasicMaterial({
      color: 0xDD2222,        // Red accent
      transparent: true,
      opacity: 0.9
    })
    const leftStripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
    leftStripe.position.z = 0.008
    this.mesh.add(leftStripe) // Child 7: Left stripe
    
    // Right stripe (mirror)
    const rightStripeShape = new THREE.Shape()
    rightStripeShape.moveTo(0.6 * scale, -0.3 * scale)
    rightStripeShape.lineTo(0.75 * scale, -0.45 * scale)
    rightStripeShape.lineTo(0.7 * scale, -0.48 * scale)
    rightStripeShape.lineTo(0.55 * scale, -0.33 * scale)
    
    const rightStripeGeometry = new THREE.ShapeGeometry(rightStripeShape)
    const rightStripe = new THREE.Mesh(rightStripeGeometry, stripeMaterial.clone())
    rightStripe.position.z = 0.008
    this.mesh.add(rightStripe) // Child 8: Right stripe
    
    // === EDGE GLOW - Subtle outline for visibility ===
    const glowShape = new THREE.Shape()
    const gs = scale * 1.05 // Slightly larger
    glowShape.moveTo(0 * gs, 1.35 * scale)
    glowShape.lineTo(0.88 * scale, -0.52 * scale)
    glowShape.lineTo(0.36 * scale, -0.92 * scale)
    glowShape.lineTo(0 * scale, -1.0 * scale)
    glowShape.lineTo(-0.36 * scale, -0.92 * scale)
    glowShape.lineTo(-0.88 * scale, -0.52 * scale)
    glowShape.lineTo(0 * gs, 1.35 * scale)
    
    const glowGeometry = new THREE.ShapeGeometry(glowShape)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6688AA,        // Blue-silver glow
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      wireframe: true
    })
    const edgeGlow = new THREE.Mesh(glowGeometry, glowMaterial)
    edgeGlow.position.z = -0.02
    this.mesh.add(edgeGlow) // Child 9: Edge glow

    // Add particle trail effect
    this.createParticleTrail()
    
    // 🛡️ CREATE SHIELD FORCE FIELD (hidden by default) 🛡️
    this.createShieldForceField()
  }
  
  private createShieldForceField(): void {
    // Create circular force field ring around player
    const shieldGeometry = new THREE.RingGeometry(0.8, 1.0, 32)
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // GREEN force field
      transparent: true,
      opacity: 0.0, // Hidden by default
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial)
    this.shieldMesh.rotation.x = Math.PI / 2 // Horizontal ring
    this.shieldMesh.position.z = 0.1
    this.shieldMesh.visible = false
    this.mesh.add(this.shieldMesh)
    
    // Add inner glow ring
    const innerShieldGeometry = new THREE.RingGeometry(0.7, 0.85, 32)
    const innerShieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF, // Cyan inner glow
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const innerShield = new THREE.Mesh(innerShieldGeometry, innerShieldMaterial)
    innerShield.rotation.x = Math.PI / 2
    innerShield.position.z = 0.11
    innerShield.visible = false
    this.mesh.add(innerShield)
  }

  private createParticleTrail(): void {
    const particleCount = 20
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      positions[i3] = 0
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0

      // 🔥 ORANGE/YELLOW trail colors - Engine exhaust! 🔥
      colors[i3] = 1.0       // R - full red
      colors[i3 + 1] = 0.5   // G - orange
      colors[i3 + 2] = 0.1   // B - hint of yellow
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })

    const trail = new THREE.Points(geometry, material)
    this.mesh.add(trail)
  }

  update(deltaTime: number, inputManager: InputManager): void {
    // 💀 IF EXPLODED, ONLY UPDATE FRAGMENTS 💀
    if (this.isExploded) {
      this.updateFragments(deltaTime)
      return
    }

    // Update cooldowns
    if (this.dashCooldown > 0) {
      this.dashCooldown -= deltaTime
    }
    
    if (this.dashDuration > 0) {
      this.dashDuration -= deltaTime
      if (this.dashDuration <= 0) {
        this.isDashing = false
        this.isInvulnerable = false // End invulnerability when dash ends
      }
    }
    
    // 🌟 UPDATE INVULNERABLE TIMER 🌟
    if (this.isInvulnerablePickup) {
      this.invulnerableTimer -= deltaTime
      if (this.invulnerableTimer <= 0) {
        this.deactivateInvulnerable()
      }
    }
    
    // Create JET VFX during dash!
    if (this.isDashing && this.effectsSystem) {
      this.updateJetVFX(deltaTime)
    }

    // 🎮 ANALOG MOVEMENT INPUT - Smooth acceleration! 🎮
    const movement = inputManager.getMovementVector()
    
    // Calculate target velocity based on input (with rogue mutations)
    const baseSpeed = this.isDashing ? this.dashSpeed : this.speed
    const currentSpeed = baseSpeed * this.movementSpeedMultiplier
    this.targetVelocity.x = movement.x * currentSpeed
    this.targetVelocity.y = movement.y * currentSpeed
    
    // 🎮 SMOOTH ACCELERATION/DECELERATION - Analog feel! 🎮
    const moveMagnitude = Math.sqrt(movement.x * movement.x + movement.y * movement.y)
    const accelRate = moveMagnitude > 0 ? this.acceleration : this.deceleration
    
    // Smoothly interpolate velocity towards target
    const velDiffX = this.targetVelocity.x - this.velocity.x
    const velDiffY = this.targetVelocity.y - this.velocity.y
    
    this.velocity.x += velDiffX * accelRate * deltaTime
    this.velocity.y += velDiffY * accelRate * deltaTime
    
    // Apply friction when no input (smooth stop)
    if (moveMagnitude === 0) {
      const friction = 0.95 // Slight friction for smooth deceleration
      this.velocity.x *= friction
      this.velocity.y *= friction
      
      // Stop completely if velocity is very small
      if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0
      if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0
    }
    
    // Handle dash input (now on Shift key)
    if (inputManager.isDashing() && this.dashCooldown <= 0 && !this.isDashing) {
      const movementVec = new THREE.Vector3(movement.x, movement.y, 0)
      this.startDash(movementVec) // Pass movement direction for jet VFX
    }
    
    // Update position with smooth velocity
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime

    // 🔘 CIRCULAR BOUNDARY COLLISION & BOUNCE 🔘
    // Skip boundary in Rogue mode - infinite vertical space!
    if (!this.isRogueMode) {
      // World size is 60, so radius is 30. We use 29.5 to account for player size.
      const boundaryRadius = 29.5
      const distFromOrigin = Math.sqrt(this.position.x * this.position.x + this.position.y * this.position.y)
      
      if (distFromOrigin > boundaryRadius) {
        // Normal vector from origin to player
        const normal = this.position.clone().normalize()
        
        // Keep player inside boundary
        this.position.copy(normal.clone().multiplyScalar(boundaryRadius))
        
        // 💥 SMOOTH BOUNCE LOGIC 💥
        const dot = this.velocity.dot(normal)
        if (dot > 0) { // Only bounce if moving outwards
          // We use a bounce factor of 1.4 (soft bounce) instead of 2.0 (hard reflection)
          // This reduces oscillation jitter when pressing keys against the wall
          const bounceFactor = 1.4
          const reflection = normal.clone().multiplyScalar(dot * bounceFactor)
          this.velocity.sub(reflection)
          
          // Add a smaller repulsion force
          this.velocity.add(normal.clone().multiplyScalar(-3.0))
          
          // Visual/Audio feedback for hitting the barrier (only for significant hits)
          if (this.effectsSystem && dot > 1.0) {
            this.effectsSystem.createWeaponImpact(this.position.clone(), normal.clone().negate())
          }
        }
      }
    } else {
      // 🎲 ROGUE MODE: Keep player horizontally centered-ish but allow free vertical movement
      // Soft horizontal boundaries
      const maxX = 25
      if (this.position.x > maxX) this.position.x = maxX
      if (this.position.x < -maxX) this.position.x = -maxX
    }

    // Update mesh position (ensure z=0 for top-down view)
    this.mesh.position.set(this.position.x, this.position.y, 0)

    // Update visual effects based on movement
    this.updateVisualEffects(deltaTime, movement)
  }

  private startDash(movement: THREE.Vector3): void {
    this.isDashing = true
    this.isInvulnerable = BALANCE_CONFIG.PLAYER.DASH_INVULNERABLE // INVULNERABLE during dash!
    this.dashDuration = BALANCE_CONFIG.PLAYER.DASH_DURATION
    this.dashCooldown = BALANCE_CONFIG.PLAYER.DASH_COOLDOWN
    
    // Store dash direction for jet VFX (opposite of movement - behind player)
    if (movement.length() > 0) {
      this.lastDashDirection = new THREE.Vector3(-movement.x, -movement.y, 0).normalize()
    } else {
      // If no movement, use last velocity or default backward
      if (this.velocity.length() > 0) {
        this.lastDashDirection = this.velocity.clone().normalize().multiplyScalar(-1)
      }
    }
    
    // Audio feedback for dash - play both thrust and dash sounds!
    if (this.audioManager) {
      this.audioManager.playThrustSound() // 🚀 Powerful jet engine burst!
      this.audioManager.playDashSound()   // Swoosh overlay
    }
    
    // DRAMATIC visual effect for dash - Blue-white overdrive flash!
    const material = this.mesh.material as THREE.MeshLambertMaterial
    material.emissive.setHex(0x66AAFF) // Blue-white dash glow
    material.color.setHex(0xDDEEFF)    // Hull goes bright white-blue
    
    // Note: Scale is now handled in updateVisualEffects with zoom compensation
    // Reset material after dash
    setTimeout(() => {
      material.emissive.setHex(0x334455) // Back to metallic glow
      material.color.setHex(0xB8C4D0)   // Back to silver
      this.isInvulnerable = false // End invulnerability
    }, 400)
  }

  private updateVisualEffects(deltaTime: number, inputMovement?: { x: number, y: number }): void {
    // 🛡️ Safety check: don't update visuals if mesh isn't initialized
    if (!this.mesh) return
    
    // 🎮 SMOOTH ROTATION - Ship rotates only when moving! 🎮
    // Determine if we should update target rotation based on movement
    const hasInput = inputMovement && (Math.abs(inputMovement.x) > 0.01 || Math.abs(inputMovement.y) > 0.01)
    const hasVelocity = this.velocity.length() > 0.5 // Only rotate if moving at reasonable speed
    
    if (hasInput) {
      // Set target rotation based on input direction
      const targetAngle = Math.atan2(inputMovement.y, inputMovement.x) - Math.PI / 2
      this.targetRotation = targetAngle
      this.isRotating = true
    } else if (!hasVelocity) {
      // Ship is stopped - hold current rotation (no target)
      this.targetRotation = null
      this.isRotating = false
    }
    
    // 🎮 APPLY SMOOTH ROTATION - Only if we have a target! 🎮
    if (this.targetRotation !== null && this.isRotating) {
      let currentRotation = this.mesh.rotation.z
      let angleDiff = this.targetRotation - currentRotation
      
      // 📐 NORMALIZE to shortest path (-PI to PI) 📐
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
      
      // 🎯 DEADZONE - Snap to target when very close 🎯
      const rotationDeadzone = 0.05 // ~3 degrees - larger deadzone for stability
      if (Math.abs(angleDiff) < rotationDeadzone) {
        this.mesh.rotation.z = this.targetRotation // Snap to target
        this.targetRotation = null // Stop rotating
        this.isRotating = false
      } else {
        // Smooth interpolation towards target
        const rotationDelta = angleDiff * this.rotationSpeed * deltaTime
        this.mesh.rotation.z = currentRotation + rotationDelta
      }
    }
    // If targetRotation is null, rotation stays at current value (settled)

    // 🔥 ENGINE FLAME EFFECTS - Animate based on movement! 🔥
    const velocityMagnitude = this.velocity.length()
    const engineIntensity = Math.min(velocityMagnitude / this.speed, 1.0)
    const flameFlicker = Math.sin(Date.now() * 0.025) * 0.15
    
    // Main flame (child 3)
    if (this.mesh.children[3]) {
      const mainFlame = this.mesh.children[3] as THREE.Mesh
      const mainFlameMat = mainFlame.material as THREE.MeshBasicMaterial
      mainFlameMat.opacity = 0.6 + engineIntensity * 0.35 + flameFlicker
      const flameScale = 0.8 + engineIntensity * 0.6 + Math.sin(Date.now() * 0.03) * 0.2
      mainFlame.scale.set(1, flameScale, 1)
    }
    
    // Inner flame (child 4)
    if (this.mesh.children[4]) {
      const innerFlame = this.mesh.children[4] as THREE.Mesh
      const innerFlameMat = innerFlame.material as THREE.MeshBasicMaterial
      innerFlameMat.opacity = 0.5 + engineIntensity * 0.4 + flameFlicker * 0.8
      const innerScale = 0.7 + engineIntensity * 0.5 + Math.sin(Date.now() * 0.04 + 0.5) * 0.15
      innerFlame.scale.set(1, innerScale, 1)
    }
    
    // Left booster flame (child 5)
    if (this.mesh.children[5]) {
      const leftBooster = this.mesh.children[5] as THREE.Mesh
      const leftBoosterMat = leftBooster.material as THREE.MeshBasicMaterial
      leftBoosterMat.opacity = 0.5 + engineIntensity * 0.4 + Math.sin(Date.now() * 0.028) * 0.15
      const boosterScale = 0.7 + engineIntensity * 0.5 + Math.sin(Date.now() * 0.035) * 0.2
      leftBooster.scale.set(1, boosterScale, 1)
    }
    
    // Right booster flame (child 6)
    if (this.mesh.children[6]) {
      const rightBooster = this.mesh.children[6] as THREE.Mesh
      const rightBoosterMat = rightBooster.material as THREE.MeshBasicMaterial
      rightBoosterMat.opacity = 0.5 + engineIntensity * 0.4 + Math.sin(Date.now() * 0.028 + 0.3) * 0.15
      const boosterScale = 0.7 + engineIntensity * 0.5 + Math.sin(Date.now() * 0.035 + 0.3) * 0.2
      rightBooster.scale.set(1, boosterScale, 1)
    }
    
    // Cockpit glow pulse (child 1)
    if (this.mesh.children[1]) {
      const cockpit = this.mesh.children[1] as THREE.Mesh
      const cockpitMat = cockpit.material as THREE.MeshBasicMaterial
      cockpitMat.opacity = 0.8 + Math.sin(Date.now() * 0.003) * 0.1
    }

    // 🎬 GET ZOOM COMPENSATION - Keep ship visually consistent! 🎬
    const zoomCompensation = this.zoomCompensationCallback ? this.zoomCompensationCallback() : 1.0

    // 🌟 INVULNERABLE EFFECTS - Ship glows GREEN with special VFX! 🌟
    if (this.isInvulnerablePickup) {
      const pulse = 1.2 + Math.sin(Date.now() * 0.12) * 0.15
      this.mesh.scale.setScalar(pulse * zoomCompensation)
      
      // Hull goes bright GREEN
      const material = this.mesh.material as THREE.MeshLambertMaterial
      const intensity = 0.8 + Math.sin(Date.now() * 0.2) * 0.2
      material.emissive.setHex(0x00FF00) // Bright green glow
      material.color.setHex(0x88FF88) // Hull tints green
      material.emissiveIntensity = intensity
      
      // Edge glow pulses bright green (child 9)
      if (this.mesh.children[9]) {
        const edgeGlow = this.mesh.children[9] as THREE.Mesh
        const glowMaterial = edgeGlow.material as THREE.MeshBasicMaterial
        glowMaterial.opacity = 0.8 + Math.sin(Date.now() * 0.25) * 0.2
        glowMaterial.color.setHex(0x00FF00) // Bright green
      }
      
      // All flames go GREEN during invulnerability
      if (this.mesh.children[3]) {
        const mainFlame = this.mesh.children[3] as THREE.Mesh
        const mainFlameMat = mainFlame.material as THREE.MeshBasicMaterial
        mainFlameMat.color.setHex(0x00FF00) // Green flame
        mainFlameMat.opacity = 1.0
        mainFlame.scale.set(1.3, 1.6 + Math.sin(Date.now() * 0.08) * 0.3, 1)
      }
      if (this.mesh.children[4]) {
        const innerFlame = this.mesh.children[4] as THREE.Mesh
        const innerFlameMat = innerFlame.material as THREE.MeshBasicMaterial
        innerFlameMat.color.setHex(0x88FF88) // Light green
        innerFlameMat.opacity = 1.0
        innerFlame.scale.set(1.2, 1.4 + Math.sin(Date.now() * 0.09) * 0.25, 1)
      }
      if (this.mesh.children[5]) {
        const leftBooster = this.mesh.children[5] as THREE.Mesh
        const leftMat = leftBooster.material as THREE.MeshBasicMaterial
        leftMat.color.setHex(0x00FF00)
        leftMat.opacity = 1.0
        leftBooster.scale.set(1.3, 1.4 + Math.sin(Date.now() * 0.085) * 0.3, 1)
      }
      if (this.mesh.children[6]) {
        const rightBooster = this.mesh.children[6] as THREE.Mesh
        const rightMat = rightBooster.material as THREE.MeshBasicMaterial
        rightMat.color.setHex(0x00FF00)
        rightMat.opacity = 1.0
        rightBooster.scale.set(1.3, 1.4 + Math.sin(Date.now() * 0.085 + 0.3) * 0.3, 1)
      }
      
      // Cockpit goes bright green
      if (this.mesh.children[1]) {
        const cockpit = this.mesh.children[1] as THREE.Mesh
        const cockpitMat = cockpit.material as THREE.MeshBasicMaterial
        cockpitMat.color.setHex(0x00FFFF)
        cockpitMat.opacity = 1.0
      }
    }
    // 🚀 DRAMATIC DASH EFFECTS - Silver ship goes OVERDRIVE! 🚀
    else if (this.isDashing) {
      const pulse = 1.15 + Math.sin(Date.now() * 0.08) * 0.1
      this.mesh.scale.setScalar(pulse * zoomCompensation)
      
      // Hull goes bright during dash
      const material = this.mesh.material as THREE.MeshLambertMaterial
      const intensity = 0.6 + Math.sin(Date.now() * 0.15) * 0.3
      material.emissive.setHex(0x6699FF) // Blue-white dash glow
      material.emissiveIntensity = intensity
      
      // Edge glow pulses cyan during invulnerability (child 9)
      if (this.mesh.children[9]) {
        const edgeGlow = this.mesh.children[9] as THREE.Mesh
        const glowMaterial = edgeGlow.material as THREE.MeshBasicMaterial
        glowMaterial.opacity = 0.6 + Math.sin(Date.now() * 0.2) * 0.3
        glowMaterial.color.setHex(0x00FFFF) // Cyan shield effect
      }
      
      // 🔥 MAXIMUM THRUST - All flames go BRIGHT during dash! 🔥
      // Main flame - WHITE HOT
      if (this.mesh.children[3]) {
        const mainFlame = this.mesh.children[3] as THREE.Mesh
        const mainFlameMat = mainFlame.material as THREE.MeshBasicMaterial
        mainFlameMat.color.setHex(0xFFFFFF) // White hot
        mainFlameMat.opacity = 1.0
        mainFlame.scale.set(1.3, 1.8 + Math.sin(Date.now() * 0.05) * 0.3, 1)
      }
      // Inner flame
      if (this.mesh.children[4]) {
        const innerFlame = this.mesh.children[4] as THREE.Mesh
        const innerFlameMat = innerFlame.material as THREE.MeshBasicMaterial
        innerFlameMat.color.setHex(0xFFFF88) // Bright yellow
        innerFlameMat.opacity = 1.0
        innerFlame.scale.set(1.2, 1.6 + Math.sin(Date.now() * 0.06) * 0.25, 1)
      }
      // Booster flames
      if (this.mesh.children[5]) {
        const leftBooster = this.mesh.children[5] as THREE.Mesh
        const leftMat = leftBooster.material as THREE.MeshBasicMaterial
        leftMat.color.setHex(0xFFAA00) // Bright orange
        leftMat.opacity = 1.0
        leftBooster.scale.set(1.3, 1.5 + Math.sin(Date.now() * 0.055) * 0.3, 1)
      }
      if (this.mesh.children[6]) {
        const rightBooster = this.mesh.children[6] as THREE.Mesh
        const rightMat = rightBooster.material as THREE.MeshBasicMaterial
        rightMat.color.setHex(0xFFAA00)
        rightMat.opacity = 1.0
        rightBooster.scale.set(1.3, 1.5 + Math.sin(Date.now() * 0.055 + 0.3) * 0.3, 1)
      }
      
      // Cockpit goes bright cyan during dash (shield active!)
      if (this.mesh.children[1]) {
        const cockpit = this.mesh.children[1] as THREE.Mesh
        const cockpitMat = cockpit.material as THREE.MeshBasicMaterial
        cockpitMat.color.setHex(0x00FFFF)
        cockpitMat.opacity = 1.0
      }
    } else {
      this.mesh.scale.setScalar(1 * zoomCompensation)
      const material = this.mesh.material as THREE.MeshLambertMaterial
      material.emissiveIntensity = 1.0
      material.emissive.setHex(0x334455) // Normal metallic glow
      
      // Reset edge glow
      if (this.mesh.children[9]) {
        const edgeGlow = this.mesh.children[9] as THREE.Mesh
        const glowMaterial = edgeGlow.material as THREE.MeshBasicMaterial
        glowMaterial.opacity = 0.3
        glowMaterial.color.setHex(0x6688AA)
      }
      
      // Reset flame colors
      if (this.mesh.children[3]) {
        const mainFlame = this.mesh.children[3] as THREE.Mesh
        const mainFlameMat = mainFlame.material as THREE.MeshBasicMaterial
        mainFlameMat.color.setHex(0xFF6600)
      }
      if (this.mesh.children[4]) {
        const innerFlame = this.mesh.children[4] as THREE.Mesh
        const innerFlameMat = innerFlame.material as THREE.MeshBasicMaterial
        innerFlameMat.color.setHex(0xFFCC00)
      }
      if (this.mesh.children[5]) {
        const leftBooster = this.mesh.children[5] as THREE.Mesh
        const leftMat = leftBooster.material as THREE.MeshBasicMaterial
        leftMat.color.setHex(0xFF4400)
      }
      if (this.mesh.children[6]) {
        const rightBooster = this.mesh.children[6] as THREE.Mesh
        const rightMat = rightBooster.material as THREE.MeshBasicMaterial
        rightMat.color.setHex(0xFF4400)
      }
      
      // Reset cockpit to blue
      if (this.mesh.children[1]) {
        const cockpit = this.mesh.children[1] as THREE.Mesh
        const cockpitMat = cockpit.material as THREE.MeshBasicMaterial
        cockpitMat.color.setHex(0x44AAFF)
      }
    }
    
    // 🛡️ ANIMATE SHIELD FORCE FIELD 🛡️
    if (this.shieldCount > 0 && this.shieldMesh) {
      const time = Date.now() * 0.001
      const shieldMaterial = this.shieldMesh.material as THREE.MeshBasicMaterial
      
      // Pulsing opacity
      shieldMaterial.opacity = 0.5 + Math.sin(time * 4) * 0.2
      
      // Rotating shield ring
      this.shieldMesh.rotation.z += deltaTime * 2
      
      // Inner glow animation (inner shield is at index 12)
      if (this.mesh.children.length > 12) {
        const innerShield = this.mesh.children[12] as THREE.Mesh
        if (innerShield && innerShield.geometry instanceof THREE.RingGeometry) {
          const innerMaterial = innerShield.material as THREE.MeshBasicMaterial
          innerMaterial.opacity = 0.3 + Math.sin(time * 6) * 0.2
          innerShield.rotation.z -= deltaTime * 3 // Counter-rotate
        }
      }
    }
  }

  private updateFragments(deltaTime: number): void {
    this.fragments.forEach((frag) => {
      // Update position
      frag.mesh.position.add(frag.velocity.clone().multiplyScalar(deltaTime))
      
      // Dramatic tumbling rotation
      frag.mesh.rotation.z += frag.angularVelocity * deltaTime
      frag.mesh.rotation.x += frag.angularVelocity * 0.7 * deltaTime
      frag.mesh.rotation.y += frag.angularVelocity * 0.4 * deltaTime
      
      // Apply slight drag
      frag.velocity.multiplyScalar(0.985)
      
      // Fade out fragments SLOWER (was 0.6, now 0.4)
      const material = frag.mesh.material as THREE.MeshLambertMaterial
      material.opacity = Math.max(0, material.opacity - deltaTime * 0.4)
      
      // Reduce emissive intensity over time for fade effect
      material.emissiveIntensity = Math.max(0, material.emissiveIntensity - deltaTime * 0.5)
      
      // 💥 Spawn trail particles occasionally 💥
      if (this.effectsSystem && Math.random() < 0.1 && material.opacity > 0.3) {
        const trailVel = frag.velocity.clone().multiplyScalar(-0.2)
        this.effectsSystem.createSparkle(
          frag.mesh.position.clone(),
          trailVel,
          new THREE.Color(material.color),
          0.2
        )
      }
    })
  }

  /**
   * 💀 EPIC ASTEROIDS-STYLE DEATH 💀
   * Breaks the ship into individual flying shards with bespoke animation!
   */
  explodeIntoFragments(): void {
    if (this.isExploded) return
    
    // 🛡️ Safety check: don't explode if mesh isn't initialized
    if (!this.mesh) {
      console.warn('⚠️ Cannot explode: Player mesh not initialized')
      return
    }
    
    this.isExploded = true
    
    // 💥 CREATE MASSIVE EXPLOSION EFFECT 💥
    if (this.effectsSystem) {
      // Primary white explosion
      this.effectsSystem.createExplosion(
        this.position,
        3.0,
        new THREE.Color(0xFFFFFF)
      )
      
      // Secondary colored explosions
      setTimeout(() => {
        this.effectsSystem?.createExplosion(
          this.position,
          2.5,
          new THREE.Color(0xFF6600)
        )
      }, 100)
      
      setTimeout(() => {
        this.effectsSystem?.createExplosion(
          this.position,
          2.0,
          new THREE.Color(0x44AAFF)
        )
      }, 200)
      
      // Screen flash for dramatic impact
      this.effectsSystem.addScreenFlash(0.4, new THREE.Color(0xFFFFFF))
      
      // Distortion wave
      this.effectsSystem.addDistortionWave(this.position, 3.0)
    }
    
    // Keep ship briefly visible with intense flash before fragmenting
    const material = this.mesh.material as THREE.MeshLambertMaterial
    material.emissive.setHex(0xFFFFFF)
    material.color.setHex(0xFFFFFF)
    this.mesh.scale.setScalar(1.5)
    
    // Delay fragmentation slightly for dramatic effect
    setTimeout(() => {
      if (!this.mesh) return
      // Hide original ship components
      this.mesh.visible = false
      
      // Position and rotation at time of death
      const playerPos = this.getPosition()
      const currentRotation = this.mesh.rotation.z
      
      // Define pieces to create (relative to ship center) - LARGER AND MORE DRAMATIC!
      // Inspired by the ship's actual components
      const pieceConfigs = [
        { color: 0xB8C4D0, size: 0.7, offset: new THREE.Vector3(0, 0.6, 0), emissive: 0x6688AA },   // Nose shard
        { color: 0xB8C4D0, size: 0.85, offset: new THREE.Vector3(0.6, -0.2, 0), emissive: 0x6688AA }, // Right wing
        { color: 0xB8C4D0, size: 0.85, offset: new THREE.Vector3(-0.6, -0.2, 0), emissive: 0x6688AA },// Left wing
        { color: 0x44AAFF, size: 0.5, offset: new THREE.Vector3(0, 0.3, 0), emissive: 0x44AAFF },   // Cockpit glass
        { color: 0x556677, size: 0.6, offset: new THREE.Vector3(0, -0.5, 0), emissive: 0x445566 },  // Engine block
        { color: 0xDD2222, size: 0.4, offset: new THREE.Vector3(0.5, -0.4, 0), emissive: 0xDD2222 }, // Red stripe R
        { color: 0xDD2222, size: 0.4, offset: new THREE.Vector3(-0.5, -0.4, 0), emissive: 0xDD2222 },// Red stripe L
        { color: 0xFF6600, size: 0.5, offset: new THREE.Vector3(0, -0.7, 0), emissive: 0xFF6600 },  // Engine fragment
        { color: 0xFF4400, size: 0.35, offset: new THREE.Vector3(0.3, -0.8, 0), emissive: 0xFF4400 }, // Right booster
        { color: 0xFF4400, size: 0.35, offset: new THREE.Vector3(-0.3, -0.8, 0), emissive: 0xFF4400 }, // Left booster
      ]
      
      pieceConfigs.forEach(config => {
        // Create sharp geometric shard (Tetrahedron looks like line-art fragments) - BIGGER!
        const shardGeom = new THREE.TetrahedronGeometry(config.size, 0)
        const shardMat = new THREE.MeshLambertMaterial({
          color: config.color,
          emissive: config.emissive,
          emissiveIntensity: 1.2, // Brighter glow!
          transparent: true,
          opacity: 1.0
        })
        
        const shard = new THREE.Mesh(shardGeom, shardMat)
        
        // Calculate rotated offset based on ship's facing direction
        const rotatedOffset = config.offset.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), currentRotation)
        shard.position.copy(playerPos).add(rotatedOffset)
        
        // Random initial rotation for variety
        shard.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        )
        
        // Velocity flies out from center + some ship momentum - FASTER AND MORE DRAMATIC!
        const outwardDir = config.offset.clone().normalize()
        
        // 🛡️ Robust fallback for center pieces or NaN vectors
        if (!outwardDir.x && !outwardDir.y && !outwardDir.z || isNaN(outwardDir.x)) {
          outwardDir.set(Math.random() - 0.5, Math.random() - 0.5, 0).normalize()
        }
        
        const flyDir = outwardDir.applyAxisAngle(new THREE.Vector3(0, 0, 1), currentRotation)
        const flySpeed = 10 + Math.random() * 15 // MUCH FASTER (was 6-16)
        
        const velocity = flyDir.multiplyScalar(flySpeed).add(this.velocity.clone().multiplyScalar(0.5))
        const angularVelocity = (Math.random() - 0.5) * 25 // Faster spinning
        
        this.fragments.push({ mesh: shard, velocity, angularVelocity })
        
        // Add to scene (attach to same parent as player mesh)
        if (this.mesh.parent) {
          this.mesh.parent.add(shard)
        }
        
        // 💥 Add trail particles to each fragment for extra drama! 💥
        if (this.effectsSystem) {
          const trailColor = new THREE.Color(config.color)
          for (let i = 0; i < 5; i++) {
            const trailVel = velocity.clone().multiplyScalar(-0.3 - Math.random() * 0.2)
            setTimeout(() => {
              this.effectsSystem?.createSparkle(
                shard.position.clone(),
                trailVel,
                trailColor,
                0.3 + Math.random() * 0.3
              )
            }, i * 50)
          }
        }
      })
      
      // Trigger dramatic impact sound via AudioManager if available
      if (this.audioManager) {
        this.audioManager.playHitSound()
      }
    }, 150) // Delay fragmentation by 150ms for dramatic flash
  }

  /**
   * Clean up fragments when game is reset or ended
   */
  cleanupFragments(): void {
    this.fragments.forEach(frag => {
      if (frag.mesh.parent) {
        frag.mesh.parent.remove(frag.mesh)
      }
      // Dispose geometry and material
      frag.mesh.geometry.dispose()
      if (Array.isArray(frag.mesh.material)) {
        frag.mesh.material.forEach(m => m.dispose())
      } else {
        frag.mesh.material.dispose()
      }
    })
    this.fragments = []
    this.isExploded = false
    
    // 🛡️ Safety check: only set visibility if mesh exists
    if (this.mesh) {
      this.mesh.visible = true
    }
  }

  private updateJetVFX(deltaTime: number): void {
    if (!this.effectsSystem) return
    
    this.jetTrailTimer += deltaTime
    
    if (this.jetTrailTimer >= this.jetTrailInterval) {
      // Calculate jet position (behind player)
      const jetPosition = this.position.clone().add(
        this.lastDashDirection.clone().multiplyScalar(0.5)
      )
      
      // Create multiple jet particles for THICK DRAMATIC trail
      for (let i = 0; i < 8; i++) { // INCREASED from 5 to 8 for more particles
        // Random offset for spread
        const spread = new THREE.Vector3(
          (Math.random() - 0.5) * 0.4, // Wider spread
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.3
        )
        
        const jetPos = jetPosition.clone().add(spread)
        
        // Jet velocity (opposite of movement direction, with spread) - FASTER!
        const jetVelocity = this.lastDashDirection.clone()
          .multiplyScalar(12 + Math.random() * 6) // FASTER jet particles (was 8+4)
          .add(new THREE.Vector3(
            (Math.random() - 0.5) * 3, // More spread
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1.5
          ))
        
        // Orange/yellow jet colors (like rocket exhaust) - BRIGHTER!
        const jetColor = new THREE.Color().setHSL(
          0.08 + Math.random() * 0.08, // Orange-yellow range
          1.0,
          0.7 + Math.random() * 0.3 // Brighter
        )
        
        // Create jet particle
        this.effectsSystem.createSparkle(jetPos, jetVelocity, jetColor, 0.4 + Math.random() * 0.3)
      }
      
      // Also create larger explosion particles for main jet - MORE DRAMATIC!
      for (let i = 0; i < 5; i++) { // INCREASED from 3 to 5
        const mainJetPos = jetPosition.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.3, // Wider spread
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.2
          )
        )
        
        const mainJetVelocity = this.lastDashDirection.clone()
          .multiplyScalar(10 + Math.random() * 5) // FASTER (was 6+3)
        
        // 75% saturated, 25% bright to prevent whiteouts
        const useSaturated = Math.random() < 0.75
        const mainJetColor = new THREE.Color().setHSL(0.08, 1.0, useSaturated ? 0.55 : 0.7) // Saturated orange
        this.effectsSystem.createSparkle(mainJetPos, mainJetVelocity, mainJetColor, 0.5)
      }
      
      // Create vector-style jet lines for extra DRAMA!
      for (let i = 0; i < 3; i++) {
        const vectorJetPos = jetPosition.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            0
          )
        )
        
        const vectorJetVelocity = this.lastDashDirection.clone()
          .multiplyScalar(15 + Math.random() * 5)
        
        // 75% saturated, 25% bright
        const useSaturatedVector = Math.random() < 0.75
        const vectorColor = new THREE.Color().setHSL(0.1, 1.0, useSaturatedVector ? 0.55 : 0.75) // Saturated orange-yellow
        this.effectsSystem.createJetVector(vectorJetPos, vectorJetVelocity, vectorColor, 0.6, 1) // Type 1 = line
      }
      
      this.jetTrailTimer = 0
    }
  }

  takeDamage(damage: number): void {
    // 🧪 TEST MODE - Unlimited health! 🧪
    if (this.isTestMode) {
      // Flash gold to show test mode is active
      const material = this.mesh.material as THREE.MeshLambertMaterial
      material.emissive.setHex(0xFFD700) // Gold flash
      setTimeout(() => {
        material.emissive.setHex(0x334455)
      }, 50)
      return // No damage taken!
    }
    
    // 🌟 INVULNERABLE PICKUP - NO DAMAGE! 🌟
    if (this.isInvulnerablePickup) {
      // Flash green to show invulnerability is working
      const material = this.mesh.material as THREE.MeshLambertMaterial
      material.emissive.setHex(0x00FF00)
      setTimeout(() => {
        material.emissive.setHex(0x334455)
      }, 50)
      return // No damage taken!
    }
    
    // 🛡️ SHIELD ABSORBS HIT! 🛡️
    if (this.shieldCount > 0) {
      // Shield absorbs the hit - lose one shield
      this.shieldCount--

      // Update shield visual based on remaining shields
      if (this.shieldCount <= 0) {
        this.deactivateShield()
        // 🔔 NOTIFY SHIELD DEACTIVATION (all shields gone) 🔔
        if (this.onShieldDeactivatedCallback) {
          this.onShieldDeactivatedCallback()
        }
      }

      // 🔔 NOTIFY SHIELD COUNT CHANGE 🔔
      if (this.onShieldCountChangedCallback) {
        this.onShieldCountChangedCallback(this.shieldCount)
      }

      // Visual feedback - shield shatter effect (GREEN for shield break)
      if (this.effectsSystem) {
        this.effectsSystem.createExplosion(
          this.position,
          1.5,
          new THREE.Color().setHSL(0.5, 1.0, 0.6) // Cyan explosion for shield hit
        )
      }

      // 🔴 STILL FLASH RED EVEN WITH SHIELD! 🔴
      this.flashRed()

      // Audio feedback
      if (this.audioManager) {
        this.audioManager.playHitSound()
      }

      return // Shield absorbed the damage!
    }
    
    // Normal damage when no shield
    this.health = Math.max(0, this.health - damage)

    // ⚡ TRIGGER GLITCH POST-PROCESSING EFFECT - Brief flash on damage! ⚡
    if (this.postProcessing) {
      this.postProcessing.triggerGlitch(0.8, 0.5) // Increased intensity and duration for visibility
    }

    // 🔴 FLASH RED! 🔴
    this.flashRed()
  }
  
  // 🔴 DRAMATIC RED FLASH - Always visible damage feedback! 🔴
  private flashRed(): void {
    const material = this.mesh.material as THREE.MeshLambertMaterial
    const originalScale = this.mesh.scale.clone()
    
    // BRIGHT RED FLASH!
    material.emissive.setHex(0xFF0000) // Pure red glow
    material.color.setHex(0xFF0000)    // Hull goes full red
    material.opacity = 1.0             // Full opacity
    
    // Scale up for impact effect
    this.mesh.scale.multiplyScalar(1.3)
    
    // Flash sequence: Red → White → Red → Normal
    setTimeout(() => {
      material.emissive.setHex(0xFFFFFF) // White flash
      material.color.setHex(0xFFAAAA)    // Light red
    }, 50)
    
    setTimeout(() => {
      material.emissive.setHex(0xFF0000) // Back to red
      material.color.setHex(0xFF4444)    
      this.mesh.scale.copy(originalScale) // Reset scale
    }, 100)
    
    setTimeout(() => {
      material.emissive.setHex(0xFF6666) // Fading red
      material.color.setHex(0xFF8888)    
    }, 150)
    
    setTimeout(() => {
      material.emissive.setHex(0x334455) // Back to metallic glow
      material.color.setHex(0xB8C4D0)   // Back to silver
    }, 200)
  }
  
  // 🛡️ ACTIVATE SHIELD VISUAL - Show force field! 🛡️
  private activateShield(): void {
    if (this.shieldMesh) {
      this.shieldMesh.visible = true
      const material = this.shieldMesh.material as THREE.MeshBasicMaterial
      material.opacity = 0.6
    }
    // Activate inner glow too (shield is added after particle trail, so index 11)
    // Inner shield is at index 12
    if (this.mesh.children.length > 12) {
      const innerShield = this.mesh.children[12] as THREE.Mesh
      if (innerShield && innerShield.geometry instanceof THREE.RingGeometry) {
        innerShield.visible = true
        const innerMaterial = innerShield.material as THREE.MeshBasicMaterial
        innerMaterial.opacity = 0.4
      }
    }
  }

  // 🛡️ DEACTIVATE SHIELD VISUAL - Hide force field! 🛡️
  private deactivateShield(): void {
    if (this.shieldMesh) {
      this.shieldMesh.visible = false
      const material = this.shieldMesh.material as THREE.MeshBasicMaterial
      material.opacity = 0.0
    }
    // Deactivate inner glow too
    if (this.mesh.children.length > 12) {
      const innerShield = this.mesh.children[12] as THREE.Mesh
      if (innerShield && innerShield.geometry instanceof THREE.RingGeometry) {
        innerShield.visible = false
        const innerMaterial = innerShield.material as THREE.MeshBasicMaterial
        innerMaterial.opacity = 0.0
      }
    }
  }

  // 🛡️ COLLECT SHIELD PICKUP - Add a shield (max 3) 🛡️
  collectShield(): boolean {
    // Check if already at max shields
    if (this.shieldCount >= Player.MAX_SHIELDS) {
      return false // Can't collect more shields
    }

    // Add a shield
    this.shieldCount++

    // Activate visual if this is the first shield
    if (this.shieldCount === 1) {
      this.activateShield()
      // 🔔 NOTIFY SHIELD ACTIVATION 🔔
      if (this.onShieldActivatedCallback) {
        this.onShieldActivatedCallback()
      }
    }

    // 🔔 NOTIFY SHIELD COUNT CHANGE 🔔
    if (this.onShieldCountChangedCallback) {
      this.onShieldCountChangedCallback(this.shieldCount)
    }

    // Visual feedback - CYAN flash for shield pickup
    const material = this.mesh.material as THREE.MeshLambertMaterial
    material.emissive.setHex(0x00FFFF) // Cyan shield glow
    material.color.setHex(0x88FFFF)   // Hull tints cyan

    setTimeout(() => {
      material.emissive.setHex(0x334455) // Back to metallic glow
      material.color.setHex(0xB8C4D0)   // Back to silver
    }, 300)

    return true // Successfully collected (pickup will be removed)
  }

  // 🛡️ CHECK IF PLAYER HAS ANY SHIELDS 🛡️
  hasActiveShield(): boolean {
    return this.shieldCount > 0
  }

  // 🛡️ GET CURRENT SHIELD COUNT 🛡️
  getShieldCount(): number {
    return this.shieldCount
  }

  // 💚 HEAL METHOD - Restore health from med packs! 💚
  heal(amount: number): void {
    const oldHealth = this.health
    this.health = Math.min(this.maxHealth, this.health + amount)
    const actualHeal = this.health - oldHealth
    
    if (actualHeal > 0) {
      // Visual feedback for healing - BRIGHT GREEN FLASH on ship!
      const material = this.mesh.material as THREE.MeshLambertMaterial
      const originalScale = this.mesh.scale.clone()
      
      // BRIGHT GREEN FLASH!
      material.emissive.setHex(0x00FF00) // Pure green glow
      material.color.setHex(0x00FF00)    // Hull goes full green
      material.opacity = 1.0             // Full opacity
      
      // Scale up for impact effect
      this.mesh.scale.multiplyScalar(1.15)
      
      // Flash sequence: Green → Light Green → Green → Normal
      setTimeout(() => {
        material.emissive.setHex(0x88FF88) // Light green
        material.color.setHex(0xAAFFAA)    
      }, 50)
      
      setTimeout(() => {
        material.emissive.setHex(0x00FF00) // Back to bright green
        material.color.setHex(0x44FF44)    
        this.mesh.scale.copy(originalScale) // Reset scale
      }, 100)
      
      setTimeout(() => {
        material.emissive.setHex(0x334455) // Back to metallic glow
        material.color.setHex(0xB8C4D0)   // Back to silver
      }, 300)
    }
  }

  addXP(amount: number): void {
    this.xp += amount
    
    // Check for level up
    while (this.xp >= this.xpToNext) {
      this.levelUp()
    }
  }

  private levelUp(): void {
    this.xp -= this.xpToNext
    this.level++
    this.xpToNext = Math.floor(this.xpToNext * 1.3) // Increase XP requirement
    
    // Audio feedback for level up
    if (this.audioManager) {
      this.audioManager.playLevelUpSound()
    }
    
    // Visual effect for level up - GOLD FLASH!
    const material = this.mesh.material as THREE.MeshLambertMaterial
    material.emissive.setHex(0xFFDD00) // Gold level up flash
    material.color.setHex(0xFFEE88)   // Hull goes golden
    
    setTimeout(() => {
      material.emissive.setHex(0x334455) // Back to metallic glow
      material.color.setHex(0xB8C4D0)   // Back to silver
    }, 500)
  }

  // Collision detection
  isCollidingWith(other: { getPosition(): THREE.Vector3, getRadius(): number }): boolean {
    const distance = this.position.distanceTo(other.getPosition())
    return distance < (this.getRadius() + other.getRadius()) // Use actual player radius
  }

  // Getters
  getMesh(): THREE.Mesh {
    return this.mesh
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone()
  }

  /**
   * Set player position (updates both internal position and mesh)
   * Use this instead of directly setting mesh.position!
   */
  setPosition(x: number, y: number, z: number = 0): void {
    this.position.set(x, y, z)
    if (this.mesh) {
      this.mesh.position.set(x, y, z)
    }
  }

  getHealth(): number {
    return this.health
  }

  getMaxHealth(): number {
    return this.maxHealth
  }

  getLevel(): number {
    return this.level
  }

  getXP(): number {
    return this.xp
  }

  getXPToNext(): number {
    return this.xpToNext
  }

  isDead(): boolean {
    return this.health <= 0
  }

  getRadius(): number {
    return 0.5 // Matches the spaceship visual size better
  }

  /**
   * 🎯 Get the direction the ship is currently facing (based on mesh rotation)
   * This is used by WeaponSystem to fire bullets in the correct direction
   */
  getFacingDirection(): THREE.Vector3 {
    // Convert mesh rotation to direction vector
    // Ship nose points up (positive Y) at rotation 0, so we need to account for that
    const rotation = this.mesh.rotation.z
    return new THREE.Vector3(
      Math.sin(-rotation),  // X component
      Math.cos(-rotation),  // Y component (ship nose points up)
      0
    ).normalize()
  }

  collectPowerUp(): boolean {
    if (this.powerUpLevel < 10) {
      this.powerUpLevel++
      
      // Ensure level doesn't exceed 10 (safety check)
      if (this.powerUpLevel > 10) {
        this.powerUpLevel = 10
      }
      
      // Audio feedback handled by Game.ts (playPowerUpCollectSound)
      
      // Visual effect for power-up collection - CYAN flash (weapon power!)
      const material = this.mesh.material as THREE.MeshLambertMaterial
      material.emissive.setHex(0x00FFFF) // Cyan flash for weapon power
      material.color.setHex(0x88FFFF)   // Hull tints cyan
      
      setTimeout(() => {
        material.emissive.setHex(0x334455) // Back to metallic glow
        material.color.setHex(0xB8C4D0)   // Back to silver
      }, 300)
    }
    
    return true // Always return true so pickup is removed from world
  }

  getPowerUpLevel(): number {
    return this.powerUpLevel
  }

  isAtMaxPowerUp(): boolean {
    return this.powerUpLevel >= 10
  }

  resetPowerUpLevel(): void {
    this.powerUpLevel = 0
  }

  /**
   * 🔻 REDUCE POWER-UP LEVEL - UFO laser drains weapon power! 🔻
   * Returns the amount actually reduced (may be less if player has low power)
   */
  reducePowerUpLevel(amount: number): number {
    const oldLevel = this.powerUpLevel
    this.powerUpLevel = Math.max(0, this.powerUpLevel - amount)
    const actualReduction = oldLevel - this.powerUpLevel

    // Visual effect for power drain - RED flash (power lost!)
    if (actualReduction > 0) {
      const material = this.mesh.material as THREE.MeshLambertMaterial
      material.emissive.setHex(0xFF0000) // Red flash for power drain
      material.color.setHex(0xFF8888)   // Hull tints red

      setTimeout(() => {
        material.emissive.setHex(0x334455) // Back to metallic glow
        material.color.setHex(0xB8C4D0)   // Back to silver
      }, 300)
    }

    return actualReduction
  }
  
  // ⚡ SPEED-UP SYSTEM - 5% faster per pickup, max 20 levels (100% max boost) ⚡
  collectSpeedUp(): boolean {
    if (this.speedUpLevel < Player.MAX_SPEED_LEVEL) {
      this.speedUpLevel++
      
      // Safety check
      if (this.speedUpLevel > Player.MAX_SPEED_LEVEL) {
        this.speedUpLevel = Player.MAX_SPEED_LEVEL
      }
      
      // Recalculate speed
      this.updateSpeed()
      
      // Visual effect for speed-up collection - GREEN flash (speed boost!)
      const material = this.mesh.material as THREE.MeshLambertMaterial
      material.emissive.setHex(0x00FF00) // Green flash for speed
      material.color.setHex(0x88FF88)   // Hull tints green
      
      setTimeout(() => {
        material.emissive.setHex(0x334455) // Back to metallic glow
        material.color.setHex(0xB8C4D0)   // Back to silver
      }, 300)
    }
    
    return true // Always return true so pickup is removed from world
  }
  
  private updateSpeed(): void {
    // Calculate speed: base speed * (1 + boost percentage)
    // Each level adds 5% of base speed (20 levels max = 100% boost = 2x speed!)
    const boostMultiplier = 1 + (this.speedUpLevel * Player.SPEED_BOOST_PER_LEVEL)
    this.speed = this.baseSpeed * boostMultiplier
    
    // Also scale dash speed proportionally
    this.dashSpeed = 30 * boostMultiplier
  }
  
  getSpeedUpLevel(): number {
    return this.speedUpLevel
  }
  
  isAtMaxSpeed(): boolean {
    return this.speedUpLevel >= Player.MAX_SPEED_LEVEL
  }
  
  resetSpeedUpLevel(): void {
    this.speedUpLevel = 0
    this.updateSpeed()
  }
  
  // 🛡️ RESET SHIELDS TO STARTING STATE (1 shield) 🛡️
  resetShield(): void {
    this.shieldCount = 1 // Start with 1 shield
    this.activateShield() // Show the shield visual

    // Notify of shield reset
    if (this.onShieldCountChangedCallback) {
      this.onShieldCountChangedCallback(this.shieldCount)
    }
  }

  isInvulnerableNow(): boolean {
    return this.isInvulnerable
  }

  setEffectsSystem(effectsSystem: EffectsSystem): void {
    this.effectsSystem = effectsSystem
  }

  setPostProcessing(postProcessing: PostProcessingManager): void {
    this.postProcessing = postProcessing
  }
  
  // 🧪 TEST MODE SETTER - Enable/disable unlimited health 🧪
  setTestMode(enabled: boolean): void {
    this.isTestMode = enabled
  }
  
  setRogueMode(enabled: boolean): void {
    this.isRogueMode = enabled
  }

  // 🎬 SET ZOOM COMPENSATION - Callback to get zoom scale from SceneManager! 🎬
  setZoomCompensationCallback(callback: () => number): void {
    this.zoomCompensationCallback = callback
  }
  
  // 🛡️ SET SHIELD NOTIFICATION CALLBACKS 🛡️
  setShieldCallbacks(
    onActivated: () => void,
    onDeactivated: () => void,
    onCountChanged?: (count: number) => void
  ): void {
    this.onShieldActivatedCallback = onActivated
    this.onShieldDeactivatedCallback = onDeactivated
    if (onCountChanged) {
      this.onShieldCountChangedCallback = onCountChanged
    }
  }
  
  // 🌟 INVULNERABLE PICKUP METHODS 🌟
  collectInvulnerable(): boolean {
    if (!this.isInvulnerablePickup) {
      this.activateInvulnerable()
      return true
    }
    // If already invulnerable, refresh the timer
    this.invulnerableTimer = this.invulnerableDuration
    return true
  }
  
  private activateInvulnerable(): void {
    this.isInvulnerablePickup = true
    this.invulnerableTimer = this.invulnerableDuration
    
    // Notification callback
    if (this.onInvulnerableActivatedCallback) {
      this.onInvulnerableActivatedCallback()
    }
    
    // Audio feedback
    if (this.audioManager) {
      this.audioManager.playLevelUpSound() // Dramatic sound for rare pickup
    }
  }
  
  private deactivateInvulnerable(): void {
    this.isInvulnerablePickup = false
    this.invulnerableTimer = 0
    
    // Reset visual effects
    const material = this.mesh.material as THREE.MeshLambertMaterial
    material.emissive.setHex(0x334455)
    material.color.setHex(0xB8C4D0)
    material.emissiveIntensity = 1.0
    
    // Notification callback
    if (this.onInvulnerableDeactivatedCallback) {
      this.onInvulnerableDeactivatedCallback()
    }
  }
  
  setInvulnerableCallbacks(onActivated: () => void, onDeactivated: () => void): void {
    this.onInvulnerableActivatedCallback = onActivated
    this.onInvulnerableDeactivatedCallback = onDeactivated
  }
  
  isInvulnerableActive(): boolean {
    return this.isInvulnerablePickup
  }
  
  // 🚫 Force clear invulnerable state (for level transitions)
  clearInvulnerable(): void {
    if (this.isInvulnerablePickup) {
      this.deactivateInvulnerable()
    }
  }
  
  getInvulnerableTimeRemaining(): number {
    return this.invulnerableTimer
  }
  
  // 🎲 ROGUE MODE: APPLY STAT MUTATION 🎲
  applyRogueStatMutation(statModifier: {
    movementSpeed?: number
    shieldCapacity?: number
  }): void {
    if (statModifier.movementSpeed !== undefined) {
      this.movementSpeedMultiplier *= statModifier.movementSpeed
      // Recalculate speed with new multiplier
      this.updateSpeed()
    }
    
    if (statModifier.shieldCapacity !== undefined) {
      this.shieldCapacityBonus += statModifier.shieldCapacity
    }
  }
  
  // 🎲 ROGUE MODE: GET SHIELD CAPACITY (base + bonus) 🎲
  getShieldCapacity(): number {
    return 1 + this.shieldCapacityBonus // Base 1 shield + bonus
  }
  
  // 🎲 ROGUE MODE: RESET MUTATIONS (for new run) 🎲
  resetRogueMutations(): void {
    this.movementSpeedMultiplier = 1.0
    this.shieldCapacityBonus = 0
  }
}
