import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from '@colyseus/sdk';
import type { Server } from '@colyseus/core';
import type { Snapshot } from '@cuboid/shared';
import { startServer } from '../server/src/index';

const PORT = 2600 + Math.floor(Math.random() * 300);
let server: Server;

before(async () => {
  server = await startServer(PORT);
});

after(async () => {
  await server.gracefullyShutdown(false);
});

function nextSnap(room: Room, pred: (s: Snapshot) => boolean, timeoutMs = 8000): Promise<Snapshot> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no llegó la instantánea esperada')), timeoutMs);
    const off = room.onMessage('snap', (s: Snapshot) => {
      if (!pred(s)) return;
      clearTimeout(timer);
      off();
      resolve(s);
    });
  });
}

test('dos jugadores entran a la misma partida, se preparan y la sala se cierra', async () => {
  const client = new Client(`http://localhost:${PORT}`);
  const a = await client.joinOrCreate('cuboid', { name: 'Ana' });
  const welcome = new Promise<{ cell: number }>((resolve) => a.onMessage('welcome', resolve));
  const b = await client.joinOrCreate('cuboid', { name: 'Beto' });
  assert.equal(a.roomId, b.roomId);

  const snapA = await nextSnap(a, (s) => s.roster.length === 2);
  assert.equal(snapA.phase, 'lobby');
  assert.deepEqual(snapA.roster.map((r) => r.name).sort(), ['Ana', 'Beto']);
  assert.ok([0, 1].includes((await welcome).cell));

  a.send('ready', {});
  b.send('ready', {});
  await nextSnap(a, (s) => s.phase === 'countdown');

  // La partida ya empezó: un tercer jugador cae en una sala nueva.
  const c = await client.joinOrCreate('cuboid', { name: 'Caro' });
  assert.notEqual(c.roomId, a.roomId);

  await Promise.all([a.leave(), b.leave(), c.leave()]);
});

test('el servidor responde en /health', async () => {
  const res = await fetch(`http://localhost:${PORT}/health`);
  assert.deepEqual(await res.json(), { ok: true });
});
