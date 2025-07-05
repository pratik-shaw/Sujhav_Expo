// models/PaidNotes.js
const mongoose = require('mongoose');

const PDFLinkSchema = new mongoose.Schema({
  pdfTitle: {
    type: String,
    required: true,
    trim: true
  },
  pdfDescription: {
    type: String,
    required: true,
    trim: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: String,
    required: true
  },
  pages: {
    type: Number,
    default: 0
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const StudentEnrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  paymentId: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
});

const PaidNotesSchema = new mongoose.Schema({
  notesTitle: {
    type: String,
    required: true,
    trim: true
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
    min: 1 // Minimum price for paid notes
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
  notesDetails: {
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
  },
  pdfLinks: [PDFLinkSchema],
  notesThumbnail: {
    type: String,
    required: true
  },
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
  },
  studentsEnrolled: [StudentEnrollmentSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make optional for now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
PaidNotesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for student count
PaidNotesSchema.virtual('studentCount').get(function() {
  return this.studentsEnrolled.length;
});

// Virtual for PDF count
PaidNotesSchema.virtual('pdfCount').get(function() {
  return this.pdfLinks.length;
});

// Index for better performance
PaidNotesSchema.index({ category: 1, isActive: 1 });
PaidNotesSchema.index({ createdAt: -1 });
PaidNotesSchema.index({ price: 1 });

module.exports = mongoose.model('PaidNotes', PaidNotesSchema);