import * as THREE from 'three';

export interface PetCfg { pet: string; wings?: string; crown?: string; glasses?: string }

type V3 = [number, number, number];
type Anim = (t: number, dt: number, h: number) => void;
type Col = string | ((n: THREE.Vector3) => string);

const mat = (color: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; return o;
}
const S = (r: number) => new THREE.SphereGeometry(r, 24, 18);
const rot = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;

// ---------- textures ----------
const texCache: Record<string, THREE.Texture> = {};
function canvasTex(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (texCache[key] = t);
}
const dotTex = () => canvasTex('dot', 64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const starTex = () => canvasTex('star', 64, (g, s) => {
  const c = s / 2; const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = i % 2 ? s * 0.08 : s * 0.5; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
  g.fill(); g.beginPath(); g.arc(c, c, s * 0.12, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
});
const glyphTex = (ch: string) => canvasTex('g' + ch, 64, (g, s) => {
  g.font = `${s * 0.8}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 8; g.fillText(ch, s / 2, s / 2 + 4);
});

// ---------- particles ----------
interface POpts { count: number; color: string[]; size: number; tex?: THREE.Texture; life: number; gravity?: number; swirl?: number; gate?: (t: number, h: number) => number; spawn: (p: THREE.Vector3) => void; vel: (v: THREE.Vector3) => void; normal?: boolean }
function particles(A: Anim[], o: POpts) {
  const n = o.count; const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3); const base = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: o.size, map: o.tex ?? dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: o.normal ? THREE.NormalBlending : THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false;
  const vel = Array.from({ length: n }, () => new THREE.Vector3()); const age = new Float32Array(n);
  const cols = o.color.map((c) => new THREE.Color(c)); const tmp = new THREE.Vector3();
  const reset = (i: number) => { o.spawn(tmp); pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z; o.vel(vel[i]); age[i] = 0; const c = cols[(Math.random() * cols.length) | 0]; base[i * 3] = c.r; base[i * 3 + 1] = c.g; base[i * 3 + 2] = c.b; };
  for (let i = 0; i < n; i++) { reset(i); age[i] = Math.random() * o.life; }
  A.push((t, dt, h) => {
    const g = o.gate ? o.gate(t, h) : 1;
    for (let i = 0; i < n; i++) {
      age[i] += dt; if (age[i] > o.life) reset(i);
      const v = vel[i]; v.y -= (o.gravity ?? 0) * dt;
      if (o.swirl) { const x = pos[i * 3], z = pos[i * 3 + 2]; v.x += -z * o.swirl * dt; v.z += x * o.swirl * dt; }
      pos[i * 3] += v.x * dt; pos[i * 3 + 1] += v.y * dt; pos[i * 3 + 2] += v.z * dt;
      const f = Math.sin(Math.PI * (age[i] / o.life)) * g;
      col[i * 3] = base[i * 3] * f; col[i * 3 + 1] = base[i * 3 + 1] * f; col[i * 3 + 2] = base[i * 3 + 2] * f;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  });
  return pts;
}

// ---------- fur / scale coat (instanced strands on an ellipsoid) ----------
interface CoatOpts { color: Col; r: number; s: V3; count: number; len?: number; thick?: number; groom?: number; lenFn?: (n: THREE.Vector3) => number; geo?: THREE.BufferGeometry; m?: THREE.Material; jitter?: number }
const furNoise = () => {
  const t = canvasTex('furnoise', 256, (g, s) => {
    const img = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = Math.pow(Math.random(), 1.3) * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
  });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 6); return t;
};
/** Soft, realistic fur via shell texturing: stacked translucent layers of strand noise that taper and droop. */
function shellFur(o: CoatOpts) {
  const len = (o.len ?? 0.08) * 1.15; const [sx, sy, sz] = o.s; const layers = o.count > 400 ? 16 : o.count > 150 ? 10 : 7;
  const base = new THREE.SphereGeometry(o.r, 40, 30); const p = base.attributes.position; const n = new THREE.Vector3(); const c = new THREE.Color();
  const colors = new Float32Array(p.count * 3); const lens = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    n.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    c.set(typeof o.color === 'string' ? o.color : o.color(n)); c.toArray(colors, i * 3); lens[i] = o.lenFn ? o.lenFn(n) : 1;
  }
  base.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const g = new THREE.Group(); g.name = 'fur'; const noise = furNoise();
  for (let l = 1; l <= layers; l++) {
    const f = l / layers; const geo = base.clone(); const gp = geo.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      n.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const d = len * f * lens[i];
      gp.setXYZ(i, (p.getX(i) + n.x * d) * sx, (p.getY(i) + n.y * d - (o.groom ?? 0.4) * len * f * f * 0.8) * sy, (p.getZ(i) + n.z * d) * sz);
    }
    geo.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, alphaMap: noise, alphaTest: 0.25 + f * 0.6, roughness: 1, side: THREE.FrontSide });
    m.color.setScalar(0.55 + f * 0.55); // darker roots, sunlit tips
    const sh = new THREE.Mesh(geo, m); sh.renderOrder = l; g.add(sh);
  }
  base.dispose(); return g;
}
function coat(o: CoatOpts): THREE.Object3D {
  if (!o.geo) return shellFur(o);
  const geo = o.geo;
  const im = new THREE.InstancedMesh(geo, o.m ?? new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide }), o.count);
  const d = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), nn = new THREE.Vector3(), c = new THREE.Color();
  const golden = Math.PI * (3 - Math.sqrt(5)); const [sx, sy, sz] = o.s; const groom = o.groom ?? 0.4;
  for (let i = 0; i < o.count; i++) {
    const y = 1 - (i / (o.count - 1)) * 2; const rad = Math.sqrt(1 - y * y); const th = golden * i;
    n.set(Math.cos(th) * rad, y, Math.sin(th) * rad);
    d.position.set(n.x * o.r * sx, n.y * o.r * sy, n.z * o.r * sz);
    nn.set(n.x / sx + rnd(0.15), n.y / sy - groom + rnd(0.15), n.z / sz + rnd(0.15)).normalize();
    d.quaternion.setFromUnitVectors(up, nn);
    const k = (o.lenFn ? o.lenFn(n) : 1) * (0.65 + Math.random() * 0.7); d.scale.set(1, k, 1); d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    c.set(typeof o.color === 'string' ? o.color : o.color(n)).offsetHSL(rnd(0.01), 0, rnd(o.jitter ?? 0.07)); im.setColorAt(i, c);
  }
  im.name = 'fur'; return im;
}
function part(p: THREE.Object3D, color: Col, r: number, s: V3, pos: V3, count: number, len = 0.08, lenFn?: (n: THREE.Vector3) => number, groom = 0.4) {
  const g = new THREE.Group(); g.position.set(...pos);
  const geo = new THREE.SphereGeometry(r, 32, 24); const ps = geo.attributes.position; const n = new THREE.Vector3(); const c = new THREE.Color();
  const cols = new Float32Array(ps.count * 3);
  for (let i = 0; i < ps.count; i++) { n.set(ps.getX(i), ps.getY(i), ps.getZ(i)).normalize(); c.set(typeof color === 'string' ? color : color(n)).multiplyScalar(0.5); c.toArray(cols, i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.add(mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), 0, 0, 0, ...s));
  g.add(coat({ color, r, s, count, len, lenFn, groom })); p.add(g); return g;
}

// ---------- face details ----------
function eyes(head: THREE.Group, o: { iris: string; big?: number; z?: number; glow?: boolean; lashes?: boolean }) {
  const big = o.big ?? 1; const lids: THREE.Object3D[] = [];
  const white = mat('#ffffff', { roughness: 0.2 }); const iris = mat(o.iris, { roughness: 0.15, emissive: o.glow ? o.iris : '#000', emissiveIntensity: o.glow ? 0.8 : 0 });
  const pupil = mat('#0b0710', { roughness: 0.05, metalness: 0.2 }); const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.16, 0.04, o.z ?? 0.38);
    e.add(mesh(S(0.085 * big), white, 0, 0, 0, 1, 1.12, 0.6));
    e.add(mesh(S(0.066 * big), iris, 0, -0.004, 0.026, 1, 1.12, 0.45));
    e.add(mesh(S(0.038 * big), pupil, 0, -0.004, 0.044, 1, 1.15, 0.4));
    e.add(mesh(S(0.024 * big), shine, 0.026 * s, 0.036, 0.06));
    e.add(mesh(S(0.011 * big), shine, -0.02 * s, -0.03, 0.06));
    if (o.lashes) for (let i = 0; i < 3; i++) { const l = mesh(new THREE.ConeGeometry(0.008, 0.05, 4), pupil, s * (0.04 + i * 0.022), 0.085 - i * 0.012, 0.02); l.rotation.z = -s * (0.7 + i * 0.35); e.add(l); }
    head.add(e); lids.push(e);
  }
  return lids;
}
function mouth(head: THREE.Object3D, y: number, z: number, color = '#5a2a2a') {
  const m = mat(color, { roughness: 0.6 });
  for (const s of [-1, 1]) { const t = mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 14, Math.PI), m, s * 0.03, y, z); t.rotation.z = Math.PI; head.add(t); }
  head.add(mesh(S(0.028), mat('#ff6f8f', { roughness: 0.4 }), 0, y - 0.03, z - 0.012, 1, 0.6, 0.4));
}
function cheeks(head: THREE.Object3D, color: string) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
  for (const s of [-1, 1]) head.add(mesh(S(0.075), m, s * 0.27, -0.1, 0.36, 1, 0.6, 0.35));
}
function paws(root: THREE.Object3D, col: Col, pad: string, front = true) {
  const pm = mat(pad, { roughness: 0.35 });
  for (const s of [-1, 1]) {
    const foot = part(root, col, 0.14, [1, 0.6, 1.25], [s * 0.22, 0.08, 0.14], 160, 0.05);
    foot.add(mesh(S(0.05), pm, 0, -0.01, 0.16, 1.2, 0.8, 0.5));
    for (let i = -1; i <= 1; i++) foot.add(mesh(S(0.022), pm, i * 0.04, 0.03, 0.165, 1, 1, 0.5));
    if (front) part(root, col, 0.1, [1, 1.2, 1], [s * 0.3, 0.42, 0.3], 120, 0.05);
  }
}

// ---------- pets ----------
function buildBody(id: string, A: Anim[], hasWings: boolean) {
  const root = new THREE.Group(); const extra = new THREE.Group(); root.add(extra);
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, 1.08, 0.05); root.add(head);
  const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(0, 0.32, -0.42); root.add(tail);
  const face = (n: THREE.Vector3) => (n.z > 0.55 && n.y < 0.45 ? 0.22 : 1);
  let lids: THREE.Object3D[] = [];

  if (id === 'pet_bunny') {
    const W = '#f7f3ff', P = '#ffb3cf';
    part(root, (n) => (n.z > 0.4 && n.y < 0.4 ? '#ffffff' : W), 0.46, [1, 0.92, 0.95], [0, 0.48, 0], 950, 0.09);
    part(head, W, 0.42, [1.08, 0.95, 1], [0, 0, 0], 900, 0.085, face);
    lids = eyes(head, { iris: '#c9306b', lashes: true, z: 0.39 }); cheeks(head, '#ff8fb8');
    for (const s of [-1, 1]) {
      const ear = new THREE.Group(); ear.name = 'ear'; ear.position.set(s * 0.15, 0.32, -0.02); ear.rotation.z = -s * 0.18; head.add(ear);
      const e = part(ear, W, 0.1, [1, 2.6, 0.55], [0, 0.3, 0], 260, 0.04);
      e.add(mesh(S(0.07), mat(P, { roughness: 0.6 }), 0, 0.02, 0.035, 1, 3.1, 0.3));
    }
    const nose = mesh(S(0.035), mat('#ff6f97', { roughness: 0.3 }), 0, -0.05, 0.43, 1.2, 0.8, 0.7); head.add(nose);
    A.push((t) => nose.scale.set(1.2 + Math.max(0, Math.sin(t * 9)) * 0.15, 0.8, 0.7));
    mouth(head, -0.1, 0.42);
    for (const s of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.035, 0.05, 0.015), mat('#ffffff', { roughness: 0.2 }), s * 0.019, -0.16, 0.415));
    part(tail, '#ffffff', 0.1, [1, 1, 1], [0, 0, -0.02], 300, 0.1, undefined, 0);
    paws(root, W, P);
  } else if (id === 'pet_chick') {
    const Y = '#ffd935';
    const fluff = (n: THREE.Vector3) => (n.z > 0.4 && n.y < 0.3 ? '#fff0a0' : n.y > 0.6 ? '#ffe86a' : Y);
    part(root, fluff, 0.48, [1, 0.94, 0.95], [0, 0.5, 0], 1000, 0.11, undefined, 0.2);
    part(head, '#ffe14a', 0.42, [1.05, 0.98, 1], [0, 0, 0], 900, 0.1, face, 0.15);
    lids = eyes(head, { iris: '#3a2410', big: 1.12, z: 0.39 }); cheeks(head, '#ff9a7a');
    const beakM = mat('#ff8a1a', { roughness: 0.3 });
    const up = mesh(new THREE.ConeGeometry(0.075, 0.15, 16), beakM, 0, -0.05, 0.48, 1, 1, 0.75); up.rotation.x = Math.PI / 2; head.add(up);
    const lo = mesh(new THREE.ConeGeometry(0.055, 0.1, 16), mat('#e8650a'), 0, -0.09, 0.45, 1, 1, 0.6); lo.rotation.x = Math.PI / 2 + 0.25; head.add(lo);
    A.push((t) => (lo.rotation.x = Math.PI / 2 + 0.25 + Math.max(0, Math.sin(t * 3)) * 0.25));
    for (let i = 0; i < 5; i++) { const f = part(head, '#ffe86a', 0.04, [0.7, 2.2, 0.7], [(i - 2) * 0.045, 0.47, -0.02 + Math.abs(i - 2) * 0.02], 60, 0.05); f.rotation.z = (i - 2) * -0.35; }
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.name = 'flap'; w.position.set(s * 0.44, 0.58, 0); root.add(w);
      part(w, Y, 0.17, [0.45, 1, 0.85], [s * 0.05, -0.1, 0], 220, 0.08);
      const leg = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), beakM, s * 0.2, 0.06, 0.05); root.add(leg);
      for (let k = -1; k <= 1; k++) { const toe = mesh(new THREE.CapsuleGeometry(0.018, 0.08, 4, 8), beakM, s * 0.2 + k * 0.04, 0.01, 0.12); toe.rotation.x = Math.PI / 2; toe.rotation.y = k * 0.4; root.add(toe); }
    }
  } else if (id === 'pet_panda') {
    const B = '#1d1b24', Wt = '#fbfbf7';
    const bodyCol = (n: THREE.Vector3) => (Math.abs(n.x) > 0.55 && n.y > -0.3) || n.y < -0.6 || (n.y > 0.55 && n.z < 0.2) ? B : Wt;
    part(root, bodyCol, 0.48, [1, 0.92, 0.95], [0, 0.48, 0], 1000, 0.085);
    part(head, Wt, 0.44, [1.08, 0.95, 1], [0, 0, 0], 950, 0.08, face);
    for (const s of [-1, 1]) {
      part(head, B, 0.13, [1, 1, 0.6], [s * 0.3, 0.33, -0.02], 180, 0.05);
      const patch = mesh(S(0.11), mat(B, { roughness: 0.9 }), s * 0.16, 0.02, 0.37, 1, 1.3, 0.45); patch.rotation.z = s * 0.5; head.add(patch);
    }
    lids = eyes(head, { iris: '#2b1a12', big: 0.9, z: 0.42 }); cheeks(head, '#ffb0c8');
    head.add(mesh(S(0.05), mat('#111', { roughness: 0.2 }), 0, -0.07, 0.44, 1.3, 0.9, 0.7)); mouth(head, -0.13, 0.43);
    paws(root, B, '#55505e');
    // bamboo snack
    const bam = new THREE.Group(); bam.position.set(0.32, 0.5, 0.36); bam.rotation.z = -0.5; root.add(bam);
    const gm = mat('#6fbf4a', { roughness: 0.4 }), jm = mat('#4f9a32');
    for (let i = 0; i < 3; i++) { bam.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 12), gm, 0, i * 0.17, 0)); bam.add(mesh(new THREE.TorusGeometry(0.031, 0.008, 6, 14), jm, 0, i * 0.17 + 0.085, 0, 1)); }
    for (let i = 0; i < 3; i++) { const lf = mesh(S(0.05), mat('#7fd05a', { side: THREE.DoubleSide }), 0.06, 0.42 + i * 0.04, 0, 0.35, 1.6, 0.06); lf.rotation.z = -0.8 + i * 0.6; bam.add(lf); }
    A.push((t) => (bam.rotation.x = Math.sin(t * 1.5) * 0.15));
  } else if (id === 'pet_dragon') {
    const G = '#3fbf74';
    const scaleGeo = new THREE.CylinderGeometry(0.042, 0.03, 0.014, 6);
    const scaleM = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.35 });
    const dcol = (n: THREE.Vector3) => (n.z > 0.45 && n.y < 0.4 ? '#ffd88a' : n.y > 0.6 ? '#2a9a5a' : G);
    const b = new THREE.Group(); b.position.set(0, 0.48, 0); root.add(b);
    b.add(mesh(S(0.47), mat(G, { roughness: 0.4 }), 0, 0, 0, 1, 0.92, 0.95));
    b.add(coat({ color: dcol, r: 0.475, s: [1, 0.92, 0.95], count: 650, geo: scaleGeo, m: scaleM, groom: 0.25, jitter: 0.1 }));
    for (let i = 0; i < 5; i++) b.add(mesh(new THREE.TorusGeometry(0.2 - Math.abs(i - 2) * 0.03, 0.03, 8, 20, Math.PI), mat('#ffcf6a', { roughness: 0.3, metalness: 0.2 }), 0, 0.15 - i * 0.1, 0.38 - Math.abs(i - 2) * 0.03, 1, 1, 0.5));
    head.add(mesh(S(0.43), mat(G, { roughness: 0.4 }), 0, 0, 0, 1.08, 0.95, 1));
    head.add(coat({ color: (n) => (n.z > 0.6 && n.y < 0 ? '#ffd88a' : G), r: 0.435, s: [1.08, 0.95, 1], count: 500, geo: scaleGeo, m: scaleM, groom: 0.1 }));
    head.add(mesh(S(0.2), mat('#5ad08a', { roughness: 0.35 }), 0, -0.1, 0.34, 1.2, 0.8, 0.9));
    lids = eyes(head, { iris: '#ffb020', glow: true, z: 0.37 }); cheeks(head, '#ff9ab0');
    for (const s of [-1, 1]) head.add(mesh(S(0.022), mat('#1f4a2e'), s * 0.07, -0.06, 0.52));
    const horn = mat('#fff1c0', { roughness: 0.25, metalness: 0.1 });
    for (const s of [-1, 1]) {
      const hg = new THREE.Group(); hg.position.set(s * 0.2, 0.36, -0.05); hg.rotation.z = -s * 0.35; head.add(hg);
      for (let i = 0; i < 4; i++) { const c = mesh(new THREE.CylinderGeometry(0.06 - i * 0.014, 0.07 - i * 0.014, 0.09, 12), horn, 0, i * 0.08, -i * i * 0.012); c.rotation.x = -0.25 * i; hg.add(c); }
      hg.add(mesh(new THREE.ConeGeometry(0.02, 0.08, 10), horn, 0, 0.34, -0.12));
      const fin = mesh(new THREE.ConeGeometry(0.08, 0.2, 3), mat('#ff8a5a', { roughness: 0.4 }), s * 0.42, 0.05, -0.05, 1, 1, 0.25); fin.rotation.z = -s * 1.2; head.add(fin);
    }
    const spike = mat('#ff7a4a', { roughness: 0.3, emissive: '#ff3a00', emissiveIntensity: 0.25 });
    for (let i = 0; i < 7; i++) { const a = 0.9 - i * 0.32; const sp = mesh(new THREE.ConeGeometry(0.06 - i * 0.004, 0.16, 5), spike, 0, 0.48 + Math.cos(a) * 0.46, Math.sin(a) * -0.46 - 0.02); sp.rotation.x = -a; extra.add(sp); }
    let segP: THREE.Object3D = tail;
    for (let i = 0; i < 7; i++) {
      const sg = new THREE.Group(); sg.name = 'tailseg'; sg.userData.i = i; sg.position.set(0, i ? -0.01 : 0, i ? -0.09 : 0); segP.add(sg);
      sg.add(mesh(S(0.11 - i * 0.012), mat(G, { roughness: 0.35, metalness: 0.2 }), 0, 0, 0, 1, 0.9, 1.2));
      if (i % 2) sg.add(mesh(new THREE.ConeGeometry(0.035, 0.09, 5), spike, 0, 0.09, 0));
      segP = sg;
    }
    const spade = mesh(new THREE.OctahedronGeometry(0.09), spike, 0, 0.02, -0.1, 0.4, 1, 1.4); segP.add(spade);
    paws(root, G, '#2a8a50');
    if (!hasWings) {
      for (const s of [-1, 1]) {
        const pv = new THREE.Group(); pv.name = 'wing'; pv.userData.side = s; pv.position.set(s * 0.15, 0.85, -0.42); root.add(pv);
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.55, 0.35); sh.quadraticCurveTo(0.45, 0.1, 0.5, -0.05); sh.quadraticCurveTo(0.38, 0.02, 0.36, -0.12); sh.quadraticCurveTo(0.25, -0.02, 0.2, -0.16); sh.quadraticCurveTo(0.1, -0.05, 0, 0);
        const mem = mesh(new THREE.ShapeGeometry(sh, 16), mat('#ff9a5a', { side: THREE.DoubleSide, transparent: true, opacity: 0.85, emissive: '#ff4a10', emissiveIntensity: 0.3 })); mem.scale.x = s; pv.add(mem);
        for (const [x, y] of [[0.55, 0.35], [0.5, -0.05], [0.36, -0.12], [0.2, -0.16]]) { const l = Math.hypot(x, y); const bn = mesh(new THREE.CylinderGeometry(0.012, 0.018, l, 6), mat('#2a9a5a'), (s * x) / 2, y / 2, 0.005); bn.rotation.z = Math.atan2(y, s * x) - Math.PI / 2; pv.add(bn); }
      }
    }
    head.add(particles(A, { count: 40, color: ['#ff7a1a', '#ffd040', '#ff3a00'], size: 0.07, life: 0.7, gravity: -0.4,
      gate: (t, h) => Math.max(h, Math.max(0, Math.sin(t * 0.9)) ** 6),
      spawn: (p) => p.set(rnd(0.03), -0.06, 0.55), vel: (v) => v.set(rnd(0.15), rnd(0.1) + 0.05, 0.6 + Math.random() * 0.4) }));
  } else {
    // cat (default) — orange tabby
    const O = '#ffaa55', D = '#d36f24', C = '#fff1dc';
    const bodyCol = (n: THREE.Vector3) => (n.z > 0.45 && n.y < 0.4 ? C : Math.sin(Math.atan2(n.x, n.z) * 7) > 0.5 && n.z < 0.35 ? D : O);
    const headCol = (n: THREE.Vector3) => (n.z > 0.68 && n.y < 0.05 ? C : n.y > 0.45 && Math.sin(n.x * 28) > 0.45 ? D : O);
    part(root, bodyCol, 0.47, [1, 0.92, 0.95], [0, 0.48, 0], 1000, 0.085);
    part(head, headCol, 0.43, [1.1, 0.95, 1], [0, 0, 0], 950, 0.08, face);
    lids = eyes(head, { iris: '#38b46a', z: 0.39, lashes: true }); cheeks(head, '#ff8fa8');
    for (const s of [-1, 1]) {
      const eg = new THREE.Group(); eg.name = 'ear'; eg.position.set(s * 0.25, 0.34, 0); eg.rotation.z = -s * 0.35; head.add(eg);
      eg.add(mesh(new THREE.ConeGeometry(0.15, 0.3, 24), mat(O, { roughness: 0.9 }), 0, 0.08, 0, 1, 1, 0.55));
      eg.add(mesh(new THREE.ConeGeometry(0.09, 0.2, 20), mat('#ff9ab0', { roughness: 0.6 }), 0, 0.06, 0.04, 1, 1, 0.3));
      const tuft = coat({ color: '#fff5ea', r: 0.05, s: [1, 1.4, 0.4], count: 40, len: 0.07, groom: -0.6 }); tuft.position.set(0, 0.02, 0.05); eg.add(tuft);
      for (let k = 0; k < 3; k++) { const w = mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.3, 4), mat('#ffffff', { roughness: 0.3 }), s * 0.32, -0.08 - k * 0.025, 0.36); w.rotation.z = Math.PI / 2 + s * (k - 1) * 0.15; head.add(w); }
    }
    head.add(mesh(new THREE.SphereGeometry(0.04, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.6), mat('#ff7a9a', { roughness: 0.3 }), 0, -0.05, 0.44, 1.2, 0.8, 0.8));
    mouth(head, -0.1, 0.43);
    let segP: THREE.Object3D = tail;
    for (let i = 0; i < 8; i++) {
      const sg = new THREE.Group(); sg.name = 'tailseg'; sg.userData.i = i; sg.position.set(0, i ? 0.08 : 0, i ? -0.03 : 0); segP.add(sg);
      part(sg, i > 5 ? C : i % 2 ? D : O, 0.065, [1, 1.2, 1], [0, 0, 0], 90, 0.06);
      segP = sg;
    }
    tail.rotation.x = -0.5;
    paws(root, O, '#ff9ab0');
  }
  root.userData.lids = lids;
  return root;
}

// ---------- wings ----------
const featherTex = () => canvasTex('feather', 128, (g, sz) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, sz, sz);
  for (let y = 0; y < sz; y += 3) for (const sd of [-1, 1]) { g.strokeStyle = `rgba(150,140,130,${0.15 + Math.random() * 0.25})`; g.lineWidth = 1; g.beginPath(); g.moveTo(sz / 2, y); g.quadraticCurveTo(sz / 2 + sd * sz * 0.25, y + 6, sz / 2 + sd * sz * 0.5, y + 16); g.stroke(); }
  g.fillStyle = 'rgba(200,180,140,0.9)'; g.fillRect(sz / 2 - 1.5, 0, 3, sz);
});
function featherGeo(len: number, w: number) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, len * 0.3, w * 0.55, len * 0.85); s.quadraticCurveTo(0.01, len * 1.06, -w * 0.3, len * 0.86); s.quadraticCurveTo(-w * 0.55, len * 0.35, 0, 0);
  return uvFit(new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.004, bevelSegments: 1, curveSegments: 10 }));
}
function angelWing(A: Anim[]) {
  const g = new THREE.Group();
  const rows = [
    { n: 9, len: 0.6, w: 0.07, col: '#ffffff', z: 0, spread: [-0.15, -1.55] },
    { n: 8, len: 0.42, w: 0.065, col: '#fffaf0', z: 0.015, spread: [-0.25, -1.45] },
    { n: 8, len: 0.26, w: 0.06, col: '#fff6e0', z: 0.03, spread: [-0.4, -1.35] },
    { n: 7, len: 0.14, w: 0.05, col: '#fff1c8', z: 0.045, spread: [-0.6, -1.3] },
  ];
  const rach = mat('#e8d28a', { metalness: 0.6, roughness: 0.3 }); const tip = mat('#ffd75a', { metalness: 0.9, roughness: 0.2, emissive: '#a07000', emissiveIntensity: 0.4 });
  rows.forEach((r, ri) => {
    const geo = featherGeo(r.len, r.w); const m = mat(r.col, { map: featherTex(), roughness: 0.55, side: THREE.DoubleSide, emissive: '#fff4d0', emissiveIntensity: 0.15 });
    for (let i = 0; i < r.n; i++) {
      const k = i / (r.n - 1); const pv = new THREE.Group(); pv.position.set(0.03 + k * 0.26 * (1 - ri * 0.15), 0.03 * ri, r.z);
      pv.rotation.z = r.spread[0] + (r.spread[1] - r.spread[0]) * k; g.add(pv);
      const f = new THREE.Mesh(geo, m); f.castShadow = true; pv.add(f);
      pv.add(mesh(new THREE.CylinderGeometry(0.004, 0.0025, r.len * 0.9, 4), rach, 0, r.len * 0.45, 0.012));
      if (ri === 0) pv.add(mesh(S(0.012), tip, 0, r.len * 0.98, 0.01));
      const ph = i * 0.6 + ri;
      A.push((t, _dt, h) => { pv.rotation.x = Math.sin(t * (3 + h * 6) + ph) * 0.06; });
    }
  });
  g.add(rot(mesh(new THREE.CapsuleGeometry(0.035, 0.28, 4, 10), mat('#fffaf0', { roughness: 0.6 }), 0.15, 0.03, 0.05, 1), 0, 0, Math.PI / 2 - 0.25));
  return g;
}
function butterflyTex() {
  return canvasTex('bfly', 256, (g, s) => {
    const gr = g.createRadialGradient(s * 0.1, s * 0.5, 4, s * 0.1, s * 0.5, s);
    gr.addColorStop(0, '#ffe3f8'); gr.addColorStop(0.3, '#ff6ad5'); gr.addColorStop(0.6, '#9a5bff'); gr.addColorStop(0.85, '#3ad7ff'); gr.addColorStop(1, '#1a1035');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(30,10,50,0.85)'; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const a = -1.3 + i * 0.32; g.beginPath(); g.moveTo(s * 0.05, s * 0.5); g.quadraticCurveTo(s * 0.4, s * 0.5 + Math.sin(a) * s * 0.2, s * 0.05 + Math.cos(a) * s, s * 0.5 + Math.sin(a) * s); g.stroke(); }
    g.lineWidth = 10; g.strokeStyle = '#140a28'; g.strokeRect(0, 0, s, s);
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(s * (0.75 + Math.random() * 0.2), s * Math.random(), 3 + Math.random() * 5, 0, 7); g.fill(); }
    g.fillStyle = '#1a0a30'; g.beginPath(); g.arc(s * 0.55, s * 0.32, 26, 0, 7); g.fill();
    g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(s * 0.55, s * 0.32, 18, 0, 7); g.fill();
    g.fillStyle = '#3ad7ff'; g.beginPath(); g.arc(s * 0.55, s * 0.32, 10, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 0.53, s * 0.3, 4, 0, 7); g.fill();
  });
}
function uvFit(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox(); const b = geo.boundingBox!; const p = geo.attributes.position; const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  uv.needsUpdate = true; return geo;
}
function butterflyWing(A: Anim[]) {
  const g = new THREE.Group(); const tex = butterflyTex();
  const m = mat('#ffffff', { map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.45, transparent: true, opacity: 0.92, side: THREE.DoubleSide, roughness: 0.25, metalness: 0.2 });
  const fw = new THREE.Shape(); fw.moveTo(0, 0); fw.bezierCurveTo(0.1, 0.35, 0.45, 0.6, 0.62, 0.5); fw.bezierCurveTo(0.7, 0.35, 0.55, 0.1, 0, 0);
  const hw = new THREE.Shape(); hw.moveTo(0, 0); hw.bezierCurveTo(0.35, -0.02, 0.52, -0.2, 0.42, -0.42); hw.bezierCurveTo(0.35, -0.55, 0.22, -0.45, 0.25, -0.58); hw.bezierCurveTo(0.12, -0.42, 0.05, -0.2, 0, 0);
  const fore = new THREE.Group(), hind = new THREE.Group(); g.add(fore, hind);
  fore.add(mesh(uvFit(new THREE.ShapeGeometry(fw, 24)), m)); hind.add(mesh(uvFit(new THREE.ShapeGeometry(hw, 24)), m));
  const glow = new THREE.MeshBasicMaterial({ color: '#ff9af0', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const fg = mesh(new THREE.ShapeGeometry(fw, 24), glow, -0.02, -0.01, -0.01, 1.08); fore.add(fg);
  A.push((t, _dt, h) => { hind.rotation.y = Math.sin(t * (8 + h * 10) - 0.6) * 0.25; m.emissiveIntensity = 0.35 + Math.sin(t * 3) * 0.2; m.emissive.setHSL((t * 0.08) % 1, 0.5, 0.75); glow.opacity = 0.18 + Math.sin(t * 4) * 0.1; });
  g.add(particles(A, { count: 30, color: ['#ff9af0', '#9adfff', '#ffffff', '#ffe27a'], size: 0.05, tex: starTex(), life: 1.6, gravity: 0.15,
    spawn: (p) => p.set(Math.random() * 0.55, rnd(0.4), 0.02), vel: (v) => v.set(rnd(0.05), -0.05, rnd(0.05)) }));
  return g;
}
function phoenixWing(A: Anim[]) {
  const g = new THREE.Group(); const cols = ['#c2140a', '#ff4a0a', '#ff8a1a', '#ffc23a', '#fff07a'];
  for (let r = 0; r < 4; r++) {
    const n = 8 - r; const len = 0.62 - r * 0.13;
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.06, len * 0.3, 0.08, len * 0.7, 0.025, len); sh.bezierCurveTo(0.0, len * 0.85, -0.03, len * 0.9, -0.04, len * 0.75); sh.bezierCurveTo(-0.05, len * 0.4, -0.03, len * 0.15, 0, 0);
    const geo = uvFit(new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 1, curveSegments: 10 }));
    const m = mat(cols[r], { map: featherTex(), emissive: cols[r + 1], emissiveIntensity: 1.3, roughness: 0.4, side: THREE.DoubleSide });
    const gm = new THREE.MeshBasicMaterial({ color: cols[r + 1], transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1); const pv = new THREE.Group(); pv.position.set(0.03 + k * 0.24, 0.03 * r, r * 0.015); pv.rotation.z = -0.15 - r * 0.12 - k * (1.35 - r * 0.1); g.add(pv);
      pv.add(new THREE.Mesh(geo, m)); const glow = mesh(geo, gm, 0, -0.01, -0.005, 1.35, 1.12, 1); pv.add(glow);
      const ph = i * 1.7 + r * 0.9;
      A.push((t) => { const f = 1 + Math.sin(t * 13 + ph) * 0.07 + Math.sin(t * 7.3 + ph) * 0.05; pv.scale.set(1, f, 1); pv.rotation.x = Math.sin(t * 5 + ph) * 0.08; glow.material === gm && (gm.opacity = 0.28 + Math.sin(t * 9) * 0.08); });
    }
  }
  g.add(particles(A, { count: 45, color: ['#ff4a0a', '#ffa21a', '#ffe060', '#ff2a00'], size: 0.06, life: 1.1, gravity: -0.55,
    spawn: (p) => { const a = -0.2 - Math.random() * 1.4; const r = Math.random() * 0.55; p.set(Math.cos(a + Math.PI / 2) * r * -1 + 0.05, Math.sin(a + Math.PI / 2) * r, 0.02); }, vel: (v) => v.set(rnd(0.1), 0.1, rnd(0.08)) }));
  return g;
}
function wings(id: string, A: Anim[]) {
  const root = new THREE.Group(); root.name = 'wings'; root.position.set(0, 0.72, -0.48);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.name = 'wing'; pivot.userData.side = s;
    const w = id === 'wings_butterfly' ? butterflyWing(A) : id === 'wings_fire' ? phoenixWing(A) : angelWing(A);
    if (id !== 'wings_butterfly') w.rotation.z = Math.PI / 2 + 0.2;
    w.scale.x = s; pivot.add(w); pivot.position.x = s * 0.1; root.add(pivot);
  }
  if (id === 'wings_fire') {
    const light = new THREE.PointLight('#ff6a1a', 1.2, 2.5); light.position.set(0, 0.2, -0.2); root.add(light);
    A.push((t) => (light.intensity = 1 + Math.sin(t * 17) * 0.25 + Math.sin(t * 6.1) * 0.2));
  }
  if (id === 'wings_angel') {
    const halo = mesh(new THREE.TorusGeometry(0.5, 0.012, 8, 60), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.15, -0.05);
    root.add(halo); A.push((t) => { halo.rotation.z = t * 0.4; (halo.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 2) * 0.2; });
    root.add(particles(A, { count: 20, color: ['#ffffff', '#fff3c0'], size: 0.07, tex: glyphTex('✦'), life: 3, gravity: 0.03, normal: false,
      spawn: (p) => p.set(rnd(0.7), 0.3 + Math.random() * 0.4, rnd(0.15)), vel: (v) => v.set(rnd(0.08), -0.08, rnd(0.04)) }));
  }
  return root;
}

// ---------- crowns ----------
function goldCrown(g: THREE.Group, A: Anim[]) {
  const gold = phys({ color: '#ffc93a', metalness: 1, roughness: 0.18, clearcoat: 1, emissive: '#5a3a00', emissiveIntensity: 0.25 });
  const R = 0.2;
  g.add(mesh(new THREE.CylinderGeometry(R, R * 1.06, 0.12, 40, 1, true), phys({ color: '#ffc93a', metalness: 1, roughness: 0.22, side: THREE.DoubleSide })));
  g.add(rot(mesh(new THREE.TorusGeometry(R * 1.06, 0.018, 10, 48), gold, 0, -0.06, 0), Math.PI / 2));
  g.add(rot(mesh(new THREE.TorusGeometry(R, 0.014, 10, 48), gold, 0, 0.06, 0), Math.PI / 2));
  // velvet cap + ermine trim
  g.add(mesh(new THREE.SphereGeometry(R * 0.96, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#a0102a', { roughness: 0.95 }), 0, 0.02, 0, 1, 0.8, 1));
  const erm = new THREE.InstancedMesh(S(0.022), mat('#ffffff', { roughness: 1 }), 60); const d = new THREE.Object3D();
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; d.position.set(Math.cos(a) * R * 1.1, -0.075 + rnd(0.008), Math.sin(a) * R * 1.1); d.scale.setScalar(0.9 + Math.random() * 0.4); d.updateMatrix(); erm.setMatrixAt(i, d.matrix); }
  g.add(erm);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; g.add(mesh(S(0.008), mat('#111'), Math.cos(a) * R * 1.15, -0.072, Math.sin(a) * R * 1.15, 0.8, 1.6, 0.8)); }
  const gems = [['#ff1a3a', '#ff0030'], ['#1a6aff', '#0040ff'], ['#1aff7a', '#00c050']];
  const pearl = phys({ color: '#fff8f0', roughness: 0.15, metalness: 0, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffd8f0') });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2; const x = Math.cos(a) * R, z = Math.sin(a) * R; const big = i % 2 === 0;
    const p = mesh(new THREE.ConeGeometry(0.045, big ? 0.17 : 0.1, 4), gold, x, 0.06 + (big ? 0.085 : 0.05), z); p.rotation.y = -a; g.add(p);
    g.add(mesh(S(big ? 0.028 : 0.018), pearl, x, 0.06 + (big ? 0.18 : 0.11), z));
    const [c, e] = gems[i % 3]; const gm = phys({ color: c, emissive: e, emissiveIntensity: 0.5, roughness: 0.05, clearcoat: 1, flatShading: true });
    const gem = mesh(new THREE.OctahedronGeometry(0.03), gm, Math.cos(a) * R * 1.07, 0, Math.sin(a) * R * 1.07, 1, 1.25, 0.6); gem.lookAt(gem.position.clone().multiplyScalar(3)); g.add(gem);
    const bezel = mesh(new THREE.TorusGeometry(0.033, 0.006, 6, 18), gold, gem.position.x, 0, gem.position.z); bezel.lookAt(bezel.position.clone().multiplyScalar(3)); g.add(bezel);
    for (const sgn of [-1, 1]) { const fa = a + sgn * 0.2; const fl = mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 12), gold, Math.cos(fa) * R * 1.07, 0.035, Math.sin(fa) * R * 1.07); fl.lookAt(fl.position.clone().multiplyScalar(3)); g.add(fl); }
  }
  // orb + cross on top
  const top = new THREE.Group(); top.position.y = 0.22; g.add(top);
  top.add(mesh(S(0.045), gold)); top.add(rot(mesh(new THREE.TorusGeometry(0.046, 0.006, 6, 24), gold, 0, 0, 0), 0, Math.PI / 2));
  top.add(mesh(new THREE.BoxGeometry(0.018, 0.09, 0.018), gold, 0, 0.08, 0)); top.add(mesh(new THREE.BoxGeometry(0.06, 0.018, 0.018), gold, 0, 0.09, 0));
  top.add(mesh(new THREE.OctahedronGeometry(0.014), phys({ color: '#ff2a4a', emissive: '#ff0030', emissiveIntensity: 1, flatShading: true }), 0, 0.09, 0.012));
  const orbit = new THREE.Group(); g.add(orbit);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; orbit.add(mesh(new THREE.OctahedronGeometry(0.022), new THREE.MeshBasicMaterial({ color: '#fff2a0' }), Math.cos(a) * 0.36, 0.08 + Math.sin(a * 2) * 0.04, Math.sin(a) * 0.36)); }
  A.push((t) => { orbit.rotation.y = t * 1.4; top.rotation.y = Math.sin(t) * 0.3; });
  g.add(particles(A, { count: 26, color: ['#fff2a0', '#ffffff', '#ffd040'], size: 0.06, tex: starTex(), life: 1.2,
    spawn: (p) => { const a = Math.random() * Math.PI * 2; p.set(Math.cos(a) * R * 1.1, Math.random() * 0.28 - 0.05, Math.sin(a) * R * 1.1); }, vel: (v) => v.set(0, 0.03, 0) }));
}
function diamondCrown(g: THREE.Group, A: Anim[]) {
  const silver = phys({ color: '#e8f4ff', metalness: 1, roughness: 0.08, clearcoat: 1 });
  const ice = phys({ color: '#c8f2ff', metalness: 0, roughness: 0.02, transparent: true, opacity: 0.78, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, emissive: '#3ab8ff', emissiveIntensity: 0.35, flatShading: true });
  const R = 0.2;
  g.add(mesh(new THREE.CylinderGeometry(R, R * 1.05, 0.07, 40, 1, true), phys({ color: '#e8f4ff', metalness: 1, roughness: 0.1, side: THREE.DoubleSide }), 0, -0.03, 0));
  for (const y of [-0.065, 0.005]) g.add(rot(mesh(new THREE.TorusGeometry(R * (y < 0 ? 1.05 : 1), 0.012, 8, 48), silver, 0, y, 0), Math.PI / 2));
  const tiny = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.012), phys({ color: '#ffffff', emissive: '#bfefff', emissiveIntensity: 0.8, flatShading: true }), 48); const d = new THREE.Object3D();
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; d.position.set(Math.cos(a) * R * 1.04, -0.03 + (i % 2) * 0.02, Math.sin(a) * R * 1.04); d.rotation.set(rnd(1), a, 0); d.updateMatrix(); tiny.setMatrixAt(i, d.matrix); }
  g.add(tiny);
  const spikes: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2; const hgt = i % 3 === 0 ? 0.24 : 0.15;
    const sp = mesh(new THREE.OctahedronGeometry(0.05, 0), ice, Math.cos(a) * R * 0.95, 0.02 + hgt / 2, Math.sin(a) * R * 0.95, 0.7, hgt / 0.1, 0.7);
    sp.rotation.y = a; sp.rotation.z = -Math.cos(a) * 0.12; sp.rotation.x = Math.sin(a) * 0.12; g.add(sp); spikes.push(sp);
  }
  const heart = mesh(new THREE.OctahedronGeometry(0.06, 0), phys({ color: '#9ae6ff', emissive: '#4ad0ff', emissiveIntensity: 1.2, roughness: 0, clearcoat: 1, flatShading: true, transparent: true, opacity: 0.9 }), 0, 0.22, 0, 1, 1.5, 1); g.add(heart);
  const rays = new THREE.Group(); rays.position.y = 0.22; g.add(rays);
  const rm = new THREE.MeshBasicMaterial({ color: '#bff4ff', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) { const r = mesh(new THREE.PlaneGeometry(0.02, 0.5), rm, 0, 0, 0); r.rotation.z = (i / 8) * Math.PI; rays.add(r); }
  const lt = new THREE.PointLight('#7ad8ff', 0.8, 1.6); lt.position.y = 0.25; g.add(lt);
  A.push((t) => { heart.rotation.y = t * 1.8; rays.rotation.z = t * 0.5; rays.lookAt(rays.position.clone().add(new THREE.Vector3(0, 0, 1))); rm.opacity = 0.15 + Math.abs(Math.sin(t * 2)) * 0.25; rays.scale.setScalar(0.8 + Math.sin(t * 3) * 0.2);
    spikes.forEach((s, i) => (((s.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3 + Math.max(0, Math.sin(t * 2.5 + i)) * 0.5))); lt.intensity = 0.6 + Math.sin(t * 4) * 0.3; });
  g.add(particles(A, { count: 34, color: ['#ffffff', '#bff4ff', '#7ad8ff'], size: 0.06, tex: glyphTex('❄'), life: 2.4, swirl: 2.2, normal: false,
    spawn: (p) => { const a = Math.random() * Math.PI * 2; p.set(Math.cos(a) * 0.32, Math.random() * 0.3, Math.sin(a) * 0.32); }, vel: (v) => v.set(0, rnd(0.03), 0) }));
}
function crown(id: string, A: Anim[]) {
  const g = new THREE.Group(); g.name = 'crown'; g.position.set(0, 0.47, -0.02); g.rotation.z = 0.12;
  if (id === 'crown_diamond') diamondCrown(g, A); else goldCrown(g, A);
  return g;
}

// ---------- glasses ----------
function tube(shape: THREE.Shape, r: number, m: THREE.Material) {
  const pts = shape.getPoints(30).map((p) => new THREE.Vector3(p.x, p.y, 0));
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, r, 6, true), m);
}
function temples(g: THREE.Group, m: THREE.Material, w = 0.26) {
  for (const s of [-1, 1]) { const tm = mesh(new THREE.BoxGeometry(0.012, 0.018, 0.4), m, s * w, 0.02, -0.2); tm.rotation.y = -s * 0.25; g.add(tm); g.add(mesh(new THREE.SphereGeometry(0.014, 10, 8), m, s * w, 0.02, 0)); }
}
function glasses(id: string, A: Anim[]) {
  const g = new THREE.Group(); g.name = 'glasses'; g.position.set(0, 0.05, 0.47);
  if (id === 'glasses_cool') {
    const lens = new THREE.Shape(); lens.moveTo(-0.09, 0.05); lens.bezierCurveTo(-0.02, 0.07, 0.08, 0.07, 0.1, 0.03); lens.bezierCurveTo(0.11, -0.05, 0.04, -0.1, -0.02, -0.09); lens.bezierCurveTo(-0.1, -0.07, -0.11, 0.01, -0.09, 0.05);
    const frame = phys({ color: '#d8b25a', metalness: 1, roughness: 0.15, clearcoat: 1 });
    const lm = phys({ color: '#141822', metalness: 0.9, roughness: 0.04, clearcoat: 1, iridescence: 0.8, transparent: true, opacity: 0.93 });
    const shineM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const s of [-1, 1]) {
      const l = new THREE.Group(); l.position.x = s * 0.14; l.scale.x = s; g.add(l);
      l.add(mesh(new THREE.ShapeGeometry(lens, 20), lm)); l.add(tube(lens, 0.008, frame));
      const sh = mesh(new THREE.PlaneGeometry(0.025, 0.18), shineM, 0, 0, 0.006); sh.rotation.z = 0.6; l.add(sh);
      A.push((t) => { const k = (t * 0.5) % 1.6; sh.position.x = -0.12 + k * 0.2; shineM.opacity = k < 1.2 ? Math.sin((k / 1.2) * Math.PI) * 0.7 : 0; });
      g.add(mesh(S(0.012), phys({ color: '#ffffff', transparent: true, opacity: 0.6, roughness: 0 }), s * 0.04, -0.05, -0.02));
    }
    for (const y of [0.045, 0.06]) g.add(rot(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 6), frame, 0, y, 0), 0, 0, Math.PI / 2));
    temples(g, frame);
  } else if (id === 'glasses_neon') {
    const frame = mat('#00f0ff', { emissive: '#00f0ff', emissiveIntensity: 2 });
    const scan = canvasTex('scan', 64, (c, s) => { for (let y = 0; y < s; y += 4) { c.fillStyle = `rgba(255,${80 + y * 2},230,${0.4 + (y % 8 ? 0 : 0.4)})`; c.fillRect(0, y, s, 2); } });
    scan.wrapS = scan.wrapT = THREE.RepeatWrapping;
    const lens = new THREE.MeshBasicMaterial({ map: scan, color: '#ff2bd6', transparent: true, opacity: 0.75, depthWrite: false });
    const glowM = new THREE.MeshBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const rect = new THREE.Shape(); rect.moveTo(-0.1, 0.06); rect.lineTo(0.1, 0.07); rect.lineTo(0.09, -0.06); rect.lineTo(-0.08, -0.07); rect.lineTo(-0.1, 0.06);
    for (const s of [-1, 1]) {
      const l = new THREE.Group(); l.position.x = s * 0.14; l.scale.x = s; g.add(l);
      l.add(mesh(new THREE.ShapeGeometry(rect), lens, 0, 0, -0.003)); l.add(tube(rect, 0.011, frame)); l.add(tube(rect, 0.03, glowM));
    }
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.016, 0.016), frame, 0, 0.04, 0)); temples(g, frame);
    A.push((t) => { const c = new THREE.Color().setHSL((t * 0.15) % 1, 1, 0.55); frame.color.copy(c); frame.emissive.copy(c); glowM.color.copy(c); glowM.opacity = 0.25 + Math.sin(t * 6) * 0.12; scan.offset.y = -t * 0.6; });
    g.add(particles(A, { count: 16, color: ['#00f0ff', '#ff2bd6', '#ffffff'], size: 0.035, life: 0.6,
      spawn: (p) => p.set(rnd(0.24), rnd(0.07), 0.01), vel: (v) => v.set(rnd(0.3), rnd(0.3), 0.1) }));
  } else {
    const heart = new THREE.Shape(); heart.moveTo(0, -0.08); heart.bezierCurveTo(-0.15, 0.01, -0.09, 0.12, 0, 0.05); heart.bezierCurveTo(0.09, 0.12, 0.15, 0.01, 0, -0.08);
    const frame = phys({ color: '#ff2a6a', roughness: 0.15, clearcoat: 1, emissive: '#ff0050', emissiveIntensity: 0.4 });
    const lm = phys({ color: '#ff8ab0', transparent: true, opacity: 0.6, roughness: 0, clearcoat: 1, emissive: '#ff3a7a', emissiveIntensity: 0.5 });
    const ls: THREE.Group[] = [];
    for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.x = s * 0.15; g.add(l); ls.push(l); l.add(mesh(new THREE.ShapeGeometry(heart, 20), lm)); l.add(tube(heart, 0.011, frame)); l.add(mesh(S(0.015), new THREE.MeshBasicMaterial({ color: '#fff' }), -0.04, 0.04, 0.01)); }
    g.add(mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 14, Math.PI), frame, 0, 0.01, 0)); temples(g, frame, 0.27);
    A.push((t) => { const p = 1 + Math.max(0, Math.sin(t * 6)) ** 4 * 0.12; ls.forEach((l) => l.scale.setScalar(p)); });
    g.add(particles(A, { count: 14, color: ['#ff4a8a', '#ff8ab8', '#ff2a5a'], size: 0.07, tex: glyphTex('♥'), life: 1.8, gravity: -0.05, normal: false,
      spawn: (p) => p.set(rnd(0.25), 0.05, 0.02), vel: (v) => v.set(rnd(0.06), 0.18, 0.04) }));
  }
  return g;
}

/** Builds a detailed, animated 3D pet. Call root.userData.tick(t, dt) every frame; set userData.happy = 1 for a happy jump. */
export function buildPet(cfg: PetCfg) {
  const A: Anim[] = [];
  const root = new THREE.Group(); const body = buildBody(cfg.pet, A, !!cfg.wings); root.add(body);
  const head = body.getObjectByName('head')!;
  if (cfg.wings) body.add(wings(cfg.wings, A));
  if (cfg.crown) head.add(crown(cfg.crown, A));
  if (cfg.glasses) head.add(glasses(cfg.glasses, A));
  // happy burst of hearts & stars
  body.add(particles(A, { count: 24, color: ['#ff5a9a', '#ffd040', '#7ae0ff', '#ffffff'], size: 0.09, tex: starTex(), life: 0.9, gravity: 0.6,
    gate: (_t, h) => Math.min(1, h * 2), spawn: (p) => p.set(rnd(0.3), 0.9 + rnd(0.2), rnd(0.3)), vel: (v) => v.set(rnd(1), 0.8 + Math.random() * 0.8, rnd(1)) }));
  const named: Record<string, THREE.Object3D[]> = {};
  body.traverse((o) => { if (o.name) (named[o.name] ??= []).push(o); });
  root.userData.happy = 0;
  root.userData.tick = (t: number, dt: number) => {
    const h = (root.userData.happy as number) = Math.max(0, root.userData.happy - dt * 1.2);
    body.position.y = Math.abs(Math.sin(t * 2.4)) * 0.06 + Math.sin(h * Math.PI) * 0.7;
    body.rotation.y = h > 0 ? (1 - h) * Math.PI * 2 : Math.sin(t * 0.7) * 0.25;
    body.scale.set(1 + Math.sin(t * 4.8) * 0.02, 1 - Math.sin(t * 4.8) * 0.02, 1);
    head.rotation.z = Math.sin(t * 1.3) * 0.08; head.rotation.x = Math.sin(t * 0.9) * 0.05;
    const blink = (t % 3.6) < 0.12 ? 0.1 : 1;
    (body.userData.lids as THREE.Object3D[]).forEach((l) => (l.scale.y = blink));
    named.wing?.forEach((o) => (o.rotation.y = (o.userData.side as number) * (0.3 + Math.sin(t * (6 + h * 10)) * 0.45)));
    named.tail?.forEach((o) => (o.rotation.y = Math.sin(t * 3) * 0.4));
    named.tailseg?.forEach((o) => (o.rotation.x = Math.sin(t * 3 - (o.userData.i as number) * 0.6) * 0.12 - 0.08));
    named.ear?.forEach((o) => (o.rotation.x = Math.sin(t * 2 + o.position.x * 10) * 0.12));
    named.flap?.forEach((o) => (o.rotation.z = Math.sin(t * (10 + h * 12)) * 0.35 * Math.sign(o.position.x)));
    for (const a of A) a(t, dt, h);
  };
  return root;
}
