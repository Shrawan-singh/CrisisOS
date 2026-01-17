import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

// Sample fallback data - India/Maharashtra focused
const sampleIncidents = [
  { event_id: 'sample1', disaster_type: 'Heavy Rainfall', location: 'Mumbai, Maharashtra', confidence_score: 89, status: 'VERIFIED', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400' },
  { event_id: 'sample2', disaster_type: 'Flood Warning', location: 'Kolhapur, Maharashtra', confidence_score: 72, status: 'HIGH_POSSIBILITY', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400' },
  { event_id: 'sample3', disaster_type: 'Cyclone Alert', location: 'Ratnagiri, Maharashtra', confidence_score: 85, status: 'VERIFIED', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1527482937786-6f0f26a57ead?w=400' },
  { event_id: 'sample4', disaster_type: 'Landslide Warning', location: 'Raigad, Maharashtra', confidence_score: 45, status: 'UNVERIFIED', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 }
};

export default function LiveIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      setIncidents(data.length > 0 ? data : sampleIncidents);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
      setIncidents(sampleIncidents);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, confidence) => {
    if (status === 'VERIFIED' || confidence >= 70) {
      return (
        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Verified
        </span>
      );
    }
    if (status === 'HIGH_POSSIBILITY' || confidence >= 40) {
      return (
        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Manual Check
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> ⚠️ Flagged as Fake
      </span>
    );
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Live Incidents</h1>
            <p className="text-[#94a3b8] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchIncidents(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f1419] border border-white/10 rounded-xl text-[#94a3b8] hover:text-white hover:border-blue-500/50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </motion.div>

        {/* Incidents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-[#0f1419] border border-white/10 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div 
            variants={container} 
            initial="hidden" 
            animate="show" 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {incidents.map((incident) => (
              <motion.div key={incident.event_id} variants={item}>
                <Link 
                  to={`/incident/${incident.event_id}`}
                  className="block bg-[#0f1419] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all group"
                >
                  {/* Image */}
                  <div className="h-40 bg-gradient-to-br from-[#1a1f26] to-[#0f1419] relative overflow-hidden">
                    {incident.image ? (
                      <img 
                        src={incident.image} 
                        alt={incident.disaster_type}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <AlertTriangle className="w-16 h-16 text-[#1a1f26]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419] to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-bold text-lg">{incident.disaster_type}</h3>
                        <p className="text-[#94a3b8] text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> in {incident.location}
                        </p>
                      </div>
                      {getStatusBadge(incident.status, incident.confidence_score)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-3xl font-bold ${getConfidenceColor(incident.confidence_score)}`}>
                        {incident.confidence_score}%
                      </span>
                      <span className="text-[#64748b] text-xs">
                        {new Date(incident.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
