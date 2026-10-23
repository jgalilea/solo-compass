# Roadmap interno

Documento de trabajo: no se muestra en la app (la crónica de cambios
visible es `src/lib/changelog.ts`). Ojo: el repositorio es público, así
que esto sí se ve en GitHub.

Prioridad: **P1** siguiente, **P2** después, **P3** cuando haya hueco.
Última revisión: 2026-10-22.

## Hecho recientemente

- Licencia AGPL-3.0 (`LICENSE`, README, `package.json`).
- Tests con Vitest (`npm test`), que bloquean el despliegue si fallan:
  oráculo, Lonelog, agrupación del diario y datos de las tablas.
- Apoyo en Ko-fi: tarjeta en Ajustes → Acerca de y enlace "Apoyar" en
  la cabecera de escritorio.
- Arreglos de la revisión de interfaz (ver punto 6) y de la
  importación de Lonelog (ver punto 7).

---

## 1. Lonelog completo: hilos, personajes, lugares, relojes (P1)

Hoy el parser guarda como nota cualquier etiqueta `[...]`. Lonelog ya
define una notación para todo esto, así que no hay que inventar
formato: basta con entenderla, mostrarla y exportarla igual.

Etiquetas de Lonelog (spec en <https://lonelog.readthedocs.io/>, última
versión vista: 1.5.0, que añade categorías de etiquetas, etiquetas de
varias líneas y bloques de contexto de tirada; revisar la spec antes de
implementar, porque la app se escribió sobre una versión anterior):

| Etiqueta | Ejemplo | Para qué |
|---|---|---|
| PNJ | `[N:Jonah\|+capturado]` | Personajes no jugadores; `+`/`-` marcan cambios de estado |
| Lugar | `[L:Torre vieja\|derruida\|inquietante]` | Localizaciones |
| PJ | `[PC:Alex\|HP 20\|Gear:Espada]` | Ficha mínima del personaje |
| Hilo | `[Thread:Carta rota\|Open]` | Tramas abiertas/cerradas |
| Progreso | `[Torre:Estabilidad 6/10]` | Relojes y barras (actual/total) |
| Sala | `[R:1\|limpia\|cueva\|salidas N:R2]` | Add-on de mazmorras |

Propuesta:

- **Modelo**: derivar hilos, PNJ, lugares y relojes de las entradas del
  diario (la última mención manda), no guardarlos aparte. Así el `.md`
  sigue siendo la única fuente de verdad y la importación los recupera
  gratis.
- **UI**: panel "Reparto y tramas" por aventura. En escritorio, columna
  a la derecha del diario (ahora hay mucho espacio vacío a los lados);
  en móvil, una pestaña o hoja dentro de la aventura.
- **Escritura**: chips en el composer para insertar una etiqueta sin
  saber la sintaxis (p. ej. "+ PNJ" → autocompletar nombres ya usados).
- **Relojes**: botones −/+ que añaden una entrada `[Reloj:Nombre x/y]`
  nueva en lugar de editar la anterior (el diario es un registro).
- **Oráculo**: más adelante, "tirar en la lista de hilos/PNJ" para
  elegir uno al azar (como las listas de Mythic).

## 2. Tablas personalizadas: crear e importar (P1)

- Crear una tabla desde la app: nombre, dado (d6, d66, d20, y quizá
  dN/d100 libre) y una línea por resultado.
- Importar/exportar: pegar o subir un `.md`/`.txt` con una línea por
  resultado, o un `.json` propio. Formato sencillo para que la
  comunidad comparta tablas.
- Guardar en IndexedDB (pueden crecer), incluirlas en la copia de
  seguridad (`backup.ts`) y en el buscador/favoritas como las de serie.
- Atribución opcional por tabla (`game`, autor, licencia, enlace), que
  ya admite la estructura.
- Que las tablas del usuario sean suyas: la app no las publica en
  ningún sitio.

## 3. Deshacer en vez de confirmar (P2)

Hoy borrar una entrada o una tirada pide confirmación en un diálogo:
corta el ritmo en partida.

Propuesta:

- Borrar al momento y mostrar un aviso pequeño: "Entrada eliminada ·
  **Deshacer**", unos 5 s, sin bloquear nada y encima del composer.
- **¿Es demasiado intrusivo verlo cada vez?** No debería: solo aparece
  como respuesta a algo que acabas de hacer, no interrumpe, se va solo
  y si borras varias seguidas se sustituye (nunca se apilan). Es menos
  intrusivo que el diálogo actual, que sí exige un toque extra siempre.
  Si en la práctica molesta, se puede acortar a 3 s; no merece la pena
  un ajuste para desactivarlo.
- Mantener la confirmación solo en lo grande e irreversible: borrar
  una aventura entera, borrar todo el historial, restaurar una copia.
- Detalle técnico: borrado "pendiente" en memoria y se confirma al
  expirar el aviso, o borrado real + reinsertar con el mismo id y
  timestamp al deshacer (más simple con IndexedDB).

## 4. Búsqueda dentro del diario (P2)

- Buscar en el texto de todas las entradas de una aventura (y quizá de
  todas las aventuras): "¿cómo se llamaba aquel posadero?".
- Resultados con contexto (sesión, fecha) y salto a la entrada,
  desplegando su sesión si está plegada.
- Con el punto 1, filtrar también por PNJ/lugar/hilo.

## 5. Más oráculos y tablas (P2, investigar antes)

La estructura ya es un registro (`oracles.ts`); al añadir el segundo
oráculo hay que introducir el despacho por id (ver CLAUDE.md).

Recordatorio de licencias: la app es gratuita pero tiene enlace a
Ko-fi. Las licencias **NonCommercial (NC)** son una zona gris con
donaciones; mejor priorizar **CC BY** y **CC BY-SA**. El texto de
terceros conserva su licencia aunque el código sea AGPL.

| Material | Licencia | ¿Usable? | Notas |
|---|---|---|---|
| Recluse (actual) | CC BY 4.0 | Sí | Ya implementado |
| **Ironsworn / Delve: tablas de oráculo** | CC BY 4.0 (texto) | **Sí** | El autor amplió la licencia comercial a todas las tablas de Ironsworn y Delve; las de Starforged ya lo estaban. Solo texto, no arte ni maquetación. Hay que acreditar como pide su página de licencias y dejar claro que no es producto oficial. Mejor candidato para tablas. |
| Ironsworn: Starforged, tablas de oráculo | CC BY 4.0 | Sí | Ciencia ficción; encaja con el tema `scifi` |
| Ironsworn: mecánica de "Ask the Oracle" | Mecánica (no protegida) | Sí | Las mecánicas no tienen copyright; usar texto propio |
| Mythic GME | CC BY-NC (solo texto) | Dudoso | NC + Ko-fi = riesgo. Pedir permiso a Word Mill / Tana Pigeon antes |
| Juice Oracle | CC BY-NC-SA 4.0 | Dudoso | Mismo problema NC |
| One Page Solo Engine | Sin confirmar | ? | No encontré la licencia publicada; preguntar al autor |
| Knave 1.ª ed. (tablas) | CC BY 4.0 (según fuentes secundarias) | Probable | Verificar en el PDF original |
| Cairn (tablas) | Sin confirmar (¿CC BY-SA?) | ? | Verificar en la web oficial; BY-SA obliga a compartir igual |
| Lonelog | CC BY-SA 4.0 (el documento) | Sí | La licencia cubre el documento, no usar la notación |
| "d10 Roll Under One Page Solo" (A. Cavanagh) | CC BY 4.0 | Probable | Oráculo de palabras, eventos y lugares; verificar |
| "The Oracle" (jamessral) | CC BY 4.0 | Probable | Oráculo de cartas; verificar |

Siguiente paso: confirmar en cada fuente original (no en resúmenes) y
guardar el texto de atribución exacto junto a cada tabla/oráculo.

Fuentes consultadas (octubre 2026):
[licencias Ironsworn](https://tomkinpress.com/blogs/news/lets-talk-about-ironsworn-licensing),
[licencia Word Mill/Mythic](https://wordmillgames.com/license.html),
[Juice Oracle](https://thunder9861.itch.io/juice-oracle),
[Lonelog](https://lonelog.itch.io/lonelog),
[One Page Solo Engine](https://inflatablestudios.itch.io/one-page-solo-engine-2),
[Knave 1e](https://boardgamegeek.com/rpg/50827/knave-1st-ed),
[d10 One Page Solo](https://andrew-cavanagh.itch.io/d10-roll-under-one-page-solo-creative-commons),
[The Oracle](https://jamessral.itch.io/the-oracle),
[Recluse](https://gravenutterance.itch.io/recluse).

---

## 6. Interfaz: hallazgos de la revisión del 2026-10-22

Revisión jugando de verdad (Playwright) en móvil (iPhone 13 y SE),
tablet (820 px) y escritorio (1440 px). Sin desbordes horizontales ni
errores de consola.

**Ya corregido:**

- La entrada recién apuntada desde el composer quedaba tapada por él en
  móvil (entera en modo Tirada, la respuesta en el oráculo). Ahora se
  mide el panel antes de desplazar.
- Al cambiar de pantalla en móvil se heredaba el scroll (el historial
  se abría a media lista). Ahora cada pantalla empieza arriba.
- Las tablas d66 decían "1–66"; ahora muestran el rango real (11–66).

**Pendiente:**

- **P1 · El composer ocupa demasiado en móvil**: un 39–53 % de la
  pantalla en un iPhone 13 y hasta un 69 % en un iPhone SE (modo
  Tirada), más la barra de navegación. Ideas: tipos y herramientas en
  una sola fila, pista como placeholder en vez de línea aparte, dados
  en una fila con scroll horizontal, y plegarlo solo al hacer scroll
  hacia arriba en el diario.
- **P2 · Aviso de "Protege tu diario" justo al crear la primera
  aventura**: interrumpe el primer momento de juego. Mejor tras unas
  cuantas entradas o al cerrar la primera sesión.
- **P2 · Lápiz y papelera siempre visibles en táctil**: dos iconos por
  línea, mucho ruido. Opciones: deslizar como en el historial, pulsación
  larga o un único "…" por tarjeta.
- **P2 · "Registrando en «…»" en el detalle de la aventura** repite el
  título justo encima; con la pastilla "Activa" basta.
- **P2 · Orden de las sesiones**: las anteriores aparecen *debajo* de la
  actual (y de "Nueva sesión"), al revés que un libro. Valorar ponerlas
  arriba, plegadas.
- **P3 · Escritorio**: el diario usa una sola columna estrecha y deja
  los laterales vacíos; sitio natural para el panel del punto 1.
- **P3 · Detalles**: placeholder del oráculo cortado en móvil (usar uno
  más corto); "CONTRADICCIÓN" deja poco sitio a la pregunta en "Últimas
  tiradas"; el aviso "Activa una aventura…" deja una palabra huérfana
  en móvil; las preguntas largas en mayúsculas en la tarjeta de
  resultado se leen mal.

## 7. Compatibilidad con Lonelog

**Corregido (2026-10-22), con tests en `src/lib/lonelog.test.ts`:**

- Entradas de varias líneas: las líneas de continuación se exportan
  sangradas con dos espacios y al importar vuelven a la misma entrada,
  aunque empiecen por un símbolo; se conservan las líneas en blanco
  intermedias.
- Notas que empiezan por `#`, `>`, `@`, `?`, `d:`, `=>`, `===` o `\`:
  se exportan escapadas con `\` (el escape estándar de Markdown) y ya
  no se pierden ni cambian de tipo al importar.
- `#` y `>` solo se ignoran en la cabecera del archivo (título y
  crédito); más abajo se importan como notas.

**Pendiente (P2):** comprobar en la spec 1.5.0 si Lonelog define ya su
propia forma de escribir entradas de varias líneas. Si es así, adoptarla
en lugar de la sangría y mantener la sangría solo al importar, para
seguir leyendo los archivos ya exportados.

## 8. Decisiones pendientes

- **Visibilidad del repositorio y uso de IA.** Abierto (AGPL) o privado:
  GitHub Pages desde un repo privado necesita un plan de pago, y
  Cloudflare Pages lo permite gratis. Cambiar de URL cambia el origen y
  los datos de los usuarios no se mueven solos (IndexedDB y
  localStorage van atados al origen): solo con la copia de seguridad.
- **Firma de IA en los commits.** Decidir si se quita del historial
  (exige reescribirlo y forzar el push) y si los commits nuevos la
  llevan.

## 9. Otras ideas (P3)

- Exportar también a PDF o HTML legible para compartir una partida.
- Probabilidad "a ojo" del oráculo (mostrar % aproximado de Sí/No).
- Escenas y factor de caos (estilo Mythic) como add-on opcional.
- Más idiomas si la comunidad lo pide (el sistema de diccionarios ya lo
  permite).
