import { locate } from '@cuboid/shared';
import { Match, type MatchOptions } from '../server/src/game/Match';

export interface Sent {
  id: string;
  type: string;
  msg: any;
}

/** Generador pseudoaleatorio con semilla (mulberry32) para que las pruebas sean reproducibles. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeMatch(opts: MatchOptions = {}) {
  const sent: Sent[] = [];
  let started = false;
  const m = new Match(
    {
      send: (id, type, msg) => sent.push({ id, type, msg }),
      onStart: () => {
        started = true;
      },
    },
    { rng: seeded(7), ...opts },
  );
  return { m, sent, started: () => started };
}

export function run(m: Match, seconds: number, each?: () => void): void {
  const dt = 0.05;
  for (let t = 0; t < seconds; t += dt) {
    each?.();
    m.tick(dt);
  }
}

export function runUntil(m: Match, pred: () => boolean, maxSeconds: number, each?: () => void): boolean {
  const dt = 0.05;
  for (let t = 0; t < maxSeconds; t += dt) {
    if (pred()) return true;
    each?.();
    m.tick(dt);
  }
  return pred();
}

/** Coloca a un jugador directamente, sin pasar por la validación de movimiento. */
export function place(m: Match, id: string, x: number, z: number, yaw?: number): void {
  const p = m.players.get(id)!;
  p.pos = { x, y: 0, z };
  p.loc = locate(x, z) ?? p.loc;
  if (yaw !== undefined) p.yaw = yaw;
}

/** Agrega jugadores, los marca listos y avanza hasta que corre la primera prueba. */
export function startTrial(m: Match, ids: string[]): void {
  for (const id of ids) m.addPlayer(id, id);
  for (const id of ids) m.handle(id, 'ready', {});
  if (!runUntil(m, () => m.phase === 'trial', 60)) throw new Error(`no llegó a la prueba (fase ${m.phase})`);
}
