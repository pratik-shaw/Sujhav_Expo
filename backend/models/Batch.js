const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
    maxLength: [100, 'Batch name cannot exceed 100 characters']
  },
  classes: [{
    type: String,
    required: true,
    trim: true
  }],
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['jee', 'neet', 'boards'],
    lowercase: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(studentId) {
        // Only validate role, not email domain
        const User = mongoose.model('User');
        const student = await User.findById(studentId);
        return student && student.role === 'user';
      },
      message: 'Student must have user role'
    }
  }],
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(teacherId) {
        // Only validate role, not email domain
        const User = mongoose.model('User');
        const teacher = await User.findById(teacherId);
        return teacher && teacher.role === 'teacher';
      },
      message: 'Teacher must have teacher role'
    }
  }],
  schedule: {
    type: String,
    trim: true,
    maxLength: [200, 'Schedule cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
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
  timestamps: true
});

// Add indexes for better performance
batchSchema.index({ category: 1, isActive: 1 });
batchSchema.index({ createdBy: 1 });
batchSchema.index({ batchName: 1 });

module.exports = mongoose.model('Batch', batchSchema);