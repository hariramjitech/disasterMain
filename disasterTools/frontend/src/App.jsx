import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SideBar from './components/SideBar.jsx'
import Home from './pages/Home.jsx'
import Emergency from './pages/Emergency.jsx'
import About from './pages/About.jsx'
import P2PDisasterChat from './pages/P2PDisasterChat.jsx'
import OfflineMap from './pages/OfflineMap.jsx'
import CapAlertsMap from './pages/CapAlertsMap.jsx'
import TripHelp from './pages/TripHelp.jsx'



export default function App() {
  return (
    <Router>
      <div className="h-screen flex overflow-hidden bg-gray-100">
        <SideBar />
        <main className="flex-1 relative overflow-auto md:ml-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/about" element={<About />} />
            <Route path="/p2pchat" element={<P2PDisasterChat />} />
            <Route path="/map" element={<OfflineMap />} />
            <Route path='/capalerts' element={<CapAlertsMap />} />
            <Route path='/triphelp' element={<TripHelp />} />
           
          </Routes>
        </main>
      </div>
    </Router>
  )
}