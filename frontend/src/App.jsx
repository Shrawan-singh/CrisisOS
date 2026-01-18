import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import SearchNews from './pages/SearchNews';
import LiveIncidents from './pages/LiveIncidents';
import Analytics from './pages/Analytics';
import IncidentDetail from './pages/IncidentDetail';
import CitizenCam from './pages/CitizenCam';
import MapView from './pages/MapView';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0e14] text-white flex">
        <Sidebar />
        {/* Main content - responsive margins for mobile/desktop */}
        <main className="flex-1 ml-0 md:ml-20 lg:ml-64 min-h-screen pt-14 md:pt-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchNews />} />
            <Route path="/incidents" element={<LiveIncidents />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/citizen-cam" element={<CitizenCam />} />
            <Route path="/incident/:id" element={<IncidentDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
