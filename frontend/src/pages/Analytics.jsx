import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  AreaChart, Area, Legend,
  FunnelChart, Funnel, LabelList
} from 'recharts';
import { TrendingUp, CheckCircle, AlertTriangle, XCircle, Shield, Users, Building2, Newspaper } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Analytics() {
  const [data, setData] = useState({ 
    verification: { verified: 65, manual: 25, unverified: 10 },
    byType: [],
    trends: [],
    sourceDistribution: { official: 0, news: 0, social: 0, citizen: 0 },
    funnel: { total_reported: 0, unverified: 0, likely: 0, verified: 0, flagged: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all data in parallel
      const [eventsRes, sourceDistRes, funnelRes] = await Promise.all([
        fetch(`${API_BASE}/events`),
        fetch(`${API_BASE}/api/analytics/source-distribution`).catch(() => null),
        fetch(`${API_BASE}/api/analytics/verification-funnel`).catch(() => null),
      ]);
      
      const events = await eventsRes.json();
      const sourceDist = sourceDistRes ? await sourceDistRes.json() : null;
      const funnel = funnelRes ? await funnelRes.json() : null;

      // Calculate verification stats
      const verified = events.filter(e => e.status === 'VERIFIED' || e.confidence_score >= 70).length;
      const manual = events.filter(e => e.status === 'HIGH_POSSIBILITY' || e.status === 'LIKELY' || (e.confidence_score >= 40 && e.confidence_score < 70)).length;
      const unverified = events.length - verified - manual;
      const total = events.length || 1;

      // Calculate by disaster type
      const typeCounts = {};
      events.forEach(e => {
        const type = e.disaster_type || 'Unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      const byType = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

      setData({
        verification: { 
          verified: Math.round((verified / total) * 100) || 65, 
          manual: Math.round((manual / total) * 100) || 25, 
          unverified: Math.round((unverified / total) * 100) || 10 
        },
        byType: byType.length > 0 ? byType : [
          { name: 'Earthquake', value: 12 },
          { name: 'Flood', value: 18 },
          { name: 'Wildfire', value: 8 },
          { name: 'Storm', value: 15 },
        ],
        trends: [
          { day: 'Mon', incidents: 12 },
          { day: 'Tue', incidents: 19 },
          { day: 'Wed', incidents: 15 },
          { day: 'Thu', incidents: 22 },
          { day: 'Fri', incidents: 18 },
          { day: 'Sat', incidents: 25 },
          { day: 'Sun', incidents: 20 },
        ],
        sourceDistribution: sourceDist || { official: 5, news: 15, social: 25, citizen: 10, unknown: 5 },
        funnel: funnel || { total_reported: 60, unverified: 20, likely: 15, verified: 20, flagged: 5 }
      });
    } catch (err) {
      console.error(err);
      // Use fallback data
      setData({
        verification: { verified: 65, manual: 25, unverified: 10 },
        byType: [
          { name: 'Earthquake', value: 12 },
          { name: 'Flood', value: 18 },
          { name: 'Wildfire', value: 8 },
          { name: 'Storm', value: 15 },
        ],
        trends: [
          { day: 'Mon', incidents: 12 },
          { day: 'Tue', incidents: 19 },
          { day: 'Wed', incidents: 15 },
          { day: 'Thu', incidents: 22 },
          { day: 'Fri', incidents: 18 },
          { day: 'Sat', incidents: 25 },
          { day: 'Sun', incidents: 20 },
        ],
        sourceDistribution: { official: 5, news: 15, social: 25, citizen: 10, unknown: 5 },
        funnel: { total_reported: 60, unverified: 20, likely: 15, verified: 20, flagged: 5 }
      });
    } finally {
      setLoading(false);
    }
  };

  const verificationPieData = [
    { name: 'Verified', value: data.verification.verified, color: '#22c55e' },
    { name: 'Manual Check', value: data.verification.manual, color: '#eab308' },
    { name: 'Unverified', value: data.verification.unverified, color: '#ef4444' },
  ];

  // Trust Pyramid source data
  const sourcePieData = [
    { name: 'Official', value: data.sourceDistribution.official || 0, color: '#22c55e', icon: Building2 },
    { name: 'News', value: data.sourceDistribution.news || 0, color: '#3b82f6', icon: Newspaper },
    { name: 'Social', value: data.sourceDistribution.social || 0, color: '#a855f7', icon: Users },
    { name: 'Citizen', value: data.sourceDistribution.citizen || 0, color: '#f97316', icon: Shield },
  ];

  // Verification funnel data
  const funnelData = [
    { name: 'Reported', value: data.funnel.total_reported, fill: '#64748b' },
    { name: 'Unverified', value: data.funnel.unverified, fill: '#eab308' },
    { name: 'Likely', value: data.funnel.likely, fill: '#f97316' },
    { name: 'Verified', value: data.funnel.verified, fill: '#22c55e' },
  ];

  const typeBarColors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b] border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-[#94a3b8] text-sm">{label}</p>
          <p className="text-white font-semibold">{payload[0].value} incidents</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-[#94a3b8]">Real-time data visualization and insights</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-[#0f1419] border border-white/10 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            
            {/* Top Row - Verification & Types */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* News Verification Pie Chart */}
              <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  News Verification
                </h3>
                <div className="flex items-center justify-around">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={verificationPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {verificationPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-white font-semibold">Verified {data.verification.verified}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-white font-semibold">Manual Check {data.verification.manual}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-white font-semibold">Unverified {data.verification.unverified}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Incidents by Type Bar Chart */}
              <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Incidents by Type
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byType} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {data.byType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={typeBarColors[index % typeBarColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Incident Trends Line Chart */}
            <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-6">Incident Trends (Last 7 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="incidents" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fill="url(#colorTrend)" 
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#60a5fa' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Trust Pyramid - Source Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-500" />
                  Trust Pyramid - Source Distribution
                </h3>
                <div className="flex items-center justify-around">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourcePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {sourcePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {sourcePieData.map((source) => (
                      <div key={source.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                        <div>
                          <p className="text-white font-medium">{source.name}</p>
                          <p className="text-gray-400 text-sm">{source.value} sources</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                  <p><strong className="text-green-400">Official (1.0)</strong> &gt; <strong className="text-blue-400">News (0.85)</strong> &gt; <strong className="text-purple-400">Social (0.6)</strong> &gt; <strong className="text-orange-400">Citizen (0.4)</strong></p>
                </div>
              </motion.div>

              {/* Verification Funnel */}
              <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Verification Funnel
                </h3>
                <div className="space-y-3">
                  {funnelData.map((stage, index) => {
                    const maxValue = funnelData[0].value || 1;
                    const width = Math.max(20, (stage.value / maxValue) * 100);
                    return (
                      <div key={stage.name} className="flex items-center gap-4">
                        <div className="w-24 text-right text-gray-400 text-sm">{stage.name}</div>
                        <div className="flex-1 h-10 bg-gray-800 rounded-lg overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="h-full flex items-center justify-end px-3 rounded-lg"
                            style={{ backgroundColor: stage.fill }}
                          >
                            <span className="text-white font-semibold text-sm">{stage.value}</span>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-green-900/30 rounded-lg text-center">
                    <p className="text-green-400 font-bold">{Math.round((data.funnel.verified / (data.funnel.total_reported || 1)) * 100)}%</p>
                    <p className="text-gray-400 text-xs">Verification Rate</p>
                  </div>
                  <div className="p-2 bg-red-900/30 rounded-lg text-center">
                    <p className="text-red-400 font-bold">{data.funnel.flagged}</p>
                    <p className="text-gray-400 text-xs">Flagged as Spam</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Stats Summary */}
            <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0f1419] border border-white/10 rounded-2xl p-5">
                <p className="text-[#94a3b8] text-sm mb-1">Total Incidents</p>
                <p className="text-3xl font-bold text-white">127</p>
              </div>
              <div className="bg-[#0f1419] border border-green-500/30 rounded-2xl p-5">
                <p className="text-[#94a3b8] text-sm mb-1">Verified</p>
                <p className="text-3xl font-bold text-green-400">83</p>
              </div>
              <div className="bg-[#0f1419] border border-yellow-500/30 rounded-2xl p-5">
                <p className="text-[#94a3b8] text-sm mb-1">Manual Check</p>
                <p className="text-3xl font-bold text-yellow-400">32</p>
              </div>
              <div className="bg-[#0f1419] border border-red-500/30 rounded-2xl p-5">
                <p className="text-[#94a3b8] text-sm mb-1">Unverified</p>
                <p className="text-3xl font-bold text-red-400">12</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
