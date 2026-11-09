# Roadmap interno

Documento de trabajo: no se muestra en la app (la crónica de cambios
visible es `src/lib/changelog.ts`). Ojo: el repositorio es público, así
que esto sí se ve en GitHub.

Prioridad: **P1** siguiente, **P2** después, **P3** cuando haya hueco.
Última revisión: 2026-11-09 (prueba de rendimiento con años de partidas, aviso de Safari).

## Hecho recientemente

- Más oráculos (2026-11-09): Loner (con contador de giros derivado del
  historial y tablas de giro tiradas solas), «Ask the Oracle» de
  Ironsworn (d100, coincidencias) y One Page Solo Engine v1.6 (CC BY-SA,
  según el autor en itch.io). Cada oráculo es un motor
  (`oracleEngines.ts`); la ayuda muestra sus reglas y una tabla con las
  probabilidades exactas, calculadas recorriendo todas las tiradas.
  Descartados: Mythic y Juice (licencias NC) y MUNE (sin licencia
  publicada). Pendiente si se pide: el «¿Cuánto?» de OPSE y el
  contador de giros por aventura (hoy es uno para todas).
- Prueba de rendimiento y aviso de Safari (2026-11-09):
  - `npm run test:perf` (`e2e/volume.perf.ts`, fuera del despliegue):
    restaura una copia con 11.000 entradas en 22 aventuras y 10.000
    tiradas y cronometra las pantallas en un móvil con la CPU 4 veces
    más lenta. Encontró dos problemas, corregidos: el historial pintaba
    todas las tiradas (14 s; ahora 60 y el resto al bajar, ~0,1 s) y
    una sesión de 2.000 entradas (diario importado sin sesiones) tardaba
    4,7 s en cada entrada nueva (ahora pinta los últimos 80 bloques con
    «Ver entradas anteriores»; ~0,4 s). Lo demás va por debajo de 0,5 s.
    Pendiente si molesta: saltar desde la búsqueda a una entrada muy
    antigua de una sesión enorme pinta todo desde ella hasta el final.
  - Aviso en el diario solo en Safari de iPhone/iPad sin instalar (y
    sin almacenamiento persistente): Safari borra los datos de una web
    tras 7 días de uso sin visitarla. Dice también que la app instalada
    empieza vacía (en iOS no comparte datos con Safari) y cómo pasar
    la copia. Se puede cerrar para siempre.
  - Manifest de la PWA en los dos idiomas: `LocaleProvider` cambia el
    `<link rel="manifest">` al del idioma elegido.
- Decisiones (2026-11-09): el zoom sigue bloqueado a propósito (la app
  debe comportarse como una nativa); revisión con lector de pantalla,
  no prioritaria.
- Ayuda de los dados ampliada y diálogos unificados (2026-11-09): la
  guía de los dados explica cómo tirar, cómo leer una tirada y cada
  fórmula desglosada pieza a pieza, con varios ejemplos (un test
  comprueba cada línea exacta) y juegos que la usan. Todos los
  diálogos comparten marco (`Modal` con `size` sm/md/lg/xl) y
  cabecera fija con cuerpo desplazable (`Dialog.tsx`); las guías y
  los ajustes aprovechan el ancho en escritorio.
- Auditoría de código (2026-11-09), todo corregido:
  - Pérdida de datos con dos pestañas o ventanas abiertas: cada una
    escribía su lista entera encima de la otra. Ahora cada tipo de
    dato es una colección con un registro por id (`collectionStore.ts`),
    se guarda solo lo que cambia y las demás pestañas recargan al
    recibir el aviso (`sync.ts`). Migración automática del formato
    antiguo (probada con datos creados por la versión anterior).
  - Restaurar una copia comprobaba solo las tablas: ahora cada
    aventura, entrada y tirada pasa por su `normalize…` (al cargar
    también) y se descarta lo ilegible.
  - Escritura de listas completas en cada cambio: resuelto con lo
    anterior. El historial sigue sin tope (decisión: no borrar
    tiradas del jugador; leerlo entero al arrancar es barato).
  - Importar un .md largo fechaba sus entradas en el futuro; los
    guardados iban dentro de los updaters de React (`useStoredList`);
    la lista de borrados crecía siempre (ahora se guarda un año).
  - Dependencias de compilación: `npm audit fix` y `glob` forzado
    dentro de `workbox-build` (overrides). Quedan 4 avisos leves de
    `deepmerge`, sin versión corregida, solo en el build.
  - Mantenimiento: `makeId` en `ids.ts`; `AdventureDetailView`,
    `TablesView` y `AdventureNotebook` partidos en componentes
    (`AdventureHeader`, `JournalSearchPanel`, `SessionNavigation`,
    `TableSections`, `TableRow`, `TableResultPanel`, `InspirationCard`,
    `PinnedNotes`, `CastItem`, `AddCastForm`); tests de almacenamiento
    con `fake-indexeddb` y de la lógica de insertar/mover.
- Escribir debajo y mover entradas (2026-11-07): menú «⋯» de cada
  entrada (y del título de sesión). «Escribir debajo» fija un punto de
  inserción (`insertionPoint` en `useJournal`) que usan también el
  oráculo, las tablas y los dados; avanza con cada entrada y se quita
  al salir de la aventura. El orden es solo el `timestamp`: se coloca a
  medio camino entre vecinos y, si no cabe, se empujan 1 ms los
  siguientes (`journalOrder.ts`). Mover cuenta como edición
  (`editedAt`) para que la fusión de copias respete el nuevo orden.
- Descripciones en el cuaderno (2026-11-07, punto 1): texto libre por
  personaje, lugar o hilo (`descriptions` de `Adventure`, por
  `castKey`, cada una con su fecha para la fusión). Lonelog no define
  descripciones; van en un campo `descriptions` de la cabecera YAML,
  una línea `[N:Nombre] texto` por elemento (la spec admite campos
  libres y su ejemplo ya pone etiquetas en `pcs:`). Sin alias.
- Prueba de humo en el navegador (2026-11-07): Playwright
  (`e2e/smoke.e2e.ts`), móvil y escritorio contra `vite preview`;
  corre en el despliegue tras los tests unitarios.
- Dados que explotan (2026-11-07): `3d6!`, también con `kh`/`kl` y en
  reservas (`5d10!>=8`, cada repetición cuenta como un dado).
- Ayuda del oráculo (2026-11-07): «?» junto al nombre, guía corta (no
  las reglas: para eso el enlace al original).
- Enviar la copia y juntarla al restaurar (2026-11-06, punto 9).
- Hilos y relojes (2026-11-06, punto 1): `[Thread:]`, `[Clock:]` (y
  `[E:]`), `[Track:]` y `[Timer:]` en el cuaderno ("Hilos y relojes"),
  con −/+ que apuntan el nuevo valor, cerrar/reabrir hilos y "tirar en
  la lista" (PNJ, lugares, hilos abiertos). Listas plegables.
- Importación de Lonelog fiel a la spec (2026-11-06, punto 7): una
  línea sangrada que empieza por símbolo es una entrada nueva; se
  ignoran los bloques de código.
- Dados con fórmula (2026-11-06): `2d6+3`, `4d6kh3`, `2d20kl1`,
  `5d6>=5`, botones de ventaja y desventaja.
- Tablas que remiten (2026-11-06): "Tira dos veces" (y tres) en las
  tablas de serie y `{Nombre de tabla}` en las propias.
- Exportar como página web (2026-11-06): un HTML autónomo con el tema
  activo (colores editables arriba, letra incrustada) y el cuaderno.
- Cuaderno de la aventura (2026-11-06, puntos 1 y 10): a la izquierda
  del diario en xl, en una hoja desde la cabecera por debajo.
  - Notas fijas: texto libre editado en el sitio, guardado solo, con
    casillas `- [ ]` que se marcan. Campo `notes` de `Adventure` (va en
    la copia de seguridad); en el `.md`, el campo `notes` del front
    matter YAML (la cabecera de campaña de Lonelog, §5.1).
  - Personajes y lugares con etiquetas de Lonelog (`[N:]`, `[PC:]`,
    `[L:]`, `[#N:]`): chips en el diario y lista en el cuaderno con sus
    rasgos actuales y las entradas donde salen. Añadir, anotar un
    cambio y mencionar desde el cuaderno, sin saber la sintaxis.
    Autocompletado en el composer y al editar una entrada: al escribir `[` sugiere los que ya
    hay y ofrece crear uno nuevo (PNJ, lugar o PJ) con lo escrito. La
    aventura de ejemplo ya las usa y trae notas fijas.
- Tablas de Cairn 2.ª ed. (2026-11-06): 82, CC BY-SA 4.0 (ver punto 5).
- Placeholder del oráculo más corto (2026-11-06): cabe en un iPhone SE.
- Tablas de seis juegos más y temáticas (2026-11-05): ver punto 5.
- El fondo ya no se desplaza con un diálogo abierto (2026-11-05).
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

## 1. Lonelog completo: hilos, personajes, lugares, relojes (P2, en parte hecho)

**Hecho (2026-11-06), con la spec 1.5.0 delante:** personajes y lugares
(`[N:]`, `[PC:]`, `[L:]` y referencias `[#N:]`), con los estilos de
actualización de la spec (`+`/`-`, `a→b`, valores como "PV 6"/"PV-2" y
categorías `estado:`), y etiquetas de varias líneas. Se derivan de las
entradas (`lonelogTags.ts`), no se guardan aparte. Corresponde a las
fases 1–3 de abajo (chips, panel derivado y menciones: desde el
cuaderno y con autocompletado al escribir `[` en el composer).

**Hecho también (2026-11-06):** hilos `[Thread:]` (un estado a la vez:
abierto, cerrado, abandonado), relojes `[Clock:]`/`[E:]`, progresos
`[Track:]` y cuentas atrás `[Timer:]` con botones −/+, y "tirar en la
lista". El autocompletado sugiere también hilos y relojes.

**Pendiente:** alias de un PNJ o lugar (la descripción ya está), salas de
mazmorra `[R:]` (add-on), y quizá juntar varios −/+ seguidos de un
reloj en una sola entrada si en uso real ensucian el diario.

Aplazado el 2026-11-04 (se retoma más adelante). Idea que quedó sobre
la mesa: modelo mixto. Los cambios de estado salen de las entradas
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
  columna izquierda (xl), debajo del índice de sesiones (la derecha ya
  es la mesa de juego); en lg, quizá como pestaña de esa mesa. En móvil,
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

**Hecho (2026-11-05): tablas de terceros, en inglés y en español**, cada
juego en su bloque plegable y cargado aparte (`tableGames.ts`, datos en
`src/lib/tableData/`). Las traducciones son propias; los créditos y las
atribuciones literales, en Ajustes → Acerca de y en el README.

| Juego | Tablas | Licencia | Fuente del texto inglés |
|---|---|---|---|
| Ironsworn | 30 | CC BY 4.0 | Datasworn (`ironsworn-classic`); el módulo de GatoMalefico (GPL-3.0) solo como vocabulario: su orden de filas no es el de la edición actual |
| Ironsworn: Delve | 42 | CC BY 4.0 | Datasworn (`ironsworn-classic-delve`) |
| Ironsworn: Starforged | 249 | CC BY 4.0 (Reference Guide; Datasworn las marca todas así) | Datasworn (`starforged`) |
| Starsmith (Eric Bright) | 194 (fuera 8 que repite con otro nombre y 1 idéntica a Starforged; sus versiones ampliadas d300 se quedan) | CC BY 4.0 según el autor; la ficha de Lulu dice CC BY-SA, así que nuestra traducción va como CC BY-SA | Datasworn (`starsmith`) |
| Loner v2.3 (R. Bisceglie) | 19 | CC BY-SA 4.0 (traducción también BY-SA) | Edición Keeper (`farirpgs/keeper`) |
| Knave 1.ª ed. (Ben Milton) | 11 (rasgos) | CC BY 4.0 (comprobado en el PDF) | PDF oficial |
| Lazy GM's Resource Document | 65 | CC BY 4.0 (+ atribución del SRD 5.1) | slyflourish.com; fuera las tablas de reglas 5e |
| Cairn 2.ª ed. (Yochai Gal) | 82 | CC BY-SA 4.0 (dicho en cairnrpg.com y en el README del repo; traducción también BY-SA) | `yochaigal/cairn` en GitHub: semillas de la guía del Warden (región, facciones, terreno, tiempo, mazmorras, bosques), PNJ y rasgos, vínculos y presagios del jugador. Fuera los dados de reparto, las acciones de facción y las fórmulas de nombres (reglas) |

Cada tabla tiene una temática común a todos los juegos (`TABLE_THEMES`):
se filtra por ella, se busca por ella y agrupa las tablas dentro de cada
bloque.

Pendientes posibles: los nombres del Lazy GM (listas de longitud
irregular), las tablas de nombres de lugar de Cairn (adjetivo + nombre
con fórmula: en español chocan con el género) e Ironsmith (CC BY según
Datasworn, BY-SA según Lulu). Sundered Isles: solo
los movimientos son CC BY, sus tablas no.

La estructura ya es un registro (`oracles.ts`); al añadir el segundo
oráculo hay que introducir el despacho por id (ver CLAUDE.md).

Recordatorio de licencias: la app es gratuita pero tiene enlace a
Ko-fi. Las licencias **NonCommercial (NC)** son una zona gris con
donaciones; mejor priorizar **CC BY** y **CC BY-SA**. El texto de
terceros conserva su licencia aunque el código sea GPL.

| Material | Licencia | ¿Usable? | Notas |
|---|---|---|---|
| Recluse (actual) | CC BY 4.0 | Sí | Ya implementado |
| **Ironsworn / Delve: tablas de oráculo** | CC BY 4.0 (texto) | **Hecho** | El autor amplió la licencia comercial a todas las tablas de Ironsworn y Delve; las de Starforged ya lo estaban. Solo texto, no arte ni maquetación. Hay que acreditar como pide su página de licencias y dejar claro que no es producto oficial. Mejor candidato para tablas. |
| Ironsworn: Starforged, tablas de oráculo | CC BY 4.0 (solo las de la Reference Guide) | **Hecho** (+ Starsmith) | Ciencia ficción; encaja con el tema `scifi`. El libro completo es solo CC BY-NC-SA |
| Ironsworn: mecánica de "Ask the Oracle" | Mecánica (no protegida) | Sí | Las mecánicas no tienen copyright; usar texto propio |
| Mythic GME | CC BY-NC (solo texto) | Dudoso | NC + Ko-fi = riesgo. Pedir permiso a Word Mill / Tana Pigeon antes |
| Juice Oracle | CC BY-NC-SA 4.0 | Dudoso | Mismo problema NC |
| One Page Solo Engine | Sin confirmar | ? | No encontré la licencia publicada; preguntar al autor |
| Knave 1.ª ed. (tablas) | CC BY 4.0 (comprobado en el PDF) | **Hecho** (rasgos) | Conjuros y equipo, fuera: son reglas |
| Cairn (tablas) | CC BY-SA 4.0 | **Hecho** (2.ª ed.) | BY-SA obliga a compartir igual la traducción (ya lo hacemos con Loner) |
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

- **P3 · Detalles**: "CONTRADICCIÓN" deja poco sitio a la pregunta en
  "Últimas tiradas"; las preguntas largas en mayúsculas en la tarjeta
  de resultado se leen mal. (Hechos o resueltos: el placeholder del
  oráculo, más corto desde el 2026-11-06; el aviso "Activa una
  aventura…", que ya no existe.)

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

**Revisado con la spec 1.5.0 (2026-11-06):** no define entradas de
varias líneas (solo etiquetas de varias líneas, que ya se leen), así
que la sangría de continuación se queda.

**Corregido (2026-11-06): la sangría chocaba con la spec al importar.**
La spec (§2.3) dice que la sangría es solo visual, y sus ejemplos
sangran los `d:` y `=>` bajo su `@`. Ahora una línea sangrada que
empieza por un símbolo es una entrada nueva, y al exportar las líneas
de continuación que empiezan por un símbolo se escapan con `\`. Coste
asumido: los `.md` exportados antes con una continuación que empezaba
por símbolo se parten en dos al reimportarlos (caso raro). También se
ignoran los bloques de código (la spec envuelve la notación en ellos en
formato digital).

## 8. Decisiones pendientes

- **Visibilidad del repositorio — DECIDIDO (2026-11-09): sigue
  abierto (GPL)** en GitHub Pages. No cambiar de URL: el origen ata los
  datos de los usuarios (IndexedDB y localStorage) y solo se moverían
  con la copia de seguridad.
- **Firma de IA en los commits.** Decidir si se quita del historial
  (exige reescribirlo y forzar el push) y si los commits nuevos la
  llevan.

## 9. Usar la app en varios dispositivos (investigado el 2026-11-06)

Hoy todo vive en un navegador. Para pasar a otro hace falta la copia de
seguridad (Ajustes → Exportar todo / Restaurar). Opciones sin servidor
propio, de menos a más trabajo:

| Opción | Navegadores | Qué hace falta | Notas |
|---|---|---|---|
| Compartir la copia con el menú del sistema (Web Share) y restaurarla en el otro | Todos los que tienen Web Share; si no, descarga | Nada nuevo: botón "Enviar a otro dispositivo" | Manual, pero cubre el caso "móvil ↔ ordenador" hoy mismo. Sin fusión: restaurar sustituye |
| Carpeta local sincronizada (File System Access: el usuario elige una carpeta de Dropbox/Drive/iCloud en su disco) | Chrome/Edge de escritorio; Chrome Android a medias. Firefox y Safari se oponen | Permiso de carpeta por sesión | No sirve en iPhone ni Firefox: descartado como solución general |
| Google Drive, carpeta oculta de la app (`drive.appdata`) | Todos | Proyecto en Google Cloud, ID de cliente OAuth con el origen de GitHub Pages, pantalla de consentimiento | El ámbito `drive.appdata` es "no sensible": verificación básica, sin auditoría de seguridad. El token dura una hora (reconectar sin molestar). Los datos quedan en el Drive del usuario, no en un servidor nuestro |
| Dropbox, carpeta de la app (OAuth con PKCE en el navegador) | Todos | App en Dropbox; en modo desarrollo hasta 50 usuarios, luego aprobación de producción | Más fricción que Google para llegar a todos |
| WebDAV / Nextcloud, remoteStorage | Todos | Que el servidor del usuario permita CORS | Para entendidos; no como opción principal |

Para cualquier sincronización real hace falta además **fusionar** dos
copias en vez de sustituir: entradas por id (ya tienen id y fecha),
borrados con lápida para que no "resuciten", aventuras y notas con "el
último cambio gana". Es la parte de más trabajo y la que hay que hacer
bien antes de conectar ningún servicio.

**Paso 1 hecho (2026-11-06):** "Enviar" en Ajustes (la copia por el
menú del sistema; como .txt en Chromium) y restaurar con la opción de
**juntar** (`backupMerge.ts`) o sustituir. Los borrados se registran por
id (`deletions.ts`, esquema de copia 4) y las ediciones llevan fecha
(`editedAt`, `notesUpdatedAt`), así que la fusión ya está lista para
una sincronización automática.

Recomendación: 1) hecho; 2) después,
Google Drive (`drive.appdata`) como sincronización opcional y
explícita, sin cambiar la promesa de "todo en tu dispositivo" para
quien no la active. Fuentes: [ámbitos de Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth),
[soporte de showDirectoryPicker](https://caniuse.com/mdn-api_window_showdirectorypicker),
[límites de desarrollo de Dropbox](https://www.dropboxforum.com/discussions/101000014/does-a-dropbox-app-have-a-limit-on-development-users/846671).

## 10. Otras ideas (P3)

- **Notas fijas por aventura — HECHO (2026-11-06)**, como una sola nota
  con casillas, dentro del cuaderno de la aventura (ver "Hecho
  recientemente"). Lo que se planteó:
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
- **"En el capítulo anterior…" — descartado (2026-11-06).** El cuaderno
  (notas, personajes, lugares, hilos y relojes) ya cumple esa función.
- Exportar a HTML legible — HECHO (2026-11-06). Para PDF basta imprimir
  ese HTML desde el navegador (tiene estilos de impresión).
- Probabilidad del oráculo — HECHO (2026-11-09): tabla exacta en la
  ayuda de cada oráculo.
- Escenas y factor de caos (estilo Mythic) como add-on opcional. Una
  tirada de arranque de escena (transcurre / cambia / se interrumpe)
  quedó en pausa el 2026-11-06: de momento se resuelve con tablas.
- Baraja de cartas (póker/tarot, sacar sin reponer, por aventura) como
  herramienta de la mesa de juego — aplazada el 2026-11-07. *The
  Oracle* (jamessral, cartas) sería un oráculo aparte (punto 5).
- Tablas sin repetición (casilla en las tablas propias, lo que ha
  salido por aventura, "Barajar") — aplazada el 2026-11-07: no
  convence de momento. Comparte mecanismo con la baraja.
- Más idiomas si la comunidad lo pide (el sistema de diccionarios ya lo
  permite).
