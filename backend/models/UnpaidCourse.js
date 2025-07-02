const mongoose = require('mongoose');

// Video Lecture Schema
const videoLectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [200, 'Video title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Video description is required'],
    trim: true,
    maxlength: [1000, 'Video description cannot exceed 1000 characters']
  },
  youtubeUrl: {
    type: String,
    required: [true, 'YouTube URL is required'],
    trim: true,
    validate: {
      validator: function(url) {
        // Validate YouTube URL format
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+(&[\w=]*)?$/;
        return youtubeRegex.test(url);
      },
      message: 'Please provide a valid YouTube URL'
    }
  },
  duration: {
    type: String,
    trim: true,
    default: ''
  },
  order: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

// Main Unpaid Course Schema
const unpaidCourseSchema = new mongoose.Schema({
  courseTitle: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters']
  },
  tutor: {
    type: String,
    required: [true, 'Tutor name is required'],
    trim: true,
    maxlength: [100, 'Tutor name cannot exceed 100 characters']
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  categoryTab: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['jee', 'neet', 'boards'],
      message: 'Category must be either jee, neet, or boards'
    },
    lowercase: true
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    trim: true
  },
  about: {
    mode: {
      type: String,
      required: [true, 'Mode is required'],
      enum: {
        values: ['online', 'offline', 'hybrid'],
        message: 'Mode must be either online, offline, or hybrid'
      },
      lowercase: true
    },
    schedule: {
      type: String,
      required: [true, 'Schedule is required'],
      trim: true,
      maxlength: [500, 'Schedule cannot exceed 500 characters']
    }
  },
  details: {
    subtitle: {
      type: String,
      required: [true, 'Subtitle is required'],
      trim: true,
      maxlength: [300, 'Subtitle cannot exceed 300 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    }
  },
  videoLectures: [videoLectureSchema],
  studentsEnrolled: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  // This ensures that when converting to JSON, virtual properties are included
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
unpaidCourseSchema.index({ categoryTab: 1, isActive: 1 });
unpaidCourseSchema.index({ createdAt: -1 });
unpaidCourseSchema.index({ 'studentsEnrolled': 1 });

// Virtual for student count
unpaidCourseSchema.virtual('studentCount').get(function() {
  return this.studentsEnrolled ? this.studentsEnrolled.length : 0;
});

// Virtual for video count
unpaidCourseSchema.virtual('videoCount').get(function() {
  return this.videoLectures ? this.videoLectures.length : 0;
});

// Pre-save middleware to ensure video order is sequential
unpaidCourseSchema.pre('save', function(next) {
  if (this.videoLectures && this.videoLectures.length > 0) {
    // Sort by order and reassign sequential order numbers
    this.videoLectures.sort((a, b) => a.order - b.order);
    this.videoLectures.forEach((video, index) => {
      video.order = index;
    });
  }
  next();
});

// Pre-update middleware to ensure video order is sequential
unpaidCourseSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.videoLectures && Array.isArray(update.videoLectures)) {
    // Sort by order and reassign sequential order numbers
    update.videoLectures.sort((a, b) => a.order - b.order);
    update.videoLectures.forEach((video, index) => {
      video.order = index;
    });
  }
  next();
});

module.exports = mongoose.model('UnpaidCourse', unpaidCourseSchema);