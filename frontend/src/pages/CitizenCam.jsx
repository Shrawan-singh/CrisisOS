import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  MapPin,
  Image as ImageIcon,
  Shield,
  Eye,
  Clock,
  Navigation,
  Calendar,
  Users,
  Copy,
  TrendingUp,
  Hash
} from 'lucide-react';

const API_URL = 'http://localhost:8000';

// Simulated duplicate image tracking (in real app, this would be from backend with image hashing)
const DUPLICATE_REPORTS = {
  'flood_mumbai_001': {
    count: 8,
    locations: ['Dadar', 'Kurla', 'Sion', 'Matunga', 'Wadala'],
    firstReport: '2024-01-15T10:30:00',
    lastReport: '2024-01-15T14:45:00',
  },
  'landslide_raigad_001': {
    count: 12,
    locations: ['Mahad', 'Poladpur', 'Mangaon'],
    firstReport: '2024-01-15T08:15:00',
    lastReport: '2024-01-15T16:20:00',
  },
  'fire_thane_001': {
    count: 5,
    locations: ['Thane West', 'Kalwa'],
    firstReport: '2024-01-15T12:00:00',
    lastReport: '2024-01-15T13:30:00',
  }
};

export default function CitizenCam() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [uploadTime, setUploadTime] = useState(null);
  const [coordinates, setCoordinates] = useState({ lat: null, lon: null });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [uploadMetadata, setUploadMetadata] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);

  // Get location on mount
  useEffect(() => {
    getLocationAutofill();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const getLocationAutofill = async () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lon: longitude });
          
          // Reverse geocode to get location name
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            const address = data.address || {};
            const locationName = [
              address.suburb || address.neighbourhood || address.village,
              address.city || address.town || address.county,
              address.state
            ].filter(Boolean).join(', ');
            
            if (locationName) {
              setLocation(locationName);
            }
          } catch (error) {
            console.log('Reverse geocoding failed:', error);
            setLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
          }
          setIsGettingLocation(false);
        },
        (error) => {
          console.log('Geolocation error:', error);
          setIsGettingLocation(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setIsGettingLocation(false);
    }
  };

  // Format date/time for display
  const formatDateTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return {
      day: days[d.getDay()],
      date: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      fullDateTime: d.toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    };
  };

  // Generate image hash (simplified - in real app use perceptual hashing)
  const generateImageHash = async (file) => {
    // Simplified hash based on file properties
    const hash = `${file.name}_${file.size}_${file.lastModified}`;
    return hash.substring(0, 20);
  };

  // Check for duplicate uploads (simulated)
  const checkDuplicates = async (imageHash) => {
    // Simulate API call to check for similar images
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Random chance to find duplicates for demo
    const duplicateKeys = Object.keys(DUPLICATE_REPORTS);
    if (Math.random() > 0.5 && duplicateKeys.length > 0) {
      const randomKey = duplicateKeys[Math.floor(Math.random() * duplicateKeys.length)];
      return DUPLICATE_REPORTS[randomKey];
    }
    return null;
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
      const now = new Date();
      setUploadTime(now);
      setResult(null);
      setVerificationResult(null);
      setDuplicateInfo(null);
      
      // Set upload metadata with day, date, time
      setUploadMetadata(formatDateTime(now));
      
      // Check for duplicates
      const hash = await generateImageHash(file);
      const duplicates = await checkDuplicates(hash);
      if (duplicates && duplicates.count >= 5) {
        setDuplicateInfo(duplicates);
      }
      
      // Get location when image is selected
      if (!location) {
        getLocationAutofill();
      }
    }
  };

  // Open device camera
  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Camera access denied:', error);
      // Fallback to file input with capture
      cameraInputRef.current?.click();
    }
  };

  // Capture photo from video stream
  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedImage(file);
        setPreview(URL.createObjectURL(blob));
        const now = new Date();
        setUploadTime(now);
        setUploadMetadata(formatDateTime(now));
        closeCamera();
        
        // Check for duplicates
        const hash = await generateImageHash(file);
        const duplicates = await checkDuplicates(hash);
        if (duplicates && duplicates.count >= 5) {
          setDuplicateInfo(duplicates);
        }
        
        // Get location when photo is captured
        if (!location) {
          getLocationAutofill();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleVerifyImage = async () => {
    if (!selectedImage) return;
    
    setIsVerifying(true);
    setVerificationResult(null);
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('claimed_disaster', description);
      
      const response = await fetch(`${API_URL}/api/verify-image`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({ error: 'Verification failed. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location || !description) {
      alert('Please provide location and description');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      formData.append('description', description);
      formData.append('location', location);
      
      // Use stored coordinates or try to get new ones
      if (coordinates.lat && coordinates.lon) {
        formData.append('latitude', coordinates.lat);
        formData.append('longitude', coordinates.lon);
      } else if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          formData.append('latitude', position.coords.latitude);
          formData.append('longitude', position.coords.longitude);
        } catch (geoError) {
          console.log('Geolocation not available');
        }
      }

      // Add upload time
      if (uploadTime) {
        formData.append('upload_time', uploadTime.toISOString());
      } else {
        formData.append('upload_time', new Date().toISOString());
      }
      
      const response = await fetch(`${API_URL}/api/citizen-report`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      // Add duplicate info to result if exists
      if (duplicateInfo) {
        data.duplicate_info = duplicateInfo;
      }
      
      setResult(data);
    } catch (error) {
      console.error('Submission failed:', error);
      setResult({ error: 'Submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVerificationColor = (isDisaster, confidence) => {
    if (!isDisaster) return 'text-red-400';
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getVerificationIcon = (isDisaster, confidence) => {
    if (!isDisaster) return <XCircle className="w-6 h-6" />;
    if (confidence >= 80) return <CheckCircle className="w-6 h-6" />;
    return <AlertTriangle className="w-6 h-6" />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Camera className="w-8 h-8 text-blue-400" />
          CitizenCam
        </h1>
        <p className="text-gray-400 mt-2">
          Report disasters with AI-powered image verification using Gemini Vision
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Image Upload Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            Upload Evidence
          </h2>

          {/* Camera View (when active) */}
          {showCamera && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden bg-black mb-4">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  onClick={capturePhoto}
                  className="bg-white text-black w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-200 transition-colors"
                >
                  <Camera className="w-8 h-8" />
                </button>
                <button
                  onClick={closeCamera}
                  className="bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {/* Preview Area */}
          {!showCamera && (
          <div 
            className={`relative w-full h-64 rounded-lg border-2 border-dashed 
              ${preview ? 'border-blue-500' : 'border-gray-600'} 
              flex items-center justify-center overflow-hidden bg-gray-900 mb-4`}
          >
            {preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-gray-500">
                <Upload className="w-12 h-12 mx-auto mb-2" />
                <p>Click to upload or take a photo</p>
              </div>
            )}
          </div>
          )}

          {/* Upload Metadata Display - Day, Date, Time, Place */}
          {uploadMetadata && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-gray-900 rounded-lg p-4 border border-gray-700"
            >
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Upload Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-gray-500 text-xs">Day</p>
                    <p className="text-white font-medium">{uploadMetadata.day}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-gray-500 text-xs">Date</p>
                    <p className="text-white font-medium">{uploadMetadata.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <div>
                    <p className="text-gray-500 text-xs">Time</p>
                    <p className="text-white font-medium">{uploadMetadata.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-gray-500 text-xs">Place</p>
                    <p className="text-white font-medium truncate" title={location}>
                      {location || 'Detecting...'}
                    </p>
                  </div>
                </div>
              </div>
              {coordinates.lat && coordinates.lon && (
                <div className="mt-3 pt-2 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-500">
                  <Navigation className="w-3 h-3" />
                  <span>GPS: {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Duplicate Detection Alert */}
          <AnimatePresence>
            {duplicateInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4 bg-orange-900/30 border border-orange-600 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 text-orange-400 font-semibold mb-2">
                  <Copy className="w-5 h-5" />
                  Similar Image Detected ({duplicateInfo.count}+ Reports)
                </div>
                <p className="text-sm text-gray-300 mb-3">
                  This image or a very similar one has been reported by <span className="text-orange-400 font-bold">{duplicateInfo.count}</span> other citizens.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-gray-500">First Report</p>
                    <p className="text-white">{new Date(duplicateInfo.firstReport).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-gray-500">Latest Report</p>
                    <p className="text-white">{new Date(duplicateInfo.lastReport).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {duplicateInfo.locations.map((loc, i) => (
                    <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {loc}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>This increases incident verification confidence!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Location Status */}
          {isGettingLocation && (
            <div className="mb-4 flex items-center gap-2 text-blue-400 text-sm">
              <Navigation className="w-4 h-4 animate-pulse" />
              <span>Getting your location...</span>
            </div>
          )}

          {/* Upload Buttons */}
          {!showCamera && (
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg 
                flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload
            </button>
            <button
              onClick={openCamera}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-lg 
                flex items-center justify-center gap-2 transition-colors"
            >
              <Camera className="w-5 h-5" />
              Camera
            </button>
          </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Verify Button */}
          {preview && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleVerifyImage}
              disabled={isVerifying}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 
                text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing with Gemini Vision...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Verify Image
                </>
              )}
            </motion.button>
          )}

          {/* Verification Result */}
          <AnimatePresence>
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 p-4 rounded-lg border ${
                  verificationResult.is_disaster 
                    ? 'bg-green-900/30 border-green-700' 
                    : 'bg-red-900/30 border-red-700'
                }`}
              >
                <div className={`flex items-center gap-2 font-semibold ${
                  getVerificationColor(verificationResult.is_disaster, verificationResult.confidence)
                }`}>
                  {getVerificationIcon(verificationResult.is_disaster, verificationResult.confidence)}
                  {verificationResult.is_disaster ? 'Disaster Detected' : 'No Disaster Detected'}
                </div>
                
                {verificationResult.is_disaster && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-500">Type:</span> {verificationResult.disaster_type}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Confidence:</span> {verificationResult.confidence}%
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Description:</span> {verificationResult.description}
                    </p>
                    
                    {verificationResult.safety_concerns?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-400 font-semibold">⚠️ Safety Concerns:</p>
                        <ul className="list-disc list-inside text-gray-400">
                          {verificationResult.safety_concerns.map((concern, i) => (
                            <li key={i}>{concern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {verificationResult.error && (
                  <p className="text-red-400 mt-2">{verificationResult.error}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Report Form Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Report Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location Input */}
            <div>
              <label className="block text-gray-400 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Dadar, Mumbai"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 
                  text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-gray-400 mb-2">
                What's happening?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident..."
                rows={4}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 
                  text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !location || !description}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-800 
                disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg 
                flex items-center justify-center gap-2 transition-colors font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Citizen Report
                </>
              )}
            </button>
          </form>

          {/* Submission Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 p-4 rounded-lg border ${
                  result.error 
                    ? 'bg-red-900/30 border-red-700' 
                    : 'bg-blue-900/30 border-blue-700'
                }`}
              >
                {result.error ? (
                  <p className="text-red-400">{result.error}</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <p className="text-green-400 font-semibold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Report Submitted Successfully
                    </p>
                    
                    {/* Upload Details in Result */}
                    {uploadMetadata && (
                      <div className="bg-gray-800/50 rounded-lg p-3 space-y-1">
                        <p className="text-gray-400 text-xs font-semibold uppercase">Submission Details</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <p className="text-gray-300">
                            <span className="text-gray-500">Day:</span> {uploadMetadata.day}
                          </p>
                          <p className="text-gray-300">
                            <span className="text-gray-500">Date:</span> {uploadMetadata.date}
                          </p>
                          <p className="text-gray-300">
                            <span className="text-gray-500">Time:</span> {uploadMetadata.time}
                          </p>
                          <p className="text-gray-300">
                            <span className="text-gray-500">Place:</span> {location}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-gray-300">
                      <span className="text-gray-500">Report ID:</span> {result.report_id}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Trust Score:</span> {result.trust_score}%
                    </p>
                    {result.verified && (
                      <p className="text-green-400">✓ Image verified as disaster</p>
                    )}
                    {result.merge_result?.merged && (
                      <p className="text-blue-400">
                        📎 Merged with existing incident: {result.merge_result.cluster_id}
                      </p>
                    )}
                    
                    {/* Show duplicate info if exists */}
                    {result.duplicate_info && (
                      <div className="mt-2 p-2 bg-orange-900/30 rounded border border-orange-600/50">
                        <p className="text-orange-400 font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Corroborated by {result.duplicate_info.count} other reports
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Your report strengthens the verification confidence for this incident.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Duplicate Reports Counter (if any) */}
      {duplicateInfo && duplicateInfo.count >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-xl p-6 border border-orange-600"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-orange-400" />
                Trending Incident Alert
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                Multiple citizens are reporting the same incident. This helps verify authenticity.
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-orange-400">{duplicateInfo.count}+</p>
              <p className="text-xs text-gray-500">Similar Reports</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-300">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-red-400" />
              Reported from: {duplicateInfo.locations.join(', ')}
            </span>
          </div>
        </motion.div>
      )}

      {/* Trust Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 bg-gray-800/50 rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-3">How CitizenCam Works</h3>
        <div className="grid md:grid-cols-4 gap-4 text-sm text-gray-400">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
            <div>
              <p className="font-semibold text-white">Upload Image</p>
              <p>Take a photo or upload evidence of the disaster</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
            <div>
              <p className="font-semibold text-white">AI Verification</p>
              <p>Gemini Vision analyzes for authenticity & disaster detection</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
            <div>
              <p className="font-semibold text-white">Duplicate Detection</p>
              <p>5+ similar uploads boost verification confidence</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
            <div>
              <p className="font-semibold text-white">Spatiotemporal Merge</p>
              <p>Your report is merged with existing incidents using Haversine distance</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
