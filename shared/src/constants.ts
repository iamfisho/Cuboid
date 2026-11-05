// Medidas del mundo (metros). Todas las celdas son cubos alineados a los ejes.
export const CELL = 6; // lado interior de una celda
export const HALF = CELL / 2;
export const WALL = 0.4; // grosor de muros, piso y techo
export const PITCH = CELL + WALL; // distancia entre centros de celdas vecinas
export const DOOR_W = 1.6;
export const DOOR_H = 2.4;

// Celdas 0..3 pertenecen a jugadores (N, E, S, O). La 4 es la celda central.
export const CENTER = 4;
export const PLAYER_CELLS = [0, 1, 2, 3] as const;
export const MAX_PLAYERS = 4;
export const CELL_NUMERALS = ['I', 'II', 'III', 'IV', 'Centro'] as const;

export interface Vec2 {
  x: number;
  z: number;
}

/** Dirección desde el centro hacia cada celda de jugador (también es la pared del fondo de esa celda). */
export const DIRS: readonly Vec2[] = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];

export const CELL_CENTERS: readonly Vec2[] = [
  ...DIRS.map((d) => ({ x: d.x * PITCH, z: d.z * PITCH })),
  { x: 0, z: 0 },
];

export const PLAYER = {
  radius: 0.3,
  standHeight: 1.8,
  crouchHeight: 1.1,
  eyeStand: 1.62,
  eyeCrouch: 0.95,
  walkSpeed: 4.2,
  sprintSpeed: 6.6,
  crouchSpeed: 2.2,
  jumpSpeed: 6.2,
  gravity: 20,
} as const;

/** Tasa de simulación del servidor y de envío de posiciones del cliente. */
export const TICK_MS = 50;

// Props de las pruebas.
export const PEDESTAL = { size: 1.2, height: 0.9, forward: 1.6 } as const; // balanza de Presión
export const CENTER_PEDESTAL = { size: 0.7, height: 1.0 } as const; // panel de Llave única
export const HANDLE = { distance: 1.6, size: 0.16, height: 1.05 } as const; // manijas de Llave única
export const VALVE = { height: 1.3 } as const;

/** Valores iniciales de ajuste. Se espera cambiarlos tras las pruebas de juego. */
export const TUNING = {
  startAir: 240,
  baseDrain: 1,
  sprintExtraDrain: 1,
  countdown: 4,
  intro: 10,
  announce: 11,
  result: 6,
  pushCooldown: 1.2,
  pushRange: 2.2,
  pushSpeed: 7.5,
} as const;

/** Lado del cubo de un peso de la prueba Presión según su valor. */
export function weightSize(value: number): number {
  return 0.28 + 0.06 * value;
}

/** Aire que devuelve superar una prueba: de 30 s (1 arista) a 240 s (12 aristas). */
export function rewardFor(edges: number): number {
  return Math.round(30 + ((edges - 1) * 210) / 11);
}

/** Aire que cuesta fallar una prueba. */
export function penaltyFor(edges: number): number {
  return 10 * edges;
}

/** Vector hacia adelante para un yaw de cámara (three.js mira hacia -z con yaw 0). */
export function forwardFromYaw(yaw: number): Vec2 {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export function yawFacing(dir: Vec2): number {
  return Math.atan2(-dir.x, -dir.z);
}
