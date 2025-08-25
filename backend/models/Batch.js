const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    minlength: [1, 'Subject name cannot be empty'],
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    validate: {
      validator: async function(teacherId) {
        if (!teacherId) return true; // Allow null/undefined
        const User = mongoose.model('User');
        const teacher = await User.findById(teacherId);
        return teacher && teacher.role === 'teacher';
      },
      message: 'Teacher must be a valid user with teacher role'
    }
  }
}, { _id: true });

const batchSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
    minlength: [1, 'Batch name cannot be empty'],
    maxlength: [100, 'Batch name cannot exceed 100 characters'],
    unique: true,
    index: true
  },
  classes: [{
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    minlength: [1, 'Class name cannot be empty'],
    maxlength: [50, 'Class name cannot exceed 50 characters']
  }],
  subjects: [subjectSchema],
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['jee', 'neet', 'boards'],
      message: 'Category must be either jee, neet, or boards'
    },
    lowercase: true,
    index: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(studentId) {
        const User = mongoose.model('User');
        const student = await User.findById(studentId);
        return student && student.role === 'user';
      },
      message: 'Student must be a valid user with user role'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
    validate: {
      validator: async function(userId) {
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        return user && (user.role === 'admin' || user.role === 'teacher');
      },
      message: 'Created by must be a valid admin or teacher user'
    }
  },
  schedule: {
    type: String,
    trim: true,
    maxlength: [500, 'Schedule cannot exceed 500 characters'],
    default: ''
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
batchSchema.index({ category: 1, isActive: 1 });
batchSchema.index({ createdBy: 1 });
batchSchema.index({ 'subjects.teacher': 1 });
batchSchema.index({ students: 1 });

// Virtual for student count
batchSchema.virtual('studentCount').get(function() {
  return this.students ? this.students.length : 0;
});

// Virtual for subject count
batchSchema.virtual('subjectCount').get(function() {
  return this.subjects ? this.subjects.length : 0;
});

// Pre-save middleware to ensure data consistency
batchSchema.pre('save', function(next) {
  // Remove empty classes
  this.classes = this.classes.filter(cls => cls && cls.trim());
  
  // Remove empty subjects
  this.subjects = this.subjects.filter(subject => subject.name && subject.name.trim());
  
  // Remove duplicate students
  const uniqueStudents = [...new Set(this.students.map(s => s.toString()))];
  this.students = uniqueStudents;
  
  next();
});

// Static method to find batches by teacher
batchSchema.statics.findByTeacher = function(teacherId) {
  return this.find({
    'subjects.teacher': teacherId,
    isActive: true
  }).populate('students', 'name email')
    .populate('subjects.teacher', 'name email')
    .populate('createdBy', 'name email');
};

// Static method to find eligible students (not in any batch)
batchSchema.statics.findEligibleStudents = async function() {
  const User = mongoose.model('User');
  const batches = await this.find({}).select('students');
  const assignedStudentIds = new Set();
  
  batches.forEach(batch => {
    batch.students.forEach(studentId => {
      assignedStudentIds.add(studentId.toString());
    });
  });

  return await User.find({
    role: 'user',
    _id: { $nin: Array.from(assignedStudentIds) }
  }).select('name email').sort({ name: 1 });
};

// Instance method to check if a student is in this batch
batchSchema.methods.hasStudent = function(studentId) {
  return this.students.some(s => s.toString() === studentId.toString());
};

// Instance method to add students (avoiding duplicates)
batchSchema.methods.addStudents = function(studentIds) {
  const existingIds = this.students.map(s => s.toString());
  const newStudents = studentIds.filter(id => !existingIds.includes(id.toString()));
  this.students.push(...newStudents);
  return newStudents.length;
};

// Instance method to remove students
batchSchema.methods.removeStudents = function(studentIds) {
  const idsToRemove = studentIds.map(id => id.toString());
  const originalLength = this.students.length;
  this.students = this.students.filter(s => !idsToRemove.includes(s.toString()));
  return originalLength - this.students.length;
};

module.exports = mongoose.model('Batch', batchSchema);