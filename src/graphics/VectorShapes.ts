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
