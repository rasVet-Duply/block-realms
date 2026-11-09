import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { GeoKind } from './themes';

export interface BlockGeo { main: THREE.BufferGeometry; inner?: THREE.BufferGeometry }
type Part = [THREE.BufferGeometry, THREE.Matrix4?];

const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

function prep(g: THREE.BufferGeometry, m?: THREE.Matrix4) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  if (m) n.applyMatrix4(m);
  return n;
}
const merge = (parts: Part[]) => { const g = mergeGeometries(parts.map(([g, m]) => prep(g, m)))!; g.computeVertexNormals(); return g; };

const noise = (x: number, y: number, z: number, s: number) =>
  Math.sin(x * 3.1 + s) * Math.cos(y * 2.7 + s * 1.3) * Math.sin(z * 3.7 + s * 0.7) + 0.5 * Math.sin(x * 7.3 + y * 5.1 + z * 6.2 + s * 2.1);

function displace(g: THREE.BufferGeometry, amt: number, seed: number, freq = 1, twist = 0) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise(v.x * freq, v.y * freq, v.z * freq, seed);
    v.addScaledVector(v.clone().normalize(), n * amt);
    if (twist) { const a = v.y * twist; const x = v.x * Math.cos(a) - v.z * Math.sin(a); v.z = v.x * Math.sin(a) + v.z * Math.cos(a); v.x = x; }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

function crystal(h: number, r: number) {
  return merge([[new THREE.CylinderGeometry(r, r * 1.1, h * 0.7, 6), M(0, h * 0.35)], [new THREE.CylinderGeometry(0, r, h * 0.3, 6), M(0, h * 0.85)]]);
}

function build(kind: GeoKind): BlockGeo {
  switch (kind) {
    case 'jelly': return { main: new RoundedBoxGeometry(1, 0.86, 1, 4, 0.24) };
    case 'ice': return { main: merge([
      [new THREE.CylinderGeometry(0.48, 0.55, 0.22, 6), M(0, -0.4)],
      [crystal(1.05, 0.22), M(0, -0.32)], [crystal(0.75, 0.16), M(0.26, -0.32, 0.12, 0, 0, -0.35)],
      [crystal(0.65, 0.15), M(-0.24, -0.32, 0.16, 0.2, 0, 0.4)], [crystal(0.6, 0.14), M(0.02, -0.32, -0.27, -0.35, 0, 0)]]) };
    case 'rock': { const g = displace(new THREE.IcosahedronGeometry(0.6, 1), 0.13, 1.7, 1.2); g.scale(1, 0.78, 1); return { main: g }; }
    case 'asteroid': return { main: displace(new THREE.IcosahedronGeometry(0.58, 2), 0.16, 4.2, 1.8) };
    case 'holo': {
      const e = 0.07, L = 1, parts: Part[] = [];
      for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) {
        parts.push([new THREE.BoxGeometry(L, e, e), M(0, a, b)], [new THREE.BoxGeometry(e, L, e), M(a, 0, b)], [new THREE.BoxGeometry(e, e, L), M(a, b, 0)]);
      }
      parts.push([new THREE.BoxGeometry(0.9, 0.04, 0.9), M(0, -0.48)]);
      return { main: merge(parts), inner: new THREE.OctahedronGeometry(0.34, 0) };
    }
    case 'wood': return { main: merge([
      [new RoundedBoxGeometry(0.32, 0.8, 1, 2, 0.04), M(-0.34)], [new RoundedBoxGeometry(0.32, 0.74, 1, 2, 0.04), M(0, -0.03)],
      [new RoundedBoxGeometry(0.32, 0.84, 1, 2, 0.04), M(0.34, 0.02)], [new THREE.BoxGeometry(1.04, 0.1, 1.04), M(0, 0.18)],
      [new THREE.BoxGeometry(1.04, 0.1, 1.04), M(0, -0.22)]]) };
    case 'coral': {
      const parts: Part[] = [[new THREE.SphereGeometry(0.45, 12, 8), M(0, -0.25, 0, 0, 0, 0, 1, 0.5, 1)]];
      const br = [[0, 0, 0.75, 0, 0], [0.22, 0.1, 0.55, 0.1, -0.5], [-0.22, 0.05, 0.6, -0.1, 0.55], [0.05, -0.24, 0.5, -0.55, 0], [0, 0.26, 0.45, 0.5, 0.2]];
      for (const [x, z, h, rx, rz] of br) {
        const tip = new THREE.Vector3(0, h, 0).applyEuler(new THREE.Euler(rx, 0, rz));
        parts.push([new THREE.CylinderGeometry(0.07, 0.12, h, 7), M(x + tip.x / 2, -0.25 + tip.y / 2, z + tip.z / 2, rx, 0, rz)]);
        parts.push([new THREE.SphereGeometry(0.11, 8, 6), M(x + tip.x, -0.25 + tip.y, z + tip.z)]);
      }
      return { main: merge(parts) };
    }
    case 'gem': return { main: merge([[new THREE.CylinderGeometry(0.3, 0.5, 0.24, 8), M(0, 0.12)], [new THREE.CylinderGeometry(0.5, 0, 0.6, 8), M(0, -0.3)]]) };
    case 'brick': {
      const parts: Part[] = [[new RoundedBoxGeometry(1, 0.66, 1, 2, 0.06), M()]];
      for (const a of [-0.25, 0.25]) for (const b of [-0.25, 0.25]) parts.push([new THREE.CylinderGeometry(0.15, 0.15, 0.16, 16), M(a, 0.4, b)]);
      return { main: merge(parts) };
    }
    case 'sandstone': return { main: merge([
      [new RoundedBoxGeometry(1, 0.8, 1, 1, 0.05), M()],
      [new THREE.BoxGeometry(1, 0.08, 0.12), M(0, 0.44, 0.44)], [new THREE.BoxGeometry(1, 0.08, 0.12), M(0, 0.44, -0.44)],
      [new THREE.BoxGeometry(0.12, 0.08, 0.76), M(0.44, 0.44)], [new THREE.BoxGeometry(0.12, 0.08, 0.76), M(-0.44, 0.44)],
      [new THREE.CylinderGeometry(0.16, 0.16, 0.06, 6), M(0, 0.43)], [new THREE.BoxGeometry(1.03, 0.05, 1.03), M(0, -0.1)]]) };
    case 'blob': {
      const s = displace(new THREE.SphereGeometry(0.5, 22, 16), 0.07, 2.4, 2.2);
      return { main: merge([[s, M(0, 0, 0, 0, 0, 0, 1, 0.85, 1)], [new THREE.SphereGeometry(0.12, 10, 8), M(0.2, 0.4, 0.1)], [new THREE.SphereGeometry(0.08, 8, 6), M(-0.15, 0.42, -0.12)]]) };
    }
    case 'cloud': {
      const sp: number[][] = [[0, 0, 0, 0.42], [0.3, -0.06, 0.1, 0.32], [-0.3, -0.06, -0.05, 0.33], [0.05, 0.1, 0.28, 0.3], [-0.05, 0.08, -0.3, 0.3], [0, 0.25, 0, 0.32]];
      return { main: merge(sp.map(([x, y, z, r]) => [new THREE.SphereGeometry(r, 12, 9), M(x, y, z)] as Part)) };
    }
    case 'gear': {
      const parts: Part[] = [[new THREE.CylinderGeometry(0.4, 0.4, 0.45, 20), M()]];
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; parts.push([new THREE.BoxGeometry(0.15, 0.45, 0.16), M(Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44, 0, -a, 0)]); }
      parts.push([new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12), M()]);
      return { main: merge(parts), inner: new THREE.TorusGeometry(0.28, 0.035, 6, 20).rotateX(Math.PI / 2).translate(0, 0.29, 0) };
    }
    case 'shard': {
      const g = merge([[new THREE.CylinderGeometry(0, 0.52, 0.75, 5), M(0, 0.2)], [new THREE.CylinderGeometry(0.52, 0.1, 0.4, 5), M(0, -0.37)],
        [new THREE.CylinderGeometry(0, 0.2, 0.5, 4), M(0.3, 0.05, 0.1, 0, 0, -0.5)]]);
      return { main: displace(g, 0.05, 9.1, 2), inner: new THREE.OctahedronGeometry(0.18, 0) };
    }
    case 'ore': {
      const g = displace(new THREE.DodecahedronGeometry(0.56, 1), 0.1, 7.3, 1.6); g.scale(1, 0.82, 1);
      const pts = [[0.38, 0.2, 0.15], [-0.3, 0.1, 0.35], [0.05, 0.38, -0.32], [-0.35, -0.05, -0.25]];
      return { main: g, inner: merge(pts.map(([x, y, z]) => [new THREE.OctahedronGeometry(0.11, 0), M(x, y, z, x, y, z)] as Part)) };
    }
    case 'pixel': return { main: merge([[new THREE.BoxGeometry(1, 0.5, 1), M(0, -0.2)], [new THREE.BoxGeometry(0.72, 0.25, 0.72), M(0, 0.17)], [new THREE.BoxGeometry(0.4, 0.2, 0.4), M(0, 0.39)]]) };
    case 'corecrystal': { const g = new THREE.IcosahedronGeometry(0.55, 0); g.scale(1, 1.15, 1); return { main: g, inner: new THREE.IcosahedronGeometry(0.24, 1) }; }
    case 'rune': { const g = new THREE.OctahedronGeometry(0.45, 0); g.scale(0.9, 1.3, 0.9); return { main: g, inner: new THREE.TorusGeometry(0.46, 0.035, 6, 28).rotateX(Math.PI / 2) }; }
    case 'robot': return { main: merge([
      [new RoundedBoxGeometry(0.88, 0.74, 0.88, 2, 0.08), M()],
      [new THREE.CylinderGeometry(0.08, 0.08, 1.06, 10), M(0, -0.18, 0.28, 0, 0, Math.PI / 2)], [new THREE.CylinderGeometry(0.08, 0.08, 1.06, 10), M(0, -0.18, -0.28, 0, 0, Math.PI / 2)],
      [new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), M(0.25, 0.48, -0.2)], [new THREE.SphereGeometry(0.06, 8, 6), M(0.25, 0.6, -0.2)]]),
      inner: new THREE.BoxGeometry(0.6, 0.12, 0.04).translate(0, 0.1, 0.45) };
    case 'void': return { main: displace(new THREE.IcosahedronGeometry(0.52, 3), 0.14, 11, 3, 2.2), inner: new THREE.SphereGeometry(0.22, 12, 10) };
  }
}

function normalize(b: BlockGeo) {
  b.main.computeBoundingBox();
  const bb = b.main.boundingBox!; const size = new THREE.Vector3(); const c = new THREE.Vector3();
  bb.getSize(size); bb.getCenter(c);
  const s = Math.min(0.9 / size.x, 0.9 / size.z, 0.86 / size.y);
  for (const g of [b.main, b.inner]) { if (!g) continue; g.translate(-c.x, -c.y, -c.z); g.scale(s, s, s); }
  return b;
}

const cache = new Map<GeoKind, BlockGeo>();
export function getGeometry(kind: GeoKind) {
  let g = cache.get(kind);
  if (!g) { g = normalize(build(kind)); cache.set(kind, g); }
  return g;
}
