import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchEvents = async (query = '') => {
    setLoading(true);
    try {
      let url = `${API_BASE}/events`;
      if (query) url += `?location=${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('API Request Failed');
      
      const data = await response.json();
      setEvents(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error fetching data. Ensure backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchEvents(searchQuery);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const getTagStyles = (status, message) => {
    if (status === 'VERIFIED' || message?.includes('100%')) return 'bg-[#2ecc71]/20 text-[#2ecc71]';
    if (status === 'HIGH_POSSIBILITY' || message?.includes('High Possibility')) return 'bg-[#f1c40f]/20 text-[#f1c40f]';
    if (status === 'FLAGGED') return 'bg-[#e74c3c]/40 text-[#e74c3c]';
    return 'bg-[#e74c3c]/20 text-[#e74c3c]';
  };

  const getStatusIcon = (status, message) => {
    if (status === 'VERIFIED' || message?.includes('100%')) return <CheckCircle className="w-4 h-4" />;
    if (status === 'HIGH_POSSIBILITY' || message?.includes('High Possibility')) return <AlertCircle className="w-4 h-4" />;
    if (status === 'FLAGGED') return <XCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  // Calculate stats for charts
  const trustCounts = { Verified: 0, 'High Possibility': 0, 'Manual Check': 0, Unconfirmed: 0 };
  const typeCounts = {};
  
  events.forEach(e => {
    if (e.status === 'VERIFIED' || e.reliability_message?.includes("100%")) trustCounts.Verified++;
    else if (e.status === 'HIGH_POSSIBILITY' || e.reliability_message?.includes("High Possibility")) trustCounts['High Possibility']++;
    else if (e.status === 'FLAGGED') trustCounts['Manual Check']++;
    else trustCounts.Unconfirmed++;

    const t = e.disaster_type || 'Unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-[#ecf0f1] py-8">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold mb-6">Global Disaster Filter</h2>
        
        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by Location (e.g., Mumbai, New York)..."
            className="w-full max-w-xl bg-[#16213e] border border-white/10 rounded-full px-6 py-4 text-lg text-white outline-none focus:border-[#e94560] transition-colors"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#16213e] rounded-xl p-4 border border-white/5">
            <div className="text-3xl font-bold text-[#2ecc71]">{trustCounts.Verified}</div>
            <div className="text-sm text-[#a0a0a0]">Verified</div>
          </div>
          <div className="bg-[#16213e] rounded-xl p-4 border border-white/5">
            <div className="text-3xl font-bold text-[#3498db]">{trustCounts['High Possibility']}</div>
            <div className="text-sm text-[#a0a0a0]">High Possibility</div>
          </div>
          <div className="bg-[#16213e] rounded-xl p-4 border border-white/5">
            <div className="text-3xl font-bold text-[#f1c40f]">{trustCounts['Manual Check']}</div>
            <div className="text-sm text-[#a0a0a0]">Manual Check</div>
          </div>
          <div className="bg-[#16213e] rounded-xl p-4 border border-white/5">
            <div className="text-3xl font-bold text-[#e74c3c]">{trustCounts.Unconfirmed}</div>
            <div className="text-sm text-[#a0a0a0]">Unconfirmed</div>
          </div>
        </div>

        {/* Disaster Types */}
        {Object.keys(typeCounts).length > 0 && (
          <div className="bg-[#16213e] rounded-xl p-6 border border-white/5 mb-8">
            <h3 className="font-bold mb-4">Disaster Types</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(typeCounts).map(([type, count]) => (
                <span key={type} className="bg-[#e94560]/20 text-[#e94560] px-4 py-2 rounded-full text-sm font-medium">
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Google Integration Banner */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-4 rounded-xl border border-[#4285F4]/30 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#4285F4]">POWERED BY GOOGLE</span>
            <span className="text-sm text-[#a0a0a0]">FloodHub • Maps Platform • Public Alerts API</span>
          </div>
          <div className="flex items-center gap-2 text-[#34a853] text-sm font-bold">
            <span className="w-2 h-2 bg-[#34a853] rounded-full animate-pulse"></span>
            LIVE CONNECTED
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-white/10 border-t-[#e94560] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12 text-[#e74c3c]">{error}</div>
        )}

        {/* Events Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.length === 0 ? (
              <p className="col-span-full text-center text-[#a0a0a0]">No active incidents found matching criteria.</p>
            ) : (
              events.map((event, idx) => (
                <div key={idx} className="bg-[#16213e] rounded-xl p-6 border border-white/5 hover:border-[#e94560] transition-all hover:-translate-y-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1 ${getTagStyles(event.status, event.reliability_message)}`}>
                        {getStatusIcon(event.status, event.reliability_message)}
                        {event.disaster_type}
                      </span>
                      <span className="text-sm text-[#a0a0a0] flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                    </div>
                    <p className="text-[#a0a0a0] mb-4">{event.reliability_message}</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#e94560]">{event.confirming_sources_count}</div>
                    <div className="text-xs text-[#a0a0a0] uppercase tracking-wide">Sources Confirming</div>
                    <div className="text-sm text-[#a0a0a0] mt-1">Confidence: {event.confidence_score}%</div>
                    {event.source_urls && event.source_urls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <small className="text-[#a0a0a0]">
                          Confirmed by: {event.source_urls.slice(0, 2).join(', ')}
                          {event.source_urls.length > 2 && '...'}
                        </small>
                      </div>
                    )}
                  </div>
                    <Link to={`/incident/${event.event_id}`} className="text-[#e94560] text-sm mt-3 inline-block">View details →</Link>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
