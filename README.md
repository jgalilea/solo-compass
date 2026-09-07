# Solo Compass

Compañero de mesa para partidas de rol en solitario: oráculo de sí/no,
tablas de significado y un historial de todo lo que has lanzado.
Funciona en el navegador, se puede instalar como PWA y no necesita
conexión ni servidor: todo se guarda en tu dispositivo.

## Oráculos

El badge junto al título "Oráculo" es un selector (`src/lib/oracles.ts`
+ `OracleSwitcher`): de momento solo hay uno registrado, pero la
estructura ya soporta añadir más (cada uno con su propio nombre, autor,
licencia y enlace) sin tocar el resto de la app. Cuando llegue un
segundo oráculo con reglas propias, `OracleView` pasará a despachar
según el id seleccionado; hoy la mecánica de tirada sigue siendo
específica de Recluse.

### Recluse

Implementa el oráculo [**Recluse**](https://gravenutterance.itch.io/recluse)
de Graven Utterance (Oliver N), publicado bajo licencia
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/):

- Se lanza un dado blanco y uno negro. Blanco más alto → **Sí**. Negro más
  alto → **No**.
- Si ambos dados comparados son bajos (≤3) la respuesta lleva un **"pero"**;
  si ambos son altos (≥4), lleva un **"y"**.
- Si empatan, hay una **contradicción**: alguna premisa de la pregunta es
  errónea y toca replantearla.
- Para sucesos más o menos probables se añaden dados extra del color
  favorecido, quedándose solo con el más alto de ese color.

## Vistas

- **Oráculo** (principal): pregunta, probabilidad y lanzamiento.
- **Tablas**: tablas de significado con contenido de ejemplo — la
  estructura ya soporta d6, d66 y d20, un indicativo de juego/sistema con
  enlace opcional (`game`), favoritas y buscador; solo hay que sustituir el
  texto de cada entrada (y el `game` real) en `src/lib/tables.ts`. El botón
  con el tipo de dado abre la lista completa de resultados posibles.
- **Diario**: aventuras con un registro narrativo en notación
  [Lonelog](https://lonelog.itch.io/lonelog) (ver más abajo). Con una
  aventura activa, las tiradas del oráculo y de las tablas se apuntan
  solas; el oráculo además ofrece un pequeño campo para añadir la
  consecuencia (`=>`) justo después de tirar. Exporta cada aventura a
  `.md` o importa un diario existente en formato Lonelog. La lista de
  aventuras (`/diario`) y el contenido de cada una (`/diario/:id`) son
  pantallas separadas, así que las sesiones de la aventura abierta
  nunca compiten por espacio con la lista aunque haya muchas aventuras;
  la lista tiene buscador, pinea las favoritas arriba y deja pausar o
  archivar aventuras (las archivadas quedan en su propia sección
  plegada). Un indicador fijo en todas las pantallas recuerda cuál es
  la aventura activa y lleva directo a ella. El formulario manual solo
  ofrece Acción/Tirada/Consecuencia/Nota (no Pregunta, que ya cubre el
  oráculo del todo); al elegir "Tirada" aparece un roller de dados
  genérico (d4–d20, d% y 4dF, `src/lib/dice.ts`) para tiradas de tu
  propio sistema, agnóstico de reglas. Cualquier entrada (o el título
  de una sesión) se puede editar después de creada, no solo borrar.
- **Historial**: todas las tiradas (oráculo y tablas), con filtro y borrado,
  persistidas en IndexedDB (ver "Almacenamiento" más abajo).

## Diario y notación Lonelog

[Lonelog](https://lonelog.itch.io/lonelog) (Roberto Bisceglie, CC BY-SA
4.0) es un estándar abierto de texto plano para registrar sesiones de
rol en solitario, con cinco símbolos: `@` acción, `?` pregunta, `d:`
tirada (con el resultado inline vía `->`), `=>` consecuencia, y
`=== Título ===` para secciones. `src/lib/lonelog.ts` implementa el
formateo y el parseo en los dos sentidos:

- **Exportar** (`exportAdventureToMarkdown`) genera un `.md` con esas
  líneas más un crédito visible a Lonelog y a la app — un archivo
  válido para cualquier herramienta compatible (p. ej. el plugin de
  Obsidian), no solo para esta app.
- **Importar** (`parseMarkdownToEntries`) es deliberadamente permisivo:
  cualquier línea que no encaje con un símbolo reconocido (prosa
  suelta, etiquetas `[N:...]` de PNJ/lugar/reloj que Lonelog admite
  pero que esta app aún no interpreta) se guarda como nota en vez de
  romper la importación.

Aventuras y entradas del diario se guardan en IndexedDB (mismo motivo
que el historial). Qué aventura está activa es un dato pequeño y se
queda en `localStorage`.

## Idioma

Español e inglés, seleccionable desde el icono de idioma en la cabecera.
Por defecto se usa el idioma del navegador (español si empieza por "es",
inglés para cualquier otro caso); la elección manual se guarda en
`localStorage` y tiene prioridad sobre la detección. Los textos viven en
`src/lib/i18n/locales/{es,en}.ts`, con el mismo `Dictionary` tipado para
ambos (TypeScript avisa si falta una clave en alguno de los dos).

## Stack

TypeScript, React, React Router (`HashRouter`, compatible con GitHub
Pages sin configuración de servidor), Tailwind CSS v4 y Vite, con
`vite-plugin-pwa` para el soporte offline/instalable.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # compila a dist/
npm run preview  # sirve el build de producción
npm run lint      # oxlint
```

## Despliegue en GitHub Pages

El repo incluye un workflow (`.github/workflows/deploy.yml`) que compila y
publica `dist/` en GitHub Pages en cada push a `main` mediante
`actions/deploy-pages`.

Pasos únicos en GitHub, en **Settings → Pages**:

1. En "Build and deployment", selecciona **Source: GitHub Actions**.
2. Haz push a `main`; el workflow se encarga del resto.

La app quedará publicada en `https://<usuario>.github.io/solo-compass/`.

Si `base` en `vite.config.ts` no coincide con el nombre real del
repositorio, actualízalo antes de desplegar.

Alternativa manual (sin Actions): `npm run deploy`, que compila y publica
`dist/` en la rama `gh-pages` usando el paquete `gh-pages`.

## Almacenamiento

Todo vive en el navegador, sin backend ni sincronización — borrar los
datos del sitio o cambiar de navegador/dispositivo empieza de cero.

- **Historial** (`src/lib/history.ts`): en **IndexedDB** vía
  [`idb-keyval`](https://github.com/jakearchibald/idb-keyval), porque no
  tiene techo natural de tamaño y `localStorage` está limitado a ~5 MiB
  por origen — compartidos, además, con cualquier otra app en el mismo
  dominio (`usuario.github.io` es un origen único para todos los
  proyectos que cuelgan de ahí, con o sin ruta distinta). Si ya había
  historial guardado en `localStorage` de una versión anterior, se migra
  una vez sola a IndexedDB de forma automática y transparente.
- **Diario** (`src/lib/journal.ts`): aventuras y entradas también en
  IndexedDB, mismo motivo que el historial.
- **Tema, modo claro/oscuro, idioma, oráculo, tablas favoritas y
  aventura activa**: siguen en `localStorage`, por ser datos minúsculos
  y de lectura síncrona (el tema y el modo, en concreto, se leen antes
  del primer pintado para evitar parpadeos, algo que IndexedDB no
  permite al ser siempre asíncrono).

Como todo vive solo en el dispositivo, "Acerca de" (icono ⓘ del
encabezado) incluye una copia de seguridad completa: **exportar todo**
descarga un único `.json` con historial + diario + ajustes
(`src/lib/backup.ts`), y **restaurar copia** lo vuelve a cargar entero
(sustituyendo lo que hubiera, previa confirmación) recargando la app al
terminar para que todos los contextos reflejen los datos restaurados.
