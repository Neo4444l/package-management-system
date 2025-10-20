import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LanguageProvider } from './contexts/LanguageContext'
import { UserProvider } from './contexts/UserContext'
import { CityProvider } from './contexts/CityContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <UserProvider>
        <CityProvider>
          <App />
        </CityProvider>
      </UserProvider>
    </LanguageProvider>
  </React.StrictMode>,
)


