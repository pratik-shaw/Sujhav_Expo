// models/PaidMaterials.js
const mongoose = require('mongoose');

const materialPhotoSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  data: {
    type: Buffer,
    required: true
  }
}, {
  timestamps: true
});

const purchasedStudentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  paymentId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  purchasedAt: {
    type: Date,
    default: Date.now
  }
});

const paidMaterialSchema = new mongoose.Schema({
  materialTitle: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
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
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  materialPhotos: [materialPhotoSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  purchasedStudents: [purchasedStudentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for total purchases
paidMaterialSchema.virtual('totalPurchases').get(function() {
  return this.purchasedStudents.length;
});

// Virtual for total revenue
paidMaterialSchema.virtual('totalRevenue').get(function() {
  return this.purchasedStudents.reduce((total, purchase) => total + purchase.amount, 0);
});

// Method to check if a student has purchased this material
paidMaterialSchema.methods.hasPurchased = function(studentId) {
  return this.purchasedStudents.some(purchase => 
    purchase.studentId.toString() === studentId.toString()
  );
};

// Method to add a purchase
paidMaterialSchema.methods.addPurchase = function(studentId, paymentId, amount) {
  if (!this.hasPurchased(studentId)) {
    this.purchasedStudents.push({
      studentId,
      paymentId,
      amount
    });
  }
};

// Method to get purchase details for a student
paidMaterialSchema.methods.getPurchaseDetails = function(studentId) {
  return this.purchasedStudents.find(purchase => 
    purchase.studentId.toString() === studentId.toString()
  );
};

// Static method to get materials by category
paidMaterialSchema.statics.getByCategory = function(category, options = {}) {
  const { page = 1, limit = 10, isActive = true } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ 
    category: category.toLowerCase(), 
    isActive 
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get popular materials
paidMaterialSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ viewCount: -1, totalPurchases: -1 })
    .limit(limit);
};

// Static method to get recent materials
paidMaterialSchema.statics.getRecent = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Pre-save middleware to update the updatedAt field
paidMaterialSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
paidMaterialSchema.index({ category: 1, isActive: 1 });
paidMaterialSchema.index({ createdAt: -1 });
paidMaterialSchema.index({ viewCount: -1 });
paidMaterialSchema.index({ 'purchasedStudents.studentId': 1 });

// Ensure virtual fields are serialized
paidMaterialSchema.set('toJSON', { virtuals: true });
paidMaterialSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PaidMaterials', paidMaterialSchema);