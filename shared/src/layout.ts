import {
  CELL,
  CELL_CENTERS,
  CENTER,
  CENTER_PEDESTAL,
  DIRS,
  DOOR_H,
  DOOR_W,
  HALF,
  HANDLE,
  PEDESTAL,
  PITCH,
  PLAYER_CELLS,
  VALVE,
  WALL,
  type Vec2,
  yawFacing,
} from './constants';
import type { TrialId } from './protocol';

export interface V3 {
  x: number;
  y: number;
  z: number;
}

export interface Box {
  min: V3;
  max: V3;
}

export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box {
  return {
    min: { x: Math.min(x0, x1), y: Math.min(y0, y1), z: Math.min(z0, z1) },
    max: { x: Math.max(x0, x1), y: Math.max(y0, y1), z: Math.max(z0, z1) },
  };
}

export interface WorldView {
  /** 0 = cerrada, 1 = abierta. Una por celda de jugador. */
  doors: readonly number[];
  /** Altura de la cara inferior del techo, una por celda (incluida la central). */
  ceilings: readonly number[];
}

/** Marco local de una celda de jugador: f apunta a la pared del fondo, r a la derecha. */
export function cellFrame(cell: number): { c: Vec2; f: Vec2; r: Vec2 } {
  const c = CELL_CENTERS[cell];
  if (cell === CENTER) return { c, f: { x: 0, z: -1 }, r: { x: 1, z: 0 } };
  const f = DIRS[cell];
  return { c, f, r: { x: -f.z, z: f.x } };
}

/** Convierte coordenadas locales (adelante, derecha) de una celda a coordenadas del mundo. */
export function cellPoint(cell: number, forward: number, right: number): Vec2 {
  const { c, f, r } = cellFrame(cell);
  return { x: c.x + f.x * forward + r.x * right, z: c.z + f.z * forward + r.z * right };
}

export function doorCenter(i: number): Vec2 {
  const d = DIRS[i];
  const dist = PITCH - HALF - WALL / 2;
  return { x: d.x * dist, z: d.z * dist };
}

export function pedestalPos(cell: number): Vec2 {
  return cellPoint(cell, PEDESTAL.forward, 0);
}

export function valvePos(cell: number): Vec2 {
  return cellPoint(cell, HALF - 0.08, 0);
}

export function valveHeight(): number {
  return VALVE.height;
}

export function handlePos(cell: number): Vec2 {
  const d = DIRS[cell];
  return { x: d.x * HANDLE.distance, z: d.z * HANDLE.distance };
}

export function spawnFor(cell: number): { x: number; y: number; z: number; yaw: number } {
  const c = CELL_CENTERS[cell];
  const f = cell === CENTER ? { x: 0, z: -1 } : DIRS[cell];
  return { x: c.x - f.x * 0.6, y: 0, z: c.z - f.z * 0.6, yaw: yawFacing(f) };
}

export type WallKind = 'wall' | 'floor' | 'threshold' | 'lintel';

export interface StaticPiece {
  box: Box;
  kind: WallKind;
  cell: number;
}

let staticCache: StaticPiece[] | null = null;

/** Geometría fija: muros (con huecos de puerta), pisos y umbrales. La usan el render y las colisiones. */
export function staticPieces(): StaticPiece[] {
  if (staticCache) return staticCache;
  const out: StaticPiece[] = [];
  const top = CELL + WALL;
  const bottom = -WALL;

  for (let cell = 0; cell < CELL_CENTERS.length; cell++) {
    const { x: cx, z: cz } = CELL_CENTERS[cell];
    out.push({ box: box(cx - HALF, bottom, cz - HALF, cx + HALF, 0, cz + HALF), kind: 'floor', cell });
  }

  // La celda central no tiene muros propios: sus cuatro lados son los muros-puerta de las celdas de jugador.
  for (const cell of PLAYER_CELLS) {
    const { x: cx, z: cz } = CELL_CENTERS[cell];
    const doorSide = (cell + 2) % 4;
    for (let side = 0; side < 4; side++) {
      const along = side === 0 || side === 2 ? 'x' : 'z';
      // Los muros N/S cubren las esquinas; los E/O solo el interior. Así no se encima la geometría.
      const span = along === 'x' ? HALF + WALL : HALF;
      const d = DIRS[side];
      const inner = HALF;
      const outer = HALF + WALL;
      const n0 = along === 'x' ? cz + d.z * inner : cx + d.x * inner;
      const n1 = along === 'x' ? cz + d.z * outer : cx + d.x * outer;
      const a = along === 'x' ? cx : cz;
      const mk = (a0: number, a1: number, y0: number, y1: number): Box =>
        along === 'x' ? box(a0, y0, n0, a1, y1, n1) : box(n0, y0, a0, n1, y1, a1);

      if (side !== doorSide) {
        out.push({ box: mk(a - span, a + span, bottom, top), kind: 'wall', cell });
        continue;
      }
      const hw = DOOR_W / 2;
      out.push({ box: mk(a - span, a - hw, bottom, top), kind: 'wall', cell });
      out.push({ box: mk(a + hw, a + span, bottom, top), kind: 'wall', cell });
      out.push({ box: mk(a - hw, a + hw, DOOR_H, top), kind: 'lintel', cell });
      out.push({ box: mk(a - hw, a + hw, bottom, 0), kind: 'threshold', cell });
    }
  }
  staticCache = out;
  return out;
}

/** Hoja de la puerta i. Se desliza hacia arriba dentro del dintel. */
export function doorSlab(i: number, open: number): Box {
  const c = doorCenter(i);
  const d = DIRS[i];
  const hw = DOOR_W / 2;
  const ht = 0.1;
  const y0 = open * DOOR_H;
  const y1 = y0 + DOOR_H;
  return d.x === 0 ? box(c.x - hw, y0, c.z - ht, c.x + hw, y1, c.z + ht) : box(c.x - ht, y0, c.z - hw, c.x + ht, y1, c.z + hw);
}

export function ceilingBox(cell: number, height: number): Box {
  const { x: cx, z: cz } = CELL_CENTERS[cell];
  return box(cx - HALF, height, cz - HALF, cx + HALF, height + WALL, cz + HALF);
}

/** Obstáculos sólidos de cada prueba. */
export function propBoxes(trial: TrialId | null, cells: readonly number[]): Box[] {
  const out: Box[] = [];
  if (trial === 'presion') {
    const h = PEDESTAL.size / 2;
    for (const cell of cells) {
      const p = pedestalPos(cell);
      out.push(box(p.x - h, 0, p.z - h, p.x + h, PEDESTAL.height, p.z + h));
    }
  } else if (trial === 'llave') {
    const h = CENTER_PEDESTAL.size / 2;
    out.push(box(-h, 0, -h, h, CENTER_PEDESTAL.height, h));
    const s = HANDLE.size / 2;
    for (const cell of cells) {
      const p = handlePos(cell);
      out.push(box(p.x - s, 0, p.z - s, p.x + s, HANDLE.height, p.z + s));
    }
  }
  return out;
}

export function buildColliders(world: WorldView, trial: TrialId | null, cells: readonly number[]): Box[] {
  const out = staticPieces().map((p) => p.box);
  for (const i of PLAYER_CELLS) {
    const open = world.doors[i] ?? 0;
    if (open < 0.97) {
      const slab = doorSlab(i, open);
      out.push({ min: slab.min, max: { ...slab.max, y: Math.min(slab.max.y, DOOR_H) } });
    }
  }
  for (let cell = 0; cell < CELL_CENTERS.length; cell++) out.push(ceilingBox(cell, world.ceilings[cell] ?? CELL));
  out.push(...propBoxes(trial, cells));
  return out;
}

export type Loc = { cell: number } | { door: number };

/** Ubica un punto en el plano: dentro de una celda, dentro del hueco de una puerta, o en ningún lado (dentro de un muro). */
export function locate(x: number, z: number): Loc | null {
  for (let cell = 0; cell < CELL_CENTERS.length; cell++) {
    const c = CELL_CENTERS[cell];
    if (Math.abs(x - c.x) <= HALF && Math.abs(z - c.z) <= HALF) return { cell };
  }
  for (const i of PLAYER_CELLS) {
    const c = doorCenter(i);
    const d = DIRS[i];
    const depth = Math.abs((x - c.x) * d.x + (z - c.z) * d.z);
    const lateral = Math.abs((x - c.x) * d.z - (z - c.z) * d.x);
    if (depth <= WALL / 2 + 0.01 && lateral <= DOOR_W / 2) return { door: i };
  }
  return null;
}

/** Celda a la que pertenece una ubicación para efectos de zona (el hueco de una puerta cuenta como su celda). */
export function locCell(loc: Loc): number {
  return 'cell' in loc ? loc.cell : loc.door;
}

/** ¿Se puede pasar de una ubicación a otra con las puertas en este estado? */
export function canTransition(from: Loc, to: Loc, doors: readonly number[]): boolean {
  const a = nodeOf(from);
  const b = nodeOf(to);
  if (a === b) return true;
  const pair = (p: string, q: string) => (a === p && b === q) || (a === q && b === p);
  for (const i of PLAYER_CELLS) {
    if ((doors[i] ?? 0) < 0.25) continue;
    if (pair(`c${i}`, `d${i}`) || pair(`d${i}`, `c${CENTER}`) || pair(`c${i}`, `c${CENTER}`)) return true;
  }
  return false;
}

function nodeOf(loc: Loc): string {
  return 'cell' in loc ? `c${loc.cell}` : `d${loc.door}`;
}

/** Zona conectada de cada celda: celdas unidas por puertas abiertas comparten zona. */
export function zones(doors: readonly number[]): number[] {
  const zone = CELL_CENTERS.map((_, i) => i);
  for (const i of PLAYER_CELLS) if ((doors[i] ?? 0) > 0.05) zone[i] = CENTER;
  return zone;
}

/** Baldosa (0..8) de la celda central en la que cae un punto, o -1 si está fuera. */
export function tileAt(x: number, z: number): number {
  if (Math.abs(x) > HALF || Math.abs(z) > HALF) return -1;
  const col = Math.min(2, Math.floor((x + HALF) / 2));
  const row = Math.min(2, Math.floor((z + HALF) / 2));
  return row * 3 + col;
}

export function tileCenter(i: number): Vec2 {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return { x: -HALF + 1 + col * 2, z: -HALF + 1 + row * 2 };
}

export function clampToCell(cell: number, x: number, z: number, margin: number): Vec2 {
  const c = CELL_CENTERS[cell];
  const lim = HALF - margin;
  return { x: Math.max(c.x - lim, Math.min(c.x + lim, x)), z: Math.max(c.z - lim, Math.min(c.z + lim, z)) };
}

export function dist2D(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
