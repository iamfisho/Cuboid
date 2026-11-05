import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  CELL_NUMERALS,
  CENTER,
  TRIALS,
  TRIAL_TYPES,
  buildColliders,
  dist2D,
  forwardFromYaw,
  handlePos,
  locate,
  pedestalPos,
  tileAt,
  valvePos,
  type FxMsg,
  type Snapshot,
} from '@cuboid/shared';
import { CubeWorld } from './world';
import { Props } from './props';
import { LocalPlayer } from './player';
import { Sound } from './audio';
import { Net } from './net';
import { hex } from './textures';
import type { UI } from './ui';

const KNOCK_RANGE = 2.6;
const kbd = (k: string) => `<kbd>${k}</kbd>`;

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
  readonly world: CubeWorld;
  readonly props: Props;
  readonly player: LocalPlayer;
  readonly sound: Sound;
  readonly net = new Net();
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;

  snap: Snapshot | null = null;
  meId = '';
  joined = false;
  locked = false;
  private lightsKey = '';
  private resultsShown = false;
  private readonly raycaster = new THREE.Raycaster();
  private readonly sparks: { mesh: THREE.Mesh; life: number }[] = [];
  private readonly timer = new THREE.Timer();
  private frameCount = 0;
  private sizzleAt = 0;
  private fps = 60;
  private readonly doorWas = [0, 0, 0, 0];

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly ui: UI,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0x040508);
    this.scene.fog = new THREE.FogExp2(0x040508, 0.045);
    this.scene.add(this.camera);

    this.world = new CubeWorld(this.scene);
    this.props = new Props(this.scene, this.camera);
    this.player = new LocalPlayer(this.camera);
    this.sound = new Sound(this.camera, this.scene);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.45, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.world.setLights('cristal', 12, 8);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    this.timer.connect(document);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ───────────── Red ─────────────

  async join(name: string): Promise<void> {
    this.sound.start();
    this.resultsShown = false;
    this.snap = null;
    await this.net.join(name, {
      welcome: (m) => {
        this.meId = m.id;
        this.props.setHome(m.cell);
        this.joined = true;
      },
      snap: (s) => this.onSnap(s),
      knock: (m) => this.sound.playAt('knock', new THREE.Vector3(m.x, m.y, m.z)),
      impulse: (m) => this.player.impulse(m.x, m.y, m.z),
      teleport: (m) => this.player.teleport(m.x, m.y, m.z, m.yaw ?? undefined),
      host: (m) => {
        this.ui.host(m.lines);
        this.sound.play('chime', 0.35);
      },
      fx: (m) => this.onFx(m),
      left: (code) => {
        this.joined = false;
        if (code !== 1000 && code !== 4000) {
          document.exitPointerLock();
          this.ui.title.hidden = false;
          this.ui.setJoining(false);
          this.ui.error('Se perdió la conexión con el servidor.');
        }
      },
    });
    this.requestLock();
  }

  async newMatch(name: string): Promise<void> {
    await this.net.leave();
    document.querySelector<HTMLElement>('#results')!.hidden = true;
    this.ui.showDead(false);
    await this.join(name);
  }

  private onSnap(s: Snapshot): void {
    const prev = this.snap;
    this.snap = s;
    if (!prev || prev.phase !== s.phase) this.onPhase(s);

    const lk = `${s.lights.type}|${s.lights.edges}|${s.lights.vertices}`;
    if (lk !== this.lightsKey) {
      this.lightsKey = lk;
      this.world.setLights(s.lights.type, s.lights.edges, s.lights.vertices);
    }
    this.props.syncObjects(s.objects, this.meId);
    this.props.syncPeers(s.peers);

    if (prev?.me.alive && !s.me.alive) {
      this.ui.flash(1);
      this.ui.showDead(true);
      this.sound.play('sealed', 0.9);
    }
    for (let i = 0; i < 4; i++) {
      const d = s.world.doors[i];
      const moving = Math.abs(d - this.doorWas[i]) > 1e-3;
      const wasStill = prev ? Math.abs(prev.world.doors[i] - this.doorWas[i]) <= 1e-3 : true;
      if (moving && wasStill && prev) this.sound.playAt('door', this.world.doors[i].position, 0.8);
      this.doorWas[i] = d;
    }
    if (s.phase === 'end' && s.results && !this.resultsShown) {
      this.resultsShown = true;
      document.exitPointerLock();
      setTimeout(() => this.ui.showResults(s.results!, this.meId), 2500);
    }
  }

  private onPhase(s: Snapshot): void {
    if (s.phase === 'announce' && s.trialId) {
      const def = TRIALS.find((t) => t.id === s.trialId)!;
      const type = TRIAL_TYPES[def.type];
      this.ui.showCard(
        type.symbol,
        `Prueba ${s.trialIndex + 1} de ${s.trialCount} · ${type.name}`,
        def.title,
        `${def.edges} aristas · ${s.lights.vertices} ${s.lights.vertices === 1 ? 'jugador' : 'jugadores'}`,
        hex(type.color),
      );
      this.world.pulse();
      this.sound.play('door', 0.5);
    } else if (s.phase === 'countdown') {
      this.ui.showCard('○', 'Sala de espera', 'El ciclo comienza', '', '#d9dee6');
    }
  }

  private onFx(m: FxMsg): void {
    switch (m.kind) {
      case 'pickup':
        this.sound.play('pickup', 0.7);
        break;
      case 'drop':
      case 'place':
        this.sound.play('place', 0.7);
        break;
      case 'push':
        this.sound.play('whoosh', 0.6);
        break;
      case 'pushed':
        this.sound.play('whoosh', 0.9);
        this.ui.flash(0.25);
        break;
      case 'start':
        this.sound.play('beep', 0.6);
        break;
      case 'success':
      case 'escape':
        this.sound.play('success', 0.7);
        break;
      case 'fail':
        this.sound.play('fail', 0.7);
        break;
      case 'eliminated':
        if (m.id !== this.meId && m.x !== undefined) {
          this.sound.playAt('sealed', new THREE.Vector3(m.x, (m.y ?? 0) + 1, m.z), 0.7);
          this.world.pulse();
        }
        break;
    }
  }

  // ───────────── Entrada ─────────────

  requestLock(): void {
    if (!this.joined && !this.snap) return;
    void this.canvas.requestPointerLock?.()?.catch?.(() => undefined);
  }

  private bindInput(): void {
    this.canvas.addEventListener('click', () => {
      if (this.ui.title.hidden && document.querySelector<HTMLElement>('#results')!.hidden) this.requestLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.player.clearKeys();
    });
    document.addEventListener('mousemove', (e) => {
      if (this.locked) this.player.look(e.movementX, e.movementY);
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button === 0) this.knock();
      if (e.button === 2) this.net.send('push');
    });
    document.addEventListener('contextmenu', (e) => {
      if (this.locked) e.preventDefault();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.ui.setDebug(this.ui.debugVisible ? null : '');
        return;
      }
      if (!this.joined) return;
      if (e.code === 'Enter' && this.snap?.phase === 'lobby') {
        this.net.send('ready');
        return;
      }
      if (!this.locked) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.code === 'KeyE' && !e.repeat) {
        this.net.send('interact');
        this.net.send('use', { on: true });
      }
      this.player.keyDown(e.code);
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyE') this.net.send('use', { on: false });
      this.player.keyUp(e.code);
    });
  }

  private aimAtWall(): THREE.Intersection | null {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = KNOCK_RANGE;
    return this.raycaster.intersectObjects(this.world.knockable, false)[0] ?? null;
  }

  private knock(): void {
    if (!this.snap?.me.alive) return;
    const hit = this.aimAtWall();
    if (!hit) return;
    this.sound.playAt('knock', hit.point);
    this.net.send('knock', { x: hit.point.x, y: hit.point.y, z: hit.point.z });
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false }),
    );
    spark.position.copy(hit.point);
    this.scene.add(spark);
    this.sparks.push({ mesh: spark, life: 0.25 });
  }

  // ───────────── Pistas ─────────────

  private hint(s: Snapshot): string {
    if (!this.locked || !s.me.alive || s.me.escaped) return '';
    const p = this.player.body.pos;
    const v = s.view;
    const cell = s.me.cell;
    const loc = locate(p.x, p.z);
    const inCenter = !!loc && 'cell' in loc && loc.cell === CENTER;

    if (s.phase === 'trial' && v) {
      if (v.kind === 'presion') {
        if (s.me.holding) return dist2D(p, pedestalPos(cell)) <= 1.75 ? `${kbd('E')} Colocar en la balanza` : `${kbd('E')} Soltar`;
        const f = forwardFromYaw(this.player.yaw);
        const aim = { x: p.x + f.x * 0.9, z: p.z + f.z * 0.9 };
        const near = s.objects
          .filter((o) => o.kind === 'weight' && !o.heldBy && dist2D(p, o) <= 1.6)
          .sort((a, b) => dist2D(aim, a) - dist2D(aim, b))[0];
        if (near) return `${kbd('E')} Tomar peso ${near.value}`;
      } else if (v.kind === 'valvula') {
        if (!v.done && dist2D(p, valvePos(cell)) <= 1.7) {
          return v.pulling ? 'Jalando la presión hacia tu lado' : `Mantén ${kbd('E')} para jalar la presión hacia tu lado`;
        }
      } else if (v.kind === 'llave') {
        if (s.me.holding?.kind === 'key') {
          return inCenter && Math.hypot(p.x, p.z) <= 1.25
            ? `${kbd('E')} Insertar en el panel · o llévala a la celda ${CELL_NUMERALS[cell]}`
            : `Lleva la llave a la celda ${CELL_NUMERALS[cell]} · ${kbd('E')} Soltar`;
        }
        const key = s.objects.find((o) => o.kind === 'key');
        if (key && !key.heldBy && !key.inPanel && dist2D(p, key) <= 1.5) return `${kbd('E')} Tomar la llave`;
        if (v.key === 'panel' && inCenter) {
          if (dist2D(p, handlePos(cell)) <= 0.85) {
            return v.holders.includes(cell) ? `Sosteniendo la manija · ${v.holders.length}/${v.needed.length}` : `Mantén ${kbd('E')} para sostener tu manija`;
          }
          if (Math.hypot(p.x, p.z) <= 1.0) return `${kbd('E')} Sacar la llave del panel`;
        }
        const f = forwardFromYaw(this.player.yaw);
        const target = s.peers.find((q) => {
          const dx = q.x - p.x;
          const dz = q.z - p.z;
          const d = Math.hypot(dx, dz);
          return d < 2.2 && (dx * f.x + dz * f.z) / d > 0.45;
        });
        if (target) return `${kbd('Clic der.')} Empujar`;
      }
    }
    if (this.frameCount % 4 === 0) this.cachedKnock = this.aimAtWall() !== null;
    return this.cachedKnock ? `${kbd('Clic')} Golpear el muro` : '';
  }
  private cachedKnock = false;

  // ───────────── Cuadro ─────────────

  private frame(): void {
    this.timer.update();
    const dt = Math.min(0.05, this.timer.getDelta());
    const now = performance.now();
    this.frameCount++;
    this.fps += (1 / Math.max(dt, 1e-3) - this.fps) * 0.05;
    const s = this.snap;

    if (s) {
      this.world.update(dt, s.world.doors, s.world.ceilings, s.world.tilt);
      const boxes = buildColliders({ doors: this.world.doorOpen, ceilings: this.world.ceilingHeight }, s.trialId, s.trialCells);
      const p = this.player.body.pos;
      const loc = locate(p.x, p.z);
      const inHome = !!loc && 'cell' in loc && loc.cell === s.me.cell;
      const slide = inHome && s.phase === 'trial' ? s.world.tilt[s.me.cell] : { x: 0, z: 0 };
      this.player.update(dt, { boxes, alive: s.me.alive, holding: s.me.holding, slide, frozen: !this.locked });
      this.net.sendPos(now, {
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: this.player.yaw,
        pitch: this.player.pitch,
        crouch: this.player.crouching,
        sprint: this.player.sprinting,
        moving: this.player.moving,
      });
      this.props.updatePanels(s);
      this.props.update(dt);
      this.ui.setAir(s.me.air, s.me.alive);
      this.ui.setLobby(s);
      this.ui.setHint(this.hint(s));
      this.ui.showLockHint(!this.locked && this.ui.title.hidden && s.phase !== 'end');
      this.sound.updateBreath(now / 1000, s.me.air, s.me.alive);
      if (s.view?.kind === 'llave' && inHome === false && loc && 'cell' in loc && loc.cell === CENTER) {
        const tile = tileAt(p.x, p.z);
        if (tile >= 0 && s.view.tiles[tile] === 2 && now - this.sizzleAt > 280) {
          this.sizzleAt = now;
          this.sound.play('sizzle', 0.8);
        }
      }
    } else {
      // Pantalla de título: la cámara gira lentamente dentro de la celda central.
      const t = now / 1000;
      this.world.update(dt, [0, 0, 0, 0], [6, 6, 6, 6, 6], []);
      this.camera.position.set(Math.sin(t * 0.07) * 1.2, 2.4, Math.cos(t * 0.07) * 1.2);
      this.camera.rotation.set(0.32, t * 0.07 + Math.PI, 0, 'YXZ');
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= dt;
      (sp.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, sp.life / 0.25);
      if (sp.life <= 0) {
        sp.mesh.removeFromParent();
        this.sparks.splice(i, 1);
      }
    }

    this.ui.update(now, dt);
    if (this.ui.debugVisible && this.frameCount % 10 === 0) {
      const p = this.player.body.pos;
      this.ui.setDebug(
        [
          `fps   ${this.fps.toFixed(0)}`,
          `fase  ${s?.phase ?? '-'} ${s ? Math.ceil(s.phaseLeft) : ''}`,
          `aire  ${s ? s.me.air.toFixed(1) : '-'}`,
          `celda ${s ? CELL_NUMERALS[s.me.cell] : '-'}`,
          `pos   ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}`,
          `pares ${s?.peers.length ?? 0}  objetos ${s?.objects.length ?? 0}`,
        ].join('\n'),
      );
    }
    this.composer.render();
  }
}
