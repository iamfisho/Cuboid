import type { TrialId, TrialType } from './protocol';

export const TRIAL_TYPES: Record<TrialType, { name: string; symbol: string; color: number }> = {
  hierro: { name: 'Hierro', symbol: '■', color: 0xff6a2b },
  cristal: { name: 'Cristal', symbol: '◆', color: 0x38b6ff },
  espejo: { name: 'Espejo', symbol: '◑', color: 0xb27cff },
  cadena: { name: 'Cadena', symbol: '⛓', color: 0x3dff9a },
  arena: { name: 'Arena', symbol: '⧗', color: 0xffc23a },
  vacio: { name: 'Vacío', symbol: '○', color: 0xe8edf2 },
};

export interface TrialDef {
  id: TrialId;
  type: TrialType;
  edges: number;
  title: string;
  /** Segundos que dura la prueba antes de agotarse el tiempo. */
  duration: number;
  /** Si se puede empujar a otros jugadores en esta prueba. */
  allowPush: boolean;
  rules: string[];
}

export const VALVULA_HOLD = 40;
export const LLAVE_HOLD = 30;

export const TRIALS: readonly TrialDef[] = [
  {
    id: 'presion',
    type: 'cristal',
    edges: 3,
    title: 'Presión',
    duration: 100,
    allowPush: false,
    rules: [
      'Cada celda tiene una balanza y cinco pesos.',
      'Las balanzas están conectadas: todas deben marcar su peso exacto al mismo tiempo.',
      'Ninguna celda conoce su propio número. Cada una conoce el de otra.',
      'El techo bajará hasta que lo consigan o hasta que se acabe el tiempo.',
    ],
  },
  {
    id: 'valvula',
    type: 'cadena',
    edges: 4,
    title: 'Válvula',
    duration: 100,
    allowPush: false,
    rules: [
      'Cada celda está conectada a otra por una válvula de aire.',
      'La presión cambia sola. Mantén E junto a tu válvula para llevarla hacia tu lado.',
      'Mientras la presión esté de tu lado, recibes aire de la otra celda.',
      `Mantengan el equilibrio ${VALVULA_HOLD} segundos para superar la prueba.`,
    ],
  },
  {
    id: 'llave',
    type: 'arena',
    edges: 7,
    title: 'Llave única',
    duration: 90,
    allowPush: true,
    rules: [
      'Hay una sola llave en la celda central.',
      'Quien la lleve a su propia celda saldrá de la prueba. Solo.',
      `Si la llave está en el panel y todos sostienen su manija ${LLAVE_HOLD} segundos, todos saldrán.`,
      'Aquí se permite empujar. Al acabar el tiempo, quien no haya salido quedará sellado.',
    ],
  },
];

export function trialDef(id: TrialId): TrialDef {
  const def = TRIALS.find((t) => t.id === id);
  if (!def) throw new Error(`Prueba desconocida: ${id}`);
  return def;
}

/** Orden en que se encienden las 12 aristas de un cubo (índices de vértices de CUBE_VERTICES). */
export const CUBE_EDGES: readonly [number, number][] = [
  [0, 4],
  [2, 6],
  [1, 5],
  [3, 7],
  [4, 5],
  [6, 7],
  [4, 6],
  [5, 7],
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
];

/** Vértices de un cubo unitario centrado (x, y, z ∈ {-1, 1}); y = -1 es el piso. */
export const CUBE_VERTICES: readonly [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [-1, 1, -1],
  [1, 1, -1],
  [-1, 1, 1],
  [1, 1, 1],
];
