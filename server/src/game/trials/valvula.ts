import { VALVULA_HOLD, dist2D, locCell, trialDef, valvePos, type TrialView } from '@cuboid/shared';
import type { Match } from '../Match';
import type { Outcome, PlayerState, TrialRuntime } from '../types';

const PULL = 0.6; // cuánto mueve la presión quien jala su válvula (por segundo)
const BAND = 0.2; // margen de equilibrio
const TRANSFER = 1.5; // segundos de aire transferidos por segundo con la presión al máximo
const VALVE_RANGE = 1.7;
const SLIDE = 1.5; // velocidad con la que el piso inclinado arrastra al jugador

interface Pair {
  a: string;
  /** null: la otra celda está vacía y la controla el Anfitrión. */
  b: string | null;
  p: number;
  bias: number;
  biasLeft: number;
  progress: number;
  done: boolean;
}

/** Cadena · 4 aristas. Dos celdas comparten una válvula: equilibrar la presión o robarse el aire. */
export class Valvula implements TrialRuntime {
  readonly def = trialDef('valvula');
  readonly pairs: Pair[] = [];
  private t = 0;

  constructor(private readonly m: Match) {}

  setup(): void {
    const ps = this.m.participantPlayers().sort((x, y) => x.home - y.home);
    for (let i = 0; i < ps.length; i += 2) {
      this.pairs.push({ a: ps[i].id, b: ps[i + 1]?.id ?? null, p: 0, bias: 0, biasLeft: 0, progress: 0, done: false });
    }
  }

  start(): void {
    this.t = 0;
  }

  isPulling(p: PlayerState | undefined): boolean {
    return (
      !!p &&
      p.alive &&
      p.using &&
      'cell' in p.loc &&
      locCell(p.loc) === p.home &&
      dist2D(p.pos, valvePos(p.home)) <= VALVE_RANGE
    );
  }

  tick(dt: number): void {
    this.t += dt;
    for (const pair of this.pairs) {
      const A = this.m.players.get(pair.a);
      const B = pair.b ? this.m.players.get(pair.b) : undefined;
      for (const q of [A, B]) {
        if (q) this.m.world.tilt[q.home] = pair.done ? { x: 0, z: 0 } : slide(this.t, q.home);
      }
      if (pair.done) continue;

      pair.biasLeft -= dt;
      if (pair.biasLeft <= 0) {
        pair.bias = (this.m.rng() * 2 - 1) * 0.35;
        pair.biasLeft = 2.5 + this.m.rng() * 2;
      }
      let dp = pair.bias + (this.m.rng() - 0.5) * 0.6;
      if (this.isPulling(A)) dp += PULL;
      if (B?.alive) {
        if (this.isPulling(B)) dp -= PULL;
      } else if (pair.p > 0.15) {
        // Sin compañero vivo, el Anfitrión jala del otro lado cuando la presión se le va.
        dp -= PULL * 0.8;
      }
      pair.p = Math.max(-1, Math.min(1, pair.p + dp * dt));

      if (A?.alive && B?.alive) {
        const amount = TRANSFER * pair.p * dt;
        A.air += amount;
        B.air -= amount;
      }
      if (Math.abs(pair.p) < BAND) pair.progress += dt;
      if (pair.progress >= VALVULA_HOLD) {
        pair.done = true;
        const ids = [A, B].filter((q): q is PlayerState => !!q).map((q) => q.id);
        this.m.host(['Válvula en equilibrio. Esperen a las demás celdas.'], ids);
        for (const q of [A, B]) if (q) this.m.fx(q, 'place');
      }
    }
    if (this.pairs.length > 0 && this.pairs.every((p) => p.done)) {
      this.finish(['Todas las válvulas están en equilibrio.', 'Prueba superada.']);
    }
  }

  timeout(): void {
    this.finish(['Se acabó el tiempo.']);
  }

  private finish(lines: string[]): void {
    const outcomes = new Map<string, Outcome>();
    for (const pair of this.pairs) {
      const o: Outcome = pair.done ? 'pass' : 'fail';
      outcomes.set(pair.a, o);
      if (pair.b) outcomes.set(pair.b, o);
    }
    this.m.finishTrial(outcomes, lines);
  }

  view(p: PlayerState): TrialView | null {
    const pair = this.pairs.find((x) => x.a === p.id || x.b === p.id);
    if (!pair) return null;
    const side = pair.a === p.id ? 1 : -1;
    const otherId = side === 1 ? pair.b : pair.a;
    const other = otherId ? this.m.players.get(otherId) : undefined;
    return {
      kind: 'valvula',
      pressure: side * pair.p,
      progress: Math.min(1, pair.progress / VALVULA_HOLD),
      partner: other ? other.home : null,
      pulling: this.isPulling(p),
      done: pair.done,
    };
  }

  cleanup(): void {
    for (const t of this.m.world.tilt) {
      t.x = 0;
      t.z = 0;
    }
  }
}

function slide(t: number, cell: number): { x: number; z: number } {
  const ph = cell * 1.7;
  return { x: Math.sin(t * 0.6 + ph) * SLIDE, z: Math.cos(t * 0.43 + ph * 1.3) * SLIDE };
}
