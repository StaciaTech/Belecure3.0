// Environment-based configuration with smart defaults
// Frontend connects ONLY to Express backend - never directly to Python server
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');
const API_RETRY_ATTEMPTS = parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3');
const API_RETRY_DELAY = parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000');

// Debug configuration
const DEBUG_ENABLED = import.meta.env.VITE_DEBUG === 'true';
const IS_DEVELOPMENT = import.meta.env.VITE_APP_ENV === 'development';

// Feature flags with smart defaults
const FEATURES = {
  AI_ANALYSIS: import.meta.env.VITE_ENABLE_AI_ANALYSIS !== 'false', // Enabled by default
  ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true'
};

// Simple logging utility
const log = {
  debug: (...args: any[]) => (DEBUG_ENABLED || IS_DEVELOPMENT) && console.log('[API Debug]', ...args),
  info: (...args: any[]) => (DEBUG_ENABLED || IS_DEVELOPMENT) && console.info('[API Info]', ...args),
  warn: (...args: any[]) => console.warn('[API Warn]', ...args),
  error: (...args: any[]) => console.error('[API Error]', ...args)
};

export interface Project {
  id: string;
  name: string;
  type: 'Commercial' | 'Residential' | 'Industrial' | 'Mixed-Use';
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  date: string;
  aiAnalysis?: {
    accuracy: number;
    processingTime: number;
    spatialEfficiency: number;
    roomCount: number;
    totalArea: number;
    optimizations: Array<{
      type: string;
      description: string;
      confidence: number;
    }>;
  };
  metadata?: {
    dimensions?: {
      width: number;
      height: number;
    };
    dpi?: number;
    colorMode?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// New interfaces for AI floor plan analysis
export interface FloorPlanAnalysis {
  id: string;
  timestamp: string;
  image: {
    width: number;
    height: number;
    filename: string;
    originalName: string;
    size: number;
  };
  detections: {
    total: number;
    objects: Array<{
      name: string;
    }>;
    boundingBoxes: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }>;
    averageDoorSize: number;
  };
  metadata: {
    requestId?: string;
    processingTime?: string;
    modelVersion: string;
    confidence: string;
  };
}

export interface FloorPlanAnalysisResponse {
  success: boolean;
  analysis?: FloorPlanAnalysis;
  stats?: {
    totalObjects: number;
    objectCounts: Record<string, number>;
  };
  processing?: {
    time: number;
    server: string;
    timestamp: string;
  };
  error?: string;
  message?: string;
}

export interface AIHealthResponse {
  success: boolean;
  services: {
    express: {
      status: string;
      uptime: number;
      memory: any;
      version: string;
    };
    pythonAI: {
      status: string;
      url: string;
      details?: any;
    };
  };
  overall: string;
  timestamp: string;
}

export interface StatsData {
  processingSpeed: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  aiAccuracy: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  projectsProcessed: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  systemStatus: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  };
  realTimeMetrics?: {
    totalProjects: number;
    completedProjects: number;
    processingProjects: number;
    averageProcessingTime: number;
    uptime: number;
    lastUpdate: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    log.debug(`Making request to: ${url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      log.info(`Request successful: ${endpoint}`);
      return data;
      
    } catch (error) {
      log.error(`Request failed: ${endpoint}`, error);
      
      if (FEATURES.ERROR_REPORTING) {
        // Report error to monitoring service if enabled
        this.reportError(endpoint, error as Error);
      }
      
      throw error;
    }
  }

  private reportError(endpoint: string, error: Error) {
    // Simple error reporting - can be extended with Sentry, etc.
    if (FEATURES.ERROR_REPORTING) {
      log.debug('Error reported:', { endpoint, error: error.message });
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health');
  }

  // AI Floor Plan Analysis endpoints
  async analyzeFloorplan(file: File): Promise<FloorPlanAnalysisResponse> {
    const formData = new FormData();
    formData.append('floorplan', file);

    const url = `${API_BASE_URL}/api/floorplan/analyze`;
    
    log.info('Starting floor plan analysis', { filename: file.name, size: file.size });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Analysis failed: ${response.status}`);
      }
      
      log.info('Floor plan analysis completed successfully');
      return data;
    } catch (error) {
      log.error('Floor plan analysis failed:', error);
      
      if (FEATURES.ERROR_REPORTING) {
        this.reportError('/floorplan/analyze', error as Error);
      }
      
      throw error;
    }
  }

  async analyzeFloorplanRegion(
    file: File, 
    regionId: string, 
    regionType: string, 
    originalCoords?: { x1: number; y1: number; x2: number; y2: number }
  ): Promise<FloorPlanAnalysisResponse> {
    const formData = new FormData();
    formData.append('floorplan', file);
    formData.append('regionId', regionId);
    formData.append('regionType', regionType);
    
    if (originalCoords) {
      formData.append('originalCoords', JSON.stringify(originalCoords));
    }

    const url = `${API_BASE_URL}/api/floorplan/analyze-region`;
    
    log.info('Starting region analysis', { regionId, regionType });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Region analysis failed: ${response.status}`);
      }
      
      log.info('Region analysis completed successfully');
      return data;
    } catch (error) {
      log.error('Floor plan region analysis failed:', error);
      
      if (FEATURES.ERROR_REPORTING) {
        this.reportError('/floorplan/analyze-region', error as Error);
      }
      
      throw error;
    }
  }

  async getAIHealth(): Promise<AIHealthResponse> {
    log.debug('Checking AI service health');
    
    try {
      const url = `${API_BASE_URL}/api/floorplan/health`;
      const response = await fetch(url);
      const data = await response.json();
      
      log.info('AI health check completed', { status: data.overall });
      return data;
    } catch (error) {
      log.warn('AI health check failed:', error);
      throw error;
    }
  }

  async getAIMetrics(): Promise<ApiResponse<any>> {
    return this.request('/floorplan/metrics');
  }

  // Stats endpoints
  async getStats(): Promise<ApiResponse<StatsData>> {
    return this.request('/stats');
  }

  async getPerformanceMetrics(): Promise<ApiResponse<any>> {
    return this.request('/stats/performance');
  }

  async getAnalytics(days: number = 7): Promise<ApiResponse<any>> {
    return this.request(`/stats/analytics?days=${days}`);
  }

  // Projects endpoints
  async getProjects(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<Project[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/projects${query}`);
  }

  async getRecentProjects(): Promise<ApiResponse<Project[]>> {
    return this.request('/projects/recent');
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.request(`/projects/${id}`);
  }

  async uploadProject(file: File, name?: string, type?: string): Promise<ApiResponse<Project>> {
    const formData = new FormData();
    formData.append('floorplan', file);
    if (name) formData.append('name', name);
    if (type) formData.append('type', type);

    return this.request('/projects/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    });
  }

  async processProject(id: string): Promise<ApiResponse<Project>> {
    return this.request(`/projects/${id}/process`, {
      method: 'POST',
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<any>> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadProject(id: string): Promise<Blob> {
    const url = `${API_BASE_URL}/api/projects/${id}/download`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // System endpoints
  async getSystemInfo(): Promise<ApiResponse<any>> {
    return this.request('/system');
  }

  // Enhanced system health check with detailed information
  async getSystemHealth(): Promise<ApiResponse<{
    overall: 'healthy' | 'degraded' | 'offline';
    services: {
      api: { status: string; uptime: number; };
      database: { status: string; latency?: number; };
      ai: { status: string; models?: string[]; };
    };
    timestamp: string;
  }>> {
    try {
      // Parallel health checks
      const [healthResponse, aiHealthResponse] = await Promise.allSettled([
        this.healthCheck(),
        this.getAIHealth()
      ]);

      const health = healthResponse.status === 'fulfilled' ? healthResponse.value : null;
      const aiHealth = aiHealthResponse.status === 'fulfilled' ? aiHealthResponse.value : null;

      // Determine overall status
      let overall: 'healthy' | 'degraded' | 'offline' = 'offline';
      if (health?.success && aiHealth?.success) {
        overall = 'healthy';
      } else if (health?.success || aiHealth?.success) {
        overall = 'degraded';
      }

      return {
        success: true,
        data: {
          overall,
          services: {
            api: {
              status: health?.success ? 'healthy' : 'offline',
              uptime: health?.data?.uptime || 0
            },
            database: {
              status: health?.success ? 'connected' : 'disconnected'
            },
            ai: {
              status: aiHealth?.services?.pythonAI?.status || 'offline',
              models: aiHealth?.services?.pythonAI?.details?.models || []
            }
          },
          timestamp: new Date().toISOString()
        },
        message: 'System health check completed'
      };
    } catch (error) {
      return {
        success: false,
        data: {
          overall: 'offline' as const,
          services: {
            api: { status: 'offline', uptime: 0 },
            database: { status: 'disconnected' },
            ai: { status: 'offline' }
          },
          timestamp: new Date().toISOString()
        },
        message: 'System health check failed'
      };
    }
  }
}

export const api = new ApiService();
export default api; 