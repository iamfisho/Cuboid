import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRS,
  TUNING,
  cellPoint,
  handlePos,
  pedestalPos,
  penaltyFor,
  rewardFor,
  trialDef,
  valvePos,
  yawFacing,
} from '@cuboid/shared';
import type { Presion } from '../server/src/game/trials/presion';
import type { Valvula } from '../server/src/game/trials/valvula';
import type { Llave } from '../server/src/game/trials/llave';
import { makeMatch, place, run, runUntil, startTrial } from './helpers';

test('sala de espera: asigna celdas, limita a cuatro y empieza cuando todos están listos', () => {
  const { m, started } = makeMatch();
  assert.equal(m.addPlayer('a', 'Ana'), 0);
  assert.equal(m.addPlayer('b', 'Beto'), 1);
  m.addPlayer('c', 'C');
  m.addPlayer('d', 'D');
  assert.equal(m.addPlayer('e', 'E'), null);
  m.removePlayer('c');
  m.removePlayer('d');

  m.handle('a', 'ready', {});
  run(m, 1);
  assert.equal(m.phase, 'lobby');
  m.handle('b', 'ready', {});
  run(m, 0.1);
  assert.equal(m.phase, 'countdown');
  assert.equal(started(), true);
  assert.equal(m.addPlayer('f', 'F'), null);

  runUntil(m, () => m.phase === 'announce', 30);
  assert.equal(m.currentDef?.id, 'presion');
  const snap = m.snapshotFor('a')!;
  assert.deepEqual(snap.lights, { type: 'cristal', edges: 3, vertices: 2 });
});

/** Busca qué pesos suman exactamente el objetivo. */
function subsetFor(values: { id: string; value: number }[], target: number): string[] | null {
  const n = values.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sum += values[i].value;
    if (sum === target) return values.filter((_, i) => mask & (1 << i)).map((v) => v.id);
  }
  return null;
}

test('Presión: colocar el peso exacto en cada balanza supera la prueba y devuelve aire', () => {
  const { m } = makeMatch({ trials: ['presion'] });
  startTrial(m, ['a', 'b']);
  const trial = m.trial as Presion;
  assert.match(trial.clues.get(0)!, /La celda II necesita \d+\./);

  for (const id of ['a', 'b']) {
    const p = m.players.get(id)!;
    const weights = [...m.objects.values()].filter((o) => o.id.startsWith(`w${p.home}-`));
    const pick = subsetFor(weights, trial.required.get(p.home)!);
    assert.ok(pick);
    for (const wid of pick) {
      const o = m.objects.get(wid)!;
      place(m, id, o.x + 0.5, o.z, yawFacing({ x: -1, z: 0 }));
      m.handle(id, 'interact', {});
      assert.equal(p.holding, wid);
      const ped = pedestalPos(p.home);
      place(m, id, ped.x - DIRS[p.home].x * 1.2, ped.z - DIRS[p.home].z * 1.2, yawFacing(DIRS[p.home]));
      m.handle(id, 'interact', {});
      assert.equal(p.holding, null);
      assert.equal(o.plate, p.home);
    }
  }
  const before = m.players.get('a')!.air;
  run(m, 1.2);
  assert.equal(m.phase, 'result');
  const after = m.players.get('a')!.air;
  assert.ok(after - before > rewardFor(3) - 2, `aire ${before} → ${after}`);
});

test('Presión: al agotarse el tiempo, todas las celdas pierden aire', () => {
  const { m } = makeMatch({ trials: ['presion'] });
  startTrial(m, ['a']);
  const p = m.players.get('a')!;
  const before = p.air;
  run(m, trialDef('presion').duration + 0.2);
  assert.equal(m.phase, 'result');
  const expected = before - trialDef('presion').duration - penaltyFor(3);
  assert.ok(Math.abs(p.air - expected) < 1.5, `aire ${p.air}, esperado ≈${expected}`);
});

function atValve(m: ReturnType<typeof makeMatch>['m'], id: string): void {
  const p = m.players.get(id)!;
  const v = valvePos(p.home);
  place(m, id, v.x - DIRS[p.home].x * 0.8, v.z - DIRS[p.home].z * 0.8);
}

test('Válvula: dos celdas que se turnan para equilibrar superan la prueba', () => {
  const { m } = makeMatch({ trials: ['valvula'] });
  startTrial(m, ['a', 'b']);
  atValve(m, 'a');
  atValve(m, 'b');
  const trial = m.trial as Valvula;
  const ok = runUntil(
    m,
    () => m.phase === 'result',
    trialDef('valvula').duration,
    () => {
      const pressure = trial.pairs[0].p; // positiva = del lado de a
      m.handle('a', 'use', { on: pressure < -0.05 });
      m.handle('b', 'use', { on: pressure > 0.05 });
    },
  );
  assert.ok(ok);
  assert.equal(trial.pairs[0].done, true);
});

test('Válvula: quien acapara la presión le roba aire a su pareja y ambos fallan', () => {
  const { m } = makeMatch({ trials: ['valvula'] });
  startTrial(m, ['a', 'b']);
  atValve(m, 'a');
  atValve(m, 'b');
  m.handle('a', 'use', { on: true });
  run(m, trialDef('valvula').duration + 0.2);
  assert.equal(m.phase, 'result');
  const a = m.players.get('a')!;
  const b = m.players.get('b')!;
  assert.ok(a.air - b.air > 100, `a=${a.air} b=${b.air}`);
});

test('Llave única: quien lleva la llave a su celda sale solo y los demás quedan sellados', () => {
  const { m } = makeMatch({ trials: ['llave'] });
  startTrial(m, ['a', 'b']);
  run(m, 1.2); // que abran las puertas
  place(m, 'a', 0.6, 0, Math.PI / 2);
  m.handle('a', 'interact', {});
  const a = m.players.get('a')!;
  assert.equal(a.holding, 'key');

  // b ve a a porque comparten la celda central.
  assert.equal(m.snapshotFor('b')!.peers.length, 1);

  const home = cellPoint(a.home, 0, 0);
  place(m, 'a', home.x, home.z);
  const airBefore = a.air;
  run(m, 0.1);
  assert.equal(a.escaped, true);
  assert.equal(m.world.doorTargets[a.home], 0);
  runUntil(m, () => m.phase === 'result', 5);
  assert.equal(m.players.get('b')!.alive, false);
  assert.ok(a.air > airBefore + rewardFor(7) - 2);
});

test('Llave única: con la llave en el panel y todos en sus manijas, salen todos', () => {
  const { m } = makeMatch({ trials: ['llave'] });
  startTrial(m, ['a', 'b']);
  run(m, 1.2);
  place(m, 'a', 0.6, 0);
  m.handle('a', 'interact', {});
  m.handle('a', 'interact', {}); // a 0.6 m del centro: inserta en el panel
  const trial = m.trial as Llave;
  assert.equal(trial.state, 'panel');
  for (const id of ['a', 'b']) {
    const h = handlePos(m.players.get(id)!.home);
    place(m, id, h.x, h.z);
    m.handle(id, 'use', { on: true });
  }
  assert.ok(runUntil(m, () => m.phase === 'result', 40));
  assert.equal(m.players.get('a')!.alive, true);
  assert.equal(m.players.get('b')!.alive, true);
});

test('Llave única: empujar a quien lleva la llave se la tira al piso', () => {
  const { m, sent } = makeMatch({ trials: ['llave'] });
  startTrial(m, ['a', 'b']);
  run(m, 1.2);
  place(m, 'a', 0.6, 0);
  m.handle('a', 'interact', {});
  // b está detrás de a, mirando hacia +x (yaw = -π/2).
  place(m, 'b', -0.6, 0, -Math.PI / 2);
  m.handle('b', 'push', {});
  assert.equal(m.players.get('a')!.holding, null);
  assert.equal((m.trial as Llave).state, 'floor');
  assert.ok(sent.some((s) => s.id === 'a' && s.type === 'impulse'));
});

test('empujar no está permitido en Presión', () => {
  const { m, sent } = makeMatch({ trials: ['presion'] });
  startTrial(m, ['a', 'b']);
  m.handle('a', 'push', {});
  assert.ok(!sent.some((s) => s.type === 'impulse'));
});

test('cada jugador solo ve lo que hay en su zona', () => {
  const { m } = makeMatch({ trials: ['presion'] });
  startTrial(m, ['a', 'b']);
  const snap = m.snapshotFor('a')!;
  assert.equal(snap.peers.length, 0);
  assert.ok(snap.objects.every((o) => o.id.startsWith('w0-')));
  assert.ok(snap.view?.kind === 'presion');
});

test('el servidor rechaza saltos imposibles y cruzar puertas cerradas', () => {
  const { m, sent } = makeMatch();
  m.addPlayer('a', 'a');
  const p = m.players.get('a')!;
  const start = { ...p.pos };
  m.tick(1);
  sent.length = 0;
  m.handle('a', 'pos', { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, crouch: false, sprint: false, moving: true });
  assert.deepEqual(p.pos, start);
  assert.ok(sent.some((s) => s.type === 'teleport'));
  assert.deepEqual(p.loc, { cell: 0 });
});

test('sin aire, la celda se sella; si nadie queda, la partida termina', () => {
  const { m } = makeMatch({ trials: ['presion'] });
  startTrial(m, ['a']);
  m.players.get('a')!.air = 0.5;
  run(m, 1);
  assert.equal(m.players.get('a')!.alive, false);
  assert.equal(m.phase, 'end');
  assert.equal(m.results?.[0].escaped, false);
});

test('correr gasta el doble de aire', () => {
  const { m } = makeMatch({ trials: ['presion'] });
  startTrial(m, ['a', 'b']);
  const a = m.players.get('a')!;
  const b = m.players.get('b')!;
  a.sprint = a.moving = true;
  const [a0, b0] = [a.air, b.air];
  run(m, 10);
  const da = a0 - a.air;
  const db = b0 - b.air;
  assert.ok(Math.abs(da - 2 * db) < 0.5 && Math.abs(db - 10 * TUNING.baseDrain) < 0.5, `da=${da} db=${db}`);
});
