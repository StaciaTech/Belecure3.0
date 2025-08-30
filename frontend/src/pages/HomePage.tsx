import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import UploadArea from '../components/UploadArea';
import StatsCard from '../components/StatsCard';
import RecentProjects from '../components/RecentProjects';
import { Brain, Zap, TrendingUp, Rocket } from 'lucide-react';
import api, { StatsData } from '../services/api';

const HomePage: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load stats data on component mount
  useEffect(() => {
    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.getStats();
      if (response.success && response.data) {
        setStats(response.data);
        setError(null);
      } else {
        throw new Error(response.message || 'Failed to load stats');
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stats');
      
      // Use fallback data if API fails
      setStats({
        processingSpeed: { value: '0.8s', change: '+45% FASTER', changeType: 'positive' },
        aiAccuracy: { value: '99.9%', change: '+0.3% IMPROVED', changeType: 'positive' },
        projectsProcessed: { value: '0', change: '+0% THIS MONTH', changeType: 'neutral' },
        systemStatus: { value: 'CONNECTING', change: 'INITIALIZING', changeType: 'neutral' }
      });
    } finally {
      setLoading(false);
    }
  };

  const getIconForStat = (key: string) => {
    switch (key) {
      case 'processingSpeed': return Zap;
      case 'aiAccuracy': return Brain;
      case 'projectsProcessed': return TrendingUp;
      case 'systemStatus': return Rocket;
      default: return Brain;
    }
  };

  const formatStatTitle = (key: string) => {
    switch (key) {
      case 'processingSpeed': return 'PROCESSING SPEED';
      case 'aiAccuracy': return 'AI ACCURACY';
      case 'projectsProcessed': return 'PROJECTS PROCESSED';
      case 'systemStatus': return 'SYSTEM STATUS';
      default: return key.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-black cyber-grid" style={{ backgroundColor: '#000000' }}>
      <Header />
      
      <main className="max-w-[1600px] mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center space-x-3 px-6 py-3 cyber-card-light rounded-full mb-8 cyber-slide-up">
            <div className={`w-2 h-2 rounded-full cyber-pulse ${
              stats?.systemStatus.value === 'ACTIVE' ? 'bg-emerald-600' : 
              stats?.systemStatus.value === 'MAINTENANCE' ? 'bg-yellow-600' : 'bg-red-600'
            }`}></div>
            <span className="text-sm font-semibold text-red-300 tracking-wide">
              {loading ? 'INITIALIZING...' : 'PREMIUM AI PROCESSING'}
            </span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-red-100 to-red-200 bg-clip-text text-transparent mb-6 cyber-text-glow cyber-slide-up">
            TRANSFORM ARCHITECTURAL VISION
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto font-medium leading-relaxed cyber-slide-up">
            Advanced AI-powered floorplan optimization and enhancement. 
            Professional-grade results with premium precision.
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm max-w-md mx-auto">
              Backend connection failed. Using offline mode.
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="cyber-card-light border border-red-900/20 rounded-2xl p-6 animate-pulse">
                <div className="h-20 bg-red-900/20 rounded-lg"></div>
              </div>
            ))
          ) : (
            stats && Object.entries(stats).map(([key, data]) => {
              const Icon = getIconForStat(key);
              const title = formatStatTitle(key);
              
              return (
                <StatsCard
                  key={key}
                  title={title}
                  value={data.value}
                  change={data.change}
                  changeType={data.changeType}
                  icon={Icon}
                />
              );
            })
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          {/* Upload Section */}
          <div className="xl:col-span-2">
            <UploadArea onUploadSuccess={loadStats} />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <RecentProjects />
            
            {/* System Status */}
            <div className="cyber-card-light border border-red-900/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent mb-4">
                SYSTEM STATUS
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">AI Processing</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full cyber-pulse"></div>
                    <span className="text-emerald-400 font-medium">ONLINE</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Database</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full cyber-pulse"></div>
                    <span className="text-emerald-400 font-medium">CONNECTED</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">API Gateway</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full cyber-pulse"></div>
                    <span className="text-emerald-400 font-medium">HEALTHY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage; 