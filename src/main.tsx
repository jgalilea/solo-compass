import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Early on purpose: catches the browser's install event (see lib/install.ts).
import './lib/install'
import App from './App.tsx'
import { loadDictionary, loadLocale } from './lib/i18n'

// A new version was published while this tab had the old one open and
// one of its chunks is gone: reload into the new version (once, in case
// it's something else, like being offline without the service worker).
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('solo-compass:reloaded-for-update')) return
    sessionStorage.setItem('solo-compass:reloaded-for-update', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

// Only the language in use is downloaded; the screen waits for it.
// Not a top-level await: the dictionary's chunk imports from this one,
// which would never finish evaluating while waiting for it.
void loadDictionary(loadLocale()).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
