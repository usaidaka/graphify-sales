import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GraphDataProvider } from './context/GraphDataContext'
import { UIProvider } from './context/UIContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <GraphDataProvider>
        <App />
      </GraphDataProvider>
    </UIProvider>
  </StrictMode>,
)

