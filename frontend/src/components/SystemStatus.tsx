import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

interface SystemService {
  name: string;
  status: 'online' | 'offline' | 'warning' | 'loading';
  message: string;
  icon: React.ComponentType<any>;
  details?: string;
}

interface SystemStatusProps {
  refreshInterval?: number; // milliseconds
}

const SystemStatus: React.FC<SystemStatusProps> = ({ refreshInterval = 10000 }) => {
  const [services, setServices] = useState<SystemService[]>([
    {
      name: 'AI Processing',
      status: 'loading',
      message: 'CHECKING',
      icon: Zap,
      details: 'Initializing...'
    },
    {
      name: 'Database',
      status: 'loading',
      message: 'CHECKING',
      icon: Database,
      details: 'Connecting...'
    },
    {
      name: 'API Gateway',
      status: 'loading',
      message: 'CHECKING',
      icon: Server,
      details: 'Testing...'
    }
  ]);

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'offline' | 'loading'>('loading');

  useEffect(() => {
    checkSystemHealth();
    
    const interval = setInterval(checkSystemHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const checkSystemHealth = async () => {
    try {
      // Check API Gateway (Backend Health)
      const backendHealth = await checkBackendHealth();
      
      // Check AI Service Health
      const aiHealth = await checkAIHealth();
      
      // Check Database (through backend stats)
      const dbHealth = await checkDatabaseHealth();

      const updatedServices: SystemService[] = [
        {
          name: 'AI Processing',
          status: aiHealth.status,
          message: aiHealth.message,
          icon: Zap,
          details: aiHealth.details
        },
        {
          name: 'Database',
          status: dbHealth.status,
          message: dbHealth.message,
          icon: Database,
          details: dbHealth.details
        },
        {
          name: 'API Gateway',
          status: backendHealth.status,
          message: backendHealth.message,
          icon: Server,
          details: backendHealth.details
        }
      ];

      setServices(updatedServices);
      setLastUpdate(new Date());

      // Calculate overall status
      const statusPriority = { offline: 0, warning: 1, online: 2 };
      const minStatus = updatedServices.reduce((min, service) => {
        const current = statusPriority[service.status as keyof typeof statusPriority] ?? 0;
        return Math.min(min, current);
      }, 2);

      const statusMap = { 0: 'offline', 1: 'degraded', 2: 'healthy' } as const;
      setOverallStatus(statusMap[minStatus as keyof typeof statusMap]);

    } catch (error) {
      console.error('System health check failed:', error);
      setOverallStatus('offline');
    }
  };

  const checkBackendHealth = async (): Promise<{ status: SystemService['status'], message: string, details: string }> => {
    try {
      const response = await api.healthCheck();
      if (response.success) {
        return {
          status: 'online',
          message: 'HEALTHY',
          details: `Uptime: ${formatUptime(response.data?.uptime || 0)}`
        };
      } else {
        return {
          status: 'warning',
          message: 'DEGRADED',
          details: 'Partial functionality'
        };
      }
    } catch (error) {
      return {
        status: 'offline',
        message: 'OFFLINE',
        details: 'Connection failed'
      };
    }
  };

  const checkAIHealth = async (): Promise<{ status: SystemService['status'], message: string, details: string }> => {
    try {
      const response = await api.getAIHealth();
      if (response.success && response.services?.pythonAI?.status === 'healthy') {
        return {
          status: 'online',
          message: 'ONLINE',
          details: 'ML models loaded'
        };
      } else {
        return {
          status: 'warning',
          message: 'DEGRADED',
          details: response.services?.pythonAI?.details || 'Partial functionality'
        };
      }
    } catch (error) {
      return {
        status: 'offline',
        message: 'OFFLINE',
        details: 'AI service unavailable'
      };
    }
  };

  const checkDatabaseHealth = async (): Promise<{ status: SystemService['status'], message: string, details: string }> => {
    try {
      const response = await api.getStats();
      if (response.success) {
        return {
          status: 'online',
          message: 'CONNECTED',
          details: 'MongoDB cluster active'
        };
      } else {
        return {
          status: 'warning',
          message: 'SLOW',
          details: 'High latency detected'
        };
      }
    } catch (error) {
      return {
        status: 'offline',
        message: 'DISCONNECTED',
        details: 'Database unreachable'
      };
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: SystemService['status']) => {
    switch (status) {
      case 'online': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'offline': return 'text-red-400';
      case 'loading': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusDot = (status: SystemService['status']) => {
    const baseClasses = "w-2 h-2 rounded-full";
    switch (status) {
      case 'online': return `${baseClasses} bg-emerald-500 cyber-pulse`;
      case 'warning': return `${baseClasses} bg-yellow-500 animate-pulse`;
      case 'offline': return `${baseClasses} bg-red-500`;
      case 'loading': return `${baseClasses} bg-gray-500 animate-pulse`;
      default: return `${baseClasses} bg-gray-500`;
    }
  };

  const getOverallStatusIcon = () => {
    switch (overallStatus) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'offline': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'loading': return <Activity className="w-5 h-5 text-gray-400 animate-spin" />;
      default: return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="cyber-card-light border border-red-900/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
          SYSTEM STATUS
        </h3>
        <div className="flex items-center space-x-2">
          {getOverallStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor(overallStatus === 'loading' ? 'loading' : overallStatus === 'healthy' ? 'online' : overallStatus === 'degraded' ? 'warning' : 'offline')}`}>
            {overallStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <div key={index} className="flex items-center justify-between group hover:bg-red-900/5 rounded-lg p-2 -m-2 transition-colors">
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{service.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={getStatusDot(service.status)}></div>
                <div className="text-right">
                  <span className={`font-medium text-sm ${getStatusColor(service.status)}`}>
                    {service.message}
                  </span>
                  {service.details && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {service.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lastUpdate && (
        <div className="mt-4 pt-4 border-t border-red-900/20">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Last updated</span>
            <span>{lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus;
