const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  classes: {
    type: [String],
    required: false,
    validate: {
      validator: function(classes) {
        return classes.length > 0;
      },
      message: 'At least one class must be specified'
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['jee', 'neet', 'boards'],
    lowercase: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(studentId) {
        const User = mongoose.model('User');
        const student = await User.findById(studentId);
        return student && student.email.endsWith('@sujhav.com') && student.role === 'student';
      },
      message: 'Student must have @sujhav.com email and student role'
    }
  }],
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(teacherId) {
        const User = mongoose.model('User');
        const teacher = await User.findById(teacherId);
        return teacher && teacher.email.endsWith('@sujhav.com') && teacher.role === 'teacher';
      },
      message: 'Teacher must have @sujhav.com email and teacher role'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  schedule: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Virtual for total students count
batchSchema.virtual('totalStudents').get(function() {
  return this.students.length;
});

// Virtual for total teachers count
batchSchema.virtual('totalTeachers').get(function() {
  return this.teachers.length;
});

// Index for better search performance
batchSchema.index({ category: 1, isActive: 1 });
batchSchema.index({ batchName: 'text', description: 'text' });
batchSchema.index({ createdBy: 1 });

// Ensure virtual fields are included in JSON output
batchSchema.set('toJSON', { virtuals: true });
batchSchema.set('toObject', { virtuals: true });

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;