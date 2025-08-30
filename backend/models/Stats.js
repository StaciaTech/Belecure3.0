import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  processingSpeed: {
    averageTime: {
      type: Number, // in milliseconds
      default: 800
    },
    improvement: {
      type: Number, // percentage
      default: 45
    }
  },
  aiAccuracy: {
    currentAccuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 99.9
    },
    improvement: {
      type: Number, // percentage
      default: 0.3
    }
  },
  projectsProcessed: {
    totalCount: {
      type: Number,
      default: 0
    },
    monthlyGrowth: {
      type: Number, // percentage
      default: 12
    },
    dailyCount: {
      type: Number,
      default: 0
    }
  },
  systemStatus: {
    status: {
      type: String,
      enum: ['ACTIVE', 'MAINTENANCE', 'OFFLINE'],
      default: 'ACTIVE'
    },
    uptime: {
      type: Number, // in hours
      default: 0
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  },
  performance: {
    cpuUsage: {
      type: Number,
      min: 0,
      max: 100,
      default: 25
    },
    memoryUsage: {
      type: Number,
      min: 0,
      max: 100,
      default: 60
    },
    diskUsage: {
      type: Number,
      min: 0,
      max: 100,
      default: 45
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
statsSchema.index({ date: -1 });

// Static method to get latest stats
statsSchema.statics.getLatest = function() {
  return this.findOne().sort({ createdAt: -1 });
};

// Method to update daily stats
statsSchema.methods.updateDailyStats = function() {
  this.systemStatus.lastUpdate = new Date();
  this.systemStatus.uptime += 24; // Add 24 hours
  return this.save();
};

export default mongoose.model('Stats', statsSchema); 