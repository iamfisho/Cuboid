import type { Loc, TrialDef, TrialView, V3 } from '@cuboid/shared';

export interface PlayerState {
  id: string;
  name: string;
  /** Celda propia (0..3). */
  home: number;
  connected: boolean;

  pos: V3;
  yaw: number;
  pitch: number;
  crouch: boolean;
  sprint: boolean;
  moving: boolean;
  loc: Loc;
  lastPosAt: number;
  lastTeleportAt: number;
  ignorePosUntil: number;
  impulseUntil: number;

  air: number;
  alive: boolean;
  escaped: boolean;
  ready: boolean;
  /** Mantiene presionada la tecla de usar (E). */
  using: boolean;
  holding: string | null;
  pushReadyAt: number;
  knockReadyAt: number;
  detail: string;
}

export interface GameObject {
  id: string;
  kind: 'weight' | 'key';
  value: number;
  x: number;
  y: number;
  z: number;
  heldBy: string | null;
  inPanel: boolean;
  /** Celda de la balanza sobre la que está, o null. */
  plate: number | null;
  slot: number;
}

export type Outcome = 'pass' | 'fail' | 'escaped' | 'eliminated';

export interface TrialRuntime {
  readonly def: TrialDef;
  /** Al anunciarse la prueba: coloca props y objetos. */
  setup(): void;
  /** Al empezar a correr el tiempo. */
  start(): void;
  tick(dt: number): void;
  /** Se acabó el tiempo. Debe llamar a match.finishTrial. */
  timeout(): void;
  onInteract?(p: PlayerState): void;
  onPushed?(p: PlayerState): void;
  onEliminated?(p: PlayerState): void;
  view(p: PlayerState): TrialView | null;
  cleanup(): void;
}

export interface Outbox {
  send(id: string, type: string, msg: unknown): void;
  /** La partida dejó la sala de espera: ya no deben entrar más jugadores. */
  onStart?(): void;
}
