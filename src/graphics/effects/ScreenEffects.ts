import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'

/**
 * Manages all screen-wide visual effects (flash, shake, distortion, chromatic aberration, bloom)
 */
export class ScreenEffects {
  private scene: THREE.Scene
  private screenFlashMesh!: THREE.Mesh
  private distortionMesh!: THREE.Mesh
  private bloomBurstMesh!: THREE.Mesh
  private chromaticMesh!: THREE.Mesh
  private energyRippleMeshes: THREE.Mesh[] = []
  private shockwaveMeshes: THREE.Mesh[] = []

  private chromaticAberrationAmount: number = 0
  private screenShakeAmount: number = 0
  private slowMotionFactor: number = 1.0
  private timeOffset: number = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.initializeScreenEffects()
  }

  private initializeScreenEffects(): void {
    // Screen flash overlay - ENHANCED! (Now uses saturated colors instead of pure white)
    const flashGeometry = new THREE.PlaneGeometry(200, 200)
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF6622, // Saturated orange instead of white to prevent whiteouts
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
    this.screenFlashMesh = new THREE.Mesh(flashGeometry, flashMaterial)
    this.screenFlashMesh.position.z = 5
    this.scene.add(this.screenFlashMesh)

    // Distortion field for impact effects - ENHANCED!
    const distortGeometry = new THREE.PlaneGeometry(100, 100, 32, 32)
    const distortMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      wireframe: true
    })
    this.distortionMesh = new THREE.Mesh(distortGeometry, distortMaterial)
    this.distortionMesh.position.z = -1
    this.scene.add(this.distortionMesh)
    
    // 🌟 BLOOM BURST MESH - Now a RING instead of circle to avoid white blob! 🌟
    const bloomGeometry = new THREE.RingGeometry(2, 50, 64)
    const bloomMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF4400, // Orange-red ring for dramatic effect
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    this.bloomBurstMesh = new THREE.Mesh(bloomGeometry, bloomMaterial)
    this.bloomBurstMesh.position.z = 4
    this.scene.add(this.bloomBurstMesh)
    
    // 🌈 CHROMATIC ABERRATION MESH - For trippy color separation! 🌈
    const chromaGeometry = new THREE.PlaneGeometry(200, 200)
    const chromaMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF00FF,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
    this.chromaticMesh = new THREE.Mesh(chromaGeometry, chromaMaterial)
    this.chromaticMesh.position.z = 6
    this.scene.add(this.chromaticMesh)
    
    // 💫 ENERGY RIPPLE MESHES - For shockwave effects! 💫
    for (let i = 0; i < 5; i++) {
      const rippleGeometry = new THREE.RingGeometry(0.1, 1, 32)
      const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
      const rippleMesh = new THREE.Mesh(rippleGeometry, rippleMaterial)
      rippleMesh.position.z = 3
      this.energyRippleMeshes.push(rippleMesh)
      this.scene.add(rippleMesh)
    }
    
    // 💥 SHOCKWAVE MESHES - For expanding energy rings! 💥
    for (let i = 0; i < 3; i++) {
      const shockwaveGeometry = new THREE.RingGeometry(0.1, 2, 64)
      const shockwaveMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF4400,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
      const shockwaveMesh = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial)
      shockwaveMesh.position.z = 2
      shockwaveMesh.visible = false
      this.shockwaveMeshes.push(shockwaveMesh)
      this.scene.add(shockwaveMesh)
    }
  }

  // 📺 SCREEN EFFECTS 📺 - HEAVILY REDUCED to prevent whiteouts
  addScreenFlash(intensity: number, color: THREE.Color): void {
    const flashMaterial = this.screenFlashMesh.material as THREE.MeshBasicMaterial
    
    // 🔴 DRASTICALLY REDUCED - max 0.15 opacity to prevent white-out
    const clampedIntensity = Math.min(intensity * 0.3, 0.15)
    
    // Force saturated, DARK colors - never white
    const hsl = { h: 0, s: 0, l: 0 }
    color.getHSL(hsl)
    // Always use dark saturated version (lightness max 0.4)
    flashMaterial.color.setHSL(hsl.h, 1.0, Math.min(hsl.l, 0.4))
    
    flashMaterial.opacity = clampedIntensity
    
    new TWEEN.Tween(flashMaterial)
      .to({ opacity: 0 }, 100) // Faster fade
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
  }

  addScreenShake(intensity: number, duration: number): void {
    this.screenShakeAmount = Math.max(this.screenShakeAmount, intensity)
    
    // 🌈 ADD CHROMATIC ABERRATION FOR INTENSE SHAKES! 🌈
    if (intensity > 0.3) {
      this.chromaticAberrationAmount = Math.max(this.chromaticAberrationAmount, intensity * 2)
    }
    
    new TWEEN.Tween(this)
      .to({ screenShakeAmount: 0 }, duration * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
  }

  addSlowMotion(factor: number, duration: number): void {
    this.slowMotionFactor = factor
    
    new TWEEN.Tween(this)
      .to({ slowMotionFactor: 1.0 }, duration * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
  }

  addDistortionWave(center: THREE.Vector3, intensity: number): void {
    const distortMaterial = this.distortionMesh.material as THREE.MeshBasicMaterial
    this.distortionMesh.position.copy(center)
    distortMaterial.opacity = intensity * 0.5
    
    // Animate wave expansion
    this.distortionMesh.scale.setScalar(0.1)
    
    new TWEEN.Tween(this.distortionMesh.scale)
      .to({ x: 3, y: 3, z: 1 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
    
    new TWEEN.Tween(distortMaterial)
      .to({ opacity: 0 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
  }

  // 💥 SHOCKWAVE EFFECT - Expanding energy rings! 💥
  // 🔴 REDUCED OPACITY to prevent white-out when stacked
  createShockwave(position: THREE.Vector3, intensity: number): void {
    let availableShockwave: THREE.Mesh | undefined
    for (let i = 0; i < this.shockwaveMeshes.length; i++) {
      if (!this.shockwaveMeshes[i].visible) {
        availableShockwave = this.shockwaveMeshes[i]
        break
      }
    }
    if (!availableShockwave) return
    
    availableShockwave.position.copy(position)
    availableShockwave.position.z = 2
    availableShockwave.visible = true
    availableShockwave.scale.setScalar(0.1)
    
    const material = availableShockwave.material as THREE.MeshBasicMaterial
    // 🔴 REDUCED from 0.8 to 0.25 - prevents white-out
    material.opacity = 0.25 * intensity
    
    // Animate expansion
    new TWEEN.Tween(availableShockwave.scale)
      .to({ x: 10 * intensity, y: 10 * intensity, z: 1 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
    
    new TWEEN.Tween(material)
      .to({ opacity: 0 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => {
        availableShockwave!.visible = false
      })
      .start()
  }

  // 🌊 ENERGY RIPPLE! 🌊
  // 🔴 REDUCED OPACITY to prevent white-out when stacked
  createEnergyRipple(position: THREE.Vector3, intensity: number): void {
    let availableRipple: THREE.Mesh | undefined
    for (let i = 0; i < this.energyRippleMeshes.length; i++) {
      const ripple = this.energyRippleMeshes[i]
      const material = ripple.material as THREE.MeshBasicMaterial
      if (material.opacity < 0.1) {
        availableRipple = ripple
        break
      }
    }
    if (!availableRipple) return
    
    availableRipple.position.copy(position)
    availableRipple.position.z = 3
    availableRipple.scale.setScalar(0.1)
    
    const material = availableRipple.material as THREE.MeshBasicMaterial
    // 🔴 REDUCED from 0.6 to 0.2 - prevents white-out
    material.opacity = 0.2 * intensity
    
    // Animate expansion
    new TWEEN.Tween(availableRipple.scale)
      .to({ x: 8 * intensity, y: 8 * intensity, z: 1 }, 600)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
    
    new TWEEN.Tween(material)
      .to({ opacity: 0 }, 600)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
  }

  // 🌈 BLOOM BURST! 🌈
  // 🔴 REDUCED OPACITY to prevent white-out when stacked
  createBloomBurst(position: THREE.Vector3, intensity: number): void {
    this.bloomBurstMesh.position.copy(position)
    this.bloomBurstMesh.position.z = 4
    this.bloomBurstMesh.scale.setScalar(0.1)
    
    const material = this.bloomBurstMesh.material as THREE.MeshBasicMaterial
    // 🔴 REDUCED from 0.5 to 0.15 - prevents white-out
    material.opacity = 0.15 * intensity
    
    // Animate expansion
    new TWEEN.Tween(this.bloomBurstMesh.scale)
      .to({ x: 12 * intensity, y: 12 * intensity, z: 1 }, 400)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
    
    new TWEEN.Tween(material)
      .to({ opacity: 0 }, 400)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
  }

  update(deltaTime: number): void {
    this.timeOffset += deltaTime
    
    // 🌈 UPDATE CHROMATIC ABERRATION! 🌈
    // 🔴 REDUCED to prevent brightness stacking
    if (this.chromaticAberrationAmount > 0) {
      this.chromaticAberrationAmount *= 0.92 // Faster decay
      const chromaMaterial = this.chromaticMesh.material as THREE.MeshBasicMaterial
      // 🔴 REDUCED from 0.1 to 0.03 - prevents brightness stacking
      chromaMaterial.opacity = this.chromaticAberrationAmount * 0.03
      this.chromaticMesh.position.x = this.chromaticAberrationAmount * 0.3
      this.chromaticMesh.position.y = -this.chromaticAberrationAmount * 0.2
    }
    
    // Update TWEEN animations
    TWEEN.update()
  }

  getScreenShakeAmount(): number {
    return this.screenShakeAmount
  }

  getSlowMotionFactor(): number {
    return this.slowMotionFactor
  }
}

