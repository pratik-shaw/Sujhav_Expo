// models/PaidNotes.js
const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
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
}, { _id: true });

const purchasedStudentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purchasedAt: {
    type: Date,
    default: Date.now
  },
  paymentId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
}, { _id: true });

const notesDetailsSchema = new mongoose.Schema({
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

const paidNotesSchema = new mongoose.Schema({
  notesTitle: {
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
    min: 0.01, // Minimum 1 paisa/cent - cannot be zero for paid notes
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Price must be greater than 0 for paid notes'
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['jee', 'neet', 'boards'],
    lowercase: true,
    default: 'jee'
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  purchasedStudents: [purchasedStudentSchema],
  notesDetails: {
    type: notesDetailsSchema,
    required: true
  },
  pdfs: [pdfSchema],
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
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for total purchased students count
paidNotesSchema.virtual('totalPurchasedStudents').get(function() {
  return this.purchasedStudents.length;
});

// Virtual for total PDFs count
paidNotesSchema.virtual('totalPDFs').get(function() {
  return this.pdfs.length;
});

// Virtual for total revenue
paidNotesSchema.virtual('totalRevenue').get(function() {
  return this.purchasedStudents.reduce((total, student) => total + student.amount, 0);
});

// Method to check if a student has purchased these notes
paidNotesSchema.methods.hasPurchased = function(studentId) {
  return this.purchasedStudents.some(student => 
    student.studentId.toString() === studentId.toString()
  );
};

// Method to add a purchase
paidNotesSchema.methods.addPurchase = function(studentId, paymentId, amount) {
  this.purchasedStudents.push({
    studentId,
    paymentId,
    amount
  });
};

// Index for better search performance
paidNotesSchema.index({ category: 1, isActive: 1 });
paidNotesSchema.index({ notesTitle: 'text', 'notesDetails.description': 'text' });
paidNotesSchema.index({ price: 1 });
paidNotesSchema.index({ 'purchasedStudents.studentId': 1 });

const PaidNotes = mongoose.model('PaidNotes', paidNotesSchema);

module.exports = PaidNotes;