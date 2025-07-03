// models/UnpaidCourse.js
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  videoTitle: {
    type: String,
    required: true,
    trim: true
  },
  videoDescription: {
    type: String,
    required: true,
    trim: true
  },
  videoLink: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: true });

const enrolledStudentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mode: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    required: true
  },
  schedule: {
    type: String,
    required: true,
    trim: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const courseDetailsSchema = new mongoose.Schema({
  subtitle: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const unpaidCourseSchema = new mongoose.Schema({
  courseTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  tutor: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0, // Allow 0 for free courses
    default: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['jee', 'neet', 'boards'],
    lowercase: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  studentsEnrolled: [enrolledStudentSchema],
  courseDetails: {
    type: courseDetailsSchema,
    required: true
  },
  videoLinks: [videoSchema],
  courseThumbnail: {
    type: String,
    required: true
  },
  // Add thumbnail metadata for better handling
  thumbnailMetadata: {
    originalName: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for checking if course is free
unpaidCourseSchema.virtual('isFree').get(function() {
  return this.price === 0;
});

// Virtual for total enrolled students count
unpaidCourseSchema.virtual('totalEnrolledStudents').get(function() {
  return this.studentsEnrolled.length;
});

// Virtual for total video count
unpaidCourseSchema.virtual('totalVideos').get(function() {
  return this.videoLinks.length;
});

// Virtual for total course duration
unpaidCourseSchema.virtual('totalDuration').get(function() {
  return this.videoLinks.reduce((total, video) => {
    const duration = video.duration;
    // Assuming duration is in format "HH:MM:SS" or "MM:SS"
    const parts = duration.split(':');
    let minutes = 0;
    if (parts.length === 3) {
      minutes = parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0]) + parseInt(parts[1]) / 60;
    }
    return total + minutes;
  }, 0);
});

// Index for better search performance
unpaidCourseSchema.index({ category: 1, isActive: 1 });
unpaidCourseSchema.index({ courseTitle: 'text', 'courseDetails.description': 'text' });
unpaidCourseSchema.index({ price: 1 }); // Add index for price-based queries

const UnpaidCourse = mongoose.model('UnpaidCourse', unpaidCourseSchema);

module.exports = UnpaidCourse;