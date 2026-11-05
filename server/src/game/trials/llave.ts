import {
  CELL_NUMERALS,
  CENTER,
  CENTER_PEDESTAL,
  DIRS,
  LLAVE_HOLD,
  clampToCell,
  dist2D,
  forwardFromYaw,
  handlePos,
  locCell,
  locate,
  tileAt,
  trialDef,
  type TrialView,
} from '@cuboid/shared';
import type { Match } from '../Match';
import type { GameObject, Outcome, PlayerState, TrialRuntime } from '../types';

const KEY_ID = 'key';
const KEY_Y = CENTER_PEDESTAL.height + 0.12;
const TRAP_DRAIN = 7;
const HANDLE_RANGE = 0.85;
const TRAP_TILES = [0, 1, 2, 3, 5, 6, 7, 8];

type KeyState = 'pedestal' | 'held' | 'floor' | 'panel' | 'gone';

/** Arena · 7 aristas. Una llave: salir solo, o salir todos sosteniendo el panel entre trampas. */
export class Llave implements TrialRuntime {
  readonly def = trialDef('llave');
  state: KeyState = 'pedestal';
  hold = 0;
  readonly tiles = new Array<number>(9).fill(0);
  private readonly tileClock = new Array<number>(9).fill(0);
  private trapTimer = 1.5;
  private doom: number | null = null;
  private finished = false;

  constructor(private readonly m: Match) {}

  setup(): void {
    this.m.addObject({
      id: KEY_ID,
      kind: 'key',
      value: 0,
      x: 0,
      y: KEY_Y,
      z: 0,
      heldBy: null,
      inPanel: false,
      plate: null,
      slot: -1,
    });
  }

  start(): void {
    for (const p of this.m.participantPlayers()) this.m.world.doorTargets[p.home] = 1;
  }

  private key(): GameObject | undefined {
    return this.m.objects.get(KEY_ID);
  }

  active(): PlayerState[] {
    return this.m.participantPlayers().filter((p) => p.alive && !p.escaped && p.connected);
  }

  private inCenter(p: PlayerState): boolean {
    return 'cell' in p.loc && p.loc.cell === CENTER;
  }

  isHolding(p: PlayerState): boolean {
    return p.using && this.inCenter(p) && dist2D(p.pos, handlePos(p.home)) <= HANDLE_RANGE;
  }

  tick(dt: number): void {
    const key = this.key();
    if (this.state === 'held' && key?.heldBy) {
      const h = this.m.players.get(key.heldBy);
      if (h && 'cell' in h.loc && h.loc.cell === h.home) this.escape(h);
    }

    if (this.state === 'panel') {
      this.updateTraps(dt);
      const act = this.active();
      if (act.length > 0 && act.every((p) => this.isHolding(p))) {
        this.hold += dt;
        if (this.hold >= LLAVE_HOLD) {
          for (const p of act) p.escaped = true;
          this.finish(['Todas las puertas se abren.', 'Prueba superada.']);
          return;
        }
      }
    } else {
      this.tiles.fill(0);
    }

    for (const p of this.active()) {
      if (!this.inCenter(p)) continue;
      const i = tileAt(p.pos.x, p.pos.z);
      if (i >= 0 && this.tiles[i] === 2) p.air -= TRAP_DRAIN * dt;
    }

    if (this.active().length === 0) {
      this.finish([]);
      return;
    }
    if (this.state === 'gone') {
      // La llave ya salió con alguien: los demás no tienen salida.
      this.doom ??= 3;
      this.doom -= dt;
      if (this.doom <= 0) this.finish(['No queda ninguna llave.']);
    }
  }

  private updateTraps(dt: number): void {
    this.trapTimer -= dt;
    if (this.trapTimer <= 0) {
      this.trapTimer = 2.4;
      const free = TRAP_TILES.filter((i) => this.tiles[i] === 0);
      for (let n = 0; n < 3 && free.length > 0; n++) {
        const i = free.splice(Math.floor(this.m.rng() * free.length), 1)[0];
        this.tiles[i] = 1;
        this.tileClock[i] = 1.0;
      }
    }
    for (let i = 0; i < 9; i++) {
      if (this.tiles[i] === 0) continue;
      this.tileClock[i] -= dt;
      if (this.tileClock[i] > 0) continue;
      if (this.tiles[i] === 1) {
        this.tiles[i] = 2;
        this.tileClock[i] = 1.4;
      } else {
        this.tiles[i] = 0;
      }
    }
  }

  private escape(p: PlayerState): void {
    p.escaped = true;
    this.m.removeObject(KEY_ID);
    p.holding = null;
    this.state = 'gone';
    this.m.world.doorTargets[p.home] = 0;
    // La celda expulsa a quien se haya colado detrás.
    const d = DIRS[p.home];
    for (const q of this.m.players.values()) {
      if (q === p || !q.alive) continue;
      if (locCell(q.loc) === p.home) this.m.teleport(q, d.x * 2.2, 0, d.z * 2.2);
    }
    this.m.fx(p, 'escape');
    this.m.host([`La celda ${CELL_NUMERALS[p.home]} ha salido con la llave.`]);
  }

  private finish(lines: string[]): void {
    if (this.finished) return;
    this.finished = true;
    const outcomes = new Map<string, Outcome>();
    for (const p of this.m.participantPlayers()) outcomes.set(p.id, p.escaped ? 'escaped' : 'eliminated');
    this.m.finishTrial(outcomes, lines);
  }

  timeout(): void {
    this.finish(['Se acabó el tiempo.']);
  }

  onInteract(p: PlayerState): void {
    const key = this.key();
    if (!key) return;
    const dCenter = Math.hypot(p.pos.x, p.pos.z);

    if (key.heldBy === p.id) {
      if (this.inCenter(p) && dCenter <= 1.25) {
        key.heldBy = null;
        key.inPanel = true;
        key.x = 0;
        key.y = KEY_Y;
        key.z = 0;
        p.holding = null;
        this.state = 'panel';
        this.m.fx(p, 'place');
        this.m.host(['La llave está en el panel. Sostengan sus manijas.']);
      } else {
        this.dropAt(p, 0.7);
        this.m.fx(p, 'drop');
      }
      return;
    }
    if ((this.state === 'pedestal' || this.state === 'floor') && !key.heldBy && dist2D(p.pos, key) <= 1.5) {
      this.take(p, key);
      return;
    }
    if (this.state === 'panel' && this.inCenter(p) && dCenter <= 1.0 && dist2D(p.pos, handlePos(p.home)) > HANDLE_RANGE) {
      key.inPanel = false;
      this.take(p, key);
      this.m.host(['Alguien sacó la llave del panel.']);
    }
  }

  private take(p: PlayerState, key: GameObject): void {
    key.heldBy = p.id;
    p.holding = key.id;
    this.state = 'held';
    this.m.fx(p, 'pickup');
  }

  private dropAt(p: PlayerState, ahead: number): void {
    const key = this.key();
    if (!key) return;
    const f = forwardFromYaw(p.yaw);
    const fx = p.pos.x + f.x * ahead;
    const fz = p.pos.z + f.z * ahead;
    const loc = locate(fx, fz) ?? p.loc;
    const c = clampToCell(locCell(loc), fx, fz, 0.3);
    key.heldBy = null;
    key.x = c.x;
    key.y = 0.08;
    key.z = c.z;
    p.holding = null;
    this.state = 'floor';
  }

  onPushed(p: PlayerState): void {
    if (p.holding === KEY_ID) this.dropAt(p, 0);
  }

  onEliminated(p: PlayerState): void {
    if (p.holding === KEY_ID) this.dropAt(p, 0);
  }

  view(p: PlayerState): TrialView {
    const act = this.active();
    return {
      kind: 'llave',
      key: this.state,
      hold: Math.min(1, this.hold / LLAVE_HOLD),
      holders: act.filter((q) => this.isHolding(q)).map((q) => q.home),
      needed: act.map((q) => q.home),
      tiles: [...this.tiles],
      escaped: p.escaped,
    };
  }

  cleanup(): void {
    this.m.removeObject(KEY_ID);
    this.tiles.fill(0);
  }
}
