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
