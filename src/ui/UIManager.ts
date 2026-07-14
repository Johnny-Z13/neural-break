import { Player } from '../entities/Player'
import { GameStats } from '../core/GameState'
import { LevelManager } from '../core/LevelManager'

/**
 * UIManager - Unified HUD and Notification System
 * Uses CSS classes from the unified design system in index.html
 */
// 📬 NOTIFICATION QUEUE SYSTEM 📬
interface QueuedNotification {
  element: HTMLElement
  duration: number
  priority: number // Higher = more important
  timestamp: number
}

export class UIManager {
  private healthElement: HTMLElement | null = null
  private healthBarFill!: HTMLElement
  private healthBarText!: HTMLElement
  private healthBarContainer!: HTMLElement
  private timerElement!: HTMLElement
  private gameLevelElement!: HTMLElement
  private levelElement!: HTMLElement
  private xpElement!: HTMLElement
  private xpNextElement!: HTMLElement
  private scoreElement!: HTMLElement
  private scoreLevelValue!: HTMLElement  // New: Level display under score
  private comboElement!: HTMLElement
  private comboCountElement!: HTMLElement
  private powerUpLevelElement!: HTMLElement
  private powerUpRow!: HTMLElement       // New: Power row for animations
  private weaponTypeElement!: HTMLElement
  private weaponTypeValueElement!: HTMLElement
  private weaponPanel!: HTMLElement      // New: Grouped weapon panel
  private heatHUDElement!: HTMLElement
  private heatBarFill!: HTMLElement
  private heatBarContainer!: HTMLElement
  private heatBarText!: HTMLElement      // New: Heat percentage text
  private shieldDots: HTMLElement[] = [] // Shield dot elements
  private currentShieldCount: number = 1 // Start with 1 shield

  // 📬 NOTIFICATION QUEUE MANAGEMENT 📬
  private notificationQueue: QueuedNotification[] = []
  private currentNotification: QueuedNotification | null = null
  private notificationContainer: HTMLElement | null = null
  private notificationsSuppressed: boolean = false

  initialize(): void {
    // Get UI elements
    this.healthElement = document.getElementById('health') || null
    this.healthBarFill = document.getElementById('healthBarFill')!
    this.healthBarText = document.getElementById('healthBarText')!
    this.healthBarContainer = document.getElementById('healthBarContainer')!
    this.timerElement = document.getElementById('timeRemaining')!
    this.gameLevelElement = document.getElementById('gameLevel')!
    this.levelElement = document.getElementById('currentLevel')!
    this.xpElement = document.getElementById('xp')!
    this.xpNextElement = document.getElementById('xpNext')!
    this.scoreElement = document.getElementById('currentScore')!
    this.scoreLevelValue = document.getElementById('scoreLevelValue')!  // New
    this.comboElement = document.getElementById('combo')!
    this.comboCountElement = document.getElementById('comboCount')!
    this.powerUpLevelElement = document.getElementById('powerUpLevel')!
    this.powerUpRow = document.getElementById('powerUp')!               // New
    this.weaponTypeElement = document.getElementById('weaponType')!
    this.weaponTypeValueElement = document.getElementById('weaponTypeValue')!
    this.weaponPanel = document.getElementById('weaponPanel')!          // New
    this.heatHUDElement = document.getElementById('heatHUD')!
    this.heatBarFill = document.getElementById('heatBarFill')!
    this.heatBarContainer = document.getElementById('heatBarContainer')!
    this.heatBarText = document.getElementById('heatBarText')!          // New

    // Initialize shield dots
    const shieldDotsContainer = document.getElementById('shieldDotsContainer')
    if (shieldDotsContainer) {
      this.shieldDots = Array.from(shieldDotsContainer.querySelectorAll('.shield-dot'))
      // Start with 1 shield active
      this.updateShieldDisplay(1)
    }

    if (!this.healthBarFill || !this.healthBarText || !this.healthBarContainer ||
        !this.timerElement || !this.gameLevelElement || !this.levelElement ||
        !this.xpElement || !this.xpNextElement || !this.scoreElement ||
        !this.comboElement || !this.comboCountElement || !this.powerUpLevelElement ||
        !this.weaponTypeElement || !this.weaponTypeValueElement ||
        !this.heatHUDElement || !this.heatBarFill || !this.heatBarContainer) {
      console.error('❌ Critical UI elements not found! Game may not function properly.')
      throw new Error('Required UI elements are missing from the DOM')
    }
    
    // 📬 Initialize notification container 📬
    this.initializeNotificationSystem()
  }
  
  // 📬 NOTIFICATION SYSTEM INITIALIZATION 📬
  private initializeNotificationSystem(): void {
    // Create dedicated notification container
    this.notificationContainer = document.createElement('div')
    this.notificationContainer.id = 'notification-container'
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 35%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      pointer-events: none;
      width: 90%;
      max-width: 1000px;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
    `
    document.body.appendChild(this.notificationContainer)
    
    // Start processing queue
    this.processNotificationQueue()
  }
  
  // 📬 PROCESS NOTIFICATION QUEUE 📬
  private processNotificationQueue(): void {
    const process = () => {
      // If currently showing a notification, wait
      if (this.currentNotification) {
        requestAnimationFrame(process)
        return
      }
      
      // If queue is empty, wait
      if (this.notificationQueue.length === 0) {
        requestAnimationFrame(process)
        return
      }
      
      // Sort queue by priority (highest first), then by timestamp (oldest first)
      this.notificationQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority // Higher priority first
        }
        return a.timestamp - b.timestamp // Older first
      })
      
      // Get next notification
      const next = this.notificationQueue.shift()!
      this.currentNotification = next
      
      // Show it
      if (this.notificationContainer) {
        this.notificationContainer.appendChild(next.element)
        
        // Remove after duration
        setTimeout(() => {
          if (this.notificationContainer && this.notificationContainer.contains(next.element)) {
            this.notificationContainer.removeChild(next.element)
          }
          this.currentNotification = null
        }, next.duration)
      }
      
      requestAnimationFrame(process)
    }
    
    requestAnimationFrame(process)
  }

  update(player: Player, gameStats?: GameStats, combo?: number, levelManager?: LevelManager): void {
    // 🎮 HEALTH BAR UPDATE 🎮
    const health = player.getHealth()
    const maxHealth = player.getMaxHealth()
    const healthPercentage = health / maxHealth
    
    // Update health bar fill width
    this.healthBarFill.style.width = `${healthPercentage * 100}%`
    this.healthBarText.textContent = `${Math.ceil(health)}/${maxHealth}`
    
    // Semantic health states: neutral/positive, warning, then danger.
    const healthBar = this.healthBarContainer.parentElement!
    healthBar.classList.remove('health-low', 'health-critical')

    if (healthPercentage < 0.25) {
      healthBar.classList.add('health-critical')
    } else if (healthPercentage < 0.5) {
      healthBar.classList.add('health-low')
    }
    // Update old health element if it exists
    if (this.healthElement) {
      this.healthElement.textContent = `${Math.ceil(health)}`
    }

    // 🎯 UPDATE OBJECTIVES DISPLAY (replaces timer)
    if (levelManager) {
      const progress = levelManager.getProgress()
      const objectives = levelManager.getObjectives()
      
      // Build objectives string
      let objectivesText = ''
      if (objectives.dataMites > 0) objectivesText += `M:${progress.dataMites}/${objectives.dataMites} `
      if (objectives.scanDrones > 0) objectivesText += `D:${progress.scanDrones}/${objectives.scanDrones} `
      if (objectives.chaosWorms > 0) objectivesText += `W:${progress.chaosWorms}/${objectives.chaosWorms} `
      if (objectives.crystalSwarms > 0) objectivesText += `C:${progress.crystalSwarms}/${objectives.crystalSwarms} `
      if (objectives.voidSpheres > 0) objectivesText += `V:${progress.voidSpheres}/${objectives.voidSpheres} `
      if (objectives.ufos > 0) objectivesText += `U:${progress.ufos}/${objectives.ufos} `
      if (objectives.fizzers > 0) objectivesText += `F:${progress.fizzers}/${objectives.fizzers} `
      if (objectives.bosses > 0) objectivesText += `B:${progress.bosses}/${objectives.bosses} `
      
      this.timerElement.textContent = objectivesText.trim()
      
      // Semantic objective state, styled by the shared UI system.
      const progressPercent = levelManager.getLevelProgress()
      const timerElement = this.timerElement.parentElement!
      timerElement.classList.remove('objective-near', 'objective-complete')
      if (progressPercent >= 100) {
        timerElement.classList.add('objective-complete')
      } else if (progressPercent >= 75) {
        timerElement.classList.add('objective-near')
      }
      
      // Update game level display
      this.gameLevelElement.textContent = `${levelManager.getCurrentLevel()}`
    }
    
    // Update player level and XP display
    this.levelElement.textContent = `${player.getLevel()}`
    this.xpElement.textContent = `${player.getXP()}`
    this.xpNextElement.textContent = `${player.getXPToNext()}`
    
    // Update power-up level display
    const powerUpLevel = player.getPowerUpLevel()
    const validPowerUpLevel = Math.max(0, Math.min(10, powerUpLevel))
    this.powerUpLevelElement.textContent = `${validPowerUpLevel}`

    // Power-up level visual feedback via CSS classes
    if (this.powerUpRow) {
      this.powerUpRow.classList.remove('power-mid', 'power-high')
      if (powerUpLevel >= 10) {
        this.powerUpRow.classList.add('power-high')
      } else if (powerUpLevel >= 5) {
        this.powerUpRow.classList.add('power-mid')
      }
    }

    // Update score level indicator
    if (this.scoreLevelValue && levelManager) {
      this.scoreLevelValue.textContent = `${levelManager.getCurrentLevel()}`
    }

    // XP bar glow effect when close to level up
    const xpPercentage = player.getXP() / player.getXPToNext()
    const levelBar = this.levelElement.parentElement!.parentElement!
    if (xpPercentage > 0.8) {
      levelBar.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.5), 3px 3px 0 #660066'
    } else {
      levelBar.style.boxShadow = '0 0 20px rgba(255, 0, 255, 0.3), 3px 3px 0 #660066'
    }

    // Update score display
    if (gameStats) {
      this.scoreElement.textContent = gameStats.score.toLocaleString()
    }

    // Update combo display
    if (combo !== undefined) {
      const comboVisible = combo > 1
      this.comboElement.classList.toggle('is-visible', comboVisible)
      this.comboElement.classList.remove('combo-mid', 'combo-high')

      if (comboVisible) {
        this.comboCountElement.textContent = `${combo}`

        if (combo >= 10) {
          this.comboElement.classList.add('combo-high')
        } else if (combo >= 5) {
          this.comboElement.classList.add('combo-mid')
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // NOTIFICATION SYSTEM - Using unified CSS classes
  // ═══════════════════════════════════════════════════════════════════

  showLevelUpNotification(level?: number): void {
    const notification = this.createNotification(
      level ? `LEVEL ${level} STARTED!` : 'LEVEL UP!',
      'notification-level-up'
    )
    this.queueNotification(notification, 2000, 8) // High priority - level events
  }

  // LEVEL COMPLETE NOTIFICATION
  showLevelCompleteNotification(): void {
    const notification = this.createNotification('LEVEL COMPLETE', 'notification-success')
    this.queueNotification(notification, 3000, 10) // MAX PRIORITY - same as INVULNERABLE!
  }

  showDamageIndicator(damage: number): void {
    const notification = this.createNotification(
      `-${damage}`,
      'notification-damage'
    )
    this.showAndRemove(notification, 1000)
  }

  showPowerUpCollected(level: number): void {
    const validLevel = Math.max(0, Math.min(10, level))
    const text = validLevel >= 10 ? 'WEAPON POWER MAX' : `WEAPON POWER ${validLevel} / 10`

    const notification = this.createNotification(text, 'notification-powerup')
    if (validLevel >= 10) notification.classList.add('notification-success')

    this.queueNotification(notification, 1500, 6) // Medium-high priority - pickups

    // 🎯 TRIGGER HUD POWER-UP ANIMATION 🎯
    this.animatePowerUpHUD(validLevel)
  }

  // ⚡ POWER-UP HUD ANIMATION - Scale bump + ghost text ⚡
  private animatePowerUpHUD(level: number): void {
    if (!this.powerUpLevelElement || !this.powerUpRow) return

    // Create ghost text that scales up and fades out
    const ghost = document.createElement('div')
    ghost.textContent = `${level}`
    ghost.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(1);
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      font-size: clamp(1.2rem, 2.5vw, 1.8rem);
      font-weight: bold;
      color: ${level >= 5 ? '#78d99a' : '#43dff2'};
      text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9);
      pointer-events: none;
      z-index: 3000;
      opacity: 1;
      animation: powerUpGhost 0.6s ease-out forwards;
    `

    // Position ghost relative to the power level element
    const rect = this.powerUpLevelElement.getBoundingClientRect()
    ghost.style.left = `${rect.left + rect.width / 2}px`
    ghost.style.top = `${rect.top + rect.height / 2}px`
    ghost.style.position = 'fixed'
    ghost.style.transform = 'translate(-50%, -50%) scale(1)'

    document.body.appendChild(ghost)

    // Scale bump on the actual power level number
    this.powerUpLevelElement.style.transition = 'transform 0.15s ease-out'
    this.powerUpLevelElement.style.transform = 'scale(1.4)'

    setTimeout(() => {
      this.powerUpLevelElement.style.transform = 'scale(1)'
    }, 150)

    // Remove ghost after animation
    setTimeout(() => {
      if (document.body.contains(ghost)) {
        document.body.removeChild(ghost)
      }
    }, 600)
  }
  
  showSpeedUpCollected(level: number): void {
    const validLevel = Math.max(0, Math.min(20, level))
    const speedPercent = validLevel * 5
    const text = validLevel >= 20 ? 'SPEED MAX' : `SPEED +${speedPercent}%`
    
    const notification = this.createNotification(text, 'notification-powerup')
    notification.classList.add('notification-success')
    
    this.queueNotification(notification, 1500, 6) // Medium-high priority - pickups
  }

  updateWeaponType(weaponType: string): void {
    if (this.weaponTypeValueElement) {
      const upperType = weaponType.toUpperCase()
      this.weaponTypeValueElement.textContent = upperType
    }
  }

  // 🔥 HEAT BAR UPDATE 🔥
  updateHeat(heat: number, isOverheated: boolean): void {
    if (!this.heatBarFill || !this.heatHUDElement) return

    // Update fill width and text
    this.heatBarFill.style.width = `${heat}%`
    if (this.heatBarText) {
      this.heatBarText.textContent = `${Math.round(heat)}%`
    }

    // Remove all state classes first
    this.heatHUDElement.classList.remove('heat-warning', 'heat-danger', 'overheated')
    if (this.weaponPanel) {
      this.weaponPanel.classList.remove('panel-overheated')
    }

    // Apply appropriate state class based on heat level
    if (isOverheated) {
      this.heatHUDElement.classList.add('overheated')
      if (this.weaponPanel) {
        this.weaponPanel.classList.add('panel-overheated')
      }
    } else if (heat > 75) {
      this.heatHUDElement.classList.add('heat-danger')
    } else if (heat > 40) {
      this.heatHUDElement.classList.add('heat-warning')
    }
    // Below 40% uses default green gradient from CSS
  }

  showOverheatedNotification(): void {
    const notification = this.createNotification(
      'WEAPONS OVERHEATED',
      'notification-damage' // Re-use damage style for red/warning
    )
    this.queueNotification(notification, 1500, 8) // High priority - critical warning
  }
  
  showWeaponTypeChangeNotification(weaponType: string): void {
    const notification = this.createNotification(
      `WEAPON: ${weaponType.toUpperCase()}`,
      'notification-weapon'
    )
    
    this.queueNotification(notification, 2000, 4) // Lower priority - informational
  }
  
  // 🎯 ARCADE-STYLE KILL SCORE POPUP 🎯
  showKillScore(points: number, multiplier: number, x: number, y: number): void {
    const notification = document.createElement('div')
    notification.className = 'kill-score-popup'
    
    // Format: "+500 x3" or just "+100" for x1
    const multiplierText = multiplier > 1 ? ` x${multiplier}` : ''
    const totalPoints = points * multiplier
    notification.textContent = `+${totalPoints.toLocaleString()}${multiplierText}`
    
    // Keep rewards within the shared cyan/positive convention.
    let color = '#43dff2'
    let fontSize = 'clamp(0.48rem, 1.2vw, 0.72rem)'
    let glowIntensity = 10
    
    if (multiplier >= 10) {
      color = '#78d99a'
      fontSize = 'clamp(0.84rem, 1.8vw, 1.2rem)'
      glowIntensity = 30
    } else if (multiplier >= 7) {
      color = '#78d99a'
      fontSize = 'clamp(0.72rem, 1.5vw, 1.08rem)'
      glowIntensity = 25
    } else if (multiplier >= 5) {
      color = '#78d99a'
      fontSize = 'clamp(0.66rem, 1.38vw, 0.96rem)'
      glowIntensity = 20
    } else if (multiplier >= 3) {
      color = '#78d99a'
      fontSize = 'clamp(0.6rem, 1.2vw, 0.84rem)'
      glowIntensity = 15
    } else if (multiplier >= 2) {
      color = '#43dff2'
      fontSize = 'clamp(0.54rem, 1.2vw, 0.78rem)'
      glowIntensity = 12
    }
    
    // Random offset for variety
    const offsetX = (Math.random() - 0.5) * 60
    const offsetY = (Math.random() - 0.5) * 40
    
    notification.style.cssText = `
      left: ${x + offsetX}px;
      top: ${y + offsetY}px;
      font-size: ${fontSize};
      color: ${color};
      text-shadow: 0 1px ${Math.max(4, glowIntensity / 3)}px rgba(0, 0, 0, 0.95);
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 1200)
  }
  
  // 🔥 MULTIPLIER INCREASE NOTIFICATION 🔥
  showMultiplierIncrease(multiplier: number): void {
    if (multiplier < 2) return
    
    let text = `MULTIPLIER x${multiplier}`
    let color = '#43dff2'
    let fontSize = 'clamp(0.72rem, 1.8vw, 1.08rem)' // Reduced 20%
    let priority = 5 // Default priority
    
    if (multiplier >= 10) {
      color = '#78d99a'
      fontSize = 'clamp(1.2rem, 2.4vw, 1.8rem)'
      text = `MULTIPLIER x${multiplier}`
      priority = 7
    } else if (multiplier >= 7) {
      color = '#78d99a'
      fontSize = 'clamp(1.08rem, 2.1vw, 1.5rem)'
      text = `MULTIPLIER x${multiplier}`
      priority = 6
    } else if (multiplier >= 5) {
      color = '#78d99a'
      fontSize = 'clamp(0.9rem, 1.8vw, 1.32rem)'
      text = `MULTIPLIER x${multiplier}`
      priority = 6
    } else if (multiplier >= 3) {
      color = '#78d99a'
      fontSize = 'clamp(0.78rem, 1.68vw, 1.2rem)'
    }
    
    const notification = this.createNotification(text, 'notification-multiplier')
    notification.style.setProperty('--notification-accent', color)
    notification.style.setProperty('--notification-size', fontSize)
    
    this.queueNotification(notification, 800, priority) // Priority based on multiplier
  }
  
  // 💀 MULTIPLIER LOST NOTIFICATION 💀
  showMultiplierLost(): void {
    const notification = this.createNotification(
      'MULTIPLIER LOST',
      'notification-multiplier-lost'
    )
    this.queueNotification(notification, 1000, 6) // Medium-high priority - important warning
  }

  // 🔻 POWER DOWN NOTIFICATION - UFO laser drains weapon power! 🔻
  showPowerDownNotification(amount: number): void {
    const notification = this.createNotification(
      `POWER DOWN -${amount}`,
      'notification-power-down'
    )
    this.queueNotification(notification, 1200, 7) // High priority - critical warning
  }

  // 🚫 ALREADY AT MAX NOTIFICATION 🚫
  showAlreadyAtMax(type: 'weapons' | 'speed'): void {
    const text = type === 'weapons' ? 'WEAPONS ALREADY MAXED' : 'SPEED ALREADY MAXED'
    
    const notification = this.createNotification(text, 'notification-powerup')
    notification.classList.add('notification-success')
    
    this.queueNotification(notification, 1500, 4) // Lower priority - informational
  }

  // 🛡️ SHIELD ACTIVATED NOTIFICATION 🛡️
  showShieldActivated(): void {
    const notification = this.createNotification('SHIELDS ONLINE', 'notification-shield')
    
    this.queueNotification(notification, 2000, 7) // High priority - defensive pickup
  }
  
  // 🛡️ SHIELD DEACTIVATED NOTIFICATION 🛡️
  showShieldDeactivated(): void {
    const notification = this.createNotification('SHIELDS OFFLINE', 'notification-damage')

    this.queueNotification(notification, 2000, 7) // High priority - defensive state change
  }

  // 🛡️ SHIELD HUD DISPLAY METHODS 🛡️

  /**
   * Update shield dot display (max 3, start with 1)
   */
  updateShieldDisplay(count: number): void {
    const validCount = Math.max(0, Math.min(3, count))
    this.currentShieldCount = validCount

    this.shieldDots.forEach((dot, index) => {
      dot.classList.remove('active', 'activating', 'losing')
      if (index < validCount) {
        dot.classList.add('active')
      }
    })
  }

  /**
   * Add a shield (with animation)
   */
  addShield(): void {
    if (this.currentShieldCount >= 3) return // Already at max

    const newCount = this.currentShieldCount + 1
    const newDot = this.shieldDots[newCount - 1]

    if (newDot) {
      newDot.classList.add('activating')
      setTimeout(() => {
        newDot.classList.remove('activating')
        newDot.classList.add('active')
      }, 400)
    }

    this.currentShieldCount = newCount
  }

  /**
   * Remove a shield (with animation)
   */
  removeShield(): void {
    if (this.currentShieldCount <= 0) return // No shields left

    const lostDot = this.shieldDots[this.currentShieldCount - 1]

    if (lostDot) {
      lostDot.classList.remove('active')
      lostDot.classList.add('losing')
      setTimeout(() => {
        lostDot.classList.remove('losing')
      }, 500)
    }

    this.currentShieldCount = Math.max(0, this.currentShieldCount - 1)
  }

  /**
   * Get current shield count
   */
  getShieldCount(): number {
    return this.currentShieldCount
  }

  /**
   * Check if player has shields
   */
  hasShields(): boolean {
    return this.currentShieldCount > 0
  }

  /**
   * Reset shields to starting state (1 shield)
   */
  resetShields(): void {
    this.updateShieldDisplay(1)
  }
  
  // 🌟 INVULNERABLE ACTIVATED NOTIFICATION 🌟
  showInvulnerableActivated(): void {
    const notification = this.createNotification('INVULNERABLE', 'notification-shield')
    
    this.queueNotification(notification, 3000, 10) // MAX PRIORITY - rare and important!
  }
  
  // 🌟 INVULNERABLE DEACTIVATED NOTIFICATION 🌟
  showInvulnerableDeactivated(): void {
    const notification = this.createNotification('INVULNERABILITY EXPIRED', 'notification-damage')
    
    this.queueNotification(notification, 2000, 9) // Very high priority - critical warning
  }

  // 👁️ HUD VISIBILITY CONTROL 👁️
  setHUDVisibility(visible: boolean): void {
    const ui = document.getElementById('ui')
    ui?.classList.toggle('is-hidden', !visible)

    if (!visible) {
      this.comboElement?.classList.remove('is-visible')
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════

  private createNotification(text: string, className: string): HTMLElement {
    const notification = document.createElement('div')
    notification.className = `game-notification ${className}`
    notification.textContent = text
    return notification
  }

  // 📬 QUEUE NOTIFICATION (replaces showAndRemove) 📬
  private queueNotification(element: HTMLElement, duration: number, priority: number = 5): void {
    // Skip queueing if notifications are suppressed
    if (this.notificationsSuppressed) {
      return
    }

    this.notificationQueue.push({
      element,
      duration,
      priority,
      timestamp: Date.now()
    })
  }

  // Legacy method for backward compatibility (redirects to queue)
  private showAndRemove(element: HTMLElement, duration: number): void {
    this.queueNotification(element, duration, 5) // Default priority
  }

  /**
   * 🔇 Suppress all notifications (for level transitions)
   */
  suppressNotifications(): void {
    this.notificationsSuppressed = true
    // Clear any queued notifications
    this.notificationQueue = []
    // Remove current notification if any
    if (this.currentNotification && this.notificationContainer) {
      if (this.notificationContainer.contains(this.currentNotification.element)) {
        this.notificationContainer.removeChild(this.currentNotification.element)
      }
      this.currentNotification = null
    }
  }

  /**
   * 🔊 Enable notifications (after level transition)
   */
  enableNotifications(): void {
    this.notificationsSuppressed = false
  }

}
