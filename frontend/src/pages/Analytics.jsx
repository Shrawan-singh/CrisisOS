import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  AreaChart, Area, Legend,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { TrendingUp, CheckCircle, AlertTriangle, XCircle, Shield, Users, Building2, Newspaper, Calendar, MapPin, RefreshCw, Filter, ChevronDown } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

// Maharashtra regions for filtering
const REGIONS = [
  { id: 'all', name: 'All Maharashtra' },
  { id: 'mumbai', name: 'Mumbai Metropolitan' },
  { id: 'pune', name: 'Pune Division' },
  { id: 'nashik', name: 'Nashik Division' },
  { id: 'nagpur', name: 'Nagpur Division' },
  { id: 'aurangabad', name: 'Aurangabad Division' },
  { id: 'amravati', name: 'Amravati Division' },
  { id: 'kolhapur', name: 'Kolhapur Division' },
  { id: 'konkan', name: 'Konkan Region' },
];

// Available years for filtering
const YEARS = [2024, 2023, 2022, 2021, 2020, 2019];

// Sample yearly data for Maharashtra
const YEARLY_DATA = {
  2024: {
    totalIncidents: 342,
    verified: 215,
    manual: 89,
    unverified: 38,
    byType: [
      { name: 'Flood', value: 125 },
      { name: 'Heavy Rainfall', value: 98 },
      { name: 'Landslide', value: 45 },
      { name: 'Cyclone', value: 32 },
      { name: 'Fire', value: 28 },
      { name: 'Drought', value: 14 },
    ],
    monthly: [
      { month: 'Jan', incidents: 15, verified: 10 },
      { month: 'Feb', incidents: 12, verified: 8 },
      { month: 'Mar', incidents: 18, verified: 14 },
      { month: 'Apr', incidents: 22, verified: 18 },
      { month: 'May', incidents: 28, verified: 20 },
      { month: 'Jun', incidents: 65, verified: 45 },
      { month: 'Jul', incidents: 85, verified: 58 },
      { month: 'Aug', incidents: 72, verified: 52 },
      { month: 'Sep', incidents: 45, verified: 32 },
      { month: 'Oct', incidents: 25, verified: 18 },
      { month: 'Nov', incidents: 18, verified: 12 },
      { month: 'Dec', incidents: 12, verified: 8 },
    ],
    regions: {
      mumbai: { incidents: 85, verified: 62, affected: 125000 },
      pune: { incidents: 52, verified: 38, affected: 45000 },
      nashik: { incidents: 38, verified: 25, affected: 28000 },
      nagpur: { incidents: 35, verified: 22, affected: 18000 },
      aurangabad: { incidents: 42, verified: 28, affected: 55000 },
      amravati: { incidents: 28, verified: 18, affected: 15000 },
      kolhapur: { incidents: 48, verified: 35, affected: 68000 },
      konkan: { incidents: 55, verified: 42, affected: 85000 },
    }
  },
  2023: {
    totalIncidents: 298,
    verified: 185,
    manual: 78,
    unverified: 35,
    byType: [
      { name: 'Flood', value: 115 },
      { name: 'Heavy Rainfall', value: 82 },
      { name: 'Landslide', value: 42 },
      { name: 'Cyclone', value: 25 },
      { name: 'Fire', value: 22 },
      { name: 'Drought', value: 12 },
    ],
    monthly: [
      { month: 'Jan', incidents: 12, verified: 8 },
      { month: 'Feb', incidents: 10, verified: 7 },
      { month: 'Mar', incidents: 15, verified: 11 },
      { month: 'Apr', incidents: 18, verified: 14 },
      { month: 'May', incidents: 25, verified: 18 },
      { month: 'Jun', incidents: 58, verified: 40 },
      { month: 'Jul', incidents: 78, verified: 52 },
      { month: 'Aug', incidents: 65, verified: 45 },
      { month: 'Sep', incidents: 38, verified: 28 },
      { month: 'Oct', incidents: 22, verified: 15 },
      { month: 'Nov', incidents: 15, verified: 10 },
      { month: 'Dec', incidents: 10, verified: 6 },
    ],
    regions: {
      mumbai: { incidents: 72, verified: 52, affected: 98000 },
      pune: { incidents: 45, verified: 32, affected: 38000 },
      nashik: { incidents: 32, verified: 22, affected: 22000 },
      nagpur: { incidents: 28, verified: 18, affected: 15000 },
      aurangabad: { incidents: 38, verified: 25, affected: 48000 },
      amravati: { incidents: 22, verified: 14, affected: 12000 },
      kolhapur: { incidents: 42, verified: 30, affected: 55000 },
      konkan: { incidents: 48, verified: 35, affected: 72000 },
    }
  },
  2022: {
    totalIncidents: 265,
    verified: 162,
    manual: 72,
    unverified: 31,
    byType: [
      { name: 'Flood', value: 98 },
      { name: 'Heavy Rainfall', value: 75 },
      { name: 'Landslide', value: 38 },
      { name: 'Cyclone', value: 22 },
      { name: 'Fire', value: 20 },
      { name: 'Drought', value: 12 },
    ],
    monthly: [
      { month: 'Jan', incidents: 10, verified: 7 },
      { month: 'Feb', incidents: 8, verified: 5 },
      { month: 'Mar', incidents: 12, verified: 9 },
      { month: 'Apr', incidents: 15, verified: 11 },
      { month: 'May', incidents: 22, verified: 16 },
      { month: 'Jun', incidents: 52, verified: 35 },
      { month: 'Jul', incidents: 70, verified: 48 },
      { month: 'Aug', incidents: 58, verified: 40 },
      { month: 'Sep', incidents: 32, verified: 22 },
      { month: 'Oct', incidents: 18, verified: 12 },
      { month: 'Nov', incidents: 12, verified: 8 },
      { month: 'Dec', incidents: 8, verified: 5 },
    ],
    regions: {
      mumbai: { incidents: 65, verified: 45, affected: 85000 },
      pune: { incidents: 38, verified: 28, affected: 32000 },
      nashik: { incidents: 28, verified: 18, affected: 18000 },
      nagpur: { incidents: 25, verified: 15, affected: 12000 },
      aurangabad: { incidents: 32, verified: 22, affected: 42000 },
      amravati: { incidents: 18, verified: 12, affected: 10000 },
      kolhapur: { incidents: 38, verified: 28, affected: 48000 },
      konkan: { incidents: 42, verified: 30, affected: 62000 },
    }
  },
  2021: {
    totalIncidents: 312,
    verified: 195,
    manual: 82,
    unverified: 35,
    byType: [
      { name: 'Flood', value: 135 },
      { name: 'Heavy Rainfall', value: 88 },
      { name: 'Landslide', value: 52 },
      { name: 'Cyclone', value: 18 },
      { name: 'Fire', value: 12 },
      { name: 'Drought', value: 7 },
    ],
    monthly: [
      { month: 'Jan', incidents: 8, verified: 5 },
      { month: 'Feb', incidents: 6, verified: 4 },
      { month: 'Mar', incidents: 10, verified: 7 },
      { month: 'Apr', incidents: 12, verified: 9 },
      { month: 'May', incidents: 18, verified: 12 },
      { month: 'Jun', incidents: 62, verified: 42 },
      { month: 'Jul', incidents: 95, verified: 68 },
      { month: 'Aug', incidents: 72, verified: 50 },
      { month: 'Sep', incidents: 42, verified: 30 },
      { month: 'Oct', incidents: 22, verified: 15 },
      { month: 'Nov', incidents: 12, verified: 8 },
      { month: 'Dec', incidents: 8, verified: 5 },
    ],
    regions: {
      mumbai: { incidents: 78, verified: 55, affected: 115000 },
      pune: { incidents: 48, verified: 35, affected: 42000 },
      nashik: { incidents: 35, verified: 24, affected: 25000 },
      nagpur: { incidents: 30, verified: 20, affected: 16000 },
      aurangabad: { incidents: 40, verified: 28, affected: 52000 },
      amravati: { incidents: 25, verified: 16, affected: 14000 },
      kolhapur: { incidents: 52, verified: 38, affected: 75000 },
      konkan: { incidents: 58, verified: 42, affected: 92000 },
    }
  },
  2020: {
    totalIncidents: 245,
    verified: 148,
    manual: 68,
    unverified: 29,
    byType: [
      { name: 'Flood', value: 88 },
      { name: 'Heavy Rainfall', value: 72 },
      { name: 'Landslide', value: 35 },
      { name: 'Cyclone', value: 28 },
      { name: 'Fire', value: 15 },
      { name: 'Drought', value: 7 },
    ],
    monthly: [
      { month: 'Jan', incidents: 8, verified: 5 },
      { month: 'Feb', incidents: 6, verified: 4 },
      { month: 'Mar', incidents: 10, verified: 7 },
      { month: 'Apr', incidents: 12, verified: 8 },
      { month: 'May', incidents: 18, verified: 12 },
      { month: 'Jun', incidents: 48, verified: 32 },
      { month: 'Jul', incidents: 65, verified: 45 },
      { month: 'Aug', incidents: 55, verified: 38 },
      { month: 'Sep', incidents: 32, verified: 22 },
      { month: 'Oct', incidents: 18, verified: 12 },
      { month: 'Nov', incidents: 10, verified: 6 },
      { month: 'Dec', incidents: 6, verified: 4 },
    ],
    regions: {
      mumbai: { incidents: 58, verified: 40, affected: 72000 },
      pune: { incidents: 35, verified: 25, affected: 28000 },
      nashik: { incidents: 25, verified: 16, affected: 15000 },
      nagpur: { incidents: 22, verified: 14, affected: 10000 },
      aurangabad: { incidents: 28, verified: 18, affected: 35000 },
      amravati: { incidents: 18, verified: 10, affected: 8000 },
      kolhapur: { incidents: 35, verified: 25, affected: 42000 },
      konkan: { incidents: 38, verified: 28, affected: 55000 },
    }
  },
  2019: {
    totalIncidents: 275,
    verified: 168,
    manual: 75,
    unverified: 32,
    byType: [
      { name: 'Flood', value: 105 },
      { name: 'Heavy Rainfall', value: 78 },
      { name: 'Landslide', value: 42 },
      { name: 'Cyclone', value: 22 },
      { name: 'Fire', value: 18 },
      { name: 'Drought', value: 10 },
    ],
    monthly: [
      { month: 'Jan', incidents: 10, verified: 7 },
      { month: 'Feb', incidents: 8, verified: 5 },
      { month: 'Mar', incidents: 12, verified: 9 },
      { month: 'Apr', incidents: 15, verified: 11 },
      { month: 'May', incidents: 20, verified: 14 },
      { month: 'Jun', incidents: 55, verified: 38 },
      { month: 'Jul', incidents: 72, verified: 50 },
      { month: 'Aug', incidents: 60, verified: 42 },
      { month: 'Sep', incidents: 35, verified: 24 },
      { month: 'Oct', incidents: 20, verified: 14 },
      { month: 'Nov', incidents: 12, verified: 8 },
      { month: 'Dec', incidents: 8, verified: 5 },
    ],
    regions: {
      mumbai: { incidents: 68, verified: 48, affected: 88000 },
      pune: { incidents: 40, verified: 28, affected: 35000 },
      nashik: { incidents: 30, verified: 20, affected: 20000 },
      nagpur: { incidents: 25, verified: 16, affected: 12000 },
      aurangabad: { incidents: 35, verified: 24, affected: 45000 },
      amravati: { incidents: 20, verified: 12, affected: 10000 },
      kolhapur: { incidents: 40, verified: 28, affected: 52000 },
      konkan: { incidents: 45, verified: 32, affected: 68000 },
    }
  }
};

// Multi-year comparison data
const YEARLY_COMPARISON = YEARS.map(year => ({
  year: year.toString(),
  incidents: YEARLY_DATA[year].totalIncidents,
  verified: YEARLY_DATA[year].verified,
  floods: YEARLY_DATA[year].byType.find(t => t.name === 'Flood')?.value || 0,
}));

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Analytics() {
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [viewMode, setViewMode] = useState('overview'); // overview, yearly, regional

  const yearData = YEARLY_DATA[selectedYear];
  
  // Get region-specific data if selected
  const getRegionData = () => {
    if (selectedRegion === 'all') {
      return {
        incidents: yearData.totalIncidents,
        verified: yearData.verified,
        affected: Object.values(yearData.regions).reduce((sum, r) => sum + r.affected, 0)
      };
    }
    return yearData.regions[selectedRegion] || { incidents: 0, verified: 0, affected: 0 };
  };

  const regionData = getRegionData();
  
  const verificationPieData = [
    { name: 'Verified', value: yearData.verified, color: '#22c55e' },
    { name: 'Manual Check', value: yearData.manual, color: '#eab308' },
    { name: 'Unverified', value: yearData.unverified, color: '#ef4444' },
  ];

  const typeBarColors = ['#3b82f6', '#06b6d4', '#f97316', '#8b5cf6', '#ec4899', '#eab308'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b] border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-[#94a3b8] text-sm">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="font-semibold" style={{ color: p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Regional comparison data for bar chart
  const regionalComparisonData = Object.entries(yearData.regions).map(([key, value]) => ({
    name: REGIONS.find(r => r.id === key)?.name.split(' ')[0] || key,
    incidents: value.incidents,
    verified: value.verified,
  }));

  return (
    <div className="min-h-screen bg-[#0a0e14] p-6 lg:p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        
        {/* Header with Filters */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-400" />
                Analytics Dashboard
              </h1>
              <p className="text-[#94a3b8]">Disaster data analysis for Maharashtra ({selectedYear})</p>
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              {/* Year Filter */}
              <div className="relative">
                <button
                  onClick={() => { setShowYearDropdown(!showYearDropdown); setShowRegionDropdown(false); }}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-blue-400" />
                  {selectedYear}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showYearDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-20 mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
                    >
                      {YEARS.map(year => (
                        <button
                          key={year}
                          onClick={() => { setSelectedYear(year); setShowYearDropdown(false); }}
                          className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                            selectedYear === year ? 'bg-blue-600 text-white' : 'text-gray-300'
                          }`}
                        >
                          {year}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Region Filter */}
              <div className="relative">
                <button
                  onClick={() => { setShowRegionDropdown(!showRegionDropdown); setShowYearDropdown(false); }}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-green-400" />
                  {REGIONS.find(r => r.id === selectedRegion)?.name || 'All'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showRegionDropdown ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showRegionDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-20 mt-2 w-56 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto"
                    >
                      {REGIONS.map(region => (
                        <button
                          key={region.id}
                          onClick={() => { setSelectedRegion(region.id); setShowRegionDropdown(false); }}
                          className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                            selectedRegion === region.id ? 'bg-green-600 text-white' : 'text-gray-300'
                          }`}
                        >
                          {region.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* View Mode Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex gap-2"
        >
          {['overview', 'yearly', 'regional'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {mode} View
            </button>
          ))}
        </motion.div>

        {/* Stats Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-4 border border-blue-700/50">
            <p className="text-blue-300 text-sm mb-1">Total Incidents ({selectedYear})</p>
            <p className="text-3xl font-bold text-white">{regionData.incidents}</p>
            {selectedRegion !== 'all' && (
              <p className="text-xs text-blue-400 mt-1">{REGIONS.find(r => r.id === selectedRegion)?.name}</p>
            )}
          </div>
          <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-4 border border-green-700/50">
            <p className="text-green-300 text-sm mb-1">Verified</p>
            <p className="text-3xl font-bold text-green-400">{regionData.verified}</p>
            <p className="text-xs text-green-400 mt-1">{Math.round((regionData.verified / regionData.incidents) * 100)}% rate</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 rounded-xl p-4 border border-yellow-700/50">
            <p className="text-yellow-300 text-sm mb-1">Manual Check</p>
            <p className="text-3xl font-bold text-yellow-400">{yearData.manual}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-4 border border-purple-700/50">
            <p className="text-purple-300 text-sm mb-1">People Affected</p>
            <p className="text-3xl font-bold text-purple-400">{regionData.affected?.toLocaleString()}</p>
          </div>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          
          {/* Overview View */}
          {viewMode === 'overview' && (
            <>
              {/* Top Row - Verification & Types */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Verification Pie Chart */}
                <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Verification Status ({selectedYear})
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
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                      {verificationPieData.map((item) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <div>
                            <p className="text-white font-semibold">{item.name}</p>
                            <p className="text-gray-400 text-sm">{item.value} ({Math.round((item.value / yearData.totalIncidents) * 100)}%)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Incidents by Type */}
                <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Incidents by Disaster Type ({selectedYear})
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearData.byType} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          width={90}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {yearData.byType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={typeBarColors[index % typeBarColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Monthly Trends Chart */}
              <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6">Monthly Incident Trends ({selectedYear})</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearData.monthly}>
                      <defs>
                        <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="month" 
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
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="incidents" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fill="url(#colorIncidents)"
                        name="Total Incidents"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="verified" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        fill="url(#colorVerified)"
                        name="Verified"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-gray-400 text-sm mt-4 text-center">
                  Peak monsoon months (June-August) show highest incident rates
                </p>
              </motion.div>
            </>
          )}

          {/* Yearly Comparison View */}
          {viewMode === 'yearly' && (
            <>
              {/* Multi-Year Comparison Chart */}
              <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Year-over-Year Incident Comparison (2019-2024)
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={YEARLY_COMPARISON}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="year" 
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="incidents" fill="#3b82f6" name="Total Incidents" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="verified" fill="#22c55e" name="Verified" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="floods" fill="#06b6d4" name="Flood Incidents" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Yearly Trend Line */}
              <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6">Incident Trend Over Years</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={YEARLY_COMPARISON}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="year"
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="incidents" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', r: 6 }}
                        name="Total Incidents"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="verified" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', r: 6 }}
                        name="Verified"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Year Cards */}
              <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {YEARS.map(year => (
                  <div
                    key={year}
                    onClick={() => { setSelectedYear(year); setViewMode('overview'); }}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedYear === year
                        ? 'bg-blue-600 border-2 border-blue-400'
                        : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <p className="text-white font-bold text-xl">{year}</p>
                    <p className="text-gray-300 text-sm mt-1">{YEARLY_DATA[year].totalIncidents} incidents</p>
                    <p className="text-green-400 text-xs mt-1">{YEARLY_DATA[year].verified} verified</p>
                  </div>
                ))}
              </motion.div>
            </>
          )}

          {/* Regional View */}
          {viewMode === 'regional' && (
            <>
              {/* Regional Comparison Bar Chart */}
              <motion.div variants={item} className="bg-[#0f1419] border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-400" />
                  Regional Incident Distribution ({selectedYear})
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionalComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        axisLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="incidents" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="verified" fill="#22c55e" name="Verified" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Region Cards */}
              <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(yearData.regions).map(([key, data]) => (
                  <div
                    key={key}
                    onClick={() => { setSelectedRegion(key); setViewMode('overview'); }}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedRegion === key
                        ? 'bg-green-600/30 border-2 border-green-400'
                        : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-green-400" />
                      <p className="text-white font-semibold">
                        {REGIONS.find(r => r.id === key)?.name || key}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Incidents</p>
                        <p className="text-blue-400 font-bold">{data.incidents}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Verified</p>
                        <p className="text-green-400 font-bold">{data.verified}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400">People Affected</p>
                        <p className="text-purple-400 font-bold">{data.affected.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </>
          )}

        </motion.div>
      </div>
    </div>
  );
}
