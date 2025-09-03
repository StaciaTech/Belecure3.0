import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

interface MemoryData {
  success: boolean;
  timestamp: string;
  speedometer_data: {
    memory_usage_percent: number;
    cpu_usage_percent: number;
    current_value: number;
    max_value: number;
    unit: string;
    label: string;
    zones: Array<{
      min: number;
      max: number;
      color: string;
    }>;
  };
  detailed_info: {
    system_memory: {
      total_gb: number;
      used_gb: number;
      available_gb: number;
      usage_percent: number;
      free_percent: number;
    };
    process_memory: {
      used_mb: number;
      used_gb: number;
      percent_of_total: number;
    };
    cpu_info: {
      usage_percent: number;
      core_count: number;
    };
    ai_server_status: {
      model_loaded: boolean;
      requests_processed: number;
      uptime_seconds: number;
    };
    node_server: {
      memory_mb: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      uptime_seconds: number;
      pid: number;
    };
  };
}

interface MemorySpeedometerProps {
  refreshInterval?: number;
  size?: number;
  showDetails?: boolean;
}

const MemorySpeedometer: React.FC<MemorySpeedometerProps> = ({
  refreshInterval = 2000,
  size = 200,
  showDetails = true
}) => {
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch memory data
  const fetchMemoryData = async () => {
    try {
      const response = await api.request<MemoryData>('/memory') as MemoryData;
      setMemoryData(response);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch memory data:', err);
      setError('Failed to fetch memory data');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up polling
  useEffect(() => {
    fetchMemoryData();
    const interval = setInterval(fetchMemoryData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Draw speedometer
  useEffect(() => {
    if (!memoryData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937';
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw color zones
    const startAngle = -Math.PI * 0.75; // Start at 225 degrees
    const endAngle = Math.PI * 0.75;    // End at 135 degrees
    const totalAngle = endAngle - startAngle;

    memoryData.speedometer_data.zones.forEach(zone => {
      const zoneStartAngle = startAngle + (zone.min / 100) * totalAngle;
      const zoneEndAngle = startAngle + (zone.max / 100) * totalAngle;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, zoneStartAngle, zoneEndAngle);
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 8;
      ctx.stroke();
    });

    // Draw needle
    const value = memoryData.speedometer_data.current_value;
    const needleAngle = startAngle + (value / 100) * totalAngle;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const needleX = centerX + Math.cos(needleAngle) * (radius - 20);
    const needleY = centerY + Math.sin(needleAngle) * (radius - 20);
    ctx.lineTo(needleX, needleY);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937';
    ctx.fill();

    // Draw value text
    ctx.fillStyle = '#fca5a5';
    ctx.font = `bold ${size * 0.08}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${value.toFixed(1)}%`,
      centerX,
      centerY + size * 0.15
    );

    // Draw label
    ctx.font = `${size * 0.05}px Arial`;
    ctx.fillStyle = '#fecaca';
    ctx.fillText(
      memoryData.speedometer_data.label,
      centerX,
      centerY + size * 0.25
    );

    // Draw scale numbers
    ctx.font = `${size * 0.04}px Arial`;
    ctx.fillStyle = '#fca5a5';
    [0, 25, 50, 75, 100].forEach(scaleValue => {
      const scaleAngle = startAngle + (scaleValue / 100) * totalAngle;
      const scaleX = centerX + Math.cos(scaleAngle) * (radius + 20);
      const scaleY = centerY + Math.sin(scaleAngle) * (radius + 20);
      ctx.fillText(scaleValue.toString(), scaleX, scaleY);
    });

  }, [memoryData, size]);

  if (isLoading) {
    return (
      <div className="cyber-card-light border border-red-900/20 rounded-2xl p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span className="ml-2 text-red-200">Loading memory data...</span>
        </div>
      </div>
    );
  }

  if (error || !memoryData) {
    return (
      <div className="cyber-card-light border border-red-900/20 rounded-2xl p-6">
        <div className="flex items-center justify-center text-red-400">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.1 0 2.094-.734 2.386-1.804l1.99-7.315c.392-1.44-.902-2.881-2.386-2.881H5.072c-1.484 0-2.778 1.441-2.386 2.881l1.99 7.315c.292 1.07 1.286 1.804 2.386 1.804z" />
        </svg>
        {error || 'Failed to load memory data'}
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-card-light border border-red-900/20 rounded-2xl p-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
          SYSTEM MEMORY MONITOR
        </h3>
        <p className="text-sm text-red-200/70 font-medium tracking-wide">Real-time memory usage</p>
      </div>

      <div className="flex justify-center mb-6">
        <canvas 
          ref={canvasRef}
          className="drop-shadow-sm"
        />
      </div>

      {showDetails && (
        <div className="space-y-4">
                     {/* Quick Stats */}
           <div className="grid grid-cols-2 gap-4 text-sm">
             <div className="bg-red-900/10 border border-red-900/20 rounded-lg p-3">
               <div className="text-red-200/80 font-medium">System Memory</div>
               <div className="font-semibold text-lg text-red-100">
                 {memoryData.detailed_info.system_memory.used_gb.toFixed(1)}GB / {memoryData.detailed_info.system_memory.total_gb.toFixed(1)}GB
               </div>
             </div>
             <div className="bg-red-900/10 border border-red-900/20 rounded-lg p-3">
               <div className="text-red-200/80 font-medium">CPU Usage</div>
               <div className="font-semibold text-lg text-red-100">
                 {memoryData.detailed_info.cpu_info.usage_percent.toFixed(1)}%
               </div>
             </div>
           </div>

                     {/* AI Server Status */}
           <div className="bg-red-900/10 border border-red-900/20 rounded-lg p-3">
             <div className="flex items-center justify-between">
               <span className="text-red-200 font-medium">AI Server</span>
               <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                 memoryData.detailed_info.ai_server_status.model_loaded 
                   ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50' 
                   : 'bg-red-900/30 text-red-300 border border-red-700/50'
               }`}>
                 {memoryData.detailed_info.ai_server_status.model_loaded ? 'Model Loaded' : 'Model Not Loaded'}
               </span>
             </div>
             <div className="text-sm text-red-200/80 mt-1">
               Processed: {memoryData.detailed_info.ai_server_status.requests_processed} requests
             </div>
           </div>

                     {/* Process Memory */}
           <div className="bg-red-900/10 border border-red-900/20 rounded-lg p-3">
             <div className="text-red-200 font-medium">Process Memory</div>
             <div className="text-sm text-red-200/80 mt-1">
               AI Process: {memoryData.detailed_info.process_memory.used_mb.toFixed(1)}MB ({memoryData.detailed_info.process_memory.percent_of_total.toFixed(2)}%)
             </div>
             <div className="text-sm text-red-200/80">
               Node.js: {memoryData.detailed_info.node_server.memory_mb.heapUsed.toFixed(1)}MB heap
             </div>
           </div>

                     {/* Last Update */}
           <div className="text-xs text-red-200/60 text-center">
             Last updated: {new Date(memoryData.timestamp).toLocaleTimeString()}
           </div>
        </div>
      )}
    </div>
  );
};

export default MemorySpeedometer;
