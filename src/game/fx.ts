import * as THREE from 'three';
import type { ClearFx } from './themes';

export interface FxData { base: THREE.Vector3; dir: THREE.Vector3; r: number; emitted?: boolean }
const z = (v: number) => Math.max(0.001, v);

/** World-specific destruction animation for one block, k in [0,1]. */
export function applyFx(fx: ClearFx, o: THREE.Object3D, k: number, d: FxData) {
  const p = o.position, b = d.base, e = 1 - k;
  p.copy(b); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.visible = true;
  switch (fx) {
    case 'pop': o.scale.setScalar(z(k < 0.3 ? 1 + k : 1.3 * (1 - (k - 0.3) / 0.7))); break;
    case 'shatter': o.scale.setScalar(z(1 - k * 1.4)); o.rotation.set(k * d.r * 8, k * 4, -k * d.r * 6); p.x += (Math.random() - 0.5) * 0.1 * e; break;
    case 'sink': p.y -= k * 1.1; o.scale.set(1 + k * 0.2, z(1 - k), 1 + k * 0.2); break;
    case 'glitch': o.visible = Math.random() > k * 0.8; p.x += (Math.random() - 0.5) * 0.4 * k; o.scale.set(1 + (Math.random() - 0.5) * k, z(1 - k), 1); break;
    case 'scatter': p.x += d.dir.x * k * 3; p.z += d.dir.z * k * 3; p.y += k * 1.5 - k * k * 2.5; o.rotation.z = k * d.r * 10; o.scale.setScalar(z(e)); break;
    case 'bubble': p.y += k * k * 4; p.x += Math.sin(k * 12 + d.r * 6) * 0.15; o.scale.setScalar(z(1 - k * k)); break;
    case 'implode': o.scale.setScalar(z(1 - k * k)); o.rotation.y = k * 7; break;
    case 'vortex': { const a = k * 6 + d.r * 6; p.x += Math.cos(a) * k * 0.8; p.z += Math.sin(a) * k * 0.8; p.y += k * 2.5; o.rotation.y = k * 12; o.scale.setScalar(z(e)); break; }
    case 'burst': p.y += k * 4 - k * k * 5; p.x += d.dir.x * k * 2.5; p.z += d.dir.z * k * 2.5; o.rotation.set(k * 9 * d.r, k * 6, 0); o.scale.setScalar(z(k < 0.7 ? 1 : e / 0.3)); break;
    case 'dissolve': o.scale.set(1 + k * 0.4, z(e), 1 + k * 0.4); p.y -= k * 0.35; break;
    case 'melt': o.scale.set(1 + k * 0.6, z(1 - k * k), 1 + k * 0.6); p.y -= k * 0.42; break;
    case 'drift': p.x += k * k * 5 * (d.r > 0.5 ? 1 : -1); p.y += k * 1.6; o.rotation.z = -k * 0.6; o.scale.setScalar(z(1 - k * k)); break;
    case 'spin': o.rotation.y = k * k * 20; p.y += k * 0.6; o.scale.setScalar(z(1 - k * k * k)); break;
    case 'crack':
      if (k < 0.45) { p.x += (Math.random() - 0.5) * 0.12; p.z += (Math.random() - 0.5) * 0.12; }
      else { const q = (k - 0.45) / 0.55; p.x += d.dir.x * q * 2; p.z += d.dir.z * q * 2; p.y += q * 1.2; o.scale.setScalar(z(1 - q)); o.rotation.x = q * 5; }
      break;
    case 'crumble': p.y -= k * k * 2.5; o.rotation.set(k * d.r * 3, 0, k * (1 - d.r) * 3); o.scale.setScalar(z(1 - k * 0.8)); break;
    case 'pixelate': o.scale.setScalar(z(Math.ceil(e * 4) / 4)); o.visible = k < 0.95; break;
    case 'eruption': p.y += k * k * 7; o.rotation.y = k * 5; o.scale.setScalar(z(e)); break;
    case 'sparkle': p.y += k * 1.6; o.rotation.y = k * 9; o.scale.setScalar(z((1 + Math.sin(k * Math.PI) * 0.4) * (1 - k * k))); break;
    case 'flip': o.rotation.x = k * Math.PI * 1.5; p.y += Math.sin(k * Math.PI) * 1.4; p.z -= k * 1.2; o.scale.setScalar(z(1 - k * 0.9)); break;
    case 'voidwarp': o.scale.set(z(e), 1 + k * 2.5, z(e)); o.rotation.y = k * 5; p.y += k * 0.8; break;
  }
}
