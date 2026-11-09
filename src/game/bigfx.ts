import * as THREE from 'three';

export interface BigFx { update(k: number): void; dispose(): void }
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const add = () => ({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide } as const);

const cache: Record<string, THREE.Texture> = {};
function tex(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (cache[key] = t);
}
const glowTex = () => tex('glow', 128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
/** Accretion disk: hot inner edge, purple outer, spiral streaks. RingGeometry UVs are planar, so draw centred. */
const diskTex = () => tex('disk', 512, (g, s) => {
  const c = s / 2;
  const gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.2, 'rgba(0,0,0,0)');
  gr.addColorStop(0.24, 'rgba(255,250,235,1)'); gr.addColorStop(0.32, 'rgba(255,190,90,0.95)');
  gr.addColorStop(0.5, 'rgba(255,70,170,0.7)'); gr.addColorStop(0.75, 'rgba(120,40,255,0.35)'); gr.addColorStop(1, 'rgba(40,0,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 420; i++) {
    const r = c * (0.24 + Math.pow(Math.random(), 1.6) * 0.7); const a = Math.random() * Math.PI * 2; const len = 0.3 + Math.random() * 0.9;
    g.strokeStyle = `rgba(255,${180 + Math.random() * 75},${200 + Math.random() * 55},${0.05 + Math.random() * 0.18 * (1 - r / c)})`;
    g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); g.arc(c, c, r, a, a + len); g.stroke();
  }
});

/** A detailed black hole that spaghettifies and swallows the given blocks. */
export function blackHole(parent: THREE.Object3D, center: THREE.Vector3, blocks: THREE.Object3D[], dur: number): BigFx {
  const g = new THREE.Group(); g.position.copy(center); parent.add(g);
  const geos: THREE.BufferGeometry[] = []; const mats: THREE.Material[] = [];
  const keep = <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x); const km = <T extends THREE.Material>(x: T) => (mats.push(x), x);

  const lens = new THREE.Sprite(km(new THREE.SpriteMaterial({ map: glowTex(), color: '#6a2cff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
  lens.scale.setScalar(7); g.add(lens);
  const disk = new THREE.Mesh(keep(new THREE.RingGeometry(0.55, 3, 160, 3)), km(new THREE.MeshBasicMaterial({ map: diskTex(), ...add() })));
  disk.rotation.x = -Math.PI / 2 + 0.32; g.add(disk);
  const disk2 = new THREE.Mesh(disk.geometry, km(new THREE.MeshBasicMaterial({ map: diskTex(), ...add(), opacity: 0.5 })));
  disk2.rotation.x = -Math.PI / 2 + 0.32; disk2.scale.setScalar(0.7); g.add(disk2);
  // gravitationally lensed arc of the disk's far side, wrapping over the hole
  const arc = new THREE.Mesh(keep(new THREE.RingGeometry(0.58, 1.05, 128, 1)), km(new THREE.MeshBasicMaterial({ map: diskTex(), ...add(), opacity: 0.85 })));
  arc.scale.setScalar(1.6); g.add(arc);
  const horizon = new THREE.Mesh(keep(new THREE.SphereGeometry(0.55, 40, 30)), km(new THREE.MeshBasicMaterial({ color: '#000000' })));
  g.add(horizon);
  const photon = new THREE.Mesh(keep(new THREE.TorusGeometry(0.6, 0.025, 10, 96)), km(new THREE.MeshBasicMaterial({ color: '#ffe2b0', ...add() })));
  g.add(photon);
  const photon2 = new THREE.Mesh(keep(new THREE.TorusGeometry(0.66, 0.05, 10, 96)), km(new THREE.MeshBasicMaterial({ color: '#ff5ad0', ...add(), opacity: 0.45 })));
  g.add(photon2);
  const jetM = km(new THREE.MeshBasicMaterial({ color: '#a98bff', ...add(), opacity: 0.5 }));
  const jets: THREE.Mesh[] = [];
  for (const s of [1, -1]) { const j = new THREE.Mesh(keep(new THREE.ConeGeometry(0.22, 4, 24, 1, true)), jetM); j.position.y = s * 2.2; j.rotation.x = s > 0 ? Math.PI : 0; g.add(j); jets.push(j); }

  // in-falling dust spiral
  const N = 420; const pos = new Float32Array(N * 3); const col = new Float32Array(N * 3);
  const st = Array.from({ length: N }, () => ({ r: 0.7 + Math.random() * 3, a: Math.random() * 7, y: rnd(0.25) }));
  const pg = keep(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(pg, km(new THREE.PointsMaterial({ size: 0.12, map: glowTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  pts.rotation.x = 0.32; pts.frustumCulled = false; g.add(pts);
  const ca = new THREE.Color('#fff1c8'), cb = new THREE.Color('#9a3cff'), tmp = new THREE.Color();

  const data = blocks.map((o) => {
    const d = o.position.clone().sub(center);
    return { o, r0: Math.hypot(d.x, d.z), a0: Math.atan2(d.z, d.x), y0: o.position.y, s0: o.scale.clone(), rot: o.rotation.clone(), delay: Math.random() * 0.12 };
  });
  let last = 0;
  return {
    update(k) {
      const t = k * dur; const dt = Math.max(0, t - last); last = t;
      const grow = 1 - Math.pow(1 - clamp01(k / 0.2), 3); const shrink = k > 0.82 ? Math.pow((k - 0.82) / 0.18, 2) : 0;
      g.scale.setScalar(Math.max(0.001, grow * (1 - shrink) + shrink * 0.02));
      disk.rotation.z = -t * 3.2; disk2.rotation.z = -t * 5.5; arc.rotation.z = t * 0.8;
      photon.scale.setScalar(1 + Math.sin(t * 20) * 0.03); photon2.rotation.x = Math.sin(t * 3) * 0.2;
      (lens.material as THREE.SpriteMaterial).opacity = 0.45 + Math.sin(t * 6) * 0.1 + (k > 0.9 ? (k - 0.9) * 20 : 0);
      lens.scale.setScalar(7 + (k > 0.86 ? (k - 0.86) * 90 : 0));
      jets.forEach((j, i) => (j.scale.set(1 + Math.sin(t * 25 + i) * 0.15, grow * (0.6 + Math.sin(t * 9) * 0.2), 1 + Math.sin(t * 25 + i) * 0.15)));
      for (let i = 0; i < N; i++) {
        const p = st[i]; p.a += dt * (3.5 / Math.max(0.35, p.r)); p.r -= dt * (0.9 + 1.6 / p.r);
        if (p.r < 0.58) { p.r = 2.4 + Math.random() * 0.8; p.a = Math.random() * 7; }
        pos[i * 3] = Math.cos(p.a) * p.r; pos[i * 3 + 1] = p.y * p.r * 0.4; pos[i * 3 + 2] = Math.sin(p.a) * p.r;
        tmp.copy(cb).lerp(ca, clamp01(1.4 - p.r / 2)).multiplyScalar(grow); tmp.toArray(col, i * 3);
      }
      pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
      for (const b of data) {
        const p = clamp01((k - 0.12 - b.delay) / 0.62); const e = p * p;
        const r = b.r0 * (1 - e); const a = b.a0 + e * 9;
        b.o.position.set(center.x + Math.cos(a) * r, b.y0 + (center.y - b.y0) * Math.min(1, e * 1.3), center.z + Math.sin(a) * r);
        const sq = Math.max(0.001, 1 - e); const stretch = 1 + Math.sin(p * Math.PI) * 1.6; // spaghettification
        b.o.scale.set(b.s0.x * sq * stretch, b.s0.y * sq / stretch, b.s0.z * sq);
        b.o.rotation.set(b.rot.x + e * 6, b.rot.y - a, b.rot.z + e * 4);
        b.o.visible = p < 0.995;
      }
    },
    dispose() { parent.remove(g); geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); },
  };
}

// ---------- lightning ----------
function boltPath(from: THREE.Vector3, to: THREE.Vector3, levels: number, jag: number) {
  let pts = [from.clone(), to.clone()];
  for (let l = 0; l < levels; l++) {
    const next: THREE.Vector3[] = [pts[0]]; const off = jag / Math.pow(1.8, l);
    for (let i = 1; i < pts.length; i++) { const m = pts[i - 1].clone().lerp(pts[i], 0.5); m.x += rnd(off); m.z += rnd(off); m.y += rnd(off * 0.3); next.push(m, pts[i]); }
    pts = next;
  }
  return pts;
}
function tubeOf(pts: THREE.Vector3[], r: number) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  return new THREE.TubeGeometry(path, pts.length * 2, r, 5, false);
}

/** Real branching blue lightning striking from the sky. onStrike fires on every new strike. */
export function lightning(parent: THREE.Object3D, target: THREE.Vector3, o: { strikes?: number; dur: number; color?: string; onStrike?: (i: number) => void }): BigFx {
  const g = new THREE.Group(); parent.add(g);
  const col = o.color ?? '#5ab4ff';
  const core = new THREE.MeshBasicMaterial({ color: '#ffffff', ...add() });
  const glow = new THREE.MeshBasicMaterial({ color: col, ...add(), opacity: 0.6 });
  const halo = new THREE.MeshBasicMaterial({ color: '#2a6aff', ...add(), opacity: 0.18 });
  const bolt = new THREE.Group(); g.add(bolt);
  const impact = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#bfe4ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  impact.position.copy(target).setY(0.7); g.add(impact);
  const sky = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#4a8aff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sky.position.set(target.x, 13, target.z); sky.scale.setScalar(10); g.add(sky);
  const scorch = new THREE.Mesh(new THREE.RingGeometry(0.05, 1, 48), new THREE.MeshBasicMaterial({ color: col, ...add() }));
  scorch.rotation.x = -Math.PI / 2; scorch.position.copy(target).setY(0.62); g.add(scorch);
  // electric arcs crawling on the ground
  const arcs = new THREE.Group(); g.add(arcs);

  const strikes = o.strikes ?? 3; const times = Array.from({ length: strikes }, (_, i) => (i / strikes) * 0.75);
  let cur = -1; let lastRegen = -1;
  const clear = (grp: THREE.Group) => { grp.children.forEach((c) => (c as THREE.Mesh).geometry.dispose()); grp.clear(); };
  const regen = () => {
    clear(bolt); clear(arcs);
    const top = new THREE.Vector3(target.x + rnd(1.5), 14, target.z + rnd(1.5)); const end = target.clone().setY(0.65);
    const main = boltPath(top, end, 6, 2.2);
    bolt.add(new THREE.Mesh(tubeOf(main, 0.045), core), new THREE.Mesh(tubeOf(main, 0.14), glow), new THREE.Mesh(tubeOf(main, 0.4), halo));
    for (let b = 0; b < 4; b++) {
      const s = main[2 + ((Math.random() * (main.length - 8)) | 0)];
      const e = s.clone().add(new THREE.Vector3(rnd(3), -2 - Math.random() * 3, rnd(3)));
      const br = boltPath(s, e, 4, 1);
      bolt.add(new THREE.Mesh(tubeOf(br, 0.022), core), new THREE.Mesh(tubeOf(br, 0.08), glow));
    }
    for (let a = 0; a < 6; a++) {
      const ang = Math.random() * 7; const e = end.clone().add(new THREE.Vector3(Math.cos(ang) * (1 + Math.random() * 1.5), 0, Math.sin(ang) * (1 + Math.random() * 1.5)));
      arcs.add(new THREE.Mesh(tubeOf(boltPath(end, e, 3, 0.5), 0.02), glow));
    }
  };
  return {
    update(k) {
      const t = k * o.dur;
      const idx = times.filter((x) => k >= x).length - 1;
      if (idx !== cur) { cur = idx; regen(); lastRegen = t; o.onStrike?.(idx); }
      const since = k - times[cur]; const life = 0.18;
      if (t - lastRegen > 0.045 && since < life) { regen(); lastRegen = t; }
      const flicker = since < life ? (Math.random() > 0.25 ? 1 : 0.25) * (1 - since / life) : 0;
      bolt.visible = flicker > 0.02; arcs.visible = flicker > 0.02;
      core.opacity = flicker; glow.opacity = 0.65 * flicker; halo.opacity = 0.22 * flicker;
      (impact.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - since * 5); impact.scale.setScalar(1.5 + since * 12);
      (sky.material as THREE.SpriteMaterial).opacity = flicker * 0.6;
      (scorch.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - since * 3); scorch.scale.setScalar(0.5 + since * 10);
    },
    dispose() { clear(bolt); clear(arcs); parent.remove(g); [core, glow, halo, impact.material, sky.material, scorch.material].forEach((m) => m.dispose()); scorch.geometry.dispose(); },
  };
}

// ---------- shared helpers ----------
function kit(parent: THREE.Object3D, pos?: THREE.Vector3) {
  const g = new THREE.Group(); if (pos) g.position.copy(pos); parent.add(g);
  const geos: THREE.BufferGeometry[] = []; const mats: THREE.Material[] = [];
  return {
    g, geo: <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x), mat: <T extends THREE.Material>(x: T) => (mats.push(x), x),
    dispose: () => { parent.remove(g); geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); },
  };
}
function sprite(k: ReturnType<typeof kit>, color: string, size: number, map = glowTex()) {
  const s = new THREE.Sprite(k.mat(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  s.scale.setScalar(size); k.g.add(s); return s;
}
const pillarTex = () => tex('pillar', 128, (g, s) => {
  const h = g.createLinearGradient(0, 0, s, 0); h.addColorStop(0, 'rgba(255,255,255,0)'); h.addColorStop(0.5, 'rgba(255,255,255,1)'); h.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = h; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'destination-in'; const v = g.createLinearGradient(0, 0, 0, s); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.3, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = v; g.fillRect(0, 0, s, s);
});
const flakeTex = () => tex('flake', 64, (g, s) => {
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.shadowColor = '#bff'; g.shadowBlur = 6; const c = s / 2;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * 28, c + Math.sin(a) * 28);
    for (const t of [0.5, 0.75]) { const x = c + Math.cos(a) * 28 * t, y = c + Math.sin(a) * 28 * t; for (const sd of [-1, 1]) { g.moveTo(x, y); g.lineTo(x + Math.cos(a + sd * 0.7) * 8, y + Math.sin(a + sd * 0.7) * 8); } } g.stroke(); }
});
const flameTex = () => tex('flame', 64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s * 0.6, 0, s / 2, s * 0.5, s / 2);
  gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,0.9)'); gr.addColorStop(0.6, 'rgba(255,70,10,0.5)'); gr.addColorStop(1, 'rgba(120,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(s / 2, 0); g.quadraticCurveTo(s, s * 0.6, s / 2, s); g.quadraticCurveTo(0, s * 0.6, s / 2, 0); g.fill();
});

/** Gold rain: real spinning 3D coins fountain out, bounce on the board and sparkle. */
export function coinFountain(parent: THREE.Object3D, center: THREE.Vector3, count: number): BigFx {
  const k = kit(parent);
  const coinG = k.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 28)); const rimG = k.geo(new THREE.TorusGeometry(0.17, 0.018, 8, 28));
  const gold = k.mat(new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 1, roughness: 0.22, emissive: '#7a4a00', emissiveIntensity: 0.5 }));
  const coins = Array.from({ length: count }, () => {
    const c = new THREE.Group(); c.add(new THREE.Mesh(coinG, gold)); const rim = new THREE.Mesh(rimG, gold); rim.rotation.x = Math.PI / 2; c.add(rim);
    c.position.copy(center).setY(0.8); k.g.add(c);
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3;
    return { c, v: new THREE.Vector3(Math.cos(a) * sp, 5 + Math.random() * 5, Math.sin(a) * sp), w: new THREE.Vector3(rnd(15), rnd(15), rnd(15)) };
  });
  const flash = sprite(k, '#ffd84a', 4);
  const glints = Array.from({ length: 10 }, () => sprite(k, '#fff6c0', 0.6, starTexB()));
  let last = 0; const dur = 2;
  return {
    update(p) {
      const t = p * dur, dt = Math.min(0.05, t - last); last = t;
      flash.position.copy(center).setY(1); flash.scale.setScalar(4 + p * 6); (flash.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - p * 4);
      for (const o of coins) {
        o.v.y -= 16 * dt; o.c.position.addScaledVector(o.v, dt);
        if (o.c.position.y < 0.65 && o.v.y < 0) { o.c.position.y = 0.65; o.v.y *= -0.45; o.v.x *= 0.7; o.v.z *= 0.7; o.w.multiplyScalar(0.6); }
        o.c.rotation.x += o.w.x * dt; o.c.rotation.y += o.w.y * dt; o.c.rotation.z += o.w.z * dt;
        o.c.scale.setScalar(p > 0.75 ? Math.max(0.001, 1 - (p - 0.75) * 4) : 1);
      }
      glints.forEach((s, i) => { const c = coins[(i * 3) % coins.length].c; s.position.copy(c.position); (s.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.sin(t * 9 + i * 2)) * (1 - p); s.material.rotation = t * 3; });
    },
    dispose: k.dispose,
  };
}
const starTexB = () => tex('starb', 64, (g, s) => {
  const c = s / 2; g.fillStyle = '#fff'; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = i % 2 ? s * 0.06 : s * 0.5; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } g.fill();
});

/** Rainbow: prism flash, a real rainbow arch rising over the line, rainbow shockwaves and spinning crystal shards. */
export function rainbowBurst(parent: THREE.Object3D, center: THREE.Vector3): BigFx {
  const k = kit(parent, center.clone().setY(0.7));
  const cols = ['#ff3b3b', '#ff9f1c', '#ffe81c', '#3bff6a', '#1cc8ff', '#5a5bff', '#c03bff'];
  const arch = new THREE.Group(); k.g.add(arch);
  const bands = cols.map((c, i) => { const m = k.mat(new THREE.MeshBasicMaterial({ color: c, ...add() })); arch.add(new THREE.Mesh(k.geo(new THREE.TorusGeometry(3 - i * 0.16, 0.08, 8, 80, Math.PI)), m)); return m; });
  const rings = cols.map((c) => { const m = k.mat(new THREE.MeshBasicMaterial({ color: c, ...add() })); const r = new THREE.Mesh(k.geo(new THREE.TorusGeometry(1, 0.05, 6, 64)), m); r.rotation.x = Math.PI / 2; k.g.add(r); return { r, m }; });
  const shardG = k.geo(new THREE.OctahedronGeometry(0.14, 0));
  const shards = Array.from({ length: 28 }, (_, i) => {
    const m = k.mat(new THREE.MeshStandardMaterial({ color: cols[i % 7], emissive: cols[i % 7], emissiveIntensity: 1.2, flatShading: true, transparent: true }));
    const s = new THREE.Mesh(shardG, m); s.scale.set(0.6, 1.6, 0.6); k.g.add(s);
    const a = (i / 28) * Math.PI * 2; return { s, m, v: new THREE.Vector3(Math.cos(a) * (3 + Math.random() * 2), 3 + Math.random() * 4, Math.sin(a) * (3 + Math.random() * 2)), w: rnd(12) };
  });
  const flash = sprite(k, '#ffffff', 3);
  return {
    update(p) {
      const t = p * 1.8;
      arch.position.y = -1 + Math.min(1, p * 3) * 1.2; arch.scale.setScalar(0.3 + Math.min(1, p * 2.5) * 0.7); arch.rotation.y = 0.3;
      bands.forEach((m, i) => (m.opacity = Math.min(1, p * 5 - i * 0.1) * (1 - Math.max(0, p - 0.55) / 0.45) * 0.85));
      rings.forEach(({ r, m }, i) => { const q = clamp01(p * 2.2 - i * 0.08); r.scale.setScalar(0.01 + q * 6); m.opacity = (1 - q) * (q > 0 ? 0.9 : 0); r.position.y = i * 0.04; });
      shards.forEach((o) => { const q = Math.min(t, 1.2); o.s.position.set(o.v.x * q, o.v.y * q - 4 * q * q, o.v.z * q); o.s.rotation.set(t * o.w, t * o.w * 0.7, 0); o.m.opacity = 1 - p; });
      flash.scale.setScalar(3 + p * 8); (flash.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - p * 3); flash.material.color.setHSL((t * 2) % 1, 1, 0.7);
    },
    dispose: k.dispose,
  };
}

/** Divine: heaven opens — a pillar of light, rotating god rays, a descending double halo, falling feathers; blocks ascend into the light. */
export function divineAscend(parent: THREE.Object3D, center: THREE.Vector3, blocks: THREE.Object3D[], width = 1.4): BigFx {
  const k = kit(parent, center.clone().setY(0));
  const pillarM = k.mat(new THREE.MeshBasicMaterial({ map: pillarTex(), color: '#fff3c0', ...add() }));
  const pillar = new THREE.Mesh(k.geo(new THREE.CylinderGeometry(width, width * 1.2, 16, 40, 1, true)), pillarM); pillar.position.y = 8; k.g.add(pillar);
  const coreM = k.mat(new THREE.MeshBasicMaterial({ map: pillarTex(), color: '#ffffff', ...add() }));
  const core = new THREE.Mesh(k.geo(new THREE.CylinderGeometry(width * 0.35, width * 0.4, 16, 24, 1, true)), coreM); core.position.y = 8; k.g.add(core);
  const rays = new THREE.Group(); rays.position.y = 0.7; k.g.add(rays);
  const rayM = k.mat(new THREE.MeshBasicMaterial({ color: '#ffe9a0', ...add() }));
  for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(0.12, 5)), rayM); r.position.set(0, 0, 0); r.rotation.set(-Math.PI / 2, 0, (i / 12) * Math.PI * 2); r.translateY(2.5); rays.add(r); }
  const haloM = k.mat(new THREE.MeshBasicMaterial({ color: '#ffd84a', ...add() }));
  const halos = [1.2, 0.8].map((r) => { const h = new THREE.Mesh(k.geo(new THREE.TorusGeometry(r, 0.05, 10, 80)), haloM); h.rotation.x = Math.PI / 2; k.g.add(h); return h; });
  const featherG = k.geo(new THREE.PlaneGeometry(0.12, 0.3));
  const featherM = k.mat(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  const feathers = Array.from({ length: 22 }, () => { const f = new THREE.Mesh(featherG, featherM); k.g.add(f); return { f, x: rnd(2.5), z: rnd(2.5), y0: 5 + Math.random() * 5, ph: Math.random() * 7 }; });
  const flash = sprite(k, '#fff6d0', 5); flash.position.y = 1;
  const data = blocks.map((o) => ({ o, p0: o.position.clone(), s0: o.scale.clone(), d: Math.random() * 0.15 }));
  return {
    update(p) {
      const t = p * 2.2; const open = clamp01(p / 0.15); const close = clamp01((p - 0.8) / 0.2);
      const w = open * (1 - close); pillar.scale.set(Math.max(0.01, w), 1, Math.max(0.01, w)); core.scale.set(Math.max(0.01, w * (1 + Math.sin(t * 20) * 0.1)), 1, Math.max(0.01, w));
      pillarM.opacity = 0.55 * w; coreM.opacity = 0.9 * w;
      rays.rotation.y = t * 0.6; rayM.opacity = 0.35 * w * (0.7 + Math.sin(t * 8) * 0.3); rays.scale.setScalar(0.5 + open * 0.7);
      halos.forEach((h, i) => { h.position.y = 6 - Math.min(1, p * 1.6) * (5 - i * 0.5); h.rotation.z = t * (i ? -2 : 2); });
      haloM.opacity = w;
      feathers.forEach((o) => { const y = o.y0 - t * 2.5; o.f.position.set(o.x + Math.sin(t * 3 + o.ph) * 0.4, Math.max(0.7, y), o.z); o.f.rotation.set(Math.sin(t * 4 + o.ph), t * 2 + o.ph, Math.sin(t * 3 + o.ph) * 0.8); });
      featherM.opacity = Math.min(1, p * 4) * (1 - close);
      flash.scale.setScalar(5 + p * 4); (flash.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - p * 2.5);
      for (const b of data) {
        const q = clamp01((p - 0.1 - b.d) / 0.7); const e = q * q;
        b.o.position.set(b.p0.x + (center.x - b.p0.x) * e * 0.6, b.p0.y + e * 9, b.p0.z + (center.z - b.p0.z) * e * 0.6);
        b.o.rotation.y = e * 6; b.o.scale.copy(b.s0).multiplyScalar(Math.max(0.001, 1 - e * 0.8)); b.o.visible = q < 0.99;
      }
    },
    dispose: k.dispose,
  };
}

/** Hellfire: a spiralling fire tornado bursting from the placed piece, with a burning ground ring. */
export function fireTornado(parent: THREE.Object3D, center: THREE.Vector3): BigFx {
  const k = kit(parent, center.clone().setY(0.65));
  const flames = Array.from({ length: 60 }, (_, i) => ({ s: sprite(k, i % 3 ? '#ff7a1a' : '#ffd060', 0.6, flameTex()), a: (i / 60) * Math.PI * 8, h: (i / 60) * 4, d: Math.random() * 0.3 }));
  const ringM = k.mat(new THREE.MeshBasicMaterial({ color: '#ff4a0a', ...add() }));
  const ring = new THREE.Mesh(k.geo(new THREE.TorusGeometry(1, 0.12, 8, 60)), ringM); ring.rotation.x = Math.PI / 2; k.g.add(ring);
  const ground = sprite(k, '#ff3a00', 3);
  return {
    update(p) {
      const t = p * 1.2;
      flames.forEach((o, i) => {
        const q = clamp01((p - o.d * 0.5) * 1.4); const h = o.h * q; const r = 0.25 + h * 0.35 + Math.sin(t * 10 + i) * 0.05; const a = o.a + t * 14;
        o.s.position.set(Math.cos(a) * r, h, Math.sin(a) * r); o.s.scale.set(0.5 + h * 0.15, 0.8 + h * 0.2, 1);
        (o.s.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * q) * (0.6 + Math.random() * 0.4);
      });
      ring.scale.setScalar(0.3 + p * 1.6); ringM.opacity = (1 - p) * (0.7 + Math.random() * 0.3);
      ground.scale.setScalar(2 + Math.sin(t * 30) * 0.3); (ground.material as THREE.SpriteMaterial).opacity = (1 - p) * 0.7;
    },
    dispose: k.dispose,
  };
}

/** Frost: ice crystals erupt from the board around the piece, then shatter into shards with a snowflake wave. */
export function frostBloom(parent: THREE.Object3D, center: THREE.Vector3): BigFx {
  const k = kit(parent, center.clone().setY(0.6));
  const iceM = k.mat(new THREE.MeshPhysicalMaterial({ color: '#bfefff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.85, emissive: '#4ac0ff', emissiveIntensity: 0.4, flatShading: true, clearcoat: 1 }));
  const spikeG = k.geo(new THREE.ConeGeometry(0.16, 1, 6));
  const spikes = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + rnd(0.2); const r = 0.7 + Math.random() * 0.9; const m = new THREE.Mesh(spikeG, iceM);
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); k.g.add(m); return { m, h: 0.6 + Math.random() * 1, d: i * 0.012 };
  });
  const shardG = k.geo(new THREE.TetrahedronGeometry(0.08));
  const shards = Array.from({ length: 30 }, () => { const m = new THREE.Mesh(shardG, iceM); k.g.add(m); const a = Math.random() * 7; return { m, v: new THREE.Vector3(Math.cos(a) * (1 + Math.random() * 3), 2 + Math.random() * 3, Math.sin(a) * (1 + Math.random() * 3)) }; });
  const discM = k.mat(new THREE.MeshBasicMaterial({ map: flakeTex(), color: '#bff4ff', ...add() }));
  const disc = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(1, 1)), discM); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; k.g.add(disc);
  const flakes = Array.from({ length: 16 }, () => ({ s: sprite(k, '#ffffff', 0.35, flakeTex()), a: Math.random() * 7, r: Math.random() * 2, y: 1 + Math.random() * 2 }));
  return {
    update(p) {
      const t = p * 1.4; const grow = clamp01(p / 0.3); const shatter = p > 0.5;
      spikes.forEach((o) => { const g = clamp01((p - o.d) / 0.25); o.m.scale.set(1, Math.max(0.001, o.h * (1 - Math.pow(1 - g, 3)) * (shatter ? 0 : 1)), 1); o.m.position.y = (o.m.scale.y) / 2 * 0.8; });
      shards.forEach((o) => { const q = shatter ? (p - 0.5) * 1.4 : 0; o.m.visible = shatter; o.m.position.set(o.v.x * q, o.v.y * q - 5 * q * q + 0.4, o.v.z * q); o.m.rotation.set(q * 20, q * 14, 0); });
      iceM.opacity = 0.85 * (1 - clamp01((p - 0.7) / 0.3));
      disc.scale.setScalar(0.5 + grow * 4 + (shatter ? (p - 0.5) * 4 : 0)); disc.rotation.z = t; discM.opacity = (1 - p) * 0.8;
      flakes.forEach((o, i) => { o.s.position.set(Math.cos(o.a + t) * (o.r + p), o.y - p * 1.5, Math.sin(o.a + t) * (o.r + p)); o.s.material.rotation = t * 3 + i; (o.s.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * p); });
    },
    dispose: k.dispose,
  };
}

/** Sparks: a crisp starburst of glowing streaks and a flash. */
export function sparkBurst(parent: THREE.Object3D, center: THREE.Vector3): BigFx {
  const k = kit(parent, center.clone().setY(0.75));
  const m = k.mat(new THREE.MeshBasicMaterial({ color: '#fff2b0', ...add() })); const g = k.geo(new THREE.PlaneGeometry(0.05, 0.6));
  const streaks = Array.from({ length: 18 }, (_, i) => { const s = new THREE.Mesh(g, m); const a = (i / 18) * Math.PI * 2; s.rotation.set(-Math.PI / 2, 0, a); k.g.add(s); return { s, a, sp: 1.5 + Math.random() }; });
  const flash = sprite(k, '#ffffff', 1.5, starTexB());
  return {
    update(p) {
      const e = 1 - Math.pow(1 - p, 3);
      streaks.forEach((o) => { const r = e * o.sp; o.s.position.set(-Math.sin(o.a) * r, 0, -Math.cos(o.a) * r); o.s.scale.set(1, Math.max(0.01, (1 - p) * 1.5), 1); });
      m.opacity = 1 - p; flash.scale.setScalar(1.5 + p * 2); flash.material.rotation = p * 3; (flash.material as THREE.SpriteMaterial).opacity = 1 - p;
    },
    dispose: k.dispose,
  };
}
