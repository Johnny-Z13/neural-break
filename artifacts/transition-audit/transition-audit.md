# Neural Break menu transition audit

## Scope

This pass reviewed the transition lifecycle and visual continuity across title, High Scores, Options, gameplay launch, Pause, and Game Over return paths at 608 x 751 CSS pixels.

## 1. Title to High Scores

Before: poor. The title was removed immediately, exposing the starfield, then the high-score eyebrow and panel appeared before the heading and action. This produced the reported glitch.

After: healthy. Both complete compositions overlap for 360 ms. The title recedes as a single layer while High Scores resolves into place; the old screen is disposed only after the handoff.

Evidence: `current/02-highscores-04.jpg`, `current/02-highscores-18.jpg`, `final/04-highscores-handoff-final.jpg`, and `final/05-highscores-settled-final.jpg`.

## 2. High Scores to Title

Before: needs improvement. Independently delayed menu buttons made the restored title briefly look incomplete or disabled.

After: healthy. The same shared transition runs in reverse, preserving visual hierarchy and making the navigation direction legible without introducing a second effect.

Evidence: `current/03-return-12.jpg` and `final/06-title-returned.jpg`.

## 3. Title to Options and back

Before: poor. This path repeated the same blank-frame and partial-construction behaviour as High Scores.

After: healthy. Options uses the same whole-screen handoff and reverse return, giving the menu suite a consistent motion language.

Evidence: `current/05-options-18.jpg`, `final/07-options-handoff.jpg`, and `final/08-options-settled.jpg`.

## 4. Title to gameplay

Before: needs improvement. The title disappeared in a hard cut and HUD elements arrived independently.

After: healthy. The title pushes forward with controlled scale, blur, and brightness while gameplay initializes beneath it. The HUD then reveals as one grouped layer, making START GAME feel decisive without delaying control.

Evidence: `current/06-game-start-04.jpg`, `final/10-game-launch-handoff.jpg`, `final/11-game-launch-hud.jpg`, and `final/12-gameplay-settled.jpg`.

## 5. Gameplay and Pause

Before: needs improvement. Pause was an instant DOM pop and short Escape taps could be missed.

After: healthy. Pause uses a 260 ms version of the same scale/blur/opacity grammar, maintains gameplay context underneath, and accepts edge-triggered Escape input. CONTINUE and END SESSION both dismiss cleanly.

Evidence: `final/13-pause-handoff.jpg` and `final/14-pause-settled.jpg`.

## 6. Game Over to Title

Implementation health: healthy by shared-path inspection. Game Over returns through the same centralized screen replacement pipeline instead of its former local cleanup sequence. A fresh natural-death visual capture was not obtained during this focused transition audit, so visual confidence for this one path is lower than the directly exercised routes above.

## Recommendation

Keep this as the single menu-motion system. Tune only the shared duration, distance, easing, and depth tokens rather than introducing per-screen animation sequences. Reserve the stronger launch zoom for the boundary between menu and gameplay; its contrast is what gives START GAME impact.
