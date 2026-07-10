# Neon Vector Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every in-game entity's maximalist multi-layer visuals with one silhouette in one signature color (spec: `docs/superpowers/specs/2026-07-11-vector-overhaul-design.md`).

**Architecture:** A new `VectorShapes.ts` helper builds stroke-polygon outline meshes from `THREE.ShapeGeometry`; an `ENTITY_PALETTE` config is the single color source. Each entity's `initialize()`/`updateVisuals()` is rewritten; base `Enemy` gains a timer-driven white hit flash and a generic outline-fragment death. Gameplay (AI, collision radii, spawning, scoring) is untouched.

**Tech Stack:** Three.js (`ShapeGeometry`, `MeshBasicMaterial`), TypeScript strict, Vite, Playwright smoke suite.

## Global Constraints

- **Visuals only.** No changes to `updateAI`, collision radii (`balance.config.ts` RADIUS values), speeds, damage, XP, spawning, scoring.
- **Preserve public APIs verbatim:** `getMesh()`, `getPosition()`, `getRadius()`, `takeDamage()`, `isCollidingWith()`, all Player `collect*/reset*/heal/levelUp` method names. External code touches nothing else (verified 2026-07-11: no external `mesh.children[i]` access exists).
- **Dispose everything you create.** Base `Enemy.destroy()` and `Player.dispose()` traverse-and-dispose; any mesh added outside `this.mesh`'s tree must be disposed explicitly.
- **Colors come from `ENTITY_PALETTE`** — no new raw hex literals in entity files.
- **No new dependencies.** No `Line2`/examples modules.
- **Match existing code style** (no-semicolon TS, emoji section comments where the file already uses them).
- **Verification gate per task:** `npx tsc --noEmit` clean, then `npx playwright test` green (the smoke suite fails on any boot console error). Manual play verification at each slice gate.
- **Slice gates merge to `main`** (working agreement: the user plays every slice on the live Vercel build).

## File Structure

- Create: `src/config/palette.config.ts` — ENTITY_PALETTE constant.
- Create: `src/graphics/VectorShapes.ts` — polygon/outline/tracer/fragment builders. Pure functions, no state.
- Modify: `src/weapons/Projectile.ts`, `src/weapons/EnemyProjectile.ts` (+ tiny color-arg edits at 6 enemy spawn sites).
- Modify: `src/entities/Player.ts`, `src/entities/Enemy.ts` (base), all 8 enemy subclass files, 4 pickup files.
- Modify: `src/core/AttractMode.ts`, `src/ui/screens/StartScreen.ts`.

---

## Slice 0 — Foundation (no visible change)

### Task 1: ENTITY_PALETTE config

**Files:**
- Create: `src/config/palette.config.ts`

**Interfaces:**
- Produces: `ENTITY_PALETTE` — `as const` object of `number` hex colors; keys used by every later task exactly as written below.

- [ ] **Step 1: Write the file**

```typescript
/**
 * 🎨 ENTITY PALETTE - Single source of truth for entity signature colors
 * Neon vector overhaul: one shape, one color per entity. Bloom does the glow.
 * Values match the StartScreen threat-database card colors.
 */
export const ENTITY_PALETTE = {
  DATA_MITE: 0xFF4400,
  SCAN_DRONE: 0xFF8800,
  SCAN_DRONE_ALERT: 0xFF0000,
  CHAOS_WORM: 0xFF00FF,
  CRYSTAL_SWARM: 0x00FFFF,
  VOID_SPHERE: 0xAA00FF,
  FIZZER: 0x00FF88,
  UFO: 0x88AAFF,
  BOSS: 0xFF0000,
  PLAYER: 0xE8F0FF,
  PLAYER_COCKPIT: 0x00FFFF,
  PLAYER_TRACER: 0xCCFFFF,
  PICKUP_MEDPACK: 0x00FF00,
  PICKUP_EMERALD: 0x00DD55,
} as const
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → clean.
- [ ] **Step 3: Commit** — `git add src/config/palette.config.ts && git commit -m "feat(config): add ENTITY_PALETTE signature colors"`

### Task 2: VectorShapes helper module

**Files:**
- Create: `src/graphics/VectorShapes.ts`

**Interfaces:**
- Produces (exact signatures every later task consumes):
  - `regularPolygon(n: number, r: number, offset?: number): THREE.Vector2[]`
  - `starPolygon(points: number, outer: number, inner: number, offset?: number): THREE.Vector2[]`
  - `outlinePolygon(points: THREE.Vector2[], strokeWidth: number, color: number): THREE.Mesh`
  - `solidPolygon(points: THREE.Vector2[], color: number): THREE.Mesh`
  - `ringOutline(radius: number, strokeWidth: number, color: number, thetaStart?: number, thetaLength?: number): THREE.Mesh`
  - `discSolid(radius: number, color: number, opacity?: number): THREE.Mesh`
  - `tracerQuad(width: number, length: number, color: number): THREE.Mesh` (length along +Y)
  - `interface VectorFragment { mesh: THREE.Mesh; velocity: THREE.Vector2; spin: number }`
  - `fragmentsFromOutline(points: THREE.Vector2[], strokeWidth: number, color: number): VectorFragment[]`
- All meshes use `MeshBasicMaterial { transparent: true }` so opacity fades work everywhere.

- [ ] **Step 1: Write the file**

```typescript
/**
 * 📐 VECTOR SHAPES - Neon vector arcade geometry builders
 * Outline meshes are stroke polygons (ShapeGeometry with a hole), NOT Lines:
 * WebGL locks line width at 1px. Stroke widths are world units (ortho camera).
 */
import * as THREE from 'three'

/** Regular n-gon, radius r, counter-clockwise, first vertex at angle `offset` (radians). */
export function regularPolygon(n: number, r: number, offset: number = Math.PI / 2): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * Math.PI * 2
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r))
  }
  return pts
}

/** Star polygon with `points` tips alternating outer/inner radius, CCW. */
export function starPolygon(points: number, outer: number, inner: number, offset: number = Math.PI / 2): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = offset + (i / (points * 2)) * Math.PI * 2
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r))
  }
  return pts
}

/** Offset each vertex along its miter normal by d (positive = outward for CCW polygons). */
function offsetPolygon(points: THREE.Vector2[], d: number): THREE.Vector2[] {
  const n = points.length
  const out: THREE.Vector2[] = []
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]
    const e1 = new THREE.Vector2().subVectors(curr, prev).normalize()
    const e2 = new THREE.Vector2().subVectors(next, curr).normalize()
    const n1 = new THREE.Vector2(e1.y, -e1.x)
    const n2 = new THREE.Vector2(e2.y, -e2.x)
    const miter = new THREE.Vector2().addVectors(n1, n2).normalize()
    // Clamp miter length so sharp star tips don't spike to infinity
    const len = d / Math.max(miter.dot(n1), 0.35)
    out.push(new THREE.Vector2(curr.x + miter.x * len, curr.y + miter.y * len))
  }
  return out
}

function basicMaterial(color: number, opacity: number = 0.95): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
}

/** Stroke-outline mesh of a closed polygon. */
export function outlinePolygon(points: THREE.Vector2[], strokeWidth: number, color: number): THREE.Mesh {
  const shape = new THREE.Shape(offsetPolygon(points, strokeWidth / 2))
  shape.holes.push(new THREE.Path(offsetPolygon(points, -strokeWidth / 2).slice().reverse()))
  return new THREE.Mesh(new THREE.ShapeGeometry(shape), basicMaterial(color))
}

/** Filled polygon mesh. */
export function solidPolygon(points: THREE.Vector2[], color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(points)), basicMaterial(color))
}

/** Stroke ring (or arc when thetaLength < 2π). */
export function ringOutline(radius: number, strokeWidth: number, color: number, thetaStart: number = 0, thetaLength: number = Math.PI * 2): THREE.Mesh {
  const geometry = new THREE.RingGeometry(radius - strokeWidth / 2, radius + strokeWidth / 2, 48, 1, thetaStart, thetaLength)
  return new THREE.Mesh(geometry, basicMaterial(color))
}

/** Filled disc. */
export function discSolid(radius: number, color: number, opacity: number = 0.95): THREE.Mesh {
  return new THREE.Mesh(new THREE.CircleGeometry(radius, 48), basicMaterial(color, opacity))
}

/** Thin quad, length along +Y — projectile tracers, sweep lines, fragments. */
export function tracerQuad(width: number, length: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.PlaneGeometry(width, length), basicMaterial(color))
}

export interface VectorFragment {
  mesh: THREE.Mesh
  velocity: THREE.Vector2
  spin: number
}

/** Break an outline into 3-5 edge fragments flying outward — the vector death effect. */
export function fragmentsFromOutline(points: THREE.Vector2[], strokeWidth: number, color: number): VectorFragment[] {
  const frags: VectorFragment[] = []
  const step = Math.max(1, Math.floor(points.length / 4))
  for (let i = 0; i < points.length; i += step) {
    const a = points[i]
    const b = points[(i + step) % points.length]
    const mesh = tracerQuad(Math.max(strokeWidth, 0.05), a.distanceTo(b), color)
    const mid = new THREE.Vector2().addVectors(a, b).multiplyScalar(0.5)
    mesh.position.set(mid.x, mid.y, 0.1)
    mesh.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2
    const dir = mid.lengthSq() > 0.0001 ? mid.clone().normalize() : new THREE.Vector2(1, 0)
    frags.push({
      mesh,
      velocity: dir.multiplyScalar(4 + Math.random() * 3),
      spin: (Math.random() - 0.5) * 10
    })
  }
  return frags
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → clean. `npx playwright test` → 8 passed (nothing imports it yet; this catches syntax/config issues).
- [ ] **Step 3: Commit** — `git commit -m "feat(graphics): add VectorShapes vector-arcade geometry builders"`

### Task 3: Slice 0 gate

- [ ] `npx tsc --noEmit` clean, `npx playwright test` green.
- [ ] Merge: `git push origin roadmap-2026-07 && git checkout main && git merge --no-ff roadmap-2026-07 -m "Merge: vector overhaul foundation (palette + VectorShapes)" && git push origin main && git checkout roadmap-2026-07`
- [ ] REMIND USER: hard-refresh the live URL (should look identical — foundation only).

---

## Slice 1 — Player + projectiles

### Task 4: Player projectile → tracer

**Files:**
- Modify: `src/weapons/Projectile.ts` (`createMesh` :35-80, `createGlowLayers` :82-114, `update` :116-150, `updateTrail` :152)

**Interfaces:**
- Consumes: `tracerQuad` from `src/graphics/VectorShapes.ts`, `ENTITY_PALETTE.PLAYER_TRACER`.
- Produces: unchanged public API (`constructor`, `update`, `destroy`, `dispose`, `isAlive`, getters). `mesh` is now a single quad with no children.

- [ ] **Step 1: Replace `createMesh()`** — delete the per-weapon geometry switch and `createGlowLayers()` entirely; all weapons render as white-cyan tracers (LASERS longer, per spec "short bright tracer quads"):

```typescript
private createMesh(): void {
  const length = this.weaponType === WeaponType.LASERS ? this.radius * 14 : this.radius * 8
  const width = Math.max(0.06, this.radius * 0.9)
  this.mesh = tracerQuad(width, length, ENTITY_PALETTE.PLAYER_TRACER)
  this.mesh.position.copy(this.position)
  this.mesh.rotation.z = Math.atan2(this.velocity.y, this.velocity.x) - Math.PI / 2
}
```

- [ ] **Step 2: Slim `update()`** — keep position integration and the lifetime fade (`opacity = max(0.2, lifeTime/3)`); DELETE the rotation animation, pulse-scale block, and the `updateTrail()` call + method (the tracer IS the trail). Keep `destroy()`'s `createWeaponImpact` (hit feedback).
- [ ] **Step 3: Verify** — `npx tsc --noEmit`; `npm run dev`, fire all three weapon types (collect P pickups), confirm tracers render, orient along travel, and impact sparks still fire. `npx playwright test` green.
- [ ] **Step 4: Commit** — `git commit -m "feat(weapons): player projectiles become vector tracers"`

### Task 5: Enemy projectile → owner-colored tracer

**Files:**
- Modify: `src/weapons/EnemyProjectile.ts` (`createMesh` :43-67, `update` :69-112)
- Modify (one line each — pass palette color): `src/entities/ScanDrone.ts:620`, `src/entities/VoidSphere.ts:592`, `src/entities/CrystalShardSwarm.ts:747`, `src/entities/ChaosWorm.ts:375` and `:449`, `src/entities/Fizzer.ts:532`

**Interfaces:**
- Consumes: `tracerQuad`, `ENTITY_PALETTE`. Constructor signature unchanged: `(startPos, direction, speed, damage, sizeMultiplier?, color?, emissiveColor?, glowIntensity?)` — later args now ignored except `color`.

- [ ] **Step 1: Replace `createMesh()`**:

```typescript
private createMesh(): void {
  this.mesh = tracerQuad(Math.max(0.08, this.radius), this.radius * 6, this.color)
  this.mesh.position.copy(this.position)
  this.mesh.rotation.z = Math.atan2(this.velocity.y, this.velocity.x) - Math.PI / 2
}
```

- [ ] **Step 2: Slim `update()`** — keep movement + lifetime; DELETE the glow-pulse block, rotation animation, and the `createSparkle` trail call. Keep `destroy()`'s small `createExplosion(pos, 0.5, color)`.
- [ ] **Step 3: Pass owner colors at spawn sites** (find each `new EnemyProjectile(` and set the `color` argument): ScanDrone → `ENTITY_PALETTE.SCAN_DRONE`, VoidSphere → `ENTITY_PALETTE.VOID_SPHERE`, CrystalShardSwarm → `ENTITY_PALETTE.CRYSTAL_SWARM`, ChaosWorm (both sites) → `ENTITY_PALETTE.CHAOS_WORM`, Fizzer → `ENTITY_PALETTE.FIZZER`. **Boss exception:** leave `styleBossProjectile()` (`Boss.ts:733`) phase colors untouched — red/orange/yellow telegraphs boss phases (deliberate, per spec review).
- [ ] **Step 4: Verify** — tsc clean; play until ScanDrone + Fizzer fire; confirm shot color matches shooter. Smoke green.
- [ ] **Step 5: Commit** — `git commit -m "feat(weapons): enemy projectiles are tracers in owner signature color"`

### Task 6: Player vector rewrite

**Files:**
- Modify: `src/entities/Player.ts` (`initialize` :76-302, `createShieldForceField` :304-334, `createParticleTrail` :336-367 DELETE, `startDash` :481-515, `updateVisualEffects` :517-793, `explodeIntoFragments` :832-974, `flashRed` :1176-1209, `activateShield`/`deactivateShield` :1212-1246, all `collect*/heal/levelUp` flash blocks, `deactivateInvulnerable` :1615-1629, `updateJetVFX` :1017-1099 DELETE)

**Interfaces:**
- Consumes: `outlinePolygon`, `solidPolygon`, `discSolid`, `ringOutline`, `fragmentsFromOutline`, `VectorFragment`, `ENTITY_PALETTE`.
- Produces: identical public API. New mesh structure (all internal): top-level = hull outline Mesh; child 0 = cockpit dot; child 1 = engine flame; child 2 = shield ring (hidden).

- [ ] **Step 1: Rewrite `initialize()` mesh construction** (keep audio wiring/reset logic around it):

```typescript
const HULL_POINTS = [
  new THREE.Vector2(0, 0.9),      // nose
  new THREE.Vector2(-0.62, -0.55), // left wingtip
  new THREE.Vector2(-0.22, -0.35), // left tail notch
  new THREE.Vector2(0, -0.5),      // tail center
  new THREE.Vector2(0.22, -0.35),  // right tail notch
  new THREE.Vector2(0.62, -0.55),  // right wingtip
]
this.mesh = outlinePolygon(HULL_POINTS, 0.07, ENTITY_PALETTE.PLAYER)

const cockpit = discSolid(0.09, ENTITY_PALETTE.PLAYER_COCKPIT)
cockpit.position.set(0, 0.25, 0.01)
this.mesh.add(cockpit)                                    // child 0

const flame = solidPolygon([
  new THREE.Vector2(-0.14, -0.5),
  new THREE.Vector2(0.14, -0.5),
  new THREE.Vector2(0, -0.95),
], ENTITY_PALETTE.PLAYER_COCKPIT)
this.mesh.add(flame)                                      // child 1

const shield = ringOutline(1.0, 0.07, 0x00FF88)
shield.visible = false
this.mesh.add(shield)                                     // child 2
```

Store `HULL_POINTS` as a module-level `const` (also used by `explodeIntoFragments`). DELETE: panel lines, cockpit glass/highlight shapes, 3-flame system, stripes, edge glow, `createParticleTrail()` + `updateJetVFX()` + `jetTrailInterval` field, `createShieldForceField()` (shield is now built inline above).

- [ ] **Step 2: Rewrite `updateVisualEffects()`** keeping the rotation-toward-movement logic verbatim, then replacing every state block:
  - Flame: `flame.scale.y = isThrusting ? 0.8 + Math.random() * 0.5 : 0.4` and `flame.visible = speed > 0.1`.
  - Invulnerable: blink — `this.mesh.visible = Math.floor(elapsed * 8) % 2 === 0`; restore `visible = true` on deactivate (add to `deactivateInvulnerable()` and `clearInvulnerable()`).
  - Dash: `this.mesh.scale.y = 1.25` during dash, ease back to 1 over 0.2s (replaces the emissive glow at :504-506).
  - Shield: `shield.visible = this.shieldCount > 0; shield.rotation.z += deltaTime * 1.5` (replaces the two-ring animation block).
- [ ] **Step 3: Replace all timed color flashes with one timer helper.** Add private `flashTimer = 0`, `flashColorHex = 0xFFFFFF`, and `private flashColor(hex: number, duration = 0.2)` that sets both; drive from `updateVisualEffects`: while `flashTimer > 0` set hull material color to `flashColorHex`, else restore `ENTITY_PALETTE.PLAYER`. Rewire the existing calls: `flashRed()` → `flashColor(0xFF4444)`, heal → `flashColor(0x00FF00)`, levelUp → `flashColor(0xFFD700)`, collectPowerUp → `flashColor(0x00FFFF)`, reducePowerUpLevel → `flashColor(0xFF0000)`, collectSpeedUp → `flashColor(0x00DD55)`, test-mode gold flash → `flashColor(0xFFD700)`. DELETE every `setTimeout` in these paths.
- [ ] **Step 4: Rewrite `explodeIntoFragments()`** using `fragmentsFromOutline(HULL_POINTS, 0.07, ENTITY_PALETTE.PLAYER)`: add fragment meshes to the scene at the player's position, animate in the existing `updateFragments()` (position += velocity·dt, rotation += spin·dt, opacity 1→0 over the existing duration), dispose in the existing `cleanupFragments()`.
- [ ] **Step 5: Verify** — tsc clean; play: move (flame flickers), dash (stretch), take hit (red flash), collect shield (ring shows, absorbs a hit), collect invulnerable (blink), die (hull shatters into fragments), restart. Smoke green.
- [ ] **Step 6: Commit** — `git commit -m "feat(player): vector arrowhead rewrite — one outline, one color"`

### Task 7: Slice 1 gate

- [ ] `npx tsc --noEmit` clean, `npx playwright test` green, manual play checklist from Tasks 4-6 passes.
- [ ] Merge to `main` (same commands as Task 3) with message `"Merge: vector overhaul slice 1 — player + projectiles"`. REMIND USER to hard-refresh and play.

---

## Slice 2 — Base enemy plumbing + the five core enemies

### Task 8: Base Enemy — timer flash + generic fragment death

**Files:**
- Modify: `src/entities/Enemy.ts` (`flashRed` :356-406, `getDeathConfig` :105, `onDeathUpdate` :129, `startDeathSequence` :267-332, `update` :141-178, `destroy` :429-440)

**Interfaces:**
- Produces (consumed by every enemy task below):
  - `protected registerVector(outline: THREE.Vector2[], stroke: number, color: number, flashMaterials: THREE.MeshBasicMaterial[]): void` — subclasses call this at the end of `initialize()`.
  - Timer-driven white hit flash (absorbs roadmap Task 1.3 — no `setTimeout`).
  - Generic fragment death for any enemy that called `registerVector`; unmigrated enemies keep legacy behavior until their task lands.

- [ ] **Step 1: Add fields + `registerVector`**:

```typescript
protected vectorOutline: THREE.Vector2[] | null = null
protected vectorStroke: number = 0.08
protected vectorColor: number = 0xFFFFFF
private flashMaterials: THREE.MeshBasicMaterial[] = []
private flashOriginals: number[] = []
private flashTimer: number = 0
private deathFragments: VectorFragment[] = []

protected registerVector(outline: THREE.Vector2[], stroke: number, color: number, flashMaterials: THREE.MeshBasicMaterial[]): void {
  this.vectorOutline = outline
  this.vectorStroke = stroke
  this.vectorColor = color
  this.flashMaterials = flashMaterials
  this.flashOriginals = flashMaterials.map(m => m.color.getHex())
}
```

- [ ] **Step 2: Rewrite `flashRed()`** — body becomes `this.flashTimer = 0.15` (plus the existing scale-pop if desired: snapshot + ×1.15, restored below). Add to `update()` (all states except DEAD):

```typescript
private updateFlash(deltaTime: number): void {
  if (this.flashTimer <= 0 || this.flashMaterials.length === 0) return
  this.flashTimer -= deltaTime
  const white = this.flashTimer > 0.075
  this.flashMaterials.forEach((m, i) => m.color.setHex(white ? 0xFFFFFF : this.flashOriginals[i]))
  if (this.flashTimer <= 0) this.flashMaterials.forEach((m, i) => m.color.setHex(this.flashOriginals[i]))
}
```

DELETE all four `setTimeout` calls in the old `flashRed`. If `flashMaterials` is empty (enemy not yet migrated), keep the legacy color-snapshot path so Fizzer/UFO/Boss still flash until Slice 3.
- [ ] **Step 3: Generic fragment death.** In `startDeathSequence()`, when `this.vectorOutline` is set: skip `createEnemyDeathParticles` and `createExplosion`, keep the death sound and any `screenFlash` from config, and spawn fragments as children of `this.mesh`:

```typescript
if (this.vectorOutline) {
  this.mesh.children.slice().forEach(c => (c.visible = false))
  if (this.mesh instanceof THREE.Mesh) (this.mesh.material as THREE.Material).opacity = 0
  this.deathFragments = fragmentsFromOutline(this.vectorOutline, this.vectorStroke, this.vectorColor)
  this.deathFragments.forEach(f => this.mesh.add(f.mesh))
}
```

In `getDeathConfig()` default: `duration: this.vectorOutline ? 0.4 : 0` (unmigrated enemies unchanged). In `onDeathUpdate(progress)` default, when fragments exist: per fragment `mesh.position.x += f.velocity.x * dt`, `.y += f.velocity.y * dt`, `mesh.rotation.z += f.spin * dt`, `(mesh.material as THREE.Material).opacity = 1 - progress` (pass `deltaTime` through — `updateDeathAnimation` already has it). Fragments are children of `this.mesh`, so the existing `destroy()` traverse disposes them.
- [ ] **Step 4: Verify** — tsc clean; smoke green (behavior identical — nothing calls `registerVector` yet).
- [ ] **Step 5: Commit** — `git commit -m "feat(entities): timer-driven hit flash + generic vector fragment death"`

### Task 9: DataMite

**Files:**
- Modify: `src/entities/DataMite.ts` (`initialize` :29-103, pulse animation :221-258)

**Interfaces:**
- Consumes: `solidPolygon`, `ENTITY_PALETTE.DATA_MITE`, `registerVector`.

- [ ] **Step 1: Rewrite `initialize()`** — DELETE all 6 layers (base/wireframe/glow/aura/core/spikes):

```typescript
initialize(): void {
  const points = [
    new THREE.Vector2(0, 0.55),
    new THREE.Vector2(-0.38, -0.4),
    new THREE.Vector2(0, -0.18),
    new THREE.Vector2(0.38, -0.4),
  ]
  this.mesh = solidPolygon(points, ENTITY_PALETTE.DATA_MITE)
  this.mesh.position.copy(this.position)
  this.registerVector(points, 0.06, ENTITY_PALETTE.DATA_MITE, [this.mesh.material as THREE.MeshBasicMaterial])
}
```

- [ ] **Step 2: Replace the sine-pulse `updateVisuals` block (:221-258)** with slow spin only: `this.mesh.rotation.z += deltaTime * 1.2`.
- [ ] **Step 3: Verify** — tsc; play level 1: orange darts spin, flash white on hit, shatter into orange fragments on kill. Smoke green.
- [ ] **Step 4: Commit** — `git commit -m "feat(entities): DataMite → vector dart"`

### Task 10: ScanDrone

**Files:**
- Modify: `src/entities/ScanDrone.ts` (`initialize` :63-293, alert visuals :707-841, `getDeathConfig` :320, `onDeathUpdate` :347, keep `destroy` :660-683 projectile cleanup)

**Interfaces:**
- Consumes: `regularPolygon`, `outlinePolygon`, `tracerQuad`, `ENTITY_PALETTE.SCAN_DRONE`, `.SCAN_DRONE_ALERT`, `registerVector`.

- [ ] **Step 1: Rewrite `initialize()`** — DELETE hex body/wireframe, radar dish, sweep cone, scan grid, beam plane, sensor eyes, antenna, strobe beacon, targeting ring:

```typescript
initialize(): void {
  const hex = regularPolygon(6, 1.3)
  this.mesh = outlinePolygon(hex, 0.09, ENTITY_PALETTE.SCAN_DRONE)
  this.mesh.position.copy(this.position)
  const sweep = tracerQuad(0.06, 1.3, ENTITY_PALETTE.SCAN_DRONE)
  sweep.geometry.translate(0, 0.65, 0) // pivot at hex center
  this.mesh.add(sweep) // child 0
  this.registerVector(hex, 0.09, ENTITY_PALETTE.SCAN_DRONE,
    [this.mesh.material as THREE.MeshBasicMaterial, sweep.material as THREE.MeshBasicMaterial])
}
```

- [ ] **Step 2: Rewrite `updateVisuals`/alert block** — sweep rotates `child0.rotation.z -= deltaTime * (alert ? 4 : 2)`. Alert enter/exit (keep the existing alert-state logic, replace only the visual part): set both materials' color to `SCAN_DRONE_ALERT` / restore to `SCAN_DRONE` — also update `flashOriginals` by re-calling `registerVector` on state change so hit-flash restores the right color.
- [ ] **Step 3: DELETE the `onDeathUpdate` grid-flicker override (:347) and simplify `getDeathConfig` (:320)** to `{ duration: 0.4 }` — the base fragment death takes over. Keep the `destroy()` projectile/arc cleanup.
- [ ] **Step 4: Verify** — tsc; play to ScanDrone spawns: amber hex + rotating sweep; goes red + fast sweep when alerted; fires amber tracers; fragments on death. Smoke green.
- [ ] **Step 5: Commit** — `git commit -m "feat(entities): ScanDrone → amber hex with radar sweep"`

### Task 11: ChaosWorm

**Files:**
- Modify: `src/entities/ChaosWorm.ts` (segment construction :81-204, hue cycling :581-585, death overrides :232, keep segment AI/undulation and death-spray projectile logic)

**Interfaces:**
- Consumes: `outlinePolygon`, `ENTITY_PALETTE.CHAOS_WORM`, `registerVector`.

- [ ] **Step 1: Rewrite segment construction.** Keep the invisible top-level container and the per-segment position logic. Each segment mesh becomes ONE diamond outline (`outlinePolygon` of a 4-point diamond `[(0,s),(s,0),(0,-s),(-s,0)]` where `s = 0.45 - i * 0.03`, stroke 0.06, color `CHAOS_WORM`). DELETE per-segment wireframes, aura rings, spikes, core spheres, and the trailing `THREE.Points` system (:192-204).
- [ ] **Step 2: DELETE hue cycling (:581-585)** and the red emissive hit flash (:485) — base timer flash covers it. Register: `registerVector(headDiamondPoints, 0.06, ENTITY_PALETTE.CHAOS_WORM, segmentMaterials)` (all segment materials flash together).
- [ ] **Step 3: Keep** the custom `updateDeathAnimation` override IF it drives the death projectile spray (:375/:449 — gameplay); strip only its visual particle parts, and let segments fade out (`opacity = 1 - progress`) while base fragments fire from the head.
- [ ] **Step 4: Verify** — tsc; play to worm: magenta diamond chain undulates, one color, fires magenta tracers on death. Smoke green.
- [ ] **Step 5: Commit** — `git commit -m "feat(entities): ChaosWorm → magenta diamond chain"`

### Task 12: VoidSphere

**Files:**
- Modify: `src/entities/VoidSphere.ts` (`initialize` :78-264, `getDeathConfig` :290, `onDeathUpdate` :368)

**Interfaces:**
- Consumes: `discSolid`, `ringOutline`, `regularPolygon`, `ENTITY_PALETTE.VOID_SPHERE`, `registerVector`.

- [ ] **Step 1: Rewrite `initialize()`** — DELETE accretion tori + wireframes + orbiting particles, tendrils, both distortion spheres, gravity-wave Points, spawn-port rings:

```typescript
initialize(): void {
  this.mesh = discSolid(2.4, 0x000000, 0.98)
  this.mesh.position.copy(this.position)
  const ring = ringOutline(3.2, 0.12, ENTITY_PALETTE.VOID_SPHERE, 0, Math.PI * 1.75) // gapped arc so rotation reads
  this.mesh.add(ring) // child 0
  this.registerVector(regularPolygon(12, 3.2), 0.12, ENTITY_PALETTE.VOID_SPHERE,
    [ring.material as THREE.MeshBasicMaterial])
}
```

(Black disc is NOT a flash material — the void stays black; only the ring flashes.)
- [ ] **Step 2: `updateVisuals`** — ring rotation only: `child0.rotation.z += deltaTime * 0.5`. If the deleted spawn-port meshes were referenced by projectile-spawn logic (:592 area), spawn shots from `this.position` offsets instead; add a 0.3s ring scale-pulse (1→1.15→1) as the firing telegraph.
- [ ] **Step 3: Simplify `getDeathConfig` (:290)** to `{ duration: 0.6, screenFlash: <keep existing values> }`; DELETE the `onDeathUpdate` override (:368) — base fragments (violet ring shards) + disc fade via base traverse.
- [ ] **Step 4: Verify** — tsc; play/testmode to VoidSphere: black disc + rotating violet arc, violet tracers, fragment death. Smoke green.
- [ ] **Step 5: Commit** — `git commit -m "feat(entities): VoidSphere → black disc with violet arc"`

### Task 13: CrystalShardSwarm

**Files:**
- Modify: `src/entities/CrystalShardSwarm.ts` (`initialize` :83-236, shard-fragment death :497-501, arcs :211-219, rings :228-236)

**Interfaces:**
- Consumes: `starPolygon`, `outlinePolygon`, `ENTITY_PALETTE.CRYSTAL_SWARM`, `registerVector`.

- [ ] **Step 1: Rewrite `initialize()`** — DELETE center sphere, octahedron core + wireframe, per-shard cones/wireframes/tips/inner cones, lightning arcs, concentric rings:

```typescript
initialize(): void {
  const star = starPolygon(6, 4.6, 2.2)
  this.mesh = outlinePolygon(star, 0.1, ENTITY_PALETTE.CRYSTAL_SWARM)
  this.mesh.position.copy(this.position)
  this.registerVector(star, 0.1, ENTITY_PALETTE.CRYSTAL_SWARM, [this.mesh.material as THREE.MeshBasicMaterial])
}
```

- [ ] **Step 2: `updateVisuals`** — `this.mesh.rotation.z += deltaTime * 0.4`. DELETE the shard-cone death fragments (:497-501) — base fragment death covers it (a 12-point outline yields good shards).
- [ ] **Step 3: Verify** — tsc; play to crystal: cyan star rotates, cyan tracers, shatters cyan. Smoke green.
- [ ] **Step 4: Commit** — `git commit -m "feat(entities): CrystalShardSwarm → cyan star outline"`

### Task 14: Slice 2 gate

- [ ] tsc clean, smoke green, manual play: all five redesigned enemies readable at a glance, one color each, flash + fragment deaths working; Fizzer/UFO/Boss still render old-style (expected until Slice 3).
- [ ] Merge to `main`, message `"Merge: vector overhaul slice 2 — five core enemies"`. REMIND USER to hard-refresh and play.

---

## Slice 3 — Remaining enemies + pickups

### Task 15: Fizzer

**Files:**
- Modify: `src/entities/Fizzer.ts` (`initialize` :79-173; note its `update()` :425 does NOT call `super.update()` — add `this['updateFlash']`-equivalent by routing through the base: change its `update()` to call `super.update(deltaTime, player)` if feasible, else call the base flash/death helpers directly; keep its custom AI timing)

**Interfaces:**
- Consumes: `tracerQuad`, `ENTITY_PALETTE.FIZZER`, `registerVector`.

- [ ] **Step 1: Rewrite `initialize()`** — DELETE core/inner icosahedron/spikes/sparks/ring/trail. Cross = two crossed bars:

```typescript
initialize(): void {
  this.mesh = tracerQuad(0.14, 0.7, ENTITY_PALETTE.FIZZER)
  const bar2 = tracerQuad(0.14, 0.7, ENTITY_PALETTE.FIZZER)
  bar2.rotation.z = Math.PI / 2
  this.mesh.add(bar2) // child 0
  this.mesh.position.copy(this.position)
  const cross = [new THREE.Vector2(0, 0.35), new THREE.Vector2(0.35, 0), new THREE.Vector2(0, -0.35), new THREE.Vector2(-0.35, 0)]
  this.registerVector(cross, 0.1, ENTITY_PALETTE.FIZZER,
    [this.mesh.material as THREE.MeshBasicMaterial, bar2.material as THREE.MeshBasicMaterial])
}
```

- [ ] **Step 2: Idle** — fast spin `this.mesh.rotation.z += deltaTime * 6` in its update path. Verify AttractMode still works (it force-sets top-level `material.opacity = 1` — fine, material exists).
- [ ] **Step 3: Verify + commit** — tsc, play (green cross zips, red→green tracers per Task 5), smoke. `git commit -m "feat(entities): Fizzer → green spark cross"`

### Task 16: UFO

**Files:**
- Modify: `src/entities/UFO.ts` (`initialize` :91-173; `update` :584 also skips `super.update()` — same handling as Fizzer)

**Interfaces:**
- Consumes: `outlinePolygon`, `ringOutline`, `ENTITY_PALETTE.UFO`, `registerVector`.

- [ ] **Step 1: Rewrite `initialize()`** — DELETE cylinder body/wireframe/dome/running lights/underglow:

```typescript
initialize(): void {
  const body = [
    new THREE.Vector2(-1.2, 0), new THREE.Vector2(-0.6, 0.25), new THREE.Vector2(0.6, 0.25),
    new THREE.Vector2(1.2, 0), new THREE.Vector2(0.6, -0.25), new THREE.Vector2(-0.6, -0.25),
  ]
  this.mesh = outlinePolygon(body, 0.07, ENTITY_PALETTE.UFO)
  this.mesh.position.copy(this.position)
  const dome = ringOutline(0.45, 0.07, ENTITY_PALETTE.UFO, 0, Math.PI)
  dome.position.set(0, 0.25, 0)
  this.mesh.add(dome) // child 0
  this.registerVector(body, 0.07, ENTITY_PALETTE.UFO,
    [this.mesh.material as THREE.MeshBasicMaterial, dome.material as THREE.MeshBasicMaterial])
}
```

- [ ] **Step 2: Verify + commit** — tsc, play/testmode UFO, smoke. `git commit -m "feat(entities): UFO → ice-blue saucer profile"`

### Task 17: Boss

**Files:**
- Modify: `src/entities/Boss.ts` (`initialize` :45-118 — hull/wireframe/reactor/bridge under `coreMesh`; keep the invisible top-level container at :95-97, phase logic, `styleBossProjectile` :733, custom `updateDeathAnimation` :340)

**Interfaces:**
- Consumes: `regularPolygon`, `outlinePolygon`, `discSolid`, `ENTITY_PALETTE.BOSS`, `registerVector`.

- [ ] **Step 1: Rewrite the `coreMesh` construction** — DELETE hull cylinder/wireframe/reactor spheres/bridge boxes:

```typescript
const hexPoints = regularPolygon(6, 3.5)
this.coreMesh = outlinePolygon(hexPoints, 0.15, ENTITY_PALETTE.BOSS)
const core = discSolid(0.9, ENTITY_PALETTE.BOSS)
this.coreMesh.add(core) // coreMesh child 0
this.mesh.add(this.coreMesh)
this.registerVector(hexPoints, 0.15, ENTITY_PALETTE.BOSS,
  [this.coreMesh.material as THREE.MeshBasicMaterial, core.material as THREE.MeshBasicMaterial])
```

- [ ] **Step 2: `updateVisuals`** — hex rotates `coreMesh.rotation.z += deltaTime * 0.3`; core scale-pulses `1 + Math.sin(this.animTimer * 3) * 0.08`. Strip visual-only parts of the `updateDeathAnimation` override; keep its gameplay (phase/projectile) sequencing and let base fragments fire at the end. `styleBossProjectile` phase colors stay (Task 5 exception).
- [ ] **Step 3: Verify + commit** — tsc, testmode boss fight through a phase change, smoke. `git commit -m "feat(entities): Boss → red hex fortress"`

### Task 18: Pickups

**Files:**
- Modify: `src/entities/MedPack.ts`, `src/entities/SpeedUp.ts`, `src/entities/Shield.ts`, `src/entities/PowerUp.ts` (each `createMesh()` and its update/orbit-particle blocks)

**Interfaces:**
- Consumes: `solidPolygon`, `ringOutline`, `starPolygon`, `outlinePolygon`, `ENTITY_PALETTE.PICKUP_MEDPACK`, `.PICKUP_EMERALD`.
- Produces: unchanged pickup APIs (constructor, `update(dt, playerPos?)`, `collect()`, `destroy()`, magnetism intact).

- [ ] **Step 1: MedPack** — keep the transparent container mesh; children become ONE solid green cross: two stacked `tracerQuad(0.16, 0.6, ENTITY_PALETTE.PICKUP_MEDPACK)` bars, the second with `rotation.z = Math.PI / 2`. DELETE glow spheres, wireframe, inner bars, 10 particles.
- [ ] **Step 2: SpeedUp** — one emerald chevron: `solidPolygon([(-0.35,-0.1),(0,0.25),(0.35,-0.1),(0.35,-0.3),(0,0.05),(-0.35,-0.3)], PICKUP_EMERALD)` (as `THREE.Vector2`s). DELETE rings/letter/speed-lines/15 particles.
- [ ] **Step 3: Shield** — one `ringOutline(0.45, 0.08, PICKUP_EMERALD)`. DELETE everything else.
- [ ] **Step 4: PowerUp** — one `outlinePolygon(starPolygon(4, 0.5, 0.2), 0.07, PICKUP_EMERALD)`. DELETE rings/letter-P/12 particles.
- [ ] **Step 5: All four** — idle: `container.rotation.z += deltaTime * 1.5`; keep magnetism + pulse-scale; DELETE orbit-particle and glow-update blocks; keep `collect()` effect calls as-is.
- [ ] **Step 6: Verify + commit** — tsc, play until each pickup drops and collects, smoke. `git commit -m "feat(pickups): vector glyphs — cross, chevron, ring, star"`

### Task 19: Slice 3 gate

- [ ] tsc clean, smoke green, full manual play: every entity on the field is vector-styled; nothing old-style remains in-game.
- [ ] Merge to `main`, message `"Merge: vector overhaul slice 3 — full cast + pickups"`. REMIND USER to hard-refresh and play.

---

## Slice 4 — Living title screen

### Task 20: AttractMode full roster

**Files:**
- Modify: `src/core/AttractMode.ts` (generalize `spawnFizzer` :120-152, respawn loop :112, imports)

**Interfaces:**
- Consumes: all enemy classes (constructors are uniformly `(x: number, y: number)` + no-arg `initialize()`).

- [ ] **Step 1: Generalize spawning.** Replace `maxFizzers`/`spawnFizzer` with a roster:

```typescript
private static readonly ROSTER: Array<{ create: (x: number, y: number) => Enemy; max: number }> = [
  { create: (x, y) => new DataMite(x, y), max: 3 },
  { create: (x, y) => new Fizzer(x, y), max: 2 },
  { create: (x, y) => new ScanDrone(x, y), max: 1 },
  { create: (x, y) => new ChaosWorm(x, y), max: 1 },
  { create: (x, y) => new CrystalShardSwarm(x, y), max: 1 },
  { create: (x, y) => new UFO(x, y), max: 1 },
  { create: (x, y) => new VoidSphere(x, y), max: 1 },
]
```

`spawnOfType(entry)` = the existing `spawnFizzer` body with `entry.create(x, y)`; track per-type counts in `AttractEnemy` (`add rosterIndex: number`). `start()` spawns each type up to `max`; the respawn loop refills whichever type died. Boss stays OUT of attract (a 7-unit hex dominates the backdrop — deliberate).
- [ ] **Step 2: Animation fallback.** The `enemy.update(dt, undefined)` try/catch (:88-95) swallows AI throws for player-dependent enemies, which also skips `updateVisuals`. In the `catch`, add `;(entry.enemy as unknown as { updateVisuals(dt: number): void }).updateVisuals?.(deltaTime)` so idle animations (sweep, rotation) still run. Enemies that try to fire have no `sceneManager` — their throws are already caught; verify no per-frame console spam in dev (`DEBUG_MODE` logs).
- [ ] **Step 3: Verify + commit** — dev server: title screen shows the full cast drifting and animating; start a game → attract cleans up; back to menu → repopulates. Smoke green (boot test catches console errors). `git commit -m "feat(ui): attract mode shows the full living enemy roster"`

### Task 21: Threat-database SVG glyphs

**Files:**
- Modify: `src/ui/screens/StartScreen.ts` (`getEnemyVisual` :1338-1621 — the per-type SVG strings; keep `createEnemyCard`, keyframes, and card CSS untouched)

- [ ] **Step 1: Replace each SVG** with the vector-minimal equivalent (all `viewBox="0 0 60 60"`, `fill="none"` outlines, colors literal — this is display-only HTML, `stroke-linejoin="round"`):
  - `datamite`: `<polygon points="30,8 14,46 30,36 46,46" fill="#FF4400"/>`
  - `scandrone`: `<polygon points="30,6 51,18 51,42 30,54 9,42 9,18" fill="none" stroke="#FF8800" stroke-width="3"/><line x1="30" y1="30" x2="30" y2="8" stroke="#FF8800" stroke-width="2"><animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="3s" repeatCount="indefinite"/></line>`
  - `chaosworm`: `<polygon points="16,22 24,30 16,38 8,30" fill="none" stroke="#FF00FF" stroke-width="2.5"/><polygon points="32,18 42,30 32,42 22,30" fill="none" stroke="#FF00FF" stroke-width="3"/><polygon points="48,24 54,30 48,36 42,30" fill="none" stroke="#FF00FF" stroke-width="2"/>`
  - `voidsphere`: `<circle cx="30" cy="30" r="14" fill="#000000"/><circle cx="30" cy="30" r="21" fill="none" stroke="#AA00FF" stroke-width="3" stroke-dasharray="115 17"/>`
  - `crystalswarm`: 6-point star outline — `<polygon points="30,4 36,20 54,17 42,30 54,43 36,40 30,56 24,40 6,43 18,30 6,17 24,20" fill="none" stroke="#00FFFF" stroke-width="2.5"/>`
  - `fizzer`: `<rect x="26" y="8" width="8" height="44" fill="#00FF88"/><rect x="8" y="26" width="44" height="8" fill="#00FF88"/>`
  - `ufo`: `<polygon points="6,32 18,26 42,26 54,32 42,38 18,38" fill="none" stroke="#88AAFF" stroke-width="3"/><path d="M 20 26 A 10 10 0 0 1 40 26" fill="none" stroke="#88AAFF" stroke-width="3"/>`
  - `boss`: `<polygon points="30,4 53,17 53,43 30,56 7,43 7,17" fill="none" stroke="#FF0000" stroke-width="3.5"/><circle cx="30" cy="30" r="7" fill="#FF0000"/>`
  - `default`: keep the colored-circle fallback.
- [ ] **Step 2: Verify + commit** — dev server: cards match the live enemies drifting behind them; hover/float animations intact; responsive sizes fine at a narrow window. Smoke green. `git commit -m "feat(ui): threat-database glyphs match in-game vector shapes"`

### Task 22: Slice 4 gate + wrap-up

- [ ] tsc clean, smoke green. Full manual pass: title screen (living roster + true cards) → play a run hitting every enemy type + pickups → boss (testmode) → game over → back to menu.
- [ ] Report before/after draw calls at a busy moment (`renderer.info.render.calls` via console in dev) — the spec expects a significant drop.
- [ ] Update `docs/superpowers/plans/2026-07-10-neural-break-improvement-roadmap.md`: mark Task 1.3 (hit-flash setTimeout) absorbed by this work.
- [ ] Merge to `main`, message `"Merge: vector overhaul slice 4 — living title screen"`. REMIND USER to hard-refresh and play.
