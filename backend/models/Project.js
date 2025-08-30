import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    required: true,
    enum: ['Commercial', 'Residential', 'Industrial', 'Mixed-Use'],
    default: 'Residential'
  },
  status: {
    type: String,
    required: true,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },
  originalFile: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  processedFile: {
    filename: String,
    path: String,
    processedDate: Date
  },
  aiAnalysis: {
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    processingTime: {
      type: Number, // in milliseconds
      default: 0
    },
    optimizations: [{
      type: String,
      description: String,
      confidence: Number
    }],
    spatialEfficiency: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    roomCount: {
      type: Number,
      default: 0
    },
    totalArea: {
      type: Number, // in square feet
      default: 0
    }
  },
  metadata: {
    dimensions: {
      width: Number,
      height: Number
    },
    dpi: Number,
    colorMode: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ type: 1 });
projectSchema.index({ userId: 1, createdAt: -1 });

// Virtual for processing duration
projectSchema.virtual('processingDuration').get(function() {
  if (this.status === 'completed' && this.processedFile.processedDate) {
    return this.processedFile.processedDate - this.originalFile.uploadDate;
  }
  return null;
});

export default mongoose.model('Project', projectSchema); 