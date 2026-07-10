import * as THREE from 'three'
import { Player } from '../entities/Player'
import { Projectile } from './Projectile'
import { SceneManager } from '../graphics/SceneManager'
import { InputManager } from '../core/InputManager'
import { AudioManager } from '../audio/AudioManager'
import { EffectsSystem } from '../graphics/EffectsSystem'
import { BALANCE_CONFIG } from '../config'

// 🎯 WEAPON TYPES 🎯
export enum WeaponType {
  BULLETS = 'bullets',
  LASERS = 'lasers',
  PHOTONS = 'photons'
}

export class WeaponSystem {
  private projectiles: Projectile[] = []
  private player!: Player
  private sceneManager!: SceneManager
  private audioManager!: AudioManager
  private fireTimer: number = 0
  private fireRate: number = BALANCE_CONFIG.WEAPONS.BASE_FIRE_RATE
  private damage: number = BALANCE_CONFIG.WEAPONS.BASE_DAMAGE
  private projectileSpeed: number = BALANCE_CONFIG.WEAPONS.BASE_PROJECTILE_SPEED
  private range: number = BALANCE_CONFIG.WEAPONS.BASE_RANGE
  private effectsSystem: EffectsSystem | null = null
  
  // 🔥 HEAT SYSTEM 🔥
  private heat: number = 0 // 0-100
  private isOverheated: boolean = false
  private coolingRate: number = BALANCE_CONFIG.WEAPONS.HEAT_COOLDOWN_RATE
  private heatPerShot: number = BALANCE_CONFIG.WEAPONS.HEAT_PER_SHOT
  private overheatThreshold: number = BALANCE_CONFIG.WEAPONS.HEAT_MAX
  private heatChangeCallback: ((heat: number, isOverheated: boolean) => void) | null = null
  
  // 🎯 WEAPON TYPE SYSTEM 🎯
  private currentWeaponType: WeaponType = WeaponType.BULLETS
  private weaponTypeChangeCallback: ((weaponType: WeaponType) => void) | null = null
  
  // 🎲 ROGUE MODE: FIRING MODE MUTATIONS 🎲
  private firingModes: {
    sideFire?: boolean
    rearFire?: boolean
    spiralShot?: boolean
    burstPulse?: boolean
    chargeShot?: boolean
  } = {}
  private fireRateMultiplier: number = 1.0
  private projectileSpeedMultiplier: number = 1.0
  private heatDecayMultiplier: number = 1.0
  private spiralRotation: number = 0 // For spiral shot rotation

  initialize(player: Player, sceneManager: SceneManager, audioManager: AudioManager): void {
    this.player = player
    this.sceneManager = sceneManager
    this.audioManager = audioManager
  }

  update(deltaTime: number, inputManager: InputManager): void {
    // Update fire timer
    this.fireTimer += deltaTime

    // 🔥 Update heat logic 🔥
    const isFiringInput = inputManager.isFiring()
    
    if (isFiringInput && !this.isOverheated) {
      // Heat is handled in fireInDirection for each shot
    } else {
      // Cool down when not firing or when overheated (with rogue mutations)
      const coolingMultiplier = this.isOverheated ? 1.2 : 1.0 // Cool slightly faster when overheated to get back in action
      this.heat = Math.max(0, this.heat - this.coolingRate * coolingMultiplier * this.heatDecayMultiplier * deltaTime)
      
      // Reset overheated state once cooled down completely
      if (this.isOverheated && this.heat <= 0) {
        this.isOverheated = false
        console.log('❄️ Weapons cooled down!')
      }
    }

    // Notify UI of heat changes
    if (this.heatChangeCallback) {
      this.heatChangeCallback(this.heat, this.isOverheated)
    }

    // ASTEROIDS-style firing - fire in movement direction or last movement direction (with rogue fire rate mutation)
    const effectiveFireRate = this.fireRate / this.fireRateMultiplier
    if (isFiringInput && this.fireTimer >= effectiveFireRate && !this.isOverheated) {
      this.fireInDirection()
      this.fireTimer = 0
    }

    // Update all projectiles
    for (const projectile of this.projectiles) {
      if (projectile.isAlive()) {
        projectile.update(deltaTime)
      }
    }

    // Remove dead projectiles
    this.cleanupProjectiles()
  }

  private fireInDirection(): void {
    const playerPos = this.player.getPosition()
    
    // 🎯 ALWAYS fire in the direction the ship is VISUALLY facing! 🎯
    // This ensures bullets come out of the nose of the ship, not based on input lag
    const firingDirection = this.player.getFacingDirection()

    // Get power-up level from player
    const powerUpLevel = this.player.getPowerUpLevel()
    
    // Calculate weapon stats based on power-up level (with rogue mutations)
    const bulletCount = 1 + powerUpLevel // 1 bullet at level 0, 11 at level 10
    const speedMultiplier = (1 + powerUpLevel * 0.1) * this.projectileSpeedMultiplier // +10% per level + rogue mutation
    const damageMultiplier = 1 + powerUpLevel * BALANCE_CONFIG.PLAYER.POWER_UP_DAMAGE_MULTIPLIER
    const sizeMultiplier = 1 + powerUpLevel * 0.1 // +10% per level
    
    // Calculate spread pattern
    const maxSpread = 30 * (Math.PI / 180) // 30 degrees in radians
    const spreadAngle = maxSpread * (1 - powerUpLevel / 10) // Narrows as level increases
    
    // 🎲 ROGUE MODE: Update spiral rotation 🎲
    if (this.firingModes.spiralShot) {
      this.spiralRotation += 0.3 // Rotate spiral each shot
    }
    
    // Fire multiple bullets
    for (let i = 0; i < bulletCount; i++) {
      let bulletDirection: THREE.Vector3
      
      if (bulletCount === 1) {
        // Single bullet - fire straight (or with spiral offset)
        if (this.firingModes.spiralShot) {
          const spiralOffset = this.spiralRotation
          const cos = Math.cos(spiralOffset)
          const sin = Math.sin(spiralOffset)
          bulletDirection = new THREE.Vector3(
            firingDirection.x * cos - firingDirection.y * sin,
            firingDirection.x * sin + firingDirection.y * cos,
            0
          ).normalize()
        } else {
          bulletDirection = firingDirection.clone()
        }
      } else {
        // Multiple bullets - spread pattern
        const angleOffset = (i - (bulletCount - 1) / 2) * (spreadAngle / (bulletCount - 1))
        
        // Add spiral rotation if active
        const finalOffset = angleOffset + (this.firingModes.spiralShot ? this.spiralRotation : 0)
        
        // Rotate firing direction by angle offset
        const cos = Math.cos(finalOffset)
        const sin = Math.sin(finalOffset)
        bulletDirection = new THREE.Vector3(
          firingDirection.x * cos - firingDirection.y * sin,
          firingDirection.x * sin + firingDirection.y * cos,
          0
        ).normalize()
      }
      
      // Create projectile with scaled stats, weapon type, AND POWER LEVEL for VFX scaling!
      const projectile = new Projectile(
        playerPos.clone().add(bulletDirection.clone().multiplyScalar(0.5)), // Start slightly in front of player
        bulletDirection,
        this.projectileSpeed * speedMultiplier,
        this.damage * damageMultiplier,
        sizeMultiplier,
        this.currentWeaponType, // Pass weapon type
        powerUpLevel // 🔥 Pass power level for VFX scaling!
      )
      
      // 🎆 Connect effects system for SUPER JUICY projectiles!
      if (this.effectsSystem) {
        projectile.setEffectsSystem(this.effectsSystem)
      }

      this.projectiles.push(projectile)
      this.sceneManager.addToScene(projectile.getMesh())
    }
    
    // 🎲 ROGUE MODE: SIDE FIRE - Fire at ±90° 🎲
    if (this.firingModes.sideFire) {
      const sideDirections = [
        new THREE.Vector3(-firingDirection.y, firingDirection.x, 0).normalize(), // Left 90°
        new THREE.Vector3(firingDirection.y, -firingDirection.x, 0).normalize()   // Right 90°
      ]
      
      for (const sideDir of sideDirections) {
        const sideProjectile = new Projectile(
          playerPos.clone().add(sideDir.clone().multiplyScalar(0.5)),
          sideDir,
          this.projectileSpeed * speedMultiplier,
          this.damage * damageMultiplier,
          sizeMultiplier,
          this.currentWeaponType,
          powerUpLevel
        )
        
        if (this.effectsSystem) {
          sideProjectile.setEffectsSystem(this.effectsSystem)
        }
        
        this.projectiles.push(sideProjectile)
        this.sceneManager.addToScene(sideProjectile.getMesh())
      }
    }
    
    // 🎲 ROGUE MODE: REAR FIRE - Fire backward 🎲
    if (this.firingModes.rearFire) {
      const rearDirection = firingDirection.clone().multiplyScalar(-1)
      const rearProjectile = new Projectile(
        playerPos.clone().add(rearDirection.clone().multiplyScalar(0.5)),
        rearDirection,
        this.projectileSpeed * speedMultiplier * 0.8, // Slightly slower rear shots
        this.damage * damageMultiplier,
        sizeMultiplier,
        this.currentWeaponType,
        powerUpLevel
      )
      
      if (this.effectsSystem) {
        rearProjectile.setEffectsSystem(this.effectsSystem)
      }
      
      this.projectiles.push(rearProjectile)
      this.sceneManager.addToScene(rearProjectile.getMesh())
    }

    // 🔥 Audio feedback for firing - NOW WITH POWER SCALING! 🔥
    this.audioManager.playPowerScaledFireSound(powerUpLevel, this.currentWeaponType)

    // 🔥 Visual feedback for firing - NOW WITH POWER SCALING! 🔥
    this.createMuzzleFlash(playerPos, firingDirection, powerUpLevel)

    // 🔥 Add heat! More bullets = more heat 🔥
    const heatGain = this.heatPerShot * bulletCount
    this.heat += heatGain
    
    if (this.heat >= this.overheatThreshold) {
      this.heat = this.overheatThreshold
      this.isOverheated = true
      
      // Audio feedback for overheating
      if (this.audioManager) {
        this.audioManager.playOverheatSound?.()
      }
      
      console.log('🔥 WEAPONS OVERHEATED!')
    }
  }

  private createMuzzleFlash(position: THREE.Vector3, direction: THREE.Vector3, powerLevel: number = 0): void {
    // 🎯 PERFORMANCE-OPTIMIZED MUZZLE FLASH - Single mesh only! 🎯
    // Visual impact from size/opacity, not multiple meshes
    const baseInnerRadius = 0.06 + powerLevel * 0.008
    const baseOuterRadius = 0.18 + powerLevel * 0.02
    const segments = 6 // Fixed low segment count for performance
    
    // Color based on weapon type
    let flashColor: number
    switch (this.currentWeaponType) {
      case WeaponType.LASERS:
        flashColor = powerLevel >= 5 ? 0xFF55AA : 0xFF0066
        break
      case WeaponType.PHOTONS:
        flashColor = powerLevel >= 5 ? 0x66FFFF : 0x00FFFF
        break
      default: // BULLETS
        flashColor = powerLevel >= 5 ? 0xFFDD00 : 0xFFAA00
    }
    
    const geometry = new THREE.RingGeometry(baseInnerRadius, baseOuterRadius, segments)
    const material = new THREE.MeshBasicMaterial({
      color: flashColor,
      transparent: true,
      opacity: 0.7 + powerLevel * 0.02,
      blending: THREE.AdditiveBlending
    })

    const flash = new THREE.Mesh(geometry, material)
    flash.position.copy(position)
    flash.lookAt(position.clone().add(direction))
    
    this.sceneManager.addToScene(flash)
    
    // REMOVED: Extra flash rings - single mesh is sufficient and performant

    // Fast flash animation - fixed duration
    const flashDuration = 0.08
    let flashTime = flashDuration
    const animateFlash = () => {
      flashTime -= 0.016 // ~60fps
      const progress = flashTime / flashDuration
      material.opacity = progress * (0.7 + powerLevel * 0.02)
      
      if (flashTime <= 0) {
        this.sceneManager.removeFromScene(flash)
        geometry.dispose()
        material.dispose()
      } else {
        requestAnimationFrame(animateFlash)
      }
    }
    animateFlash()
  }

  private cleanupProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      if (!projectile.isAlive()) {
        this.sceneManager.removeFromScene(projectile.getMesh())
        this.projectiles.splice(i, 1)
      }
    }
  }

  removeProjectile(projectile: Projectile): void {
    const index = this.projectiles.indexOf(projectile)
    if (index !== -1) {
      this.sceneManager.removeFromScene(projectile.getMesh())
      this.projectiles.splice(index, 1)
    }
  }

  getProjectiles(): Projectile[] {
    return this.projectiles
  }

  cleanup(): void {
    // Remove all projectiles from scene and clear array
    for (const projectile of this.projectiles) {
      this.sceneManager.removeFromScene(projectile.getMesh())
    }
    this.projectiles = []
    
    // Reset firing state
    this.fireTimer = 0

    console.log('🧹 WeaponSystem cleaned up and reset')
  }

  /**
   * 🧹 Clear all active projectiles (for level transitions)
   * Unlike cleanup(), this doesn't reset firing state
   */
  clearAllProjectiles(): void {
    for (const projectile of this.projectiles) {
      this.sceneManager.removeFromScene(projectile.getMesh())
    }
    this.projectiles = []
    console.log('🧹 All projectiles cleared')
  }

  // Upgrade methods for future expansion
  upgradeFireRate(multiplier: number): void {
    this.fireRate *= multiplier
  }

  upgradeDamage(amount: number): void {
    this.damage += amount
  }

  upgradeRange(amount: number): void {
    this.range += amount
  }
  
  // 🎆 SET EFFECTS SYSTEM FOR SUPER JUICY EFFECTS! 🎆
  setEffectsSystem(effectsSystem: EffectsSystem): void {
    this.effectsSystem = effectsSystem
  }
  
  // 🎯 WEAPON TYPE METHODS 🎯
  getCurrentWeaponType(): WeaponType {
    return this.currentWeaponType
  }

  // 🎯 HEAT SYSTEM METHODS 🎯
  getHeat(): number {
    return this.heat
  }

  getOverheated(): boolean {
    return this.isOverheated
  }

  setHeatChangeCallback(callback: (heat: number, isOverheated: boolean) => void): void {
    this.heatChangeCallback = callback
  }
  
  setWeaponType(weaponType: WeaponType): void {
    if (this.currentWeaponType !== weaponType) {
      this.currentWeaponType = weaponType
      
      // Adjust stats based on weapon type
      switch (weaponType) {
        case WeaponType.BULLETS:
          this.fireRate = 0.2
          this.damage = 2
          this.projectileSpeed = 15
          break
        case WeaponType.LASERS:
          this.fireRate = 0.15 // Faster
          this.damage = 3 // More damage
          this.projectileSpeed = 20 // Faster
          break
        case WeaponType.PHOTONS:
          this.fireRate = 0.1 // Very fast
          this.damage = 4 // High damage
          this.projectileSpeed = 25 // Very fast
          break
      }
      
      // Notify UI of weapon change
      if (this.weaponTypeChangeCallback) {
        this.weaponTypeChangeCallback(weaponType)
      }
      
      console.log(`🎯 Weapon changed to: ${weaponType.toUpperCase()}`)
    }
  }
  
  setWeaponTypeChangeCallback(callback: (weaponType: WeaponType) => void): void {
    this.weaponTypeChangeCallback = callback
  }
  
  // 🎯 CYCLE WEAPON TYPE - Called when power-up is collected 🎯
  cycleWeaponType(): void {
    const weaponTypes = [WeaponType.BULLETS, WeaponType.LASERS, WeaponType.PHOTONS]
    const currentIndex = weaponTypes.indexOf(this.currentWeaponType)
    const nextIndex = (currentIndex + 1) % weaponTypes.length
    this.setWeaponType(weaponTypes[nextIndex])
  }
  
  // 🎲 ROGUE MODE: APPLY STAT MUTATION 🎲
  applyRogueStatMutation(statModifier: {
    fireRate?: number
    projectileSpeed?: number
    heatDecay?: number
  }): void {
    if (statModifier.fireRate !== undefined) {
      this.fireRateMultiplier *= statModifier.fireRate
    }
    
    if (statModifier.projectileSpeed !== undefined) {
      this.projectileSpeedMultiplier *= statModifier.projectileSpeed
    }
    
    if (statModifier.heatDecay !== undefined) {
      this.heatDecayMultiplier *= statModifier.heatDecay
    }
  }
  
  // 🎲 ROGUE MODE: APPLY FIRING MODE MUTATION 🎲
  applyRogueFiringMode(firingMode: {
    sideFire?: boolean
    rearFire?: boolean
    spiralShot?: boolean
    burstPulse?: boolean
    chargeShot?: boolean
  }): void {
    if (firingMode.sideFire !== undefined) {
      this.firingModes.sideFire = firingMode.sideFire
    }
    if (firingMode.rearFire !== undefined) {
      this.firingModes.rearFire = firingMode.rearFire
    }
    if (firingMode.spiralShot !== undefined) {
      this.firingModes.spiralShot = firingMode.spiralShot
    }
    if (firingMode.burstPulse !== undefined) {
      this.firingModes.burstPulse = firingMode.burstPulse
    }
    if (firingMode.chargeShot !== undefined) {
      this.firingModes.chargeShot = firingMode.chargeShot
    }
  }
  
  // 🎲 ROGUE MODE: RESET MUTATIONS (for new run) 🎲
  resetRogueMutations(): void {
    this.firingModes = {}
    this.fireRateMultiplier = 1.0
    this.projectileSpeedMultiplier = 1.0
    this.heatDecayMultiplier = 1.0
    this.spiralRotation = 0
  }
}
