import * as THREE from 'three'
import { InputManager } from '../core/InputManager'
import { AudioManager } from '../audio/AudioManager'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { PostProcessingManager } from '../graphics/PostProcessingManager'
import { BALANCE_CONFIG } from '../config'
import { outlinePolygon, solidPolygon, discSolid, ringOutline, fragmentsFromOutline, VectorFragment } from '../graphics/VectorShapes'
import { ENTITY_PALETTE } from '../config/palette.config'

const HULL_POINTS = [
  new THREE.Vector2(0, 0.9),      // nose
  new THREE.Vector2(-0.62, -0.55), // left wingtip
  new THREE.Vector2(-0.22, -0.35), // left tail notch
  new THREE.Vector2(0, -0.5),      // tail center
  new THREE.Vector2(0.22, -0.35),  // right tail notch
  new THREE.Vector2(0.62, -0.55),  // right wingtip
]

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
  private isDashing: boolean = false
  private isInvulnerable: boolean = false // Invulnerability during dash
  private isInvulnerablePickup: boolean = false // 🌟 INVULNERABLE PICKUP STATE 🌟
  private invulnerableTimer: number = 0 // Timer for invulnerable duration
  private invulnerableDuration: number = BALANCE_CONFIG.PLAYER.INVULNERABLE_DURATION
  private dashStretchTimer: number = 0 // Eases mesh.scale.y back to 1 after a dash
  private flashTimer: number = 0
  private flashColorHex: number = 0xFFFFFF

  // 💀 DEATH FRAGMENTS - vector shard burst 💀
  private fragments: VectorFragment[] = []
  private isExploded: boolean = false

  private audioManager: AudioManager | null = null
  private effectsSystem: EffectsSystem | null = null
  private postProcessing: PostProcessingManager | null = null

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

  constructor() {
    this.position = new THREE.Vector3(0, 0, 0)
    this.velocity = new THREE.Vector3(0, 0, 0)
  }

  initialize(audioManager?: AudioManager): void {
    this.audioManager = audioManager || null

    // 🚀 VECTOR ARROWHEAD SHIP - one outline, one signature color, bloom does the glow 🚀
    this.mesh = outlinePolygon(HULL_POINTS, 0.07, ENTITY_PALETTE.PLAYER)
    this.mesh.position.set(this.position.x, this.position.y, 0)
    this.mesh.visible = true

    const cockpit = discSolid(0.09, ENTITY_PALETTE.PLAYER_COCKPIT)
    cockpit.position.set(0, 0.25, 0.01)
    this.mesh.add(cockpit)                                    // child 0

    const flame = solidPolygon([
      new THREE.Vector2(-0.14, -0.5),
      new THREE.Vector2(0.14, -0.5),
      new THREE.Vector2(0, -0.95),
    ], ENTITY_PALETTE.PLAYER_COCKPIT)
    this.mesh.add(flame)                                      // child 1

    const shield = ringOutline(1.0, 0.07, 0x00FF88)
    shield.visible = false
    this.mesh.add(shield)                                     // child 2
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
    
    // 🎮 ANALOG MOVEMENT INPUT - Smooth acceleration! 🎮
    const movement = inputManager.getMovementVector()
    
    // Calculate target velocity based on input
    const baseSpeed = this.isDashing ? this.dashSpeed : this.speed
    const currentSpeed = baseSpeed
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
      this.startDash()
    }
    
    // Update position with smooth velocity
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime

    // 🔘 CIRCULAR BOUNDARY COLLISION & BOUNCE 🔘
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
          this.effectsSystem.createWeaponImpact(this.position.clone())
        }
      }
    }

    // Update mesh position (ensure z=0 for top-down view)
    this.mesh.position.set(this.position.x, this.position.y, 0)

    // Update visual effects based on movement
    this.updateVisualEffects(deltaTime, movement)
  }

  private startDash(): void {
    this.isDashing = true
    this.isInvulnerable = BALANCE_CONFIG.PLAYER.DASH_INVULNERABLE // INVULNERABLE during dash!
    this.dashDuration = BALANCE_CONFIG.PLAYER.DASH_DURATION
    this.dashCooldown = BALANCE_CONFIG.PLAYER.DASH_COOLDOWN
    this.dashStretchTimer = 0.2 // Eases mesh.scale.y back to 1 over 0.2s (see updateVisualEffects)

    // Audio feedback for dash - play both thrust and dash sounds!
    if (this.audioManager) {
      this.audioManager.playThrustSound() // 🚀 Powerful jet engine burst!
      this.audioManager.playDashSound()   // Swoosh overlay
    }
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

    // 🔥 ENGINE FLAME - jitter scale + visibility based on movement 🔥
    const flame = this.mesh.children[1] as THREE.Mesh
    const velocityMagnitude = this.velocity.length()
    const isThrusting = velocityMagnitude > this.speed * 0.5
    flame.scale.y = isThrusting ? 0.8 + Math.random() * 0.5 : 0.4
    flame.visible = velocityMagnitude > 0.1

    // 🎬 GET ZOOM COMPENSATION - Keep ship visually consistent! 🎬
    const zoomCompensation = this.zoomCompensationCallback ? this.zoomCompensationCallback() : 1.0

    // 🌟 INVULNERABLE - whole-mesh blink at 8Hz 🌟
    if (this.isInvulnerablePickup) {
      const elapsed = (this.invulnerableDuration - this.invulnerableTimer)
      this.mesh.visible = Math.floor(elapsed * 8) % 2 === 0
    }

    // 🚀 DASH - scale.y stretch easing back over 0.2s 🚀
    if (this.dashStretchTimer > 0) {
      this.dashStretchTimer = Math.max(0, this.dashStretchTimer - deltaTime)
      const t = this.dashStretchTimer / 0.2 // 1 -> 0 over the ease window
      this.mesh.scale.y = (1 + 0.25 * t) * zoomCompensation
      this.mesh.scale.x = 1 * zoomCompensation
    } else {
      this.mesh.scale.set(zoomCompensation, zoomCompensation, 1)
    }

    // 🎨 FLASH TIMER - drives hull color for all damage/pickup feedback 🎨
    const hullMaterial = this.mesh.material as THREE.MeshBasicMaterial
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - deltaTime)
      hullMaterial.color.setHex(this.flashColorHex)
    } else {
      hullMaterial.color.setHex(ENTITY_PALETTE.PLAYER)
    }

    // 🛡️ SHIELD RING - visible while shields held, slow rotation 🛡️
    const shield = this.mesh.children[2] as THREE.Mesh
    shield.visible = this.shieldCount > 0
    shield.rotation.z += deltaTime * 1.5
  }

  /**
   * 🎨 Single timer-driven flash — hull color snaps to `hex` and eases back to
   * ENTITY_PALETTE.PLAYER over `duration` seconds (driven from updateVisualEffects).
   */
  private flashColor(hex: number, duration: number = 0.2): void {
    this.flashColorHex = hex
    this.flashTimer = duration
  }

  private updateFragments(deltaTime: number): void {
    this.fragments.forEach((frag) => {
      // Update position (2D velocity, drawn on the top-down plane)
      frag.mesh.position.x += frag.velocity.x * deltaTime
      frag.mesh.position.y += frag.velocity.y * deltaTime

      // Tumbling rotation
      frag.mesh.rotation.z += frag.spin * deltaTime

      // Fade out over the existing death-animation duration
      const material = frag.mesh.material as THREE.MeshBasicMaterial
      material.opacity = Math.max(0, material.opacity - deltaTime * 0.6)
    })
  }

  /**
   * 💀 VECTOR SHATTER DEATH 💀
   * Breaks the hull outline into edge fragments that fly outward and fade.
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

    // Hide the hull and spawn hull-outline shards flying outward
    this.mesh.visible = false

    const playerPos = this.getPosition()
    const newFragments = fragmentsFromOutline(HULL_POINTS, 0.07, ENTITY_PALETTE.PLAYER)
    newFragments.forEach(frag => {
      frag.mesh.position.x += playerPos.x
      frag.mesh.position.y += playerPos.y
      if (this.mesh.parent) {
        this.mesh.parent.add(frag.mesh)
      }
      this.fragments.push(frag)
    })

    // Trigger dramatic impact sound via AudioManager if available
    if (this.audioManager) {
      this.audioManager.playHitSound()
    }
  }

  /**
   * Clean up fragments when game is reset or ended
   */
  cleanupFragments(): void {
    this.fragments.forEach(frag => {
      if (frag.mesh.parent) {
        frag.mesh.parent.remove(frag.mesh)
      }
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

  /**
   * 🧹 Dispose GPU resources - call after removing the mesh from the scene
   */
  dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }

  takeDamage(damage: number): void {
    // 🧪 TEST MODE - Unlimited health! 🧪
    if (this.isTestMode) {
      this.flashColor(0xFFD700) // Gold flash to show test mode is active
      return // No damage taken!
    }

    // 🌟 INVULNERABLE PICKUP - NO DAMAGE! 🌟
    if (this.isInvulnerablePickup) {
      this.flashColor(0x00FF00) // Green flash to show invulnerability is working
      return // No damage taken!
    }

    // 🛡️ SHIELD ABSORBS HIT! 🛡️
    if (this.shieldCount > 0) {
      // Shield absorbs the hit - lose one shield
      this.shieldCount--

      // Update shield visual based on remaining shields
      if (this.shieldCount <= 0) {
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
      this.flashColor(0xFF4444)

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
    this.flashColor(0xFF4444)
  }

  // 🛡️ COLLECT SHIELD PICKUP - Add a shield (max 3) 🛡️
  collectShield(): boolean {
    // Check if already at max shields
    if (this.shieldCount >= Player.MAX_SHIELDS) {
      return false // Can't collect more shields
    }

    // Add a shield
    this.shieldCount++

    // Notify activation if this is the first shield
    if (this.shieldCount === 1) {
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
    this.flashColor(0x00FFFF)

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
      // Visual feedback for healing - GREEN FLASH on ship!
      this.flashColor(0x00FF00)
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
    this.flashColor(0xFFD700, 0.5)
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
      this.flashColor(0x00FFFF, 0.3)
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
      this.flashColor(0xFF0000, 0.3)
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
      this.flashColor(0x00DD55, 0.3)
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
    this.shieldCount = 1 // Start with 1 shield — shield ring visibility follows shieldCount in updateVisualEffects

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

    // Stop the blink — mesh must end up visible
    this.mesh.visible = true

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
    this.mesh.visible = true
  }
  
  getInvulnerableTimeRemaining(): number {
    return this.invulnerableTimer
  }
  
  getShieldCapacity(): number {
    return 1 // Base 1 shield
  }
}
