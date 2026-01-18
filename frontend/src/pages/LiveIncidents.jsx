import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, AlertTriangle, CheckCircle, RefreshCw, Eye, Users, ExternalLink, Filter, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

// Sample fallback data - India/Maharashtra focused
const sampleIncidents = [
  { event_id: 'sample1', disaster_type: 'Heavy Rainfall', location: 'Mumbai, Maharashtra', confidence_score: 89, status: 'VERIFIED', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400', summary: 'Heavy rainfall reported in Mumbai causing waterlogging in several areas.', urgency: 'high', confirming_sources_count: 5 },
  { event_id: 'sample2', disaster_type: 'Flood Warning', location: 'Kolhapur, Maharashtra', confidence_score: 72, status: 'HIGH_POSSIBILITY', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400', summary: 'Flood warning issued for low-lying areas near Panchganga river.', urgency: 'medium', confirming_sources_count: 3 },
  { event_id: 'sample3', disaster_type: 'Cyclone Alert', location: 'Ratnagiri, Maharashtra', confidence_score: 85, status: 'VERIFIED', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1527482937786-6f0f26a57ead?w=400', summary: 'IMD issues cyclone alert for coastal Maharashtra.', urgency: 'high', confirming_sources_count: 6 },
  { event_id: 'sample4', disaster_type: 'Landslide Warning', location: 'Raigad, Maharashtra', confidence_score: 45, status: 'UNVERIFIED', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400', summary: 'Reports of landslide risk in Raigad district after continuous rain.', urgency: 'low', confirming_sources_count: 1 },
  { event_id: 'sample5', disaster_type: 'Water Logging', location: 'Thane, Maharashtra', confidence_score: 78, status: 'VERIFIED', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1583245177184-18b01dca8756?w=400', summary: 'Severe water logging in Thane causing traffic disruption.', urgency: 'medium', confirming_sources_count: 4 },
  { event_id: 'sample6', disaster_type: 'Storm Alert', location: 'Pune, Maharashtra', confidence_score: 65, status: 'HIGH_POSSIBILITY', timestamp: new Date().toISOString(), image: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=400', summary: 'Thunderstorm with gusty winds expected in Pune region.', urgency: 'medium', confirming_sources_count: 2 },
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
  const [incidents, setIncidents] = useState(sampleIncidents);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [filter, setFilter] = useState('all'); // all, verified, unverified
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      // First try to get fresh data from API
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      
      // Filter for India/Maharashtra
      const indiaData = data.filter(inc => 
        inc.location?.toLowerCase().includes('india') || 
        inc.location?.toLowerCase().includes('maharashtra') ||
        inc.location?.toLowerCase().includes('mumbai') ||
        inc.location?.toLowerCase().includes('pune') ||
        inc.location?.toLowerCase().includes('thane') ||
        inc.location?.toLowerCase().includes('kolhapur') ||
        inc.location?.toLowerCase().includes('nagpur')
      );
      
      if (indiaData.length > 0) {
        setIncidents(indiaData);
      } else if (data.length > 0) {
        // If no India data, show all but limit to 8
        setIncidents(data.slice(0, 8));
      } else {
        // Use sample data if API returns empty
        setIncidents(sampleIncidents);
      }
      
      setLastRefresh(new Date());
      setRefreshCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      setIncidents(sampleIncidents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleManualRefresh = () => {
    fetchIncidents();
  };

  const getStatusBadge = (status, confidence) => {
    if (status === 'VERIFIED' || confidence >= 70) {
      return (
        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Verified
        </span>
      );
    }
    if (status === 'HIGH_POSSIBILITY' || status === 'LIKELY' || confidence >= 40) {
      return (
        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Needs Review
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> ⚠️ Flagged
      </span>
    );
  };

  const getUrgencyColor = (urgency) => {
    switch(urgency?.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      default: return 'bg-yellow-500';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Filter incidents
  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'verified') return inc.status === 'VERIFIED' || inc.confidence_score >= 70;
    if (filter === 'unverified') return inc.status !== 'VERIFIED' && inc.confidence_score < 70;
    return true;
  });

  // Stats
  const verifiedCount = incidents.filter(i => i.status === 'VERIFIED' || i.confidence_score >= 70).length;
  const unverifiedCount = incidents.length - verifiedCount;

  return (
    <div className="min-h-screen bg-[#0a0e14] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              Live Incidents
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </h1>
            <p className="text-[#94a3b8] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refresh every 30s
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded-xl text-white font-semibold transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </motion.div>

        {/* Stats Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-[#0f1419] border border-white/10 rounded-xl p-4">
            <p className="text-[#64748b] text-sm">Total Incidents</p>
            <p className="text-2xl font-bold text-white">{incidents.length}</p>
          </div>
          <div className="bg-[#0f1419] border border-green-500/30 rounded-xl p-4">
            <p className="text-green-400 text-sm">Verified</p>
            <p className="text-2xl font-bold text-green-400">{verifiedCount}</p>
          </div>
          <div className="bg-[#0f1419] border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm">Unverified</p>
            <p className="text-2xl font-bold text-red-400">{unverifiedCount}</p>
          </div>
          <div className="bg-[#0f1419] border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm">Refreshes</p>
            <p className="text-2xl font-bold text-blue-400">{refreshCount}</p>
          </div>
        </motion.div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-[#0f1419] text-[#94a3b8] border border-white/10'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            onClick={() => setFilter('verified')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'verified' ? 'bg-green-600 text-white' : 'bg-[#0f1419] text-[#94a3b8] border border-white/10'
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-1" /> Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setFilter('unverified')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'unverified' ? 'bg-red-600 text-white' : 'bg-[#0f1419] text-[#94a3b8] border border-white/10'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-1" /> Unverified ({unverifiedCount})
          </button>
        </div>

        {/* Incidents Grid */}
        {loading && incidents.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-[#0f1419] border border-white/10 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={filter + refreshCount}
              variants={container} 
              initial="hidden" 
              animate="show" 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredIncidents.map((incident) => (
                <motion.div key={incident.event_id} variants={item}>
                  <Link 
                    to={`/incident/${incident.event_id}`}
                    className="block bg-[#0f1419] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all group h-full"
                  >
                    {/* Image with Urgency Badge */}
                    <div className="h-36 bg-gradient-to-br from-[#1a1f26] to-[#0f1419] relative overflow-hidden">
                      {incident.image || incident.images_urls?.[0] ? (
                        <img 
                          src={incident.image || incident.images_urls?.[0]} 
                          alt={incident.disaster_type}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-900/20 to-red-900/20">
                          <AlertTriangle className="w-12 h-12 text-orange-500/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419] to-transparent" />
                      
                      {/* Urgency indicator */}
                      {incident.urgency && (
                        <div className={`absolute top-3 right-3 px-2 py-1 ${getUrgencyColor(incident.urgency)} text-white text-xs rounded font-semibold uppercase`}>
                          {incident.urgency} Urgency
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg">{incident.disaster_type}</h3>
                          <p className="text-[#94a3b8] text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {incident.location}
                          </p>
                        </div>
                        {getStatusBadge(incident.status, incident.confidence_score)}
                      </div>

                      {/* Summary */}
                      {incident.summary && (
                        <p className="text-[#64748b] text-sm mb-3 line-clamp-2">
                          {incident.summary}
                        </p>
                      )}

                      {/* Stats Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-bold ${getConfidenceColor(incident.confidence_score)}`}>
                            {incident.confidence_score}%
                          </span>
                          {incident.confirming_sources_count > 0 && (
                            <span className="text-[#64748b] text-xs flex items-center gap-1">
                              <Users className="w-3 h-3" /> {incident.confirming_sources_count} sources
                            </span>
                          )}
                        </div>
                        <span className="text-[#64748b] text-xs">
                          {new Date(incident.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* No Results */}
        {!loading && filteredIncidents.length === 0 && (
          <div className="bg-[#0f1419] border border-white/10 rounded-2xl p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-[#64748b] mx-auto mb-4" />
            <p className="text-white text-xl font-semibold mb-2">No incidents found</p>
            <p className="text-[#94a3b8]">Try changing the filter or refresh to get latest data</p>
          </div>
        )}
      </div>
    </div>
  );
}
