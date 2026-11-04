import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Early on purpose: catches the browser's install event (see lib/install.ts).
import './lib/install'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
