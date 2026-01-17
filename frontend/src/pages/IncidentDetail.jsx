import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, MapPin, Clock, Shield, Flag, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

export default function IncidentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/incidents/${id}`)
      .then(res => res.json())
      .then(setData)
      .catch(() => setStatus('Failed to load'));
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
          <div className="grid grid-cols-3 border-b border-white/10">
            <div className="p-6 text-center border-r border-white/10">
              <p className="text-3xl font-bold text-blue-400">{data.confidence_score}%</p>
              <p className="text-[#94a3b8] text-sm">Confidence</p>
            </div>
            <div className="p-6 text-center border-r border-white/10">
              <p className="text-3xl font-bold text-white">{data.confirming_sources_count}</p>
              <p className="text-[#94a3b8] text-sm">Sources</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-3xl font-bold text-orange-400">{data.urgency || 'N/A'}</p>
              <p className="text-[#94a3b8] text-sm">Urgency</p>
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
                <p className="text-[#94a3b8]">Follow official instructions from local authorities. Stay informed through verified news channels.</p>
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
