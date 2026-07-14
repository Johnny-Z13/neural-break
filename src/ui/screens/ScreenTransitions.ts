export type ScreenDirection = 'forward' | 'back'

/**
 * Shared motion language for full-screen menus, overlays, and game launch.
 *
 * Screens crossfade while they overlap so the starfield is never left holding
 * an accidental blank frame. Individual headings and buttons do not animate
 * independently; each composition moves as a single, stable unit.
 */
export class ScreenTransitions {
  private static readonly menuDuration = 360
  private static readonly overlayDuration = 260
  private static readonly launchDuration = 560
  private static readonly easing = 'cubic-bezier(0.22, 1, 0.36, 1)'

  static async transitionScreens(
    currentScreen: HTMLElement | null,
    nextScreen: HTMLElement,
    direction: ScreenDirection = 'forward'
  ): Promise<void> {
    const reducedMotion = ScreenTransitions.prefersReducedMotion()
    const duration = reducedMotion ? 1 : ScreenTransitions.menuDuration
    const offset = direction === 'forward' ? 14 : -14

    nextScreen.style.opacity = '0'
    nextScreen.style.pointerEvents = 'none'
    nextScreen.style.willChange = 'opacity, transform, filter'
    nextScreen.setAttribute('aria-hidden', 'true')

    if (currentScreen) {
      currentScreen.style.pointerEvents = 'none'
      currentScreen.style.willChange = 'opacity, transform, filter'
      currentScreen.setAttribute('aria-hidden', 'true')
    }

    await ScreenTransitions.nextFrame()

    const animations: Animation[] = []
    if (currentScreen) {
      animations.push(currentScreen.animate([
        {
          opacity: 1,
          transform: 'translate3d(0, 0, 0) scale(1)',
          filter: 'blur(0) brightness(1)'
        },
        {
          opacity: 0,
          transform: `translate3d(${-offset}px, 0, 0) scale(0.992)`,
          filter: 'blur(4px) brightness(0.82)'
        }
      ], {
        duration,
        easing: ScreenTransitions.easing,
        fill: 'forwards'
      }))
    }

    animations.push(nextScreen.animate([
      {
        opacity: 0,
        transform: `translate3d(${offset}px, 0, 0) scale(1.008)`,
        filter: 'blur(4px) brightness(1.12)'
      },
      {
        opacity: 1,
        transform: 'translate3d(0, 0, 0) scale(1)',
        filter: 'blur(0) brightness(1)'
      }
    ], {
      duration,
      easing: ScreenTransitions.easing,
      fill: 'forwards'
    }))

    await Promise.all(animations.map(animation => ScreenTransitions.waitForAnimation(animation)))
    ScreenTransitions.restoreScreen(nextScreen)
  }

  static async transitionToGameplay(
    currentScreen: HTMLElement | null,
    onLaunch: () => void
  ): Promise<void> {
    const reducedMotion = ScreenTransitions.prefersReducedMotion()
    const hud = document.getElementById('ui')

    document.body.classList.add('ui-game-launching')
    hud?.classList.remove('ui-game-entering')

    if (!currentScreen || reducedMotion) {
      onLaunch()
      document.body.classList.remove('ui-game-launching')
      return
    }

    currentScreen.style.pointerEvents = 'none'
    currentScreen.style.willChange = 'opacity, transform, filter'
    currentScreen.setAttribute('aria-hidden', 'true')

    const launchAnimation = currentScreen.animate([
      {
        offset: 0,
        opacity: 1,
        transform: 'scale(1)',
        filter: 'blur(0) brightness(1)'
      },
      {
        offset: 0.22,
        opacity: 1,
        transform: 'scale(1.012)',
        filter: 'blur(0) brightness(1.18)'
      },
      {
        offset: 1,
        opacity: 0,
        transform: 'scale(1.14)',
        filter: 'blur(9px) brightness(1.42)'
      }
    ], {
      duration: ScreenTransitions.launchDuration,
      easing: 'cubic-bezier(0.32, 0, 0.18, 1)',
      fill: 'forwards'
    })

    await ScreenTransitions.delay(90)
    onLaunch()
    await ScreenTransitions.waitForAnimation(launchAnimation)

    hud?.classList.add('ui-game-entering')
    document.body.classList.remove('ui-game-launching')
    window.setTimeout(() => hud?.classList.remove('ui-game-entering'), 420)
  }

  static async animateOverlayIn(screen: HTMLElement): Promise<void> {
    const duration = ScreenTransitions.prefersReducedMotion() ? 1 : ScreenTransitions.overlayDuration
    screen.getAnimations().forEach(animation => animation.cancel())
    screen.style.pointerEvents = 'none'
    screen.style.willChange = 'opacity, transform, filter'

    const animation = screen.animate([
      { opacity: 0, transform: 'scale(1.012)', filter: 'blur(4px)' },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }
    ], {
      duration,
      easing: ScreenTransitions.easing,
      fill: 'forwards'
    })

    await ScreenTransitions.waitForAnimation(animation)
    if (screen.dataset.closing !== 'true') {
      ScreenTransitions.restoreScreen(screen)
    }
  }

  static async animateOverlayOut(screen: HTMLElement): Promise<void> {
    const duration = ScreenTransitions.prefersReducedMotion() ? 1 : ScreenTransitions.overlayDuration
    screen.getAnimations().forEach(animation => animation.cancel())
    screen.style.pointerEvents = 'none'
    screen.style.willChange = 'opacity, transform, filter'
    screen.setAttribute('aria-hidden', 'true')

    const animation = screen.animate([
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' },
      { opacity: 0, transform: 'scale(0.992)', filter: 'blur(4px)' }
    ], {
      duration,
      easing: ScreenTransitions.easing,
      fill: 'forwards'
    })

    await ScreenTransitions.waitForAnimation(animation)
  }

  private static restoreScreen(screen: HTMLElement): void {
    screen.getAnimations().forEach(animation => animation.cancel())
    screen.style.opacity = ''
    screen.style.transform = ''
    screen.style.filter = ''
    screen.style.pointerEvents = ''
    screen.style.willChange = ''
    screen.removeAttribute('aria-hidden')
  }

  private static waitForAnimation(animation: Animation): Promise<void> {
    return animation.finished.then(() => undefined).catch(() => undefined)
  }

  private static nextFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  }

  private static delay(duration: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, duration))
  }

  private static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
}
