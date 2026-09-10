import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Admin from './AdminPage'
import './index.css'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <Admin />
  </StrictMode>
)
