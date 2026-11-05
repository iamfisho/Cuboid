import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { CuboidRoom } from './CuboidRoom';

const port = Number(process.env.PORT ?? 2567);
const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));

export async function startServer(listenPort = port): Promise<Server> {
  const server = new Server({
    transport: new WebSocketTransport(),
    greet: false,
    express: (app) => {
      app.get('/health', (_req, res) => {
        res.json({ ok: true });
      });
      // En producción el mismo proceso sirve el cliente ya compilado.
      if (existsSync(clientDist)) app.use(express.static(clientDist));
    },
  });
  server.define('cuboid', CuboidRoom);
  await server.listen(listenPort);
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await startServer();
  console.log(`Cuboid escuchando en http://localhost:${port}`);
}
