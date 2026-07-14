# Neural Break UI Design QA

## Target

- Approved source: `/Users/johnnyvenables/.codex/generated_images/019f61d0-4bb5-7f31-8fc3-a774dddb7223/exec-ffc9cf16-9c43-4011-adb4-ba1bf2869ea7.png`
- Final implementation capture: `artifacts/design-qa/title-screen-608x751-final.jpg`
- Responsive capture: `artifacts/design-qa/title-screen-390x844-final.jpg`
- Viewport: 608 x 751 CSS pixels for the source comparison; 390 x 844 CSS pixels for the narrow check
- State: fully settled start screen, START GAME selected, captured after the screen transition completed

## Comparison evidence

- Full-view comparison: the approved source and final 608 x 751 implementation were inspected together in the same visual comparison input.
- Focused comparison: `artifacts/design-qa/reference-menu-controls-focus.png` and `artifacts/design-qa/implementation-menu-controls-focus.jpg` were inspected together for menu rhythm, selected state, control-key spacing, and bottom-rail position.
- The implementation keeps the real animated Threat Database exhibits and the existing starfield. Their exact sprite shapes and star positions intentionally differ from the static concept artwork.

## Findings and resolution history

### Pass 1

- P1: The first capture used a scaled browser surface, leaving an apparent blank edge and making the composition look undersized.
- P1: The main content was vertically centred by the flex cross-axis instead of aligning to the concept's portrait landmarks.
- Resolution: verified in an isolated in-app-browser tab at an exact 608 x 751 CSS viewport and changed the title-screen flex direction so the composition starts from the intended top landmark.

### Pass 2

- P2: Title and THREAT DATABASE typography were too narrow and small.
- P2: Enemy rows were too loose at the bottom, the menu focus bar was too wide, and the controls occupied the full width without the concept's compact centre grouping.
- Resolution: widened the display title, increased the threat heading and database labels, tuned row spacing, constrained the menu, removed the selected background wash, and rebuilt the controls as four centred keycaps with flanking cyan rules.

### Final pass

- P2: Inactive menu text was too muted and the final TEST entry was captured before the staggered screen transition had completed.
- Resolution: raised neutral text contrast, placed interface content above the atmosphere overlays, and recaptured after the transition settled.
- Keyboard focus moves down and up correctly.
- OPTIONS and HI SCORES open and return to the title screen.
- START GAME enters the level-one HUD.
- TEST enters the level-999 test HUD.
- The 390 x 844 check has no horizontal or vertical document overflow and no UI overlap.
- Browser console: no warnings or errors in the final title-screen state.

## Remaining differences

- The cyan selected-state rail replaces the concept's triangular caret so the implementation uses a standard, scalable focus treatment rather than introducing a synthetic icon asset.
- Live enemy animation and the starfield remain intentionally dynamic, preserving the existing game identity requested for this slice.

## Full UI system extension

### Scope and captures

- Shared UI layer: `src/ui/ui-overhaul.css`
- Desktop/short-window captures: `artifacts/design-qa/full-ui/*-608x751.png`
- Narrow captures: `artifacts/design-qa/full-ui/*-390x844.png`
- Covered states: title, live HUD, pause, options, high scores, game over/name entry, and post-process debug controls.
- The approved title concept remains the visual source of truth for typography, spacing rhythm, panel treatment, and restrained cyan focus state. Functional screens adapt that language to their information density rather than copying the title layout.

### Visual comparison evidence

- The approved source, title implementation, live HUD, and pause capture were inspected together in one comparison input.
- The approved source, options, high-score, game-over, and debug-panel captures were inspected together in one comparison input.
- The approved source and the narrow title/options/high-score/game-over captures were inspected together in one comparison input.
- Full and narrow comparisons checked hierarchy, font treatment, semantic colour use, panel edges, spacing, clipping, overflow, and focus visibility.

### Colour and type convention

- White/ivory is the primary reading and display colour.
- Cyan is reserved for focus, system framing, live values, and interactive state.
- Green is reserved for positive outcomes and healthy/active states.
- Amber is reserved for warnings and near-complete states.
- Red is reserved for failure, damage, overheat, and critical health.
- IBM Plex Mono handles compact telemetry and Rajdhani handles titles/actions. The legacy pixel font is no longer the default UI face.
- The Threat Database keeps its existing enemy colours and artwork by design.

### Findings and resolutions

- P1: The narrow game-over layout overflowed horizontally and exposed bright browser scrollbar chrome. Resolved by constraining the responsive content width, hiding horizontal overflow, and keeping vertical scrolling functional without visible chrome.
- P2: Short-window leaderboard rules hid the HALL OF FAME eyebrow and subtitle. Resolved with higher-specificity shared-system rules so the intended hierarchy remains visible.
- P2: The game-over primary action said PLAY AGAIN but returned to the title. Renamed it to RETURN TO MENU so the label matches the real action.
- P2: The narrow options help text wrapped awkwardly. Added a stable responsive width to keep both control hints legible.
- P2: The debug panel retained bright green and magenta legacy chrome. Restyled its title, FPS readout, dividers, controls, and actions using the same white/cyan system.
- P2: Legacy HUD visibility wrote inline `display` values that could break flex/grid presentation after pause transitions. Replaced it with a single shared `is-hidden` state.
- P2: Screen entrances used exaggerated bounce/zoom motion. Replaced them with short six-pixel fades and restrained stagger timing.

### Interaction and responsive verification

- Production TypeScript/Vite build passes.
- Title navigation opens OPTIONS and HI SCORES and returns correctly.
- START GAME enters the live level-one HUD.
- Pause opens from gameplay; CONTINUE and END SESSION are present and keyboard focus remains visible.
- Options keyboard navigation toggles POST PROCESS CONTROLS and updates its active/ARIA state.
- The debug panel appears when enabled and returns to the normal off state after verification.
- A natural gameplay death reached the real GAME OVER state at both viewport sizes.
- RETURN TO MENU returns from game over to the title.
- Desktop/short-window verified at 608 x 751; narrow verified at 390 x 844.

### Known non-visual development limitation

- Bare Vite development does not execute the Vercel `/api/highscores` function, so opening score-backed screens logs a JSON parse error and shows the designed empty state. The production API integration was not changed in this UI pass.

## Multiplier and scaled-title follow-up

### Evidence

- Multiplier state preview: `artifacts/design-qa/multiplier-title-fixes/multiplier-text-only.png`
- Scaled-title before: `artifacts/design-qa/multiplier-title-fixes/title-current-before.png`
- Scaled-title after: `artifacts/design-qa/multiplier-title-fixes/title-1280x720-after.png`
- Portrait regression check: `artifacts/design-qa/multiplier-title-fixes/title-608x751-after.png`
- The approved source, wide before/after captures, portrait capture, and multiplier-state capture were inspected together in one comparison input.
- Focused crops were not needed: the affected database/menu composition and notification surfaces are clearly readable in the full captures.

### Findings and resolution

- P1: Multiplier gain/loss inherited the shared notification panel, creating a large opaque box over gameplay. Resolved with a text-only override: zero minimum width, padding, border, background, and shadow. Gain uses cyan/green and loss uses red, each with a compact black drop shadow plus restrained glow for contrast over the playfield.
- P1: At a 1280 x 720 scaled browser viewport, the Threat Database changed to four columns. This halved its vertical footprint and pulled START GAME / OPTIONS / HI SCORES / TEST into the upper half of the screen. Resolved by keeping the approved two-column/four-row database across viewport widths.
- P2: Multiplier font-size changes were being defeated by the global notification `!important` rule. Resolved by passing the size through `--notification-size`, which the text-only selector consumes with the required specificity.
- Post-fix evidence shows the wide menu below the complete Threat Database, the 608 x 751 portrait layout unchanged, and both multiplier states with transparent backgrounds and no borders or box shadows.
- Production TypeScript/Vite build and `git diff --check` pass.

## Threat Database 3 x 3 refinement

### Evidence

- Source visual truth: `artifacts/design-qa/multiplier-title-fixes/title-1280x720-after.png` plus the requested three-column, three-row grid specification.
- Final implementation: `artifacts/design-qa/threat-database-3x3/threat-1280x720-after.png`.
- Responsive implementation: `artifacts/design-qa/threat-database-3x3/threat-608x751-after.png`.
- Viewports: 1280 x 720 and 608 x 751 CSS pixels, with additional live checks at 1440 x 900 and 375 x 667.
- State: settled title screen with START GAME selected and all eight live TypeScript enemy exhibits animating.
- Full-view comparison: the prior layout, final 1280 x 720 implementation, and final 608 x 751 implementation were inspected together in one comparison input.
- A focused crop was not needed because the complete Threat Database, live exhibit silhouettes, labels, menu, and control rail are clearly readable in the full captures.

### Findings and resolution history

- P1: The database was a two-column/four-row list rather than the requested square three-column rhythm. Resolved with three equal grid tracks; the UFO and BOSS occupy the outer cells of the final row so all eight real threats remain symmetrical without adding a fake ninth enemy.
- P1: The 34 px short-window exhibit slots and 95% silhouette fill left the BOSS and other wide enemies visibly cropped. Resolved by increasing the short-window slots to 56 px, increasing the full-size slots to 78 px, and reserving an 18% fitting margin inside each transparent render square.
- P2, first implementation pass: 86 px full-size slots made the 1440 x 900 title composition too tall, while the largest mesh bounds still sat close to the clipping planes. Resolved by capping full-size slots at 78 px, tightening only the grid row gap, rebalancing the title screen's lower safe area, and correcting the visual-radius estimates for Crystal Swarm, Void Sphere, and BOSS.
- Post-fix evidence shows the live BOSS and large enemies fully readable with visible breathing room, the menu clear of the database, and no wrapped enemy labels at 608 x 751 or 375 x 667.

### Fidelity surfaces

- Typography and copy: enemy names, scores, font families, hierarchy, and semantic labels are unchanged; no wrapping or truncation was introduced.
- Spacing and layout: the database now has a stable 3 x 3 spatial rhythm, equal card tracks, square exhibit windows, and preserved separation from the title, menu, and controls.
- Colours and tokens: the existing restrained title-screen palette and per-enemy identity colours are unchanged.
- Image and asset quality: all exhibits remain the real animated Three.js enemy classes; no placeholder or synthetic ninth asset was introduced.
- Responsive and accessibility: all eight entries remain visible at tested desktop and narrow viewports, with no overlap or document overflow.
- Production TypeScript/Vite build and `git diff --check` pass.

## Shared menu-transition motion pass

### Evidence

- Source visual truth: `artifacts/transition-audit/current/02-highscores-04.jpg`, `artifacts/transition-audit/current/02-highscores-18.jpg`, `artifacts/transition-audit/current/05-options-18.jpg`, and `artifacts/transition-audit/current/06-game-start-04.jpg`.
- Final menu handoff: `artifacts/transition-audit/final/04-highscores-handoff-final.jpg` and `artifacts/transition-audit/final/05-highscores-settled-final.jpg`.
- Final gameplay launch: `artifacts/transition-audit/final/10-game-launch-handoff.jpg`, `artifacts/transition-audit/final/11-game-launch-hud.jpg`, and `artifacts/transition-audit/final/12-gameplay-settled.jpg`.
- Final pause overlay: `artifacts/transition-audit/final/13-pause-handoff.jpg` and `artifacts/transition-audit/final/14-pause-settled.jpg`.
- Viewport: 608 x 751 CSS pixels.
- The before and after menu, gameplay-launch, and pause captures were inspected together in the same comparison inputs. A focused crop was not needed because each full-frame capture clearly shows the complete outgoing and incoming UI compositions; DOM screen counts and state were also checked at the transition boundaries.

### Findings and resolution history

- P1: Menu navigation removed the outgoing screen before the incoming screen existed, exposing a blank starfield frame. Resolved by mounting both screens into a short overlap and removing the outgoing screen only after the shared handoff completes.
- P1: Headings, panels, and buttons animated independently, making the high-score and options screens appear partially constructed. Resolved by treating every screen as one composition with a 360 ms directional crossfade, 14 px drift, subtle scale, blur, and brightness treatment.
- P2: The old slide transition accumulated camera-x offsets without resetting them. Removed menu transitions from the Three.js camera so navigation no longer drifts the playfield.
- P2: Starting the game was a hard cut and the HUD appeared independently. Replaced it with a 560 ms forward zoom/blur launch; gameplay initializes beneath the outgoing title and the complete HUD reveals as one unit.
- P2: Pause mounted and unmounted instantly, while quick Escape taps could be missed by held-key polling. Pause now uses the shared 260 ms overlay motion and an edge-triggered key buffer; CONTINUE and END SESSION were both verified live.
- P1 follow-up: the Escape press used to resume was still visible to the gameplay input buffer and could immediately reopen pause. Resume now clears edge-triggered presses before restarting the loop; the Playwright regression passes.
- P2, first implementation pass: live Threat Database enemies remained visible behind the incoming high-score panel because their meshes were independent of the DOM screen. Their visibility and scale now follow the outgoing title opacity, so they collapse cleanly during the handoff.

### Fidelity surfaces

- Typography, copy, colour tokens, layout, enemy artwork, and menu hierarchy are unchanged; the pass modifies motion and lifecycle only.
- Forward and backward navigation use the same motion grammar with reversed direction, while gameplay launch deliberately has more depth and energy.
- Pointer events and accessibility state transfer to the incoming screen only when it becomes active.
- `prefers-reduced-motion: reduce` collapses screen and overlay movement to an effectively immediate handoff while preserving navigation.
- Title to High Scores, High Scores to Title, Title to Options, Options to Title, Title to gameplay, gameplay to Pause, Pause to gameplay, and Pause to Title were exercised live. Game Over returns through the same shared screen replacement path; its transition path was code- and build-verified, but a fresh natural-death capture was not obtained in this focused pass.

final result: passed
