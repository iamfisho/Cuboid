export type TrialType = 'hierro' | 'cristal' | 'espejo' | 'cadena' | 'arena' | 'vacio';
export type TrialId = 'presion' | 'valvula' | 'llave';
export type Phase = 'lobby' | 'countdown' | 'intro' | 'announce' | 'trial' | 'result' | 'end';

export type Held = { kind: 'weight'; value: number } | { kind: 'key' };

// Cliente → servidor
export interface PosMsg {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  crouch: boolean;
  sprint: boolean;
  moving: boolean;
}
export interface KnockMsg {
  x: number;
  y: number;
  z: number;
}
export interface UseMsg {
  on: boolean;
}
export interface JoinOptions {
  name?: string;
}

// Servidor → cliente
export interface WelcomeMsg {
  id: string;
  cell: number;
}
export interface TeleportMsg {
  x: number;
  y: number;
  z: number;
  yaw?: number;
}
export interface ImpulseMsg {
  x: number;
  y: number;
  z: number;
}
export interface HostMsg {
  lines: string[];
}
export type FxKind =
  | 'eliminated'
  | 'escape'
  | 'success'
  | 'fail'
  | 'pickup'
  | 'drop'
  | 'place'
  | 'push'
  | 'pushed'
  | 'start';
export interface FxMsg {
  kind: FxKind;
  x?: number;
  y?: number;
  z?: number;
  id?: string;
}

export interface PeerView {
  id: string;
  cell: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  crouch: boolean;
  holding: Held | null;
}

export interface ObjectView {
  id: string;
  kind: 'weight' | 'key';
  value: number;
  x: number;
  y: number;
  z: number;
  heldBy: string | null;
  /** La llave está insertada en el panel central. */
  inPanel: boolean;
}

export interface RosterEntry {
  id: string;
  name: string;
  cell: number;
  ready: boolean;
  alive: boolean;
}

export type TrialView =
  | { kind: 'presion'; clue: string; plateSum: number }
  | { kind: 'valvula'; pressure: number; progress: number; partner: number | null; pulling: boolean; done: boolean }
  | {
      kind: 'llave';
      key: 'pedestal' | 'held' | 'floor' | 'panel' | 'gone';
      hold: number;
      holders: number[];
      needed: number[];
      tiles: number[];
      escaped: boolean;
    };

export interface ResultEntry {
  id: string;
  name: string;
  cell: number;
  escaped: boolean;
  air: number;
  detail: string;
}

export interface Snapshot {
  phase: Phase;
  phaseLeft: number;
  phaseTotal: number;
  trialIndex: number;
  trialCount: number;
  trialId: TrialId | null;
  /** Celdas de los jugadores que participan en la prueba actual. */
  trialCells: number[];
  lights: { type: TrialType | null; edges: number; vertices: number };
  minPlayers: number;
  me: {
    id: string;
    name: string;
    cell: number;
    air: number;
    alive: boolean;
    escaped: boolean;
    ready: boolean;
    holding: Held | null;
  };
  roster: RosterEntry[];
  peers: PeerView[];
  objects: ObjectView[];
  world: { doors: number[]; ceilings: number[]; tilt: { x: number; z: number }[] };
  view: TrialView | null;
  results: ResultEntry[] | null;
}
