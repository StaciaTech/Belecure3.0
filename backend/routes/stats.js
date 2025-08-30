import express from 'express';
import Stats from '../models/Stats.js';
import Project from '../models/Project.js';
import aiProcessor from '../services/aiProcessor.js';

const router = express.Router();

// Get current system statistics
router.get('/', async (req, res) => {
  try {
    // Get latest stats from database
    let stats = await Stats.findOne().sort({ createdAt: -1 });
    
    // If no stats exist, create initial stats
    if (!stats) {
      stats = await createInitialStats();
    }

    // Get real-time data
    const totalProjects = await Project.countDocuments();
    const completedProjects = await Project.countDocuments({ status: 'completed' });
    const processingProjects = await Project.countDocuments({ status: 'processing' });
    
    // Calculate average processing time
    const recentCompletedProjects = await Project.find({
      status: 'completed',
      'aiAnalysis.processingTime': { $exists: true }
    }).limit(50).select('aiAnalysis.processingTime');
    
    const avgProcessingTime = recentCompletedProjects.length > 0 
      ? recentCompletedProjects.reduce((sum, p) => sum + p.aiAnalysis.processingTime, 0) / recentCompletedProjects.length
      : 800;

    // Format response for frontend
    const response = {
      processingSpeed: {
        value: `${(avgProcessingTime / 1000).toFixed(1)}s`,
        change: `+${stats.processingSpeed.improvement}% FASTER`,
        changeType: 'positive'
      },
      aiAccuracy: {
        value: `${stats.aiAccuracy.currentAccuracy}%`,
        change: `+${stats.aiAccuracy.improvement}% IMPROVED`,
        changeType: 'positive'
      },
      projectsProcessed: {
        value: totalProjects.toLocaleString(),
        change: `+${stats.projectsProcessed.monthlyGrowth}% THIS MONTH`,
        changeType: 'positive'
      },
      systemStatus: {
        value: stats.systemStatus.status,
        change: 'PRO UNLOCKED',
        changeType: 'positive'
      },
      realTimeMetrics: {
        totalProjects,
        completedProjects,
        processingProjects,
        averageProcessingTime: Math.round(avgProcessingTime),
        uptime: stats.systemStatus.uptime,
        lastUpdate: stats.systemStatus.lastUpdate
      }
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Get system performance metrics
router.get('/performance', async (req, res) => {
  try {
    const stats = await Stats.findOne().sort({ createdAt: -1 });
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No performance data available'
      });
    }

    res.json({
      success: true,
      data: {
        cpu: stats.performance.cpuUsage,
        memory: stats.performance.memoryUsage,
        disk: stats.performance.diskUsage,
        uptime: stats.systemStatus.uptime,
        status: stats.systemStatus.status,
        lastUpdate: stats.systemStatus.lastUpdate
      }
    });

  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
      error: error.message
    });
  }
});

// Get processing analytics
router.get('/analytics', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get projects by day
    const projectsByDay = await Project.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          avgProcessingTime: {
            $avg: "$aiAnalysis.processingTime"
          }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    // Get projects by type
    const projectsByType = await Project.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
        }
      }
    ]);

    // Get accuracy distribution
    const accuracyStats = await Project.aggregate([
      {
        $match: {
          "aiAnalysis.accuracy": { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgAccuracy: { $avg: "$aiAnalysis.accuracy" },
          minAccuracy: { $min: "$aiAnalysis.accuracy" },
          maxAccuracy: { $max: "$aiAnalysis.accuracy" }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        dailyProjects: projectsByDay,
        projectsByType,
        accuracyStats: accuracyStats[0] || {
          avgAccuracy: 0,
          minAccuracy: 0,
          maxAccuracy: 0
        }
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

// Update system status
router.patch('/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['ACTIVE', 'MAINTENANCE', 'OFFLINE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACTIVE, MAINTENANCE, or OFFLINE'
      });
    }

    let stats = await Stats.findOne().sort({ createdAt: -1 });
    if (!stats) {
      stats = await createInitialStats();
    }

    stats.systemStatus.status = status;
    stats.systemStatus.lastUpdate = new Date();
    await stats.save();

    res.json({
      success: true,
      message: `System status updated to ${status}`,
      data: {
        status: stats.systemStatus.status,
        lastUpdate: stats.systemStatus.lastUpdate
      }
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system status',
      error: error.message
    });
  }
});

// Initialize stats (admin endpoint)
router.post('/initialize', async (req, res) => {
  try {
    const stats = await createInitialStats();
    
    res.json({
      success: true,
      message: 'Statistics initialized successfully',
      data: stats
    });

  } catch (error) {
    console.error('Initialize stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize statistics',
      error: error.message
    });
  }
});

// Helper function to create initial stats
async function createInitialStats() {
  const totalProjects = await Project.countDocuments();
  const completedProjects = await Project.countDocuments({ status: 'completed' });
  
  const stats = new Stats({
    processingSpeed: {
      averageTime: 800,
      improvement: 45
    },
    aiAccuracy: {
      currentAccuracy: 99.9,
      improvement: 0.3
    },
    projectsProcessed: {
      totalCount: totalProjects,
      monthlyGrowth: 12,
      dailyCount: 0
    },
    systemStatus: {
      status: 'ACTIVE',
      uptime: 0,
      lastUpdate: new Date()
    },
    performance: {
      cpuUsage: 15 + Math.random() * 20, // 15-35%
      memoryUsage: 40 + Math.random() * 30, // 40-70%
      diskUsage: 30 + Math.random() * 20 // 30-50%
    }
  });

  return await stats.save();
}

export default router; 