import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

interface MemoryData {
  success: boolean;
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
      usage_percent: number;
    };
    cpu_info: {
      usage_percent: number;
    };
  };
}

interface CompactMemorySpeedometerProps {
  refreshInterval?: number;
  size?: number;
}

const CompactMemorySpeedometer: React.FC<CompactMemorySpeedometerProps> = ({
  refreshInterval = 5000,
  size = 60
}) => {
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch memory data
  const fetchMemoryData = async () => {
    try {
      const response = await api.request<MemoryData>('/memory') as MemoryData;
      setMemoryData(response);
    } catch (err) {
      console.error('Failed to fetch memory data:', err);
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

  // Draw compact speedometer
  useEffect(() => {
    if (!memoryData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937';
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw color zones (simplified for compact view)
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    const totalAngle = endAngle - startAngle;

    const value = memoryData.speedometer_data.current_value;
    const zoneColor = value < 50 ? '#22c55e' : 
                     value < 75 ? '#f59e0b' : 
                     value < 90 ? '#ef4444' : '#dc2626';

    // Draw arc based on current value
    const valueAngle = startAngle + (value / 100) * totalAngle;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, valueAngle);
    ctx.strokeStyle = zoneColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw remaining arc in dark gray
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, valueAngle, endAngle);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw center value
    ctx.fillStyle = '#fca5a5';
    ctx.font = `bold ${size * 0.15}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${value.toFixed(0)}%`,
      centerX,
      centerY + 2
    );

  }, [memoryData, size]);

  if (isLoading || !memoryData) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
        <span className="text-xs text-red-200">Loading...</span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center space-x-2 group cursor-pointer"
      title={`Memory: ${memoryData.detailed_info.system_memory.used_gb.toFixed(1)}GB / ${memoryData.detailed_info.system_memory.total_gb.toFixed(1)}GB (${memoryData.speedometer_data.current_value.toFixed(1)}%)\nCPU: ${memoryData.detailed_info.cpu_info.usage_percent.toFixed(1)}%`}
    >
      <canvas 
        ref={canvasRef}
        className="drop-shadow-sm transition-transform group-hover:scale-110"
      />
      <div className="text-xs text-red-200">
        <div className="font-medium">
          {memoryData.detailed_info.system_memory.used_gb.toFixed(1)}GB
        </div>
        <div className="text-red-200/70">
          {memoryData.detailed_info.cpu_info.usage_percent.toFixed(0)}% CPU
        </div>
      </div>
    </div>
  );
};

export default CompactMemorySpeedometer;
