import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  const linkClasses = (path) => `
    font-medium transition-colors hover:text-[#e94560]
    ${isActive(path) ? 'text-[#e94560]' : 'text-[#ecf0f1]'}
  `;

  return (
    <nav className="flex justify-between items-center px-[5%] py-4 bg-[#16213e]/90 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <Link to="/" className="flex items-center gap-2 text-[#e94560] text-xl font-bold">
        <Layers className="w-6 h-6" />
        Resource Scout
      </Link>
      
      <div className="flex items-center gap-8">
        <Link to="/" className={linkClasses('/')}>Home</Link>
        <Link to="/dashboard" className={linkClasses('/dashboard')}>Live Incidents</Link>
        <Link to="/verify" className={linkClasses('/verify')}>Verify</Link>
        <Link to="/submit" className={linkClasses('/submit')}>Submit</Link>
        <Link 
          to="/live-feed" 
          className={`
            px-4 py-2 rounded-full font-semibold transition-all
            ${isActive('/live-feed') 
              ? 'bg-red-600 text-white' 
              : 'bg-red-600/20 text-red-400 border border-red-600 hover:bg-red-600 hover:text-white'
            }
          `}
        >
          🔴 Live Feed
        </Link>
      </div>
    </nav>
  );
}
