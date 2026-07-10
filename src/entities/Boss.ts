import * as THREE from 'three'
import { Enemy } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { SceneManager } from '../graphics/SceneManager'
import { AudioManager } from '../audio/AudioManager'
import { BALANCE_CONFIG } from '../config'

export class Boss extends Enemy {
  private fireTimer: number = 0
  private fireRate: number = BALANCE_CONFIG.BOSS.PHASE_1_FIRE_RATE
  private projectileSpeed: number = BALANCE_CONFIG.BOSS.BULLET_SPEED
  private projectileDamage: number = BALANCE_CONFIG.BOSS.BULLET_DAMAGE
  private projectiles: EnemyProjectile[] = []
  private sceneManager: SceneManager | null = null // Will be set from outside
  private armorPlates: THREE.Mesh[] = []
  private coreMesh!: THREE.Mesh
  private energyRings: THREE.Mesh[] = []
  private weaponTurrets: THREE.Mesh[] = []
  private pulseTime: number = 0
  private attackPhase: number = 0 // 0 = normal, 1 = rapid fire, 2 = spread
  private phaseTimer: number = 0
  
  // 💀 DEATH ANIMATION STATE 💀
  private isDying: boolean = false
  private deathTimer: number = 0
  private deathDuration: number = 3.0 // 3 second epic death sequence

  // 🌈 COLOR THROB STATE 🌈
  private colorPhase: number = 0

  constructor(x: number, y: number) {
    super(x, y)
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.BOSS
    this.health = stats.HEALTH
    this.maxHealth = stats.HEALTH
    this.speed = stats.SPEED
    this.damage = stats.DAMAGE
    this.xpValue = stats.XP_VALUE
    this.radius = stats.RADIUS
  }

  initialize(): void {
    // 🚀 MASSIVE DREADNOUGHT BOSS DESIGN - EPIC SCALE! 🚀
    
    // Main hull - Large hexagonal prism (battle cruiser shape) - BIGGER!
    const hullGeometry = new THREE.CylinderGeometry(3.5, 3.0, 5.5, 6) // 40% bigger (was 2.5, 2.2, 4.0)
    const hullMaterial = new THREE.MeshLambertMaterial({
      color: 0x2A0A0A, // Dark crimson
      emissive: 0x440000,
      transparent: true,
      opacity: 0.95
    })
    this.coreMesh = new THREE.Mesh(hullGeometry, hullMaterial)
    this.coreMesh.rotation.x = Math.PI / 2 // Rotate to face forward
    
    // 🌟 HULL WIREFRAME - Sharp angular design! 🌟
    const hullWireframeGeometry = new THREE.CylinderGeometry(3.6, 3.1, 5.6, 6) // 40% bigger
    const hullWireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF1111,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    })
    const hullWireframe = new THREE.Mesh(hullWireframeGeometry, hullWireframeMaterial)
    hullWireframe.rotation.x = Math.PI / 2
    this.coreMesh.add(hullWireframe)
    
    // 🔥 ENGINE CORE - Pulsing reactor! 🔥
    const reactorGeometry = new THREE.SphereGeometry(2.1, 16, 16) // 40% bigger (was 1.5)
    const reactorMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF3300,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
    const reactor = new THREE.Mesh(reactorGeometry, reactorMaterial)
    this.coreMesh.add(reactor)
    
    // Inner reactor core - white hot!
    const innerReactorGeometry = new THREE.SphereGeometry(1.1, 12, 12) // 40% bigger (was 0.8)
    const innerReactorMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const innerReactor = new THREE.Mesh(innerReactorGeometry, innerReactorMaterial)
    this.coreMesh.add(innerReactor)
    
    // Create container mesh
    const containerGeometry = new THREE.SphereGeometry(0.1, 4, 4)
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)

    // 🔻 SCALE DOWN BY 20% - Make boss smaller! 🔻
    this.mesh.scale.setScalar(0.8)

    this.mesh.add(this.coreMesh)

    // 🛡️ COMMAND BRIDGE - Top section! 🛡️
    const bridgeGeometry = new THREE.BoxGeometry(2.8, 2.1, 1.4) // 40% bigger (was 2.0, 1.5, 1.0)
    const bridgeMaterial = new THREE.MeshLambertMaterial({
      color: 0x3A0000,
      emissive: 0x660000,
      transparent: true,
      opacity: 0.95
    })
    const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial)
    bridge.position.set(0, 0, 2.1) // Adjusted for larger hull
    
    // Bridge windows - glowing
    for (let i = 0; i < 5; i++) {
      const windowGeometry = new THREE.PlaneGeometry(0.25, 0.3)
      const windowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF6600,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      const window = new THREE.Mesh(windowGeometry, windowMaterial)
      window.position.set((i - 2) * 0.4, 0, 0.51)
      bridge.add(window)
    }
    
    this.mesh.add(bridge)
    
    // 🛡️ ARMOR PLATES - Wing sections! 🛡️
    for (let side = -1; side <= 1; side += 2) { // Left and right
      for (let i = 0; i < 3; i++) {
        const wingGeometry = new THREE.BoxGeometry(1.8, 0.4, 2.5)
        const wingMaterial = new THREE.MeshLambertMaterial({
          color: 0x330000,
          emissive: 0x220000,
          transparent: true,
          opacity: 0.95
        })
        const wing = new THREE.Mesh(wingGeometry, wingMaterial)
        
        wing.position.set(
          side * (3.0 + i * 0.3),
          i * 0.5,
          -0.5
        )
        wing.rotation.z = side * 0.2
        
        // Wing wireframe
        const wingWireframeGeometry = new THREE.BoxGeometry(1.85, 0.45, 2.55)
        const wingWireframeMaterial = new THREE.MeshBasicMaterial({
          color: 0xFF4400,
          wireframe: true,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending
        })
        const wingWireframe = new THREE.Mesh(wingWireframeGeometry, wingWireframeMaterial)
        wing.add(wingWireframe)
        
        // Wing lights
        const lightGeometry = new THREE.SphereGeometry(0.15, 8, 8)
        const lightMaterial = new THREE.MeshBasicMaterial({
          color: 0xFF0000,
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending
        })
        const light = new THREE.Mesh(lightGeometry, lightMaterial)
        light.position.set(0, 0, 1.3)
        wing.add(light)
        
        this.armorPlates.push(wing)
        this.mesh.add(wing)
      }
    }
    
    // ⚡ ENERGY RINGS - Threat indicators! ⚡ - 50% SMALLER
    // OPTIMIZED: Reduced segments from 64 to 24
    for (let i = 0; i < 3; i++) {
      const ringRadius = 2.25 + i * 0.4
      const ringGeometry = new THREE.RingGeometry(ringRadius - 0.15, ringRadius, 24)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        transparent: true,
        opacity: 0.5 - i * 0.1,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      this.energyRings.push(ring)
      this.mesh.add(ring)
    }
    
    // 🔫 WEAPON TURRETS - Heavy cannons! 🔫
    const turretPositions = [
      { x: 2.2, y: 0.8, z: 1.5 },   // Top right front
      { x: -2.2, y: 0.8, z: 1.5 },  // Top left front
      { x: 2.2, y: -0.8, z: 1.5 },  // Bottom right front
      { x: -2.2, y: -0.8, z: 1.5 }, // Bottom left front
      { x: 2.5, y: 0, z: 0 },       // Right mid
      { x: -2.5, y: 0, z: 0 },      // Left mid
      { x: 2.2, y: 0.8, z: -1.5 },  // Top right rear
      { x: -2.2, y: 0.8, z: -1.5 }, // Top left rear
      { x: 2.2, y: -0.8, z: -1.5 }, // Bottom right rear
      { x: -2.2, y: -0.8, z: -1.5 },// Bottom left rear
      { x: 0, y: 1.2, z: 1.0 },     // Top center
      { x: 0, y: -1.2, z: 1.0 }     // Bottom center
    ]
    
    for (const pos of turretPositions) {
      const turretGeometry = new THREE.CylinderGeometry(0.25, 0.35, 1.0, 8)
      const turretMaterial = new THREE.MeshLambertMaterial({
        color: 0x550000,
        emissive: 0x330000,
        transparent: true,
        opacity: 0.95
      })
      const turret = new THREE.Mesh(turretGeometry, turretMaterial)
      
      turret.position.set(pos.x, pos.y, pos.z)
      
      // Point toward front
      const angle = Math.atan2(pos.y, pos.x)
      turret.rotation.z = angle
      
      // Glowing barrel tip - 50% SMALLER
      const barrelTipGeometry = new THREE.SphereGeometry(0.1, 8, 8) // 50% smaller (was 0.2)
      const barrelTipMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF3300,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
      })
      const barrelTip = new THREE.Mesh(barrelTipGeometry, barrelTipMaterial)
      barrelTip.position.y = 0.6
      turret.add(barrelTip)
      
      // Muzzle glow ring - 50% SMALLER
      const muzzleGlowGeometry = new THREE.RingGeometry(0.075, 0.125, 12) // 50% smaller (was 0.15, 0.25)
      const muzzleGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF6600,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
      const muzzleGlow = new THREE.Mesh(muzzleGlowGeometry, muzzleGlowMaterial)
      muzzleGlow.position.y = 0.6
      turret.add(muzzleGlow)
      
      this.weaponTurrets.push(turret)
      this.mesh.add(turret)
    }
    
    // 💀 ENGINE EXHAUSTS - Rear thrusters! 💀
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const exhaustGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.8, 8)
      const exhaustMaterial = new THREE.MeshLambertMaterial({
        color: 0x220000,
        emissive: 0x110000,
        transparent: true,
        opacity: 0.9
      })
      const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial)
      
      exhaust.position.set(
        Math.cos(angle) * 1.5,
        Math.sin(angle) * 1.5,
        -2.5
      )
      exhaust.rotation.x = Math.PI / 2
      
      // Thruster flame - 50% SMALLER
      const flameGeometry = new THREE.SphereGeometry(0.175, 8, 8) // 50% smaller (was 0.35)
      const flameMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF6600,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      })
      const flame = new THREE.Mesh(flameGeometry, flameMaterial)
      flame.position.z = -0.5
      exhaust.add(flame)
      
      this.mesh.add(exhaust)
    }
    
    // 💥 Death damage properties 💥
    this.deathDamageRadius = 8.0 // MASSIVE explosion radius
    this.deathDamageAmount = 80 // Devastating damage
  }
  updateAI(deltaTime: number, player: Player): void {
    // If dying, don't move - just play death animation
    if (this.isDying) {
      this.updateDeathAnimation(deltaTime)
      return
    }
    
    // Slow, menacing approach toward player
    const playerPos = player.getPosition()
    const direction = playerPos.sub(this.position).normalize()
    
    this.velocity = direction.multiplyScalar(this.speed)
    
    // Update firing
    this.fireTimer += deltaTime
    this.phaseTimer += deltaTime
    
    // Change attack phase logic
    const phaseDuration = this.attackPhase === 3 ? 2.0 : 4.0 // 2 seconds for pause, 4 for others
    
    if (this.phaseTimer >= phaseDuration) {
      this.attackPhase = (this.attackPhase + 1) % 4 // 0=normal, 1=rapid, 2=spread, 3=pause
      this.phaseTimer = 0
      
      // 🔥 Play phase change sound! 🔥
      if (this.audioManager) {
        this.audioManager.playBossPhaseChangeSound()
      }
      
      if (this.attackPhase === 3 && this.effectsSystem) {
        // Visual indicator for pause start
        this.effectsSystem.addDistortionWave(this.position, 2.0)
      }
    }
    
    // Fire based on phase (skip firing in phase 3)
    if (this.attackPhase !== 3 && this.fireTimer >= this.fireRate) {
      this.fireAtPlayer(player)
      this.fireTimer = 0
    }
  }
  
  // 💀 EPIC DREADNOUGHT DEATH ANIMATION 💀
  protected override updateDeathAnimation(deltaTime: number): void {
    this.deathTimer += deltaTime
    const progress = this.deathTimer / this.deathDuration
    
    // Phase 1: Critical damage - systems failing (0-25%)
    if (progress < 0.25) {
      const shake = (0.25 - progress) * 3
      this.mesh.position.x = this.position.x + (Math.random() - 0.5) * shake
      this.mesh.position.y = this.position.y + (Math.random() - 0.5) * shake
      
      // Flash between red and orange
      const flashPhase = (Date.now() * 0.01) % 1
      const flashColor = new THREE.Color().setHSL(0.08 - flashPhase * 0.08, 1.0, 0.4 + flashPhase * 0.2)
      const coreMaterial = this.coreMesh.material as THREE.MeshLambertMaterial
      coreMaterial.color.copy(flashColor)
      coreMaterial.emissive.copy(flashColor).multiplyScalar(0.7)
      
      // Sparks from multiple points
      if (this.effectsSystem && Math.random() < 0.4) {
        const sparkPos = this.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 2
        ))
        this.effectsSystem.createExplosion(sparkPos, 0.8, flashColor)
        
        // Electric arcs
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          0
        )
        this.effectsSystem.createSparkle(sparkPos, vel, new THREE.Color(0x00FFFF), 0.5)
      }
      
      // Turrets start exploding
      const turretsToDestroy = Math.floor(progress * 4 * this.weaponTurrets.length)
      for (let i = 0; i < turretsToDestroy; i++) {
        const turret = this.weaponTurrets[i]
        if (turret && turret.visible) {
          turret.visible = false
          if (this.effectsSystem && Math.random() < 0.1) {
            const worldPos = new THREE.Vector3()
            turret.getWorldPosition(worldPos)
            this.effectsSystem.createExplosion(worldPos, 1.0, new THREE.Color(0xFF6600))
          }
        }
      }
    }
    
    // Phase 2: Wing sections explode (25-50%)
    if (progress >= 0.25 && progress < 0.5) {
      const wingProgress = (progress - 0.25) / 0.25
      const wingsToExplode = Math.floor(wingProgress * this.armorPlates.length)
      
      for (let i = 0; i < wingsToExplode; i++) {
        const wing = this.armorPlates[i]
        if (wing.visible) {
          wing.visible = false
          
          // MASSIVE wing explosion
          if (this.effectsSystem) {
            const worldPos = new THREE.Vector3()
            wing.getWorldPosition(worldPos)
            const hue = i / this.armorPlates.length
            const color = new THREE.Color().setHSL(hue, 1.0, 0.6)
            this.effectsSystem.createExplosion(worldPos, 2.5, color)
            
            // Wing debris
            for (let j = 0; j < 12; j++) {
              const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 5
              )
              this.effectsSystem.createSparkle(worldPos, vel, color, 1.2)
            }
          }
          
          if (this.audioManager && i % 2 === 0) {
            this.audioManager.playEnemyDeathSound('Boss')
          }
        }
      }
      
      // Hull starts breaking apart
      this.coreMesh.rotation.x += deltaTime * 2
      this.coreMesh.rotation.z += deltaTime * 1.5
    }
    
    // Phase 3: Core meltdown (50-75%)
    if (progress >= 0.5 && progress < 0.75) {
      const meltdownProgress = (progress - 0.5) / 0.25
      
      // Violent shaking intensifies
      const shake = meltdownProgress * 2
      this.mesh.position.x = this.position.x + Math.sin(Date.now() * 0.03) * shake
      this.mesh.position.y = this.position.y + Math.cos(Date.now() * 0.025) * shake
      
      // Core goes white hot
      const coreMaterial = this.coreMesh.material as THREE.MeshLambertMaterial
      const hotColor = new THREE.Color().lerpColors(
        new THREE.Color(0xFF0000),
        new THREE.Color(0xFFFFFF),
        meltdownProgress
      )
      coreMaterial.emissive.copy(hotColor)
      coreMaterial.opacity = 1.0 - meltdownProgress * 0.3
      
      // Continuous energy discharge
      if (this.effectsSystem && Math.random() < 0.6) {
        const angle = Math.random() * Math.PI * 2
        const distance = 2 + Math.random() * 3
        const dischargePos = this.position.clone().add(new THREE.Vector3(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          (Math.random() - 0.5) * 2
        ))
        this.effectsSystem.createExplosion(dischargePos, 1.5, hotColor)
      }
      
      // Spin faster
      this.coreMesh.rotation.x += deltaTime * 8
      this.coreMesh.rotation.y += deltaTime * 10
      this.coreMesh.rotation.z += deltaTime * 6
      
      // Scale pulses
      const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.3
      this.coreMesh.scale.setScalar(pulse)
    }
    
    // Phase 4: Critical explosion sequence (75-100%)
    if (progress >= 0.75) {
      const explosionProgress = (progress - 0.75) / 0.25
      
      // Rapid spinning
      this.coreMesh.rotation.x += deltaTime * 20
      this.coreMesh.rotation.y += deltaTime * 25
      this.coreMesh.rotation.z += deltaTime * 15
      
      // Core shrinks and brightens
      const coreScale = (1 - explosionProgress) * 1.2
      this.coreMesh.scale.setScalar(Math.max(0.2, coreScale))
      
      // Pure white energy
      const coreMaterial = this.coreMesh.material as THREE.MeshLambertMaterial
      coreMaterial.emissive.setHex(0xFFFFFF)
      coreMaterial.emissiveIntensity = 1 + explosionProgress * 2
      
      // Energy vortex
      if (this.effectsSystem && Math.random() < 0.7) {
        const vortexAngle = Date.now() * 0.015 + explosionProgress * Math.PI * 4
        const vortexRadius = (1 - explosionProgress) * 4
        const vortexPos = this.position.clone().add(new THREE.Vector3(
          Math.cos(vortexAngle) * vortexRadius,
          Math.sin(vortexAngle) * vortexRadius,
          Math.sin(vortexAngle * 2) * 2
        ))
        const vortexColor = new THREE.Color().setHSL((vortexAngle / (Math.PI * 2)) % 1, 1.0, 0.6)
        this.effectsSystem.createExplosion(vortexPos, 1.2, vortexColor)
      }
      
      // Multiple explosion bursts
      if (Math.random() < 0.3 && this.effectsSystem) {
        const burstPos = this.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2
        ))
        this.effectsSystem.createExplosion(burstPos, 2.0, new THREE.Color(0xFFFFFF))
      }
    }
    
    // FINAL CATACLYSMIC EXPLOSION
    if (progress >= 1.0) {
      this.executeFinalDeath()
      this.alive = false
    }
  }
  
  private executeFinalDeath(): void {
    if (this.effectsSystem) {
      // MASSIVE central supernova explosion (reduced intensity to avoid giant ring)
      this.effectsSystem.createExplosion(this.position, 1.4, new THREE.Color(0xFFFFFF))
      this.effectsSystem.addScreenFlash(0.5, new THREE.Color(0xFFFFFF))
      this.effectsSystem.addDistortionWave(this.position, 2.0)
      
      // Primary shockwave ring
      for (let ring = 0; ring < 3; ring++) {
        setTimeout(() => {
          for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2
            const hue = i / 24
            const color = new THREE.Color().setHSL(hue, 1.0, 0.6)
            const distance = 4 + ring * 2
            const offset = new THREE.Vector3(
              Math.cos(angle) * distance,
              Math.sin(angle) * distance,
              (Math.random() - 0.5) * 3
            )
            
            if (this.effectsSystem) {
              this.effectsSystem.createExplosion(
                this.position.clone().add(offset),
                3.0,
                color
              )
            }
          }
        }, ring * 100)
      }
      
      // Secondary random explosions
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          if (this.effectsSystem) {
            const randOffset = new THREE.Vector3(
              (Math.random() - 0.5) * 12,
              (Math.random() - 0.5) * 12,
              (Math.random() - 0.5) * 4
            )
            const randColor = new THREE.Color().setHSL(Math.random(), 1.0, 0.5)
            this.effectsSystem.createExplosion(
              this.position.clone().add(randOffset),
              2.5,
              randColor
            )
            
            // Debris particles
            for (let j = 0; j < 5; j++) {
              const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 10
              )
              this.effectsSystem.createSparkle(
                this.position.clone().add(randOffset),
                vel,
                randColor,
                1.5
              )
            }
          }
        }, i * 40)
      }
      
      // Final expanding energy wave
      setTimeout(() => {
        if (this.effectsSystem) {
          for (let i = 0; i < 48; i++) {
            const angle = (i / 48) * Math.PI * 2
            const distance = 8
            const offset = new THREE.Vector3(
              Math.cos(angle) * distance,
              Math.sin(angle) * distance,
              0
            )
            const color = new THREE.Color().setHSL((i / 48), 1.0, 0.7)
            this.effectsSystem.createExplosion(
              this.position.clone().add(offset),
              2.0,
              color
            )
          }
        }
      }, 600)
      
      this.effectsSystem.createEnemyDeathParticles(
        this.position,
        'Boss',
        new THREE.Color(0xFF0000)
      )
    }
    
    // Clean up projectiles
    if (this.sceneManager) {
      for (const projectile of this.projectiles) {
        this.sceneManager.removeFromScene(projectile.getMesh())
      }
    }
    this.projectiles = []
    
    if (this.audioManager) {
      this.audioManager.playEnemyDeathSound('Boss')
    }
  }

  private fireAtPlayer(player: Player): void {
    if (!this.sceneManager) return
    
    // 🔫 Play boss fire sound! 🔫
    if (this.audioManager) {
      this.audioManager.playBossFireSound()
    }
    
    const playerPos = player.getPosition()
    const direction = playerPos.sub(this.position).normalize()
    
    if (this.attackPhase === 0) {
      // Normal fire - 5 bullets in spread (more!)
      for (let i = 0; i < 5; i++) {
        const angleOffset = (i - 2) * 0.15 // Spread
        const cos = Math.cos(angleOffset)
        const sin = Math.sin(angleOffset)
        const bulletDir = new THREE.Vector3(
          direction.x * cos - direction.y * sin,
          direction.x * sin + direction.y * cos,
          0
        ).normalize()
        
        const projectile = new EnemyProjectile(
          this.position.clone().add(bulletDir.clone().multiplyScalar(2.5)), // Fire from edge
          bulletDir,
          this.projectileSpeed,
          this.projectileDamage
        )
        
        // 🔥 MAKE PROJECTILES MORE VISIBLE! 🔥
        this.styleBossProjectile(projectile, 0xFF0000) // Red
        
        if (this.effectsSystem) {
          projectile.setEffectsSystem(this.effectsSystem)
        }
        
        this.projectiles.push(projectile)
        this.sceneManager.addToScene(projectile.getMesh())
      }
    } else if (this.attackPhase === 1) {
      // Rapid fire - 8 bullets in quick succession (more!)
      for (let i = 0; i < 8; i++) {
        const angleOffset = (i - 3.5) * 0.12
        const cos = Math.cos(angleOffset)
        const sin = Math.sin(angleOffset)
        const bulletDir = new THREE.Vector3(
          direction.x * cos - direction.y * sin,
          direction.x * sin + direction.y * cos,
          0
        ).normalize()
        
        const projectile = new EnemyProjectile(
          this.position.clone().add(bulletDir.clone().multiplyScalar(2.5)),
          bulletDir,
          this.projectileSpeed * 1.3,
          this.projectileDamage
        )
        
        // 🔥 ORANGE rapid fire! 🔥
        this.styleBossProjectile(projectile, 0xFF6600)
        
        if (this.effectsSystem) {
          projectile.setEffectsSystem(this.effectsSystem)
        }
        
        this.projectiles.push(projectile)
        this.sceneManager.addToScene(projectile.getMesh())
      }
    } else {
      // Spread fire - 16 bullets in all directions (double!)
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2
        const bulletDir = new THREE.Vector3(
          Math.cos(angle),
          Math.sin(angle),
          0
        )
        
        const projectile = new EnemyProjectile(
          this.position.clone().add(bulletDir.clone().multiplyScalar(2.5)),
          bulletDir,
          this.projectileSpeed * 0.9,
          this.projectileDamage
        )
        
        // 🔥 YELLOW spread fire! 🔥
        this.styleBossProjectile(projectile, 0xFFFF00)
        
        if (this.effectsSystem) {
          projectile.setEffectsSystem(this.effectsSystem)
        }
        
        this.projectiles.push(projectile)
        this.sceneManager.addToScene(projectile.getMesh())
      }
    }
    
    // Audio feedback
    if (this.audioManager) {
      this.audioManager.playFireSound()
    }
  }
  
  // 🔥 STYLE BOSS PROJECTILES - Visible but not overwhelming! 🔥
  private styleBossProjectile(projectile: EnemyProjectile, color: number): void {
    const mesh = projectile.getMesh()
    
    // Scale projectile - smaller for better gameplay balance
    mesh.scale.setScalar(1.2)
    
    // Set main color
    const material = mesh.material as THREE.MeshBasicMaterial
    material.color.setHex(color)
    
    // Update glow
    if (mesh.children[0]) {
      const glowMaterial = (mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
      glowMaterial.color.setHex(color)
      glowMaterial.opacity = 0.6
      // Smaller glow
      mesh.children[0].scale.setScalar(1.2)
    }
    
    // Add trail effect - smaller trail sphere
    const trailGeometry = new THREE.SphereGeometry(0.2, 8, 8)
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    })
    const trail = new THREE.Mesh(trailGeometry, trailMaterial)
    trail.position.z = -0.2
    mesh.add(trail)
  }

  getProjectiles(): EnemyProjectile[] {
    return this.projectiles.filter(p => p.isAlive())
  }

  setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager
  }

  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  update(deltaTime: number, player: Player): void {
    if (!this.alive) return

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      if (projectile.isAlive()) {
        projectile.update(deltaTime)
      } else {
        if (this.sceneManager) {
          this.sceneManager.removeFromScene(projectile.getMesh())
        }
        this.projectiles.splice(i, 1)
      }
    }

    // Call parent update
    super.update(deltaTime, player)
  }

  protected updateVisuals(deltaTime: number): void {
    // Skip if dying - death animation handles visuals
    if (this.isDying) return
    
    const time = Date.now() * 0.001
    this.pulseTime += deltaTime
    this.colorPhase += deltaTime * 0.5 // Color throb speed
    
    // 🌈 COLOR THROBBING - Rainbow pulse! 🌈
    const throbHue = this.attackPhase === 3 
      ? (Math.sin(this.colorPhase * 2) * 0.1 + 0.5) // Cyan/Blue pulse during pause
      : (Math.sin(this.colorPhase) * 0.5 + 0.5) * 0.15 // Red to orange range normally
    
    const throbColor = new THREE.Color().setHSL(throbHue, 1.0, 0.4)
    const coreMaterial = this.coreMesh.material as THREE.MeshLambertMaterial
    coreMaterial.color.copy(throbColor)
    coreMaterial.emissive.copy(throbColor).multiplyScalar(this.attackPhase === 3 ? 0.8 : 0.6)
    
    // 🌪️ ROTATE CORE - Menacing spin! 🌪️
    const spinSpeed = this.attackPhase === 3 ? 0.5 : 1.5 // Slower during pause
    this.coreMesh.rotation.x += deltaTime * spinSpeed
    this.coreMesh.rotation.y += deltaTime * (spinSpeed * 1.3)
    this.coreMesh.rotation.z += deltaTime * (spinSpeed * 0.7)
    
    // 🔥 ANIMATE INNER CORE - Pulsing fire! 🔥
    const innerCore = this.coreMesh.children[1] as THREE.Mesh
    if (innerCore) {
      const innerMaterial = innerCore.material as THREE.MeshBasicMaterial
      const fireHue = this.attackPhase === 3
        ? (Math.sin(time * 5) * 0.1 + 0.5) // Cyan inner
        : (Math.sin(time * 3) * 0.5 + 0.5) * 0.1 // Red to yellow
      
      innerMaterial.color.setHSL(fireHue, 1.0, 0.5)
      innerMaterial.opacity = 0.4 + Math.sin(time * 5) * 0.3
      innerCore.scale.setScalar(1 + Math.sin(time * 4) * 0.08) // Reduced glitching (was 0.2)
    }
    
    // 💀 PULSING SCALE - Subtle breathing effect (reduced glitching)! 💀
    const pulse = 1 + Math.sin(this.pulseTime * 2) * 0.02 // Much smaller variation (was 0.05)
    this.mesh.scale.setScalar(pulse)
    
    // 🛡️ ROTATE ARMOR PLATES - Color cycling! 🛡️
    for (let i = 0; i < this.armorPlates.length; i++) {
      const plate = this.armorPlates[i]
      plate.rotation.z += deltaTime * (0.5 + i * 0.1)
      
      // Rainbow color shift per plate
      const plateHue = (this.colorPhase + i * 0.1) % 1 * 0.2 // Red-orange-yellow
      const plateMaterial = plate.material as THREE.MeshLambertMaterial
      plateMaterial.color.setHSL(plateHue, 0.8, 0.3)
      plateMaterial.emissive.setHSL(plateHue, 1.0, 0.2 + Math.sin(time * 3 + i) * 0.1)
    }
    
    // ⚡ ROTATE ENERGY RINGS - Color cycling threat indicators! ⚡
    for (let i = 0; i < this.energyRings.length; i++) {
      const ring = this.energyRings[i]
      ring.rotation.z += deltaTime * (1 + i * 0.3) * (i % 2 === 0 ? 1 : -1) // Alternate directions
      
      const ringMaterial = ring.material as THREE.MeshBasicMaterial
      const ringHue = (this.colorPhase * 2 + i * 0.15) % 1 * 0.15 // Faster color shift
      ringMaterial.color.setHSL(ringHue, 1.0, 0.5)
      ringMaterial.opacity = 0.4 + Math.sin(time * 4 + i) * 0.4
    }
    
    // 🔫 ANIMATE WEAPON TURRETS - Pulsing and color! 🔫
    for (let i = 0; i < this.weaponTurrets.length; i++) {
      const turret = this.weaponTurrets[i]
      
      // Turrets orbit slightly
      const baseAngle = (i / this.weaponTurrets.length) * Math.PI * 2
      const orbitAngle = baseAngle + time * 0.3
      turret.position.set(
        Math.cos(orbitAngle) * 2.2,
        Math.sin(orbitAngle) * 2.2,
        0
      )
      turret.rotation.z = orbitAngle + Math.PI / 2
      
      // Pulsing tips with color
      const tip = turret.children[0] as THREE.Mesh
      if (tip) {
        const tipMaterial = tip.material as THREE.MeshBasicMaterial
        const tipHue = this.attackPhase === 3
          ? (time * 0.2 + i * 0.1) % 1 * 0.1 + 0.5 // Dim blue during pause
          : (time * 0.5 + i * 0.1) % 1 * 0.15 // Normal red/orange
        
        tipMaterial.color.setHSL(tipHue, 1.0, 0.6)
        tipMaterial.opacity = this.attackPhase === 3 
          ? 0.3 + Math.sin(time * 3 + i) * 0.1 // Dimmer and slower pulse
          : 0.8 + Math.sin(time * 8 + i) * 0.2
        
        const tipScale = this.attackPhase === 3 ? 0.8 : 1.0
        tip.scale.setScalar(tipScale * (1 + Math.sin(time * (this.attackPhase === 3 ? 4 : 10) + i) * 0.08)) // Reduced glitching (was 0.2)
      }
      
      // Glow ring
      const glowRing = turret.children[1] as THREE.Mesh
      if (glowRing) {
        const glowMaterial = glowRing.material as THREE.MeshBasicMaterial
        glowMaterial.opacity = this.attackPhase === 3 ? 0.1 : 0.5 + Math.sin(time * 6 + i) * 0.3
        glowRing.rotation.z = time * (this.attackPhase === 3 ? 1 : 3)
      }
    }
    
    // 💀 ANIMATE SKULL - Scary pulsing eyes! 💀
    const skull = this.coreMesh.children[2] as THREE.Mesh
    if (skull) {
      // Animate skull with color
      const skullMaterial = skull.material as THREE.MeshBasicMaterial
      skullMaterial.opacity = 0.7 + Math.sin(time * 5) * 0.2
      
      // Blinking eyes with color shift
      for (let i = 0; i < skull.children.length; i++) {
        const eye = skull.children[i] as THREE.Mesh
        if (eye) {
          const eyeMaterial = eye.material as THREE.MeshBasicMaterial
          const eyeHue = (time * 0.3 + i * 0.5) % 1 * 0.1
          eyeMaterial.color.setHSL(eyeHue, 1.0, 0.6)
          eyeMaterial.opacity = 0.7 + Math.sin(time * 4 + i) * 0.3
          
          // Eye glow
          const eyeGlow = eye.children[0] as THREE.Mesh
          if (eyeGlow) {
            const eyeGlowMaterial = eyeGlow.material as THREE.MeshBasicMaterial
            eyeGlowMaterial.opacity = 0.3 + Math.sin(time * 6) * 0.2
            eyeGlow.scale.setScalar(1 + Math.sin(time * 8) * 0.12) // Reduced glitching (was 0.3)
          }
        }
      }
    }
  }

  // 🔴 OVERRIDE TAKE DAMAGE - Don't set alive=false immediately! 🔴
  takeDamage(damage: number): void {
    this.health -= damage
    
    // JUICY visual feedback - flash red and scale up
    const material = this.coreMesh.material as THREE.MeshLambertMaterial
    const originalColor = material.color.clone()
    const originalScale = this.coreMesh.scale.clone()
    
    material.color.setRGB(1, 0, 0)
    material.emissive.setRGB(1, 0, 0)
    this.coreMesh.scale.multiplyScalar(1.2)
    
    setTimeout(() => {
      if (this.coreMesh) {
        material.color.copy(originalColor)
        this.coreMesh.scale.copy(originalScale)
      }
    }, 100)

    if (this.health <= 0) {
      this.createDeathEffect()
    }
  }

  protected createDeathEffect(): void {
    // 💀 START EPIC DEATH ANIMATION 💀
    this.isDying = true
    this.deathTimer = 0

    // Keep alive during death animation
    this.alive = true
    
    // 🎵 Play epic Boss death sound! 🎵
    if (this.audioManager) {
      this.audioManager.playEnemyDeathSound('Boss')
    }
  }

  // 🔫 CLEAR PROJECTILES FOR TRANSFER (don't destroy - they continue their path!) 🔫
  clearProjectilesForTransfer(): void {
    this.projectiles = []
  }
  
  /**
   * 🧹 CLEANUP - Remove all projectiles from scene
   */
  destroy(): void {
    // DON'T destroy projectiles here - they're transferred to orphaned pool first!
    if (this.projectiles.length > 0 && this.sceneManager) {
      for (const projectile of this.projectiles) {
        this.sceneManager.removeFromScene(projectile.getMesh())
      }
      this.projectiles = []
    }
    
    console.log('🧹 Boss cleanup complete')
  }
}

