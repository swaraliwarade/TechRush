import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { applyTheme, getStoredTheme } from '@/lib/theme'
import './index.css'

// Apply the saved theme before first paint so the app never flashes dark.
applyTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
