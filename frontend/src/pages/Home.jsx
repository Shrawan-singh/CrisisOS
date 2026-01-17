import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, MapPin, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  const [stats, setStats] = useState({ total: 0, verified: 0, manual: 0, unverified: 0 });
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      
      const verified = data.filter(e => e.status === 'VERIFIED' || e.confidence_score >= 70).length;
      const manual = data.filter(e => e.status === 'HIGH_POSSIBILITY' || (e.confidence_score >= 40 && e.confidence_score < 70)).length;
      const unverified = data.length - verified - manual;
      
      setStats({ total: data.length, verified, manual, unverified });
      setRecentIncidents(data.slice(0, 3));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Verified', value: stats.verified || 1, color: '#22c55e' },
    { name: 'Manual Check', value: stats.manual || 1, color: '#eab308' },
    { name: 'Unverified', value: stats.unverified || 1, color: '#ef4444' },
  ];

  const trendData = [
    { day: 'Mon', incidents: 12 },
    { day: 'Tue', incidents: 19 },
    { day: 'Wed', incidents: 15 },
    { day: 'Thu', incidents: 22 },
    { day: 'Fri', incidents: 18 },
  ];

  const getStatusBadge = (status, confidence) => {
    if (status === 'VERIFIED' || confidence >= 70) {
      return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold">Verified</span>;
    }
    if (status === 'HIGH_POSSIBILITY' || confidence >= 40) {
      return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold">Manual Check</span>;
    }
    return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">Unverified</span>;
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] p-6 lg:p-8">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div variants={item} className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            Disaster Relief Resource Scout
          </h1>
          <p className="text-[#94a3b8] text-lg">
            Verifying disaster news using multiple trusted sources
          </p>
        </motion.div>

        {/* Dashboard Cards */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {recentIncidents.length > 0 ? recentIncidents.map((incident, idx) => (
            <Link 
              to={`/incident/${incident.event_id}`}
              key={idx} 
              className="bg-[#0f1419] border border-white/10 rounded-2xl p-5 hover:border-blue-500/50 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-white font-semibold">{incident.disaster_type}</span>
                <span className="text-[#94a3b8] text-sm">in {incident.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-white">{incident.confidence_score}%</span>
                {getStatusBadge(incident.status, incident.confidence_score)}
              </div>
            </Link>
          )) : (
            <>
              <div className="bg-[#0f1419] border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-white font-semibold">Earthquake</span>
                  <span className="text-[#94a3b8] text-sm">in California</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white">92%</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold">Verified</span>
                </div>
              </div>
              <div className="bg-[#0f1419] border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-white font-semibold">Flood</span>
                  <span className="text-[#94a3b8] text-sm">in Bangladesh</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white">76%</span>
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold">Manual Check</span>
                </div>
              </div>
              <div className="bg-[#0f1419] border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-white font-semibold">Wildfire</span>
                  <span className="text-[#94a3b8] text-sm">in Australia</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white">45%</span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">Unverified</span>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Charts Section */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Source Credibility Pie Chart */}
          <div className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Source Credibility</h3>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-[#94a3b8] text-sm">{stats.verified > 0 ? Math.round((stats.verified / Math.max(stats.total, 1)) * 100) : 67}% Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span className="text-[#94a3b8] text-sm">{stats.manual > 0 ? Math.round((stats.manual / Math.max(stats.total, 1)) * 100) : 22}% Manual Check</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span className="text-[#94a3b8] text-sm">{stats.unverified > 0 ? Math.round((stats.unverified / Math.max(stats.total, 1)) * 100) : 11}% Unverified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Line Chart */}
          <div className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Incident Trends</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="incidents" stroke="#3b82f6" strokeWidth={2} fill="url(#colorIncidents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Link to="/search" className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 hover:from-blue-500 hover:to-blue-600 transition-all">
            <h3 className="text-white font-bold text-lg mb-2">Search & Verify News</h3>
            <p className="text-blue-100/80 text-sm">Check if disaster news is real using multiple sources</p>
          </Link>
          <Link to="/incidents" className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 hover:from-orange-500 hover:to-red-500 transition-all">
            <h3 className="text-white font-bold text-lg mb-2">Live Incidents</h3>
            <p className="text-orange-100/80 text-sm">View real-time disaster reports worldwide</p>
          </Link>
          <Link to="/analytics" className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 hover:from-purple-500 hover:to-pink-500 transition-all">
            <h3 className="text-white font-bold text-lg mb-2">Analytics Dashboard</h3>
            <p className="text-purple-100/80 text-sm">Data visualization and trend analysis</p>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
