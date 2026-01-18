import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Map as MapIcon, RefreshCw, AlertTriangle, CheckCircle, HelpCircle, Filter, Eye, EyeOff, Clock, Users, Flame, Droplets, Wind, Mountain, Zap, Activity } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = 'http://localhost:8000';

// Maharashtra center coordinates
const DEFAULT_CENTER = [19.7515, 75.7139];
const DEFAULT_ZOOM = 7;

// Disaster type icons
const getDisasterIcon = (type) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('flood') || t.includes('rain')) return <Droplets className="w-4 h-4" />;
  if (t.includes('fire') || t.includes('wildfire')) return <Flame className="w-4 h-4" />;
  if (t.includes('cyclone') || t.includes('storm') || t.includes('wind')) return <Wind className="w-4 h-4" />;
  if (t.includes('landslide') || t.includes('earthquake')) return <Mountain className="w-4 h-4" />;
  if (t.includes('power') || t.includes('electric')) return <Zap className="w-4 h-4" />;
  return <AlertTriangle className="w-4 h-4" />;
};

// Color mapping for severity/status
const getMarkerColor = (incident) => {
  if (incident.status === 'VERIFIED') return '#22c55e';
  if (incident.status === 'FLAGGED') return '#6b7280';
  if (incident.urgency === 'high') return '#ef4444';
  if (incident.urgency === 'medium') return '#f97316';
  return '#eab308';
};

const getStatusIcon = (status) => {
  switch (status?.toUpperCase()) {
    case 'VERIFIED':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'FLAGGED':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    default:
      return <HelpCircle className="w-4 h-4 text-yellow-400" />;
  }
};

// Enhanced Maharashtra sample incidents (15+ incidents)
const SAMPLE_INCIDENTS = [
  // Mumbai Region
  { event_id: 'mum1', disaster_type: 'Heavy Rainfall', location: 'Dadar, Mumbai', status: 'VERIFIED', urgency: 'high', confidence: 92, latitude: 19.0178, longitude: 72.8478, sources: 12, timestamp: '2024-01-15 14:30', summary: 'Heavy waterlogging reported in Dadar area, traffic disrupted on major roads', affected: 5000 },
  { event_id: 'mum2', disaster_type: 'Flood Warning', location: 'Kurla, Mumbai', status: 'VERIFIED', urgency: 'high', confidence: 88, latitude: 19.0726, longitude: 72.8793, sources: 8, timestamp: '2024-01-15 15:00', summary: 'Mithi River water level rising, low-lying areas on alert', affected: 3200 },
  { event_id: 'mum3', disaster_type: 'Building Collapse Risk', location: 'Dharavi, Mumbai', status: 'LIKELY', urgency: 'medium', confidence: 75, latitude: 19.0412, longitude: 72.8546, sources: 5, timestamp: '2024-01-15 12:45', summary: 'Old structure showing cracks after heavy rain, residents evacuated', affected: 150 },
  { event_id: 'mum4', disaster_type: 'Power Outage', location: 'Andheri East, Mumbai', status: 'VERIFIED', urgency: 'low', confidence: 95, latitude: 19.1136, longitude: 72.8697, sources: 15, timestamp: '2024-01-15 16:00', summary: 'Power lines damaged due to fallen tree, restoration underway', affected: 8000 },
  
  // Pune Region
  { event_id: 'pune1', disaster_type: 'Flash Flood', location: 'Khadki, Pune', status: 'VERIFIED', urgency: 'high', confidence: 85, latitude: 18.5614, longitude: 73.8553, sources: 10, timestamp: '2024-01-15 13:15', summary: 'Sudden flash flood in Khadki canal area, NDRF deployed', affected: 2500 },
  { event_id: 'pune2', disaster_type: 'Heavy Rainfall', location: 'Hinjewadi, Pune', status: 'LIKELY', urgency: 'medium', confidence: 78, latitude: 18.5912, longitude: 73.7390, sources: 6, timestamp: '2024-01-15 14:00', summary: 'IT Park area experiencing heavy waterlogging', affected: 4000 },
  { event_id: 'pune3', disaster_type: 'Landslide Alert', location: 'Lavasa, Pune', status: 'UNVERIFIED', urgency: 'medium', confidence: 55, latitude: 18.4088, longitude: 73.5104, sources: 3, timestamp: '2024-01-15 11:30', summary: 'Minor landslide reported on hill road, traffic diverted', affected: 200 },
  
  // Kolhapur Region
  { event_id: 'kol1', disaster_type: 'River Flooding', location: 'Panchganga, Kolhapur', status: 'VERIFIED', urgency: 'high', confidence: 90, latitude: 16.6850, longitude: 74.2333, sources: 14, timestamp: '2024-01-15 10:00', summary: 'Panchganga river crossed danger mark, evacuation in progress', affected: 15000 },
  { event_id: 'kol2', disaster_type: 'Dam Overflow Warning', location: 'Radhanagari Dam', status: 'VERIFIED', urgency: 'high', confidence: 95, latitude: 16.4167, longitude: 73.9833, sources: 8, timestamp: '2024-01-15 09:30', summary: 'Dam gates opened, downstream villages alerted', affected: 8000 },
  
  // Raigad Region
  { event_id: 'rai1', disaster_type: 'Landslide', location: 'Mahad, Raigad', status: 'VERIFIED', urgency: 'high', confidence: 88, latitude: 18.0833, longitude: 73.4167, sources: 11, timestamp: '2024-01-15 08:45', summary: 'Major landslide on Mumbai-Goa highway, rescue operations ongoing', affected: 500 },
  { event_id: 'rai2', disaster_type: 'Cyclone Warning', location: 'Alibaug, Raigad', status: 'LIKELY', urgency: 'high', confidence: 82, latitude: 18.6414, longitude: 72.8722, sources: 7, timestamp: '2024-01-15 07:00', summary: 'IMD issued cyclone alert for coastal areas', affected: 25000 },
  
  // Nashik Region
  { event_id: 'nas1', disaster_type: 'Flash Flood', location: 'Godavari Ghat, Nashik', status: 'UNVERIFIED', urgency: 'medium', confidence: 60, latitude: 19.9975, longitude: 73.7898, sources: 4, timestamp: '2024-01-15 15:30', summary: 'Water level rising at Godavari ghat', affected: 1000 },
  { event_id: 'nas2', disaster_type: 'Agricultural Damage', location: 'Sinnar, Nashik', status: 'VERIFIED', urgency: 'low', confidence: 85, latitude: 19.8500, longitude: 73.9833, sources: 6, timestamp: '2024-01-15 12:00', summary: 'Heavy rain damaged grape vineyards in the region', affected: 300 },
  
  // Nagpur Region
  { event_id: 'nag1', disaster_type: 'Heat Wave', location: 'Nagpur City', status: 'VERIFIED', urgency: 'medium', confidence: 92, latitude: 21.1458, longitude: 79.0882, sources: 9, timestamp: '2024-01-14 14:00', summary: 'Temperature crossed 45°C, health advisory issued', affected: 50000 },
  { event_id: 'nag2', disaster_type: 'Forest Fire', location: 'Pench Tiger Reserve', status: 'LIKELY', urgency: 'high', confidence: 70, latitude: 21.7500, longitude: 79.3333, sources: 5, timestamp: '2024-01-14 16:00', summary: 'Fire spotted near reserve boundary, forest dept on alert', affected: 0 },
  
  // Aurangabad Region
  { event_id: 'aur1', disaster_type: 'Drought Condition', location: 'Marathwada Region', status: 'VERIFIED', urgency: 'medium', confidence: 88, latitude: 19.8762, longitude: 75.3433, sources: 12, timestamp: '2024-01-10 10:00', summary: 'Severe water scarcity reported in multiple villages', affected: 100000 },
  
  // Thane Region
  { event_id: 'tha1', disaster_type: 'Waterlogging', location: 'Thane Station Area', status: 'VERIFIED', urgency: 'medium', confidence: 90, latitude: 19.1860, longitude: 72.9756, sources: 8, timestamp: '2024-01-15 14:45', summary: 'Local train services disrupted due to waterlogging', affected: 20000 },
  
  // Satara Region
  { event_id: 'sat1', disaster_type: 'Dam Alert', location: 'Koyna Dam, Satara', status: 'FLAGGED', urgency: 'low', confidence: 35, latitude: 17.3989, longitude: 73.7525, sources: 2, timestamp: '2024-01-15 11:00', summary: 'Unverified report about dam structural issue - Under investigation', affected: 0 },
  
  // Sangli
  { event_id: 'san1', disaster_type: 'River Flood', location: 'Krishna River, Sangli', status: 'LIKELY', urgency: 'high', confidence: 75, latitude: 16.8524, longitude: 74.5815, sources: 6, timestamp: '2024-01-15 13:00', summary: 'Krishna river water level increasing rapidly', affected: 5000 },
];

// Map center controller component
function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapView() {
  const [incidents, setIncidents] = useState(SAMPLE_INCIDENTS);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all'); // all, verified, unverified
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/map-data`);
      const data = await response.json();
      // Fallback if API returns empty
      if (Array.isArray(data) && data.length > 0) {
        setIncidents(data);
      } else {
        setIncidents(SAMPLE_INCIDENTS);
      }
    } catch (error) {
      console.error('Failed to fetch map data:', error);
      setIncidents(SAMPLE_INCIDENTS);
    } finally {
      setLoading(false);
      setRefreshCount(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  // Apply both type and verification filters
  const filteredIncidents = incidents.filter(inc => {
    const typeMatch = selectedType === 'all' || inc.disaster_type?.toLowerCase().includes(selectedType);
    const verifyMatch = verificationFilter === 'all' || 
      (verificationFilter === 'verified' && inc.status === 'VERIFIED') ||
      (verificationFilter === 'unverified' && inc.status !== 'VERIFIED');
    return typeMatch && verifyMatch;
  });

  const disasterTypes = [...new Set(incidents.map(inc => {
    const t = inc.disaster_type?.toLowerCase() || '';
    if (t.includes('flood') || t.includes('rain') || t.includes('water')) return 'flood';
    if (t.includes('fire')) return 'fire';
    if (t.includes('cyclone') || t.includes('storm')) return 'cyclone';
    if (t.includes('landslide')) return 'landslide';
    if (t.includes('heat') || t.includes('drought')) return 'climate';
    if (t.includes('dam')) return 'dam';
    return 'other';
  }))].filter(Boolean);

  const verifiedCount = incidents.filter(i => i.status === 'VERIFIED').length;
  const unverifiedCount = incidents.filter(i => i.status !== 'VERIFIED').length;
  const highUrgencyCount = incidents.filter(i => i.urgency === 'high').length;
  const totalAffected = incidents.reduce((sum, i) => sum + (i.affected || 0), 0);

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MapIcon className="w-8 h-8 text-green-400" />
            Disaster Incident Map
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time visualization of {incidents.length} disaster incidents across Maharashtra
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {showLegend ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            Legend
          </button>
          <button
            onClick={fetchMapData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg p-3 border border-blue-700/50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold text-white">{incidents.length}</span>
          </div>
          <p className="text-blue-300 text-xs mt-1">Total Incidents</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-lg p-3 border border-green-700/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-bold text-green-400">{verifiedCount}</span>
          </div>
          <p className="text-green-300 text-xs mt-1">Verified</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 rounded-lg p-3 border border-yellow-700/50">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-2xl font-bold text-yellow-400">{unverifiedCount}</span>
          </div>
          <p className="text-yellow-300 text-xs mt-1">Unverified</p>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 rounded-lg p-3 border border-red-700/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-2xl font-bold text-red-400">{highUrgencyCount}</span>
          </div>
          <p className="text-red-300 text-xs mt-1">High Urgency</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg p-3 border border-purple-700/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">{totalAffected.toLocaleString()}</span>
          </div>
          <p className="text-purple-300 text-xs mt-1">People Affected</p>
        </div>
      </motion.div>

      {/* Verification Filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-3 flex flex-wrap gap-2 items-center"
      >
        <span className="text-gray-400 text-sm flex items-center gap-1">
          <Filter className="w-4 h-4" /> Status:
        </span>
        <button
          onClick={() => setVerificationFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            verificationFilter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All ({incidents.length})
        </button>
        <button
          onClick={() => setVerificationFilter('verified')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
            verificationFilter === 'verified' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <CheckCircle className="w-3 h-3" /> Verified ({verifiedCount})
        </button>
        <button
          onClick={() => setVerificationFilter('unverified')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
            verificationFilter === 'unverified' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <HelpCircle className="w-3 h-3" /> Unverified ({unverifiedCount})
        </button>
      </motion.div>

      {/* Disaster Type Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-4 flex flex-wrap gap-2 items-center"
      >
        <span className="text-gray-400 text-sm">Type:</span>
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            selectedType === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All Types
        </button>
        <button
          onClick={() => setSelectedType('flood')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
            selectedType === 'flood' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Droplets className="w-3 h-3" /> Flood/Rain
        </button>
        <button
          onClick={() => setSelectedType('landslide')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
            selectedType === 'landslide' 
              ? 'bg-amber-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Mountain className="w-3 h-3" /> Landslide
        </button>
        <button
          onClick={() => setSelectedType('cyclone')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
            selectedType === 'cyclone' 
              ? 'bg-cyan-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Wind className="w-3 h-3" /> Cyclone
        </button>
        <button
          onClick={() => setSelectedType('fire')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
            selectedType === 'fire' 
              ? 'bg-orange-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Flame className="w-3 h-3" /> Fire
        </button>
        <button
          onClick={() => setSelectedType('dam')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
            selectedType === 'dam' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Activity className="w-3 h-3" /> Dam Alert
        </button>
      </motion.div>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-gray-800/50 rounded-lg p-3 border border-gray-700"
          >
            <p className="text-gray-300 text-sm font-medium mb-2">Map Legend</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-gray-400">High Urgency</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-gray-400">Medium Urgency</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-gray-400">Verified Incident</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-gray-400">Unverified/Likely</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                <span className="text-gray-400">Flagged as Fake</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400"></div>
                <span className="text-gray-400">Larger = Higher Confidence</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content: Map + Sidebar */}
      <div className="flex gap-4" style={{ height: 'calc(100vh - 420px)' }}>
        {/* Map Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 rounded-xl overflow-hidden border border-gray-700"
        >
          <MapContainer
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <MapCenterController center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {filteredIncidents.map((incident) => (
              <CircleMarker
                key={incident.event_id}
                center={[incident.latitude, incident.longitude]}
                radius={8 + (incident.confidence / 15)}
                fillColor={getMarkerColor(incident)}
                color={incident.urgency === 'high' ? '#ef4444' : getMarkerColor(incident)}
                weight={incident.urgency === 'high' ? 3 : 2}
                opacity={0.9}
                fillOpacity={0.7}
                eventHandlers={{
                  click: () => setSelectedIncident(incident)
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[250px] max-w-[300px]">
                    <div className="flex items-center gap-2 mb-2">
                      {getDisasterIcon(incident.disaster_type)}
                      <span className="font-semibold text-gray-800">
                        {incident.disaster_type}
                      </span>
                      {getStatusIcon(incident.status)}
                    </div>
                    <p className="text-gray-600 text-sm mb-1 flex items-center gap-1">
                      📍 {incident.location}
                    </p>
                    {incident.timestamp && (
                      <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {incident.timestamp}
                      </p>
                    )}
                    <p className="text-gray-700 text-sm mb-2">
                      {incident.summary}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 border-t pt-2">
                      <span>Confidence: <b>{incident.confidence}%</b></span>
                      <span>Sources: <b>{incident.sources || 1}</b></span>
                      {incident.affected > 0 && (
                        <span className="col-span-2">People Affected: <b className="text-red-600">{incident.affected?.toLocaleString()}</b></span>
                      )}
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${
                        incident.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                        incident.status === 'FLAGGED' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {incident.status}
                      </span>
                      <span className={`text-xs uppercase font-semibold ${
                        incident.urgency === 'high' ? 'text-red-600' :
                        incident.urgency === 'medium' ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        {incident.urgency} urgency
                      </span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </motion.div>

        {/* Incident List Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col"
        >
          <div className="p-3 bg-gray-800 border-b border-gray-700">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Active Incidents ({filteredIncidents.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredIncidents.map((incident) => (
              <motion.div
                key={incident.event_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  setSelectedIncident(incident);
                  setMapCenter([incident.latitude, incident.longitude]);
                }}
                className={`p-3 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                  selectedIncident?.event_id === incident.event_id ? 'bg-gray-700/70' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`p-1 rounded ${
                      incident.urgency === 'high' ? 'bg-red-500/20 text-red-400' :
                      incident.urgency === 'medium' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {getDisasterIcon(incident.disaster_type)}
                    </span>
                    <div>
                      <p className="text-white text-sm font-medium">{incident.disaster_type}</p>
                      <p className="text-gray-400 text-xs">{incident.location}</p>
                    </div>
                  </div>
                  {getStatusIcon(incident.status)}
                </div>
                {incident.affected > 0 && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {incident.affected.toLocaleString()} affected
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 flex items-center justify-between text-sm text-gray-400 bg-gray-800/30 rounded-lg px-4 py-2"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live Updates Active
        </span>
        <span>Showing {filteredIncidents.length} of {incidents.length} incidents</span>
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" /> Last refresh: {refreshCount > 0 ? 'Just now' : 'Loading...'}
        </span>
      </motion.div>
    </div>
  );
}
