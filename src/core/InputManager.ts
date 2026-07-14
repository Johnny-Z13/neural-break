/**
 * 🎮 INPUT MANAGER - Keyboard, Mouse, and Gamepad Support
 * 
 * Supports:
 * - Keyboard (WASD + Arrow Keys + Space + Shift)
 * - Mouse (position and clicks)
 * - Gamepad (Xbox/PlayStation controllers)
 *   - Left stick: Movement
 *   - Right stick: Aiming (optional)
 *   - A/X button: Fire
 *   - B/Circle button: Dash
 *   - Triggers: Fire (alternative)
 *   - D-pad: Movement (alternative)
 * - Vibration feedback for gamepad
 */
export class InputManager {
  private keys: Set<string> = new Set()
  private keyPresses: Set<string> = new Set()
  private mousePosition = { x: 0, y: 0 }
  private isMouseDown = false
  
  // 🎮 GAMEPAD STATE
  private gamepad: Gamepad | null = null
  private gamepadIndex: number = -1
  private gamepadConnected: boolean = false
  private deadzone: number = 0.15 // Analog stick deadzone
  private triggerThreshold: number = 0.5 // Trigger press threshold
  
  // 🎯 Input mode tracking
  private lastInputMethod: 'keyboard' | 'mouse' | 'gamepad' = 'keyboard'

  initialize(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.onKeyDown(e))
    document.addEventListener('keyup', (e) => this.onKeyUp(e))
    
    // Mouse events
    document.addEventListener('mousemove', (e) => this.onMouseMove(e))
    document.addEventListener('mousedown', () => this.onMouseDown())
    document.addEventListener('mouseup', () => this.onMouseUp())
    
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => e.preventDefault())
    
    // 🎮 GAMEPAD EVENTS
    window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e))
    window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e))
    
    console.log('🎮 InputManager initialized - Gamepad support enabled!')
  }

  private onKeyDown(event: KeyboardEvent): void {
    const code = event.code.toLowerCase()
    if (!this.keys.has(code)) this.keyPresses.add(code)
    this.keys.add(code)
  }

  private onKeyUp(event: KeyboardEvent): void {
    const code = event.code.toLowerCase()
    this.keys.delete(code)
  }

  private onMouseMove(event: MouseEvent): void {
    this.mousePosition.x = event.clientX
    this.mousePosition.y = event.clientY
  }

  private onMouseDown(): void {
    this.isMouseDown = true
  }

  private onMouseUp(): void {
    this.isMouseDown = false
  }
  
  // 🎮 GAMEPAD EVENT HANDLERS
  private onGamepadConnected(event: GamepadEvent): void {
    this.gamepad = event.gamepad
    this.gamepadIndex = event.gamepad.index
    this.gamepadConnected = true

    console.log(`🎮 Gamepad connected: ${event.gamepad.id}`)
    console.log(`   Index: ${event.gamepad.index}`)
    console.log(`   Buttons: ${event.gamepad.buttons.length}`)
    console.log(`   Axes: ${event.gamepad.axes.length}`)
  }
  
  private onGamepadDisconnected(event: GamepadEvent): void {
    if (event.gamepad.index === this.gamepadIndex) {
      this.gamepad = null
      this.gamepadIndex = -1
      this.gamepadConnected = false
      console.log('🎮 Gamepad disconnected')
    }
  }
  
  // 🎮 UPDATE GAMEPAD STATE (call every frame)
  update(): void {
    if (this.gamepadConnected && this.gamepadIndex >= 0) {
      // Get fresh gamepad state from browser API
      const gamepads = navigator.getGamepads()
      this.gamepad = gamepads[this.gamepadIndex]
    }
  }
  
  // 🎮 GAMEPAD HELPERS
  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) return 0
    // Scale the remaining range to 0-1
    const sign = value < 0 ? -1 : 1
    return sign * ((Math.abs(value) - this.deadzone) / (1 - this.deadzone))
  }
  
  private getGamepadButton(index: number): boolean {
    if (!this.gamepad || !this.gamepad.buttons[index]) return false
    return this.gamepad.buttons[index].pressed
  }
  
  private getGamepadAxis(index: number): number {
    if (!this.gamepad || !this.gamepad.axes[index]) return 0
    return this.applyDeadzone(this.gamepad.axes[index])
  }

  // Movement input methods (Keyboard + Gamepad)
  isMovingUp(): boolean {
    // Keyboard (WASD + Arrow Keys)
    if (this.keys.has('keyw') || this.keys.has('arrowup')) {
      this.lastInputMethod = 'keyboard'
      return true
    }
    // Gamepad: Left stick up or D-pad up
    if (this.gamepad) {
      const leftStickY = this.getGamepadAxis(1)
      const dpadUp = this.getGamepadButton(12)
      if (leftStickY < -this.deadzone || dpadUp) {
        this.lastInputMethod = 'gamepad'
        return true
      }
    }
    return false
  }

  isMovingDown(): boolean {
    // Keyboard (WASD + Arrow Keys)
    if (this.keys.has('keys') || this.keys.has('arrowdown')) {
      this.lastInputMethod = 'keyboard'
      return true
    }
    // Gamepad: Left stick down or D-pad down
    if (this.gamepad) {
      const leftStickY = this.getGamepadAxis(1)
      const dpadDown = this.getGamepadButton(13)
      if (leftStickY > this.deadzone || dpadDown) {
        this.lastInputMethod = 'gamepad'
        return true
      }
    }
    return false
  }

  isMovingLeft(): boolean {
    // Keyboard (WASD + Arrow Keys)
    if (this.keys.has('keya') || this.keys.has('arrowleft')) {
      this.lastInputMethod = 'keyboard'
      return true
    }
    // Gamepad: Left stick left or D-pad left
    if (this.gamepad) {
      const leftStickX = this.getGamepadAxis(0)
      const dpadLeft = this.getGamepadButton(14)
      if (leftStickX < -this.deadzone || dpadLeft) {
        this.lastInputMethod = 'gamepad'
        return true
      }
    }
    return false
  }

  isMovingRight(): boolean {
    // Keyboard (WASD + Arrow Keys)
    if (this.keys.has('keyd') || this.keys.has('arrowright')) {
      this.lastInputMethod = 'keyboard'
      return true
    }
    // Gamepad: Left stick right or D-pad right
    if (this.gamepad) {
      const leftStickX = this.getGamepadAxis(0)
      const dpadRight = this.getGamepadButton(15)
      if (leftStickX > this.deadzone || dpadRight) {
        this.lastInputMethod = 'gamepad'
        return true
      }
    }
    return false
  }

  isDashing(): boolean {
    // Keyboard
    if (this.keys.has('shiftleft') || this.keys.has('shiftright')) {
      this.lastInputMethod = 'keyboard'
      return true
    }
    // Gamepad: B button (Xbox) / Circle (PlayStation) or Right Bumper
    if (this.gamepad) {
      const bButton = this.getGamepadButton(1) // B/Circle
      const rightBumper = this.getGamepadButton(5) // RB/R1
      if (bButton || rightBumper) {
        this.lastInputMethod = 'gamepad'
        return true
      }
    }
    return false
  }

  isFiring(): boolean {
    // Keyboard
    if (this.keys.has('space')) {
      this.lastInputMethod = 'keyboard'
      return true
    }
    // Gamepad: A button (Xbox) / X (PlayStation), Right Trigger, or Left Trigger
    if (this.gamepad) {
      const aButton = this.getGamepadButton(0) // A/X
      const rightTrigger = this.gamepad.buttons[7]?.value || 0 // RT/R2
      const leftTrigger = this.gamepad.buttons[6]?.value || 0 // LT/L2
      
      if (aButton || rightTrigger > this.triggerThreshold || leftTrigger > this.triggerThreshold) {
        this.lastInputMethod = 'gamepad'
        return true
      }
    }
    return false
  }

  // Get movement vector (Keyboard + Gamepad analog support)
  getMovementVector(): { x: number, y: number } {
    let x = 0
    let y = 0

    // 🎮 GAMEPAD ANALOG STICK (priority - gives analog precision)
    if (this.gamepad) {
      const leftStickX = this.getGamepadAxis(0)
      const leftStickY = this.getGamepadAxis(1)
      
      // If analog stick is being used, use it directly (no normalization needed)
      if (Math.abs(leftStickX) > 0 || Math.abs(leftStickY) > 0) {
        this.lastInputMethod = 'gamepad'
        return { x: leftStickX, y: -leftStickY } // Invert Y for game coordinates
      }
    }

    // ⌨️ KEYBOARD/D-PAD (digital input - needs normalization)
    if (this.isMovingLeft()) x -= 1
    if (this.isMovingRight()) x += 1
    if (this.isMovingDown()) y -= 1
    if (this.isMovingUp()) y += 1

    // Normalize diagonal movement for digital input
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y)
      x /= length
      y /= length
    }

    return { x, y }
  }

  getMousePosition(): { x: number, y: number } {
    return { ...this.mousePosition }
  }

  isMousePressed(): boolean {
    return this.isMouseDown
  }
  
  // 🎮 GAMEPAD GETTERS
  isGamepadConnected(): boolean {
    return this.gamepadConnected
  }
  
  getGamepad(): Gamepad | null {
    return this.gamepad
  }
  
  getLastInputMethod(): 'keyboard' | 'mouse' | 'gamepad' {
    return this.lastInputMethod
  }
  
  // 🎮 GAMEPAD VIBRATION
  vibrate(duration: number = 100, weakMagnitude: number = 0.5, strongMagnitude: number = 0.5): void {
    if (!this.gamepad || !this.gamepad.vibrationActuator) return
    
    try {
      this.gamepad.vibrationActuator.playEffect('dual-rumble', {
        duration,
        weakMagnitude: Math.max(0, Math.min(1, weakMagnitude)),
        strongMagnitude: Math.max(0, Math.min(1, strongMagnitude))
      })
    } catch (error) {
      // Vibration not supported or failed - silently ignore
    }
  }
  
  // 🎮 VIBRATION PRESETS
  vibrateLight(): void {
    this.vibrate(50, 0.2, 0.2)
  }
  
  vibrateMedium(): void {
    this.vibrate(100, 0.5, 0.5)
  }
  
  vibrateHeavy(): void {
    this.vibrate(200, 0.8, 0.8)
  }
  
  vibrateExplosion(): void {
    this.vibrate(300, 1.0, 0.8)
  }
  
  // 🔍 KEY CHECKING - Check if a specific key is currently pressed
  isKeyPressed(keyCode: string): boolean {
    return this.keys.has(keyCode.toLowerCase())
  }

  consumeKeyPress(keyCode: string): boolean {
    const code = keyCode.toLowerCase()
    if (!this.keyPresses.has(code)) return false

    this.keyPresses.delete(code)
    return true
  }

  clearKeyPresses(): void {
    this.keyPresses.clear()
  }
}
