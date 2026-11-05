import {
  CELL,
  CELL_CENTERS,
  CELL_NUMERALS,
  PLAYER_CELLS,
  TICK_MS,
  TRIALS,
  TUNING,
  canTransition,
  clampToCell,
  forwardFromYaw,
  locCell,
  locate,
  penaltyFor,
  rewardFor,
  spawnFor,
  weightSize,
  zones,
  type Held,
  type KnockMsg,
  type Loc,
  type Phase,
  type PosMsg,
  type ResultEntry,
  type Snapshot,
  type TrialDef,
  type TrialId,
} from '@cuboid/shared';
import type { GameObject, Outbox, Outcome, PlayerState, TrialRuntime } from './types';
import { Presion } from './trials/presion';
import { Valvula } from './trials/valvula';
import { Llave } from './trials/llave';

export interface MatchOptions {
  rng?: () => number;
  /** Jugadores mínimos para poder empezar (por defecto 1, útil para probar solo). */
  minPlayers?: number;
  trials?: TrialId[];
}

const INTRO_LINES = [
  'Bienvenidos al Cuboide.',
  'Cada celda tiene una reserva de aire. El aire se agota.',
  'Superar una prueba devuelve aire. Fallar cuesta aire.',
  'Los muros transmiten el sonido. Golpéenlos si quieren ser escuchados.',
];

const DRAIN_PHASES: ReadonlySet<Phase> = new Set(['intro', 'announce', 'trial', 'result']);

export class Match {
  readonly players = new Map<string, PlayerState>();
  readonly objects = new Map<string, GameObject>();
  readonly rng: () => number;
  readonly minPlayers: number;
  readonly trialIds: TrialId[];

  phase: Phase = 'lobby';
  phaseLeft = 0;
  phaseTotal = 0;
  time = 0;
  trialIndex = -1;
  trial: TrialRuntime | null = null;
  currentDef: TrialDef | null = null;
  participants: string[] = [];
  results: ResultEntry[] | null = null;

  readonly world = {
    doors: [0, 0, 0, 0],
    doorTargets: [0, 0, 0, 0],
    ceilings: CELL_CENTERS.map(() => CELL),
    ceilingTargets: CELL_CENTERS.map(() => CELL),
    tilt: PLAYER_CELLS.map(() => ({ x: 0, z: 0 })),
  };

  constructor(
    private readonly out: Outbox,
    opts: MatchOptions = {},
  ) {
    this.rng = opts.rng ?? Math.random;
    this.minPlayers = Math.max(1, opts.minPlayers ?? 1);
    this.trialIds = opts.trials ?? TRIALS.map((t) => t.id);
  }

  // ───────────── Jugadores ─────────────

  addPlayer(id: string, name: string): number | null {
    if (this.phase !== 'lobby') return null;
    const used = new Set([...this.players.values()].map((p) => p.home));
    const home = PLAYER_CELLS.find((c) => !used.has(c));
    if (home === undefined) return null;
    const s = spawnFor(home);
    const p: PlayerState = {
      id,
      name: name || `Celda ${CELL_NUMERALS[home]}`,
      home,
      connected: true,
      pos: { x: s.x, y: s.y, z: s.z },
      yaw: s.yaw,
      pitch: 0,
      crouch: false,
      sprint: false,
      moving: false,
      loc: { cell: home },
      lastPosAt: this.time,
      lastTeleportAt: -1,
      ignorePosUntil: 0,
      impulseUntil: 0,
      air: TUNING.startAir,
      alive: true,
      escaped: false,
      ready: false,
      using: false,
      holding: null,
      pushReadyAt: 0,
      knockReadyAt: 0,
      detail: '',
    };
    this.players.set(id, p);
    this.out.send(id, 'welcome', { id, cell: home });
    this.teleport(p, s.x, s.y, s.z, s.yaw);
    return home;
  }

  removePlayer(id: string): void {
    const p = this.players.get(id);
    if (!p) return;
    if (this.phase === 'lobby' || this.phase === 'countdown') {
      this.players.delete(id);
      return;
    }
    if (p.alive) this.eliminate(p, 'Se desconectó');
    p.connected = false;
  }

  participantPlayers(): PlayerState[] {
    return this.participants.map((id) => this.players.get(id)).filter((p): p is PlayerState => !!p);
  }

  handle(id: string, type: string, msg: unknown): void {
    const p = this.players.get(id);
    if (!p || !p.connected) return;
    switch (type) {
      case 'pos':
        this.onPos(p, msg as PosMsg);
        break;
      case 'ready':
        if (this.phase === 'lobby') p.ready = !p.ready;
        break;
      case 'interact':
        if (this.phase === 'trial' && p.alive && !p.escaped) this.trial?.onInteract?.(p);
        break;
      case 'use':
        p.using = !!(msg as { on?: boolean } | null)?.on;
        break;
      case 'push':
        this.onPush(p);
        break;
      case 'knock':
        this.onKnock(p, msg as KnockMsg);
        break;
    }
  }

  private onPos(p: PlayerState, m: PosMsg): void {
    if (!m || ![m.x, m.y, m.z, m.yaw, m.pitch].every(Number.isFinite)) return;
    p.yaw = m.yaw;
    p.pitch = Math.max(-1.6, Math.min(1.6, m.pitch));
    p.crouch = !!m.crouch;
    p.sprint = !!m.sprint;
    p.moving = !!m.moving;
    if (this.time < p.ignorePosUntil) return;
    if (!p.alive) {
      p.pos = { x: m.x, y: m.y, z: m.z };
      return;
    }
    const dt = Math.max(TICK_MS / 1000, this.time - p.lastPosAt);
    const dist = Math.hypot(m.x - p.pos.x, m.y - p.pos.y, m.z - p.pos.z);
    const allowed = 12 * dt + 0.8 + (this.time < p.impulseUntil ? 3 : 0);
    const loc = locate(m.x, m.z);
    const valid =
      dist <= allowed && loc !== null && canTransition(p.loc, loc, this.world.doors) && m.y > -1 && m.y < CELL;
    if (!valid || !loc) {
      if (this.time - p.lastTeleportAt > 0.3) this.teleport(p, p.pos.x, p.pos.y, p.pos.z);
      return;
    }
    p.pos = { x: m.x, y: m.y, z: m.z };
    p.loc = loc;
    p.lastPosAt = this.time;
  }

  teleport(p: PlayerState, x: number, y: number, z: number, yaw?: number): void {
    p.pos = { x, y, z };
    p.loc = locate(x, z) ?? p.loc;
    p.lastPosAt = this.time;
    p.lastTeleportAt = this.time;
    p.ignorePosUntil = this.time + 0.25;
    if (yaw !== undefined) p.yaw = yaw;
    this.out.send(p.id, 'teleport', { x, y, z, yaw });
  }

  private onKnock(p: PlayerState, m: KnockMsg): void {
    if (!p.alive || !m || ![m.x, m.y, m.z].every(Number.isFinite) || this.time < p.knockReadyAt) return;
    if (Math.hypot(m.x - p.pos.x, m.z - p.pos.z) > 3.2) return;
    p.knockReadyAt = this.time + 0.12;
    // El sonido viaja por el metal: lo oyen todos, desde el punto donde se golpeó.
    for (const q of this.players.values()) {
      if (q.id !== p.id && q.connected) this.out.send(q.id, 'knock', { x: m.x, y: m.y, z: m.z });
    }
  }

  private onPush(p: PlayerState): void {
    if (this.phase !== 'trial' || !this.trial?.def.allowPush) return;
    if (!p.alive || p.escaped || this.time < p.pushReadyAt) return;
    p.pushReadyAt = this.time + TUNING.pushCooldown;
    const f = forwardFromYaw(p.yaw);
    const zone = zones(this.world.doors);
    let best: PlayerState | null = null;
    let bestD = Infinity;
    for (const q of this.players.values()) {
      if (q === p || !q.alive || q.escaped || !q.connected) continue;
      if (zone[locCell(q.loc)] !== zone[locCell(p.loc)]) continue;
      const dx = q.pos.x - p.pos.x;
      const dz = q.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > TUNING.pushRange || d < 1e-3) continue;
      if ((dx * f.x + dz * f.z) / d < 0.45) continue;
      if (d < bestD) {
        best = q;
        bestD = d;
      }
    }
    this.out.send(p.id, 'fx', { kind: 'push' });
    if (!best) return;
    const nx = (best.pos.x - p.pos.x) / bestD;
    const nz = (best.pos.z - p.pos.z) / bestD;
    best.impulseUntil = this.time + 0.8;
    this.out.send(best.id, 'impulse', { x: nx * TUNING.pushSpeed, y: 3, z: nz * TUNING.pushSpeed });
    this.out.send(best.id, 'fx', { kind: 'pushed' });
    this.trial.onPushed?.(best);
  }

  // ───────────── Objetos ─────────────

  addObject(o: GameObject): void {
    this.objects.set(o.id, o);
  }

  removeObject(id: string): void {
    const o = this.objects.get(id);
    if (!o) return;
    if (o.heldBy) {
      const h = this.players.get(o.heldBy);
      if (h && h.holding === id) h.holding = null;
    }
    this.objects.delete(id);
  }

  /** Suelta en el piso lo que lleve el jugador, dentro de la celda en la que está. */
  dropHeld(p: PlayerState): GameObject | null {
    if (!p.holding) return null;
    const o = this.objects.get(p.holding);
    p.holding = null;
    if (!o) return null;
    o.heldBy = null;
    const c = clampToCell(locCell(p.loc), p.pos.x, p.pos.z, 0.4);
    o.x = c.x;
    o.z = c.z;
    o.y = o.kind === 'weight' ? weightSize(o.value) / 2 : 0.08;
    return o;
  }

  private updateHeld(): void {
    for (const o of this.objects.values()) {
      if (!o.heldBy) continue;
      const h = this.players.get(o.heldBy);
      if (!h || !h.alive || h.holding !== o.id) {
        o.heldBy = null;
        continue;
      }
      const f = forwardFromYaw(h.yaw);
      o.x = h.pos.x + f.x * 0.55;
      o.z = h.pos.z + f.z * 0.55;
      o.y = h.pos.y + (h.crouch ? 0.55 : 1.0);
    }
  }

  // ───────────── Ciclo de la partida ─────────────

  tick(dt: number): void {
    this.time += dt;
    if (this.phase === 'lobby') {
      this.checkStart();
      return;
    }
    if (this.phase !== 'end') {
      this.phaseLeft -= dt;
      if (DRAIN_PHASES.has(this.phase)) this.drainAir(dt);
      if (this.phase === 'trial') this.trial?.tick(dt);
    }
    this.updateHeld();
    this.animateWorld(dt);
    if (this.phase === 'end') return;
    this.checkAir();
    if (this.phaseLeft <= 0) this.advance();
    // advance() pudo terminar la partida, por eso se vuelve a consultar la fase.
    if (!this.isOver() && ![...this.players.values()].some((p) => p.alive && p.connected)) this.endMatch();
  }

  isOver(): boolean {
    return this.phase === 'end';
  }

  private checkStart(): void {
    const ps = [...this.players.values()];
    if (ps.length >= this.minPlayers && ps.every((p) => p.ready)) {
      this.setPhase('countdown', TUNING.countdown);
      this.out.onStart?.();
    }
  }

  private setPhase(phase: Phase, duration: number): void {
    this.phase = phase;
    this.phaseLeft = duration;
    this.phaseTotal = duration;
  }

  private advance(): void {
    switch (this.phase) {
      case 'countdown':
        this.setPhase('intro', TUNING.intro);
        this.host(INTRO_LINES);
        break;
      case 'intro':
        this.beginAnnounce(0);
        break;
      case 'announce':
        this.beginTrial();
        break;
      case 'trial':
        this.trial?.timeout();
        if (this.phase === 'trial') this.finishTrial(new Map(this.participants.map((id) => [id, 'fail'])), []);
        break;
      case 'result':
        if (this.trialIndex + 1 < this.trialIds.length) this.beginAnnounce(this.trialIndex + 1);
        else this.endMatch();
        break;
    }
  }

  private beginAnnounce(index: number): void {
    this.trialIndex = index;
    const id = this.trialIds[index];
    this.participants = [...this.players.values()].filter((p) => p.alive && p.connected).map((p) => p.id);
    for (const p of this.participantPlayers()) {
      p.escaped = false;
      p.using = false;
      this.dropHeld(p);
      if (locCell(p.loc) !== p.home || !('cell' in p.loc)) {
        const s = spawnFor(p.home);
        this.teleport(p, s.x, s.y, s.z, s.yaw);
      }
    }
    for (const i of PLAYER_CELLS) this.world.doorTargets[i] = 0;
    this.trial = createTrial(id, this);
    this.currentDef = this.trial.def;
    this.trial.setup();
    this.setPhase('announce', TUNING.announce);
    this.host([`Prueba ${index + 1}: ${this.trial.def.title}.`, ...this.trial.def.rules]);
  }

  private beginTrial(): void {
    if (!this.trial) return;
    this.setPhase('trial', this.trial.def.duration);
    this.trial.start();
    for (const p of this.participantPlayers()) this.out.send(p.id, 'fx', { kind: 'start' });
    this.host(['Comienza.']);
  }

  /** Cierra la prueba actual: aplica premios, castigos y eliminaciones. */
  finishTrial(outcomes: Map<string, Outcome>, lines: string[]): void {
    if (this.phase !== 'trial' || !this.trial) return;
    const def = this.trial.def;
    for (const [id, outcome] of outcomes) {
      const p = this.players.get(id);
      if (!p || !p.alive) continue;
      if (outcome === 'pass' || outcome === 'escaped') {
        p.air += rewardFor(def.edges);
        this.out.send(p.id, 'fx', { kind: outcome === 'escaped' ? 'escape' : 'success' });
      } else if (outcome === 'fail') {
        p.air -= penaltyFor(def.edges);
        this.out.send(p.id, 'fx', { kind: 'fail' });
      } else {
        this.eliminate(p, `Sellado en ${def.title}`);
      }
    }
    this.trial.cleanup();
    this.trial = null;
    this.setPhase('result', TUNING.result);
    if (lines.length) this.host(lines);
  }

  private endMatch(): void {
    if (this.trial) {
      this.trial.cleanup();
      this.trial = null;
    }
    this.phase = 'end';
    this.phaseLeft = 0;
    this.phaseTotal = 0;
    this.currentDef = null;
    const survivors = [...this.players.values()].filter((p) => p.alive && p.connected);
    this.results = [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      cell: p.home,
      escaped: p.alive && p.connected,
      air: Math.max(0, Math.round(p.air)),
      detail: p.alive && p.connected ? `Salió con ${Math.round(p.air)} s de aire` : p.detail,
    }));
    this.host([
      'El ciclo ha terminado.',
      survivors.length === 0
        ? 'Nadie ha salido.'
        : survivors.length === 1
          ? 'Una celda ha salido.'
          : `${survivors.length} celdas han salido.`,
    ]);
  }

  private drainAir(dt: number): void {
    for (const p of this.players.values()) {
      if (!p.alive || p.escaped) continue;
      const rate = TUNING.baseDrain + (p.sprint && p.moving ? TUNING.sprintExtraDrain : 0);
      p.air -= rate * dt;
    }
  }

  private checkAir(): void {
    for (const p of this.players.values()) {
      if (p.alive && p.air <= 0) {
        p.air = 0;
        this.eliminate(p, this.currentDef ? `Sin aire en ${this.currentDef.title}` : 'Sin aire');
      }
    }
  }

  eliminate(p: PlayerState, detail: string): void {
    if (!p.alive) return;
    this.trial?.onEliminated?.(p);
    this.dropHeld(p);
    p.alive = false;
    p.using = false;
    p.air = Math.max(0, p.air);
    p.detail = detail;
    for (const q of this.players.values()) {
      if (q.connected) this.out.send(q.id, 'fx', { kind: 'eliminated', id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    }
    this.host([`Celda ${CELL_NUMERALS[p.home]}: sellada.`]);
  }

  private animateWorld(dt: number): void {
    const w = this.world;
    for (let i = 0; i < w.doors.length; i++) w.doors[i] = approach(w.doors[i], w.doorTargets[i], dt / 0.9);
    for (let i = 0; i < w.ceilings.length; i++) w.ceilings[i] = approach(w.ceilings[i], w.ceilingTargets[i], 3 * dt);
  }

  host(lines: string[], ids?: string[]): void {
    const targets = ids ?? [...this.players.values()].filter((p) => p.connected).map((p) => p.id);
    for (const id of targets) this.out.send(id, 'host', { lines });
  }

  fx(p: PlayerState, kind: string): void {
    this.out.send(p.id, 'fx', { kind });
  }

  // ───────────── Vista por jugador ─────────────

  snapshotFor(id: string): Snapshot | null {
    const p = this.players.get(id);
    if (!p) return null;
    const zone = zones(this.world.doors);
    const myZone = zone[locCell(p.loc)];
    const sees = (loc: Loc | null) => !p.alive || (loc !== null && zone[locCell(loc)] === myZone);
    const def = this.currentDef;
    const showLights = def && (this.phase === 'announce' || this.phase === 'trial' || this.phase === 'result');

    return {
      phase: this.phase,
      phaseLeft: Math.max(0, this.phaseLeft),
      phaseTotal: this.phaseTotal,
      trialIndex: this.trialIndex,
      trialCount: this.trialIds.length,
      trialId: this.trial?.def.id ?? null,
      trialCells: this.trial ? this.participantPlayers().map((q) => q.home) : [],
      lights: showLights
        ? { type: def.type, edges: def.edges, vertices: this.participants.length }
        : { type: null, edges: 0, vertices: 0 },
      minPlayers: this.minPlayers,
      me: {
        id: p.id,
        name: p.name,
        cell: p.home,
        air: Math.max(0, p.air),
        alive: p.alive,
        escaped: p.escaped,
        ready: p.ready,
        holding: this.heldOf(p),
      },
      roster: [...this.players.values()]
        .filter((q) => q.connected)
        .map((q) => ({ id: q.id, name: q.name, cell: q.home, ready: q.ready, alive: q.alive })),
      peers: [...this.players.values()]
        .filter((q) => q !== p && q.alive && q.connected && sees(q.loc))
        .map((q) => ({
          id: q.id,
          cell: q.home,
          x: q.pos.x,
          y: q.pos.y,
          z: q.pos.z,
          yaw: q.yaw,
          crouch: q.crouch,
          holding: this.heldOf(q),
        })),
      objects: [...this.objects.values()]
        .filter((o) => sees(locate(o.x, o.z)))
        .map((o) => ({ id: o.id, kind: o.kind, value: o.value, x: o.x, y: o.y, z: o.z, heldBy: o.heldBy, inPanel: o.inPanel })),
      world: {
        doors: [...this.world.doors],
        ceilings: [...this.world.ceilings],
        tilt: this.world.tilt.map((t) => ({ ...t })),
      },
      view: this.trial && (this.phase === 'announce' || this.phase === 'trial') ? this.trial.view(p) : null,
      results: this.phase === 'end' ? this.results : null,
    };
  }

  private heldOf(p: PlayerState): Held | null {
    if (!p.holding) return null;
    const o = this.objects.get(p.holding);
    if (!o) return null;
    return o.kind === 'key' ? { kind: 'key' } : { kind: 'weight', value: o.value };
  }
}

function approach(v: number, target: number, step: number): number {
  if (v < target) return Math.min(target, v + step);
  if (v > target) return Math.max(target, v - step);
  return v;
}

function createTrial(id: TrialId, m: Match): TrialRuntime {
  switch (id) {
    case 'presion':
      return new Presion(m);
    case 'valvula':
      return new Valvula(m);
    case 'llave':
      return new Llave(m);
  }
}

