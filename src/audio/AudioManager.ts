/**
 * 🎵 NEURAL BREAK AUDIO SYSTEM 🎵
 * Procedural sci-fi audio - Aphex Twin / Autechre vibes
 * Optimized for reliability + distinct sound effects
 * 
 * 🎯 OPTIMIZATIONS:
 * - Memory leak prevention with proper node cleanup
 * - Sound limiting and priority system
 * - Performance tracking and debugging
 */

import { AudioPool, SoundCategory } from './AudioPool'

export class AudioManager {
  private audioContext: AudioContext | null = null
  private masterVolume: number = 0.5
  private masterGainNode: GainNode | null = null
  private sfxGainNode: GainNode | null = null  // Separate gain for sound effects
  private ambientGainNode: GainNode | null = null  // Separate gain for ambient
  
  // 🎯 AUDIO POOL - Memory and performance management
  private audioPool: AudioPool = new AudioPool()
  
  // Ambient soundscape
  private ambientNodes: AudioNode[] = []
  private ambientTimeouts: number[] = []  // Track setTimeout IDs for cleanup
  private isAmbientPlaying: boolean = false
  
  // Audio context state
  private isInitialized: boolean = false
  private pendingSounds: (() => void)[] = []
  private userGestureReceived: boolean = false

  // 🎵 DEBUG MODE - Performance tracking
  private debugMode: boolean = false

  /**
   * Prepare AudioManager - does NOT create AudioContext yet
   * AudioContext is deferred until first user gesture to avoid browser warnings
   */
  initialize(): void {
    // Don't create AudioContext here - wait for user gesture
    // This avoids "AudioContext was not allowed to start" warnings
    console.log('🎵 AudioManager ready (awaiting user gesture for AudioContext)')
  }

  /**
   * Actually create the AudioContext - only called after user gesture
   */
  private createAudioContext(): void {
    if (this.audioContext) return // Already created

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // 🎚️ CREATE MASTER DYNAMICS COMPRESSOR - Prevents audio clipping/distortion! 🎚️
      // This acts as a limiter when many sounds play simultaneously
      const compressor = this.audioContext.createDynamicsCompressor()
      compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime) // Start compressing at -24dB
      compressor.knee.setValueAtTime(12, this.audioContext.currentTime)       // Soft knee for smooth compression
      compressor.ratio.setValueAtTime(8, this.audioContext.currentTime)       // 8:1 ratio (aggressive limiting)
      compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime)  // Fast attack (3ms)
      compressor.release.setValueAtTime(0.15, this.audioContext.currentTime)  // Medium release (150ms)
      compressor.connect(this.audioContext.destination)

      // Create master gain node - connects to compressor instead of destination
      this.masterGainNode = this.audioContext.createGain()
      this.masterGainNode.gain.value = this.masterVolume
      this.masterGainNode.connect(compressor)

      // Create separate gain nodes for SFX and Ambient
      this.sfxGainNode = this.audioContext.createGain()
      this.sfxGainNode.gain.value = 0.8  // Slightly reduced to give compressor headroom
      this.sfxGainNode.connect(this.masterGainNode)

      this.ambientGainNode = this.audioContext.createGain()
      this.ambientGainNode.gain.value = 0.3  // Ambient quieter so SFX punch through
      this.ambientGainNode.connect(this.masterGainNode)

      this.isInitialized = true
      console.log('🎵 AudioContext created with dynamics compressor')

      // Play any pending sounds
      this.flushPendingSounds()

    } catch (error) {
      console.warn('🔇 Audio not supported:', error)
    }
  }

  /**
   * Ensure audio context is running - handles browser autoplay policies
   * Only logs warnings once to avoid console spam
   */
  private async ensureAudioReady(): Promise<boolean> {
    // If no user gesture received yet, silently return false
    if (!this.userGestureReceived) {
      return false
    }

    // Create AudioContext on first use after user gesture
    if (!this.audioContext) {
      this.createAudioContext()
    }

    if (!this.audioContext || !this.masterGainNode || !this.sfxGainNode) {
      return false
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        console.log('🎵 AudioContext resumed')
      } catch (e) {
        // Only warn once, not on every sound attempt
        if (this.debugMode) {
          console.warn('🔇 Could not resume audio context:', e)
        }
        return false
      }
    }

    return this.audioContext.state === 'running'
  }

  /**
   * 🎮 PUBLIC API - Resume audio context for user interaction
   * Call this on first user interaction (click, keypress, etc) to ensure audio works
   */
  async resumeAudio(): Promise<void> {
    this.userGestureReceived = true

    // Create AudioContext now that we have a user gesture
    if (!this.audioContext) {
      this.createAudioContext()
    }

    await this.ensureAudioReady()
  }

  /**
   * Queue a sound to play, handling async audio context
   */
  private queueSound(soundFn: () => void): void {
    if (!this.isInitialized) {
      this.pendingSounds.push(soundFn)
      return
    }
    
    this.ensureAudioReady().then(ready => {
      if (ready) {
        try {
          soundFn()
        } catch (e) {
          console.warn('🔇 Sound playback error:', e)
        }
      }
    })
  }

  private flushPendingSounds(): void {
    const sounds = [...this.pendingSounds]
    this.pendingSounds = []
    sounds.forEach(fn => this.queueSound(fn))
  }

  /**
   * 🎯 MANAGED SOUND - Automatically cleaned up after duration
   * Prevents memory leaks and tracks sound limits
   */
  private createManagedSound(
    duration: number,
    category: SoundCategory,
    priority: number,
    createNodes: () => AudioNode[]
  ): void {
    // Check if we can play this sound
    if (!this.audioPool.canPlaySound(category, priority)) {
      if (this.debugMode) {
        console.log(`🔇 Sound rejected (category: ${category}, priority: ${priority})`)
      }
      return
    }

    // Create the audio nodes
    const nodes = createNodes()
    
    // Register with pool for automatic cleanup
    this.audioPool.registerSound(nodes, duration, category, priority)
  }

  /**
   * Get audio context for external systems (like MusicManager)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  /**
   * Get master gain node for external systems
   */
  getMasterGainNode(): GainNode | null {
    return this.masterGainNode
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
  }

  /**
   * Get audio system performance stats
   */
  getDebugInfo() {
    return {
      audioPool: this.audioPool.getDebugInfo(),
      audioContextState: this.audioContext?.state || 'none',
      isInitialized: this.isInitialized,
      ambientPlaying: this.isAmbientPlaying
    }
  }

  /**
   * Force cleanup all sounds (for menu transitions, game over, etc.)
   */
  cleanup(): void {
    this.audioPool.forceCleanupAll()
    this.stopAmbient()
  }

  // ============================================
  // 🔫 WEAPON SOUNDS - Punchy, distinct
  // ============================================

  /**
   * 🔫 Fire Sound - Sharp digital blip with sci-fi character
   */
  playFireSound(): void {
    // Default to no power scaling
    this.playPowerScaledFireSound(0, 'bullets')
  }
  
  /**
   * 🔫🔥 POWER-SCALED FIRE SOUND - Gets BIGGER and more DRAMATIC at higher power levels! 🔥🔫
   * ✅ OPTIMIZED: Uses managed sound system with automatic cleanup
   */
  playPowerScaledFireSound(powerLevel: number, weaponType: string): void {
    const duration = 0.1 * (1 + powerLevel * 0.08) // Calculate total duration
    
    this.queueSound(() => {
      // Create nodes and track them for cleanup
      const nodes: AudioNode[] = []
      
      this.createManagedSound(
        duration,
        SoundCategory.WEAPON,
        6, // Medium-high priority
        () => {
          const ctx = this.audioContext!
          const now = ctx.currentTime
          const variation = Math.random()
          
          // 🔥 Power scaling factors 🔥
          const powerScale = 1 + powerLevel * 0.15 // Overall intensity
          const durationScale = 1 + powerLevel * 0.08 // Sound lasts longer
          const layerCount = 1 + Math.floor(powerLevel / 3) // More layers at high power
          
          // 🎯 Weapon-type specific base frequencies and characteristics
          let baseFreq: number
          let oscType: OscillatorType
          let filterType: BiquadFilterType = 'bandpass'
          
          switch (weaponType) {
            case 'lasers':
              baseFreq = 1200 + variation * 300 // Higher pitched
              oscType = 'sawtooth' // Harsher sound
              break
            case 'photons':
              baseFreq = 600 + variation * 200 // Mid-range
              oscType = 'sine' // Cleaner sound
              filterType = 'highpass'
              break
            default: // bullets
              baseFreq = 800 + variation * 400
              oscType = 'square'
          }
          
          // 🔥 MAIN PULSE - scales with power! 🔥
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const filter = ctx.createBiquadFilter()
          
          // Frequency drops more dramatically at higher power
          osc.frequency.setValueAtTime(baseFreq * powerScale, now)
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.08 * durationScale)
          osc.type = oscType
          
          filter.type = filterType
          filter.frequency.setValueAtTime(baseFreq * powerScale, now)
          filter.Q.value = 4 + powerLevel * 0.5
          
          // Louder and punchier at higher power
          const mainGain = 0.6 + powerLevel * 0.04
          gain.gain.setValueAtTime(0, now)
          gain.gain.linearRampToValueAtTime(Math.min(mainGain, 0.9), now + 0.005)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 * durationScale)
          
          osc.connect(filter)
          filter.connect(gain)
          gain.connect(this.sfxGainNode!)
          
          osc.start(now)
          osc.stop(now + 0.1 * durationScale)
          
          // Track nodes for cleanup
          nodes.push(osc, gain, filter)
          
          // 🔥 SUB-BASS THUMP - DEEPER and HEAVIER at high power! 🔥
          const sub = ctx.createOscillator()
          const subGain = ctx.createGain()
          
          sub.frequency.setValueAtTime(80 * powerScale, now)
          sub.frequency.exponentialRampToValueAtTime(30, now + 0.06 * durationScale)
          sub.type = 'sine'
          
          const subVolume = 0.3 + powerLevel * 0.03
          subGain.gain.setValueAtTime(0, now)
          subGain.gain.linearRampToValueAtTime(Math.min(subVolume, 0.5), now + 0.01)
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 * durationScale)
          
          sub.connect(subGain)
          subGain.connect(this.sfxGainNode!)
          
          sub.start(now)
          sub.stop(now + 0.08 * durationScale)
          
          nodes.push(sub, subGain)
          
          // 💥 EXTRA HARMONIC LAYERS AT HIGH POWER! 💥
          for (let i = 0; i < layerCount; i++) {
            if (i === 0) continue // Skip first layer (main already plays)
            
            const delay = i * 0.01
            const harmonic = ctx.createOscillator()
            const harmonicGain = ctx.createGain()
            const harmonicFilter = ctx.createBiquadFilter()
            
            const harmonicFreq = baseFreq * (1 + i * 0.5) * powerScale
            harmonic.frequency.setValueAtTime(harmonicFreq, now + delay)
            harmonic.frequency.exponentialRampToValueAtTime(harmonicFreq * 0.5, now + delay + 0.05 * durationScale)
            harmonic.type = 'sawtooth'
            
            harmonicFilter.type = 'bandpass'
            harmonicFilter.frequency.value = harmonicFreq
            harmonicFilter.Q.value = 3
            
            harmonicGain.gain.setValueAtTime(0, now + delay)
            harmonicGain.gain.linearRampToValueAtTime(0.2, now + delay + 0.005)
            harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06 * durationScale)
            
            harmonic.connect(harmonicFilter)
            harmonicFilter.connect(harmonicGain)
            harmonicGain.connect(this.sfxGainNode!)
            
            harmonic.start(now + delay)
            harmonic.stop(now + delay + 0.07 * durationScale)
            
            nodes.push(harmonic, harmonicGain, harmonicFilter)
          }
          
          // ⚡ CRACKLE/DISTORTION at power level 7+ ⚡
          if (powerLevel >= 7) {
            const noise = ctx.createBufferSource()
            const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate)
            const noiseData = noiseBuffer.getChannelData(0)
            
            for (let i = 0; i < noiseData.length; i++) {
              noiseData[i] = (Math.random() * 2 - 1) * 0.5 * Math.pow(1 - i / noiseData.length, 2)
            }
            
            noise.buffer = noiseBuffer
            
            const noiseGain = ctx.createGain()
            const noiseFilter = ctx.createBiquadFilter()
            noiseFilter.type = 'highpass'
            noiseFilter.frequency.value = 3000
            
            noiseGain.gain.setValueAtTime(0, now)
            noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.002)
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
            
            noise.connect(noiseFilter)
            noiseFilter.connect(noiseGain)
            noiseGain.connect(this.sfxGainNode!)
            
            noise.start(now)
            noise.stop(now + 0.05)
            
            nodes.push(noise, noiseGain, noiseFilter)
          }
          
          return nodes
        }
      )
    })
  }

  /**
   * 🎯 Enemy Hit Sound - Enemy takes damage (but survives) - satisfying feedback
   */
  playEnemyHitSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Short metallic "ping" sound for hit confirmation
      const hit = ctx.createOscillator()
      const hitGain = ctx.createGain()
      
      // Higher pitched than player hit - more "satisfying" tone
      hit.frequency.setValueAtTime(800, now)
      hit.frequency.exponentialRampToValueAtTime(1200, now + 0.05)
      hit.type = 'sine'
      
      hitGain.gain.setValueAtTime(0, now)
      hitGain.gain.linearRampToValueAtTime(0.3, now + 0.01)
      hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
      
      // Add a little noise for texture
      const noise = ctx.createBufferSource()
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 2)
      }
      
      noise.buffer = noiseBuffer
      
      const noiseGain = ctx.createGain()
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'highpass'
      noiseFilter.frequency.value = 2000
      
      noiseGain.gain.setValueAtTime(0, now)
      noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.005)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      
      // Connect
      hit.connect(hitGain)
      hitGain.connect(this.sfxGainNode!)
      
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(this.sfxGainNode!)
      
      hit.start(now)
      hit.stop(now + 0.1)
      noise.start(now)
      noise.stop(now + 0.08)
    })
  }
  
  /**
   * 💥 Hit Sound - Player takes damage - harsh, alarming
   */
  playHitSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Distorted noise burst
      const noise = ctx.createBufferSource()
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      
      for (let i = 0; i < noiseData.length; i++) {
        // Bitcrushed noise for digital harshness
        const val = (Math.random() * 2 - 1)
        noiseData[i] = Math.round(val * 4) / 4 * Math.pow(1 - i / noiseData.length, 1.5)
      }
      
      noise.buffer = noiseBuffer
      
      // Low impact thump
      const impact = ctx.createOscillator()
      const impactGain = ctx.createGain()
      
      impact.frequency.setValueAtTime(100, now)
      impact.frequency.exponentialRampToValueAtTime(30, now + 0.15)
      impact.type = 'sine'
      
      impactGain.gain.setValueAtTime(0, now)
      impactGain.gain.linearRampToValueAtTime(0.7, now + 0.01)
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      
      // High alarming tone
      const alarm = ctx.createOscillator()
      const alarmGain = ctx.createGain()
      const alarmFilter = ctx.createBiquadFilter()
      
      alarm.frequency.setValueAtTime(1500, now)
      alarm.frequency.exponentialRampToValueAtTime(400, now + 0.1)
      alarm.type = 'square'
      
      alarmFilter.type = 'highpass'
      alarmFilter.frequency.value = 500
      
      alarmGain.gain.setValueAtTime(0, now)
      alarmGain.gain.linearRampToValueAtTime(0.4, now + 0.005)
      alarmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      
      // Noise through filter
      const noiseGain = ctx.createGain()
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.value = 2000
      noiseFilter.Q.value = 2
      
      noiseGain.gain.setValueAtTime(0, now)
      noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.01)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      
      // Connect
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(this.sfxGainNode!)
      
      impact.connect(impactGain)
      impactGain.connect(this.sfxGainNode!)
      
      alarm.connect(alarmFilter)
      alarmFilter.connect(alarmGain)
      alarmGain.connect(this.sfxGainNode!)
      
      noise.start(now)
      noise.stop(now + 0.15)
      impact.start(now)
      impact.stop(now + 0.2)
      alarm.start(now)
      alarm.stop(now + 0.12)
    })
  }

  // ============================================
  // 💀 ENEMY DEATH SOUNDS - Varied per type
  // ============================================

  playEnemyDeathSound(enemyType?: string): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      switch (enemyType) {
        case 'DataMite':
          this.playDataMiteDeathInternal(ctx, now)
          break
        case 'ScanDrone':
          this.playScanDroneDeathInternal(ctx, now)
          break
        case 'ChaosWorm':
          this.playChaosWormDeathInternal(ctx, now)
          break
        case 'VoidSphere':
          this.playVoidSphereDeathInternal(ctx, now)
          break
        case 'CrystalShardSwarm':
          this.playCrystalSwarmDeathInternal(ctx, now)
          break
        case 'Fizzer':
          this.playFizzerDeathInternal(ctx, now)
          break
        case 'UFO':
          this.playUFODeathInternal(ctx, now)
          break
        case 'Boss':
          this.playBossDeathInternal(ctx, now)
          break
        default:
          this.playGenericDeathInternal(ctx, now)
      }
    })
  }

  private playDataMiteDeathInternal(ctx: AudioContext, now: number): void {
    // 🔥 ARCADE DATA BURST - 3 variations for variety! 🔥
    const variation = Math.floor(Math.random() * 3)
    
    switch (variation) {
      case 0:
        // Quick digital pop with bit-crush effect
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        
        osc1.frequency.setValueAtTime(1400 + Math.random() * 200, now)
        osc1.frequency.exponentialRampToValueAtTime(250, now + 0.08)
        osc1.type = 'square'
        
        gain1.gain.setValueAtTime(0, now)
        gain1.gain.linearRampToValueAtTime(0.5, now + 0.005)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
        
        osc1.connect(gain1)
        gain1.connect(this.sfxGainNode!)
        
        osc1.start(now)
        osc1.stop(now + 0.1)
        break
        
      case 1:
        // Double-pop arcade explosion
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const delay = i * 0.035
          
          osc.frequency.setValueAtTime(1200 - i * 300, now + delay)
          osc.frequency.exponentialRampToValueAtTime(200, now + delay + 0.06)
          osc.type = i === 0 ? 'square' : 'sawtooth'
          
          gain.gain.setValueAtTime(0, now + delay)
          gain.gain.linearRampToValueAtTime(0.45, now + delay + 0.003)
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08)
          
          osc.connect(gain)
          gain.connect(this.sfxGainNode!)
          
          osc.start(now + delay)
          osc.stop(now + delay + 0.1)
        }
        break
        
      case 2:
        // Glitchy digital break
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        const noise = ctx.createOscillator()
        const noiseGain = ctx.createGain()
        
        osc2.frequency.setValueAtTime(1600, now)
        osc2.frequency.setValueAtTime(1200, now + 0.02)
        osc2.frequency.exponentialRampToValueAtTime(300, now + 0.09)
        osc2.type = 'square'
        
        noise.frequency.setValueAtTime(50, now)
        noise.type = 'sawtooth'
        
        gain2.gain.setValueAtTime(0, now)
        gain2.gain.linearRampToValueAtTime(0.5, now + 0.003)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
        
        noiseGain.gain.setValueAtTime(0, now)
        noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.005)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        
        osc2.connect(gain2)
        noise.connect(noiseGain)
        gain2.connect(this.sfxGainNode!)
        noiseGain.connect(this.sfxGainNode!)
        
        osc2.start(now)
        osc2.stop(now + 0.1)
        noise.start(now)
        noise.stop(now + 0.08)
        break
    }
  }

  private playScanDroneDeathInternal(ctx: AudioContext, now: number): void {
    // 📡 GRID COLLAPSE - Multi-phase synced to animation! 📡
    // Phase 1: Grid flicker (0-0.25s)
    const flicker = ctx.createOscillator()
    const flickerGain = ctx.createGain()
    
    flicker.frequency.setValueAtTime(900, now)
    flicker.frequency.setValueAtTime(950, now + 0.05)
    flicker.frequency.setValueAtTime(900, now + 0.1)
    flicker.frequency.setValueAtTime(800, now + 0.15)
    flicker.type = 'square'
    
    flickerGain.gain.setValueAtTime(0, now)
    flickerGain.gain.linearRampToValueAtTime(0.3, now + 0.01)
    flickerGain.gain.setValueAtTime(0.15, now + 0.1)
    flickerGain.gain.setValueAtTime(0.3, now + 0.15)
    flickerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    
    flicker.connect(flickerGain)
    flickerGain.connect(this.sfxGainNode!)
    flicker.start(now)
    flicker.stop(now + 0.25)
    
    // Phase 2: Grid collapse (0.25-0.5s)
    const collapse = ctx.createOscillator()
    const collapseGain = ctx.createGain()
    
    collapse.frequency.setValueAtTime(800, now + 0.25)
    collapse.frequency.exponentialRampToValueAtTime(100, now + 0.5)
    collapse.type = 'sawtooth'
    
    collapseGain.gain.setValueAtTime(0, now + 0.25)
    collapseGain.gain.linearRampToValueAtTime(0.45, now + 0.27)
    collapseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52)
    
    collapse.connect(collapseGain)
    collapseGain.connect(this.sfxGainNode!)
    collapse.start(now + 0.25)
    collapse.stop(now + 0.52)
    
    // Phase 3: Electric arcs (0.5-0.75s)
    for (let i = 0; i < 3; i++) {
      const arc = ctx.createOscillator()
      const arcGain = ctx.createGain()
      const delay = 0.5 + i * 0.08
      
      arc.frequency.setValueAtTime(1200 + Math.random() * 400, now + delay)
      arc.frequency.exponentialRampToValueAtTime(400, now + delay + 0.06)
      arc.type = 'sine'
      
      arcGain.gain.setValueAtTime(0, now + delay)
      arcGain.gain.linearRampToValueAtTime(0.25, now + delay + 0.003)
      arcGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08)
      
      arc.connect(arcGain)
      arcGain.connect(this.sfxGainNode!)
      arc.start(now + delay)
      arc.stop(now + delay + 0.1)
    }
    
    // Phase 4: Final discharge (0.75s+)
    const discharge = ctx.createOscillator()
    const dischargeGain = ctx.createGain()
    const dischargeFilter = ctx.createBiquadFilter()
    
    discharge.frequency.setValueAtTime(600, now + 0.75)
    discharge.frequency.exponentialRampToValueAtTime(80, now + 0.95)
    discharge.type = 'triangle'
    
    dischargeFilter.type = 'highpass'
    dischargeFilter.frequency.value = 100
    
    dischargeGain.gain.setValueAtTime(0, now + 0.75)
    dischargeGain.gain.linearRampToValueAtTime(0.35, now + 0.77)
    dischargeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
    
    discharge.connect(dischargeFilter)
    dischargeFilter.connect(dischargeGain)
    dischargeGain.connect(this.sfxGainNode!)
    discharge.start(now + 0.75)
    discharge.stop(now + 1.0)
  }

  private playChaosWormDeathInternal(ctx: AudioContext, now: number): void {
    // Multi-layered chaotic explosion
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.025
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      const freq = 300 - i * 40 + Math.random() * 80
      osc.frequency.setValueAtTime(freq, now + delay)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.25, now + delay + 0.25)
      osc.type = ['sine', 'square', 'sawtooth', 'triangle'][i] as OscillatorType
      
      gain.gain.setValueAtTime(0, now + delay)
      gain.gain.linearRampToValueAtTime(0.35 - i * 0.06, now + delay + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28)
      
      osc.connect(gain)
      gain.connect(this.sfxGainNode!)
      
      osc.start(now + delay)
      osc.stop(now + delay + 0.3)
    }
  }

  private playVoidSphereDeathInternal(ctx: AudioContext, now: number): void {
    // 🌀 VOID IMPLOSION - Deep techno bass with distortion! 🌀
    // Phase 1: Rings collapse (0-0.27s)
    const ringCollapse = ctx.createOscillator()
    const ringGain = ctx.createGain()
    const ringFilter = ctx.createBiquadFilter()
    
    ringCollapse.frequency.setValueAtTime(80, now)
    ringCollapse.frequency.exponentialRampToValueAtTime(40, now + 0.27)
    ringCollapse.type = 'sine'
    
    ringFilter.type = 'lowpass'
    ringFilter.frequency.setValueAtTime(200, now)
    ringFilter.frequency.exponentialRampToValueAtTime(60, now + 0.27)
    ringFilter.Q.value = 8
    
    ringGain.gain.setValueAtTime(0, now)
    ringGain.gain.linearRampToValueAtTime(0.6, now + 0.05)
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    
    ringCollapse.connect(ringFilter)
    ringFilter.connect(ringGain)
    ringGain.connect(this.sfxGainNode!)
    ringCollapse.start(now)
    ringCollapse.stop(now + 0.3)
    
    // Phase 2: Singularity (0.27-0.4s) - Extreme implosion
    const singularity = ctx.createOscillator()
    const singularityGain = ctx.createGain()
    const singularityFilter = ctx.createBiquadFilter()
    
    singularity.frequency.setValueAtTime(30, now + 0.27)
    singularity.frequency.exponentialRampToValueAtTime(15, now + 0.4)
    singularity.type = 'triangle'
    
    singularityFilter.type = 'lowpass'
    singularityFilter.frequency.setValueAtTime(50, now + 0.27)
    singularityFilter.frequency.exponentialRampToValueAtTime(25, now + 0.4)
    singularityFilter.Q.value = 12
    
    singularityGain.gain.setValueAtTime(0, now + 0.27)
    singularityGain.gain.linearRampToValueAtTime(0.8, now + 0.3)
    singularityGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    
    singularity.connect(singularityFilter)
    singularityFilter.connect(singularityGain)
    singularityGain.connect(this.sfxGainNode!)
    singularity.start(now + 0.27)
    singularity.stop(now + 0.45)
    
    // Phase 3: Void burst (0.4-0.67s) - Violent techno explosion
    const burst = ctx.createOscillator()
    const burstGain = ctx.createGain()
    const burstFilter = ctx.createBiquadFilter()
    
    burst.frequency.setValueAtTime(50, now + 0.4)
    burst.frequency.exponentialRampToValueAtTime(200, now + 0.42)
    burst.frequency.exponentialRampToValueAtTime(40, now + 0.67)
    burst.type = 'sawtooth'
    
    burstFilter.type = 'bandpass'
    burstFilter.frequency.setValueAtTime(80, now + 0.4)
    burstFilter.frequency.exponentialRampToValueAtTime(300, now + 0.45)
    burstFilter.frequency.exponentialRampToValueAtTime(60, now + 0.67)
    burstFilter.Q.value = 10
    
    burstGain.gain.setValueAtTime(0, now + 0.4)
    burstGain.gain.linearRampToValueAtTime(0.7, now + 0.42)
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)
    
    burst.connect(burstFilter)
    burstFilter.connect(burstGain)
    burstGain.connect(this.sfxGainNode!)
    burst.start(now + 0.4)
    burst.stop(now + 0.7)
    
    // Add void tendrils (high-frequency artifacts)
    for (let i = 0; i < 5; i++) {
      const tendril = ctx.createOscillator()
      const tendrilGain = ctx.createGain()
      const delay = 0.4 + i * 0.05
      
      tendril.frequency.setValueAtTime(400 + i * 150 + Math.random() * 100, now + delay)
      tendril.frequency.exponentialRampToValueAtTime(100, now + delay + 0.12)
      tendril.type = 'sine'
      
      tendrilGain.gain.setValueAtTime(0, now + delay)
      tendrilGain.gain.linearRampToValueAtTime(0.2, now + delay + 0.005)
      tendrilGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15)
      
      tendril.connect(tendrilGain)
      tendrilGain.connect(this.sfxGainNode!)
      tendril.start(now + delay)
      tendril.stop(now + delay + 0.18)
    }
    
    // Phase 4: Distortion waves (0.67-1.5s) - Eerie techno decay
    const wave = ctx.createOscillator()
    const waveGain = ctx.createGain()
    const waveFilter = ctx.createBiquadFilter()
    
    wave.frequency.setValueAtTime(60, now + 0.67)
    wave.frequency.exponentialRampToValueAtTime(30, now + 1.5)
    wave.type = 'triangle'
    
    waveFilter.type = 'lowpass'
    waveFilter.frequency.setValueAtTime(120, now + 0.67)
    waveFilter.frequency.exponentialRampToValueAtTime(40, now + 1.5)
    
    waveGain.gain.setValueAtTime(0, now + 0.67)
    waveGain.gain.linearRampToValueAtTime(0.4, now + 0.7)
    waveGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
    
    wave.connect(waveFilter)
    waveFilter.connect(waveGain)
    waveGain.connect(this.sfxGainNode!)
    wave.start(now + 0.67)
    wave.stop(now + 1.5)
  }

  private playCrystalSwarmDeathInternal(ctx: AudioContext, now: number): void {
    // 💎 PRISMATIC SHATTER - Rainbow harmonics with crystal resonance! 💎
    // Phase 1: Shards fly outward (0-0.3s) - Rising harmonics
    for (let i = 0; i < 8; i++) {
      const shard = ctx.createOscillator()
      const shardGain = ctx.createGain()
      const shardFilter = ctx.createBiquadFilter()
      const delay = i * 0.035
      
      const baseFreq = 800 + i * 200 + Math.random() * 150
      shard.frequency.setValueAtTime(baseFreq, now + delay)
      shard.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + delay + 0.15)
      shard.type = 'sine'
      
      shardFilter.type = 'bandpass'
      shardFilter.frequency.setValueAtTime(baseFreq, now + delay)
      shardFilter.Q.value = 15 + Math.random() * 5
      
      shardGain.gain.setValueAtTime(0, now + delay)
      shardGain.gain.linearRampToValueAtTime(0.25, now + delay + 0.005)
      shardGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2)
      
      shard.connect(shardFilter)
      shardFilter.connect(shardGain)
      shardGain.connect(this.sfxGainNode!)
      shard.start(now + delay)
      shard.stop(now + delay + 0.22)
    }
    
    // Phase 2: Prism fragments (0.3-0.5s) - Chaotic harmonics
    for (let i = 0; i < 12; i++) {
      const fragment = ctx.createOscillator()
      const fragmentGain = ctx.createGain()
      const delay = 0.3 + (i * 0.015)
      
      const fragFreq = 1200 + Math.random() * 800
      fragment.frequency.setValueAtTime(fragFreq, now + delay)
      fragment.frequency.exponentialRampToValueAtTime(fragFreq * 0.5, now + delay + 0.12)
      fragment.type = 'sine'
      
      fragmentGain.gain.setValueAtTime(0, now + delay)
      fragmentGain.gain.linearRampToValueAtTime(0.2, now + delay + 0.003)
      fragmentGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15)
      
      fragment.connect(fragmentGain)
      fragmentGain.connect(this.sfxGainNode!)
      fragment.start(now + delay)
      fragment.stop(now + delay + 0.18)
    }
    
    // Phase 3: Rainbow explosion (0.5-0.7s) - Harmonic cascade
    const rainbowFreqs = [440, 554, 659, 784, 988, 1175, 1397] // Musical intervals
    for (let i = 0; i < rainbowFreqs.length; i++) {
      const rainbow = ctx.createOscillator()
      const rainbowGain = ctx.createGain()
      const delay = 0.5 + i * 0.025
      
      rainbow.frequency.setValueAtTime(rainbowFreqs[i], now + delay)
      rainbow.frequency.exponentialRampToValueAtTime(rainbowFreqs[i] * 0.6, now + delay + 0.18)
      rainbow.type = 'sine'
      
      rainbowGain.gain.setValueAtTime(0, now + delay)
      rainbowGain.gain.linearRampToValueAtTime(0.3, now + delay + 0.01)
      rainbowGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2)
      
      rainbow.connect(rainbowGain)
      rainbowGain.connect(this.sfxGainNode!)
      rainbow.start(now + delay)
      rainbow.stop(now + delay + 0.22)
    }
    
    // Phase 4: Prismatic distortion (0.7-1.0s) - Shimmering decay
    const distortion = ctx.createOscillator()
    const distortionGain = ctx.createGain()
    const distortionFilter = ctx.createBiquadFilter()
    
    distortion.frequency.setValueAtTime(1500, now + 0.7)
    distortion.frequency.exponentialRampToValueAtTime(300, now + 1.0)
    distortion.type = 'triangle'
    
    distortionFilter.type = 'highpass'
    distortionFilter.frequency.setValueAtTime(500, now + 0.7)
    distortionFilter.frequency.exponentialRampToValueAtTime(150, now + 1.0)
    
    distortionGain.gain.setValueAtTime(0, now + 0.7)
    distortionGain.gain.linearRampToValueAtTime(0.3, now + 0.72)
    distortionGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
    
    distortion.connect(distortionFilter)
    distortionFilter.connect(distortionGain)
    distortionGain.connect(this.sfxGainNode!)
    distortion.start(now + 0.7)
    distortion.stop(now + 1.0)
  }

  private playGenericDeathInternal(ctx: AudioContext, now: number): void {
    // Simple descending pop
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15)
    osc.type = 'triangle'
    
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    
    osc.connect(gain)
    gain.connect(this.sfxGainNode!)
    
    osc.start(now)
    osc.stop(now + 0.2)
  }

  // ============================================
  // 🎮 GAMEPLAY SOUNDS
  // ============================================

  /**
   * ⚡ Level Up Sound - Triumphant ascending arpeggio
   */
  playLevelUpSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      const frequencies = [440, 554, 659, 880, 1108]
      
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        const startTime = now + i * 0.07
        
        osc.frequency.setValueAtTime(freq, startTime)
        osc.type = 'sine'
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35)
        
        osc.connect(gain)
        gain.connect(this.sfxGainNode!)
        
        osc.start(startTime)
        osc.stop(startTime + 0.4)
      })
    })
  }

  /**
   * 🚀 Dash Sound - Whooshing burst
   */
  playDashSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Swoosh with noise
      const noise = ctx.createBufferSource()
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      
      for (let i = 0; i < noiseData.length; i++) {
        const env = Math.sin(Math.PI * i / noiseData.length)
        noiseData[i] = (Math.random() * 2 - 1) * env * 0.5
      }
      
      noise.buffer = noiseBuffer
      
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(500, now)
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.1)
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.2)
      filter.Q.value = 2
      
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.5, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      
      // Rising tone
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      
      osc.frequency.setValueAtTime(200, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1)
      osc.type = 'sawtooth'
      
      oscGain.gain.setValueAtTime(0, now)
      oscGain.gain.linearRampToValueAtTime(0.25, now + 0.01)
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxGainNode!)
      
      osc.connect(oscGain)
      oscGain.connect(this.sfxGainNode!)
      
      noise.start(now)
      noise.stop(now + 0.2)
      osc.start(now)
      osc.stop(now + 0.15)
    })
  }

  /**
   * 🚀 Thrust Sound - POWERFUL JET ENGINE BURST! 💥
   * Enhanced with sub-bass, dramatic sweep, and massive impact!
   */
  playThrustSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 💥 MASSIVE SUB-BASS IMPACT 💥
      const subBass = ctx.createOscillator()
      subBass.type = 'sine'
      subBass.frequency.setValueAtTime(40, now)
      subBass.frequency.exponentialRampToValueAtTime(80, now + 0.08)
      subBass.frequency.exponentialRampToValueAtTime(30, now + 0.5)
      
      const subBassGain = ctx.createGain()
      subBassGain.gain.setValueAtTime(0, now)
      subBassGain.gain.linearRampToValueAtTime(0.8, now + 0.015) // HUGE punch!
      subBassGain.gain.setValueAtTime(0.6, now + 0.1)
      subBassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      
      // Deep rumbling engine noise - MORE INTENSE!
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      
      for (let i = 0; i < noiseData.length; i++) {
        // Create rumbling texture with MORE layered frequencies
        const t = i / ctx.sampleRate
        const rumble = Math.sin(t * 60 * Math.PI * 2) * 0.4 +
                       Math.sin(t * 100 * Math.PI * 2) * 0.3 +
                       Math.sin(t * 150 * Math.PI * 2) * 0.25 +
                       (Math.random() * 2 - 1) * 0.6 // More noise!
        const env = Math.pow(Math.sin(Math.PI * i / noiseData.length), 0.4) // Punchier envelope
        noiseData[i] = rumble * env
      }
      
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuffer
      
      // Low-pass filter for deep rumble - MORE DRAMATIC SWEEP!
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.setValueAtTime(300, now)
      lowpass.frequency.exponentialRampToValueAtTime(1200, now + 0.12) // Bigger sweep!
      lowpass.frequency.exponentialRampToValueAtTime(250, now + 0.45)
      lowpass.Q.value = 4 // More resonance!
      
      // Gain envelope - MASSIVE ATTACK!
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0, now)
      noiseGain.gain.linearRampToValueAtTime(0.8, now + 0.02) // LOUDER!
      noiseGain.gain.setValueAtTime(0.65, now + 0.12)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      
      // Deep oscillator for engine tone - MORE POWER!
      const osc1 = ctx.createOscillator()
      osc1.type = 'sawtooth'
      osc1.frequency.setValueAtTime(50, now)
      osc1.frequency.exponentialRampToValueAtTime(120, now + 0.06)
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.45)
      
      const osc1Gain = ctx.createGain()
      osc1Gain.gain.setValueAtTime(0, now)
      osc1Gain.gain.linearRampToValueAtTime(0.5, now + 0.02) // Louder!
      osc1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      
      // Higher harmonic for jet whistle - MORE DRAMATIC!
      const osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(400, now)
      osc2.frequency.exponentialRampToValueAtTime(1000, now + 0.1) // Higher sweep!
      osc2.frequency.exponentialRampToValueAtTime(200, now + 0.4)
      
      const osc2Gain = ctx.createGain()
      osc2Gain.gain.setValueAtTime(0, now)
      osc2Gain.gain.linearRampToValueAtTime(0.25, now + 0.03) // Louder!
      osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      
      // 🔥 EXTRA HIGH-FREQUENCY SIZZLE 🔥
      const sizzle = ctx.createOscillator()
      sizzle.type = 'triangle'
      sizzle.frequency.setValueAtTime(2000, now)
      sizzle.frequency.exponentialRampToValueAtTime(4000, now + 0.08)
      sizzle.frequency.exponentialRampToValueAtTime(1500, now + 0.3)
      
      const sizzleGain = ctx.createGain()
      sizzleGain.gain.setValueAtTime(0, now)
      sizzleGain.gain.linearRampToValueAtTime(0.12, now + 0.02)
      sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      
      // Connect sub-bass path
      subBass.connect(subBassGain)
      subBassGain.connect(this.sfxGainNode!)
      
      // Connect noise path
      noise.connect(lowpass)
      lowpass.connect(noiseGain)
      noiseGain.connect(this.sfxGainNode!)
      
      // Connect oscillator paths
      osc1.connect(osc1Gain)
      osc1Gain.connect(this.sfxGainNode!)
      
      osc2.connect(osc2Gain)
      osc2Gain.connect(this.sfxGainNode!)
      
      sizzle.connect(sizzleGain)
      sizzleGain.connect(this.sfxGainNode!)
      
      // Start and stop
      subBass.start(now)
      subBass.stop(now + 0.5)
      noise.start(now)
      noise.stop(now + 0.5)
      osc1.start(now)
      osc1.stop(now + 0.45)
      osc2.start(now)
      osc2.stop(now + 0.4)
      sizzle.start(now)
      sizzle.stop(now + 0.3)
    })
  }

  /**
   * 🔥 Combo Sound - Intensity scales with combo
   */
  playComboSound(combo: number): void {
    if (combo < 2) return
    
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      const intensity = Math.min(combo / 10, 1)
      
      const baseFreq = 400 + combo * 40
      const layers = Math.min(Math.floor(combo / 3), 4)
      
      for (let i = 0; i < layers; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        osc.frequency.setValueAtTime(baseFreq + i * 80, now)
        osc.frequency.exponentialRampToValueAtTime((baseFreq + i * 80) * 1.3, now + 0.1)
        osc.type = ['sine', 'square', 'sawtooth'][i % 3] as OscillatorType
        
        const vol = (0.25 + intensity * 0.2) / layers
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(vol, now + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
        
        osc.connect(gain)
        gain.connect(this.sfxGainNode!)
        
        osc.start(now)
        osc.stop(now + 0.15)
      }
    })
  }

  /**
   * 💎 Power-Up Collect - Sparkly ascending notes
   */
  playPowerUpCollectSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      const frequencies = [523, 659, 784, 1046, 1318]
      
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        const startTime = now + i * 0.05
        
        osc.frequency.setValueAtTime(freq, startTime)
        osc.frequency.exponentialRampToValueAtTime(freq * 1.2, startTime + 0.08)
        osc.type = 'sine'
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12)
        
        osc.connect(gain)
        gain.connect(this.sfxGainNode!)
        
        osc.start(startTime)
        osc.stop(startTime + 0.15)
      })
    })
  }

  /**
   * ⏰ Timer Warning - Urgent beeps
   */
  playTimerWarningSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        const startTime = now + i * 0.12
        
        osc.frequency.setValueAtTime(900, startTime)
        osc.frequency.exponentialRampToValueAtTime(1100, startTime + 0.04)
        osc.type = 'square'
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.45, startTime + 0.005)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08)
        
        osc.connect(gain)
        gain.connect(this.sfxGainNode!)
        
        osc.start(startTime)
        osc.stop(startTime + 0.1)
      }
    })
  }

  /**
   * 🎯 Level Complete - Triumphant chord
   */
  playLevelCompleteSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      const chord = [440, 554, 659, 880]
      
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        const startTime = now + i * 0.08
        
        osc.frequency.setValueAtTime(freq, startTime)
        osc.type = 'sine'
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04)
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.25)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45)
        
        osc.connect(gain)
        gain.connect(this.sfxGainNode!)
        
        osc.start(startTime)
        osc.stop(startTime + 0.5)
      })
    })
  }

  /**
   * 🎯 Multiplier Sound - Cluster kills
   */
  playMultiplierSound(clusterSize: number): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      const intensity = Math.min(clusterSize / 5, 1)
      
      const baseFreq = 500 + clusterSize * 80
      const layers = Math.min(clusterSize, 5)
      
      for (let i = 0; i < layers; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        const delay = i * 0.04
        const freq = baseFreq + i * 120
        
        osc.frequency.setValueAtTime(freq, now + delay)
        osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + delay + 0.18)
        osc.type = ['sine', 'square', 'sawtooth'][i % 3] as OscillatorType
        
        const vol = (0.3 + intensity * 0.25) / layers
        gain.gain.setValueAtTime(0, now + delay)
        gain.gain.linearRampToValueAtTime(vol, now + delay + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25)
        
        osc.connect(gain)
        gain.connect(this.sfxGainNode!)
        
        osc.start(now + delay)
        osc.stop(now + delay + 0.28)
      }
    })
  }

  /**
   * 🏆 High Score Moment - Subtle celebration
   */
  playHighScoreMomentSound(score: number, combo: number): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      const intensity = Math.min(Math.max(score / 10000, combo / 20), 1)
      
      const chord = [440, 554, 659]
      
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        const startTime = now + i * 0.05
        
        osc.frequency.setValueAtTime(freq, startTime)
        osc.type = 'sine'
        
        const vol = 0.12 + intensity * 0.08
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)
        
        osc.connect(gain)
        gain.connect(this.sfxGainNode!)
        
        osc.start(startTime)
        osc.stop(startTime + 0.35)
      })
    })
  }

  /**
   * 💀 Game Over - Dramatic descending doom
   */
  playGameOverSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Low doom tone
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      const gain2 = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      
      osc1.frequency.setValueAtTime(200, now)
      osc1.frequency.exponentialRampToValueAtTime(60, now + 0.5)
      osc1.type = 'sawtooth'
      
      osc2.frequency.setValueAtTime(100, now)
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.5)
      osc2.type = 'triangle'
      
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(300, now)
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.5)
      
      gain1.gain.setValueAtTime(0, now)
      gain1.gain.linearRampToValueAtTime(0.55, now + 0.08)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      
      gain2.gain.setValueAtTime(0, now)
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      
      osc1.connect(gain1)
      osc2.connect(gain2)
      gain1.connect(filter)
      gain2.connect(filter)
      filter.connect(this.sfxGainNode!)
      
      osc1.start(now)
      osc1.stop(now + 0.6)
      osc2.start(now)
      osc2.stop(now + 0.6)
    })
  }

  // ============================================
  // 🎮 UI SOUNDS
  // ============================================

  playButtonPressSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.02)
      osc.type = 'square'
      
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.35, now + 0.002)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
      
      osc.connect(gain)
      gain.connect(this.sfxGainNode!)
      
      osc.start(now)
      osc.stop(now + 0.05)
    })
  }

  playButtonHoverSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.frequency.setValueAtTime(600, now)
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.04)
      osc.type = 'sine'
      
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.15, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
      
      osc.connect(gain)
      gain.connect(this.sfxGainNode!)
      
      osc.start(now)
      osc.stop(now + 0.08)
    })
  }

  // ============================================
  // 🐛 CHAOS WORM SOUNDS - Rainbow Destruction! 🐛
  // ============================================

  /**
   * 💀 Chaos Worm Death Start - Ominous rumble as death begins
   */
  playChaosWormDeathStartSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 🌑 DEEP RUMBLE 🌑
      const rumble = ctx.createOscillator()
      const rumbleGain = ctx.createGain()
      
      rumble.frequency.setValueAtTime(40, now)
      rumble.frequency.linearRampToValueAtTime(60, now + 0.5)
      rumble.type = 'sine'
      
      rumbleGain.gain.setValueAtTime(0, now)
      rumbleGain.gain.linearRampToValueAtTime(0.5, now + 0.2)
      rumbleGain.gain.linearRampToValueAtTime(0.3, now + 0.6)
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
      
      rumble.connect(rumbleGain)
      rumbleGain.connect(this.sfxGainNode!)
      
      rumble.start(now)
      rumble.stop(now + 1.1)
      
      // ⚡ DISTORTION CRACKLE ⚡
      const noise = ctx.createBufferSource()
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      
      for (let i = 0; i < noiseData.length; i++) {
        const t = i / noiseData.length
        noiseData[i] = (Math.random() * 2 - 1) * (0.3 + t * 0.4) * Math.sin(t * Math.PI)
      }
      
      noise.buffer = noiseBuffer
      
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.value = 200
      noiseFilter.Q.value = 3
      
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0, now)
      noiseGain.gain.linearRampToValueAtTime(0.25, now + 0.3)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
      
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(this.sfxGainNode!)
      
      noise.start(now)
      noise.stop(now + 0.8)
    })
  }

  /**
   * 💥 Chaos Worm Segment Explode - Each segment pops with rainbow energy
   */
  playChaosWormSegmentExplodeSound(segmentIndex: number, totalSegments: number): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Higher pitch for segments closer to head
      const pitchMultiplier = 0.5 + (segmentIndex / totalSegments) * 1.5
      
      // 💥 POP EXPLOSION 💥
      const pop = ctx.createOscillator()
      const popGain = ctx.createGain()
      const popFilter = ctx.createBiquadFilter()
      
      pop.frequency.setValueAtTime(200 * pitchMultiplier, now)
      pop.frequency.exponentialRampToValueAtTime(60, now + 0.15)
      pop.type = 'sawtooth'
      
      popFilter.type = 'lowpass'
      popFilter.frequency.setValueAtTime(800 * pitchMultiplier, now)
      popFilter.frequency.exponentialRampToValueAtTime(100, now + 0.15)
      
      popGain.gain.setValueAtTime(0, now)
      popGain.gain.linearRampToValueAtTime(0.4, now + 0.01)
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      
      pop.connect(popFilter)
      popFilter.connect(popGain)
      popGain.connect(this.sfxGainNode!)
      
      pop.start(now)
      pop.stop(now + 0.2)
      
      // 🌈 HARMONIC SHIMMER 🌈
      const shimmer = ctx.createOscillator()
      const shimmerGain = ctx.createGain()
      
      shimmer.frequency.setValueAtTime(400 * pitchMultiplier, now)
      shimmer.frequency.exponentialRampToValueAtTime(800 * pitchMultiplier, now + 0.1)
      shimmer.type = 'sine'
      
      shimmerGain.gain.setValueAtTime(0, now)
      shimmerGain.gain.linearRampToValueAtTime(0.2, now + 0.02)
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      
      shimmer.connect(shimmerGain)
      shimmerGain.connect(this.sfxGainNode!)
      
      shimmer.start(now)
      shimmer.stop(now + 0.15)
    })
  }

  /**
   * 🌟 Chaos Worm Final Death - Massive rainbow explosion
   */
  playChaosWormFinalDeathSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 💀 MASSIVE IMPACT 💀
      const impact = ctx.createOscillator()
      const impactGain = ctx.createGain()
      
      impact.frequency.setValueAtTime(80, now)
      impact.frequency.exponentialRampToValueAtTime(20, now + 0.5)
      impact.type = 'sine'
      
      impactGain.gain.setValueAtTime(0, now)
      impactGain.gain.linearRampToValueAtTime(0.7, now + 0.02)
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      
      impact.connect(impactGain)
      impactGain.connect(this.sfxGainNode!)
      
      impact.start(now)
      impact.stop(now + 0.65)
      
      // 🌈 RAINBOW HARMONICS CASCADE 🌈
      for (let i = 0; i < 6; i++) {
        const delay = i * 0.03
        const harmonic = ctx.createOscillator()
        const harmonicGain = ctx.createGain()
        
        const freq = 150 + i * 100
        harmonic.frequency.setValueAtTime(freq, now + delay)
        harmonic.frequency.exponentialRampToValueAtTime(freq * 2, now + delay + 0.15)
        harmonic.type = 'sine'
        
        harmonicGain.gain.setValueAtTime(0, now + delay)
        harmonicGain.gain.linearRampToValueAtTime(0.2, now + delay + 0.02)
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25)
        
        harmonic.connect(harmonicGain)
        harmonicGain.connect(this.sfxGainNode!)
        
        harmonic.start(now + delay)
        harmonic.stop(now + delay + 0.3)
      }
      
      // ⚡ EXPLOSION NOISE ⚡
      const noise = ctx.createBufferSource()
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      
      for (let i = 0; i < noiseData.length; i++) {
        const t = i / noiseData.length
        noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5) * 0.8
      }
      
      noise.buffer = noiseBuffer
      
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.setValueAtTime(2000, now)
      noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.4)
      
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0, now)
      noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.02)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(this.sfxGainNode!)
      
      noise.start(now)
      noise.stop(now + 0.45)
    })
  }

  // ============================================
  // 💎 CRYSTAL SHARD SWARM SOUNDS - Prismatic Fury! 💎
  // ============================================

  /**
   * 💎 Crystal Hum - Ambient resonance
   */
  playCrystalHumSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 🔮 CRYSTAL RESONANCE 🔮
      for (let i = 0; i < 3; i++) {
        const hum = ctx.createOscillator()
        const humGain = ctx.createGain()
        
        const baseFreq = 300 + i * 200
        hum.frequency.setValueAtTime(baseFreq, now)
        hum.frequency.setValueAtTime(baseFreq * 1.02, now + 0.1)
        hum.frequency.setValueAtTime(baseFreq, now + 0.2)
        hum.type = 'sine'
        
        humGain.gain.setValueAtTime(0, now)
        humGain.gain.linearRampToValueAtTime(0.08, now + 0.05)
        humGain.gain.linearRampToValueAtTime(0.06, now + 0.15)
        humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
        
        hum.connect(humGain)
        humGain.connect(this.sfxGainNode!)
        
        hum.start(now)
        hum.stop(now + 0.4)
      }
      
      // ✨ SHIMMER ✨
      const shimmer = ctx.createOscillator()
      const shimmerGain = ctx.createGain()
      
      shimmer.frequency.setValueAtTime(2000, now)
      shimmer.frequency.exponentialRampToValueAtTime(1500, now + 0.2)
      shimmer.type = 'sine'
      
      shimmerGain.gain.setValueAtTime(0, now)
      shimmerGain.gain.linearRampToValueAtTime(0.05, now + 0.03)
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      
      shimmer.connect(shimmerGain)
      shimmerGain.connect(this.sfxGainNode!)
      
      shimmer.start(now)
      shimmer.stop(now + 0.3)
    })
  }

  /**
   * ⚡ Crystal Charge - Building energy before shard burst
   */
  playCrystalChargeSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 🔋 ASCENDING CRYSTALLINE WHINE 🔋
      const charge = ctx.createOscillator()
      const chargeGain = ctx.createGain()
      const chargeFilter = ctx.createBiquadFilter()
      
      charge.frequency.setValueAtTime(400, now)
      charge.frequency.exponentialRampToValueAtTime(2000, now + 0.2)
      charge.type = 'sine'
      
      chargeFilter.type = 'bandpass'
      chargeFilter.frequency.setValueAtTime(500, now)
      chargeFilter.frequency.exponentialRampToValueAtTime(2500, now + 0.2)
      chargeFilter.Q.value = 8
      
      chargeGain.gain.setValueAtTime(0, now)
      chargeGain.gain.linearRampToValueAtTime(0.3, now + 0.15)
      chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      
      charge.connect(chargeFilter)
      chargeFilter.connect(chargeGain)
      chargeGain.connect(this.sfxGainNode!)
      
      charge.start(now)
      charge.stop(now + 0.3)
      
      // 💎 PRISMATIC HARMONICS 💎
      for (let i = 0; i < 4; i++) {
        const harmonic = ctx.createOscillator()
        const harmonicGain = ctx.createGain()
        const delay = i * 0.03
        
        harmonic.frequency.setValueAtTime(600 + i * 300, now + delay)
        harmonic.frequency.exponentialRampToValueAtTime(1200 + i * 400, now + delay + 0.15)
        harmonic.type = 'triangle'
        
        harmonicGain.gain.setValueAtTime(0, now + delay)
        harmonicGain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02)
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18)
        
        harmonic.connect(harmonicGain)
        harmonicGain.connect(this.sfxGainNode!)
        
        harmonic.start(now + delay)
        harmonic.stop(now + delay + 0.2)
      }
    })
  }

  /**
   * 🔫 Crystal Fire - Sharp crystalline projectile launch
   */
  playCrystalFireSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 💎 CRYSTAL SHATTER LAUNCH 💎
      const main = ctx.createOscillator()
      const mainGain = ctx.createGain()
      const mainFilter = ctx.createBiquadFilter()
      
      main.frequency.setValueAtTime(1500, now)
      main.frequency.exponentialRampToValueAtTime(600, now + 0.08)
      main.type = 'triangle'
      
      mainFilter.type = 'highpass'
      mainFilter.frequency.value = 400
      mainFilter.Q.value = 2
      
      mainGain.gain.setValueAtTime(0, now)
      mainGain.gain.linearRampToValueAtTime(0.35, now + 0.005)
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
      
      main.connect(mainFilter)
      mainFilter.connect(mainGain)
      mainGain.connect(this.sfxGainNode!)
      
      main.start(now)
      main.stop(now + 0.12)
      
      // ✨ GLASS-LIKE TINKLE ✨
      for (let i = 0; i < 3; i++) {
        const tinkle = ctx.createOscillator()
        const tinkleGain = ctx.createGain()
        const delay = i * 0.015
        
        const freq = 1800 + i * 400 + Math.random() * 200
        tinkle.frequency.setValueAtTime(freq, now + delay)
        tinkle.frequency.exponentialRampToValueAtTime(freq * 0.7, now + delay + 0.06)
        tinkle.type = 'sine'
        
        tinkleGain.gain.setValueAtTime(0, now + delay)
        tinkleGain.gain.linearRampToValueAtTime(0.15, now + delay + 0.003)
        tinkleGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08)
        
        tinkle.connect(tinkleGain)
        tinkleGain.connect(this.sfxGainNode!)
        
        tinkle.start(now + delay)
        tinkle.stop(now + delay + 0.1)
      }
      
      // ⚡ ENERGY CRACKLE ⚡
      const crackle = ctx.createBufferSource()
      const crackleBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
      const crackleData = crackleBuffer.getChannelData(0)
      
      for (let i = 0; i < crackleData.length; i++) {
        crackleData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackleData.length, 2) * 0.5
      }
      
      crackle.buffer = crackleBuffer
      
      const crackleFilter = ctx.createBiquadFilter()
      crackleFilter.type = 'highpass'
      crackleFilter.frequency.value = 2000
      
      const crackleGain = ctx.createGain()
      crackleGain.gain.setValueAtTime(0, now)
      crackleGain.gain.linearRampToValueAtTime(0.2, now + 0.005)
      crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
      
      crackle.connect(crackleFilter)
      crackleFilter.connect(crackleGain)
      crackleGain.connect(this.sfxGainNode!)
      
      crackle.start(now)
      crackle.stop(now + 0.06)
    })
  }

  // ============================================
  // 🌀 VOID SPHERE SOUNDS - Cyberpunk Horror! 🌀
  // ============================================

  /**
   * 💫 Void Sphere Ambient Pulse - Deep, ominous cyberpunk throb
   */
  playVoidSpherePulseSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 🌑 DEEP SUB-BASS THROB 🌑
      const sub = ctx.createOscillator()
      const subGain = ctx.createGain()
      const subFilter = ctx.createBiquadFilter()
      
      sub.frequency.setValueAtTime(35, now)
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.3)
      sub.type = 'sine'
      
      subFilter.type = 'lowpass'
      subFilter.frequency.value = 80
      
      subGain.gain.setValueAtTime(0, now)
      subGain.gain.linearRampToValueAtTime(0.35, now + 0.05)
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      
      sub.connect(subFilter)
      subFilter.connect(subGain)
      subGain.connect(this.sfxGainNode!)
      
      sub.start(now)
      sub.stop(now + 0.45)
      
      // ⚡ CYBERPUNK DIGITAL SHIMMER ⚡
      for (let i = 0; i < 3; i++) {
        const shimmer = ctx.createOscillator()
        const shimmerGain = ctx.createGain()
        const delay = i * 0.08
        
        const freq = 800 + i * 400 + Math.random() * 200
        shimmer.frequency.setValueAtTime(freq, now + delay)
        shimmer.frequency.exponentialRampToValueAtTime(freq * 0.5, now + delay + 0.2)
        shimmer.type = 'sine'
        
        shimmerGain.gain.setValueAtTime(0, now + delay)
        shimmerGain.gain.linearRampToValueAtTime(0.08, now + delay + 0.02)
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25)
        
        shimmer.connect(shimmerGain)
        shimmerGain.connect(this.sfxGainNode!)
        
        shimmer.start(now + delay)
        shimmer.stop(now + delay + 0.3)
      }
      
      // 🔮 ETHEREAL VOID WHISPER 🔮
      const noise = ctx.createBufferSource()
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      
      for (let i = 0; i < noiseData.length; i++) {
        // Filtered, ethereal noise
        const env = Math.sin(Math.PI * i / noiseData.length)
        noiseData[i] = (Math.random() * 2 - 1) * env * 0.3
      }
      
      noise.buffer = noiseBuffer
      
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.setValueAtTime(2000, now)
      noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 0.3)
      noiseFilter.Q.value = 8
      
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0, now)
      noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.05)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(this.sfxGainNode!)
      
      noise.start(now)
      noise.stop(now + 0.35)
    })
  }

  /**
   * ⚡ Void Sphere Charge Sound - Building energy before burst fire
   */
  playVoidSphereChargeSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 🔋 ASCENDING CHARGE WHINE 🔋
      const charge = ctx.createOscillator()
      const chargeGain = ctx.createGain()
      const chargeFilter = ctx.createBiquadFilter()
      
      charge.frequency.setValueAtTime(150, now)
      charge.frequency.exponentialRampToValueAtTime(1200, now + 0.25)
      charge.type = 'sawtooth'
      
      chargeFilter.type = 'bandpass'
      chargeFilter.frequency.setValueAtTime(200, now)
      chargeFilter.frequency.exponentialRampToValueAtTime(1500, now + 0.25)
      chargeFilter.Q.value = 6
      
      chargeGain.gain.setValueAtTime(0, now)
      chargeGain.gain.linearRampToValueAtTime(0.4, now + 0.2)
      chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      
      charge.connect(chargeFilter)
      chargeFilter.connect(chargeGain)
      chargeGain.connect(this.sfxGainNode!)
      
      charge.start(now)
      charge.stop(now + 0.35)
      
      // ⚡ ELECTRICAL CRACKLE ⚡
      const crackle = ctx.createOscillator()
      const crackleGain = ctx.createGain()
      
      crackle.frequency.setValueAtTime(60, now)
      crackle.type = 'square'
      
      // Fast AM modulation for crackle effect
      const crackleAM = ctx.createOscillator()
      const crackleAMGain = ctx.createGain()
      crackleAM.frequency.value = 40
      crackleAMGain.gain.value = 0.5
      
      crackleGain.gain.setValueAtTime(0, now)
      crackleGain.gain.linearRampToValueAtTime(0.25, now + 0.1)
      crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      
      crackleAM.connect(crackleAMGain)
      crackleAMGain.connect(crackleGain.gain)
      crackle.connect(crackleGain)
      crackleGain.connect(this.sfxGainNode!)
      
      crackle.start(now)
      crackleAM.start(now)
      crackle.stop(now + 0.35)
      crackleAM.stop(now + 0.35)
      
      // 🌀 VOID HARMONIC SWEEP 🌀
      for (let i = 0; i < 4; i++) {
        const harmonic = ctx.createOscillator()
        const harmonicGain = ctx.createGain()
        const delay = i * 0.04
        
        harmonic.frequency.setValueAtTime(300 + i * 150, now + delay)
        harmonic.frequency.exponentialRampToValueAtTime(1800 + i * 200, now + delay + 0.2)
        harmonic.type = 'sine'
        
        harmonicGain.gain.setValueAtTime(0, now + delay)
        harmonicGain.gain.linearRampToValueAtTime(0.12 - i * 0.02, now + delay + 0.03)
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22)
        
        harmonic.connect(harmonicGain)
        harmonicGain.connect(this.sfxGainNode!)
        
        harmonic.start(now + delay)
        harmonic.stop(now + delay + 0.25)
      }
    })
  }

  /**
   * 🔫 Void Sphere Fire Sound - Sinister cyberpunk projectile
   */
  playVoidSphereFireSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // 💀 DARK MATTER LAUNCH 💀
      const main = ctx.createOscillator()
      const mainGain = ctx.createGain()
      const mainFilter = ctx.createBiquadFilter()
      
      main.frequency.setValueAtTime(600, now)
      main.frequency.exponentialRampToValueAtTime(150, now + 0.1)
      main.type = 'sawtooth'
      
      mainFilter.type = 'lowpass'
      mainFilter.frequency.setValueAtTime(1200, now)
      mainFilter.frequency.exponentialRampToValueAtTime(300, now + 0.1)
      mainFilter.Q.value = 4
      
      mainGain.gain.setValueAtTime(0, now)
      mainGain.gain.linearRampToValueAtTime(0.45, now + 0.005)
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      
      main.connect(mainFilter)
      mainFilter.connect(mainGain)
      mainGain.connect(this.sfxGainNode!)
      
      main.start(now)
      main.stop(now + 0.15)
      
      // 🌀 VOID WHOOSH 🌀
      const whoosh = ctx.createBufferSource()
      const whooshBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate)
      const whooshData = whooshBuffer.getChannelData(0)
      
      for (let i = 0; i < whooshData.length; i++) {
        const t = i / whooshData.length
        const env = Math.pow(1 - t, 1.5)
        whooshData[i] = (Math.random() * 2 - 1) * env * 0.6
      }
      
      whoosh.buffer = whooshBuffer
      
      const whooshFilter = ctx.createBiquadFilter()
      whooshFilter.type = 'bandpass'
      whooshFilter.frequency.setValueAtTime(800, now)
      whooshFilter.frequency.exponentialRampToValueAtTime(200, now + 0.1)
      whooshFilter.Q.value = 2
      
      const whooshGain = ctx.createGain()
      whooshGain.gain.setValueAtTime(0, now)
      whooshGain.gain.linearRampToValueAtTime(0.3, now + 0.01)
      whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      
      whoosh.connect(whooshFilter)
      whooshFilter.connect(whooshGain)
      whooshGain.connect(this.sfxGainNode!)
      
      whoosh.start(now)
      whoosh.stop(now + 0.12)
      
      // ⚡ DIGITAL SPIT ⚡
      const spit = ctx.createOscillator()
      const spitGain = ctx.createGain()
      
      spit.frequency.setValueAtTime(1800, now)
      spit.frequency.exponentialRampToValueAtTime(400, now + 0.04)
      spit.type = 'square'
      
      spitGain.gain.setValueAtTime(0, now)
      spitGain.gain.linearRampToValueAtTime(0.2, now + 0.002)
      spitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      
      spit.connect(spitGain)
      spitGain.connect(this.sfxGainNode!)
      
      spit.start(now)
      spit.stop(now + 0.06)
      
      // 🔮 HARMONIC TAIL 🔮
      const tail = ctx.createOscillator()
      const tailGain = ctx.createGain()
      
      tail.frequency.setValueAtTime(200, now + 0.02)
      tail.frequency.exponentialRampToValueAtTime(80, now + 0.15)
      tail.type = 'triangle'
      
      tailGain.gain.setValueAtTime(0, now + 0.02)
      tailGain.gain.linearRampToValueAtTime(0.15, now + 0.04)
      tailGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      
      tail.connect(tailGain)
      tailGain.connect(this.sfxGainNode!)
      
      tail.start(now + 0.02)
      tail.stop(now + 0.2)
    })
  }

  // ============================================
  // 🐜 DATA MITE SOUNDS - Buzzing swarm! 🐜
  // ============================================

  /**
   * 🐜 DataMite Buzz - Quick insectoid chirp when spawning/moving
   */
  playDataMiteBuzzSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // High-pitched digital buzz
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      
      const freq = 1800 + Math.random() * 600
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.linearRampToValueAtTime(freq * 0.7, now + 0.08)
      osc.type = 'square'
      
      filter.type = 'bandpass'
      filter.frequency.value = freq
      filter.Q.value = 8
      
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
      
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxGainNode!)
      
      osc.start(now)
      osc.stop(now + 0.12)
    })
  }

  // ============================================
  // 🔍 SCAN DRONE SOUNDS - Surveillance horror! 🔍
  // ============================================

  /**
   * 🚨 ScanDrone Alert - When player detected!
   */
  playScanDroneAlertSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Warning siren - two-tone alert
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const delay = i * 0.15
        
        osc.frequency.setValueAtTime(i === 0 ? 800 : 1200, now + delay)
        osc.frequency.linearRampToValueAtTime(i === 0 ? 1200 : 800, now + delay + 0.12)
        osc.type = 'square'
        
        gain.gain.setValueAtTime(0, now + delay)
        gain.gain.linearRampToValueAtTime(0.25, now + delay + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14)
        
        osc.connect(gain)
        gain.connect(this.sfxGainNode!)
        
        osc.start(now + delay)
        osc.stop(now + delay + 0.16)
      }
      
      // Underlying alarm buzz
      const buzz = ctx.createOscillator()
      const buzzGain = ctx.createGain()
      
      buzz.frequency.value = 60
      buzz.type = 'sawtooth'
      
      buzzGain.gain.setValueAtTime(0, now)
      buzzGain.gain.linearRampToValueAtTime(0.15, now + 0.02)
      buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      
      buzz.connect(buzzGain)
      buzzGain.connect(this.sfxGainNode!)
      
      buzz.start(now)
      buzz.stop(now + 0.35)
    })
  }

  /**
   * 📡 ScanDrone Scan Sweep - Periodic scanning sound
   */
  playScanDroneScanSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Ascending radar sweep
      const sweep = ctx.createOscillator()
      const sweepGain = ctx.createGain()
      const sweepFilter = ctx.createBiquadFilter()
      
      sweep.frequency.setValueAtTime(200, now)
      sweep.frequency.exponentialRampToValueAtTime(2000, now + 0.3)
      sweep.type = 'sine'
      
      sweepFilter.type = 'bandpass'
      sweepFilter.frequency.setValueAtTime(300, now)
      sweepFilter.frequency.exponentialRampToValueAtTime(2500, now + 0.3)
      sweepFilter.Q.value = 4
      
      sweepGain.gain.setValueAtTime(0, now)
      sweepGain.gain.linearRampToValueAtTime(0.15, now + 0.05)
      sweepGain.gain.linearRampToValueAtTime(0.08, now + 0.2)
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      
      sweep.connect(sweepFilter)
      sweepFilter.connect(sweepGain)
      sweepGain.connect(this.sfxGainNode!)
      
      sweep.start(now)
      sweep.stop(now + 0.4)
      
      // Digital blip at end
      const blip = ctx.createOscillator()
      const blipGain = ctx.createGain()
      
      blip.frequency.setValueAtTime(2000, now + 0.28)
      blip.type = 'sine'
      
      blipGain.gain.setValueAtTime(0, now + 0.28)
      blipGain.gain.linearRampToValueAtTime(0.2, now + 0.29)
      blipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      
      blip.connect(blipGain)
      blipGain.connect(this.sfxGainNode!)
      
      blip.start(now + 0.28)
      blip.stop(now + 0.38)
    })
  }

  /**
   * 🔫 ScanDrone Fire - Projectile launch
   */
  playScanDroneFireSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Sharp zap
      const zap = ctx.createOscillator()
      const zapGain = ctx.createGain()
      
      zap.frequency.setValueAtTime(1400, now)
      zap.frequency.exponentialRampToValueAtTime(400, now + 0.06)
      zap.type = 'sawtooth'
      
      zapGain.gain.setValueAtTime(0, now)
      zapGain.gain.linearRampToValueAtTime(0.3, now + 0.003)
      zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      
      zap.connect(zapGain)
      zapGain.connect(this.sfxGainNode!)
      
      zap.start(now)
      zap.stop(now + 0.1)
      
      // Sub thump
      const thump = ctx.createOscillator()
      const thumpGain = ctx.createGain()
      
      thump.frequency.setValueAtTime(100, now)
      thump.frequency.exponentialRampToValueAtTime(40, now + 0.05)
      thump.type = 'sine'
      
      thumpGain.gain.setValueAtTime(0, now)
      thumpGain.gain.linearRampToValueAtTime(0.25, now + 0.005)
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      
      thump.connect(thumpGain)
      thumpGain.connect(this.sfxGainNode!)
      
      thump.start(now)
      thump.stop(now + 0.1)
    })
  }

  // ============================================
  // 👹 BOSS SOUNDS - Ultimate threat! 👹
  // ============================================

  /**
   * 👹 Boss Entrance - Dramatic spawn sound
   */
  playBossEntranceSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Deep rumbling bass
      const rumble = ctx.createOscillator()
      const rumbleGain = ctx.createGain()
      const rumbleFilter = ctx.createBiquadFilter()
      
      rumble.frequency.setValueAtTime(30, now)
      rumble.frequency.linearRampToValueAtTime(60, now + 0.5)
      rumble.frequency.linearRampToValueAtTime(40, now + 1.0)
      rumble.type = 'sine'
      
      rumbleFilter.type = 'lowpass'
      rumbleFilter.frequency.value = 100
      
      rumbleGain.gain.setValueAtTime(0, now)
      rumbleGain.gain.linearRampToValueAtTime(0.5, now + 0.3)
      rumbleGain.gain.linearRampToValueAtTime(0.3, now + 0.8)
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
      
      rumble.connect(rumbleFilter)
      rumbleFilter.connect(rumbleGain)
      rumbleGain.connect(this.sfxGainNode!)
      
      rumble.start(now)
      rumble.stop(now + 1.3)
      
      // Dramatic brass-like fanfare
      const brassFreqs = [110, 138, 165, 220]
      brassFreqs.forEach((freq, i) => {
        const brass = ctx.createOscillator()
        const brassGain = ctx.createGain()
        const delay = i * 0.1 + 0.2
        
        brass.frequency.value = freq
        brass.type = 'sawtooth'
        
        brassGain.gain.setValueAtTime(0, now + delay)
        brassGain.gain.linearRampToValueAtTime(0.15, now + delay + 0.1)
        brassGain.gain.linearRampToValueAtTime(0.1, now + delay + 0.4)
        brassGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.8)
        
        brass.connect(brassGain)
        brassGain.connect(this.sfxGainNode!)
        
        brass.start(now + delay)
        brass.stop(now + delay + 0.9)
      })
      
      // Impact crash
      const crash = ctx.createBufferSource()
      const crashBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
      const crashData = crashBuffer.getChannelData(0)
      
      for (let i = 0; i < crashData.length; i++) {
        const t = i / crashData.length
        crashData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5) * 0.8
      }
      
      crash.buffer = crashBuffer
      
      const crashGain = ctx.createGain()
      const crashFilter = ctx.createBiquadFilter()
      crashFilter.type = 'lowpass'
      crashFilter.frequency.value = 2000
      
      crashGain.gain.setValueAtTime(0, now + 0.5)
      crashGain.gain.linearRampToValueAtTime(0.4, now + 0.52)
      crashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
      
      crash.connect(crashFilter)
      crashFilter.connect(crashGain)
      crashGain.connect(this.sfxGainNode!)
      
      crash.start(now + 0.5)
      crash.stop(now + 0.9)
    })
  }

  /**
   * 🔥 Boss Attack Phase Change - When boss changes attack pattern
   */
  playBossPhaseChangeSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Power-up surge
      const surge = ctx.createOscillator()
      const surgeGain = ctx.createGain()
      
      surge.frequency.setValueAtTime(100, now)
      surge.frequency.exponentialRampToValueAtTime(400, now + 0.2)
      surge.type = 'sawtooth'
      
      surgeGain.gain.setValueAtTime(0, now)
      surgeGain.gain.linearRampToValueAtTime(0.35, now + 0.15)
      surgeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      
      surge.connect(surgeGain)
      surgeGain.connect(this.sfxGainNode!)
      
      surge.start(now)
      surge.stop(now + 0.35)
      
      // Warning tone
      for (let i = 0; i < 3; i++) {
        const tone = ctx.createOscillator()
        const toneGain = ctx.createGain()
        const delay = i * 0.08
        
        tone.frequency.value = 600 + i * 100
        tone.type = 'square'
        
        toneGain.gain.setValueAtTime(0, now + delay)
        toneGain.gain.linearRampToValueAtTime(0.2, now + delay + 0.02)
        toneGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1)
        
        tone.connect(toneGain)
        toneGain.connect(this.sfxGainNode!)
        
        tone.start(now + delay)
        tone.stop(now + delay + 0.12)
      }
    })
  }

  /**
   * 🔫 Boss Fire - Heavy projectile launch
   */
  playBossFireSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Heavy cannon blast
      const cannon = ctx.createOscillator()
      const cannonGain = ctx.createGain()
      const cannonFilter = ctx.createBiquadFilter()
      
      cannon.frequency.setValueAtTime(200, now)
      cannon.frequency.exponentialRampToValueAtTime(60, now + 0.1)
      cannon.type = 'sawtooth'
      
      cannonFilter.type = 'lowpass'
      cannonFilter.frequency.setValueAtTime(800, now)
      cannonFilter.frequency.exponentialRampToValueAtTime(200, now + 0.1)
      
      cannonGain.gain.setValueAtTime(0, now)
      cannonGain.gain.linearRampToValueAtTime(0.45, now + 0.01)
      cannonGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      
      cannon.connect(cannonFilter)
      cannonFilter.connect(cannonGain)
      cannonGain.connect(this.sfxGainNode!)
      
      cannon.start(now)
      cannon.stop(now + 0.18)
      
      // Mechanical click
      const click = ctx.createOscillator()
      const clickGain = ctx.createGain()
      
      click.frequency.value = 2000
      click.type = 'square'
      
      clickGain.gain.setValueAtTime(0, now)
      clickGain.gain.linearRampToValueAtTime(0.15, now + 0.002)
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02)
      
      click.connect(clickGain)
      clickGain.connect(this.sfxGainNode!)
      
      click.start(now)
      click.stop(now + 0.03)
    })
  }

  // ============================================
  // 🌀 ENEMY SPAWN SOUNDS - Emergence! 🌀
  // ============================================

  /**
   * 🌀 Enemy Spawn - Digital materialization
   */
  playEnemySpawnSound(enemyType?: string): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Base materialization whoosh
      const whoosh = ctx.createOscillator()
      const whooshGain = ctx.createGain()
      const whooshFilter = ctx.createBiquadFilter()
      
      // Different spawn sounds for different enemies
      let baseFreq = 300
      let duration = 0.15
      
      switch (enemyType) {
        case 'Boss':
          baseFreq = 80
          duration = 0.4
          break
        case 'VoidSphere':
          baseFreq = 60
          duration = 0.3
          break
        case 'ChaosWorm':
          baseFreq = 100
          duration = 0.3
          break
        case 'CrystalShardSwarm':
          baseFreq = 400
          duration = 0.25
          break
        case 'ScanDrone':
          baseFreq = 500
          duration = 0.2
          break
        case 'Fizzer':
          baseFreq = 1200
          duration = 0.1
          break
        case 'UFO':
          baseFreq = 150
          duration = 0.35
          break
        default: // DataMite
          baseFreq = 800
          duration = 0.12
      }
      
      whoosh.frequency.setValueAtTime(baseFreq * 3, now)
      whoosh.frequency.exponentialRampToValueAtTime(baseFreq, now + duration)
      whoosh.type = 'sine'
      
      whooshFilter.type = 'bandpass'
      whooshFilter.frequency.setValueAtTime(baseFreq * 2, now)
      whooshFilter.frequency.exponentialRampToValueAtTime(baseFreq, now + duration)
      whooshFilter.Q.value = 3
      
      const volume = enemyType === 'Boss' ? 0.4 : 0.2
      whooshGain.gain.setValueAtTime(0, now)
      whooshGain.gain.linearRampToValueAtTime(volume, now + duration * 0.3)
      whooshGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.2)
      
      whoosh.connect(whooshFilter)
      whooshFilter.connect(whooshGain)
      whooshGain.connect(this.sfxGainNode!)
      
      whoosh.start(now)
      whoosh.stop(now + duration * 1.5)
      
      // Digital glitch for spawn
      const glitch = ctx.createBufferSource()
      const glitchBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate)
      const glitchData = glitchBuffer.getChannelData(0)
      
      for (let i = 0; i < glitchData.length; i++) {
        glitchData[i] = (Math.random() * 2 - 1) * 0.3 * Math.pow(1 - i / glitchData.length, 2)
      }
      
      glitch.buffer = glitchBuffer
      
      const glitchGain = ctx.createGain()
      const glitchFilter = ctx.createBiquadFilter()
      glitchFilter.type = 'highpass'
      glitchFilter.frequency.value = 1000
      
      glitchGain.gain.value = 0.15
      
      glitch.connect(glitchFilter)
      glitchFilter.connect(glitchGain)
      glitchGain.connect(this.sfxGainNode!)
      
      glitch.start(now)
      glitch.stop(now + 0.06)
    })
  }

  // ============================================
  // 💊 PICKUP SOUNDS - Rewards! 💊
  // ============================================

  /**
   * 💚 Med Pack Collect - SHORT "UP" HEALING SOUND
   */
  playMedPackCollectSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Short upward pitch sweep - classic "power up" sound!
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      // Frequency sweeps UP from 400Hz to 800Hz quickly
      osc.frequency.setValueAtTime(400, now)
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1)
      osc.type = 'sine'
      
      // Short, punchy envelope
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      
      osc.connect(gain)
      gain.connect(this.sfxGainNode!)
      
      osc.start(now)
      osc.stop(now + 0.15)
      
      // Add a quick bright "ding" at the top for sparkle
      const ding = ctx.createOscillator()
      const dingGain = ctx.createGain()
      
      ding.frequency.value = 1200
      ding.type = 'sine'
      
      dingGain.gain.setValueAtTime(0, now + 0.08)
      dingGain.gain.linearRampToValueAtTime(0.15, now + 0.09)
      dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      
      ding.connect(dingGain)
      dingGain.connect(this.sfxGainNode!)
      
      ding.start(now + 0.08)
      ding.stop(now + 0.18)
    })
  }

  /**
   * ⚡ Speed Up Collect - Energy boost sound
   */
  playSpeedUpCollectSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Accelerating whoosh
      const whoosh = ctx.createOscillator()
      const whooshGain = ctx.createGain()
      const whooshFilter = ctx.createBiquadFilter()
      
      whoosh.frequency.setValueAtTime(200, now)
      whoosh.frequency.exponentialRampToValueAtTime(1200, now + 0.2)
      whoosh.type = 'sawtooth'
      
      whooshFilter.type = 'bandpass'
      whooshFilter.frequency.setValueAtTime(300, now)
      whooshFilter.frequency.exponentialRampToValueAtTime(1500, now + 0.2)
      whooshFilter.Q.value = 4
      
      whooshGain.gain.setValueAtTime(0, now)
      whooshGain.gain.linearRampToValueAtTime(0.25, now + 0.05)
      whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      
      whoosh.connect(whooshFilter)
      whooshFilter.connect(whooshGain)
      whooshGain.connect(this.sfxGainNode!)
      
      whoosh.start(now)
      whoosh.stop(now + 0.3)
      
      // Energy zaps
      for (let i = 0; i < 4; i++) {
        const zap = ctx.createOscillator()
        const zapGain = ctx.createGain()
        const delay = i * 0.04
        
        zap.frequency.value = 600 + i * 200
        zap.type = 'square'
        
        zapGain.gain.setValueAtTime(0, now + delay)
        zapGain.gain.linearRampToValueAtTime(0.15, now + delay + 0.005)
        zapGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06)
        
        zap.connect(zapGain)
        zapGain.connect(this.sfxGainNode!)
        
        zap.start(now + delay)
        zap.stop(now + delay + 0.08)
      }
    })
  }

  // ============================================
  // 🌌 ENHANCED AMBIENT - Deep space atmosphere 🌌
  // ============================================

  /**
   * 🌌 Neural Static - Digital noise texture
   */
  private createNeuralStatic(): void {
    if (!this.audioContext || !this.ambientGainNode) return
    
    const scheduleStatic = () => {
      if (!this.isAmbientPlaying || !this.audioContext) return
      
      const ctx = this.audioContext
      const now = ctx.currentTime
      
      if (Math.random() > 0.7) {
        // Filtered noise burst
        const noise = ctx.createBufferSource()
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate)
        const noiseData = noiseBuffer.getChannelData(0)
        
        for (let i = 0; i < noiseData.length; i++) {
          const env = Math.sin(Math.PI * i / noiseData.length)
          noiseData[i] = (Math.random() * 2 - 1) * env * 0.3
        }
        
        noise.buffer = noiseBuffer
        
        const noiseFilter = ctx.createBiquadFilter()
        noiseFilter.type = 'bandpass'
        noiseFilter.frequency.value = 1000 + Math.random() * 2000
        noiseFilter.Q.value = 10
        
        const noiseGain = ctx.createGain()
        noiseGain.gain.value = 0.04
        
        noise.connect(noiseFilter)
        noiseFilter.connect(noiseGain)
        noiseGain.connect(this.ambientGainNode!)
        
        noise.start(now)
        noise.stop(now + 0.12)
      }
      
      const nextDelay = 800 + Math.random() * 2000
      const timeoutId = window.setTimeout(() => scheduleStatic(), nextDelay)
      this.ambientTimeouts.push(timeoutId)
    }
    
    scheduleStatic()
  }

  /**
   * 🔮 Tension Drone - Low ominous undertone that intensifies
   */
  private createTensionDrone(): void {
    if (!this.audioContext || !this.ambientGainNode) return
    
    // Very low sub-bass
    const sub = this.audioContext.createOscillator()
    const subGain = this.audioContext.createGain()
    const subFilter = this.audioContext.createBiquadFilter()
    
    sub.frequency.value = 35
    sub.type = 'sine'
    
    subFilter.type = 'lowpass'
    subFilter.frequency.value = 60
    
    subGain.gain.value = 0.08
    
    // Slow LFO for subtle pulsing
    const lfo = this.audioContext.createOscillator()
    const lfoGain = this.audioContext.createGain()
    lfo.frequency.value = 0.1
    lfoGain.gain.value = 0.03
    
    lfo.connect(lfoGain)
    lfoGain.connect(subGain.gain)
    
    sub.connect(subFilter)
    subFilter.connect(subGain)
    subGain.connect(this.ambientGainNode)
    
    sub.start()
    lfo.start()
    
    this.ambientNodes.push(sub, lfo)
  }

  // ============================================
  // 🎵 AMBIENT SOUNDSCAPE - Streamlined Aphex Twin vibes
  // ============================================

  startAmbientSoundscape(): void {
    this.ensureAudioReady().then(ready => {
      if (!ready || this.isAmbientPlaying) return
      
      this.isAmbientPlaying = true
      
      // Core ambient layers - Aphex Twin / Autechre vibes
      this.createAmbientDrone()
      this.createEvolvingPads()
      this.createSubtleGlitches()
      this.createRhythmicPulse()
      
      // Enhanced layers for deeper atmosphere
      this.createNeuralStatic()
      this.createTensionDrone()
    })
  }

  /**
   * 🌑 Core Drone - Foundation layer
   */
  private createAmbientDrone(): void {
    if (!this.audioContext || !this.ambientGainNode) return
    
    // Two-layer drone
    for (let i = 0; i < 2; i++) {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()
      
      const baseFreq = 55 + i * 30
      osc.frequency.value = baseFreq
      osc.type = i === 0 ? 'sine' : 'triangle'
      
      // Slow LFO modulation
      const lfo = this.audioContext.createOscillator()
      const lfoGain = this.audioContext.createGain()
      lfo.frequency.value = 0.03 + Math.random() * 0.02
      lfoGain.gain.value = 3 + i * 2
      
      filter.type = 'lowpass'
      filter.frequency.value = 120 + i * 40
      filter.Q.value = 0.5
      
      gain.gain.value = 0.12 - i * 0.03
      
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      
      osc.connect(gain)
      gain.connect(filter)
      filter.connect(this.ambientGainNode)
      
      osc.start()
      lfo.start()
      
      this.ambientNodes.push(osc, lfo)
    }
  }

  /**
   * 🎹 Evolving Pads - Slow morphing textures
   */
  private createEvolvingPads(): void {
    if (!this.audioContext || !this.ambientGainNode) return
    
    for (let layer = 0; layer < 2; layer++) {
      const osc1 = this.audioContext.createOscillator()
      const osc2 = this.audioContext.createOscillator()
      const gain1 = this.audioContext.createGain()
      const gain2 = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()
      
      const baseFreq = 80 + layer * 45
      osc1.frequency.value = baseFreq
      osc1.type = 'sine'
      
      osc2.frequency.value = baseFreq * 1.5
      osc2.type = 'triangle'
      
      // Slow modulation
      const lfo = this.audioContext.createOscillator()
      const lfoGain = this.audioContext.createGain()
      lfo.frequency.value = 0.02 + Math.random() * 0.03
      lfoGain.gain.value = 5 + layer * 3
      
      filter.type = 'lowpass'
      filter.frequency.value = 200 + layer * 60
      filter.Q.value = 0.7
      
      gain1.gain.value = 0.08 - layer * 0.02
      gain2.gain.value = 0.05 - layer * 0.015
      
      lfo.connect(lfoGain)
      lfoGain.connect(osc1.frequency)
      lfoGain.connect(filter.frequency)
      
      osc1.connect(gain1)
      osc2.connect(gain2)
      gain1.connect(filter)
      gain2.connect(filter)
      filter.connect(this.ambientGainNode)
      
      osc1.start()
      osc2.start()
      lfo.start()
      
      this.ambientNodes.push(osc1, osc2, lfo)
    }
  }

  /**
   * ⚡ Subtle Glitches - Occasional digital artifacts
   */
  private createSubtleGlitches(): void {
    if (!this.audioContext || !this.ambientGainNode) return
    
    const scheduleGlitch = () => {
      if (!this.isAmbientPlaying || !this.audioContext) return
      
      const ctx = this.audioContext
      const now = ctx.currentTime
      
      if (Math.random() > 0.6) {
        // Digital chirp
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        const freq = 400 + Math.random() * 800
        osc.frequency.setValueAtTime(freq, now)
        osc.frequency.exponentialRampToValueAtTime(freq * (0.5 + Math.random()), now + 0.05)
        osc.type = 'square'
        
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.06, now + 0.005)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
        
        osc.connect(gain)
        gain.connect(this.ambientGainNode!)
        
        osc.start(now)
        osc.stop(now + 0.08)
      }
      
      const nextDelay = 1500 + Math.random() * 3000
      const timeoutId = window.setTimeout(() => scheduleGlitch(), nextDelay)
      this.ambientTimeouts.push(timeoutId)
    }
    
    scheduleGlitch()
  }

  /**
   * 🥁 Rhythmic Pulse - Subtle beat foundation
   */
  private createRhythmicPulse(): void {
    if (!this.audioContext || !this.ambientGainNode) return
    
    const schedulePulse = () => {
      if (!this.isAmbientPlaying || !this.audioContext) return
      
      const ctx = this.audioContext
      const now = ctx.currentTime
      
      if (Math.random() > 0.3) {
        // Sub kick
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const filter = ctx.createBiquadFilter()
        
        osc.frequency.setValueAtTime(60, now)
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.12)
        osc.type = 'sine'
        
        filter.type = 'lowpass'
        filter.frequency.value = 100
        
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.15, now + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
        
        osc.connect(gain)
        gain.connect(filter)
        filter.connect(this.ambientGainNode!)
        
        osc.start(now)
        osc.stop(now + 0.18)
      }
      
      // Variable timing for Aphex-style groove
      const nextDelay = 400 + Math.random() * 800
      const timeoutId = window.setTimeout(() => schedulePulse(), nextDelay)
      this.ambientTimeouts.push(timeoutId)
    }
    
    schedulePulse()
  }

  /**
   * Stop ambient soundscape with proper cleanup
   * ✅ OPTIMIZED: Added disconnect() to prevent memory leaks
   */
  stopAmbientSoundscape(): void {
    this.isAmbientPlaying = false
    
    // Stop and disconnect all ambient nodes
    this.ambientNodes.forEach(node => {
      try {
        if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
          node.stop()
        }
        // CRITICAL: Disconnect to free memory
        node.disconnect()
      } catch (e) {
        // Already stopped/disconnected
      }
    })
    this.ambientNodes = []
    
    // Clear all timeouts
    this.ambientTimeouts.forEach(id => window.clearTimeout(id))
    this.ambientTimeouts = []
  }

  // Alias for consistent API
  stopAmbient(): void {
    this.stopAmbientSoundscape()
  }

  // ============================================
  // ⚡ FIZZER SOUNDS ⚡
  // ============================================

  playFizzerZapSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Quick electric zap - chaotic and snappy
      const zap = ctx.createOscillator()
      const zapGain = ctx.createGain()
      const noise = ctx.createOscillator()
      const noiseGain = ctx.createGain()
      
      // Main zap
      zap.frequency.setValueAtTime(2000, now)
      zap.frequency.exponentialRampToValueAtTime(400, now + 0.04)
      zap.type = 'sawtooth'
      
      zapGain.gain.setValueAtTime(0, now)
      zapGain.gain.linearRampToValueAtTime(0.2, now + 0.002)
      zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      
      // Crackling noise overlay
      noise.frequency.setValueAtTime(1500 + Math.random() * 500, now)
      noise.type = 'square'
      
      noiseGain.gain.setValueAtTime(0, now)
      noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.003)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
      
      zap.connect(zapGain)
      noise.connect(noiseGain)
      zapGain.connect(this.sfxGainNode!)
      noiseGain.connect(this.sfxGainNode!)
      
      zap.start(now)
      noise.start(now)
      zap.stop(now + 0.06)
      noise.stop(now + 0.05)
    })
  }

  playFizzerSpawnSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Rapid electric materialization
      for (let i = 0; i < 3; i++) {
        const spark = ctx.createOscillator()
        const sparkGain = ctx.createGain()
        const delay = i * 0.03
        
        spark.frequency.setValueAtTime(1800 + Math.random() * 400, now + delay)
        spark.frequency.exponentialRampToValueAtTime(600, now + delay + 0.05)
        spark.type = 'sawtooth'
        
        sparkGain.gain.setValueAtTime(0, now + delay)
        sparkGain.gain.linearRampToValueAtTime(0.15, now + delay + 0.005)
        sparkGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06)
        
        spark.connect(sparkGain)
        sparkGain.connect(this.sfxGainNode!)
        
        spark.start(now + delay)
        spark.stop(now + delay + 0.07)
      }
    })
  }

  private playFizzerDeathInternal(ctx: AudioContext, now: number): void {
    // ⚡ ELECTRIC OVERLOAD - Multi-phase chaotic breakdown! ⚡
    // Phase 1: Overload buildup (0-0.25s) - Rapid flickering
    for (let i = 0; i < 6; i++) {
      const flicker = ctx.createOscillator()
      const flickerGain = ctx.createGain()
      const delay = i * 0.04
      
      flicker.frequency.setValueAtTime(2000 + Math.random() * 500, now + delay)
      flicker.frequency.setValueAtTime(2400 + Math.random() * 500, now + delay + 0.015)
      flicker.frequency.exponentialRampToValueAtTime(400, now + delay + 0.04)
      flicker.type = 'sawtooth'
      
      flickerGain.gain.setValueAtTime(0, now + delay)
      flickerGain.gain.linearRampToValueAtTime(0.25, now + delay + 0.003)
      flickerGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05)
      
      flicker.connect(flickerGain)
      flickerGain.connect(this.sfxGainNode!)
      flicker.start(now + delay)
      flicker.stop(now + delay + 0.06)
    }
    
    // Phase 2: Violent discharge (0.25-0.4s) - Explosion of sparks
    for (let i = 0; i < 12; i++) {
      const discharge = ctx.createOscillator()
      const dischargeGain = ctx.createGain()
      const delay = 0.25 + i * 0.01
      
      discharge.frequency.setValueAtTime(1500 + Math.random() * 1000, now + delay)
      discharge.frequency.exponentialRampToValueAtTime(300 + Math.random() * 200, now + delay + 0.06)
      discharge.type = i % 2 === 0 ? 'square' : 'sawtooth'
      
      dischargeGain.gain.setValueAtTime(0, now + delay)
      dischargeGain.gain.linearRampToValueAtTime(0.2, now + delay + 0.002)
      dischargeGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08)
      
      discharge.connect(dischargeGain)
      dischargeGain.connect(this.sfxGainNode!)
      discharge.start(now + delay)
      discharge.stop(now + delay + 0.1)
    }
    
    // Phase 3: Fragmentation (0.4-0.6s) - Breaking apart
    for (let i = 0; i < 8; i++) {
      const fragment = ctx.createOscillator()
      const fragmentGain = ctx.createGain()
      const fragmentFilter = ctx.createBiquadFilter()
      const delay = 0.4 + Math.random() * 0.15
      
      fragment.frequency.setValueAtTime(800 + Math.random() * 800, now + delay)
      fragment.frequency.exponentialRampToValueAtTime(200, now + delay + 0.1)
      fragment.type = 'triangle'
      
      fragmentFilter.type = 'highpass'
      fragmentFilter.frequency.value = 300
      
      fragmentGain.gain.setValueAtTime(0, now + delay)
      fragmentGain.gain.linearRampToValueAtTime(0.18, now + delay + 0.005)
      fragmentGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12)
      
      fragment.connect(fragmentFilter)
      fragmentFilter.connect(fragmentGain)
      fragmentGain.connect(this.sfxGainNode!)
      fragment.start(now + delay)
      fragment.stop(now + delay + 0.15)
    }
    
    // Phase 4: Final electric trails (0.6-0.8s) - Sparks fading
    for (let i = 0; i < 5; i++) {
      const trail = ctx.createOscillator()
      const trailGain = ctx.createGain()
      const delay = 0.6 + i * 0.035
      
      trail.frequency.setValueAtTime(1200 - i * 150, now + delay)
      trail.frequency.exponentialRampToValueAtTime(400, now + delay + 0.08)
      trail.type = 'sine'
      
      trailGain.gain.setValueAtTime(0, now + delay)
      trailGain.gain.linearRampToValueAtTime(0.15, now + delay + 0.005)
      trailGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1)
      
      trail.connect(trailGain)
      trailGain.connect(this.sfxGainNode!)
      trail.start(now + delay)
      trail.stop(now + delay + 0.12)
    }
  }

  // ============================================
  // 🛸 UFO SOUNDS 🛸
  // ============================================

  playUFOChargeSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Rising warning tone - building tension
      const charge = ctx.createOscillator()
      const chargeGain = ctx.createGain()
      const chargeFilter = ctx.createBiquadFilter()
      
      charge.frequency.setValueAtTime(100, now)
      charge.frequency.exponentialRampToValueAtTime(800, now + 1.4)
      charge.type = 'sawtooth'
      
      chargeFilter.type = 'lowpass'
      chargeFilter.frequency.setValueAtTime(200, now)
      chargeFilter.frequency.exponentialRampToValueAtTime(2000, now + 1.4)
      chargeFilter.Q.value = 5
      
      chargeGain.gain.setValueAtTime(0, now)
      chargeGain.gain.linearRampToValueAtTime(0.2, now + 0.2)
      chargeGain.gain.linearRampToValueAtTime(0.3, now + 1.2)
      chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
      
      charge.connect(chargeFilter)
      chargeFilter.connect(chargeGain)
      chargeGain.connect(this.sfxGainNode!)
      
      charge.start(now)
      charge.stop(now + 1.6)
      
      // Warning blips
      for (let i = 0; i < 6; i++) {
        const blip = ctx.createOscillator()
        const blipGain = ctx.createGain()
        const delay = i * 0.2
        
        blip.frequency.value = 1200 + i * 100
        blip.type = 'sine'
        
        blipGain.gain.setValueAtTime(0, now + delay)
        blipGain.gain.linearRampToValueAtTime(0.1, now + delay + 0.02)
        blipGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1)
        
        blip.connect(blipGain)
        blipGain.connect(this.sfxGainNode!)
        
        blip.start(now + delay)
        blip.stop(now + delay + 0.12)
      }
    })
  }

  playOverheatSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // High-pitched warning alarm
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.linearRampToValueAtTime(440, now + 0.3)
      osc.type = 'square'
      
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05)
      gain.gain.linearRampToValueAtTime(0, now + 0.3)
      
      osc.connect(gain)
      gain.connect(this.sfxGainNode!)
      
      osc.start(now)
      osc.stop(now + 0.3)
      
      // Secondary power-down hiss
      const noise = ctx.createOscillator() // Simple sawtooth fallback for hiss
      const noiseGain = ctx.createGain()
      const noiseFilter = ctx.createBiquadFilter()
      
      noise.type = 'sawtooth'
      noise.frequency.setValueAtTime(400, now)
      noise.frequency.exponentialRampToValueAtTime(40, now + 0.5)
      
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.setValueAtTime(2000, now)
      noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.5)
      
      noiseGain.gain.setValueAtTime(0.2, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(this.sfxGainNode!)
      
      noise.start(now)
      noise.stop(now + 0.5)
    })
  }

  playUFOLaserSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      const duration = 2.4 // 3x longer (was 0.8)
      
      // Devastating laser beam - sustained and powerful with SIZZLE!
      const laser = ctx.createOscillator()
      const laserGain = ctx.createGain()
      const laserFilter = ctx.createBiquadFilter()
      
      laser.frequency.setValueAtTime(150, now)
      laser.frequency.setValueAtTime(180, now + 0.3)
      laser.frequency.setValueAtTime(150, now + 0.6)
      laser.frequency.setValueAtTime(170, now + 1.2)
      laser.frequency.setValueAtTime(160, now + 1.8)
      laser.type = 'sawtooth'
      
      laserFilter.type = 'bandpass'
      laserFilter.frequency.value = 300
      laserFilter.Q.value = 3
      
      laserGain.gain.setValueAtTime(0, now)
      laserGain.gain.linearRampToValueAtTime(0.35, now + 0.02)
      laserGain.gain.setValueAtTime(0.3, now + 1.8)
      laserGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
      
      laser.connect(laserFilter)
      laserFilter.connect(laserGain)
      laserGain.connect(this.sfxGainNode!)
      
      laser.start(now)
      laser.stop(now + duration + 0.1)
      
      // SIZZLE EFFECT - High frequency crackling throughout!
      for (let i = 0; i < 10; i++) {
        const sizzle = ctx.createOscillator()
        const sizzleGain = ctx.createGain()
        const sizzleFilter = ctx.createBiquadFilter()
        const delay = i * 0.24 // Spread over full duration
        
        sizzle.frequency.setValueAtTime(3000 + Math.random() * 2000, now + delay)
        sizzle.frequency.linearRampToValueAtTime(2500 + Math.random() * 1500, now + delay + 0.2)
        sizzle.type = 'square'
        
        sizzleFilter.type = 'highpass'
        sizzleFilter.frequency.value = 2000
        
        sizzleGain.gain.setValueAtTime(0, now + delay)
        sizzleGain.gain.linearRampToValueAtTime(0.08, now + delay + 0.01)
        sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2)
        
        sizzle.connect(sizzleFilter)
        sizzleFilter.connect(sizzleGain)
        sizzleGain.connect(this.sfxGainNode!)
        
        sizzle.start(now + delay)
        sizzle.stop(now + delay + 0.22)
      }
      
      // Continuous high-frequency sizzle layer
      const continuousSizzle = ctx.createOscillator()
      const continuousSizzleGain = ctx.createGain()
      const continuousSizzleFilter = ctx.createBiquadFilter()
      
      continuousSizzle.frequency.setValueAtTime(4000, now)
      continuousSizzle.type = 'square'
      
      continuousSizzleFilter.type = 'highpass'
      continuousSizzleFilter.frequency.value = 3000
      
      continuousSizzleGain.gain.setValueAtTime(0, now)
      continuousSizzleGain.gain.linearRampToValueAtTime(0.05, now + 0.02)
      continuousSizzleGain.gain.setValueAtTime(0.045, now + duration - 0.2)
      continuousSizzleGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
      
      continuousSizzle.connect(continuousSizzleFilter)
      continuousSizzleFilter.connect(continuousSizzleGain)
      continuousSizzleGain.connect(this.sfxGainNode!)
      
      continuousSizzle.start(now)
      continuousSizzle.stop(now + duration)
      
      // High frequency sizzle overlay - energy crackle
      const sizzle = ctx.createOscillator()
      const sizzleGain = ctx.createGain()
      
      sizzle.frequency.setValueAtTime(4000, now)
      sizzle.frequency.linearRampToValueAtTime(3000, now + duration)
      sizzle.type = 'square'
      
      sizzleGain.gain.setValueAtTime(0, now)
      sizzleGain.gain.linearRampToValueAtTime(0.08, now + 0.02)
      sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
      
      sizzle.connect(sizzleGain)
      sizzleGain.connect(this.sfxGainNode!)
      
      sizzle.start(now)
      sizzle.stop(now + duration)
    })
  }

  playUFOHumSound(): void {
    this.queueSound(() => {
      const ctx = this.audioContext!
      const now = ctx.currentTime
      
      // Eerie hovering hum
      const hum = ctx.createOscillator()
      const humGain = ctx.createGain()
      
      hum.frequency.setValueAtTime(80, now)
      hum.frequency.linearRampToValueAtTime(90, now + 1)
      hum.frequency.linearRampToValueAtTime(75, now + 2)
      hum.type = 'triangle'
      
      humGain.gain.setValueAtTime(0, now)
      humGain.gain.linearRampToValueAtTime(0.1, now + 0.3)
      humGain.gain.linearRampToValueAtTime(0.08, now + 1.5)
      humGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5)
      
      hum.connect(humGain)
      humGain.connect(this.sfxGainNode!)
      
      hum.start(now)
      hum.stop(now + 2.6)
    })
  }

  private playUFODeathInternal(ctx: AudioContext, now: number): void {
    // 🛸 TRACTOR BEAM COLLAPSE - Multi-phase alien tech breakdown! 🛸
    // Phase 1: Loss of control - wobble (0-0.25s)
    const wobble = ctx.createOscillator()
    const wobbleGain = ctx.createGain()
    const wobbleFilter = ctx.createBiquadFilter()
    
    wobble.frequency.setValueAtTime(120, now)
    wobble.frequency.setValueAtTime(140, now + 0.06)
    wobble.frequency.setValueAtTime(110, now + 0.12)
    wobble.frequency.setValueAtTime(130, now + 0.18)
    wobble.frequency.exponentialRampToValueAtTime(90, now + 0.25)
    wobble.type = 'triangle'
    
    wobbleFilter.type = 'lowpass'
    wobbleFilter.frequency.setValueAtTime(300, now)
    wobbleFilter.frequency.linearRampToValueAtTime(180, now + 0.25)
    wobbleFilter.Q.value = 5
    
    wobbleGain.gain.setValueAtTime(0, now)
    wobbleGain.gain.linearRampToValueAtTime(0.3, now + 0.02)
    wobbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
    
    wobble.connect(wobbleFilter)
    wobbleFilter.connect(wobbleGain)
    wobbleGain.connect(this.sfxGainNode!)
    wobble.start(now)
    wobble.stop(now + 0.3)
    
    // Phase 2: Tractor beam collapse (0.25-0.4s)
    const beamCollapse = ctx.createOscillator()
    const beamGain = ctx.createGain()
    const beamFilter = ctx.createBiquadFilter()
    
    beamCollapse.frequency.setValueAtTime(600, now + 0.25)
    beamCollapse.frequency.exponentialRampToValueAtTime(80, now + 0.4)
    beamCollapse.type = 'sine'
    
    beamFilter.type = 'lowpass'
    beamFilter.frequency.setValueAtTime(800, now + 0.25)
    beamFilter.frequency.exponentialRampToValueAtTime(100, now + 0.4)
    
    beamGain.gain.setValueAtTime(0, now + 0.25)
    beamGain.gain.linearRampToValueAtTime(0.4, now + 0.27)
    beamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    
    beamCollapse.connect(beamFilter)
    beamFilter.connect(beamGain)
    beamGain.connect(this.sfxGainNode!)
    beamCollapse.start(now + 0.25)
    beamCollapse.stop(now + 0.45)
    
    // Sparks during collapse
    for (let i = 0; i < 3; i++) {
      const spark = ctx.createOscillator()
      const sparkGain = ctx.createGain()
      const delay = 0.25 + i * 0.05
      
      spark.frequency.setValueAtTime(1200 + Math.random() * 400, now + delay)
      spark.frequency.exponentialRampToValueAtTime(300, now + delay + 0.06)
      spark.type = 'square'
      
      sparkGain.gain.setValueAtTime(0, now + delay)
      sparkGain.gain.linearRampToValueAtTime(0.18, now + delay + 0.005)
      sparkGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08)
      
      spark.connect(sparkGain)
      sparkGain.connect(this.sfxGainNode!)
      spark.start(now + delay)
      spark.stop(now + delay + 0.1)
    }
    
    // Phase 3: Hull breach - metallic debris (0.4-0.7s)
    for (let i = 0; i < 8; i++) {
      const debris = ctx.createOscillator()
      const debrisGain = ctx.createGain()
      const debrisFilter = ctx.createBiquadFilter()
      const delay = 0.4 + i * 0.035
      
      debris.frequency.setValueAtTime(700 + Math.random() * 500, now + delay)
      debris.frequency.exponentialRampToValueAtTime(200 + Math.random() * 100, now + delay + 0.15)
      debris.type = 'triangle'
      
      debrisFilter.type = 'bandpass'
      debrisFilter.frequency.value = 600 + i * 100
      debrisFilter.Q.value = 3
      
      debrisGain.gain.setValueAtTime(0, now + delay)
      debrisGain.gain.linearRampToValueAtTime(0.15, now + delay + 0.01)
      debrisGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18)
      
      debris.connect(debrisFilter)
      debrisFilter.connect(debrisGain)
      debrisGain.connect(this.sfxGainNode!)
      debris.start(now + delay)
      debris.stop(now + delay + 0.2)
    }
    
    // Phase 4: Final explosion (0.7s+)
    const explosion = ctx.createOscillator()
    const expGain = ctx.createGain()
    const expFilter = ctx.createBiquadFilter()
    
    explosion.frequency.setValueAtTime(250, now + 0.7)
    explosion.frequency.exponentialRampToValueAtTime(40, now + 1.1)
    explosion.type = 'sawtooth'
    
    expFilter.type = 'lowpass'
    expFilter.frequency.setValueAtTime(1000, now + 0.7)
    expFilter.frequency.exponentialRampToValueAtTime(80, now + 1.1)
    
    expGain.gain.setValueAtTime(0, now + 0.7)
    expGain.gain.linearRampToValueAtTime(0.5, now + 0.72)
    expGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
    
    explosion.connect(expFilter)
    expFilter.connect(expGain)
    expGain.connect(this.sfxGainNode!)
    explosion.start(now + 0.7)
    explosion.stop(now + 1.2)
    
    // Alien tech whine-down
    const whine = ctx.createOscillator()
    const whineGain = ctx.createGain()
    
    whine.frequency.setValueAtTime(1800, now + 0.7)
    whine.frequency.exponentialRampToValueAtTime(100, now + 1.0)
    whine.type = 'sine'
    
    whineGain.gain.setValueAtTime(0, now + 0.7)
    whineGain.gain.linearRampToValueAtTime(0.25, now + 0.73)
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
    
    whine.connect(whineGain)
    whineGain.connect(this.sfxGainNode!)
    whine.start(now + 0.7)
    whine.stop(now + 1.0)
  }

  private playBossDeathInternal(ctx: AudioContext, now: number): void {
    // 💀 EPIC BOSS DEATH - Massive explosion with dramatic finale! 💀
    
    // Main explosion - deep and powerful
    const explosion = ctx.createOscillator()
    const expGain = ctx.createGain()
    const expFilter = ctx.createBiquadFilter()
    
    explosion.frequency.setValueAtTime(80, now)
    explosion.frequency.exponentialRampToValueAtTime(20, now + 0.8)
    explosion.type = 'sawtooth'
    
    expFilter.type = 'lowpass'
    expFilter.frequency.setValueAtTime(400, now)
    expFilter.frequency.exponentialRampToValueAtTime(50, now + 0.8)
    
    expGain.gain.setValueAtTime(0, now)
    expGain.gain.linearRampToValueAtTime(0.6, now + 0.05)
    expGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
    
    explosion.connect(expFilter)
    expFilter.connect(expGain)
    expGain.connect(this.sfxGainNode!)
    
    explosion.start(now)
    explosion.stop(now + 1.05)
    
    // Secondary explosion burst
    const burst = ctx.createOscillator()
    const burstGain = ctx.createGain()
    
    burst.frequency.setValueAtTime(150, now + 0.3)
    burst.frequency.exponentialRampToValueAtTime(40, now + 0.7)
    burst.type = 'square'
    
    burstGain.gain.setValueAtTime(0, now + 0.3)
    burstGain.gain.linearRampToValueAtTime(0.4, now + 0.32)
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    
    burst.connect(burstGain)
    burstGain.connect(this.sfxGainNode!)
    
    burst.start(now + 0.3)
    burst.stop(now + 0.85)
    
    // Dramatic descending tone (boss power failing)
    const failTone = ctx.createOscillator()
    const failGain = ctx.createGain()
    const failFilter = ctx.createBiquadFilter()
    
    failTone.frequency.setValueAtTime(400, now)
    failTone.frequency.exponentialRampToValueAtTime(60, now + 1.2)
    failTone.type = 'triangle'
    
    failFilter.type = 'lowpass'
    failFilter.frequency.setValueAtTime(600, now)
    failFilter.frequency.exponentialRampToValueAtTime(100, now + 1.2)
    
    failGain.gain.setValueAtTime(0, now)
    failGain.gain.linearRampToValueAtTime(0.3, now + 0.1)
    failGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3)
    
    failTone.connect(failFilter)
    failFilter.connect(failGain)
    failGain.connect(this.sfxGainNode!)
    
    failTone.start(now)
    failTone.stop(now + 1.35)
    
    // Metallic debris clatter
    for (let i = 0; i < 6; i++) {
      const debris = ctx.createOscillator()
      const debrisGain = ctx.createGain()
      const delay = 0.2 + i * 0.12
      
      debris.frequency.setValueAtTime(600 + Math.random() * 300, now + delay)
      debris.frequency.exponentialRampToValueAtTime(100 + Math.random() * 100, now + delay + 0.3)
      debris.type = 'square'
      
      debrisGain.gain.setValueAtTime(0, now + delay)
      debrisGain.gain.linearRampToValueAtTime(0.2, now + delay + 0.01)
      debrisGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35)
      
      debris.connect(debrisGain)
      debrisGain.connect(this.sfxGainNode!)
      
      debris.start(now + delay)
      debris.stop(now + delay + 0.4)
    }
    
    // Final power-down whoosh
    const whoosh = ctx.createOscillator()
    const whooshGain = ctx.createGain()
    
    whoosh.frequency.setValueAtTime(200, now + 0.8)
    whoosh.frequency.exponentialRampToValueAtTime(30, now + 1.5)
    whoosh.type = 'sawtooth'
    
    whooshGain.gain.setValueAtTime(0, now + 0.8)
    whooshGain.gain.linearRampToValueAtTime(0.25, now + 0.85)
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6)
    
    whoosh.connect(whooshGain)
    whooshGain.connect(this.sfxGainNode!)
    
    whoosh.start(now + 0.8)
    whoosh.stop(now + 1.65)
  }

  // ============================================
  // VOLUME CONTROL
  // ============================================

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume
    }
  }

  getMasterVolume(): number {
    return this.masterVolume
  }
}
