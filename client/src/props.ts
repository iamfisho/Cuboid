import * as THREE from 'three';
import {
  CELL_CENTERS,
  CELL_NUMERALS,
  CENTER,
  CENTER_PEDESTAL,
  DIRS,
  HALF,
  HANDLE,
  LLAVE_HOLD,
  PEDESTAL,
  PITCH,
  TRIALS,
  TRIAL_TYPES,
  VALVULA_HOLD,
  cellFrame,
  cellPoint,
  handlePos,
  pedestalPos,
  tileCenter,
  valvePos,
  weightSize,
  yawFacing,
  type ObjectView,
  type PeerView,
  type Snapshot,
  type TrialId,
} from '@cuboid/shared';
import { CanvasPanel, FONT, MONO, hex, labelTexture, wrapText } from './textures';

const INK = '#d9dee6';
const MUTED = '#8a93a1';

/** Coloca un plano pegado a la pared del fondo de una celda, mirando hacia dentro. */
function onBackWall(mesh: THREE.Object3D, cell: number, right: number, y: number, inset = 0.02): void {
  const p = cellPoint(cell, HALF - inset, right);
  const f = DIRS[cell];
  mesh.position.set(p.x, y, p.z);
  mesh.lookAt(p.x - f.x, y, p.z - f.z);
}

interface Avatar {
  group: THREE.Group;
  body: THREE.Mesh;
  target: THREE.Vector3;
  yaw: number;
  crouch: boolean;
}

/** Todo lo que no es la estructura: paneles de la celda propia, props de las pruebas, objetos y otros jugadores. */
export class Props {
  readonly group = new THREE.Group();
  /** Ancla en la cámara para lo que lleva el jugador local. */
  readonly hand = new THREE.Object3D();

  private home = 0;
  private readonly rules = new CanvasPanel(1024, 576);
  private readonly rulesMesh: THREE.Mesh;
  private readonly air = new CanvasPanel(128, 608);
  private readonly airMesh: THREE.Mesh;
  private rulesKey = '';
  private airKey = '';

  private trialGroup = new THREE.Group();
  private trialKey = '';
  private plateDisplay: CanvasPanel | null = null;
  private plateKey = '';
  private valveGauge: CanvasPanel | null = null;
  private valveWheel: THREE.Object3D | null = null;
  private valveKey = '';
  private centerDisplay: CanvasPanel | null = null;
  private centerKey = '';
  private handles = new Map<number, THREE.MeshStandardMaterial>();
  private tiles: THREE.Mesh[] = [];

  private readonly objects = new Map<string, THREE.Object3D>();
  private readonly objectTargets = new Map<string, THREE.Vector3>();
  private readonly avatars = new Map<string, Avatar>();
  private readonly weightMats = new Map<number, THREE.MeshStandardMaterial>();
  private readonly metal = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.45, metalness: 0.8 });
  private time = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    scene.add(this.group);
    this.group.add(this.trialGroup);
    camera.add(this.hand);
    this.hand.position.set(0.32, -0.34, -0.62);

    this.rulesMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.02),
      new THREE.MeshBasicMaterial({ map: this.rules.texture, toneMapped: false }),
    );
    this.airMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 2.0),
      new THREE.MeshBasicMaterial({ map: this.air.texture, toneMapped: false }),
    );
    this.group.add(this.rulesMesh, this.airMesh);
    this.setHome(0);
  }

  setHome(cell: number): void {
    this.home = cell;
    onBackWall(this.rulesMesh, cell, 0, 3.05);
    onBackWall(this.airMesh, cell, -2.4, 1.55);
    this.rulesKey = this.airKey = '';
  }

  // ───────────── Props de cada prueba ─────────────

  private syncTrial(trialId: TrialId | null, cells: number[]): void {
    const key = `${trialId}:${cells.join(',')}`;
    if (key === this.trialKey) return;
    this.trialKey = key;
    this.group.remove(this.trialGroup);
    this.trialGroup = new THREE.Group();
    this.group.add(this.trialGroup);
    this.plateDisplay = this.valveGauge = this.centerDisplay = null;
    this.valveWheel = null;
    this.handles.clear();
    this.tiles = [];
    this.plateKey = this.valveKey = this.centerKey = '';
    if (trialId === 'presion') for (const c of cells) this.buildPedestal(c);
    if (trialId === 'valvula') for (const c of cells) this.buildValve(c);
    if (trialId === 'llave') this.buildCenter(cells);
  }

  private buildPedestal(cell: number): void {
    const p = pedestalPos(cell);
    const color = TRIAL_TYPES.cristal.color;
    const base = new THREE.Mesh(new THREE.BoxGeometry(PEDESTAL.size, PEDESTAL.height, PEDESTAL.size), this.metal);
    base.position.set(p.x, PEDESTAL.height / 2, p.z);
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(PEDESTAL.size - 0.05, 0.04, PEDESTAL.size - 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111317, emissive: color, emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.3 }),
    );
    plate.position.set(p.x, PEDESTAL.height + 0.02, p.z);
    this.trialGroup.add(base, plate);
    if (cell === this.home) {
      const panel = new CanvasPanel(256, 128);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshBasicMaterial({ map: panel.texture, toneMapped: false }));
      const f = DIRS[cell];
      const fp = cellPoint(cell, PEDESTAL.forward - PEDESTAL.size / 2 - 0.01, 0);
      mesh.position.set(fp.x, 0.55, fp.z);
      mesh.lookAt(fp.x - f.x, 0.55, fp.z - f.z);
      this.trialGroup.add(mesh);
      this.plateDisplay = panel;
    }
  }

  private buildValve(cell: number): void {
    const wheel = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 10, 32), this.metal);
    wheel.add(ring);
    for (let k = 0; k < 3; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.04), this.metal);
      spoke.rotation.z = (k * Math.PI) / 3;
      wheel.add(spoke);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: TRIAL_TYPES.cadena.color, emissiveIntensity: 2 }),
    );
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);
    const holder = new THREE.Group();
    holder.add(wheel);
    const v = valvePos(cell);
    const f = DIRS[cell];
    holder.position.set(v.x - f.x * 0.1, 1.3, v.z - f.z * 0.1);
    holder.lookAt(v.x - f.x * 2, 1.3, v.z - f.z * 2);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 12), this.metal);
    pipe.position.set(v.x - f.x * 0.12, 4.0, v.z - f.z * 0.12);
    this.trialGroup.add(holder, pipe);
    if (cell === this.home) {
      this.valveWheel = wheel;
      const panel = new CanvasPanel(512, 256);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshBasicMaterial({ map: panel.texture, toneMapped: false }));
      onBackWall(mesh, cell, 1.55, 1.45);
      this.trialGroup.add(mesh);
      this.valveGauge = panel;
    }
  }

  private buildCenter(cells: number[]): void {
    const color = TRIAL_TYPES.arena.color;
    const ped = new THREE.Mesh(new THREE.BoxGeometry(CENTER_PEDESTAL.size, CENTER_PEDESTAL.height, CENTER_PEDESTAL.size), this.metal);
    ped.position.y = CENTER_PEDESTAL.height / 2;
    this.trialGroup.add(ped);
    const panel = new CanvasPanel(256, 256);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.66), new THREE.MeshBasicMaterial({ map: panel.texture, toneMapped: false }));
    top.rotation.x = -Math.PI / 2;
    // La pantalla se lee derecho desde la puerta de la celda propia.
    const display = new THREE.Group();
    display.add(top);
    const d = DIRS[this.home];
    display.rotation.y = yawFacing({ x: -d.x, z: -d.z });
    display.position.y = CENTER_PEDESTAL.height + 0.005;
    this.trialGroup.add(display);
    this.centerDisplay = panel;

    for (const c of cells) {
      const p = handlePos(c);
      const post = new THREE.Mesh(new THREE.BoxGeometry(HANDLE.size, HANDLE.height, HANDLE.size), this.metal);
      post.position.set(p.x, HANDLE.height / 2, p.z);
      const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: 0.3 });
      const grip = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 20), mat);
      grip.position.set(p.x, HANDLE.height + 0.08, p.z);
      grip.rotation.x = Math.PI / 2;
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: labelTexture(CELL_NUMERALS[c], { size: 150 }), transparent: true, toneMapped: false, opacity: 0.8 }),
      );
      label.scale.set(0.45, 0.45, 1);
      label.position.set(p.x, HANDLE.height + 0.45, p.z);
      this.trialGroup.add(post, grip, label);
      this.handles.set(c, mat);
    }

    const tileMat = () =>
      new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    for (let i = 0; i < 9; i++) {
      const t = tileCenter(i);
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 1.94), tileMat());
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(t.x, 0.015, t.z);
      this.trialGroup.add(tile);
      this.tiles.push(tile);
    }
  }

  // ───────────── Paneles ─────────────

  updatePanels(s: Snapshot): void {
    this.syncTrial(s.trialId, s.trialCells);
    this.drawRules(s);
    this.drawAir(s);
    this.drawTrialPanels(s);
  }

  private drawRules(s: Snapshot): void {
    const def = s.trialIndex >= 0 ? TRIALS.find((t) => t.id === (s.trialId ?? '')) : undefined;
    const timer = s.phaseTotal > 0 ? Math.ceil(s.phaseLeft) : 0;
    const view = s.view;
    const occupied = s.roster.map((r) => r.cell).join(',');
    const key = [s.phase, s.trialId, timer, view?.kind === 'presion' ? view.clue : '', occupied, s.roster.filter((r) => r.ready).length].join('|');
    if (key === this.rulesKey) return;
    this.rulesKey = key;

    const { g, width, height } = this.rules;
    g.fillStyle = '#090b0f';
    g.fillRect(0, 0, width, height);
    g.strokeStyle = 'rgba(217,222,230,0.18)';
    g.lineWidth = 3;
    g.strokeRect(6, 6, width - 12, height - 12);

    const type = def ? TRIAL_TYPES[def.type] : null;
    const color = type ? hex(type.color) : INK;
    const pad = 44;
    const textW = 640;
    let over = '';
    let title = '';
    let lines: string[] = [];
    switch (s.phase) {
      case 'lobby':
        over = 'Sala de espera';
        title = `Celda ${CELL_NUMERALS[s.me.cell]}`;
        lines = [
          `${s.roster.length} de 4 celdas ocupadas. ${s.roster.filter((r) => r.ready).length} listas.`,
          'Presiona Enter cuando estés listo.',
          'Haz clic en un muro para golpearlo.',
        ];
        break;
      case 'countdown':
        over = 'Sala de espera';
        title = 'El ciclo comienza';
        break;
      case 'intro':
        over = 'Ciclo 1';
        title = 'El Cuboide';
        lines = ['Escucha al Anfitrión.'];
        break;
      case 'end':
        over = 'Ciclo 1';
        title = 'Fin del ciclo';
        break;
      default:
        if (def && type) {
          over = `Prueba ${s.trialIndex + 1}/${s.trialCount} · ${type.symbol} ${type.name} · ${def.edges} aristas`;
          title = def.title;
          lines = def.rules;
        }
    }

    g.textBaseline = 'top';
    g.fillStyle = type ? color : MUTED;
    g.font = `600 24px ${MONO}`;
    g.fillText(over.toUpperCase(), pad, pad);
    g.fillStyle = INK;
    g.font = `800 64px ${FONT}`;
    g.fillText(title, pad, pad + 36);

    g.font = `400 29px ${FONT}`;
    g.fillStyle = '#c3cad4';
    let y = pad + 124;
    for (const line of lines) {
      for (const l of wrapText(g, line, textW)) {
        g.fillText(l, pad, y);
        y += 36;
      }
      y += 5;
    }

    if (view?.kind === 'presion' && view.clue && s.phase !== 'result') {
      g.fillStyle = color;
      g.font = `800 40px ${FONT}`;
      g.fillText(view.clue, pad, height - pad - 92);
    }

    if (timer > 0 && (s.phase === 'trial' || s.phase === 'announce' || s.phase === 'countdown')) {
      const frac = s.phaseLeft / s.phaseTotal;
      const bw = width - pad * 2 - 140;
      g.fillStyle = 'rgba(217,222,230,0.12)';
      g.fillRect(pad, height - pad - 18, bw, 14);
      g.fillStyle = s.phase === 'trial' ? color : MUTED;
      g.fillRect(pad, height - pad - 18, bw * frac, 14);
      g.font = `700 30px ${MONO}`;
      g.fillStyle = INK;
      g.textAlign = 'right';
      g.fillText(`${timer}s`, width - pad, height - pad - 30);
      g.textAlign = 'left';
    }

    this.drawMap(s, width - 170, 170);
    this.rules.commit();
  }

  /** Mapa del sector desde el punto de vista de esta celda: arriba es la pared del fondo. */
  private drawMap(s: Snapshot, cx: number, cy: number): void {
    const { g } = this.rules;
    const { f, r } = cellFrame(this.home);
    const me = CELL_CENTERS[this.home];
    const occupied = new Set(s.roster.map((q) => q.cell));
    const size = 58;
    g.font = `700 22px ${MONO}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let c = 0; c < CELL_CENTERS.length; c++) {
      const rel = { x: CELL_CENTERS[c].x - me.x, z: CELL_CENTERS[c].z - me.z };
      const lf = (rel.x * f.x + rel.z * f.z) / PITCH;
      const lr = (rel.x * r.x + rel.z * r.z) / PITCH;
      const x = cx + lr * (size + 8);
      const y = cy - lf * (size + 8);
      const mine = c === this.home;
      g.fillStyle = mine ? 'rgba(56,182,255,0.35)' : occupied.has(c) ? 'rgba(217,222,230,0.12)' : 'rgba(0,0,0,0)';
      g.fillRect(x - size / 2, y - size / 2, size, size);
      g.strokeStyle = mine ? '#38b6ff' : 'rgba(217,222,230,0.35)';
      g.lineWidth = 2;
      g.strokeRect(x - size / 2, y - size / 2, size, size);
      g.fillStyle = mine ? INK : c === CENTER ? MUTED : '#b9c1cc';
      g.fillText(mine ? 'TÚ' : c === CENTER ? '·' : CELL_NUMERALS[c], x, y + 1);
    }
    g.textAlign = 'left';
    g.textBaseline = 'top';
  }

  private drawAir(s: Snapshot): void {
    const air = Math.max(0, s.me.air);
    const blink = air < 20 && Math.floor(this.time * 3) % 2 === 0;
    const key = `${Math.ceil(air)}|${blink}|${s.me.alive}`;
    if (key === this.airKey) return;
    this.airKey = key;
    const { g, width, height } = this.air;
    g.fillStyle = '#090b0f';
    g.fillRect(0, 0, width, height);
    g.strokeStyle = 'rgba(217,222,230,0.18)';
    g.lineWidth = 3;
    g.strokeRect(4, 4, width - 8, height - 8);
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillStyle = MUTED;
    g.font = `700 22px ${MONO}`;
    g.fillText('AIRE', width / 2, 18);
    const color = air > 90 ? '#9fe8ff' : air > 45 ? '#ffc23a' : '#ff4d4d';
    g.fillStyle = s.me.alive ? color : MUTED;
    g.font = `800 34px ${MONO}`;
    g.fillText(s.me.alive ? `${Math.ceil(air)}` : '0', width / 2, 48);
    const segs = 20;
    const top = 100;
    const bottom = height - 24;
    const segH = (bottom - top) / segs;
    const filled = Math.ceil((Math.min(air, 300) / 300) * segs);
    for (let i = 0; i < segs; i++) {
      const on = i < filled && !(blink && i === filled - 1);
      g.fillStyle = on ? color : 'rgba(217,222,230,0.08)';
      g.fillRect(28, bottom - (i + 1) * segH + 3, width - 56, segH - 6);
    }
    this.air.commit();
  }

  private drawTrialPanels(s: Snapshot): void {
    const v = s.view;
    if (this.plateDisplay && v?.kind === 'presion') {
      const key = `${v.plateSum}`;
      if (key !== this.plateKey) {
        this.plateKey = key;
        const { g, width, height } = this.plateDisplay;
        g.fillStyle = '#07090c';
        g.fillRect(0, 0, width, height);
        g.fillStyle = hex(TRIAL_TYPES.cristal.color);
        g.font = `800 76px ${MONO}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(`Σ ${v.plateSum}`, width / 2, height / 2 + 4);
        this.plateDisplay.commit();
      }
    }
    if (this.valveGauge && v?.kind === 'valvula') {
      if (this.valveWheel) this.valveWheel.rotation.z = -v.pressure * Math.PI * 1.5;
      const key = `${v.pressure.toFixed(2)}|${v.progress.toFixed(2)}|${v.pulling}|${v.done}`;
      if (key !== this.valveKey) {
        this.valveKey = key;
        this.drawValve(v.pressure, v.progress, v.partner, v.pulling, v.done);
      }
    }
    if (this.centerDisplay && v?.kind === 'llave') {
      const timer = Math.ceil(s.phaseLeft);
      const key = `${v.hold.toFixed(2)}|${v.holders.length}|${v.needed.length}|${timer}|${v.key}`;
      if (key !== this.centerKey) {
        this.centerKey = key;
        this.drawCenter(v.hold, v.holders.length, v.needed.length, s.phase === 'trial' ? timer : 0, v.key === 'panel');
      }
      for (const [cell, mat] of this.handles) mat.emissiveIntensity = v.holders.includes(cell) ? 3.5 : v.key === 'panel' ? 0.9 : 0.25;
      v.tiles.forEach((state, i) => {
        const mat = this.tiles[i]?.material as THREE.MeshBasicMaterial | undefined;
        if (!mat) return;
        if (state === 1) {
          mat.color.setHex(0xffb02e);
          mat.opacity = Math.floor(this.time * 8) % 2 ? 0.25 : 0.05;
        } else if (state === 2) {
          mat.color.setHex(0xff2a1a);
          mat.opacity = 0.65;
        } else mat.opacity = 0;
      });
    }
  }

  private drawValve(pressure: number, progress: number, partner: number | null, pulling: boolean, done: boolean): void {
    const panel = this.valveGauge!;
    const { g, width, height } = panel;
    const color = hex(TRIAL_TYPES.cadena.color);
    g.fillStyle = '#090b0f';
    g.fillRect(0, 0, width, height);
    g.strokeStyle = 'rgba(217,222,230,0.18)';
    g.lineWidth = 3;
    g.strokeRect(4, 4, width - 8, height - 8);
    g.textBaseline = 'top';
    g.font = `700 20px ${MONO}`;
    g.fillStyle = MUTED;
    g.textAlign = 'left';
    g.fillText(partner === null ? 'ANFITRIÓN' : `CELDA ${CELL_NUMERALS[partner]}`, 24, 20);
    g.textAlign = 'right';
    g.fillStyle = INK;
    g.fillText('TÚ', width - 24, 20);
    const x0 = 24;
    const x1 = width - 24;
    const mid = (x0 + x1) / 2;
    const band = 0.2 * ((x1 - x0) / 2);
    g.fillStyle = 'rgba(217,222,230,0.1)';
    g.fillRect(x0, 60, x1 - x0, 46);
    g.fillStyle = 'rgba(61,255,154,0.25)';
    g.fillRect(mid - band, 60, band * 2, 46);
    const nx = mid + pressure * ((x1 - x0) / 2);
    g.fillStyle = Math.abs(pressure) < 0.2 ? color : '#ffc23a';
    g.fillRect(nx - 4, 52, 8, 62);
    g.fillStyle = 'rgba(217,222,230,0.12)';
    g.fillRect(x0, 150, x1 - x0, 18);
    g.fillStyle = color;
    g.fillRect(x0, 150, (x1 - x0) * progress, 18);
    g.textAlign = 'left';
    g.font = `600 20px ${MONO}`;
    g.fillStyle = MUTED;
    g.fillText(done ? 'EQUILIBRIO LOGRADO' : `EQUILIBRIO ${Math.floor(progress * VALVULA_HOLD)}/${VALVULA_HOLD} s`, x0, 182);
    if (pulling && !done) {
      g.textAlign = 'right';
      g.fillStyle = color;
      g.fillText('JALANDO', x1, 182);
    }
    panel.commit();
  }

  private drawCenter(hold: number, holders: number, needed: number, timer: number, inPanel: boolean): void {
    const panel = this.centerDisplay!;
    const { g, width, height } = panel;
    const color = hex(TRIAL_TYPES.arena.color);
    g.fillStyle = '#07090c';
    g.fillRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    g.lineWidth = 14;
    g.strokeStyle = 'rgba(217,222,230,0.1)';
    g.beginPath();
    g.arc(cx, cy, 96, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = color;
    g.beginPath();
    g.arc(cx, cy, 96, -Math.PI / 2, -Math.PI / 2 + hold * Math.PI * 2);
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = INK;
    g.font = `800 46px ${MONO}`;
    g.fillText(timer > 0 ? `${timer}` : '·', cx, cy - 14);
    g.font = `600 20px ${MONO}`;
    g.fillStyle = inPanel ? color : MUTED;
    g.fillText(inPanel ? `${holders}/${needed} · ${Math.floor(hold * LLAVE_HOLD)}s` : 'PANEL', cx, cy + 30);
    panel.commit();
  }

  // ───────────── Objetos y jugadores ─────────────

  private weightMaterial(value: number): THREE.MeshStandardMaterial {
    let mat = this.weightMats.get(value);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color: 0x262a31,
        roughness: 0.45,
        metalness: 0.7,
        emissive: TRIAL_TYPES.cristal.color,
        emissiveIntensity: 1.6,
        emissiveMap: labelTexture(String(value), { color: '#ffffff', bg: '#000000', size: 170 }),
      });
      this.weightMats.set(value, mat);
    }
    return mat;
  }

  private makeObject(o: ObjectView): THREE.Object3D {
    if (o.kind === 'weight') {
      const s = weightSize(o.value);
      return new THREE.Mesh(new THREE.BoxGeometry(s, s, s), this.weightMaterial(o.value));
    }
    const key = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: TRIAL_TYPES.arena.color, emissiveIntensity: 1.8 });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.05), mat);
    shaft.position.x = 0.06;
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 20), mat);
    head.position.x = -0.18;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.05), mat);
    tooth.position.set(0.2, -0.05, 0);
    key.add(shaft, head, tooth, new THREE.PointLight(TRIAL_TYPES.arena.color, 1.2, 3.5, 2));
    return key;
  }

  syncObjects(list: ObjectView[], meId: string): void {
    const seen = new Set<string>();
    for (const o of list) {
      seen.add(o.id);
      let obj = this.objects.get(o.id);
      const target = new THREE.Vector3(o.x, o.y, o.z);
      if (!obj) {
        obj = this.makeObject(o);
        obj.position.copy(target);
        this.objects.set(o.id, obj);
        this.group.add(obj);
      }
      const mine = o.heldBy === meId;
      if (mine && obj.parent !== this.hand) {
        this.hand.add(obj);
        obj.position.set(0, 0, 0);
        obj.rotation.set(0, 0.4, 0);
        obj.scale.setScalar(0.6);
      } else if (!mine && obj.parent === this.hand) {
        this.group.add(obj);
        obj.position.copy(target);
        obj.rotation.set(0, 0, 0);
        obj.scale.setScalar(1);
      }
      this.objectTargets.set(o.id, target);
    }
    for (const [id, obj] of this.objects) {
      if (seen.has(id)) continue;
      obj.removeFromParent();
      this.objects.delete(id);
      this.objectTargets.delete(id);
    }
  }

  syncPeers(peers: PeerView[]): void {
    const seen = new Set<string>();
    for (const p of peers) {
      seen.add(p.id);
      let a = this.avatars.get(p.id);
      if (!a) {
        a = this.makeAvatar(p.cell);
        a.group.position.set(p.x, p.y, p.z);
        this.avatars.set(p.id, a);
        this.group.add(a.group);
      }
      a.target.set(p.x, p.y, p.z);
      a.yaw = p.yaw;
      a.crouch = p.crouch;
    }
    for (const [id, a] of this.avatars) {
      if (seen.has(id)) continue;
      a.group.removeFromParent();
      this.avatars.delete(id);
    }
  }

  avatarPosition(id: string): THREE.Vector3 | null {
    return this.avatars.get(id)?.group.position ?? null;
  }

  private makeAvatar(cell: number): Avatar {
    const group = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: 0xb4bcc7, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.85, 4, 12), suit);
    body.position.y = 0.72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), suit);
    head.position.y = 1.55;
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe8edf2, emissiveIntensity: 2.5 }),
    );
    visor.position.set(0, 1.57, -0.15);
    const tag = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTexture(CELL_NUMERALS[cell], { size: 150 }), transparent: true, toneMapped: false }),
    );
    tag.scale.set(0.5, 0.5, 1);
    tag.position.y = 2.1;
    const torso = new THREE.Group();
    torso.add(body, head, visor);
    group.add(torso, tag);
    return { group, body: torso as unknown as THREE.Mesh, target: new THREE.Vector3(), yaw: 0, crouch: false };
  }

  update(dt: number): void {
    this.time += dt;
    const k = 1 - Math.exp(-dt * 14);
    for (const [id, obj] of this.objects) {
      if (obj.parent === this.hand) continue;
      const t = this.objectTargets.get(id);
      if (t) obj.position.lerp(t, k);
      if (obj.type === 'Group') obj.rotation.y += dt * 1.2;
    }
    for (const a of this.avatars.values()) {
      a.group.position.lerp(a.target, k);
      let dy = a.yaw - a.group.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      a.group.rotation.y += dy * k;
      const sy = a.crouch ? 0.62 : 1;
      a.body.scale.y += (sy - a.body.scale.y) * k;
    }
  }
}
