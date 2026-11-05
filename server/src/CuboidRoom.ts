import { Room, type Client } from '@colyseus/core';
import { MAX_PLAYERS, TICK_MS, TRIALS, type JoinOptions, type TrialId } from '@cuboid/shared';
import { Match } from './game/Match';

const CLIENT_MESSAGES = ['pos', 'ready', 'interact', 'use', 'push', 'knock'] as const;

/** TRIALS=presion,llave permite jugar solo algunas pruebas (útil para desarrollar). */
function trialsFromEnv(): TrialId[] | undefined {
  const ids = (process.env.TRIALS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is TrialId => TRIALS.some((t) => t.id === s));
  return ids.length ? ids : undefined;
}

/**
 * Una sala de Colyseus es una partida cerrada. No se usa el estado sincronizado de Colyseus:
 * el servidor arma una instantánea distinta para cada jugador con solo lo que puede ver.
 */
export class CuboidRoom extends Room {
  maxClients = MAX_PLAYERS;
  maxMessagesPerSecond = 120;
  private match!: Match;

  onCreate(): void {
    this.match = new Match(
      {
        send: (id, type, msg) => this.clients.get(id)?.send(type, msg),
        onStart: () => void this.lock(),
      },
      { minPlayers: Number(process.env.MIN_PLAYERS ?? 1), trials: trialsFromEnv() },
    );
    for (const type of CLIENT_MESSAGES) {
      this.onMessage(type, (client: Client, msg: unknown) => this.match.handle(client.sessionId, type, msg));
    }
    this.setSimulationInterval((deltaMs) => this.step(deltaMs / 1000), TICK_MS);
  }

  onJoin(client: Client, options?: JoinOptions): void {
    const name = typeof options?.name === 'string' ? options.name.trim().slice(0, 16) : '';
    if (this.match.addPlayer(client.sessionId, name) === null) client.leave();
  }

  onLeave(client: Client): void {
    this.match.removePlayer(client.sessionId);
  }

  private step(dt: number): void {
    this.match.tick(Math.min(dt, 0.25));
    for (const client of this.clients) {
      const snap = this.match.snapshotFor(client.sessionId);
      if (snap) client.send('snap', snap);
    }
  }
}
