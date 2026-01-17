import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, AlertTriangle, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search News' },
  { path: '/incidents', icon: AlertTriangle, label: 'Live Incidents' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  return (
    <motion.aside 
      initial={{ x: -80 }}
      animate={{ x: 0 }}
      className="fixed left-0 top-0 h-screen w-20 lg:w-64 bg-[#0f1419] border-r border-white/10 flex flex-col z-50"
    >
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] rounded-xl flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="hidden lg:block text-white font-bold text-lg">Scout</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-[#3b82f6]/20 text-[#3b82f6] border-l-4 border-[#3b82f6]' 
                : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'
              }
            `}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Status indicator */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="hidden lg:block">System Online</span>
        </div>
      </div>
    </motion.aside>
  );
}
