import type { Locale } from "./i18n";

/**
 * In-app changelog (Settings → About), written for curious players,
 * not developers: role-playing flavour, no technical jargon. Newest
 * first.
 *
 * It's content, not UI strings, so it lives here and not in the
 * dictionaries — but it's still bilingual: every entry must have both
 * languages (TypeScript complains if one is missing).
 */

export interface ChangelogEntry {
  /**
   * The version this chapter is (semver; also a git tag, "v1.0.0", and
   * a GitHub release). The newest must match package.json (a test
   * checks it). Chapters are minor versions; a chapter of small
   * touches, a patch.
   */
  version: string;
  /** ISO date (YYYY-MM-DD) of the release: its tagged commit's day. */
  date: string;
  text: Record<Locale, { title: string; intro?: string; items: string[] }>;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.11.3",
    date: "2026-11-27",
    text: {
      es: {
        title: "Capítulo XXVIII, al margen · Quién comparte la libreta",
        items: [
          "La tarjeta de sincronización dice con cuántos dispositivos compartes el código, cómo se llaman y cuándo se supo de cada uno. El nombre de este lo cambias ahí mismo, y viaja cifrado como todo lo demás.",
          "En la cabecera, la nube de la sincronización va junto a Ajustes, y el café de invitar queda aparte.",
        ],
      },
      en: {
        title: "Chapter XXVIII, in the margin · Who shares the notebook",
        items: [
          "The sync card says how many devices share your code, their names and when each was last heard of. You rename this one right there, and the name travels encrypted like everything else.",
          "In the header, the sync's cloud sits beside Settings, and the coffee to buy me one stands apart.",
        ],
      },
    },
  },
  {
    version: "1.11.2",
    date: "2026-11-27",
    text: {
      es: {
        title: "Capítulo XXVIII, al margen · Menos idas y venidas",
        items: [
          "La sincronización pide aún menos al servicio gratuito que compartimos todos: en una partida larga envía la mitad de veces (al salir de la app ya se envía en el acto), y si llevas semanas con un solo dispositivo no pregunta cada vez que vuelves de otra app. Lo automático sigue igual.",
          "Arreglos pequeños: cambiar el código justo al salir de la app ya no puede dejar el dispositivo sin sincronizar, y una respuesta que tardó en llegar (con la app en segundo plano) ya no hace creer que la hora del dispositivo va mal.",
          "Con lector de pantalla, la aventura activa de la cabecera se oye por su nombre, como se ve.",
        ],
      },
      en: {
        title: "Chapter XXVIII, in the margin · Fewer comings and goings",
        items: [
          "The sync asks even less of the free service we all share: in a long session it sends half as often (leaving the app sends at once anyway), and if you've used a single device for weeks it doesn't ask each time you come back from another app. What's automatic stays the same.",
          "Small fixes: changing the code just as you leave the app can no longer leave the device unsynced, and an answer that took long to arrive (with the app in the background) no longer makes it look as if the device's clock were off.",
          "With a screen reader, the header's active adventure is read out by its name, as it shows.",
        ],
      },
    },
  },
  {
    version: "1.11.1",
    date: "2026-11-27",
    text: {
      es: {
        title: "Capítulo XXVIII, al margen · Sin tener que pedirlo",
        items: [
          "Al abrir la app, la sincronización mira siempre si hay algo nuevo de tus otros dispositivos, y también al volver a ella tras medio minuto en otra app o ventana (o, en el ordenador, al primer clic tras unos minutos sin tocarlo).",
          "Al salir de la app o cerrar la pestaña, lo que escribiste se envía en el acto: queda preparado y cifrado un momento después de cada cambio, así que ya no hace falta «Sincronizar ahora» antes de irte.",
        ],
      },
      en: {
        title: "Chapter XXVIII, in the margin · Without asking",
        items: [
          "Opening the app, the sync always looks for anything new from your other devices, and also when you come back to it after half a minute in another app or window (or, on a computer, on the first click after a few minutes without touching it).",
          "Leaving the app or closing the tab, what you wrote is sent at once: it's prepared and sealed a moment after each change, so there's no need for “Sync now” before you go.",
        ],
      },
    },
  },
  {
    version: "1.11.0",
    date: "2026-11-27",
    text: {
      es: {
        title: "Capítulo XXVIII · Dos libretas, una historia",
        intro: "Mara escribe en la libreta del barco y, al volver al faro, la de la mesa ya cuenta lo mismo.",
        items: [
          "Sincronizar dispositivos (Ajustes → Tus datos): el mismo diario en el móvil y en el ordenador, al día sin hacer nada. Sin cuenta: un código une tus dispositivos, con un QR que el otro escanea con «Escanear el QR», desde la propia app.",
          "Una nube junto a Ajustes dice de un vistazo cómo va: al día, enviando, con cambios por enviar, sin conexión o en pausa, o si hay algo que mirar.",
          "Todo viaja cifrado en tu dispositivo con una llave que sale del código: ni el servidor que lo guarda puede leerlo.",
          "Se sincroniza al abrir la app, al volver a ella y unos minutos después de cada cambio. Si el servicio no responde o se agota su cupo gratuito del día, se pone en pausa, lo dice, y vuelve sola; mientras, puedes pasar tus cambios a mano con «Enviar».",
          "Avisa si la hora del dispositivo va desajustada, pregunta antes de juntar un dispositivo que lleva casi un año sin sincronizar, y deja cambiar el código o borrar la copia del servidor.",
          "«Cómo funciona, seguridad y privacidad», en la propia tarjeta y en Acerca de, lo cuenta todo: cómo se activa, qué viaja y qué no, cómo se protege y qué guarda el servidor (nada que diga quién eres).",
          "Sincronizar no es una copia de seguridad (un borrado también viaja): sigue exportando una copia de vez en cuando.",
        ],
      },
      en: {
        title: "Chapter XXVIII · Two notebooks, one story",
        intro: "Mara writes in the ship's notebook and, back at the lighthouse, the one on the table already tells the same.",
        items: [
          "Sync your devices (Settings → Your data): the same journal on your phone and your computer, kept up to date by itself. No account: a code links your devices, with a QR code the other one scans with “Scan the QR code”, inside the app.",
          "A cloud beside Settings tells you at a glance how it's going: up to date, sending, changes to send, offline or paused, or something to look at.",
          "Everything travels encrypted on your device with a key that comes from the code: not even the server that keeps it can read it.",
          "It syncs when you open the app, when you come back to it and a few minutes after each change. If the service doesn't answer or its free daily allowance runs out, it pauses, says so, and comes back by itself; meanwhile, you can carry your changes over by hand with “Send”.",
          "It warns you if the device's clock is off, asks before merging a device that hasn't synced for almost a year, and lets you change the code or delete the server's copy.",
          "“How it works, security and privacy”, on the card itself and in About, tells it all: how to turn it on, what travels and what doesn't, how it's protected and what the server keeps (nothing that says who you are).",
          "Syncing isn't a backup (a deletion travels too): keep exporting a backup now and then.",
        ],
      },
    },
  },
  {
    version: "1.10.0",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXVII · El relato en limpio",
        intro: "Mara pasa a limpio la historia del faro: solo lo que ocurrió, sin dados ni preguntas, para leérsela a quien quiera escucharla.",
        items: [
          "En el modo zen, «Exportar el relato» guarda una página web con solo lo que se cuenta, junto a las notas fijas y quién y dónde aparece.",
          "La barra del modo zen aclara que las consecuencias sí se quedan: lo que respondió el oráculo se entiende si lo cuentas en ellas.",
          "La app descarga un 13 % menos al abrirse por primera vez: la ayuda, la guía rápida, la aventura de ejemplo y los iconos de otras pantallas llegan después, sin que se note.",
          "«Sustituir todo» al restaurar una copia pregunta otra vez antes de borrar nada, porque no se puede deshacer.",
          "Un archivo que llega compartido avisa de que, si no lo has compartido tú, lo cierres sin importar nada.",
          "La app solo ejecuta su propio código: aunque algún día un texto se colara como si fuera código, no podría hacer nada ni mandar nada fuera de tu dispositivo.",
        ],
      },
      en: {
        title: "Chapter XXVII · The story, written up",
        intro: "Mara writes up the lighthouse story: only what happened, without dice or questions, to read it to whoever wants to listen.",
        items: [
          "In zen mode, “Export the story” saves a web page with only what's told, beside the pinned notes and who and where appear.",
          "The zen mode bar makes it clear that consequences stay: what the oracle answered reads well if you tell it in them.",
          "The app downloads 13% less the first time it opens: the help, the quick guide, the sample adventure and the icons of other screens arrive afterwards, unnoticed.",
          "“Replace everything”, when restoring a backup, asks again before deleting anything, since it can't be undone.",
          "A file that arrives shared reminds you to close it without importing anything if you didn't share it yourself.",
          "The app only runs its own code: even if some text ever slipped in as code, it couldn't do anything or send anything off your device.",
        ],
      },
    },
  },
  {
    version: "1.9.1",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXVI, al margen · Lo que se comparte",
        items: [
          "En Android, Solo Compass sale en «Compartir» también con los diarios .md y las copias de seguridad, que el móvil suele tratar como archivos de tipo desconocido. Si aún no aparece, abre la app instalada: el móvil tarda hasta un día en renovarla.",
        ],
      },
      en: {
        title: "Chapter XXVI, in the margin · What can be shared",
        items: [
          "On Android, Solo Compass shows up in “Share” for .md journals and backups too, which the phone often takes for files of an unknown type. If it isn't there yet, open the installed app: the phone takes up to a day to renew it.",
        ],
      },
    },
  },
  {
    version: "1.9.0",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXVI · El segundo libro",
        intro: "Mara cierra el primer cuaderno con la tormenta aún a medias. Abre otro en blanco, pero Odile, el faro y el reloj de la tormenta siguen ahí, tal como los dejó.",
        items: [
          "«Continuar en una aventura nueva», en el menú ⋯ de una aventura: empieza un diario en blanco y se lleva el cuaderno tal como está (notas fijas, personajes, lugares, hilos, relojes, inventario y descripciones), además del oráculo y la mesa de juego. La aventura de antes no cambia.",
          "Modo zen, en el mismo menú (o con la tecla Z en el ordenador): el diario se lee como un relato, sin preguntas, tiradas ni apuntes del cuaderno, y sin la mesa de juego a la vista.",
          "En Tablas, «Buscar también en los resultados» encuentra la tabla que tenía aquel faro, con el resultado resaltado debajo. Viene apagado, para que buscar por nombre siga siendo igual de limpio.",
          "Las estadísticas de una aventura dicen cuánto tiempo has jugado, más o menos, y cuánto dura cada sesión. Es aproximado: sale de la hora de lo que escribes en la app, sin contar las pausas largas.",
          "Para abrir un diario, una tabla o una copia de seguridad, en el ordenador basta con soltar el archivo encima de la app. Con la app instalada, también sale en «Abrir con» del ordenador y en «Compartir» de Android. Antes de guardar nada, la app dice qué es y pregunta.",
          "La app ya no abre lo que no es suyo, y dice por qué: un archivo que no es de texto, uno demasiado grande o una copia hecha con una versión más nueva (primero hay que actualizar). Una tabla con un dado desmesurado o una línea interminable ya no pueden dejarla colgada.",
          "El matiz de una respuesta del oráculo («…pero», «…y además») se lee mejor en el tema OSR oscuro, y quien usa lector de pantalla oye el nombre del oráculo al ir a cambiarlo.",
        ],
      },
      en: {
        title: "Chapter XXVI · The second book",
        intro: "Mara closes the first notebook with the storm still half-way. She opens a blank one, but Odile, the lighthouse and the storm's clock are all there, just as she left them.",
        items: [
          "“Carry on in a new adventure”, in an adventure's ⋯ menu: it starts a blank journal and takes the notebook as it is (pinned notes, characters, places, threads, clocks, inventory and descriptions), as well as the oracle and the game table. The adventure before stays as it was.",
          "Zen mode, in the same menu (or the Z key on a computer): the journal reads as a story, without questions, rolls or the notebook's bookkeeping, and without the game table in sight.",
          "In Tables, “Search the results too” finds the table that had that lighthouse, with the result highlighted below it. It's off to begin with, so searching by name stays as tidy as ever.",
          "An adventure's statistics say roughly how long you've played, and how long each session lasts. It's an estimate: it comes from when you write in the app, leaving out long pauses.",
          "To open a journal, a table or a backup on a computer, just drop the file on the app. With the app installed, it's also in the computer's “Open with” and in Android's “Share”. Before keeping anything, the app says what it is and asks.",
          "The app no longer opens what isn't its own, and says why: a file that isn't text, one that's too big, or a backup made with a newer version (update first). A table with an outlandish die or an endless line can no longer freeze it.",
          "The shade of an oracle answer (“…but”, “…and”) reads better in the dark OSR theme, and screen reader users hear the oracle's name when they go to change it.",
        ],
      },
    },
  },
  {
    version: "1.8.1",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXV, al margen · De quién es cada cosa",
        items: [
          "En la mesa de juego, junto al oráculo, los dados y las tablas pone de dónde salen: «Tus favoritos» o «De esta aventura». En la pantalla del Oráculo, si es el de la aventura activa.",
          "Al elegir oráculo, dados o tablas para una aventura, la ventana lo explica igual en los tres: qué cambia, que tus otras aventuras no, y cómo volver a tus favoritos.",
          "La guía rápida tiene una parte nueva: la mesa de juego de cada aventura.",
          "Las notas fijas y las descripciones del cuaderno admiten formato, como en Markdown: negrita entre dobles asteriscos, cursiva, tachado, títulos, listas numeradas, citas, separadores y enlaces que se abren con un toque. En la página web exportada se ven igual.",
        ],
      },
      en: {
        title: "Chapter XXV, in the margin · Whose is what",
        items: [
          "On the game table, beside the oracle, the dice and the tables, it says where they come from: “Your favorites” or “This adventure's”. On the Oracle screen, whether it's the active adventure's.",
          "When picking an oracle, dice or tables for an adventure, the window explains it the same way in all three: what changes, that your other adventures don't, and how to go back to your favorites.",
          "The quick guide has a new part: each adventure's game table.",
          "The notebook's pinned notes and descriptions take formatting, as in Markdown: bold between double asterisks, italic, strikethrough, headings, numbered lists, quotes, dividers and links that open with a tap. The exported web page shows them the same.",
        ],
      },
    },
  },
  {
    version: "1.8.0",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXV · Lo que hay en cada mesa",
        intro: "En la mesa de Ironsworn, los d10 y las tablas de asentamientos; en la del castillo, el d20 y los nombres de nobles. Mara ya no recoge los dados al cambiar de partida.",
        items: [
          "Cada aventura tiene sus dados y sus tablas a mano en la mesa de juego: «Elegir dados» y «Elegir tablas» abren la lista para quitar y poner los que quieras.",
          "Mientras no elijas nada, salen tus favoritos de siempre, como hasta ahora. En cuanto cambias uno, son solo de esa aventura; «Volver a mis favoritos» lo deshace.",
          "Un dado que guardas desde la mesa de juego de una aventura sale también en ella.",
          "Lo que eliges para cada aventura viaja en la copia de seguridad.",
        ],
      },
      en: {
        title: "Chapter XXV · What's on each table",
        intro: "On the Ironsworn table, the d10s and the settlement tables; on the castle's, the d20 and the nobles' names. Mara no longer packs the dice away when she switches games.",
        items: [
          "Each adventure keeps its own dice and tables at hand on the game table: “Pick dice” and “Pick tables” open the list to take out and put in whichever you like.",
          "Until you pick anything, your usual favorites are there, as before. As soon as you change one, they're that adventure's own; “Back to my favorites” undoes it.",
          "A die you save from an adventure's game table is on that table too.",
          "What you pick for each adventure travels in the backup.",
        ],
      },
    },
  },
  {
    version: "1.7.0",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXIV · Cada mesa con su oráculo",
        intro: "Mara lleva dos campañas a la vez y ya no cambia de oráculo cada vez que pasa de una a otra: cada cuaderno guarda el suyo entre las páginas.",
        items: [
          "Cada aventura recuerda su oráculo: el último que elegiste o usaste en ella. Entras en tu campaña de Ironsworn y está Ironsworn; en la otra, el suyo.",
          "La pantalla del Oráculo usa el de la aventura activa, y al cambiarlo allí cambias el de esa aventura. Al elegir, la ventana te dice para qué aventura es.",
          "La estrella marca tu oráculo de siempre: con él empieza cada aventura nueva, y con él se abre el Oráculo sin aventura activa.",
          "El oráculo de cada aventura viaja en la copia de seguridad; al juntar copias, gana el último que elegiste.",
        ],
      },
      en: {
        title: "Chapter XXIV · Each table its oracle",
        intro: "Mara plays two campaigns at once and no longer switches oracles every time she moves between them: each notebook keeps its own between the pages.",
        items: [
          "Each adventure remembers its oracle: the last one you picked or used in it. Open your Ironsworn campaign and Ironsworn is there; in the other one, its own.",
          "The Oracle screen uses the active adventure's, and changing it there changes that adventure's. When you pick, the window says which adventure it's for.",
          "The star marks your usual oracle: every new adventure starts with it, and the Oracle opens with it when no adventure is active.",
          "Each adventure's oracle travels in the backup; when merging copies, the one picked last wins.",
        ],
      },
    },
  },
  {
    version: "1.6.3",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXIII, al margen · Los dados que no contaban",
        items: [
          "El diario apunta y dibuja todos los dados del oráculo: con una pregunta probable o improbable se ven los tres o cuatro que se tiraron, y los que no cuentan, atenuados. Las tiradas ya apuntadas guardan solo el dado que contaba.",
          "Al escribir una pregunta en la casilla del diario ves con qué probabilidad irá al oráculo, y la cambias con un toque. También se puede preguntar desde «Consecuencia».",
          "Activar una aventura dice qué significa: lo que tires en Oráculo, Tablas y Dados se apuntará en ella.",
          "En la tableta en vertical las pantallas usan todo el ancho, y los botones del oráculo, los dados y las tablas del diario llevan su nombre.",
          "La aventura de ejemplo tira todos los dados que pide cada pregunta.",
        ],
      },
      en: {
        title: "Chapter XXIII, in the margin · The dice that didn't count",
        items: [
          "The journal logs and draws every one of the oracle's dice: with a likely or unlikely question you see the three or four thrown, and the ones that don't count, faded. Rolls already logged keep only the die that counted.",
          "Typing a question in the journal's box shows the likelihood it'll go to the oracle with, and one tap changes it. You can ask from “Consequence” too.",
          "Activating an adventure says what it means: what you roll on Oracle, Tables and Dice will be logged in it.",
          "On a tablet held upright the screens use the whole width, and the journal's oracle, dice and tables buttons carry their names.",
          "The sample adventure throws every die each question asks for.",
        ],
      },
    },
  },
  {
    version: "1.6.2",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXIII, al margen · Letra pequeña",
        items: [
          "El dado de una lista del cuaderno dice de dónde saca: entre los PNJ (los PJ no entran), los lugares o los hilos abiertos. Y en el diario se apunta así: «PNJ d3=2 → Odile».",
          "Los textos que salen al pasar el ratón dicen la verdad: que la aventura activa recoge lo que tiras en Oráculo, Tablas y Dados, adónde va cada estrella, que la fórmula se tira a la bandeja o que el − de un mazo es una carta menos.",
          "Los botones que solo tienen un icono explican qué hacen al pasar el ratón: el lápiz y la papelera, las estrellas, las X de cerrar…",
        ],
      },
      en: {
        title: "Chapter XXIII, in the margin · The small print",
        items: [
          "A notebook list's die says what it picks from: the NPCs (PCs aren't in it), the places or the open threads. And the journal logs it that way: “NPCs d3=2 → Odile”.",
          "The text that shows when you hover tells the truth: that the active adventure gathers what you roll on Oracle, Tables and Dice, where each star sends things, that a formula rolls into the tray or that a deck's − is one card fewer.",
          "Buttons that are only an icon say what they do when you hover: the pencil and the bin, the stars, the close Xs…",
        ],
      },
    },
  },
  {
    version: "1.6.1",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXIII, al margen · El punto de lectura",
        items: [
          "En el móvil, la fila de arriba de los Ajustes marca la parte que estás leyendo, también al bajar con el dedo.",
        ],
      },
      en: {
        title: "Chapter XXIII, in the margin · The bookmark",
        items: [
          "On phones, the row at the top of Settings marks the part you're reading, as you scroll too.",
        ],
      },
    },
  },
  {
    version: "1.6.0",
    date: "2026-11-26",
    text: {
      es: {
        title: "Capítulo XXIII · Cada cosa a mano",
        intro: "Mara despeja la mesa: el cuaderno junto al mapa, los dados al alcance del pulgar, y el diario abierto por la última página.",
        items: [
          "Una aventura se abre donde la dejaste: por la última entrada, con la casilla para escribir justo debajo. La de ejemplo, que es para leerla, se sigue abriendo por el principio.",
          "En el móvil y la tableta, la barra de la aventura se queda arriba mientras lees: volver, buscar, las sesiones, el cuaderno y el menú (⋯), donde ahora también están los Ajustes. Así la barra de abajo deja más sitio para escribir.",
          "El diario se lee como un diario: lo que cuentas va sin recuadro y las tiradas, en su tarjeta.",
          "Una pregunta y su respuesta ya no se cambian de orden al volver a abrir el diario ni al exportarlo. Las que ya se habían cambiado vuelven a su sitio solas.",
          "En el móvil, elegir una sesión en su menú lleva por fin hasta ella.",
          "Los dados van primero, grandes y con su forma, y «Apuntar» se queda a la vista mientras haya tiradas esperando. Los favoritos de la mesa de juego están en «En tu mesa de juego».",
          "Las tablas son una lista: las tuyas y las colecciones de cada juego, en filas compactas que dicen su dado. El nombre de una colección abierta te acompaña al bajar, para plegarla sin volver arriba. Y el título es ahora «Tablas», a secas.",
          "La lista de aventuras tiene «Nueva aventura» arriba, siempre a la vista, y solo marca la activa.",
          "El historial enseña antes las tiradas, y en el móvil los Ajustes llevan de un toque a cada parte.",
          "Botones más grandes para el dedo en toda la app. Con el móvil en horizontal se ve más diario.",
          "En las pantallas grandes cada pantalla gana una columna, sin alargar las líneas; en una ultrapanorámica, el cuaderno tiene la suya.",
        ],
      },
      en: {
        title: "Chapter XXIII · Everything within reach",
        intro: "Mara clears the table: the notebook beside the map, the dice by her thumb, and the journal open at the last page.",
        items: [
          "An adventure opens where you left it: at the last entry, with the box to write in right below. The sample, which is there to be read, still opens at the beginning.",
          "On phone and tablet, the adventure's bar stays at the top as you read: back, search, sessions, the notebook and the menu (⋯), where Settings now are too. That leaves the bottom bar more room to write.",
          "The journal reads like a journal: what you tell goes without a frame, and rolls in their card.",
          "A question and its answer no longer swap places when you open the journal again or export it. Those that had swapped go back by themselves.",
          "On phones, picking a session from its menu finally takes you there.",
          "The dice come first, large and in their shape, and “Log it” stays in sight while rolls are waiting. The game table's favourites are under “On your game table”.",
          "Tables are a list: yours and each game's collections, in compact rows that name their die. An open collection's name follows you down, to fold it without going back up. And the title is now simply “Tables”.",
          "The list of adventures has “New adventure” at the top, always in sight, and only marks the active one.",
          "The history shows the rolls sooner, and on phones Settings take you to each part in one tap.",
          "Bigger buttons for your finger across the app. With the phone sideways, more of the journal shows.",
          "On large screens each screen gains a column, without longer lines; on an ultrawide, the notebook has its own.",
        ],
      },
    },
  },
  {
    version: "1.5.2",
    date: "2026-11-25",
    text: {
      es: {
        title: "Capítulo XXII, al margen · El escritorio despejado",
        items: [
          "En el móvil, la barra de abajo del diario se queda con lo justo: «Tirar», que abre el oráculo, los dados y las tablas por donde los dejaste, la casilla para escribir y el cuaderno.",
          "El botón de enviar aparece cuando hay algo que enviar.",
        ],
      },
      en: {
        title: "Chapter XXII, in the margin · The cleared desk",
        items: [
          "On phones, the journal's bottom bar keeps only what's needed: “Roll”, which opens the oracle, dice and tables where you left them, the box to write in and the notebook.",
          "The send button shows once there's something to send.",
        ],
      },
    },
  },
  {
    version: "1.5.1",
    date: "2026-11-25",
    text: {
      es: {
        title: "Capítulo XXII, al margen · Notas del corrector",
        items: [
          "El cuaderno dice todo lo que puedes añadir: un botón para cada cosa, también salas, enemigos, progresos, cuentas atrás, sucesos y mazos.",
          "Las palabras de los complementos se leen en tu idioma: owner es dueño, where es lugar y pos es posición. Puedes escribirlas en cualquiera de los dos.",
          "Tocar «Tú» en un diálogo abre a tu personaje en el cuaderno aunque lleves a varios: el primero del diario, o quien viva esa trama.",
          "El oráculo se apunta con dos puntos, «Recluse: blanco 5 / negro 2», en lugar de la raya. Las tiradas antiguas se ponen al día solas.",
          "El cuaderno está siempre a mano en móvil y tableta: su botón pasa junto a los dados, abajo, por largo que sea el diario.",
          "La lista de aventuras avisa de que todo está solo en tu navegador, sin nube ni copias automáticas, con un botón para exportarlo todo.",
          "La aventura de ejemplo se ha repasado entera: el combate, las tiradas con su veredicto, las correcciones, las tramas y los recursos, como pide Lonelog.",
        ],
      },
      en: {
        title: "Chapter XXII, in the margin · The proofreader's notes",
        items: [
          "The notebook says everything you can add: a button for each thing, rooms, foes, tracks, timers, events and decks too.",
          "The add-ons' words read in your language (owner, where, pos…), and you can write them in English or in Spanish.",
          "Tapping “You” in a dialogue opens your character in the notebook even with several: the journal's first, or whoever lives that storyline.",
          "The oracle is logged with a colon, “Recluse: white 5 / black 2”, instead of a dash. Old rolls are brought up to date by themselves.",
          "The notebook is always in reach on phone and tablet: its button is now beside the dice, at the bottom, however long the journal.",
          "The list of adventures warns that everything is only in your browser, with no cloud or automatic backup, and has a button to export it all.",
          "The sample adventure has been gone over in full: the fight, rolls with their verdict, corrections, storylines and resources, as Lonelog asks.",
        ],
      },
    },
  },
  {
    version: "1.5.0",
    date: "2026-11-25",
    text: {
      es: {
        title: "Capítulo XXII · La gramática de los cronistas",
        intro: "El gremio de cronistas ha puesto en limpio su notación, y Mara repasa su diario a la luz del candil. Nada de lo ya escrito cambia.",
        items: [
          "El diario habla Lonelog 1.7 y sus complementos. Lo que escribiste con versiones anteriores se sigue leyendo igual.",
          "Al editar, copiar o exportar, tus tiradas salen como pide Lonelog (2d6+3[4, 2]=9) y las cartas e «Inspírame», como contenido (tbl:). Al volver a importarlas, regresan tal cual.",
          "La pregunta al oráculo guarda en el diario lo probable que era: «¿Aguanta la cuerda? (Probable)».",
          "Importar entiende la forma compacta, con toda la jugada en una línea, y las respuestas abreviadas (Yb es «Sí, pero»).",
          "El cuaderno gana los sucesos, [E:Cae el puente], para reencontrar los giros de la historia, y los mazos, [Deck:Principal|×52].",
          "Cada bolsa tiene dueño: [Wealth:Mara|Plata 9]. El dinero que ya tenías se queda donde estaba.",
          "Un estado que solo puede ser uno a la vez se escribe con su nombre (ánimo:contenta) y sustituye al anterior; los objetos se cuentan con ×3 y ×-1.",
          "Si llevas a varios personajes, el diálogo dice cuál habla, y cada trama paralela, quién la vive: su nombre va en cada acción.",
          "Una tabla escrita en el diario se guarda en tus tablas con un botón.",
          "La guía dice qué se usa de Lonelog y qué queda aparte (Partylog, Lorelog, Maplog y las batallas).",
          "La aventura de ejemplo se ha reescrito como guía de uso: enseña todo lo que cabe en un diario y lo explica sobre la marcha.",
          "Cambiar el nombre de un personaje llega también a su bolsa y a lo que hace junto a otros.",
        ],
      },
      en: {
        title: "Chapter XXII · The chroniclers' grammar",
        intro: "The chroniclers' guild has written its notation out fair, and Mara goes over the journal by lamplight. Nothing already written changes.",
        items: [
          "The journal speaks Lonelog 1.7 and its add-ons. What you wrote with earlier versions still reads the same.",
          "Edited, copied or exported, your rolls come out the way Lonelog asks (2d6+3[4, 2]=9), and cards and quick inspiration as content (tbl:). Imported again, they come back as they were.",
          "A question to the oracle keeps in the journal how likely it was: “Does the rope hold? (Likely)”.",
          "Importing understands the compact form, with a whole play on one line, and shortened answers (Yb is “Yes, but”).",
          "The notebook gains events, [E:The bridge falls], to find the story's turning points again, and decks, [Deck:Main|×52].",
          "Every purse has an owner: [Wealth:Mara|Silver 9]. The money you already had stays where it was.",
          "A state that can only be one at a time is written with its name (mood:happy) and replaces the one before; items are counted with ×3 and ×-1.",
          "If you play several characters, dialogue says which one speaks, and each parallel storyline, who lives it: their name is on every action.",
          "A table written out in the journal goes to your tables with a button.",
          "The guide says what's used of Lonelog and what's left apart (Partylog, Lorelog, Maplog and wargaming).",
          "The sample adventure has been rewritten as a guide: it shows everything a journal can hold and explains it along the way.",
          "Renaming a character also reaches their purse and what they do with others.",
        ],
      },
    },
  },
  {
    version: "1.4.0",
    date: "2026-11-25",
    text: {
      es: {
        title: "Capítulo XXI · Hueso y tinta negra",
        intro: "Mara cambia la capa de oro viejo por una negra y, ya puesta, pone en orden sus dados.",
        items: [
          "OSR es ahora la cara de Solo Compass: el icono y el tema de quien llega nuevo, en claro u oscuro según su dispositivo. Si ya jugabas, conservas el tuyo.",
          "En el diario, «La suerte de tus dados» junta los de todas tus aventuras y dice cuál ha sido la bendita y cuál la maldita.",
          "Las secciones de las estadísticas se pliegan, para ir al grano en el móvil.",
          "Un d66 escrito como fórmula son por fin dos d6, decenas y unidades. Si quieres un dado de 66 caras, escribe d(66): la ayuda de los dados lo cuenta.",
          "Las tiradas de un diario importado se reconocen mejor: las de tu sistema ya no pasan por tablas, y un sí o un no es del oráculo.",
          "El historial dice de qué aventura son las tiradas que miras.",
        ],
      },
      en: {
        title: "Chapter XXI · Bone and black ink",
        intro: "Mara trades the old gold cloak for a black one and, while at it, puts the dice in order.",
        items: [
          "OSR is now the face of Solo Compass: its icon, and the theme for whoever is new, light or dark as their device. If you already played, you keep yours.",
          "In the journal, “The luck of your dice” brings together those of all your adventures and says which was the blessed one and which the cursed.",
          "The statistics' sections fold, to get to the point on a phone.",
          "A d66 typed as a formula is at last two d6, tens and units. For a die of 66 sides, write d(66): the dice help tells you.",
          "An imported journal's rolls are told apart better: those of your system no longer pass for tables, and a yes or a no is the oracle's.",
          "The history says which adventure the rolls you're looking at are from.",
        ],
      },
    },
  },
  {
    version: "1.3.3",
    date: "2026-11-25",
    text: {
      es: {
        title: "Interludio · La línea del azar",
        items: [
          "En las gráficas de los dados, la línea del azar dice debajo qué es, y espera a tener dados suficientes para decir algo.",
          "Toca otra vez una barra elegida y la gráfica vuelve a estar como al principio.",
        ],
      },
      en: {
        title: "Interlude · The line of chance",
        items: [
          "On the dice charts, the line of chance says below what it is, and waits for dice enough to mean something.",
          "Tap a picked bar again and the chart goes back to how it was.",
        ],
      },
    },
  },
  {
    version: "1.3.2",
    date: "2026-11-25",
    text: {
      es: {
        title: "Interludio · Cinco dados bastan",
        items: ["En las estadísticas, cada tipo de dado enseña su gráfica desde que ha caído 5 veces: no hace falta una campaña entera para verla."],
      },
      en: {
        title: "Interlude · Five dice will do",
        items: ["In the statistics, each kind of die shows its chart once it has fallen 5 times: no need for a whole campaign to see it."],
      },
    },
  },
  {
    version: "1.3.1",
    date: "2026-11-25",
    text: {
      es: {
        title: "Interludio · La letra pequeña del azar",
        items: [
          "El recuadro del oráculo ya no crece ni encoge según lo que responda (salvo el giro de Loner, que pide su sitio).",
          "Las gráficas de las estadísticas tienen sus valores al lado, dicen qué es cada eje y, al tocar una barra o un día, cuentan el detalle.",
          "Cada tipo de dado estrena su gráfica cuando ha caído 20 veces, y se ve cuáles faltan. Los textos explican mejor qué tocaría por azar.",
        ],
      },
      en: {
        title: "Interlude · The fine print of chance",
        items: [
          "The oracle's card no longer grows or shrinks with its answer (save for Loner's twist, which asks for its room).",
          "The statistics' charts have their values beside them, say what each axis is and, tapping a bar or a day, tell the detail.",
          "Each kind of die gets its chart once it has fallen 20 times, and you can see which are still to come. The texts explain better what chance would give.",
        ],
      },
    },
  },
  {
    version: "1.3.0",
    date: "2026-11-25",
    text: {
      es: {
        title: "Capítulo XX · Lo que cuentan los dados",
        intro: "Entre viaje y viaje, Mara abre su cuaderno y se ríe: ya sabía ella que aquel d20 le tenía manía.",
        items: [
          "Las estadísticas de cada aventura miran la suerte de tus dados: si están benditos o malditos, sus rachas, sus golpes de gloria y de infortunio, tu número del destino y cómo se reparten las caras.",
          "También cuentan qué sesiones fueron más extensas, qué personajes y lugares se nombran más y si el oráculo ha sido generoso o tozudo con lo que le preguntaste.",
          "Al buscar en el diario puedes quedarte solo con un tipo de entrada: preguntas, diálogos, consecuencias…",
          "En la mesa de juego, la bandeja vacía ofrece tu última tirada para volver a hacerla con un toque.",
          "«Ver sus tiradas» de una aventura importada, o de la de ejemplo, ya no sale en blanco: muestra las de su diario.",
          "En el móvil, el menú de tipos de entrada cierra el teclado al abrirse y, si no cabe, se desplaza.",
        ],
      },
      en: {
        title: "Chapter XX · What the dice tell",
        intro: "Between journeys, Mara opens her notebook and laughs: she knew that d20 held a grudge.",
        items: [
          "Each adventure's statistics look at the luck of your dice: whether they're blessed or cursed, their runs, their strokes of glory and misfortune, your number of fate and how the faces fall.",
          "They also tell which sessions were the longest, which characters and places are named the most, and whether the oracle was generous or stubborn with what you asked.",
          "Searching the journal, you can keep to one kind of entry: questions, dialogue, consequences…",
          "On the game table, the empty tray offers your last roll, to make it again with one tap.",
          "The rolls of an imported adventure, or of the sample, no longer come up blank: they're read from its journal.",
          "On phones, the menu of entry types closes the keyboard when it opens and scrolls if it doesn't fit.",
        ],
      },
    },
  },
  {
    version: "1.2.0",
    date: "2026-11-25",
    text: {
      es: {
        title: "Capítulo XIX · La memoria de los dados",
        intro: "Mara descubre que sus dados lo recuerdan todo: basta con saber preguntarles.",
        items: [
          "Las tiradas en tablas también se dibujan, cada una con su dado (un d66 son dos d6): en el resultado, el diario, las últimas tiradas, el historial y la página exportada. También las de antes.",
          "El historial tiene buscador: encuentra aquella pregunta, aquella tabla o aquel resultado.",
          "¿Tiraste sin darte cuenta de que la aventura estaba en pausa? Desde el historial, «Apuntar» lleva esa tirada libre al diario que elijas.",
          "En la pestaña Dados, las últimas tiradas se repiten con un toque.",
          "En los móviles más estrechos, las tablas de nombre largo ya no se salen de la pantalla.",
        ],
      },
      en: {
        title: "Chapter XIX · The memory of dice",
        intro: "Mara finds out her dice remember everything: you only have to know how to ask.",
        items: [
          "Table rolls are drawn too, each with its die (a d66 is two d6): in the result, the journal, the latest rolls, the history and the exported page. Earlier ones as well.",
          "The history has a search: find that question, that table or that result.",
          "Rolled without noticing the adventure was paused? From the history, “Log it” takes that free roll to the journal you pick.",
          "On the Dice tab, the latest rolls can be made again with one tap.",
          "On the narrowest phones, tables with long names no longer run off the screen.",
        ],
      },
    },
  },
  {
    version: "1.1.3",
    date: "2026-11-24",
    text: {
      es: {
        title: "Interludio · Tinta fresca",
        intro: "Mara apunta cada tirada antes de que los dados dejen de rodar.",
        items: [
          "Las últimas tiradas del oráculo enseñan sus dados junto a la respuesta, y las de las tablas, el número que salió.",
          "Lo que acabas de tirar en el oráculo o en las tablas entra en la lista al momento.",
        ],
      },
      en: {
        title: "Interlude · Fresh ink",
        intro: "Mara writes each roll down before the dice stop rolling.",
        items: [
          "The oracle's latest rolls show their dice beside the answer, and the tables', the number rolled.",
          "What you've just rolled on the oracle or the tables joins the list at once.",
        ],
      },
    },
  },
  {
    version: "1.1.2",
    date: "2026-11-24",
    text: {
      es: {
        title: "Interludio · Cada voz con su eco",
        intro: "Mara separa las notas: lo que dijo el oráculo, con el oráculo.",
        items: [
          "Las últimas tiradas del oráculo son ya solo las suyas, como en las tablas y los dados, y «Ver historial» abre el historial por ellas. Con «Todo» lo ves entero.",
        ],
      },
      en: {
        title: "Interlude · Each voice, its echo",
        intro: "Mara sorts her notes: what the oracle said, with the oracle.",
        items: [
          "The oracle's latest rolls are now only its own, as in the tables and the dice, and “View history” opens the history on them. Its “All” filter shows everything.",
        ],
      },
    },
  },
  {
    version: "1.1.1",
    date: "2026-11-24",
    text: {
      es: {
        title: "Interludio · Cada tirada en su sitio",
        intro: "Mara ordena la mesa: cada tirada, en su recuadro.",
        items: [
          "En el diario, todas las tiradas de dados y cartas van en su recuadro, también cuando es una sola: arriba lo que tiras, en grande el resultado y, debajo, cómo sale. Igual en la página web de la aventura.",
          "En el historial, el resultado también se lee de un vistazo, con las cuentas en pequeño.",
          "Una tirada con muchos dados ya no se sale de la pantalla del móvil.",
        ],
      },
      en: {
        title: "Interlude · Every roll in its place",
        intro: "Mara tidies the table: every roll in its own box.",
        items: [
          "In the journal, every roll of dice and cards has its own box, a lone one too: what you roll above, the result large and, below, how it adds up. The adventure's web page does the same.",
          "In the history, the result reads at a glance too, with the sums small.",
          "A roll with many dice no longer runs off a phone's screen.",
        ],
      },
    },
  },
  {
    version: "1.1.0",
    date: "2026-11-24",
    text: {
      es: {
        title: "Capítulo XVIII · Dados y cartas sobre la mesa",
        intro: "Mara deja de leer nombres y vuelve a mirar lo que cae en la mesa.",
        items: [
          "Cada dado tiene ya su forma: el triángulo del d4, el rombo del d8, el d20 con sus caras… En el oráculo, en los dados, en el historial y en el diario, también en las tiradas que ya tenías. Los descartados se apagan y los éxitos, fallos y críticos llevan su marca.",
          "Las cartas que sacas se ven como cartas, en la bandeja, en las últimas tiradas, en el historial y en el diario: su número, su palo y, en el tarot, los arcanos mayores con su número romano y las invertidas boca abajo.",
          "El tarot puede jugarse solo con los arcanos mayores.",
          "La página web de una aventura lleva también sus dados y sus cartas dibujados.",
          "Retoques: la flecha de los desplegables ya no se pega al borde y, en el móvil, la barra de una sesión anterior ya no se sale por la derecha.",
        ],
      },
      en: {
        title: "Chapter XVIII · Dice and cards on the table",
        intro: "Mara stops reading names and looks again at what falls on the table.",
        items: [
          "Each die now has its own shape: the d4's triangle, the d8's diamond, the d20 with its faces… In the oracle, the dice, the history and the journal, the rolls you already had included. Dropped dice fade, and successes, failures and criticals carry their mark.",
          "The cards you draw look like cards, in the tray, in the latest rolls, in the history and in the journal: their rank, their suit and, in the tarot, the Major Arcana with their roman numeral and reversed cards upside down.",
          "The tarot can be played with the Major Arcana alone.",
          "An adventure's web page has its dice and cards drawn too.",
          "Touch-ups: the arrow of the drop-down lists no longer sticks to the edge and, on a phone, an earlier session's bar no longer runs off the right.",
        ],
      },
    },
  },
  {
    version: "1.0.5",
    date: "2026-11-12",
    text: {
      es: {
        title: "Interludio · Sacar brillo",
        intro: "Mara saca brillo a la brújula antes de volver al camino.",
        items: [
          "La carta del oráculo se tiñe con el color de su respuesta: se nota antes de leerla.",
          "Antes de preguntar, el oráculo enseña los dados que va a tirar, según el oráculo y la probabilidad elegidos.",
          "En el diario, las etiquetas largas (una sala con su estado y sus salidas) siguen el renglón en vez de partirlo con un bloque.",
          "En el móvil, el título de la aventura tiene su propia línea bajo los botones, y la lista de aventuras enseña el nombre entero, con sus entradas y la fecha del último cambio.",
          "Retoques: las ventanas se abren con un movimiento suave, el dado negro se distingue mejor sobre fondo oscuro, el título de una escena ya no pierde su última letra, la cabecera del historial respira y, en pantallas anchas, el índice y el cuaderno tienen más sitio.",
        ],
      },
      en: {
        title: "Interlude · A good polish",
        intro: "Mara polishes the compass before taking the road again.",
        items: [
          "The oracle's card takes the colour of its answer: you feel it before you read it.",
          "Before you ask, the oracle shows the dice it's about to throw, for the oracle and the likelihood picked.",
          "In the journal, long tags (a room with its status and exits) follow the line instead of breaking it with a block.",
          "On a phone, the adventure's title has its own line below the buttons, and the list of adventures shows the whole name, with its entries and the date of the last change.",
          "Touch-ups: dialogs open with a gentle movement, the black die stands out better on a dark background, a scene's title no longer loses its last letter, the history's heading has room to breathe and, on wide screens, the index and the notebook have more room.",
        ],
      },
    },
  },
  {
    version: "1.0.4",
    date: "2026-11-12",
    text: {
      es: {
        title: "Interludio · Atajos",
        intro: "Mara marca en su mapa los caminos más cortos.",
        items: [
          "Con la app instalada, deja pulsado su icono para ir directo al oráculo, las tablas, los dados o el diario.",
          "Si quitas la app de la pantalla de inicio, los ajustes ya no insisten en que sigue instalada allí donde el navegador puede saberlo; donde no, te dicen cómo volver a instalarla.",
        ],
      },
      en: {
        title: "Interlude · Shortcuts",
        intro: "Mara marks the shortest paths on her map.",
        items: [
          "With the app installed, long-press its icon to go straight to the oracle, the tables, the dice or the journal.",
          "If you remove the app from your home screen, Settings no longer insists it's still installed wherever the browser can tell; where it can't, it tells you how to install it again.",
        ],
      },
    },
  },
  {
    version: "1.0.3",
    date: "2026-11-12",
    text: {
      es: {
        title: "Interludio · Más allá del mapa",
        intro: "Mara descubre que los bordes del mapa también tienen camino de vuelta.",
        items: [
          "Buscar una entrada muy antigua en una sesión enorme ya no hace esperar: se abre al instante con lo que la rodea, y «Ver entradas posteriores» sigue leyendo desde ahí. Al escribir, vuelves al final.",
          "Una dirección que no lleva a ninguna pantalla muestra «Te has salido del mapa», con un camino de vuelta al oráculo y el formulario para contarnos si fue un enlace de la app.",
          "Si la app pifia, la pantalla de error ofrece ahora el formulario corto para contarlo, sin cuenta de GitHub (que sigue ahí para quien la tenga).",
        ],
      },
      en: {
        title: "Interlude · Beyond the map",
        intro: "Mara finds that even the edges of the map have a way back.",
        items: [
          "Searching for a very old entry in a huge session no longer makes you wait: it opens at once with what surrounds it, and “Show later entries” keeps reading from there. Writing takes you back to the end.",
          "An address that leads to no screen shows “You've wandered off the map”, with a way back to the oracle and the form to tell us if a link in the app took you there.",
          "If the app fumbles, the error screen now offers the short form to tell us, no GitHub account needed (it's still there for whoever has one).",
        ],
      },
    },
  },
  {
    version: "1.0.2",
    date: "2026-11-12",
    text: {
      es: {
        title: "Interludio · Marcha atrás",
        intro: "Mara aprende a desandar sus pasos sin perder el sitio, y a borrar lo escrito sin miedo.",
        items: [
          "En el móvil, ir atrás (el gesto o el botón) con una ventana o un menú abierto lo cierra y te deja donde estabas, en vez de cambiar la pantalla de detrás.",
          "Al editar una entrada o el título de una sesión aparece «Deshacer» un momento, por si te arrepientes: vuelve el texto que tenía. En el ordenador, también con Ctrl+Z.",
          "«Mantener la pantalla encendida» viene activado: mientras juegas con la app a la vista, el móvil no se bloquea entre tirada y tirada. Se puede apagar en Ajustes.",
        ],
      },
      en: {
        title: "Interlude · Retracing steps",
        intro: "Mara learns to retrace her steps without losing her place, and to rub out what she wrote without fear.",
        items: [
          "On phones, going back (the gesture or the button) with a window or a menu open closes it and leaves you where you were, instead of changing the screen behind it.",
          "Editing an entry or a session's title shows “Undo” for a moment, in case you change your mind: the text it had comes back. On a computer, Ctrl+Z works too.",
          "“Keep the screen on” now comes switched on: while you play with the app in view, the phone doesn't lock between rolls. It can be turned off in Settings.",
        ],
      },
    },
  },
  {
    version: "1.0.1",
    date: "2026-11-12",
    text: {
      es: {
        title: "Interludio · Un buzón en la posada",
        intro: "En la puerta de la posada cuelga ahora un buzón: quien pase puede dejar una nota.",
        items: [
          "Nuevo en Ajustes → Acerca de: «Ideas y errores», un formulario corto para contar qué falla, qué echas en falta o qué se te ha ocurrido. Se abre en tu idioma y solo lleva la versión de la app y tu navegador, nada de tu diario.",
        ],
      },
      en: {
        title: "Interlude · A letterbox at the inn",
        intro: "A letterbox now hangs by the inn's door: anyone passing by can leave a note.",
        items: [
          "New in Settings → About: “Ideas and bugs”, a short form to tell what's broken, what's missing or what you've thought of. It opens in your language and only carries the app's version and your browser, nothing from your journal.",
        ],
      },
    },
  },
  {
    version: "1.0.0",
    date: "2026-11-11",
    text: {
      es: {
        title: "Capítulo XVII · La vela que no se apaga",
        intro: "Mara aligera el equipaje, deja una vela encendida junto a los dados y, por fin, firma su diario con un número: el primero de verdad.",
        items: [
          "Nuevas tablas de Ironsmith, de Eric Bright: los oráculos de Ironsworn ampliados (acción, tema, lugares, personajes, problemas del asentamiento, nombres) y tablas propias para la corrupción, misiones, juramentos de misterio, partidas de una sola sesión y la caza de monstruos. En inglés y en español, en su propio bloque.",
          "Quien actúa o habla en el diario («@(Odile) …», «N (Odile): …») lleva a su ficha del cuaderno al tocar su nombre, como las etiquetas; con varios personajes («@(Elara > Jonah)», «@(Elara+Jonah)»), cada nombre lleva a la suya. Y al escribir «@(» o «N (» aparece la lista de personajes para elegir.",
          "Nuevo en Ajustes: «Mantener la pantalla encendida». Mientras juegas con la app a la vista, el móvil no se bloquea entre tirada y tirada (si tu navegador lo permite).",
          "La app abre antes la primera vez: solo descarga lo que necesita la pantalla que ves y el idioma que usas; lo demás llega en segundo plano, así que cambiar de pestaña sigue siendo inmediato.",
          "Los diarios muy largos van más ligeros: abrir una sesión con miles de entradas tarda la tercera parte, y al apuntar algo lejos de donde estabas la página salta a ello en vez de deslizarse un buen rato.",
          "Con un lector de pantalla: cada entrada dice qué es (acción, consecuencia, tirada…), las sesiones y escenas son encabezados para saltar entre ellas, las etiquetas dicen si son un PNJ, un lugar o una sala, y los dados se anuncian al tirarlos.",
          "Más fácil de leer en todos los temas: el dorado, el rojo y el morado de las respuestas tienen más contraste en el modo claro, y la «Contradicción» de OSR oscuro ya no se pierde en el negro.",
          "Si tu sistema pide reducir el movimiento, los dados ya no ruedan ni la página se desliza.",
          "Si alguna vez la app pifia, la pantalla del error te recuerda que tu diario sigue a salvo, te deja volver a tirar y copiar el pergamino del error para contárnoslo.",
          "En Ajustes → Acerca de: la versión de la app (esta es la 1.0.0, y cada capítulo de esta crónica lleva ya la suya), una nota que deja claro que todo se queda en tu navegador, y un enlace al código del proyecto en GitHub.",
          "El diario exportado escribe la acción de otro personaje como dice Lonelog, «@(Odile)», sin espacio.",
          "En «Últimas tiradas», una pregunta larga junto a «Contradicción» ya se lee: ocupa dos líneas en vez de cortarse.",
          "Al compartir el enlace de la app en un chat o una red social, aparece una tarjeta con el emblema y el oráculo en acción.",
        ],
      },
      en: {
        title: "Chapter XVII · The candle that stays lit",
        intro: "Mara travels lighter, leaves a candle burning beside the dice and, at last, signs her journal with a number: the first true one.",
        items: [
          "New tables from Ironsmith, by Eric Bright: Ironsworn's oracles expanded (action, theme, places, characters, settlement trouble, names) and tables of its own for corruption, quests, mystery vows, one-shots and monster hunting. In English and Spanish, in their own block.",
          "Whoever acts or speaks in the journal (“@(Odile) …”, “N (Odile): …”) opens their notebook entry when you tap their name, like tags do; with several characters (“@(Elara > Jonah)”, “@(Elara+Jonah)”), each name opens its own. And typing “@(” or “N (” brings up the list of characters to pick from.",
          "New in Settings: “Keep the screen on”. While you play with the app in view, your phone won't lock between rolls (if your browser allows it).",
          "The app opens sooner the first time: it only downloads what the screen you're on and your language need; the rest arrives in the background, so switching tabs is still instant.",
          "Very long journals are lighter: opening a session with thousands of entries takes a third of the time, and logging something far from where you were jumps to it instead of sliding for a while.",
          "With a screen reader: every entry says what it is (action, consequence, roll…), sessions and scenes are headings to jump between, tags say whether they're an NPC, a place or a room, and dice are announced as you roll them.",
          "Easier to read in every theme: the gold, red and purple of the answers have more contrast in light mode, and OSR's dark “Contradiction” no longer fades into the black.",
          "If your system asks for reduced motion, the dice no longer tumble and the page no longer slides.",
          "If the app ever fumbles, the error screen reminds you your journal is safe, lets you roll again and copy the error scroll to tell us about it.",
          "In Settings → About: the app's version (this is 1.0.0, and every chapter of this chronicle now carries its own), a note making clear everything stays in your browser, and a link to the project's code on GitHub.",
          "The exported journal writes another character's action the way Lonelog does, “@(Odile)”, with no space.",
          "In “Recent rolls”, a long question beside “Contradiction” can be read now: it takes two lines instead of being cut short.",
          "Share the app's link in a chat or on social media and a card shows up, with the emblem and the oracle at work.",
        ],
      },
    },
  },
  {
    version: "0.16.0",
    date: "2026-11-11",
    text: {
      es: {
        title: "Capítulo XVI · La bolsa de dados y la baraja",
        intro: "Mara ya no busca cada vez el dado que necesita: guarda en la bolsa las tiradas de siempre, lleva una baraja para los presagios y el diario a su ritmo.",
        items: [
          "Nueva pestaña «Dados»: los dados de serie, las fórmulas y tus propios dados, con un texto opcional que va delante en el diario (Atletismo 4dF+2, Ataque d20+5). Marca con la estrella tus dados favoritos, de serie o tuyos: son los que salen en la mesa de juego del diario. Una fórmula que escribas allí se guarda como dado con la estrella.",
          "Cartas en la mesa de juego: en los dados, cambia a «Cartas» y saca de una baraja de póker (con comodines si quieres) o de un tarot (con cartas invertidas). Sin repetir, cada carta sale una vez por aventura hasta que barajas; o deja que se repitan. Se apuntan como cualquier tirada, en la notación de cartas de Lonelog.",
          "Generadores propios: junta varias tablas (de cualquier juego, o tuyas) en un solo botón que las tira todas y lo apunta en una sola entrada, como «Inspírame». Están en Tablas, en su propio bloque, y en la mesa de juego del diario.",
          "Cuatro tablas nuevas para los lugares: Tipo de lugar (de la aldea a la capital, templos, atalayas, campamentos, ruinas…), Estado del lugar, Qué llama la atención y Problema del lugar.",
          "Nueva tabla de One Page Solo Engine, «Oráculo: ¿cuánto?», para preguntas de cantidad: ¿cuántos guardias?, ¿cómo de grave?",
          "La bandeja de los dados y las cartas es una vista previa: lo que quitas o vacías no se guarda en ningún sitio, ni la carta sale del mazo. Solo «Apuntar» lo lleva al diario y al historial (sin aventura, «Guardar en el historial»).",
          "Las tiradas de dados quedan en el historial, como las del oráculo y las tablas: con su resultado, para marcarlas como favoritas y filtrarlas. Y cada tirada del historial dice de qué aventura es, con un enlace a su diario, o si fue una tirada libre.",
          "El historial se filtra por aventura (o tiradas libres), y «Ver sus tiradas» en el menú de una aventura enseña solo su parte mecánica.",
          "Las pestañas Tablas y Dados muestran sus últimas tiradas, como el oráculo las suyas, con el enlace al historial ya filtrado.",
          "«Ver sus entradas» en el cuaderno deja en el diario solo lo que trata de un personaje, un lugar o un hilo (sus diálogos y acciones también), hasta que quitas el filtro.",
          "«Renombrar» en el cuaderno cambia un nombre en todo el diario (etiquetas, diálogos y acciones), con «Deshacer».",
          "Copia en Lonelog una escena, una sesión o la aventura entera, con todo lo que contiene, para pegarla donde quieras.",
          "Lo que dejas a medio escribir en una aventura te espera al volver, con su tipo de entrada.",
          "Pregunta al oráculo desde la casilla: si lo que escribes acaba en «?», el botón del oráculo (o Ctrl+Intro) se la hace. Es opcional: enviarla normal la deja como texto.",
          "Si conoces Lonelog, escríbelo en la casilla: empezar con «@ », «=> », «N (Odile): », «PC: », «\\--- » o «=== » cambia el tipo de entrada solo.",
          "En un diálogo con alguien nuevo, «Al cuaderno» lo apunta como PNJ.",
          "En el diario, la sesión y la escena de lo que estás leyendo se quedan arriba al desplazarte, también en las sesiones anteriores: siempre sabes a qué pertenece cada entrada.",
          "Varios − o + seguidos en un reloj o en el inventario se juntan en una sola entrada; si se anulan, no queda ninguna.",
          "Un reloj lleno o una cuenta atrás a cero lo dicen sin molestar: «completo» o «¡ya!» junto a su número, en el cuaderno y en el diario.",
          "Con muchos personajes, el cuaderno tiene un buscador.",
          "El contador de giros de Loner es ahora de cada aventura: los dobles de una partida ya no cuentan en otra. Y se ve, discreto, junto al nombre del oráculo.",
          "La probabilidad que eliges vale en todas partes: el oráculo, la mesa de juego y la pregunta escrita en la casilla.",
          "En el ordenador, el oráculo, los dados y las tablas de la mesa de juego se pliegan bajo su título: si no usas alguno, no ocupa sitio.",
          "La bandeja de los dados y las cartas y sus botones están siempre a la vista: al tirar o vaciar, lo de debajo ya no salta.",
          "Más fácil de leer: las fechas, cuentas y pistas en gris se ven mejor en todos los temas, los botones dorados del modo claro tienen más contraste y el rojo de OSR oscuro se lee mejor. Con un lector de pantalla, la respuesta del oráculo y el resultado de una tabla se leen en voz alta.",
          "Para Fate: los dados Fudge con habilidad se leen mejor, (+ 0 + −) + 1.",
          "Con teclado, Alt+Mayús+1…7 elige el tipo de entrada. La pestaña Dados es la tecla 3 y el Diario pasa a la 4.",
          "Con teclado, Ctrl+Z recupera la entrada que acabas de borrar.",
          "Al elegir un tipo de entrada, el cursor se queda en la casilla para escribir directamente; en el móvil, el selector ya no se escapa del dedo mientras escribes.",
        ],
      },
      en: {
        title: "Chapter XVI · The dice bag and the deck",
        intro: "Mara no longer hunts for the die she needs: the usual rolls are in her bag, a deck for omens beside them, and the journal keeps up with her.",
        items: [
          "A new “Dice” tab: built-in dice, formulas and dice of your own, with an optional text that goes in front in the journal (Athletics 4dF+2, Attack d20+5). Star your favorite dice, built-in or yours: they're the ones on the journal's game table. A formula you type there is saved as a die with the star.",
          "Cards on the game table: in the dice, switch to “Cards” and draw from a deck of playing cards (with jokers if you like) or a tarot (with reversed cards). With no repeats, each card comes out once per adventure until you shuffle; or let them repeat. They're logged like any roll, in Lonelog's card notation.",
          "Generators of your own: gather several tables (from any game, or yours) under one button that rolls them all and logs one entry, like “Inspire me”. They're on the Tables screen, in their own block, and on the journal's game table.",
          "Four new tables for places: Kind of place (from hamlet to capital, temples, watchtowers, camps, ruins…), State of the place, What stands out and Trouble in the place.",
          "A new One Page Solo Engine table, “Oracle: How much?”, for questions of amount: how many guards, how bad is it?",
          "The dice and cards tray is a preview: what you remove or clear isn't kept anywhere, and a card goes back into the deck. Only “Log it” takes it to the journal and the history (with no adventure, “Save to history”).",
          "Dice rolls stay in the history, like the oracle's and the tables': with their result, to star them and filter them. And every roll in the history says which adventure it's from, with a link to its journal, or that it was a free roll.",
          "The history filters by adventure (or free rolls), and “See its rolls” in an adventure's menu shows just its mechanics.",
          "The Tables and Dice tabs show their latest rolls, as the oracle shows its own, with the link to the history already filtered.",
          "“Show its entries” in the notebook leaves only what's about a character, a place or a thread in the journal (their dialogue and actions too), until you remove the filter.",
          "“Rename” in the notebook changes a name throughout the journal (tags, dialogue and actions), with Undo.",
          "Copy a scene, a session or the whole adventure as Lonelog, with everything in it, to paste wherever you like.",
          "What you leave half written in an adventure waits for you when you come back, with its entry type.",
          "Ask the oracle from the box: if what you type ends in “?”, the oracle's button (or Ctrl+Enter) asks it. It's optional: sending it as usual keeps it as text.",
          "If you know Lonelog, type it in the box: starting with “@ ”, “=> ”, “N (Odile): ”, “PC: ”, “\\--- ” or “=== ” changes the entry type by itself.",
          "In a dialogue with someone new, “To the notebook” logs them as an NPC.",
          "In the journal, the session and scene of what you're reading stay at the top as you scroll, earlier sessions too: you always know where each entry belongs.",
          "Several − or + in a row on a clock or the inventory join into one entry; if they cancel out, none is left.",
          "A full clock or a countdown at zero says so without getting in the way: “full” or “now!” beside its number, in the notebook and the journal.",
          "With a large cast, the notebook has a search.",
          "Loner's Twist Counter now belongs to each adventure: doubles in one game no longer count in another. And it shows, quietly, beside the oracle's name.",
          "The likelihood you pick holds everywhere: the oracle, the game table and the question typed in the box.",
          "On a computer, the game table's oracle, dice and tables fold under their heading: one you don't use takes no room.",
          "The dice and cards tray and its buttons are always in view: rolling or clearing no longer makes what's below jump.",
          "Easier to read: grey dates, counts and hints show better in every theme, gold buttons in light mode have more contrast and the red in dark OSR reads better. With a screen reader, the oracle's answer and a table's result are read aloud.",
          "For Fate: Fudge dice with a skill read better, (+ 0 + −) + 1.",
          "With a keyboard, Alt+Shift+1…7 picks the entry type. The Dice tab is key 3 and the Journal moves to 4.",
          "With a keyboard, Ctrl+Z brings back the entry you just deleted.",
          "Picking an entry type leaves the cursor in the box to write straight away; on a phone, the selector no longer slips from under your finger while you type.",
        ],
      },
    },
  },
  {
    version: "0.15.0",
    date: "2026-11-10",
    text: {
      es: {
        title: "Capítulo XV · Cuatro voces en la niebla",
        intro: "Mara ya no consulta a un solo oráculo: en la encrucijada la esperan cuatro, cada uno con su manera de responder.",
        items: [
          "Tres oráculos nuevos, además de Recluse: Loner (dados de oportunidad y riesgo, con giros cuando salen dobles), el «Pregunta al oráculo» de Ironsworn (un d100) y One Page Solo Engine (dos d6, el más sencillo). Se cambian tocando el nombre del oráculo junto al título.",
          "En Loner, el tercer doble trae un giro: se tiran solas sus tablas de giro y el resultado va al diario con la respuesta.",
          "La ayuda «?» de cada oráculo explica cómo responde y trae una tabla con la probabilidad exacta de cada respuesta (sí, no, «y además», «pero» y lo especial de cada uno) según lo probable que lo marques.",
          "Marca un oráculo como favorito con la estrella del selector: la app se abrirá siempre con él, aunque cambies a otro un momento.",
          "El oráculo también se cambia desde el diario: el nombre del oráculo y su «?» están en la mesa de juego, en el panel del ordenador y en la hoja del móvil.",
          "Si quieres, el oráculo pone a prueba cada escena nueva: al crearla, activa «Probar la escena» y tu oráculo dirá si va como esperabas, cambia o se interrumpe. Es opcional y la app recuerda si lo usas.",
          "Escenas dentro de las sesiones: «Nueva escena» en el selector del diario las numera solas (S1, S2…) y aparecen en el índice de sesiones. Un diario importado también trae sus recuerdos (S5a), montajes (S7.1) y tramas paralelas (T2-S1).",
          "El diario entiende todo Lonelog: lo que hace otro personaje (@(Jonah) …), diálogos, comentarios fuera del juego entre paréntesis, textos de la historia entre \\--- y ---\\, tiradas en tablas (tbl:) y generadores (gen:) y respuestas sueltas (-> Sí).",
          "Nuevo tipo de entrada, «Diálogo»: eliges quién habla (tu personaje, un PNJ del cuaderno u otro cualquiera) y escribes solo sus palabras. Los nombrados hace poco están a un toque y «Otro…» busca entre todos los demás. Se apunta como en Lonelog, N (Odile): \"…\".",
          "Otro tipo de entrada, «Texto de la historia», para lo que se lee dentro del juego (una carta, una inscripción): lo escribes tal cual y se apunta aparte, entre \\--- y ---\\ como en Lonelog.",
          "Mazmorras, combates y recursos: las salas [R:4|despejada], los enemigos [F:Matón|PV 6], los objetos [Inv:Antorcha|3] y el dinero [Wealth:Oro 45] aparecen en el cuaderno con su estado. El inventario tiene −/+ para gastar o conseguir uno.",
          "Los dados entienden todas las fórmulas de Lonelog: descartar (4d6dl1), explosiones acumuladas y penetrantes (d6!!, d6!p), repetir unos (d20ro), mínimos y máximos (4d6min2), críticos marcados (d20cs), multiplicar y paréntesis ((1d6+2)*3), grupos ({d8!!, d6!!}k1) y una descripción tras // («4d6dl1 // Fuerza»). La ayuda «?» las explica una a una.",
          "Ventaja y desventaja sirven para cualquier tirada, no solo el d20: actívalas y el próximo dado o fórmula se tira dos veces y te quedas con la mayor o la menor.",
          "Los dados de la mesa de juego se juntan en una bandeja, tanto los botones como las fórmulas: puedes quitar una tirada con su × y nada va al diario hasta que pulsas «Apuntar».",
          "Ojo, Mundo de Tinieblas: «3d10!>=8» ahora explota con 8 o más, como dice Lonelog. Para contar éxitos con 8 y repetir los 10, escribe «3d10>=8!».",
          "Cada sesión muestra el día en que se jugó, en su cabecera. Va también en el .md (como «[Date]», igual que en Lonelog) y en la página HTML, y al importar un diario se lee la suya.",
          "Todo lo que pasa en una sesión lleva el día de esa sesión: en el cuaderno, en la búsqueda y en las estadísticas. Así un diario importado con sus fechas cuenta sus días de juego y aparece en el mapa del año.",
          "Las estadísticas de cada aventura traen un mapa del último año: una fila por mes y una casilla por día, más intensa cuanto más escribiste, con tu racha más larga de días seguidos.",
          "Una guía rápida con todo a mano: cómo escribir en el diario, la notación Lonelog, las etiquetas del cuaderno y cómo cambiar su estado, y los atajos de teclado. Se abre con «?», desde Ajustes o desde el menú ⋯ de la aventura.",
          "La aventura de ejemplo crece a tres sesiones y enseña todo lo que sabe hacer el diario: escenas puestas a prueba, diálogos, inspiración rápida, tiradas con ventaja, un combate por rondas en el sótano del molino, salas, inventario, plata, un rastro, una cuenta atrás y descripciones en el cuaderno.",
          "La columna de la aventura se pliega por bloques: sesiones, notas fijas, personajes, hilos e inventario. En el índice, solo la sesión en curso muestra sus escenas; las demás, al tocar su flecha.",
          "Los números del cuaderno (segmentos de un reloj, cantidad de un objeto) se cambian con − y +, a juego con cada tema.",
          "La letra especial de cada tema queda para lo que hace de título (sesiones, escenas, tablas, el gran botón del oráculo): los menús, las respuestas del diario y los textos pequeños usan la letra de siempre, más fácil de leer.",
          "Todas las ventanas se abren igual de anchas en el ordenador, y lo aprovechan: los oráculos, en dos columnas; los resultados de una tabla, también.",
          "Con un menú desplegable abierto (el tipo de entrada, las opciones, las sesiones), la página de detrás ya no se desplaza.",
          "La casilla de fórmulas de dados tiene una × para borrarla de un toque, y en la columna de la aventura los nombres cortados se leen enteros al pasar el ratón.",
        ],
      },
      en: {
        title: "Chapter XV · Four voices in the fog",
        intro: "Mara no longer asks a single oracle: four wait at the crossroads, each with its own way of answering.",
        items: [
          "Three new oracles besides Recluse: Loner (Chance and Risk dice, with twists on doubles), Ironsworn's “Ask the Oracle” (a d100) and the One Page Solo Engine (two d6, the simplest). Switch by tapping the oracle's name next to the title.",
          "With Loner, the third double brings a twist: its twist tables are rolled for you and the result goes into the journal with the answer.",
          "Each oracle's “?” help explains how it answers and has a table with the exact chance of each answer (yes, no, “and”, “but” and each one's special result) at every likelihood.",
          "Mark an oracle as your favorite with the star in the switcher: the app will always open with it, even if you switch to another for a while.",
          "The oracle can be switched from the journal too: its name and its “?” are on the game table, in the desktop panel and in the phone's sheet.",
          "If you like, the oracle tests each new scene: when you create it, turn on “Test the scene” and your oracle says whether it goes as expected, changes or is interrupted. It's optional and the app remembers whether you use it.",
          "Scenes within sessions: “New scene” in the journal's picker numbers them for you (S1, S2…) and they show in the session index. An imported journal brings its flashbacks (S5a), montages (S7.1) and parallel threads (T2-S1) too.",
          "The journal understands all of Lonelog: another character acting (@(Jonah) …), dialogue, out-of-game asides in brackets, in-world text between \\--- and ---\\, table (tbl:) and generator (gen:) rolls and bare answers (-> Yes).",
          "A new entry type, “Dialogue”: pick who speaks (your character, an NPC from the notebook or anyone else) and type just their words. The ones named lately are one tap away and “Someone else…” searches all the rest. It's logged as in Lonelog, N (Odile): \"…\".",
          "Another entry type, “In-world text”, for what's read inside the game (a letter, an inscription): type it as written and it's logged set apart, between \\--- and ---\\ as in Lonelog.",
          "Dungeons, fights and resources: rooms [R:4|cleared], foes [F:Thug|HP 6], items [Inv:Torch|3] and money [Wealth:Gold 45] show in the notebook with their state. The inventory has −/+ to use up or gain one.",
          "The dice understand every Lonelog formula: dropping (4d6dl1), compounding and penetrating explosions (d6!!, d6!p), rerolling ones (d20ro), minimums and maximums (4d6min2), marked criticals (d20cs), multiplying and parentheses ((1d6+2)*3), groups ({d8!!, d6!!}k1) and a description after // (“4d6dl1 // Strength”). The “?” help explains them one by one.",
          "Advantage and disadvantage work for any roll, not just the d20: turn one on and the next die or formula is rolled twice, keeping the higher or the lower.",
          "The game table's dice gather in a tray, buttons and formulas alike: remove a roll with its × and nothing goes to the journal until you press “Log”.",
          "Heads up, World of Darkness: “3d10!>=8” now explodes on 8 or more, as Lonelog says. To count successes on 8 and reroll tens, write “3d10>=8!”.",
          "Each session shows the day it was played, in its header. It also goes in the .md (as “[Date]”, as in Lonelog) and in the HTML page, and importing a journal reads its own.",
          "Everything that happens in a session carries that session's day: in the notebook, in search and in the statistics. So an imported journal with its dates counts its days of play and shows on the year's map.",
          "Each adventure's statistics show a map of the last year: one row per month and one square per day, brighter the more you wrote, with your longest streak of days in a row.",
          "A quick guide with everything at hand: how to write in the journal, the Lonelog notation, the notebook's tags and how to change their state, and the keyboard shortcuts. Open it with “?”, from Settings or from the adventure's ⋯ menu.",
          "The sample adventure grows to three sessions and shows everything the journal can do: tested scenes, dialogue, quick inspiration, rolls with advantage, a fight in rounds in the mill cellar, rooms, inventory, silver, a trail, a countdown and descriptions in the notebook.",
          "The adventure's column folds block by block: sessions, pinned notes, characters, threads and inventory. In the index, only the current session shows its scenes; the others, when you tap their arrow.",
          "The notebook's numbers (a clock's segments, an item's quantity) change with − and +, matching each theme.",
          "Each theme's special lettering is kept for what works as a title (sessions, scenes, tables, the oracle's big button): menus, the journal's answers and small text use the everyday lettering, easier to read.",
          "Every window opens just as wide on a computer, and makes use of it: the oracles side by side, a table's results in two columns.",
          "With a dropdown menu open (the entry kind, the options, the sessions), the page behind no longer scrolls.",
          "The dice formula box has an × to clear it in one tap, and in the adventure's column cut-off names show in full when you hover over them.",
        ],
      },
    },
  },
  {
    version: "0.14.0",
    date: "2026-11-09",
    text: {
      es: {
        title: "Capítulo XIV · Dos velas, un mismo diario",
        intro: "Mara escribe en la posada y en el camino a la vez, y ninguna de las dos plumas borra lo que anota la otra.",
        items: [
          "Si tienes Solo Compass abierto en dos sitios a la vez (la app instalada y una pestaña del navegador, por ejemplo), lo que apuntas en uno ya no borra lo del otro, y cada uno ve al momento lo que escribes en el otro.",
          "Una copia de seguridad dañada o editada a mano se restaura sin lo que no se pueda leer, en vez de dejar el diario sin abrir.",
          "El diario y el historial guardan cada cambio por separado: con años de partidas, tirar sigue siendo igual de rápido.",
          "Al importar un diario muy largo, lo que escribas justo después ya no se cuela entre sus líneas.",
          "En el cuaderno del móvil, su botón queda marcado mientras está abierto, como la búsqueda y las sesiones.",
          "La ayuda de los dados («?») explica ahora cada fórmula pieza a pieza: qué significa cada parte, varios ejemplos con la línea que deja en el diario y en qué juegos se usa. También cómo leer una tirada (✓, ✗, el ! de los dados que explotan) y sus límites.",
          "Todas las ventanas (ajustes, ayudas, crónica, estadísticas, tablas…) siguen el mismo patrón: título fijo arriba y solo el contenido se desplaza. En el ordenador, las ayudas aprovechan el ancho de la pantalla.",
          "El historial de tiradas se abre al instante aunque guarde miles: muestra las más recientes y va cargando el resto según bajas.",
          "Una sesión muy larga (un diario importado sin sesiones, por ejemplo) muestra sus últimas entradas, con «Ver entradas anteriores» arriba: apuntar algo nuevo ya no tarda segundos. La búsqueda sigue llevándote a cualquier entrada.",
          "En el iPhone, si usas Solo Compass desde Safari, un aviso en el diario te recuerda instalarla: Safari borra los datos de las webs que pasas una semana sin abrir.",
          "Al instalar la app con el idioma en inglés, su descripción aparece en inglés.",
        ],
      },
      en: {
        title: "Chapter XIV · Two candles, one journal",
        intro: "Mara writes at the inn and on the road at once, and neither quill erases what the other wrote.",
        items: [
          "With Solo Compass open in two places at once (the installed app and a browser tab, say), what you log in one no longer erases the other's, and each shows what you write in the other right away.",
          "A damaged or hand-edited backup is restored without what can't be read, instead of leaving the journal unable to open.",
          "The journal and the history save each change on its own: after years of play, rolling is just as quick.",
          "When importing a very long journal, what you write right after no longer slips in among its lines.",
          "On phones, the notebook's button stays marked while it's open, like search and sessions.",
          "The dice help (“?”) now explains each formula piece by piece: what each part means, several examples with the line it leaves in the journal and which games use it. Also how to read a roll (✓, ✗, the ! of exploding dice) and its limits.",
          "Every window (settings, help, chronicle, stats, tables…) follows the same pattern: the title stays at the top and only the content scrolls. On a computer, the help windows make use of the screen's width.",
          "The roll history opens at once even with thousands of rolls: it shows the latest and loads the rest as you scroll down.",
          "A very long session (a journal imported with no sessions, say) shows its latest entries, with “Show earlier entries” at the top: logging something new no longer takes seconds. Search still takes you to any entry.",
          "On iPhone, if you use Solo Compass from Safari, a note in the journal reminds you to install it: Safari deletes the data of sites you don't open for a week.",
          "Installing the app with the language set to English shows its description in English.",
        ],
      },
    },
  },
  {
    version: "0.13.0",
    date: "2026-11-07",
    text: {
      es: {
        title: "Capítulo XIII · Lo que se quedó en el tintero",
        intro: "Mara repasa el diario a la luz de la vela y se da cuenta de que se saltó algo en el molino.",
        items: [
          "Escribe debajo de cualquier entrada: en su menú «⋯», «Escribir debajo», y lo siguiente que apuntes (también tiradas del oráculo, tablas y dados) va ahí, una tras otra. «Volver al final» te devuelve al presente.",
          "Sube o baja una entrada desde el mismo menú; pasando por encima del título de una sesión cambia de sesión.",
          "Dados que explotan: 3d6! vuelve a tirar el dado que saca su máximo y lo suma. En una reserva (5d10!>=8), cada dado extra cuenta como uno más.",
          "Junto al nombre del oráculo, un «?» explica en pocas líneas cómo preguntarle y qué significa cada respuesta. En los dados de la mesa de juego, otro «?» cuenta qué tira cada botón y cómo se escriben las fórmulas, con un ejemplo de cada una.",
          "En el cuaderno, cada personaje, lugar o hilo puede llevar una descripción: cómo es, quién es, lo que sabes. No se apunta en el diario, y viaja en la copia, en el .md y en la página web.",
          "Arriba, junto a los ajustes, una taza de café lleva a Ko-fi por si quieres invitar al autor. También en el móvil, sin más ruido que el icono.",
          "Los nombres largos de aventura ya no se cortan tras los botones: pasan a una segunda línea (o tercera, en el móvil).",
        ],
      },
      en: {
        title: "Chapter XIII · What was left unwritten",
        intro: "Reading her journal by candlelight, Mara realises she skipped something at the mill.",
        items: [
          "Write below any entry: in its “⋯” menu, “Write below”, and whatever you log next (oracle, table and dice rolls too) goes there, one after another. “Back to the end” returns you to the present.",
          "Move an entry up or down from the same menu; stepping past a session's title moves it into that session.",
          "Exploding dice: 3d6! rolls again any die that shows its highest face and adds it. In a pool (5d10!>=8), each extra die counts as one more.",
          "Next to the oracle's name, a “?” explains in a few lines how to ask it and what each answer means. In the game table's dice, another “?” tells what each button rolls and how to write formulas, with an example of each.",
          "In the notebook, each character, place or thread can have a description: what they're like, who they are, what you know. It isn't logged in the journal, and it travels in the backup, the .md and the web page.",
          "Up top, beside the settings, a coffee cup leads to Ko-fi in case you'd like to buy the author one. On phones too, with nothing more than the icon.",
          "Long adventure names are no longer cut off by the buttons: they wrap onto a second line (or a third, on phones).",
        ],
      },
    },
  },
  {
    version: "0.12.0",
    date: "2026-11-06",
    text: {
      es: {
        title: "Capítulo XII · Hilos sueltos y relojes que corren",
        intro: "En el cuaderno de Mara ya no caben solo nombres: también las preguntas sin respuesta y lo que se agota.",
        items: [
          "Hilos y relojes en el cuaderno: tramas abiertas ([Thread:La caja sellada|Abierto]), relojes de amenaza ([Clock:Alarma 2/6]), progresos ([Track:Huida 3/8]) y cuentas atrás ([Timer:Amanecer 3]). Súmales o réstales uno con un toque, y cierra un hilo cuando se resuelva.",
          "Tirar en la lista: un dado junto a Personajes, Lugares e Hilos elige uno al azar para cuando el oráculo pregunta «¿quién?» o «¿cuál?».",
          "Dados con fórmula en la mesa de juego: 2d6+3, 4d6kh3 (los tres mayores), 5d6>=5 (cuenta éxitos), y botones de ventaja y desventaja.",
          "Las tablas que dicen «Tira dos veces» ya tiran solas, y en tus tablas un resultado puede tirar en otra escribiendo su nombre entre llaves: «Un {PNJ: nombre} vigila».",
          "Exporta una aventura como página web para leerla o compartirla, con los colores y la letra del tema que estés usando.",
          "Los diarios de Lonelog con las tiradas sangradas bajo su acción, como en los ejemplos de la notación, se importan bien.",
          "Juega en el móvil y en el ordenador: en Ajustes, «Enviar» manda tu copia al otro dispositivo, y al restaurarla puedes juntarla con lo que ya tenías en vez de sustituirlo. Lo que borres en uno no reaparece en el otro.",
          "Bajo cada mención de un personaje o lugar se ve en qué sesión está.",
          "Al escribir «[» salen también los hilos y relojes: primero los tres últimos que has nombrado y después todo por orden alfabético. Desde ahí puedes crear cualquiera nuevo: personaje, lugar, hilo, reloj, progreso o cuenta atrás. Puedes teclear «[clock:» en minúsculas: se escribe como manda la notación.",
        ],
      },
      en: {
        title: "Chapter XII · Loose threads and ticking clocks",
        intro: "Mara's notebook no longer holds just names: also the unanswered questions and what's running out.",
        items: [
          "Threads and clocks in the notebook: open plot threads ([Thread:The sealed box|Open]), threat clocks ([Clock:Alarm 2/6]), tracks ([Track:Escape 3/8]) and timers ([Timer:Dawn 3]). Add or take one with a tap, and close a thread once it's resolved.",
          "Roll on the list: a die beside Characters, Places and Threads picks one at random, for when the oracle asks “who?” or “which?”.",
          "Dice formulas at the game table: 2d6+3, 4d6kh3 (highest three), 5d6>=5 (counts successes), and advantage and disadvantage buttons.",
          "Tables that say “Roll twice” now roll by themselves, and in your own tables a result can roll on another by writing its name in braces: “A {NPC: Name} keeps watch”.",
          "Export an adventure as a web page to read or share, in the colours and font of the theme you're using.",
          "Lonelog journals with rolls indented under their action, as in the notation's examples, now import correctly.",
          "Play on your phone and your computer: in Settings, “Send” passes your backup to the other device, and when restoring it you can merge it with what you already had instead of replacing it. What you delete on one doesn't come back on the other.",
          "Each mention of a character or place shows which session it's in.",
          "Typing “[” now offers threads and clocks too: the last three you named first, then everything in alphabetical order. You can create any new one from there: character, place, thread, clock, track or timer. You can type “[clock:” in lower case: it’s written the way the notation says.",
        ],
      },
    },
  },
  {
    version: "0.11.0",
    date: "2026-11-06",
    text: {
      es: {
        title: "Capítulo XI · El cuaderno del viajero",
        intro: "Mara se compró un cuaderno en el mercado del cruce. Ahí apunta a quién ha conocido, dónde ha estado y lo que no quiere olvidar.",
        items: [
          "Cada aventura tiene ahora su cuaderno: en pantallas anchas, a la izquierda del diario; en el móvil, en el botón del cuaderno de la cabecera.",
          "Notas fijas: lo que quieras tener a mano (inventario, pistas, cabos sueltos), siempre a la vista y sin fecha. Una línea que empieza por «- [ ]» se convierte en una casilla que puedes marcar.",
          "Personajes y lugares: nómbralos en el diario con etiquetas de Lonelog, como [N:Odile|desconfiada] o [L:El molino], y aparecerán resaltados. El cuaderno los reúne con sus rasgos de ahora y todas las entradas donde salen. Al escribir «[» en el diario, o al editar una entrada, te sugiere los que ya tienes, o crea uno nuevo con el nombre que escribas, sin aprenderte la notación. También puedes añadirlos, apuntar un cambio o mencionarlos desde el cuaderno.",
          "Las notas fijas viajan dentro del .md al exportar e importar una aventura. La aventura de ejemplo trae personajes, lugares y notas para verlo en marcha.",
          "Llegan a la biblioteca 82 tablas de Cairn, de Yochai Gal: facciones, terrenos y parajes, mazmorras, bosques, el tiempo (también el insólito), PNJ, rasgos de personaje, vínculos y presagios. En inglés y en español.",
          "La pregunta de ejemplo del oráculo es más corta y ya cabe entera en los móviles pequeños.",
        ],
      },
      en: {
        title: "Chapter XI · The traveller's notebook",
        intro: "Mara bought a notebook at the crossroads market. In it she writes down who she's met, where she's been and what she doesn't want to forget.",
        items: [
          "Every adventure now has its notebook: on wide screens, to the left of the journal; on phones, behind the notebook button in the header.",
          "Pinned notes: what you want at hand (inventory, clues, loose ends), always in sight and undated. A line starting with “- [ ]” becomes a checkbox you can tick.",
          "Characters and places: name them in the journal with Lonelog tags, like [N:Odile|wary] or [L:The mill], and they stand out. The notebook gathers them with their current traits and every entry they appear in. Typing “[” in the journal, or while editing an entry, suggests the ones you already have, or makes a new one from the name you type, without learning the notation. You can also add them, log a change or mention them from the notebook.",
          "Pinned notes travel inside the .md when you export and import an adventure. The sample adventure comes with characters, places and notes to see it at work.",
          "82 tables from Cairn, by Yochai Gal, join the library: factions, terrain and landmarks, dungeons, forests, weather (the unusual kind too), NPCs, character traits, bonds and omens. In English and Spanish.",
          "The oracle's example question is shorter and now fits on small phones.",
        ],
      },
    },
  },
  {
    version: "0.10.0",
    date: "2026-11-05",
    text: {
      es: {
        title: "Capítulo X · La biblioteca del viajero",
        intro: "Llegaron más viajeros a la posada, cada uno con su libro de tablas bajo el brazo, y el posadero les hizo sitio en la estantería.",
        items: [
          "Más de seiscientas tablas nuevas, en inglés y en español: Ironsworn: Delve (sitios, amenazas, trampas, monstruos), Ironsworn: Starforged y Starsmith (ciencia ficción: planetas, naves, facciones, pecios), Loner (ganchos de aventura, giros y el creador de aventuras), Knave (rasgos de personaje) y el Lazy GM's Resource Document (inicios fuertes, secretos, misiones, mazmorras y pueblos).",
          "Cada juego tiene su bloque en Tablas y solo se carga cuando lo abres o buscas, así que la app sigue arrancando igual de rápido.",
          "Las tablas se ordenan por temática (personajes, lugares, mazmorras, naves, planetas…): dentro de cada juego van agrupadas, puedes filtrar por temática con los botones bajo el buscador, y buscar «naves» o «nombres» las encuentra en todos los juegos. Tus tablas también pueden llevar temática.",
          "En Ajustes, todos los autores y sus licencias, con el agradecimiento que cada uno pide.",
        ],
      },
      en: {
        title: "Chapter X · The traveller's library",
        intro: "More travellers came to the inn, each with a book of tables under their arm, and the innkeeper made room for them on the shelf.",
        items: [
          "Over six hundred new tables, in English and Spanish: Ironsworn: Delve (sites, threats, traps, monsters), Ironsworn: Starforged and Starsmith (science fiction: planets, starships, factions, derelicts), Loner (adventure hooks, twists and the adventure maker), Knave (character traits) and the Lazy GM's Resource Document (strong starts, secrets, quests, dungeons and towns).",
          "Each game has its own block in Tables and is only loaded when you open it or search, so the app still starts just as fast.",
          "Tables are sorted by theme (characters, places, dungeons, starships, planets…): grouped within each game, filterable with the buttons under the search, and searching for “starships” or “names” finds them in every game. Your own tables can have a theme too.",
          "In Settings, every author and their licence, with the thanks each one asks for.",
        ],
      },
    },
  },
  {
    version: "0.9.0",
    date: "2026-11-05",
    text: {
      es: {
        title: "Capítulo IX · Juramentos de hierro",
        intro: "Una viajera de las Tierras de Hierro dejó en la posada su libro de oráculos, traducido a nuestra lengua.",
        items: [
          "Las tablas de oráculo de Ironsworn, de Shawn Tomkin: Acción y Tema, lugares, asentamientos, personajes, nombres, giros argumentales, Pagar el precio y más. Treinta tablas, en inglés y en español.",
          "Cada juego tiene su propio bloque en Tablas (las tuyas, las de Solo Compass y las de Ironsworn), que se pliega y se despliega. La búsqueda las encuentra todas aunque estén plegadas.",
          "En el diario y en el historial, las tiradas de Ironsworn llevan su nombre delante («Ironsworn: Acción»), para no confundirlas con las de serie.",
        ],
      },
      en: {
        title: "Chapter IX · Iron vows",
        intro: "A traveller from the Ironlands left her book of oracles at the inn.",
        items: [
          "Ironsworn's oracle tables, by Shawn Tomkin: Action and Theme, places, settlements, characters, names, plot twists, Pay the Price and more. Thirty tables, in English and Spanish.",
          "Each game has its own block in Tables (yours, Solo Compass's and Ironsworn's), which folds and unfolds. Search finds them all, folded or not.",
          "In the journal and the history, Ironsworn rolls carry its name in front (“Ironsworn: Action”), so they don't get mixed up with the built-in ones.",
        ],
      },
    },
  },
  {
    version: "0.8.0",
    date: "2026-11-05",
    text: {
      es: {
        title: "Capítulo VIII · La mesa, recogida",
        intro: "El posadero ordenó la mesa de juego: cada cosa en su sitio y a mano.",
        items: [
          "Las consecuencias se unen siempre a la última entrada (también a una acción o una nota), y al escribirlas ves a cuál se van a unir.",
          "El botón de enviar se apaga mientras no hayas escrito nada.",
          "«Nueva sesión» va aparte en el menú de tipos de entrada, para que no parezca una entrada más. Y desaparece «Tirada»: para tirar ya están los dados.",
          "En la mesa de juego, los dados van justo debajo del oráculo, y de las tablas solo ves la inspiración rápida y tus favoritas; el resto, con el buscador.",
          "Cada sesión se distingue mejor: su título destaca más y una línea a la izquierda une sus entradas.",
          "En pantallas grandes, el oráculo, las tablas y el diario ocupan el mismo ancho: ya no bailan al cambiar de pestaña.",
        ],
      },
      en: {
        title: "Chapter VIII · A tidier table",
        intro: "The innkeeper tidied up the game table: everything in its place and within reach.",
        items: [
          "Consequences always join the latest entry (an action or a note too), and while writing one you see which entry it will join.",
          "The send button stays off until you've written something.",
          "“New session” sits apart in the entry type menu, so it doesn't look like one more entry. And “Roll” is gone: the dice are there for rolling.",
          "At the game table, the dice sit right below the oracle, and of the tables you only see quick inspiration and your favorites; the rest, through search.",
          "Each session stands out better: its title is more prominent and a line on the left ties its entries together.",
          "On large screens, the oracle, tables and journal take the same width: no more jumping around when switching tabs.",
        ],
      },
    },
  },
  {
    version: "0.7.0",
    date: "2026-11-04",
    text: {
      es: {
        title: "Capítulo VII · El cartógrafo y sus tablas",
        intro: "Un viejo cartógrafo llegó a la posada con un fajo de tablas bajo el brazo… y dejó papel en blanco para las tuyas.",
        items: [
          "Crea tus propias tablas: un resultado por línea, el dado que quieras (o uno con tantas caras como líneas) y rangos como «1-3 Ratas» para que algo salga más a menudo.",
          "Importa tablas desde un archivo o pégalas tal cual, incluso como tabla de Markdown. Puedes exportarlas, compartirlas y anotar de qué juego o libro vienen.",
          "Diez tablas nuevas de serie: Acción y Tema, Cómo, Aspecto, Rasgo de PNJ, Motivación, Complicación, Lugar, Hallazgo y Clima.",
          "Inspiración rápida: una acción y un tema a la vez, para cuando el oráculo te deja en blanco. En la pantalla de Tablas y en la mesa de juego.",
          "Busca en tu diario: la lupa de cada aventura encuentra cualquier palabra y te lleva a la entrada. Desde la lista del diario, buscas en todas tus aventuras a la vez.",
          "Estadísticas de cada aventura, en su menú: sesiones, palabras escritas, qué te ha dicho el oráculo y la tabla favorita del destino.",
          "Comparte una aventura o una tabla con otra app (notas, mensajería, correo…) desde su menú, si tu dispositivo lo permite.",
          "La copia de seguridad guarda también tus tablas.",
        ],
      },
      en: {
        title: "Chapter VII · The cartographer and his tables",
        intro: "An old cartographer walked into the inn with a bundle of tables under his arm… and left blank pages for yours.",
        items: [
          "Make your own tables: one result per line, any die you like (or one with as many faces as lines) and ranges like “1-3 Rats” so something comes up more often.",
          "Import tables from a file or paste them as they are, even as a Markdown table. Export them, share them and note which game or book they come from.",
          "Ten new built-in tables: Action and Theme, How, Aspect, NPC trait, Motivation, Complication, Place, Find and Weather.",
          "Quick inspiration: an action and a theme at once, for when the oracle leaves you blank. On the Tables screen and at the game table.",
          "Search your journal: each adventure's magnifying glass finds any word and takes you to the entry. From the journal list, you search every adventure at once.",
          "Statistics for each adventure, in its menu: sessions, words written, what the oracle told you and fate's favorite table.",
          "Share an adventure or a table with another app (notes, messaging, email…) from its menu, if your device allows it.",
          "Backups now keep your tables too.",
        ],
      },
    },
  },
  {
    version: "0.6.0",
    date: "2026-11-04",
    text: {
      es: {
        title: "Capítulo VI · Más mesa, menos estorbo",
        intro: "Recogimos los trastos de la mesa para que tu historia tenga sitio.",
        items: [
          "El panel para escribir en el diario cabe en una sola fila: oráculo, tablas y dados se abren por encima cuando los necesitas y se recogen al tirar.",
          "El tipo de entrada (nota, acción, tirada, consecuencia o nueva sesión) se elige desde un pequeño menú junto al texto.",
          "Puedes escribir entradas de varias líneas: el cuadro crece contigo. Con teclado, Mayús+Intro empieza una línea nueva.",
          "En el ordenador, la mesa de juego queda siempre abierta a la derecha del diario y, en pantallas anchas, el índice de sesiones a la izquierda.",
          "En el móvil y la tablet, el marcapáginas junto al título te lleva a cualquier sesión de la aventura.",
          "La aventura en la que estás jugando se ve siempre arriba, en todas las pantallas, y te lleva a ella de un toque.",
          "Las sesiones se leen en orden, como un libro: las anteriores, recogidas arriba; la actual, abajo, con su título siempre a la vista.",
          "El lápiz y la papelera solo aparecen al tocar una entrada, y si borras algo por error puedes deshacerlo al momento.",
          "Varias tiradas de dados en una misma entrada se ven una a una, cada una con su dado.",
          "El aviso para proteger tu diario ya no te interrumpe: lo tienes en Ajustes, cuando quieras.",
          "Estrenamos emblema: una rosa de los vientos, la misma en la app y en el icono de tu pantalla de inicio. Y los iconos se visten para la partida: bola de cristal para el oráculo, espada para tus acciones, pluma para tus notas y dados de verdad.",
          "En pantallas muy anchas la mesa se extiende: más tablas, más tiradas y más diario a la vista.",
          "En el ordenador, todo lo que se puede pulsar lo anuncia: el puntero se vuelve una mano y el botón se ilumina al pasar por encima.",
          "Atajos de teclado para jugar sin soltarlo: 1, 2 y 3 para cambiar de pantalla, / para escribir, O, T y D para la mesa de juego. Pulsa ? para ver la lista (también en Ajustes).",
          "Quien juega con teclado ya ve siempre dónde está: un brillo dorado marca el botón activo, y los diálogos y menús se recorren con Tab y las flechas.",
          "En Ajustes ves cuándo guardaste tu última copia de seguridad. Si pasa mucho tiempo y el diario crece, un pequeño punto dorado en la rueda de Ajustes te lo recordará, sin más.",
          "¿Primera vez? Con el diario vacío puedes abrir una aventura de ejemplo, «La posada del cruce», para ver cómo queda una partida: preguntas, tiradas, tablas y consecuencias. Puedes seguir jugándola o borrarla.",
          "En Ajustes puedes instalar Solo Compass en tu dispositivo con un solo toque, o ver cómo hacerlo si tu navegador no lo ofrece. Si ya la tienes instalada, te lo dice.",
        ],
      },
      en: {
        title: "Chapter VI · More table, less clutter",
        intro: "We cleared the clutter off the table to make room for your story.",
        items: [
          "The journal's writing panel fits in a single row: oracle, tables and dice open on top when you need them and tuck away once you roll.",
          "Pick the entry type (note, action, roll, consequence or new session) from a small menu next to the text.",
          "Write entries over several lines: the box grows with you. With a keyboard, Shift+Enter starts a new line.",
          "On a computer, the game table stays open to the right of the journal and, on wide screens, the session index sits on the left.",
          "On phone and tablet, the bookmark next to the title takes you to any session of the adventure.",
          "The adventure you're playing is always shown at the top, on every screen, one tap away.",
          "Sessions read in order, like a book: earlier ones folded away above, the current one below with its title always in sight.",
          "The pencil and the bin only appear when you tap an entry, and if you delete something by mistake you can undo it right away.",
          "Several dice rolls in one entry show one by one, each with its die.",
          "The reminder to protect your journal no longer interrupts you: it's in Settings, whenever you want it.",
          "A new emblem: a compass rose, the same inside the app and on your home screen icon. And the icons dress up for the game: a crystal ball for the oracle, a sword for your actions, a quill for your notes and real dice.",
          "On very wide screens the table spreads out: more tables, more rolls and more journal in view.",
          "On a computer, everything you can click says so: the pointer turns into a hand and the button lights up as you pass over it.",
          "Keyboard shortcuts to play without letting go: 1, 2 and 3 to switch screens, / to write, O, T and D for the game table. Press ? to see the list (also in Settings).",
          "Keyboard players can always see where they are: a golden glow marks the focused button, and dialogs and menus can be walked with Tab and the arrow keys.",
          "Settings shows when you saved your last backup. If a long time goes by and the journal grows, a small golden dot on the Settings wheel will remind you, nothing more.",
          "First time? With an empty journal you can open a sample adventure, “The Crossroads Inn”, to see what a game looks like: questions, rolls, tables and consequences. Keep playing it or delete it.",
          "Install Solo Compass on your device from Settings with a single tap, or see how to do it if your browser doesn't offer it. If it's already installed, it tells you so.",
        ],
      },
    },
  },
  {
    version: "0.5.0",
    date: "2026-10-23",
    text: {
      es: {
        title: "Capítulo V · La mesa se agranda",
        intro: "El grupo por fin encontró una mesa a su medida… aunque juegues en solitario.",
        items: [
          "La app se ve bien en tablet y ordenador: el menú pasa arriba, aparecen dos columnas y se acabaron las franjas vacías.",
          "El diario es ahora tu mesa de juego: pregunta al oráculo o tira en una tabla sin salir de tu aventura.",
          "Las entradas del diario se leen de un vistazo: pregunta, tirada y consecuencia van juntas, y la respuesta del oráculo sale en su color.",
          "Al apuntar una consecuencia, la app te confirma dónde ha quedado escrita.",
          "Tablas nuevas, escritas expresamente para la app: eventos aleatorios, acciones de PNJ y descriptores de escena.",
          "Tema, idioma, copia de seguridad y créditos, reunidos en un único rincón: Ajustes.",
          "El historial ya no ocupa pestaña: tus últimas tiradas te esperan bajo el oráculo, con el registro completo a un toque.",
          "Los pergaminos emergentes se cierran con Esc o tocando fuera, como manda la tradición.",
          "Puedes pedir al navegador que proteja tu diario para que nunca lo borre por su cuenta.",
          "Iconos nuevos, más claros y todos del mismo estilo.",
          "Si tienes la app instalada, un heraldo te avisará cuando llegue una versión nueva: basta con pulsar «Actualizar».",
          "En Ajustes → Acerca de puedes invitar a una ronda al autor en Ko-fi, si la app te acompaña en tus partidas.",
          "Al importar un diario, las entradas de varias líneas llegan enteras y ninguna nota cambia de tipo por el camino.",
          "Lo último que apuntas ya no se esconde tras el panel de escritura, y cada pantalla se abre desde arriba.",
          "Y esta misma crónica, para los aventureros más curiosos.",
        ],
      },
      en: {
        title: "Chapter V · A bigger table",
        intro: "The party finally found a table that fits… even if you play solo.",
        items: [
          "The app looks right on tablets and computers: the menu moves to the top, two columns appear and the empty margins are gone.",
          "The journal is now your game table: ask the oracle or roll on a table without leaving your adventure.",
          "Journal entries read at a glance: question, roll and consequence sit together, and the oracle's answer shows in its color.",
          "When you log a consequence, the app tells you exactly where it was written.",
          "Brand-new tables, written just for the app: random events, NPC actions and scene descriptors.",
          "Theme, language, backup and credits, gathered in a single corner: Settings.",
          "History no longer takes a tab: your recent rolls wait under the oracle, with the full log one tap away.",
          "Pop-up scrolls close with Esc or by tapping outside, as tradition demands.",
          "You can ask the browser to protect your journal so it never deletes it on its own.",
          "New icons, clearer and all in the same style.",
          "If you've installed the app, a herald will tell you when a new version arrives: just tap “Update”.",
          "In Settings → About you can buy the author a round on Ko-fi, if the app keeps you company at the table.",
          "When you import a journal, multi-line entries arrive whole and no note changes kind along the way.",
          "Your latest entry no longer hides behind the writing panel, and every screen opens at the top.",
          "And this very chronicle, for the most curious adventurers.",
        ],
      },
    },
  },
  {
    version: "0.4.1",
    date: "2026-09-26",
    text: {
      es: {
        title: "Interludio · Afilando las armas",
        intro: "Entre aventura y aventura, la herrera repasa el filo de lo que ya teníamos.",
        items: [
          "La pestaña en la que estás se marca con una píldora, no solo con color: en los temas casi sin color también se distingue.",
          "El panel para escribir en el diario se asienta mejor sobre el menú inferior.",
        ],
      },
      en: {
        title: "Interlude · Sharpening the blades",
        intro: "Between adventures, the smith goes over the edge of what we already had.",
        items: [
          "The tab you're on is marked with a pill, not just color: it stands out even in the nearly colorless themes.",
          "The journal's writing panel sits more snugly on top of the bottom menu.",
        ],
      },
    },
  },
  {
    version: "0.4.0",
    date: "2026-09-08",
    text: {
      es: {
        title: "Capítulo IV · El diario cobra vida",
        intro: "El escriba del grupo pidió más tinta, y se la dimos.",
        items: [
          "Sesiones plegables: la actual siempre a mano, las anteriores bien guardadas.",
          "Las campañas pasan a llamarse aventuras: una está activa y el resto, en pausa.",
          "Puedes editar cualquier entrada del diario y tirar los dados de tu propio sistema (de d4 a d100, y Fudge).",
          "Copia de seguridad completa: llévate todo en un archivo y restáuralo cuando quieras.",
          "Modo claro, oscuro o automático para cada tema.",
          "Exporta tu aventura a Markdown en notación Lonelog, legible en cualquier sitio.",
        ],
      },
      en: {
        title: "Chapter IV · The journal comes alive",
        intro: "The party's scribe asked for more ink, and we delivered.",
        items: [
          "Collapsible sessions: the current one always at hand, the older ones safely stored away.",
          "Campaigns are now called adventures: one is active and the rest are paused.",
          "Edit any journal entry and roll your own system's dice (d4 to d100, plus Fudge).",
          "Full backup: take everything with you in one file and restore it whenever you like.",
          "Light, dark or automatic mode for every theme.",
          "Export your adventure to Markdown in Lonelog notation, readable anywhere.",
        ],
      },
    },
  },
  {
    version: "0.3.0",
    date: "2026-09-06",
    text: {
      es: {
        title: "Capítulo III · Tinta y pergamino",
        intro: "Mara pidió pluma y pergamino: lo que pasa en el camino merece quedar escrito.",
        items: [
          "Nace el diario de aventuras, escrito en notación Lonelog.",
          "Las tiradas del oráculo y de las tablas se apuntan solas en tu aventura activa.",
          "Selector de oráculos, listo para cuando lleguen más compañeros de viaje.",
          "El historial se guarda en un cofre mucho más grande del navegador.",
        ],
      },
      en: {
        title: "Chapter III · Ink and parchment",
        intro: "Mara asked for quill and parchment: what happens on the road deserves to be written down.",
        items: [
          "The adventure journal is born, written in Lonelog notation.",
          "Oracle and table rolls are logged automatically in your active adventure.",
          "An oracle picker, ready for when more travel companions arrive.",
          "History is kept in a much bigger chest inside the browser.",
        ],
      },
    },
  },
  {
    version: "0.2.0",
    date: "2026-09-03",
    text: {
      es: {
        title: "Capítulo II · Mapas y lenguas",
        intro: "Un mercader trajo mapas de otras tierras, y en la posada aprendimos a hablar su lengua.",
        items: [
          "Las tablas muestran a qué juego pertenecen, todos sus resultados posibles, un buscador y tus favoritas.",
          "La app habla español e inglés, y elige sola según tu navegador.",
          "Mil pequeños retoques: respuestas que ya no se salen de la tarjeta y matices del oráculo más claros.",
        ],
      },
      en: {
        title: "Chapter II · Maps and tongues",
        intro: "A merchant brought maps from other lands, and at the inn we learned to speak his tongue.",
        items: [
          "Tables show which game they belong to, every possible result, a search box and your favorites.",
          "The app speaks Spanish and English, and picks one based on your browser.",
          "A thousand small touches: answers no longer spill out of their card and the oracle's nuances read clearer.",
        ],
      },
    },
  },
  {
    version: "0.1.0",
    date: "2026-09-01",
    text: {
      es: {
        title: "Capítulo I · La primera tirada",
        intro: "Toda aventura empieza con una pregunta.",
        items: [
          "El oráculo Recluse responde Sí, No o Contradicción, con sus matices.",
          "Tablas de significado e historial de tiradas, con favoritas y gestos para borrar.",
          "Cinco temas visuales: Fantasía, Pulp, Moderno, Sci-fi y OSR.",
          "Se instala como una app más y funciona sin conexión.",
        ],
      },
      en: {
        title: "Chapter I · The first roll",
        intro: "Every adventure starts with a question.",
        items: [
          "The Recluse oracle answers Yes, No or Contradiction, with its nuances.",
          "Meaning tables and a roll history, with favorites and swipe-to-delete.",
          "Five visual themes: Fantasy, Pulp, Modern, Sci-fi and OSR.",
          "Installs like any other app and works offline.",
        ],
      },
    },
  },
];
