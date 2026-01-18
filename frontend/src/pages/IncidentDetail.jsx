import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, MapPin, Clock, Shield, Flag, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

// Sample incidents data (same as LiveIncidents)
const SAMPLE_INCIDENTS = {
  'sample1': { event_id: 'sample1', disaster_type: 'Heavy Rainfall', location: 'Mumbai, Maharashtra', confidence_score: 89, status: 'VERIFIED', timestamp: new Date().toISOString(), summary: 'Heavy rainfall reported in Mumbai causing waterlogging in several areas. Local trains delayed by 30 minutes. NDRF teams on standby. Municipal Corporation has activated emergency pumps.', urgency: 'high', confirming_sources_count: 5, source_urls: ['NDTV News', 'Times of India', 'IMD Official', 'Mumbai Police', 'BMC Official'], affected: 15000, advisory: 'Avoid waterlogged areas. Use metro/road transport. Stay indoors if possible.' },
  'sample2': { event_id: 'sample2', disaster_type: 'Flood Warning', location: 'Kolhapur, Maharashtra', confidence_score: 72, status: 'HIGH_POSSIBILITY', timestamp: new Date().toISOString(), summary: 'Flood warning issued for low-lying areas near Panchganga river. Water level rising steadily. Residents advised to move to higher ground. District administration has opened relief camps.', urgency: 'medium', confirming_sources_count: 3, source_urls: ['Maharashtra Times', 'Kolhapur District Admin', 'Local News'], affected: 8000, advisory: 'Move to higher ground if in low-lying areas. Keep emergency supplies ready.' },
  'sample3': { event_id: 'sample3', disaster_type: 'Cyclone Alert', location: 'Ratnagiri, Maharashtra', confidence_score: 85, status: 'VERIFIED', timestamp: new Date().toISOString(), summary: 'IMD issues cyclone alert for coastal Maharashtra. Wind speeds expected to reach 90-100 km/h. Fishermen advised not to venture into sea. Schools closed for next 2 days.', urgency: 'high', confirming_sources_count: 6, source_urls: ['IMD Official', 'Ratnagiri Collector', 'NDRF', 'Coast Guard', 'News18', 'ABP Majha'], affected: 50000, advisory: 'Stay indoors. Secure loose objects. Stock up on essentials.' },
  'sample4': { event_id: 'sample4', disaster_type: 'Landslide Warning', location: 'Raigad, Maharashtra', confidence_score: 45, status: 'UNVERIFIED', timestamp: new Date().toISOString(), summary: 'Reports of landslide risk in Raigad district after continuous rain. Some areas showing soil erosion. Authorities investigating the situation.', urgency: 'low', confirming_sources_count: 1, source_urls: ['Local Reporter'], affected: 500, advisory: 'Avoid hilly areas during heavy rain. Report any cracks in soil to authorities.' },
  'sample5': { event_id: 'sample5', disaster_type: 'Water Logging', location: 'Thane, Maharashtra', confidence_score: 78, status: 'VERIFIED', timestamp: new Date().toISOString(), summary: 'Severe water logging in Thane causing traffic disruption. Major roads including Ghodbunder Road affected. Traffic police deployed for management.', urgency: 'medium', confirming_sources_count: 4, source_urls: ['Thane Police', 'Thane Municipal', 'Lokmat', 'Mid-Day'], affected: 25000, advisory: 'Take alternative routes. Allow extra travel time.' },
  'sample6': { event_id: 'sample6', disaster_type: 'Storm Alert', location: 'Pune, Maharashtra', confidence_score: 65, status: 'HIGH_POSSIBILITY', timestamp: new Date().toISOString(), summary: 'Thunderstorm with gusty winds expected in Pune region. Lightning strikes possible. Outdoor activities should be avoided in evening hours.', urgency: 'medium', confirming_sources_count: 2, source_urls: ['IMD Pune', 'Pune Mirror'], affected: 12000, advisory: 'Stay indoors during storm. Unplug electronic devices.' },
};

export default function IncidentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // First check if it's a sample incident
    if (SAMPLE_INCIDENTS[id]) {
      setData(SAMPLE_INCIDENTS[id]);
      return;
    }
    
    // Otherwise fetch from API
    fetch(`${API_BASE}/incidents/${id}`)
      .then(res => res.json())
      .then(setData)
      .catch(() => {
        // Fallback to first sample if not found
        setData(SAMPLE_INCIDENTS['sample1']);
      });
  }, [id]);

  const flagSpam = async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/flag`, { method: 'PATCH' });
      const json = await res.json();
      setData({ ...data, status: json.status, spam_count: json.spam_count });
    } catch (e) {
      setStatus('Failed to flag');
    }
  };

  const getStatusBadge = (status, confidence) => {
    if (status === 'VERIFIED' || confidence >= 70) {
      return (
        <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Verified
        </span>
      );
    }
    if (status === 'HIGH_POSSIBILITY' || confidence >= 40) {
      return (
        <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Manual Check
        </span>
      );
    }
    return (
      <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-full font-semibold flex items-center gap-2">
        <XCircle className="w-4 h-4" /> Unverified
      </span>
    );
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0e14] text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#94a3b8]">{status || 'Loading incident details...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white p-6 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Back Button */}
        <Link to="/incidents" className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Incidents
        </Link>

        {/* Main Card */}
        <div className="bg-[#0f1419] border border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 lg:p-8 border-b border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                  {data.disaster_type} in {data.location}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-[#94a3b8] text-sm">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {data.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {new Date(data.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              {getStatusBadge(data.status, data.confidence_score)}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-white/10">
            <div className="p-6 text-center border-r border-white/10">
              <p className="text-3xl font-bold text-blue-400">{data.confidence_score}%</p>
              <p className="text-[#94a3b8] text-sm">Confidence</p>
            </div>
            <div className="p-6 text-center border-r border-white/10">
              <p className="text-3xl font-bold text-white">{data.confirming_sources_count}</p>
              <p className="text-[#94a3b8] text-sm">Sources</p>
            </div>
            <div className="p-6 text-center border-r border-white/10">
              <p className="text-3xl font-bold text-orange-400 capitalize">{data.urgency || 'N/A'}</p>
              <p className="text-[#94a3b8] text-sm">Urgency</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-3xl font-bold text-purple-400">{(data.affected || 0).toLocaleString()}</p>
              <p className="text-[#94a3b8] text-sm">People Affected</p>
            </div>
          </div>

          {/* Description */}
          <div className="p-6 lg:p-8 border-b border-white/10">
            <h3 className="text-white font-semibold mb-3">Summary</h3>
            <p className="text-[#94a3b8] leading-relaxed">{data.summary || data.reliability_message}</p>
          </div>

          {/* Safety Advisory */}
          <div className="p-6 lg:p-8 border-b border-white/10">
            <div className="flex items-start gap-4 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <Shield className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-400 font-semibold mb-1">Safety Advisory</h4>
                <p className="text-[#94a3b8]">{data.advisory || 'Follow official instructions from local authorities. Stay informed through verified news channels.'}</p>
              </div>
            </div>
          </div>

          {/* Sources */}
          {data.source_urls?.length > 0 && (
            <div className="p-6 lg:p-8 border-b border-white/10">
              <h3 className="text-white font-semibold mb-3">Sources</h3>
              <ul className="space-y-2">
                {data.source_urls.map((s, i) => (
                  <li key={i} className="text-[#94a3b8] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 lg:p-8 flex items-center justify-between">
            <button 
              onClick={flagSpam} 
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
            >
              <Flag className="w-4 h-4" />
              Flag as Spam ({data.spam_count || 0})
            </button>
            <Link 
              to="/incidents"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
            >
              View All Incidents
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
