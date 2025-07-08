// models/PurchasedNotes.js
const mongoose = require('mongoose');

const purchasedNotesSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaidNotes',
    required: true
  },
  purchaseStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    razorpayOrderId: {
      type: String,
      default: null
    },
    razorpayPaymentId: {
      type: String,
      default: null
    },
    razorpaySignature: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    paymentMethod: {
      type: String,
      default: 'razorpay'
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  accessDetails: {
    grantedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null // null means lifetime access
    },
    accessCount: {
      type: Number,
      default: 0
    },
    lastAccessedAt: {
      type: Date,
      default: null
    }
  },
  downloadHistory: [{
    pdfId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  purchasedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
purchasedNotesSchema.index({ studentId: 1, notesId: 1 });
purchasedNotesSchema.index({ studentId: 1, purchaseStatus: 1 });
purchasedNotesSchema.index({ purchaseStatus: 1, paymentStatus: 1 });

// Virtual for checking if purchase is valid
purchasedNotesSchema.virtual('isValidPurchase').get(function() {
  if (this.purchaseStatus !== 'completed' || !this.isActive) {
    return false;
  }
  
  // Check if access has expired
  if (this.accessDetails.expiresAt && this.accessDetails.expiresAt < new Date()) {
    return false;
  }
  
  return true;
});

// Method to complete purchase for free notes
purchasedNotesSchema.methods.completePurchase = async function() {
  this.purchaseStatus = 'completed';
  this.paymentStatus = 'completed';
  this.accessDetails.grantedAt = new Date();
  this.paymentDetails.paidAt = new Date();
  
  return this.save();
};

// Method to complete payment for paid notes
purchasedNotesSchema.methods.completePayment = async function(paymentInfo) {
  this.purchaseStatus = 'completed';
  this.paymentStatus = 'completed';
  this.paymentDetails.razorpayPaymentId = paymentInfo.razorpayPaymentId;
  this.paymentDetails.razorpaySignature = paymentInfo.razorpaySignature;
  this.paymentDetails.paymentMethod = paymentInfo.paymentMethod || 'razorpay';
  this.paymentDetails.paidAt = new Date();
  this.accessDetails.grantedAt = new Date();
  
  return this.save();
};

// Method to record download
purchasedNotesSchema.methods.recordDownload = async function(pdfId, ipAddress, userAgent) {
  this.downloadHistory.push({
    pdfId,
    downloadedAt: new Date(),
    ipAddress,
    userAgent
  });
  
  this.accessDetails.accessCount += 1;
  this.accessDetails.lastAccessedAt = new Date();
  
  return this.save();
};

// Method to check if student has access to specific PDF
purchasedNotesSchema.methods.hasAccessToPDF = function(pdfId) {
  return this.isValidPurchase;
};

// Static method to check if student has purchased notes
purchasedNotesSchema.statics.hasStudentPurchased = async function(studentId, notesId) {
  const purchase = await this.findOne({
    studentId,
    notesId,
    purchaseStatus: 'completed',
    isActive: true
  });
  
  return purchase ? purchase.isValidPurchase : false;
};

// Static method to get student's purchase for specific notes
purchasedNotesSchema.statics.getStudentPurchase = async function(studentId, notesId) {
  return this.findOne({
    studentId,
    notesId,
    isActive: true
  }).populate('notesId').populate('studentId', 'name email');
};

// Pre-save middleware to set expiry date based on notes type
purchasedNotesSchema.pre('save', async function(next) {
  if (this.isModified('purchaseStatus') && this.purchaseStatus === 'completed') {
    // Set expiry date if needed (currently set to lifetime access)
    // this.accessDetails.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  }
  next();
});

module.exports = mongoose.model('PurchasedNotes', purchasedNotesSchema);