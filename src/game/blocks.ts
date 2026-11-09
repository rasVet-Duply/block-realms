import * as THREE from 'three';
import type { Theme } from './themes';
import { getGeometry } from './geometry';

const mats = new Map<string, THREE.Material>();

export function blockMaterial(t: Theme, i: number) {
  const key = `${t.id}:${i % t.palette.length}`;
  let m = mats.get(key);
  if (!m) {
    const c = new THREE.Color(t.palette[i % t.palette.length]);
    const op = t.mat.opacity ?? 1;
    m = new THREE.MeshStandardMaterial({
      color: c, roughness: t.mat.rough, metalness: t.mat.metal, flatShading: !!t.mat.flat,
      transparent: op < 1, opacity: op, emissive: c.clone().multiplyScalar(t.mat.emissive ?? 0),
    });
    mats.set(key, m);
  }
  return m;
}

export function innerMaterial(t: Theme, i: number) {
  const key = `${t.id}:inner:${t.inner ? 0 : i % t.palette.length}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(t.inner ?? t.palette[i % t.palette.length]).multiplyScalar(1.4),
      transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    mats.set(key, m);
  }
  return m;
}

/** Visual for a single cell in the given world. Geometry & materials are shared. */
export function createBlockVisual(t: Theme, i: number, shadows = true) {
  const g = new THREE.Group();
  const geo = getGeometry(t.geo);
  const mesh = new THREE.Mesh(geo.main, blockMaterial(t, i));
  mesh.castShadow = shadows;
  g.add(mesh);
  if (geo.inner) {
    const inner = new THREE.Mesh(geo.inner, innerMaterial(t, i));
    inner.name = 'inner';
    g.add(inner);
  }
  return g;
}
