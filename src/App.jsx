import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ShelvingPage from './pages/ShelvingPage'
import ShelvingInput from './pages/ShelvingInput'
import UnshelvingPage from './pages/UnshelvingPage'
import ReturnDashboard from './pages/ReturnDashboard'
import LocationManagement from './pages/LocationManagement'
import CenterReturnManagement from './pages/CenterReturnManagement'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shelving" element={<ShelvingPage />} />
          <Route path="/shelving/:locationId" element={<ShelvingInput />} />
          <Route path="/unshelving" element={<UnshelvingPage />} />
          <Route path="/return-dashboard" element={<ReturnDashboard />} />
          <Route path="/return-dashboard/location-management" element={<LocationManagement />} />
          <Route path="/return-dashboard/center-return" element={<CenterReturnManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

