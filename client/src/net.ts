import { Client, type Room } from '@colyseus/sdk';
import {
  TICK_MS,
  type FxMsg,
  type HostMsg,
  type ImpulseMsg,
  type KnockMsg,
  type PosMsg,
  type Snapshot,
  type TeleportMsg,
  type WelcomeMsg,
} from '@cuboid/shared';

export interface NetHandlers {
  welcome(m: WelcomeMsg): void;
  snap(s: Snapshot): void;
  knock(m: KnockMsg): void;
  impulse(m: ImpulseMsg): void;
  teleport(m: TeleportMsg): void;
  host(m: HostMsg): void;
  fx(m: FxMsg): void;
  left(code: number): void;
}

/** En desarrollo el servidor corre aparte (puerto 2567); en producción sirve también la página. */
export function serverUrl(): string {
  const override = new URLSearchParams(location.search).get('server') ?? import.meta.env.VITE_SERVER_URL;
  if (override) return override;
  if (import.meta.env.DEV) return `${location.protocol}//${location.hostname}:2567`;
  return location.origin;
}

export class Net {
  private room: Room | null = null;
  private lastPos = 0;

  async join(name: string, h: NetHandlers): Promise<void> {
    const client = new Client(serverUrl());
    const room = await client.joinOrCreate('cuboid', { name });
    this.room = room;
    room.onMessage('welcome', (m: WelcomeMsg) => h.welcome(m));
    room.onMessage('snap', (m: Snapshot) => h.snap(m));
    room.onMessage('knock', (m: KnockMsg) => h.knock(m));
    room.onMessage('impulse', (m: ImpulseMsg) => h.impulse(m));
    room.onMessage('teleport', (m: TeleportMsg) => h.teleport(m));
    room.onMessage('host', (m: HostMsg) => h.host(m));
    room.onMessage('fx', (m: FxMsg) => h.fx(m));
    room.onLeave((code) => h.left(code));
  }

  sendPos(now: number, msg: PosMsg): void {
    if (!this.room || now - this.lastPos < TICK_MS) return;
    this.lastPos = now;
    this.room.send('pos', msg);
  }

  send(type: 'ready' | 'interact' | 'push'): void;
  send(type: 'use', msg: { on: boolean }): void;
  send(type: 'knock', msg: KnockMsg): void;
  send(type: string, msg: unknown = {}): void {
    this.room?.send(type, msg);
  }

  async leave(): Promise<void> {
    await this.room?.leave();
    this.room = null;
  }
}
