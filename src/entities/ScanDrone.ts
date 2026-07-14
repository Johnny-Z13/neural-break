import * as THREE from 'three'
import { Enemy, EnemyState, SpawnConfig, DeathConfig } from './Enemy'
import { Player } from './Player'
import { EnemyProjectile } from '../weapons/EnemyProjectile'
import { AudioManager } from '../audio/AudioManager'
import { SceneManager } from '../graphics/SceneManager'
import { BALANCE_CONFIG } from '../config'

export class ScanDrone extends Enemy {
  private scanBeamMesh!: THREE.Mesh
  private alertState: boolean = false
  private patrolTarget: THREE.Vector3
  private patrolRadius: number = BALANCE_CONFIG.SCAN_DRONE.PATROL_RANGE

  private fireTimer: number = 0
  private fireRate: number = BALANCE_CONFIG.SCAN_DRONE.FIRE_RATE
  private sceneManager: SceneManager | null = null // Will be set by EnemyManager
  private projectiles: EnemyProjectile[] = []
  
  // 📡 Scan sound timer
  private scanSoundTimer: number = 0
  private scanSoundInterval: number = 2.0
  
  // 🔷 MOVEMENT VARIATION - Prevent perfect alignment 🔷
  private movementOffset: number = Math.random() * Math.PI * 2 // Random starting phase
  private swayAmount: number = 0.2 // Amount of perpendicular sway (less than DataMite)
  private swaySpeed: number = 2.0 // Speed of sway oscillation
  
  // 💀 DEATH ANIMATION STATE 💀
  private gridDistortion: number = 0
  private electricArcs: THREE.Line[] = []

  constructor(x: number, y: number) {
    super(x, y, 'ScanDrone')
    
    // 🎮 LOAD STATS FROM BALANCE CONFIG 🎮
    const stats = BALANCE_CONFIG.SCAN_DRONE
    this.health = stats.HEALTH
    this.maxHealth = stats.HEALTH
    this.speed = stats.SPEED
    this.damage = stats.DAMAGE
    this.xpValue = stats.XP_VALUE
    this.radius = stats.RADIUS
    this.patrolTarget = new THREE.Vector3(x, y, 0)
    
    // 💥 DEATH DAMAGE 💥
    this.deathDamageRadius = stats.DEATH_RADIUS
    this.deathDamageAmount = stats.DEATH_DAMAGE
  }

  setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager
  }

  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  getProjectiles(): EnemyProjectile[] {
    return this.projectiles
  }

  initialize(): void {
    // ═══════════════════════════════════════════════════════════════
    // 🕹️ 80s VECTOR ART SCAN DRONE - Battlezone/Tron Style! 🕹️
    // ═══════════════════════════════════════════════════════════════
    
    // Create invisible container for the drone
    const containerGeometry = new THREE.CircleGeometry(0.01, 4)
    const containerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.mesh = new THREE.Mesh(containerGeometry, containerMaterial)
    this.mesh.position.copy(this.position)
    
    // ═══ HEXAGONAL BODY - Classic 80s arcade wireframe ═══
    // 2x SIZE!
    const hexRadius = 0.35 * 2.6
    const hexHeight = 0.15 * 2.6
    const hexGeometry = new THREE.CylinderGeometry(hexRadius, hexRadius, hexHeight, 6)
    const hexMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF6600,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    })
    const hexBody = new THREE.Mesh(hexGeometry, hexMaterial)
    hexBody.rotation.x = Math.PI / 2 // Flat orientation
    this.mesh.add(hexBody)
    
    // ═══ HEXAGONAL WIREFRAME OUTLINE - Glowing vector lines ═══
    const hexWireGeometry = new THREE.CylinderGeometry(hexRadius * 1.05, hexRadius * 1.05, hexHeight * 1.1, 6)
    const hexWireMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF8800,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const hexWireframe = new THREE.Mesh(hexWireGeometry, hexWireMaterial)
    hexWireframe.rotation.x = Math.PI / 2
    this.mesh.add(hexWireframe)
    
    // ═══ ROTATING RADAR DISH - 80s surveillance aesthetic ═══
    const dishGroup = new THREE.Group()
    
    // Dish base ring - 2x SIZE
    const dishRingGeometry = new THREE.RingGeometry(0.12 * 2.6, 0.18 * 2.6, 8)
    const dishRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF, // Cyan accent - very 80s!
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const dishRing = new THREE.Mesh(dishRingGeometry, dishRingMaterial)
    dishGroup.add(dishRing)
    
    // Radar sweep arm - 2x SIZE
    const sweepGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.04),
      new THREE.Vector3(1.04, 0, 0.04)
    ])
    const sweepMaterial = new THREE.LineBasicMaterial({
      color: 0x00FF00, // Green sweep line
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const sweepLine = new THREE.Line(sweepGeometry, sweepMaterial)
    dishGroup.add(sweepLine)
    
    // Radar sweep cone (like classic radar) - 2x SIZE
    const sweepConeShape = new THREE.Shape()
    sweepConeShape.moveTo(0, 0)
    sweepConeShape.lineTo(1.04, 0.2)
    sweepConeShape.lineTo(1.04, -0.2)
    sweepConeShape.lineTo(0, 0)
    const sweepConeGeometry = new THREE.ShapeGeometry(sweepConeShape)
    const sweepConeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    const sweepCone = new THREE.Mesh(sweepConeGeometry, sweepConeMaterial)
    sweepCone.position.z = 0.01
    dishGroup.add(sweepCone)
    
    dishGroup.position.z = 0.2 // Above the body (2x)
    this.mesh.add(dishGroup)
    
    // ═══ SCANNING GRID BELOW - Matrix-style scan effect ═══
    const gridGroup = new THREE.Group()
    
    // Horizontal scan lines - 2x SIZE
    for (let i = -2; i <= 2; i++) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.3, i * 0.39, 0),
        new THREE.Vector3(1.3, i * 0.39, 0)
      ])
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      })
      const line = new THREE.Line(lineGeometry, lineMaterial)
      gridGroup.add(line)
    }
    
    // Vertical scan lines - 2x SIZE
    for (let i = -2; i <= 2; i++) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i * 0.39, -1.3, 0),
        new THREE.Vector3(i * 0.39, 1.3, 0)
      ])
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      })
      const line = new THREE.Line(lineGeometry, lineMaterial)
      gridGroup.add(line)
    }
    
    // Scanning beam (sweeps down) - 2x SIZE
    const scanBeamGeometry = new THREE.PlaneGeometry(2.6, 0.2)
    const scanBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    this.scanBeamMesh = new THREE.Mesh(scanBeamGeometry, scanBeamMaterial)
    gridGroup.add(this.scanBeamMesh)
    
    gridGroup.position.z = -0.6 // Below the body (2x)
    gridGroup.rotation.x = 0 // Flat
    this.mesh.add(gridGroup)
    
    // ═══ SENSOR EYES - 6 blinking sensors around hexagon ═══
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      
      // Outer ring for each sensor - 2x SIZE
      const sensorRingGeometry = new THREE.RingGeometry(0.104, 0.156, 6)
      const sensorRingMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF8800,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
      const sensorRing = new THREE.Mesh(sensorRingGeometry, sensorRingMaterial)
      sensorRing.position.set(
        Math.cos(angle) * (hexRadius + 0.2),
        Math.sin(angle) * (hexRadius + 0.2),
        0
      )
      this.mesh.add(sensorRing)
      
      // Inner sensor "eye" - 2x SIZE
      const sensorEyeGeometry = new THREE.CircleGeometry(0.078, 6)
      const sensorEyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      const sensorEye = new THREE.Mesh(sensorEyeGeometry, sensorEyeMaterial)
      sensorEye.position.set(
        Math.cos(angle) * (hexRadius + 0.2),
        Math.sin(angle) * (hexRadius + 0.2),
        0.02
      )
      this.mesh.add(sensorEye)
    }
    
    // ═══ ANTENNA WITH BEACON - Pulsing warning light ═══
    // Antenna stalk - 2x SIZE
    const antennaGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.26),
      new THREE.Vector3(0, 0, 1.04)
    ])
    const antennaMaterial = new THREE.LineBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    const antenna = new THREE.Line(antennaGeometry, antennaMaterial)
    this.mesh.add(antenna)
    
    // Beacon tip (pulsing) - 2x SIZE
    const beaconGeometry = new THREE.OctahedronGeometry(0.156, 0)
    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })
    const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial)
    beacon.position.z = 1.04
    this.mesh.add(beacon)
    
    // ═══ OUTER DETECTION RING - Rotating wireframe ═══ - 2x SIZE
    const outerRingGeometry = new THREE.RingGeometry(1.43, 1.508, 12)
    const outerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF6600,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial)
    this.mesh.add(outerRing)
    
    // Detection range markers (dashed circle effect) - 2x SIZE
    for (let i = 0; i < 12; i++) {
      const markerAngle = (i / 12) * Math.PI * 2
      const markerGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(markerAngle) * 1.352, Math.sin(markerAngle) * 1.352, 0),
        new THREE.Vector3(Math.cos(markerAngle) * 1.612, Math.sin(markerAngle) * 1.612, 0)
      ])
      const markerMaterial = new THREE.LineBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      })
      const marker = new THREE.Line(markerGeometry, markerMaterial)
      this.mesh.add(marker)
    }
    
    // 🌟 START INVISIBLE FOR SPAWN ANIMATION 🌟
    this.mesh.scale.setScalar(0.01)
  }
  
  // 🎬 SPAWN CONFIGURATION 🎬
  protected getSpawnConfig(): SpawnConfig {
    return {
      duration: 0.25,
      invulnerable: true,
      particles: {
        count: 12,
        colors: [0xFF6600, 0x00FFFF], // Alternate orange and cyan
        speed: 3,
        burstAtStart: true
      },
      screenFlash: {
        intensity: 0.05,
        color: 0xFF8800
      }
    }
  }
  
  // 🎬 DEATH CONFIGURATION 🎬
  protected getDeathConfig(): DeathConfig {
    return {
      duration: 0.8,
      particles: {
        count: 12,
        colors: [0xFF6600, 0x00FFFF],
        speed: 3
      },
      explosion: {
        size: 1.5,
        color: 0xFF8800
      },
      electricDeath: true
    }
  }
  
  // 🌟 SPAWN ANIMATION HOOK 🌟
  protected onSpawnUpdate(progress: number): void {
    // Elastic scale for punchy appearance
    const elasticProgress = progress < 1 
      ? 1 - Math.pow(1 - progress, 3) * Math.cos(progress * Math.PI * 2)
      : 1
    
    this.mesh.scale.setScalar(Math.max(0.01, elasticProgress))
  }

  // 💀 DEATH ANIMATION HOOK 💀
  protected onDeathUpdate(progress: number): void {
    // Phase 1: Grid flicker and distortion (0-0.25s)
    if (progress < 0.25) {
      const phaseProgress = progress / 0.25
      this.gridDistortion = phaseProgress * 0.5
      
      // Flicker wireframe
      const hexWireframe = this.mesh.children[1] as THREE.Mesh
      if (hexWireframe) {
        const material = hexWireframe.material as THREE.MeshBasicMaterial
        material.opacity = 0.5 + Math.sin(progress * 50) * 0.5
      }
      
      // Distort hex body
      const hexBody = this.mesh.children[0] as THREE.Mesh
      if (hexBody) {
        hexBody.scale.x = 1 + Math.sin(progress * 30) * this.gridDistortion
        hexBody.scale.y = 1 + Math.cos(progress * 30) * this.gridDistortion
      }
    }
    // Phase 2: Grid collapse inward (0.25-0.5s)
    else if (progress < 0.5) {
      const phaseProgress = (progress - 0.25) / 0.25
      
      // Collapse wireframe
      const hexWireframe = this.mesh.children[1] as THREE.Mesh
      if (hexWireframe) {
        hexWireframe.scale.setScalar(1 - phaseProgress * 0.8)
        const material = hexWireframe.material as THREE.MeshBasicMaterial
        material.opacity = 1 - phaseProgress
      }
      
      // Create electric arcs
      if (phaseProgress > 0.3 && this.electricArcs.length < 6) {
        this.createElectricArc()
      }
    }
    // Phase 3: Radar dish shatter, core overload (0.5-0.75s)
    else if (progress < 0.75) {
      const phaseProgress = (progress - 0.5) / 0.25
      
      // Hide radar dish
      const dishGroup = this.mesh.children.find(child => child.type === 'Group')
      if (dishGroup) {
        dishGroup.visible = false
      }
      
      // Core flash
      const hexBody = this.mesh.children[0] as THREE.Mesh
      if (hexBody) {
        const material = hexBody.material as THREE.MeshBasicMaterial
        material.color.setHSL(0.5, 1.0, 0.5 + phaseProgress * 0.5)
        material.opacity = 1 - phaseProgress * 0.5
      }
      
      // Screen flash
      if (this.effectsSystem && phaseProgress > 0.8) {
        this.effectsSystem.addScreenFlash(0.1, new THREE.Color(0x00FFFF))
      }
    }
    // Phase 4: Final discharge (0.75-1.0s)
    else {
      // Radial lightning bolts
      if (this.effectsSystem && progress < 0.9) {
        const dischargeCount = Math.floor((progress - 0.75) * 20)
        if (dischargeCount > this.electricArcs.length) {
          this.createRadialLightning()
        }
      }
      
      // Fade out
      this.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshBasicMaterial
          if (material) {
            material.opacity = Math.max(0, 1 - (progress - 0.75) * 4)
          }
        }
      })
      
    }
  }

  private createElectricArc(): void {
    if (!this.effectsSystem) return
    
    const startAngle = Math.random() * Math.PI * 2
    const endAngle = startAngle + (Math.random() - 0.5) * Math.PI * 0.5
    const radius = 0.5
    
    const points = [
      new THREE.Vector3(
        this.position.x + Math.cos(startAngle) * radius,
        this.position.y + Math.sin(startAngle) * radius,
        0
      ),
      new THREE.Vector3(
        this.position.x + Math.cos(endAngle) * radius * 0.3,
        this.position.y + Math.sin(endAngle) * radius * 0.3,
        0
      )
    ]
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    
    const arc = new THREE.Line(geometry, material)
    if (this.mesh.parent) {
      this.mesh.parent.add(arc)
    }
    
    this.electricArcs.push(arc)
    
    // Remove after short time
    setTimeout(() => {
      if (arc.parent) {
        arc.parent.remove(arc)
      }
      this.disposeArc(arc)
      const index = this.electricArcs.indexOf(arc)
      if (index > -1) {
        this.electricArcs.splice(index, 1)
      }
    }, 200)
  }

  // 🧹 Dispose arc GPU resources - arcs live in the scene, not under this.mesh
  private disposeArc(arc: THREE.Line): void {
    arc.geometry.dispose()
    const material = arc.material as THREE.Material
    material.dispose()
  }

  private createRadialLightning(): void {
    if (!this.effectsSystem) return
    
    const count = 8
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const distance = 2.0
      
      const velocity = new THREE.Vector3(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        0
      )
      
      const cyanColor = new THREE.Color(0x00FFFF)
      this.effectsSystem.createSparkle(
        this.position,
        velocity,
        cyanColor,
        0.6
      )
    }
  }

  // Override update to use parent lifecycle system
  update(deltaTime: number, player: Player): void {
    // Use parent's lifecycle state machine
    super.update(deltaTime, player)

    // 🔫 CRITICAL: Always update projectiles, even during death animation! 🔫
    // This prevents bullets from pausing when the drone is destroyed
    this.updateProjectiles(deltaTime)

    // Only do custom updates when alive
    if (this.state !== EnemyState.ALIVE) return
    if (!this.alive) return

    // Store last position for trail calculation
    this.lastPosition.copy(this.position)

    this.updateAI(deltaTime, player)

    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    this.mesh.position.set(this.position.x, this.position.y, 0)

    // Create trail effects
    this.updateTrails(deltaTime)

    // Update visual effects
    this.updateVisuals(deltaTime)
  }

  updateAI(deltaTime: number, player: Player): void {
    // Don't run AI during spawn/death
    if (this.state !== EnemyState.ALIVE) return
    
    const playerPos = player.getPosition()
    const distanceToPlayer = this.position.distanceTo(playerPos)

    // Check if player is within scan range (uses DETECTION_RANGE from balance config)
    if (distanceToPlayer < BALANCE_CONFIG.SCAN_DRONE.DETECTION_RANGE) {
      // 🚨 Play alert sound when first entering alert state! 🚨
      if (!this.alertState && this.audioManager) {
        this.audioManager.playScanDroneAlertSound()
      }
      this.alertState = true
    }

    if (this.alertState) {
      // Chase player when alerted with slight sway
      const toPlayer = playerPos.clone().sub(this.position)
      const direction = toPlayer.normalize()
      
      // Add perpendicular sway to prevent perfect alignment
      this.movementOffset += deltaTime * this.swaySpeed
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0)
      const sway = Math.sin(this.movementOffset) * this.swayAmount
      
      // Combine forward movement with perpendicular sway
      this.velocity = direction.clone()
        .add(perpendicular.multiplyScalar(sway))
        .normalize()
        .multiplyScalar(this.speed * 2)
      
      // Increase scan beam intensity
      const beamMaterial = this.scanBeamMesh.material as THREE.MeshBasicMaterial
      beamMaterial.opacity = 0.6
      
      // 🔫 FIRE BULLETS AT PLAYER! 🔫
      this.fireTimer += deltaTime
      if (this.fireTimer >= this.fireRate && this.sceneManager) {
        this.fireAtPlayer(player)
        this.fireTimer = 0
      }
    } else {
      // 📡 Play periodic scan sound while patrolling 📡
      this.scanSoundTimer += deltaTime
      if (this.scanSoundTimer >= this.scanSoundInterval && this.audioManager) {
        this.audioManager.playScanDroneScanSound()
        this.scanSoundTimer = 0
      }
      // Patrol behavior
      const distanceToPatrol = this.position.distanceTo(this.patrolTarget)
      
      if (distanceToPatrol < 0.5) {
        // Choose new patrol target
        this.patrolTarget = new THREE.Vector3(
          this.position.x + (Math.random() - 0.5) * this.patrolRadius * 2,
          this.position.y + (Math.random() - 0.5) * this.patrolRadius * 2,
          0
        )
      }
      
      const toPatrol = this.patrolTarget.clone().sub(this.position)
      const direction = toPatrol.normalize()
      
      // Add slight sway even during patrol
      this.movementOffset += deltaTime * this.swaySpeed * 0.5
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0)
      const sway = Math.sin(this.movementOffset) * this.swayAmount * 0.5
      
      this.velocity = direction.clone()
        .add(perpendicular.multiplyScalar(sway))
        .normalize()
        .multiplyScalar(this.speed)
    }
  }
  
  private fireAtPlayer(player: Player): void {
    const playerPos = player.getPosition()
    const direction = playerPos.clone().sub(this.position).normalize()
    
    const stats = BALANCE_CONFIG.SCAN_DRONE
    // Create projectile - pass Vector3 position, direction, speed, damage
    const projectile = new EnemyProjectile(
      this.position.clone(),
      direction,
      stats.BULLET_SPEED,
      stats.BULLET_DAMAGE
    )
    
    this.projectiles.push(projectile)
    if (this.sceneManager) {
      this.sceneManager.addToScene(projectile.getMesh())
    }
    
    // 🔫 Play fire sound! 🔫
    if (this.audioManager) {
      this.audioManager.playScanDroneFireSound()
    }
  }
  
  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      projectile.update(deltaTime)
      
      if (!projectile.isAlive()) {
        if (this.sceneManager) {
          this.sceneManager.removeFromScene(projectile.getMesh())
        }
        projectile.dispose()
        this.projectiles.splice(i, 1)
      }
    }
  }

  // 🔫 CLEAR PROJECTILES FOR TRANSFER (don't destroy - they continue their path!) 🔫
  clearProjectilesForTransfer(): void {
    // Don't remove from scene - they're being transferred to orphaned pool
    this.projectiles = []
  }
  
  // 🧹 CLEANUP ON DEATH 🧹
  destroy(): void {
    // DON'T destroy projectiles here - they're transferred to orphaned pool first!
    // If projectiles array is not empty, it means transfer wasn't called - destroy them
    if (this.projectiles.length > 0) {
      for (const projectile of this.projectiles) {
        if (this.sceneManager) {
          this.sceneManager.removeFromScene(projectile.getMesh())
        }
        projectile.dispose()
      }
      this.projectiles = []
    }
    
    // Clean up electric arcs
    this.electricArcs.forEach(arc => {
      if (arc.parent) {
        arc.parent.remove(arc)
      }
      this.disposeArc(arc)
    })
    this.electricArcs = []
    
    super.destroy()
  }

  protected updateVisuals(deltaTime: number): void {
    // 🎬 Don't run normal visuals during spawn/death animations! 🎬
    if (this.state !== EnemyState.ALIVE) return
    
    const time = Date.now() * 0.001
    
    // ═══════════════════════════════════════════════════════════════
    // 🕹️ 80s VECTOR ART ANIMATIONS - Battlezone/Tron Style! 🕹️
    // ═══════════════════════════════════════════════════════════════
    
    // Structure: [0]=hexBody, [1]=hexWireframe, [2]=dishGroup, [3]=gridGroup,
    // [4-15]=sensorRings+eyes (6 pairs), [16]=antenna, [17]=beacon, 
    // [18]=outerRing, [19-30]=markers
    
    // 💫 OVERALL PULSE - More intense when alerted! 💫
    const pulseSpeed = this.alertState ? 12 : 4
    const pulse = 1 + Math.sin(time * pulseSpeed) * (this.alertState ? 0.15 : 0.05)
    this.mesh.scale.setScalar(pulse)
    
    // ═══ HEXAGONAL BODY GLOW ═══
    const hexBody = this.mesh.children[0] as THREE.Mesh
    if (hexBody) {
      const hexMaterial = hexBody.material as THREE.MeshBasicMaterial
      hexMaterial.opacity = this.alertState ? 
        0.5 + Math.sin(time * 15) * 0.3 : 
        0.2 + Math.sin(time * 3) * 0.1
      // Change color when alerted
      hexMaterial.color.setHex(this.alertState ? 0xFF0000 : 0xFF6600)
    }
    
    // ═══ WIREFRAME ROTATION ═══
    const hexWireframe = this.mesh.children[1] as THREE.Mesh
    if (hexWireframe) {
      hexWireframe.rotation.z += deltaTime * (this.alertState ? 4 : 1)
      const wireMaterial = hexWireframe.material as THREE.MeshBasicMaterial
      wireMaterial.opacity = this.alertState ? 1.0 : 0.7
    }
    
    // ═══ ROTATING RADAR DISH ═══
    const dishGroup = this.mesh.children[2] as THREE.Group
    if (dishGroup) {
      // Faster rotation when alerted
      dishGroup.rotation.z += deltaTime * (this.alertState ? 8 : 2)
      
      // Pulse the sweep cone
      const sweepCone = dishGroup.children[2] as THREE.Mesh
      if (sweepCone) {
        const sweepMaterial = sweepCone.material as THREE.MeshBasicMaterial
        sweepMaterial.opacity = 0.2 + Math.sin(time * 10) * 0.2
      }
    }
    
    // ═══ SCANNING GRID ANIMATION ═══
    const gridGroup = this.mesh.children[3] as THREE.Group
    if (gridGroup) {
      // Animate horizontal scan lines (children 0-4)
      for (let i = 0; i < 5; i++) {
        const line = gridGroup.children[i] as THREE.Line
        if (line) {
          const lineMaterial = line.material as THREE.LineBasicMaterial
          // Wave effect across lines
          const wave = Math.sin(time * 8 + i * 0.5) * 0.5 + 0.5
          lineMaterial.opacity = this.alertState ? 
            0.5 + wave * 0.5 : 
            0.2 + wave * 0.3
        }
      }
      
      // Animate vertical scan lines (children 5-9)
      for (let i = 5; i < 10; i++) {
        const line = gridGroup.children[i] as THREE.Line
        if (line) {
          const lineMaterial = line.material as THREE.LineBasicMaterial
          const wave = Math.sin(time * 8 + (i - 5) * 0.5) * 0.5 + 0.5
          lineMaterial.opacity = this.alertState ? 
            0.5 + wave * 0.5 : 
            0.2 + wave * 0.3
        }
      }
      
      // Animate scan beam (sweeps up and down)
      if (this.scanBeamMesh) {
        this.scanBeamMesh.position.y = Math.sin(time * (this.alertState ? 6 : 2)) * 0.8
        const beamMaterial = this.scanBeamMesh.material as THREE.MeshBasicMaterial
        beamMaterial.opacity = this.alertState ? 
          0.7 + Math.sin(time * 20) * 0.3 : 
          0.4 + Math.sin(time * 5) * 0.2
        beamMaterial.color.setHex(this.alertState ? 0xFF0000 : 0xFF4400)
      }
    }
    
    // ═══ SENSOR EYES - Blinking pattern ═══
    // Sensors are at indices 4-15 (6 rings + 6 eyes alternating)
    for (let i = 0; i < 6; i++) {
      const ringIndex = 4 + i * 2
      const eyeIndex = 5 + i * 2
      
      const sensorRing = this.mesh.children[ringIndex] as THREE.Mesh
      const sensorEye = this.mesh.children[eyeIndex] as THREE.Mesh
      
      if (sensorRing) {
        const ringMaterial = sensorRing.material as THREE.MeshBasicMaterial
        // Sequential blinking pattern
        const blinkPhase = (time * (this.alertState ? 8 : 3) + i * 0.5) % 1
        ringMaterial.opacity = blinkPhase > 0.5 ? 0.9 : 0.4
      }
      
      if (sensorEye) {
        const eyeMaterial = sensorEye.material as THREE.MeshBasicMaterial
        // Alternating blink with ring
        const blinkPhase = (time * (this.alertState ? 8 : 3) + i * 0.5) % 1
        eyeMaterial.opacity = blinkPhase > 0.5 ? 1.0 : 0.3
        // Red when alerted, orange when patrolling
        eyeMaterial.color.setHex(this.alertState ? 0xFF0000 : 0xFF4400)
        
        // Scale pulse
        sensorEye.scale.setScalar(blinkPhase > 0.5 ? 1.3 : 0.8)
      }
    }
    
    // ═══ ANTENNA BEACON - Warning pulse ═══
    const beacon = this.mesh.children[17] as THREE.Mesh
    if (beacon) {
      // Rotate beacon
      beacon.rotation.z += deltaTime * 5
      beacon.rotation.x += deltaTime * 3
      
      const beaconMaterial = beacon.material as THREE.MeshBasicMaterial
      // Fast strobe when alerted
      const strobeSpeed = this.alertState ? 20 : 5
      beaconMaterial.opacity = 0.5 + Math.sin(time * strobeSpeed) * 0.5
      beaconMaterial.color.setHex(this.alertState ? 0xFF0000 : 0x00FFFF)
      
      // Size pulse
      const beaconPulse = 1 + Math.sin(time * strobeSpeed) * 0.3
      beacon.scale.setScalar(beaconPulse)
    }
    
    // ═══ OUTER DETECTION RING - Rotating ═══
    const outerRing = this.mesh.children[18] as THREE.Mesh
    if (outerRing) {
      outerRing.rotation.z -= deltaTime * (this.alertState ? 3 : 1)
      const ringMaterial = outerRing.material as THREE.MeshBasicMaterial
      ringMaterial.opacity = this.alertState ? 
        0.6 + Math.sin(time * 10) * 0.3 : 
        0.3 + Math.sin(time * 3) * 0.2
      ringMaterial.color.setHex(this.alertState ? 0xFF0000 : 0xFF6600)
    }
    
    // ═══ DETECTION MARKERS - Pulsing ═══
    for (let i = 19; i < Math.min(31, this.mesh.children.length); i++) {
      const marker = this.mesh.children[i] as THREE.Line
      if (marker) {
        const markerMaterial = marker.material as THREE.LineBasicMaterial
        const markerIndex = i - 19
        const pulse = Math.sin(time * 6 + markerIndex * 0.5) * 0.5 + 0.5
        markerMaterial.opacity = this.alertState ? 
          0.5 + pulse * 0.5 : 
          0.3 + pulse * 0.3
      }
    }
  }
}
