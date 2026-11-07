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
  /** ISO date (YYYY-MM-DD) of the release. */
  date: string;
  text: Record<Locale, { title: string; intro?: string; items: string[] }>;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
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
        ],
      },
    },
  },
  {
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
    date: "2026-11-03",
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
    date: "2026-10-22",
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
    date: "2026-09-26",
    text: {
      es: {
        title: "Interludio · Afilando las armas",
        items: [
          "La pestaña en la que estás se marca con una píldora, no solo con color: en los temas casi sin color también se distingue.",
          "El panel para escribir en el diario se asienta mejor sobre el menú inferior.",
        ],
      },
      en: {
        title: "Interlude · Sharpening the blades",
        items: [
          "The tab you're on is marked with a pill, not just color: it stands out even in the nearly colorless themes.",
          "The journal's writing panel sits more snugly on top of the bottom menu.",
        ],
      },
    },
  },
  {
    date: "2026-09-07",
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
    date: "2026-09-06",
    text: {
      es: {
        title: "Capítulo III · Tinta y pergamino",
        items: [
          "Nace el diario de aventuras, escrito en notación Lonelog.",
          "Las tiradas del oráculo y de las tablas se apuntan solas en tu aventura activa.",
          "Selector de oráculos, listo para cuando lleguen más compañeros de viaje.",
          "El historial se guarda en un cofre mucho más grande del navegador.",
        ],
      },
      en: {
        title: "Chapter III · Ink and parchment",
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
    date: "2026-09-03",
    text: {
      es: {
        title: "Capítulo II · Mapas y lenguas",
        items: [
          "Las tablas muestran a qué juego pertenecen, todos sus resultados posibles, un buscador y tus favoritas.",
          "La app habla español e inglés, y elige sola según tu navegador.",
          "Mil pequeños retoques: respuestas que ya no se salen de la tarjeta y matices del oráculo más claros.",
        ],
      },
      en: {
        title: "Chapter II · Maps and tongues",
        items: [
          "Tables show which game they belong to, every possible result, a search box and your favorites.",
          "The app speaks Spanish and English, and picks one based on your browser.",
          "A thousand small touches: answers no longer spill out of their card and the oracle's nuances read clearer.",
        ],
      },
    },
  },
  {
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
