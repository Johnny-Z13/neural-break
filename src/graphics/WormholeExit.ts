/**
 * 🌀 WORMHOLE EXIT - End of Rogue Layer Portal 🌀
 * Animated GREEN vortex with EXIT text and particle effects
 */
import * as THREE from 'three'

export class WormholeExit {
  private mesh: THREE.Group
  private innerRing!: THREE.Mesh
  private outerRing!: THREE.Mesh
  private particles!: THREE.Points
  private exitText: THREE.Sprite | null = null
  private time: number = 0
  private radius: number = 8 // Collision radius

  constructor() {
    this.mesh = new THREE.Group()
    
    // Create the vortex visual
    this.createVortex()
    this.createExitText()
  }

  private createVortex(): void {
    // Outer ring - rotating slowly (GREEN)
    const outerGeometry = new THREE.RingGeometry(6, 7, 32)
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // GREEN
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    this.outerRing = new THREE.Mesh(outerGeometry, outerMaterial)
    this.mesh.add(this.outerRing)

    // Inner ring - rotating faster, opposite direction (BRIGHT GREEN)
    const innerGeometry = new THREE.RingGeometry(3, 4, 32)
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88, // Cyan-green
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    this.innerRing = new THREE.Mesh(innerGeometry, innerMaterial)
    this.mesh.add(this.innerRing)

    // Center glow (WHITE-GREEN)
    const centerGeometry = new THREE.CircleGeometry(2.5, 32)
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0xccffcc, // Light green
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const centerGlow = new THREE.Mesh(centerGeometry, centerMaterial)
    this.mesh.add(centerGlow)

    // MORE swirling particles (200 instead of 100)
    const particleCount = 200
    const particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const distance = 2 + Math.random() * 5
      
      positions[i * 3] = Math.cos(angle) * distance
      positions[i * 3 + 1] = Math.sin(angle) * distance
      positions[i * 3 + 2] = 0.1

      // Green gradient
      const t = i / particleCount
      colors[i * 3] = 0.0 // R
      colors[i * 3 + 1] = 0.8 + t * 0.2 // G (bright green)
      colors[i * 3 + 2] = 0.2 + t * 0.3 // B (slight cyan tint)

      sizes[i] = 0.8 + Math.random() * 1.5
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const particleMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    })

    this.particles = new THREE.Points(particleGeometry, particleMaterial)
    this.mesh.add(this.particles)
  }

  private createExitText(): void {
    // Create canvas for text
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = 256
    canvas.height = 128

    // Draw EXIT text
    context.fillStyle = '#00ff00' // Green
    context.font = 'bold 60px monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('EXIT', 128, 64)

    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    })
    
    this.exitText = new THREE.Sprite(spriteMaterial)
    this.exitText.scale.set(6, 3, 1) // Smaller: 6x3 (was 12x6)
    this.exitText.position.set(0, 10, 0.2) // Closer: 10 units above (was 12)
    this.mesh.add(this.exitText)
  }

  update(deltaTime: number): void {
    this.time += deltaTime

    // Rotate rings in opposite directions (faster)
    this.outerRing.rotation.z = this.time * 0.8
    this.innerRing.rotation.z = -this.time * 1.5

    // Pulse the center glow
    const pulse = 0.5 + Math.sin(this.time * 4) * 0.3
    const centerGlow = this.mesh.children[2] as THREE.Mesh
    if (centerGlow) {
      (centerGlow.material as THREE.MeshBasicMaterial).opacity = pulse
    }

    // Pulse EXIT text
    if (this.exitText) {
      const textPulse = 0.8 + Math.sin(this.time * 3) * 0.2
      ;(this.exitText.material as THREE.SpriteMaterial).opacity = textPulse
    }

    // Animate particles spiraling inward (faster)
    const positions = this.particles.geometry.attributes.position.array as Float32Array
    const particleCount = positions.length / 3

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + this.time * 3 // Faster spiral
      const distance = 2 + Math.sin(this.time * 2 + i * 0.1) * 2 + 2
      
      positions[i * 3] = Math.cos(angle) * distance
      positions[i * 3 + 1] = Math.sin(angle) * distance
    }

    this.particles.geometry.attributes.position.needsUpdate = true
  }

  setPosition(x: number, y: number, z: number = 0): void {
    this.mesh.position.set(x, y, z)
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position
  }

  getMesh(): THREE.Group {
    return this.mesh
  }

  getRadius(): number {
    return this.radius
  }

  // Check if a point is inside the wormhole
  containsPoint(point: THREE.Vector3): boolean {
    const distance = this.mesh.position.distanceTo(point)
    return distance < this.radius
  }

  destroy(): void {
    // Clean up geometries and materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      }
      if (child instanceof THREE.Sprite) {
        if (child.material.map) child.material.map.dispose()
        child.material.dispose()
      }
    })
  }
}
