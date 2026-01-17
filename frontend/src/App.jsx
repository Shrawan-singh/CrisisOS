import React, { useState, useRef, useEffect } from 'react';
import { Radio, MapPin, AlertTriangle, CheckCircle, Users, Power, Activity } from 'lucide-react';

export default function App() {
  const [isLive, setIsLive] = useState(false);
  const [logs, setLogs] = useState([]);
  const [cards, setCards] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const toggleFeed = () => {
    if (isLive) return;
    setIsLive(true);
    setLogs([]);

    const eventSource = new EventSource(`http://localhost:8000/start-feed`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'log') {
        setLogs(prev => [...prev, data]);
      } 
      else if (data.type === 'incident_card') {
        setCards(prev => [data, ...prev]);
      }
      else if (data.type === 'card_update') {
        setCards(prev => prev.map(card => {
          if (card.id === data.id) {
            return { ...card, [data.field]: data.value };
          }
          return card;
        }));
      }
    };
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* LEFT: Feed */}
      <div className="w-2/3 flex flex-col border-r border-slate-800 p-8 relative">
        <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 text-red-500">
                <Radio className={`w-8 h-8 ${isLive ? 'animate-pulse' : ''}`} />
                <h1 className="text-2xl font-black tracking-tighter">CRISIS.OS // SENTINEL</h1>
            </div>
            <button onClick={toggleFeed} className={`px-6 py-2 rounded font-bold flex items-center gap-2 ${isLive ? 'bg-green-900/30 text-green-400 border border-green-500' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                <Power className="w-4 h-4" /> {isLive ? 'SYSTEM ACTIVE' : 'ACTIVATE SCANNER'}
            </button>
        </header>

        <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {cards.map((card, i) => (
                <div key={i} className="bg-slate-900 border-l-4 border-red-500 p-6 rounded shadow-lg animate-in slide-in-from-top-4 transition-all duration-500">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">{card.title}</h2>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <MapPin className="w-4 h-4" /> {card.location}
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border transition-colors duration-500 ${card.status === 'VERIFIED' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {card.status === 'VERIFIED' ? <CheckCircle className="w-3 h-3"/> : <Activity className="w-3 h-3"/>}
                            {card.status}
                        </span>
                    </div>
                    
                    <p className="text-slate-300 mb-4 bg-slate-950/50 p-3 rounded border border-slate-800 font-mono text-sm">"{card.details}"</p>

                    <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t border-slate-800">
                         <div className="flex items-center gap-2 text-yellow-500"><AlertTriangle className="w-4 h-4" /> URGENCY: {card.urgency}</div>
                         <div className="flex items-center gap-2 text-blue-400"><Users className="w-4 h-4" /> Sources: {card.source_count}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* RIGHT: Logs */}
      <div className="w-1/3 bg-black p-6 font-mono text-xs text-green-500/80 flex flex-col border-l border-slate-800">
        <div className="border-b border-green-900/50 pb-2 mb-4 font-bold flex justify-between">
            <span>SYSTEM_LOGS</span>
            <span className="animate-pulse">{isLive ? '● REC' : '○ IDLE'}</span>
        </div>
        <div className="space-y-2 overflow-y-auto">
            {logs.map((log, i) => (
                <div key={i} className="break-words border-b border-white/5 pb-1">
                    <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                    {log.content}
                </div>
            ))}
            <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
