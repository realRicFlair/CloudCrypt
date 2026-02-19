import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Sofia" />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
