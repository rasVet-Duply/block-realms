import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildPet, type PetCfg } from '../game/pets';

/** Live, animated 3D preview of a pet with its accessories. */
export default function PetViewer({ cfg, className }: { cfg: PetCfg; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = `${cfg.pet}|${cfg.wings}|${cfg.crown}|${cfg.glasses}`;
  useEffect(() => {
    const canvas = ref.current!; const el = canvas.parentElement!;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#6a5aa0', 1.6));
    const key = new THREE.DirectionalLight('#fff4e0', 2.4); key.position.set(2, 4, 3); scene.add(key);
    const rim = new THREE.DirectionalLight('#a0c8ff', 1.2); rim.position.set(-3, 2, -3); scene.add(rim);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 1.5, 4.2); cam.lookAt(0, 0.85, 0);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 40), new THREE.MeshStandardMaterial({ color: '#2a2440', roughness: 0.4, metalness: 0.3 }));
    disc.position.y = -0.04; scene.add(disc);
    const pet = cfg.pet ? buildPet(cfg) : null; if (pet) scene.add(pet);
    const size = () => { const w = el.clientWidth, h = el.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); const ro = new ResizeObserver(size); ro.observe(el);
    const clock = new THREE.Clock(); let t = 0; let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), 0.05); t += dt;
      if (pet) { (pet.userData.tick as (t: number, dt: number) => void)(t, dt); pet.rotation.y = Math.sin(t * 0.6) * 0.6; }
      r.render(scene, cam);
    };
    loop();
    const tap = () => { if (pet) pet.userData.happy = 1; };
    canvas.addEventListener('pointerdown', tap);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener('pointerdown', tap); r.dispose(); };
  }, [key]);
  return <div className={className}><canvas ref={ref} className="block w-full h-full" /></div>;
}
