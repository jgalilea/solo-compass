import type { Locale } from "./i18n";

/**
 * Crónica de cambios visible en la app (Ajustes → Acerca de), escrita
 * para jugadores curiosos, no para desarrolladores: tono de partida de
 * rol, sin jerga técnica. La más reciente va primero.
 *
 * Es contenido, no textos de interfaz, así que vive aquí y no en los
 * diccionarios — pero sigue siendo bilingüe: cada entrada debe tener
 * los dos idiomas (TypeScript avisa si falta alguno).
 */

export interface ChangelogEntry {
  /** Fecha ISO (AAAA-MM-DD) de la versión. */
  date: string;
  text: Record<Locale, { title: string; intro?: string; items: string[] }>;
}

export const CHANGELOG: ChangelogEntry[] = [
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
