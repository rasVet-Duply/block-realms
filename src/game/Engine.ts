import * as THREE from 'three';
import { getTheme, THEMES, type Theme } from './themes';
import { createBlockVisual } from './blocks';
import * as L from './logic';
import { applyFx, type FxData } from './fx';
import { sfx } from './audio';
import type { Quality } from './storage';
import { getClearFx, getPlaceFx, type FxItem, type Perks } from './economy';
import { buildPet, type PetCfg } from './pets';
import { blackHole, lightning, coinFountain, rainbowBurst, divineAscend, fireTornado, frostBloom, sparkBurst, type BigFx } from './bigfx';

export type View = '2d' | '3d';
export type BonusType = 'coins' | 'line' | 'bomb';
export interface EngineCallbacks {
  onScore(score: number): void;
  onCombo(streak: number, lines: number, gain: number): void;
  onGameOver(score: number): void;
  onCoins(n: number): void;
  onBoost(moves: number): void;
  onWorld(id: string): void;
  onBonus(type: BonusType): void;
}
interface Block { obj: THREE.Group; vis: THREE.Group; color: number; phase: number; busy?: boolean }
interface Piece { shape: L.Shape; color: number; group: THREE.Group; blocks: Block[]; home: THREE.Vector3; fits: boolean }
interface Tween { t: number; dur: number; delay: number; fn: (k: number) => void; done?: () => void }
interface Bonus { type: BonusType; obj: THREE.Group; r: number; c: number }
interface Pal { top: THREE.Color; bottom: THREE.Color; fog: THREE.Color; sky: THREE.Color; ground: THREE.Color; key: THREE.Color; board: THREE.Color; cell: THREE.Color; accent: THREE.Color; keyI: number; hemiI: number }

const N = L.N, H = (N - 1) / 2;
const TRAY_Z = N / 2 + 2.4, SLOT_X = [-3.1, 0, 3.1], TRAY_SCALE = 0.5;
const cellPos = (r: number, c: number) => new THREE.Vector3(c - H, 0.45, r - H);
const PMAX = 900;
const WORLD_EVERY = 6;
const COLOR_KEYS = ['top', 'bottom', 'fog', 'sky', 'ground', 'key', 'board', 'cell', 'accent'] as const;

const palOf = (t: Theme): Pal => ({
  top: new THREE.Color(t.sky[0]), bottom: new THREE.Color(t.sky[1]), fog: new THREE.Color(t.fog), sky: new THREE.Color(t.hemi[0]),
  ground: new THREE.Color(t.hemi[1]), key: new THREE.Color(t.key), board: new THREE.Color(t.board), cell: new THREE.Color(t.cell),
  accent: new THREE.Color(t.accent), keyI: t.keyI, hemiI: t.hemiI,
});
const clonePal = (p: Pal): Pal => ({ ...p, ...Object.fromEntries(COLOR_KEYS.map((k) => [k, p[k].clone()])) } as Pal);

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Score gets easy-going up to 50k, then each point is harder to earn. */
const difficulty = (score: number) => (score < 50000 ? 3 : Math.max(0.45, 3 * Math.pow(50000 / score, 1.5)));

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  private camBase = new THREE.Vector3();
  private camTarget = new THREE.Vector3(0, 0, 1.3);
  private view: View = '3d';
  private theme: Theme;
  private quality: Quality = 'medium';
  private clearFx: FxItem = getClearFx('');
  private placeFx: FxItem = getPlaceFx('');
  private bgMat: THREE.ShaderMaterial;
  private hemi = new THREE.HemisphereLight();
  private key = new THREE.DirectionalLight();
  private glow = new THREE.PointLight(0xffffff, 0, 30, 0);
  private boardMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 });
  private tileMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 });
  private tiles: THREE.InstancedMesh;
  private ghostMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false });
  private ghost: THREE.InstancedMesh;
  private blockGroup = new THREE.Group(); private trayGroup = new THREE.Group(); private decor = new THREE.Group(); private fxGroup = new THREE.Group();
  private grid = L.emptyGrid();
  private cells: (Block | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
  private tray: (Piece | null)[] = [null, null, null];
  private bonuses = new Map<number, Bonus>();
  private tweens: Tween[] = [];
  private score = 0; private streak = 0; private sinceClear = 0; private gameId = 0; private boost = 0;
  private linesTotal = 0; private nextWorldAt = WORLD_EVERY;
  private over = false; private paused = true; private menu = true;
  private drag: { piece: Piece; target: THREE.Vector3; origin: THREE.Vector3; p0: THREE.Vector3; snap: { r: number; c: number } | null } | null = null;
  private perks: Perks = { score: 1, coins: 1, bonus: 1, boostMoves: 3, bomb: 0 };
  private pet: THREE.Group | null = null;
  private hlKey = '';
  private shake = 0; private time = 0; private themeScale = 1;
  private cur: Pal; private from: Pal | null = null; private to: Pal | null = null; private trans = -1; private swapped = true; private next: Theme | null = null;
  private pPos = new Float32Array(PMAX * 3); private pCol = new Float32Array(PMAX * 3); private pBase = new Float32Array(PMAX * 3);
  private pVel = new Float32Array(PMAX * 3); private pLife = new Float32Array(PMAX); private pMaxLife = new Float32Array(PMAX); private pGrav = new Float32Array(PMAX); private pIdx = 0;
  private pGeo = new THREE.BufferGeometry(); private pMat: THREE.PointsMaterial;
  private aCount = 160; private aPos = new Float32Array(160 * 3); private aCol = new Float32Array(160 * 3); private aSeed = new Float32Array(160);
  private aGeo = new THREE.BufferGeometry(); private aMat: THREE.PointsMaterial;
  private ringGeo = new THREE.TorusGeometry(1, 0.06, 8, 48);
  private beamGeo = new THREE.CylinderGeometry(0.5, 0.9, 18, 20, 1, true);
  private bonusMats: Record<string, THREE.Material>;
  private raycaster = new THREE.Raycaster(); private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private clock = new THREE.Clock(); private raf = 0; private ro: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, quality: Quality, themeId: string, view: View, private cb: EngineCallbacks) {
    this.theme = getTheme(themeId);
    this.view = view;
    sfx.setTheme(this.theme);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.fog = new THREE.Fog(0x000000, 24, 85);

    this.bgMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = smoothstep(-0.35, 0.75, vP.y); gl_FragColor = vec4(mix(bottom, top, h), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), this.bgMat));

    this.key.position.set(5, 14, 7);
    this.key.shadow.mapSize.set(1024, 1024);
    Object.assign(this.key.shadow.camera, { left: -8, right: 8, top: 10, bottom: -8, near: 1, far: 40 });
    this.key.shadow.bias = -0.0015;
    this.glow.position.set(0, 4, 0);
    this.scene.add(this.hemi, this.key, this.glow);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(N + 0.8, 0.5, N + 0.8), this.boardMat);
    slab.position.y = -0.25; slab.receiveShadow = true;
    const lip = new THREE.Mesh(new THREE.BoxGeometry(N + 1.4, 0.3, N + 1.4), this.boardMat);
    lip.position.y = -0.55; lip.receiveShadow = true;
    this.tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.92, 0.06, 0.92), this.tileMat, N * N);
    this.tiles.receiveShadow = true;
    const m = new THREE.Matrix4(); const white = new THREE.Color(1, 1, 1);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      m.makeTranslation(c - H, 0.03, r - H); this.tiles.setMatrixAt(r * N + c, m); this.tiles.setColorAt(r * N + c, white);
    }
    this.ghost = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), this.ghostMat, 25);
    this.ghost.count = 0;
    this.scene.add(slab, lip, this.tiles, this.ghost, this.blockGroup, this.trayGroup, this.decor, this.fxGroup);

    this.bonusMats = {
      gold: new THREE.MeshStandardMaterial({ color: '#ffd23a', metalness: 1, roughness: 0.25, emissive: '#7a5200' }),
      line: new THREE.MeshBasicMaterial({ color: '#4af0ff' }),
      bomb: new THREE.MeshStandardMaterial({ color: '#1a1a22', metalness: 0.4, roughness: 0.35 }),
      spark: new THREE.MeshBasicMaterial({ color: '#ffb02a' }),
      fuse: new THREE.MeshStandardMaterial({ color: '#c8a27a', roughness: 0.9 }),
    };

    const tex = dotTexture();
    this.pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.pGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3).setUsage(THREE.DynamicDrawUsage));
    for (let i = 0; i < PMAX; i++) this.pPos[i * 3 + 1] = -1000;
    this.pMat = new THREE.PointsMaterial({ size: 0.2, map: tex, vertexColors: true, transparent: true, depthWrite: false });
    const pts = new THREE.Points(this.pGeo, this.pMat); pts.frustumCulled = false;
    for (let i = 0; i < 160; i++) {
      this.aSeed[i] = Math.random();
      this.aPos.set([(Math.random() - 0.5) * 30, -4 + Math.random() * 14, -14 + Math.random() * 22], i * 3);
    }
    this.aGeo.setAttribute('position', new THREE.BufferAttribute(this.aPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.aGeo.setAttribute('color', new THREE.BufferAttribute(this.aCol, 3));
    this.aMat = new THREE.PointsMaterial({ size: 0.25, map: tex, vertexColors: true, transparent: true, depthWrite: false });
    const amb = new THREE.Points(this.aGeo, this.aMat); amb.frustumCulled = false;
    this.scene.add(pts, amb);

    this.cur = palOf(this.theme);
    this.applyPal(this.cur);
    this.applyThemeExtras();
    this.setQuality(quality);

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.refill();
    this.loop();
  }

  // ---------- public API ----------
  newGame() {
    this.gameId++;
    this.cancelDrag();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const b = this.cells[r][c];
      if (b) this.removeBlock(b, 'implode', cellPos(r, c), (r + c) * 0.015, false);
      this.cells[r][c] = null;
    }
    this.bonuses.forEach((b) => this.fxGroup.remove(b.obj)); this.bonuses.clear();
    this.tray.forEach((p) => p && this.trayGroup.remove(p.group));
    this.tray = [null, null, null];
    this.grid = L.emptyGrid();
    this.score = 0; this.streak = 0; this.sinceClear = 0; this.over = false; this.boost = 0;
    this.linesTotal = 0; this.nextWorldAt = WORLD_EVERY;
    this.cb.onScore(0); this.cb.onBoost(0);
    this.refill();
  }
  setPaused(p: boolean) { this.paused = p; if (p) this.cancelDrag(); }
  setMenuMode(m: boolean) { this.menu = m; }
  setView(v: View) { this.view = v; this.resize(); }
  setPerks(p: Perks) { this.perks = p; }
  setPet(cfg: PetCfg | null) {
    if (this.pet) this.scene.remove(this.pet);
    this.pet = null;
    if (!cfg?.pet) return;
    this.pet = buildPet(cfg);
    this.pet.position.set(H + 0.1, 0, -H - 1.4); this.pet.scale.setScalar(1.15); this.pet.rotation.y = -0.4;
    this.scene.add(this.pet);
  }
  setEffects(clearId: string, placeId: string) { this.clearFx = getClearFx(clearId); this.placeFx = getPlaceFx(placeId); }
  setQuality(q: Quality) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? 1 : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2));
    this.key.castShadow = q === 'high';
    this.aCount = q === 'low' ? 50 : q === 'medium' ? 100 : 160;
    this.aGeo.setDrawRange(0, this.aCount);
    this.resize();
  }
  setTheme(id: string) {
    const t = getTheme(id);
    if (t.id === (this.next ?? this.theme).id) return;
    this.from = clonePal(this.cur);
    this.to = palOf(t); this.next = t; this.trans = 0; this.swapped = false;
    sfx.setTheme(t); sfx.play('theme');
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.renderer.dispose();
  }

  // ---------- theme ----------
  private applyPal(p: Pal) {
    (this.bgMat.uniforms.top.value as THREE.Color).copy(p.top);
    (this.bgMat.uniforms.bottom.value as THREE.Color).copy(p.bottom);
    (this.scene.fog as THREE.Fog).color.copy(p.fog);
    this.hemi.color.copy(p.sky); this.hemi.groundColor.copy(p.ground); this.hemi.intensity = p.hemiI;
    this.key.color.copy(p.key); this.key.intensity = p.keyI;
    this.boardMat.color.copy(p.board); this.tileMat.color.copy(p.cell);
    this.ghostMat.color.copy(p.accent); this.glow.color.copy(p.accent);
  }
  private applyThemeExtras() {
    const t = this.theme;
    const add = t.particle.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.pMat.blending = add; this.aMat.blending = add;
    this.pMat.size = t.particle.size * 1.3; this.aMat.size = t.particle.size * 1.6;
    this.pMat.needsUpdate = this.aMat.needsUpdate = true;
    const cols = t.particle.colors.map((c) => new THREE.Color(c));
    for (let i = 0; i < 160; i++) cols[i % cols.length].toArray(this.aCol, i * 3);
    (this.aGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.decor.clear();
    for (let i = 0; i < 10; i++) {
      const v = createBlockVisual(t, i, false);
      const a = Math.PI * (1.05 + (i / 9) * 0.9); const rad = 19 + ((i * 7) % 5) * 3;
      v.position.set(Math.cos(a) * rad, -5 + ((i * 3) % 7) * 1.8, Math.sin(a) * rad - 2);
      v.scale.setScalar(1.8 + ((i * 5) % 4) * 0.7);
      v.userData.spin = 0.1 + (i % 3) * 0.08;
      this.decor.add(v);
    }
  }
  private swapTheme() {
    this.theme = this.next!; this.next = null;
    const swap = (b: Block) => { b.obj.remove(b.vis); b.vis = createBlockVisual(this.theme, b.color); b.obj.add(b.vis); };
    this.cells.forEach((row) => row.forEach((b) => b && swap(b)));
    this.tray.forEach((p) => p?.blocks.forEach(swap));
    this.applyThemeExtras();
  }
  private advanceWorld() {
    const cur = (this.next ?? this.theme).id;
    const idx = (THEMES.findIndex((t) => t.id === cur) + 1) % THEMES.length;
    this.setTheme(THEMES[idx].id);
    this.cb.onWorld(THEMES[idx].id);
  }

  // ---------- tray ----------
  private refill() {
    if (this.tray.some(Boolean)) return;
    const shapes = L.smartTray(this.grid);
    shapes.forEach((s, i) => {
      const color = Math.floor(Math.random() * this.theme.palette.length);
      const group = new THREE.Group(); const blocks: Block[] = [];
      s.cells.forEach(([r, c]) => {
        const b = this.makeBlock(color);
        b.obj.position.set(c - (s.w - 1) / 2, 0.45, r - (s.h - 1) / 2);
        group.add(b.obj); blocks.push(b);
      });
      const home = new THREE.Vector3(SLOT_X[i], 0, TRAY_Z);
      group.position.set(home.x + 12 + i * 3, 0, TRAY_Z); group.scale.setScalar(TRAY_SCALE);
      this.trayGroup.add(group);
      this.tray[i] = { shape: s, color, group, blocks, home, fits: true };
    });
    this.updateFits();
  }
  private makeBlock(color: number): Block {
    const obj = new THREE.Group(); const vis = createBlockVisual(this.theme, color, this.quality === 'high');
    obj.add(vis);
    return { obj, vis, color, phase: Math.random() * Math.PI * 2 };
  }
  private updateFits() { this.tray.forEach((p) => { if (p) p.fits = L.anyFit(this.grid, p.shape); }); }

  // ---------- bonuses on board ----------
  private makeBonus(type: BonusType) {
    const g = new THREE.Group(); const M = this.bonusMats;
    if (type === 'coins') {
      for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20), M.gold); c.position.y = i * 0.08; c.rotation.z = 0.1 * i; g.add(c); }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 20), M.gold); top.rotation.x = Math.PI / 2; top.position.y = 0.42; top.name = 'spin'; g.add(top);
    } else if (type === 'line') {
      const s = new THREE.Group(); s.name = 'spin';
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.1), M.line); s.add(bar);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.62), M.line); s.add(bar2);
      for (const [x, z, ry] of [[0.38, 0, -Math.PI / 2], [-0.38, 0, Math.PI / 2], [0, 0.38, 0], [0, -0.38, Math.PI]] as const) {
        const a = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 4), M.line); a.rotation.set(Math.PI / 2, 0, ry); a.position.set(x, 0, z); s.add(a);
      }
      s.position.y = 0.3; g.add(s);
    } else {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), M.bomb); b.position.y = 0.3; g.add(b);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), M.fuse); f.position.set(0.1, 0.62, 0); f.rotation.z = -0.4; g.add(f);
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.spark); sp.position.set(0.15, 0.72, 0); sp.name = 'spark'; g.add(sp);
    }
    return g;
  }
  private spawnBonus() {
    if (this.bonuses.size >= 3 || Math.random() > 0.3 * this.perks.bonus) return;
    const empty: number[] = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.grid[r][c] < 0 && !this.bonuses.has(r * N + c)) empty.push(r * N + c);
    if (empty.length < 6) return;
    const k = empty[Math.floor(Math.random() * empty.length)];
    const roll = Math.random() - this.perks.bomb * 0.6; const type: BonusType = roll > 0.72 ? 'coins' : roll > 0.42 ? 'line' : 'bomb';
    const obj = this.makeBonus(type); const r = Math.floor(k / N), c = k % N;
    obj.position.copy(cellPos(r, c)).setY(0.05);
    this.fxGroup.add(obj);
    this.bonuses.set(k, { type, obj, r, c });
    this.tween(0.4, 0, (t) => obj.scale.setScalar(Math.max(0.001, Math.sin(t * Math.PI * 0.75) * 1.4)));
  }

  // ---------- input ----------
  private toWorld(e: PointerEvent, out: THREE.Vector3) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.ray.intersectPlane(this.plane, out);
  }
  private onDown = (e: PointerEvent) => {
    sfx.unlock();
    if (this.paused || this.over || this.menu) return;
    const p = this.toWorld(e, new THREE.Vector3()); if (!p) return;
    const piece = this.tray.find((t) => t && Math.abs(p.x - t.home.x) < 1.55 && Math.abs(p.z - t.home.z) < 1.9);
    if (!piece) return;
    const lift = e.pointerType === 'touch' ? 2.2 : 1.2;
    const origin = new THREE.Vector3(p.x, 0.7, p.z - lift);
    this.drag = { piece, target: origin.clone(), origin, p0: p.clone(), snap: null };
    sfx.play('pick');
    this.onMove(e);
  };
  private onMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const p = this.toWorld(e, new THREE.Vector3()); if (!p) return;
    const d = this.drag; const s = d.piece.shape;
    // pieces travel a bit faster than the finger, like in classic block puzzles
    const SENS = 1.3;
    d.target.set(d.origin.x + (p.x - d.p0.x) * SENS, 0.7, d.origin.z + (p.z - d.p0.z) * SENS);
    const fc = d.target.x - (s.w - 1) / 2 + H, fr = d.target.z - (s.h - 1) / 2 + H;
    // magnetic snap: nearest valid spot around the pointer; keep the last valid spot while close
    let best: { r: number; c: number } | null = null; let bd = Infinity;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = Math.round(fr) + dr, c = Math.round(fc) + dc;
      if (!L.canPlace(this.grid, s, r, c)) continue;
      const dist = Math.hypot(r - fr, c - fc);
      if (dist < bd) { bd = dist; best = { r, c }; }
    }
    if (best && bd < 1.3) d.snap = best;
    else if (d.snap && Math.hypot(d.snap.r - fr, d.snap.c - fc) > 1.9) d.snap = null;
    this.updateGhost();
  };
  private onUp = () => {
    const d = this.drag; if (!d) return;
    this.drag = null;
    if (d.snap) this.place(d.piece, d.snap.r, d.snap.c);
    else if (d.target.z < TRAY_Z - 1.5) sfx.play('invalid');
    this.updateGhost();
  };
  private cancelDrag() { this.drag = null; this.updateGhost(); }

  private updateGhost() {
    const d = this.drag; const m = new THREE.Matrix4();
    let rows: number[] = [], cols: number[] = [];
    if (d?.snap) {
      d.piece.shape.cells.forEach(([dr, dc], i) => { m.makeTranslation(dc + d.snap!.c - H, 0.09, dr + d.snap!.r - H); this.ghost.setMatrixAt(i, m); });
      this.ghost.count = d.piece.shape.cells.length;
      this.ghost.instanceMatrix.needsUpdate = true;
      ({ rows, cols } = L.linesAfter(this.grid, d.piece.shape, d.snap.r, d.snap.c));
    } else this.ghost.count = 0;
    const key = rows.join() + '|' + cols.join();
    if (key === this.hlKey) return;
    this.hlKey = key;
    const hi = new THREE.Color(2.2, 2.2, 2.2), lo = new THREE.Color(1, 1, 1);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) this.tiles.setColorAt(r * N + c, rows.includes(r) || cols.includes(c) ? hi : lo);
    this.tiles.instanceColor!.needsUpdate = true;
  }

  // ---------- gameplay ----------
  private place(piece: Piece, r: number, c: number) {
    const slot = this.tray.indexOf(piece); this.tray[slot] = null;
    const center = new THREE.Vector3(); const triggered: Bonus[] = [];
    piece.shape.cells.forEach(([dr, dc], i) => {
      const b = piece.blocks[i]; const rr = r + dr, cc = c + dc;
      this.blockGroup.attach(b.obj);
      const start = b.obj.position.clone(); const end = cellPos(rr, cc); center.add(end);
      this.grid[rr][cc] = piece.color; this.cells[rr][cc] = b;
      const bonus = this.bonuses.get(rr * N + cc);
      if (bonus) { triggered.push(bonus); this.bonuses.delete(rr * N + cc); }
      this.tween(0.12, 0, (k) => { b.obj.position.lerpVectors(start, end, k * k); b.obj.scale.setScalar(1); }, () => {
        this.tween(0.3, 0, (k) => {
          if (b.busy) return;
          const s = Math.sin(k * Math.PI) * (1 - k) * 0.7;
          b.obj.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
        });
      });
    });
    center.divideScalar(piece.shape.cells.length);
    this.trayGroup.remove(piece.group);
    sfx.play('place');
    this.tween(0.001, 0.12, () => {}, () => this.playPlaceFx(center));

    // lines + bonuses
    const { rows, cols } = L.fullLines(this.grid);
    const clear = new Set<number>();
    rows.forEach((rr) => { for (let x = 0; x < N; x++) clear.add(rr * N + x); });
    cols.forEach((cc) => { for (let x = 0; x < N; x++) clear.add(x * N + cc); });
    let coinBonus = 0; let bonusClear = false;
    triggered.forEach((b) => {
      this.fxGroup.remove(b.obj);
      const pos = cellPos(b.r, b.c).setY(0.8);
      this.cb.onBonus(b.type);
      if (b.type === 'coins') { coinBonus += 40; this.emit(pos, 24, 1.2, ['#ffd700', '#fff2a0', '#ffb300'], -8, 6); this.spawnRing(pos, '#ffd700', 0.3, 2.2, 0.5); }
      else if (b.type === 'line') {
        bonusClear = true;
        for (let x = 0; x < N; x++) { clear.add(b.r * N + x); clear.add(x * N + b.c); }
        this.spawnBeamLine(b.r, b.c);
      } else {
        bonusClear = true;
        for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) { const rr = b.r + y, cc = b.c + x; if (rr >= 0 && rr < N && cc >= 0 && cc < N) clear.add(rr * N + cc); }
        this.emit(pos, 60, 2, ['#ffb02a', '#ff4a00', '#ffe27a', '#333333'], -6, 9);
        this.spawnRing(pos, '#ff7a1a', 0.3, 4, 0.5); this.shake = Math.min(1.4, this.shake + 0.8); this.glow.intensity = 8;
      }
    });
    const keys = [...clear].filter((k) => this.grid[Math.floor(k / N)][k % N] >= 0);
    const lines = rows.length + cols.length;

    // scoring
    const f = difficulty(this.score); const boosted = this.boost > 0;
    if (this.boost > 0) this.boost--;
    let gain = piece.shape.cells.length * 5;
    if (lines > 0 || (bonusClear && keys.length)) {
      this.streak++; this.sinceClear = 0;
      const mult = Math.min(this.streak, 10);
      gain += 40 * Math.max(1, lines * lines) * mult + keys.length * 4;
      if (this.streak >= 2 && this.streak % 2 === 0) { this.boost = this.perks.boostMoves; sfx.play('combo'); this.spawnRing(center.clone().setY(1), '#ffd23a', 0.5, 6, 0.8); }
    } else if (++this.sinceClear >= 3) this.streak = 0;
    gain = Math.round(gain * f * (boosted ? 2 : 1) * this.perks.score);
    if (keys.length && this.pet) this.pet.userData.happy = 1;
    if (keys.length) {
      this.clearCells(keys, lines);
      this.cb.onCombo(this.streak, Math.max(lines, 1), gain);
      const coins = lines * 2 + (this.streak > 1 ? this.streak : 0);
      if (coins) this.cb.onCoins(coins);
    }
    if (coinBonus) this.cb.onCoins(coinBonus);
    this.cb.onBoost(this.boost);
    this.score += gain;
    this.cb.onScore(this.score);

    // world progression: worlds change as you clear lines
    if (lines > 0) {
      this.linesTotal += lines;
      if (this.linesTotal >= this.nextWorldAt) { this.nextWorldAt += WORLD_EVERY; this.tween(0.001, 0.7, () => {}, () => this.advanceWorld()); }
    }
    this.spawnBonus();
    if (!this.tray.some(Boolean)) this.refill();
    this.updateFits();
    if (!this.tray.some((p) => p && p.fits)) {
      this.over = true; const id = this.gameId;
      this.tween(0.001, 0.9, () => {}, () => {
        if (id !== this.gameId) return;
        this.shake = 0.8; sfx.play('over'); this.cb.onGameOver(this.score);
      });
    }
  }

  private clearCells(keys: number[], lines: number) {
    const center = new THREE.Vector3();
    keys.forEach((k) => center.add(cellPos(Math.floor(k / N), k % N))); center.divideScalar(keys.length);
    const list = keys.map((k) => { const r = Math.floor(k / N), c = k % N; const b = this.cells[r][c]!; this.cells[r][c] = null; this.grid[r][c] = -1; return { b, r, c }; });
    const fx = this.clearFx.override ?? this.theme.clear;
    const cf0 = this.clearFx;
    if (cf0.override === 'vortex') {
      const objs = list.map(({ b }) => { b.busy = true; return b.obj; });
      const hole = blackHole(this.fxGroup, center.clone().setY(1.6), objs, 1.9);
      this.glow.color.set('#9a3cff'); this.glow.intensity = 6;
      this.tween(1.9, 0, (k) => hole.update(k), () => { hole.dispose(); objs.forEach((o) => this.blockGroup.remove(o)); this.emit(center.clone().setY(1.6), 60, 2, cf0.colors, 0, 6); this.shake = Math.min(1.2, this.shake + 0.5); });
      sfx.play('clear', lines); if (lines >= 2) sfx.play('combo');
      return;
    }
    if (cf0.id === 'clear_divine') {
      const objs = list.map(({ b }) => { b.busy = true; return b.obj; });
      this.glow.color.set('#fff2a8'); this.glow.intensity = 8;
      this.runFx(divineAscend(this.fxGroup, center, objs, 1.6), 2.2, () => objs.forEach((o) => this.blockGroup.remove(o)));
      this.emit(center.clone().setY(1), 50, 1.5, cf0.colors, 3, 5);
      sfx.play('clear', lines); if (lines >= 2) sfx.play('combo');
      return;
    }
    if (cf0.id === 'clear_gold') this.runFx(coinFountain(this.fxGroup, center, this.quality === 'low' ? 14 : 18 + lines * 8), 2);
    if (cf0.id === 'clear_rainbow') this.runFx(rainbowBurst(this.fxGroup, center), 1.8);
    if (cf0.override === 'shatter' && cf0.beam) this.strike(center, 3);
    list.forEach(({ b, r, c }) => {
      const dist = Math.hypot(r - (center.z + H), c - (center.x + H));
      this.removeBlock(b, fx, cellPos(r, c), 0.14 + dist * 0.03, true);
    });
    sfx.play('clear', lines);
    const big = lines >= 2 || this.streak >= 2;
    this.shake = Math.min(1.2, this.shake + 0.25 + (big ? 0.2 * lines : 0));
    this.glow.intensity = Math.max(this.glow.intensity, big ? 6 : 3);
    const cf = this.clearFx; const top = center.clone().setY(0.8);
    if (cf.ring) this.spawnRing(top, cf.ring, 0.5, 5 + lines, 0.7);
    if (cf.ring2) this.spawnRing(top, cf.ring2, cf.override === 'vortex' ? 6 : 0.3, cf.override === 'vortex' ? 0.2 : 7, 0.9, 0.1);
    if (cf.beam && cf.override !== 'shatter') this.spawnBeam(center, cf.beam, cf.beamW ?? 1, 0.9);
    if (big) { sfx.play('combo'); this.emit(top, this.quality === 'low' ? 30 : 80, 2.2); }
  }

  private removeBlock(b: Block, fx: Theme['clear'], base: THREE.Vector3, delay: number, particles: boolean) {
    b.busy = true;
    const dir = new THREE.Vector3(base.x, 0, base.z).normalize();
    if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    const d: FxData = { base: base.clone(), dir, r: Math.random() };
    const q = this.quality === 'low' ? 0.4 : this.quality === 'medium' ? 0.7 : 1;
    const cf = this.clearFx;
    this.tween(0.7, delay, (k) => {
      if (particles && !d.emitted) {
        d.emitted = true; const p = base.clone().setY(0.6);
        this.emit(p, Math.ceil(12 * q), 1);
        if (cf.count) this.emit(p, Math.ceil(cf.count * q), 1, cf.colors, cf.gravity, cf.speed);
      }
      applyFx(fx, b.obj, k, d);
    }, () => this.blockGroup.remove(b.obj));
  }

  // ---------- effects ----------
  private playPlaceFx(center: THREE.Vector3) {
    const e = this.placeFx; if (!e.count) return;
    const q = this.quality === 'low' ? 0.5 : 1; const p = center.clone().setY(0.6);
    if (e.id === 'place_thunder') this.strike(center, 2);
    else if (e.id === 'place_divine') this.runFx(divineAscend(this.fxGroup, center, [], 0.9), 1.6);
    else if (e.beam) this.spawnBeam(center, e.beam, e.beamW ?? 1, 0.8);
    if (e.id === 'place_fire') this.runFx(fireTornado(this.fxGroup, center), 1.2);
    if (e.id === 'place_frost') this.runFx(frostBloom(this.fxGroup, center), 1.4);
    if (e.id === 'place_dust') this.runFx(sparkBurst(this.fxGroup, center), 0.6);
    if (e.ring) this.spawnRing(p, e.ring, 0.3, 3.2, 0.6);
    if (e.ring2) { this.spawnRing(p.clone().setY(1.6), e.ring2, 0.2, 2.2, 0.9, 0.1); this.spawnRing(p.clone().setY(3), e.ring ?? e.ring2, 0.8, 1.2, 1.1, 0.15); }
    this.emit(p, Math.ceil(e.count * q), 1, e.colors, e.gravity, e.speed);
    if (e.beam) { this.glow.color.set(e.beam); this.glow.intensity = 7; this.shake = Math.min(1, this.shake + 0.3); }
  }
  private runFx(fx: BigFx, dur: number, done?: () => void) {
    this.tween(dur, 0, (k) => fx.update(k), () => { fx.dispose(); done?.(); });
  }
  private strike(center: THREE.Vector3, strikes: number) {
    const target = center.clone();
    const bolt = lightning(this.fxGroup, target, { strikes, dur: 0.5 + strikes * 0.2, onStrike: () => {
      this.glow.color.set('#7fc8ff'); this.glow.intensity = 10; this.shake = Math.min(1.3, this.shake + 0.35);
      const p = target.clone().setY(0.7); this.spawnRing(p, '#7fc8ff', 0.2, 4, 0.5); this.spawnRing(p, '#ffffff', 0.1, 2.2, 0.35);
      this.emit(p, this.quality === 'low' ? 15 : 40, 1.6, ['#ffffff', '#9fd8ff', '#3a8aff'], -3, 9);
    } });
    this.tween(0.5 + strikes * 0.2, 0, (k) => bolt.update(k), () => bolt.dispose());
  }
  private fxMat(color: string) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  }
  private spawnRing(pos: THREE.Vector3, color: string, from: number, to: number, dur: number, delay = 0) {
    const m = this.fxMat(color); const mesh = new THREE.Mesh(this.ringGeo, m);
    mesh.rotation.x = Math.PI / 2; mesh.position.copy(pos); mesh.scale.setScalar(0.001); this.fxGroup.add(mesh);
    this.tween(dur, delay, (k) => { const e = 1 - Math.pow(1 - k, 3); mesh.scale.setScalar(Math.max(0.001, from + (to - from) * e)); m.opacity = 0.95 * (1 - k); },
      () => { this.fxGroup.remove(mesh); m.dispose(); });
  }
  private spawnBeam(pos: THREE.Vector3, color: string, width: number, dur: number) {
    const m = this.fxMat(color); const mesh = new THREE.Mesh(this.beamGeo, m);
    mesh.position.set(pos.x, 9, pos.z); this.fxGroup.add(mesh);
    this.tween(dur, 0, (k) => { const w = width * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85); mesh.scale.set(Math.max(0.001, w), 1, Math.max(0.001, w)); m.opacity = 0.75 * (1 - k * 0.6); },
      () => { this.fxGroup.remove(mesh); m.dispose(); });
  }
  private spawnBeamLine(r: number, c: number) {
    for (const horiz of [true, false]) {
      const m = this.fxMat('#4af0ff'); const mesh = new THREE.Mesh(new THREE.BoxGeometry(horiz ? N + 1 : 0.5, 0.3, horiz ? 0.5 : N + 1), m);
      mesh.position.copy(cellPos(r, c)).setY(0.7); if (horiz) mesh.position.x = 0; else mesh.position.z = 0;
      this.fxGroup.add(mesh);
      this.tween(0.5, 0, (k) => { m.opacity = 0.9 * (1 - k); mesh.scale.set(horiz ? 1 : 1 + k * 2, 1, horiz ? 1 + k * 2 : 1); }, () => { this.fxGroup.remove(mesh); mesh.geometry.dispose(); m.dispose(); });
    }
    this.glow.intensity = 6;
  }

  // ---------- particles ----------
  private emit(pos: THREE.Vector3, n: number, power: number, colors?: string[], gravity?: number, speed?: number) {
    const t = this.theme.particle; const cols = (colors ?? t.colors).map((c) => new THREE.Color(c));
    const g = gravity ?? t.gravity, sp = speed ?? t.speed;
    for (let j = 0; j < n; j++) {
      const i = this.pIdx = (this.pIdx + 1) % PMAX;
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(sp * power * (0.4 + Math.random() * 0.6));
      pos.toArray(this.pPos, i * 3); v.toArray(this.pVel, i * 3);
      cols[j % cols.length].toArray(this.pBase, i * 3);
      this.pGrav[i] = g;
      this.pLife[i] = this.pMaxLife[i] = 0.6 + Math.random() * 0.8;
    }
  }
  private updateParticles(dt: number) {
    for (let i = 0; i < PMAX; i++) {
      if (this.pLife[i] <= 0) continue;
      this.pLife[i] -= dt; const i3 = i * 3;
      if (this.pLife[i] <= 0) { this.pPos[i3 + 1] = -1000; continue; }
      this.pVel[i3 + 1] += this.pGrav[i] * dt;
      for (let a = 0; a < 3; a++) { this.pVel[i3 + a] *= 1 - dt * 1.5; this.pPos[i3 + a] += this.pVel[i3 + a] * dt; }
      const f = this.pLife[i] / this.pMaxLife[i];
      for (let a = 0; a < 3; a++) this.pCol[i3 + a] = this.pBase[i3 + a] * f;
    }
    this.pGeo.attributes.position.needsUpdate = true; this.pGeo.attributes.color.needsUpdate = true;
    const m = this.theme.particle.motion; const t = this.time;
    for (let i = 0; i < this.aCount; i++) {
      const i3 = i * 3, s = this.aSeed[i];
      switch (m) {
        case 'rise': this.aPos[i3 + 1] += dt * (0.6 + s); break;
        case 'fall': this.aPos[i3 + 1] -= dt * (0.5 + s * 0.8); this.aPos[i3] += Math.sin(t + s * 9) * dt * 0.3; break;
        case 'drift': this.aPos[i3] += dt * (0.4 + s); this.aPos[i3 + 1] += Math.sin(t * 0.7 + s * 9) * dt * 0.2; break;
        case 'bubble': this.aPos[i3 + 1] += dt * (0.8 + s); this.aPos[i3] += Math.sin(t * 2 + s * 20) * dt * 0.4; break;
        case 'twinkle': this.aPos[i3] += Math.sin(t * 0.8 + s * 30) * dt * 0.3; this.aPos[i3 + 1] += Math.cos(t * 0.6 + s * 20) * dt * 0.3; break;
        case 'swirl': { const x = this.aPos[i3], z = this.aPos[i3 + 2] + 3, a = dt * 0.15 * (0.5 + s);
          this.aPos[i3] = x * Math.cos(a) - z * Math.sin(a); this.aPos[i3 + 2] = x * Math.sin(a) + z * Math.cos(a) - 3; break; }
      }
      if (this.aPos[i3 + 1] > 10) this.aPos[i3 + 1] = -4; if (this.aPos[i3 + 1] < -4) this.aPos[i3 + 1] = 10;
      if (this.aPos[i3] > 15) this.aPos[i3] = -15; if (this.aPos[i3] < -15) this.aPos[i3] = 15;
    }
    this.aGeo.attributes.position.needsUpdate = true;
  }

  // ---------- loop ----------
  private tween(dur: number, delay: number, fn: (k: number) => void, done?: () => void) { this.tweens.push({ t: 0, dur, delay, fn, done }); }

  private idle(b: Block, t: number) {
    const v = b.vis, s = this.themeScale, ph = b.phase;
    v.position.set(0, 0, 0); v.rotation.set(0, 0, 0); v.scale.setScalar(s);
    switch (this.theme.idle) {
      case 'bob': v.position.y = Math.sin(t * 2 + ph) * 0.04; break;
      case 'wobble': { const w = Math.sin(t * 3 + ph) * 0.05; v.scale.set(s * (1 + w), s * (1 - w), s * (1 + w)); break; }
      case 'pulse': v.scale.setScalar(s * (1 + Math.sin(t * 2.5 + ph) * 0.035)); break;
      case 'spin': v.rotation.y = t * 0.5 + ph; break;
      case 'jitter': if (Math.sin(t * 7 + ph * 13) > 0.97) v.position.x = (Math.random() - 0.5) * 0.06; break;
      case 'sway': v.rotation.z = Math.sin(t * 1.4 + ph) * 0.07; v.rotation.x = Math.cos(t * 1.1 + ph) * 0.05; break;
      case 'float': v.position.y = 0.06 + Math.sin(t * 1.6 + ph) * 0.06; v.rotation.y = Math.sin(t * 0.5 + ph) * 0.3; break;
      case 'still': break;
    }
    const inner = v.getObjectByName('inner');
    if (inner) { inner.rotation.y = t * 1.6 + ph; inner.scale.setScalar(1 + Math.sin(t * 4 + ph) * 0.12); }
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt; const t = this.time;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      if (tw.delay > 0) { tw.delay -= dt; continue; }
      tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.done?.(); }
    }
    if (this.trans >= 0 && this.from && this.to) {
      this.trans = Math.min(1, this.trans + dt / 1.1);
      const k = this.trans * this.trans * (3 - 2 * this.trans);
      COLOR_KEYS.forEach((n) => this.cur[n].lerpColors(this.from![n], this.to![n], k));
      this.cur.keyI = this.from.keyI + (this.to.keyI - this.from.keyI) * k; this.cur.hemiI = this.from.hemiI + (this.to.hemiI - this.from.hemiI) * k;
      this.applyPal(this.cur);
      if (this.trans >= 0.5 && !this.swapped) { this.swapped = true; this.swapTheme(); }
      this.themeScale = this.trans < 0.5 ? Math.max(0.001, 1 - this.trans * 2) : Math.min(1, (this.trans - 0.5) * 2) ** 0.6;
      this.decor.scale.setScalar(Math.max(0.001, this.themeScale));
      if (this.trans >= 1) { this.trans = -1; this.themeScale = 1; }
    }
    const lf = this.theme.light;
    let ki = this.cur.keyI;
    if (lf === 'flicker') ki *= 0.88 + Math.sin(t * 13) * 0.05 + Math.sin(t * 31) * 0.05;
    else if (lf === 'pulse') ki *= 0.9 + Math.sin(t * 1.5) * 0.1;
    else if (lf === 'strobe') ki *= Math.sin(t * 9) > 0.96 ? 1.25 : 1;
    this.key.intensity = ki;
    this.glow.intensity *= Math.exp(-dt * 3);
    if (this.glow.intensity < 0.05) this.glow.color.copy(this.cur.accent);
    this.tray.forEach((p) => {
      if (!p) return;
      const dragging = this.drag?.piece === p;
      const target = dragging ? this.drag!.target : p.home;
      const sc = dragging ? 1 : p.fits ? TRAY_SCALE : TRAY_SCALE * 0.78;
      const f = 1 - Math.exp(-dt * (dragging ? 42 : 14));
      p.group.position.lerp(target, f);
      p.group.scale.setScalar(p.group.scale.x + (sc - p.group.scale.x) * f);
      p.blocks.forEach((b) => this.idle(b, t));
    });
    this.cells.forEach((row) => row.forEach((b) => b && this.idle(b, t)));
    this.bonuses.forEach((b, k) => {
      b.obj.position.y = 0.05 + Math.sin(t * 3 + k) * 0.06;
      const s = b.obj.getObjectByName('spin'); if (s) s.rotation.y = t * 2.5;
      const sp = b.obj.getObjectByName('spark'); if (sp) sp.scale.setScalar(0.7 + Math.random() * 0.8);
      if (b.type === 'coins') b.obj.rotation.y = t;
    });
    this.decor.children.forEach((d, i) => { d.rotation.y += dt * (d.userData.spin as number); d.rotation.x = Math.sin(t * 0.3 + i) * 0.3; d.position.y += Math.sin(t * 0.5 + i) * dt * 0.2; });
    if (this.pet) (this.pet.userData.tick as (t: number, dt: number) => void)(t, dt);
    this.updateParticles(dt);
    this.shake *= Math.exp(-dt * 6);
    const cam = this.camera.position.copy(this.camBase);
    if (this.menu && this.view === '3d') { const a = Math.sin(t * 0.25) * 0.35; const off = cam.clone().sub(this.camTarget); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), a); cam.copy(this.camTarget).add(off); cam.y += 1.5; }
    if (this.shake > 0.01) cam.add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(this.shake * 0.35));
    this.camera.lookAt(this.camTarget);
    this.renderer.render(this.scene, this.camera);
  };

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    const portrait = w / h < 0.8;
    if (this.view === '2d') {
      const d = Math.max(5.3 / Math.tan(hf), 7.3 / Math.tan(vf)) + 1;
      this.camTarget.set(0, 0, 1.6);
      this.camBase.copy(this.camTarget).addScaledVector(new THREE.Vector3(0, 1, 0.1).normalize(), d);
    } else {
      const d = Math.max(5.7 / Math.tan(hf), 7.2 / Math.tan(vf)) * 1.02;
      this.camTarget.set(0, 0, portrait ? 1.6 : 1.3);
      this.camBase.copy(this.camTarget).addScaledVector(new THREE.Vector3(0, 1.45, 1).normalize(), d);
    }
    this.camera.updateProjectionMatrix();
  }
}
