import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL,
  CELL_CENTERS,
  CENTER,
  PLAYER,
  buildColliders,
  canTransition,
  depenetrate,
  doorCenter,
  locate,
  moveBody,
  zones,
  type Body,
} from '@cuboid/shared';

const closed = { doors: [0, 0, 0, 0], ceilings: CELL_CENTERS.map(() => CELL) };
const open = { doors: [1, 1, 1, 1], ceilings: CELL_CENTERS.map(() => CELL) };

function body(x: number, z: number, y = 0): Body {
  return { pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 }, height: PLAYER.standHeight, grounded: false };
}

function simulate(b: Body, boxes: ReturnType<typeof buildColliders>, seconds: number, vx: number, vz: number) {
  for (let t = 0; t < seconds; t += 1 / 60) {
    b.vel.x = vx;
    b.vel.z = vz;
    b.vel.y -= PLAYER.gravity / 60;
    moveBody(b, 1 / 60, PLAYER.radius, boxes);
  }
}

test('el jugador se apoya en el piso', () => {
  const b = body(CELL_CENTERS[0].x, CELL_CENTERS[0].z, 1);
  simulate(b, buildColliders(closed, null, []), 1, 0, 0);
  assert.ok(Math.abs(b.pos.y) < 0.01, `y=${b.pos.y}`);
  assert.equal(b.grounded, true);
});

test('una puerta cerrada bloquea el paso a la celda central', () => {
  // La celda 0 está al norte: caminar hacia +z lleva a la puerta y al centro.
  const b = body(CELL_CENTERS[0].x, CELL_CENTERS[0].z);
  simulate(b, buildColliders(closed, null, []), 3, 0, PLAYER.walkSpeed);
  const door = doorCenter(0);
  assert.ok(b.pos.z < door.z, `pasó la puerta: z=${b.pos.z}`);
  assert.deepEqual(locate(b.pos.x, b.pos.z), { cell: 0 });
});

test('con la puerta abierta se llega al centro', () => {
  const b = body(CELL_CENTERS[0].x, CELL_CENTERS[0].z);
  simulate(b, buildColliders(open, null, []), 1.6, 0, PLAYER.walkSpeed);
  assert.deepEqual(locate(b.pos.x, b.pos.z), { cell: CENTER });
});

test('los muros sólidos detienen al jugador', () => {
  const b = body(CELL_CENTERS[1].x, CELL_CENTERS[1].z);
  simulate(b, buildColliders(open, null, []), 3, PLAYER.walkSpeed, 0);
  assert.ok(b.pos.x < CELL_CENTERS[1].x + CELL / 2, `x=${b.pos.x}`);
});

test('una puerta que se cierra saca al jugador del marco', () => {
  const d = doorCenter(2);
  const b = body(d.x, d.z);
  depenetrate(b, PLAYER.radius, buildColliders(closed, null, []));
  assert.notDeepEqual(locate(b.pos.x, b.pos.z), { door: 2 });
});

test('las transiciones entre celdas respetan las puertas', () => {
  assert.equal(canTransition({ cell: 0 }, { cell: CENTER }, [0, 0, 0, 0]), false);
  assert.equal(canTransition({ cell: 0 }, { door: 0 }, [1, 0, 0, 0]), true);
  assert.equal(canTransition({ door: 0 }, { cell: CENTER }, [1, 0, 0, 0]), true);
  assert.equal(canTransition({ cell: 0 }, { cell: 1 }, [1, 1, 0, 0]), false);
  assert.deepEqual(zones([1, 0, 0, 1]), [CENTER, 1, 2, CENTER, CENTER]);
});
