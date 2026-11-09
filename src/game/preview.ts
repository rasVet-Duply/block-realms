import * as THREE from 'three';
import type { Theme } from './themes';
import { createBlockVisual } from './blocks';

let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<string, string>();

/** Renders a real 3D thumbnail of a world's blocks (one shared offscreen renderer). */
export function themePreview(t: Theme): string {
  const hit = cache.get(t.id);
  if (hit) return hit;
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(220, 220);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(t.hemi[0], t.hemi[1], t.hemiI * 1.3));
  const key = new THREE.DirectionalLight(t.key, t.keyI); key.position.set(3, 6, 4); scene.add(key);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  cam.position.set(3.4, 3.6, 4.4); cam.lookAt(0, 0.1, 0);
  [[-1, 0], [0, 0], [1, 0], [1, -1]].forEach(([x, z], i) => {
    const b = createBlockVisual(t, i, false);
    b.position.set(x - 0.0, 0, z + 0.5);
    b.rotation.y = t.idle === 'spin' ? i * 0.6 : 0;
    scene.add(b);
  });
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  cache.set(t.id, url);
  return url;
}
