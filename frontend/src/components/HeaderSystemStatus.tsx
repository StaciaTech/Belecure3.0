import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, XCircle } from 'lucide-react';
import api from '../services/api';

const HeaderSystemStatus: React.FC = () => {
  const [status, setStatus] = useState<'healthy' | 'degraded' | 'offline' | 'loading'>('loading');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    checkSystemStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkSystemStatus = async () => {
    try {
      // Quick health check
      const healthPromise = api.healthCheck();
      const statsPromise = api.getStats();
      
      // Wait for both with timeout
      const results = await Promise.allSettled([
        Promise.race([healthPromise, new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )]),
        Promise.race([statsPromise, new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Stats timeout')), 5000)
        )])
      ]);

      const healthResult = results[0];
      const statsResult = results[1];

      if (healthResult.status === 'fulfilled' && statsResult.status === 'fulfilled') {
        setStatus('healthy');
      } else if (healthResult.status === 'fulfilled' || statsResult.status === 'fulfilled') {
        setStatus('degraded');
      } else {
        setStatus('offline');
      }

      setLastCheck(new Date());
    } catch (error) {
      console.error('Header system status check failed:', error);
      setStatus('offline');
      setLastCheck(new Date());
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          icon: Activity,
          text: 'ONLINE',
          color: 'text-emerald-400',
          dotClass: 'bg-emerald-400 cyber-pulse'
        };
      case 'degraded':
        return {
          icon: AlertTriangle,
          text: 'DEGRADED',
          color: 'text-yellow-400',
          dotClass: 'bg-yellow-400 animate-pulse'
        };
      case 'offline':
        return {
          icon: XCircle,
          text: 'OFFLINE',
          color: 'text-red-400',
          dotClass: 'bg-red-400'
        };
      case 'loading':
      default:
        return {
          icon: Activity,
          text: 'CHECKING',
          color: 'text-gray-400',
          dotClass: 'bg-gray-400 animate-pulse'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div 
      className="flex items-center space-x-2 px-4 py-2 cyber-card-light rounded-xl cursor-pointer hover:bg-red-900/5 transition-colors"
      title={lastCheck ? `Last checked: ${lastCheck.toLocaleTimeString()}` : 'Checking system status...'}
      onClick={checkSystemStatus}
    >
      <Icon className={`w-4 h-4 ${config.color} ${status === 'loading' ? 'animate-spin' : ''}`} />
      <span className={`text-xs font-semibold ${config.color}`}>
        {config.text}
      </span>
      <div className={`w-2 h-2 rounded-full ${config.dotClass}`}></div>
    </div>
  );
};

export default HeaderSystemStatus;
