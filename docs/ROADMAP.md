# Roadmap interno

Documento de trabajo: no se muestra en la app (la crónica de cambios
visible es `src/lib/changelog.ts`). Ojo: el repositorio es público, así
que esto sí se ve en GitHub.

Prioridad: **P1** siguiente, **P2** después, **P3** cuando haya hueco.
Última revisión: 2026-11-04 (tablas personalizadas, búsqueda).

## Hecho recientemente

- Tablas personalizadas (2026-11-04, punto 2): crear, editar, importar
  (.md/.txt/.json, varias por archivo), exportar a .md y compartir. Dado
  fijo (d4–d100, d66) o "según las líneas" (dN), rangos opcionales
  ("1-3 Ratas") y tablas de Markdown pegadas. En IndexedDB y en la copia
  de seguridad (esquema 3; las copias de versión 2 se restauran sin
  tocar las tablas propias).
- Diez tablas de serie nuevas (2026-11-04): Acción y Tema (d66), Cómo
  (adverbios), Aspecto (adjetivos sin género), Rasgo de PNJ,
  Motivación, Complicación, Lugar, Hallazgo (d20) y Clima (d6).
- Inspiración rápida (2026-11-04): Acción + Tema en una sola tirada,
  en la pantalla de Tablas y en la mesa de juego. Dos tiradas en el
  historial y una sola entrada en el diario.
- Búsqueda en el diario (2026-11-04, punto 4).
- Estadísticas de la aventura (2026-11-04): menú "⋯" de la aventura.
- Compartir con el menú del sistema (2026-11-04): aventura (el mismo
  .md Lonelog que la exportación) y tablas propias. Solo aparece donde
  el navegador tiene Web Share; si falla, se descarga.
- Ajustes del composer y la mesa de juego (2026-11-05): enviar
  desactivado con el campo vacío (salvo "Nueva sesión", que usa la
  fecha); fuera el tipo "Tirada" del menú (solo escribía texto: para
  eso están los dados); "Nueva sesión" separada tras una línea; una
  consecuencia se une siempre a la entrada anterior, de cualquier tipo,
  y el composer dice a cuál ("Se une a «…»"). Herramientas en el orden
  oráculo, dados, tablas (panel de escritorio y hoja del móvil); la
  herramienta de tablas solo muestra inspiración rápida, las favoritas
  y la búsqueda para el resto.
- Mismo ancho de contenido en todas las pantallas (2026-11-05), igual
  que la cabecera; cabecera de sesión más marcada (borde dorado, letra
  de título) y una línea a la izquierda de sus entradas.

- Licencia GPL-3.0 (`LICENSE`, README, `package.json`); antes AGPL-3.0.
- Tests con Vitest (`npm test`), que bloquean el despliegue si fallan:
  oráculo, Lonelog, agrupación del diario y datos de las tablas.
- Apoyo en Ko-fi: tarjeta en Ajustes → Acerca de y enlace "Apoyar" en
  la cabecera de escritorio.
- Arreglos de la revisión de interfaz (ver punto 6) y de la
  importación de Lonelog (ver punto 7).
- Rediseño del diario, primero para móvil y luego para pantallas
  grandes (ver punto 6):
  - Composer en una sola fila (unos 67 px frente a 260): herramientas
    (oráculo, tabla, dados) en una hoja inferior con pestañas (también en
    tablet, más ancha y con las tablas en dos columnas), el tipo de
    entrada como chip con menú (incluye "Nueva sesión") y enviar.
  - El texto del composer admite varias líneas y crece solo: Intro envía
    y Mayús+Intro salta de línea con teclado físico; en táctil Intro
    salta de línea y se envía con el botón.
  - Escritorio: espacio de trabajo con el diario en el centro, la mesa
    de juego fija a la derecha (lg) y el índice de sesiones a la
    izquierda (xl). Por debajo de xl, el índice es un desplegable en la
    cabecera de la aventura.
  - Cabecera de la aventura en una línea; favorita, desactivar y lo poco
    frecuente, al menú "⋯".
  - Chip global en la cabecera con la aventura activa (sustituye a las
    franjas "Registrando en…" y "Activa una aventura…").
  - Sesiones en orden cronológico: anteriores plegadas arriba, la actual
    abajo con su título fijo al hacer scroll.
  - Lápiz y papelera solo al tocar una entrada (o al pasar el ratón).
  - Selector de tipo con borde y flecha (se leía como etiqueta); escala
    de probabilidad con iconos (el "+" de algunos temas parecía una
    cruz); barra inferior de alto fijo (el composer se metía 7,5 px
    debajo y "cambiaba de tamaño" al hacer scroll).
  - Cabecera de escritorio en rejilla: las pestañas no se mueven con el
    chip de la aventura. Pantallas 2xl más anchas (110rem).
  - Iconos: de Heroicons a Tabler Icons (MIT) en toda la app, con
    motivos de rol donde tocan (oráculo: bola de cristal; acción:
    espada; nota: pluma; dados: dado; crónica: pergamino). Logo nuevo
    (rosa de los vientos), igual en la app, favicon e iconos de
    instalación.
  - Borrar entradas del diario y tiradas del historial se deshace desde
    un aviso, sin diálogo (punto 3).
  - "Protege tu diario" deja de aparecer por su cuenta (antes, un
    diálogo al crear la primera aventura): queda solo en Ajustes.
  - Dados propios: varias tiradas en una entrada se ven una por una, con
    su dado; los dados del composer se acumulan y se apuntan juntos.
- Escritorio (2026-11-04): cursor de mano y hover en todo lo pulsable;
  anillo de foco dorado con teclado, foco atrapado en los diálogos y
  flechas en los menús; atajos (1/2/3/H, /, O/T/D, Esc, ?) con leyenda
  en Ajustes.
- Aventura de ejemplo (2026-11-04): «La posada del cruce», dos sesiones
  con preguntas, oráculo (sí, «sí, pero», contradicción, «no, y
  además»), tablas, dados y consecuencias. Solo se ofrece con el diario
  vacío, como enlace discreto. Se descartó un tutorial guiado (globos
  sobre los botones): tres diseños distintos, se rompe con cada cambio
  de interfaz y estorba al empezar.
- Recordatorio de copia de seguridad (2026-11-04): "Última copia: hace…"
  en Ajustes y un punto en la rueda solo si hay 10+ entradas nuevas y
  14+ días sin copia; se apaga 7 días al abrir Ajustes.
- Instalar la app (2026-11-04): Ajustes → Aplicación. Botón con el
  diálogo del navegador (`beforeinstallprompt`, Chrome/Edge); en Safari
  y Firefox, instrucciones del menú. Indica si ya está instalada (modo
  standalone, o recordado en localStorage al verla en una pestaña).

---

## 1. Lonelog completo: hilos, personajes, lugares, relojes (P2, aplazado)

Aplazado el 2026-11-04 (se retoma más adelante). Idea que quedó sobre
la mesa: modelo mixto — los cambios de estado salen de las entradas
(`[N:Jonah|+capturado]`), pero cada PNJ/lugar tiene una ficha propia
(descripción, alias) que se exporta como bloque al principio del `.md`.
Lo de más valor: la ficha con todas las entradas donde aparece.
Fases: 1) entender y mostrar las etiquetas como chips (ida y vuelta en
el `.md`), 2) panel derivado, 3) menciones desde el composer, 4) fichas
editables, 5) hilos, relojes y "tirar en la lista".

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
- **UI**: panel "Reparto y tramas" por aventura. En escritorio, en la
  columna izquierda (xl), debajo del índice de sesiones — la derecha ya
  es la mesa de juego; en lg, quizá como pestaña de esa mesa. En móvil,
  una hoja más del composer (como oráculo/tabla/dados).
- **Escritura**: chips en el composer para insertar una etiqueta sin
  saber la sintaxis (p. ej. "+ PNJ" → autocompletar nombres ya usados).
- **Relojes**: botones −/+ que añaden una entrada `[Reloj:Nombre x/y]`
  nueva en lugar de editar la anterior (el diario es un registro).
- **Oráculo**: más adelante, "tirar en la lista de hilos/PNJ" para
  elegir uno al azar (como las listas de Mythic).

## 2. Tablas personalizadas: crear e importar — HECHO (2026-11-04)

Lo que se planteó:


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

## 3. Deshacer en vez de confirmar — HECHO (2026-11-03)

Hecho para las entradas del diario (antes se borraban sin confirmación
ni forma de recuperarlas) y para las tiradas del historial (antes, un
diálogo). Aviso de 6 s; uno nuevo sustituye al anterior. Se reinserta la
misma entrada (mismo id y timestamp). Queda por ver en uso real si 6 s
es mucho.

Lo que se decidió:

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

## 4. Búsqueda dentro del diario — HECHO (2026-11-04)

Cómo funciona: todas las palabras de la búsqueda tienen que aparecer
(en cualquier orden, sin distinguir mayúsculas ni acentos), así que
"posadero nombre" encuentra "El posadero dice que su nombre es Bram".
Resultados en el orden del diario (donde aparece un nombre por primera
vez suele ser donde se presentó), con la palabra resaltada, sesión y
fecha. Dos sitios:

- Dentro de la aventura: lupa en la cabecera. Al elegir un resultado se
  despliega su sesión, se salta a la entrada y se resalta un momento.
- En la lista del diario: el buscador de aventuras busca también en las
  entradas de todos los diarios ("En los diarios") y abre la aventura en
  esa entrada.

Queda para el punto 1: filtrar por PNJ/lugar/hilo.

Lo que se planteó:


- Buscar en el texto de todas las entradas de una aventura (y quizá de
  todas las aventuras): "¿cómo se llamaba aquel posadero?".
- Resultados con contexto (sesión, fecha) y salto a la entrada,
  desplegando su sesión si está plegada.
- Con el punto 1, filtrar también por PNJ/lugar/hilo.

## 5. Más oráculos y tablas (P2, investigar antes)

**Decidido (2026-11-04): añadir las tablas de Ironsworn/Delve y de
Starforged (CC BY 4.0), pero no ahora.** Es el siguiente paso en tablas
de terceros cuando se retome; antes, comprobar la atribución exacta en
su página de licencias.

La estructura ya es un registro (`oracles.ts`); al añadir el segundo
oráculo hay que introducir el despacho por id (ver CLAUDE.md).

Recordatorio de licencias: la app es gratuita pero tiene enlace a
Ko-fi. Las licencias **NonCommercial (NC)** son una zona gris con
donaciones; mejor priorizar **CC BY** y **CC BY-SA**. El texto de
terceros conserva su licencia aunque el código sea GPL.

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

**Corregido en el rediseño del 2026-11-03** (detalle en "Hecho
recientemente"): composer que ocupaba un 39–69 % de la pantalla del
móvil, aviso de protección al crear la primera aventura, lápiz y
papelera siempre visibles en táctil, "Registrando en «…»" repetido,
sesiones anteriores debajo de la actual y laterales vacíos en
escritorio. Comprobado jugando en iPhone SE, iPhone 13, tablet (820 px),
1100 px y 1440 px: lo recién apuntado nunca queda tapado, sin desbordes
ni errores de consola.

**Pendiente:**

- **P3 · Detalles**: placeholder del oráculo cortado en móvil (usar uno
  más corto); "CONTRADICCIÓN" deja poco sitio a la pregunta en "Últimas
  tiradas"; el aviso "Activa una aventura…" deja una palabra huérfana
  en móvil (ya no existe: lo sustituye el chip de la cabecera); las preguntas largas en mayúsculas en la tarjeta de
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

- **Visibilidad del repositorio y uso de IA.** Abierto (GPL) o privado:
  GitHub Pages desde un repo privado necesita un plan de pago, y
  Cloudflare Pages lo permite gratis. Cambiar de URL cambia el origen y
  los datos de los usuarios no se mueven solos (IndexedDB y
  localStorage van atados al origen): solo con la copia de seguridad.
- **Firma de IA en los commits.** Decidir si se quita del historial
  (exige reescribirlo y forzar el push) y si los commits nuevos la
  llevan.

## 9. Otras ideas (P3)

- **Notas fijas por aventura (aplazado el 2026-11-04; propuesta lista).**
  Al retomarlo, decidir: una sola nota o varias tarjetas ("Pendiente",
  "Inventario"…), y si lleva casillas marcables o solo texto libre. Un
  apartado de "situación actual" que se edita en el sitio, aparte del
  registro cronológico (lo que mucha gente lleva en papel al lado):
  - Una sola nota de texto libre por aventura (varias líneas, con
    listas `- ` y casillas `- [ ]` que se pueden marcar), guardada sola
    mientras escribes. No es una entrada: no tiene fecha ni sale en el
    orden del diario, y editarla no deja rastro.
  - Dónde: en escritorio xl, en la columna izquierda bajo el índice de
    sesiones; en lg, arriba del panel de la mesa de juego (plegable);
    en móvil y tablet, una cuarta pestaña "Notas" en la hoja del
    composer y un icono de chincheta en la cabecera de la aventura.
  - Modelo: campo `notes` en `Adventure` (IndexedDB), así entra en la
    copia de seguridad sin más.
  - Lonelog: se exporta al principio del `.md`, tras el título, como
    un bloque propio que la importación reconoce y devuelve a las notas
    (revisar si la spec 1.5.0 define algo para esto antes de inventarlo).
  - Encaja con el punto 1: el panel "Reparto y tramas" iría en el mismo
    sitio, y la nota podría ser su primera versión manual.
- **"En el capítulo anterior…" (dudoso).** Resumen plegable al volver a
  una aventura (últimas consecuencias y la última pregunta). Aplazado y
  sin decidir si merece la pena: las sesiones anteriores ya se pueden
  leer, y la búsqueda ayuda a encontrar lo concreto.
- Exportar también a PDF o HTML legible para compartir una partida.
- Probabilidad "a ojo" del oráculo (mostrar % aproximado de Sí/No).
- Escenas y factor de caos (estilo Mythic) como add-on opcional.
- Más idiomas si la comunidad lo pide (el sistema de diccionarios ya lo
  permite).
