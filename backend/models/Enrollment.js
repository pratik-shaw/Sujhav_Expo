// models/Enrollment.js
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'courseType'
  },
  courseType: {
    type: String,
    required: true,
    enum: ['UnpaidCourse', 'PaidCourse']
  },
  enrollmentStatus: {
    type: String,
    enum: ['pending', 'enrolled', 'cancelled', 'expired'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['not_required', 'pending', 'completed', 'failed', 'refunded'],
    default: 'not_required'
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    paymentMethod: String,
    paidAt: Date
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
  },
  expiresAt: {
    type: Date,
    // Set expiry date if needed (e.g., 1 year from enrollment for paid courses)
  },
  progress: {
    completedVideos: [{
      videoId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      watchTime: {
        type: Number, // in seconds
        default: 0
      }
    }],
    overallProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastAccessedAt: {
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

// Compound index to ensure a student can't enroll in the same course twice
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

// Index for better query performance
enrollmentSchema.index({ studentId: 1, enrollmentStatus: 1 });
enrollmentSchema.index({ courseId: 1, enrollmentStatus: 1 });
enrollmentSchema.index({ paymentStatus: 1 });

// Virtual for checking if enrollment is active and not expired
enrollmentSchema.virtual('isValidEnrollment').get(function() {
  const now = new Date();
  const isNotExpired = !this.expiresAt || this.expiresAt > now;
  const isEnrolled = this.enrollmentStatus === 'enrolled';
  const isActive = this.isActive;
  
  return isEnrolled && isActive && isNotExpired;
});

// Method to mark enrollment as complete (for free courses)
enrollmentSchema.methods.completeEnrollment = function() {
  this.enrollmentStatus = 'enrolled';
  this.paymentStatus = 'not_required';
  this.enrolledAt = new Date();
  return this.save();
};

// Method to complete payment and enrollment (for paid courses)
enrollmentSchema.methods.completePayment = function(paymentDetails) {
  this.enrollmentStatus = 'enrolled';
  this.paymentStatus = 'completed';
  this.paymentDetails = {
    ...this.paymentDetails,
    ...paymentDetails,
    paidAt: new Date()
  };
  this.enrolledAt = new Date();
  
  // Set expiry date for paid courses (e.g., 1 year)
  if (this.courseType === 'PaidCourse') {
    this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  }
  
  return this.save();
};

// Method to update progress
enrollmentSchema.methods.updateProgress = function(videoId, watchTime) {
  const existingProgress = this.progress.completedVideos.find(
    video => video.videoId.toString() === videoId.toString()
  );
  
  if (existingProgress) {
    existingProgress.watchTime = Math.max(existingProgress.watchTime, watchTime);
    existingProgress.completedAt = new Date();
  } else {
    this.progress.completedVideos.push({
      videoId,
      watchTime,
      completedAt: new Date()
    });
  }
  
  this.progress.lastAccessedAt = new Date();
  return this.save();
};

// Static method to get student's enrollments
enrollmentSchema.statics.getStudentEnrollments = function(studentId, status = 'enrolled') {
  return this.find({ 
    studentId, 
    enrollmentStatus: status,
    isActive: true 
  }).populate('courseId');
};

// Static method to check if student is enrolled in a course
enrollmentSchema.statics.isStudentEnrolled = function(studentId, courseId) {
  return this.findOne({
    studentId,
    courseId,
    enrollmentStatus: 'enrolled',
    isActive: true
  });
};

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;