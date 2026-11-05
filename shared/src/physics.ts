import type { Box, V3 } from './layout';

/** Cuerpo cinemático del jugador: caja de ancho 2·radius y altura variable, con los pies en pos.y. */
export interface Body {
  pos: V3;
  vel: V3;
  height: number;
  grounded: boolean;
}

const EPS = 1e-4;
const MAX_STEP = 0.15;

function overlaps(p: V3, r: number, h: number, b: Box): boolean {
  return (
    p.x + r > b.min.x &&
    p.x - r < b.max.x &&
    p.y + h > b.min.y &&
    p.y < b.max.y &&
    p.z + r > b.min.z &&
    p.z - r < b.max.z
  );
}

export function bodyOverlaps(p: V3, r: number, h: number, boxes: readonly Box[]): boolean {
  for (const b of boxes) if (overlaps(p, r, h, b)) return true;
  return false;
}

function sweep(body: Body, axis: 'x' | 'y' | 'z', delta: number, r: number, boxes: readonly Box[]): boolean {
  if (delta === 0) return false;
  body.pos[axis] += delta;
  let hit = false;
  for (const b of boxes) {
    if (!overlaps(body.pos, r, body.height, b)) continue;
    hit = true;
    if (axis === 'y') body.pos.y = delta > 0 ? b.min.y - body.height - EPS : b.max.y + EPS;
    else body.pos[axis] = delta > 0 ? b.min[axis] - r - EPS : b.max[axis] + r + EPS;
  }
  return hit;
}

/** Saca al cuerpo de cualquier caja en la que haya quedado metido (p. ej. un techo que baja o una puerta que se cierra). */
export function depenetrate(body: Body, r: number, boxes: readonly Box[]): void {
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (const b of boxes) {
      const p = body.pos;
      if (!overlaps(p, r, body.height, b)) continue;
      const options: [number, 'x' | 'y' | 'z'][] = [
        [b.min.x - (p.x + r), 'x'],
        [b.max.x - (p.x - r), 'x'],
        [b.min.y - (p.y + body.height), 'y'],
        [b.max.y - p.y, 'y'],
        [b.min.z - (p.z + r), 'z'],
        [b.max.z - (p.z - r), 'z'],
      ];
      options.sort((a, c) => Math.abs(a[0]) - Math.abs(c[0]));
      const [amount, axis] = options[0];
      p[axis] += amount + Math.sign(amount) * EPS;
      if (axis === 'y' && amount > 0) {
        body.grounded = true;
        body.vel.y = Math.max(0, body.vel.y);
      }
      moved = true;
    }
    if (!moved) return;
  }
}

/** Mueve el cuerpo según su velocidad, eje por eje, deteniéndolo contra las cajas. */
export function moveBody(body: Body, dt: number, r: number, boxes: readonly Box[]): void {
  const dx = body.vel.x * dt;
  const dy = body.vel.y * dt;
  const dz = body.vel.z * dt;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / MAX_STEP));
  body.grounded = false;
  for (let s = 0; s < steps; s++) {
    if (sweep(body, 'x', dx / steps, r, boxes)) body.vel.x = 0;
    if (sweep(body, 'z', dz / steps, r, boxes)) body.vel.z = 0;
    if (sweep(body, 'y', dy / steps, r, boxes)) {
      if (dy < 0) body.grounded = true;
      body.vel.y = 0;
    }
  }
  // Un cuerpo apoyado sin velocidad vertical sigue en el piso.
  if (!body.grounded && dy === 0) {
    const probe = { ...body.pos, y: body.pos.y - 0.02 };
    body.grounded = bodyOverlaps(probe, r, body.height, boxes);
  }
}
