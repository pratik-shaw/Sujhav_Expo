// models/DPP.js
const mongoose = require('mongoose');

const DPPSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['jee', 'neet', 'boards'],
    lowercase: true
  },
  questionPDF: {
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
  },
  answerPDF: {
    pdfData: {
      type: Buffer,
      required: false
    },
    pdfMimeType: {
      type: String,
      default: 'application/pdf'
    },
    originalName: {
      type: String,
      required: false
    },
    fileSize: {
      type: Number,
      required: false
    },
    pages: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  questionActive: {
    type: Boolean,
    default: true
  },
  answerActive: {
    type: Boolean,
    default: false
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
DPPSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for checking if answer is accessible
DPPSchema.virtual('isAnswerAccessible').get(function() {
  return this.answerActive && this.answerPDF && this.answerPDF.pdfData;
});

// Index for better performance
DPPSchema.index({ category: 1, questionActive: 1 });
DPPSchema.index({ class: 1, questionActive: 1 });
DPPSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DPP', DPPSchema);