# Neural Break — Neon Vector Overhaul (Design)

**Date:** 2026-07-11
**Status:** Approved by user (art direction + scope + title-screen attract expansion)

## Goal

Replace the current maximalist entity visuals (4–10 stacked additive glow/aura/wireframe/particle
layers per enemy, per-frame sine-opacity mutation, rainbow HSL cycling) with a classic
neon-vector-arcade look: **every entity is one silhouette in one signature color**. The existing
bloom post-process provides all glow. Threat identification in one glance.

This is a visuals-only change: entity AI, movement, spawning, collision radii, sizes, scoring,
and balance are untouched.

## Principles

1. One shape, one color per entity. No stacked glow copies, no auras, no rainbow cycling.
2. Bloom does the glow — entities never fake it with extra meshes.
3. At most one idle motion per enemy (rotation, sweep, undulation).
4. Signature colors live in one config constant, not scattered literals.
5. The menu never lies: the title screen shows the real entities, and database card glyphs
   derive from the same shape definitions.

## Technique

Outline meshes built from `THREE.ShapeGeometry` (shape with a hole = stroke polygon), rendered
with plain `MeshBasicMaterial`. Solid shapes are plain filled `ShapeGeometry`.

Rejected alternatives:
- `LineLoop`/`LineBasicMaterial` — WebGL locks line width at 1px; too faint on high-DPI.
- `Line2` fat lines — extra example-module dependency plus resolution uniforms to maintain.

Stroke width is specified in world units, which is stable under the fixed orthographic camera.

New module: **`src/graphics/VectorShapes.ts`**
- `outlinePolygon(points: THREE.Vector2[], strokeWidth: number, color: number): THREE.Mesh`
- Canned builders: `hexOutline`, `diamondOutline`, `starOutline(points, inner, outer)`,
  `discSolid`, `ringOutline`, `dartSolid`, `crossSolid`, `saucerOutline`.
- All geometry created once per entity at `initialize()`; disposed in `destroy()` via the
  existing disposal path (Task 1.2 lineage).

New config constant: **`ENTITY_PALETTE`** (location: `src/config/` alongside existing config) —
single source of truth for signature colors. Values match the existing threat-database card
colors so menu and game agree:

| Entity | Color |
|---|---|
| DataMite | `#FF4400` |
| ScanDrone | `#FF8800` (alert state: `#FF0000`) |
| ChaosWorm | `#FF00FF` |
| CrystalShardSwarm | `#00FFFF` |
| VoidSphere | `#AA00FF` |
| Fizzer | `#00FF88` |
| UFO | `#88AAFF` |
| Boss | `#FF0000` |
| Player | `#E8F0FF` (cockpit dot `#00FFFF`) |

## Entity specs

Sizes below reuse each entity's current visual scale; collision radii unchanged.

- **DataMite** — small solid dart (triangle), `#FF4400`. Idle: slow spin. The fodder read.
- **ScanDrone** — hex outline + one rotating radar sweep line from center to edge, `#FF8800`.
  Alert state (existing behavior) recolors outline + sweep to `#FF0000` and doubles sweep speed.
  Everything else (dish, grid, beam plane, eyes, antenna, beacon, targeting ring) is deleted.
- **ChaosWorm** — chain of diamond outlines, all `#FF00FF`. Idle: the existing segment
  undulation. Rainbow HSL cycling and particle trail deleted.
- **VoidSphere** — solid black disc (`#000000`, opacity ~0.98) + one `#AA00FF` ring outline.
  Idle: slow ring rotation. Negative space is the menace. Accretion tori, tendrils, distortion
  spheres, gravity-wave points, spawn-port rings deleted (spawn ports may keep a brief ring
  pulse if gameplay telegraphing needs it — implementer judgment, one ring max).
- **CrystalShardSwarm** — 6-point star outline, `#00FFFF`. Idle: slow rotation. Lightning arcs,
  concentric rings, per-shard wireframes/tips deleted.
- **Fizzer** — small solid spark cross, `#00FF88`. Idle: fast spin (it's the zippy one).
- **UFO** — classic two-line saucer profile (body ellipse outline + dome arc), `#88AAFF`.
- **Boss** — large hex outline + solid core dot, `#FF0000`. Idle: slow counter-rotation of hex
  vs core pulse (single scale pulse, not opacity storm).
- **Player** — arrowhead outline `#E8F0FF` + cyan cockpit dot + single engine flicker quad
  (small triangle behind the ship whose scale jitters when thrusting). Metallic hull layers,
  panel lines, triple flames, particle exhaust deleted.
  - Shield: one ring outline (existing ring stays, single ring, shield color).
  - Invulnerability: whole-ship blink (visible/invisible), replacing emissive glow states.
  - Dash: brief stretch of the arrowhead along velocity (scale, not new meshes).

## State language

- **Hit flash** — one material color swap to white driven by a `flashTimer` decremented in
  `update(deltaTime)` (this absorbs roadmap Task 1.3, which replaces the `setTimeout` flash).
- **Death** — outline breaks into 3–5 line fragments that fly apart, spin, and fade over
  ~0.4s, in the entity's signature color. Replaces current particle explosions for entities.
  Implemented once, generically, from the entity's outline points.
- **Alert / enrage** — color swap only (ScanDrone amber→red pattern generalizes).

## Projectiles & pickups

- **Player shots** — short bright tracer quads, white-cyan.
- **Enemy shots** — same tracer shape in the owner's signature color: you always know who
  fired.
- **Pickups** — small outlined glyphs in their existing pickup colors: cross (MedPack),
  chevron (SpeedUp), ring (Shield), 4-point star (PowerUp). Idle: slow spin.

## Title screen: real enemies, live

`AttractMode` (`src/core/AttractMode.ts`) already runs real enemy entities behind the title
screen but only spawns 3 Fizzers. Changes:

1. Expand the attract roster to all regular enemy types (large enemies capped at one each;
   Boss excluded — a 7-unit hex would dominate the backdrop) drifting with their idle
   animations — the "living threat database" behind the menu.
2. Replace the CSS-approximation glyphs in the THREAT DATABASE cards
   (`StartScreen.ts:createEnemyCard`) with small inline SVGs generated from the same shape
   definitions and `ENTITY_PALETTE` colors used in-game. Card layout, names, and point values
   unchanged.
3. AttractMode's existing cleanup path (stop on game start) unchanged.

## Deletions

Per-enemy glow circles, aura rings, wireframe copies, distortion spheres, lightning arcs,
tendrils, trailing `THREE.Points` systems, spike cones, sensor sub-assemblies, and every
per-frame sine-opacity material write that animated them. Expected side effect: significant
draw-call and per-frame CPU reduction (report before/after entity draw calls when done).

## Delivery (merge to `main` → Vercel after every slice)

Working agreement: each slice ends merged to `main` so the user plays it on the live Vercel
deployment. No long-lived branch batching.

1. **Slice 0** — merge current `roadmap-2026-07` to `main` (deploy baseline), then land
   `VectorShapes.ts` + `ENTITY_PALETTE` (no visual change yet).
2. **Slice 1** — Player + player/enemy projectiles.
3. **Slice 2** — DataMite, ScanDrone, ChaosWorm, VoidSphere, CrystalShardSwarm.
4. **Slice 3** — Fizzer, UFO, Boss, pickups, generic death-fragment effect.
5. **Slice 4** — AttractMode full roster + threat-database SVG glyphs.

## Verification (per slice)

- `tsc --noEmit` clean; Playwright smoke suite green.
- Play the game (dev server) and confirm each redesigned entity: silhouette reads at gameplay
  distance, hit flash visible, death fragments fire, no console errors.
- Screenshot each redesigned entity in-game.
- After merge: confirm the Vercel production build renders identically (hard-refresh).

## Out of scope

Menu/HUD screen chrome (roadmap Phase 5), audio, balance, enemy AI/behavior, mobile.
