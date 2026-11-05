# Cuboid: documento de concepto

> Borrador v0.1: temática, ambientación y mecánicas base. Todo es propuesta y está abierto a cambios.

> *Despiertas en un cuarto cúbico sin puertas visibles. Las paredes zumban. Se enciende una sola arista con una luz fría. Al otro lado del metal, alguien golpea tres veces.*

---

## 1. Premisa

**Cuboid** es un juego multijugador online de supervivencia y pruebas. Cada jugador despierta **aislado en un cuarto sellado** dentro de una megaestructura cúbica. Para seguir con vida hay que superar pruebas de ingenio, de habilidad y de confianza, muchas veces a costa de los demás. Mientras tanto, los jugadores intentan descubrir quién construyó el Cuboide y por qué están ahí.

**Tono:** thriller psicológico de ciencia ficción. Las reglas son frías y precisas, y las consecuencias crueles. Las decisiones morales son ambiguas.

## 2. Pilares de diseño

1. **Primero el aislamiento, después la conexión.** Empiezas solo. Hablar con otros jugadores es escaso, imperfecto y valioso.
2. **Reglas claras, consecuencias crueles.** Cada prueba se explica con reglas exactas, como un juego de mesa. Lo difícil no es entender la regla, sino decidir qué hacer con ella.
3. **La confianza es un recurso.** Cooperar casi siempre es lo óptimo, pero traicionar siempre es posible y a veces tienta.
4. **El misterio mueve todo.** Cada ciclo revela un fragmento de la verdad del Cuboide.
5. **Ciencia ficción fría.** Tecnología incomprensible, estética brutalista, y luz y sonido como lenguaje.

## 3. Ambientación

### 3.1 El Cuboide

Es una megaestructura de miles de celdas cúbicas idénticas acomodadas en una cuadrícula tridimensional. Entre ciclos **la estructura se reconfigura**: las celdas se desplazan, rotan y se reconectan con otras. Cuando por fin se abre una pared no aparece una salida, sino **más celdas** que se pierden en la niebla en todas direcciones.

Las celdas no tienen pantallas modernas. La información aparece grabada en los muros, en paneles mecánicos que se deslizan y, sobre todo, en **luces en las aristas y los vértices** del propio cuarto (ver sección 4).

### 3.2 El Anfitrión

Es una inteligencia que nunca muestra su rostro. Habla a través de los muros con voz neutra, educada y casi amable. Anuncia las reglas, lleva la cuenta regresiva y declara los resultados.

> **Regla de diseño: el Anfitrión nunca miente.** Tampoco dice toda la verdad. Esto les da a los jugadores un ancla y permite pruebas que dependen de la **redacción exacta** de las reglas. Por ejemplo, *"puede haber* un impostor entre ustedes" no es lo mismo que *"hay* un impostor".

### 3.3 Hipótesis de lore

Hay que elegir una, combinar varias o mantener la ambigüedad a propósito.

| Hipótesis | Idea | Qué aporta al juego |
|---|---|---|
| **A. El experimento** | Una IA o una civilización posthumana evalúa a la humanidad. Los jugadores son "muestras". | Justifica pruebas éticas y dilemas. |
| **B. El archivo** | Los jugadores son **copias digitales** de personas reales, reconstruidas a partir de sus datos. El Cuboide es un proceso de selección que decide qué copias se conservan. | Justifica dentro de la ficción los *respawns*, las partidas paralelas y la existencia de miles de jugadores. |
| **C. El arca** | El Cuboide es una nave. Las pruebas eligen a quién despertarán al llegar a destino. | Da un objetivo final concreto. |
| **D. El bucle** | Los jugadores ya estuvieron aquí antes. En los muros hay marcas que ellos mismos dejaron en ciclos anteriores. | Le da sentido narrativo a la progresión entre partidas. |

**Recomendación:** combinar **B y D**. Encaja muy bien con un juego online: "eres una copia que ya ha vivido esto" explica las sesiones repetidas, el progreso persistente y que cada partida sea una instancia distinta del mismo Cuboide.

## 4. El lenguaje del cubo: caras, aristas y vértices

Antes de cada prueba el cuarto **se ilumina para anunciar qué viene**. El sistema sale de la geometría del cubo, así que es propio del juego y fácil de leer:

- **El color de las caras indica el tipo de prueba.** Un cubo tiene 6 caras, así que hay 6 tipos.
- **Las aristas encendidas indican la dificultad o letalidad, de 1 a 12.** Un cubo tiene 12 aristas.
- **Los vértices encendidos indican cuántos jugadores participan, de 1 a 8.** Un cubo tiene 8 vértices.

Así, un jugador que entra a un cuarto con caras azules, 7 aristas encendidas y 4 vértices sabe que le toca una prueba de lógica difícil con otras tres personas, aunque nadie se lo diga.

### Los seis tipos de prueba

| Cara | Símbolo | Naturaleza | Qué pone a prueba |
|---|---|---|---|
| **Hierro** | ■ | Física | Reflejos, precisión, ritmo y orientación espacial |
| **Cristal** | ◆ | Lógica | Acertijos, patrones, cerraduras y matemáticas |
| **Espejo** | ◑ | Engaño | Deducción social, mentiras e impostores |
| **Cadena** | ⛓ | Cooperación forzada | Coordinación: o se salvan todos o no se salva nadie |
| **Arena** | ⧗ | Recursos | Tiempo, subastas y sacrificios |
| **Vacío** | ○ | Desconocida | Las reglas no se explican y hay que descubrirlas jugando |

## 5. El recurso vital: el aire

Cada celda tiene una **reserva de aire** que se ve como un medidor grabado en el muro y baja con el tiempo. Superar una prueba la recarga en proporción a su dificultad, es decir, a sus aristas. Si llega a cero, la celda se sella y el jugador es eliminado.

**Para qué sirve:** obliga a jugar. Nadie puede esconderse en su cuarto esperando a que otros resuelvan todo. Además, el aire se puede **transferir** entre celdas contiguas, lo que abre la puerta a la generosidad, la extorsión y la traición.

## 6. Comunicación como mecánica

La información asimétrica es la base del juego: **cada celda ve solo una parte del problema**. Por eso, cómo se comunican los jugadores importa tanto como lo que dicen.

| Canal | Disponibilidad | Limitación |
|---|---|---|
| **Golpes en el muro** | Siempre | Solo ritmo, sin palabras. Los jugadores inventan sus propios códigos. |
| **Rendija de notas** | Con celdas contiguas | Texto corto con un límite de caracteres que tarda en llegar. |
| **Intercomunicador** | Solo cuando el Anfitrión lo habilita | Puede tener estática o retraso, o ser escuchado por todos. |
| **Cara a cara** | Cuando los muros se abren y las celdas se unen | Es raro y es el momento de mayor tensión. |

## 7. Eliminación sin expulsión: los Ecos

Los juegos de eliminación suelen tener un problema: el jugador eliminado se aburre y se desconecta. En Cuboid, quien cae **se convierte en un Eco**:

- Sigue viendo la partida.
- Puede hacer pequeñas interferencias: parpadear una luz, golpear un muro o dejar un símbolo por ciclo.
- Los vivos **no saben si un Eco los ayuda o los sabotea**.
- El Anfitrión puede darle a cada Eco un objetivo secreto, por ejemplo "que sobreviva la celda 14" o "que nadie salga".

Esto mantiene a todos jugando hasta el final y añade una capa de paranoia.

## 8. Estructura de una partida

Esta es una propuesta para una sesión de unos 40 minutos con 8 a 16 jugadores.

| Fase | Duración | Qué pasa |
|---|---|---|
| **0. Despertar** | 2–3 min | Cada jugador está solo. Hay una prueba individual sencilla (Cristal, 1 arista) que funciona como tutorial dentro de la ficción. Se descubre el medidor de aire. |
| **1. Contacto** | 3–5 min | Se habilitan los golpes y la rendija con las celdas contiguas. Aparece el primer dilema pequeño. |
| **2. Ciclos de prueba** | 25–30 min | Se repite el ciclo: **reconfiguración**, **anuncio** con luces y reglas, **pruebas** simultáneas en distintos sectores, **resultados** y **pausa**, en la que se intercambia aire e información. |
| **3. Prueba final** | 5 min | El Anfitrión anuncia una última regla que cambia todo, por ejemplo: *"Solo una celda puede salir"*. |
| **4. Revelación** | 1–2 min | Se revela un fragmento de lore y se guarda el progreso persistente. |

## 9. Catálogo inicial de pruebas

### Presión (Cristal, 2 aristas, 4 jugadores)
Cada jugador tiene en su celda una balanza y varios pesos. Las cuatro balanzas están conectadas y **la suma total debe ser exacta**. Cada uno ve una sola pista del número correcto. Para resolverla hay que comunicarse solo con golpes y notas.

### Válvula (Cadena, 4 aristas, 2 jugadores)
Dos celdas contiguas comparten una válvula de aire. Quien la gira hacia su lado recibe aire del otro. Para superar la prueba hay que mantener el equilibrio durante 3 minutos, pero ninguno ve el medidor del otro.

### El sustituto (Espejo, 6 aristas, 6 jugadores)
El Anfitrión anuncia: *"Puede haber un simulacro entre ustedes"*. Votan a quién expulsar. Si expulsan al simulacro, todos ganan aire. Si se equivocan, el expulsado pierde y el simulacro gana. **El giro:** a veces no hay simulacro, y el Anfitrión no mintió.

### Gravedad (Hierro, 5 aristas, 3 jugadores)
La celda empieza a rotar y la gravedad cambia de muro. Hay que llegar a la escotilla antes de que se cierre. Cada escotilla que se abre **cierra la de otra celda**.

### Subasta de aire (Arena, 8 aristas, 8 jugadores)
Se subastan llaves y se paga con aire. **Todos pagan lo que pujaron, ganen o no.** La llave más cara abre una salida y las demás no se sabe. Es una prueba de teoría de juegos pura.

### Sin reglas (Vacío, ? aristas, ? jugadores)
No hay anuncio. Solo hay un botón, un contador y silencio. Las reglas existen y son consistentes, pero se descubren observando qué pasa.

## 10. Estética y tono

- **Visual:** brutalismo de concreto y metal, niebla y escala imposible. Las luces de color son la única guía. La tipografía va grabada, nunca en pantallas.
- **Sonido:** un zumbido constante, mecanismos pesados durante las reconfiguraciones y la voz del Anfitrión. **El silencio absoluto** se usa como herramienta de tensión.
- **Violencia:** se recomienda **tensión psicológica en lugar de gore**. Las eliminaciones son abstractas: la celda se llena de luz blanca y queda vacía. El miedo viene de la anticipación. Además, esto amplía la audiencia y facilita la clasificación por edad.

## 11. Inspiraciones

La idea es tomar el **espíritu** de estas obras y construir una identidad propia, sin copiar sus nombres, símbolos, personajes ni giros argumentales.

| Obra | Qué tomamos | Qué dejamos fuera |
|---|---|---|
| *Alice in Borderland* | Juegos mortales con reglas precisas, tipos de juego como lenguaje visual, la tensión entre cooperar y traicionar, y un recurso que obliga a jugar | Su sistema de cartas y palos, sus personajes, el Tokio vacío y su giro final |
| *Cube* (1997) | El cuarto cúbico como trampa, la estructura que se mueve y el misterio arquitectónico | Sus trampas y su sistema numérico de pistas |
| *Zero Escape* | Acertijos combinados con el dilema del prisionero | — |
| *Portal* | La voz de una IA anfitriona y las pruebas en cámaras | El humor sarcástico |
| *Severance* | La frialdad institucional y la identidad fragmentada | — |
| *Werewolf* / *Among Us* | La deducción social y las votaciones | — |

## 12. Preguntas abiertas

1. **Tono:** ¿terror psicológico o thriller de acción? ¿Qué clasificación de edad buscamos?
2. **Formato:** ¿sesiones cerradas de 30 a 45 minutos o un Cuboide persistente que sigue vivo entre conexiones?
3. **Escala:** ¿cuántos jugadores por instancia: 8, 16 o 100?
4. **Perspectiva y plataforma:** ¿primera persona en 3D o vista isométrica en 2D? ¿PC, web o móvil?
5. **Voz:** ¿chat de voz real o solo señales y texto? La voz complica la moderación pero sube mucho la tensión.
6. **Lore:** ¿qué hipótesis seguimos? ¿Existe un escape real?

## 13. Siguiente paso sugerido: prototipo mínimo

Para validar la idea central de aislamiento, comunicación limitada y dilema:

- **4 jugadores** en 4 celdas contiguas.
- **3 pruebas:** *Presión* (Cristal), *Válvula* (Cadena) y *El sustituto* (Espejo).
- **Comunicación:** solo golpes y notas.
- **Aire** como único recurso.
- Sin lore ni reconfiguración por ahora.

Si este prototipo genera conversaciones tensas entre los jugadores, el núcleo del juego funciona.
