import {
  CELL,
  CELL_NUMERALS,
  PEDESTAL,
  cellFrame,
  cellPoint,
  clampToCell,
  dist2D,
  forwardFromYaw,
  locCell,
  locate,
  pedestalPos,
  trialDef,
  weightSize,
  type TrialView,
} from '@cuboid/shared';
import type { Match } from '../Match';
import type { GameObject, Outcome, PlayerState, TrialRuntime } from '../types';

const VALUES = [1, 1, 2, 3, 5];
/** Dónde aparecen los pesos, en coordenadas locales (adelante, derecha) de la celda. */
const SPOTS: [number, number][] = [
  [-1.7, -1.9],
  [-1.9, 1.7],
  [0.2, 2.2],
  [0.6, -2.2],
  [-0.4, 1.0],
];
/** Huecos sobre la balanza (derecha, adelante); el quinto va encima. */
const SLOTS: [number, number][] = [
  [-0.3, -0.3],
  [0.3, -0.3],
  [-0.3, 0.3],
  [0.3, 0.3],
  [0, 0],
];
const MIN_CEILING = 1.35;
const PICK_RANGE = 1.6;
const PLATE_RANGE = 1.75;

/** Cristal · 3 aristas. Cada celda conoce el peso que necesita otra; se comunican a golpes. */
export class Presion implements TrialRuntime {
  readonly def = trialDef('presion');
  cells: number[] = [];
  readonly required = new Map<number, number>();
  readonly clues = new Map<number, string>();
  private t = 0;
  private balancedFor = 0;

  constructor(private readonly m: Match) {}

  setup(): void {
    this.cells = this.m
      .participantPlayers()
      .map((p) => p.home)
      .sort((a, b) => a - b);
    for (const c of this.cells) this.required.set(c, 3 + Math.floor(this.m.rng() * 8));
    this.cells.forEach((c, i) => {
      const target = this.cells[(i + 1) % this.cells.length];
      const amount = this.required.get(target);
      this.clues.set(
        c,
        target === c ? `Tu celda necesita ${amount}.` : `La celda ${CELL_NUMERALS[target]} necesita ${amount}.`,
      );
    });
    for (const c of this.cells) {
      VALUES.forEach((value, k) => {
        const [f, r] = SPOTS[k];
        const p = cellPoint(c, f + (this.m.rng() - 0.5) * 0.4, r + (this.m.rng() - 0.5) * 0.4);
        this.m.addObject({
          id: `w${c}-${k}`,
          kind: 'weight',
          value,
          x: p.x,
          y: weightSize(value) / 2,
          z: p.z,
          heldBy: null,
          inPanel: false,
          plate: null,
          slot: -1,
        });
      });
    }
  }

  start(): void {
    this.t = 0;
  }

  plateSum(cell: number): number {
    let sum = 0;
    for (const o of this.m.objects.values()) if (o.kind === 'weight' && o.plate === cell) sum += o.value;
    return sum;
  }

  tick(dt: number): void {
    this.t += dt;
    const frac = Math.min(1, this.t / this.def.duration);
    const height = CELL - (CELL - MIN_CEILING) * frac;
    for (const c of this.cells) this.m.world.ceilingTargets[c] = height;

    const balanced = this.cells.length > 0 && this.cells.every((c) => this.plateSum(c) === this.required.get(c));
    this.balancedFor = balanced ? this.balancedFor + dt : 0;
    if (this.balancedFor >= 1) {
      this.finish('pass', ['Las balanzas están en equilibrio.', 'Prueba superada.']);
    }
  }

  timeout(): void {
    this.finish('fail', ['Se acabó el tiempo.', 'Prueba fallida.']);
  }

  private finish(outcome: Outcome, lines: string[]): void {
    const outcomes = new Map<string, Outcome>(this.m.participantPlayers().map((p) => [p.id, outcome]));
    this.m.finishTrial(outcomes, lines);
  }

  onInteract(p: PlayerState): void {
    const cell = locCell(p.loc);
    if (!this.cells.includes(cell)) return;
    if (p.holding) {
      const o = this.m.objects.get(p.holding);
      if (!o) return;
      const f = forwardFromYaw(p.yaw);
      const front = { x: p.pos.x + f.x * 0.8, z: p.pos.z + f.z * 0.8 };
      const ped = pedestalPos(cell);
      const overPlate =
        Math.abs(front.x - ped.x) < PEDESTAL.size / 2 + 0.1 && Math.abs(front.z - ped.z) < PEDESTAL.size / 2 + 0.1;
      o.heldBy = null;
      p.holding = null;
      if (dist2D(p.pos, ped) <= PLATE_RANGE || overPlate) {
        this.placeOnPlate(o, cell);
        this.m.fx(p, 'place');
      } else {
        const c = clampToCell(cell, front.x, front.z, 0.4);
        o.x = c.x;
        o.z = c.z;
        o.y = weightSize(o.value) / 2;
        this.m.fx(p, 'drop');
      }
      return;
    }
    // Se toma el peso al que se apunta: el más cercano a un punto frente al jugador.
    const f = forwardFromYaw(p.yaw);
    const aim = { x: p.pos.x + f.x * 0.9, z: p.pos.z + f.z * 0.9 };
    let best: GameObject | null = null;
    let bestScore = Infinity;
    for (const o of this.m.objects.values()) {
      if (o.kind !== 'weight' || o.heldBy) continue;
      const loc = locate(o.x, o.z);
      if (!loc || locCell(loc) !== cell || dist2D(p.pos, o) > PICK_RANGE) continue;
      const score = dist2D(aim, o);
      if (score < bestScore) {
        best = o;
        bestScore = score;
      }
    }
    if (!best) return;
    best.heldBy = p.id;
    best.plate = null;
    best.slot = -1;
    p.holding = best.id;
    this.m.fx(p, 'pickup');
  }

  private placeOnPlate(o: GameObject, cell: number): void {
    const used = new Set<number>();
    for (const q of this.m.objects.values()) if (q.plate === cell) used.add(q.slot);
    let slot = SLOTS.findIndex((_, i) => !used.has(i));
    if (slot < 0) slot = SLOTS.length - 1;
    const [r, f] = SLOTS[slot];
    const { r: right, f: fwd } = cellFrame(cell);
    const ped = pedestalPos(cell);
    const size = weightSize(o.value);
    o.plate = cell;
    o.slot = slot;
    o.x = ped.x + right.x * r + fwd.x * f;
    o.z = ped.z + right.z * r + fwd.z * f;
    o.y = PEDESTAL.height + size / 2 + (slot === 4 ? 0.62 : 0);
  }

  onEliminated(p: PlayerState): void {
    // Una celda sellada ya no cuenta para el equilibrio.
    this.cells = this.cells.filter((c) => c !== p.home);
  }

  view(p: PlayerState): TrialView {
    return { kind: 'presion', clue: this.clues.get(p.home) ?? '', plateSum: this.plateSum(p.home) };
  }

  cleanup(): void {
    for (const id of [...this.m.objects.keys()]) if (id.startsWith('w')) this.m.removeObject(id);
    for (let i = 0; i < this.m.world.ceilingTargets.length; i++) this.m.world.ceilingTargets[i] = CELL;
  }
}
