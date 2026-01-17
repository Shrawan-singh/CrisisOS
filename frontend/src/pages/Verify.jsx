import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Shield, Globe } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const QUICK_KEYWORDS = ['Flood', 'Fire', 'Earthquake', 'Building Collapse', 'Cyclone', 'Mumbai', 'Pune'];

export default function Verify() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runVerification = async (searchQuery = query) => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/verify?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Error verifying information. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (keyword) => {
    setQuery(keyword);
    runVerification(keyword);
  };

  const getStatusStyles = (status) => {
    if (status === 'Likely True') return { bg: 'bg-[#2ecc71]', text: 'text-black', icon: CheckCircle };
    if (status === 'Uncertain') return { bg: 'bg-[#f1c40f]', text: 'text-black', icon: AlertTriangle };
    return { bg: 'bg-[#e74c3c]', text: 'text-white', icon: XCircle };
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-[#ecf0f1] py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Verify Box */}
        <div className="bg-[#16213e] rounded-3xl p-10 text-center border border-white/10">
          <h2 className="text-3xl font-bold mb-2">Verify Disaster News</h2>
          <p className="text-[#a0a0a0] mb-6">
            Enter keywords or paste a headline to verify its authenticity
          </p>

          {/* Quick Keywords */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {QUICK_KEYWORDS.map((keyword) => (
              <button
                key={keyword}
                onClick={() => handleQuickSearch(keyword)}
                className="px-4 py-2 bg-[#e94560] text-white rounded-full text-sm hover:scale-105 transition-transform"
              >
                {keyword}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runVerification()}
            placeholder="e.g., 'Flood in Mumbai', 'Fire in Pune', 'Earthquake alert'"
            className="w-full bg-[#1a1a2e] border border-white/10 rounded-full px-6 py-4 text-lg text-white outline-none focus:border-[#e94560] transition-colors mb-6"
          />

          <button
            onClick={() => runVerification()}
            disabled={loading}
            className="px-10 py-4 bg-[#e94560] text-white rounded-full font-semibold text-lg shadow-[0_4px_15px_rgba(233,69,96,0.4)] hover:translate-y-[-3px] hover:shadow-[0_6px_20px_rgba(233,69,96,0.6)] transition-all disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Now'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-white/10 border-t-[#e94560] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-8 text-[#e74c3c]">{error}</div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="mt-8 bg-[#16213e] rounded-3xl p-8 border border-white/10">
            <h3 className="text-xl font-bold mb-4">Disaster Information: "{result.query}"</h3>

            {/* Status Badge */}
            {(() => {
              const styles = getStatusStyles(result.verification_status);
              const StatusIcon = styles.icon;
              return (
                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold ${styles.bg} ${styles.text}`}>
                  <StatusIcon className="w-5 h-5" />
                  Verification Status: {result.verification_status}
                </div>
              );
            })()}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-8 my-8">
              <div>
                <p className="text-[#a0a0a0] mb-2">Possibility Level</p>
                <p className="text-xl font-bold">{result.possibility_level}</p>
              </div>
              <div className="flex justify-center">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                    <circle
                      cx="72" cy="72" r="60"
                      stroke="#e94560"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(result.confidence_score / 100) * 377} 377`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-[#e94560]">{result.confidence_score}%</span>
                    <span className="text-xs text-[#a0a0a0]">Confidence</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sources Checked */}
            <div className="mb-6">
              <h4 className="font-bold mb-3">Sources Checked:</h4>
              <div className="flex flex-wrap gap-2">
                {result.sources_checked?.map((source, idx) => (
                  <div key={idx} className="bg-[#4285F4]/20 border border-[#4285F4] rounded-xl px-4 py-2 text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {source.name}
                    <span className="bg-[#34a853] text-white px-2 py-0.5 rounded text-xs">{source.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div className="mb-6">
              <h4 className="font-bold mb-3">Explanation:</h4>
              <p className="text-[#a0a0a0] leading-relaxed">{result.explanation}</p>
            </div>

            {/* Safety Advice */}
            <div className="bg-[#f1c40f]/10 border-l-4 border-[#f1c40f] p-4 rounded-r-xl">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#f1c40f]" />
                Safety Advice:
              </h4>
              <ul className="list-disc list-inside text-[#a0a0a0] space-y-1">
                {result.safety_advice?.map((advice, idx) => (
                  <li key={idx}>{advice}</li>
                ))}
              </ul>
            </div>

            {/* Related Events */}
            {result.related_events && result.related_events.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold mb-3">Related News:</h4>
                {result.related_events.map((event, idx) => (
                  <div key={idx} className="bg-black/30 p-4 rounded-xl mb-3">
                    <p className="font-bold mb-2">{event.location} - {event.disaster_type}</p>
                    <ul className="list-disc list-inside text-[#a0a0a0] text-sm">
                      {event.headlines?.slice(0, 3).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Disaster Probabilities */}
            {result.disaster_probabilities && Object.keys(result.disaster_probabilities).length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold mb-3">Disaster Risk Analysis:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(result.disaster_probabilities).map(([type, prob]) => (
                    <div key={type} className="bg-[#e94560]/20 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-[#e94560]">{prob}%</div>
                      <div className="text-sm capitalize text-[#a0a0a0]">{type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
