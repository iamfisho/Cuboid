# Cuboid

Thriller de acción multijugador en primera persona para navegador. Cada jugador despierta **aislado en un cuarto sellado** dentro de una megaestructura cúbica y debe correr, resolver y decidir rápido para seguir respirando. Cada partida es cerrada, y solo algunos salen.

Inspirado en la ciencia ficción y en los "juegos mortales" del estilo de *Alice in Borderland*. El diseño completo está en el [documento de concepto](docs/concepto.md).

## Estado

**Prototipo jugable.** De 1 a 4 jugadores en el navegador, con tres pruebas:

| Prueba | Tipo | Qué pasa |
|---|---|---|
| **Presión** | ◆ Cristal · 3 aristas | Cada celda tiene una balanza y cinco pesos. Todas las balanzas deben marcar su peso exacto, pero cada celda solo conoce el número de otra, así que hay que comunicarlo a golpes mientras el techo baja. |
| **Válvula** | ⛓ Cadena · 4 aristas | Dos celdas comparten una válvula. Hay que mantener la presión en equilibrio 40 s mientras el piso se inclina. Quien la jala hacia su lado le roba aire al otro. |
| **Llave única** | ⧗ Arena · 7 aristas | Una sola llave en el centro: salir solo llevándola a tu celda, o salir todos sosteniendo el panel 30 s entre trampas. Aquí se permite empujar. |

## Cómo jugar en local

Requiere Node 22 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abre <http://localhost:5173>. Cada pestaña (o cada equipo de la misma red) es un jugador. Haz clic en la vista para capturar el mouse y presiona **Enter** en la sala de espera. La partida empieza cuando todos están listos y desde ese momento no entra nadie más.

### Un solo puerto (producción)

```bash
npm run build
```

```bash
npm start
```

El servidor sirve el juego compilado y la conexión en tiempo real en <http://localhost:2567>.

### Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `2567` | Puerto del servidor |
| `MIN_PLAYERS` | `1` | Jugadores mínimos para empezar una partida |
| `TRIALS` | todas | Pruebas a jugar, separadas por coma. Por ejemplo, `TRIALS=llave` para probar solo Llave única |
| `VITE_SERVER_URL` | — | (Cliente) URL del servidor si no está en el mismo origen. También acepta `?server=` en la URL |

## Controles

| Tecla | Acción |
|---|---|
| `W A S D` | Moverse |
| `Shift` | Correr (gasta el doble de aire) |
| `Espacio` | Saltar |
| `C` | Agacharse |
| `E` | Tomar o soltar; mantener para jalar la válvula o sostener la manija |
| Clic | Golpear el muro |
| Clic derecho | Empujar (solo en las pruebas que lo permiten) |
| `Enter` | Marcarse listo en la sala de espera |
| `F3` | Datos de depuración |

## Estructura

```
shared/  Geometría de las celdas, colisiones, protocolo y definición de las pruebas (lo usan cliente y servidor)
server/  Colyseus: cada sala es una partida cerrada; la lógica autoritativa vive en server/src/game
client/  Three.js + Vite: render, controles en primera persona y audio sintetizado
tests/   Pruebas de lógica, física e integración contra el servidor real
docs/    Documento de concepto
```

El servidor no usa el estado sincronizado de Colyseus. Cada 50 ms arma una instantánea distinta para cada jugador con **solo lo que hay en su zona**: mientras las puertas estén cerradas, nadie recibe datos de las otras celdas.

## Pruebas

```bash
npm test
```

```bash
npm run typecheck
```

## Limitaciones conocidas del prototipo

- **Movimiento:** lo simula el cliente y el servidor lo valida (velocidad máxima y puertas cerradas). Todavía no es física autoritativa.
- **Conexión:** no hay reconexión; si se cae, la celda queda sellada.
- **Plataforma:** solo escritorio con teclado y mouse.
- **Fuera del alcance:** reconfiguración del Cuboide, Ecos, notas, intercomunicador y lore.
