import React from 'react';
import { Search, Settings, User } from 'lucide-react';
import HeaderSystemStatus from './HeaderSystemStatus';
import CompactMemorySpeedometer from './CompactMemorySpeedometer';

const Header = () => {
  return (
    <header className="cyber-card-light border-b border-red-900/20 px-8 py-6 sticky top-0 z-50 cyber-grid">
      <div className="flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center space-x-6">
          <div className="relative group">
            <div className="w-12 h-12 bg-gradient-to-br from-red-900 via-red-800 to-red-700 rounded-2xl flex items-center justify-center cyber-glow">
              <div className="w-6 h-6 bg-gray-900 rounded-sm"></div>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full cyber-pulse"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-100 via-white to-red-100 bg-clip-text text-transparent">
              BELECURE
            </h1>
            <p className="text-xs text-red-200/70 font-medium tracking-wide">AI FLOORPLAN STUDIO</p>
          </div>
        </div>

        {/* Center Search */}
        <div className="flex-1 max-w-2xl mx-12">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-900/10 to-red-800/10 rounded-2xl blur-xl"></div>
            <div className="relative cyber-card-light rounded-2xl">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-red-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects, templates, or query AI..."
                className="w-full pl-16 pr-8 py-4 text-sm bg-transparent border-0 rounded-2xl text-white placeholder-red-200/50 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all duration-300"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <kbd className="px-2 py-1 text-xs bg-red-900/20 text-red-300 rounded border border-red-800/30">⌘K</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* System Status */}
          <HeaderSystemStatus />

          {/* Memory Speedometer */}
          <div className="px-3 py-2 bg-gray-900/20 rounded-xl border border-red-900/20">
            <CompactMemorySpeedometer refreshInterval={5000} size={50} />
          </div>

          {/* Settings */}
          <button className="p-3 text-red-200/70 hover:text-red-200 hover:bg-red-900/10 rounded-xl transition-all duration-300 cyber-hover">
            <Settings className="w-5 h-5" />
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3 pl-6 border-l border-red-900/20">
            <div className="w-10 h-10 bg-gradient-to-br from-red-900 to-red-700 rounded-xl flex items-center justify-center cyber-glow">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-white">System Admin</p>
              <p className="text-xs text-red-200/70">Premium Access</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;