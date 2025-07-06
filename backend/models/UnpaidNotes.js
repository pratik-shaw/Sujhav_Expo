// models/UnpaidNotes.js
const mongoose = require('mongoose');

const PDFSchema = new mongoose.Schema({
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
  pdfData: {
    type: Buffer,
    required: true
  },
  pdfMimeType: {
    type: String,
    required: true,
    default: 'application/pdf'
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
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

const UnpaidNotesSchema = new mongoose.Schema({
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
  pdfs: [PDFSchema],
  thumbnail: {
    data: {
      type: Buffer,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
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
UnpaidNotesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for PDF count
UnpaidNotesSchema.virtual('pdfCount').get(function() {
  return this.pdfs.length;
});

// Index for better performance
UnpaidNotesSchema.index({ category: 1, isActive: 1 });
UnpaidNotesSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UnpaidNotes', UnpaidNotesSchema);