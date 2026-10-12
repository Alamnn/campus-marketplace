import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Reset any stored dark mode attributes to ensure permanent light mode
try {
  localStorage.removeItem('segi_theme_mode');
  document.documentElement.removeAttribute('data-theme');
} catch (e) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
