import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, AlertTriangle, BarChart3, Camera, Map, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search News' },
  { path: '/incidents', icon: AlertTriangle, label: 'Live Incidents' },
  { path: '/map', icon: Map, label: 'Map View' },
  { path: '/citizen-cam', icon: Camera, label: 'CitizenCam' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0f1419] border-b border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold">CrisisOS</span>
        </div>
        <button 
          onClick={toggleMobileMenu}
          className="w-10 h-10 flex items-center justify-center text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/80 z-40"
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>

      {/* Mobile Slide-out Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="md:hidden fixed left-0 top-14 bottom-0 w-64 bg-[#0f1419] z-50 border-r border-white/10"
          >
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-[#3b82f6]/20 text-[#3b82f6]' 
                      : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-[#94a3b8]">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>System Online</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside 
        initial={{ x: -80 }}
        animate={{ x: 0 }}
        className="hidden md:flex fixed left-0 top-0 h-screen w-20 lg:w-64 bg-[#0f1419] border-r border-white/10 flex-col z-50"
      >
        {/* Logo */}
        <div className="p-4 lg:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <span className="hidden lg:block text-white font-bold text-lg">CrisisOS</span>
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
    </>
  );
}
