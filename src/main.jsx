import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LanguageProvider } from './contexts/LanguageContext'
import { CityProvider } from './contexts/CityContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <CityProvider>
        <App />
      </CityProvider>
    </LanguageProvider>
  </React.StrictMode>,
)


