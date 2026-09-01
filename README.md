# Solo Compass

Compañero de mesa para partidas de rol en solitario: oráculo de sí/no,
tablas de significado y un historial de todo lo que has lanzado.
Funciona en el navegador, se puede instalar como PWA y no necesita
conexión ni servidor: todo se guarda en tu dispositivo.

## Oráculo Recluse

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
  estructura ya soporta d6, d66 y d20; solo hay que sustituir el texto de
  cada entrada en `src/lib/tables.ts`.
- **Historial**: todas las tiradas (oráculo y tablas), con filtro y borrado,
  persistidas en `localStorage`.

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

## Datos y privacidad

Todo el historial vive en el `localStorage` del navegador. No hay backend
ni sincronización: borrar los datos del sitio o cambiar de navegador
empieza un historial nuevo.
