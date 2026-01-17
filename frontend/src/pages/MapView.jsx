import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { motion } from 'framer-motion';
import { Map as MapIcon, RefreshCw, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
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

// India center coordinates
const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// Color mapping for severity/status
const getMarkerColor = (color) => {
  const colors = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    gray: '#6b7280',
  };
  return colors[color] || colors.yellow;
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

export default function MapView() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/map-data`);
      const data = await response.json();
      setIncidents(data);
      
      // If we have incidents, center on the first one
      if (data.length > 0) {
        setMapCenter([data[0].latitude, data[0].longitude]);
      }
    } catch (error) {
      console.error('Failed to fetch map data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredIncidents = selectedType === 'all' 
    ? incidents 
    : incidents.filter(inc => inc.disaster_type?.toLowerCase() === selectedType);

  const disasterTypes = [...new Set(incidents.map(inc => inc.disaster_type?.toLowerCase()).filter(Boolean))];

  return (
    <div className="p-6 h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MapIcon className="w-8 h-8 text-green-400" />
            Incident Map
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time visualization of disaster incidents with color-coded severity
          </p>
        </div>
        <button
          onClick={fetchMapData}
          disabled={loading}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg 
            flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <button
          onClick={() => setSelectedType('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedType === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All ({incidents.length})
        </button>
        {disasterTypes.map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-lg capitalize transition-colors ${
              selectedType === type 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {type} ({incidents.filter(i => i.disaster_type?.toLowerCase() === type).length})
          </button>
        ))}
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-4 flex gap-4 text-sm"
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-gray-400">High Urgency</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500"></div>
          <span className="text-gray-400">Medium Urgency</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-gray-400">Verified</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span className="text-gray-400">Unverified</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
          <span className="text-gray-400">Flagged</span>
        </div>
      </motion.div>

      {/* Map Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl overflow-hidden border border-gray-700"
        style={{ height: 'calc(100vh - 320px)' }}
      >
        <MapContainer
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {filteredIncidents.map((incident) => (
            <CircleMarker
              key={incident.event_id}
              center={[incident.latitude, incident.longitude]}
              radius={10 + (incident.confidence / 20)}
              fillColor={getMarkerColor(incident.color)}
              color={getMarkerColor(incident.color)}
              weight={2}
              opacity={0.8}
              fillOpacity={0.6}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(incident.status)}
                    <span className="font-semibold text-gray-800">
                      {incident.disaster_type}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">
                    📍 {incident.location}
                  </p>
                  <p className="text-gray-700 text-sm mb-2">
                    {incident.summary}
                  </p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Confidence: {incident.confidence}%</span>
                    <span className={`uppercase font-semibold ${
                      incident.status === 'VERIFIED' ? 'text-green-600' :
                      incident.status === 'FLAGGED' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 grid grid-cols-4 gap-4"
      >
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{incidents.length}</p>
          <p className="text-gray-400 text-sm">Total Incidents</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            {incidents.filter(i => i.status === 'VERIFIED').length}
          </p>
          <p className="text-gray-400 text-sm">Verified</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-400">
            {incidents.filter(i => i.urgency === 'high').length}
          </p>
          <p className="text-gray-400 text-sm">High Urgency</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {filteredIncidents.length}
          </p>
          <p className="text-gray-400 text-sm">Showing on Map</p>
        </div>
      </motion.div>
    </div>
  );
}
