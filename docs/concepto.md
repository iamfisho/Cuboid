# Cuboid: documento de concepto

> Borrador v0.2: temática, ambientación, mecánicas base y dirección técnica. Todo es propuesta y está abierto a cambios.

> *Despiertas en un cuarto cúbico sin puertas visibles. Las paredes zumban. Se enciende una sola arista con una luz fría. Al otro lado del metal, alguien golpea tres veces. Luego el piso empieza a moverse.*

---

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| **Género** | Thriller de acción de ciencia ficción |
| **Formato** | Partidas cerradas: cada sesión tiene inicio, clímax y final |
| **Perspectiva** | Primera persona en 3D |
| **Plataforma** | Navegador web en PC, con teclado y mouse |

## 1. Premisa

**Cuboid** es un juego multijugador online de acción y supervivencia. Cada jugador despierta **aislado en un cuarto sellado** dentro de una megaestructura cúbica. Para seguir con vida tiene que correr, trepar, resolver y decidir rápido. Las pruebas mezclan habilidad física, ingenio y confianza, y muchas veces sobrevivir significa dejar atrás a otros. Al final de cada partida, solo algunos alcanzan la Salida.

**Tono:** thriller de acción de ciencia ficción. El ritmo es rápido y el peligro físico es constante. Las reglas son frías y precisas, y las decisiones morales hay que tomarlas en segundos.

## 2. Pilares de diseño

1. **El cuarto es el enemigo.** Los muros se mueven, el piso se abre y el techo baja. No hay armas: se pelea contra el Cuboide y, a veces, por él, contra los demás.
2. **Primero el aislamiento, después la conexión.** Empiezas solo. Hablar con otros jugadores es escaso, imperfecto y valioso.
3. **Reglas claras, consecuencias crueles.** Cada prueba se explica con reglas exactas, como un juego de mesa. Lo difícil no es entenderlas, sino decidir rápido qué hacer con ellas.
4. **La confianza es un recurso.** Cooperar casi siempre es lo óptimo, pero traicionar siempre es posible y a veces es lo más rápido.
5. **Nunca hay calma.** Siempre hay un reloj corriendo, y hasta las pausas tienen presión.
6. **Ciencia ficción fría.** Tecnología incomprensible, estética brutalista, y luz y sonido como lenguaje.

## 3. Ambientación

### 3.1 El Cuboide

Es una megaestructura de miles de celdas cúbicas idénticas acomodadas en una cuadrícula tridimensional. Entre ciclos **la estructura se reconfigura**: las celdas se desplazan, rotan y se reconectan con otras, y los jugadores sienten cada movimiento dentro del cuarto. Cuando por fin se abre una pared no aparece una salida, sino **más celdas** que se pierden en la niebla en todas direcciones.

Las celdas no tienen pantallas modernas. La información aparece grabada en los muros, en paneles mecánicos que se deslizan y, sobre todo, en **luces en las aristas y los vértices** del propio cuarto (ver sección 4).

### 3.2 El Anfitrión

Es una inteligencia que nunca muestra su rostro. Habla a través de los muros con voz neutra, educada y casi amable. Anuncia las reglas, lleva la cuenta regresiva y declara los resultados.

> **Regla de diseño: el Anfitrión nunca miente.** Tampoco dice toda la verdad. Esto les da a los jugadores un ancla y permite pruebas que dependen de la **redacción exacta** de las reglas. Por ejemplo, *"puede haber* un impostor entre ustedes" no es lo mismo que *"hay* un impostor".

### 3.3 Hipótesis de lore

Hay que elegir una, combinar varias o mantener la ambigüedad a propósito.

| Hipótesis | Idea | Qué aporta al juego |
|---|---|---|
| **A. El experimento** | Una IA o una civilización posthumana evalúa a la humanidad. Los jugadores son "muestras". | Justifica pruebas éticas y dilemas. |
| **B. El archivo** | Los jugadores son **copias digitales** de personas reales, reconstruidas a partir de sus datos. El Cuboide es un proceso de selección que decide qué copias se conservan. | Justifica dentro de la ficción que cada partida sea una instancia nueva y que haya muchas partidas al mismo tiempo. |
| **C. El arca** | El Cuboide es una nave. Las pruebas eligen a quién despertarán al llegar a destino. | Da sentido a la Salida como meta. |
| **D. El bucle** | Los jugadores ya estuvieron aquí antes. En los muros hay marcas que ellos mismos dejaron en ciclos anteriores. | Le da sentido narrativo a jugar muchas partidas. |

**Recomendación:** combinar **B y D**. Encaja muy bien con partidas cerradas: cada partida es otra ejecución del mismo proceso, y "eres una copia que ya ha vivido esto" explica por qué vuelves a despertar. Entre partidas se pueden desbloquear **fragmentos de memoria** que revelan el lore poco a poco, sin afectar el equilibrio del juego.

## 4. El lenguaje del cubo: caras, aristas y vértices

Antes de cada prueba el cuarto **se ilumina para anunciar qué viene**. El sistema sale de la geometría del cubo, así que es propio del juego y fácil de leer:

- **El color de las caras indica el tipo de prueba.** Un cubo tiene 6 caras, así que hay 6 tipos.
- **Las aristas encendidas indican la dificultad o letalidad, de 1 a 12.** Un cubo tiene 12 aristas.
- **Los vértices encendidos indican cuántos jugadores participan, de 1 a 8.** Un cubo tiene 8 vértices.

Así, un jugador que entra a un cuarto con caras azules, 7 aristas encendidas y 4 vértices sabe que le toca una prueba de lógica difícil con otras tres personas, aunque nadie se lo diga. En primera persona, esa lectura ocurre en el segundo en que se mira alrededor.

### Los seis tipos de prueba

Como es un juego de acción, **todas las pruebas tienen un componente físico**. El tipo indica qué se pone a prueba *además* del cuerpo.

| Cara | Símbolo | Naturaleza | Qué pone a prueba |
|---|---|---|---|
| **Hierro** | ■ | Física | Reflejos, parkour, precisión y orientación espacial |
| **Cristal** | ◆ | Lógica | Acertijos, patrones y cerraduras bajo presión de tiempo |
| **Espejo** | ◑ | Engaño | Deducción social, mentiras e impostores |
| **Cadena** | ⛓ | Cooperación forzada | Coordinación: o se salvan todos o no se salva nadie |
| **Arena** | ⧗ | Recursos | Tiempo, subastas y sacrificios |
| **Vacío** | ○ | Desconocida | Las reglas no se explican y hay que descubrirlas jugando |

## 5. El recurso vital: el aire

Cada celda tiene una **reserva de aire** que baja con el tiempo. Superar una prueba la recarga en proporción a su dificultad, es decir, a sus aristas. Si llega a cero, la celda se sella y el jugador es eliminado.

**Para qué sirve:** obliga a jugar. Nadie puede esconderse esperando a que otros resuelvan todo. Además, el aire se puede **transferir** entre celdas contiguas, lo que abre la puerta a la generosidad, la extorsión y la traición.

**Valores iniciales para probar** (hay que ajustarlos en pruebas de juego):

- Se empieza con 3 minutos de aire.
- Superar una prueba da entre 30 segundos y 4 minutos, según sus aristas.
- Correr gasta aire más rápido. Esto obliga a elegir entre velocidad y reserva.

## 6. Comunicación como mecánica

La información asimétrica es la base del juego: **cada celda ve solo una parte del problema**. Por eso, cómo se comunican los jugadores importa tanto como lo que dicen.

| Canal | Disponibilidad | Limitación |
|---|---|---|
| **Golpes en el muro** | Siempre | Solo ritmo, sin palabras. El sonido es posicional: se oye desde el muro de donde viene. Los jugadores inventan sus propios códigos. |
| **Rendija de notas** | Con celdas contiguas | Texto corto con un límite de caracteres que tarda en llegar. Mientras escribes, no te mueves. |
| **Intercomunicador** | Solo cuando el Anfitrión lo habilita | Puede tener estática o retraso, o ser escuchado por todos. |
| **Cara a cara** | Cuando los muros se abren y las celdas se unen | Es raro y es el momento de mayor tensión. |

## 7. Eliminación sin expulsión: los Ecos

Los juegos de eliminación suelen tener un problema: el jugador eliminado se aburre y se desconecta. En Cuboid, quien cae **se convierte en un Eco**:

- Sigue viendo la partida y puede moverse libremente como espectador.
- Puede hacer pequeñas interferencias: parpadear una luz, golpear un muro o dejar un símbolo por ciclo.
- Los vivos **no saben si un Eco los ayuda o los sabotea**.
- El Anfitrión puede darle a cada Eco un objetivo secreto, por ejemplo "que sobreviva la celda 14" o "que nadie llegue a la Salida". Si lo cumple, el Eco también puntúa.

Como las partidas son cerradas y cortas, esto mantiene a todos jugando hasta el final y añade una capa de paranoia.

## 8. Estructura de una partida

Esta es una propuesta para una partida de unos **20 minutos con 8 a 12 jugadores**.

| Fase | Duración | Qué pasa |
|---|---|---|
| **Sala de espera** | Variable | Emparejamiento. Los jugadores esperan dentro de una celda oscura en la que todavía no pasa nada. |
| **1. Despertar** | 1–2 min | Cada jugador está solo y enfrenta una prueba individual corta (Hierro, 1 arista) que enseña a moverse. Se descubre el medidor de aire. |
| **2. Contacto** | 2 min | Se habilitan los golpes y la rendija con las celdas contiguas. Aparece la primera prueba en pareja. |
| **3. Ciclos de prueba** | 12–14 min | Se repite el ciclo: **reconfiguración**, **anuncio** con luces y reglas, **pruebas** simultáneas en distintos sectores, **resultados** y **pausa** corta, en la que se intercambia aire e información. La dificultad sube con cada ciclo. |
| **4. La Salida** | 2–3 min | El Anfitrión abre la Salida y anuncia su condición, por ejemplo: *"La Salida admite a la mitad de los sobrevivientes"*. Es una carrera final por un camino que se reconfigura. |
| **5. Resultados** | 1 min | Se muestra quién escapó y se revela un fragmento de memoria. |

**Cómo se gana:** cruzar la Salida. Entre quienes escapan, el puntaje depende del aire restante y de las pruebas superadas. Los Ecos puntúan si cumplen su objetivo secreto.

## 9. Catálogo inicial de pruebas

### Persecución (Hierro, 6 aristas, 8 jugadores)
Las celdas de un sector se abren en cadena y un muro de luz blanca avanza desde un extremo. Lo que alcanza, lo elimina. Cada jugador puede **cerrar escotillas detrás de sí** para frenar el muro, pero eso también deja atrapados a quienes vienen detrás.

### Llave única (Arena, 7 aristas, 4 jugadores)
Cuatro jugadores entran a una celda central por cuatro puertas. En el centro hay una sola llave. Quien la toma y corre a su puerta escapa de la prueba solo. Si en cambio la colocan en el panel central, las cuatro puertas se abren, pero el panel exige que los cuatro lo sostengan 30 segundos mientras se activan trampas en el piso.

### Presión (Cristal, 3 aristas, 4 jugadores)
Cada jugador tiene en su celda una balanza y pesos pesados que debe cargar mientras el techo baja. Las cuatro balanzas están conectadas y **la suma total debe ser exacta**. Cada uno ve una sola pista del número correcto. Para resolverla hay que comunicarse solo con golpes y notas.

### Válvula (Cadena, 4 aristas, 2 jugadores)
Dos celdas contiguas comparten una válvula de aire. Para superar la prueba hay que mantener el equilibrio durante 2 minutos mientras el piso se inclina y obliga a moverse para no caer. Quien suelta la válvula para salvarse le roba aire al otro.

### El sustituto (Espejo, 6 aristas, 6 jugadores)
El Anfitrión anuncia: *"Puede haber un simulacro entre ustedes"*. Los seis tienen 90 segundos para encerrar a alguien en una cápsula, y para meterlo hay que alcanzarlo y empujarlo. Si encierran al simulacro, todos ganan aire. Si se equivocan, el encerrado pierde y el simulacro gana. **El giro:** a veces no hay simulacro, y el Anfitrión no mintió.

### Gravedad (Hierro, 5 aristas, 3 jugadores)
La celda empieza a rotar y la gravedad cambia de muro cada pocos segundos. Hay que llegar a la escotilla antes de que se cierre. Cada escotilla que se abre **cierra la de otra celda**.

### Sin reglas (Vacío, ? aristas, ? jugadores)
No hay anuncio. Solo hay un botón, un contador y silencio. Las reglas existen y son consistentes, pero se descubren observando qué pasa, mientras el aire se acaba.

## 10. Primera persona: controles y sensación

**Sin armas.** La acción es de movimiento e interacción: correr, trepar, cargar, empujar y accionar mecanismos. Esto separa a Cuboid de los shooters y mantiene el foco en el cuarto.

| Acción | Control |
|---|---|
| Moverse / correr | WASD / Shift (correr gasta aire) |
| Saltar / agacharse | Espacio / Ctrl |
| Interactuar, agarrar o cargar | E |
| Empujar a otro jugador | Clic derecho |
| Golpear el muro | Clic izquierdo sobre un muro |
| Escribir nota | E sobre la rendija |

**Interfaz dentro del mundo, sin HUD.** Toda la información vive en el cuarto:

- **Aire:** un medidor grabado en el muro, la respiración del personaje y la visión que se estrecha cuando queda poco.
- **Tiempo:** una arista que se apaga poco a poco.
- **Reglas:** la voz del Anfitrión más un panel que sale del muro con el texto grabado.

**Sensación:** el movimiento debe sentirse con peso pero responder rápido. Las reconfiguraciones se sienten en la cámara con vibraciones, inclinaciones y sonido grave.

## 11. Estética y tono

- **Visual:** brutalismo de concreto y metal, niebla y escala imposible. Las aristas brillan con resplandor (*bloom*) y son la única guía de color.
- **Sonido:** un zumbido constante, mecanismos pesados y audio posicional para los golpes y las trampas. La voz del Anfitrión es tranquila incluso en el caos. **El silencio absoluto** antes de una trampa es una herramienta de tensión.
- **Violencia estilizada, sin gore.** Las eliminaciones son contundentes pero abstractas: un destello de luz blanca, la celda que se sella y luego queda vacía. Esto mantiene la intensidad de la acción, amplía la audiencia y facilita la clasificación por edad.

## 12. Dirección técnica (web)

### Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| **Cliente 3D** | Three.js + TypeScript | Es el estándar de 3D en web, ligero y con control total. Las celdas cúbicas son geometría simple. |
| **Física** | Rapier (WASM) | Es rápida y determinista, y corre igual en el cliente y en el servidor. |
| **Build** | Vite | Arranque inmediato y recarga en caliente. |
| **Servidor** | Node.js + Colyseus | Es un framework multijugador basado en salas, con emparejamiento y sincronización de estado. Encaja directo con partidas cerradas. |
| **Voz** (después del prototipo) | WebRTC, por ejemplo con LiveKit | Permite voz por proximidad y canales que el Anfitrión controla. |

Si se prefiere un motor más completo de fábrica, la alternativa es **Babylon.js**, que trae física y herramientas incluidas a cambio de más peso.

### Arquitectura

```
Navegador (Three.js + Rapier)         WebSocket          Servidor de partida (Colyseus + Rapier)
 · input del jugador            ───────────────────▶      · reglas de las pruebas y el Anfitrión
 · predicción del movimiento    ◀───────────────────      · aire, eliminaciones, reconfiguraciones
 · render de su celda y vecinas     estado por celda       · física autoritativa
```

- **Servidor autoritativo.** En la web el cliente es fácil de inspeccionar y modificar, así que todas las reglas, el aire y los resultados se deciden en el servidor. El cliente solo predice su propio movimiento e interpola el de los demás.
- **El diseño también protege contra trampas.** Cada cliente recibe solamente el estado de su celda y de las contiguas abiertas. El aislamiento, además de ser parte del juego, reduce el ancho de banda y hace imposible ver a través de los muros con trampas, porque esa información nunca llega al navegador.
- **El render aprovecha el aislamiento.** Solo se dibujan la celda actual y las vecinas abiertas. Con iluminación precalculada y aristas emisivas, el costo gráfico es bajo.

### Metas de rendimiento

- 60 fps en laptops con gráficos integrados.
- Descarga inicial menor a 30 MB y entrada a la partida en menos de 10 segundos.
- Servidor a 20–30 actualizaciones por segundo.
- Controles con Pointer Lock (captura del mouse del navegador). El soporte para gamepad viene después y el móvil queda fuera del alcance inicial.

## 13. Inspiraciones

La idea es tomar el **espíritu** de estas obras y construir una identidad propia, sin copiar sus nombres, símbolos, personajes ni giros argumentales.

| Obra | Qué tomamos | Qué dejamos fuera |
|---|---|---|
| *Alice in Borderland* | Juegos mortales con reglas precisas, tipos de juego como lenguaje visual, la tensión entre cooperar y traicionar, y un recurso que obliga a jugar | Su sistema de cartas y palos, sus personajes, el Tokio vacío y su giro final |
| *Cube* (1997) | El cuarto cúbico como trampa, la estructura que se mueve y el misterio arquitectónico | Sus trampas y su sistema numérico de pistas |
| *Zero Escape* | Acertijos combinados con el dilema del prisionero | — |
| *Portal* | La voz de una IA anfitriona, las pruebas en cámaras y el movimiento en primera persona como forma de resolver problemas | El humor sarcástico |
| *Mirror's Edge* | Parkour en primera persona fluido y legible | — |
| *Severance* | La frialdad institucional y la identidad fragmentada | — |
| *Werewolf* / *Among Us* | La deducción social y las votaciones | — |

## 14. Preguntas abiertas

1. **Escala:** ¿8, 12 o 16 jugadores por partida? Se recomienda empezar con 8 por el costo del servidor y para facilitar el emparejamiento.
2. **Voz:** ¿chat de voz real o solo golpes y texto? La voz sube mucho la tensión, pero complica la moderación.
3. **Contacto físico:** ¿empujar a otros jugadores debe estar en todas las pruebas o solo en algunas?
4. **Lore:** ¿qué hipótesis seguimos? ¿Qué hay realmente al otro lado de la Salida?
5. **Progresión:** además de los fragmentos de memoria, ¿habrá cosméticos o rangos entre partidas?

## 15. Siguiente paso: prototipo jugable

El prototipo busca validar el núcleo del juego: moverse en primera persona, estar aislado, comunicarse con límites y decidir bajo presión.

- **Alcance:** 4 jugadores en 4 celdas alrededor de una celda central, en el navegador.
- **Movimiento:** controles en primera persona con física básica.
- **Comunicación:** solo golpes con audio posicional.
- **Recurso:** aire como único recurso.
- **Pruebas:** *Presión* (Cristal), *Válvula* (Cadena) y *Llave única* (Arena).
- **Arte:** cubos grises con aristas emisivas.
- **Fuera del alcance:** reconfiguración, Ecos, lore y voz.

Si después de jugarlo los jugadores discuten por quién se quedó con la llave, el núcleo funciona.
