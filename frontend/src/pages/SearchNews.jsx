import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle, AlertTriangle, XCircle, Loader2, ExternalLink, Shield } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function SearchNews() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const verifyNews = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch(`${API_BASE}/verify?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to verify. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (score) => {
    if (score >= 50) return { 
      icon: CheckCircle, 
      label: 'VERIFIED', 
      color: 'green',
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500'
    };
    if (score >= 25) return { 
      icon: AlertTriangle, 
      label: 'NEEDS VERIFICATION', 
      color: 'yellow',
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500'
    };
    return { 
      icon: XCircle, 
      label: '⚠️ FLAGGED AS FAKE', 
      color: 'red',
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500'
    };
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Search & Verify News</h1>
          <p className="text-[#94a3b8]">Enter headline or paste news link here...</p>
        </motion.div>

        {/* Search Box */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f1419] border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyNews()}
                placeholder="Enter headline or paste news link here..."
                className="w-full bg-[#1a1f26] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-[#64748b] focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={verifyNews}
              disabled={loading || !query.trim()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Verify News
            </button>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#0f1419] border border-white/10 rounded-2xl p-8 text-center"
            >
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-[#94a3b8]">Analyzing sources...</p>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#0f1419] border border-white/10 rounded-2xl overflow-hidden"
            >
              {result.error ? (
                <div className="p-8 text-center text-red-400">{result.error}</div>
              ) : (
                <>
                  {/* Results Header */}
                  <div className="p-6 border-b border-white/10">
                    <h3 className="text-white font-semibold mb-4">Results</h3>
                    
                    {(() => {
                      const status = getStatusConfig(result.confidence_score);
                      const Icon = status.icon;
                      return (
                        <div className="space-y-4">
                          {/* Trust Score */}
                          <div className="flex items-center justify-between">
                            <span className="text-[#94a3b8]">Trust Score:</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-3xl font-bold ${status.text}`}>{result.confidence_score}%</span>
                              <CheckCircle className={`w-6 h-6 ${status.text}`} />
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-[#94a3b8]">Status:</span>
                            <span className={`px-4 py-2 ${status.bg} ${status.text} rounded-full font-semibold flex items-center gap-2`}>
                              <Icon className="w-4 h-4" />
                              {status.label}
                            </span>
                          </div>

                          {/* Sources Analyzed */}
                          <div className="flex items-center justify-between">
                            <span className="text-[#94a3b8]">Sources Analyzed:</span>
                            <span className="text-white">{result.sources_checked?.length || 0} Trusted Sources</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Explanation */}
                  <div className="p-6 border-b border-white/10">
                    <div className={`flex items-start gap-3 p-4 rounded-xl ${getStatusConfig(result.confidence_score).bg}`}>
                      <Shield className={`w-5 h-5 mt-0.5 ${getStatusConfig(result.confidence_score).text}`} />
                      <p className="text-white/90">{result.explanation}</p>
                    </div>
                  </div>

                  {/* Sources */}
                  {result.sources_checked && result.sources_checked.length > 0 && (
                    <div className="p-6 border-b border-white/10">
                      <h4 className="text-white font-semibold mb-3">Sources Checked</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {result.sources_checked.map((source, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[#94a3b8] text-sm">
                            <ExternalLink className="w-4 h-4" />
                            <span>{source.name}</span>
                            <span className="text-[#64748b]">({source.type})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Advice */}
                  {result.safety_advice && result.safety_advice.length > 0 && (
                    <div className="p-6">
                      <h4 className="text-white font-semibold mb-3">Safety Advice</h4>
                      <ul className="space-y-2">
                        {result.safety_advice.map((advice, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[#94a3b8]">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {advice}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
